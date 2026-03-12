import { createClient } from "https://esm.sh/@supabase/supabase-js@2.93.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// 인증 이메일 유형별 컨텐츠
const AUTH_CONTENT: Record<string, { heading: string; body: string; ctaText: string }> = {
  signup: {
    heading: "가입을 환영합니다! 🎉",
    body: "김비서에 가입해 주셔서 감사합니다.\n\n아래 버튼을 클릭하여 이메일 인증을 완료해주세요.\n인증이 완료되면 김비서의 모든 기능을 이용하실 수 있습니다.",
    ctaText: "이메일 인증하기",
  },
  recovery: {
    heading: "비밀번호 재설정",
    body: "비밀번호 재설정을 요청하셨습니다.\n\n아래 버튼을 클릭하여 새 비밀번호를 설정해주세요.\n본인이 요청하지 않았다면 이 이메일을 무시하셔도 됩니다.",
    ctaText: "비밀번호 재설정",
  },
  magiclink: {
    heading: "로그인 링크",
    body: "김비서 로그인을 위한 매직 링크입니다.\n\n아래 버튼을 클릭하면 자동으로 로그인됩니다.\n이 링크는 한 번만 사용할 수 있으며, 일정 시간 후 만료됩니다.",
    ctaText: "로그인하기",
  },
  email_change: {
    heading: "이메일 주소 변경 확인",
    body: "이메일 주소 변경이 요청되었습니다.\n\n아래 버튼을 클릭하여 새 이메일 주소를 확인해주세요.\n본인이 요청하지 않았다면 이 이메일을 무시하셔도 됩니다.",
    ctaText: "이메일 변경 확인",
  },
  invite: {
    heading: "초대를 받으셨습니다",
    body: "김비서 서비스에 초대되었습니다.\n\n아래 버튼을 클릭하여 계정을 설정해주세요.",
    ctaText: "초대 수락하기",
  },
};

interface EmailDesign {
  headerTitle: string;
  headerSubtitle: string;
  headerBg: string;
  headerTextColor: string;
  bodyBg: string;
  bodyTextColor: string;
  ctaBg: string;
  ctaTextColor: string;
  footerBg: string;
  footerText: string;
}

const DEFAULT_DESIGN: EmailDesign = {
  headerTitle: "김비서",
  headerSubtitle: "",
  headerBg: "#2563eb",
  headerTextColor: "#ffffff",
  bodyBg: "#ffffff",
  bodyTextColor: "#374151",
  ctaBg: "#2563eb",
  ctaTextColor: "#ffffff",
  footerBg: "#f9fafb",
  footerText: "이 이메일은 김비서에서 자동 발송되었습니다.",
};

function buildAuthEmailHtml(design: EmailDesign, content: { heading: string; body: string; ctaText: string }, confirmationUrl: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:'Apple SD Gothic Neo','Malgun Gothic',sans-serif;max-width:600px;margin:0 auto;padding:0;background:#f3f4f6;">
  <div style="background:${design.headerBg};padding:32px 24px;text-align:center;">
    <h1 style="margin:0;font-size:22px;color:${design.headerTextColor};font-weight:700;">${design.headerTitle}</h1>
    <p style="margin:8px 0 0;font-size:14px;color:${design.headerTextColor};opacity:0.85;">${content.heading}</p>
  </div>
  <div style="padding:32px 24px;background:${design.bodyBg};">
    <div style="font-size:15px;line-height:1.8;color:${design.bodyTextColor};white-space:pre-wrap;">${content.body}</div>
    <div style="text-align:center;padding:24px 0 8px;">
      <a href="${confirmationUrl}" target="_blank" style="display:inline-block;padding:14px 32px;background:${design.ctaBg};color:${design.ctaTextColor};text-decoration:none;border-radius:8px;font-size:15px;font-weight:600;">
        ${content.ctaText}
      </a>
    </div>
    <p style="margin-top:16px;font-size:12px;color:#9ca3af;text-align:center;">버튼이 작동하지 않으면 아래 링크를 브라우저에 붙여넣으세요:</p>
    <p style="font-size:11px;color:#6b7280;word-break:break-all;text-align:center;">${confirmationUrl}</p>
  </div>
  <div style="padding:24px;background:${design.footerBg};border-top:1px solid #e5e7eb;text-align:center;">
    <p style="margin:0;font-size:12px;color:#9ca3af;">${design.footerText}</p>
    <p style="margin:4px 0 0;font-size:12px;color:#9ca3af;">© ${new Date().getFullYear()} 김비서. All rights reserved.</p>
  </div>
</body>
</html>`;
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
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const payload = await req.json();
    console.log("Auth email hook payload:", JSON.stringify(payload));

    // Supabase Auth Hook 페이로드 파싱
    const user = payload.user;
    const emailData = payload.email_data;

    if (!user?.email || !emailData) {
      throw new Error("Invalid hook payload: missing user email or email_data");
    }

    const emailActionType = emailData.email_action_type || "signup";
    const tokenHash = emailData.token_hash;
    const redirectTo = emailData.redirect_to || "https://mrkim.today";

    // Confirmation URL 구성 (커스텀 도메인 사용)
    const supabaseCustomDomain = "https://app.mrkim.today";
    const confirmationUrl = `${supabaseCustomDomain}/auth/v1/verify?token=${tokenHash}&type=${emailActionType}&redirect_to=${encodeURIComponent(redirectTo)}`;

    // DB에서 저장된 디자인 읽기
    let design: EmailDesign = { ...DEFAULT_DESIGN };
    try {
      const { data: settingData } = await supabase
        .from("site_settings")
        .select("value")
        .eq("key", "auth_email_design")
        .single();

      if (settingData?.value) {
        design = { ...DEFAULT_DESIGN, ...(settingData.value as unknown as Partial<EmailDesign>) };
      }
    } catch (e) {
      console.log("Using default design (no saved design found):", e);
    }

    // 컨텐츠 결정
    const content = AUTH_CONTENT[emailActionType] || AUTH_CONTENT.signup;

    // 이메일 제목 결정
    const subjects: Record<string, string> = {
      signup: "[김비서] 이메일 인증을 완료해주세요",
      recovery: "[김비서] 비밀번호 재설정",
      magiclink: "[김비서] 로그인 링크",
      email_change: "[김비서] 이메일 주소 변경 확인",
      invite: "[김비서] 초대가 도착했습니다",
    };

    const subject = subjects[emailActionType] || "[김비서] 인증 요청";
    const html = buildAuthEmailHtml(design, content, confirmationUrl);

    // Resend로 이메일 발송
    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "김비서 <noreply@mrkim.today>",
        to: [user.email],
        subject,
        html,
      }),
    });

    if (!resendResponse.ok) {
      const errBody = await resendResponse.text();
      console.error("Resend error:", errBody);
      throw new Error(`Email send failed: ${resendResponse.status} - ${errBody}`);
    }

    const result = await resendResponse.json();
    console.log("Auth email sent successfully:", result.id, "to:", user.email, "type:", emailActionType);

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("auth-email-hook error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
