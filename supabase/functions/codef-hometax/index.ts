import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// 데모(개발) 환경
const CODEF_API_URL = "https://development.codef.io";
const CODEF_TOKEN_URL = "https://oauth.codef.io/oauth/token";

// 홈택스 사업자 상태 조회 API
const HOMETAX_BUSINESS_STATUS_PATH = "/v1/kr/public/nt/business/status";

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
    const { businessNumber } = await req.json();

    if (!businessNumber) {
      // 샌드박스 테스트용 기본 사업자번호
      console.log("No business number provided, using sandbox test number");
    }

    // 테스트용 사업자번호 (샌드박스에서 응답하는 번호)
    const testBusinessNumber = businessNumber || "1234567890";

    // 1. 토큰 발급
    console.log("Getting access token...");
    const accessToken = await getAccessToken();
    console.log("Access token obtained");

    // 2. 사업자 상태 조회
    const requestBody = {
      organization: "0004", // 국세청
      loginType: "3", // 사업자등록번호 조회
      identity: testBusinessNumber,
      inquiryBizNo: testBusinessNumber,
    };

    console.log("Calling Hometax API with:", { businessNumber: testBusinessNumber });

    const response = await fetch(`${CODEF_API_URL}${HOMETAX_BUSINESS_STATUS_PATH}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${accessToken}`,
      },
      body: JSON.stringify(requestBody),
    });

    const responseText = await response.text();
    console.log("Hometax API response status:", response.status);
    console.log("Hometax API response:", responseText);

    let data;
    try {
      data = JSON.parse(responseText);
    } catch {
      data = { raw: responseText };
    }

    // 응답 파싱 - data가 배열인 경우 처리
    const result = data.result || {};
    const businessDataArray = Array.isArray(data.data) ? data.data : [data.data];
    
    // 조회한 사업자번호와 일치하는 데이터 찾기
    const matchingData = businessDataArray.find(
      (item: any) => item?.resCompanyIdentityNo === testBusinessNumber
    ) || businessDataArray[0] || {};

    return new Response(
      JSON.stringify({
        success: result.code === "CF-00000",
        message: result.message || "조회 완료",
        code: result.code,
        data: {
          businessNumber: matchingData.resCompanyIdentityNo || testBusinessNumber,
          businessStatus: matchingData.resBusinessStatus || "조회 결과 없음",
          taxationType: matchingData.resTaxationTypeCode || "-",
          taxationTypeDesc: getTaxationTypeDesc(matchingData.resTaxationTypeCode),
          closingDate: matchingData.resClosingDate || null,
          transferDate: matchingData.resTransferTaxTypeDate || null,
        },
        raw: data, // 디버깅용 원본 응답
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Hometax API error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

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
