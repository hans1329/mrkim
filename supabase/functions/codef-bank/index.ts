import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import forge from "npm:node-forge@1.3.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// 정식(운영) 환경
const CODEF_API_URL = "https://api.codef.io";
const CODEF_TOKEN_URL = "https://oauth.codef.io/oauth/token";

// 은행 기관코드 매핑
const BANK_ORGANIZATION_CODES: Record<string, string> = {
  "kb": "0004",        // KB국민은행
  "shinhan": "0088",   // 신한은행
  "woori": "0020",     // 우리은행
  "hana": "0081",      // 하나은행
  "nh": "0011",        // NH농협은행
  "ibk": "0003",       // IBK기업은행
  "sc": "0023",        // SC제일은행
  "citi": "0027",      // 한국씨티은행
  "kakao": "0090",     // 카카오뱅크
  "toss": "0092",      // 토스뱅크
  "kbank": "0089",     // 케이뱅크
  "busan": "0032",     // 부산은행
  "daegu": "0031",     // 대구은행
  "kwangju": "0034",   // 광주은행
  "jeonbuk": "0037",   // 전북은행
  "jeju": "0035",      // 제주은행
  "postbank": "0071",  // 우체국
  "saemaul": "0045",   // 새마을금고
  "shinhyup": "0048",  // 신협
};

// RSA PKCS1 v1.5 암호화 (CODEF Java SDK와 동일한 UTF-8 바이트 기준)
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

