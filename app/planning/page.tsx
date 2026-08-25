'use client';

import {useMemo, useState} from 'react';
import {ActivityForm} from '@/components/activity-form';
import {ActivityList} from '@/components/activity-list';
import {KpiCard} from '@/components/kpi-card';
import {useOperations} from '@/components/operations-provider';
import {PageTitle} from '@/components/ui';
import {calculateOperationsKpis, statusForTarget} from '@/lib/kpis';
import {activityWarnings, formatDate, today} from '@/lib/operations';
import type {PlannedActivity} from '@/types/operations';

const monday = (value: string) => {const date = new Date(`${value}T12:00:00`); const day = date.getDay(); date.setDate(date.getDate() - (day === 0 ? 6 : day - 1)); return date;};

export default function Planning() {
  const {data, canEdit} = useOperations();
  const [mode, setMode] = useState<'week' | 'day'>('week');
  const [selected, setSelected] = useState(today());
  const [form, setForm] = useState(false);
  const [type, setType] = useState('');
  const [location, setLocation] = useState('');
  const [status, setStatus] = useState('');
  const [responsible, setResponsible] = useState('');
  const start = monday(selected);
  const days = Array.from({length: 5}, (_, index) => {const date = new Date(start); date.setDate(date.getDate() + index); return date.toISOString().slice(0, 10);});
  const filtered = useMemo(() => data.activities.filter((activity) => (!type || activity.activityType === type) && (!location || activity.originLocation === location || activity.destinationLocation === location) && (!status || activity.status === status) && (!responsible || activity.responsibleEmployee === responsible)), [data.activities, location, responsible, status, type]);
  const warnings = activityWarnings(filtered.filter((activity) => days.includes(activity.date)));
  const kpis = useMemo(() => calculateOperationsKpis(data), [data]);

  return <div className="container-page">
    <PageTitle eyebrow="Eenvoudig plannen" title="Planning" description="Leveringen, ophalingen, klantbezorgingen en voorraadverplaatsingen in één overzicht." action={canEdit?<button onClick={() => setForm(true)} className="rounded-xl bg-navy px-5 py-3 font-bold text-white">+ Activiteit toevoegen</button>:undefined} />
    <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4"><KpiCard label="Bloktijd bevestigd" value={`${kpis.planning.slotConfirmationRate}%`} note={`${kpis.planning.confirmed}/${kpis.planning.total} afspraken`} target="95%" status={statusForTarget(kpis.planning.slotConfirmationRate, 95)} /><KpiCard label="Binnen tijdvenster" value={`${kpis.planning.arrivalOnTimeRate}%`} note={`${kpis.planning.measuredArrivals} aankomsten gemeten`} target="95%" status={statusForTarget(kpis.planning.arrivalOnTimeRate, 95)} /><KpiCard label="Afgerond" value={kpis.planning.completed} note="Gekoppeld aan zendingstatus" /><KpiCard label="Over tijd" value={kpis.planning.overdue} note="Niet afgerond of geannuleerd" status={kpis.planning.overdue ? 'risk' : 'good'} /></div>
    <div className="card p-4"><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
      <label><span className="sr-only">Week van</span><input aria-label="Week van" type="date" value={selected} onChange={(event) => setSelected(event.target.value)} className="min-h-11 w-full rounded-xl border px-3 py-2" /></label>
      <label><span className="sr-only">Activiteitstype</span><select aria-label="Activiteitstype" value={type} onChange={(event) => setType(event.target.value)} className="min-h-11 w-full rounded-xl border bg-white px-3 py-2"><option value="">Alle typen</option>{[...new Set(data.activities.map((activity) => activity.activityType))].map((value) => <option key={value}>{value}</option>)}</select></label>
      <label><span className="sr-only">Locatie</span><select aria-label="Locatie" value={location} onChange={(event) => setLocation(event.target.value)} className="min-h-11 w-full rounded-xl border bg-white px-3 py-2"><option value="">Alle locaties</option>{data.locations.map((value) => <option key={value.id}>{value.name}</option>)}</select></label>
      <label><span className="sr-only">Status</span><select aria-label="Status" value={status} onChange={(event) => setStatus(event.target.value)} className="min-h-11 w-full rounded-xl border bg-white px-3 py-2"><option value="">Alle statussen</option>{[...new Set(data.activities.map((activity) => activity.status))].map((value) => <option key={value}>{value}</option>)}</select></label>
      <label><span className="sr-only">Verantwoordelijke</span><select aria-label="Verantwoordelijke" value={responsible} onChange={(event) => setResponsible(event.target.value)} className="min-h-11 w-full rounded-xl border bg-white px-3 py-2"><option value="">Iedereen</option><option>Jorn</option><option>Hidde</option><option>Jorn / Hidde</option></select></label>
      <div role="group" aria-label="Weergave" className="flex rounded-xl bg-slate-100 p-1"><button type="button" aria-pressed={mode === 'week'} onClick={() => setMode('week')} className={`min-h-11 flex-1 rounded-lg text-sm ${mode === 'week' ? 'bg-white shadow' : ''}`}>Week</button><button type="button" aria-pressed={mode === 'day'} onClick={() => setMode('day')} className={`min-h-11 flex-1 rounded-lg text-sm ${mode === 'day' ? 'bg-white shadow' : ''}`}>Dag</button></div>
    </div></div>
    {warnings.length > 0 && <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4"><b className="text-amber-900">Aandachtspunten</b><div className="mt-2 flex flex-wrap gap-2">{warnings.map((warning) => <span key={warning} className="rounded-lg bg-white px-3 py-1 text-xs text-amber-800">{warning}</span>)}</div></div>}
    {mode === 'week' ? <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">{days.map((date) => <Day key={date} date={date} items={filtered.filter((activity) => activity.date === date)} />)}</div> : <div className="mt-6"><h2 className="mb-4 text-xl font-bold text-navy">{formatDate(selected)}</h2><ActivityList items={filtered.filter((activity) => activity.date === selected)} editable /></div>}
    {canEdit && form && <ActivityForm onClose={() => setForm(false)} />}
  </div>;
}

function Day({date, items}: {date: string; items: PlannedActivity[]}) {return <section><div className={`mb-3 rounded-xl p-3 ${date === today() ? 'bg-violet-100 text-violet-900' : 'bg-white'}`}><b className="capitalize">{formatDate(date)}</b><div className="text-xs">{items.length} activiteiten</div></div><ActivityList items={items} compact editable /></section>;}
