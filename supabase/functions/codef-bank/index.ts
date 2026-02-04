import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// 데모(개발) 환경
const CODEF_API_URL = "https://development.codef.io";
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

    const { action, bankId, loginId, password, connectedId } = await req.json();

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
    } else {
      return new Response(
        JSON.stringify({ success: false, error: "알 수 없는 action입니다." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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
    const errorMessage = data.data?.errorList?.[0]?.message || result.message || "계정 등록 실패";
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
        code: result.code,
        errorList: data.data?.errorList || [],
      }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
}

function parseCodefResponse(text: string): any {
  try {
    return JSON.parse(text);
  } catch {
    try {
      const decoded = decodeURIComponent(text);
      return JSON.parse(decoded);
    } catch {
      return { raw: text };
    }
  }
}
