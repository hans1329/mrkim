import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// 한국어 네이티브 음성 ID
const KOREAN_VOICES = {
  female: {
    default: "uyVNoMrnUku1dZyVEXwD",  // 한국어 여성 네이티브
    friendly: "uyVNoMrnUku1dZyVEXwD",
  },
  male: {
    default: "PDoCXqBQFGsvfO0hNkEs",  // 한국어 남성 네이티브
    friendly: "PDoCXqBQFGsvfO0hNkEs",
  }
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY");
    if (!ELEVENLABS_API_KEY) {
      throw new Error("ELEVENLABS_API_KEY is not configured");
    }

    const { text, voiceId, gender = "female", tone = "default" } = await req.json();

    if (!text || typeof text !== "string") {
      throw new Error("text is required");
    }

    // 음성 ID 결정 (직접 지정 또는 성별/톤으로 선택)
    let selectedVoiceId = voiceId;
    if (!selectedVoiceId) {
      const genderVoices = gender === "male" ? KOREAN_VOICES.male : KOREAN_VOICES.female;
      selectedVoiceId = genderVoices[tone as keyof typeof genderVoices] || genderVoices.default;
    }

    console.log("Generating TTS:", { textLength: text.length, voiceId: selectedVoiceId });

    // ElevenLabs TTS API 호출
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${selectedVoiceId}?output_format=mp3_44100_128`,
      {
        method: "POST",
        headers: {
          "xi-api-key": ELEVENLABS_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text,
          model_id: "eleven_multilingual_v2",
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

    if (!response.ok) {
      const errorText = await response.text();
      console.error("ElevenLabs TTS error:", response.status, errorText);
      throw new Error(`ElevenLabs TTS error: ${response.status}`);
    }

    // raw 바이너리 오디오를 직접 반환 (base64 인코딩 제거)
    const audioBuffer = await response.arrayBuffer();

    return new Response(audioBuffer, { 
      headers: { 
        ...corsHeaders, 
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-cache",
      } 
    });
  } catch (error: unknown) {
    console.error("TTS error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
