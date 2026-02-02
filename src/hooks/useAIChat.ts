import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "./useProfile";
import { toast } from "sonner";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat-ai`;

export function useAIChat() {
  const { profile } = useProfile();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);

  const secretaryName = profile?.secretary_name || "김비서";
  const secretaryTone = profile?.secretary_tone || "polite";

  // 대화 기록 불러오기
  useEffect(() => {
    const loadChatHistory = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setIsLoadingHistory(false);
          return;
        }

        const { data, error } = await supabase
          .from("chat_messages")
          .select("id, role, content, created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: true })
          .limit(100);

        if (error) {
          console.error("Failed to load chat history:", error);
          setIsLoadingHistory(false);
          return;
        }

        if (data && data.length > 0) {
          const loadedMessages: ChatMessage[] = data.map((msg) => ({
            id: msg.id,
            role: msg.role as "user" | "assistant",
            content: msg.content,
            timestamp: new Date(msg.created_at),
          }));
          setMessages(loadedMessages);
        }
      } catch (error) {
        console.error("Error loading chat history:", error);
      } finally {
        setIsLoadingHistory(false);
      }
    };

    loadChatHistory();
  }, []);

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
  }, [messages, secretaryName, secretaryTone]);

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
  }, []);

  return {
    messages,
    isLoading,
    isLoadingHistory,
    sendMessage,
    resetChat,
    secretaryName,
  };
}
