import type {ActionItem, OperationsData, Shipment} from '@/types/operations';
import {isShipmentClosed, isShipmentOverdue, sourceLabels} from '@/lib/shipments';
import {assessShipmentCompletion} from '@/lib/shipment-completion';

export type DecisionSeverity = 'Kritiek' | 'Hoog' | 'Normaal';
export type DecisionCategory = 'Zending' | 'Order' | 'Actie';

export type PreparedAction = Pick<
  ActionItem,
  'title' | 'description' | 'type' | 'priority' | 'owner' | 'dueDate' | 'notes' | 'relatedParty' | 'relatedActivityId'
>;

export type DecisionItem = {
  id: string;
  category: DecisionCategory;
  severity: DecisionSeverity;
  score: number;
  title: string;
  summary: string;
  impact: string;
  nextAction: string;
  owner: string;
  reference: string;
  href: string;
  sourceLabel: string;
  sourceUpdatedAt?: string;
  signals: string[];
  orderValue?: number;
  netProfitAtRisk?: number;
  preparedAction?: PreparedAction;
};

const normalize = (value?: string) => (value ?? '').trim().toLocaleLowerCase('nl-NL');
const today = () => new Date().toLocaleDateString('sv-SE', {timeZone: 'Europe/Amsterdam'});
const hoursSince = (value: string, now: Date) => Math.max(0, Math.floor((now.getTime() - new Date(value).getTime()) / 3_600_000));
const euro = (value: number) => new Intl.NumberFormat('nl-NL', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
}).format(value);

function matchingOpenAction(data: OperationsData, references: string[]) {
  const needles = references.map(normalize).filter(Boolean);
  return data.actions.find((action) => {
    if (['Opgelost', 'Gesloten'].includes(action.status)) return false;
    const haystack = normalize(`${action.title} ${action.description} ${action.notes}`);
    return needles.some((reference) => haystack.includes(reference));
  });
}

