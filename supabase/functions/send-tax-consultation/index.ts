import { createClient } from "https://esm.sh/@supabase/supabase-js@2.93.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface TaxDataPackage {
  business: {
    name: string;
    registrationNumber: string;
    type: string;
  };
  summary: {
    period: string;
    salesTotal: number;
    purchaseTotal: number;
    vatPayable: number;
    transactionCount: number;
  };
  taxInvoices: {
    salesCount: number;
    purchaseCount: number;
    salesAmount: number;
    purchaseAmount: number;
  };
  transactions: {
    incomeTotal: number;
    expenseTotal: number;
    byCategory: Record<string, number>;
  };
  delivery?: {
    platform: string;
    orderCount: number;
    totalAmount: number;
  }[];
  employees?: {
    totalCount: number;
    monthlySalaryTotal: number;
  };
  checklist?: {
    label: string;
    ready: boolean;
    autoSource: string | null;
    coverage: number | null;
  }[];
  downloadLinks?: { label: string; url: string; description: string }[];
}

function formatAmount(amount: number): string {
  return amount.toLocaleString("ko-KR");
}

// ====== CSV Generators ======

function generateTransactionsCsv(transactions: { transaction_date: string; type: string; description: string; amount: number; category: string | null; merchant_name: string | null; source_type: string }[]): string {
  const header = "거래일자,유형,설명,금액,카테고리,거래처,출처";
  const rows = transactions.map(tx =>
    [tx.transaction_date, tx.type === "income" ? "수입" : "지출", `"${(tx.description || "").replace(/"/g, '""')}"`, tx.amount, tx.category || "미분류", `"${(tx.merchant_name || "").replace(/"/g, '""')}"`, tx.source_type].join(",")
  );
  return "\uFEFF" + [header, ...rows].join("\n");
}

function generateInvoicesCsv(invoices: { invoice_date: string; invoice_type: string; supplier_name: string | null; buyer_name: string | null; supply_amount: number; tax_amount: number; total_amount: number; item_name: string | null }[]): string {
  const header = "발행일,유형,공급자,공급받는자,공급가액,세액,합계,품목";
  const rows = invoices.map(inv =>
    [inv.invoice_date, inv.invoice_type === "sales" ? "매출" : "매입", `"${(inv.supplier_name || "").replace(/"/g, '""')}"`, `"${(inv.buyer_name || "").replace(/"/g, '""')}"`, inv.supply_amount, inv.tax_amount, inv.total_amount, `"${(inv.item_name || "").replace(/"/g, '""')}"`].join(",")
  );
  return "\uFEFF" + [header, ...rows].join("\n");
}

function generateDeliveryOrdersCsv(orders: { order_dt: string | null; order_tm: string | null; platform: string; order_name: string | null; total_amt: number | null; settle_amt: number | null; order_fee: number | null; delivery_amt: number | null }[]): string {
  const header = "주문일자,주문시간,플랫폼,주문명,총액,정산액,수수료,배달비";
  const rows = orders.map(o =>
    [o.order_dt || "", o.order_tm || "", o.platform, `"${(o.order_name || "").replace(/"/g, '""')}"`, o.total_amt || 0, o.settle_amt || 0, o.order_fee || 0, o.delivery_amt || 0].join(",")
  );
  return "\uFEFF" + [header, ...rows].join("\n");
}

function generateEmployeesCsv(employees: { name: string; employee_type: string; status: string; monthly_salary: number | null; start_date: string | null; insurance_health: boolean | null; insurance_national_pension: boolean | null; insurance_employment: boolean | null; insurance_industrial: boolean | null }[]): string {
  const header = "이름,고용형태,재직상태,월급여,입사일,건강보험,국민연금,고용보험,산재보험";
  const rows = employees.map(e =>
    [e.name, e.employee_type, e.status, e.monthly_salary || 0, e.start_date || "", e.insurance_health ? "O" : "X", e.insurance_national_pension ? "O" : "X", e.insurance_employment ? "O" : "X", e.insurance_industrial ? "O" : "X"].join(",")
  );
  return "\uFEFF" + [header, ...rows].join("\n");
}

// ====== Upload CSVs and get signed URLs ======

