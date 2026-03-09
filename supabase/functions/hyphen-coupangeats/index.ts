import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const HYPHEN_API_URL = "https://api.hyphen.im";

// 엔드포인트 매핑
const ENDPOINTS: Record<string, string> = {
  verify: "/in0024000079",       // 계정검증조회
  sales: "/in0024000080",        // 매출조회
  settlement: "/in0024000081",   // 정산내역조회
  store_info: "/in0024000082",   // 음식점정보조회
  orders: "/in0024000086",       // 주문내역조회
  account_info: "/in0024000722", // 계좌정보조회
  reviews: "/in0024000800",      // 리뷰내역조회
  my_store: "/in0024000955",     // 내 가게 조회
  menu: "/in0024000976",         // 메뉴조회
  pg_sales: "/in0024000150",     // PG매출 조회
};

interface HyphenResponse {
  common: {
    userTrNo: string;
    hyphenTrNo: string;
    errYn: string;
    errCd: string;
    errMsg: string;
  };
  data: any;
}

async function callHyphenAPI(
  endpoint: string,
  body: Record<string, unknown>
): Promise<HyphenResponse> {
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

  if (data.common?.errYn === "Y") {
    throw new Error(
      `Hyphen API 오류 [${data.common.errCd}]: ${data.common.errMsg}`
    );
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
      userId: ceUserId,
      userPw: ceUserPw,
      dateFrom,
      dateTo,
      storeId,
      detailListYn,
      allTransYn,
      langType,
    } = body;

    if (!action) {
      throw new Error("action 파라미터가 필요합니다.");
    }

    const endpoint = ENDPOINTS[action];
    if (!endpoint) {
      throw new Error(`지원하지 않는 action: ${action}`);
    }

    if (!ceUserId || !ceUserPw) {
      throw new Error("쿠팡이츠 아이디/비밀번호가 필요합니다.");
    }

    // 공통 body
    const apiBody: Record<string, unknown> = {
      userId: ceUserId,
      userPw: ceUserPw,
    };

    // 액션별 추가 파라미터
    if (storeId) apiBody.storeId = storeId;
    if (dateFrom) apiBody.dateFrom = dateFrom;
    if (dateTo) apiBody.dateTo = dateTo;
    if (detailListYn) apiBody.detailListYn = detailListYn;
    if (allTransYn) apiBody.allTransYn = allTransYn;
    if (langType) apiBody.langType = langType;

    const result = await callHyphenAPI(endpoint, apiBody);

    return new Response(JSON.stringify({ success: true, data: result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("hyphen-coupangeats error:", error);
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
