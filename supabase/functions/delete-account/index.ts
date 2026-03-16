import { createClient } from "https://esm.sh/@supabase/supabase-js@2.93.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
      throw new Error("Supabase 환경 변수가 누락되었습니다.");
    }

    const authHeader = req.headers.get("Authorization");
    const token = authHeader?.replace("Bearer ", "");
    if (!token) {
      return new Response(JSON.stringify({ error: "인증이 필요합니다." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const anonClient = createClient(supabaseUrl, supabaseAnonKey);
    const {
      data: { user },
      error: authError,
    } = await anonClient.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "사용자 인증에 실패했습니다." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, serviceRoleKey);
    const userId = user.id;

    const deleteQueries: Array<Promise<unknown>> = [
      admin.from("sync_logs").delete().eq("user_id", userId),
      admin.from("sync_jobs").delete().eq("user_id", userId),
      admin.from("connector_instances").delete().eq("user_id", userId),
      admin.from("ai_call_logs").delete().eq("user_id", userId),
      admin.from("ai_insights").delete().eq("user_id", userId),
      admin.from("chat_messages").delete().eq("user_id", userId),
      admin.from("notifications").delete().eq("user_id", userId),
      admin.from("device_tokens").delete().eq("user_id", userId),
      admin.from("auto_transfers").delete().eq("user_id", userId),
      admin.from("deposits").delete().eq("user_id", userId),
      admin.from("savings_accounts").delete().eq("user_id", userId),
      admin.from("transactions").delete().eq("user_id", userId),
      admin.from("tax_invoices").delete().eq("user_id", userId),
      admin.from("tax_consultations").delete().eq("user_id", userId),
      admin.from("tax_filing_tasks").delete().eq("user_id", userId),
      admin.from("tax_accountant_assignments").delete().eq("user_id", userId),
      admin.from("employee_praises").delete().eq("praiser_user_id", userId),
      admin.from("employees").delete().eq("user_id", userId),
      admin.from("delivery_orders").delete().eq("user_id", userId),
      admin.from("delivery_settlements").delete().eq("user_id", userId),
      admin.from("delivery_stores").delete().eq("user_id", userId),
      admin.from("connected_accounts").delete().eq("user_id", userId),
      admin.from("hometax_sync_status").delete().eq("user_id", userId),
      admin.from("user_feedback").delete().eq("user_id", userId),
      admin.from("user_roles").delete().eq("user_id", userId),
      admin.from("profiles").delete().eq("user_id", userId),
    ];

    const results = await Promise.allSettled(deleteQueries);
    const failed = results.find((result) => result.status === "rejected");
    if (failed && failed.status === "rejected") {
      throw failed.reason;
    }

    const { error: deleteUserError } = await admin.auth.admin.deleteUser(userId);
    if (deleteUserError) {
      throw new Error(`Auth 계정 삭제 실패: ${deleteUserError.message}`);
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("delete-account error", error);
    return new Response(JSON.stringify({ error: error.message || "회원 탈퇴 처리에 실패했습니다." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
