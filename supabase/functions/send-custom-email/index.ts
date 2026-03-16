import { createClient } from "https://esm.sh/@supabase/supabase-js@2.93.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function listAllUsers(supabase: any): Promise<string[]> {
  const emails: string[] = [];
  let page = 1;
  const perPage = 1000;

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) throw new Error("유저 목록 조회 실패: " + error.message);

    const users = data?.users || [];
    for (const u of users) {
      if (u.email) emails.push(u.email);
    }

    if (users.length < perPage) break;
    page++;
  }

  return emails;
}

async function sendOneEmail(
  email: string,
  opts: { apiKey: string; subject: string; html?: string; text?: string; replyTo?: string }
): Promise<{ email: string; success: boolean; id?: string; error?: string }> {
  const body = JSON.stringify({
    from: "김비서 <noreply@mrkim.today>",
    to: [email],
    subject: opts.subject,
    html: opts.html || undefined,
    text: opts.text || undefined,
    reply_to: opts.replyTo || undefined,
  });

  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${opts.apiKey}`,
  };

  try {
    let res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers,
      body,
    });

    // 429 레이트 리밋 → 대기 후 1회 재시도
    if (res.status === 429) {
      await res.text(); // body 소비 (리소스 누수 방지)
      const retryAfter = parseInt(res.headers.get("retry-after") || "2", 10);
      await new Promise((r) => setTimeout(r, retryAfter * 1000));

      res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers,
        body,
      });
    }

    const resBody = await res.text();

    if (!res.ok) {
      console.error(`Resend error for ${email}: ${resBody}`);
      return { email, success: false, error: `${res.status}: ${resBody.substring(0, 200)}` };
    }

    const result = JSON.parse(resBody);
    return { email, success: true, id: result.id };
  } catch (err: any) {
    console.error(`Send error for ${email}:`, err);
    return { email, success: false, error: err.message };
  }
}

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
    const {
      data: { user },
      error: authError,
    } = await anonClient.auth.getUser(token);
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

    if (!subject || (!html && !text)) {
      throw new Error("subject, html 또는 text가 필요합니다");
    }

    // ── 수신자 목록 구성 ──
    let recipients: string[] = [];

    if (fetchAllUsers) {
      const allEmails = await listAllUsers(supabase);

      // 수신 거부 필터
      const { data: unsubscribes } = await supabase
        .from("email_unsubscribes")
        .select("email");
      const unsubSet = new Set(
        (unsubscribes || []).map((u: any) => u.email.toLowerCase())
      );

      recipients = allEmails.filter((e) => !unsubSet.has(e.toLowerCase()));
    } else {
      if (!to) throw new Error("수신자가 필요합니다");
      recipients = Array.isArray(to) ? to : [to];

      // 수신 거부 필터 (입력된 이메일만 조회)
      if (recipients.length > 0) {
        const { data: unsubscribes } = await supabase
          .from("email_unsubscribes")
          .select("email")
          .in(
            "email",
            recipients.map((e: string) => e.toLowerCase())
          );
        const unsubSet = new Set(
          (unsubscribes || []).map((u: any) => u.email.toLowerCase())
        );

        const before = recipients.length;
        recipients = recipients.filter((e) => !unsubSet.has(e.toLowerCase()));
        if (before !== recipients.length) {
          console.log(`${before - recipients.length}명의 수신 거부 사용자 제외`);
        }
      }
    }

    if (recipients.length === 0) {
      throw new Error("발송 가능한 수신자가 없습니다 (모두 수신 거부 상태)");
    }

    // ── 수신 거부 링크 삽입 ──
    const unsubscribeUrl = `${supabaseUrl}/functions/v1/email-unsubscribe`;
    const htmlWithUnsub = html
      ? html.replace(
          "</body>",
          `<div style="text-align:center;padding:16px;font-size:11px;color:#9ca3af;">
            <a href="${unsubscribeUrl}?email={{EMAIL}}" style="color:#9ca3af;text-decoration:underline;">수신 거부</a>
          </div></body>`
        )
      : undefined;

    // ── 순차 발송 (레이트 리밋 안전) ──
    // Resend 기본 10 req/s → 150ms 간격으로 ~6.6 req/s (안전 마진 확보)
    const SEND_INTERVAL_MS = 150;
    const results: Awaited<ReturnType<typeof sendOneEmail>>[] = [];

    for (let i = 0; i < recipients.length; i++) {
      const email = recipients[i];
      const personalizedHtml = htmlWithUnsub?.replace(
        /\{\{EMAIL\}\}/g,
        encodeURIComponent(email)
      );

      const result = await sendOneEmail(email, {
        apiKey: RESEND_API_KEY,
        subject,
        html: personalizedHtml,
        text,
        replyTo,
      });
      results.push(result);

      // 마지막 건이 아니면 간격 대기
      if (i < recipients.length - 1) {
        await new Promise((r) => setTimeout(r, SEND_INTERVAL_MS));
      }
    }

    const successCount = results.filter((r) => r.success).length;
    const failCount = results.filter((r) => !r.success).length;

    // ── 발송 이력 DB 저장 ──
    const { error: historyError } = await supabase.from("email_send_history").insert({
      subject,
      recipients,
      recipient_count: recipients.length,
      template_type: templateType || "custom",
      html_content: html?.substring(0, 10000),
      reply_to: replyTo || null,
      status:
        failCount === 0
          ? "sent"
          : failCount === recipients.length
          ? "failed"
          : "partial",
      error_message: failCount > 0 ? `${failCount}건 실패` : null,
      sent_by: user.id,
    });

    if (historyError) {
      console.error("History insert error:", historyError);
    }

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
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
