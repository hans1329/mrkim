import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY");
    const ELEVENLABS_AGENT_ID = Deno.env.get("ELEVENLABS_AGENT_ID");
    
    if (!ELEVENLABS_API_KEY) {
      throw new Error("ELEVENLABS_API_KEY is not configured");
    }
    
    if (!ELEVENLABS_AGENT_ID) {
      throw new Error("ELEVENLABS_AGENT_ID is not configured");
    }

    // Parse request body for overrides
    let overrides: Record<string, any> | undefined;
    let transport: "webrtc" | "websocket" = "websocket";
    try {
      const body = await req.json();
      overrides = body.overrides;
      if (body.transport === "webrtc" || body.transport === "websocket") {
        transport = body.transport;
      }
    } catch {
      // Body is optional
    }

    if (transport === "webrtc") {
      console.log("Requesting conversation token for agent:", ELEVENLABS_AGENT_ID);

      const tokenRes = await fetch(
        `https://api.elevenlabs.io/v1/convai/conversation/token?agent_id=${ELEVENLABS_AGENT_ID}`,
        {
          method: "GET",
          headers: {
            "xi-api-key": ELEVENLABS_API_KEY,
          },
        }
      );

      if (tokenRes.ok) {
        const tokenData = await tokenRes.json();

        return new Response(
          JSON.stringify({
            token: tokenData.token,
            agentId: ELEVENLABS_AGENT_ID,
            overrides,
            preferredConnectionType: "webrtc",
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      const tokenErrorText = await tokenRes.text();
      console.warn(
        "Token endpoint failed, falling back to signed URL:",
        tokenRes.status,
        tokenErrorText,
      );
    }

    console.log("Requesting signed URL for agent:", ELEVENLABS_AGENT_ID);

    const signedUrlRes = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversation/get-signed-url?agent_id=${ELEVENLABS_AGENT_ID}`,
      {
        method: "GET",
        headers: {
          "xi-api-key": ELEVENLABS_API_KEY,
        },
      }
    );

    if (!signedUrlRes.ok) {
      const signedUrlErrorText = await signedUrlRes.text();
      console.error(
        "ElevenLabs signed-url API error:",
        signedUrlRes.status,
        signedUrlErrorText,
      );
      throw new Error(
        `ElevenLabs API error (token: ${tokenRes.status}, signed-url: ${signedUrlRes.status}) - ${signedUrlErrorText}`,
      );
    }

    const signedUrlData = await signedUrlRes.json();

    return new Response(
      JSON.stringify({
        signedUrl: signedUrlData.signed_url,
        agentId: ELEVENLABS_AGENT_ID,
        overrides,
        preferredConnectionType: "websocket",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: unknown) {
    console.error("Error generating signed URL:", error);
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
