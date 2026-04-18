import { createClient } from "https://esm.sh/@supabase/supabase-js@2.93.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) throw new Error("Missing authorization header");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify the calling user
    const anonClient = createClient(
      supabaseUrl,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: userError } = await anonClient.auth.getUser();
    if (userError || !user) throw new Error("Unauthorized");

    const { accountant_id } = await req.json();
    if (!accountant_id) throw new Error("accountant_id is required");

    // Fetch accountant info
    const { data: accountant, error: accErr } = await supabase
      .from("tax_accountants")
      .select("id, name, email, user_id, firm_name")
      .eq("id", accountant_id)
      .single();
    if (accErr || !accountant) throw new Error("Accountant not found");

    // Fetch user profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("business_name, name, business_type")
      .eq("user_id", user.id)
      .single();

    const userName = profile?.business_name || profile?.name || user.email || "사용자";
    const businessType = profile?.business_type || "";

    // 1) In-app notification (if accountant has user_id)
    if (accountant.user_id) {
      await supabase.from("notifications").insert({
        user_id: accountant.user_id,
        title: "새 고객 배정",
        message: `${userName}${businessType ? ` (${businessType})` : ""} 님이 담당 세무사로 배정하였습니다.`,
        type: "tax_accountant",
      });
      console.log("In-app notification sent to accountant:", accountant.user_id);
    }

    // 2) Email notification
    if (resendApiKey && accountant.email) {
      const emailHtml = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:560px;margin:20px auto;background:#ffffff;border-radius:16px;overflow:hidden;">
    <div style="background:#1a1a2e;padding:24px 32px;">
      <h1 style="color:#ffffff;font-size:18px;margin:0;">김비서</h1>
    </div>
    <div style="padding:32px;">
      <h2 style="font-size:20px;color:#1a1a2e;margin:0 0 16px;">새 고객이 배정되었습니다</h2>
      <div style="background:#f0f4ff;border-radius:12px;padding:20px;margin-bottom:24px;">
        <p style="margin:0 0 8px;font-size:14px;color:#6b7280;">고객 정보</p>
        <p style="margin:0 0 4px;font-size:16px;font-weight:600;color:#1a1a2e;">${userName}</p>
        ${businessType ? `<p style="margin:0;font-size:14px;color:#6b7280;">업종: ${businessType}</p>` : ""}
      </div>
      <p style="font-size:14px;color:#374151;line-height:1.6;">
        김비서 파트너 포털에서 고객 상세 정보를 확인하고 관리할 수 있습니다.
      </p>
      <a href="https://mrkim.today/accountant/clients" 
         style="display:inline-block;margin-top:16px;padding:12px 24px;background:#3b82f6;color:#ffffff;text-decoration:none;border-radius:8px;font-size:14px;font-weight:500;">
        파트너 포털 바로가기
      </a>
    </div>
    <div style="padding:16px 32px;background:#f9fafb;text-align:center;">
      <p style="margin:0;font-size:12px;color:#9ca3af;">© 김비서 - AI 세무 비서 서비스</p>
    </div>
  </div>
</body>
</html>`;

      const emailRes = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "김비서 <noreply@mrkim.today>",
          to: [accountant.email],
          subject: `[김비서] 새 고객 배정: ${userName}`,
          html: emailHtml,
        }),
      });

      if (!emailRes.ok) {
        const errBody = await emailRes.text();
        console.error("Resend email failed:", emailRes.status, errBody);
      } else {
        console.log("Email notification sent to:", accountant.email);
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("notify-accountant-assignment error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
