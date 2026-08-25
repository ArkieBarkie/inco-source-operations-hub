'use client';

import {useState} from 'react';
import type {PlannedActivity} from '@/types/operations';
import {StatusBadge} from './ui';
import {useOperations} from './operations-provider';
import {ActivityForm} from './activity-form';

export function ActivityList({items, compact = false, editable = false}: {items: PlannedActivity[]; compact?: boolean; editable?: boolean}) {
  const {saveActivity, deleteActivity, canEdit} = useOperations();
  const [edit, setEdit] = useState<PlannedActivity | null>(null);
  if (!items.length) return <div className="rounded-xl border border-dashed p-6 text-center text-sm text-slate-500">Geen activiteiten gepland.</div>;

  return <div className="space-y-3">{[...items].sort((a, b) => a.startTime.localeCompare(b.startTime)).map((activity) => {
    const late = Boolean(activity.actualArrivalTime && activity.endTime && activity.actualArrivalTime > activity.endTime);
    return <article key={activity.id} className={`rounded-2xl border bg-white ${compact ? 'p-4' : 'p-5'} ${activity.status === 'Vertraagd' || late ? 'border-red-300' : 'border-slate-200'}`}>
      <div className={`flex flex-col gap-3 ${compact ? '' : 'sm:flex-row sm:items-start'}`}>
        <div className={compact ? 'shrink-0' : 'w-28 shrink-0'}><div className="whitespace-nowrap text-xl font-bold text-navy">{activity.startTime}–{activity.endTime}</div><div className={`mt-1 text-[11px] font-bold ${activity.slotConfirmed ? 'text-emerald-700' : 'text-amber-700'}`}>{activity.slotConfirmed ? 'Bloktijd bevestigd' : 'Bevestiging nodig'}</div></div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2"><span className="min-w-0 break-words font-bold text-navy">{activity.activityType}</span><StatusBadge value={activity.status} />{late && <span className="rounded-full bg-red-100 px-2.5 py-1 text-xs font-bold text-red-700">Buiten bloktijd</span>}</div>
          <p className="mt-1 break-words text-sm font-semibold text-slate-700">{activity.description}</p>
          {!compact && <div className="mt-3 grid gap-2 text-xs text-slate-500 sm:grid-cols-3"><span><b>Referentie:</b> {activity.reference}</span><span><b>Hoeveelheid:</b> {activity.expectedPallets} pallets · {activity.expectedCases} colli</span><span><b>Eigenaar:</b> {activity.responsibleEmployee}</span>{activity.appointmentContact && <span><b>Bevestigd door:</b> {activity.appointmentContact}</span>}{activity.actualArrivalTime && <span className={late ? 'font-bold text-red-700' : ''}><b>Aankomst:</b> {activity.actualArrivalTime}</span>}{(activity.originLocation || activity.destinationLocation) && <span className="sm:col-span-3"><b>Route:</b> {activity.originLocation || '—'} → {activity.destinationLocation || '—'}</span>}{activity.notes && <span className="sm:col-span-3"><b>Opmerking:</b> {activity.notes}</span>}</div>}
        </div>
        {editable && canEdit && <div className="no-print flex flex-wrap gap-2"><button onClick={() => setEdit(activity)} className="rounded-lg border px-3 py-2 text-xs font-bold">Bewerken</button>{activity.status !== 'Afgerond' && <button onClick={() => saveActivity({...activity, status: 'Afgerond'})} className="rounded-lg bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700">Afronden</button>}<button onClick={() => confirm('Deze activiteit verwijderen?') && deleteActivity(activity.id)} className="rounded-lg bg-red-50 px-3 py-2 text-xs font-bold text-red-700">Verwijderen</button></div>}
      </div>
    </article>;
  })}{canEdit && edit && <ActivityForm initial={edit} onClose={() => setEdit(null)} />}</div>;
}
