import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Profile {
  id: string;
  user_id: string;
  name: string | null;
  nickname: string | null;
  phone: string | null;
  avatar_url: string | null;
  business_name: string | null;
  business_registration_number: string | null;
  business_type: string | null;
  secretary_phone: string | null;
  secretary_phone_verified: boolean;
  // 김비서 설정
  secretary_name: string | null;
  secretary_avatar_url: string | null;
  secretary_gender: string | null;
  secretary_tone: string | null;
  briefing_frequency: string | null;
  priority_metrics: string[] | null;
  // 연동 상태
  hometax_connected: boolean | null;
  hometax_connected_at: string | null;
  card_connected: boolean | null;
  card_connected_at: string | null;
  account_connected: boolean | null;
  account_connected_at: string | null;
  created_at: string;
  updated_at: string;
}

// DB에서 가져온 데이터를 Profile 타입으로 변환
const transformDbProfile = (data: Record<string, unknown>): Profile => ({
  ...data,
  priority_metrics: Array.isArray(data.priority_metrics) 
    ? data.priority_metrics as string[]
    : null,
} as Profile);

// 프로필 조회 함수
const fetchProfile = async (): Promise<Profile | null> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    console.error("Error fetching profile:", error);
    return null;
  }

  return data ? transformDbProfile(data as Record<string, unknown>) : null;
};

// React Query 기반 프로필 훅
export function useProfileQuery() {
  const queryClient = useQueryClient();

  const { data: profile, isLoading: loading, refetch } = useQuery({
    queryKey: ["profile"],
    queryFn: fetchProfile,
    staleTime: 1000 * 60 * 5, // 5분간 fresh 상태 유지
    gcTime: 1000 * 60 * 30, // 30분간 캐시 유지 (cacheTime → gcTime)
    refetchOnWindowFocus: false, // 포커스 시 자동 refetch 비활성화
    retry: 1, // 실패 시 1회만 재시도
  });

  // 프로필 업데이트 후 캐시 갱신
  const updateProfileCache = (updates: Partial<Profile>) => {
    queryClient.setQueryData(["profile"], (old: Profile | null) => 
      old ? { ...old, ...updates } : null
    );
  };

  // 캐시 무효화 (강제 refetch 필요 시)
  const invalidateProfile = () => {
    queryClient.invalidateQueries({ queryKey: ["profile"] });
  };

  return {
    profile: profile ?? null,
    loading,
    refetch,
    updateProfileCache,
    invalidateProfile,
  };
}
