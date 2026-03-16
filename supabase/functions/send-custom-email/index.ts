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

    const { to, subject, html, text, replyTo, templateType, fetchAllUsers } = await req.json();

    // 전체 유저 조회 모드
    let recipients: string[] = [];
    if (fetchAllUsers) {
      // auth.users에서 전체 이메일 조회
      const { data: usersData, error: usersError } = await supabase.auth.admin.listUsers({ perPage: 10000 });
      if (usersError) throw new Error("유저 목록 조회 실패: " + usersError.message);
      
      // 수신 거부 목록 조회
      const { data: unsubscribes } = await supabase
        .from("email_unsubscribes")
        .select("email");
      const unsubSet = new Set((unsubscribes || []).map((u: any) => u.email.toLowerCase()));
      
      recipients = (usersData?.users || [])
        .map((u: any) => u.email)
        .filter((e: string) => e && !unsubSet.has(e.toLowerCase()));
    } else {
      if (!to) throw new Error("수신자가 필요합니다");
      recipients = Array.isArray(to) ? to : [to];
      
      // 수신 거부 필터링
      const { data: unsubscribes } = await supabase
        .from("email_unsubscribes")
        .select("email")
        .in("email", recipients.map((e: string) => e.toLowerCase()));
      const unsubSet = new Set((unsubscribes || []).map((u: any) => u.email.toLowerCase()));
      
      const filtered = recipients.filter((e: string) => !unsubSet.has(e.toLowerCase()));
      const blockedCount = recipients.length - filtered.length;
      recipients = filtered;
      
      if (blockedCount > 0) {
        console.log(`${blockedCount}명의 수신 거부 사용자 제외`);
      }
    }

    if (!subject || (!html && !text)) {
      throw new Error("subject, html 또는 text가 필요합니다");
    }

    if (recipients.length === 0) {
      throw new Error("발송 가능한 수신자가 없습니다 (모두 수신 거부 상태)");
    }

    // 수신 거부 링크를 HTML에 추가
    const unsubscribeUrl = `${supabaseUrl}/functions/v1/email-unsubscribe`;
    const htmlWithUnsub = html 
      ? html.replace(
          '</body>',
          `<div style="text-align:center;padding:16px;font-size:11px;color:#9ca3af;">
            <a href="${unsubscribeUrl}?email={{EMAIL}}" style="color:#9ca3af;text-decoration:underline;">수신 거부</a>
          </div></body>`
        )
      : undefined;

    // Resend는 to에 최대 50개까지만 지원 → 배치 처리
    const batchSize = 50;
    const results: any[] = [];
    
    for (let i = 0; i < recipients.length; i += batchSize) {
      const batch = recipients.slice(i, i + batchSize);
      
      // 각 수신자에게 개별 발송 (수신 거부 링크에 이메일 포함 위해)
      const batchPromises = batch.map(async (email: string) => {
        const personalizedHtml = htmlWithUnsub?.replace(/\{\{EMAIL\}\}/g, encodeURIComponent(email));
        
        const resendResponse = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${RESEND_API_KEY}`,
          },
          body: JSON.stringify({
            from: "김비서 <noreply@mrkim.today>",
            to: [email],
            subject,
            html: personalizedHtml || undefined,
            text: text || undefined,
            reply_to: replyTo || undefined,
          }),
        });

        if (!resendResponse.ok) {
          const errBody = await resendResponse.text();
          console.error(`Resend error for ${email}:`, errBody);
          return { email, success: false, error: errBody };
        }

        const result = await resendResponse.json();
        return { email, success: true, id: result.id };
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
      
      // 배치 간 딜레이
      if (i + batchSize < recipients.length) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    // 발송 이력 DB 저장
    await supabase.from("email_send_history").insert({
      subject,
      recipients: recipients,
      recipient_count: recipients.length,
      template_type: templateType || "custom",
      html_content: html?.substring(0, 10000), // 최대 10KB
      reply_to: replyTo || null,
      status: failCount === 0 ? "sent" : failCount === recipients.length ? "failed" : "partial",
      error_message: failCount > 0 ? `${failCount}건 실패` : null,
      sent_by: user.id,
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        recipientCount: recipients.length,
        successCount,
        failCount,
      }),
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
