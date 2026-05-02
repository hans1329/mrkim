import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

interface SiteSettingValue {
  enabled?: boolean;
  [key: string]: unknown;
}

interface SiteSetting {
  id: string;
  key: string;
  value: SiteSettingValue;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export function useSiteSettings() {
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ["site-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("site_settings")
        .select("*");
      
      if (error) throw error;
      return data as SiteSetting[];
    },
  });

  const getSetting = (key: string): SiteSettingValue | null => {
    const setting = settings?.find(s => s.key === key);
    return setting?.value ?? null;
  };

  const isEnabled = (key: string): boolean => {
    const value = getSetting(key);
    return value?.enabled ?? true;
  };

  const updateSetting = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: SiteSettingValue }) => {
      const { error } = await supabase
        .from("site_settings")
        .update({ value: value as Json })
        .eq("key", key);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["site-settings"] });
    },
  });

  return {
    settings,
    isLoading,
    getSetting,
    isEnabled,
    updateSetting,
  };
}
