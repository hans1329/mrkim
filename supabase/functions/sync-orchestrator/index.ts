import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const FUNCTION_VERSION = "1.3.0"; // forceFullSync 지원, 디버깅 로그 추가
const FUNCTION_UPDATED_AT = "2026-04-06";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const HYPHEN_API_URL = "https://api.hyphen.im";

/**
 * sync-orchestrator
 *
 * connector_instances 테이블을 스캔하여 동기화가 필요한 인스턴스를 찾고,
 * 각 커넥터 유형에 맞는 데이터 수집 Edge Function을 호출합니다.
 *
 * 호출 방법:
 *   1. cron (pg_cron + pg_net)  – 주기적 자동 실행
 *   2. 수동 POST 호출           – 특정 인스턴스 즉시 동기화
 *
 * Body (optional):
 *   { instanceId?: string }     – 특정 인스턴스만 동기화
 */

// 커넥터별 동기화 핸들러 매핑
const SYNC_HANDLERS: Record<
  string,
  (
    supabase: ReturnType<typeof createClient>,
    instance: any,
    job: any,
    options: { forceFullSync: boolean }
  ) => Promise<{ recordsFetched: number; recordsSaved: number }>
> = {
  codef_hometax_tax_invoice: syncHometaxInvoices,
  codef_card_usage: syncCardTransactions,
  codef_bank_account: syncBankTransactions,
  hyphen_coupangeats: syncCoupangeats,
  hyphen_baemin: syncBaemin,
};

