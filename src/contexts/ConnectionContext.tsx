import { createContext, useContext, useState, useEffect, ReactNode, useCallback, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Profile, useProfileQuery } from "@/hooks/useProfileQuery";
import { useConnectorInstances, useUpsertConnectorInstance } from "@/hooks/useConnectors";
import type { ConnectorInstance } from "@/hooks/useConnectors";
import { toast } from "sonner";

/**
 * 연동 상태 중앙 관리 Context
 * 
 * connector_instances 테이블을 단일 소스로 사용하여
 * 대시보드, 채팅, 온보딩 등 모든 곳에서 일관된 상태를 제공합니다.
 */

export type AuthStatus = "loading" | "logged_out" | "logged_in";

// 커넥터 ID → 카테고리 매핑
const CONNECTOR_CATEGORY_MAP: Record<string, "hometax" | "card" | "account"> = {
  codef_hometax_tax_invoice: "hometax",
  codef_hometax_cash_receipt: "hometax",
  codef_bank_account: "account",
  codef_card_sales: "card",
  codef_card_usage: "card",
};

export interface ConnectionState {
  // 인증 상태
  authStatus: AuthStatus;
  isLoggedIn: boolean;
  isLoggedOut: boolean;
  userId: string | null;
  
  // 프로필
  profile: Profile | null;
  profileLoading: boolean;
  
  // 개별 연동 상태 (connector_instances 파생)
  hometaxConnected: boolean;
  cardConnected: boolean;
  accountConnected: boolean;
  
  // 커넥터 인스턴스 원본
  connectorInstances: ConnectorInstance[];
  
  // 집계 상태
  isAnyConnected: boolean;
  isFullyConnected: boolean;
  isTransactionConnected: boolean;
  connectedCount: number;
  
  // 상태 조합
  isLoggedInButNotConnected: boolean;
  
  // 메서드
  refetch: () => void;
  updateProfile: (updates: Partial<Profile>, showToast?: boolean) => Promise<boolean>;
  resetConnections: () => Promise<boolean>;
  /** 커넥터 인스턴스 upsert 후 profiles 플래그도 동기화 */
  connectService: (connectorId: string, connectedId?: string, credentialsMeta?: Record<string, unknown>) => Promise<boolean>;
  disconnectService: (connectorId: string) => Promise<boolean>;
}

const ConnectionContext = createContext<ConnectionState | undefined>(undefined);

