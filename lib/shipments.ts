import type {Shipment, ShipmentStatus, SourceSystem} from '@/types/operations';

export const shipmentStatuses: ShipmentStatus[] = [
  'Concept',
  'Gepland',
  'Bevestigd',
  'Onderweg',
  'Aangekomen',
  'Afgeleverd',
  'Vertraagd',
  'Geblokkeerd',
  'Geannuleerd',
];

export const sourceLabels: Record<SourceSystem, string> = {
  manual: 'Handmatige invoer',
  csv: 'CSV/Excel-import',
  demo: 'Testgegevens',
  odoo: 'Odoo',
  '3pl': 'Extern magazijn / 3PL',
  carrier: 'Vervoerder',
};

export const isShipmentClosed = (shipment: Shipment) =>
  ['Afgeleverd', 'Geannuleerd'].includes(shipment.status);

export const isShipmentOverdue = (shipment: Shipment, now = new Date()) =>
  !isShipmentClosed(shipment) &&
  Boolean(shipment.plannedDeliveryAt) &&
  new Date(shipment.plannedDeliveryAt as string).getTime() < now.getTime();

export const shipmentNeedsAttention = (shipment: Shipment) =>
  ['Vertraagd', 'Geblokkeerd'].includes(shipment.status) || isShipmentOverdue(shipment);

export const formatDateTime = (value?: string) => {
  if (!value) return 'Niet vastgelegd';
  return new Intl.DateTimeFormat('nl-NL', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Europe/Amsterdam',
  }).format(new Date(value));
};

export const shipmentSearchText = (shipment: Shipment) =>
  [
    shipment.reference,
    shipment.orderReference,
    shipment.customer,
    shipment.supplier,
    shipment.carrier,
    shipment.trackingNumber,
    shipment.origin,
    shipment.destination,
  ]
    .filter(Boolean)
    .join(' ')
    .toLocaleLowerCase('nl-NL');
