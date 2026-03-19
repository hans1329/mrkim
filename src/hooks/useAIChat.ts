import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useProfileQuery } from "./useProfileQuery";
import { toast } from "sonner";
import { josa } from "@/lib/utils";
import { format, isToday, isYesterday, startOfDay } from "date-fns";
import { ko } from "date-fns/locale";
import type { VisualizationData } from "@/components/chat/DataVisualization";

export interface DataSourceInfo {
  name: string;
  syncedAt: string | null;
  syncedAtLabel: string;
  source: string;
}

export interface SuggestedAction {
  type: "send_to_accountant";
  label: string;
  consultationId: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  visualization?: VisualizationData | null;
  sources?: DataSourceInfo | null;
  suggestedActions?: SuggestedAction[] | null;
  followUpSuggestions?: string[] | null;
}

export interface QuotaInfo {
  used: number;
  remaining: number;
  limit: number;
}

export interface ChatSession {
  date: Date;
  dateLabel: string;
  messageCount: number;
  preview: string;
}

const SUPABASE_URL = "https://kuxpsfxkumbfuqsvcucx.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt1eHBzZnhrdW1iZnVxc3ZjdWN4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAwMTMwMDcsImV4cCI6MjA4NTU4OTAwN30.Ow_rO5MmbE-6fRYQ-E5Bxbd_0zXr70qURQAgqIGGm5s";
const CHAT_URL = `${SUPABASE_URL}/functions/v1/chat-ai`;

function getDateLabel(date: Date): string {
  if (isToday(date)) return "오늘";
  if (isYesterday(date)) return "어제";
  return format(date, "M월 d일 (E)", { locale: ko });
}

