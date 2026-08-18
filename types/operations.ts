export type ActivityType =
  | 'Leverancierslevering'
  | 'Ophaling'
  | 'Klantbezorging'
  | 'Voorraadverplaatsing'
  | 'Transport extern magazijn'
  | 'Retour'
  | 'Spoedorder'
  | 'Vaste afspraak';

export type ActivityStatus =
  | 'Verwacht'
  | 'Bevestigd'
  | 'Onderweg'
  | 'Gearriveerd'
  | 'Wordt verwerkt'
  | 'Afgerond'
  | 'Vertraagd'
  | 'Geannuleerd';

export type PlannedActivity = {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  activityType: ActivityType;
  supplierId?: string;
  customerId?: string;
  carrierId?: string;
  reference: string;
  description: string;
  originLocation: string;
  destinationLocation: string;
  expectedPallets: number;
  expectedCases: number;
  expectedItems: number;
  responsibleEmployee: string;
  status: ActivityStatus;
  notes: string;
  slotConfirmed?: boolean;
  appointmentContact?: string;
  actualArrivalTime?: string;
};

export type ActionStatus = 'Nieuw' | 'In behandeling' | 'Wacht op informatie' | 'Opgelost' | 'Gesloten';

export type ActionItem = {
  id: string;
  title: string;
  description: string;
  type: 'Actie' | 'Afwijking';
  priority: 'Laag' | 'Normaal' | 'Hoog' | 'Kritiek';
  owner: string;
  relatedParty?: string;
  relatedActivityId?: string;
  status: ActionStatus;
  createdAt: string;
  dueDate: string;
  resolvedAt?: string;
  notes: string;
};

export type StockLocation = {locationId: string; quantity: number; blocked: number; pallets: number};

export type Article = {
  id: string;
  articleNumber: string;
  description: string;
  productGroup: string;
  unit: string;
  pallets: number;
  cases: number;
  pieces: number;
  stockByLocation: StockLocation[];
  reservedQuantity: number;
  blockedQuantity: number;
  availableQuantity: number;
  lastUpdated: string;
  notes: string;
};

export type Location = {
  id: string;
  name: string;
  type: 'Eigen magazijn' | 'Extern magazijn' | 'Onderweg';
  address: string;
  palletCapacity?: number;
  currentPalletUsage: number;
  contactDetails: string;
};

export type StockMovement = {
  id: string;
  dateTime: string;
  articleId: string;
  quantity: number;
  fromLocation: string;
  toLocation: string;
  type:
    | 'Ontvangst'
    | 'Uitlevering'
    | 'Verplaatsing'
    | 'Correctie'
    | 'Retour'
    | 'Beschadiging'
    | 'Blokkering'
    | 'Vrijgave'
    | 'Transport externe opslag'
    | 'Terughalen externe opslag';
  reference: string;
  performedBy: string;
  notes: string;
  relatedActivityId?: string;
};

export type Partner = {
  id: string;
  kind: 'Leverancier' | 'Klant' | 'Transporteur' | 'Logistieke partner';
  name: string;
  contactPerson: string;
  email: string;
  phone: string;
  service: string;
  usualDays: string;
  usualTime: string;
  location: string;
  averageVolume: string;
  notes: string;
  status: 'Actief' | 'Inactief';
};

export type OrderCheckOutcome = 'Vrijgegeven' | 'Hold' | 'Escalatie nodig';

export type OrderCheckRecord = {
  id: string;
  orderReference: string;
  customer: string;
  incoterm: 'EXW' | 'DAP' | 'Overig';
  orderValue: number;
  netMarginPercentage: number;
  netProfit: number;
  requestedDeliveryDate: string;
  stockAvailable: boolean;
  complianceComplete: boolean;
  documentationComplete: boolean;
  outcome: OrderCheckOutcome;
  owner: string;
  checkedAt: string;
  notes: string;
};

/**
 * Canonieke bronmetadata. Interne records houden altijd hun eigen UUID; een Odoo-ID
 * of 3PL-ID wordt alleen als externe referentie opgeslagen. Daardoor kan een connector
 * later worden toegevoegd zonder het operationele datamodel of de UI te vervangen.
 */
export type SourceSystem = 'manual' | 'csv' | 'demo' | 'odoo' | '3pl' | 'carrier';
export type SyncStatus = 'local' | 'synced' | 'pending' | 'conflict' | 'error';
export type SourceMetadata = {
  system: SourceSystem;
  externalId?: string;
  updatedAt: string;
  syncStatus: SyncStatus;
  lastSyncedAt?: string;
};

export type ShipmentDirection = 'Inbound' | 'Outbound' | 'Transfer' | 'Retour';
export type ShipmentStatus =
  | 'Concept'
  | 'Gepland'
  | 'Bevestigd'
  | 'Onderweg'
  | 'Aangekomen'
  | 'Afgeleverd'
  | 'Vertraagd'
  | 'Geblokkeerd'
  | 'Geannuleerd';

export type ShipmentEvent = {
  id: string;
  occurredAt: string;
  status: ShipmentStatus;
  title: string;
  detail?: string;
  location?: string;
  source: SourceMetadata;
};

export type Shipment = {
  id: string;
  reference: string;
  orderReference?: string;
  direction: ShipmentDirection;
  status: ShipmentStatus;
  supplier?: string;
  customer?: string;
  carrier?: string;
  trackingNumber?: string;
  origin: string;
  destination: string;
  plannedPickupAt?: string;
  actualPickupAt?: string;
  plannedDeliveryAt?: string;
  actualDeliveryAt?: string;
  pallets: number;
  cases: number;
  items: number;
  responsibleEmployee: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
  source: SourceMetadata;
  events: ShipmentEvent[];
};

export type OperationsData = {
  activities: PlannedActivity[];
  actions: ActionItem[];
  articles: Article[];
  locations: Location[];
  movements: StockMovement[];
  orderChecks: OrderCheckRecord[];
  partners: Partner[];
  shipments: Shipment[];
};
