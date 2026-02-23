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

// 커넥터 + 인스턴스 결합 뷰 (다중 인스턴스 지원)
export function useConnectorStatus() {
  const connectors = useConnectors();
  const instances = useConnectorInstances();

  // 커넥터별로 모든 인스턴스 그룹핑
  const instancesMap = new Map<string, ConnectorInstance[]>();
  instances.data?.forEach((inst) => {
    const list = instancesMap.get(inst.connector_id) || [];
    list.push(inst);
    instancesMap.set(inst.connector_id, list);
  });

  const combined = connectors.data?.map((connector) => ({
    ...connector,
    instance: instancesMap.get(connector.id)?.[0] || null, // 하위호환: 첫 번째 인스턴스
    instances: instancesMap.get(connector.id) || [], // 전체 인스턴스 목록
  }));

  return {
    data: combined,
    isLoading: connectors.isLoading || instances.isLoading,
    error: connectors.error || instances.error,
  };
}

// 커넥터 인스턴스 생성/업데이트 (다중 인스턴스 지원)
export function useUpsertConnectorInstance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      connector_id: string;
      status: ConnectorInstance["status"];
      connected_id?: string;
      status_message?: string;
      credentials_meta?: Record<string, unknown>;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("로그인이 필요합니다");

      // connected_id가 있으면 해당 인스턴스를 찾아서 업데이트, 없으면 새로 생성
      if (params.connected_id) {
        // 기존 인스턴스가 있는지 확인 (같은 user + connector_id + connected_id)
        const { data: existing } = await supabase
          .from("connector_instances")
          .select("id")
          .eq("user_id", user.id)
          .eq("connector_id", params.connector_id)
          .eq("connected_id", params.connected_id)
          .maybeSingle();

        if (existing) {
          // 업데이트
          const { data, error } = await supabase
            .from("connector_instances")
            .update({
              status: params.status,
              status_message: params.status_message || null,
              ...(params.credentials_meta ? { credentials_meta: params.credentials_meta as unknown as Record<string, unknown> } : {}),
            } as Record<string, unknown>)
            .eq("id", existing.id)
            .select()
            .single();
          if (error) throw error;
          return data;
        }
      }

      // 연결 해제 시: connected_id 없이 connector_id로 매칭되는 인스턴스 업데이트
      if (params.status === "disconnected" && !params.connected_id) {
        const { data, error } = await supabase
          .from("connector_instances")
          .update({ status: "disconnected", status_message: params.status_message || null })
          .eq("user_id", user.id)
          .eq("connector_id", params.connector_id)
          .eq("status", "connected")
          .select();
        if (error) throw error;
        return data;
      }

      const insertPayload = {
        user_id: user.id,
        connector_id: params.connector_id,
        status: params.status,
        connected_id: params.connected_id || null,
        status_message: params.status_message || null,
        ...(params.credentials_meta ? { credentials_meta: params.credentials_meta as unknown } : {}),
      };
      const { data, error } = await supabase
        .from("connector_instances")
        .insert(insertPayload as any)
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
