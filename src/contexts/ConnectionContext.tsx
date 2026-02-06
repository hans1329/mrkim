import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Profile, useProfileQuery } from "@/hooks/useProfileQuery";
import { toast } from "sonner";

/**
 * 연동 상태 중앙 관리 Context
 * 
 * 로그인 상태와 데이터 연동 상태를 한 곳에서 관리하여
 * 대시보드, 채팅, 온보딩 등 모든 곳에서 일관된 상태를 제공합니다.
 * 
 * React Query로 캐싱하여 중복 API 호출을 방지합니다.
 */

export type AuthStatus = "loading" | "logged_out" | "logged_in";

export interface ConnectionState {
  // 인증 상태
  authStatus: AuthStatus;
  isLoggedIn: boolean;
  isLoggedOut: boolean;
  userId: string | null;
  
  // 연동 상태
  profile: Profile | null;
  profileLoading: boolean;
  
  // 개별 연동 상태
  hometaxConnected: boolean;
  cardConnected: boolean;
  accountConnected: boolean;
  
  // 집계 상태
  isAnyConnected: boolean;         // 하나라도 연동됨
  isFullyConnected: boolean;       // 모두 연동됨
  isTransactionConnected: boolean; // 카드 또는 계좌 연동됨 (거래 데이터 가능)
  connectedCount: number;          // 연동된 개수
  
  // 상태 조합
  isLoggedInButNotConnected: boolean;  // 로그인했지만 미연동
  
  // 메서드
  refetch: () => void;
  updateProfile: (updates: Partial<Profile>, showToast?: boolean) => Promise<boolean>;
  resetConnections: () => Promise<boolean>;
}

const ConnectionContext = createContext<ConnectionState | undefined>(undefined);

