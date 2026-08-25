'use client';

import {useState} from 'react';
import {useOperations} from './operations-provider';
import {shipmentStatuses} from '@/lib/shipments';
import type {Shipment, ShipmentDirection, ShipmentHandlingMode, ShipmentStatus} from '@/types/operations';

const localDateTime = (value?: string) => {
  if (!value) return '';
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
};

const toIso = (value: string) => (value ? new Date(value).toISOString() : undefined);

type FormState = {
  reference: string;
  orderReference: string;
  direction: ShipmentDirection;
  status: ShipmentStatus;
  supplier: string;
  customer: string;
  carrier: string;
  trackingNumber: string;
  origin: string;
  destination: string;
  plannedPickupAt: string;
  actualPickupAt: string;
  plannedDeliveryAt: string;
  actualDeliveryAt: string;
  pallets: number;
  cases: number;
  items: number;
  responsibleEmployee: string;
  handlingMode: ShipmentHandlingMode;
  warehousePartner: string;
  warehouseReference: string;
  notes: string;
};

const initialState = (shipment?: Shipment): FormState => ({
  reference: shipment?.reference ?? '',
  orderReference: shipment?.orderReference ?? '',
  direction: shipment?.direction ?? 'Outbound',
  status: shipment?.status ?? 'Gepland',
  supplier: shipment?.supplier ?? '',
  customer: shipment?.customer ?? '',
  carrier: shipment?.carrier ?? '',
  trackingNumber: shipment?.trackingNumber ?? '',
  origin: shipment?.origin ?? '',
  destination: shipment?.destination ?? '',
  plannedPickupAt: localDateTime(shipment?.plannedPickupAt),
  actualPickupAt: localDateTime(shipment?.actualPickupAt),
  plannedDeliveryAt: localDateTime(shipment?.plannedDeliveryAt),
  actualDeliveryAt: localDateTime(shipment?.actualDeliveryAt),
  pallets: shipment?.pallets ?? 0,
  cases: shipment?.cases ?? 0,
  items: shipment?.items ?? 0,
  responsibleEmployee: shipment?.responsibleEmployee ?? 'Jorn',
  handlingMode: shipment?.handlingMode ?? (shipment?.direction === 'Transfer' ? 'Extern magazijn / 3PL' : 'Eigen magazijn'),
  warehousePartner: shipment?.warehousePartner ?? '',
  warehouseReference: shipment?.warehouseReference ?? '',
  notes: shipment?.notes ?? '',
});

