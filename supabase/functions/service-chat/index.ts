import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

// ============ 요청 간 레이트 리미터 ============
const MIN_INTERVAL_MS = 800;
let lastGeminiCallTime = 0;

async function waitForSlot(): Promise<void> {
  const now = Date.now();
  const elapsed = now - lastGeminiCallTime;
  if (elapsed < MIN_INTERVAL_MS) {
    await new Promise(r => setTimeout(r, MIN_INTERVAL_MS - elapsed));
  }
  lastGeminiCallTime = Date.now();
}

// FAQ 캐시 (5분)
let faqCache: { data: string; fetchedAt: number } | null = null;
const FAQ_CACHE_TTL = 5 * 60 * 1000;

async function getFAQContext(): Promise<string> {
  const now = Date.now();
  if (faqCache && (now - faqCache.fetchedAt) < FAQ_CACHE_TTL) {
    return faqCache.data;
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data, error } = await supabase
      .from("service_faq")
      .select("question, answer, keywords")
      .eq("is_active", true)
      .order("priority", { ascending: false });

    if (error || !data || data.length === 0) {
      console.error("FAQ fetch error:", error);
      return "";
    }

    const faqText = data
      .map((f: { question: string; answer: string; keywords: string[] }, i: number) => {
        const kw = f.keywords?.length ? `키워드: ${f.keywords.join(", ")}` : "";
        return `Q${i + 1}: ${f.question}${kw ? `\n${kw}` : ""}\nA${i + 1}: ${f.answer}`;
      })
      .join("\n\n");

    const context = `\n\n## 서비스 FAQ 데이터베이스\n사용자의 질문에 아래 키워드가 포함되면 해당 FAQ의 답변을 기반으로 정확하게 응답하세요. 키워드가 매칭되지 않더라도 의미적으로 관련된 FAQ가 있으면 활용하세요.\n\n${faqText}`;

    faqCache = { data: context, fetchedAt: now };
    return context;
  } catch (e) {
    console.error("FAQ context error:", e);
    return "";
  }
}

// 서비스 안내 전용 시스템 프롬프트 (기본)
const SERVICE_SYSTEM_PROMPT_BASE = `당신은 김비서 서비스 안내 담당입니다.

## 역할
- 김비서 서비스에 대해 친절하게 안내
- 가입 및 사용법 설명
- 기능과 요금제 안내
- 일상적인 대화에도 친근하게 응대

## 호칭 규칙 (필수)
- 상대방을 항상 **"대표님"**이라고 부르세요
- "고객님", "이용자님", "회원님", "사장님" 등의 호칭은 절대 사용하지 마세요
- 김비서는 소상공인을 위한 서비스이므로, 모든 사용자는 "대표님"입니다

## 김비서 서비스 소개
김비서는 소상공인을 위한 AI 경영 비서 서비스입니다.

## 응답 가이드
- 친근하고 간결하게 응답
- 마크다운 형식으로 정리
- 이모지를 적절히 사용하여 친근함 표현
- FAQ 데이터베이스에 해당하는 질문이면 해당 내용을 기반으로 답변
- 일상적인 대화에도 친근하게 응대 (딱딱하게 거절하지 않기)
  - 예: "심심해요" → "저도 대표님이랑 대화하니까 좋아요! 😊 김비서에 대해 궁금한 거 있으시면 물어보세요~"
  - 예: "넌 누구야?" → "안녕하세요! 저는 김비서예요 😊 소상공인 대표님들의 경영을 도와드리는 AI 비서입니다!"
- 불법적이거나 부적절한 요청만 정중히 거절`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not configured");
    }

    const { message, conversationHistory = [] } = await req.json();

    if (!message) {
      throw new Error("message is required");
    }

    // FAQ 컨텍스트를 DB에서 가져와서 시스템 프롬프트에 추가
    const faqContext = await getFAQContext();
    const fullSystemPrompt = SERVICE_SYSTEM_PROMPT_BASE + faqContext;

    // 대화 히스토리 구성
    const geminiMessages = [
      { role: "user", parts: [{ text: fullSystemPrompt }] },
      { role: "model", parts: [{ text: "네, 알겠습니다. 저는 김비서 서비스 안내 담당이에요! 😊 궁금한 점이 있으시면 편하게 물어보세요." }] },
    ];

    // 이전 대화 추가 (최근 10개만)
    const recentHistory = conversationHistory.slice(-10);
    for (const msg of recentHistory) {
      geminiMessages.push({
        role: msg.role === "assistant" ? "model" : "user",
        parts: [{ text: msg.content }],
      });
    }

    // 현재 메시지 추가
    geminiMessages.push({
      role: "user",
      parts: [{ text: message }],
    });

    // 레이트 리미터: 요청 간 최소 간격 보장
    await waitForSlot();

    // Gemini API 호출
    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: geminiMessages,
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 512,
        },
        safetySettings: [
          { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
          { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
          { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
          { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Gemini API error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "잠시 후 다시 시도해주세요." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || 
      "죄송합니다, 응답을 생성하지 못했습니다. 다시 시도해주세요.";

    return new Response(
      JSON.stringify({ response: aiResponse }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("service-chat error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
