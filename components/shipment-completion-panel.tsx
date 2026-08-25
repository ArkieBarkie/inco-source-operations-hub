'use client';

import {useMemo, useState} from 'react';
import {useOperations} from '@/components/operations-provider';
import {assessShipmentCompletion} from '@/lib/shipment-completion';
import type {Shipment} from '@/types/operations';

const localDateTime = (value?: string) => {
  const date = value ? new Date(value) : new Date();
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
};

export function ShipmentCompletionPanel({shipment}: {shipment: Shipment}) {
  const {data, saveShipment, canEdit} = useOperations();
  const assessment = useMemo(() => assessShipmentCompletion(shipment, data), [data, shipment]);
  const physicalRequirement = assessment.requirements.find((item) => item.key === 'physical');
  const quantityRequirement = assessment.requirements.find((item) => item.key === 'quantity');
  const documentRequirement = assessment.requirements.find((item) => item.key === 'documents');
  const blockingRequirement = assessment.requirements.find((item) => item.key === 'blocking');
  const [physicalConfirmed, setPhysicalConfirmed] = useState(Boolean(physicalRequirement?.met));
  const [quantitiesConfirmed, setQuantitiesConfirmed] = useState(Boolean(quantityRequirement?.met));
  const [documentsConfirmed, setDocumentsConfirmed] = useState(Boolean(documentRequirement?.met));
  const [completedAt, setCompletedAt] = useState(localDateTime(shipment.actualDeliveryAt));
  const [warehouseReference, setWarehouseReference] = useState(shipment.warehouseReference ?? '');
  const [saved, setSaved] = useState(false);

  const protectedClear = Boolean(blockingRequirement?.met) && shipment.status !== 'Geblokkeerd';
  const canComplete = physicalConfirmed && quantitiesConfirmed && documentsConfirmed && protectedClear && Boolean(completedAt);

  const complete = () => {
    if (!canComplete) return;
    const now = new Date().toISOString();
    const actualDeliveryAt = new Date(completedAt).toISOString();
    const source = {system: 'manual' as const, updatedAt: now, syncStatus: 'local' as const};
    const detail = assessment.isExternal
      ? `3PL-bevestiging, aantallen en documentatie akkoord${warehouseReference.trim() ? ` · externe referentie ${warehouseReference.trim()}` : ''}.`
      : 'Fysieke levering, aantallen en documentatie akkoord.';
    saveShipment({
      ...shipment,
      status: 'Afgeleverd',
      actualDeliveryAt,
      handlingMode: assessment.handlingMode,
      warehouseReference: assessment.isExternal ? warehouseReference.trim() || shipment.warehouseReference : shipment.warehouseReference,
      updatedAt: now,
      source: {...shipment.source, ...source},
      notes: `${shipment.notes.trim()}\nAfronding: ${detail}`.trim(),
      events: [...shipment.events, {
        id: crypto.randomUUID(),
        occurredAt: actualDeliveryAt,
        status: 'Afgeleverd',
        title: assessment.isExternal ? '3PL-afhandeling bevestigd · zending afgerond' : 'Levering bevestigd · zending afgerond',
        detail,
        location: shipment.destination,
        source,
      }],
    });
    setSaved(true);
  };

  if (!canEdit) return null;

  if (saved) {
    return <section className="mb-6 rounded-3xl border border-emerald-200 bg-emerald-50 p-6 text-emerald-900"><p className="text-xs font-bold uppercase tracking-widest">Afronding vastgelegd</p><h2 className="mt-2 text-xl font-bold">De zending is administratief gesloten.</h2><p className="mt-2 text-sm">Planning, werkelijke levertijd en dossierstatus zijn automatisch bijgewerkt.</p></section>;
  }

  if (['Afgeleverd', 'Geannuleerd'].includes(shipment.status)) return null;

  return (
    <section className="card mb-6 overflow-hidden">
      <div className="grid lg:grid-cols-[.72fr_1.28fr]">
        <div className={`p-6 text-white ${assessment.isExternal ? 'bg-gradient-to-br from-violet-700 to-navy' : 'bg-gradient-to-br from-blue-600 to-navy'}`}>
          <p className="text-xs font-bold uppercase tracking-[.18em] text-white/65">Slim afronden</p>
          <h2 className="mt-2 text-2xl font-bold">{assessment.isExternal ? '3PL-afhandeling' : 'Interne afhandeling'}</h2>
          <p className="mt-2 text-sm leading-6 text-white/75">{assessment.isExternal ? 'Bevestig de 3PL-afhandeling op basis van de magazijnstatus of het ontvangstbewijs.' : 'Bevestig de drie operationele feiten. Een vrije tekst is niet nodig.'}</p>
          <div className="mt-5 flex items-center gap-3"><div className="text-4xl font-bold">{assessment.progress}%</div><div className="text-xs leading-5 text-white/65">automatisch<br />herkend</div></div>
          {assessment.isExternal && <div className="mt-5 rounded-xl bg-white/10 p-3 text-xs leading-5"><b>{shipment.warehousePartner || 'Externe magazijnpartner'}</b><br />{shipment.warehouseReference || 'Nog geen externe referentie vastgelegd'}</div>}
        </div>

        <div className="p-6">
          <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-start"><div><p className="label">Afrondcontrole</p><h3 className="mt-1 text-lg font-bold text-navy">Van fysiek klaar naar administratief gesloten</h3></div><span className={`self-start rounded-full px-3 py-1.5 text-xs font-bold ${protectedClear ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>{protectedClear ? 'Geen blokkade' : 'Eerst blokkade oplossen'}</span></div>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <Confirm label={assessment.isExternal ? '3PL bevestigt afhandeling' : 'Levering/ontvangst bevestigd'} checked={physicalConfirmed} onChange={setPhysicalConfirmed} />
            <Confirm label="Aantallen komen overeen" checked={quantitiesConfirmed} onChange={setQuantitiesConfirmed} />
            <Confirm label="POD/documenten compleet" checked={documentsConfirmed} onChange={setDocumentsConfirmed} />
          </div>
          {!protectedClear && <p className="mt-4 rounded-xl bg-red-50 p-3 text-xs leading-5 text-red-800"><b>Afronden is beschermd.</b> {blockingRequirement?.detail}</p>}
          <div className={`mt-5 grid gap-4 ${assessment.isExternal ? 'sm:grid-cols-2' : ''}`}>
            <label className="text-xs font-bold text-slate-600">Werkelijk afgerond op<input type="datetime-local" value={completedAt} onChange={(event) => setCompletedAt(event.target.value)} className="mt-1.5 w-full rounded-xl border px-3 py-2.5 font-normal" /></label>
            {assessment.isExternal && <label className="text-xs font-bold text-slate-600">3PL-/WMS-referentie <span className="font-normal text-slate-400">optioneel</span><input value={warehouseReference} onChange={(event) => setWarehouseReference(event.target.value)} placeholder="Bijv. receipt- of dispatch-ID" className="mt-1.5 w-full rounded-xl border px-3 py-2.5 font-normal" /></label>}
          </div>
          <div className="mt-5 flex flex-col justify-between gap-3 border-t pt-5 sm:flex-row sm:items-center"><p className="text-xs leading-5 text-slate-500">De auditnotitie en tijdlijngebeurtenis worden automatisch opgebouwd.</p><button type="button" disabled={!canComplete} onClick={complete} className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-40">Zending afronden</button></div>
        </div>
      </div>
    </section>
  );
}

function Confirm({label, checked, onChange}: {label: string; checked: boolean; onChange: (value: boolean) => void}) {
  return <label className={`flex min-h-20 cursor-pointer items-start gap-3 rounded-xl border p-3 text-sm font-semibold ${checked ? 'border-emerald-300 bg-emerald-50 text-emerald-900' : 'bg-white text-slate-700'}`}><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="mt-0.5 h-4 w-4 accent-emerald-600" /><span>{label}</span></label>;
}