export function ConnectionProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [authStatus, setAuthStatus] = useState<AuthStatus>("loading");
  const [userId, setUserId] = useState<string | null>(null);
  
  // React Query 기반 프로필 조회 (캐싱 적용)
  const { 
    profile, 
    loading: profileLoading, 
    refetch,
    updateProfileCache,
    invalidateProfile,
  } = useProfileQuery();

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
        // 로그인 시 프로필 캐시 무효화
        if (event === 'SIGNED_IN') {
          invalidateProfile();
        }
      } else {
        setAuthStatus("logged_out");
        setUserId(null);
        // 로그아웃 시 프로필 캐시 클리어
        if (event === 'SIGNED_OUT') {
          queryClient.setQueryData(["profile"], null);
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [checkAuth, invalidateProfile, queryClient]);

  // 프로필 업데이트 함수
  const updateProfile = useCallback(async (updates: Partial<Profile>, showToast = true): Promise<boolean> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("로그인이 필요합니다");

      const dbUpdates = { ...updates } as Record<string, unknown>;
      
      const { error } = await supabase
        .from("profiles")
        .update(dbUpdates)
        .eq("user_id", user.id);

      if (error) throw error;
      
      // 로컬 캐시 즉시 업데이트
      updateProfileCache(updates);
      
      if (showToast) {
        toast.success("프로필이 저장되었습니다");
      }
      return true;
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("프로필 저장에 실패했습니다");
      return false;
    }
  }, [updateProfileCache]);

  // 연동 상태 전체 초기화
  const resetConnections = useCallback(async (): Promise<boolean> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("로그인이 필요합니다");

      const { error } = await supabase
        .from("profiles")
        .update({
          hometax_connected: false,
          hometax_connected_at: null,
          card_connected: false,
          card_connected_at: null,
          account_connected: false,
          account_connected_at: null,
        })
        .eq("user_id", user.id);

      if (error) throw error;
      
      // 캐시 업데이트
      updateProfileCache({
        hometax_connected: false,
        hometax_connected_at: null,
        card_connected: false,
        card_connected_at: null,
        account_connected: false,
        account_connected_at: null,
      });

      // 로컬스토리지의 codef 정보도 삭제
      localStorage.removeItem("codef_connected_id");
      localStorage.removeItem("codef_card_company");
      localStorage.removeItem("codef_card_company_name");
      localStorage.removeItem("codef_bank_connected_id");
      localStorage.removeItem("codef_bank_code");
      localStorage.removeItem("codef_bank_name");

      return true;
    } catch (error) {
      console.error("Error resetting connections:", error);
      return false;
    }
  }, [updateProfileCache]);

  // 파생 상태 계산
  const isLoggedIn = authStatus === "logged_in";
  const isLoggedOut = authStatus === "logged_out";
  
  const hometaxConnected = profile?.hometax_connected ?? false;
  const cardConnected = profile?.card_connected ?? false;
  const accountConnected = profile?.account_connected ?? false;
  
  const isAnyConnected = hometaxConnected || cardConnected || accountConnected;
  const isFullyConnected = hometaxConnected && cardConnected && accountConnected;
  const isTransactionConnected = cardConnected || accountConnected;
  const connectedCount = [hometaxConnected, cardConnected, accountConnected].filter(Boolean).length;
  
  const isLoggedInButNotConnected = isLoggedIn && !isAnyConnected && !profileLoading;

  const value: ConnectionState = {
    authStatus,
    isLoggedIn,
    isLoggedOut,
    userId,
    
    profile,
    profileLoading,
    
    hometaxConnected,
    cardConnected,
    accountConnected,
    
    isAnyConnected,
    isFullyConnected,
    isTransactionConnected,
    connectedCount,
    
    isLoggedInButNotConnected,
    
    refetch,
    updateProfile,
    resetConnections,
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
 * AI 응답 생성 시 참조용
 */
export function getConnectionSummary(state: ConnectionState): string {
  if (state.isLoggedOut) {
    return "사용자가 로그인하지 않은 상태입니다.";
  }

  if (!state.isAnyConnected) {
    return "로그인 상태이지만 아직 데이터 연동이 되어 있지 않습니다. 국세청, 카드, 계좌 모두 미연동 상태입니다.";
  }

  const connected: string[] = [];
  const notConnected: string[] = [];

  if (state.hometaxConnected) connected.push("국세청(홈택스)");
  else notConnected.push("국세청(홈택스)");

  if (state.cardConnected) connected.push("카드");
  else notConnected.push("카드");

  if (state.accountConnected) connected.push("계좌");
  else notConnected.push("계좌");

  if (state.isFullyConnected) {
    return `모든 데이터가 연동되어 있습니다: ${connected.join(", ")}. 실시간 데이터 조회가 가능합니다.`;
  }

  return `연동된 항목: ${connected.join(", ")}. 미연동 항목: ${notConnected.join(", ")}.`;
}

/**
 * AI 채팅 시스템 프롬프트에 추가할 연동 상태 컨텍스트
 */
export function getConnectionContextForAI(state: ConnectionState): string {
  const summary = getConnectionSummary(state);
  
  const guidelines = [];
  
  if (state.isLoggedOut) {
    guidelines.push("- 로그인을 먼저 안내해주세요.");
    guidelines.push("- 개인화된 데이터는 제공하지 마세요.");
  } else if (!state.isAnyConnected) {
    guidelines.push("- 데이터 연동이 필요함을 안내해주세요.");
    guidelines.push("- '설정 > 데이터 연동' 또는 온보딩 페이지로 안내해주세요.");
    guidelines.push("- 허구의 데이터를 만들어 제공하지 마세요.");
  } else {
    if (!state.hometaxConnected) {
      guidelines.push("- 세금계산서 관련 질문 시 홈택스 연동이 필요함을 안내해주세요.");
    }
    if (!state.isTransactionConnected) {
      guidelines.push("- 거래 내역 관련 질문 시 카드 또는 계좌 연동이 필요함을 안내해주세요.");
    }
    if (state.isFullyConnected) {
      guidelines.push("- 모든 데이터가 연동되어 있으므로 정확한 정보를 제공할 수 있습니다.");
    }
  }

  return `
## 사용자 연동 상태
${summary}

## 응답 가이드라인
${guidelines.join("\n")}
`.trim();
}
