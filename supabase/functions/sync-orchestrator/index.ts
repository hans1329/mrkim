import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

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
    job: any
  ) => Promise<{ recordsFetched: number; recordsSaved: number }>
> = {
  codef_hometax_tax_invoice: syncHometaxInvoices,
  codef_card_usage: syncCardTransactions,
  codef_bank_account: syncBankTransactions,
};

// 기본 동기화 간격 (분)
const DEFAULT_SYNC_INTERVAL = 360; // 6시간

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  try {
    let targetInstanceId: string | null = null;

    // POST body에서 특정 인스턴스 ID 확인
    if (req.method === "POST") {
      try {
        const body = await req.json();
        targetInstanceId = body.instanceId || null;
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

      // sync_job 생성
      const { data: job, error: jobError } = await supabase
        .from("sync_jobs")
        .insert({
          instance_id: instance.id,
          user_id: instance.user_id,
          job_type: instance.last_sync_at ? "delta" : "full",
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

        const syncResult = await handler(supabase, instance, job);

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
  _job: any
): Promise<{ recordsFetched: number; recordsSaved: number }> {
  // 사용자 프로필에서 사업자번호 조회
  const { data: profile } = await supabase
    .from("profiles")
    .select("business_registration_number")
    .eq("user_id", instance.user_id)
    .single();

  if (!profile?.business_registration_number) {
    throw new Error("사업자등록번호가 설정되지 않았습니다.");
  }

  // 동기화 기간 결정 (델타: 마지막 동기화 이후, 풀: 최근 3개월)
  const now = new Date();
  let startDate: string;

  if (instance.last_sync_at) {
    // 마지막 동기화 1일 전부터 (겹침 허용으로 누락 방지)
    const lastSync = new Date(instance.last_sync_at);
    lastSync.setDate(lastSync.getDate() - 1);
    startDate = lastSync.toISOString().slice(0, 10).replace(/-/g, "");
  } else {
    const threeMonthsAgo = new Date(now);
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    startDate = threeMonthsAgo.toISOString().slice(0, 10).replace(/-/g, "");
  }
  const endDate = now.toISOString().slice(0, 10).replace(/-/g, "");

  // codef-tax-invoice Edge Function 호출 (service role로 내부 호출)
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

  // 해당 사용자의 JWT를 생성할 수 없으므로, service role key로 직접 호출
  // codef-tax-invoice는 authHeader로 사용자 인증을 확인하므로,
  // 오케스트레이터에서는 직접 CODEF API를 호출합니다.
  const codefResult = await callCodefTaxInvoice(
    supabase,
    instance.user_id,
    profile.business_registration_number,
    startDate,
    endDate
  );

  return codefResult;
}

/**
 * CODEF 세금계산서 직접 호출 (service role 컨텍스트)
 */
async function callCodefTaxInvoice(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  businessNumber: string,
  startDate: string,
  endDate: string
): Promise<{ recordsFetched: number; recordsSaved: number }> {
  const CODEF_API_URL = "https://api.codef.io";
  const CODEF_TOKEN_URL = "https://oauth.codef.io/oauth/token";

  const clientId = Deno.env.get("CODEF_CLIENT_ID")!;
  const clientSecret = Deno.env.get("CODEF_CLIENT_SECRET")!;

  // 토큰 발급
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
  const queryBody = {
    organization: "0004",
    loginType: "3",
    identity: cleanedNumber,
    startDate,
    endDate,
  };

  let totalFetched = 0;
  let totalSaved = 0;

  // 매출 + 매입 조회
  for (const type of ["sales", "purchase"] as const) {
    const path =
      type === "sales"
        ? "/v1/kr/public/nt/tax-invoice/sales"
        : "/v1/kr/public/nt/tax-invoice/purchase";

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
        console.error(`Failed to parse ${type} response`);
        continue;
      }
    }

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
      // 기간 내 기존 데이터 삭제 후 삽입
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
async function syncCardTransactions(
  supabase: ReturnType<typeof createClient>,
  instance: any,
  _job: any
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
  if (instance.last_sync_at) {
    const lastSync = new Date(instance.last_sync_at);
    lastSync.setDate(lastSync.getDate() - 1);
    startDate = lastSync.toISOString().slice(0, 10).replace(/-/g, "");
  } else {
    const threeMonthsAgo = new Date(now);
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    startDate = threeMonthsAgo.toISOString().slice(0, 10).replace(/-/g, "");
  }
  const endDate = now.toISOString().slice(0, 10).replace(/-/g, "");

  // 승인 내역 조회 (전체 카드)
  const requestBody = {
    connectedId: instance.connected_id,
    organization: "",
    startDate,
    endDate,
    orderBy: "0",
    inquiryType: "0",
    cardNo: "",
    memberStoreNo: "",
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
  let data: any;
  try {
    data = JSON.parse(text);
  } catch {
    try {
      data = JSON.parse(decodeURIComponent(text.replace(/\+/g, " ")));
    } catch {
      throw new Error("카드 거래내역 응답 파싱 실패");
    }
  }

  if (data.result?.code !== "CF-00000") {
    throw new Error(
      `카드 거래내역 조회 실패: ${data.result?.message || "Unknown"}`
    );
  }

  const transactions = Array.isArray(data.data) ? data.data : [];
  const totalFetched = transactions.length;

  // transactions 테이블에 저장
  const formatted = transactions.map((tx: any) => ({
    user_id: instance.user_id,
    type: "expense",
    source_type: "card",
    description:
      decodeField(tx.resMemberStoreName) ||
      decodeField(tx.resUsedStore) ||
      "카드 결제",
    amount: parseInt(tx.resUsedAmount || "0", 10),
    transaction_date: formatDateStr(tx.resUsedDate),
    transaction_time: tx.resUsedTime || null,
    merchant_name:
      decodeField(tx.resMemberStoreName) || decodeField(tx.resUsedStore) || null,
    source_name: decodeField(tx.resCardName) || null,
    source_account: tx.resCardNo || null,
    external_tx_id: tx.resApprovalNo || null,
    synced_at: new Date().toISOString(),
  }));

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
  _job: any
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
  if (instance.last_sync_at) {
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
        const externalIds = formatted
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

        const { error } = await supabase.from("transactions").insert(formatted);
        if (!error) totalSaved += formatted.length;
        else console.error("Bank transaction insert error:", error);
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