function shipmentDecision(shipment: Shipment, data: OperationsData, now: Date): DecisionItem | null {
  if (isShipmentClosed(shipment)) return null;
  if (assessShipmentCompletion(shipment, data, now).readyNow) return null;

  const orderCheck = shipment.orderReference
    ? data.orderChecks.find((item) => normalize(item.orderReference) === normalize(shipment.orderReference))
    : undefined;
  const existingAction = matchingOpenAction(data, [shipment.reference, shipment.orderReference ?? '']);
  const overdue = isShipmentOverdue(shipment, now);
  const overdueHours = overdue && shipment.plannedDeliveryAt ? hoursSince(shipment.plannedDeliveryAt, now) : 0;
  const staleHours = hoursSince(shipment.updatedAt, now);
  const signals: string[] = [];

  if (shipment.status === 'Geblokkeerd') signals.push('Zending is operationeel geblokkeerd');
  if (shipment.status === 'Vertraagd') signals.push('Vertraging is expliciet geregistreerd');
  if (overdue) signals.push(`Geplande levering is ${overdueHours} uur verstreken`);
  if (staleHours > 72) signals.push(`Al ${Math.floor(staleHours / 24)} dagen geen update`);
  if (!shipment.carrier) signals.push('Vervoerder ontbreekt');
  if (!shipment.trackingNumber && shipment.status === 'Onderweg') signals.push('Trackingnummer ontbreekt terwijl de zending onderweg is');
  if (orderCheck?.outcome === 'Hold') signals.push('Gekoppelde order staat op hold');
  if (orderCheck?.outcome === 'Escalatie nodig') signals.push('Gekoppelde order vraagt escalatie');
  if (existingAction?.priority === 'Kritiek') signals.push('Kritieke opvolging of escalatie staat open');
  if (shipment.status === 'Geblokkeerd' && orderCheck?.outcome === 'Vrijgegeven') {
    signals.push('Bronconflict: ordercheck is vrijgegeven terwijl de zending geblokkeerd staat');
  }

  if (!signals.length) return null;

  let severity: DecisionSeverity = 'Normaal';
  let score = 45;
  let nextAction = 'Controleer het dossier en leg de actuele status vast.';
  if (shipment.status === 'Geblokkeerd' || orderCheck?.outcome === 'Hold') {
    severity = 'Kritiek';
    score = 100;
    nextAction = 'Bepaal de blokkadeoorzaak en leg vrijgave, herstelactie of escalatie vast.';
  } else if (overdueHours >= 24 || orderCheck?.outcome === 'Escalatie nodig') {
    severity = 'Kritiek';
    score = 95 + Math.min(4, Math.floor(overdueHours / 24));
    nextAction = 'Vraag direct een nieuwe ETA op en bepaal welke klantbelofte of planning geraakt wordt.';
  } else if (shipment.status === 'Vertraagd' || overdue || staleHours > 72) {
    severity = 'Hoog';
    score = 78 + Math.min(12, Math.floor(overdueHours / 6));
    nextAction = 'Bevestig een nieuwe ETA, eigenaar en eerstvolgend controlemoment.';
  } else {
    score = 58;
  }

  const financialParts = [
    orderCheck?.orderValue ? `${euro(orderCheck.orderValue)} orderwaarde` : null,
    orderCheck?.netProfit ? `${euro(orderCheck.netProfit)} nettowinst` : null,
  ].filter(Boolean);
  const impact = financialParts.length
    ? `${financialParts.join(' en ')} kunnen geraakt worden zolang dit dossier niet is opgelost.`
    : shipment.direction === 'Outbound'
      ? 'Klantbelofte, leverbetrouwbaarheid en eventuele transportkosten kunnen geraakt worden.'
      : 'Ontvangstplanning, voorraadbeschikbaarheid en vervolgorders kunnen geraakt worden.';

  const preparedAction = existingAction ? undefined : {
    title: severity === 'Kritiek' ? `Directe opvolging ${shipment.reference}` : `Status en ETA bevestigen · ${shipment.reference}`,
    description: `${nextAction} Signalen: ${signals.join('; ')}.`,
    type: shipment.status === 'Geblokkeerd' ? 'Afwijking' as const : 'Actie' as const,
    priority: severity === 'Kritiek' ? 'Kritiek' as const : severity === 'Hoog' ? 'Hoog' as const : 'Normaal' as const,
    owner: shipment.responsibleEmployee || 'Jorn / Hidde',
    dueDate: today(),
    relatedParty: shipment.customer || shipment.supplier || shipment.carrier,
    notes: `Voorbereid vanuit het Inco Besliscentrum. Bron: ${shipment.reference}.`,
  };

  return {
    id: `shipment-${shipment.id}`,
    category: 'Zending',
    severity,
    score,
    title: `${shipment.reference} vraagt een besluit`,
    summary: `${shipment.status} · ${shipment.origin} → ${shipment.destination}`,
    impact,
    nextAction: existingAction ? `Openstaande actie: ${existingAction.title}` : nextAction,
    owner: existingAction?.owner || shipment.responsibleEmployee || 'Jorn / Hidde',
    reference: shipment.reference,
    href: `/dossiers/${encodeURIComponent(shipment.reference)}`,
    sourceLabel: sourceLabels[shipment.source.system],
    sourceUpdatedAt: shipment.source.updatedAt,
    signals,
    orderValue: orderCheck?.orderValue,
    netProfitAtRisk: orderCheck?.netProfit,
    preparedAction,
  };
}
export function buildDecisionItems(data: OperationsData, now = new Date()): DecisionItem[] {
  const decisions = data.shipments.flatMap((shipment) => {
    const decision = shipmentDecision(shipment, data, now);
    return decision ? [decision] : [];
  });

  for (const orderCheck of data.orderChecks) {
    if (['Vrijgegeven', 'Afgewezen'].includes(orderCheck.outcome)) continue;
    const linkedShipment = data.shipments.find((shipment) => normalize(shipment.orderReference) === normalize(orderCheck.orderReference));
    if (linkedShipment && decisions.some((decision) => decision.reference === linkedShipment.reference)) continue;
    const existingAction = matchingOpenAction(data, [orderCheck.orderReference]);
    const critical = orderCheck.outcome === 'Hold';
    const missing = [
      !orderCheck.stockAvailable ? 'voorraad niet beschikbaar' : null,
      !orderCheck.complianceComplete ? 'compliancecontrole ontbreekt' : null,
      !orderCheck.documentationComplete ? 'documentatie is niet compleet' : null,
    ].filter(Boolean) as string[];
    decisions.push({
      id: `order-${orderCheck.id}`,
      category: 'Order',
      severity: critical ? 'Kritiek' : 'Hoog',
      score: critical ? 94 : 82,
      title: `${orderCheck.orderReference} staat op ${orderCheck.outcome.toLocaleLowerCase('nl-NL')}`,
      summary: `${orderCheck.customer} · ${euro(orderCheck.orderValue)} · ${orderCheck.netMarginPercentage.toFixed(1)}% marge`,
      impact: `${euro(orderCheck.orderValue)} omzet en ${euro(orderCheck.netProfit)} nettowinst wachten op een verantwoord besluit.`,
      nextAction: existingAction?.title || 'Los de ontbrekende controles op of leg heronderhandeling of uitzondering vast.',
      owner: existingAction?.owner || orderCheck.owner,
      reference: orderCheck.orderReference,
      href: `/ordercheck?reference=${encodeURIComponent(orderCheck.orderReference)}`,
      sourceLabel: 'Ordercheck',
      sourceUpdatedAt: orderCheck.checkedAt,
      signals: missing.length ? missing : [`Uitkomst: ${orderCheck.outcome}`],
      orderValue: orderCheck.orderValue,
      netProfitAtRisk: orderCheck.netProfit,
      preparedAction: existingAction ? undefined : {
        title: `Orderblokkade oplossen · ${orderCheck.orderReference}`,
        description: `Controleer ${missing.join(', ') || 'de ordervrijgave'} en leg het besluit vast.`,
        type: 'Actie',
        priority: critical ? 'Kritiek' : 'Hoog',
        owner: orderCheck.owner,
        dueDate: today(),
        relatedParty: orderCheck.customer,
        notes: 'Voorbereid vanuit het Inco Besliscentrum op basis van de ordercheck.',
      },
    });
  }

  for (const action of data.actions) {
    if (['Opgelost', 'Gesloten'].includes(action.status) || action.dueDate >= today()) continue;
    if (!['Kritiek', 'Hoog'].includes(action.priority)) continue;
    const alreadyRepresented = decisions.some((decision) => normalize(`${action.title} ${action.description}`).includes(normalize(decision.reference)));
    if (alreadyRepresented) continue;
    decisions.push({
      id: `action-${action.id}`,
      category: 'Actie',
      severity: action.priority === 'Kritiek' ? 'Kritiek' : 'Hoog',
      score: action.priority === 'Kritiek' ? 90 : 72,
      title: action.title,
      summary: `${action.status} · deadline ${action.dueDate}`,
      impact: 'De afgesproken opvolging is over tijd; risico en eigenaar moeten opnieuw worden bevestigd.',
      nextAction: 'Werk status, deadline of escalatie bij in de actielijst.',
      owner: action.owner,
      reference: action.id,
      href: '/acties',
      sourceLabel: action.type,
      sourceUpdatedAt: action.createdAt,
      signals: [`${action.priority} prioriteit`, 'Deadline is verstreken'],
    });
  }

  return decisions.sort((a, b) => b.score - a.score || a.title.localeCompare(b.title, 'nl-NL'));
}

export function decisionTotals(decisions: DecisionItem[]) {
  return {
    total: decisions.length,
    critical: decisions.filter((decision) => decision.severity === 'Kritiek').length,
    high: decisions.filter((decision) => decision.severity === 'Hoog').length,
    orderValueAtRisk: decisions.reduce((sum, decision) => sum + (decision.orderValue ?? 0), 0),
    netProfitAtRisk: decisions.reduce((sum, decision) => sum + (decision.netProfitAtRisk ?? 0), 0),
  };
}