export function ConnectionProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [authStatus, setAuthStatus] = useState<AuthStatus>("loading");
  const [userId, setUserId] = useState<string | null>(null);
  
  const { 
    profile, 
    loading: profileLoading, 
    refetch: refetchProfile,
    updateProfileCache,
    invalidateProfile,
  } = useProfileQuery();

  const { data: connectorInstances = [], refetch: refetchInstances } = useConnectorInstances();
  const upsertInstance = useUpsertConnectorInstance();

  // 인증 상태 확인
  const checkAuth = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setAuthStatus("logged_in");
        setUserId(user.id);
      } else {
        setAuthStatus("logged_out");
        setUserId(null);
      }
    } catch (error) {
      console.error("Auth check failed:", error);
      setAuthStatus("logged_out");
      setUserId(null);
    }
  }, []);

  useEffect(() => {
    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setAuthStatus("logged_in");
        setUserId(session.user.id);
        if (event === 'SIGNED_IN') {
          invalidateProfile();
          refetchInstances();
        }
      } else {
        setAuthStatus("logged_out");
        setUserId(null);
        if (event === 'SIGNED_OUT') {
          queryClient.setQueryData(["profile"], null);
          queryClient.setQueryData(["connector_instances"], []);
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [checkAuth, invalidateProfile, queryClient, refetchInstances]);

  // connector_instances에서 카테고리별 연동 상태 파생 (profiles 플래그 fallback)
  const derivedStatus = useMemo(() => {
    const connected = new Set<string>();
    for (const inst of connectorInstances) {
      if (inst.status === "connected") {
        const category = CONNECTOR_CATEGORY_MAP[inst.connector_id];
        if (category) connected.add(category);
      }
    }

    // connector_instances가 비어있으면 profiles 플래그를 fallback으로 사용
    const useProfileFallback = connectorInstances.length === 0 && profile;

    return {
      hometax: connected.has("hometax") || (useProfileFallback ? !!profile?.hometax_connected : false),
      card: connected.has("card") || (useProfileFallback ? !!profile?.card_connected : false),
      account: connected.has("account") || (useProfileFallback ? !!profile?.account_connected : false),
    };
  }, [connectorInstances, profile]);

  // 프로필 업데이트
  const updateProfile = useCallback(async (updates: Partial<Profile>, showToast = true): Promise<boolean> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("로그인이 필요합니다");

      const { error } = await supabase
        .from("profiles")
        .update(updates as Record<string, unknown>)
        .eq("user_id", user.id);

      if (error) throw error;
      updateProfileCache(updates);
      if (showToast) toast.success("프로필이 저장되었습니다");
      return true;
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("프로필 저장에 실패했습니다");
      return false;
    }
  }, [updateProfileCache]);

  // profiles 플래그 동기화 헬퍼
  const syncProfileFlags = useCallback(async (category: "hometax" | "card" | "account", connected: boolean) => {
    const flagMap = {
      hometax: { connected: "hometax_connected", connectedAt: "hometax_connected_at" },
      card: { connected: "card_connected", connectedAt: "card_connected_at" },
      account: { connected: "account_connected", connectedAt: "account_connected_at" },
    };
    const flags = flagMap[category];
    const updates: Record<string, unknown> = {
      [flags.connected]: connected,
      [flags.connectedAt]: connected ? new Date().toISOString() : null,
    };
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    
    await supabase.from("profiles").update(updates).eq("user_id", user.id);
    updateProfileCache(updates as Partial<Profile>);
  }, [updateProfileCache]);

  // 커넥터 연결
  const connectService = useCallback(async (connectorId: string, connectedId?: string, credentialsMeta?: Record<string, unknown>): Promise<boolean> => {
    try {
      await upsertInstance.mutateAsync({
        connector_id: connectorId,
        status: "connected",
        connected_id: connectedId,
        ...(credentialsMeta ? { credentials_meta: credentialsMeta } : {}),
      });

      // profiles 플래그 동기화 (하위 호환)
      const category = CONNECTOR_CATEGORY_MAP[connectorId];
      if (category) {
        await syncProfileFlags(category, true);
      }

      // 연동 완료 후 즉시 최초 동기화 트리거 (fire-and-forget)
      // connector_instances에서 해당 인스턴스 ID를 찾아 sync-orchestrator 호출
      try {
        const { data: instances } = await supabase
          .from("connector_instances")
          .select("id")
          .eq("connector_id", connectorId)
          .eq("status", "connected")
          .order("created_at", { ascending: false })
          .limit(1);

        if (instances && instances.length > 0) {
          supabase.functions.invoke("sync-orchestrator", {
            body: { instanceId: instances[0].id },
          }).then((res) => {
            if (res.data?.success) {
              console.log(`Initial sync triggered for ${connectorId}:`, res.data);
            }
          }).catch((err) => {
            console.warn("Initial sync trigger failed (non-blocking):", err);
          });
        }
      } catch (syncErr) {
        console.warn("Failed to trigger initial sync:", syncErr);
      }

      return true;
    } catch (error) {
      console.error("connectService error:", error);
      return false;
    }
  }, [upsertInstance, syncProfileFlags]);

  // 커넥터 해제
  const disconnectService = useCallback(async (connectorId: string): Promise<boolean> => {
    try {
      await upsertInstance.mutateAsync({
        connector_id: connectorId,
        status: "disconnected",
      });

      const category = CONNECTOR_CATEGORY_MAP[connectorId];
      if (category) {
        // 같은 카테고리의 다른 커넥터가 아직 연결되어 있는지 확인
        const stillConnected = connectorInstances.some(
          (inst) => inst.connector_id !== connectorId && 
                    CONNECTOR_CATEGORY_MAP[inst.connector_id] === category && 
                    inst.status === "connected"
        );
        if (!stillConnected) {
          await syncProfileFlags(category, false);
        }
      }

      return true;
    } catch (error) {
      console.error("disconnectService error:", error);
      return false;
    }
  }, [upsertInstance, syncProfileFlags, connectorInstances]);

  // 전체 초기화
  const resetConnections = useCallback(async (): Promise<boolean> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("로그인이 필요합니다");

      // connector_instances 전부 disconnected로
      for (const inst of connectorInstances) {
        await supabase
          .from("connector_instances")
          .update({ status: "disconnected" })
          .eq("id", inst.id);
      }

      // profiles 플래그 초기화
      await supabase
        .from("profiles")
        .update({
          hometax_connected: false, hometax_connected_at: null,
          card_connected: false, card_connected_at: null,
          account_connected: false, account_connected_at: null,
        })
        .eq("user_id", user.id);

      updateProfileCache({
        hometax_connected: false, hometax_connected_at: null,
        card_connected: false, card_connected_at: null,
        account_connected: false, account_connected_at: null,
      });

      // 로컬스토리지 정리
      ["codef_connected_id", "codef_card_company", "codef_card_company_name",
       "codef_bank_connected_id", "codef_bank_code", "codef_bank_name"
      ].forEach(k => localStorage.removeItem(k));

      refetchInstances();
      return true;
    } catch (error) {
      console.error("Error resetting connections:", error);
      return false;
    }
  }, [connectorInstances, updateProfileCache, refetchInstances]);

  const refetch = useCallback(() => {
    refetchProfile();
    refetchInstances();
  }, [refetchProfile, refetchInstances]);

  // 파생 상태
  const isLoggedIn = authStatus === "logged_in";
  const isLoggedOut = authStatus === "logged_out";
  
  const hometaxConnected = derivedStatus.hometax;
  const cardConnected = derivedStatus.card;
  const accountConnected = derivedStatus.account;
  
  const isAnyConnected = hometaxConnected || cardConnected || accountConnected;
  const isFullyConnected = hometaxConnected && cardConnected && accountConnected;
  const isTransactionConnected = cardConnected || accountConnected;
  const connectedCount = [hometaxConnected, cardConnected, accountConnected].filter(Boolean).length;
  const isLoggedInButNotConnected = isLoggedIn && !isAnyConnected && !profileLoading;

  const value: ConnectionState = {
    authStatus, isLoggedIn, isLoggedOut, userId,
    profile, profileLoading,
    hometaxConnected, cardConnected, accountConnected,
    connectorInstances,
    isAnyConnected, isFullyConnected, isTransactionConnected, connectedCount,
    isLoggedInButNotConnected,
    refetch, updateProfile, resetConnections,
    connectService, disconnectService,
  };

  return (
    <ConnectionContext.Provider value={value}>
      {children}
    </ConnectionContext.Provider>
  );
}

