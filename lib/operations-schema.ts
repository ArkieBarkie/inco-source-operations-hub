import {z} from 'zod';
import type {OperationsData} from '@/types/operations';

const id = z.string().trim().min(1).max(150);
const shortText = z.string().trim().max(500);
const longText = z.string().trim().max(5_000);
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
const optionalTime = time.optional();
const dateTime = z.string().max(50).refine((value) => !Number.isNaN(new Date(value).getTime()), 'Ongeldige datum/tijd');
const optionalDateTime = dateTime.optional();
const quantity = z.number().finite().min(0).max(1_000_000_000);
const integerQuantity = z.number().int().min(0).max(1_000_000_000);

const sourceSystem = z.enum(['manual', 'csv', 'demo', 'odoo', '3pl', 'carrier']);
const externalIdentity = z.object({
  source: sourceSystem,
  externalId: z.string().trim().min(1).max(250),
  companyId: z.string().trim().max(100).optional(),
});
const sourceMetadata = z.object({
  system: sourceSystem,
  externalId: z.string().trim().max(250).optional(),
  originSystem: sourceSystem.optional(),
  externalIdentities: z.array(externalIdentity).max(20).optional(),
  updatedAt: dateTime,
  syncStatus: z.enum(['local', 'synced', 'pending', 'conflict', 'error']),
  lastSyncedAt: optionalDateTime,
});

export const activitySchema = z.object({
  id,
  date,
  startTime: time,
  endTime: time,
  activityType: z.enum(['Leverancierslevering', 'Ophaling', 'Klantbezorging', 'Voorraadverplaatsing', 'Transport extern magazijn', 'Retour', 'Spoedorder', 'Vaste afspraak']),
  supplierId: id.optional(),
  customerId: id.optional(),
  carrierId: id.optional(),
  reference: z.string().trim().min(1).max(150),
  description: z.string().trim().min(1).max(1_000),
  originLocation: shortText,
  destinationLocation: shortText,
  expectedPallets: integerQuantity,
  expectedCases: integerQuantity,
  expectedItems: integerQuantity,
  responsibleEmployee: z.string().trim().min(1).max(100),
  status: z.enum(['Verwacht', 'Bevestigd', 'Onderweg', 'Gearriveerd', 'Wordt verwerkt', 'Afgerond', 'Vertraagd', 'Geblokkeerd', 'Geannuleerd']),
  notes: longText,
  slotConfirmed: z.boolean().optional(),
  appointmentContact: shortText.optional(),
  actualArrivalTime: optionalTime,
});

export const actionSchema = z.object({
  id,
  title: z.string().trim().min(1).max(250),
  description: z.string().trim().min(1).max(2_000),
  type: z.enum(['Actie', 'Afwijking']),
  priority: z.enum(['Laag', 'Normaal', 'Hoog', 'Kritiek']),
  owner: z.string().trim().min(1).max(100),
  relatedParty: shortText.optional(),
  relatedActivityId: id.optional(),
  status: z.enum(['Nieuw', 'In behandeling', 'Wacht op informatie', 'Opgelost', 'Gesloten']),
  createdAt: z.string().max(50),
  dueDate: date,
  resolvedAt: z.string().max(50).optional(),
  notes: longText,
});

export const articleSchema = z.object({
  id,
  articleNumber: z.string().trim().min(1).max(150),
  description: z.string().trim().min(1).max(1_000),
  productGroup: shortText,
  unit: z.string().trim().min(1).max(100),
  pallets: integerQuantity,
  cases: integerQuantity,
  pieces: integerQuantity,
  stockByLocation: z.array(z.object({locationId: id, quantity, blocked: quantity, pallets: quantity})).max(500),
  reservedQuantity: quantity,
  blockedQuantity: quantity,
  availableQuantity: z.number().finite().min(-1_000_000_000).max(1_000_000_000),
  lastUpdated: dateTime,
  notes: longText,
  externalIdentities: z.array(externalIdentity).max(20).optional(),
  barcode: z.string().trim().max(150).optional(),
  hsCode: z.string().trim().max(50).optional(),
  countryOfOrigin: z.string().trim().max(100).optional(),
  weightKg: quantity.optional(),
  manufacturerReference: z.string().trim().max(250).optional(),
  salesPrice: quantity.optional(),
  purchasePrice: quantity.optional(),
  packagingSize: z.string().trim().max(250).optional(),
  tracking: z.enum(['none', 'lot', 'serial']).optional(),
  active: z.boolean().optional(),
});

const location = z.object({
  id,
  name: z.string().trim().min(1).max(250),
  type: z.enum(['Eigen magazijn', 'Extern magazijn', 'Onderweg']),
  address: shortText,
  palletCapacity: quantity.optional(),
  currentPalletUsage: quantity,
  contactDetails: shortText,
});

export const movementSchema = z.object({
  id,
  dateTime,
  articleId: id,
  quantity: z.number().finite().min(0.000001).max(1_000_000_000),
  fromLocation: z.string().trim().min(1).max(500),
  toLocation: z.string().trim().min(1).max(500),
  type: z.enum(['Ontvangst', 'Uitlevering', 'Verplaatsing', 'Correctie', 'Retour', 'Beschadiging', 'Blokkering', 'Vrijgave', 'Transport externe opslag', 'Terughalen externe opslag']),
  reference: z.string().trim().min(1).max(150),
  performedBy: z.string().trim().min(1).max(100),
  notes: longText,
  relatedActivityId: id.optional(),
});

