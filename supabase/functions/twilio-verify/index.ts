import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseUser.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claimsData.claims.sub;

    const body = await req.json();
    const { action, phone, code } = body;

    const twilioAccountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
    const twilioAuthToken = Deno.env.get("TWILIO_AUTH_TOKEN");
    const twilioServiceSid = Deno.env.get("TWILIO_MESSAGING_SERVICE_SID");

    if (!twilioAccountSid || !twilioAuthToken || !twilioServiceSid) {
      throw new Error("Twilio credentials not configured");
    }

    const twilioAuth = btoa(`${twilioAccountSid}:${twilioAuthToken}`);

    if (action === "send") {
      // Send verification code
      if (!phone) {
        return new Response(JSON.stringify({ error: "Phone number required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Format phone number for Twilio (add +82 for Korean numbers)
      let formattedPhone = phone.replace(/\D/g, "");
      if (formattedPhone.startsWith("0")) {
        formattedPhone = "+82" + formattedPhone.substring(1);
      } else if (!formattedPhone.startsWith("+")) {
        formattedPhone = "+" + formattedPhone;
      }

      const verifyUrl = `https://verify.twilio.com/v2/Services/${twilioServiceSid}/Verifications`;

      const formData = new URLSearchParams();
      formData.append("To", formattedPhone);
      formData.append("Channel", "sms");

      const response = await fetch(verifyUrl, {
        method: "POST",
        headers: {
          Authorization: `Basic ${twilioAuth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formData.toString(),
      });

      const result = await response.json();

      if (!response.ok) {
        console.error("Twilio Verify send error:", result);
        return new Response(
          JSON.stringify({ error: result.message || "인증번호 발송에 실패했습니다" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, status: result.status }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );

    } else if (action === "verify") {
      // Check verification code
      if (!phone || !code) {
        return new Response(JSON.stringify({ error: "Phone and code required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      let formattedPhone = phone.replace(/\D/g, "");
      if (formattedPhone.startsWith("0")) {
        formattedPhone = "+82" + formattedPhone.substring(1);
      } else if (!formattedPhone.startsWith("+")) {
        formattedPhone = "+" + formattedPhone;
      }

      const checkUrl = `https://verify.twilio.com/v2/Services/${twilioServiceSid}/VerificationCheck`;

      const formData = new URLSearchParams();
      formData.append("To", formattedPhone);
      formData.append("Code", code);

      const response = await fetch(checkUrl, {
        method: "POST",
        headers: {
          Authorization: `Basic ${twilioAuth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formData.toString(),
      });

      const result = await response.json();

      if (!response.ok || result.status !== "approved") {
        console.error("Twilio Verify check error:", result);
        return new Response(
          JSON.stringify({ error: "인증번호가 올바르지 않습니다", status: result.status }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Verification approved - update profile
      const supabaseAdmin = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );

      await supabaseAdmin
        .from("profiles")
        .update({
          secretary_phone: phone,
          secretary_phone_verified: true,
        })
        .eq("user_id", userId);

      return new Response(
        JSON.stringify({ success: true, status: "approved" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );

    } else {
      return new Response(JSON.stringify({ error: "Invalid action. Use 'send' or 'verify'" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  } catch (error) {
    console.error("twilio-verify error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
