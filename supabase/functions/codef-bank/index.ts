import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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

// PKCS1 v1.5 RSA 암호화 함수 (카드와 동일)
async function encryptRSAPKCS1(plainText: string, base64PublicKey: string): Promise<string> {
  const cleanedKey = base64PublicKey
    .replace(/-----BEGIN PUBLIC KEY-----/g, "")
    .replace(/-----END PUBLIC KEY-----/g, "")
    .replace(/-----BEGIN RSA PUBLIC KEY-----/g, "")
    .replace(/-----END RSA PUBLIC KEY-----/g, "")
    .replace(/\s+/g, "");

  const binaryString = atob(cleanedKey);
  const keyBytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    keyBytes[i] = binaryString.charCodeAt(i);
  }

  const { n, e } = parseRSAPublicKey(keyBytes);
  const messageBytes = new TextEncoder().encode(plainText);
  const keySize = n.length;
  const paddedMessage = pkcs1v15Pad(messageBytes, keySize);
  const encrypted = modPow(paddedMessage, e, n);
  
  return btoa(String.fromCharCode(...encrypted));
}

function parseRSAPublicKey(der: Uint8Array): { n: Uint8Array; e: Uint8Array } {
  let offset = 0;
  
  if (der[offset] === 0x30) {
    offset++;
    offset = skipLength(der, offset);
    
    if (der[offset] === 0x30) {
      offset++;
      const algLen = readLength(der, offset);
      offset += algLen.bytesRead + algLen.length;
      
      if (der[offset] === 0x03) {
        offset++;
        offset = skipLength(der, offset);
        offset++;
        
        if (der[offset] === 0x30) {
          offset++;
          offset = skipLength(der, offset);
        }
      }
    }
    
    if (der[offset] === 0x02) {
      offset++;
      const nLen = readLength(der, offset);
      offset += nLen.bytesRead;
      
      let nStart = offset;
      let nLength = nLen.length;
      
      while (nLength > 0 && der[nStart] === 0x00) {
        nStart++;
        nLength--;
      }
      
      const n = der.slice(nStart, nStart + nLength);
      offset += nLen.length;
      
      if (der[offset] === 0x02) {
        offset++;
        const eLen = readLength(der, offset);
        offset += eLen.bytesRead;
        
        let eStart = offset;
        let eLength = eLen.length;
        
        while (eLength > 0 && der[eStart] === 0x00) {
          eStart++;
          eLength--;
        }
        
        const e = der.slice(eStart, eStart + eLength);
        
        return { n, e };
      }
    }
  }
  
  throw new Error("Invalid RSA public key format");
}

function skipLength(der: Uint8Array, offset: number): number {
  const result = readLength(der, offset);
  return offset + result.bytesRead;
}

function readLength(der: Uint8Array, offset: number): { length: number; bytesRead: number } {
  if (der[offset] < 0x80) {
    return { length: der[offset], bytesRead: 1 };
  }
  
  const numBytes = der[offset] & 0x7f;
  let length = 0;
  for (let i = 0; i < numBytes; i++) {
    length = (length << 8) | der[offset + 1 + i];
  }
  return { length, bytesRead: 1 + numBytes };
}

function pkcs1v15Pad(message: Uint8Array, keySize: number): Uint8Array {
  const paddingLength = keySize - message.length - 3;
  if (paddingLength < 8) {
    throw new Error("Message too long for key size");
  }
  
  const padded = new Uint8Array(keySize);
  padded[0] = 0x00;
  padded[1] = 0x02;
  
  const randomBytes = crypto.getRandomValues(new Uint8Array(paddingLength));
  for (let i = 0; i < paddingLength; i++) {
    padded[2 + i] = randomBytes[i] === 0 ? 0x01 : randomBytes[i];
  }
  
  padded[2 + paddingLength] = 0x00;
  padded.set(message, 3 + paddingLength);
  
  return padded;
}

function modPow(base: Uint8Array, exp: Uint8Array, mod: Uint8Array): Uint8Array {
  let baseNum = bytesToBigInt(base);
  let expNum = bytesToBigInt(exp);
  const modNum = bytesToBigInt(mod);
  
  let result = 1n;
  baseNum = baseNum % modNum;
  
  while (expNum > 0n) {
    if (expNum % 2n === 1n) {
      result = (result * baseNum) % modNum;
    }
    expNum = expNum / 2n;
    baseNum = (baseNum * baseNum) % modNum;
  }
  
  return bigIntToBytes(result, mod.length);
}

function bytesToBigInt(bytes: Uint8Array): bigint {
  let result = 0n;
  for (const byte of bytes) {
    result = (result << 8n) | BigInt(byte);
  }
  return result;
}

