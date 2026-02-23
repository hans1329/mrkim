import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface Insight {
  type: "suggestion" | "warning" | "positive" | "action";
  priority: "high" | "medium" | "low";
  title: string;
  description: string;
  impact?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "인증이 필요합니다" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 유저 인증
    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
    const { data: { user }, error: authError } = await anonClient.auth.getUser(
      authHeader.replace("Bearer ", "")
    );

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "인증 실패" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1. 기존 인사이트 삭제
    await supabase.from("ai_insights").delete().eq("user_id", user.id);

    // 2. 데이터 수집 (최근 3개월)
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    const startDate = threeMonthsAgo.toISOString().split("T")[0];

    const [transactionsRes, employeesRes, depositsRes] = await Promise.all([
      supabase
        .from("transactions")
        .select("type, amount, category, transaction_date, source_type")
        .eq("user_id", user.id)
        .gte("transaction_date", startDate),
      supabase
        .from("employees")
        .select("name, employee_type, monthly_salary, status, insurance_national_pension, insurance_health, insurance_employment, insurance_industrial")
        .eq("user_id", user.id)
        .eq("status", "재직"),
      supabase
        .from("deposits")
        .select("type, name, amount, target_amount, due_date")
        .eq("user_id", user.id)
        .eq("is_active", true),
    ]);

    const transactions = transactionsRes.data || [];
    const employees = employeesRes.data || [];
    const deposits = depositsRes.data || [];

    // 3. 데이터 요약 생성
    const totalIncome = transactions.filter(t => t.type === "income" || t.type === "transfer_in").reduce((sum, t) => sum + t.amount, 0);
    const totalExpense = transactions.filter(t => t.type === "expense").reduce((sum, t) => sum + t.amount, 0);
    const categoryStats = new Map<string, number>();
    transactions.filter(t => t.type === "expense" && t.category).forEach(t => {
      categoryStats.set(t.category!, (categoryStats.get(t.category!) || 0) + t.amount);
    });

    const totalSalary = employees.reduce((sum, e) => sum + (e.monthly_salary || 0), 0);
    const insuredCount = employees.filter(e => 
      e.insurance_national_pension && e.insurance_health && e.insurance_employment && e.insurance_industrial
    ).length;

    const dataSnapshot = {
      totalIncome,
      totalExpense,
      netProfit: totalIncome - totalExpense,
      transactionCount: transactions.length,
      employeeCount: employees.length,
      totalSalary,
      insuredCount,
      depositCount: deposits.length,
      topCategories: Array.from(categoryStats.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([cat, amount]) => ({ category: cat, amount })),
    };

    // 4. AI 분석 요청 (Gemini 2.0 Flash 직접 호출)
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      return new Response(JSON.stringify({ error: "GEMINI_API_KEY가 설정되지 않았습니다" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

    const systemPrompt = `당신은 소상공인 사업자를 위한 AI 경영 비서 '김비서'입니다. 
제공된 재무 데이터를 분석하여 실행 가능한 경영 인사이트를 제공해주세요.

분석 결과는 반드시 아래 JSON 형식으로 반환해주세요. 제목과 설명은 짧게 작성하세요:
{"insights": [{"type": "suggestion|warning|positive|action", "priority": "high|medium|low", "title": "제목(15자이내)", "description": "설명(50자이내)", "impact": "영향(20자이내)"}]}

주의사항:
- 반드시 유효한 JSON만 출력하세요
- 3~5개의 인사이트를 제공하세요
- 설명은 반드시 50자 이내로 간결하게 작성하세요`;

    const userPrompt = `최근 3개월 경영 데이터:
매출: ${totalIncome.toLocaleString()}원 / 지출: ${totalExpense.toLocaleString()}원 / 순이익: ${(totalIncome - totalExpense).toLocaleString()}원 / 거래 ${transactions.length}건
직원: ${employees.length}명 / 월인건비: ${totalSalary.toLocaleString()}원 / 4대보험: ${insuredCount}명
예치금: ${deposits.length}개
주요지출: ${Array.from(categoryStats.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([cat, amt]) => `${cat}:${amt.toLocaleString()}원`).join(', ')}

3~5개 핵심 인사이트를 JSON으로 제공해주세요.`;

    const geminiBody = {
      contents: [
        { role: "user", parts: [{ text: systemPrompt }] },
        { role: "model", parts: [{ text: '네, JSON 형식으로 인사이트를 분석하겠습니다.' }] },
        { role: "user", parts: [{ text: userPrompt }] },
      ],
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 4096,
        responseMimeType: "application/json",
        responseSchema: {
          type: "object",
          properties: {
            insights: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  type: { type: "string", enum: ["suggestion", "warning", "positive", "action"] },
                  priority: { type: "string", enum: ["high", "medium", "low"] },
                  title: { type: "string" },
                  description: { type: "string" },
                  impact: { type: "string" },
                },
                required: ["type", "priority", "title", "description"],
              },
            },
          },
          required: ["insights"],
        },
      },
    };

    const aiResponse = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(geminiBody),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("Gemini API error:", aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Gemini API 요청 한도 초과, 잠시 후 다시 시도해주세요" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      return new Response(JSON.stringify({ error: "AI 분석 실패" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResponse.json();
    
    // Gemini 응답에서 JSON 파싱
    let insights: Insight[] = [];
    const responseText = aiData.candidates?.[0]?.content?.parts?.[0]?.text;
    if (responseText) {
      try {
        const parsed = JSON.parse(responseText);
        insights = parsed.insights || [];
      } catch (e) {
        console.error("Failed to parse Gemini JSON response:", e);
        console.error("Raw response text:", responseText.substring(0, 500));
        // JSON 파싱 실패 시 텍스트에서 JSON 추출 시도
        const jsonMatch = responseText.match(/\{[\s\S]*"insights"[\s\S]*\}/);
        if (jsonMatch) {
          try {
            const fallbackParsed = JSON.parse(jsonMatch[0]);
            insights = fallbackParsed.insights || [];
          } catch { /* ignore */ }
        }
      }
    }

    // 5. 인사이트 저장
    if (insights.length > 0) {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 1); // 24시간 후 만료

      const insightsToInsert = insights.map((insight: Insight) => ({
        user_id: user.id,
        type: insight.type,
        priority: insight.priority,
        title: insight.title,
        description: insight.description,
        impact: insight.impact || null,
        data_snapshot: dataSnapshot,
        expires_at: expiresAt.toISOString(),
      }));

      const { error: insertError } = await supabase.from("ai_insights").insert(insightsToInsert);
      if (insertError) {
        console.error("Insert error:", insertError);
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      count: insights.length,
      insights 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("generate-insights error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "알 수 없는 오류" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
