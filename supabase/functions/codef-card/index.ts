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

// PKCS1 v1.5 RSA 암호화 (Codef 요구사항)
// Codef는 RSA-OAEP가 아닌 PKCS1_v1_5 패딩을 사용합니다.
// Web Crypto API는 PKCS1을 지원하지 않으므로 수동 구현 필요
async function encryptRSAPKCS1(plainText: string, base64PublicKey: string): Promise<string> {
  // PEM 헤더/푸터가 있으면 제거
  const cleanedKey = base64PublicKey
    .replace(/-----BEGIN PUBLIC KEY-----/g, "")
    .replace(/-----END PUBLIC KEY-----/g, "")
    .replace(/-----BEGIN RSA PUBLIC KEY-----/g, "")
    .replace(/-----END RSA PUBLIC KEY-----/g, "")
    .replace(/\s+/g, "");

  // Base64 디코딩
  const binaryString = atob(cleanedKey);
  const keyBytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    keyBytes[i] = binaryString.charCodeAt(i);
  }

  // ASN.1 DER에서 RSA 공개키 파싱 (n, e 추출)
  const { n, e } = parseRSAPublicKey(keyBytes);
  
  // 평문을 바이트로 변환
  const messageBytes = new TextEncoder().encode(plainText);
  
  // PKCS#1 v1.5 패딩 적용
  const keySize = n.length; // 키 크기 (바이트)
  const paddedMessage = pkcs1v15Pad(messageBytes, keySize);
  
  // RSA 암호화 (m^e mod n)
  const encrypted = modPow(paddedMessage, e, n);
  
  // Base64 인코딩하여 반환
  return btoa(String.fromCharCode(...encrypted));
}

// ASN.1 DER에서 RSA 공개키 파싱
function parseRSAPublicKey(der: Uint8Array): { n: Uint8Array; e: Uint8Array } {
  let offset = 0;
  
  // SEQUENCE 태그 확인
  if (der[offset] === 0x30) {
    offset++;
    offset = skipLength(der, offset);
    
    // SubjectPublicKeyInfo인 경우 (SEQUENCE 내에 알고리즘 식별자 포함)
    if (der[offset] === 0x30) {
      offset++;
      const algLen = readLength(der, offset);
      offset += algLen.bytesRead + algLen.length;
      
      // BIT STRING 태그
      if (der[offset] === 0x03) {
        offset++;
        offset = skipLength(der, offset);
        // unused bits
        offset++;
        
        // 내부 SEQUENCE
        if (der[offset] === 0x30) {
          offset++;
          offset = skipLength(der, offset);
        }
      }
    }
    
    // INTEGER (n)
    if (der[offset] === 0x02) {
      offset++;
      const nLen = readLength(der, offset);
      offset += nLen.bytesRead;
      
      let nStart = offset;
      let nLength = nLen.length;
      
      // 앞의 0x00 패딩 제거
      while (nLength > 0 && der[nStart] === 0x00) {
        nStart++;
        nLength--;
      }
      
      const n = der.slice(nStart, nStart + nLength);
      offset += nLen.length;
      
      // INTEGER (e)
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

// PKCS#1 v1.5 패딩
function pkcs1v15Pad(message: Uint8Array, keySize: number): Uint8Array {
  const paddingLength = keySize - message.length - 3;
  if (paddingLength < 8) {
    throw new Error("Message too long for key size");
  }
  
  const padded = new Uint8Array(keySize);
  padded[0] = 0x00;
  padded[1] = 0x02;
  
  // 랜덤 패딩 바이트 (0x00이 아닌 값)
  const randomBytes = crypto.getRandomValues(new Uint8Array(paddingLength));
  for (let i = 0; i < paddingLength; i++) {
    // 0x00이면 0x01로 대체
    padded[2 + i] = randomBytes[i] === 0 ? 0x01 : randomBytes[i];
  }
  
  padded[2 + paddingLength] = 0x00;
  padded.set(message, 3 + paddingLength);
  
  return padded;
}

// 빅넘버 모듈러 거듭제곱 (m^e mod n)
function modPow(base: Uint8Array, exp: Uint8Array, mod: Uint8Array): Uint8Array {
  // BigInt 변환
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
    // JWT 인증 확인
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: "인증이 필요합니다." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const { action, cardCompanyId, loginId, password, connectedId, startDate, endDate, cardNo } = body;

    const publicKey = Deno.env.get("CODEF_PUBLIC_KEY");
    if (!publicKey) {
      throw new Error("CODEF_PUBLIC_KEY가 설정되지 않았습니다.");
    }

    // 1. 토큰 발급
    console.log("Getting access token...");
    const accessToken = await getAccessToken();
    console.log("Access token obtained");

    // 액션에 따른 분기
    if (action === "register") {
      // 계정 등록 (ConnectedId 발급)
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
  const encryptedPassword = await encryptRSAPKCS1(password, publicKey);
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
