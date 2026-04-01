import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import forge from "npm:node-forge@1.3.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const CODEF_API_URL = "https://api.codef.io";
const CODEF_TOKEN_URL = "https://oauth.codef.io/oauth/token";

// 홈택스 API 경로
const BUSINESS_STATUS_PATH = "/v1/kr/public/nt/business/status";
const ACCOUNT_CREATE_PATH = "/v1/account/create";

// 홈택스 전자세금계산서 간편인증 수단 매핑 (CODEF 문서 기준)
const SIMPLE_AUTH_METHODS: Record<string, string> = {
  kakao: "1",     // 카카오톡
  samsung: "3",   // 삼성패스
  pass: "5",      // PASS (통신사)
  naver: "6",     // 네이버
  toss: "8",      // 토스
};

function encryptRSAPKCS1(plainText: string, base64PublicKey: string): string {
  const pem = `-----BEGIN PUBLIC KEY-----\n${base64PublicKey
    .match(/.{1,64}/g)!
    .join("\n")}\n-----END PUBLIC KEY-----`;
  const publicKey = forge.pki.publicKeyFromPem(pem);
  // UTF-8 바이트 변환 후 암호화
  const bytes = forge.util.encodeUtf8(plainText);
  const encrypted = publicKey.encrypt(bytes, "RSAES-PKCS1-V1_5");
  return forge.util.encode64(encrypted);
}

function parseCodefResponse(text: string): any {
  try {
    return JSON.parse(text);
  } catch {
    try {
      const decoded = decodeURIComponent(text.replace(/\+/g, " "));
      return JSON.parse(decoded);
    } catch {
      return { raw: text };
    }
  }
}

