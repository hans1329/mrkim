import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Employee {
  id: string;
  user_id: string;
  name: string;
  employee_type: "정규직" | "계약직" | "알바";
  position: string | null;
  department: string | null;
  weekly_hours: number | null;
  hourly_rate: number | null;
  monthly_salary: number | null;
  insurance_national_pension: boolean;
  insurance_health: boolean;
  insurance_employment: boolean;
  insurance_industrial: boolean;
  start_date: string | null;
  end_date: string | null;
  status: "재직" | "퇴사";
  source: "hometax" | "manual";
  external_id: string | null;
  memo: string | null;
  created_at: string;
  updated_at: string;
}

export interface EmployeeInsert {
  name: string;
  employee_type?: "정규직" | "계약직" | "알바";
  position?: string;
  department?: string;
  weekly_hours?: number;
  hourly_rate?: number;
  monthly_salary?: number;
  insurance_national_pension?: boolean;
  insurance_health?: boolean;
  insurance_employment?: boolean;
  insurance_industrial?: boolean;
  start_date?: string;
  memo?: string;
}

export interface EmployeeUpdate {
  id: string;
  name?: string;
  employee_type?: "정규직" | "계약직" | "알바";
  position?: string;
  department?: string;
  weekly_hours?: number;
  hourly_rate?: number;
  monthly_salary?: number;
  insurance_national_pension?: boolean;
  insurance_health?: boolean;
  insurance_employment?: boolean;
  insurance_industrial?: boolean;
  start_date?: string;
  end_date?: string;
  status?: "재직" | "퇴사";
  memo?: string;
}

export function useEmployees(options?: { status?: "재직" | "퇴사" }) {
  return useQuery({
    queryKey: ["employees", options?.status],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return [];

      let query = supabase
        .from("employees")
        .select("*")
        .eq("user_id", userData.user.id)
        .order("created_at", { ascending: false });

      if (options?.status) {
        query = query.eq("status", options.status);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Employee[];
    },
  });
}

export function useEmployeeStats() {
  return useQuery({
    queryKey: ["employee-stats"],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return { activeCount: 0, totalSalary: 0, insuredCount: 0 };

      const { data, error } = await supabase
        .from("employees")
        .select("*")
        .eq("user_id", userData.user.id)
        .eq("status", "재직");

      if (error) throw error;

      const employees = data as Employee[];
      const activeCount = employees.length;
      const totalSalary = employees.reduce((sum, e) => sum + (e.monthly_salary || 0), 0);
      const insuredCount = employees.filter(
        (e) => e.insurance_national_pension && e.insurance_health && e.insurance_employment && e.insurance_industrial
      ).length;

      return { activeCount, totalSalary, insuredCount };
    },
  });
}

export function useAddEmployee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: EmployeeInsert) => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("로그인이 필요합니다");

      const { data, error } = await supabase
        .from("employees")
        .insert({
          user_id: userData.user.id,
          name: input.name,
          employee_type: input.employee_type || "정규직",
          position: input.position || null,
          department: input.department || null,
          weekly_hours: input.weekly_hours || null,
          hourly_rate: input.hourly_rate || null,
          monthly_salary: input.monthly_salary || null,
          insurance_national_pension: input.insurance_national_pension || false,
          insurance_health: input.insurance_health || false,
          insurance_employment: input.insurance_employment || false,
          insurance_industrial: input.insurance_industrial || false,
          start_date: input.start_date || new Date().toISOString().split("T")[0],
          source: "manual",
          memo: input.memo || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      queryClient.invalidateQueries({ queryKey: ["employee-stats"] });
    },
  });
}

export function useUpdateEmployee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: EmployeeUpdate) => {
      const { id, ...updates } = input;
      const { data, error } = await supabase
        .from("employees")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      queryClient.invalidateQueries({ queryKey: ["employee-stats"] });
    },
  });
}

export function useResignEmployee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (employeeId: string) => {
      const { data, error } = await supabase
        .from("employees")
        .update({
          status: "퇴사",
          end_date: new Date().toISOString().split("T")[0],
        })
        .eq("id", employeeId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      queryClient.invalidateQueries({ queryKey: ["employee-stats"] });
    },
  });
}
