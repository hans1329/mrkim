import { useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useConnection } from "@/contexts/ConnectionContext";

/**
 * 디바이스 푸시 토큰을 등록/관리하는 훅.
 * - 웹: Firebase Cloud Messaging (Web Push)
 * - 네이티브: Capacitor Push Notifications 플러그인
 */
export function usePushNotifications() {
  const { isLoggedIn, userId } = useConnection();

  const registerToken = useCallback(
    async (token: string, platform: "web" | "android" | "ios") => {
      if (!userId) return;

      try {
        // Upsert: 같은 token이면 업데이트
        const { error } = await supabase.from("device_tokens" as any).upsert(
          {
            user_id: userId,
            token,
            platform,
            is_active: true,
            device_info: {
              userAgent: navigator.userAgent,
              language: navigator.language,
              registered_at: new Date().toISOString(),
            },
          },
          { onConflict: "user_id,token" }
        );

        if (error) {
          console.error("Failed to register push token:", error);
        } else {
          console.log(`Push token registered (${platform})`);
        }
      } catch (e) {
        console.error("Push token registration error:", e);
      }
    },
    [userId]
  );

  const initWebPush = useCallback(async () => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      console.log("Web Push not supported");
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        console.log("Push permission denied");
        return;
      }

      // Firebase Messaging을 사용하는 경우 firebase-messaging-sw.js에서 토큰을 가져옴
      // 여기서는 VAPID 키 기반 등록 예시
      const registration = await navigator.serviceWorker.ready;
      const subscription = await (registration as any).pushManager?.subscribe({
        userVisibleOnly: true,
        applicationServerKey: getVapidKey(),
      });

      const token = JSON.stringify(subscription);
      await registerToken(token, "web");
    } catch (e) {
      console.error("Web push init error:", e);
    }
  }, [registerToken]);

  const initNativePush = useCallback(async () => {
    try {
      const { PushNotifications } = await import("@capacitor/push-notifications");

      const permResult = await PushNotifications.requestPermissions();
      if (permResult.receive !== "granted") {
        console.log("Native push permission denied");
        return;
      }

      await PushNotifications.register();

      PushNotifications.addListener("registration", async (token) => {
        const platform = /android/i.test(navigator.userAgent) ? "android" : "ios";
        await registerToken(token.value, platform as "android" | "ios");
      });

      PushNotifications.addListener("registrationError", (error) => {
        console.error("Native push registration error:", error);
      });

      PushNotifications.addListener("pushNotificationReceived", (notification) => {
        console.log("Push received:", notification);
      });

      PushNotifications.addListener("pushNotificationActionPerformed", (action) => {
        console.log("Push action:", action);
        // 알림 탭 시 해당 페이지로 이동 등 처리
        const route = action.notification.data?.route;
        if (route) {
          window.location.href = route;
        }
      });
    } catch (e) {
      // Capacitor 플러그인이 없는 환경 (웹 브라우저)
      console.log("Native push not available, trying web push");
      await initWebPush();
    }
  }, [registerToken, initWebPush]);

  useEffect(() => {
    if (!isLoggedIn || !userId) return;

    // 세션당 한 번만 실행
    const key = `push_init_${userId}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");

    // 네이티브 먼저 시도, 실패 시 웹 푸시
    initNativePush();
  }, [isLoggedIn, userId, initNativePush]);
}

function getVapidKey(): Uint8Array | undefined {
  // Firebase 콘솔 > 프로젝트 설정 > Cloud Messaging > Web Push certificates
  // VAPID 키를 환경변수나 하드코딩으로 제공
  const vapidKey = (window as any).__FIREBASE_VAPID_KEY__;
  if (!vapidKey) return undefined;

  const padding = "=".repeat((4 - (vapidKey.length % 4)) % 4);
  const base64 = (vapidKey + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from(rawData, (c) => c.charCodeAt(0));
}
