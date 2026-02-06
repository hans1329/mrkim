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
      return new Response(
        JSON.stringify({
          success: false,
          error: "사업자등록번호를 입력해주세요.",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const cleanedNumber = businessNumber.replace(/\D/g, "");
    if (cleanedNumber.length !== 10) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "사업자등록번호는 10자리여야 합니다.",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 1. 토큰 발급
    console.log("Getting access token...");
    const accessToken = await getAccessToken();
    console.log("Access token obtained");

    // 2. 사업자 상태 조회 - 올바른 파라미터 형식 사용
    // reqIdentityList 배열 형태로 사업자번호 전달
    const requestBody = {
      organization: "0004", // 국세청
      reqIdentityList: [
        { reqIdentity: cleanedNumber }
      ],
    };

    console.log("Calling Hometax API with:", JSON.stringify(requestBody));

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

    const parseMaybeEncodedJson = (text: string) => {
      // 1) Plain JSON
      try {
        return JSON.parse(text);
      } catch {
        // ignore
      }

      // 2) Sometimes CODEF responses arrive percent-encoded (e.g. %7B%22result%22...)
      try {
        const decoded = decodeURIComponent(text);
        return JSON.parse(decoded);
      } catch {
        return { raw: text };
      }
    };

    const data = parseMaybeEncodedJson(responseText);

    // 응답 구조 로깅 (디버깅용)
    console.log("Parsed response keys:", Object.keys(data));
    if (data.data) {
      console.log("data.data structure:", Array.isArray(data.data) ? "array" : typeof data.data);
    }

    // 응답 파싱 - data가 배열인 경우 처리
    const result = data.result || {};
    const businessDataArray = Array.isArray(data.data) ? data.data : [data.data];
    
    // 조회한 사업자번호와 일치하는 데이터 찾기
    const matchingData = businessDataArray.find(
      (item: any) => item?.resCompanyIdentityNo === cleanedNumber
    ) || businessDataArray[0] || {};

    // 사업장명 추출 시도 (다양한 필드명 체크)
    const extractBusinessName = (item: any): string | null => {
      if (!item) return null;
      // CODEF에서 사용할 수 있는 다양한 필드명
      return item.resCompanyNm || 
             item.resCompanyName || 
             item.resBusinessName ||
             item.resTradeName ||
             item.companyName ||
             item.businessName ||
             null;
    };

    // 업종 정보 추출 시도
    const extractBusinessType = (item: any): string | null => {
      if (!item) return null;
      return item.resBusinessType ||
             item.resBusinessCategory ||
             item.resIndustryType ||
             item.businessType ||
             item.industryType ||
             null;
    };

    const isSuccess = result.code === "CF-00000";
    const businessName = extractBusinessName(matchingData);
    const businessType = extractBusinessType(matchingData);

    return new Response(
      JSON.stringify({
        success: isSuccess,
        // 우리 서비스 기준의 사용자 친화적 메시지
        message: isSuccess
          ? "사업자 정보가 확인되었습니다."
          : (typeof result.message === "string" && result.message.trim()
              ? result.message
              : "조회에 실패했습니다."),
        code: result.code,
        data: isSuccess
          ? {
              businessNumber: matchingData.resCompanyIdentityNo || cleanedNumber,
              businessStatus: matchingData.resBusinessStatus || "조회 결과 없음",
              taxationType: matchingData.resTaxationTypeCode || "-",
              taxationTypeDesc: getTaxationTypeDesc(matchingData.resTaxationTypeCode),
              businessName: businessName,
              businessType: businessType,
              closingDate: matchingData.resClosingDate || null,
              transferDate: matchingData.resTransferTaxTypeDate || null,
            }
          : null,
        // 디버깅용: 원본 응답 필드 (개발 환경에서만)
        _debug: {
          availableFields: Object.keys(matchingData || {}),
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Hometax API error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.",
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
