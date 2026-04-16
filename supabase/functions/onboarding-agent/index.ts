import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

/**
 * 온보딩 총괄 에이전트
 * - 모든 사용자 발화(자연어/음성) 해석 + 응답 생성 + 도구 호출 결정 담당
 * - 정규식/사전 분기 없이 LLM 단일 책임
 * - 응답: { reply: string, toolCalls: { name, args }[], done: boolean }
 */

type ChatRole = "user" | "assistant" | "tool";
interface ClientMessage {
  role: ChatRole;
  content: string;
  toolName?: string; // role=tool 일 때 사용
}

interface OnboardingState {
  name?: string | null;
  business_type?: string | null;
  business_number?: string | null;
  hometax_connected?: boolean;
  card_connected?: boolean;
  account_connected?: boolean;
  delivery_connected?: boolean;
}

const TOOLS = [
  {
    name: "save_user_name",
    description:
      "대표님의 호칭(이름)을 추출해 저장합니다. 사용자가 이름을 직간접적으로 말하면 즉시 호출. 예) '한석이라고 불러' -> name='한석'",
    parameters: {
      type: "OBJECT",
      properties: {
        name: { type: "STRING", description: "조사·어미를 제거한 순수 이름" },
      },
      required: ["name"],
    },
  },
  {
    name: "save_business_type",
    description:
      "업종을 저장합니다. 사용자가 자유 발화로 업종을 알려주면(예: '치킨집해', '미용실', '카페') 표준 카테고리(음식점/카페/소매·유통/기타) 또는 사용자가 말한 업종 그대로 저장.",
    parameters: {
      type: "OBJECT",
      properties: {
        business_type: { type: "STRING", description: "업종 명" },
      },
      required: ["business_type"],
    },
  },
  {
    name: "save_business_number",
    description: "사업자등록번호(10자리)를 저장. 숫자만 추출해서 전달.",
    parameters: {
      type: "OBJECT",
      properties: {
        business_number: {
          type: "STRING",
          description: "하이픈 제거한 10자리 숫자",
        },
      },
      required: ["business_number"],
    },
  },
  {
    name: "start_connection",
    description:
      "특정 서비스 연동 화면을 엽니다. 사용자가 '연동할게', '카드 연결해줘' 등 의사를 보이면 호출.",
    parameters: {
      type: "OBJECT",
      properties: {
        service: {
          type: "STRING",
          enum: ["hometax", "card", "account", "baemin", "coupangeats"],
        },
      },
      required: ["service"],
    },
  },
  {
    name: "skip_step",
    description:
      "현재 단계 또는 특정 연동을 건너뜁니다. 사용자가 '나중에', '건너뛸게' 등을 말하면 호출.",
    parameters: {
      type: "OBJECT",
      properties: {
        target: {
          type: "STRING",
          enum: ["hometax", "card", "account", "delivery", "current"],
        },
      },
      required: ["target"],
    },
  },
  {
    name: "finish_onboarding",
    description:
      "기본 정보가 모두 수집되고 사용자가 더 이상 연동을 원치 않을 때 온보딩을 종료.",
    parameters: { type: "OBJECT", properties: {} },
  },
];