// 기본 동기화 간격 (분)
const DEFAULT_SYNC_INTERVAL = 360; // 6시간

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  console.log(`[sync-orchestrator] v${FUNCTION_VERSION} (${FUNCTION_UPDATED_AT})`);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  try {
    let targetInstanceId: string | null = null;
    let targetConnectorId: string | null = null;
    let forceFullSync = false;

    // POST body에서 특정 인스턴스 ID 또는 커넥터 ID 확인
    if (req.method === "POST") {
      try {
        const body = await req.json();
        targetInstanceId = body.instanceId || null;
        targetConnectorId = body.connectorId || null;
        forceFullSync = body.forceFullSync === true;
      } catch {
        // body 없을 수 있음 (cron 호출)
      }
    }

    // 동기화 대상 인스턴스 조회
    let query = supabase
      .from("connector_instances")
      .select("*, connectors!inner(id, name, category, provider)")
      .eq("status", "connected");

    if (targetInstanceId) {
      query = query.eq("id", targetInstanceId);
    } else if (targetConnectorId) {
      // connectorId로 호출 시 해당 커넥터의 모든 connected 인스턴스 동기화
      query = query.eq("connector_id", targetConnectorId);
    } else {
      // next_sync_at이 현재 이전이거나 null인 인스턴스만
      query = query.or(
        `next_sync_at.is.null,next_sync_at.lte.${new Date().toISOString()}`
      );
    }

    const { data: instances, error: queryError } = await query;

    if (queryError) {
      console.error("Failed to query instances:", queryError);
      throw queryError;
    }

    if (!instances || instances.length === 0) {
      console.log("No instances need syncing");
      return new Response(
        JSON.stringify({
          success: true,
          message: "동기화 대상이 없습니다.",
          synced: 0,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Found ${instances.length} instances to sync`);

    const results: Array<{
      instanceId: string;
      connectorId: string;
      userId: string;
      success: boolean;
      recordsFetched?: number;
      recordsSaved?: number;
      error?: string;
    }> = [];

    for (const instance of instances) {
      const connectorId = instance.connector_id;
      const handler = SYNC_HANDLERS[connectorId];

      if (!handler) {
        console.log(`No sync handler for connector: ${connectorId}, skipping`);
        continue;
      }

      // sync_job 생성 (forceFullSync일 때 항상 full 타입)
      const { data: job, error: jobError } = await supabase
        .from("sync_jobs")
        .insert({
          instance_id: instance.id,
          user_id: instance.user_id,
          job_type: forceFullSync || !instance.last_sync_at ? "full" : "delta",
          status: "running",
          started_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (jobError) {
        console.error(`Failed to create sync job for ${connectorId}:`, jobError);
        results.push({
          instanceId: instance.id,
          connectorId,
          userId: instance.user_id,
          success: false,
          error: "sync_job 생성 실패",
        });
        continue;
      }

      try {
        console.log(
          `Syncing ${connectorId} for user ${instance.user_id} (job: ${job.id})`
        );

        const syncResult = await handler(supabase, instance, job, { forceFullSync });

        // sync_job 완료 업데이트
        await supabase
          .from("sync_jobs")
          .update({
            status: "completed",
            completed_at: new Date().toISOString(),
            records_fetched: syncResult.recordsFetched,
            records_saved: syncResult.recordsSaved,
          })
          .eq("id", job.id);

        // connector_instance 업데이트
        const interval =
          instance.sync_interval_minutes || DEFAULT_SYNC_INTERVAL;
        const nextSync = new Date(
          Date.now() + interval * 60 * 1000
        ).toISOString();

        await supabase
          .from("connector_instances")
          .update({
            last_sync_at: new Date().toISOString(),
            next_sync_at: nextSync,
            status_message: `${syncResult.recordsSaved}건 동기화 완료`,
          })
          .eq("id", instance.id);

        // sync_log 기록
        await supabase.from("sync_logs").insert({
          job_id: job.id,
          user_id: instance.user_id,
          level: "info",
          message: `동기화 완료: ${syncResult.recordsFetched}건 조회, ${syncResult.recordsSaved}건 저장`,
        });

        // 알림 생성 (새 데이터가 있을 때만)
        if (syncResult.recordsSaved > 0) {
          const connectorLabel = getConnectorLabel(connectorId);
          await supabase.from("notifications").insert({
            user_id: instance.user_id,
            type: "success",
            title: `${connectorLabel} 동기화 완료`,
            message: `${syncResult.recordsSaved}건의 새 데이터가 수집되었습니다.`,
          });
        }

        results.push({
          instanceId: instance.id,
          connectorId,
          userId: instance.user_id,
          success: true,
          recordsFetched: syncResult.recordsFetched,
          recordsSaved: syncResult.recordsSaved,
        });
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Unknown error";
        console.error(`Sync failed for ${connectorId}:`, errorMessage);

        // sync_job 실패 업데이트
        const retryCount = (job.retry_count || 0) + 1;
        await supabase
          .from("sync_jobs")
          .update({
            status: retryCount >= job.max_retries ? "failed" : "pending",
            completed_at: new Date().toISOString(),
            error_message: errorMessage,
            error_code: "SYNC_FAILED",
            retry_count: retryCount,
          })
          .eq("id", job.id);

        // connector_instance 상태 메시지 업데이트
        await supabase
          .from("connector_instances")
          .update({
            status_message: `동기화 실패: ${errorMessage}`,
          })
          .eq("id", instance.id);

        // sync_log 기록
        await supabase.from("sync_logs").insert({
          job_id: job.id,
          user_id: instance.user_id,
          level: "error",
          message: `동기화 실패: ${errorMessage}`,
        });

        // 실패 알림 생성
        if (retryCount >= job.max_retries) {
          const connectorLabel = getConnectorLabel(connectorId);
          await supabase.from("notifications").insert({
            user_id: instance.user_id,
            type: "warning",
            title: `${connectorLabel} 동기화 실패`,
            message: `데이터 수집에 실패했습니다. 연동 상태를 확인해주세요.`,
          });
        }

        results.push({
          instanceId: instance.id,
          connectorId,
          userId: instance.user_id,
          success: false,
          error: errorMessage,
        });
      }
    }

    const successCount = results.filter((r) => r.success).length;
    console.log(
      `Sync completed: ${successCount}/${results.length} successful`
    );

    return new Response(
      JSON.stringify({
        success: true,
        version: FUNCTION_VERSION,
        message: `${successCount}/${results.length}건 동기화 완료`,
        synced: successCount,
        total: results.length,
        results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Orchestrator error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "알 수 없는 오류가 발생했습니다.",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

// ─── 커넥터 라벨 매핑 ──────────────────────────────────

function getConnectorLabel(connectorId: string): string {
  const labels: Record<string, string> = {
    codef_hometax_tax_invoice: "홈택스 세금계산서",
    codef_card_usage: "카드 거래내역",
    codef_bank_account: "은행 거래내역",
    hyphen_coupangeats: "쿠팡이츠 매출",
    hyphen_baemin: "배달의민족 매출",
  };
  return labels[connectorId] || connectorId;
}

// ─── 커넥터별 동기화 핸들러 ────────────────────────────

/**
 * 홈택스 세금계산서 동기화
 */
async function syncHometaxInvoices(
  supabase: ReturnType<typeof createClient>,
  instance: any,
  _job: any,
  options: { forceFullSync: boolean }
): Promise<{ recordsFetched: number; recordsSaved: number }> {
  // connectedId 확인 - 간편인증 완료된 인스턴스만 세금계산서 조회 가능
  const connectedId = instance.connected_id;
  if (!connectedId) {
    // connectedId가 없으면 간편인증 미완료 → 사업자 확인만 된 상태
    console.log(`[hometax] Instance ${instance.id}: connectedId 없음, 간편인증 필요`);
    return { recordsFetched: 0, recordsSaved: 0 };
  }

  // 사업자번호 조회
  const { data: profile } = await supabase
    .from("profiles")
    .select("business_registration_number")
    .eq("user_id", instance.user_id)
    .single();

  if (!profile?.business_registration_number) {
    throw new Error("사업자등록번호가 설정되지 않았습니다.");
  }

  // 동기화 기간 결정
  const now = new Date();
  let startDate: string;

  if (instance.last_sync_at && !options.forceFullSync) {
    const lastSync = new Date(instance.last_sync_at);
    lastSync.setDate(lastSync.getDate() - 1);
    startDate = lastSync.toISOString().slice(0, 10).replace(/-/g, "");
  } else {
    const threeMonthsAgo = new Date(now);
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    startDate = threeMonthsAgo.toISOString().slice(0, 10).replace(/-/g, "");
  }
  const endDate = now.toISOString().slice(0, 10).replace(/-/g, "");

  const codefResult = await callCodefTaxInvoice(
    supabase,
    instance.user_id,
    profile.business_registration_number,
    connectedId,
    startDate,
    endDate
  );

  return codefResult;
}

/**
 * CODEF 세금계산서 직접 호출 (connectedId 기반)
 */
async function callCodefTaxInvoice(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  businessNumber: string,
  connectedId: string,
  startDate: string,
  endDate: string
): Promise<{ recordsFetched: number; recordsSaved: number }> {
  const CODEF_API_URL = "https://api.codef.io";
  const CODEF_TOKEN_URL = "https://oauth.codef.io/oauth/token";

  const clientId = Deno.env.get("CODEF_CLIENT_ID")!;
  const clientSecret = Deno.env.get("CODEF_CLIENT_SECRET")!;

  const credentials = btoa(`${clientId}:${clientSecret}`);
  const tokenRes = await fetch(CODEF_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${credentials}`,
    },
    body: "grant_type=client_credentials&scope=read",
  });
  if (!tokenRes.ok) throw new Error(`CODEF token failed: ${tokenRes.status}`);
  const { access_token: accessToken } = await tokenRes.json();

  const cleanedNumber = businessNumber.replace(/\D/g, "");

  let totalFetched = 0;
  let totalSaved = 0;

  // 매출 + 매입 조회 (connectedId 기반)
  for (const type of ["sales", "purchase"] as const) {
    const path =
      type === "sales"
        ? "/v1/kr/public/nt/tax-invoice/sales"
        : "/v1/kr/public/nt/tax-invoice/purchase";

    const queryBody = {
      connectedId,
      organization: "0004",
      identity: cleanedNumber,
      startDate,
      endDate,
    };

    console.log(`[hometax] Fetching ${type} invoices with connectedId...`);

    const res = await fetch(`${CODEF_API_URL}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(queryBody),
    });

    const text = await res.text();
    let data: any;
    try {
      data = JSON.parse(text);
    } catch {
      try {
        data = JSON.parse(decodeURIComponent(text));
      } catch {
        console.error(`Failed to parse ${type} response:`, text.substring(0, 300));
        continue;
      }
    }

    console.log(`[hometax] ${type} response code:`, data.result?.code, "data type:", Array.isArray(data.data) ? `array(${data.data.length})` : typeof data.data);

    if (data.result?.code !== "CF-00000" || !data.data) continue;

    const invoices = Array.isArray(data.data) ? data.data : [data.data];
    const validInvoices = invoices.filter((inv: any) => inv?.resIssueId);
    totalFetched += validInvoices.length;

    const formatted = validInvoices.map((inv: any) => ({
      user_id: userId,
      invoice_type: type,
      invoice_date: formatDateStr(inv.resIssueDate),
      supply_amount: parseInt(inv.resSupplyAmount || "0", 10),
      tax_amount: parseInt(inv.resTaxAmount || "0", 10),
      total_amount: parseInt(inv.resTotalAmount || "0", 10),
      item_name: inv.resItemName || "",
      issue_id: inv.resIssueId,
      ...(type === "sales"
        ? {
            buyer_name: inv.resBuyerCompanyName || "",
            buyer_business_number: inv.resBuyerCompanyIdentityNo || "",
          }
        : {
            supplier_name: inv.resSupplierCompanyName || "",
            supplier_business_number:
              inv.resSupplierCompanyIdentityNo || "",
          }),
      synced_at: new Date().toISOString(),
    }));

    if (formatted.length > 0) {
      await supabase
        .from("tax_invoices")
        .delete()
        .eq("user_id", userId)
        .eq("invoice_type", type)
        .gte("invoice_date", formatDateStr(startDate))
        .lte("invoice_date", formatDateStr(endDate));

      const { error } = await supabase
        .from("tax_invoices")
        .insert(formatted);
      if (!error) totalSaved += formatted.length;
      else console.error(`Insert ${type} error:`, error);
    }
  }

  // hometax_sync_status 업데이트
  await supabase.from("hometax_sync_status").upsert(
    {
      user_id: userId,
      sync_status: "completed",
      last_sync_at: new Date().toISOString(),
      sales_count: totalFetched,
      sync_error: null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );

  return { recordsFetched: totalFetched, recordsSaved: totalSaved };
}

/**
 * 카드 거래내역 동기화
 */
/**
 * 카드 목록 조회 → 카드번호 배열 반환
 * card-list API 실패 시 빈 배열 반환 (에러로 처리)
 */
async function fetchCardNumbers(
  accessToken: string,
  connectedId: string,
  organizationCode: string
): Promise<string[]> {
  const CODEF_API_URL = "https://api.codef.io";
  try {
    const resp = await fetch(`${CODEF_API_URL}/v1/kr/card/p/account/card-list`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        connectedId,
        organization: organizationCode,
        birthDate: "",
        inquiryType: "0",
      }),
    });

    const respText = await resp.text();
    console.log("[Card Sync] card-list response (first 300):", respText.substring(0, 300));
    
    let parsed: any;
    try {
      parsed = JSON.parse(respText);
    } catch {
      parsed = JSON.parse(decodeURIComponent(respText.replace(/\+/g, "%20")));
    }

    if (parsed.result?.code !== "CF-00000") {
      console.warn(`[Card Sync] card-list failed (${parsed.result?.code}), falling back to empty cardNo`);
      return [""];  // 빈 cardNo로 전체 승인내역 조회 시도
    }

    const cards = Array.isArray(parsed.data) ? parsed.data : [];
    const cardNos = cards
      .map((c: any) => c?.resCardNo ? String(c.resCardNo) : "")
      .filter((no: string) => no.length > 0);

    if (cardNos.length === 0) return [""];
    return Array.from(new Set(cardNos));
  } catch (err) {
    console.warn("[Card Sync] fetchCardNumbers error, falling back to empty cardNo:", err);
    return [""];  // 폴백: 빈 cardNo로 전체 조회
  }
}

async function syncCardTransactions(
  supabase: ReturnType<typeof createClient>,
  instance: any,
  _job: any,
  options: { forceFullSync: boolean }
): Promise<{ recordsFetched: number; recordsSaved: number }> {
  if (!instance.connected_id) {
    throw new Error("ConnectedId가 없습니다. 카드사를 먼저 등록해주세요.");
  }

  const CODEF_API_URL = "https://api.codef.io";
  const CODEF_TOKEN_URL = "https://oauth.codef.io/oauth/token";
  const clientId = Deno.env.get("CODEF_CLIENT_ID")!;
  const clientSecret = Deno.env.get("CODEF_CLIENT_SECRET")!;

  const credentials = btoa(`${clientId}:${clientSecret}`);
  const tokenRes = await fetch(CODEF_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${credentials}`,
    },
    body: "grant_type=client_credentials&scope=read",
  });
  if (!tokenRes.ok) throw new Error(`CODEF token failed: ${tokenRes.status}`);
  const { access_token: accessToken } = await tokenRes.json();

  // 동기화 기간
  const now = new Date();
  let startDate: string;
  if (instance.last_sync_at && !options.forceFullSync) {
    const lastSync = new Date(instance.last_sync_at);
    lastSync.setDate(lastSync.getDate() - 1);
    startDate = lastSync.toISOString().slice(0, 10).replace(/-/g, "");
  } else {
    const threeMonthsAgo = new Date(now);
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    startDate = threeMonthsAgo.toISOString().slice(0, 10).replace(/-/g, "");
  }
  const endDate = now.toISOString().slice(0, 10).replace(/-/g, "");

  // credentials_meta에서 카드사 기관코드 읽기
  const meta = instance.credentials_meta || {};
  const organizationCode = meta.organization_code || "";
  
  if (!organizationCode) {
    throw new Error("카드사 기관코드가 없습니다. 카드를 재연동해주세요.");
  }

  // 1단계: 카드 목록 조회 → 카드번호 확보
  const cardNos = await fetchCardNumbers(accessToken, instance.connected_id, organizationCode);
  console.log(`[Card Sync] Found ${cardNos.length} card(s):`, cardNos.map(n => n.slice(-4)));

  // 2단계: 각 카드번호별 승인 내역 조회
  let transactions: any[] = [];
  for (const cardNoValue of cardNos) {
    const requestBody = {
      connectedId: instance.connected_id,
      organization: organizationCode,
      startDate,
      endDate,
      orderBy: "0",
      inquiryType: "0",
      cardNo: cardNoValue,
      memberStoreInfoType: "0",
    };

    const res = await fetch(
      `${CODEF_API_URL}/v1/kr/card/p/account/approval-list`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(requestBody),
      }
    );

    const text = await res.text();
    console.log(`Card approval-list for card ***${cardNoValue.slice(-4)} (first 300):`, text.substring(0, 300));
    let data: any;
    try {
      data = JSON.parse(text);
    } catch {
      try {
        data = JSON.parse(decodeURIComponent(text.replace(/\+/g, "%20")));
      } catch {
        console.error(`Card ${cardNoValue.slice(-4)} response parse failed, skipping`);
        continue;
      }
    }

    if (data.result?.code !== "CF-00000") {
      console.warn(`Card ${cardNoValue.slice(-4)} approval-list failed: ${data.result?.message}`);
      continue;
    }

    const txs = Array.isArray(data.data) ? data.data : [];
    transactions = transactions.concat(txs);
  }
  const totalFetched = transactions.length;

  // transactions 테이블에 저장
  const formatted = transactions.map((tx: any) => {
    const memberStoreName = decodeField(tx.resMemberStoreName);
    const usedStoreName = decodeField(tx.resUsedStore);
    const fullStoreName =
      [memberStoreName, usedStoreName]
        .filter((value): value is string => Boolean(value))
        .sort((a, b) => b.length - a.length)[0] ||
      "카드 결제";

    return {
      user_id: instance.user_id,
      type: "expense",
      source_type: "card",
      description: fullStoreName,
      amount: parseInt(tx.resUsedAmount || "0", 10),
      transaction_date: formatDateStr(tx.resUsedDate),
      transaction_time: tx.resUsedTime || null,
      merchant_name: fullStoreName,
      source_name: decodeField(tx.resCardName) || null,
      source_account: tx.resCardNo || null,
      external_tx_id: tx.resApprovalNo || null,
      synced_at: new Date().toISOString(),
    };
  });

  let totalSaved = 0;
  if (formatted.length > 0) {
    // external_tx_id 기반 중복 제거 (upsert 불가하므로 기존 건 삭제 후 삽입)
    const externalIds = formatted
      .map((t: any) => t.external_tx_id)
      .filter(Boolean);
    if (externalIds.length > 0) {
      await supabase
        .from("transactions")
        .delete()
        .eq("user_id", instance.user_id)
        .eq("source_type", "card")
        .in("external_tx_id", externalIds);
    }

    const { error } = await supabase.from("transactions").insert(formatted);
    if (!error) totalSaved = formatted.length;
    else console.error("Card transaction insert error:", error);
  }

  return { recordsFetched: totalFetched, recordsSaved: totalSaved };
}

