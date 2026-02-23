import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useConnection } from "@/contexts/ConnectionContext";

// 카드사 기관코드 매핑 (codef-card 엣지 함수와 동일)
const CARD_ORGANIZATION_CODES: Record<string, string> = {
  shinhan: "0306",
  samsung: "0303",
  kb: "0301",
  hyundai: "0302",
  lotte: "0311",
  bc: "0305",
  hana: "0313",
  woori: "0309",
  nh: "0304",
};

const CARD_COMPANY_NAMES: Record<string, string> = {
  shinhan: "신한카드",
  samsung: "삼성카드",
  kb: "KB국민카드",
  hyundai: "현대카드",
  lotte: "롯데카드",
  bc: "BC카드",
  hana: "하나카드",
  woori: "우리카드",
  nh: "NH농협카드",
};

function getOrganizationCode(cardCompanyId: string): string {
  return CARD_ORGANIZATION_CODES[cardCompanyId] || cardCompanyId;
}

interface CardInfo {
  cardNo: string;
  cardName: string;
  cardType: string;
  validPeriod: string;
  issueDate: string;
  userName: string;
  sleepYN: string;
}

interface CertOptions {
  loginType: "2";
  certFile: string; // Base64
  certPassword: string;
}

interface UseCardConnectionReturn {
  isLoading: boolean;
  connectedId: string | null;
  cards: CardInfo[];
  registerCardAccount: (cardCompanyId: string, loginId: string, password: string, certOptions?: CertOptions) => Promise<string | null>;
  addCardAccount: (cardCompanyId: string, loginId: string, password: string) => Promise<boolean>;
  getCards: (cardCompanyId: string, overrideConnectedId?: string) => Promise<CardInfo[]>;
}

export function useCardConnection(): UseCardConnectionReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [connectedId, setConnectedId] = useState<string | null>(null);
  const [cards, setCards] = useState<CardInfo[]>([]);
  const { connectService } = useConnection();

  // 카드사 계정 등록 (ConnectedId 신규 발급) - connectedId 반환
  const registerCardAccount = async (
    cardCompanyId: string, 
    loginId: string, 
    password: string,
    certOptions?: CertOptions
  ): Promise<string | null> => {
    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("로그인이 필요합니다.");
        return null;
      }

      const requestBody: Record<string, unknown> = {
        action: "register",
        cardCompanyId,
      };

      if (certOptions) {
        requestBody.loginType = "2";
        requestBody.certFile = certOptions.certFile;
        requestBody.certPassword = certOptions.certPassword;
      } else {
        requestBody.loginType = "1";
        requestBody.loginId = loginId;
        requestBody.password = password;
      }

      const response = await supabase.functions.invoke("codef-card", {
        body: requestBody,
      });

      // 에러 메시지에서 + 기호를 공백으로 디코딩
      const decodeErrorMessage = (msg: string) => 
        msg ? decodeURIComponent(msg.replace(/\+/g, ' ')) : msg;

      // response.data는 400 에러여도 항상 존재할 수 있음
      const data = response.data;
      
      // API 에러 응답 처리 (400 등 HTTP 에러도 data에 에러 정보가 있음)
      if (data && !data.success) {
        const errorMsg = decodeErrorMessage(data.error || "카드사 연결에 실패했습니다.");
        toast.error(errorMsg);
        return null;
      }
      
      // Supabase 함수 자체 오류 (네트워크 에러 등)
      if (response.error && !data) {
        toast.error("카드사 연결에 실패했습니다. 다시 시도해주세요.");
        return null;
      }
      
      if (data.success && data.connectedId) {
        setConnectedId(data.connectedId);
        
        // connector_instances + profiles 플래그 동기화 (카드사 코드도 함께 저장)
        await connectService("codef_card_usage", data.connectedId, {
          card_company_id: cardCompanyId,
          card_company_name: CARD_COMPANY_NAMES[cardCompanyId] || cardCompanyId,
          organization_code: getOrganizationCode(cardCompanyId),
        });
        
        toast.success("카드사 연결이 완료되었습니다!");
        return data.connectedId;
      } else {
        toast.error("카드사 연결에 실패했습니다.");
        return null;
      }
    } catch (error) {
      console.error("Card registration error:", error);
      const errorMsg = error instanceof Error ? error.message : "카드사 연결 중 오류가 발생했습니다.";
      toast.error(errorMsg.replace(/\+/g, ' '));
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
