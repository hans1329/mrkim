import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// 정식(운영) 환경
const CODEF_API_URL = "https://api.codef.io";
const CODEF_TOKEN_URL = "https://oauth.codef.io/oauth/token";

// 카드사 기관코드 매핑
const CARD_ORGANIZATION_CODES: Record<string, string> = {
  "shinhan": "0306",   // 신한카드
  "samsung": "0303",   // 삼성카드
  "kb": "0301",        // KB국민카드
  "hyundai": "0302",   // 현대카드
  "lotte": "0311",     // 롯데카드
  "bc": "0305",        // BC카드
  "hana": "0313",      // 하나카드
  "woori": "0309",     // 우리카드
  "nh": "0304",        // NH농협카드
};

// Base64 → ArrayBuffer
function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

// ArrayBuffer → Base64
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Web Crypto API를 사용한 RSA-PKCS1-v1_5 암호화
 * Codef 요구: Java의 Cipher.getInstance("RSA") = RSA/ECB/PKCS1Padding
 */
async function encryptRSA(plainText: string, base64PublicKey: string): Promise<string> {
  const keyBuffer = base64ToArrayBuffer(base64PublicKey);
  
  let cryptoKey: CryptoKey;
  
  // SubjectPublicKeyInfo (SPKI) 형식으로 먼저 시도
  try {
    cryptoKey = await crypto.subtle.importKey(
      "spki",
      keyBuffer,
      {
        name: "RSA-OAEP",
        hash: "SHA-1",
      },
      false,
      ["encrypt"]
    );
    console.log("Imported key as SPKI format with RSA-OAEP/SHA-1");
  } catch (e1) {
    console.log("SPKI import failed, trying PKCS#1 format:", e1);
    // PKCS#1 형식은 브라우저에서 직접 지원 안 되므로 다른 방법 시도
    throw new Error(`공개키 임포트 실패: ${e1}`);
  }

  const plaintextBytes = new TextEncoder().encode(plainText);
  const encrypted = await crypto.subtle.encrypt(
    { name: "RSA-OAEP" },
    cryptoKey,
    plaintextBytes
  );
  
  return arrayBufferToBase64(encrypted);
}

/**
 * PKCS1 v1.5 암호화 - SubtleCrypto는 RSASSA-PKCS1-v1_5만 sign에 지원하므로
 * node-forge를 사용하되, 입력 형식을 명확히 처리
 */
async function encryptRSAPKCS1v15(plainText: string, base64PublicKey: string): Promise<string> {
  // @ts-ignore
  const forge = await import("npm:node-forge@1.3.1");
  
  const cleanKey = base64PublicKey.replace(/[\r\n\s]/g, "");
  const pem = `-----BEGIN PUBLIC KEY-----\n${cleanKey.match(/.{1,64}/g)!.join("\n")}\n-----END PUBLIC KEY-----`;
  
  console.log("Public key length:", cleanKey.length);
  console.log("Public key prefix:", cleanKey.substring(0, 20));
  
  try {
    const publicKey = forge.default.pki.publicKeyFromPem(pem);
    
    // node-forge는 내부적으로 binary string을 사용하므로
    // UTF-8 텍스트를 명시적으로 UTF-8 bytes → forge binary string으로 변환해야 함
    // 그렇지 않으면 특수문자나 ASCII 범위 밖 문자가 잘못 처리됨
    const utf8Bytes = new TextEncoder().encode(plainText);
    let binaryStr = "";
    for (let i = 0; i < utf8Bytes.length; i++) {
      binaryStr += String.fromCharCode(utf8Bytes[i]);
    }
    
    // RSA PKCS#1 v1.5 암호화 (binary string 입력)
    const encrypted = publicKey.encrypt(binaryStr, "RSAES-PKCS1-V1_5");
    const result = forge.default.util.encode64(encrypted);
    console.log("Encrypted length:", result.length, "Input bytes:", utf8Bytes.length);
    return result;
  } catch (e) {
    console.error("forge encryption error:", e);
    throw new Error(`암호화 실패: ${e}`);
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
      "Authorization": `Basic ${credentials}`,
    },
    body: "grant_type=client_credentials&scope=read",
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Token request failed:", errorText);
    throw new Error(`Token request failed: ${response.status}`);
  }

  const data = await response.json();
  return data.access_token;
}

