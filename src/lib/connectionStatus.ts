import type { ConnectorInstance } from "@/hooks/useConnectors";

function getCardCompanyId(instance: ConnectorInstance): string | null {
  const meta = (instance.credentials_meta ?? {}) as Record<string, unknown>;
  return typeof meta.card_company_id === "string" ? meta.card_company_id : null;
}

export function isConnectorConnected(
  instances: ConnectorInstance[],
  connectorId: string,
) {
  return instances.some(
    (instance) => instance.connector_id === connectorId && instance.status === "connected",
  );
}

export function isCardCompanyConnected(
  instances: ConnectorInstance[],
  cardCompanyId: string,
) {
  return instances.some(
    (instance) =>
      instance.connector_id === "codef_card_usage" &&
      instance.status === "connected" &&
      getCardCompanyId(instance) === cardCompanyId,
  );
}
