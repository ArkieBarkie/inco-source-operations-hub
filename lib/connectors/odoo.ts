import type {ConnectorResult, OperationsConnector} from './types';
import type {Shipment} from '@/types/operations';

/**
 * Bewuste placeholder. De rest van de app importeert nooit rechtstreeks Odoo-velden.
 * Later hoeft alleen deze adapter te worden ingevuld en getest met de echte database.
 */
export class OdooConnector implements OperationsConnector {
  readonly source = 'odoo' as const;
  readonly mode = 'read-only' as const;

  async testConnection() {
    return {ok: false, message: 'Odoo is voorbereid maar nog niet geconfigureerd.'};
  }

  async pullShipments(_cursor?: string): Promise<ConnectorResult<Shipment>> {
    throw new Error('Odoo-connector is nog niet geactiveerd.');
  }
}
