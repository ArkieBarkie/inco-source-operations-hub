'use client';

import {useMemo, useState} from 'react';
import {companyProfile} from '@/data/company-profile';
import {useOperations} from '@/components/operations-provider';
import type {ActionItem, OrderCheckOutcome, OrderCheckRecord} from '@/types/operations';

const today = () => new Date().toLocaleDateString('sv-SE', {timeZone: 'Europe/Amsterdam'});
const normalize = (value?: string) => (value ?? '').trim().toLocaleLowerCase('nl-NL');

export function OrderCheckReview({item, onClose}: {item: OrderCheckRecord; onClose: () => void}) {
  const {data, saveAction, saveOrderCheck, canEdit} = useOperations();
  const [stock, setStock] = useState(item.stockAvailable);
  const [compliance, setCompliance] = useState(item.complianceComplete);
  const [documents, setDocuments] = useState(item.documentationComplete);
  const [outcome, setOutcome] = useState<OrderCheckOutcome>(item.outcome);
  const [owner, setOwner] = useState(item.owner);
  const [note, setNote] = useState('');
  const [exceptionApproved, setExceptionApproved] = useState(false);
  const [saved, setSaved] = useState(false);
  const policy = companyProfile.commercialPolicy;

  const commercialOk = useMemo(() => {
    const valueOk = item.incoterm === 'EXW'
      ? item.orderValue >= policy.minimumOrderValueExw
      : item.incoterm === 'DAP'
        ? item.orderValue >= policy.dapExceptionMinimumOrderValue
        : false;
    return valueOk && item.netMarginPercentage >= policy.minimumNetMarginPercentage && item.netProfit >= policy.minimumNetProfitPerOrder;
  }, [item, policy]);
  const controlsComplete = stock && compliance && documents;
  const releaseAllowed = controlsComplete && (commercialOk || exceptionApproved);
  const noteRequired = outcome !== 'Vrijgegeven' || !commercialOk || exceptionApproved;
  const canSave = (!noteRequired || note.trim().length >= 5) && (outcome !== 'Vrijgegeven' || releaseAllowed);

  const save = () => {
    if (!canSave) return;
    const now = new Date().toISOString();
    const reviewNote = note.trim() || 'Alle operationele en commerciële controles bevestigd.';
    saveOrderCheck({
      ...item,
      stockAvailable: stock,
      complianceComplete: compliance,
      documentationComplete: documents,
      outcome,
      owner,
      checkedAt: now,
      notes: `${item.notes.trim()}\nHerbeoordeling ${today()} · ${outcome}: ${reviewNote}${exceptionApproved ? ' · Uitzondering expliciet goedgekeurd.' : ''}`.trim(),
    });

    if (outcome === 'Escalatie nodig') {
      const existing = data.actions.find((action) => !['Opgelost', 'Gesloten'].includes(action.status) && normalize(`${action.title} ${action.description}`).includes(normalize(item.orderReference)));
      const action: ActionItem = existing ?? {
        id: crypto.randomUUID(),
        title: `Orderescalatie · ${item.orderReference}`,
        description: reviewNote,
        type: 'Afwijking',
        priority: 'Kritiek',
        owner,
        relatedParty: item.customer,
        status: 'Nieuw',
        createdAt: today(),
        dueDate: today(),
        notes: 'Aangemaakt vanuit de commerciële herbeoordeling.',
      };
      saveAction(existing ? {...existing, priority: 'Kritiek', owner, description: `${existing.description}\nHerbeoordeling: ${reviewNote}`} : action);
    }
    setSaved(true);
  };

  if (!canEdit) return null;
  if (saved) return <div className="mb-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-sm text-emerald-900"><b>Orderbesluit vastgelegd: {outcome}.</b> {['Vrijgegeven', 'Afgewezen'].includes(outcome) ? 'Deze melding is definitief afgehandeld en verdwijnt uit het Besliscentrum.' : 'De melding blijft zichtbaar totdat een definitief besluit is vastgelegd.'}<button type="button" onClick={onClose} className="ml-3 font-bold underline">Sluiten</button></div>;

  return (
    <section className="mb-5 rounded-2xl border border-blue-200 bg-blue-50 p-5">
      <div className="flex flex-col justify-between gap-3 sm:flex-row"><div><p className="text-xs font-bold uppercase tracking-widest text-blue-700">Melding afhandelen</p><h3 className="mt-1 text-lg font-bold text-navy">Herbeoordeling {item.orderReference}</h3><p className="mt-1 text-sm text-slate-600">{item.customer} · huidige uitkomst {item.outcome}</p></div><button type="button" onClick={onClose} className="self-start rounded-lg bg-white px-3 py-2 text-xs font-bold">Sluiten</button></div>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <ReviewCheck label="Voorraad beschikbaar" checked={stock} onChange={setStock} />
        <ReviewCheck label="Compliance compleet" checked={compliance} onChange={setCompliance} />
        <ReviewCheck label="Documentatie compleet" checked={documents} onChange={setDocuments} />
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-bold">Besluit<select value={outcome} onChange={(event) => setOutcome(event.target.value as OrderCheckOutcome)} className="mt-1.5 w-full rounded-xl border bg-white px-3 py-2.5 font-normal"><option>Vrijgegeven</option><option>Hold</option><option>Escalatie nodig</option><option>Afgewezen</option></select></label>
        <label className="text-sm font-bold">Eigenaar<select value={owner} onChange={(event) => setOwner(event.target.value)} className="mt-1.5 w-full rounded-xl border bg-white px-3 py-2.5 font-normal"><option>Jorn</option><option>Hidde</option><option>Jorn / Hidde</option></select></label>
      </div>
      {outcome === 'Vrijgegeven' && !commercialOk && <label className="mt-4 flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950"><input type="checkbox" checked={exceptionApproved} onChange={(event) => setExceptionApproved(event.target.checked)} className="mt-0.5 h-4 w-4" /><span><b>Commerciële uitzondering expliciet goedgekeurd</b><span className="mt-0.5 block text-xs text-amber-800">De minimumregels voor waarde, marge of nettowinst zijn niet volledig gehaald.</span></span></label>}
      <label className="mt-4 block text-sm font-bold">Onderbouwing besluit{noteRequired ? ' *' : ' (optioneel)'}<textarea rows={3} value={note} onChange={(event) => setNote(event.target.value)} placeholder={noteRequired ? 'Wat is gecontroleerd en waarom is dit het juiste besluit?' : 'Alle standaardcontroles zijn al groen; alleen invullen bij een bijzonderheid.'} className="mt-1.5 w-full rounded-xl border bg-white px-3 py-2.5 font-normal" /></label>
      {outcome === 'Vrijgegeven' && !releaseAllowed && <p className="mt-3 text-xs font-semibold text-red-700">Vrijgave kan pas na alle drie operationele controles en, indien nodig, expliciete goedkeuring van de commerciële uitzondering.</p>}
      <div className="mt-4 flex justify-end"><button type="button" disabled={!canSave} onClick={save} className="rounded-xl bg-navy px-4 py-2.5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-40">Leg besluit vast</button></div>
    </section>
  );
}

function ReviewCheck({label, checked, onChange}: {label: string; checked: boolean; onChange: (value: boolean) => void}) {
  return <label className={`flex gap-2 rounded-xl border p-3 text-sm font-semibold ${checked ? 'border-emerald-200 bg-emerald-50 text-emerald-900' : 'border-red-200 bg-red-50 text-red-800'}`}><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="mt-0.5 h-4 w-4" />{label}</label>;
}
