import { createClient } from "https://esm.sh/@supabase/supabase-js@2.93.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const email = url.searchParams.get("email");

    if (!email) {
      return new Response(htmlPage("오류", "이메일 주소가 필요합니다."), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" },
      });
    }

    const decodedEmail = decodeURIComponent(email).toLowerCase().trim();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // POST = 실제 수신 거부 처리
    if (req.method === "POST") {
      const { error } = await supabase
        .from("email_unsubscribes")
        .upsert(
          { email: decodedEmail, reason: "user_request", unsubscribed_at: new Date().toISOString() },
          { onConflict: "email" }
        );

      if (error) {
        console.error("Unsubscribe error:", error);
        return new Response(htmlPage("오류", "처리 중 오류가 발생했습니다."), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" },
        });
      }

      return new Response(htmlPage("수신 거부 완료", `<strong>${decodedEmail}</strong> 주소의 수신 거부가 완료되었습니다.<br><br>더 이상 마케팅/공지 이메일을 받지 않습니다.`), {
        headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" },
      });
    }

    // GET = 확인 페이지 표시
    return new Response(htmlConfirmPage(decodedEmail), {
      headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" },
    });

  } catch (error) {
    console.error("email-unsubscribe error:", error);
    return new Response(htmlPage("오류", "처리 중 오류가 발생했습니다."), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" },
    });
  }
});

function htmlPage(title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${title} - 김비서</title>
  <style>
    body { font-family: 'Apple SD Gothic Neo','Malgun Gothic',sans-serif; background:#f3f4f6; margin:0; padding:40px 20px; }
    .card { max-width:480px; margin:0 auto; background:#fff; border-radius:12px; padding:40px 32px; box-shadow:0 2px 8px rgba(0,0,0,0.08); text-align:center; }
    h1 { font-size:20px; color:#1f2937; margin:0 0 16px; }
    p { font-size:14px; color:#6b7280; line-height:1.6; margin:0; }
    .logo { font-size:24px; font-weight:700; color:#2563eb; margin-bottom:24px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="logo">김비서</div>
    <h1>${title}</h1>
    <p>${body}</p>
  </div>
</body>
</html>`;
}

function htmlConfirmPage(email: string): string {
  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>수신 거부 - 김비서</title>
  <style>
    body { font-family: 'Apple SD Gothic Neo','Malgun Gothic',sans-serif; background:#f3f4f6; margin:0; padding:40px 20px; }
    .card { max-width:480px; margin:0 auto; background:#fff; border-radius:12px; padding:40px 32px; box-shadow:0 2px 8px rgba(0,0,0,0.08); text-align:center; }
    h1 { font-size:20px; color:#1f2937; margin:0 0 16px; }
    p { font-size:14px; color:#6b7280; line-height:1.6; margin:0 0 24px; }
    .logo { font-size:24px; font-weight:700; color:#2563eb; margin-bottom:24px; }
    button { background:#ef4444; color:#fff; border:none; padding:12px 32px; border-radius:8px; font-size:14px; font-weight:600; cursor:pointer; }
    button:hover { background:#dc2626; }
    .email { font-weight:600; color:#1f2937; }
  </style>
</head>
<body>
  <div class="card">
    <div class="logo">김비서</div>
    <h1>수신 거부</h1>
    <p><span class="email">${email}</span> 주소로 발송되는 마케팅/공지 이메일의 수신을 거부하시겠습니까?</p>
    <form method="POST">
      <button type="submit">수신 거부하기</button>
    </form>
  </div>
</body>
</html>`;
}
