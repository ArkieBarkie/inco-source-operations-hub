'use client';

import {useMemo, useState} from 'react';
import {useOperations} from '@/components/operations-provider';
import type {ActionItem, Shipment} from '@/types/operations';

type Mode = 'block' | 'escalate' | null;
const today = () => new Date().toLocaleDateString('sv-SE', {timeZone: 'Europe/Amsterdam'});
const normalize = (value?: string) => (value ?? '').trim().toLocaleLowerCase('nl-NL');

export function ShipmentControls({shipment, onEdit}: {shipment: Shipment; onEdit: () => void}) {
  const {data, saveAction, saveShipment, canEdit} = useOperations();
  const [mode, setMode] = useState<Mode>(null);
  const [reasonType, setReasonType] = useState('Documentatie ontbreekt');
  const [reason, setReason] = useState('');
  const [owner, setOwner] = useState(shipment.responsibleEmployee || 'Jorn / Hidde');
  const [message, setMessage] = useState('');

  const existingEscalation = useMemo(() => data.actions.find((action) => {
    if (['Opgelost', 'Gesloten'].includes(action.status)) return false;
    const text = normalize(`${action.title} ${action.description} ${action.notes}`);
    return action.priority === 'Kritiek' && text.includes(normalize(shipment.reference));
  }), [data.actions, shipment.reference]);

  const saveOperationalAction = (kind: 'block' | 'escalate') => {
    const detail = reason.trim();
    if (detail.length < 5) return;
    const now = new Date().toISOString();
    const source = {system: 'manual' as const, updatedAt: now, syncStatus: 'local' as const};

    if (kind === 'block') {
      saveShipment({
        ...shipment,
        status: 'Geblokkeerd',
        responsibleEmployee: owner,
        updatedAt: now,
        source: {...shipment.source, ...source},
        notes: `${shipment.notes.trim()}\nGeblokkeerd · ${reasonType}: ${detail}`.trim(),
        events: [...shipment.events, {
          id: crypto.randomUUID(),
          occurredAt: now,
          status: 'Geblokkeerd',
          title: `Blokkade ingesteld · ${reasonType}`,
          detail,
          location: shipment.actualPickupAt ? shipment.origin : undefined,
          source,
        }],
      });
    } else {
      saveShipment({
        ...shipment,
        responsibleEmployee: owner,
        updatedAt: now,
        source: {...shipment.source, ...source},
        events: [...shipment.events, {
          id: crypto.randomUUID(),
          occurredAt: now,
          status: shipment.status,
          title: 'Operationele escalatie gestart',
          detail,
          location: shipment.actualPickupAt ? shipment.origin : undefined,
          source,
        }],
      });
    }

    const existing = kind === 'escalate' ? existingEscalation : undefined;
    const action: ActionItem = existing ?? {
      id: crypto.randomUUID(),
      title: `${kind === 'block' ? 'Blokkade oplossen' : 'Escalatie'} · ${shipment.reference}`,
      description: `${reasonType}: ${detail}`,
      type: 'Afwijking',
      priority: 'Kritiek',
      owner,
      relatedParty: shipment.customer || shipment.supplier || shipment.carrier,
      status: 'Nieuw',
      createdAt: today(),
      dueDate: today(),
      notes: `Aangemaakt vanuit het operationele dossier ${shipment.reference}.`,
    };
    saveAction(existing ? {...existing, description: `${existing.description}\nNieuwe escalatie: ${detail}`, owner, priority: 'Kritiek'} : action);
    setMessage(kind === 'block' ? 'Zending geblokkeerd en kritieke herstelactie aangemaakt.' : existing ? 'Bestaande kritieke escalatie is aangevuld.' : 'Escalatie vastgelegd en kritieke actie aangemaakt.');
    setReason('');
    setMode(null);
  };

  if (!canEdit) return null;

  return (
    <section className="card mb-6 p-4 no-print">
      <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-center">
        <div><p className="text-xs font-bold uppercase tracking-widest text-slate-400">Snelle dossieractie</p><p className="mt-1 text-sm text-slate-600">Werk een melding af, blokkeer de operatie of leg een escalatie met eigenaar vast.</p></div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={onEdit} className="rounded-xl border bg-white px-4 py-2.5 text-sm font-bold text-navy">Dossier bijwerken</button>
          {shipment.status !== 'Geblokkeerd' && !['Afgeleverd', 'Geannuleerd'].includes(shipment.status) && <button type="button" onClick={() => {setMode(mode === 'block' ? null : 'block'); setMessage('');}} className="rounded-xl bg-red-50 px-4 py-2.5 text-sm font-bold text-red-700">Zending blokkeren</button>}
          {!['Afgeleverd', 'Geannuleerd'].includes(shipment.status) && <button type="button" onClick={() => {setMode(mode === 'escalate' ? null : 'escalate'); setMessage('');}} className="rounded-xl bg-amber-100 px-4 py-2.5 text-sm font-bold text-amber-900">Escaleren</button>}
        </div>
      </div>
      {message && <div className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">{message}</div>}
      {mode && <div className={`mt-4 rounded-2xl border p-5 ${mode === 'block' ? 'border-red-200 bg-red-50' : 'border-amber-200 bg-amber-50'}`}>
        <div className="flex flex-col justify-between gap-2 sm:flex-row"><div><p className="text-xs font-bold uppercase tracking-widest text-slate-500">{mode === 'block' ? 'Blokkade registreren' : 'Escalatie registreren'}</p><h3 className="mt-1 font-bold text-navy">{mode === 'block' ? 'Zending direct stilzetten' : 'Kritieke opvolging starten'}</h3></div><button type="button" onClick={() => setMode(null)} className="self-start text-xs font-bold text-slate-500">Sluiten</button></div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-bold">Redencategorie<select value={reasonType} onChange={(event) => setReasonType(event.target.value)} className="mt-1.5 w-full rounded-xl border bg-white px-3 py-2.5 font-normal"><option>Documentatie ontbreekt</option><option>Compliance of kwaliteit</option><option>Voorraad of levering</option><option>Transportafwijking</option><option>Klantbesluit nodig</option><option>Overig</option></select></label>
          <label className="text-sm font-bold">Eigenaar<select value={owner} onChange={(event) => setOwner(event.target.value)} className="mt-1.5 w-full rounded-xl border bg-white px-3 py-2.5 font-normal"><option>Jorn</option><option>Hidde</option><option>Jorn / Hidde</option></select></label>
        </div>
        <label className="mt-4 block text-sm font-bold">Reden en gewenste uitkomst *<textarea rows={3} value={reason} onChange={(event) => setReason(event.target.value)} placeholder={mode === 'block' ? 'Waarom mag deze zending nu niet verder?' : 'Wat moet worden besloten, door wie en vóór wanneer?'} className="mt-1.5 w-full rounded-xl border bg-white px-3 py-2.5 font-normal" /></label>
        {mode === 'escalate' && existingEscalation && <p className="mt-3 rounded-xl bg-white/70 p-3 text-xs text-amber-900">Er bestaat al een kritieke actie: <b>{existingEscalation.title}</b>. Deze wordt aangevuld in plaats van dubbel aangemaakt.</p>}
        <div className="mt-4 flex justify-end"><button type="button" disabled={reason.trim().length < 5} onClick={() => saveOperationalAction(mode)} className={`rounded-xl px-4 py-2.5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-40 ${mode === 'block' ? 'bg-red-700' : 'bg-amber-700'}`}>{mode === 'block' ? 'Bevestig blokkade' : 'Start escalatie'}</button></div>
      </div>}
    </section>
  );
}
