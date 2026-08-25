import type {Article, Shipment, SourceSystem} from '@/types/operations';

export type ConnectorResult<T> = {
  records: T[];
  receivedAt: string;
  cursor?: string;
  warnings: string[];
};

/**
 * Iedere externe bron vertaalt zijn eigen velden naar het canonieke Inco-Source-model.
 * Dashboard, Copilot en bedrijfsregels spreken alleen dit contract aan.
 */
export interface OperationsConnector {
  readonly source: SourceSystem;
  readonly mode: 'read-only' | 'read-write';
  testConnection(): Promise<{ok: boolean; message: string}>;
  pullShipments(cursor?: string): Promise<ConnectorResult<Shipment>>;
  pullArticles(cursor?: string): Promise<ConnectorResult<Article>>;
}

export type ExternalShipmentIdentity = {
  source: SourceSystem;
  externalId: string;
};