async function uploadDataPackageFiles(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  startDate: string,
  endDate: string,
  periodLabel: string
): Promise<{ label: string; url: string; description: string }[]> {
  const timestamp = Date.now();
  const folder = `${userId}/${timestamp}`;
  const links: { label: string; url: string; description: string }[] = [];
  const SIGNED_URL_EXPIRY = 7 * 24 * 60 * 60; // 7 days

  // 1. Transactions CSV
  const { data: txData } = await supabase
    .from("transactions")
    .select("transaction_date, type, description, amount, category, merchant_name, source_type")
    .eq("user_id", userId)
    .gte("transaction_date", startDate)
    .lte("transaction_date", endDate)
    .order("transaction_date", { ascending: true });

  if (txData && txData.length > 0) {
    const csv = generateTransactionsCsv(txData);
    const path = `${folder}/거래내역_${periodLabel}.csv`;
    const { error } = await supabase.storage.from("tax-filing-packages").upload(path, new Blob([csv], { type: "text/csv;charset=utf-8" }), { contentType: "text/csv;charset=utf-8", upsert: true });
    if (!error) {
      const { data: signedData } = await supabase.storage.from("tax-filing-packages").createSignedUrl(path, SIGNED_URL_EXPIRY);
      if (signedData?.signedUrl) {
        links.push({ label: "거래내역", url: signedData.signedUrl, description: `${txData.length}건 (${periodLabel})` });
      }
    }
  }

  // 2. Tax Invoices CSV
  const { data: invData } = await supabase
    .from("tax_invoices")
    .select("invoice_date, invoice_type, supplier_name, buyer_name, supply_amount, tax_amount, total_amount, item_name")
    .eq("user_id", userId)
    .gte("invoice_date", startDate)
    .lte("invoice_date", endDate)
    .order("invoice_date", { ascending: true });

  if (invData && invData.length > 0) {
    const csv = generateInvoicesCsv(invData);
    const path = `${folder}/세금계산서_${periodLabel}.csv`;
    const { error } = await supabase.storage.from("tax-filing-packages").upload(path, new Blob([csv], { type: "text/csv;charset=utf-8" }), { contentType: "text/csv;charset=utf-8", upsert: true });
    if (!error) {
      const { data: signedData } = await supabase.storage.from("tax-filing-packages").createSignedUrl(path, SIGNED_URL_EXPIRY);
      if (signedData?.signedUrl) {
        links.push({ label: "세금계산서", url: signedData.signedUrl, description: `${invData.length}건 (${periodLabel})` });
      }
    }
  }

  // 3. Delivery Orders CSV
  const { data: delData } = await supabase
    .from("delivery_orders")
    .select("order_dt, order_tm, platform, order_name, total_amt, settle_amt, order_fee, delivery_amt")
    .eq("user_id", userId)
    .gte("order_dt", startDate.replace(/-/g, ""))
    .lte("order_dt", endDate.replace(/-/g, ""))
    .order("order_dt", { ascending: true });

  if (delData && delData.length > 0) {
    const csv = generateDeliveryOrdersCsv(delData);
    const path = `${folder}/배달주문내역_${periodLabel}.csv`;
    const { error } = await supabase.storage.from("tax-filing-packages").upload(path, new Blob([csv], { type: "text/csv;charset=utf-8" }), { contentType: "text/csv;charset=utf-8", upsert: true });
    if (!error) {
      const { data: signedData } = await supabase.storage.from("tax-filing-packages").createSignedUrl(path, SIGNED_URL_EXPIRY);
      if (signedData?.signedUrl) {
        links.push({ label: "배달앱 주문내역", url: signedData.signedUrl, description: `${delData.length}건 (${periodLabel})` });
      }
    }
  }

  // 4. Employees CSV
  const { data: empData } = await supabase
    .from("employees")
    .select("name, employee_type, status, monthly_salary, start_date, insurance_health, insurance_national_pension, insurance_employment, insurance_industrial")
    .eq("user_id", userId)
    .eq("status", "재직");

  if (empData && empData.length > 0) {
    const csv = generateEmployeesCsv(empData);
    const path = `${folder}/직원현황.csv`;
    const { error } = await supabase.storage.from("tax-filing-packages").upload(path, new Blob([csv], { type: "text/csv;charset=utf-8" }), { contentType: "text/csv;charset=utf-8", upsert: true });
    if (!error) {
      const { data: signedData } = await supabase.storage.from("tax-filing-packages").createSignedUrl(path, SIGNED_URL_EXPIRY);
      if (signedData?.signedUrl) {
        links.push({ label: "직원 현황", url: signedData.signedUrl, description: `${empData.length}명` });
      }
    }
  }

  return links;
}

// ====== Email HTML builders ======

