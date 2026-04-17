import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Vary": "Accept-Encoding",
};

const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

type ChatRole = "user" | "assistant" | "tool";
interface ClientMessage {
  role: ChatRole;
  content: string;
  toolName?: string;
}

interface PendingConnection {
  institution?: string;
  auth_type?: "cert" | "id_pw" | "simple";
  login_id?: string;
}

interface OnboardingState {
  name?: string | null;
  business_type?: string | null;
  business_number?: string | null;
  hometax_connected?: boolean;
  card_connected?: boolean;
  account_connected?: boolean;
  delivery_connected?: boolean;
  pending?: Partial<Record<"hometax" | "card" | "account" | "baemin" | "coupangeats", PendingConnection>>;
}

const TOOLS = [
  {
    name: "save_user_name",
    description:
      "대표님의 호칭(이름)을 추출해 저장합니다. '한석이라고 불러' -> name='한석'",
    parameters: {
      type: "OBJECT",
      properties: { name: { type: "STRING", description: "조사·어미를 제거한 순수 이름" } },
      required: ["name"],
    },
  },
  {
    name: "save_business_type",
    description: "업종을 저장합니다. '치킨집해'→치킨집, '카페해요'→카페.",
    parameters: {
      type: "OBJECT",
      properties: { business_type: { type: "STRING" } },
      required: ["business_type"],
    },
  },
  {
    name: "save_business_number",
    description: "사업자등록번호 10자리를 숫자만 추출해 저장.",
    parameters: {
      type: "OBJECT",
      properties: { business_number: { type: "STRING", description: "하이픈 제거 10자리" } },
      required: ["business_number"],
    },
  },
  {
    name: "prepare_connection",
    description:
      "특정 연동에 필요한 정보(기관/인증방식)를 단계별 대화로 받아 임시 저장합니다. 모든 필수 정보가 모이면 클라이언트가 자동으로 보안 입력 화면(비밀번호/인증서)을 띄웁니다. 한 번에 한 필드씩 채워 나가세요.",
    parameters: {
      type: "OBJECT",
      properties: {
        service: {
          type: "STRING",
          enum: ["hometax", "card", "account", "baemin", "coupangeats"],
          description: "연동 대상 서비스",
        },
        institution: {
          type: "STRING",
          description:
            "은행/카드사/플랫폼 이름. account=은행명(국민/신한/하나/우리/농협/카카오뱅크 등), card=카드사명(신한카드/삼성카드/현대카드/KB국민카드/롯데카드/우리카드/하나카드/BC카드 등). hometax/baemin/coupangeats는 비워둠.",
        },
        auth_type: {
          type: "STRING",
          enum: ["cert", "id_pw", "simple"],
          description:
            "인증 방식. cert=공동인증서, id_pw=아이디/비밀번호, simple=간편인증(홈택스 전용). 사용자가 명확히 선택했을 때만 채움.",
        },
        login_id: {
          type: "STRING",
          description: "ID/PW 방식일 때 사용자가 말한 아이디. 비밀번호는 절대 음성으로 받지 마세요.",
        },
      },
      required: ["service"],
    },
  },
  {
    name: "open_secure_input",
    description:
      "기관/인증방식 등 필수 정보가 모두 모였을 때 호출. 클라이언트가 비밀번호/인증서 파일만 입력받는 보안 시트를 엽니다. 같은 service에 대해 prepare_connection으로 정보를 다 모은 직후에 호출하세요.",
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
    description: "현재 단계 또는 특정 연동을 건너뜁니다.",
    parameters: {
      type: "OBJECT",
      properties: {
        target: { type: "STRING", enum: ["hometax", "card", "account", "delivery", "current"] },
      },
      required: ["target"],
    },
  },
  {
    name: "finish_onboarding",
    description: "기본 정보가 모두 수집되고 사용자가 더 이상 연동을 원치 않을 때 종료.",
    parameters: { type: "OBJECT", properties: {} },
  },
];

