import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Employee {
  id: string;
  user_id: string;
  name: string;
  phone: string | null;
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
  salary_day: number | null;
  created_at: string;
  updated_at: string;
}

export interface EmployeeInsert {
  name: string;
  phone?: string;
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
  salary_day?: number;
  source?: "hometax" | "manual";
  external_id?: string;
}

export interface EmployeeUpdate {
  id: string;
  name?: string;
  phone?: string | null;
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
  salary_day?: number | null;
  source?: "hometax" | "manual";
  external_id?: string;
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
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
    refetchOnWindowFocus: false,
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
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
    refetchOnWindowFocus: false,
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
          phone: input.phone || null,
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
          source: input.source || "manual",
          external_id: input.external_id || null,
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

/**
 * 홈택스 동기화 시 중복 직원 찾기
 * 이름이 동일한 기존 직원을 찾아 반환
 */
export function useFindDuplicateEmployee() {
  return useMutation({
    mutationFn: async (name: string): Promise<Employee | null> => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return null;

      const { data, error } = await supabase
        .from("employees")
        .select("*")
        .eq("user_id", userData.user.id)
        .eq("name", name)
        .eq("status", "재직")
        .limit(1);

      if (error) throw error;
      return data && data.length > 0 ? (data[0] as Employee) : null;
    },
  });
}

/**
 * 기존 직원에 홈택스 데이터 병합
 */
export function useMergeEmployee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      existingId,
      hometaxData,
    }: {
      existingId: string;
      hometaxData: {
        external_id: string;
        monthly_salary?: number;
        start_date?: string;
        employee_type?: "정규직" | "계약직" | "알바";
        position?: string;
      };
    }) => {
      // 기존 데이터는 유지하면서 홈택스 데이터로 업데이트
      const updatePayload: Record<string, unknown> = {
        source: "hometax",
        external_id: hometaxData.external_id,
      };

      // 홈택스에서 가져온 정보가 있으면 업데이트 (기존 값이 없을 때만)
      if (hometaxData.monthly_salary) {
        updatePayload.monthly_salary = hometaxData.monthly_salary;
      }
      if (hometaxData.start_date) {
        updatePayload.start_date = hometaxData.start_date;
      }
      if (hometaxData.employee_type) {
        updatePayload.employee_type = hometaxData.employee_type;
      }

      const { data, error } = await supabase
        .from("employees")
        .update(updatePayload)
        .eq("id", existingId)
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

/**
 * 홈택스에서 가져온 직원 새로 등록
 */
export function useAddHometaxEmployee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      name: string;
      external_id: string;
      monthly_salary?: number;
      start_date?: string;
      employee_type?: "정규직" | "계약직" | "알바";
      position?: string;
      department?: string;
    }) => {
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
          monthly_salary: input.monthly_salary || null,
          start_date: input.start_date || null,
          source: "hometax",
          external_id: input.external_id,
          insurance_national_pension: true,
          insurance_health: true,
          insurance_employment: true,
          insurance_industrial: true,
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