function buildDownloadLinksHtml(links: { label: string; url: string; description: string }[]): string {
  if (!links || links.length === 0) return "";
  const rows = links.map(link => `
    <tr>
      <td style="padding:10px 12px;border-bottom:1px solid #eee;">
        <a href="${link.url}" style="color:#2563eb;text-decoration:none;font-weight:600;font-size:14px;">📥 ${link.label}</a>
        <div style="color:#94a3b8;font-size:12px;margin-top:2px;">${link.description}</div>
      </td>
    </tr>
  `).join("");

  return `
    <h2 style="font-size:16px;margin:24px 0 12px;">📎 상세 데이터 다운로드</h2>
    <div style="background:#f0f9ff;padding:12px;border-radius:8px;margin-bottom:8px;">
      <p style="margin:0;font-size:12px;color:#1e40af;">⏰ 다운로드 링크는 7일간 유효합니다. 기한 내에 다운로드해 주세요.</p>
    </div>
    <table style="width:100%;border-collapse:collapse;margin-bottom:20px;border:1px solid #e5e7eb;border-radius:8px;">
      ${rows}
    </table>
  `;
}

function buildFilingEmailHtml(
  businessName: string,
  filingType: string,
  taxPeriod: string,
  deadline: string,
  dataPackage: TaxDataPackage
): string {
  const categoryRows = Object.entries(dataPackage.transactions?.byCategory || {})
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([cat, amt]) => `<tr><td style="padding:6px 12px;border-bottom:1px solid #eee;">${cat}</td><td style="padding:6px 12px;border-bottom:1px solid #eee;text-align:right;">₩${formatAmount(amt)}</td></tr>`)
    .join("");

  const deliveryRows = (dataPackage.delivery || [])
    .map((d) => `<tr><td style="padding:6px 12px;border-bottom:1px solid #eee;">${d.platform}</td><td style="padding:6px 12px;border-bottom:1px solid #eee;text-align:right;">${d.orderCount}건</td><td style="padding:6px 12px;border-bottom:1px solid #eee;text-align:right;">₩${formatAmount(d.totalAmount)}</td></tr>`)
    .join("");

  const checklistRows = (dataPackage.checklist || [])
    .map((item) => {
      const icon = item.ready ? "✅" : "⬜";
      const autoTag = item.autoSource ? `<span style="color:#2563eb;font-size:11px;"> (${item.autoSource} ${item.coverage || ""}%)</span>` : `<span style="color:#94a3b8;font-size:11px;"> (직접 준비)</span>`;
      return `<tr><td style="padding:8px 12px;border-bottom:1px solid #eee;">${icon} ${item.label}${autoTag}</td></tr>`;
    })
    .join("");

  const downloadSection = buildDownloadLinksHtml(dataPackage.downloadLinks || []);

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:'Apple SD Gothic Neo','Malgun Gothic',sans-serif;max-width:640px;margin:0 auto;padding:20px;color:#333;">
  <div style="background:linear-gradient(135deg,#1e40af,#2563eb);color:#fff;padding:24px;border-radius:12px 12px 0 0;">
    <h1 style="margin:0;font-size:20px;">📋 ${filingType} 자료</h1>
    <p style="margin:8px 0 0;opacity:0.9;font-size:14px;">${businessName} | ${taxPeriod}</p>
    <p style="margin:4px 0 0;opacity:0.8;font-size:12px;">마감일: ${deadline}</p>
  </div>
  
  <div style="border:1px solid #e5e7eb;border-top:none;padding:24px;border-radius:0 0 12px 12px;">
    
    <h2 style="font-size:16px;margin:0 0 12px;">📊 사업 정보</h2>
    <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
      <tr><td style="padding:6px 12px;border-bottom:1px solid #eee;color:#64748b;">사업자명</td><td style="padding:6px 12px;border-bottom:1px solid #eee;">${dataPackage.business?.name || "-"}</td></tr>
      <tr><td style="padding:6px 12px;border-bottom:1px solid #eee;color:#64748b;">사업자번호</td><td style="padding:6px 12px;border-bottom:1px solid #eee;">${dataPackage.business?.registrationNumber || "-"}</td></tr>
      <tr><td style="padding:6px 12px;border-bottom:1px solid #eee;color:#64748b;">업종</td><td style="padding:6px 12px;border-bottom:1px solid #eee;">${dataPackage.business?.type || "-"}</td></tr>
    </table>

    ${checklistRows ? `
    <h2 style="font-size:16px;margin:0 0 12px;">✅ 준비 서류 현황</h2>
    <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
      ${checklistRows}
    </table>
    ` : ""}

    ${downloadSection}

    <h2 style="font-size:16px;margin:0 0 12px;">💰 매출/매입 요약 (${dataPackage.summary?.period || "해당 기간"})</h2>
    <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
      <tr><td style="padding:6px 12px;border-bottom:1px solid #eee;color:#64748b;">매출 합계</td><td style="padding:6px 12px;border-bottom:1px solid #eee;text-align:right;color:#16a34a;font-weight:600;">₩${formatAmount(dataPackage.summary?.salesTotal || 0)}</td></tr>
      <tr><td style="padding:6px 12px;border-bottom:1px solid #eee;color:#64748b;">매입 합계</td><td style="padding:6px 12px;border-bottom:1px solid #eee;text-align:right;color:#dc2626;font-weight:600;">₩${formatAmount(dataPackage.summary?.purchaseTotal || 0)}</td></tr>
      <tr><td style="padding:6px 12px;border-bottom:1px solid #eee;color:#64748b;">예상 부가세</td><td style="padding:6px 12px;border-bottom:1px solid #eee;text-align:right;font-weight:600;">₩${formatAmount(dataPackage.summary?.vatPayable || 0)}</td></tr>
      <tr><td style="padding:6px 12px;border-bottom:1px solid #eee;color:#64748b;">거래 건수</td><td style="padding:6px 12px;border-bottom:1px solid #eee;text-align:right;">${dataPackage.summary?.transactionCount || 0}건</td></tr>
    </table>

    <h2 style="font-size:16px;margin:0 0 12px;">🧾 세금계산서</h2>
    <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
      <tr><td style="padding:6px 12px;border-bottom:1px solid #eee;color:#64748b;">매출 세금계산서</td><td style="padding:6px 12px;border-bottom:1px solid #eee;text-align:right;">${dataPackage.taxInvoices?.salesCount || 0}건 / ₩${formatAmount(dataPackage.taxInvoices?.salesAmount || 0)}</td></tr>
      <tr><td style="padding:6px 12px;border-bottom:1px solid #eee;color:#64748b;">매입 세금계산서</td><td style="padding:6px 12px;border-bottom:1px solid #eee;text-align:right;">${dataPackage.taxInvoices?.purchaseCount || 0}건 / ₩${formatAmount(dataPackage.taxInvoices?.purchaseAmount || 0)}</td></tr>
    </table>

    ${categoryRows ? `
    <h2 style="font-size:16px;margin:0 0 12px;">📁 지출 카테고리별</h2>
    <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
      ${categoryRows}
    </table>
    ` : ""}

    ${deliveryRows ? `
    <h2 style="font-size:16px;margin:0 0 12px;">🛵 배달앱 매출</h2>
    <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
      <tr style="background:#f8fafc;"><th style="padding:6px 12px;text-align:left;font-size:13px;">플랫폼</th><th style="padding:6px 12px;text-align:right;font-size:13px;">주문수</th><th style="padding:6px 12px;text-align:right;font-size:13px;">매출</th></tr>
      ${deliveryRows}
    </table>
    ` : ""}

    ${dataPackage.employees ? `
    <h2 style="font-size:16px;margin:0 0 12px;">👥 직원 현황</h2>
    <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
      <tr><td style="padding:6px 12px;border-bottom:1px solid #eee;color:#64748b;">총 직원 수</td><td style="padding:6px 12px;border-bottom:1px solid #eee;text-align:right;">${dataPackage.employees.totalCount}명</td></tr>
      <tr><td style="padding:6px 12px;border-bottom:1px solid #eee;color:#64748b;">월 급여 합계</td><td style="padding:6px 12px;border-bottom:1px solid #eee;text-align:right;">₩${formatAmount(dataPackage.employees.monthlySalaryTotal)}</td></tr>
    </table>
    ` : ""}

    <div style="margin-top:24px;padding:16px;background:#eff6ff;border-radius:8px;border-left:4px solid #2563eb;">
      <p style="margin:0;font-size:13px;color:#1e40af;">⚡ 위 자료는 김비서가 연동된 데이터에서 자동 수집한 내용입니다. 추가 보강이 필요한 서류는 사장님께 별도 안내하고 있습니다.</p>
    </div>

    <div style="margin-top:12px;padding:16px;background:#fef3c7;border-radius:8px;">
      <p style="margin:0;font-size:13px;color:#92400e;">이 이메일은 김비서 AI에서 자동 발송되었습니다. 상담이 필요하시면 사장님에게 직접 연락해 주세요.</p>
    </div>
  </div>
