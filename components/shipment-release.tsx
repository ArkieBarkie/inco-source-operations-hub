'use client';

import {useMemo, useState} from 'react';
import {useOperations} from '@/components/operations-provider';
import type {Shipment, ShipmentStatus} from '@/types/operations';

const normalize = (value?: string) => (value ?? '').trim().toLocaleLowerCase('nl-NL');

export function ShipmentRelease({
  shipment,
  onReleased,
}: {
  shipment: Shipment;
  onReleased?: (status: ShipmentStatus, resolvedActions: number) => void;
}) {
  const {data, saveAction, saveShipment, canEdit} = useOperations();
  const [open, setOpen] = useState(false);
  const [causeResolved, setCauseResolved] = useState(false);
  const [controlsChecked, setControlsChecked] = useState(false);
  const [releaseNote, setReleaseNote] = useState('');
  const [status, setStatus] = useState<ShipmentStatus>(shipment.actualPickupAt ? 'Onderweg' : 'Bevestigd');
  const [resolveActions, setResolveActions] = useState(true);

  const relatedActions = useMemo(() => {
    const references = [shipment.reference, shipment.orderReference].map(normalize).filter(Boolean);
    return data.actions.filter((action) => {
      if (['Opgelost', 'Gesloten'].includes(action.status)) return false;
      const text = normalize(`${action.title} ${action.description} ${action.notes}`);
      return references.some((reference) => text.includes(reference));
    });
  }, [data.actions, shipment.orderReference, shipment.reference]);

  const canRelease = causeResolved && controlsChecked && releaseNote.trim().length >= 5;

  const release = () => {
    if (!canRelease) return;
    const now = new Date().toISOString();
    const note = releaseNote.trim();
    const source = {system: 'manual' as const, updatedAt: now, syncStatus: 'local' as const};
    saveShipment({
      ...shipment,
      status,
      updatedAt: now,
      source: {...shipment.source, ...source},
      notes: `${shipment.notes.trim()}\nVrijgegeven: ${note}`.trim(),
      events: [...shipment.events, {
        id: crypto.randomUUID(),
        occurredAt: now,
        status,
        title: `Blokkade vrijgegeven · vervolgstatus ${status}`,
        detail: note,
        location: shipment.actualPickupAt ? shipment.origin : undefined,
        source,
      }],
    });

    if (resolveActions) {
      relatedActions.forEach((action) => saveAction({
        ...action,
        status: 'Opgelost',
        resolvedAt: now,
        notes: `${action.notes.trim()}\nAutomatisch opgelost bij vrijgave van ${shipment.reference}: ${note}`.trim(),
      }));
    }
    onReleased?.(status, resolveActions ? relatedActions.length : 0);
  };

  if (!canEdit) return null;

  if (!open) {
    return <button type="button" onClick={() => setOpen(true)} className="rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-red-800 shadow-sm">Vrijgave beoordelen</button>;
  }

  return (
    <div className="rounded-2xl bg-white p-5 text-slate-800 shadow-xl">
      <div className="flex items-start justify-between gap-4">
        <div><p className="text-xs font-bold uppercase tracking-widest text-red-700">Gecontroleerde vrijgave</p><h3 className="mt-1 text-lg font-bold text-navy">Blokkade van {shipment.reference} opheffen</h3></div>
        <button type="button" onClick={() => setOpen(false)} className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-bold">Sluiten</button>
      </div>
      <p className="mt-3 text-sm leading-6 text-slate-600">Leg aantoonbaar vast waarom deze zending weer door mag. De vrijgave komt als gebeurtenis in de complete tijdlijn.</p>

      <div className="mt-4 space-y-3">
        <label className="flex gap-3 rounded-xl border p-3 text-sm"><input type="checkbox" checked={causeResolved} onChange={(event) => setCauseResolved(event.target.checked)} className="mt-0.5 h-4 w-4" /><span><b>Blokkadeoorzaak is opgelost</b><span className="mt-0.5 block text-xs text-slate-500">Bijvoorbeeld: ontbrekende batchdocumentatie is ontvangen en gecontroleerd.</span></span></label>
        <label className="flex gap-3 rounded-xl border p-3 text-sm"><input type="checkbox" checked={controlsChecked} onChange={(event) => setControlsChecked(event.target.checked)} className="mt-0.5 h-4 w-4" /><span><b>Documentatie en compliance zijn herbeoordeeld</b><span className="mt-0.5 block text-xs text-slate-500">Hiermee los je ook het gedetecteerde bronconflict bewust op.</span></span></label>
        <label className="block text-sm font-bold">Vervolgstatus<select value={status} onChange={(event) => setStatus(event.target.value as ShipmentStatus)} className="mt-1.5 w-full rounded-xl border bg-white px-3 py-2.5 font-normal"><option>Bevestigd</option><option>Onderweg</option><option>Aangekomen</option></select><span className="mt-1 block text-xs font-normal text-slate-500">Onderweg is voorgesteld omdat de werkelijke ophaling al is vastgelegd.</span></label>
        <label className="block text-sm font-bold">Vrijgave-opmerking *<textarea rows={3} value={releaseNote} onChange={(event) => setReleaseNote(event.target.value)} placeholder="Wat is ontvangen of gecontroleerd, en door wie?" className="mt-1.5 w-full rounded-xl border px-3 py-2.5 font-normal" /></label>
        {relatedActions.length > 0 && <label className="flex gap-3 rounded-xl bg-blue-50 p-3 text-sm text-blue-950"><input type="checkbox" checked={resolveActions} onChange={(event) => setResolveActions(event.target.checked)} className="mt-0.5 h-4 w-4" /><span><b>Los {relatedActions.length} gekoppelde actie{relatedActions.length === 1 ? '' : 's'} ook op</b><span className="mt-0.5 block text-xs text-blue-700">{relatedActions.map((action) => action.title).join(' · ')}</span></span></label>}
      </div>

      <div className="mt-5 flex flex-wrap justify-end gap-2">
        <button type="button" onClick={() => setOpen(false)} className="rounded-xl border px-4 py-2.5 text-sm font-bold">Annuleren</button>
        <button type="button" disabled={!canRelease} onClick={release} className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-40">Bevestig vrijgave</button>
      </div>
    </div>
  );
}
