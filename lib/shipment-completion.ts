import type {ActionItem, OperationsData, Shipment, ShipmentHandlingMode} from '@/types/operations';

const normalize = (value?: string) => (value ?? '').trim().toLocaleLowerCase('nl-NL');
const finalStatuses = ['Afgeleverd', 'Geannuleerd'];
const closedActionStatuses = ['Opgelost', 'Gesloten'];
const documentPattern = /document|batch|coa|certificate|certificaat|pod|proof of delivery|vrachtbrief|paklijst/i;
const receiptPattern = /proof of delivery|\bpod\b|afgeleverd|ontvangst bevestigd|goods receipt|warehouse receipt|received/i;

const percentage = (value: number, total: number) => total > 0 ? Math.round((value / total) * 100) : 0;

function externalLocationTokens(data: OperationsData) {
  return data.locations
    .filter((location) => location.type === 'Extern magazijn')
    .flatMap((location) => [location.name, ...location.address.split(/[·,]/)])
    .map(normalize)
    .filter((value) => value.length > 3);
}

export function shipmentHandlingMode(shipment: Shipment, data: OperationsData): ShipmentHandlingMode {
  if (shipment.handlingMode) return shipment.handlingMode;
  if (shipment.source.system === '3pl' || shipment.events.some((event) => event.source.system === '3pl')) return 'Extern magazijn / 3PL';
  const route = normalize(`${shipment.origin} ${shipment.destination}`);
  if (shipment.direction === 'Transfer' || externalLocationTokens(data).some((token) => route.includes(token))) return 'Extern magazijn / 3PL';
  return 'Eigen magazijn';
}

function relatedActions(shipment: Shipment, data: OperationsData) {
  const references = [shipment.reference, shipment.orderReference].map(normalize).filter(Boolean);
  const activityIds = data.activities
    .filter((activity) => references.includes(normalize(activity.reference)))
    .map((activity) => activity.id);
  return data.actions.filter((action) => {
    if (closedActionStatuses.includes(action.status)) return false;
    if (action.relatedActivityId && activityIds.includes(action.relatedActivityId)) return true;
    const text = normalize(`${action.title} ${action.description} ${action.notes}`);
    return references.some((reference) => text.includes(reference));
  });
}

export type CompletionRequirement = {
  key: 'physical' | 'quantity' | 'documents' | 'blocking';
  label: string;
  detail: string;
  met: boolean;
};

export type ShipmentCompletionAssessment = {
  shipment: Shipment;
  handlingMode: ShipmentHandlingMode;
  isExternal: boolean;
  isFinal: boolean;
  progress: number;
  readyNow: boolean;
  waitingExternal: boolean;
  needsReview: boolean;
  externalConfirmed: boolean;
  requirements: CompletionRequirement[];
  openActions: ActionItem[];
};