</body>
</html>`;
}

function buildConsultationEmailHtml(
  businessName: string,
  subject: string,
  question: string,
  aiAnswer: string | null,
  dataPackage: TaxDataPackage
): string {
  const categoryRows = Object.entries(dataPackage.transactions?.byCategory || {})
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([cat, amt]) => `<tr><td style="padding:6px 12px;border-bottom:1px solid #eee;">${cat}</td><td style="padding:6px 12px;border-bottom:1px solid #eee;text-align:right;">₩${formatAmount(amt)}</td></tr>`)
    .join("");

  const deliveryRows = (dataPackage.delivery || [])
    .map((d) => `<tr><td style="padding:6px 12px;border-bottom:1px solid #eee;">${d.platform}</td><td style="padding:6px 12px;border-bottom:1px solid #eee;text-align:right;">${d.orderCount}건</td><td style="padding:6px 12px;border-bottom:1px solid #eee;text-align:right;">₩${formatAmount(d.totalAmount)}</td></tr>`)
    .join("");

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:'Apple SD Gothic Neo','Malgun Gothic',sans-serif;max-width:640px;margin:0 auto;padding:20px;color:#333;">
  <div style="background:#2563eb;color:#fff;padding:24px;border-radius:12px 12px 0 0;">
    <h1 style="margin:0;font-size:20px;">📋 세무 상담 요청</h1>
    <p style="margin:8px 0 0;opacity:0.9;font-size:14px;">${businessName} 사장님</p>
  </div>
  
  <div style="border:1px solid #e5e7eb;border-top:none;padding:24px;border-radius:0 0 12px 12px;">
    <h2 style="font-size:16px;margin:0 0 12px;">💬 질문</h2>
    <div style="background:#f8fafc;padding:16px;border-radius:8px;margin-bottom:20px;">
      <p style="font-weight:600;margin:0 0 8px;">${subject}</p>
      <p style="margin:0;color:#64748b;">${question}</p>
    </div>

    ${aiAnswer ? `
    <h2 style="font-size:16px;margin:0 0 12px;">🤖 AI 사전 분석</h2>
    <div style="background:#eff6ff;padding:16px;border-radius:8px;margin-bottom:20px;border-left:4px solid #2563eb;">
      <p style="margin:0;color:#1e40af;font-size:14px;">${aiAnswer}</p>
    </div>
    ` : ""}

    <h2 style="font-size:16px;margin:0 0 12px;">📊 사업 정보</h2>
    <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
      <tr><td style="padding:6px 12px;border-bottom:1px solid #eee;color:#64748b;">사업자명</td><td style="padding:6px 12px;border-bottom:1px solid #eee;">${dataPackage.business?.name || "-"}</td></tr>
      <tr><td style="padding:6px 12px;border-bottom:1px solid #eee;color:#64748b;">사업자번호</td><td style="padding:6px 12px;border-bottom:1px solid #eee;">${dataPackage.business?.registrationNumber || "-"}</td></tr>
      <tr><td style="padding:6px 12px;border-bottom:1px solid #eee;color:#64748b;">업종</td><td style="padding:6px 12px;border-bottom:1px solid #eee;">${dataPackage.business?.type || "-"}</td></tr>
    </table>

    <h2 style="font-size:16px;margin:0 0 12px;">💰 매출/매입 요약 (${dataPackage.summary?.period || "당월"})</h2>
    <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
      <tr><td style="padding:6px 12px;border-bottom:1px solid #eee;color:#64748b;">매출 합계</td><td style="padding:6px 12px;border-bottom:1px solid #eee;text-align:right;color:#16a34a;font-weight:600;">₩${formatAmount(dataPackage.summary?.salesTotal || 0)}</td></tr>
      <tr><td style="padding:6px 12px;border-bottom:1px solid #eee;color:#64748b;">매입 합계</td><td style="padding:6px 12px;border-bottom:1px solid #eee;text-align:right;color:#dc2626;font-weight:600;">₩${formatAmount(dataPackage.summary?.purchaseTotal || 0)}</td></tr>
      <tr><td style="padding:6px 12px;border-bottom:1px solid #eee;color:#64748b;">예상 부가세</td><td style="padding:6px 12px;border-bottom:1px solid #eee;text-align:right;font-weight:600;">₩${formatAmount(dataPackage.summary?.vatPayable || 0)}</td></tr>
      <tr><td style="padding:6px 12px;border-bottom:1px solid #eee;color:#64748b;">거래 건수</td><td style="padding:6px 12px;border-bottom:1px solid #eee;text-align:right;">${dataPackage.summary?.transactionCount || 0}건</td></tr>
    </table>

    <h2 style="font-size:16px;margin:0 0 12px;">🧾 세금계산서</h2>
    <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
      <tr><td style="padding:6px 12px;border-bottom:1px solid #eee;color:#64748b;">매출 세금계산서</td><td style="padding:6px 12px;border-bottom:1px solid #eee;text-align:right;">${dataPackage.taxInvoices?.salesCount || 0}건 / ₩${formatAmount(dataPackage.taxInvoices?.salesAmount || 0)}</td></tr>
      <tr><td style="padding:6px 12px;border-bottom:1px solid #eee;color:#64748b;">매입 세금계산서</td><td style="padding:6px 12px;border-bottom:1px solid #eee;text-align:right;">${dataPackage.taxInvoices?.purchaseCount || 0}건 / ₩${formatAmount(dataPackage.taxInvoices?.purchaseAmount || 0)}</td></tr>
    </table>

    ${categoryRows ? `
    <h2 style="font-size:16px;margin:0 0 12px;">📁 지출 카테고리별</h2>
    <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
      ${categoryRows}
    </table>
    ` : ""}

    ${deliveryRows ? `
    <h2 style="font-size:16px;margin:0 0 12px;">🛵 배달앱 매출</h2>
    <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
      <tr style="background:#f8fafc;"><th style="padding:6px 12px;text-align:left;font-size:13px;">플랫폼</th><th style="padding:6px 12px;text-align:right;font-size:13px;">주문수</th><th style="padding:6px 12px;text-align:right;font-size:13px;">매출</th></tr>
      ${deliveryRows}
    </table>
    ` : ""}

    ${dataPackage.employees ? `
    <h2 style="font-size:16px;margin:0 0 12px;">👥 직원 현황</h2>
    <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
      <tr><td style="padding:6px 12px;border-bottom:1px solid #eee;color:#64748b;">총 직원 수</td><td style="padding:6px 12px;border-bottom:1px solid #eee;text-align:right;">${dataPackage.employees.totalCount}명</td></tr>
      <tr><td style="padding:6px 12px;border-bottom:1px solid #eee;color:#64748b;">월 급여 합계</td><td style="padding:6px 12px;border-bottom:1px solid #eee;text-align:right;">₩${formatAmount(dataPackage.employees.monthlySalaryTotal)}</td></tr>
    </table>
    ` : ""}

    <div style="margin-top:24px;padding:16px;background:#fef3c7;border-radius:8px;">
      <p style="margin:0;font-size:13px;color:#92400e;">이 이메일은 김비서 AI에서 자동 발송되었습니다. 상담이 필요하시면 사장님에게 직접 연락해 주세요.</p>
    </div>
  </div>
</body>
</html>`;
}

