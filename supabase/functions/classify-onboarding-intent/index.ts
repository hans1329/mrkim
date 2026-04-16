import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent";

/**
 * 온보딩 발화 의도 분류기 (하이브리드 폴백용)
 * - 정규식으로 못 잡은 애매한 자연어를 빠르게 분류
 * - 가벼운 모델(flash-lite) + 짧은 출력으로 레이턴시 최소화
 *
 * 입력:
 *   { utterance: string, stepId: string, stepType: string, choices?: string[] }
 *
 * 출력:
 *   { intent: "yes" | "skip" | "choice" | "unclear", choice?: string, confidence: number }
 */
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY not configured");

    const { utterance, stepId, stepType, choices = [] } = await req.json();
    if (!utterance || typeof utterance !== "string") {
      return new Response(JSON.stringify({ error: "utterance required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const choicesText = choices.length > 0 ? `\n선택지: ${choices.join(", ")}` : "";

    const systemPrompt = `당신은 온보딩 챗봇의 의도 분류기입니다. 사용자 발화를 분석해 다음 중 하나로 분류하세요.

## 분류 기준
- "yes": 동의/진행 의사 (예: "응 할게", "그래", "좋아", "해줘")
- "skip": 거부/연기/생략 의사 (예: "지금 말고", "귀찮아", "인증서 없어", "패스", "다음에", "괜찮아")
- "choice": 특정 선택지를 명시 (선택지 중 하나를 언급한 경우)
- "unclear": 의도가 불분명하거나 무관한 발화 (예: "음...", "어어", 잡음)

## 현재 단계
- 단계 ID: ${stepId}
- 단계 유형: ${stepType}${choicesText}

## 출력 형식 (반드시 JSON만)
{"intent": "yes" | "skip" | "choice" | "unclear", "choice": "선택지명 또는 null", "confidence": 0.0~1.0}

다른 설명 없이 JSON만 출력하세요.`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1500);

    try {
      const response = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [
            { role: "user", parts: [{ text: systemPrompt }] },
            { role: "model", parts: [{ text: "네, JSON으로만 응답하겠습니다." }] },
            { role: "user", parts: [{ text: `발화: "${utterance}"` }] },
          ],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 100,
            responseMimeType: "application/json",
          },
        }),
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const t = await response.text();
        console.error("Gemini error:", response.status, t);
        return new Response(JSON.stringify({ intent: "unclear", confidence: 0 }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "{}";

      let parsed: { intent?: string; choice?: string | null; confidence?: number } = {};
      try {
        parsed = JSON.parse(text);
      } catch {
        parsed = { intent: "unclear", confidence: 0 };
      }

      const intent = ["yes", "skip", "choice", "unclear"].includes(parsed.intent || "")
        ? parsed.intent
        : "unclear";

      return new Response(
        JSON.stringify({
          intent,
          choice: parsed.choice || null,
          confidence: typeof parsed.confidence === "number" ? parsed.confidence : 0.5,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } catch (e) {
      clearTimeout(timeoutId);
      console.warn("classify timeout/abort:", e);
      return new Response(JSON.stringify({ intent: "unclear", confidence: 0 }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  } catch (e) {
    console.error("classify-onboarding-intent error:", e);
    return new Response(
      JSON.stringify({ intent: "unclear", confidence: 0, error: e instanceof Error ? e.message : "unknown" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