function buildSystemPrompt(state: OnboardingState): string {
  return `당신은 '김비서'라는 이름의 AI 온보딩 비서입니다. 사장님(=대표님)을 모시는 전문 비서로서 사장님이 김비서 서비스를 처음 사용할 수 있게 안내합니다.

# 절대 규칙
- 사용자를 반드시 "대표님"이라 호칭. '사장님', '고객님', '회원님' 금지.
- 모든 응답은 (1) 직전 입력에 대한 짧은 반응 한 줄 + (2) 다음에 필요한 단 하나의 안내 한 줄. 두 줄 이내로 매우 간결하게.
- 한 번에 한 가지만 묻습니다.
- 사용자가 자연어로 흘려 말한 정보(예: "한석이라고 불러", "치킨집해", "사업자번호 1234567890")라도 즉시 해당 도구로 저장하고 다음 단계로 진행.
- 이미 수집된 정보는 다시 묻지 않습니다.
- "처음부터", "다시", "뒤로", "건너뛰자", "이름 다시 입력" 등 메타 명령도 자연스럽게 해석.
- 이모지는 한 응답에 최대 1개만, 과한 격식체("~드립니다") 대신 친근한 ~해요체.
- 절대 길게 설명하지 말 것. 사용자가 답하기 쉽게 짧게.
- JSON·마크다운·코드블록 출력 금지. 평문 한국어만.

# 도구 호출 의무 (매우 중요)
- 다음 정보 중 하나라도 사용자 발화에서 추출 가능하면 같은 턴에서 반드시 functionCall을 발행합니다. 절대 reply만 보내고 끝내지 마세요.
  · 사용자의 호칭/이름이 발화에 등장 → save_user_name (예: "한석이라고 불러", "내 이름은 박철수야", "철수입니다")
  · 업종 표현 → save_business_type ("치킨집해", "카페 해요", "옷가게 운영 중")
  · 10자리 숫자(연속/하이픈) → save_business_number
  · 연동/연결/하자 등 동의 → start_connection
  · 스킵/나중/안할래 → skip_step
  · 모든 진행이 끝나고 사용자가 더 원치 않으면 → finish_onboarding
- 도구 호출 없이 "저장했어요"라고 말하지 마세요. 실제로는 저장되지 않습니다.

# 진행 순서 (이미 수집된 항목은 건너뛰기)
1. 이름 (name) — "어떻게 불러드릴까요?"
2. 업종 (business_type) — 음식점/카페/소매·유통/기타 중 또는 자유 입력
3. 사업자등록번호 (business_number) — 10자리
4. 연동 안내 — 홈택스 → 카드 → 계좌 → 배달앱 순으로 한 번에 하나만 권유
5. 모든 안내가 끝나면 finish_onboarding 호출

# 현재 수집 상태 (이미 채워진 값은 다시 묻지 말 것)
- 이름: ${state.name || "(미수집)"}
- 업종: ${state.business_type || "(미수집)"}
- 사업자번호: ${state.business_number || "(미수집)"}
- 홈택스 연동: ${state.hometax_connected ? "완료" : "미완료"}
- 카드 연동: ${state.card_connected ? "완료" : "미완료"}
- 계좌 연동: ${state.account_connected ? "완료" : "미완료"}
- 배달앱 연동: ${state.delivery_connected ? "완료" : "미완료"}
`;
}

function toGeminiContents(messages: ClientMessage[]) {
  const out: any[] = [];
  for (const m of messages) {
    if (m.role === "user") {
      out.push({ role: "user", parts: [{ text: m.content }] });
    } else if (m.role === "assistant") {
      out.push({ role: "model", parts: [{ text: m.content }] });
    } else if (m.role === "tool") {
      // 툴 실행 결과를 다음 user 턴으로 주입 (gemini functionResponse 형태)
      out.push({
        role: "user",
        parts: [
          {
            functionResponse: {
              name: m.toolName || "tool",
              response: { result: m.content },
            },
          },
        ],
      });
    }
  }
  return out;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY not configured");

    const body = await req.json();
    const messages: ClientMessage[] = Array.isArray(body?.messages)
      ? body.messages
      : [];
    const state: OnboardingState = body?.state || {};

    const systemPrompt = buildSystemPrompt(state);

    const payload = {
      systemInstruction: {
        role: "system",
        parts: [{ text: systemPrompt }],
      },
      contents: toGeminiContents(messages),
      tools: [{ functionDeclarations: TOOLS }],
      toolConfig: {
        functionCallingConfig: { mode: "AUTO" },
      },
      generationConfig: {
        temperature: 0.4,
        maxOutputTokens: 400,
      },
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);

    let response: Response;
    try {
      response = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify(payload),
      });
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      const t = await response.text();
      console.error("Gemini error:", response.status, t);
      return new Response(
        JSON.stringify({
          reply: "잠시 후 다시 말씀해주시겠어요?",
          toolCalls: [],
          done: false,
          error: `gemini_${response.status}`,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const data = await response.json();
    const candidate = data?.candidates?.[0];
    const parts = candidate?.content?.parts || [];

    let replyText = "";
    const toolCalls: { name: string; args: Record<string, unknown> }[] = [];

    for (const p of parts) {
      if (typeof p.text === "string" && p.text.trim()) {
        replyText += (replyText ? "\n" : "") + p.text.trim();
      }
      if (p.functionCall?.name) {
        toolCalls.push({
          name: p.functionCall.name,
          args: p.functionCall.args || {},
        });
      }
    }

    const done = toolCalls.some((c) => c.name === "finish_onboarding");

    return new Response(
      JSON.stringify({
        reply: replyText || "",
        toolCalls,
        done,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("onboarding-agent error:", e);
    return new Response(
      JSON.stringify({
        reply: "지금 잠깐 신호가 약하네요. 한 번만 다시 말씀해주시겠어요?",
        toolCalls: [],
        done: false,
        error: e instanceof Error ? e.message : "unknown",
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});