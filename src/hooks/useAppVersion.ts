import { useState, useEffect, useCallback } from "react";
import { APP_VERSION } from "@/config/version";
import { supabase } from "@/integrations/supabase/client";

interface VersionInfo {
  currentVersion: string;
  latestVersion: string | null;
  updateAvailable: boolean;
  updateMessage: string | null;
  isChecking: boolean;
}

export function useAppVersion(): VersionInfo & { checkForUpdate: () => void } {
  const [latestVersion, setLatestVersion] = useState<string | null>(null);
  const [updateMessage, setUpdateMessage] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  const checkForUpdate = useCallback(async () => {
    setIsChecking(true);
    try {
      const { data } = await supabase
        .from("site_settings")
        .select("value")
        .eq("key", "app_version")
        .maybeSingle();

      if (data?.value) {
        const val = data.value as { latest_version?: string; update_message?: string };
        if (val.latest_version) {
          setLatestVersion(val.latest_version);
          setUpdateMessage(val.update_message ?? null);
        }
      }
    } catch {
      // silent fail
    } finally {
      setIsChecking(false);
    }
  }, []);

  useEffect(() => {
    checkForUpdate();
  }, [checkForUpdate]);

  const updateAvailable = latestVersion ? compareVersions(latestVersion, APP_VERSION) > 0 : false;

  return {
    currentVersion: APP_VERSION,
    latestVersion,
    updateAvailable,
    updateMessage,
    isChecking,
    checkForUpdate,
  };
}

function compareVersions(a: string, b: string): number {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < 3; i++) {
    if ((pa[i] ?? 0) > (pb[i] ?? 0)) return 1;
    if ((pa[i] ?? 0) < (pb[i] ?? 0)) return -1;
  }
  return 0;
}
