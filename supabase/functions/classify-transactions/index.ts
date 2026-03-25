import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const AI_GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

interface TransactionInput {
  id: string;
  description: string;
  amount: number;
  merchant_name?: string;
  merchant_category?: string;
  transaction_date: string;
  category?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Auth 확인
    const authHeader = req.headers.get("Authorization");
    const supabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const anonClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!);
    
    const token = authHeader?.replace("Bearer ", "");
    const { data: { user }, error: authError } = await anonClient.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "인증이 필요합니다" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { transactionIds, mode = "batch" } = await req.json();

    // 분류할 거래 내역 조회
    let query = supabaseClient
      .from("transactions")
      .select("id, description, amount, merchant_name, merchant_category, transaction_date, category, type")
      .eq("user_id", user.id)
      .eq("type", "expense");

    if (transactionIds?.length) {
      query = query.in("id", transactionIds);
    } else {
      // 미분류 거래만 대상
      query = query.in("tax_classification_status", ["unclassified"])
        .order("transaction_date", { ascending: false })
        .limit(50);
    }

    const { data: transactions, error: txError } = await query;
    if (txError) throw txError;
    if (!transactions?.length) {
      return new Response(JSON.stringify({ success: true, classified: 0, message: "분류할 거래가 없습니다" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 계정과목 마스터 데이터 조회
    const { data: accountCodes } = await supabaseClient
      .from("tax_account_codes")
      .select("*")
      .eq("is_active", true)
      .order("display_order");

    const accountCodesRef = (accountCodes || []).map((c: any) => 
      `${c.id}|${c.name}|${c.category}|${c.description}|부가세공제:${c.vat_deductible_default}|자산:${c.is_asset}|한도:${c.tax_limit_description || '없음'}|키워드:${c.keywords?.join(',')}`
    ).join("\n");

    // AI에게 분류 요청 (배치 처리)
    const txList = transactions.map((tx: TransactionInput) => 
      `${tx.id}|${tx.description}|${tx.amount}원|${tx.merchant_name || ''}|${tx.merchant_category || ''}|${tx.transaction_date}`
    ).join("\n");

    const systemPrompt = `당신은 한국 세법에 정통한 세무 전문가 AI입니다. 거래 내역을 분석하여 정확한 세무 계정과목으로 분류합니다.

## 계정과목 참조표
${accountCodesRef}

## 분류 규칙
1. 100만원 이상 비품/장비 구매 → 고정자산(213 비품) 또는 해당 자산 계정
2. 음식점/카페 → 업무용이면 복리후생비(812), 거래처 접대면 접대비(811)
3. 금액이 10만원 이상인 음식 지출은 접대비(811) 가능성 높음
4. 주유/주차/세차 → 차량유지비(820)
5. 택시/대중교통/항공 → 여비교통비(813)
6. 월정액 결제 패턴 → 구독서비스(831) 또는 임차료(818)
7. 부가세 공제: 접대비, 보험료, 세금, 감가상각, 인건비는 불공제
8. 사업 사용 비율: 차량 관련 비용은 업무사용비율 고려

## 응답 형식
각 거래에 대해 반드시 다음 JSON 배열로 응답하세요. 다른 텍스트 없이 JSON만 출력하세요.`;

    const userPrompt = `다음 거래 내역을 세무 계정과목으로 분류하세요.
형식: id|설명|금액|상호명|가맹점분류|날짜

${txList}

JSON 배열로 응답 (각 항목):
[{
  "id": "거래ID",
  "tax_account_code": "계정코드",
  "tax_account_name": "계정과목명",
  "vat_deductible": true/false,
  "is_fixed_asset": true/false,
  "business_use_ratio": 100,
  "confidence": 0.0~1.0,
  "reason": "분류 사유 한줄"
}]`;

    const aiResponse = await fetch(AI_GATEWAY_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.1,
      }),
    });

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "요청 한도 초과. 잠시 후 다시 시도해주세요." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "AI 크레딧이 부족합니다." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway error: ${status}`);
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content || "";

    // JSON 파싱 (마크다운 코드블록 제거)
    const jsonStr = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    let classifications: any[];
    try {
      classifications = JSON.parse(jsonStr);
    } catch {
      console.error("Failed to parse AI response:", content);
      throw new Error("AI 응답 파싱 실패");
    }

    // DB 업데이트
    let classified = 0;
    const results: any[] = [];

    for (const cls of classifications) {
      const matchedCode = accountCodes?.find((c: any) => c.id === cls.tax_account_code);
      
      const updateData: any = {
        tax_account_code: cls.tax_account_code,
        tax_account_name: cls.tax_account_name || matchedCode?.name,
        vat_deductible: cls.vat_deductible ?? matchedCode?.vat_deductible_default ?? true,
        is_fixed_asset: cls.is_fixed_asset ?? false,
        business_use_ratio: cls.business_use_ratio ?? 100,
        ai_confidence_score: cls.confidence ?? 0.5,
        tax_classification_status: "ai_suggested",
        tax_notes: cls.reason || null,
        updated_at: new Date().toISOString(),
      };

      // 고정자산인 경우 감가상각 정보
      if (cls.is_fixed_asset && matchedCode) {
        updateData.depreciation_method = "정액법";
        updateData.useful_life_years = matchedCode.default_useful_life || 5;
      }

      // VAT 금액 계산 (공급가액의 10%)
      const tx = transactions.find((t: any) => t.id === cls.id);
      if (tx && cls.vat_deductible) {
        updateData.vat_amount = Math.round(tx.amount / 11);
      }

      const { error: updateError } = await supabaseClient
        .from("transactions")
        .update(updateData)
        .eq("id", cls.id)
        .eq("user_id", user.id);

      if (!updateError) {
        classified++;
        results.push({ id: cls.id, ...updateData });
      }
    }

    // API 사용 로그
    await supabaseClient.from("api_usage_logs").insert({
      user_id: user.id,
      service: "gemini",
      endpoint: "classify-transactions",
      tokens_input: aiData.usage?.prompt_tokens || 0,
      tokens_output: aiData.usage?.completion_tokens || 0,
      metadata: { transaction_count: transactions.length, classified },
    });

    return new Response(JSON.stringify({
      success: true,
      classified,
      total: transactions.length,
      results,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("classify-transactions error:", error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : "분류 처리 중 오류",
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
