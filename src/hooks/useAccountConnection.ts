import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useConnection } from "@/contexts/ConnectionContext";

interface AccountInfo {
  accountNo: string;
  accountName: string;
  accountType: string;
  balance: string;
  currency: string;
  holder: string;
}

interface CertOptions {
  loginType: "2";
  certFile: string; // Base64
  certPassword: string;
}

interface UseAccountConnectionReturn {
  isLoading: boolean;
  connectedId: string | null;
  accounts: AccountInfo[];
  registerBankAccount: (bankId: string, loginId: string, password: string, certOptions?: CertOptions) => Promise<string | null>;
  addBankAccount: (bankId: string, loginId: string, password: string) => Promise<boolean>;
  getAccounts: (bankId: string, overrideConnectedId?: string) => Promise<AccountInfo[]>;
}

export function useAccountConnection(): UseAccountConnectionReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [connectedId, setConnectedId] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<AccountInfo[]>([]);
  const { connectService } = useConnection();

  // 은행 계정 등록 (ConnectedId 신규 발급) - connectedId 반환
  const registerBankAccount = async (
    bankId: string, 
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
        bankId,
      };

      if (certOptions) {
        // 인증서 로그인 (loginType "2")
        requestBody.loginType = "2";
        requestBody.certFile = certOptions.certFile;
        requestBody.certPassword = certOptions.certPassword;
      } else {
        // 아이디/비밀번호 로그인 (loginType "1")
        requestBody.loginType = "1";
        requestBody.loginId = loginId;
        requestBody.password = password;
      }

      const response = await supabase.functions.invoke("codef-bank", {
        body: requestBody,
      });

      // 에러 메시지에서 + 기호를 공백으로 디코딩
      const decodeErrorMessage = (msg: string) => 
        msg ? decodeURIComponent(msg.replace(/\+/g, ' ')) : msg;

      // Supabase functions.invoke는 HTTP 에러 시에도 data를 반환할 수 있음
      const data = response.data;
      
      // 에러 체크: response.error가 있거나 data.success가 false인 경우
      if (response.error || (data && !data.success)) {
        const errorMsg = decodeErrorMessage(data?.error || response.error?.message || "은행 연결에 실패했습니다.");
        toast.error(errorMsg);
        return null;
      }
      
      if (data?.success && data?.connectedId) {
        setConnectedId(data.connectedId);
        
        // connector_instances + profiles 플래그 동기화 (은행 정보도 함께 저장)
        await connectService("codef_bank_account", data.connectedId, {
          bank_id: bankId,
          bank_name: bankId, // TODO: 은행명 매핑
        });
        
        toast.success("은행 연결이 완료되었습니다!");
        return data.connectedId;
      } else {
        toast.error("은행 연결에 실패했습니다.");
        return null;
      }
    } catch (error) {
      console.error("Bank registration error:", error);
      const errorMsg = error instanceof Error ? error.message : "은행 연결 중 오류가 발생했습니다.";
      toast.error(errorMsg.replace(/\+/g, ' '));
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