export const partnerSchema = z.object({
  id,
  kind: z.enum(['Leverancier', 'Klant', 'Transporteur', 'Logistieke partner']),
  name: z.string().trim().min(1).max(250),
  contactPerson: shortText,
  email: z.union([z.literal(''), z.string().email().max(254)]),
  phone: z.string().trim().max(50),
  service: shortText,
  usualDays: shortText,
  usualTime: z.union([z.literal(''), time]),
  location: shortText,
  averageVolume: shortText,
  notes: longText,
  status: z.enum(['Actief', 'Inactief']),
  externalIdentities: z.array(externalIdentity).max(20).optional(),
});

export const orderCheckSchema = z.object({
  id,
  orderReference: z.string().trim().min(1).max(150),
  customer: z.string().trim().min(1).max(250),
  incoterm: z.enum(['EXW', 'DAP', 'Overig']),
  orderValue: quantity,
  netMarginPercentage: z.number().finite().min(-1_000).max(1_000),
  netProfit: z.number().finite().min(-1_000_000_000).max(1_000_000_000),
  requestedDeliveryDate: date,
  stockAvailable: z.boolean(),
  complianceComplete: z.boolean(),
  documentationComplete: z.boolean(),
  outcome: z.enum(['Vrijgegeven', 'Hold', 'Escalatie nodig', 'Afgewezen']),
  owner: z.string().trim().min(1).max(100),
  checkedAt: dateTime,
  notes: longText,
});

export const warehouseDecisionSchema = z.object({
  id,
  shipmentId: id.optional(),
  reference: z.string().trim().min(1).max(150),
  recommendation: z.enum(['internal', 'current3pl', 'direct', 'alternative3pl', 'escalate']),
  chosenRoute: z.enum(['internal', 'current3pl', 'direct', 'alternative3pl', 'escalate']),
  rationale: z.string().trim().min(3).max(2_000),
  confidence: z.enum(['laag', 'middel', 'hoog']),
  decidedAt: dateTime,
  decidedByUserId: id,
  decidedByName: z.string().trim().min(1).max(100),
  reviewAt: date.optional(),
  inputSnapshot: z.record(z.string().trim().min(1).max(100), z.union([z.string().max(1_000), z.number().finite(), z.boolean(), z.null()])),
  optionSnapshot: z.array(z.object({
    id: z.enum(['internal', 'current3pl', 'direct', 'alternative3pl']),
    label: z.string().trim().min(1).max(150),
    cost: z.number().finite().min(0).nullable(),
    feasible: z.boolean(),
    blockers: z.array(z.string().trim().min(1).max(500)).max(20),
  })).min(1).max(4),
  assumptions: z.array(z.string().trim().min(1).max(500)).max(30),
});

const shipmentStatus = z.enum(['Concept', 'Gepland', 'Bevestigd', 'Onderweg', 'Aangekomen', 'Afgeleverd', 'Vertraagd', 'Geblokkeerd', 'Geannuleerd']);
export const shipmentSchema = z.object({
  id,
  reference: z.string().trim().min(1).max(150),
  orderReference: z.string().trim().max(150).optional(),
  direction: z.enum(['Inbound', 'Outbound', 'Transfer', 'Retour']),
  status: shipmentStatus,
  supplier: shortText.optional(),
  customer: shortText.optional(),
  carrier: shortText.optional(),
  trackingNumber: z.string().trim().max(250).optional(),
  origin: z.string().trim().min(1).max(500),
  destination: z.string().trim().min(1).max(500),
  plannedPickupAt: optionalDateTime,
  actualPickupAt: optionalDateTime,
  plannedDeliveryAt: optionalDateTime,
  actualDeliveryAt: optionalDateTime,
  pallets: integerQuantity,
  cases: integerQuantity,
  items: integerQuantity,
  responsibleEmployee: z.string().trim().min(1).max(100),
  handlingMode: z.enum(['Eigen magazijn', 'Extern magazijn / 3PL', 'Direct zonder magazijn']).optional(),
  warehousePartner: shortText.optional(),
  warehouseReference: z.string().trim().max(250).optional(),
  notes: longText,
  createdAt: dateTime,
  updatedAt: dateTime,
  source: sourceMetadata,
  externalIdentities: z.array(externalIdentity).max(20).optional(),
  events: z.array(z.object({
    id,
    occurredAt: dateTime,
    status: shipmentStatus,
    title: z.string().trim().min(1).max(500),
    detail: longText.optional(),
    location: shortText.optional(),
    source: sourceMetadata,
  })).max(5_000),
});

export const operationsDataSchema = z.object({
  activities: z.array(activitySchema).max(10_000),
  actions: z.array(actionSchema).max(10_000),
  articles: z.array(articleSchema).max(20_000),
  locations: z.array(location).max(1_000),
  movements: z.array(movementSchema).max(50_000),
  orderChecks: z.array(orderCheckSchema).max(20_000),
  partners: z.array(partnerSchema).max(20_000),
  shipments: z.array(shipmentSchema).max(20_000),
  warehouseDecisions: z.array(warehouseDecisionSchema).max(10_000).default([]),
}).superRefine((value, context) => {
  const collections = [value.activities, value.actions, value.articles, value.locations, value.movements, value.orderChecks, value.partners, value.shipments, value.warehouseDecisions];
  for (const collection of collections) {
    const seen = new Set<string>();
    for (const item of collection) {
      if (seen.has(item.id)) context.addIssue({code: 'custom', message: `Dubbele ID: ${item.id}`});
      seen.add(item.id);
    }
  }
  const references = new Set<string>();
  for (const item of value.shipments) {
    const normalized = item.reference.toLocaleLowerCase('nl-NL');
    if (references.has(normalized)) context.addIssue({code: 'custom', message: `Dubbele zendingreferentie: ${item.reference}`});
    references.add(normalized);
  }
});

export function parseOperationsData(value: unknown): OperationsData {
  return operationsDataSchema.parse(value) as OperationsData;
}

export function safeOperationsData(value: unknown) {
  return operationsDataSchema.safeParse(value);
}