// ====== Main handler ======

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY is not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization");
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);

    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
    const token = authHeader?.replace("Bearer ", "");
    if (!token) throw new Error("인증이 필요합니다");

    const { data: { user }, error: authError } = await anonClient.auth.getUser(token);
    if (authError || !user) throw new Error("인증에 실패했습니다");

    const body = await req.json();
    const { consultationId, filingTaskId, preview, checklist } = body;

    if (!consultationId && !filingTaskId) {
      throw new Error("consultationId 또는 filingTaskId가 필요합니다");
    }

    const { data: profile } = await supabaseClient
      .from("profiles")
      .select("business_name, business_registration_number, business_type, name")
      .eq("user_id", user.id)
      .single();

    const businessName = profile?.business_name || profile?.name || "사장님";

    // ========== 신고 자료 전달 모드 ==========
    if (filingTaskId) {
      const { data: assignment } = await supabaseClient
        .from("tax_accountant_assignments")
        .select("accountant_id")
        .eq("user_id", user.id)
        .eq("status", "confirmed")
        .limit(1)
        .maybeSingle();

      if (!assignment?.accountant_id) throw new Error("담당 세무사를 먼저 배정해주세요");

      const { data: accountant } = await supabaseClient
        .from("tax_accountants")
        .select("name, email")
        .eq("id", assignment.accountant_id)
        .single();

      if (!accountant?.email) throw new Error("세무사 이메일을 찾을 수 없습니다");

      let filingType = "부가가치세 확정신고";
      let taxPeriod = "2025년 2기 (7월~12월)";
      let deadline = "2026-01-16";

      if (!filingTaskId.startsWith("demo-")) {
        const { data: filingTask } = await supabaseClient
          .from("tax_filing_tasks")
          .select("*")
          .eq("id", filingTaskId)
          .eq("user_id", user.id)
          .single();
        if (filingTask) {
          filingType = filingTask.filing_type;
          taxPeriod = filingTask.tax_period;
          deadline = filingTask.deadline;
        }
      }

      // Parse period for date range
      const { startDate, endDate, periodLabel } = parseTaxPeriod(taxPeriod);

      // Collect summary data
      const dataPackage = await collectDataPackage(supabaseClient, user.id, profile, taxPeriod);

      if (checklist && Array.isArray(checklist)) {
        dataPackage.checklist = checklist;
      }

      // Upload CSV files and get signed download links
      const downloadLinks = await uploadDataPackageFiles(supabaseClient, user.id, startDate, endDate, periodLabel);
      dataPackage.downloadLinks = downloadLinks;

      const emailHtml = buildFilingEmailHtml(businessName as string, filingType, taxPeriod, deadline, dataPackage);

      if (preview) {
        return new Response(
          JSON.stringify({ success: true, html: emailHtml, accountantName: accountant.name, accountantEmail: accountant.email, downloadLinks }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const resendResponse = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${RESEND_API_KEY}` },
        body: JSON.stringify({
          from: "김비서 <noreply@mrkim.today>",
          to: [accountant.email],
          subject: `[김비서] ${businessName} - ${filingType} (${taxPeriod})`,
          html: emailHtml,
        }),
      });

      if (!resendResponse.ok) {
        const errBody = await resendResponse.text();
        console.error("Resend error:", errBody);
        throw new Error(`이메일 발송 실패: ${resendResponse.status}`);
      }

      if (!filingTaskId.startsWith("demo-")) {
        await supabaseClient
          .from("tax_filing_tasks")
          .update({ status: "review", notified_at: new Date().toISOString() })
          .eq("id", filingTaskId);
      }

      return new Response(
        JSON.stringify({ success: true, accountantName: accountant.name }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ========== 상담 전달 모드 (기존) ==========
    const { data: consultation, error: consultationError } = await supabaseClient
      .from("tax_consultations")
      .select("*")
      .eq("id", consultationId)
      .eq("user_id", user.id)
      .single();

    if (consultationError || !consultation) throw new Error("상담 정보를 찾을 수 없습니다");

    let accountantEmail = "";
    let accountantName = "";
    if (consultation.accountant_id) {
      const { data: accountant } = await supabaseClient
        .from("tax_accountants")
        .select("name, email")
        .eq("id", consultation.accountant_id)
        .single();
      if (accountant) {
        accountantEmail = accountant.email;
        accountantName = accountant.name;
      }
    }

    if (!accountantEmail) throw new Error("세무사 이메일을 찾을 수 없습니다. 담당 세무사를 먼저 배정해주세요.");

    let dataPackage = consultation.data_package as TaxDataPackage;
    if (!dataPackage || Object.keys(dataPackage).length === 0) {
      dataPackage = await collectDataPackage(supabaseClient, user.id, profile);
      await supabaseClient.from("tax_consultations").update({ data_package: dataPackage }).eq("id", consultationId);
    }

    const emailHtml = buildConsultationEmailHtml(businessName as string, consultation.subject, consultation.user_question, consultation.ai_preliminary_answer, dataPackage);

    if (preview) {
      return new Response(
        JSON.stringify({ success: true, html: emailHtml, accountantName, accountantEmail }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${RESEND_API_KEY}` },
      body: JSON.stringify({
        from: "김비서 <noreply@mrkim.today>",
        to: [accountantEmail],
        subject: `[김비서] ${businessName} - ${consultation.subject}`,
        html: emailHtml,
      }),
    });

    if (!resendResponse.ok) {
      const errBody = await resendResponse.text();
      console.error("Resend error:", errBody);
      throw new Error(`이메일 발송 실패: ${resendResponse.status}`);
    }

    await supabaseClient
      .from("tax_consultations")
      .update({ status: "sent", email_sent_at: new Date().toISOString() })
      .eq("id", consultationId);

    return new Response(
      JSON.stringify({ success: true, accountantName }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("send-tax-consultation error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// ====== Helpers ======

function parseTaxPeriod(taxPeriod: string): { startDate: string; endDate: string; periodLabel: string } {
  const yearMatch = taxPeriod.match(/(\d{4})년/);
  const monthMatch = taxPeriod.match(/(\d+)월~(\d+)월/);
  const year = yearMatch ? parseInt(yearMatch[1]) : new Date().getFullYear();

  if (monthMatch) {
    const startMonth = parseInt(monthMatch[1]);
    const endMonth = parseInt(monthMatch[2]);
    const startDate = `${year}-${String(startMonth).padStart(2, "0")}-01`;
    const lastDay = new Date(year, endMonth, 0).getDate();
    const endDate = `${year}-${String(endMonth).padStart(2, "0")}-${lastDay}`;
    return { startDate, endDate, periodLabel: `${year}년 ${startMonth}월~${endMonth}월` };
  }

  const now = new Date();
  const startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
  const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0];
  return { startDate, endDate, periodLabel: `${now.getFullYear()}년 ${now.getMonth() + 1}월` };
}

async function collectDataPackage(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  profile: Record<string, unknown> | null,
  taxPeriod?: string
): Promise<TaxDataPackage> {
  const { startDate, endDate, periodLabel } = parseTaxPeriod(taxPeriod || "");

  const [txRes, invoiceRes, employeeRes, deliveryRes] = await Promise.all([
    supabase.from("transactions").select("type, amount, category").eq("user_id", userId).gte("transaction_date", startDate).lte("transaction_date", endDate),
    supabase.from("tax_invoices").select("invoice_type, total_amount, tax_amount").eq("user_id", userId).gte("invoice_date", startDate).lte("invoice_date", endDate),
    supabase.from("employees").select("monthly_salary").eq("user_id", userId).eq("status", "재직"),
    supabase.from("delivery_orders").select("platform, total_amt").eq("user_id", userId).gte("order_dt", startDate.replace(/-/g, "")).lte("order_dt", endDate.replace(/-/g, "")),
  ]);

  const transactions = txRes.data || [];
  const invoices = invoiceRes.data || [];
  const employees = employeeRes.data || [];
  const deliveryOrders = deliveryRes.data || [];

  let incomeTotal = 0, expenseTotal = 0;
  const byCategory: Record<string, number> = {};
  for (const tx of transactions) {
    if (tx.type === "income" || tx.type === "transfer_in") {
      incomeTotal += tx.amount;
    } else {
      expenseTotal += tx.amount;
      const cat = tx.category || "미분류";
      byCategory[cat] = (byCategory[cat] || 0) + tx.amount;
    }
  }

  let salesInvoiceCount = 0, purchaseInvoiceCount = 0, salesInvoiceAmount = 0, purchaseInvoiceAmount = 0;
  for (const inv of invoices) {
    if (inv.invoice_type === "sales") { salesInvoiceCount++; salesInvoiceAmount += inv.total_amount; }
    else { purchaseInvoiceCount++; purchaseInvoiceAmount += inv.total_amount; }
  }

  const deliveryMap = new Map<string, { count: number; total: number }>();
  for (const order of deliveryOrders) {
    const existing = deliveryMap.get(order.platform) || { count: 0, total: 0 };
    existing.count++;
    existing.total += order.total_amt || 0;
    deliveryMap.set(order.platform, existing);
  }

  const totalSalary = employees.reduce((sum, e) => sum + (e.monthly_salary || 0), 0);
  const salesTotal = salesInvoiceAmount + incomeTotal;
  const purchaseTotal = purchaseInvoiceAmount + expenseTotal;

  return {
    business: {
      name: (profile?.business_name as string) || "",
      registrationNumber: (profile?.business_registration_number as string) || "",
      type: (profile?.business_type as string) || "",
    },
    summary: { period: periodLabel, salesTotal, purchaseTotal, vatPayable: Math.round((salesInvoiceAmount - purchaseInvoiceAmount) * 0.1), transactionCount: transactions.length },
    taxInvoices: { salesCount: salesInvoiceCount, purchaseCount: purchaseInvoiceCount, salesAmount: salesInvoiceAmount, purchaseAmount: purchaseInvoiceAmount },
    transactions: { incomeTotal, expenseTotal, byCategory },
    delivery: deliveryMap.size > 0 ? Array.from(deliveryMap.entries()).map(([platform, data]) => ({ platform, orderCount: data.count, totalAmount: data.total })) : undefined,
    employees: employees.length > 0 ? { totalCount: employees.length, monthlySalaryTotal: totalSalary } : undefined,
  };
}
