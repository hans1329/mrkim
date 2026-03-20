import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

/**
 * 정기 세무 신고 일정 정의
 * 각 항목은 신고 유형, 과세기간, 마감일, 생성 시작일 (마감일 60일 전쯤)
 */
interface FilingSchedule {
  filing_type: string;
  tax_period: string;
  deadline: string; // YYYY-MM-DD
  generate_after: string; // 이 날짜 이후부터 자동 생성
}

function getFilingSchedules(year: number): FilingSchedule[] {
  return [
    // 부가가치세 1기 예정 (1~3월) → 4/25
    {
      filing_type: "부가가치세 예정신고",
      tax_period: `${year}년 1기 (1월~3월)`,
      deadline: `${year}-04-25`,
      generate_after: `${year}-02-25`,
    },
    // 부가가치세 1기 확정 (1~6월) → 7/25
    {
      filing_type: "부가가치세 확정신고",
      tax_period: `${year}년 1기 (1월~6월)`,
      deadline: `${year}-07-25`,
      generate_after: `${year}-05-25`,
    },
    // 부가가치세 2기 예정 (7~9월) → 10/25
    {
      filing_type: "부가가치세 예정신고",
      tax_period: `${year}년 2기 (7월~9월)`,
      deadline: `${year}-10-25`,
      generate_after: `${year}-08-25`,
    },
    // 부가가치세 2기 확정 (7~12월) → 다음해 1/25
    {
      filing_type: "부가가치세 확정신고",
      tax_period: `${year}년 2기 (7월~12월)`,
      deadline: `${year + 1}-01-25`,
      generate_after: `${year}-11-25`,
    },
    // 종합소득세 → 5/31
    {
      filing_type: "종합소득세 신고",
      tax_period: `${year - 1}년 귀속`,
      deadline: `${year}-05-31`,
      generate_after: `${year}-03-31`,
    },
    // 원천세 (매월 10일) — 1월~12월분, 각각 다음달 10일 마감
    ...Array.from({ length: 12 }, (_, i) => {
      const month = i + 1;
      const deadlineMonth = month === 12 ? 1 : month + 1;
      const deadlineYear = month === 12 ? year + 1 : year;
      const paddedMonth = String(month).padStart(2, "0");
      const paddedDeadlineMonth = String(deadlineMonth).padStart(2, "0");
      // 마감 20일 전부터 생성
      const genDay = 20;
      const genMonth = month;
      const paddedGenMonth = String(genMonth).padStart(2, "0");
      return {
        filing_type: "원천세 신고",
        tax_period: `${year}년 ${paddedMonth}월분`,
        deadline: `${deadlineYear}-${paddedDeadlineMonth}-10`,
        generate_after: `${year}-${paddedGenMonth}-${String(genDay).padStart(2, "0")}`,
      };
    }),
    // 지방소득세 (종합소득세와 동일 기한) → 5/31
    {
      filing_type: "지방소득세 신고",
      tax_period: `${year - 1}년 귀속`,
      deadline: `${year}-05-31`,
      generate_after: `${year}-03-31`,
    },
  ];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];
    const currentYear = now.getFullYear();

    // 현재 시점에 해당하는 스케줄 (현재년도 + 전년도 2기 확정)
    const allSchedules = [
      ...getFilingSchedules(currentYear - 1),
      ...getFilingSchedules(currentYear),
    ];

    // generate_after <= today && deadline >= today 인 것만
    const activeSchedules = allSchedules.filter(
      (s) => s.generate_after <= todayStr && s.deadline >= todayStr
    );

    if (activeSchedules.length === 0) {
      return new Response(
        JSON.stringify({ message: "No active filing schedules", created: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 세무사가 배정된 모든 사용자 조회
    const { data: assignments, error: assignErr } = await supabase
      .from("tax_accountant_assignments")
      .select("user_id, accountant_id")
      .eq("status", "confirmed");

    if (assignErr) throw assignErr;
    if (!assignments || assignments.length === 0) {
      return new Response(
        JSON.stringify({ message: "No assigned users", created: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let createdCount = 0;

    for (const schedule of activeSchedules) {
      for (const assignment of assignments) {
        // 이미 동일한 filing_type + tax_period 태스크가 있는지 확인 (사용자가 만든 것 포함)
        const { data: existing } = await supabase
          .from("tax_filing_tasks")
          .select("id")
          .eq("user_id", assignment.user_id)
          .eq("filing_type", schedule.filing_type)
          .eq("tax_period", schedule.tax_period)
          .limit(1);

        if (existing && existing.length > 0) continue;

        // 사용자 프로필에서 연동 상태 확인하여 prepared_data 초기값 설정
        const { data: profile } = await supabase
          .from("profiles")
          .select(
            "hometax_connected, card_connected, account_connected, business_type"
          )
          .eq("user_id", assignment.user_id)
          .single();

        const preparedData: Record<string, boolean> = {
          invoice_ready: !!profile?.hometax_connected,
          card_ready: !!profile?.card_connected,
          purchase_ready:
            !!profile?.card_connected || !!profile?.account_connected,
          fixed_asset_ready: false,
          expense_ready:
            !!profile?.card_connected || !!profile?.account_connected,
          bank_ready: !!profile?.account_connected,
        };

        const { error: insertErr } = await supabase
          .from("tax_filing_tasks")
          .insert({
            user_id: assignment.user_id,
            accountant_id: assignment.accountant_id,
            filing_type: schedule.filing_type,
            tax_period: schedule.tax_period,
            deadline: schedule.deadline,
            status: "preparing",
            prepared_data: preparedData,
            review_notes: [],
            filing_method: "accountant",
          });

        if (insertErr) {
          console.error(
            `Failed to create task for ${assignment.user_id}:`,
            insertErr
          );
        } else {
          createdCount++;
        }
      }
    }

    console.log(`[generate-filing-tasks] Created ${createdCount} tasks`);

    return new Response(
      JSON.stringify({ success: true, created: createdCount }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[generate-filing-tasks] Error:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
