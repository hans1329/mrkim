import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// 정식(운영) 환경
const CODEF_API_URL = "https://api.codef.io";
const CODEF_TOKEN_URL = "https://oauth.codef.io/oauth/token";

// 세금계산서 조회 API 경로
const TAX_INVOICE_SALES_PATH = "/v1/kr/public/nt/tax-invoice/sales"; // 매출 세금계산서
const TAX_INVOICE_PURCHASE_PATH = "/v1/kr/public/nt/tax-invoice/purchase"; // 매입 세금계산서

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

function parseMaybeEncodedJson(text: string): any {
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

// 날짜 포맷 변환 (YYYYMMDD -> YYYY-MM-DD)
function formatDate(dateStr: string): string {
  if (!dateStr || dateStr.length !== 8) return dateStr;
  return `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // 인증 확인
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: "인증이 필요합니다." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // JWT에서 user_id 추출
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: "인증에 실패했습니다." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { action, businessNumber, startDate, endDate, connectedId } = await req.json();

    if (!businessNumber) {
      return new Response(
        JSON.stringify({ success: false, error: "사업자등록번호를 입력해주세요." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const cleanedNumber = businessNumber.replace(/\D/g, "");
    
    // 기본 날짜: 최근 3개월
    const now = new Date();
    const defaultEndDate = now.toISOString().slice(0, 10).replace(/-/g, "");
    const threeMonthsAgo = new Date(now.setMonth(now.getMonth() - 3));
    const defaultStartDate = threeMonthsAgo.toISOString().slice(0, 10).replace(/-/g, "");

    const queryStartDate = startDate?.replace(/-/g, "") || defaultStartDate;
    const queryEndDate = endDate?.replace(/-/g, "") || defaultEndDate;

    // connectedId가 없으면 connector_instances에서 조회
    let effectiveConnectedId = connectedId;
    if (!effectiveConnectedId) {
      const { data: instanceData } = await supabase
        .from("connector_instances")
        .select("connected_id")
        .eq("user_id", user.id)
        .eq("connector_id", "codef_hometax_tax_invoice")
        .eq("status", "connected")
        .not("connected_id", "is", null)
        .single();
      effectiveConnectedId = instanceData?.connected_id || null;
    }

    console.log("Getting access token...");
    const accessToken = await getAccessToken();
    console.log("Access token obtained");

    // 동기화 상태 업데이트
    await supabase.from("hometax_sync_status").upsert({
      user_id: user.id,
      sync_status: "syncing",
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" });

    const results = {
      sales: [] as any[],
      purchase: [] as any[],
    };

    // 매출 세금계산서 조회
    if (action === "all" || action === "sales") {
      const salesBody: Record<string, string> = {
        organization: "0004",
        identity: cleanedNumber,
        startDate: queryStartDate,
        endDate: queryEndDate,
      };
      // connectedId가 있으면 인증된 조회, 없으면 공개 조회
      if (effectiveConnectedId) {
        salesBody.connectedId = effectiveConnectedId;
      }

      console.log("Fetching sales invoices...", salesBody);
      
      const salesResponse = await fetch(`${CODEF_API_URL}${TAX_INVOICE_SALES_PATH}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${accessToken}`,
        },
        body: JSON.stringify(salesBody),
      });

      const salesText = await salesResponse.text();
      console.log("Sales response:", salesText.slice(0, 500));
      
      const salesData = parseMaybeEncodedJson(salesText);
      
      if (salesData.result?.code === "CF-00000" && salesData.data) {
        const invoices = Array.isArray(salesData.data) ? salesData.data : [salesData.data];
        results.sales = invoices.filter((inv: any) => inv?.resIssueId).map((inv: any) => ({
          invoice_type: "sales",
          invoice_date: formatDate(inv.resIssueDate),
          buyer_name: inv.resBuyerCompanyName || "",
          buyer_business_number: inv.resBuyerCompanyIdentityNo || "",
          supply_amount: parseInt(inv.resSupplyAmount || "0", 10),
          tax_amount: parseInt(inv.resTaxAmount || "0", 10),
          total_amount: parseInt(inv.resTotalAmount || "0", 10),
          item_name: inv.resItemName || "",
          issue_id: inv.resIssueId,
        }));
      }
    }

    // 매입 세금계산서 조회
    if (action === "all" || action === "purchase") {
      const purchaseBody = {
        organization: "0004",
        loginType: "3",
        identity: cleanedNumber,
        startDate: queryStartDate,
        endDate: queryEndDate,
      };

      console.log("Fetching purchase invoices...", purchaseBody);

      const purchaseResponse = await fetch(`${CODEF_API_URL}${TAX_INVOICE_PURCHASE_PATH}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${accessToken}`,
        },
        body: JSON.stringify(purchaseBody),
      });

      const purchaseText = await purchaseResponse.text();
      console.log("Purchase response:", purchaseText.slice(0, 500));

      const purchaseData = parseMaybeEncodedJson(purchaseText);

      if (purchaseData.result?.code === "CF-00000" && purchaseData.data) {
        const invoices = Array.isArray(purchaseData.data) ? purchaseData.data : [purchaseData.data];
        results.purchase = invoices.filter((inv: any) => inv?.resIssueId).map((inv: any) => ({
          invoice_type: "purchase",
          invoice_date: formatDate(inv.resIssueDate),
          supplier_name: inv.resSupplierCompanyName || "",
          supplier_business_number: inv.resSupplierCompanyIdentityNo || "",
          supply_amount: parseInt(inv.resSupplyAmount || "0", 10),
          tax_amount: parseInt(inv.resTaxAmount || "0", 10),
          total_amount: parseInt(inv.resTotalAmount || "0", 10),
          item_name: inv.resItemName || "",
          issue_id: inv.resIssueId,
        }));
      }
    }

    // DB에 저장 (중복 방지)
    const allInvoices = [...results.sales, ...results.purchase].map(inv => ({
      ...inv,
      user_id: user.id,
      synced_at: new Date().toISOString(),
    }));

    if (allInvoices.length > 0) {
      // 기존 데이터 삭제 후 새로 삽입 (upsert 대신)
      await supabase
        .from("tax_invoices")
        .delete()
        .eq("user_id", user.id)
        .gte("invoice_date", formatDate(queryStartDate))
        .lte("invoice_date", formatDate(queryEndDate));

      const { error: insertError } = await supabase
        .from("tax_invoices")
        .insert(allInvoices);

      if (insertError) {
        console.error("Insert error:", insertError);
      }
    }

    // 동기화 상태 완료 업데이트
    const totalSalesAmount = results.sales.reduce((sum, inv) => sum + inv.total_amount, 0);
    const totalPurchaseAmount = results.purchase.reduce((sum, inv) => sum + inv.total_amount, 0);

    await supabase.from("hometax_sync_status").upsert({
      user_id: user.id,
      sync_status: "completed",
      last_sync_at: new Date().toISOString(),
      sales_count: results.sales.length,
      purchase_count: results.purchase.length,
      total_sales_amount: totalSalesAmount,
      total_purchase_amount: totalPurchaseAmount,
      sync_error: null,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" });

    return new Response(
      JSON.stringify({
        success: true,
        message: "세금계산서 조회가 완료되었습니다.",
        data: {
          salesCount: results.sales.length,
          purchaseCount: results.purchase.length,
          totalSalesAmount,
          totalPurchaseAmount,
          period: {
            start: formatDate(queryStartDate),
            end: formatDate(queryEndDate),
          },
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Tax invoice API error:", error);
    
    // 에러 시 동기화 상태 업데이트
    try {
      const authHeader = req.headers.get("Authorization");
      if (authHeader) {
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const supabase = createClient(supabaseUrl, supabaseKey);
        const token = authHeader.replace("Bearer ", "");
        const { data: { user } } = await supabase.auth.getUser(token);
        
        if (user) {
          await supabase.from("hometax_sync_status").upsert({
            user_id: user.id,
            sync_status: "failed",
            sync_error: error instanceof Error ? error.message : "Unknown error",
            updated_at: new Date().toISOString(),
          }, { onConflict: "user_id" });
        }
      }
    } catch (e) {
      console.error("Failed to update sync status:", e);
    }

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
