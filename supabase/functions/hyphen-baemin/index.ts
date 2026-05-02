import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const HYPHEN_API_URL = "https://api.hyphen.im";

const ENDPOINTS: Record<string, string> = {
  verify: "/in0022000062",          // 계정검증조회
  sales: "/in0022000063",           // 매출조회
  settlement: "/in0022000064",      // 정산내역조회
  statistics: "/in0022000065",      // 통계조회
  reviews: "/in0022000066",         // 리뷰내역조회
  store_info: "/in0022000067",      // 음식점정보조회
  orders: "/in0022000083",          // 주문내역조회
  account_info: "/in0022000668",    // 계좌정보조회
  ad_management: "/in0022000952",   // 광고관리조회
  my_store: "/in0022000953",        // 내 가게 조회
  store_now: "/in0022000972",       // 우리가게NOW조회
  nearby_sales: "/in0022000973",    // 인근지역매출조회
  menu: "/in0022000974",            // 메뉴조회
  pg_sales: "/in0022000140",        // PG매출 조회
};

async function callHyphenAPI(
  endpoint: string,
  body: Record<string, unknown>
): Promise<any> {
  const HYPHEN_USER_ID = Deno.env.get("HYPHEN_USER_ID");
  const HYPHEN_HKEY = Deno.env.get("HYPHEN_HKEY");

  if (!HYPHEN_USER_ID || !HYPHEN_HKEY) {
    throw new Error("HYPHEN_USER_ID 또는 HYPHEN_HKEY가 설정되지 않았습니다.");
  }

  const response = await fetch(`${HYPHEN_API_URL}${endpoint}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "user-id": HYPHEN_USER_ID,
      Hkey: HYPHEN_HKEY,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(
      `Hyphen API 호출 실패 [${response.status}]: ${await response.text()}`
    );
  }

  const data = await response.json();

  const commonError = data.common?.errYn === "Y";
  const nestedError = data.data?.errYn === "Y";

  if (commonError || nestedError) {
    const errorCode = data.common?.errCd || data.data?.errCd || "UNKNOWN";
    const errorMessage = data.common?.errMsg || data.data?.errMsg || "알 수 없는 오류";
    throw new Error(`Hyphen API 오류 [${errorCode}]: ${errorMessage}`);
  }

  return data;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const {
      action,
      userId: bmUserId,
      userPw: bmUserPw,
      dateFrom,
      dateTo,
      storeId,
      detailYn,
      detailListYn,
      processYn,
      clickYn,
      region1,
      region2,
    } = body;

    if (!action) {
      throw new Error("action 파라미터가 필요합니다.");
    }

    const endpoint = ENDPOINTS[action];
    if (!endpoint) {
      throw new Error(`지원하지 않는 action: ${action}`);
    }

    if (!bmUserId || !bmUserPw) {
      throw new Error("배달의민족 아이디/비밀번호가 필요합니다.");
    }

    const apiBody: Record<string, unknown> = {
      userId: bmUserId,
      userPw: bmUserPw,
    };

    if (storeId) apiBody.storeId = storeId;
    if (dateFrom) apiBody.dateFrom = dateFrom;
    if (dateTo) apiBody.dateTo = dateTo;
    if (detailYn) apiBody.detailYn = detailYn;
    if (detailListYn) apiBody.detailListYn = detailListYn;
    if (processYn) apiBody.processYn = processYn;
    if (clickYn) apiBody.clickYn = clickYn;
    if (region1) apiBody.region1 = region1;
    if (region2) apiBody.region2 = region2;

    const result = await callHyphenAPI(endpoint, apiBody);

    return new Response(JSON.stringify({ success: true, data: result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("hyphen-baemin error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "알 수 없는 오류";
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