function buildSystemPrompt(state: OnboardingState): string {
  return `당신은 '김비서'라는 이름의 AI 온보딩 비서입니다. 사장님(=대표님)이 처음 사용할 수 있게 안내합니다.

# 절대 규칙
- 사용자를 반드시 "대표님"이라 호칭. '사장님', '고객님', '회원님' 금지.
- 모든 응답은 반드시 (1) 직전 입력에 대한 짧은 확인/반응 + (2) 다음 미수집 항목을 묻는 후속 질문. 두 줄 이내, 매우 간결.
- 절대 확인/반응만 하고 끝내지 마세요. 반드시 다음 질문을 덧붙이세요.
- 한 번에 한 가지만 묻고, 이미 수집된 정보는 다시 묻지 않습니다.
- 이모지는 한 응답에 최대 1개. 친근한 ~해요체. JSON·마크다운·코드블록 금지.

# 못 알아들었을 때 (매우 중요)
- 사용자 발화가 모호하거나, 잡음/오타/엉뚱한 단어로 보이거나, 현재 묻고 있는 항목과 무관하면:
  · 같은 질문을 똑같이 반복하지 마세요. 절대 금지.
  · 자연스럽게 "아, 잘 못 들었어요" / "혹시 ○○를 말씀하신 걸까요?" / "한 번만 더 또박또박 말씀해 주실 수 있을까요?" 같은 사람다운 반응을 먼저 하세요.
  · 그다음 같은 항목을 다른 표현으로 부드럽게 다시 물어보세요. (예: 사업자번호 → "사업자등록증에 적힌 10자리 숫자만 불러주셔도 돼요")
  · 추측해서 도구 호출 금지. 명확하지 않으면 저장하지 마세요.
- 사용자가 "모르겠어요/없어요/나중에" 라고 하면 skip_step 도구로 건너뛰고 다음 단계로 진행하세요.

# 재방문 시 (시스템 메시지로 전달됨)
- "(시스템:" 으로 시작하는 메시지는 내부 지시입니다. 대표님에게 자연스럽게 인사하고 이어서 다음 미수집 항목을 물으세요.
- 예: "반갑습니다 {이름} 대표님! 지난번에 이름과 업종까지 알려주셨어요. 사업자등록번호 10자리만 알려주시겠어요?"

# 도구 호출 의무 (텍스트와 함께 같은 턴에 발행)
- 사용자 발화에서 추출 가능하면 같은 응답에서 즉시 functionCall도 함께 발행하세요.
  · 이름/호칭 → save_user_name
  · 업종 → save_business_type
  · 10자리 숫자(사업자번호) → save_business_number
  · 연동 진행/기관·인증방식 선택 → prepare_connection (한 필드씩)
  · 모든 정보(기관+인증방식, ID/PW면 login_id 포함)가 모이면 → open_secure_input
  · 스킵/나중에 → skip_step
  · 모두 끝나면 → finish_onboarding
- 도구 호출 없이 "저장했어요"라고 말하지 마세요. 실제 저장이 안 됩니다.
- 추출한 도구 호출과 함께 반드시 다음 안내 텍스트도 한 번에 출력하세요. (한 라운드에 모든 것 처리)

# 진행 순서 (이미 수집된 항목 건너뛰기)
1. 이름 → 2. 업종(음식점/카페/소매·유통/기타) → 3. 사업자등록번호 10자리
4. 연동 안내 — 홈택스 → 카드 → 계좌 → 배달앱, 한 번에 하나만 권유
5. 모두 끝나면 finish_onboarding

# 대화형 연동 진행 절차 (매우 중요)
사용자가 특정 연동에 동의하면 ConnectionHub 같은 별도 화면을 열지 말고, 한 번에 한 가지 정보만 대화로 받습니다.

⚠️ 공통 원칙(은행/카드/배달앱): 매 턴마다 반드시 (1) 직전 발화에 대한 짧은 확인/공감 + (2) 다음 미수집 항목 질문을 함께 출력하세요. 같은 질문 두 턴 연속 반복 금지. 정보가 모이는 순간 같은 응답 안에서 prepare_connection과 open_secure_input을 연속 호출하세요(절대 안내 문구만 보내고 끝내지 말 것).

[계좌 연동]
1) 사용자가 은행 연동 의사를 처음 밝히면: "어느 은행을 연동할까요? 국민·신한·하나·우리·농협·카카오뱅크 중에 알려주세요."
2) 은행명 말하면 → 같은 턴에 prepare_connection(service="account", institution="신한") 호출 + 텍스트 "신한은행으로 진행할게요. 공동인증서로 하실래요, 아니면 인터넷뱅킹 아이디·비밀번호로 하실래요?"
3) 인증방식 답하면 → 같은 턴에 prepare_connection(service="account", auth_type="cert" 또는 "id_pw") 호출.
   · cert면 즉시 같은 턴에 open_secure_input(service="account")까지 호출 + "공동인증서 파일과 비밀번호 입력 화면을 열어드릴게요."
   · id_pw면 텍스트 "인터넷뱅킹 아이디만 말씀해 주세요. 비밀번호는 다음 화면에서 안전하게 입력하시면 돼요."
4) 아이디 받으면 → 같은 턴에 prepare_connection(service="account", login_id="...") + open_secure_input(service="account") 연속 호출 + "비밀번호 입력 화면을 열어드릴게요."

[카드 연동]
1) 카드 연동 의사 처음 밝히면: "어느 카드사인가요? 신한·삼성·현대·KB국민·롯데·우리·하나·BC 중에 골라주세요."
2) 카드사 말하면 → 같은 턴에 prepare_connection(service="card", institution="...") + "○○카드로 진행할게요. 공동인증서 또는 카드사 홈페이지 아이디·비밀번호 중 어떤 걸로 하실래요?"
3) 인증방식 답하면 → 같은 턴에 prepare_connection(service="card", auth_type=...) 호출.
   · cert면 즉시 같은 턴에 open_secure_input(service="card")까지 호출 + "공동인증서 파일과 비밀번호 입력 화면을 열어드릴게요."
   · id_pw면 텍스트 "카드사 홈페이지 아이디만 말씀해 주세요. 비밀번호는 다음 화면에서 안전하게 입력하시면 돼요."
4) 아이디 받으면 → 같은 턴에 prepare_connection(service="card", login_id="...") + open_secure_input(service="card") 연속 호출 + "비밀번호 입력 화면을 열어드릴게요."

[홈택스 연동] ⚠️ 중요: 인증 방식을 절대 묻지 말 것. 무조건 공동인증서로만 진행.
- 사용자가 홈택스 연동 의사를 밝히면 **같은 응답 안에서 반드시 두 함수를 연속 호출**:
  (1) prepare_connection(service="hometax", auth_type="cert")
  (2) open_secure_input(service="hometax")
- 텍스트는 짧게: "홈택스 공동인증서 입력 화면을 열어드릴게요." 정도만. 안내만 하고 함수를 호출하지 않으면 안 됨.

[배달앱 연동 - 배민/쿠팡이츠]
1) "배달의민족과 쿠팡이츠 둘 다 쓰세요? 먼저 어느 쪽부터 할까요?" → service 결정 (baemin 또는 coupangeats)
2) "사장님 사이트 아이디만 알려주세요. 비밀번호는 다음 화면에서요." → prepare_connection(service=..., auth_type="id_pw", login_id="...")
3) open_secure_input(service=...)

# 현재 수집 상태 (이미 채워진 값은 다시 묻지 말 것)
- 이름: ${state.name || "(미수집)"}
- 업종: ${state.business_type || "(미수집)"}
- 사업자번호: ${state.business_number || "(미수집)"}
- 홈택스: ${state.hometax_connected ? "완료" : "미완료"}
- 카드: ${state.card_connected ? "완료" : "미완료"}
- 계좌: ${state.account_connected ? "완료" : "미완료"}
- 배달앱: ${state.delivery_connected ? "완료" : "미완료"}
- 진행 중인 연동 정보: ${JSON.stringify(state.pending || {})}
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
      out.push({
        role: "user",
        parts: [{
          functionResponse: {
            name: m.toolName || "tool",
            response: { result: m.content },
          },
        }],
      });
    }
  }
  return out;
}

function acceptsGzip(req: Request): boolean {
  const ae = req.headers.get("accept-encoding") || "";
  return ae.toLowerCase().includes("gzip");
}

async function gzipBody(text: string): Promise<Uint8Array> {
  const stream = new Blob([text]).stream().pipeThrough(new CompressionStream("gzip"));
  const buf = await new Response(stream).arrayBuffer();
  return new Uint8Array(buf);
}

async function jsonResponse(req: Request, obj: unknown, status = 200): Promise<Response> {
  const text = JSON.stringify(obj);
  const baseHeaders: Record<string, string> = { ...corsHeaders, "Content-Type": "application/json" };
  if (acceptsGzip(req) && text.length > 512) {
    const gz = await gzipBody(text);
    return new Response(gz, { status, headers: { ...baseHeaders, "Content-Encoding": "gzip" } });
  }
  return new Response(text, { status, headers: baseHeaders });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY not configured");

    const body = await req.json().catch(() => ({}));

    // 워밍업 핑: 비싼 작업 없이 바로 OK
    if (body?.warmup === true) {
      return await jsonResponse(req, { ok: true, warmed: true });
    }

    const messages: ClientMessage[] = Array.isArray(body?.messages) ? body.messages : [];
    const state: OnboardingState = body?.state || {};

    const systemPrompt = buildSystemPrompt(state);

    // 단일 패스: 텍스트 + functionCall을 한 번에 받기 (mode AUTO)
    const payload = {
      systemInstruction: { role: "system", parts: [{ text: systemPrompt }] },
      contents: toGeminiContents(messages),
      tools: [{ functionDeclarations: TOOLS }],
      toolConfig: { functionCallingConfig: { mode: "AUTO" } },
      generationConfig: { temperature: 0.3, maxOutputTokens: 350 },
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
      return await jsonResponse(req, {
        reply: "잠시 후 다시 말씀해주시겠어요?",
        toolCalls: [],
        done: false,
        error: `gemini_${response.status}`,
      });
    }

    const data = await response.json();
    const parts = data?.candidates?.[0]?.content?.parts || [];

    let replyText = "";
    const toolCalls: { name: string; args: Record<string, unknown> }[] = [];
    for (const p of parts) {
      if (typeof p.text === "string" && p.text.trim()) {
        replyText += (replyText ? "\n" : "") + p.text.trim();
      }
      if (p.functionCall?.name) {
        toolCalls.push({ name: p.functionCall.name, args: p.functionCall.args || {} });
      }
    }

    const done = toolCalls.some((c) => c.name === "finish_onboarding");
    return await jsonResponse(req, { reply: replyText || "", toolCalls, done });
  } catch (e) {
    console.error("onboarding-agent error:", e);
    return await jsonResponse(req, {
      reply: "지금 잠깐 신호가 약하네요. 한 번만 다시 말씀해주시겠어요?",
      toolCalls: [],
      done: false,
      error: e instanceof Error ? e.message : "unknown",
    });
  }
});
