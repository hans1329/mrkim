import type { ConnectorInstance } from "@/hooks/useConnectors";

function getConnectionMeta(instance: ConnectorInstance) {
  return (instance.credentials_meta ?? {}) as Record<string, unknown>;
}

function getCardCompanyId(instance: ConnectorInstance): string | null {
  const meta = getConnectionMeta(instance);
  return typeof meta.card_company_id === "string" ? meta.card_company_id : null;
}

function getConnectionType(instance: ConnectorInstance): string | null {
  const meta = getConnectionMeta(instance);
  return typeof meta.connection_type === "string" ? meta.connection_type : null;
}

export function isConnectorConnected(instances: ConnectorInstance[], connectorId: string) {
  return instances.some(
    (instance) => instance.connector_id === connectorId && instance.status === "connected",
  );
}

export function isCardCompanyConnected(instances: ConnectorInstance[], cardCompanyId: string) {
  return instances.some(
    (instance) =>
      instance.connector_id === "codef_card_usage" &&
      instance.status === "connected" &&
      (getCardCompanyId(instance) === cardCompanyId || getConnectionType(instance) === "credit_finance_association"),
  );
}
