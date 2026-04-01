import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface BusinessContext {
  businessName?: string | null;
  businessType?: string | null;
  businessRegistrationNumber?: string | null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    let body: any = {};
    try {
      const text = await req.text();
      if (text) body = JSON.parse(text);
    } catch {
      return new Response(JSON.stringify({ error: "Invalid request body" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { briefDescription, businessContext } = body;
    if (!briefDescription || typeof briefDescription !== "string") {
      return new Response(JSON.stringify({ error: "briefDescription is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ctx = (businessContext || {}) as BusinessContext;
    const prompt = buildPrompt(briefDescription, ctx);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
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
                parts: [{ text: prompt }],
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
            content: buildSystemPrompt(ctx),
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

function buildBusinessInfo(ctx: BusinessContext): string {
  const parts: string[] = [];
  if (ctx.businessName) parts.push(`- 상호명: ${ctx.businessName}`);
  if (ctx.businessType) parts.push(`- 업종: ${ctx.businessType}`);
  if (ctx.businessRegistrationNumber) parts.push(`- 사업자등록번호: ${ctx.businessRegistrationNumber}`);

  if (parts.length === 0) {
    return "\n사용자의 사업 정보가 아직 등록되지 않았습니다. 구체적인 수치나 업종을 임의로 지어내지 마세요. 대신 \"(상호명 기입)\", \"(업종 기입)\" 등의 빈칸으로 남겨두세요.";
  }

  return `\n사용자의 실제 사업 정보:\n${parts.join("\n")}\n\n위 정보만 사용하세요. 매출액, 투자 금액 등 제공되지 않은 수치는 절대 지어내지 말고, "(구체적 금액 기입)" 같은 빈칸으로 남기세요.`;
}

function buildSystemPrompt(ctx: BusinessContext): string {
  const greeting = ctx.businessName
    ? `인사말은 "안녕하세요, ${ctx.businessName}입니다." 로 시작하세요.`
    : `인사말은 "안녕하세요," 로 시작하고, 사용자가 직접 상호명을 넣을 수 있도록 "(상호명)" 으로 남겨두세요.`;

  return `당신은 한국의 소상공인이 담당 세무사에게 보내는 상담 메시지를 대필하는 도우미입니다.
사용자가 간단히 설명한 고민을 바탕으로, **담당 세무사님에게 직접 보내는 편한 톤의 메시지**를 작성해주세요.
${buildBusinessInfo(ctx)}

작성 규칙:
- subject: 핵심 키워드를 포함한 간결한 제목 (15~25자)
- question: 담당 세무사님에게 보내는 자연스러운 메시지 형태 (150~350자)
  - ${greeting}
  - 격식체(~습니다)를 사용하되, 딱딱한 공문서가 아닌 **실제 거래처에 보내는 편한 톤**으로 작성
  - 궁금한 점이나 부탁하는 내용을 자연스럽게 전달
  - 마무리는 "확인 부탁드립니다", "답변 부탁드리겠습니다" 등 간결하게
- **절대로 제공되지 않은 정보(매출액, 업종, 금액 등)를 임의로 만들어내지 마세요**
- 사용자가 언급하지 않았고 위 사업 정보에도 없는 내용은 반드시 "___" 또는 "(구체적 금액 기입)" 같은 빈칸으로 표시하여 사용자가 채울 수 있게 할 것`;
}

function buildPrompt(desc: string, ctx: BusinessContext): string {
  return `${buildSystemPrompt(ctx)}

사용자 설명: ${desc}

위 내용을 바탕으로 담당 세무사님에게 보낼 메시지를 작성해주세요.`;
}
