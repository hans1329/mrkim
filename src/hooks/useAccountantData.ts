import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface ClientInfo {
  user_id: string;
  status: string;
  assigned_at: string;
  profile?: {
    name: string | null;
    business_name: string | null;
    business_type: string | null;
    phone: string | null;
    business_registration_number: string | null;
  };
}

interface Consultation {
  id: string;
  user_id: string;
  subject: string;
  user_question: string;
  ai_preliminary_answer: string | null;
  accountant_response: string | null;
  status: string;
  consultation_type: string;
  created_at: string;
  responded_at: string | null;
  data_package: Record<string, unknown>;
}

interface FilingTask {
  id: string;
  user_id: string;
  filing_type: string;
  tax_period: string;
  deadline: string;
  status: string;
  prepared_data: Record<string, unknown>;
  review_notes: unknown[];
  filing_method: string | null;
  submitted_at: string | null;
  created_at: string;
}

export function useAccountantData(accountantId: string) {
  const [clients, setClients] = useState<ClientInfo[]>([]);
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [filingTasks, setFilingTasks] = useState<FilingTask[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    try {
      const [assignmentsRes, consultationsRes, filingsRes] = await Promise.all([
        supabase
          .from("tax_accountant_assignments")
          .select("*")
          .eq("accountant_id", accountantId)
          .eq("status", "confirmed"),
        supabase
          .from("tax_consultations")
          .select("*")
          .eq("accountant_id", accountantId)
          .order("created_at", { ascending: false })
          .limit(50),
        supabase
          .from("tax_filing_tasks")
          .select("*")
          .eq("accountant_id", accountantId)
          .order("deadline", { ascending: true })
          .limit(50),
      ]);

      const assignments = (assignmentsRes.data || []) as unknown as ClientInfo[];

      // Fetch profiles for each client
      if (assignments.length > 0) {
        const userIds = assignments.map(a => a.user_id);
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, name, business_name, business_type, phone, business_registration_number")
          .in("user_id", userIds);

        if (profiles) {
          const profileMap = new Map(profiles.map(p => [p.user_id, p]));
          assignments.forEach(a => {
            a.profile = profileMap.get(a.user_id) || undefined;
          });
        }
      }

      setClients(assignments);
      setConsultations((consultationsRes.data || []) as unknown as Consultation[]);
      setFilingTasks((filingsRes.data || []) as unknown as FilingTask[]);
    } catch (e) {
      console.error("Failed to fetch accountant data:", e);
    } finally {
      setLoading(false);
    }
  }, [accountantId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  return { clients, consultations, filingTasks, loading, refetch: fetchAll };
}