export function useAIChat() {
  const { profile } = useProfileQuery();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [isLoadingSessions, setIsLoadingSessions] = useState(true);
  const [showSessionList, setShowSessionList] = useState(false);
  const [quota, setQuota] = useState<QuotaInfo | null>(null);

  const secretaryName = profile?.secretary_name || "김비서";
  const secretaryTone = profile?.secretary_tone || "polite";
  const secretaryGender = profile?.secretary_gender || "female";
  const secretaryAvatarUrl = profile?.secretary_avatar_url || null;

   // 연동 상태에 따른 동적 플레이스홀더 생성
   const getPlaceholderText = useCallback(() => {
     // 첫 대화인 경우 (세션도 없고 메시지도 없음)
     if (sessions.length === 0 && messages.length === 0 && !isLoadingSessions) {
       return `${josa(secretaryName, "와/과")} 대화를 시작해보세요!`;
     }

     if (!profile) return `${secretaryName}에게 명령하세요...`;

     const { hometax_connected, card_connected, account_connected, business_registration_number } = profile;

     // 사업자등록번호가 없는 경우
     if (!business_registration_number) {
       return "사업장 정보를 먼저 등록해주세요";
     }

     // 모든 연동이 완료된 경우
     if (hometax_connected && card_connected && account_connected) {
       return `${secretaryName}에게 무엇이든 물어보세요!`;
     }

     // 일부 연동만 된 경우
     const connected = [];
     const notConnected = [];

     if (hometax_connected) connected.push("국세청");
     else notConnected.push("국세청");

     if (card_connected) connected.push("카드");
     else notConnected.push("카드");

     if (account_connected) connected.push("계좌");
     else notConnected.push("계좌");

     if (connected.length > 0 && notConnected.length > 0) {
       return `${notConnected.join(", ")} 연동을 추가하면 더 정확해요`;
     }

     // 아무것도 연동되지 않은 경우
     if (notConnected.length === 3) {
       return "데이터 연동 후 실시간 현황을 알려드릴게요";
     }

     return `${secretaryName}에게 명령하세요...`;
   }, [profile, secretaryName, sessions.length, messages.length, isLoadingSessions]);

  // 세션 목록 불러오기 (날짜별 그룹화)
  const loadSessions = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsLoadingSessions(false);
        return;
      }

      const { data, error } = await supabase
        .from("chat_messages")
        .select("id, content, role, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Failed to load sessions:", error);
        setIsLoadingSessions(false);
        return;
      }

      if (data && data.length > 0) {
        // 날짜별로 그룹화
        const sessionMap = new Map<string, ChatSession>();
        
        data.forEach((msg) => {
          const msgDate = new Date(msg.created_at);
          const dateKey = format(startOfDay(msgDate), "yyyy-MM-dd");
          
          if (!sessionMap.has(dateKey)) {
            sessionMap.set(dateKey, {
              date: startOfDay(msgDate),
              dateLabel: getDateLabel(msgDate),
              messageCount: 0,
              preview: "",
            });
          }
          
          const session = sessionMap.get(dateKey)!;
          session.messageCount++;
          
          // 첫 사용자 메시지를 미리보기로 사용
          if (msg.role === "user" && !session.preview) {
            session.preview = msg.content.slice(0, 30) + (msg.content.length > 30 ? "..." : "");
          }
        });

        setSessions(Array.from(sessionMap.values()));
      }
    } catch (error) {
      console.error("Error loading sessions:", error);
    } finally {
      setIsLoadingSessions(false);
    }
  }, []);

  // 특정 날짜의 대화 불러오기
  const loadMessagesByDate = useCallback(async (date: Date) => {
    setIsLoadingHistory(true);
    setSelectedDate(date);
    setShowSessionList(false);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsLoadingHistory(false);
        return;
      }

      const startOfTargetDay = startOfDay(date);
      const endOfTargetDay = new Date(startOfTargetDay);
      endOfTargetDay.setDate(endOfTargetDay.getDate() + 1);

      const { data, error } = await supabase
        .from("chat_messages")
        .select("id, role, content, created_at, metadata")
        .eq("user_id", user.id)
        .gte("created_at", startOfTargetDay.toISOString())
        .lt("created_at", endOfTargetDay.toISOString())
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Failed to load messages:", error);
        setIsLoadingHistory(false);
        return;
      }

      if (data) {
        const loadedMessages: ChatMessage[] = data.map((msg) => {
          const meta = (msg as any).metadata as any;
          return {
            id: msg.id,
            role: msg.role as "user" | "assistant",
            content: msg.content,
            timestamp: new Date(msg.created_at),
            visualization: meta?.visualization || null,
            sources: meta?.sources || null,
            suggestedActions: meta?.suggestedActions || null,
            followUpSuggestions: meta?.followUpSuggestions || null,
          };
        });
        setMessages(loadedMessages);
      }
    } catch (error) {
      console.error("Error loading messages:", error);
    } finally {
      setIsLoadingHistory(false);
    }
  }, []);

  // 오늘 대화 불러오기
  const loadTodayMessages = useCallback(async () => {
    await loadMessagesByDate(new Date());
  }, [loadMessagesByDate]);

  // 초기 할당량 계산
  const loadQuota = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const todayStart = startOfDay(new Date()).toISOString();
      const { count, error } = await supabase
        .from("chat_messages")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("role", "user")
        .gte("created_at", todayStart);

      if (!error && count !== null) {
        // limit은 서버에서 내려오므로 초기값은 임시로 사용
        const cachedLimit = quota?.limit ?? 100;
        setQuota({ used: count, remaining: Math.max(0, cachedLimit - count), limit: cachedLimit });
      }
    } catch (e) {
      console.error("Failed to load quota:", e);
    }
  }, []);

  // 초기 로딩
  useEffect(() => {
    loadSessions();
    loadTodayMessages();
    loadQuota();
  }, [loadSessions, loadTodayMessages, loadQuota]);

  // 메시지 저장
  const saveMessage = async (
    role: "user" | "assistant",
    content: string,
    metadata?: { visualization?: any; sources?: any; suggestedActions?: any; followUpSuggestions?: any } | null,
  ): Promise<string | null> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const insertData: any = {
        user_id: user.id,
        role,
        content,
      };
      if (metadata) {
        insertData.metadata = metadata;
      }

      const { data, error } = await supabase
        .from("chat_messages")
        .insert(insertData)
        .select("id")
        .single();

      if (error) {
        console.error("Failed to save message:", error);
        return null;
      }

      return data?.id || null;
    } catch (error) {
      console.error("Error saving message:", error);
      return null;
    }
  };

  const sendMessage = useCallback(async (userInput: string) => {
    if (!userInput.trim()) return;

    // 오늘이 아닌 다른 날짜를 보고 있다면 오늘로 전환
    if (selectedDate && !isToday(selectedDate)) {
      setSelectedDate(new Date());
    }

    // 사용자 메시지 저장 및 표시
    const userMessageId = await saveMessage("user", userInput);
    
    const userMessage: ChatMessage = {
      id: userMessageId || Date.now().toString(),
      role: "user",
      content: userInput,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      const accessToken = session?.access_token;
      
      // 최근 10개 메시지만 전송 (컨텍스트 유지)
      const recentMessages = [...messages, userMessage].slice(-10).map(m => ({
        role: m.role,
        content: m.content,
      }));

      const response = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // Supabase Edge Functions + RLS 조회를 위해 사용자 JWT가 필요
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${accessToken ?? SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          messages: recentMessages,
          secretaryName,
          secretaryTone,
          secretaryGender,
          userId: user?.id,
        }),
      });

      if (!response.ok) {
        let errorMessage = `API error: ${response.status}`;
        try {
          const errJson = await response.json();
          if (typeof errJson?.error === "string" && errJson.error.trim()) {
            errorMessage = errJson.error;
          }
        } catch {
          // ignore JSON parse errors
        }

        if (response.status === 429) {
          toast.error(errorMessage);
          throw new Error("Rate limit exceeded");
        }

        toast.error(errorMessage);
        throw new Error(errorMessage);
      }

      const data = await response.json();
      const assistantContent = data.response || "죄송합니다, 응답을 생성하지 못했습니다.";
      const visualization = data.visualization || null;
      const sources = data.sources || null;
      const suggestedActions = data.suggestedActions || null;
      const followUpSuggestions = data.followUpSuggestions || null;
      if (data.quota) setQuota(data.quota);
      
      // 세무 상담 자동 생성 알림 (액션 카드가 없을 때만 toast)
      if (data.taxConsultationCreated && !suggestedActions) {
        toast.info("세무사 상담 요청이 자동으로 등록되었습니다", {
          description: "세무사 탭에서 확인하고 전달할 수 있습니다",
          action: { label: "확인", onClick: () => window.location.href = "/tax-accountant?tab=consultations" },
        });
      }
      
      // AI 응답 저장
      const assistantMessageId = await saveMessage("assistant", assistantContent);
      
      const assistantMessage: ChatMessage = {
        id: assistantMessageId || (Date.now() + 1).toString(),
        role: "assistant",
        content: assistantContent,
        timestamp: new Date(),
        visualization,
        sources,
        suggestedActions,
        followUpSuggestions,
      };

      setMessages(prev => [...prev, assistantMessage]);
      
      // 세션 목록 갱신
      loadSessions();
    } catch (error) {
      console.error("AI Chat error:", error);
      
      const errorContent = "죄송합니다, 일시적인 오류가 발생했습니다. 잠시 후 다시 시도해주세요.";
      await saveMessage("assistant", errorContent);
      
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: errorContent,
        timestamp: new Date(),
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }, [messages, secretaryName, secretaryTone, secretaryGender, selectedDate, loadSessions]);

  const resetChat = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // DB에서 대화 기록 삭제
        await supabase
          .from("chat_messages")
          .delete()
          .eq("user_id", user.id);
      }
    } catch (error) {
      console.error("Failed to delete chat history:", error);
    }
    
    setMessages([]);
    setSessions([]);
    setSelectedDate(null);
  }, []);

  const startNewChat = useCallback(() => {
    setMessages([]);
    setSelectedDate(new Date());
    setShowSessionList(false);
  }, []);

  // 외부에서 데이터 새로고침 (음성→텍스트 전환 등)
  const refresh = useCallback(async () => {
    await Promise.all([loadSessions(), loadTodayMessages(), loadQuota()]);
  }, [loadSessions, loadTodayMessages, loadQuota]);

  return {
    messages,
    sessions,
    selectedDate,
    isLoading,
    isLoadingHistory,
    isLoadingSessions,
    showSessionList,
    setShowSessionList,
    sendMessage,
    resetChat,
    startNewChat,
    loadMessagesByDate,
    secretaryName,
    secretaryGender,
    secretaryAvatarUrl,
    getPlaceholderText,
    quota,
    refresh,
  };
}
