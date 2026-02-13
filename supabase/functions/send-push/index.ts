import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface PushPayload {
  campaign_id?: string;
  title: string;
  body: string;
  target_type?: "all" | "role" | "specific";
  target_user_ids?: string[];
  target_roles?: string[];
  data?: Record<string, string>;
}

/** Google OAuth2 access token from service account JSON */
async function getAccessToken(serviceAccount: any): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = btoa(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = btoa(
    JSON.stringify({
      iss: serviceAccount.client_email,
      scope: "https://www.googleapis.com/auth/firebase.messaging",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    })
  );

  // Import RSA private key
  const pemBody = serviceAccount.private_key
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\n/g, "");
  const binaryKey = Uint8Array.from(atob(pemBody), (c) => c.charCodeAt(0));

  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    binaryKey,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const toSign = new TextEncoder().encode(`${header}.${payload}`);
  const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", cryptoKey, toSign);
  const sig = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  const jwt = `${header}.${payload}.${sig}`;

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`,
  });

  const tokenData = await tokenRes.json();
  if (!tokenRes.ok) {
    throw new Error(`OAuth token error: ${JSON.stringify(tokenData)}`);
  }
  return tokenData.access_token;
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

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify caller is admin
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
    const callerId = claimsData.claims.sub;

    // Check admin role
    const { data: roleData } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", callerId)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Forbidden: admin only" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body: PushPayload = await req.json();
    const { title, body: messageBody, target_type = "all", target_user_ids, target_roles, data: pushData, campaign_id } = body;

    if (!title || !messageBody) {
      return new Response(JSON.stringify({ error: "title and body required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get FCM service account
    const fcmKeyStr = Deno.env.get("FCM_SERVICE_ACCOUNT_KEY");
    if (!fcmKeyStr) {
      return new Response(JSON.stringify({ error: "FCM_SERVICE_ACCOUNT_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const serviceAccount = JSON.parse(fcmKeyStr);
    const projectId = serviceAccount.project_id;

    // Get access token
    const accessToken = await getAccessToken(serviceAccount);

    // Build token query based on target
    let tokenQuery = supabaseAdmin
      .from("device_tokens")
      .select("token, user_id")
      .eq("is_active", true);

    if (target_type === "specific" && target_user_ids?.length) {
      tokenQuery = tokenQuery.in("user_id", target_user_ids);
    } else if (target_type === "role" && target_roles?.length) {
      const { data: roleUsers } = await supabaseAdmin
        .from("user_roles")
        .select("user_id")
        .in("role", target_roles);
      const userIds = (roleUsers || []).map((r: any) => r.user_id);
      if (userIds.length === 0) {
        return new Response(JSON.stringify({ success: true, sent_count: 0 }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      tokenQuery = tokenQuery.in("user_id", userIds);
    }

    const { data: tokens, error: tokenError } = await tokenQuery;
    if (tokenError) throw tokenError;

    if (!tokens || tokens.length === 0) {
      // Update campaign if provided
      if (campaign_id) {
        await supabaseAdmin
          .from("push_campaigns")
          .update({ status: "sent", sent_at: new Date().toISOString(), sent_count: 0 })
          .eq("id", campaign_id);
      }
      return new Response(JSON.stringify({ success: true, sent_count: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Send FCM v1 messages
    const fcmUrl = `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`;
    let sentCount = 0;
    const failedTokens: string[] = [];

    for (const { token: deviceToken } of tokens) {
      try {
        const res = await fetch(fcmUrl, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message: {
              token: deviceToken,
              notification: { title, body: messageBody },
              data: pushData || {},
              android: { priority: "high" },
              apns: {
                payload: { aps: { sound: "default", badge: 1 } },
              },
              webpush: {
                headers: { Urgency: "high" },
                notification: { icon: "/icon-192.svg" },
              },
            },
          }),
        });

        const result = await res.json();
        if (res.ok) {
          sentCount++;
        } else {
          console.error(`FCM send failed for token ${deviceToken.slice(0, 10)}...:`, result);
          // Mark invalid tokens
          if (result.error?.code === 404 || result.error?.details?.[0]?.errorCode === "UNREGISTERED") {
            failedTokens.push(deviceToken);
          }
        }
      } catch (e) {
        console.error(`Error sending to token:`, e);
      }
    }

    // Deactivate invalid tokens
    if (failedTokens.length > 0) {
      await supabaseAdmin
        .from("device_tokens")
        .update({ is_active: false })
        .in("token", failedTokens);
    }

    // Update campaign
    if (campaign_id) {
      await supabaseAdmin
        .from("push_campaigns")
        .update({
          status: "sent",
          sent_at: new Date().toISOString(),
          sent_count: sentCount,
        })
        .eq("id", campaign_id);
    }

    return new Response(
      JSON.stringify({ success: true, sent_count: sentCount, failed_count: failedTokens.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("send-push error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
