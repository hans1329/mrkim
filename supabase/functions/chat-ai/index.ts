import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not configured");
    }

    const { messages, secretaryName = "김비서", secretaryTone = "polite" } = await req.json();

    // 말투 설정
    const toneInstructions = {
      polite: "존댓말을 사용하고 정중하게 응답하세요.",
      friendly: "친근하고 편안한 말투로 응답하세요. 반말을 사용해도 됩니다.",
      cute: "귀엽고 애교있는 말투로 응답하세요. '~요', '~해요' 등의 부드러운 어미를 사용하세요.",
    };

    const systemPrompt = `당신은 ${secretaryName}입니다. 소상공인의 AI 경영 비서로서 매출, 지출, 세금, 직원 관리 등 사업 관련 질문에만 답변합니다.

${toneInstructions[secretaryTone as keyof typeof toneInstructions] || toneInstructions.polite}

업무 범위:
- 매출/지출 현황 조회 및 분석
- 세금 관련 질문 (부가세, 종합소득세 등)
- 급여/인사 관리
- 거래처/계약 관리
- 경영 브리핑 및 조언

범위 외 질문 (음식점 추천, 개인 상담, 일반 지식 등)은 정중히 거절하고 업무 관련 도움을 제안하세요.

현재 데이터 연동이 되어있지 않아 시뮬레이션 데이터를 제공합니다. 응답 시 이 점을 고려해주세요.
응답은 마크다운 형식으로 작성하되, 간결하고 핵심적인 정보만 제공하세요.`;

    // Gemini API 포맷으로 변환
    const geminiMessages = messages.map((msg: { role: string; content: string }) => ({
      role: msg.role === "assistant" ? "model" : "user",
      parts: [{ text: msg.content }],
    }));

    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          { role: "user", parts: [{ text: systemPrompt }] },
          { role: "model", parts: [{ text: "네, 알겠습니다. 저는 " + secretaryName + "입니다. 사장님의 사업을 도와드리겠습니다." }] },
          ...geminiMessages,
        ],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 1024,
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
          JSON.stringify({ error: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || "죄송합니다, 응답을 생성하지 못했습니다.";

    return new Response(
      JSON.stringify({ response: aiResponse }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("chat-ai error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
