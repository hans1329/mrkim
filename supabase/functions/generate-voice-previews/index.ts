import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const VOICES = [
  { id: "PDoCXqBQFGsvfO0hNkEs", label: "calm-male" },
  { id: "YBRudLRm83BV5Mazcr42", label: "bright-male" },
  { id: "nbrxrAz3eYm9NgojrmFK", label: "deep-male" },
  { id: "OEaq3WGNtNvFJ5co9mJE", label: "soft-male" },
  // 여성은 현재 단일 음성 사용
  { id: "uyVNoMrnUku1dZyVEXwD", label: "default-female" },
];

const GREETING = "안녕하세요, 반갑습니다.";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!ELEVENLABS_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Missing required environment variables");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const results: string[] = [];

    // Generate all voices in parallel
    const tasks = VOICES.map(async (voice) => {
      const fileName = `${voice.id}.mp3`;

      // Check if already exists
      const { data: existing } = await supabase.storage
        .from("voice-previews")
        .list("", { search: fileName });

      if (existing && existing.length > 0) {
        results.push(`${voice.label}: already exists`);
        return;
      }

      // Generate TTS
      const ttsResponse = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${voice.id}?output_format=mp3_22050_32`,
        {
          method: "POST",
          headers: {
            "xi-api-key": ELEVENLABS_API_KEY,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            text: GREETING,
            model_id: "eleven_turbo_v2_5",
            voice_settings: {
              stability: 0.4,
              similarity_boost: 0.7,
              style: 0.5,
              use_speaker_boost: false,
              speed: 1.1,
            },
          }),
        }
      );

      if (!ttsResponse.ok) {
        const err = await ttsResponse.text();
        console.error(`TTS error for ${voice.label}:`, err);
        results.push(`${voice.label}: TTS error ${ttsResponse.status}`);
        return;
      }

      const audioBuffer = await ttsResponse.arrayBuffer();

      // Upload to Storage
      const { error: uploadError } = await supabase.storage
        .from("voice-previews")
        .upload(fileName, audioBuffer, {
          contentType: "audio/mpeg",
          upsert: true,
        });

      if (uploadError) {
        console.error(`Upload error for ${voice.label}:`, uploadError);
        results.push(`${voice.label}: upload error`);
        return;
      }

      results.push(`${voice.label}: ✅ generated and uploaded`);
    });

    await Promise.all(tasks);

    return new Response(JSON.stringify({ results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
