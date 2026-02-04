import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useProfile } from "./useProfile";

interface CardInfo {
  cardNo: string;
  cardName: string;
  cardType: string;
  validPeriod: string;
  issueDate: string;
  userName: string;
  sleepYN: string;
}

interface UseCardConnectionReturn {
  isLoading: boolean;
  connectedId: string | null;
  cards: CardInfo[];
  registerCardAccount: (cardCompanyId: string, loginId: string, password: string) => Promise<string | null>;
  addCardAccount: (cardCompanyId: string, loginId: string, password: string) => Promise<boolean>;
  getCards: (cardCompanyId: string, overrideConnectedId?: string) => Promise<CardInfo[]>;
}

export function useCardConnection(): UseCardConnectionReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [connectedId, setConnectedId] = useState<string | null>(null);
  const [cards, setCards] = useState<CardInfo[]>([]);
  const { updateProfile } = useProfile();

  // 카드사 계정 등록 (ConnectedId 신규 발급) - connectedId 반환
  const registerCardAccount = async (
    cardCompanyId: string, 
    loginId: string, 
    password: string
  ): Promise<string | null> => {
    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("로그인이 필요합니다.");
        return null;
      }

      const response = await supabase.functions.invoke("codef-card", {
        body: {
          action: "register",
          cardCompanyId,
          loginId,
          password,
        },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      const data = response.data;
      
      if (data.success && data.connectedId) {
        setConnectedId(data.connectedId);
        
        // DB에 연결 상태 저장
        await updateProfile({
          card_connected: true,
          card_connected_at: new Date().toISOString(),
        }, false);
        
        toast.success("카드사 연결이 완료되었습니다!");
        return data.connectedId;
      } else {
        toast.error(data.error || "카드사 연결에 실패했습니다.");
        return null;
      }
    } catch (error) {
      console.error("Card registration error:", error);
      toast.error(error instanceof Error ? error.message : "카드사 연결 중 오류가 발생했습니다.");
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  // 기존 ConnectedId에 카드사 추가
  const addCardAccount = async (
    cardCompanyId: string,
    loginId: string,
    password: string
  ): Promise<boolean> => {
    if (!connectedId) {
      toast.error("먼저 카드사를 등록해주세요.");
      return false;
    }

    setIsLoading(true);
    try {
      const response = await supabase.functions.invoke("codef-card", {
        body: {
          action: "addAccount",
          connectedId,
          cardCompanyId,
          loginId,
          password,
        },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      const data = response.data;
      
      if (data.success) {
        toast.success("카드사가 추가되었습니다!");
        return true;
      } else {
        toast.error(data.error || "카드사 추가에 실패했습니다.");
        return false;
      }
    } catch (error) {
      console.error("Card add error:", error);
      toast.error(error instanceof Error ? error.message : "카드사 추가 중 오류가 발생했습니다.");
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // 보유 카드 목록 조회
  const getCards = async (cardCompanyId: string, overrideConnectedId?: string): Promise<CardInfo[]> => {
    const idToUse = overrideConnectedId || connectedId;
    
    if (!idToUse) {
      toast.error("먼저 카드사를 등록해주세요.");
      return [];
    }

    setIsLoading(true);
    try {
      const response = await supabase.functions.invoke("codef-card", {
        body: {
          action: "getCards",
          connectedId: idToUse,
          cardCompanyId,
        },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      const data = response.data;
      
      if (data.success) {
        setCards(data.cards || []);
        return data.cards || [];
      } else {
        toast.error(data.error || "카드 목록 조회에 실패했습니다.");
        return [];
      }
    } catch (error) {
      console.error("Get cards error:", error);
      toast.error(error instanceof Error ? error.message : "카드 목록 조회 중 오류가 발생했습니다.");
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isLoading,
    connectedId,
    cards,
    registerCardAccount,
    addCardAccount,
    getCards,
  };
}