/**
 * 은행 거래내역 동기화
 */
async function syncBankTransactions(
  supabase: ReturnType<typeof createClient>,
  instance: any,
  _job: any,
  options: { forceFullSync: boolean }
): Promise<{ recordsFetched: number; recordsSaved: number }> {
  if (!instance.connected_id) {
    throw new Error("ConnectedId가 없습니다. 은행을 먼저 등록해주세요.");
  }

  const CODEF_API_URL = "https://api.codef.io";
  const CODEF_TOKEN_URL = "https://oauth.codef.io/oauth/token";
  const clientId = Deno.env.get("CODEF_CLIENT_ID")!;
  const clientSecret = Deno.env.get("CODEF_CLIENT_SECRET")!;

  const credentials = btoa(`${clientId}:${clientSecret}`);
  const tokenRes = await fetch(CODEF_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${credentials}`,
    },
    body: "grant_type=client_credentials&scope=read",
  });
  if (!tokenRes.ok) throw new Error(`CODEF token failed: ${tokenRes.status}`);
  const { access_token: accessToken } = await tokenRes.json();

  // 동기화 기간
  const now = new Date();
  let startDate: string;
  if (instance.last_sync_at && !options.forceFullSync) {
    const lastSync = new Date(instance.last_sync_at);
    lastSync.setDate(lastSync.getDate() - 1);
    startDate = lastSync.toISOString().slice(0, 10).replace(/-/g, "");
  } else {
    const threeMonthsAgo = new Date(now);
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    startDate = threeMonthsAgo.toISOString().slice(0, 10).replace(/-/g, "");
  }
  const endDate = now.toISOString().slice(0, 10).replace(/-/g, "");

  // 사용자의 연결된 계좌 목록 조회
  const { data: accounts } = await supabase
    .from("connected_accounts")
    .select("bank_code, account_number")
    .eq("user_id", instance.user_id)
    .eq("is_active", true);

  if (!accounts || accounts.length === 0) {
    // 계좌가 없으면 스킵
    return { recordsFetched: 0, recordsSaved: 0 };
  }

  let totalFetched = 0;
  let totalSaved = 0;

  for (const account of accounts) {
    const requestBody = {
      connectedId: instance.connected_id,
      organization: account.bank_code,
      account: account.account_number,
      startDate,
      endDate,
      orderBy: "0",
      inquiryType: "1", // 거래내역
    };

    try {
      const res = await fetch(
        `${CODEF_API_URL}/v1/kr/bank/p/account/transaction-list`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify(requestBody),
        }
      );

      const text = await res.text();
      let data: any;
      try {
        data = JSON.parse(text);
      } catch {
        try {
          data = JSON.parse(decodeURIComponent(text.replace(/\+/g, " ")));
        } catch {
          console.error(
            `Failed to parse bank tx for account ${account.account_number}`
          );
          continue;
        }
      }

      if (data.result?.code !== "CF-00000") continue;

      const txList = Array.isArray(data.data?.resTrHistoryList)
        ? data.data.resTrHistoryList
        : Array.isArray(data.data)
        ? data.data
        : [];

      totalFetched += txList.length;

      const formatted = txList.map((tx: any) => {
        const amount = parseInt(tx.resAccountTrAmount || "0", 10);
        const isDeposit = tx.resAccountIn && parseInt(tx.resAccountIn, 10) > 0;

        return {
          user_id: instance.user_id,
          type: isDeposit ? "income" : "expense",
          source_type: "bank",
          description: decodeField(tx.resAccountDesc) || "은행 거래",
          amount: isDeposit
            ? parseInt(tx.resAccountIn, 10)
            : parseInt(tx.resAccountOut || String(amount), 10),
          transaction_date: formatDateStr(tx.resAccountTrDate),
          transaction_time: tx.resAccountTrTime || null,
          source_name: decodeField(tx.resAccountDesc) || null,
          source_account: account.account_number,
          external_tx_id: tx.resTransactionNo || null,
          synced_at: new Date().toISOString(),
        };
      });

      if (formatted.length > 0) {
        // ━━━ 체크카드 중복 제거 ━━━
        // 같은 사용자의 카드 거래 중 동일 날짜+금액인 건을 찾아 은행 출금을 제외
        const expenseOnly = formatted.filter((t: any) => t.type === "expense");
        const uniqueDates = [...new Set(expenseOnly.map((t: any) => t.transaction_date))];

        let cardDupeKeys = new Set<string>();
        if (uniqueDates.length > 0 && expenseOnly.length > 0) {
          const { data: cardTxs } = await supabase
            .from("transactions")
            .select("transaction_date, amount")
            .eq("user_id", instance.user_id)
            .eq("source_type", "card")
            .in("transaction_date", uniqueDates);

          if (cardTxs && cardTxs.length > 0) {
            // 카드 거래별 날짜+금액 키 생성 (동일 금액 여러 건 허용을 위해 카운터 사용)
            const cardKeyCount = new Map<string, number>();
            for (const ct of cardTxs) {
              const key = `${ct.transaction_date}|${ct.amount}`;
              cardKeyCount.set(key, (cardKeyCount.get(key) || 0) + 1);
            }
            // 은행 출금 중 카드와 매칭되는 건 표시
            const usedCount = new Map<string, number>();
            for (const bt of formatted) {
              if (bt.type !== "expense") continue;
              const key = `${bt.transaction_date}|${bt.amount}`;
              const available = (cardKeyCount.get(key) || 0) - (usedCount.get(key) || 0);
              if (available > 0) {
                cardDupeKeys.add(bt.external_tx_id || `${key}|${Math.random()}`);
                usedCount.set(key, (usedCount.get(key) || 0) + 1);
              }
            }
            if (cardDupeKeys.size > 0) {
              console.log(`Filtered ${cardDupeKeys.size} duplicate bank withdrawals (debit card matches)`);
            }
          }
        }

        // 중복 제거된 목록
        const deduped = formatted.filter((t: any) => {
          if (t.type !== "expense") return true;
          return !cardDupeKeys.has(t.external_tx_id || "");
        });

        if (deduped.length > 0) {
          const externalIds = deduped
            .map((t: any) => t.external_tx_id)
            .filter(Boolean);
          if (externalIds.length > 0) {
            await supabase
              .from("transactions")
              .delete()
              .eq("user_id", instance.user_id)
              .eq("source_type", "bank")
              .in("external_tx_id", externalIds);
          }

          const { error } = await supabase.from("transactions").insert(deduped);
          if (!error) totalSaved += deduped.length;
          else console.error("Bank transaction insert error:", error);
        }
      }
    } catch (err) {
      console.error(
        `Failed to sync account ${account.account_number}:`,
        err
      );
    }
  }

  return { recordsFetched: totalFetched, recordsSaved: totalSaved };
}

// ─── 유틸리티 ────────────────────────────────────────

function formatDateStr(dateStr: string): string {
  if (!dateStr) return dateStr;
  const cleaned = dateStr.replace(/-/g, "");
  if (cleaned.length !== 8) return dateStr;
  return `${cleaned.slice(0, 4)}-${cleaned.slice(4, 6)}-${cleaned.slice(6, 8)}`;
}

function decodeField(value: string | undefined | null): string | null {
  if (!value) return null;
  try {
    return decodeURIComponent(value.replace(/\+/g, " "));
  } catch {
    return value;
  }
}

// ─── 쿠팡이츠 동기화 핸들러 ────────────────────────────

async function callHyphenCoupangeats(
  action: string,
  ceUserId: string,
  ceUserPw: string,
  extra: Record<string, unknown> = {}
): Promise<any> {
  const HYPHEN_USER_ID = Deno.env.get("HYPHEN_USER_ID");
  const HYPHEN_HKEY = Deno.env.get("HYPHEN_HKEY");
  if (!HYPHEN_USER_ID || !HYPHEN_HKEY) {
    throw new Error("HYPHEN_USER_ID 또는 HYPHEN_HKEY가 설정되지 않았습니다.");
  }

  const endpoints: Record<string, string> = {
    verify: "/in0024000079",
    sales: "/in0024000080",
    settlement: "/in0024000081",
    store_info: "/in0024000082",
    orders: "/in0024000086",
    my_store: "/in0024000955",
    pg_sales: "/in0024000150",
  };

  const endpoint = endpoints[action];
  if (!endpoint) throw new Error(`지원하지 않는 action: ${action}`);

  const response = await fetch(`${HYPHEN_API_URL}${endpoint}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "user-id": HYPHEN_USER_ID,
      Hkey: HYPHEN_HKEY,
    },
    body: JSON.stringify({ userId: ceUserId, userPw: ceUserPw, ...extra }),
  });

  if (!response.ok) {
    throw new Error(`Hyphen API 실패 [${response.status}]: ${await response.text()}`);
  }

  const data = await response.json();
  if (data.common?.errYn === "Y") {
    throw new Error(`Hyphen 오류 [${data.common.errCd}]: ${data.common.errMsg}`);
  }
  return data;
}

