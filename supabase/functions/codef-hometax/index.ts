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

const BUSINESS_STATUS_PATH = "/v1/kr/public/nt/business/status";
const ACCOUNT_CREATE_PATH = "/v1/account/create";

// RSA PKCS1 v1.5 암호화 — 은행(codef-bank)과 동일한 UTF-8 바이트 기준 구현
function encryptRSAPKCS1(plainText: string, rawPublicKey: string): string {
  const cleanKey = rawPublicKey.replace(/-----BEGIN PUBLIC KEY-----|-----END PUBLIC KEY-----|[\r\n\s]/g, "");
  const derBytes = forge.util.decode64(cleanKey);
  const asn1 = forge.asn1.fromDer(derBytes);
  const publicKey = forge.pki.publicKeyFromAsn1(asn1);

  const utf8Bytes = new TextEncoder().encode(plainText);
  let binaryStr = "";
  for (const byte of utf8Bytes) {
    binaryStr += String.fromCharCode(byte);
  }

  const encrypted = publicKey.encrypt(binaryStr, "RSAES-PKCS1-V1_5");
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

// 동적 공개키 조회 (은행과 동일) — 실패 시 환경변수 폴백
async function getPublicKey(accessToken: string): Promise<string> {
  try {
    const response = await fetch(`${CODEF_API_URL}/v1/common/public-key`, {
      method: "GET",
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!response.ok) throw new Error(`Public key request failed: ${response.status}`);
    const text = await response.text();
    try {
      const json = JSON.parse(text);
      return json.publicKey || json.data?.publicKey || text.trim();
    } catch {
      return text.trim();
    }
  } catch (err) {
    console.error("Dynamic public key fetch failed, using env fallback:", err);
    const envKey = Deno.env.get("CODEF_PUBLIC_KEY") || "";
    if (!envKey) throw new Error("공개키를 가져올 수 없습니다.");
    return envKey;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { action, clientType: rawClientType } = body;
    const clientType = (rawClientType === "B") ? "B" : "P";

    if (action === "register") {
      return await handleRegister(req, body, clientType);
    } else {
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
 * 사업자 상태 조회
 */
async function handleBusinessVerify(body: any): Promise<Response> {
  const { businessNumber } = body;

  if (!businessNumber) {
    return new Response(
      JSON.stringify({ success: false, error: "사업자등록번호를 입력해주세요." }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const cleanedNumber = businessNumber.replace(/\D/g, "");
  if (cleanedNumber.length !== 10) {
    return new Response(
      JSON.stringify({ success: false, error: "사업자등록번호는 10자리여야 합니다." }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const accessToken = await getAccessToken();

  const requestBody = {
    organization: "0004",
    reqIdentityList: [{ reqIdentity: cleanedNumber }],
  };

  console.log("Calling Hometax business status API...");
  const response = await fetch(`${CODEF_API_URL}${BUSINESS_STATUS_PATH}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(requestBody),
  });

  const responseText = await response.text();
  const data = parseCodefResponse(responseText);

  const result = data.result || {};
  const businessDataArray = Array.isArray(data.data) ? data.data : [data.data];
  const matchingData =
    businessDataArray.find((item: any) => item?.resCompanyIdentityNo === cleanedNumber) ||
    businessDataArray[0] ||
    {};

  const businessName = matchingData.resCompanyNm || matchingData.resCompanyName || matchingData.resBusinessName || null;
  const businessType = matchingData.resBusinessType || matchingData.resBusinessCategory || null;
  const isSuccess = result.code === "CF-00000";

  return new Response(
    JSON.stringify({
      success: isSuccess,
      message: isSuccess ? "사업자 정보가 확인되었습니다." : result.message || "조회에 실패했습니다.",
      code: result.code,
      data: isSuccess
        ? {
            businessNumber: matchingData.resCompanyIdentityNo || cleanedNumber,
            businessStatus: matchingData.resBusinessStatus || "조회 결과 없음",
            taxationType: matchingData.resTaxationTypeCode || "-",
            taxationTypeDesc: getTaxationTypeDesc(matchingData.resTaxationTypeCode),
            businessName,
            businessType,
          }
        : null,
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

/**
 * 공동인증서 방식 계정 등록
 * - CODEF 공식 규격: loginType "0" (인증서), derFile/keyFile 또는 certFile+certType
 * - 은행(codef-bank)과 동일한 파라미터 구조 사용
 */
async function handleRegister(_req: Request, body: any, clientType: string = "P"): Promise<Response> {
  const { businessNumber, certFileBase64, certPassword, keyFileBase64, identity } = body;

  if (!businessNumber || !certFileBase64 || !certPassword) {
    return new Response(
      JSON.stringify({
        success: false,
        error: "사업자등록번호, 인증서 파일, 인증서 비밀번호를 모두 입력해주세요.",
      }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const cleanedNumber = businessNumber.replace(/\D/g, "");
  const cleanedIdentity = identity ? String(identity).replace(/\D/g, "") : "";
  const accessToken = await getAccessToken();

  // 동적 공개키 조회 (은행과 동일)
  const publicKey = await getPublicKey(accessToken);
  console.log("Using public key, length:", publicKey.length);

  // 인증서 비밀번호를 RSA 암호화
  const encryptedPassword = encryptRSAPKCS1(certPassword, publicKey);

  // 홈택스(NT) 전용 규격 — CODEF 홈택스 데모 페이지 기준:
  //   * DER+KEY: certFile(DER) + keyFile(.key) + certType "1"
  //   * PFX/P12: certFile + certType "pfx" (keyFile 없음)
  //   * 비밀번호 필드명은 기관별 편차가 있어 password → certPassword 순으로 시도
  //   * organization: 0001(국세청 일반) → 0002(전자세금계산서)
  //   * loginType: "0" (공동인증서). NT는 "2"를 거부하므로 더 이상 사용하지 않음.
  //   * identity: 개인 공동인증서의 경우 주민번호(또는 법인번호)가 필요할 수 있음
  const isDerMode = !!keyFileBase64;
  const attemptPlans: Array<{ organization: string; passwordKey: "password" | "certPassword" }> = [
    { organization: "0001", passwordKey: "password" },
    { organization: "0002", passwordKey: "password" },
    { organization: "0001", passwordKey: "certPassword" },
    { organization: "0002", passwordKey: "certPassword" },
  ];

  const buildEntry = (
    organization: string,
    passwordKey: "password" | "certPassword",
  ): Record<string, unknown> => {
    const entry: Record<string, unknown> = {
      countryCode: "KR",
      businessType: "NT",
      clientType,
      organization,
      loginType: "0",
    };
    entry[passwordKey] = encryptedPassword;
    if (isDerMode) {
      // DER + KEY 분리 방식 (홈택스 NT 규격): certFile(=DER) + keyFile + certType "1"
      entry.certFile = certFileBase64;
      entry.keyFile = keyFileBase64;
      entry.certType = "1";
    } else {
      // PFX/P12 통합 파일
      entry.certFile = certFileBase64;
      entry.certType = "pfx";
    }
    if (cleanedIdentity) {
      entry.identity = cleanedIdentity;
    }
    return entry;
  };

  console.log(
    `Registering hometax account with certificate, identity=${cleanedNumber}, ` +
    `clientType=${clientType}, certMode=${isDerMode ? "DER+KEY" : "PFX"}, ` +
    `attempts=${attemptPlans.map((p) => `${p.loginType}:${p.organization}`).join(",")}`
  );

  let responseText = "";
  let data: any = {};
  let result: any = {};
  let lastErrorList: any[] = [];

  for (const plan of attemptPlans) {
    const accountEntry = buildEntry(plan.organization, plan.loginType);
    const requestBody = { accountList: [accountEntry] };

    // 디버그: 실제 보내는 페이로드 메타 (값은 노출 X, 길이/존재만)
    const debugMeta = {
      loginType: accountEntry.loginType,
      organization: accountEntry.organization,
      clientType: accountEntry.clientType,
      businessType: accountEntry.businessType,
      countryCode: accountEntry.countryCode,
      passwordLen: String(accountEntry.password || "").length,
      hasCertFile: !!accountEntry.certFile,
      certFileLen: String(accountEntry.certFile || "").length,
      hasDerFile: !!accountEntry.derFile,
      derFileLen: String(accountEntry.derFile || "").length,
      hasKeyFile: !!accountEntry.keyFile,
      keyFileLen: String(accountEntry.keyFile || "").length,
      certType: accountEntry.certType ?? null,
      keys: Object.keys(accountEntry),
    };
    console.log(`→ Payload meta:`, JSON.stringify(debugMeta));

    // 카드/은행과 동일하게 JSON body로 전송해 기관별 파라미터 처리 차이를 제거한다.
    const response = await fetch(`${CODEF_API_URL}${ACCOUNT_CREATE_PATH}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(requestBody),
    });

    responseText = await response.text();
    console.log(
      `Account create response (loginType=${plan.loginType}, org=${plan.organization}):`,
      responseText.substring(0, 1500),
    );

    data = parseCodefResponse(responseText);
    result = data.result || {};
    lastErrorList = data.data?.errorList || [];

    if (lastErrorList.length > 0) {
      console.log(`← CODEF echo errorList:`, JSON.stringify(lastErrorList));
    }

    if (result.code === "CF-00000" && data.data?.connectedId) break;
    if ((data.data?.successList?.length || 0) > 0 && data.data?.connectedId) break;

    const hasParamError = lastErrorList.some((e: any) => e.code === "CF-00007");
    if (!hasParamError) break;
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
  const successList = data.data?.successList || [];
  
  // successList에 connectedId가 있는 경우도 처리
  if (successList.length > 0 && data.data?.connectedId) {
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
    "CF-00000": "정상 처리되었습니다.",
    "CF-00006": "해당 기관에서 사용할 수 없는 인증서입니다. 홈택스용 공동인증서인지 확인해주세요.",
    "CF-00007": "인증서 파일 또는 비밀번호가 올바르지 않습니다. 다시 확인해주세요.",
    "CF-00015": "요청 횟수가 초과되었습니다. 1~2분 후 다시 시도해주세요.",
    "CF-00016": "동시 요청이 제한되었습니다. 잠시 후 다시 시도해주세요.",
    "CF-00401": "인증 세션이 만료되었습니다. 다시 시도해주세요.",
    "CF-04000": "인증서 또는 비밀번호가 올바르지 않습니다. 다시 확인해주세요.",
    "CF-04002": "인증서 비밀번호가 올바르지 않습니다.",
    "CF-04003": "인증서가 만료되었습니다. 갱신된 인증서를 사용해주세요.",
    "CF-04004": "인증서가 폐기되었습니다. 새 인증서를 발급받아주세요.",
    "CF-04005": "인증서 형식이 올바르지 않습니다. PFX/P12 또는 DER+KEY 파일을 확인해주세요.",
    "CF-04009": "인증서 정보가 올바르지 않습니다. 인증서 파일과 비밀번호를 다시 확인해주세요.",
    "CF-04012": "이미 등록된 계정입니다. 기존 연동을 해제한 후 다시 시도해주세요.",
    "CF-04020": "인증서 비밀번호가 올바르지 않습니다. 정확히 입력해주세요.",
    "CF-04030": "등록할 수 없는 계정입니다. 홈택스에서 계정 상태를 확인해주세요.",
    "CF-09998": "홈택스 서버 점검 중입니다. 잠시 후 다시 시도해주세요.",
    "CF-09999": "홈택스 서버에 일시적인 문제가 발생했습니다. 잠시 후 다시 시도해주세요.",
    "CF-13000": "홈택스 서버가 응답하지 않습니다. 잠시 후 다시 시도해주세요.",
    "CF-13300": "홈택스 서버와 통신 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.",
    "CF-94002": "계정 정보 설정에 실패했습니다. 인증서와 사업자번호를 다시 확인해주세요.",
  };
  return messages[code] || `홈택스 연결 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요. (${code})`;
}
