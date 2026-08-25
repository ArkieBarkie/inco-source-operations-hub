import 'server-only';

import {z} from 'zod';
import type {ConnectorResult, OperationsConnector} from './types';
import type {Article, Shipment, ShipmentDirection, ShipmentStatus} from '@/types/operations';

const configSchema = z.object({
  url: z.string().url(),
  database: z.string().trim().max(100).optional(),
  apiKey: z.string().trim().min(20).max(500),
  companyId: z.string().trim().min(1).max(100),
});

type OdooConfiguration = z.infer<typeof configSchema>;
type OdooRecord = Record<string, unknown> & {id: number};

const DEFAULT_ARTICLE_FIELDS = ['id', 'default_code', 'name', 'barcode', 'uom_id', 'weight', 'categ_id', 'standard_price', 'list_price', 'tracking', 'active', 'product_tmpl_id', 'qty_available', 'free_qty', 'write_date'];
const DEFAULT_SHIPMENT_FIELDS = ['id', 'name', 'origin', 'state', 'partner_id', 'picking_type_id', 'location_id', 'location_dest_id', 'scheduled_date', 'date_done', 'write_date'];

function configuredFields(name: 'ODOO_ARTICLE_FIELDS_JSON' | 'ODOO_SHIPMENT_FIELDS_JSON', defaults: string[]) {
  const raw = process.env[name]?.trim();
  if (!raw) return defaults;
  try {
    return z.array(z.string().regex(/^[a-z][a-z0-9_]{0,62}$/)).min(1).max(50).parse(JSON.parse(raw));
  } catch {
    throw new Error(`${name} is ongeldig.`);
  }
}

function getConfiguration(): OdooConfiguration | null {
  const raw = {
    url: process.env.ODOO_URL?.trim(),
    database: process.env.ODOO_DATABASE?.trim() || undefined,
    apiKey: process.env.ODOO_API_KEY?.trim(),
    companyId: process.env.ODOO_COMPANY_ID?.trim(),
  };
  if (!raw.url && !raw.apiKey && !raw.companyId) return null;
  const parsed = configSchema.parse(raw);
  const url = new URL(parsed.url);
  if (url.protocol !== 'https:' && process.env.NODE_ENV === 'production') throw new Error('ODOO_URL moet in productie HTTPS gebruiken.');
  if (url.username || url.password || url.search || url.hash) throw new Error('ODOO_URL mag geen credentials of queryparameters bevatten.');
  return {...parsed, url: url.origin};
}

export function odooConfigurationStatus() {
  try {
    const config = getConfiguration();
    return {configured: Boolean(config), valid: true, mode: 'read-only' as const};
  } catch (error) {
    return {configured: true, valid: false, mode: 'read-only' as const, message: error instanceof Error ? error.message : 'Odoo-configuratie is ongeldig.'};
  }
}

function manyToOne(value: unknown) {
  return Array.isArray(value) && value.length >= 2 ? {id: String(value[0]), name: String(value[1])} : null;
}

function text(value: unknown) {
  return typeof value === 'string' ? value : '';
}

