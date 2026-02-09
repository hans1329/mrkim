import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface EmployeePraise {
  id: string;
  praiser_user_id: string;
  employee_name: string;
  employee_phone: string;
  tags: string[];
  comment: string | null;
  created_at: string;
}

export const PRAISE_TAGS = [
  "성실함", "친절함", "팀워크", "시간준수",
  "책임감", "빠른학습", "꼼꼼함", "리더십",
] as const;

export function useEmployeePraises(employeeName?: string, employeePhone?: string) {
  return useQuery({
    queryKey: ["employee-praises", employeeName, employeePhone],
    queryFn: async () => {
      if (!employeeName || !employeePhone) return [];

      const { data, error } = await supabase
        .from("employee_praises")
        .select("*")
        .eq("employee_name", employeeName)
        .eq("employee_phone", employeePhone)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as EmployeePraise[];
    },
    enabled: !!employeeName && !!employeePhone,
  });
}

export function useAddPraise() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      employee_name: string;
      employee_phone: string;
      tags: string[];
      comment?: string;
    }) => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("로그인이 필요합니다");

      const { data, error } = await supabase
        .from("employee_praises")
        .insert({
          praiser_user_id: userData.user.id,
          employee_name: input.employee_name,
          employee_phone: input.employee_phone,
          tags: input.tags,
          comment: input.comment || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employee-praises"] });
    },
  });
}

/** 특정 직원의 칭찬 개수만 빠르게 조회 */
export function usePraiseCount(employeeName?: string, employeePhone?: string) {
  return useQuery({
    queryKey: ["praise-count", employeeName, employeePhone],
    queryFn: async () => {
      if (!employeeName || !employeePhone) return 0;

      const { count, error } = await supabase
        .from("employee_praises")
        .select("*", { count: "exact", head: true })
        .eq("employee_name", employeeName)
        .eq("employee_phone", employeePhone);

      if (error) throw error;
      return count || 0;
    },
    enabled: !!employeeName && !!employeePhone,
  });
}