export function useConnection() {
  const context = useContext(ConnectionContext);
  if (context === undefined) {
    throw new Error("useConnection must be used within a ConnectionProvider");
  }
  return context;
}

/**
 * 채팅/AI 에이전트에서 사용하는 연동 상태 요약
 */
export function getConnectionSummary(state: ConnectionState): string {
  if (state.isLoggedOut) return "사용자가 로그인하지 않은 상태입니다.";
  if (!state.isAnyConnected) return "로그인 상태이지만 아직 데이터 연동이 되어 있지 않습니다.";

  const connected: string[] = [];
  const notConnected: string[] = [];

  if (state.hometaxConnected) connected.push("국세청(홈택스)"); else notConnected.push("국세청(홈택스)");
  if (state.cardConnected) connected.push("카드"); else notConnected.push("카드");
  if (state.accountConnected) connected.push("계좌"); else notConnected.push("계좌");

  if (state.isFullyConnected) return `모든 데이터가 연동되어 있습니다: ${connected.join(", ")}.`;
  return `연동: ${connected.join(", ")}. 미연동: ${notConnected.join(", ")}.`;
}

export function getConnectionContextForAI(state: ConnectionState): string {
  const summary = getConnectionSummary(state);
  const guidelines = [];

  if (state.isLoggedOut) {
    guidelines.push("- 로그인을 먼저 안내해주세요.");
  } else if (!state.isAnyConnected) {
    guidelines.push("- 데이터 연동이 필요함을 안내해주세요.");
    guidelines.push("- '설정 > 데이터 연동' 또는 온보딩 페이지로 안내해주세요.");
  } else {
    if (!state.hometaxConnected) guidelines.push("- 세금계산서 관련 질문 시 홈택스 연동 필요 안내.");
    if (!state.isTransactionConnected) guidelines.push("- 거래 내역 관련 질문 시 카드/계좌 연동 필요 안내.");
    if (state.isFullyConnected) guidelines.push("- 모든 데이터 연동 완료, 정확한 정보 제공 가능.");
  }

  return `## 사용자 연동 상태\n${summary}\n\n## 응답 가이드라인\n${guidelines.join("\n")}`;
}
