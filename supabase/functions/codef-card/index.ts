import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import forge from "npm:node-forge@1.3.1";

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

/**
 * RSA PKCS#1 v1.5 암호화 - node-forge (npm: specifier, Deno 호환)
 * Codef SDK 동일 방식: UTF-8 바이트 → RSAES-PKCS1-V1_5 → base64
 */
function encryptRSAPKCS1v15(plainText: string, base64PublicKey: string): string {
  const cleanKey = base64PublicKey.replace(/[\r\n\s]/g, "");
  console.log("Public key length:", cleanKey.length);
  console.log("Public key prefix:", cleanKey.substring(0, 20));

  // SPKI DER → forge PublicKey
  const derBytes = forge.util.decode64(cleanKey);
  const asn1 = forge.asn1.fromDer(derBytes);
  const publicKey = forge.pki.publicKeyFromAsn1(asn1);

  // UTF-8 바이트로 변환 후 암호화 (Java getBytes("UTF-8")와 동일)
  const utf8Bytes = new TextEncoder().encode(plainText);
  let binaryStr = "";
  for (const byte of utf8Bytes) {
    binaryStr += String.fromCharCode(byte);
  }

  const encrypted = publicKey.encrypt(binaryStr, "RSAES-PKCS1-V1_5");
  const result = forge.util.encode64(encrypted);
  console.log("Encrypted length:", result.length, "Input bytes:", utf8Bytes.length);
  return result;
}


async function getAccessToken(): Promise<string> {
  const clientId = Deno.env.get("CODEF_CLIENT_ID");
  const clientSecret = Deno.env.get("CODEF_CLIENT_SECRET");

  console.log("Using CODEF_CLIENT_ID:", clientId?.substring(0, 8) + "...");
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
    const { action, cardCompanyId, loginId, loginType, certFile, certPassword: rawCertPassword, password, connectedId, startDate, endDate, cardNo, keyFile } = body;

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
      if (loginType === "0") {
        return await handleRegisterWithCert(accessToken, publicKey, cardCompanyId, certFile, rawCertPassword, keyFile);
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

// 계정 등록 - 공동인증서 방식 (loginType "0")
async function handleRegisterWithCert(
  accessToken: string,
  publicKey: string,
  cardCompanyId: string,
  certFile: string,
  certPassword: string,
  keyFile?: string,
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

  // Codef 스펙: 인증서 비밀번호도 RSA 암호화 필수 (password 필드로 전송)
  console.log("Encrypting cert password with RSA PKCS1 v1.5...");
  const encryptedPassword = encryptRSAPKCS1v15(certPassword, publicKey);
  console.log("Cert password encrypted successfully");

  // DER+KEY 분리 방식 vs PFX 통합 방식
  const accountEntry: Record<string, unknown> = {
    countryCode: "KR",
    businessType: "CD",
    clientType: "P",
    organization: organizationCode,
    loginType: "0",
    certFile: certFile,
    password: encryptedPassword,
  };

  if (keyFile) {
    accountEntry.keyFile = keyFile;
    accountEntry.certType = "1";
    console.log("Using DER+KEY separate cert files (certType: 1)");
  } else {
    accountEntry.certType = "pfx";
    console.log("Using PFX/P12 combined cert file");
  }

  const requestBody = {
    accountList: [accountEntry]
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
  const encryptedPassword = encryptRSAPKCS1v15(password, publicKey);
  console.log("Password encrypted successfully");

  const requestBody = {
    accountList: [
      {
        countryCode: "KR",
        businessType: "CD",
        clientType: "P",
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

  const encryptedPassword = encryptRSAPKCS1v15(password, publicKey);

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

  const approvalApiPath = `${CODEF_API_URL}/v1/kr/card/p/account/approval-list`;

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

    const response = await fetch(approvalApiPath, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${accessToken}`,
      },
      body: JSON.stringify(requestBody),
    });

    const responseText = await response.text();
    console.log("Approval list raw response for card", cardNoValue, ":", responseText.substring(0, 500));
    const data = parseCodefResponse(responseText);
    const result = data.result || {};
    const isSuccess = result.code === "CF-00000";

    if (!isSuccess) {
      console.error("Approval list error - code:", result.code, "message:", normalizeCodefMessage(result.message));
      const msg = normalizeCodefMessage(result.message) || "승인 내역 조회 실패";
      throw new Error(msg);
    }

    const rawTransactions = Array.isArray(data.data) ? data.data : (data.data?.resList || []);
    return { rawTransactions, period: { startDate: requestBody.startDate, endDate: requestBody.endDate } };
  };

  const fetchCardNosIfNeeded = async (): Promise<string[]> => {
    const cardNoFromRequest = (cardNo || "").trim();
    if (cardNoFromRequest) return [cardNoFromRequest];

    // card-list API 권한이 없을 수 있으므로, 실패 시 빈 cardNo로 승인내역 직접 조회
    try {
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
      console.log("Card list raw response (in getTransactions):", respText.substring(0, 500));
      const parsed = parseCodefResponse(respText);
      const result = parsed.result || {};
      const isSuccess = result.code === "CF-00000";

      if (!isSuccess) {
        console.warn("Card list failed (code:", result.code, ") - falling back to empty cardNo for approval-list");
        return [""];  // 빈 cardNo로 전체 승인내역 조회 시도
      }

      const cards = Array.isArray(parsed.data) ? parsed.data : [];
      const cardNos = cards
        .map((c: any) => (c?.resCardNo ? String(c.resCardNo) : ""))
        .filter((no: string) => no.length > 0);

      if (cardNos.length === 0) return [""];
      return Array.from(new Set(cardNos));
    } catch (err) {
      console.warn("Card list threw error, falling back to empty cardNo:", err);
      return [""];  // 폴백: 빈 cardNo로 전체 조회
    }
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
