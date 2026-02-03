import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface ServiceChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

const WELCOME_MESSAGE: ServiceChatMessage = {
  id: "welcome",
  role: "assistant",
  content: "안녕하세요! 👋 **김비서**에 대해 궁금한 점을 물어보세요.\n\n💡 아래 버튼을 눌러 빠르게 알아보세요!",
  timestamp: new Date(),
};

export function useServiceChatAI() {
  const [messages, setMessages] = useState<ServiceChatMessage[]>([WELCOME_MESSAGE]);
  const [isLoading, setIsLoading] = useState(false);

  const sendMessage = useCallback(async (userInput: string) => {
    if (!userInput.trim() || isLoading) return;

    // 사용자 메시지 추가
    const userMessage: ServiceChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: userInput,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      // 대화 히스토리 준비 (최근 10개)
      const conversationHistory = messages
        .filter(m => m.id !== "welcome")
        .slice(-10)
        .map(m => ({
          role: m.role,
          content: m.content,
        }));

      const { data, error } = await supabase.functions.invoke("service-chat", {
        body: {
          message: userInput,
          conversationHistory,
        },
      });

      if (error) {
        throw error;
      }

      const assistantMessage: ServiceChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data?.response || "죄송합니다, 응답을 생성하지 못했습니다.",
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error: any) {
      console.error("Service chat error:", error);
      
      // 에러 시 폴백 응답
      const errorMessage: ServiceChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "죄송합니다, 일시적인 오류가 발생했습니다. 잠시 후 다시 시도해주세요 😅",
        timestamp: new Date(),
      };
      
      setMessages(prev => [...prev, errorMessage]);
      
      if (error?.message?.includes("429")) {
        toast.error("잠시 후 다시 시도해주세요.");
      }
    } finally {
      setIsLoading(false);
    }
  }, [messages, isLoading]);

  const resetChat = useCallback(() => {
    setMessages([WELCOME_MESSAGE]);
  }, []);

  return {
    messages,
    isLoading,
    sendMessage,
    resetChat,
  };
}
