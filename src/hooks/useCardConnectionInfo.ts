import { useMemo } from "react";
import { useConnectorInstances } from "@/hooks/useConnectors";

interface ConnectionInfo {
  instanceId: string;
  connectedId: string | null;
  cardCompanyId: string | null;
  cardCompanyName: string | null;
  organizationCode: string | null;
}

interface BankConnectionInfo {
  instanceId: string;
  connectedId: string | null;
  bankCode: string | null;
  bankName: string | null;
  accountNo: string | null;
}

/**
 * connector_instances에서 모든 카드 연동 정보를 읽어오는 훅.
 * 다중 카드사 연동을 지원합니다.
 */
export function useCardConnectionInfo() {
  const { data: instances = [] } = useConnectorInstances();

  return useMemo(() => {
    const cardInstances = instances.filter(
      (inst) => inst.connector_id === "codef_card_usage" && inst.status === "connected"
    );

    const connections: ConnectionInfo[] = cardInstances.map((inst) => {
      const meta = (inst.credentials_meta || {}) as Record<string, string>;
      return {
        instanceId: inst.id,
        connectedId: inst.connected_id,
        cardCompanyId: meta.card_company_id || null,
        cardCompanyName: meta.card_company_name || meta.card_company_id || null,
        organizationCode: meta.organization_code || null,
      };
    });

    // 하위호환: 첫 번째 연결 정보
    const first = connections[0] || null;

    return {
      // 단일 (하위호환)
      connectedId: first?.connectedId || null,
      cardCompanyId: first?.cardCompanyId || null,
      cardCompanyName: first?.cardCompanyName || null,
      organizationCode: first?.organizationCode || null,
      // 다중
      connections,
      hasMultiple: connections.length > 1,
    };
  }, [instances]);
}

/**
 * connector_instances에서 모든 은행 연동 정보를 읽어오는 훅.
 * 다중 은행 연동을 지원합니다.
 */
export function useBankConnectionInfo() {
  const { data: instances = [] } = useConnectorInstances();

  return useMemo(() => {
    const bankInstances = instances.filter(
      (inst) => inst.connector_id === "codef_bank_account" && inst.status === "connected"
    );

    const connections: BankConnectionInfo[] = bankInstances.map((inst) => {
      const meta = (inst.credentials_meta || {}) as Record<string, string>;
      return {
        instanceId: inst.id,
        connectedId: inst.connected_id,
        bankCode: meta.bank_code || null,
        bankName: meta.bank_name || null,
        accountNo: meta.account_no || null,
      };
    });

    const first = connections[0] || null;

    return {
      connectedId: first?.connectedId || null,
      bankCode: first?.bankCode || null,
      bankName: first?.bankName || null,
      accountNo: first?.accountNo || null,
      connections,
      hasMultiple: connections.length > 1,
    };
  }, [instances]);
}