function bigIntToBytes(num: bigint, length: number): Uint8Array {
  const result = new Uint8Array(length);
  let temp = num;
  for (let i = length - 1; i >= 0; i--) {
    result[i] = Number(temp & 0xffn);
    temp = temp >> 8n;
  }
  return result;
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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: "인증이 필요합니다." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { action, bankId, loginId, password, connectedId, accountNo, startDate, endDate } = await req.json();

    const publicKey = Deno.env.get("CODEF_PUBLIC_KEY");
    if (!publicKey) {
      throw new Error("CODEF_PUBLIC_KEY가 설정되지 않았습니다.");
    }

    console.log("Getting access token...");
    const accessToken = await getAccessToken();
    console.log("Access token obtained");

    if (action === "register") {
      return await handleRegister(accessToken, publicKey, bankId, loginId, password);
    } else if (action === "addAccount") {
      return await handleAddAccount(accessToken, publicKey, connectedId, bankId, loginId, password);
    } else if (action === "getAccounts") {
      return await handleGetAccounts(accessToken, connectedId, bankId);
    } else if (action === "getTransactions") {
      return await handleGetTransactions(accessToken, connectedId, bankId, accountNo, startDate, endDate);
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

// 계정 등록 (ConnectedId 신규 발급)
async function handleRegister(
  accessToken: string,
  publicKey: string,
  bankId: string,
  loginId: string,
  password: string
): Promise<Response> {
  const organizationCode = BANK_ORGANIZATION_CODES[bankId];
  if (!organizationCode) {
    return new Response(
      JSON.stringify({ success: false, error: "지원하지 않는 은행입니다." }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  console.log("Encrypting password with RSA PKCS1 v1.5...");
  const encryptedPassword = await encryptRSAPKCS1(password, publicKey);
  console.log("Password encrypted successfully");

  const requestBody = {
    accountList: [
      {
        countryCode: "KR",
        businessType: "BK",  // 은행
        clientType: "P",     // 개인
        organization: organizationCode,
        loginType: "1",      // ID/PW 로그인
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
  password: string
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
        clientType: "P",
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
  bankId: string
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

  const response = await fetch(`${CODEF_API_URL}/v1/kr/bank/p/account/account-list`, {
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
  endDate: string
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

  const response = await fetch(`${CODEF_API_URL}/v1/kr/bank/p/account/transaction-list`, {
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
    
    // 거래 데이터 정규화 (API 응답 필드: resAccountDesc1~4 매핑)
    const transactions = rawTransactions.map((tx: any) => {
      const outAmount = parseInt(tx.resAccountOut || "0", 10);
      const inAmount = parseInt(tx.resAccountIn || "0", 10);
      const isExpense = outAmount > 0;
      const amount = isExpense ? outAmount : inAmount;

      // 코드에프 응답 필드 매핑:
      // resAccountDesc1: 보낸분/받는분 (거래상대)
      // resAccountDesc2: 거래구분/메모
      // resAccountDesc3: 적요
      // resAccountDesc4: 거래점(지점)
      const counterpart = (tx.resAccountDesc1 || "").trim();
      const memo = (tx.resAccountDesc2 || "").trim();
      const summary = (tx.resAccountDesc3 || "").trim();

      // 설명: 적요 > 거래구분/메모 > 거래상대 순으로 fallback
      const description = summary || memo || counterpart || (isExpense ? "출금" : "입금");

      return {
        transactionDate: tx.resAccountTrDate || "",
        transactionTime: tx.resAccountTrTime || null,
        amount: Math.abs(amount),
        type: isExpense ? "expense" : "income",
        description,
        balance: tx.resAfterTranBalance || "0",
        // 고유 ID: 날짜+시각+금액 조합 (중복방지)
        transactionId: `${tx.resAccountTrDate}_${tx.resAccountTrTime}_${outAmount}_${inAmount}`,
        memo,
        counterpartName: counterpart,
        branch: (tx.resAccountDesc4 || "").trim(),
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
    // 인증 관련
    "CF-12817": "인터넷뱅킹 비밀번호가 등록되지 않았어요. 해당 은행 앱에서 비밀번호를 먼저 등록해주세요.",
    "CF-12800": "아이디 또는 비밀번호가 일치하지 않아요. 다시 확인해주세요.",
    "CF-12801": "비밀번호가 일치하지 않아요. 다시 확인해주세요.",
    "CF-12802": "아이디가 존재하지 않아요. 다시 확인해주세요.",
    "CF-12803": "로그인 정보가 올바르지 않아요. 다시 확인해주세요.",
    "CF-12811": "비밀번호 오류 횟수가 초과되었어요. 은행 앱에서 비밀번호를 재설정해주세요.",
    "CF-12812": "계정이 잠겼어요. 은행 고객센터에 문의해주세요.",
    
    // 서비스 관련
    "CF-12820": "현재 서비스 점검 중이에요. 잠시 후 다시 시도해주세요.",
    "CF-12821": "은행 서버가 일시적으로 응답하지 않아요. 잠시 후 다시 시도해주세요.",
    "CF-12830": "인터넷뱅킹 서비스에 가입되어 있지 않아요. 은행 앱에서 먼저 가입해주세요.",
    
    // 일반 에러
    "CF-04000": "요청 처리 중 문제가 발생했어요. 입력 정보를 다시 확인해주세요.",
    "CF-09999": "일시적인 오류가 발생했어요. 잠시 후 다시 시도해주세요.",
  };

  return errorMessages[errorCode] || "은행 연결 중 문제가 발생했어요. 잠시 후 다시 시도해주세요.";
}
