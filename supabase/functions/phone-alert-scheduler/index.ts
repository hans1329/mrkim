import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

/**
 * Phone Alert Scheduler
 * - Called every hour by pg_cron
 * - Checks which users have phone alerts enabled for the current KST hour
 * - Generates alert scripts based on configured items
 * - Triggers outbound calls via Twilio with the user's secretary voice
 */

const ALERT_ITEM_LABELS: Record<string, string> = {
  tax_deadline: "세금 납부 마감",
  large_transaction: "대규모 입출금",
  salary_reminder: "급여 지급일",
  sales_spike: "매출 급변동",
};

const DAY_MAP: Record<number, string> = {
  0: "sun", 1: "mon", 2: "tue", 3: "wed", 4: "thu", 5: "fri", 6: "sat",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Current time in KST (UTC+9)
    const now = new Date();
    const kstHour = (now.getUTCHours() + 9) % 24;
    const kstDay = new Date(now.getTime() + 9 * 60 * 60 * 1000).getDay();
    const todayDayId = DAY_MAP[kstDay];
    const currentHourStr = String(kstHour);

    console.log(`[phone-alert-scheduler] Running at KST hour=${kstHour}, day=${todayDayId}`);

    // 1. Find users with phone alerts enabled
    const { data: profiles, error: profilesErr } = await supabase
      .from("profiles")
      .select("user_id, name, secretary_name, secretary_voice_id, phone, secretary_phone, phone_alert_enabled, phone_alert_items, phone_alert_times, phone_alert_custom_message, phone_alert_custom_days, phone_alert_custom_time, phone_alert_custom_repeat")
      .eq("phone_alert_enabled", true)
      .not("secretary_phone", "is", null);

    if (profilesErr) throw profilesErr;
    if (!profiles || profiles.length === 0) {
      console.log("[phone-alert-scheduler] No users with phone alerts enabled");
      return new Response(JSON.stringify({ processed: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let callsMade = 0;

    for (const profile of profiles) {
      try {
        const alertTimes: string[] = (profile.phone_alert_times as string[]) || [];
        const alertItems: string[] = (profile.phone_alert_items as string[]) || [];
        const customDays: string[] = (profile.phone_alert_custom_days as string[]) || [];
        const customTime = profile.phone_alert_custom_time || "";
        const customMessage = profile.phone_alert_custom_message || "";

        // Check if current hour matches any standard alert time
        const isStandardAlertTime = alertTimes.includes(currentHourStr);

        // Check if current hour/day matches custom alert
        const isCustomAlertTime =
          customMessage &&
          customTime === currentHourStr &&
          customDays.includes(todayDayId);

        if (!isStandardAlertTime && !isCustomAlertTime) continue;

        const userName = profile.name || "사장님";
        const secretaryName = profile.secretary_name || "김비서";
        const scriptParts: string[] = [];

        // Standard alerts
        if (isStandardAlertTime && alertItems.length > 0) {
          const alertData = await gatherAlertData(supabase, profile.user_id, alertItems);
          if (alertData.length > 0) {
            scriptParts.push(
              `${userName}님 안녕하세요, ${secretaryName}입니다.`,
              ...alertData
            );
          }
        }

        // Custom message alert
        if (isCustomAlertTime) {
          if (scriptParts.length === 0) {
            scriptParts.push(`${userName}님 안녕하세요, ${secretaryName}입니다.`);
          }
          scriptParts.push(`알림 드릴 내용이 있습니다. ${customMessage}`);
        }

        if (scriptParts.length === 0) continue;

        scriptParts.push("이상입니다. 좋은 하루 보내세요!");
        const script = scriptParts.join(" ");

        // Trigger the outbound call
        // secretary_phone을 phone 대신 사용
        const callProfile = { ...profile, phone: profile.secretary_phone || profile.phone };
        await makeOutboundCall(supabase, callProfile, script);
        callsMade++;
        console.log(`[phone-alert-scheduler] Call triggered for user ${profile.user_id}`);

        // 1회만 모드: 커스텀 알림 발신 후 비활성화
        if (isCustomAlertTime && profile.phone_alert_custom_repeat === false) {
          await supabase
            .from("profiles")
            .update({
              phone_alert_custom_message: null,
              phone_alert_custom_days: null,
              phone_alert_custom_time: null,
            })
            .eq("user_id", profile.user_id);
          console.log(`[phone-alert-scheduler] One-time custom alert cleared for user ${profile.user_id}`);
        }
      } catch (userErr) {
        console.error(`[phone-alert-scheduler] Error for user ${profile.user_id}:`, userErr);
      }
    }

    return new Response(JSON.stringify({ processed: callsMade }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[phone-alert-scheduler] Fatal error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function gatherAlertData(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  items: string[]
): Promise<string[]> {
  const parts: string[] = [];
  const today = new Date();
  const kstNow = new Date(today.getTime() + 9 * 60 * 60 * 1000);
  const todayStr = kstNow.toISOString().split("T")[0];

  for (const item of items) {
    try {
      switch (item) {
        case "large_transaction": {
          // Check for large transactions in the last 24 hours
          const yesterday = new Date(kstNow.getTime() - 24 * 60 * 60 * 1000)
            .toISOString();
          
          // 사용자별 기준 금액 조회
          const { data: profileData } = await supabase
            .from("profiles")
            .select("large_transaction_threshold")
            .eq("user_id", userId)
            .single();
          const threshold = (profileData as any)?.large_transaction_threshold ?? 1000000;
          
          const { data: txns } = await supabase
            .from("transactions")
            .select("amount, type, description")
            .eq("user_id", userId)
            .gte("created_at", yesterday)
            .order("amount", { ascending: false })
            .limit(5);

          if (txns && txns.length > 0) {
            const largeTxns = txns.filter((t: any) => Math.abs(t.amount) >= threshold);
            if (largeTxns.length > 0) {
              const summary = largeTxns
                .map((t: any) => {
                  const amountStr = Math.abs(t.amount).toLocaleString();
                  return `${t.description} ${amountStr}원 ${t.type === "income" ? "입금" : "출금"}`;
                })
                .join(", ");
              parts.push(`대규모 거래 알림입니다. ${summary}이 있었습니다.`);
            }
          }
          break;
        }
        case "tax_deadline": {
          // Check if tax deadline is approaching (매월 25일 부가세 등)
          const dayOfMonth = kstNow.getDate();
          if (dayOfMonth >= 20 && dayOfMonth <= 25) {
            parts.push("세금 납부 마감일이 다가오고 있습니다. 확인 부탁드립니다.");
          }
          break;
        }
        case "salary_reminder": {
          // Check if salary day is approaching (usually 10th or 25th)
          const day = kstNow.getDate();
          if (day === 9 || day === 24) {
            const { count } = await supabase
              .from("employees")
              .select("*", { count: "exact", head: true })
              .eq("user_id", userId)
              .eq("status", "재직");
            if (count && count > 0) {
              parts.push(`내일은 급여일입니다. 현재 재직 중인 직원 ${count}명의 급여 지급을 준비해주세요.`);
            }
          }
          break;
        }
        case "sales_spike": {
          // Compare today's sales vs 7-day average
          const weekAgo = new Date(kstNow.getTime() - 7 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split("T")[0];
          const { data: recentSales } = await supabase
            .from("transactions")
            .select("amount, transaction_date")
            .eq("user_id", userId)
            .eq("type", "income")
            .gte("transaction_date", weekAgo);

          if (recentSales && recentSales.length > 0) {
            const todaySales = recentSales
              .filter((t: any) => t.transaction_date === todayStr)
              .reduce((sum: number, t: any) => sum + t.amount, 0);
            const pastSales = recentSales
              .filter((t: any) => t.transaction_date !== todayStr);
            const avgDaily = pastSales.length > 0
              ? pastSales.reduce((sum: number, t: any) => sum + t.amount, 0) / 7
              : 0;

            if (avgDaily > 0 && todaySales > avgDaily * 1.5) {
              parts.push(
                `오늘 매출이 ${todaySales.toLocaleString()}원으로, 평균 대비 크게 증가했습니다.`
              );
            } else if (avgDaily > 0 && todaySales < avgDaily * 0.5 && todaySales > 0) {
              parts.push(
                `오늘 매출이 ${todaySales.toLocaleString()}원으로, 평균 대비 감소했습니다. 확인해보시기 바랍니다.`
              );
            }
          }
          break;
        }
      }
    } catch (e) {
      console.error(`[phone-alert-scheduler] Error gathering ${item}:`, e);
    }
  }

  return parts;
}

async function makeOutboundCall(
  supabase: ReturnType<typeof createClient>,
  profile: any,
  script: string
) {
  const elevenLabsApiKey = Deno.env.get("ELEVENLABS_API_KEY");
  const twilioAccountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
  const twilioAuthToken = Deno.env.get("TWILIO_AUTH_TOKEN");
  const twilioPhoneNumber = Deno.env.get("TWILIO_PHONE_NUMBER");

  if (!elevenLabsApiKey || !twilioAccountSid || !twilioAuthToken || !twilioPhoneNumber) {
    throw new Error("Missing required API credentials");
  }

  const voiceId = profile.secretary_voice_id || "uyVNoMrnUku1dZyVEXwD";

  // 1. Create call log
  const { data: callLog, error: logErr } = await supabase
    .from("ai_call_logs")
    .insert({
      user_id: profile.user_id,
      call_type: "scheduled_alert",
      recipient_phone: profile.phone,
      recipient_name: profile.name || null,
      script,
      status: "pending",
    })
    .select()
    .single();

  if (logErr) throw logErr;

  // 2. Generate TTS with user's secretary voice
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
    await supabase.from("ai_call_logs").update({ status: "failed", error_message: `TTS failed: ${errText}` }).eq("id", callLog.id);
    throw new Error(`TTS failed: ${errText}`);
  }

  const audioBuffer = await ttsResponse.arrayBuffer();

  // 3. Upload audio
  const audioFileName = `call-audio/${callLog.id}.mp3`;
  const { error: uploadErr } = await supabase.storage
    .from("voice-previews")
    .upload(audioFileName, audioBuffer, { contentType: "audio/mpeg", upsert: true });

  if (uploadErr) throw uploadErr;

  const { data: publicUrl } = supabase.storage.from("voice-previews").getPublicUrl(audioFileName);

  await supabase.from("ai_call_logs").update({ tts_audio_url: publicUrl.publicUrl, status: "calling" }).eq("id", callLog.id);

  // 4. Make Twilio call
  const twiml = `<Response><Play>${publicUrl.publicUrl}</Play></Response>`;
  const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Calls.json`;
  const twilioAuth = btoa(`${twilioAccountSid}:${twilioAuthToken}`);

  const formData = new URLSearchParams();
  formData.append("To", profile.phone);
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
    await supabase.from("ai_call_logs").update({
      status: "failed",
      error_message: `Twilio error: ${twilioResult.message}`,
    }).eq("id", callLog.id);
    throw new Error(`Twilio failed: ${twilioResult.message}`);
  }

  await supabase.from("ai_call_logs").update({
    status: "calling",
    twilio_call_sid: twilioResult.sid,
  }).eq("id", callLog.id);
}