async function getPublicKeyFromAPI(accessToken: string): Promise<string> {
  const response = await fetch(`${CODEF_API_URL}/v1/common/public-key`, {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Public key request failed:", errorText);
    throw new Error(`Public key request failed: ${response.status}`);
  }

  const text = await response.text();

  try {
    const json = JSON.parse(text);
    return json.publicKey || json.data?.publicKey || text.trim();
  } catch {
    return text.trim();
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: "인증이 필요합니다." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { action, bankId, loginId, password, loginType, certFile, certPassword, keyFile, connectedId, accountNo, startDate, endDate, clientType: rawClientType } = await req.json();
    // clientType: "P" (개인) 또는 "B" (법인/기업), 기본값 "P"
    const clientType = (rawClientType === "B") ? "B" : "P";
    console.log("Client type:", clientType);

    console.log("Getting access token...");
    const accessToken = await getAccessToken();
    console.log("Access token obtained");

    let publicKey = "";
    if (action === "register" || action === "addAccount") {
      try {
        publicKey = await getPublicKeyFromAPI(accessToken);
        console.log("Using dynamic public key, length:", publicKey.length);
      } catch (publicKeyError) {
        console.error("Dynamic public key fetch failed:", publicKeyError);
        publicKey = Deno.env.get("CODEF_PUBLIC_KEY") || "";
        if (!publicKey) {
          throw new Error("공개키를 가져올 수 없습니다.");
        }
        console.log("Using env public key fallback, length:", publicKey.length);
      }
    }

    if (action === "register") {
      if (loginType === "2" || loginType === "0" || Boolean(certFile)) {
        return await handleRegisterWithCert(accessToken, publicKey, bankId, certFile, certPassword, keyFile, clientType);
      } else {
        return await handleRegister(accessToken, publicKey, bankId, loginId, password, clientType);
      }
    } else if (action === "addAccount") {
      return await handleAddAccount(accessToken, publicKey, connectedId, bankId, loginId, password, clientType);
    } else if (action === "getAccounts") {
      return await handleGetAccounts(accessToken, connectedId, bankId, clientType);
    } else if (action === "getTransactions") {
      return await handleGetTransactions(accessToken, connectedId, bankId, accountNo, startDate, endDate, clientType);
    } else {
      return new Response(
        JSON.stringify({ success: false, error: "알 수 없는 action입니다." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

  } catch (error) {
    console.error("Codef bank error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// 계정 등록 - 인증서 방식 (CODEF 은행 cert loginType "0")
async function handleRegisterWithCert(
  accessToken: string,
  publicKey: string,
  bankId: string,
  certFile: string,
  certPassword: string,
  keyFile?: string,
  clientType: string = "P",
): Promise<Response> {
  const organizationCode = BANK_ORGANIZATION_CODES[bankId];
  if (!organizationCode) {
    return new Response(
      JSON.stringify({ success: false, error: "지원하지 않는 은행입니다." }),
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

  // DER+KEY 분리 방식 vs PFX 통합 방식
  const accountEntry: Record<string, unknown> = {
    countryCode: "KR",
    businessType: "BK",
    clientType,
    organization: organizationCode,
    loginType: "0",
    password: encryptedCertPassword,
  };

  if (keyFile) {
    accountEntry.derFile = certFile;
    accountEntry.keyFile = keyFile;
    // DER+KEY 분리 방식: certType 생략 (CODEF 공식 규격)
    console.log(`Using DER+KEY separate cert files (no certType, clientType: ${clientType})`);
  } else {
    // PFX/P12 통합 파일
    accountEntry.certFile = certFile;
    accountEntry.certType = "pfx";
    console.log("Using PFX/P12 combined cert file");
  }

  const requestBody = {
    accountList: [accountEntry]
  };

  console.log("Registering bank account with cert for organization:", organizationCode);

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
        message: "인증서로 은행 계정이 등록되었습니다.",
        connectedId: data.data.connectedId,
        successList: data.data.successList || [],
        errorList: data.data.errorList || [],
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } else {
    const errorCode = data.data?.errorList?.[0]?.code || result.code;
    const errorMessage = getUserFriendlyMessage(errorCode);
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

// 계정 등록 - 아이디/비밀번호 방식 (loginType "1")
async function handleRegister(
  accessToken: string,
  publicKey: string,
  bankId: string,
  loginId: string,
  password: string,
  clientType: string = "P",
): Promise<Response> {
  const organizationCode = BANK_ORGANIZATION_CODES[bankId];
  if (!organizationCode) {
    return new Response(
      JSON.stringify({ success: false, error: "지원하지 않는 은행입니다." }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  console.log("Encrypting password with RSA PKCS1 v1.5...");
  const encryptedPassword = encryptRSAPKCS1(password, publicKey);
  console.log("Password encrypted successfully");

  const requestBody = {
    accountList: [
      {
        countryCode: "KR",
        businessType: "BK",
        clientType,
        organization: organizationCode,
        loginType: "1",
        id: loginId,
        password: encryptedPassword,
      }
    ]
  };

  console.log("Registering bank account for organization:", organizationCode);

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
        message: "은행 계정이 등록되었습니다.",
        connectedId: data.data.connectedId,
        successList: data.data.successList || [],
        errorList: data.data.errorList || [],
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } else {
// 에러 코드를 사용자 친화적 메시지로 변환
    const errorCode = data.data?.errorList?.[0]?.code || result.code;
    const errorMessage = getUserFriendlyMessage(errorCode);
    
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
  bankId: string,
  loginId: string,
  password: string,
  clientType: string = "P",
): Promise<Response> {
  const organizationCode = BANK_ORGANIZATION_CODES[bankId];
  if (!organizationCode) {
    return new Response(
      JSON.stringify({ success: false, error: "지원하지 않는 은행입니다." }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const encryptedPassword = await encryptRSAPKCS1(password, publicKey);

  const requestBody = {
    connectedId,
    accountList: [
      {
        countryCode: "KR",
        businessType: "BK",
        clientType,
        organization: organizationCode,
        loginType: "1",
        id: loginId,
        password: encryptedPassword,
      }
    ]
  };

  console.log("Adding bank account for connectedId:", connectedId);

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
      message: isSuccess ? "은행이 추가되었습니다." : (result.message || "계정 추가 실패"),
      connectedId: data.data?.connectedId || connectedId,
      successList: data.data?.successList || [],
      errorList: data.data?.errorList || [],
    }),
    { 
      status: isSuccess ? 200 : 400, 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    }
  );
}

// 보유 계좌 목록 조회
async function handleGetAccounts(
  accessToken: string,
  connectedId: string,
  bankId: string,
  clientType: string = "P",
): Promise<Response> {
  const organizationCode = BANK_ORGANIZATION_CODES[bankId];
  if (!organizationCode) {
    return new Response(
      JSON.stringify({ success: false, error: "지원하지 않는 은행입니다." }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const requestBody = {
    connectedId,
    organization: organizationCode,
    birthDate: "",
    withdrawAccountNo: "",
    withdrawAccountPassword: "",
  };

  console.log("Getting accounts for connectedId:", connectedId, "organization:", organizationCode);

  const clientPath = clientType === "B" ? "b" : "p";
  const response = await fetch(`${CODEF_API_URL}/v1/kr/bank/${clientPath}/account/account-list`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${accessToken}`,
    },
    body: JSON.stringify(requestBody),
  });

  const responseText = await response.text();
  console.log("Account list response:", responseText);

  const data = parseCodefResponse(responseText);
  const result = data.result || {};
  const isSuccess = result.code === "CF-00000";

  if (isSuccess) {
    const accounts = Array.isArray(data.data) ? data.data : (data.data?.resDepositTrust || []);
    return new Response(
      JSON.stringify({
        success: true,
        message: "계좌 목록을 조회했습니다.",
        accounts: accounts.map((account: any) => ({
          accountNo: account.resAccount || "",
          accountName: account.resAccountName || "",
          accountType: account.resAccountTypeName || account.resAccountType || "",
          balance: account.resAccountBalance || "0",
          currency: account.resAccountCurrency || "KRW",
          holder: account.resAccountHolder || "",
        })),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } else {
    return new Response(
      JSON.stringify({
        success: false,
        error: result.message || "계좌 목록 조회 실패",
        code: result.code,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
}

// 거래 내역 조회
async function handleGetTransactions(
  accessToken: string,
  connectedId: string,
  bankId: string,
  accountNo: string,
  startDate: string,
  endDate: string,
  clientType: string = "P",
): Promise<Response> {
  const organizationCode = BANK_ORGANIZATION_CODES[bankId];
  if (!organizationCode) {
    return new Response(
      JSON.stringify({ success: false, error: "지원하지 않는 은행입니다." }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  if (!accountNo) {
    return new Response(
      JSON.stringify({ success: false, error: "계좌번호가 필요합니다." }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const requestBody = {
    connectedId,
    organization: organizationCode,
    account: accountNo,
    startDate: startDate || getDefaultStartDate(),
    endDate: endDate || getDefaultEndDate(),
    orderBy: "0", // 0: 최신순, 1: 과거순
    inquiryType: "1", // 조회구분 (1: 전체, 2: 입금, 3: 출금)
  };

  console.log("Getting transactions for account:", accountNo, "from:", startDate, "to:", endDate);

  const clientPath = clientType === "B" ? "b" : "p";
  const response = await fetch(`${CODEF_API_URL}/v1/kr/bank/${clientPath}/account/transaction-list`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${accessToken}`,
    },
    body: JSON.stringify(requestBody),
  });

  const responseText = await response.text();
  console.log("Transaction list response:", responseText.substring(0, 500));

  const data = parseCodefResponse(responseText);
  const result = data.result || {};
  const isSuccess = result.code === "CF-00000";

  if (isSuccess) {
    const rawTransactions = data.data?.resTrHistoryList || [];
    
    // 거래 데이터 정규화
    // 주의: resAccountDesc1~4의 의미는 은행마다 다름 (코드에프 스펙 시트 참조)
    // - Desc1: 대부분 미제공(-), 일부 은행만 상대 예금주명
    // - Desc2: 은행마다 거래구분/적요/거래내용 등으로 다름
    // - Desc3: 은행마다 적요/거래내용/보낸분 등으로 다름
    // - Desc4: 거래점 (일부 은행 미제공)
    // → 전략: 비어있지 않은 Desc 값들을 모아 의미있는 description 구성
    const transactions = rawTransactions.map((tx: any) => {
      const outAmount = parseInt(tx.resAccountOut || "0", 10);
      const inAmount = parseInt(tx.resAccountIn || "0", 10);
      const isExpense = outAmount > 0;
      const amount = isExpense ? outAmount : inAmount;

      const desc1 = (tx.resAccountDesc1 || "").trim();
      const desc2 = (tx.resAccountDesc2 || "").trim();
      const desc3 = (tx.resAccountDesc3 || "").trim();
      const desc4 = (tx.resAccountDesc4 || "").trim();

      // 비어있지 않은 Desc 값 중 첫 번째를 대표 description으로 사용
      // desc2(거래구분/적요)와 desc3(적요/거래내용)이 핵심이므로 우선순위 부여
      const description = desc2 || desc3 || desc1 || (isExpense ? "출금" : "입금");

      // 거래상대(보낸분/받는분)는 desc1이거나 desc3인 경우가 많음 (은행마다 다름)
      // raw 값을 모두 보존해서 AI 분류나 검색에 활용 가능하도록
      const rawMemo = [desc1, desc2, desc3].filter(Boolean).join(" | ");

      return {
        transactionDate: tx.resAccountTrDate || "",
        transactionTime: tx.resAccountTrTime || null,
        amount: Math.abs(amount),
        type: isExpense ? "expense" : "income",
        description,
        balance: tx.resAfterTranBalance || "0",
        // 고유 ID: 날짜+시각+금액 조합 (중복방지)
        transactionId: `${tx.resAccountTrDate}_${tx.resAccountTrTime}_${outAmount}_${inAmount}`,
        memo: rawMemo,
        counterpartName: desc1, // Desc1이 거래상대인 은행 (기업·신한 등)
        branch: desc4,
      };
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: "거래 내역을 조회했습니다.",
        transactions,
        totalCount: transactions.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } else {
    return new Response(
      JSON.stringify({
        success: false,
        error: result.message || "거래 내역 조회 실패",
        code: result.code,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
}

// 기본 시작 날짜 (3개월 전)
function getDefaultStartDate(): string {
  const date = new Date();
  date.setMonth(date.getMonth() - 3);
  return date.toISOString().split("T")[0].replace(/-/g, "");
}

// 기본 종료 날짜 (오늘)
function getDefaultEndDate(): string {
  return new Date().toISOString().split("T")[0].replace(/-/g, "");
}

function parseCodefResponse(text: string): any {
  try {
    return JSON.parse(text);
  } catch {
    try {
      // '+' 문자를 공백으로 처리 (form-encoded style)
      const decoded = decodeURIComponent(text.replace(/\+/g, " "));
      return JSON.parse(decoded);
    } catch {
      return { raw: text };
    }
  }
}

// 에러 코드를 사용자 친화적 메시지로 변환
function getUserFriendlyMessage(errorCode: string): string {
  const errorMessages: Record<string, string> = {
    // 인증서 관련
    "CF-12302": "인증서 비밀번호가 틀렸어요. 정확한 비밀번호를 입력해주세요.",
    "CF-12303": "인증서가 만료되었어요. 새 인증서를 발급받아주세요.",
    "CF-12304": "인증서가 폐기되었어요. 새 인증서를 발급받아주세요.",
    "CF-12305": "해당 은행에서 사용할 수 없는 인증서예요. 은행용 공동인증서인지 확인해주세요.",
    
    // 아이디/비밀번호 관련
    "CF-12800": "아이디 또는 비밀번호가 일치하지 않아요. 다시 확인해주세요.",
    "CF-12801": "비밀번호가 일치하지 않아요. 다시 확인해주세요.",
    "CF-12802": "아이디가 존재하지 않아요. 다시 확인해주세요.",
    "CF-12803": "로그인 정보가 올바르지 않아요. 다시 확인해주세요.",
    "CF-12817": "인터넷뱅킹 비밀번호가 등록되지 않았어요. 해당 은행 앱에서 비밀번호를 먼저 등록해주세요.",
    
    // 잠금/차단 관련
    "CF-12811": "비밀번호 오류 횟수가 초과되었어요. 은행 앱이나 영업점에서 인증서를 재발급받아주세요. (자동 해제되지 않습니다)",
    "CF-12812": "계정이 잠겼어요. 은행 고객센터에 문의해주세요.",
    "CF-12829": "인증서 파일이 누락되었어요. 공동인증서 로그인으로 전환하여 인증서 파일을 등록해주세요.",
    
    // 서비스 관련
    "CF-12820": "현재 서비스 점검 중이에요. 잠시 후 다시 시도해주세요.",
    "CF-12821": "은행 서버가 일시적으로 응답하지 않아요. 잠시 후 다시 시도해주세요.",
    "CF-12830": "인터넷뱅킹 서비스에 가입되어 있지 않아요. 은행 앱에서 먼저 가입해주세요.",
    
    // 계정/등록 관련
    "CF-04000": "요청 처리 중 문제가 발생했어요. 입력 정보를 다시 확인해주세요.",
    "CF-04002": "인증서 비밀번호가 올바르지 않아요. 다시 확인해주세요.",
    "CF-04003": "인증서가 만료되었어요. 갱신된 인증서를 사용해주세요.",
    "CF-04005": "인증서 형식이 올바르지 않아요. PFX/P12 또는 DER+KEY 파일을 확인해주세요.",
    "CF-04009": "인증서 정보가 올바르지 않아요. 인증서 파일과 비밀번호를 다시 확인해주세요.",
    "CF-04012": "이미 등록된 계정이에요. 기존 연동을 해제한 후 다시 시도해주세요.",
    "CF-04015": "계정 조회에 실패했어요. 사업자 유형(개인/법인)이 올바른지 확인해주세요.",
    
    // 일반 에러
    "CF-09998": "은행 서버 점검 중이에요. 잠시 후 다시 시도해주세요.",
    "CF-09999": "일시적인 오류가 발생했어요. 잠시 후 다시 시도해주세요.",
    "CF-13000": "은행 서버가 응답하지 않아요. 잠시 후 다시 시도해주세요.",
  };

  return errorMessages[errorCode] || "은행 연결 중 문제가 발생했어요. 잠시 후 다시 시도해주세요.";
}
