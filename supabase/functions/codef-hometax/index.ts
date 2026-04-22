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

// RSA PKCS1 v1.5 암호화 — SPKI 또는 PKCS#1 RSAPublicKey 모두 지원
function encryptRSAPKCS1(plainText: string, rawPublicKey: string): string {
  const cleanKey = rawPublicKey
    .replace(/-----BEGIN [^-]+-----|-----END [^-]+-----|[\r\n\s]/g, "");
  const derBytes = forge.util.decode64(cleanKey);
  const asn1 = forge.asn1.fromDer(derBytes);

  // SPKI(SubjectPublicKeyInfo) 우선 시도, 실패 시 PKCS#1 RSAPublicKey 직접 파싱
  let publicKey: forge.pki.rsa.PublicKey;
  try {
    publicKey = forge.pki.publicKeyFromAsn1(asn1) as forge.pki.rsa.PublicKey;
  } catch (_e) {
    publicKey = forge.pki.rsa.publicKeyFromAsn1(asn1);
  }

  const utf8Bytes = new TextEncoder().encode(plainText);
  let binaryStr = "";
  for (const byte of utf8Bytes) {
    binaryStr += String.fromCharCode(byte);
  }

  const encrypted = publicKey.encrypt(binaryStr, "RSAES-PKCS1-V1_5");
  console.log(
    `RSA encrypt: keyLen=${cleanKey.length}, plainBytes=${utf8Bytes.length}, cipherLen=${encrypted.length}`,
  );
  return forge.util.encode64(encrypted);
}

/**
 * signCert.der + signPri.key(암호화된 PKCS#8) → PKCS#12(PFX) base64
 * - 동일한 인증서 비밀번호로 개인키를 풀고 PFX로 다시 묶음
 */