async function getAccessToken(): Promise<string> {
  const clientId = Deno.env.get("CODEF_CLIENT_ID");
  const clientSecret = Deno.env.get("CODEF_CLIENT_SECRET");
  if (!clientId || !clientSecret) {
    throw new Error("CODEF credentials not configured");
  }
  const credentials = btoa(`${clientId}:${clientSecret}`);
  const response = await fetch(CODEF_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${credentials}`,
    },
    body: "grant_type=client_credentials&scope=read",
  });
  if (!response.ok) throw new Error(`Token request failed: ${response.status}`);
  const data = await response.json();
  return data.access_token;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { action } = body;

    if (action === "register") {
      return await handleRegister(req, body);
    } else if (action === "confirm2Way") {
      return await handleConfirm2Way(req, body);
    } else {
      // 기본: 사업자 상태 조회 (기존 로직)
      return await handleBusinessVerify(body);
    }
  } catch (error) {
    console.error("Hometax API error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "알 수 없는 오류가 발생했습니다.",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

/**
 * 사업자 상태 조회 (기존 로직 유지)
 */
async function handleBusinessVerify(body: any): Promise<Response> {
  const { businessNumber } = body;

  if (!businessNumber) {
    return new Response(
      JSON.stringify({
        success: false,
        error: "사업자등록번호를 입력해주세요.",
      }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  const cleanedNumber = businessNumber.replace(/\D/g, "");
  if (cleanedNumber.length !== 10) {
    return new Response(
      JSON.stringify({
        success: false,
        error: "사업자등록번호는 10자리여야 합니다.",
      }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  const accessToken = await getAccessToken();

  const requestBody = {
    organization: "0004",
    reqIdentityList: [{ reqIdentity: cleanedNumber }],
  };

  console.log("Calling Hometax business status API...");
  const response = await fetch(
    `${CODEF_API_URL}${BUSINESS_STATUS_PATH}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(requestBody),
    }
  );

  const responseText = await response.text();
  const data = parseCodefResponse(responseText);

  const result = data.result || {};
  const businessDataArray = Array.isArray(data.data)
    ? data.data
    : [data.data];
  const matchingData =
    businessDataArray.find(
      (item: any) => item?.resCompanyIdentityNo === cleanedNumber
    ) ||
    businessDataArray[0] ||
    {};

  const businessName =
    matchingData.resCompanyNm ||
    matchingData.resCompanyName ||
    matchingData.resBusinessName ||
    null;
  const businessType =
    matchingData.resBusinessType ||
    matchingData.resBusinessCategory ||
    null;

  const isSuccess = result.code === "CF-00000";

  return new Response(
    JSON.stringify({
      success: isSuccess,
      message: isSuccess
        ? "사업자 정보가 확인되었습니다."
        : result.message || "조회에 실패했습니다.",
      code: result.code,
      data: isSuccess
        ? {
            businessNumber:
              matchingData.resCompanyIdentityNo || cleanedNumber,
            businessStatus:
              matchingData.resBusinessStatus || "조회 결과 없음",
            taxationType: matchingData.resTaxationTypeCode || "-",
            taxationTypeDesc: getTaxationTypeDesc(
              matchingData.resTaxationTypeCode
            ),
            businessName,
            businessType,
          }
        : null,
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

/**
 * 간편인증 계정 등록 (1단계: 2-way 인증 요청)
 */
async function handleRegister(
  req: Request,
  body: any
): Promise<Response> {
  const { businessNumber, authMethod, userName, phoneNo, birthDate } = body;

  if (!businessNumber || !authMethod || !userName || !phoneNo || !birthDate) {
    return new Response(
      JSON.stringify({
        success: false,
        error: "사업자등록번호, 인증 수단, 이름, 전화번호, 생년월일을 모두 입력해주세요.",
      }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  const loginTypeLevel = SIMPLE_AUTH_METHODS[authMethod];
  if (!loginTypeLevel) {
    return new Response(
      JSON.stringify({
        success: false,
        error: "지원하지 않는 인증 수단입니다.",
      }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  // 전화번호 정리: E.164(+82...) → 국내 형식(010...), 하이픈 제거
  const cleanedPhone = phoneNo.replace(/^\+?82/, "0").replace(/\D/g, "");

  const cleanedNumber = businessNumber.replace(/\D/g, "");
  const accessToken = await getAccessToken();
  const publicKey = Deno.env.get("CODEF_PUBLIC_KEY") || "";
  const cleanedBirthDate = birthDate.replace(/\D/g, ""); // YYYYMMDD
  const shortBirthDate = cleanedBirthDate.slice(-6); // yymmdd

  // CODEF requires id and password to be RSA-encrypted even if empty
  const encryptedId = publicKey ? encryptRSAPKCS1("", publicKey) : "";
  const encryptedPassword = publicKey ? encryptRSAPKCS1("", publicKey) : "";

  const requestBody = {
    accountList: [
      {
        countryCode: "KR",
        businessType: "NT",
        clientType: "P",
        organization: "0002", // 홈택스 전자세금계산서 계열
        loginType: "5",
        loginTypeLevel,
        identity: cleanedNumber, // 사업자번호
        loginIdentity: shortBirthDate, // CODEF 샘플 기준 간편인증 식별값
        id: encryptedId,
        password: encryptedPassword,
        userName,
        phoneNo: cleanedPhone,
        birthDate: "", // 샘플 기준 loginIdentity 사용 시 비움
        type: "0",
      },
    ],
  };

  console.log(
    `Registering hometax account with simple auth (${authMethod}, level=${loginTypeLevel}), userName=${userName}, phoneNo=${cleanedPhone}, birthDate=${cleanedBirthDate}, loginIdentity=${shortBirthDate}, identity=${cleanedNumber}`
  );
  console.log("Request body:", JSON.stringify(requestBody));

  const response = await fetch(`${CODEF_API_URL}${ACCOUNT_CREATE_PATH}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(requestBody),
  });

  const responseText = await response.text();
  console.log("Account create response:", responseText.substring(0, 1000));

  const data = parseCodefResponse(responseText);
  const result = data.result || {};

  // 2-way 인증 필요한 경우 (CF-03002: 추가 인증 필요)
  if (result.code === "CF-03002" && data.data) {
    const twoWayInfo = data.data.twoWayInfo || data.data;
    return new Response(
      JSON.stringify({
        success: true,
        status: "2way_required",
        message:
          "간편인증 요청이 전송되었습니다. 휴대폰에서 인증을 완료해주세요.",
        twoWayInfo: {
          jobId: twoWayInfo.jobId,
          threadId: twoWayInfo.threadId,
          jti: twoWayInfo.jti,
          twoWayTimestamp: twoWayInfo.twoWayTimestamp,
        },
        extraInfo: data.data.extraInfo || null,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // 즉시 성공 (connectedId 발급)
  if (result.code === "CF-00000" && data.data?.connectedId) {
    return new Response(
      JSON.stringify({
        success: true,
        status: "completed",
        message: "홈택스 계정이 등록되었습니다.",
        connectedId: data.data.connectedId,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // 에러
  const errorList = data.data?.errorList || [];
  const detailMessage = errorList.length > 0
    ? errorList.map((e: any) => `[${e.code}] ${e.message}`).join(", ")
    : null;
  const errorMessage = detailMessage || getHometaxErrorMessage(result.code);
  console.error("Account create failed:", result.code, result.message, JSON.stringify(errorList));
  return new Response(
    JSON.stringify({
      success: false,
      error: errorMessage,
      code: result.code,
      details: errorList,
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

/**
 * 2-way 인증 확인 (2단계: 사용자가 폰에서 인증 완료 후 호출)
 */
async function handleConfirm2Way(
  req: Request,
  body: any
): Promise<Response> {
  const { businessNumber, authMethod, twoWayInfo } = body;
  const userName = body.userName || "";
  const phoneNo = body.phoneNo || "";

  if (!businessNumber || !authMethod || !twoWayInfo) {
    return new Response(
      JSON.stringify({
        success: false,
        error: "필수 정보가 누락되었습니다.",
      }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  const loginTypeLevel = SIMPLE_AUTH_METHODS[authMethod];
  const cleanedNumber = businessNumber.replace(/\D/g, "");
  const cleanedPhone = phoneNo.replace(/^\+?82/, "0").replace(/\D/g, "");
  const cleanedBirthDate = (body.birthDate || "").replace(/\D/g, "");
  const shortBirthDate = cleanedBirthDate.slice(-6);
  const accessToken = await getAccessToken();
  const publicKey = Deno.env.get("CODEF_PUBLIC_KEY") || "";
  const encryptedId = publicKey ? encryptRSAPKCS1("", publicKey) : "";
  const encryptedPassword = publicKey ? encryptRSAPKCS1("", publicKey) : "";

  const requestBody = {
    accountList: [
      {
        countryCode: "KR",
        businessType: "NT",
        clientType: "P",
        organization: "0002",
        loginType: "5",
        loginTypeLevel,
        identity: cleanedNumber,
        loginIdentity: shortBirthDate,
        id: encryptedId,
        password: encryptedPassword,
        userName,
        phoneNo: cleanedPhone,
        birthDate: "",
        type: "0",
      },
    ],
    is2Way: true,
    twoWayInfo: {
      jobId: twoWayInfo.jobId,
      threadId: twoWayInfo.threadId,
      jti: twoWayInfo.jti,
      twoWayTimestamp: twoWayInfo.twoWayTimestamp,
    },
  };

  console.log("Confirming 2-way authentication...");

  const response = await fetch(`${CODEF_API_URL}${ACCOUNT_CREATE_PATH}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(requestBody),
  });

  const responseText = await response.text();
  console.log("2-way confirm response:", responseText.substring(0, 1000));

  const data = parseCodefResponse(responseText);
  const result = data.result || {};

  if (result.code === "CF-00000" && data.data?.connectedId) {
    return new Response(
      JSON.stringify({
        success: true,
        status: "completed",
        message: "홈택스 인증이 완료되었습니다.",
        connectedId: data.data.connectedId,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // 아직 인증 중인 경우
  if (result.code === "CF-03002") {
    return new Response(
      JSON.stringify({
        success: true,
        status: "2way_required",
        message: "아직 인증이 완료되지 않았습니다. 휴대폰에서 인증을 완료해주세요.",
        twoWayInfo,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const errorMessage = getHometaxErrorMessage(result.code);
  return new Response(
    JSON.stringify({
      success: false,
      error: errorMessage,
      code: result.code,
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

function getTaxationTypeDesc(code: string | undefined): string {
  const types: Record<string, string> = {
    "1": "부가가치세 일반과세자",
    "2": "부가가치세 간이과세자",
    "3": "부가가치세 면세사업자",
    "4": "비영리법인/국가기관",
    "5": "법인사업자",
    "98": "사업을 하지 않고 있음",
    "99": "조회 불가",
  };
  return types[code || ""] || "알 수 없음";
}

function getHometaxErrorMessage(code: string): string {
  const messages: Record<string, string> = {
    // 성공/진행
    "CF-00000": "정상 처리되었습니다.",
    "CF-03002": "간편인증 요청이 전송되었습니다.",

    // 파라미터/요청 오류
    "CF-00007": "입력 정보를 다시 확인해주세요. (이름, 전화번호, 생년월일이 간편인증 앱에 등록된 정보와 일치해야 합니다)",
    "CF-04000": "입력 정보에 오류가 있습니다. 사업자번호, 이름, 전화번호, 생년월일을 다시 확인해주세요.",
    "CF-04020": "입력한 정보가 올바르지 않습니다. 아이디 또는 비밀번호를 확인해주세요.",
    "CF-04030": "등록할 수 없는 계정입니다. 해당 기관에서 계정 상태를 확인해주세요.",

    // 인증 관련
    "CF-00401": "인증 세션이 만료되었습니다. 다시 시도해주세요.",
    "CF-12100": "간편인증 시간이 초과되었습니다. 2분 이내에 인증 앱에서 승인해주세요.",
    "CF-12101": "간편인증이 거부되었습니다. 인증 앱에서 '승인'을 눌러주세요.",
    "CF-12800": "인증 정보가 일치하지 않습니다. 간편인증 앱에 등록된 이름, 전화번호, 생년월일을 확인해주세요.",
    "CF-12801": "해당 인증 수단에 등록된 인증서가 없습니다. 다른 인증 수단을 선택하거나, 해당 앱에서 인증서를 먼저 등록해주세요.",

    // 기관/서버 오류
    "CF-09999": "홈택스 서버에 일시적인 문제가 발생했습니다. 잠시 후 다시 시도해주세요.",
    "CF-09998": "홈택스 서버 점검 중입니다. 잠시 후 다시 시도해주세요.",
    "CF-13000": "기관 서버가 응답하지 않습니다. 잠시 후 다시 시도해주세요.",
    "CF-13300": "기관 서버와 통신 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.",

    // 계정 관련
    "CF-04012": "이미 등록된 계정입니다.",
    "CF-00006": "해당 기관에서 사용할 수 없는 계정입니다.",
    "CF-00015": "요청 횟수가 초과되었습니다. 잠시 후 다시 시도해주세요.",
    "CF-00016": "동시 요청이 제한되었습니다. 잠시 후 다시 시도해주세요.",
  };
  return messages[code] || `홈택스 연결 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요. (오류코드: ${code})`;
}
