import { createClient } from "https://esm.sh/@supabase/supabase-js@2.93.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY is not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // 인증
    const authHeader = req.headers.get("Authorization");
    const token = authHeader?.replace("Bearer ", "");
    if (!token) throw new Error("인증이 필요합니다");

    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
    const { data: { user }, error: authError } = await anonClient.auth.getUser(token);
    if (authError || !user) throw new Error("인증에 실패했습니다");

    // 관리자 권한 확인
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .single();

    if (!roleData) throw new Error("관리자 권한이 필요합니다");

    const { to, subject, html, text, replyTo } = await req.json();

    if (!to || !subject || (!html && !text)) {
      throw new Error("to, subject, html 또는 text가 필요합니다");
    }

    // 수신자 목록 처리
    const recipients = Array.isArray(to) ? to : [to];

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "김비서 <noreply@mrkim.today>",
        to: recipients,
        subject,
        html: html || undefined,
        text: text || undefined,
        reply_to: replyTo || undefined,
      }),
    });

    if (!resendResponse.ok) {
      const errBody = await resendResponse.text();
      console.error("Resend error:", errBody);
      throw new Error(`이메일 발송 실패: ${resendResponse.status}`);
    }

    const result = await resendResponse.json();

    return new Response(
      JSON.stringify({ success: true, id: result.id, recipientCount: recipients.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("send-custom-email error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