function numeric(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function iso(value: unknown) {
  const raw = text(value);
  if (!raw) return undefined;
  const normalized = raw.includes('T') ? raw : raw.replace(' ', 'T') + 'Z';
  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
}

function shipmentStatus(value: unknown): ShipmentStatus {
  return ({draft: 'Concept', waiting: 'Gepland', confirmed: 'Bevestigd', assigned: 'Bevestigd', done: 'Afgeleverd', cancel: 'Geannuleerd'} as Record<string, ShipmentStatus>)[text(value)] ?? 'Gepland';
}

function shipmentDirection(record: OdooRecord): ShipmentDirection {
  const name = manyToOne(record.picking_type_id)?.name.toLocaleLowerCase('nl-NL') ?? '';
  if (name.includes('receipt') || name.includes('ontvang')) return 'Inbound';
  if (name.includes('return') || name.includes('retour')) return 'Retour';
  if (name.includes('internal') || name.includes('intern')) return 'Transfer';
  return 'Outbound';
}

export class OdooConnector implements OperationsConnector {
  readonly source = 'odoo' as const;
  readonly mode = 'read-only' as const;

  private configuration() {
    const configuration = getConfiguration();
    if (!configuration) throw new Error('Odoo is nog niet geconfigureerd.');
    return configuration;
  }

  private async request<T>(model: string, method: string, body: Record<string, unknown>): Promise<T> {
    const configuration = this.configuration();
    const response = await fetch(`${configuration.url}/json/2/${model}/${method}`, {
      method: 'POST',
      headers: {
        Authorization: `bearer ${configuration.apiKey}`,
        'Content-Type': 'application/json; charset=utf-8',
        'User-Agent': 'Inco-Source-Operations-Hub/1.0',
        ...(configuration.database ? {'X-Odoo-Database': configuration.database} : {}),
      },
      body: JSON.stringify({...body, context: {allowed_company_ids: [Number(configuration.companyId)], lang: 'nl_NL'}}),
      cache: 'no-store',
      signal: AbortSignal.timeout(12_000),
    });
    if (!response.ok) throw new Error(`Odoo gaf HTTP ${response.status}. Controleer API-sleutel, rechten, database en JSON-2-beschikbaarheid.`);
    const raw = await response.text();
    if (raw.length > 10_000_000) throw new Error('Odoo-antwoord is onverwacht groot.');
    return JSON.parse(raw) as T;
  }

  async testConnection() {
    try {
      const result = await this.request<Record<string, unknown>>('res.users', 'context_get', {});
      return {ok: Boolean(result && typeof result === 'object'), message: 'Read-only Odoo JSON-2-verbinding en gebruikerscontext zijn bereikbaar.'};
    } catch (error) {
      return {ok: false, message: error instanceof Error ? error.message : 'Odoo-verbinding is mislukt.'};
    }
  }

  async pullArticles(cursor?: string): Promise<ConnectorResult<Article>> {
    const configuration = this.configuration();
    const fields = configuredFields('ODOO_ARTICLE_FIELDS_JSON', DEFAULT_ARTICLE_FIELDS);
    const records = await this.request<OdooRecord[]>('product.product', 'search_read', {
      domain: cursor ? [['write_date', '>', cursor], ['company_id', 'in', [false, Number(configuration.companyId)]]] : [['company_id', 'in', [false, Number(configuration.companyId)]]],
      fields,
      limit: 200,
      order: 'write_date asc, id asc',
    });
    const receivedAt = new Date().toISOString();
    const articles = records.map((record): Article => {
      const category = manyToOne(record.categ_id);
      const unit = manyToOne(record.uom_id);
      const total = numeric(record.qty_available);
      const available = numeric(record.free_qty);
      const updatedAt = iso(record.write_date) ?? receivedAt;
      return {
        id: crypto.randomUUID(),
        articleNumber: text(record.default_code) || `ODOO-${record.id}`,
        description: text(record.name) || `Odoo-product ${record.id}`,
        productGroup: category?.name ?? '',
        unit: unit?.name ?? 'stuks',
        pallets: 0,
        cases: 0,
        pieces: total,
        stockByLocation: [],
        reservedQuantity: Math.max(0, total - available),
        blockedQuantity: 0,
        availableQuantity: available,
        lastUpdated: updatedAt,
        notes: 'Read-only uit Odoo-preview; nog niet gereconcilieerd met locaties of 3PL-voorraad.',
        externalIdentities: [
          {source: 'odoo', externalId: `product.product:${record.id}`, companyId: configuration.companyId},
          ...(manyToOne(record.product_tmpl_id) ? [{source: 'odoo' as const, externalId: `product.template:${manyToOne(record.product_tmpl_id)?.id}`, companyId: configuration.companyId}] : []),
        ],
        barcode: text(record.barcode) || undefined,
        weightKg: numeric(record.weight),
        salesPrice: numeric(record.list_price),
        purchasePrice: numeric(record.standard_price),
        tracking: ['none', 'lot', 'serial'].includes(text(record.tracking)) ? text(record.tracking) as Article['tracking'] : undefined,
        active: record.active !== false,
      };
    });
    return {records: articles, receivedAt, cursor: records.length ? text(records.at(-1)?.write_date) : cursor, warnings: ['Preview gebruikt alleen bevestigde kernvelden. HS-code, oorsprong, fabrikantreferentie en verpakking vereisen een gevalideerde veldmapping.']};
  }

  async pullShipments(cursor?: string): Promise<ConnectorResult<Shipment>> {
    const configuration = this.configuration();
    const fields = configuredFields('ODOO_SHIPMENT_FIELDS_JSON', DEFAULT_SHIPMENT_FIELDS);
    const records = await this.request<OdooRecord[]>('stock.picking', 'search_read', {
      domain: cursor ? [['write_date', '>', cursor], ['company_id', '=', Number(configuration.companyId)]] : [['company_id', '=', Number(configuration.companyId)]],
      fields,
      limit: 200,
      order: 'write_date asc, id asc',
    });
    const receivedAt = new Date().toISOString();
    const shipments = records.map((record): Shipment => {
      const direction = shipmentDirection(record);
      const partner = manyToOne(record.partner_id)?.name;
      const updatedAt = iso(record.write_date) ?? receivedAt;
      const externalIdentity = {source: 'odoo' as const, externalId: `stock.picking:${record.id}`, companyId: configuration.companyId};
      return {
        id: crypto.randomUUID(),
        reference: text(record.name) || `ODOO-PICK-${record.id}`,
        orderReference: text(record.origin) || undefined,
        direction,
        status: shipmentStatus(record.state),
        supplier: direction === 'Inbound' ? partner : undefined,
        customer: direction === 'Outbound' || direction === 'Retour' ? partner : undefined,
        origin: manyToOne(record.location_id)?.name ?? '',
        destination: manyToOne(record.location_dest_id)?.name ?? '',
        plannedDeliveryAt: iso(record.scheduled_date),
        actualDeliveryAt: iso(record.date_done),
        pallets: 0,
        cases: 0,
        items: 0,
        responsibleEmployee: 'Nog toewijzen',
        notes: 'Read-only uit Odoo-preview; aantallen en transportvelden vereisen aanvullende veldmapping.',
        createdAt: updatedAt,
        updatedAt,
        source: {system: 'odoo', originSystem: 'odoo', externalId: String(record.id), externalIdentities: [externalIdentity], updatedAt, lastSyncedAt: receivedAt, syncStatus: 'synced'},
        externalIdentities: [externalIdentity],
        events: [{id: crypto.randomUUID(), occurredAt: updatedAt, status: shipmentStatus(record.state), title: 'Status gelezen uit Odoo', source: {system: 'odoo', originSystem: 'odoo', externalId: String(record.id), externalIdentities: [externalIdentity], updatedAt, lastSyncedAt: receivedAt, syncStatus: 'synced'}}],
      };
    });
    return {records: shipments, receivedAt, cursor: records.length ? text(records.at(-1)?.write_date) : cursor, warnings: ['Preview schrijft niets terug en importeert nog niet. Bevestig locaties, pickingtypes, aantallen en vervoerdersvelden eerst in de Odoo-sandbox.']};
  }
}
