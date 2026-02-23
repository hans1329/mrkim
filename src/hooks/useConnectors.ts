import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Connector {
  id: string;
  name: string;
  description: string | null;
  category: string;
  provider: string;
  icon: string | null;
  is_active: boolean;
  display_order: number;
}

export interface ConnectorInstance {
  id: string;
  user_id: string;
  connector_id: string;
  status: "pending" | "connected" | "failed" | "expired" | "disconnected";
  status_message: string | null;
  connected_id: string | null;
  credentials_meta: Record<string, unknown> | null;
  last_sync_at: string | null;
  next_sync_at: string | null;
  sync_interval_minutes: number | null;
  created_at: string;
  updated_at: string;
}

export interface SyncJob {
  id: string;
  instance_id: string;
  user_id: string;
  job_type: "full" | "delta" | "retry";
  status: "pending" | "running" | "completed" | "failed" | "cancelled";
  retry_count: number;
  max_retries: number;
  records_fetched: number | null;
  records_saved: number | null;
  error_code: string | null;
  error_message: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

// 커넥터 레지스트리 조회
export function useConnectors() {
  return useQuery({
    queryKey: ["connectors"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("connectors")
        .select("*")
        .eq("is_active", true)
        .order("display_order");
      if (error) throw error;
      return data as Connector[];
    },
  });
}

// 사용자별 연동 인스턴스 조회
export function useConnectorInstances() {
  return useQuery({
    queryKey: ["connector_instances"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("connector_instances")
        .select("*")
        .order("created_at");
      if (error) throw error;
      return data as ConnectorInstance[];
    },
  });
}

// 커넥터 + 인스턴스 결합 뷰
export function useConnectorStatus() {
  const connectors = useConnectors();
  const instances = useConnectorInstances();

  const statusMap = new Map<string, ConnectorInstance>();
  instances.data?.forEach((inst) => statusMap.set(inst.connector_id, inst));

  const combined = connectors.data?.map((connector) => ({
    ...connector,
    instance: statusMap.get(connector.id) || null,
  }));

  return {
    data: combined,
    isLoading: connectors.isLoading || instances.isLoading,
    error: connectors.error || instances.error,
  };
}

// 커넥터 인스턴스 생성/업데이트
export function useUpsertConnectorInstance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      connector_id: string;
      status: ConnectorInstance["status"];
      connected_id?: string;
      status_message?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("로그인이 필요합니다");

      const { data, error } = await supabase
        .from("connector_instances")
        .upsert(
          {
            user_id: user.id,
            connector_id: params.connector_id,
            status: params.status,
            connected_id: params.connected_id || null,
            status_message: params.status_message || null,
          },
          { onConflict: "user_id,connector_id" }
        )
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["connector_instances"] });
    },
  });
}

// 최근 동기화 작업 조회
export function useSyncJobs(instanceId?: string) {
  return useQuery({
    queryKey: ["sync_jobs", instanceId],
    enabled: !!instanceId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sync_jobs")
        .select("*")
        .eq("instance_id", instanceId!)
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data as SyncJob[];
    },
  });
}
