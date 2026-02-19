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

// RSA PKCS1 v1.5 암호화 (node-forge 사용 - Java Cipher.getInstance("RSA")와 동일)
function encryptRSAPKCS1(plainText: string, base64PublicKey: string): string {
  // Base64 공개키를 DER → PEM 형식으로 변환
  const pem = `-----BEGIN PUBLIC KEY-----\n${base64PublicKey.match(/.{1,64}/g)!.join("\n")}\n-----END PUBLIC KEY-----`;
  const publicKey = forge.pki.publicKeyFromPem(pem);
  
  // RSA PKCS#1 v1.5 암호화
  const encrypted = publicKey.encrypt(plainText, "RSAES-PKCS1-V1_5");
  
  // Base64 인코딩
  return forge.util.encode64(encrypted);
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

    // 2. 공개키 (환경변수에서 로드)
    const publicKey = Deno.env.get("CODEF_PUBLIC_KEY") || "";
    if (!publicKey && (action === "register" || action === "addAccount")) {
      throw new Error("CODEF_PUBLIC_KEY가 설정되지 않았습니다.");
    }

    // 액션에 따른 분기
    if (action === "register") {
      if (loginType === "2") {
        return await handleRegisterWithCert(accessToken, publicKey, cardCompanyId, certFile, certPassword);
      }
      return await handleRegister(accessToken, publicKey, cardCompanyId, loginId, password);
    } else if (action === "addAccount") {
      // 계정 추가 (기존 ConnectedId에 카드사 추가)
      return await handleAddAccount(accessToken, publicKey, connectedId, cardCompanyId, loginId, password);
    } else if (action === "getCards") {
      // 보유 카드 조회
      return await handleGetCards(accessToken, connectedId, cardCompanyId);
    } else if (action === "getTransactions") {
      // 승인 내역 조회
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
  const encryptedCertPassword = encryptRSAPKCS1(certPassword, publicKey);
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
  const encryptedPassword = encryptRSAPKCS1(password, publicKey);
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

  const encryptedPassword = await encryptRSAPKCS1(password, publicKey);

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
    inquiryType: "0", // 0: 전체, 1: 신용카드, 2: 체크카드
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
      // Codef 응답은 percent-encoding + 공백을 '+'로 보내는 케이스가 있어 함께 처리
      const decoded = decodeURIComponent(text.replace(/\+/g, "%20"));
      return JSON.parse(decoded);
    } catch {
      return { raw: text };
    }
  }
}

function normalizeCodefMessage(msg: string | undefined): string {
  if (!msg) return "";
  // msg 자체가 URL 인코딩/플러스 공백인 경우도 있어 안전하게 복원
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

  // 기본값: 최근 3개월
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
    orderBy: "0", // 0: 최신순
    inquiryType: "0", // 0: 전체, 1: 신용, 2: 체크
    cardNo: cardNoValue,
    memberStoreInfoType: "0", // 가맹점 정보 포함
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

    // cardNo가 없으면 카드 목록을 조회한 뒤, 각 카드별로 승인내역을 합쳐 반환
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

    // 중복 제거
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
    
    // 거래 데이터 정규화
    const transactions = rawTransactions.map((tx: any) => ({
      // 날짜/시간
      transactionDate: formatDate(tx.resUsedDate),
      transactionTime: tx.resUsedTime || null,
      
      // 금액
      amount: parseInt(tx.resUsedAmount?.replace(/,/g, "") || "0", 10),
      
      // 가맹점 정보
      merchantName: tx.resMemberStoreName || tx.resStoreName || "",
      merchantCategory: tx.resMemberStoreType || "",
      description: tx.resMemberStoreName || tx.resStoreName || tx.resNote || "카드 결제",
      
      // 카드 정보
      cardNo: tx.resCardNo || "",
      cardName: tx.resCardName || "",
      
      // 결제 상태
      status: tx.resApprovalStatus || "approved",
      approvalNo: tx.resApprovalNo || "",
      
      // 분할 납부
      installment: tx.resInstallmentCnt || "0",
      
      // 원본 데이터 참조용
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
