import type {OperationsData} from '@/types/operations';
import {calculateCompletionOverview} from '@/lib/shipment-completion';

const closedActionStatuses = ['Opgelost', 'Gesloten'];
const finalShipmentStatuses = ['Afgeleverd', 'Geannuleerd'];
const finalOrderOutcomes = ['Vrijgegeven', 'Afgewezen'];
const roundRate = (value: number, total: number) => total > 0 ? Math.round((value / total) * 100) : 0;
const localDate = (value: Date | string) => new Date(value).toLocaleDateString('sv-SE', {timeZone: 'Europe/Amsterdam'});

export type KpiStatus = 'good' | 'watch' | 'risk';
export const statusForTarget = (value: number, target: number): KpiStatus => value >= target ? 'good' : value >= target - 10 ? 'watch' : 'risk';

export function calculateOperationsKpis(data: OperationsData, now = new Date()) {
  const today = localDate(now);
  const deliveredShipments = data.shipments.filter((shipment) => shipment.status === 'Afgeleverd');
  const activeShipments = data.shipments.filter((shipment) => !finalShipmentStatuses.includes(shipment.status));
  const onTimeShipments = deliveredShipments.filter((shipment) => shipment.actualDeliveryAt && shipment.plannedDeliveryAt && new Date(shipment.actualDeliveryAt).getTime() <= new Date(shipment.plannedDeliveryAt).getTime());
  const overdueShipments = activeShipments.filter((shipment) => shipment.plannedDeliveryAt && new Date(shipment.plannedDeliveryAt).getTime() < now.getTime());
  const delayedShipments = activeShipments.filter((shipment) => shipment.status === 'Vertraagd');
  const blockedShipments = activeShipments.filter((shipment) => shipment.status === 'Geblokkeerd');
  const shipmentOnTimeRate = roundRate(onTimeShipments.length, deliveredShipments.filter((shipment) => shipment.actualDeliveryAt && shipment.plannedDeliveryAt).length);
  const measuredDeliveredShipments = deliveredShipments.filter((shipment) => shipment.actualDeliveryAt && shipment.plannedDeliveryAt);

  const plannedActivities = data.activities.filter((activity) => activity.status !== 'Geannuleerd');
  const confirmedActivities = plannedActivities.filter((activity) => activity.slotConfirmed);
  const completedActivities = plannedActivities.filter((activity) => activity.status === 'Afgerond');
  const measuredArrivals = plannedActivities.filter((activity) => activity.actualArrivalTime && activity.endTime);
  const onTimeArrivals = measuredArrivals.filter((activity) => String(activity.actualArrivalTime) <= activity.endTime);
  const overdueActivities = plannedActivities.filter((activity) => activity.date < today && !['Afgerond', 'Geannuleerd'].includes(activity.status));
  const slotConfirmationRate = roundRate(confirmedActivities.length, plannedActivities.length);
  const arrivalOnTimeRate = roundRate(onTimeArrivals.length, measuredArrivals.length);

  const openActions = data.actions.filter((action) => !closedActionStatuses.includes(action.status));
  const overdueActions = openActions.filter((action) => action.dueDate < today);
  const criticalActions = openActions.filter((action) => action.priority === 'Kritiek');
  const resolvedActions = data.actions.filter((action) => closedActionStatuses.includes(action.status));
  const actionControlRate = openActions.length ? roundRate(Math.max(0, openActions.length - overdueActions.length), openActions.length) : data.actions.length ? 100 : 0;
  const actionResolutionRate = roundRate(resolvedActions.length, data.actions.length);

  const releasedOrders = data.orderChecks.filter((order) => order.outcome === 'Vrijgegeven');
  const rejectedOrders = data.orderChecks.filter((order) => order.outcome === 'Afgewezen');
  const openOrderDecisions = data.orderChecks.filter((order) => !finalOrderOutcomes.includes(order.outcome));
  const orderDecisionRate = roundRate(releasedOrders.length + rejectedOrders.length, data.orderChecks.length);
  const orderReleaseRate = roundRate(releasedOrders.length, data.orderChecks.length);
  const orderValueAtRisk = openOrderDecisions.reduce((sum, order) => sum + order.orderValue, 0);
  const netProfitAtRisk = openOrderDecisions.reduce((sum, order) => sum + order.netProfit, 0);

  const stockTotal = data.articles.reduce((sum, article) => sum + article.stockByLocation.reduce((articleSum, location) => articleSum + location.quantity, 0), 0);
  const stockAvailable = data.articles.reduce((sum, article) => sum + article.availableQuantity, 0);
  const stockBlocked = data.articles.reduce((sum, article) => sum + article.blockedQuantity, 0);
  const stockReserved = data.articles.reduce((sum, article) => sum + article.reservedQuantity, 0);
  const stockAvailabilityRate = roundRate(stockAvailable, stockTotal);
  const completion = calculateCompletionOverview(data, now);

  const score = Math.round(
    shipmentOnTimeRate * 0.3
    + slotConfirmationRate * 0.15
    + arrivalOnTimeRate * 0.1
    + actionControlRate * 0.2
    + orderDecisionRate * 0.15
    + stockAvailabilityRate * 0.1
  );

  const dailyFlow = Array.from({length: 7}, (_, offset) => {
    const date = new Date(now);
    date.setDate(date.getDate() - (6 - offset));
    const key = localDate(date);
    return {
      date: key,
      label: new Intl.DateTimeFormat('nl-NL', {weekday: 'short', day: 'numeric', timeZone: 'Europe/Amsterdam'}).format(date),
      planned: data.shipments.filter((shipment) => shipment.plannedDeliveryAt && localDate(shipment.plannedDeliveryAt) === key).length,
      completed: data.shipments.filter((shipment) => shipment.actualDeliveryAt && localDate(shipment.actualDeliveryAt) === key).length,
    };
  });

  return {
    score,
    scoreLabel: score >= 90 ? 'Sterk onder controle' : score >= 75 ? 'Aandacht nodig' : 'Direct bijsturen',
    shipments: {total: data.shipments.length, active: activeShipments.length, delivered: deliveredShipments.length, measuredDelivered: measuredDeliveredShipments.length, onTime: onTimeShipments.length, onTimeRate: shipmentOnTimeRate, overdue: overdueShipments.length, delayed: delayedShipments.length, blocked: blockedShipments.length},
    planning: {total: plannedActivities.length, confirmed: confirmedActivities.length, completed: completedActivities.length, slotConfirmationRate, arrivalOnTimeRate, measuredArrivals: measuredArrivals.length, overdue: overdueActivities.length},
    actions: {total: data.actions.length, open: openActions.length, overdue: overdueActions.length, critical: criticalActions.length, resolved: resolvedActions.length, controlRate: actionControlRate, resolutionRate: actionResolutionRate},
    orders: {total: data.orderChecks.length, released: releasedOrders.length, rejected: rejectedOrders.length, open: openOrderDecisions.length, decisionRate: orderDecisionRate, releaseRate: orderReleaseRate, orderValueAtRisk, netProfitAtRisk},
    inventory: {total: stockTotal, available: stockAvailable, blocked: stockBlocked, reserved: stockReserved, availabilityRate: stockAvailabilityRate},
    completion,
    dailyFlow,
  };
}
