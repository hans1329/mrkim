import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { briefDescription } = await req.json();
    if (!briefDescription || typeof briefDescription !== "string") {
      return new Response(JSON.stringify({ error: "briefDescription is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      // Fallback to GEMINI_API_KEY
      const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
      if (!GEMINI_API_KEY) {
        throw new Error("No API key configured");
      }

      const geminiRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                role: "user",
                parts: [{ text: buildPrompt(briefDescription) }],
              },
            ],
            generationConfig: {
              responseMimeType: "application/json",
              responseSchema: {
                type: "OBJECT",
                properties: {
                  subject: { type: "STRING" },
                  question: { type: "STRING" },
                },
                required: ["subject", "question"],
              },
            },
          }),
        }
      );

      if (!geminiRes.ok) {
        const errText = await geminiRes.text();
        console.error("Gemini error:", errText);
        throw new Error("AI generation failed");
      }

      const geminiData = await geminiRes.json();
      const text = geminiData.candidates?.[0]?.content?.parts
        ?.filter((p: any) => !p.thought && p.text)
        ?.map((p: any) => p.text)
        ?.join("") || "";

      const parsed = JSON.parse(text);
      return new Response(JSON.stringify(parsed), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use Lovable AI Gateway
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          {
            role: "system",
            content: buildSystemPrompt(),
          },
          {
            role: "user",
            content: briefDescription,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "draft_consultation",
              description: "사용자의 간단한 설명을 바탕으로 세무 상담 요청서의 제목과 질문 본문을 작성합니다.",
              parameters: {
                type: "object",
                properties: {
                  subject: {
                    type: "string",
                    description: "상담 제목 (20자 내외, 핵심 키워드 포함)",
                  },
                  question: {
                    type: "string",
                    description: "세무사에게 보낼 상세 질문 (200~400자, 구체적 상황 설명 포함)",
                  },
                },
                required: ["subject", "question"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "draft_consultation" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI 크레딧이 부족합니다." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await response.text();
      console.error("Gateway error:", response.status, errText);
      throw new Error("AI generation failed");
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      const args = JSON.parse(toolCall.function.arguments);
      return new Response(JSON.stringify(args), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fallback: try to parse content
    const content = data.choices?.[0]?.message?.content || "";
    try {
      const parsed = JSON.parse(content);
      return new Response(JSON.stringify(parsed), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch {
      throw new Error("Failed to parse AI response");
    }
  } catch (e) {
    console.error("draft-consultation error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

function buildSystemPrompt(): string {
  return `당신은 한국의 소상공인을 위한 세무 상담 작성 도우미입니다.
사용자가 간단히 설명한 세무 관련 고민을 바탕으로, 세무사에게 보낼 정식 상담 요청서를 작성해주세요.

작성 규칙:
- subject: 핵심 키워드를 포함한 간결한 제목 (15~25자)
- question: 세무사가 정확한 답변을 할 수 있도록 구체적인 상황, 금액, 시기 등을 포함한 질문 (200~400자)
- 존댓말 사용, 전문적이면서도 이해하기 쉬운 표현
- 사용자가 언급하지 않은 내용은 "___" 또는 "(구체적 금액 기입)" 같은 빈칸으로 표시하여 사용자가 채울 수 있게 할 것`;
}

function buildPrompt(desc: string): string {
  return `${buildSystemPrompt()}

사용자 설명: ${desc}

위 내용을 바탕으로 세무 상담 요청서를 작성해주세요.`;
}
