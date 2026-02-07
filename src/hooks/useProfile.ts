import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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

export function useProfile() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setProfile(null);
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) {
        // 에러 로깅만 하고 토스트는 표시하지 않음 (네트워크 문제 등 일시적 오류일 수 있음)
        console.error("Error fetching profile:", error);
        // 이미 프로필이 있다면 유지, 없으면 null
        if (!profile) {
          setProfile(null);
        }
        return;
      }
      
      if (data) {
        setProfile(transformDbProfile(data as Record<string, unknown>));
      } else {
        setProfile(null);
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
      // catch 블록에서도 토스트 제거 - 페이지 로딩 시 불필요한 에러 메시지 방지
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (updates: Partial<Profile>, showToast = true) => {
    try {
      setUpdating(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("로그인이 필요합니다");

      // priority_metrics는 jsonb로 저장되므로 그대로 전달
      const dbUpdates = { ...updates } as Record<string, unknown>;
      
      const { error } = await supabase
        .from("profiles")
        .update(dbUpdates)
        .eq("user_id", user.id);

      if (error) throw error;
      
      setProfile(prev => prev ? { ...prev, ...updates } : null);
      if (showToast) {
        toast.success("프로필이 저장되었습니다");
      }
      return true;
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("프로필 저장에 실패했습니다");
      return false;
    } finally {
      setUpdating(false);
    }
  };

  const updateSecretaryPhone = async (phone: string, verified: boolean) => {
    return updateProfile({
      secretary_phone: phone,
      secretary_phone_verified: verified,
    });
  };

  // 연동 상태 전체 초기화
  const resetConnections = async () => {
    try {
      setUpdating(true);
      
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
      
      // 로컬 상태 업데이트
      setProfile(prev => prev ? {
        ...prev,
        hometax_connected: false,
        hometax_connected_at: null,
        card_connected: false,
        card_connected_at: null,
        account_connected: false,
        account_connected_at: null,
      } : null);

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
    } finally {
      setUpdating(false);
    }
  };

  useEffect(() => {
    fetchProfile();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      // SIGNED_IN, SIGNED_OUT, TOKEN_REFRESHED 등 중요한 이벤트에서만 refetch
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'USER_UPDATED') {
        fetchProfile();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return {
    profile,
    loading,
    updating,
    updateProfile,
    updateSecretaryPhone,
    resetConnections,
    refetch: fetchProfile,
  };
}
