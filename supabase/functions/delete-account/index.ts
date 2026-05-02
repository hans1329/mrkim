import { createClient } from "https://esm.sh/@supabase/supabase-js@2.93.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function deleteAllUserData(admin: any, targetUserId: string) {
  const deleteQueries: Array<Promise<unknown>> = [
    admin.from("sync_logs").delete().eq("user_id", targetUserId),
    admin.from("sync_jobs").delete().eq("user_id", targetUserId),
    admin.from("connector_instances").delete().eq("user_id", targetUserId),
    admin.from("ai_call_logs").delete().eq("user_id", targetUserId),
    admin.from("ai_insights").delete().eq("user_id", targetUserId),
    admin.from("chat_messages").delete().eq("user_id", targetUserId),
    admin.from("notifications").delete().eq("user_id", targetUserId),
    admin.from("device_tokens").delete().eq("user_id", targetUserId),
    admin.from("auto_transfers").delete().eq("user_id", targetUserId),
    admin.from("deposits").delete().eq("user_id", targetUserId),
    admin.from("savings_accounts").delete().eq("user_id", targetUserId),
    admin.from("transactions").delete().eq("user_id", targetUserId),
    admin.from("tax_invoices").delete().eq("user_id", targetUserId),
    admin.from("tax_consultations").delete().eq("user_id", targetUserId),
    admin.from("tax_filing_tasks").delete().eq("user_id", targetUserId),
    admin.from("tax_accountant_assignments").delete().eq("user_id", targetUserId),
    admin.from("employee_praises").delete().eq("praiser_user_id", targetUserId),
    admin.from("employees").delete().eq("user_id", targetUserId),
    admin.from("delivery_orders").delete().eq("user_id", targetUserId),
    admin.from("delivery_settlements").delete().eq("user_id", targetUserId),
    admin.from("delivery_stores").delete().eq("user_id", targetUserId),
    admin.from("connected_accounts").delete().eq("user_id", targetUserId),
    admin.from("hometax_sync_status").delete().eq("user_id", targetUserId),
    admin.from("user_feedback").delete().eq("user_id", targetUserId),
    admin.from("user_roles").delete().eq("user_id", targetUserId),
    admin.from("profiles").delete().eq("user_id", targetUserId),
  ];

  await Promise.allSettled(deleteQueries);

  // auth 계정 삭제 (이미 삭제된 경우 무시)
  try {
    await admin.auth.admin.deleteUser(targetUserId);
  } catch (_e) {
    // auth user가 이미 없을 수 있음 (탈퇴 추정 회원)
  }
}

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

    // 호출자 인증
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

    // body에서 targetUserId 확인 (관리자 강제 탈퇴용)
    let body: any = {};
    try {
      body = await req.json();
    } catch (_e) {
      // body 없으면 자기 자신 탈퇴
    }

    const targetUserId = body?.targetUserId;

    if (targetUserId && targetUserId !== user.id) {
      // 관리자 권한 확인
      const { data: roleData } = await admin
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .single();

      if (!roleData) {
        return new Response(JSON.stringify({ error: "관리자 권한이 필요합니다." }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // 관리자가 자기 자신을 강제 탈퇴하는 것 방지
      if (targetUserId === user.id) {
        return new Response(JSON.stringify({ error: "자기 자신은 강제 탈퇴할 수 없습니다." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      await deleteAllUserData(admin, targetUserId);
    } else {
      // 본인 탈퇴
      await deleteAllUserData(admin, user.id);
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
