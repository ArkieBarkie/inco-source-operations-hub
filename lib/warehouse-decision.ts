export type WarehouseFlow = 'Kansgestuurd' | 'Herhaalhandel';
export type WarehouseRouteId = 'internal' | 'current3pl' | 'direct' | 'escalate';
export type DecisionConfidence = 'laag' | 'middel' | 'hoog';

export type WarehouseDecisionInputs = {
  reference: string;
  shipmentLinked: boolean;
  flow: WarehouseFlow;
  orderValue: number;
  grossMarginPercentage: number;
  pallets: number;
  cases: number;
  handlingMinutes: number;
  storageDays: number;
  trips: number;
  structuralStorage: boolean;
  internalCapacityAvailable: boolean | null;
  current3plCanMeetDeadline: boolean | null;
  current3plQualified: boolean | null;
  directDeliveryPossible: boolean | null;
  directDeliveryQualified: boolean | null;
  directDeliveryCost: number;
  fragileOrHighValue: boolean;
  criticalHandling: boolean;
  internalCriticalReady: boolean | null;
};

export type WarehouseAssumptions = {
  hourlyRate: number;
  internalAdminMinutes: number;
  travelHoursPerTrip: number;
  vehicleCostPerTrip: number;
  internalStoragePerPalletDay: number;
  internalExpectedExceptionCost: number;
  current3plInboundPerPallet: number;
  current3plOutboundPerOrder: number;
  current3plPickPerCase: number;
  current3plStoragePerPalletDay: number;
  current3plAdminMinutes: number;
  current3plExpectedExceptionCost: number;
  maxInternalPallets: number;
  maxInternalHandlingMinutes: number;
  maxInternalStorageDays: number;
  minimumInternalAdvantage: number;
};

export type WarehouseRouteOption = {
  id: Exclude<WarehouseRouteId, 'escalate'>;
  label: string;
  cost: number | null;
  feasible: boolean;
  blockers: string[];
  warnings: string[];
  contributionAfterLogistics: number | null;
};

export type WarehouseDecisionResult = {
  ready: boolean;
  missing: string[];
  recommendation: WarehouseRouteId | null;
  recommendationLabel: string;
  reason: string;
  confidence: DecisionConfidence;
  grossMarginValue: number;
  options: WarehouseRouteOption[];
  savingsVersusNext: number | null;
  warnings: string[];
  assumptions: string[];
};

export const warehouseRouteLabels: Record<WarehouseRouteId, string> = {
  internal: 'Intern in Amstelveen',
  current3pl: 'Huidige 3PL',
  direct: 'Directe levering',
  escalate: 'Escaleren en eerst ontbrekende randvoorwaarden oplossen',
};

export const defaultWarehouseInputs: WarehouseDecisionInputs = {
  reference: '',
  shipmentLinked: false,
  flow: 'Kansgestuurd',
  orderValue: 0,
  grossMarginPercentage: 20,
  pallets: 1,
  cases: 4,
  handlingMinutes: 45,
  storageDays: 2,
  trips: 1,
  structuralStorage: false,
  internalCapacityAvailable: null,
  current3plCanMeetDeadline: null,
  current3plQualified: null,
  directDeliveryPossible: null,
  directDeliveryQualified: null,
  directDeliveryCost: 0,
  fragileOrHighValue: false,
  criticalHandling: false,
  internalCriticalReady: null,
};

export const defaultWarehouseAssumptions: WarehouseAssumptions = {
  hourlyRate: 125,
  internalAdminMinutes: 15,
  travelHoursPerTrip: 0.75,
  vehicleCostPerTrip: 35,
  internalStoragePerPalletDay: 2.5,
  internalExpectedExceptionCost: 21,
  current3plInboundPerPallet: 18,
  current3plOutboundPerOrder: 15,
  current3plPickPerCase: 2.25,
  current3plStoragePerPalletDay: 0.85,
  current3plAdminMinutes: 12,
  current3plExpectedExceptionCost: 10,
  maxInternalPallets: 2,
  maxInternalHandlingMinutes: 60,
  maxInternalStorageDays: 7,
  minimumInternalAdvantage: 75,
};

const money = (value: number) => Number(value.toFixed(2));