export function assessShipmentCompletion(shipment: Shipment, data: OperationsData, now = new Date()): ShipmentCompletionAssessment {
  const handlingMode = shipmentHandlingMode(shipment, data);
  const isExternal = handlingMode === 'Extern magazijn / 3PL';
  const isFinal = finalStatuses.includes(shipment.status);
  const openActions = relatedActions(shipment, data);
  const eventText = shipment.events.map((event) => `${event.title} ${event.detail ?? ''}`).join(' ');
  const externalConfirmed = shipment.source.system === '3pl'
    || shipment.events.some((event) => event.source.system === '3pl')
    || /3pl|extern magazijn|warehouse receipt|goods receipt/i.test(eventText);
  const deliveryEvidence = Boolean(shipment.actualDeliveryAt) || receiptPattern.test(eventText) || isFinal;
  const physicalConfirmed = deliveryEvidence || shipment.status === 'Aangekomen' || externalConfirmed;
  const quantitiesRecorded = shipment.pallets > 0 || shipment.cases > 0 || shipment.items > 0;
  const documentationOpen = openActions.some((action) => documentPattern.test(`${action.title} ${action.description}`));
  const blockingActions = openActions.filter((action) => action.type === 'Afwijking' && ['Hoog', 'Kritiek'].includes(action.priority));
  const requirements: CompletionRequirement[] = [
    {
      key: 'physical',
      label: isExternal ? '3PL-ontvangst of uitlevering bevestigd' : 'Fysieke levering of ontvangst bevestigd',
      detail: isExternal ? 'Bron: WMS-/3PL-status of vastgelegde ontvangstbevestiging.' : 'Werkelijk tijdstip of ontvangstbevestiging aanwezig.',
      met: physicalConfirmed,
    },
    {
      key: 'quantity',
      label: 'Aantallen geregistreerd',
      detail: 'Pallets, colli of stuks zijn bekend.',
      met: quantitiesRecorded,
    },
    {
      key: 'documents',
      label: isExternal ? 'Ontvangstbewijs en batchdocumentatie vrij' : 'POD en documentatie vrij',
      detail: documentationOpen ? 'Er staat nog een documentactie open.' : 'Geen open documentblokkade gevonden.',
      met: !documentationOpen,
    },
    {
      key: 'blocking',
      label: 'Geen blokkerende afwijking',
      detail: blockingActions.length ? `${blockingActions.length} hoge of kritieke afwijking${blockingActions.length === 1 ? '' : 'en'} open.` : 'Geen hoge of kritieke afwijking open.',
      met: shipment.status !== 'Geblokkeerd' && blockingActions.length === 0,
    },
  ];
  const metCount = requirements.filter((requirement) => requirement.met).length;
  const readyNow = !isFinal && shipment.status !== 'Geannuleerd' && requirements.every((requirement) => requirement.met);
  const plannedHasPassed = Boolean(shipment.plannedDeliveryAt) && new Date(shipment.plannedDeliveryAt as string).getTime() <= now.getTime();
  const waitingExternal = isExternal && !isFinal && !readyNow && !externalConfirmed && (physicalConfirmed || plannedHasPassed || ['Onderweg', 'Aangekomen'].includes(shipment.status));
  const needsReview = !isFinal && (shipment.status === 'Geblokkeerd' || blockingActions.length > 0 || documentationOpen);

  return {
    shipment,
    handlingMode,
    isExternal,
    isFinal,
    progress: Math.round((metCount / requirements.length) * 100),
    readyNow,
    waitingExternal,
    needsReview,
    externalConfirmed,
    requirements,
    openActions,
  };
}
export function calculateCompletionOverview(data: OperationsData, now = new Date()) {
  const assessments = data.shipments
    .filter((shipment) => shipment.status !== 'Geannuleerd')
    .map((shipment) => assessShipmentCompletion(shipment, data, now));
  const active = assessments.filter((assessment) => !assessment.isFinal);
  const closed = assessments.filter((assessment) => assessment.shipment.status === 'Afgeleverd');
  const physicallyConfirmed = assessments.filter((assessment) => assessment.requirements.find((item) => item.key === 'physical')?.met);
  const evidenceReady = assessments.filter((assessment) => assessment.requirements.find((item) => item.key === 'documents')?.met && assessment.requirements.find((item) => item.key === 'quantity')?.met);
  const ready = active.filter((assessment) => assessment.readyNow);
  const waitingExternal = active.filter((assessment) => assessment.waitingExternal);
  const review = active.filter((assessment) => assessment.needsReview);
  const external = assessments.filter((assessment) => assessment.isExternal);
  const externalActive = external.filter((assessment) => !assessment.isFinal);
  const externalDelivered = external.filter((assessment) => assessment.shipment.status === 'Afgeleverd');
  const externalOnTime = externalDelivered.filter((assessment) => assessment.shipment.actualDeliveryAt && assessment.shipment.plannedDeliveryAt && new Date(assessment.shipment.actualDeliveryAt).getTime() <= new Date(assessment.shipment.plannedDeliveryAt).getTime());
  const internalDelivered = closed.filter((assessment) => !assessment.isExternal);
  const internalOnTime = internalDelivered.filter((assessment) => assessment.shipment.actualDeliveryAt && assessment.shipment.plannedDeliveryAt && new Date(assessment.shipment.actualDeliveryAt).getTime() <= new Date(assessment.shipment.plannedDeliveryAt).getTime());
  const deliveredWithActualTime = closed.filter((assessment) => assessment.shipment.actualDeliveryAt);
  const activeWithTracking = active.filter((assessment) => assessment.shipment.trackingNumber || assessment.shipment.warehouseReference);
  const connected = active.filter((assessment) => {
    const sources = [assessment.shipment.source.system, ...assessment.shipment.events.map((event) => event.source.system)];
    return sources.some((source) => ['3pl', 'carrier', 'odoo'].includes(source));
  });
  const staleBefore = now.getTime() - 24 * 60 * 60 * 1000;
  const stale = active.filter((assessment) => new Date(assessment.shipment.updatedAt).getTime() < staleBefore && (!assessment.shipment.plannedDeliveryAt || new Date(assessment.shipment.plannedDeliveryAt).getTime() <= now.getTime() + 24 * 60 * 60 * 1000));
  const timestampCoverage = percentage(deliveredWithActualTime.length, closed.length);
  const traceabilityCoverage = percentage(activeWithTracking.length, active.length);
  const sourceConnectionRate = percentage(connected.length, active.length);
  const dataConfidence = Math.round(timestampCoverage * 0.45 + traceabilityCoverage * 0.35 + sourceConnectionRate * 0.2);
  const externalStock = data.articles.reduce((sum, article) => sum + article.stockByLocation
    .filter((stock) => data.locations.find((location) => location.id === stock.locationId)?.type === 'Extern magazijn')
    .reduce((locationSum, stock) => locationSum + stock.quantity, 0), 0);
  const totalStock = data.articles.reduce((sum, article) => sum + article.stockByLocation.reduce((locationSum, stock) => locationSum + stock.quantity, 0), 0);

  return {
    assessments,
    active: active.length,
    closed: closed.length,
    physicallyConfirmed: physicallyConfirmed.length,
    evidenceReady: evidenceReady.length,
    readyNow: ready.length,
    readyItems: ready,
    waitingExternal: waitingExternal.length,
    waitingExternalItems: waitingExternal,
    needsReview: review.length,
    reviewItems: review,
    automationPotential: percentage(ready.length + waitingExternal.length, active.length),
    external: {
      total: external.length,
      active: externalActive.length,
      share: percentage(external.length, assessments.length),
      onTimeRate: percentage(externalOnTime.length, externalDelivered.filter((item) => item.shipment.actualDeliveryAt).length),
      measuredDelivered: externalDelivered.filter((item) => item.shipment.actualDeliveryAt).length,
      stock: externalStock,
      stockShare: percentage(externalStock, totalStock),
    },
    internal: {
      total: assessments.length - external.length,
      active: active.length - externalActive.length,
      onTimeRate: percentage(internalOnTime.length, internalDelivered.filter((item) => item.shipment.actualDeliveryAt).length),
      measuredDelivered: internalDelivered.filter((item) => item.shipment.actualDeliveryAt).length,
    },
    data: {
      timestampCoverage,
      traceabilityCoverage,
      sourceConnectionRate,
      confidence: dataConfidence,
      stale: stale.length,
    },
  };
}
