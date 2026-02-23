import { useMemo } from "react";
import { useConnectorInstances } from "@/hooks/useConnectors";

/**
 * connector_instances에서 카드 연동 정보를 읽어오는 훅.
 * localStorage 대신 DB를 Single Source of Truth로 사용합니다.
 */
export function useCardConnectionInfo() {
  const { data: instances = [] } = useConnectorInstances();

  return useMemo(() => {
    const cardInstance = instances.find(
      (inst) => inst.connector_id === "codef_card_usage" && inst.status === "connected"
    );

    if (!cardInstance) {
      return {
        connectedId: null,
        cardCompanyId: null,
        cardCompanyName: null,
        organizationCode: null,
      };
    }

    const meta = (cardInstance.credentials_meta || {}) as Record<string, string>;

    return {
      connectedId: cardInstance.connected_id,
      cardCompanyId: meta.card_company_id || null,
      cardCompanyName: meta.card_company_name || meta.card_company_id || null,
      organizationCode: meta.organization_code || null,
    };
  }, [instances]);
}

/**
 * connector_instances에서 은행 연동 정보를 읽어오는 훅.
 */
export function useBankConnectionInfo() {
  const { data: instances = [] } = useConnectorInstances();

  return useMemo(() => {
    const bankInstance = instances.find(
      (inst) => inst.connector_id === "codef_bank_account" && inst.status === "connected"
    );

    if (!bankInstance) {
      return {
        connectedId: null,
        bankCode: null,
        bankName: null,
        accountNo: null,
      };
    }

    const meta = (bankInstance.credentials_meta || {}) as Record<string, string>;

    return {
      connectedId: bankInstance.connected_id,
      bankCode: meta.bank_code || null,
      bankName: meta.bank_name || null,
      accountNo: meta.account_no || null,
    };
  }, [instances]);
}