export function calculateWarehouseDecision(inputs: WarehouseDecisionInputs, assumptions = defaultWarehouseAssumptions): WarehouseDecisionResult {
  const missing = [
    !inputs.reference.trim() ? 'Zending of scenarioreferentie' : null,
    inputs.orderValue <= 0 ? 'Order- of inkoopwaarde groter dan €0' : null,
    inputs.grossMarginPercentage <= 0 ? 'Verwachte brutomarge groter dan 0%' : null,
    inputs.pallets <= 0 ? 'Aantal pallets' : null,
    inputs.cases <= 0 ? 'Aantal colli' : null,
    inputs.internalCapacityAvailable === null ? 'Actuele interne capaciteit' : null,
    inputs.current3plCanMeetDeadline === null ? 'Deadlinebevestiging huidige 3PL' : null,
    inputs.current3plQualified === null ? 'Kwalificatie huidige 3PL' : null,
    inputs.directDeliveryPossible === null ? 'Haalbaarheid directe levering' : null,
    inputs.directDeliveryPossible === true && inputs.directDeliveryQualified === null ? 'Traceerbaarheid directe levering' : null,
    inputs.directDeliveryPossible === true && inputs.directDeliveryCost <= 0 ? 'Kosten directe levering' : null,
    inputs.criticalHandling && inputs.internalCriticalReady === null ? 'Interne geschiktheid voor kritieke handling' : null,
  ].filter(Boolean) as string[];

  const grossMarginValue = money(inputs.orderValue * inputs.grossMarginPercentage / 100);
  const internalCost = money(
    (inputs.handlingMinutes / 60 + assumptions.internalAdminMinutes / 60) * assumptions.hourlyRate
    + inputs.trips * (assumptions.travelHoursPerTrip * assumptions.hourlyRate + assumptions.vehicleCostPerTrip)
    + inputs.pallets * inputs.storageDays * assumptions.internalStoragePerPalletDay
    + assumptions.internalExpectedExceptionCost,
  );
  const current3plCost = money(
    inputs.pallets * assumptions.current3plInboundPerPallet
    + assumptions.current3plOutboundPerOrder
    + inputs.cases * assumptions.current3plPickPerCase
    + inputs.pallets * inputs.storageDays * assumptions.current3plStoragePerPalletDay
    + assumptions.current3plAdminMinutes / 60 * assumptions.hourlyRate
    + assumptions.current3plExpectedExceptionCost,
  );
  const internalBlockers = [
    inputs.structuralStorage ? 'Structurele opslag hoort niet in de tijdelijke interne route' : null,
    inputs.internalCapacityAvailable !== true ? (inputs.internalCapacityAvailable === false ? 'Onvoldoende vrije interne palletcapaciteit' : 'Interne capaciteit is nog niet bevestigd') : null,
    inputs.pallets > assumptions.maxInternalPallets ? `Meer dan ${assumptions.maxInternalPallets} pallets` : null,
    inputs.handlingMinutes > assumptions.maxInternalHandlingMinutes ? `Meer dan ${assumptions.maxInternalHandlingMinutes} minuten interne handling` : null,
    inputs.storageDays > assumptions.maxInternalStorageDays ? `Langer dan ${assumptions.maxInternalStorageDays} dagen interne opslag` : null,
    inputs.criticalHandling && inputs.internalCriticalReady !== true ? 'Interne kritieke handling is niet bevestigd' : null,
  ].filter(Boolean) as string[];
  const current3plBlockers = [
    inputs.current3plCanMeetDeadline !== true ? (inputs.current3plCanMeetDeadline === false ? 'Huidige 3PL haalt de deadline niet' : 'Deadline huidige 3PL is nog niet bevestigd') : null,
    inputs.current3plQualified !== true ? (inputs.current3plQualified === false ? 'Huidige 3PL is niet gekwalificeerd voor deze stroom' : 'Kwalificatie huidige 3PL is nog niet bevestigd') : null,
  ].filter(Boolean) as string[];
  const directBlockers = [
    inputs.directDeliveryPossible !== true ? 'Directe levering is niet bevestigd als haalbaar' : null,
    inputs.directDeliveryPossible === true && inputs.directDeliveryQualified !== true ? 'Traceerbaarheid en documenten zijn niet bevestigd' : null,
    inputs.directDeliveryPossible === true && inputs.directDeliveryCost <= 0 ? 'Directe transportkosten ontbreken' : null,
  ].filter(Boolean) as string[];
  const commonWarnings = inputs.fragileOrHighValue ? ['Extra controle op schade, verzekering en overdracht nodig'] : [];

  const option = (id: WarehouseRouteOption['id'], cost: number | null, blockers: string[], warnings: string[] = []): WarehouseRouteOption => ({
    id,
    label: warehouseRouteLabels[id],
    cost,
    feasible: blockers.length === 0,
    blockers,
    warnings: [...commonWarnings, ...warnings],
    contributionAfterLogistics: cost === null ? null : money(grossMarginValue - cost),
  });
  const options = [
    option('internal', internalCost, internalBlockers),
    option('current3pl', current3plCost, current3plBlockers),
    option('direct', inputs.directDeliveryPossible === true && inputs.directDeliveryCost > 0 ? money(inputs.directDeliveryCost) : null, directBlockers),
  ];

  if (missing.length) return {
    ready: false,
    missing,
    recommendation: null,
    recommendationLabel: 'Nog geen advies',
    reason: `Bevestig eerst ${missing.length} ontbrekende ${missing.length === 1 ? 'gegeven' : 'gegevens'}.`,
    confidence: 'laag',
    grossMarginValue,
    options,
    savingsVersusNext: null,
    warnings: commonWarnings,
    assumptions: assumptionLabels(assumptions),
  };

  const feasible = options.filter((item) => item.feasible && item.cost !== null).sort((left, right) => (left.cost ?? Infinity) - (right.cost ?? Infinity));
  if (!feasible.length) return escalationResult('Geen van de beoordeelde routes voldoet aan de bevestigde randvoorwaarden.', grossMarginValue, options, commonWarnings, assumptions);

  let best = feasible[0];
  if (best.id === 'internal') {
    const bestExternal = feasible.find((item) => item.id !== 'internal');
    if (bestExternal && (bestExternal.cost ?? Infinity) - (best.cost ?? 0) < assumptions.minimumInternalAdvantage) best = bestExternal;
  }
  if ((best.cost ?? Infinity) > grossMarginValue) return escalationResult('De logistieke kosten zijn hoger dan de verwachte brutomarge. Commerciële herbeoordeling is nodig.', grossMarginValue, options, commonWarnings, assumptions);

  const next = feasible.find((item) => item.id !== best.id);
  const savingsVersusNext = !next || next.cost === null || best.cost === null ? null : money(Math.abs(next.cost - best.cost));
  const confidence: DecisionConfidence = inputs.shipmentLinked ? 'hoog' : 'middel';
  const reason = best.id === 'internal'
    ? `Intern is haalbaar en minimaal € ${assumptions.minimumInternalAdvantage.toFixed(0)} voordeliger dan de beste bevestigde externe route.`
    : `${best.label} is de voordeligste bevestigde haalbare route binnen capaciteit, deadline en kwalificatie.`;
  return {
    ready: true,
    missing: [],
    recommendation: best.id,
    recommendationLabel: best.label,
    reason,
    confidence,
    grossMarginValue,
    options,
    savingsVersusNext,
    warnings: commonWarnings,
    assumptions: assumptionLabels(assumptions),
  };
}

function escalationResult(reason: string, grossMarginValue: number, options: WarehouseRouteOption[], warnings: string[], assumptions: WarehouseAssumptions): WarehouseDecisionResult {
  return {
    ready: true,
    missing: [],
    recommendation: 'escalate',
    recommendationLabel: warehouseRouteLabels.escalate,
    reason,
    confidence: 'hoog',
    grossMarginValue,
    options,
    savingsVersusNext: null,
    warnings,
    assumptions: assumptionLabels(assumptions),
  };
}

function assumptionLabels(assumptions: WarehouseAssumptions) {
  return [
    `Uurtarief € ${assumptions.hourlyRate.toFixed(2)}`,
    `Interne grens ${assumptions.maxInternalPallets} pallets / ${assumptions.maxInternalHandlingMinutes} minuten / ${assumptions.maxInternalStorageDays} dagen`,
    `Minimaal intern voordeel € ${assumptions.minimumInternalAdvantage.toFixed(2)}`,
    `Huidige 3PL: € ${assumptions.current3plInboundPerPallet.toFixed(2)} inbound/pallet, € ${assumptions.current3plOutboundPerOrder.toFixed(2)} outbound/order en € ${assumptions.current3plPickPerCase.toFixed(2)} per colli`,
  ];
}
