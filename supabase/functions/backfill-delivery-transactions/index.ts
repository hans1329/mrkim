import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const PAGE = 300;
    let offset = 0;
    const now = new Date().toISOString();
    let totalInserted = 0;
    let totalOrders = 0;

    while (true) {
      const { data: orders, error: ordersErr } = await supabase
        .from("delivery_orders")
        .select("user_id, order_no, order_dt, order_tm, order_name, total_amt, order_fee, card_fee, delivery_amt, ad_fee, platform")
        .order("order_dt", { ascending: true })
        .range(offset, offset + PAGE - 1);

      if (ordersErr) throw ordersErr;
      if (!orders || orders.length === 0) break;
      totalOrders += orders.length;

      const txRows: any[] = [];
      for (const order of orders) {
        const prefix = order.platform === "baemin" ? "bm" : "ce";
        const sourceName = order.platform === "baemin" ? "배달의민족" : "쿠팡이츠";
        const dt = order.order_dt || "";
        const txDate = dt.length === 8 ? `${dt.slice(0, 4)}-${dt.slice(4, 6)}-${dt.slice(6, 8)}` : dt;
        const tm = order.order_tm || "";
        const txTime = tm.length >= 4 ? `${tm.slice(0, 2)}:${tm.slice(2, 4)}:00` : null;
        const totalAmt = Math.abs(Number(order.total_amt || 0));
        const orderName = order.order_name || order.order_no;

        if (totalAmt > 0) {
          txRows.push({
            user_id: order.user_id, source_type: "delivery", source_name: sourceName,
            external_tx_id: `${prefix}_${order.order_no}`, transaction_date: txDate,
            transaction_time: txTime, amount: totalAmt, type: "income",
            description: `${sourceName} 주문 ${orderName}`,
            category: "배달매출", category_icon: "🛵", merchant_name: sourceName, synced_at: now,
          });
        }

        const fees = [
          { key: "order_fee", suffix: "orderFee", label: "주문중개수수료", icon: "📋", cat: "지급수수료" },
          { key: "card_fee", suffix: "cardFee", label: "카드결제수수료", icon: "💳", cat: "지급수수료" },
          { key: "ad_fee", suffix: "adFee", label: "광고비", icon: "📢", cat: "광고선전비" },
          { key: "delivery_amt", suffix: "deliveryAmt", label: "배달대행료", icon: "🏍️", cat: "운반비" },
        ];
        for (const f of fees) {
          const amt = Math.abs(Number((order as any)[f.key] || 0));
          if (amt <= 0) continue;
          txRows.push({
            user_id: order.user_id, source_type: "delivery", source_name: sourceName,
            external_tx_id: `${prefix}_${order.order_no}_${f.suffix}`, transaction_date: txDate,
            transaction_time: txTime, amount: amt, type: "expense",
            description: `${sourceName} ${f.label} (${orderName})`,
            category: f.cat, category_icon: f.icon, merchant_name: sourceName, synced_at: now,
          });
        }
      }

      // Insert in one batch per page
      if (txRows.length > 0) {
        const { error } = await supabase.from("transactions").insert(txRows);
        if (error) {
          console.error(`Insert error at offset ${offset}:`, error.message);
        } else {
          totalInserted += txRows.length;
        }
      }

      console.log(`Offset ${offset}: ${orders.length} orders → ${txRows.length} tx rows`);
      if (orders.length < PAGE) break;
      offset += PAGE;
    }

    return new Response(JSON.stringify({ orders: totalOrders, inserted: totalInserted }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Backfill error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
