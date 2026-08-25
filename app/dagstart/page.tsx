'use client';

import Link from 'next/link';
import {useState} from 'react';
import {ActionForm} from '@/components/action-form';
import {ActivityForm} from '@/components/activity-form';
import {ActivityList} from '@/components/activity-list';
import {useOperations} from '@/components/operations-provider';
import {StatusBadge} from '@/components/ui';
import {activityWarnings, formatDate, openAction, today} from '@/lib/operations';

export default function Dagstart() {
  const {data, canEdit} = useOperations();
  const [activity, setActivity] = useState(false);
  const [action, setAction] = useState<'Actie' | 'Afwijking' | null>(null);
  const [presentation, setPresentation] = useState(false);
  const date = today();
  const activities = data.activities.filter((item) => item.date === date);
  const actions = data.actions.filter(openAction);
  const warnings = activityWarnings(activities);
  const incoming = activities.filter((item) => item.activityType === 'Leverancierslevering');
  const outgoing = activities.filter((item) => ['Ophaling', 'Klantbezorging'].includes(item.activityType));

  return <div className="container-page">
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div><p className="label">Gezamenlijke dagstart</p><h1 className="mt-2 text-4xl font-bold text-navy">Vandaag · {formatDate(date)}</h1><p className="mt-2 text-slate-600">In vijf minuten: wat komt binnen, wat gaat uit en waar moeten we achteraan?</p></div>
      <div className="flex flex-wrap gap-2"><button type="button" aria-pressed={presentation} onClick={() => setPresentation((value) => !value)} className={`rounded-xl px-4 py-3 text-sm font-bold ${presentation ? 'bg-emerald-600 text-white' : 'border bg-white text-navy'}`}>{presentation ? 'Presentatiemodus sluiten' : 'Start presentatiemodus'}</button>{canEdit && !presentation && <><button type="button" onClick={() => setActivity(true)} className="rounded-xl bg-navy px-4 py-3 text-sm font-bold text-white">+ Activiteit</button><button type="button" onClick={() => setAction('Afwijking')} className="rounded-xl bg-red-50 px-4 py-3 text-sm font-bold text-red-700">Afwijking melden</button></>}</div>
    </div>
    <div className="mt-7 grid grid-cols-2 gap-3 lg:grid-cols-5">{[[incoming.length, 'Leveringen'], [outgoing.length, 'Uitgaand'], [actions.length, 'Open acties'], [actions.filter((item) => item.priority === 'Kritiek' || item.priority === 'Hoog').length, 'Hoge prioriteit'], [activities.filter((item) => item.status === 'Vertraagd').length, 'Vertraagd']].map(([number, label]) => <div className="card p-4" key={label}><div className="text-2xl font-bold text-navy">{number}</div><div className="mt-1 text-xs text-slate-500">{label}</div></div>)}</div>
    <div className="mt-7 grid gap-6 xl:grid-cols-3">
      <section className="xl:col-span-2"><h2 className="mb-4 text-xl font-bold text-navy">Planning van vandaag</h2><ActivityList items={activities} editable={!presentation} /></section>
      <aside className="space-y-6">
        <section className="card p-5"><div className="flex justify-between"><h2 className="font-bold text-navy">Openstaande acties</h2>{canEdit && !presentation && <button type="button" onClick={() => setAction('Actie')} className="text-sm font-bold text-accent">+ Actie</button>}</div>{actions.length ? <div className="mt-4 space-y-3">{actions.slice(0, 6).map((item) => <div key={item.id} className="rounded-xl bg-slate-50 p-3"><div className="flex items-center justify-between gap-2"><b className="text-sm">{item.title}</b><StatusBadge value={item.priority} /></div><p className="mt-1 text-xs text-slate-500">{item.owner} · {item.dueDate}</p></div>)}</div> : <p className="mt-4 text-sm leading-6 text-slate-500">Geen open acties. Leg afspraken met leveranciers of vervoerders direct vast zodra opvolging nodig is.</p>}<Link href="/acties" className="mt-4 block text-sm font-bold text-accent">Alle acties →</Link></section>
        {warnings.length > 0 && <section className="card border-amber-200 bg-amber-50 p-5"><h2 className="font-bold text-amber-900">Nog controleren</h2><ul className="mt-3 space-y-2 text-sm text-amber-800">{warnings.map((warning) => <li key={warning}>• {warning}</li>)}</ul></section>}
        <Link href="/magazijnbeslissing" className="block rounded-2xl bg-navy p-5 text-white"><p className="text-xs font-bold uppercase tracking-widest text-blue-300">Beslismoment</p><h2 className="mt-2 font-bold">Tijdrovende goederenstroom?</h2><p className="mt-2 text-sm text-blue-100">Vergelijk intern met het extern magazijn / 3PL voordat commerciële tijd verdwijnt.</p></Link>
      </aside>
    </div>
    {canEdit && activity && <ActivityForm onClose={() => setActivity(false)} />}
    {canEdit && action && <ActionForm type={action} onClose={() => setAction(null)} />}
  </div>;
}
