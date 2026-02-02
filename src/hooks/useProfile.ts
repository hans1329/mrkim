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
  secretary_gender: string | null;
  secretary_tone: string | null;
  briefing_frequency: string | null;
  priority_metrics: string[] | null;
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

      if (error) throw error;
      if (data) {
        setProfile(transformDbProfile(data as Record<string, unknown>));
      } else {
        setProfile(null);
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
      toast.error("프로필을 불러오는데 실패했습니다");
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

  useEffect(() => {
    fetchProfile();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      fetchProfile();
    });

    return () => subscription.unsubscribe();
  }, []);

  return {
    profile,
    loading,
    updating,
    updateProfile,
    updateSecretaryPhone,
    refetch: fetchProfile,
  };
}
