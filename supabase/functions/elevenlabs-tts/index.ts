import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// 한국어 음성 ID 목록 (ElevenLabs 기본 제공)
const KOREAN_VOICES = {
  female: {
    default: "XrExE9yKIg1WjnnlVkGX", // Matilda - 친절한 여성
    friendly: "EXAVITQu4vr4xnSDxMaL", // Sarah - 친근한 여성
  },
  male: {
    default: "JBFqnCBsd6RMkjVDRZzb", // George - 신뢰감 있는 남성
    friendly: "TX3LPaxmHKxFdv7VOQHJ", // Liam - 친근한 남성
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
            stability: 0.5,
            similarity_boost: 0.75,
            style: 0.3,
            use_speaker_boost: true,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("ElevenLabs TTS error:", response.status, errorText);
      throw new Error(`ElevenLabs TTS error: ${response.status}`);
    }

    // 오디오 바이너리를 base64로 인코딩
    const audioBuffer = await response.arrayBuffer();
    const audioBase64 = base64Encode(audioBuffer);

    return new Response(
      JSON.stringify({ 
        audioContent: audioBase64,
        contentType: "audio/mpeg"
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
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
