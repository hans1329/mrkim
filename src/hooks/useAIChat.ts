import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "./useProfile";
import { toast } from "sonner";
import { format, isToday, isYesterday, startOfDay } from "date-fns";
import { ko } from "date-fns/locale";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export interface ChatSession {
  date: Date;
  dateLabel: string;
  messageCount: number;
  preview: string;
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat-ai`;

function getDateLabel(date: Date): string {
  if (isToday(date)) return "오늘";
  if (isYesterday(date)) return "어제";
  return format(date, "M월 d일 (E)", { locale: ko });
}

export function useAIChat() {
  const { profile } = useProfile();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [isLoadingSessions, setIsLoadingSessions] = useState(true);
  const [showSessionList, setShowSessionList] = useState(false);

  const secretaryName = profile?.secretary_name || "김비서";
  const secretaryTone = profile?.secretary_tone || "polite";
  const secretaryGender = profile?.secretary_gender || "female";
  const secretaryAvatarUrl = (profile as any)?.secretary_avatar_url || null;

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
        .select("id, role, content, created_at")
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
        const loadedMessages: ChatMessage[] = data.map((msg) => ({
          id: msg.id,
          role: msg.role as "user" | "assistant",
          content: msg.content,
          timestamp: new Date(msg.created_at),
        }));
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

  // 초기 로딩
  useEffect(() => {
    loadSessions();
    loadTodayMessages();
  }, [loadSessions, loadTodayMessages]);

  // 메시지 저장
  const saveMessage = async (role: "user" | "assistant", content: string): Promise<string | null> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from("chat_messages")
        .insert({
          user_id: user.id,
          role,
          content,
        })
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
      // 최근 10개 메시지만 전송 (컨텍스트 유지)
      const recentMessages = [...messages, userMessage].slice(-10).map(m => ({
        role: m.role,
        content: m.content,
      }));

      const response = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: recentMessages,
          secretaryName,
          secretaryTone,
          secretaryGender,
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
      
      // AI 응답 저장
      const assistantMessageId = await saveMessage("assistant", assistantContent);
      
      const assistantMessage: ChatMessage = {
        id: assistantMessageId || (Date.now() + 1).toString(),
        role: "assistant",
        content: assistantContent,
        timestamp: new Date(),
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
  };
}