export function ShipmentForm({shipment, onClose}: {shipment?: Shipment; onClose: () => void}) {
  const {saveShipment, data} = useOperations();
  const [form, setForm] = useState<FormState>(() => initialState(shipment));
  const [error, setError] = useState('');
  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((current) => ({...current, [key]: value}));

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.reference.trim() || !form.origin.trim() || !form.destination.trim()) {
      setError('Referentie, herkomst en bestemming zijn verplicht.');
      return;
    }
    if (data.shipments.some((item) => item.id !== shipment?.id && item.reference.trim().toLocaleLowerCase('nl-NL') === form.reference.trim().toLocaleLowerCase('nl-NL'))) {
      setError('Deze zendingreferentie bestaat al.');
      return;
    }
    if ([form.pallets, form.cases, form.items].some((amount) => !Number.isInteger(amount) || amount < 0 || amount > 1_000_000_000)) {
      setError('Aantallen moeten positieve gehele getallen zijn.');
      return;
    }
    if (form.plannedPickupAt && form.plannedDeliveryAt && new Date(form.plannedDeliveryAt) < new Date(form.plannedPickupAt)) {
      setError('De geplande levering kan niet vóór de geplande ophaling liggen.');
      return;
    }
    const now = new Date().toISOString();
    const id = shipment?.id ?? crypto.randomUUID();
    const source = shipment?.source ?? {system: 'manual' as const, updatedAt: now, syncStatus: 'local' as const};
    const statusChanged = !shipment || shipment.status !== form.status;
    const nextEvent = statusChanged
      ? {
          id: crypto.randomUUID(),
          occurredAt: now,
          status: form.status,
          title: shipment ? `Status gewijzigd naar ${form.status}` : 'Zending geregistreerd',
          detail: form.notes || undefined,
          location: form.destination || undefined,
          source: {...source, system: 'manual' as const, updatedAt: now, syncStatus: 'local' as const},
        }
      : null;

    const manualSource = {
      ...source,
      system: 'manual' as const,
      originSystem: source.originSystem ?? source.system,
      updatedAt: now,
      syncStatus: source.system === 'odoo' || source.originSystem === 'odoo' ? 'pending' as const : 'local' as const,
    };
    saveShipment({
      id,
      reference: form.reference.trim(),
      orderReference: form.orderReference.trim() || undefined,
      direction: form.direction,
      status: form.status,
      supplier: form.supplier.trim() || undefined,
      customer: form.customer.trim() || undefined,
      carrier: form.carrier.trim() || undefined,
      trackingNumber: form.trackingNumber.trim() || undefined,
      origin: form.origin.trim(),
      destination: form.destination.trim(),
      plannedPickupAt: toIso(form.plannedPickupAt),
      actualPickupAt: toIso(form.actualPickupAt),
      plannedDeliveryAt: toIso(form.plannedDeliveryAt),
      actualDeliveryAt: toIso(form.actualDeliveryAt),
      pallets: Math.max(0, form.pallets),
      cases: Math.max(0, form.cases),
      items: Math.max(0, form.items),
      responsibleEmployee: form.responsibleEmployee,
      handlingMode: form.handlingMode,
      warehousePartner: form.handlingMode === 'Extern magazijn / 3PL' ? form.warehousePartner.trim() || undefined : undefined,
      warehouseReference: form.handlingMode === 'Extern magazijn / 3PL' ? form.warehouseReference.trim() || undefined : undefined,
      notes: form.notes.trim(),
      createdAt: shipment?.createdAt ?? now,
      updatedAt: now,
      source: manualSource,
      externalIdentities: shipment?.externalIdentities,
      events: nextEvent ? [...(shipment?.events ?? []), nextEvent] : shipment?.events ?? [],
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-navy/60 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="shipment-form-title">
      <form onSubmit={submit} className="mx-auto my-4 max-w-4xl rounded-3xl bg-white p-6 shadow-2xl sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="label">Operationeel dossier</p>
            <h2 id="shipment-form-title" className="mt-1 text-2xl font-bold text-navy">{shipment ? 'Zending bijwerken' : 'Zending toevoegen'}</h2>
          </div>
          <button type="button" onClick={onClose} className="min-h-11 rounded-full bg-slate-100 px-4 py-2 text-sm font-bold">Sluiten</button>
        </div>

        {error && <p role="alert" className="mt-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-800">{error}</p>}

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Zendingreferentie *"><input required maxLength={150} value={form.reference} onChange={(e) => set('reference', e.target.value)} /></Field>
          <Field label="Orderreferentie"><input value={form.orderReference} onChange={(e) => set('orderReference', e.target.value)} /></Field>
          <Field label="Richting"><select value={form.direction} onChange={(e) => set('direction', e.target.value as ShipmentDirection)}>{['Inbound', 'Outbound', 'Transfer', 'Retour'].map((value) => <option key={value}>{value}</option>)}</select></Field>
          <Field label="Status"><select value={form.status} onChange={(e) => set('status', e.target.value as ShipmentStatus)}>{shipmentStatuses.map((value) => <option key={value}>{value}</option>)}</select></Field>
          <Field label="Leverancier"><input value={form.supplier} onChange={(e) => set('supplier', e.target.value)} /></Field>
          <Field label="Klant"><input value={form.customer} onChange={(e) => set('customer', e.target.value)} /></Field>
          <Field label="Vervoerder"><input value={form.carrier} onChange={(e) => set('carrier', e.target.value)} /></Field>
          <Field label="Trackingnummer"><input value={form.trackingNumber} onChange={(e) => set('trackingNumber', e.target.value)} /></Field>
          <Field label="Herkomst *"><input required value={form.origin} onChange={(e) => set('origin', e.target.value)} /></Field>
          <Field label="Bestemming *"><input required value={form.destination} onChange={(e) => set('destination', e.target.value)} /></Field>
          <Field label="Geplande ophaling"><input type="datetime-local" value={form.plannedPickupAt} onChange={(e) => set('plannedPickupAt', e.target.value)} /></Field>
          <Field label="Werkelijke ophaling"><input type="datetime-local" value={form.actualPickupAt} onChange={(e) => set('actualPickupAt', e.target.value)} /></Field>
          <Field label="Geplande levering"><input type="datetime-local" value={form.plannedDeliveryAt} onChange={(e) => set('plannedDeliveryAt', e.target.value)} /></Field>
          <Field label="Werkelijke levering"><input type="datetime-local" value={form.actualDeliveryAt} onChange={(e) => set('actualDeliveryAt', e.target.value)} /></Field>
          <Field label="Pallets"><input min="0" type="number" value={form.pallets} onChange={(e) => set('pallets', Number(e.target.value))} /></Field>
          <Field label="Colli"><input min="0" type="number" value={form.cases} onChange={(e) => set('cases', Number(e.target.value))} /></Field>
          <Field label="Stuks"><input min="0" type="number" value={form.items} onChange={(e) => set('items', Number(e.target.value))} /></Field>
          <Field label="Verantwoordelijke"><select value={form.responsibleEmployee} onChange={(e) => set('responsibleEmployee', e.target.value)}><option>Jorn</option><option>Hidde</option><option>Jorn / Hidde</option></select></Field>
          <Field label="Afhandeling"><select value={form.handlingMode} onChange={(e) => set('handlingMode', e.target.value as ShipmentHandlingMode)}><option>Eigen magazijn</option><option>Extern magazijn / 3PL</option><option>Direct zonder magazijn</option></select></Field>
          {form.handlingMode === 'Extern magazijn / 3PL' && <>
            <Field label="3PL-partner"><input value={form.warehousePartner} onChange={(e) => set('warehousePartner', e.target.value)} placeholder="Bijv. Scan Global Logistics" /></Field>
            <Field label="3PL-referentie"><input value={form.warehouseReference} onChange={(e) => set('warehouseReference', e.target.value)} placeholder="WMS- of ontvangstreferentie" /></Field>
          </>}
        </div>
        <Field label="Notities" wide><textarea maxLength={5000} rows={3} value={form.notes} onChange={(e) => set('notes', e.target.value)} /></Field>

        <div className="mt-6 flex justify-end gap-3 border-t pt-5">
          <button type="button" onClick={onClose} className="rounded-xl border px-5 py-3 text-sm font-bold">Annuleren</button>
          <button className="rounded-xl bg-navy px-5 py-3 text-sm font-bold text-white">Zending opslaan</button>
        </div>
      </form>
    </div>
  );
}

function Field({label, wide = false, children}: {label: string; wide?: boolean; children: React.ReactNode}) {
  return <label className={`${wide ? 'mt-4 block' : ''} text-xs font-bold text-slate-600 [&_input]:mt-1.5 [&_input]:w-full [&_input]:rounded-xl [&_input]:border [&_input]:px-3 [&_input]:py-2.5 [&_select]:mt-1.5 [&_select]:w-full [&_select]:rounded-xl [&_select]:border [&_select]:bg-white [&_select]:px-3 [&_select]:py-2.5 [&_textarea]:mt-1.5 [&_textarea]:w-full [&_textarea]:rounded-xl [&_textarea]:border [&_textarea]:px-3 [&_textarea]:py-2.5`}>{label}{children}</label>;
}