/**
 * 코드에프 공개키 동적 조회 (GET /v1/common/public-key)
 */
async function getPublicKeyFromAPI(accessToken: string): Promise<string> {
  const url = `${CODEF_API_URL}/v1/common/public-key`;
  console.log("Fetching public key from:", url);
  
  const response = await fetch(url, {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${accessToken}`,
    },
  });
  
  console.log("Public key API status:", response.status);
  
  if (!response.ok) {
    const body = await response.text();
    console.error("Public key API error:", body);
    throw new Error(`공개키 API 오류 (${response.status}): ${body}`);
  }
  
  const text = await response.text();
  console.log("Public key raw response length:", text.length);
  console.log("Public key raw response preview:", text.substring(0, 100));
  
  // JSON 형식인 경우
  try {
    const json = JSON.parse(text);
    if (json.publicKey) return json.publicKey;
    if (json.data?.publicKey) return json.data.publicKey;
    // 전체가 키인 경우
    return text.trim();
  } catch {
    // 순수 텍스트로 반환
    return text.trim();
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // JWT 인증 확인
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: "인증이 필요합니다." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const { action, cardCompanyId, loginId, loginType, certFile, certPassword, password, connectedId, startDate, endDate, cardNo } = body;

    // 1. 토큰 발급
    console.log("Getting access token...");
    const accessToken = await getAccessToken();
    console.log("Access token obtained");

    // 2. 공개키 - 동적 조회 우선, 실패 시 환경변수 폴백
    let publicKey = "";
    if (action === "register" || action === "addAccount") {
      try {
        publicKey = await getPublicKeyFromAPI(accessToken);
        console.log("Using dynamic public key, length:", publicKey.length);
      } catch (pkError) {
        console.error("Dynamic public key fetch failed:", pkError);
        // 환경변수 폴백
        publicKey = Deno.env.get("CODEF_PUBLIC_KEY") || "";
        if (!publicKey) throw new Error("공개키를 가져올 수 없습니다.");
        console.log("Using env public key, length:", publicKey.length);
      }
    }

    // 액션에 따른 분기
    if (action === "register") {
      if (loginType === "2") {
        return await handleRegisterWithCert(accessToken, publicKey, cardCompanyId, certFile, certPassword);
      }
      return await handleRegister(accessToken, publicKey, cardCompanyId, loginId, password);
    } else if (action === "addAccount") {
      return await handleAddAccount(accessToken, publicKey, connectedId, cardCompanyId, loginId, password);
    } else if (action === "getCards") {
      return await handleGetCards(accessToken, connectedId, cardCompanyId);
    } else if (action === "getTransactions") {
      return await handleGetTransactions(accessToken, connectedId, cardCompanyId, startDate, endDate, cardNo);
    } else {
      return new Response(
        JSON.stringify({ success: false, error: "알 수 없는 action입니다." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

  } catch (error) {
    console.error("Codef card error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// 계정 등록 - 공동인증서 방식 (loginType "2")
async function handleRegisterWithCert(
  accessToken: string,
  publicKey: string,
  cardCompanyId: string,
  certFile: string,
  certPassword: string,
): Promise<Response> {
  const organizationCode = CARD_ORGANIZATION_CODES[cardCompanyId];
  if (!organizationCode) {
    return new Response(
      JSON.stringify({ success: false, error: "지원하지 않는 카드사입니다." }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  if (!certFile || !certPassword) {
    return new Response(
      JSON.stringify({ success: false, error: "인증서 파일과 비밀번호가 필요합니다." }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  console.log("Encrypting cert password with RSA PKCS1 v1.5...");
  const encryptedCertPassword = await encryptRSAPKCS1v15(certPassword, publicKey);
  console.log("Cert password encrypted successfully");

  const requestBody = {
    accountList: [
      {
        countryCode: "KR",
        businessType: "CD",
        clientType: "P",
        organization: organizationCode,
        loginType: "2",
        certType: "0",
        certFile: certFile,
        certPassword: encryptedCertPassword,
      }
    ]
  };

  console.log("Registering card account with cert for organization:", organizationCode);

  const response = await fetch(`${CODEF_API_URL}/v1/account/create`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${accessToken}`,
    },
    body: JSON.stringify(requestBody),
  });

  const responseText = await response.text();
  console.log("Account create (cert) response:", responseText);

  const data = parseCodefResponse(responseText);
  const result = data.result || {};
  const isSuccess = result.code === "CF-00000";

  if (isSuccess && data.data?.connectedId) {
    return new Response(
      JSON.stringify({
        success: true,
        message: "인증서로 카드사 계정이 등록되었습니다.",
        connectedId: data.data.connectedId,
        successList: data.data.successList || [],
        errorList: data.data.errorList || [],
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } else {
    const errorMessage = data.data?.errorList?.[0]?.message || result.message || "인증서 등록 실패";
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
        code: result.code,
        errorList: data.data?.errorList || [],
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
}

// 계정 등록 (ConnectedId 신규 발급)
async function handleRegister(
  accessToken: string,
  publicKey: string,
  cardCompanyId: string,
  loginId: string,
  password: string
): Promise<Response> {
  const organizationCode = CARD_ORGANIZATION_CODES[cardCompanyId];
  if (!organizationCode) {
    return new Response(
      JSON.stringify({ success: false, error: "지원하지 않는 카드사입니다." }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // 비밀번호 RSA PKCS1 v1.5 암호화
  console.log("Encrypting password with RSA PKCS1 v1.5...");
  const encryptedPassword = await encryptRSAPKCS1v15(password, publicKey);
  console.log("Password encrypted successfully");

  const requestBody = {
    accountList: [
      {
        countryCode: "KR",
        businessType: "CD",  // 카드
        clientType: "P",     // 개인
        organization: organizationCode,
        loginType: "1",      // ID/PW 로그인
        id: loginId,
        password: encryptedPassword,
      }
    ]
  };

  console.log("Registering card account for organization:", organizationCode);

  const response = await fetch(`${CODEF_API_URL}/v1/account/create`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${accessToken}`,
    },
    body: JSON.stringify(requestBody),
  });

  const responseText = await response.text();
  console.log("Account create response:", responseText);

  const data = parseCodefResponse(responseText);
  const result = data.result || {};
  const isSuccess = result.code === "CF-00000";

  if (isSuccess && data.data?.connectedId) {
    return new Response(
      JSON.stringify({
        success: true,
        message: "카드사 계정이 등록되었습니다.",
        connectedId: data.data.connectedId,
        successList: data.data.successList || [],
        errorList: data.data.errorList || [],
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } else {
    const errorMessage = data.data?.errorList?.[0]?.message || result.message || "계정 등록 실패";
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
        code: result.code,
        errorList: data.data?.errorList || [],
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
}

// 계정 추가 (기존 ConnectedId에 추가)
async function handleAddAccount(
  accessToken: string,
  publicKey: string,
  connectedId: string,
  cardCompanyId: string,
  loginId: string,
  password: string
): Promise<Response> {
  const organizationCode = CARD_ORGANIZATION_CODES[cardCompanyId];
  if (!organizationCode) {
    return new Response(
      JSON.stringify({ success: false, error: "지원하지 않는 카드사입니다." }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const encryptedPassword = await encryptRSAPKCS1v15(password, publicKey);

  const requestBody = {
    connectedId,
    accountList: [
      {
        countryCode: "KR",
        businessType: "CD",
        clientType: "P",
        organization: organizationCode,
        loginType: "1",
        id: loginId,
        password: encryptedPassword,
      }
    ]
  };

  console.log("Adding card account for connectedId:", connectedId);

  const response = await fetch(`${CODEF_API_URL}/v1/account/add`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${accessToken}`,
    },
    body: JSON.stringify(requestBody),
  });

  const responseText = await response.text();
  console.log("Account add response:", responseText);

  const data = parseCodefResponse(responseText);
  const result = data.result || {};
  const isSuccess = result.code === "CF-00000";

  return new Response(
    JSON.stringify({
      success: isSuccess,
      message: isSuccess ? "카드사가 추가되었습니다." : (result.message || "계정 추가 실패"),
      connectedId: data.data?.connectedId || connectedId,
      successList: data.data?.successList || [],
      errorList: data.data?.errorList || [],
    }),
    { 
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    }
  );
}

// 보유 카드 조회
async function handleGetCards(
  accessToken: string,
  connectedId: string,
  cardCompanyId: string
): Promise<Response> {
  const organizationCode = CARD_ORGANIZATION_CODES[cardCompanyId];
  if (!organizationCode) {
    return new Response(
      JSON.stringify({ success: false, error: "지원하지 않는 카드사입니다." }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const requestBody = {
    connectedId,
    organization: organizationCode,
    birthDate: "",
    inquiryType: "0",
  };

  console.log("Getting cards for connectedId:", connectedId, "organization:", organizationCode);

  const response = await fetch(`${CODEF_API_URL}/v1/kr/card/p/account/card-list`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${accessToken}`,
    },
    body: JSON.stringify(requestBody),
  });

  const responseText = await response.text();
  console.log("Card list response:", responseText);

  const data = parseCodefResponse(responseText);
  const result = data.result || {};
  const isSuccess = result.code === "CF-00000";

  if (isSuccess) {
    const cards = Array.isArray(data.data) ? data.data : [];
    return new Response(
      JSON.stringify({
        success: true,
        message: "카드 목록을 조회했습니다.",
        cards: cards.map((card: any) => ({
          cardNo: card.resCardNo || "",
          cardName: card.resCardName || "",
          cardType: card.resCardType || "",
          validPeriod: card.resValidPeriod || "",
          issueDate: card.resIssueDate || "",
          userName: card.resUserNm || "",
          sleepYN: card.resSleepYN || "",
        })),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } else {
    return new Response(
      JSON.stringify({
        success: false,
        error: result.message || "카드 목록 조회 실패",
        code: result.code,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
}

// Codef 응답 파싱 (URL 인코딩된 경우 처리)
function parseCodefResponse(text: string): any {
  try {
    return JSON.parse(text);
  } catch {
    try {
      const decoded = decodeURIComponent(text.replace(/\+/g, "%20"));
      return JSON.parse(decoded);
    } catch {
      return { raw: text };
    }
  }
}

function normalizeCodefMessage(msg: string | undefined): string {
  if (!msg) return "";
  try {
    return decodeURIComponent(msg.replace(/\+/g, "%20"));
  } catch {
    return msg.replace(/\+/g, " ");
  }
}

// 승인 내역 조회
async function handleGetTransactions(
  accessToken: string,
  connectedId: string,
  cardCompanyId: string,
  startDate?: string,
  endDate?: string,
  cardNo?: string
): Promise<Response> {
  const organizationCode = CARD_ORGANIZATION_CODES[cardCompanyId];
  if (!organizationCode) {
    return new Response(
      JSON.stringify({ success: false, error: "지원하지 않는 카드사입니다." }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  if (!connectedId) {
    return new Response(
      JSON.stringify({ success: false, error: "connectedId가 필요합니다." }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const now = new Date();
  const defaultEndDate = now.toISOString().slice(0, 10).replace(/-/g, "");
  const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
  const defaultStartDate = threeMonthsAgo.toISOString().slice(0, 10).replace(/-/g, "");

  const normalizedStart = startDate?.replace(/-/g, "") || defaultStartDate;
  const normalizedEnd = endDate?.replace(/-/g, "") || defaultEndDate;

  const buildApprovalRequestBody = (cardNoValue: string) => ({
    connectedId,
    organization: organizationCode,
    startDate: normalizedStart,
    endDate: normalizedEnd,
    orderBy: "0",
    inquiryType: "0",
    cardNo: cardNoValue,
    memberStoreInfoType: "0",
  });

  const fetchApprovalList = async (cardNoValue: string) => {
    const requestBody = buildApprovalRequestBody(cardNoValue);

    const response = await fetch(`${CODEF_API_URL}/v1/kr/card/p/account/approval-list`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${accessToken}`,
      },
      body: JSON.stringify(requestBody),
    });

    const responseText = await response.text();
    const data = parseCodefResponse(responseText);
    const result = data.result || {};
    const isSuccess = result.code === "CF-00000";

    if (!isSuccess) {
      const msg = normalizeCodefMessage(result.message) || "승인 내역 조회 실패";
      throw new Error(msg);
    }

    const rawTransactions = Array.isArray(data.data) ? data.data : (data.data?.resList || []);
    return { rawTransactions, period: { startDate: requestBody.startDate, endDate: requestBody.endDate } };
  };

  const fetchCardNosIfNeeded = async (): Promise<string[]> => {
    const cardNoFromRequest = (cardNo || "").trim();
    if (cardNoFromRequest) return [cardNoFromRequest];

    const cardListReq = {
      connectedId,
      organization: organizationCode,
      birthDate: "",
      inquiryType: "0",
    };

    const resp = await fetch(`${CODEF_API_URL}/v1/kr/card/p/account/card-list`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${accessToken}`,
      },
      body: JSON.stringify(cardListReq),
    });

    const respText = await resp.text();
    const parsed = parseCodefResponse(respText);
    const result = parsed.result || {};
    const isSuccess = result.code === "CF-00000";

    if (!isSuccess) {
      const msg = normalizeCodefMessage(result.message) || "카드 목록 조회 실패";
      throw new Error(msg);
    }

    const cards = Array.isArray(parsed.data) ? parsed.data : [];
    const cardNos = cards
      .map((c: any) => (c?.resCardNo ? String(c.resCardNo) : ""))
      .filter((no: string) => no.length > 0);

    return Array.from(new Set(cardNos));
  };

  console.log(
    "Getting transactions for connectedId:",
    connectedId,
    "period:",
    normalizedStart,
    "~",
    normalizedEnd,
    "organization:",
    organizationCode
  );

  try {
    const cardNosToQuery = await fetchCardNosIfNeeded();
    if (cardNosToQuery.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: "조회 가능한 카드가 없습니다." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const results = await Promise.allSettled(cardNosToQuery.map((no) => fetchApprovalList(no)));
    const fulfilled = results.filter((r): r is PromiseFulfilledResult<any> => r.status === "fulfilled");
    const rejected = results.filter((r): r is PromiseRejectedResult => r.status === "rejected");

    if (fulfilled.length === 0) {
      const firstErr = rejected[0]?.reason;
      const msg = firstErr instanceof Error ? firstErr.message : "승인 내역 조회 실패";
      return new Response(
        JSON.stringify({ success: false, error: msg }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const rawTransactions = fulfilled.flatMap((r) => r.value.rawTransactions || []);
    
    const transactions = rawTransactions.map((tx: any) => ({
      transactionDate: formatDate(tx.resUsedDate),
      transactionTime: tx.resUsedTime || null,
      amount: parseInt(tx.resUsedAmount?.replace(/,/g, "") || "0", 10),
      merchantName: tx.resMemberStoreName || tx.resStoreName || "",
      merchantCategory: tx.resMemberStoreType || "",
      description: tx.resMemberStoreName || tx.resStoreName || tx.resNote || "카드 결제",
      cardNo: tx.resCardNo || "",
      cardName: tx.resCardName || "",
      status: tx.resApprovalStatus || "approved",
      approvalNo: tx.resApprovalNo || "",
      installment: tx.resInstallmentCnt || "0",
      rawData: tx,
    }));

    return new Response(
      JSON.stringify({
        success: true,
        message: `${transactions.length}건의 거래를 조회했습니다.`,
        transactions,
        period: {
          startDate: normalizedStart,
          endDate: normalizedEnd,
        },
        warnings: rejected.length > 0 ? `${rejected.length}개 카드 조회 실패` : undefined,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "승인 내역 조회 실패";
    return new Response(
      JSON.stringify({ success: false, error: msg }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
}

// 날짜 형식 변환 (YYYYMMDD -> YYYY-MM-DD)
function formatDate(dateStr: string | undefined): string {
  if (!dateStr || dateStr.length !== 8) return dateStr || "";
  return `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}`;
}
