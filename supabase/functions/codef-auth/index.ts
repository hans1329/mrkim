import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// 정식(운영) 환경
const CODEF_API_URL = "https://api.codef.io";
const CODEF_TOKEN_URL = "https://oauth.codef.io/oauth/token";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const clientId = Deno.env.get("CODEF_CLIENT_ID");
    const clientSecret = Deno.env.get("CODEF_CLIENT_SECRET");

    if (!clientId || !clientSecret) {
      throw new Error("CODEF_CLIENT_ID 또는 CODEF_CLIENT_SECRET이 설정되지 않았습니다.");
    }

    // OAuth 토큰 발급
    const credentials = btoa(`${clientId}:${clientSecret}`);
    
    const tokenResponse = await fetch(CODEF_TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Authorization": `Basic ${credentials}`,
      },
      body: "grant_type=client_credentials&scope=read",
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error("Token request failed:", tokenResponse.status, errorText);
      throw new Error(`토큰 발급 실패: ${tokenResponse.status}`);
    }

    const tokenData = await tokenResponse.json();
    
    if (!tokenData.access_token) {
      throw new Error("access_token이 응답에 없습니다.");
    }

    console.log("Codef token issued successfully");

    return new Response(
      JSON.stringify({
        success: true,
        message: "코드에프 연동 성공!",
        token_type: tokenData.token_type,
        expires_in: tokenData.expires_in,
        // access_token은 보안상 일부만 표시
        token_preview: tokenData.access_token.substring(0, 20) + "...",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Codef auth error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
