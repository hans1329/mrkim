import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface OutboundCallRequest {
  recipient_phone: string;
  recipient_name?: string;
  script: string;
  call_type?: string;
}

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

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body: OutboundCallRequest = await req.json();
    const { recipient_phone: rawPhone, recipient_name, script, call_type = "briefing" } = body;

    if (!rawPhone || !script) {
      return new Response(JSON.stringify({ error: "recipient_phone and script required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 한국 번호 국제 형식 변환: 010... → +8210...
    let recipient_phone = rawPhone.replace(/[^0-9+]/g, "");
    if (recipient_phone.startsWith("0") && !recipient_phone.startsWith("+")) {
      recipient_phone = "+82" + recipient_phone.slice(1);
    } else if (!recipient_phone.startsWith("+")) {
      recipient_phone = "+" + recipient_phone;
    }

    // 1. Create call log entry
    const { data: callLog, error: logError } = await supabaseAdmin
      .from("ai_call_logs")
      .insert({
        user_id: userId,
        call_type,
        recipient_phone,
        recipient_name: recipient_name || null,
        script,
        status: "pending",
      })
      .select()
      .single();

    if (logError) throw logError;

    // 2. Generate TTS audio via ElevenLabs
    const elevenLabsApiKey = Deno.env.get("ELEVENLABS_API_KEY");
    if (!elevenLabsApiKey) {
      throw new Error("ELEVENLABS_API_KEY not configured");
    }

    // Get user's secretary voice or use default
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("secretary_voice_id, secretary_name")
      .eq("user_id", userId)
      .single();

    const voiceId = profile?.secretary_voice_id || "21m00Tcm4TlvDq8ikWAM"; // Default: Rachel

    await supabaseAdmin
      .from("ai_call_logs")
      .update({ status: "calling" })
      .eq("id", callLog.id);

    const ttsResponse = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        method: "POST",
        headers: {
          "xi-api-key": elevenLabsApiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: script,
          model_id: "eleven_multilingual_v2",
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
          },
        }),
      }
    );

    if (!ttsResponse.ok) {
      const errText = await ttsResponse.text();
      throw new Error(`ElevenLabs TTS failed [${ttsResponse.status}]: ${errText}`);
    }

    const audioBuffer = await ttsResponse.arrayBuffer();

    // 3. Upload audio to Supabase Storage
    const audioFileName = `call-audio/${callLog.id}.mp3`;
    const { error: uploadError } = await supabaseAdmin.storage
      .from("voice-previews")
      .upload(audioFileName, audioBuffer, {
        contentType: "audio/mpeg",
        upsert: true,
      });

    if (uploadError) throw uploadError;

    const { data: publicUrl } = supabaseAdmin.storage
      .from("voice-previews")
      .getPublicUrl(audioFileName);

    await supabaseAdmin
      .from("ai_call_logs")
      .update({ tts_audio_url: publicUrl.publicUrl })
      .eq("id", callLog.id);

    // 4. Make Twilio call
    const twilioAccountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
    const twilioAuthToken = Deno.env.get("TWILIO_AUTH_TOKEN");
    const twilioPhoneNumber = Deno.env.get("TWILIO_PHONE_NUMBER");

    if (!twilioAccountSid || !twilioAuthToken || !twilioPhoneNumber) {
      throw new Error("Twilio credentials not configured");
    }

    // TwiML: Play the TTS audio
    const twiml = `<Response><Play>${publicUrl.publicUrl}</Play></Response>`;

    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Calls.json`;
    const twilioAuth = btoa(`${twilioAccountSid}:${twilioAuthToken}`);

    const formData = new URLSearchParams();
    formData.append("To", recipient_phone);
    formData.append("From", twilioPhoneNumber);
    formData.append("Twiml", twiml);

    const twilioResponse = await fetch(twilioUrl, {
      method: "POST",
      headers: {
        Authorization: `Basic ${twilioAuth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData.toString(),
    });

    const twilioResult = await twilioResponse.json();

    if (!twilioResponse.ok) {
      await supabaseAdmin
        .from("ai_call_logs")
        .update({
          status: "failed",
          error_message: `Twilio error [${twilioResult.code}]: ${twilioResult.message}`,
        })
        .eq("id", callLog.id);

      throw new Error(`Twilio call failed: ${twilioResult.message}`);
    }

    // 5. Update call log with Twilio SID
    await supabaseAdmin
      .from("ai_call_logs")
      .update({
        status: "calling",
        twilio_call_sid: twilioResult.sid,
      })
      .eq("id", callLog.id);

    return new Response(
      JSON.stringify({
        success: true,
        call_id: callLog.id,
        twilio_sid: twilioResult.sid,
        status: "calling",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("twilio-outbound-call error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