async function syncCoupangeats(
  supabase: ReturnType<typeof createClient>,
  instance: any,
  _job: any,
  options: { forceFullSync: boolean }
): Promise<{ recordsFetched: number; recordsSaved: number }> {
  // credentials_meta에서 쿠팡이츠 로그인 정보 가져오기
  const meta = instance.credentials_meta || {};
  const ceUserId = meta.ce_user_id as string;
  const ceUserPw = meta.ce_user_pw as string;

  if (!ceUserId || !ceUserPw) {
    throw new Error("쿠팡이츠 로그인 정보가 없습니다. 재연동이 필요합니다.");
  }

  const userId = instance.user_id;
  let totalFetched = 0;
  let totalSaved = 0;

  // 동기화 기간 결정
  const now = new Date();
  let startDate: string;
  if (instance.last_sync_at && !options.forceFullSync) {
    const lastSync = new Date(instance.last_sync_at);
    lastSync.setDate(lastSync.getDate() - 1);
    startDate = lastSync.toISOString().slice(0, 10).replace(/-/g, "");
  } else {
    const threeMonthsAgo = new Date(now);
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    startDate = threeMonthsAgo.toISOString().slice(0, 10).replace(/-/g, "");
  }
  const endDate = now.toISOString().slice(0, 10).replace(/-/g, "");

  // 1. 가게 정보 동기화
  try {
    const storeRes = await callHyphenCoupangeats("store_info", ceUserId, ceUserPw);
    const storeList = storeRes.data?.storeList || [];

    for (const store of storeList) {
      await supabase.from("delivery_stores").upsert(
        {
          user_id: userId,
          platform: "coupangeats",
          store_id: store.storeId || store.storeName,
          store_name: store.storeName || "",
          biz_no: store.bizNo || null,
          rep_name: store.repName || null,
          tel_no: store.telNo || null,
          addr: store.addr || null,
          addr_detail: store.addrDetail || null,
          store_notice: store.storeNotice || null,
          country_origin: store.countryOrigin || null,
          main_category: store.mainCategory || [],
          sub_category: store.subCategory || [],
          raw_data: store,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,platform,store_id" }
      );
    }
  } catch (e) {
    console.error("가게 정보 동기화 실패:", e);
  }

  // 2. 매출(주문) 데이터 동기화
  try {
    const salesRes = await callHyphenCoupangeats("sales", ceUserId, ceUserPw, {
      dateFrom: startDate,
      dateTo: endDate,
      detailListYn: "Y",
    });

    const orderList = salesRes.data?.touchOrderList || [];
    totalFetched += orderList.length;

    for (const order of orderList) {
      const { error } = await supabase.from("delivery_orders").upsert(
        {
          user_id: userId,
          platform: "coupangeats",
          store_id: order.storeId || null,
          order_no: order.orderNo,
          order_div: order.orderDiv || null,
          order_dt: order.orderDt || null,
          order_tm: order.orderTm || null,
          settle_dt: order.settleDt || null,
          order_name: order.orderName || null,
          delivery_type: order.deliveryType || null,
          total_amt: parseInt(order.totalAmt || "0", 10),
          discnt_amt: parseInt(order.discntAmt || "0", 10),
          order_fee: parseInt(order.orderFee || "0", 10),
          card_fee: parseInt(order.cardFee || "0", 10),
          delivery_amt: parseInt(order.deliveryAmt || "0", 10),
          add_tax: parseInt(order.addTax || "0", 10),
          ad_fee: parseInt(order.adFee || "0", 10),
          mfd_discount_amount: parseInt(order.mfdDiscountAmount || "0", 10),
          settle_amt: parseInt(order.settleAmt || "0", 10),
          detail_list: order.detailList || [],
          raw_data: order,
          synced_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,platform,order_no" }
      );
      if (!error) totalSaved++;
    }

    // 매출을 transactions 테이블에도 반영 (source_type: delivery)
    for (const order of orderList) {
      if (!order.orderNo || !order.orderDt) continue;
      const txDate = formatDateStr(order.orderDt);
      const totalAmt = parseInt(order.totalAmt || "0", 10);
      const syncedAt = new Date().toISOString();
      const txTime = order.orderTm
        ? `${order.orderTm.slice(0, 2)}:${order.orderTm.slice(2, 4)}:00`
        : null;

      // 매출(총 주문금액) - income
      await supabase.from("transactions").upsert(
        {
          user_id: userId,
          source_type: "delivery",
          source_name: "쿠팡이츠",
          external_tx_id: `ce_${order.orderNo}`,
          transaction_date: txDate,
          transaction_time: txTime,
          amount: totalAmt,
          type: "income",
          description: `쿠팡이츠 주문 ${order.orderName || order.orderNo}`,
          category: "배달매출",
          category_icon: "🛵",
          merchant_name: "쿠팡이츠",
          synced_at: syncedAt,
        },
        { onConflict: "user_id,external_tx_id" }
      );

      // 수수료 분리 저장 - expense
      const feeItems = [
        { key: "orderFee", label: "주문중개수수료", icon: "📋", category: "지급수수료" },
        { key: "cardFee", label: "카드결제수수료", icon: "💳", category: "지급수수료" },
        { key: "adFee", label: "광고비", icon: "📢", category: "광고선전비" },
        { key: "deliveryAmt", label: "배달대행료", icon: "🏍️", category: "운반비" },
      ];

      for (const fee of feeItems) {
        const feeAmt = parseInt(order[fee.key] || "0", 10);
        if (feeAmt <= 0) continue;

        await supabase.from("transactions").upsert(
          {
            user_id: userId,
            source_type: "delivery",
            source_name: "쿠팡이츠",
            external_tx_id: `ce_${order.orderNo}_${fee.key}`,
            transaction_date: txDate,
            transaction_time: txTime,
            amount: feeAmt,
            type: "expense",
            description: `쿠팡이츠 ${fee.label} (${order.orderName || order.orderNo})`,
            category: fee.category,
            category_icon: fee.icon,
            merchant_name: "쿠팡이츠",
            synced_at: syncedAt,
          },
          { onConflict: "user_id,external_tx_id" }
        );
      }
    }
  } catch (e) {
    console.error("매출 동기화 실패:", e);
  }

  // 3. 정산 내역 동기화
  try {
    const settleRes = await callHyphenCoupangeats("settlement", ceUserId, ceUserPw, {
      dateFrom: startDate,
      dateTo: endDate,
      allTransYn: "Y",
    });

    const calList = settleRes.data?.calList || [];

    for (const cal of calList) {
      const settlementList = cal.settlementList || [];
      const details = settlementList.length > 0 ? settlementList[0].details || {} : {};

      await supabase.from("delivery_settlements").upsert(
        {
          user_id: userId,
          platform: "coupangeats",
          store_id: cal.storeId || null,
          biz_no: cal.bizNo || null,
          cal_date: cal.calDate,
          settlement_amt: parseInt(cal.settlementAmt || "0", 10),
          balance: parseInt(cal.balance || "0", 10),
          settlement_details: details,
          raw_data: cal,
          synced_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,platform,store_id,cal_date" }
      );
    }
  } catch (e) {
    console.error("정산 동기화 실패:", e);
  }

  return { recordsFetched: totalFetched, recordsSaved: totalSaved };
}

// ─── 배달의민족 동기화 핸들러 ────────────────────────────

async function callHyphenBaemin(
  action: string,
  bmUserId: string,
  bmUserPw: string,
  extra: Record<string, unknown> = {}
): Promise<any> {
  const HYPHEN_USER_ID = Deno.env.get("HYPHEN_USER_ID");
  const HYPHEN_HKEY = Deno.env.get("HYPHEN_HKEY");
  if (!HYPHEN_USER_ID || !HYPHEN_HKEY) {
    throw new Error("HYPHEN_USER_ID 또는 HYPHEN_HKEY가 설정되지 않았습니다.");
  }

  const endpoints: Record<string, string> = {
    verify: "/in0022000062",
    sales: "/in0022000063",
    settlement: "/in0022000064",
    statistics: "/in0022000065",
    reviews: "/in0022000066",
    store_info: "/in0022000067",
    orders: "/in0022000083",
    account_info: "/in0022000668",
    ad_management: "/in0022000952",
    my_store: "/in0022000953",
    store_now: "/in0022000972",
    nearby_sales: "/in0022000973",
    menu: "/in0022000974",
    pg_sales: "/in0022000140",
  };

  const endpoint = endpoints[action];
  if (!endpoint) throw new Error(`지원하지 않는 action: ${action}`);

  const response = await fetch(`${HYPHEN_API_URL}${endpoint}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "user-id": HYPHEN_USER_ID,
      Hkey: HYPHEN_HKEY,
    },
    body: JSON.stringify({ userId: bmUserId, userPw: bmUserPw, ...extra }),
  });

  if (!response.ok) {
    throw new Error(`Hyphen API 실패 [${response.status}]: ${await response.text()}`);
  }

  const data = await response.json();
  if (data.common?.errYn === "Y") {
    throw new Error(`Hyphen 오류 [${data.common.errCd}]: ${data.common.errMsg}`);
  }
  return data;
}

async function syncBaemin(
  supabase: ReturnType<typeof createClient>,
  instance: any,
  _job: any,
  options: { forceFullSync: boolean }
): Promise<{ recordsFetched: number; recordsSaved: number }> {
  const meta = instance.credentials_meta || {};
  const bmUserId = meta.bm_user_id as string;
  const bmUserPw = meta.bm_user_pw as string;

  if (!bmUserId || !bmUserPw) {
    throw new Error("배달의민족 로그인 정보가 없습니다. 재연동이 필요합니다.");
  }

  const userId = instance.user_id;
  let totalFetched = 0;
  let totalSaved = 0;

  const now = new Date();
  let startDate: string;
  // forceFullSync이면 항상 최근 1개월 전체, 아니면 델타
  if (instance.last_sync_at && !options.forceFullSync) {
    const lastSync = new Date(instance.last_sync_at);
    lastSync.setDate(lastSync.getDate() - 1);
    startDate = lastSync.toISOString().slice(0, 10).replace(/-/g, "");
  } else {
    const oneMonthAgo = new Date(now);
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    startDate = oneMonthAgo.toISOString().slice(0, 10).replace(/-/g, "");
  }
  const endDate = now.toISOString().slice(0, 10).replace(/-/g, "");

  // 1. 가게 정보 동기화
  try {
    const storeRes = await callHyphenBaemin("store_info", bmUserId, bmUserPw);
    const storeList = storeRes.data?.storeList || [];

    for (const store of storeList) {
      await supabase.from("delivery_stores").upsert(
        {
          user_id: userId,
          platform: "baemin",
          store_id: store.storeId || store.storeName,
          store_name: store.storeName || "",
          biz_no: store.bizNo || null,
          tel_no: store.telNo || null,
          addr: store.addr || null,
          raw_data: store,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,platform,store_id" }
      );
    }
  } catch (e) {
    console.error("배민 가게 정보 동기화 실패:", e);
  }

  // 2. 매출(주문) 데이터 동기화
  try {
    const salesRes = await callHyphenBaemin("sales", bmUserId, bmUserPw, {
      dateFrom: startDate,
      dateTo: endDate,
      detailListYn: "Y",
    });

    console.log(`[baemin] Full salesRes keys:`, Object.keys(salesRes || {}));
    console.log(`[baemin] salesRes.data keys:`, Object.keys(salesRes.data || {}));
    console.log(`[baemin] salesRes.data.data keys:`, Object.keys(salesRes.data?.data || {}));
    console.log(`[baemin] salesRes snippet:`, JSON.stringify(salesRes).substring(0, 500));
    console.log(`[baemin] Sales date range: ${startDate} ~ ${endDate}`);
    
    // Hyphen 응답 구조 탐색: salesRes 자체 또는 salesRes.data.data
    const orderList = 
      salesRes.data?.data?.touchOrderList ||
      salesRes.data?.touchOrderList ||
      salesRes.touchOrderList ||
      [];
    console.log(`[baemin] orderList length:`, orderList.length);
    totalFetched += orderList.length;

    for (const order of orderList) {
      const { error } = await supabase.from("delivery_orders").upsert(
        {
          user_id: userId,
          platform: "baemin",
          store_id: order.storeId || null,
          order_no: order.orderNo,
          order_div: order.orderDiv || null,
          order_dt: order.orderDt || null,
          order_tm: order.orderTm || null,
          settle_dt: order.settleDt || null,
          order_name: order.orderName || null,
          delivery_type: order.deliveryType || null,
          total_amt: parseInt(order.orderAmt || order.salesAmt || "0", 10),
          discnt_amt: parseInt(order.discntAmt || "0", 10),
          order_fee: parseInt(order.orderFee || "0", 10),
          card_fee: parseInt(order.cardFee || "0", 10),
          delivery_amt: parseInt(order.deliveryAmt || "0", 10),
          add_tax: parseInt(order.addTax || "0", 10),
          settle_amt: parseInt(order.settleAmt || "0", 10),
          detail_list: order.detailList || [],
          raw_data: order,
          synced_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,platform,order_no" }
      );
      if (!error) totalSaved++;
    }

    // transactions 테이블에도 반영
    for (const order of orderList) {
      if (!order.orderNo || !order.orderDt) continue;
      const txDate = formatDateStr(order.orderDt);
      const totalAmt = parseInt(order.orderAmt || order.salesAmt || "0", 10);
      const syncedAt = new Date().toISOString();
      const txTime = order.orderTm
        ? `${order.orderTm.slice(0, 2)}:${order.orderTm.slice(2, 4)}:00`
        : null;

      // 매출(총 주문금액) - income
      await supabase.from("transactions").upsert(
        {
          user_id: userId,
          source_type: "delivery",
          source_name: "배달의민족",
          external_tx_id: `bm_${order.orderNo}`,
          transaction_date: txDate,
          transaction_time: txTime,
          amount: totalAmt,
          type: "income",
          description: `배달의민족 주문 ${order.orderName || order.orderNo}`,
          category: "배달매출",
          category_icon: "🛵",
          merchant_name: "배달의민족",
          synced_at: syncedAt,
        },
        { onConflict: "user_id,external_tx_id" }
      );

      // 수수료 분리 저장 - expense
      const feeItems = [
        { key: "orderFee", label: "주문중개수수료", icon: "📋", category: "지급수수료" },
        { key: "cardFee", label: "카드결제수수료", icon: "💳", category: "지급수수료" },
        { key: "adFee", label: "광고비", icon: "📢", category: "광고선전비" },
        { key: "deliveryAmt", label: "배달대행료", icon: "🏍️", category: "운반비" },
      ];

      for (const fee of feeItems) {
        const feeAmt = parseInt(order[fee.key] || "0", 10);
        if (feeAmt <= 0) continue;

        await supabase.from("transactions").upsert(
          {
            user_id: userId,
            source_type: "delivery",
            source_name: "배달의민족",
            external_tx_id: `bm_${order.orderNo}_${fee.key}`,
            transaction_date: txDate,
            transaction_time: txTime,
            amount: feeAmt,
            type: "expense",
            description: `배달의민족 ${fee.label} (${order.orderName || order.orderNo})`,
            category: fee.category,
            category_icon: fee.icon,
            merchant_name: "배달의민족",
            synced_at: syncedAt,
          },
          { onConflict: "user_id,external_tx_id" }
        );
      }
    }
  } catch (e) {
    console.error("배민 매출 동기화 실패:", e);
  }

  // 3. 정산 내역 동기화
  try {
    const settleRes = await callHyphenBaemin("settlement", bmUserId, bmUserPw, {
      dateFrom: startDate,
      dateTo: endDate,
    });

    const calList = settleRes.data?.calList || [];

    for (const cal of calList) {
      const typeDetails = cal.typeSettlementDetails || [];

      await supabase.from("delivery_settlements").upsert(
        {
          user_id: userId,
          platform: "baemin",
          store_id: cal.bizNo || null,
          biz_no: cal.bizNo || null,
          cal_date: cal.calDate,
          settlement_amt: parseInt(cal.getAmt || "0", 10),
          settlement_details: typeDetails.length > 0 ? typeDetails[0] : {},
          raw_data: cal,
          synced_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,platform,store_id,cal_date" }
      );
    }
  } catch (e) {
    console.error("배민 정산 동기화 실패:", e);
  }

  // 부가 데이터(통계, 리뷰, 주문상세, 계좌, 광고, 내가게, NOW, 인근매출, 메뉴, PG매출)는
  // 핵심 동기화 완료 후 별도 호출로 처리 (타임아웃 방지)
  // TODO: 2차 동기화 job으로 분리

  return { recordsFetched: totalFetched, recordsSaved: totalSaved };
}
