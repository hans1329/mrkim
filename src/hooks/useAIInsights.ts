import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface AIInsight {
  id: string;
  user_id: string;
  type: "suggestion" | "warning" | "positive" | "action";
  priority: "high" | "medium" | "low";
  title: string;
  description: string;
  impact: string | null;
  data_snapshot: Record<string, unknown> | null;
  generated_at: string;
  expires_at: string;
  created_at: string;
}

export function useAIInsights() {
  return useQuery({
    queryKey: ["ai-insights"],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return [];

      const { data, error } = await supabase
        .from("ai_insights")
        .select("*")
        .eq("user_id", userData.user.id)
        .order("priority", { ascending: true }) // high first
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as AIInsight[];
    },
  });
}

export function useGenerateInsights() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) throw new Error("로그인이 필요합니다");

      const response = await fetch(
        `https://kuxpsfxkumbfuqsvcucx.supabase.co/functions/v1/generate-insights`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${sessionData.session.access_token}`,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "인사이트 생성 실패");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai-insights"] });
    },
  });
}