function buildPfxFromDerKey(certBase64: string, keyBase64: string, password: string): string {
  // 1) DER 인증서 파싱
  const certDer = forge.util.decode64(certBase64);
  const certAsn1 = forge.asn1.fromDer(certDer);
  const cert = forge.pki.certificateFromAsn1(certAsn1);

  // 2) 암호화된 PKCS#8 개인키 복호화
  const keyDer = forge.util.decode64(keyBase64);
  const keyAsn1 = forge.asn1.fromDer(keyDer);
  const privateKey = forge.pki.decryptPrivateKeyInfo(keyAsn1, password)
    ? forge.pki.privateKeyFromAsn1(forge.pki.decryptPrivateKeyInfo(keyAsn1, password))
    : null;
  if (!privateKey) {
    throw new Error("개인키 복호화 실패 — 비밀번호가 일치하지 않을 수 있어요.");
  }

  // 3) PKCS#12 생성 (3DES, 동일 비밀번호로 보호)
  const p12Asn1 = forge.pkcs12.toPkcs12Asn1(privateKey, [cert], password, {
    algorithm: "3des",
    friendlyName: "hometax-cert",
  });
  const p12Der = forge.asn1.toDer(p12Asn1).getBytes();
  return forge.util.encode64(p12Der);
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
    } else if (action === "register_simple") {
      return await handleRegisterSimple(body, clientType);
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
 * - 홈택스(NT) 공동인증서는 loginType "2" 사용
 * - id/password는 RSA 암호화된 빈 문자열을 포함하고, 인증서 비밀번호는 certPassword에 매핑
 */
async function handleRegister(_req: Request, body: any, clientType: string = "P"): Promise<Response> {
  const { businessNumber, certFileBase64, derFileBase64, keyFileBase64, certPassword } = body;
  const hasDerKey = Boolean(derFileBase64 && keyFileBase64);
  const hasPfx = Boolean(certFileBase64);

  if (!businessNumber || !certPassword || (!hasDerKey && !hasPfx)) {
    return new Response(
      JSON.stringify({
        success: false,
        error: "사업자등록번호, 인증서 파일, 인증서 비밀번호를 모두 입력해주세요.",
      }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const cleanedNumber = businessNumber.replace(/\D/g, "");
  const accessToken = await getAccessToken();

  // 동적 공개키 조회 (은행과 동일)
  const publicKey = await getPublicKey(accessToken);
  console.log("Using public key, length:", publicKey.length);

  // 홈택스 공동인증서 규격: id/password 빈값도 RSA 암호화해 포함하고, 인증서 비밀번호는 certPassword로 전송
  const encryptedEmpty = encryptRSAPKCS1("", publicKey);
  const encryptedCertPassword = encryptRSAPKCS1(certPassword, publicKey);

  // v3: DER+KEY 원본 전송을 유지하되, CODEF 계정등록 샘플에 맞춰 certType:"1"을 함께 보낸다.
  // PFX 단일 파일이 들어오면 종전대로 certFile + certType:"pfx"로 전송.
  const attemptPlans: Array<{ organization: string }> = [
    { organization: "0001" },
  ];

  const buildEntry = (organization: string): Record<string, unknown> => {
    const base: Record<string, unknown> = {
      countryCode: "KR",
      businessType: "NT",
      clientType,
      organization,
      loginType: "2",
      id: encryptedEmpty,
      password: encryptedEmpty,
      certPassword: encryptedCertPassword,
    };
    if (hasDerKey) {
      base.certType = "1";
      base.derFile = derFileBase64;
      base.keyFile = keyFileBase64;
    } else {
      base.certFile = certFileBase64;
      base.certType = "pfx";
    }
    return base;
  };

  console.log(
    `Registering hometax account (mode=${hasDerKey ? "DER+KEY" : "PFX"}), ` +
    `businessNumber=${cleanedNumber}, clientType=${clientType}, ` +
      `attempts=${attemptPlans.map((p) => p.organization).join(",")}`
  );

  let responseText = "";
  let data: any = {};
  let result: any = {};
  let lastErrorList: any[] = [];

  for (const plan of attemptPlans) {
    const accountEntry = buildEntry(plan.organization);
    const requestBody = { accountList: [accountEntry] };

    const debugMeta = {
      loginType: accountEntry.loginType,
      organization: accountEntry.organization,
      clientType: accountEntry.clientType,
      businessType: accountEntry.businessType,
      countryCode: accountEntry.countryCode,
      idLen: String(accountEntry.id || "").length,
      passwordLen: String(accountEntry.password || "").length,
      certPasswordLen: String(accountEntry.certPassword || "").length,
      certFileLen: String(accountEntry.certFile || "").length,
      certType: accountEntry.certType,
      keys: Object.keys(accountEntry),
    };
    console.log(`→ Payload meta:`, JSON.stringify(debugMeta));

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
      `Account create response (org=${plan.organization}):`,
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

/**
 * 간편인증(loginType 5) 기반 계정 등록.
 *
 * Two-step two-way 플로우:
 *  - 1차 호출: twoWayInfo 없이 호출 → CODEF 가 CF-03002 반환 + extraInfo 에 twoWayInfo
 *             동시에 대표자 휴대폰(카카오톡/PASS/네이버/토스)으로 인증 요청 푸시
 *  - 사용자가 앱에서 [확인] 탭
 *  - 2차 호출: 1차 응답의 twoWayInfo 를 그대로 포함해서 재호출 → connectedId 발급
 *
 * loginTypeLevel:
 *   1 = 카카오톡, 2 = 페이코, 3 = 삼성패스, 4 = KB모바일,
 *   5 = 통신사 PASS, 6 = 네이버, 7 = 신한, 8 = 토스
 */
async function handleRegisterSimple(body: any, clientType: string = "P"): Promise<Response> {
  const {
    businessNumber,
    userName,
    birthDate,
    phoneNo,
    loginTypeLevel,
    twoWayInfo, // 2차 호출 시만 존재
  } = body;

  // 1차 호출 필수 필드 검증
  if (!businessNumber || !userName || !birthDate || !phoneNo || !loginTypeLevel) {
    return new Response(
      JSON.stringify({
        success: false,
        error:
          "사업자등록번호, 대표자명, 생년월일(YYYYMMDD), 휴대폰, 간편인증 공급자는 필수입니다.",
      }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const cleanedNumber = String(businessNumber).replace(/\D/g, "");
  const cleanedPhone = String(phoneNo).replace(/\D/g, "");
  const cleanedBirth = String(birthDate).replace(/\D/g, "");

  if (cleanedNumber.length !== 10) {
    return new Response(
      JSON.stringify({ success: false, error: "사업자등록번호는 10자리여야 합니다." }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const accessToken = await getAccessToken();

  // 계정 엔트리 (1차·2차 공통)
  const accountEntry: Record<string, unknown> = {
    countryCode: "KR",
    businessType: "NT",
    clientType,
    organization: "0001",
    loginType: "5",
    loginTypeLevel: String(loginTypeLevel),
    identity: cleanedNumber,
    userName: String(userName),
    birthDate: cleanedBirth,
    phoneNo: cleanedPhone,
    // 간편인증은 인증서·비밀번호 필드 없음
  };

  const requestBody: Record<string, unknown> = {
    accountList: [accountEntry],
  };

  // 2차 호출: twoWayInfo 및 is2Way 포함
  const is2Way = !!twoWayInfo && typeof twoWayInfo === "object";
  if (is2Way) {
    requestBody.twoWayInfo = twoWayInfo;
    accountEntry.is2Way = true;
    accountEntry.simpleAuth = "1";
  }

  const phase = is2Way ? "2nd" : "1st";
  console.log(
    `[simple-auth ${phase}] loginTypeLevel=${loginTypeLevel} clientType=${clientType} identity=${cleanedNumber}`
  );

  const response = await fetch(`${CODEF_API_URL}${ACCOUNT_CREATE_PATH}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(requestBody),
  });

  const responseText = await response.text();
  console.log(
    `[simple-auth ${phase}] response:`,
    responseText.substring(0, 1500)
  );

  const data = parseCodefResponse(responseText);
  const result = data.result || {};
  const resultData = data.data || {};
  const errorList = resultData.errorList || [];
  const successList = resultData.successList || [];

  // ── 2차 성공: connectedId 발급
  if (result.code === "CF-00000" && resultData.connectedId) {
    return new Response(
      JSON.stringify({
        success: true,
        status: "completed",
        connectedId: resultData.connectedId,
        message: "홈택스 간편인증 등록이 완료되었습니다.",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
  if (successList.length > 0 && resultData.connectedId) {
    return new Response(
      JSON.stringify({
        success: true,
        status: "completed",
        connectedId: resultData.connectedId,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // ── 1차 응답: 추가 인증 대기 (CF-03002)
  if (result.code === "CF-03002" && data.data?.continue2Way) {
    return new Response(
      JSON.stringify({
        success: true,
        status: "pending",
        message:
          "휴대폰으로 인증 요청을 보냈어요. 간편인증 앱에서 확인을 눌러주세요.",
        twoWayInfo: data.data.continue2Way,
        simpleKeyword: data.data.simpleKeyword ?? null,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
  // 다른 포맷으로 twoWayInfo 가 올 수도 있음 (extraInfo 경로)
  if (result.extraInfo?.isTwoWay || data.data?.twoWayInfo) {
    const info = result.extraInfo?.twoWayInfo || data.data?.twoWayInfo || data.extraInfo;
    return new Response(
      JSON.stringify({
        success: true,
        status: "pending",
        message: "간편인증 앱에서 확인을 눌러주세요.",
        twoWayInfo: info,
        simpleKeyword: data.data?.simpleKeyword ?? null,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // ── 실패
  const detailMessage =
    errorList.length > 0
      ? errorList.map((e: any) => `[${e.code}] ${e.message}`).join(", ")
      : null;
  const errorMessage =
    detailMessage || getHometaxErrorMessage(result.code) || "간편인증 등록에 실패했어요.";
  console.error(
    "[simple-auth] failed:",
    result.code,
    result.message,
    JSON.stringify(errorList)
  );

  return new Response(
    JSON.stringify({
      success: false,
      error: errorMessage,
      code: result.code,
      details: errorList,
      rawData: resultData,
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
