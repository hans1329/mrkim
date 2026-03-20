import { createClient } from "https://esm.sh/@supabase/supabase-js@2.93.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SIGNED_URL_EXPIRY = 7 * 24 * 60 * 60; // 7 days

interface AttachmentLink {
  label: string;
  url: string;
  description: string;
  fileCount: number;
}

function toCsvValue(val: unknown): string {
  const s = String(val ?? "");
  return s.includes(",") || s.includes('"') || s.includes("\n") ? `"${s.replace(/"/g, '""')}"` : s;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const token = req.headers.get("Authorization")?.replace("Bearer ", "");
    if (!token) throw new Error("인증이 필요합니다");

    const anonClient = createClient(supabaseUrl, anonKey);
    const { data: { user }, error: authErr } = await anonClient.auth.getUser(token);
    if (authErr || !user) throw new Error("인증에 실패했습니다");

    const supabase = createClient(supabaseUrl, serviceKey);
    const body = await req.json();
    const { consultationId, preview } = body;
    if (!consultationId && !preview) throw new Error("consultationId 또는 preview가 필요합니다");

    if (consultationId) {
      const { data: consultation, error: cErr } = await supabase
        .from("tax_consultations")
        .select("id, user_id")
        .eq("id", consultationId)
        .eq("user_id", user.id)
        .single();
      if (cErr || !consultation) throw new Error("상담 정보를 찾을 수 없습니다");
    }

    // Determine date range: last 3 months
    const now = new Date();
    const endDate = now.toISOString().split("T")[0];
    const startDate = new Date(now.getFullYear(), now.getMonth() - 3, 1).toISOString().split("T")[0];
    const periodLabel = `최근3개월`;
    const timestamp = Date.now();
    const folder = `${user.id}/${timestamp}`;

    const links: AttachmentLink[] = [];

    // Parallel data fetch
    const [txRes, invRes, delRes, empRes] = await Promise.all([
      supabase.from("transactions")
        .select("transaction_date, type, description, amount, category, merchant_name, source_type")
        .eq("user_id", user.id).gte("transaction_date", startDate).lte("transaction_date", endDate)
        .order("transaction_date", { ascending: true }).limit(1000),
      supabase.from("tax_invoices")
        .select("invoice_date, invoice_type, supplier_name, buyer_name, supply_amount, tax_amount, total_amount, item_name")
        .eq("user_id", user.id).gte("invoice_date", startDate).lte("invoice_date", endDate)
        .order("invoice_date", { ascending: true }),
      supabase.from("delivery_orders")
        .select("order_dt, order_tm, platform, order_name, total_amt, settle_amt, order_fee, delivery_amt")
        .eq("user_id", user.id).gte("order_dt", startDate.replace(/-/g, "")).lte("order_dt", endDate.replace(/-/g, ""))
        .order("order_dt", { ascending: true }),
      supabase.from("employees")
        .select("name, employee_type, status, monthly_salary, start_date, insurance_health, insurance_national_pension, insurance_employment, insurance_industrial")
        .eq("user_id", user.id).eq("status", "재직"),
    ]);

    // Upload each CSV in parallel
    const uploads: Promise<void>[] = [];

    if (txRes.data && txRes.data.length > 0) {
      uploads.push((async () => {
        const header = "거래일자,유형,설명,금액,카테고리,거래처,출처";
        const rows = txRes.data.map(tx =>
          [tx.transaction_date, tx.type === "income" ? "수입" : "지출", toCsvValue(tx.description), tx.amount, tx.category || "미분류", toCsvValue(tx.merchant_name), tx.source_type].join(",")
        );
        const csv = "\uFEFF" + [header, ...rows].join("\n");
        const path = `${folder}/거래내역_${periodLabel}.csv`;
        const { error } = await supabase.storage.from("tax-filing-packages").upload(path, new Blob([csv], { type: "text/csv;charset=utf-8" }), { contentType: "text/csv;charset=utf-8", upsert: true });
        if (!error) {
          const { data: signed } = await supabase.storage.from("tax-filing-packages").createSignedUrl(path, SIGNED_URL_EXPIRY);
          if (signed?.signedUrl) links.push({ label: "거래내역", url: signed.signedUrl, description: `${txRes.data.length}건 (${periodLabel})`, fileCount: txRes.data.length });
        }
      })());
    }

    if (invRes.data && invRes.data.length > 0) {
      uploads.push((async () => {
        const header = "발행일,유형,공급자,공급받는자,공급가액,세액,합계,품목";
        const rows = invRes.data.map(inv =>
          [inv.invoice_date, inv.invoice_type === "sales" ? "매출" : "매입", toCsvValue(inv.supplier_name), toCsvValue(inv.buyer_name), inv.supply_amount, inv.tax_amount, inv.total_amount, toCsvValue(inv.item_name)].join(",")
        );
        const csv = "\uFEFF" + [header, ...rows].join("\n");
        const path = `${folder}/세금계산서_${periodLabel}.csv`;
        const { error } = await supabase.storage.from("tax-filing-packages").upload(path, new Blob([csv], { type: "text/csv;charset=utf-8" }), { contentType: "text/csv;charset=utf-8", upsert: true });
        if (!error) {
          const { data: signed } = await supabase.storage.from("tax-filing-packages").createSignedUrl(path, SIGNED_URL_EXPIRY);
          if (signed?.signedUrl) links.push({ label: "세금계산서", url: signed.signedUrl, description: `${invRes.data.length}건 (${periodLabel})`, fileCount: invRes.data.length });
        }
      })());
    }

    if (delRes.data && delRes.data.length > 0) {
      uploads.push((async () => {
        const header = "주문일자,주문시간,플랫폼,주문명,총액,정산액,수수료,배달비";
        const rows = delRes.data.map(o =>
          [o.order_dt || "", o.order_tm || "", o.platform, toCsvValue(o.order_name), o.total_amt || 0, o.settle_amt || 0, o.order_fee || 0, o.delivery_amt || 0].join(",")
        );
        const csv = "\uFEFF" + [header, ...rows].join("\n");
        const path = `${folder}/배달주문내역_${periodLabel}.csv`;
        const { error } = await supabase.storage.from("tax-filing-packages").upload(path, new Blob([csv], { type: "text/csv;charset=utf-8" }), { contentType: "text/csv;charset=utf-8", upsert: true });
        if (!error) {
          const { data: signed } = await supabase.storage.from("tax-filing-packages").createSignedUrl(path, SIGNED_URL_EXPIRY);
          if (signed?.signedUrl) links.push({ label: "배달앱 주문내역", url: signed.signedUrl, description: `${delRes.data.length}건 (${periodLabel})`, fileCount: delRes.data.length });
        }
      })());
    }

    if (empRes.data && empRes.data.length > 0) {
      uploads.push((async () => {
        const header = "이름,고용형태,재직상태,월급여,입사일,건강보험,국민연금,고용보험,산재보험";
        const rows = empRes.data.map(e =>
          [e.name, e.employee_type, e.status, e.monthly_salary || 0, e.start_date || "", e.insurance_health ? "O" : "X", e.insurance_national_pension ? "O" : "X", e.insurance_employment ? "O" : "X", e.insurance_industrial ? "O" : "X"].join(",")
        );
        const csv = "\uFEFF" + [header, ...rows].join("\n");
        const path = `${folder}/직원현황.csv`;
        const { error } = await supabase.storage.from("tax-filing-packages").upload(path, new Blob([csv], { type: "text/csv;charset=utf-8" }), { contentType: "text/csv;charset=utf-8", upsert: true });
        if (!error) {
          const { data: signed } = await supabase.storage.from("tax-filing-packages").createSignedUrl(path, SIGNED_URL_EXPIRY);
          if (signed?.signedUrl) links.push({ label: "직원 현황", url: signed.signedUrl, description: `${empRes.data.length}명`, fileCount: empRes.data.length });
        }
      })());
    }

    await Promise.all(uploads);

    if (consultationId && links.length > 0) {
      await supabase.from("tax_consultations")
        .update({ data_package: { downloadLinks: links } })
        .eq("id", consultationId);
    }

    return new Response(
      JSON.stringify({ success: true, links, totalFiles: links.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("attach-consultation-data error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
