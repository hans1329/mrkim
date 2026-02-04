import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useProfile } from "./useProfile";

interface AccountInfo {
  accountNo: string;
  accountName: string;
  accountType: string;
  balance: string;
  currency: string;
  holder: string;
}

interface UseAccountConnectionReturn {
  isLoading: boolean;
  connectedId: string | null;
  accounts: AccountInfo[];
  registerBankAccount: (bankId: string, loginId: string, password: string) => Promise<string | null>;
  addBankAccount: (bankId: string, loginId: string, password: string) => Promise<boolean>;
  getAccounts: (bankId: string, overrideConnectedId?: string) => Promise<AccountInfo[]>;
}

export function useAccountConnection(): UseAccountConnectionReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [connectedId, setConnectedId] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<AccountInfo[]>([]);
  const { updateProfile } = useProfile();

  // 은행 계정 등록 (ConnectedId 신규 발급) - connectedId 반환
  const registerBankAccount = async (
    bankId: string, 
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

      const response = await supabase.functions.invoke("codef-bank", {
        body: {
          action: "register",
          bankId,
          loginId,
          password,
        },
      });

      // Supabase functions.invoke는 HTTP 에러 시에도 data를 반환할 수 있음
      const data = response.data;
      
      // 에러 체크: response.error가 있거나 data.success가 false인 경우
      if (response.error && !data) {
        throw new Error(response.error.message);
      }
      
      if (data?.success && data?.connectedId) {
        setConnectedId(data.connectedId);
        
        // DB에 연결 상태 저장
        await updateProfile({
          account_connected: true,
          account_connected_at: new Date().toISOString(),
        }, false);
        
        toast.success("은행 연결이 완료되었습니다!");
        return data.connectedId;
      } else {
        // 에러 메시지 표시
        const errorMessage = data?.error || "은행 연결에 실패했습니다.";
        toast.error(errorMessage);
        return null;
      }
    } catch (error) {
      console.error("Bank registration error:", error);
      toast.error(error instanceof Error ? error.message : "은행 연결 중 오류가 발생했습니다.");
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  // 기존 ConnectedId에 은행 추가
  const addBankAccount = async (
    bankId: string,
    loginId: string,
    password: string
  ): Promise<boolean> => {
    if (!connectedId) {
      toast.error("먼저 은행을 등록해주세요.");
      return false;
    }

    setIsLoading(true);
    try {
      const response = await supabase.functions.invoke("codef-bank", {
        body: {
          action: "addAccount",
          connectedId,
          bankId,
          loginId,
          password,
        },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      const data = response.data;
      
      if (data.success) {
        toast.success("은행이 추가되었습니다!");
        return true;
      } else {
        toast.error(data.error || "은행 추가에 실패했습니다.");
        return false;
      }
    } catch (error) {
      console.error("Bank add error:", error);
      toast.error(error instanceof Error ? error.message : "은행 추가 중 오류가 발생했습니다.");
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // 보유 계좌 목록 조회
  const getAccounts = async (bankId: string, overrideConnectedId?: string): Promise<AccountInfo[]> => {
    const idToUse = overrideConnectedId || connectedId;
    
    if (!idToUse) {
      toast.error("먼저 은행을 등록해주세요.");
      return [];
    }

    setIsLoading(true);
    try {
      const response = await supabase.functions.invoke("codef-bank", {
        body: {
          action: "getAccounts",
          connectedId: idToUse,
          bankId,
        },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      const data = response.data;
      
      if (data.success) {
        setAccounts(data.accounts || []);
        return data.accounts || [];
      } else {
        toast.error(data.error || "계좌 목록 조회에 실패했습니다.");
        return [];
      }
    } catch (error) {
      console.error("Get accounts error:", error);
      toast.error(error instanceof Error ? error.message : "계좌 목록 조회 중 오류가 발생했습니다.");
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isLoading,
    connectedId,
    accounts,
    registerBankAccount,
    addBankAccount,
    getAccounts,
  };
}
