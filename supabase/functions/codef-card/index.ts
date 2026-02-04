import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// 데모(개발) 환경
const CODEF_API_URL = "https://development.codef.io";
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

// RSA 암호화 함수 (Deno용)
async function encryptRSA(plainText: string, base64PublicKey: string): Promise<string> {
  // Base64 디코딩
  const binaryString = atob(base64PublicKey);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  // RSA 공개키 import
  const publicKey = await crypto.subtle.importKey(
    "spki",
    bytes,
    {
      name: "RSA-OAEP",
      hash: "SHA-256",
    },
    true,
    ["encrypt"]
  );

  // 암호화
  const encodedText = new TextEncoder().encode(plainText);
  const encrypted = await crypto.subtle.encrypt(
    { name: "RSA-OAEP" },
    publicKey,
    encodedText
  );

  // Base64 인코딩하여 반환
  return btoa(String.fromCharCode(...new Uint8Array(encrypted)));
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

    const { action, cardCompanyId, loginId, password, connectedId } = await req.json();

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
    } else {
      return new Response(
        JSON.stringify({ success: false, error: "알 수 없는 action입니다." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // 비밀번호 RSA 암호화
  const encryptedPassword = await encryptRSA(password, publicKey);

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
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const encryptedPassword = await encryptRSA(password, publicKey);

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
      status: isSuccess ? 200 : 400, 
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
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
}

// Codef 응답 파싱 (URL 인코딩된 경우 처리)
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
