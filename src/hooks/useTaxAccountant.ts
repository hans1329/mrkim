import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface TaxAccountant {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  firm_name: string | null;
  specialties: string[];
  industry_types: string[];
  region: string | null;
  bio: string | null;
  profile_image_url: string | null;
  pricing_info: Record<string, unknown>;
}

export interface TaxAccountantAssignment {
  id: string;
  user_id: string;
  accountant_id: string;
  status: string;
  assigned_at: string;
  confirmed_at: string | null;
  accountant?: TaxAccountant;
}

export interface TaxConsultation {
  id: string;
  user_id: string;
  accountant_id: string | null;
  consultation_type: string;
  subject: string;
  user_question: string;
  ai_preliminary_answer: string | null;
  data_package: Record<string, unknown>;
  status: string;
  accountant_response: string | null;
  email_sent_at: string | null;
  created_at: string;
  responded_at: string | null;
}

export interface TaxFilingTask {
  id: string;
  user_id: string;
  accountant_id: string | null;
  filing_type: string;
  tax_period: string;
  deadline: string;
  status: string;
  prepared_data: Record<string, unknown>;
  review_notes: unknown[];
  filing_method: string;
  notified_at: string | null;
  submitted_at: string | null;
  created_at: string;
}

export function useTaxAccountant() {
  const [accountants, setAccountants] = useState<TaxAccountant[]>([]);
  const [assignment, setAssignment] = useState<TaxAccountantAssignment | null>(null);
  const [consultations, setConsultations] = useState<TaxConsultation[]>([]);
  const [filingTasks, setFilingTasks] = useState<TaxFilingTask[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const [accountantsRes, assignmentRes, consultationsRes, filingsRes] = await Promise.all([
        supabase.from("tax_accountants").select("*").eq("is_active", true),
        supabase.from("tax_accountant_assignments").select("*").eq("user_id", user.id).eq("status", "confirmed").limit(1).maybeSingle(),
        supabase.from("tax_consultations").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(20),
        supabase.from("tax_filing_tasks").select("*").eq("user_id", user.id).order("deadline", { ascending: true }).limit(10),
      ]);

      if (accountantsRes.data) setAccountants(accountantsRes.data as unknown as TaxAccountant[]);
      if (assignmentRes.data) {
        const a = assignmentRes.data as unknown as TaxAccountantAssignment;
        // Attach accountant info
        const matched = (accountantsRes.data as unknown as TaxAccountant[])?.find(ac => ac.id === a.accountant_id);
        if (matched) a.accountant = matched;
        setAssignment(a);
      }
      if (consultationsRes.data) setConsultations(consultationsRes.data as unknown as TaxConsultation[]);
      if (filingsRes.data) setFilingTasks(filingsRes.data as unknown as TaxFilingTask[]);
    } catch (e) {
      console.error("Failed to fetch tax accountant data:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const selectAccountant = async (accountantId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("로그인이 필요합니다");

      // 기존 배정 있으면 업데이트, 없으면 생성
      const { data, error } = await supabase
        .from("tax_accountant_assignments")
        .upsert({
          user_id: user.id,
          accountant_id: accountantId,
          status: "confirmed",
          confirmed_at: new Date().toISOString(),
        }, { onConflict: "user_id,accountant_id" })
        .select()
        .single();

      if (error) throw error;
      
      const matched = accountants.find(a => a.id === accountantId);
      const newAssignment = data as unknown as TaxAccountantAssignment;
      if (matched) newAssignment.accountant = matched;
      setAssignment(newAssignment);
      
      toast.success(`${matched?.name || "세무사"}님이 담당 세무사로 배정되었습니다`);
      return true;
    } catch (e) {
      console.error("Failed to assign accountant:", e);
      toast.error("세무사 배정에 실패했습니다");
      return false;
    }
  };

  const removeAssignment = async () => {
    if (!assignment) return;
    try {
      const { error } = await supabase
        .from("tax_accountant_assignments")
        .delete()
        .eq("id", assignment.id);
      if (error) throw error;
      setAssignment(null);
      toast.success("세무사 배정이 해제되었습니다");
    } catch (e) {
      console.error("Failed to remove assignment:", e);
      toast.error("배정 해제에 실패했습니다");
    }
  };

  const createConsultation = async (subject: string, question: string, aiAnswer?: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("로그인이 필요합니다");

      const { data, error } = await supabase
        .from("tax_consultations")
        .insert({
          user_id: user.id,
          accountant_id: assignment?.accountant_id || null,
          subject,
          user_question: question,
          ai_preliminary_answer: aiAnswer || null,
          consultation_type: "ad_hoc",
          status: "pending",
        })
        .select()
        .single();

      if (error) throw error;
      setConsultations(prev => [data as unknown as TaxConsultation, ...prev]);
      return data as unknown as TaxConsultation;
    } catch (e) {
      console.error("Failed to create consultation:", e);
      toast.error("상담 요청에 실패했습니다");
      return null;
    }
  };

  return {
    accountants,
    assignment,
    consultations,
    filingTasks,
    loading,
    selectAccountant,
    removeAssignment,
    createConsultation,
    refetch: fetchAll,
  };
}
