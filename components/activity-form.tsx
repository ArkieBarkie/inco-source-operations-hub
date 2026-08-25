'use client';

import {cloneElement, useId, useState} from 'react';
import type {ActivityStatus, ActivityType, PlannedActivity} from '@/types/operations';
import {today} from '@/lib/operations';
import {useOperations} from './operations-provider';

const types: ActivityType[] = ['Leverancierslevering', 'Ophaling', 'Klantbezorging', 'Voorraadverplaatsing', 'Transport extern magazijn', 'Retour', 'Spoedorder', 'Vaste afspraak'];
const statuses: ActivityStatus[] = ['Verwacht', 'Bevestigd', 'Onderweg', 'Gearriveerd', 'Wordt verwerkt', 'Afgerond', 'Vertraagd', 'Geblokkeerd', 'Geannuleerd'];

export function ActivityForm({initial, onClose}: {initial?: PlannedActivity; onClose: () => void}) {
  const {saveActivity, data} = useOperations();
  const [value, setValue] = useState<PlannedActivity>(initial || {
    id: crypto.randomUUID(), date: today(), startTime: '09:00', endTime: '10:00', activityType: 'Leverancierslevering', reference: '', description: '', originLocation: '', destinationLocation: 'Amstelveen', expectedPallets: 0, expectedCases: 0, expectedItems: 0, responsibleEmployee: 'Jorn / Hidde', status: 'Verwacht', notes: '', slotConfirmed: false, appointmentContact: '',
  });
  const [error, setError] = useState('');
  const set = (key: keyof PlannedActivity, next: string | number | boolean) => setValue((current) => ({...current, [key]: next}));
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!value.date || !value.startTime || !value.endTime || !value.reference.trim() || !value.description.trim() || !value.responsibleEmployee) {
      setError('Vul datum, volledige bloktijd, referentie, omschrijving en verantwoordelijke in.');
      return;
    }
    if (value.endTime <= value.startTime) {
      setError('De eindtijd moet na de starttijd liggen.');
      return;
    }
    if ([value.expectedPallets, value.expectedCases, value.expectedItems].some((amount) => !Number.isInteger(amount) || amount < 0 || amount > 1_000_000_000)) {
      setError('Aantallen moeten positieve gehele getallen zijn.');
      return;
    }
    const duplicate = data.activities.some((activity) => activity.id !== value.id && activity.date === value.date && activity.reference.trim().toLocaleLowerCase('nl-NL') === value.reference.trim().toLocaleLowerCase('nl-NL'));
    if (duplicate) {
      setError('Deze referentie staat al op dezelfde datum in de planning.');
      return;
    }
    saveActivity({...value, reference: value.reference.trim(), description: value.description.trim(), notes: value.notes.trim()});
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-navy/60 p-4" role="dialog" aria-modal="true" aria-labelledby="activity-form-title">
      <form onSubmit={submit} className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex justify-between"><div><p className="label">Leverafspraak</p><h2 id="activity-form-title" className="mt-1 text-2xl font-bold text-navy">{initial ? 'Afspraak bewerken' : 'Afspraak inplannen'}</h2></div><button type="button" onClick={onClose} className="min-h-11 min-w-11 text-2xl" aria-label="Sluiten">×</button></div>
        <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm leading-6 text-blue-900"><b>Bloktijd is leidend.</b> Bevestig datum, start- en eindtijd schriftelijk. Bij uitloop: direct bellen, nieuwe ETA vastleggen en als afwijking opvolgen.</div>
        {error && <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p>}
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <Field label="Type"><select value={value.activityType} onChange={(event) => set('activityType', event.target.value)}>{types.map((type) => <option key={type}>{type}</option>)}</select></Field>
          <Field label="Referentienummer *"><input required maxLength={150} value={value.reference} onChange={(event) => set('reference', event.target.value)} /></Field>
          <Field label="Datum *"><input type="date" value={value.date} onChange={(event) => set('date', event.target.value)} /></Field>
          <div className="grid grid-cols-2 gap-3"><Field label="Bloktijd vanaf *"><input type="time" value={value.startTime} onChange={(event) => set('startTime', event.target.value)} /></Field><Field label="Bloktijd tot *"><input type="time" value={value.endTime} onChange={(event) => set('endTime', event.target.value)} /></Field></div>
          <Field label="Afspraak bevestigd door"><input value={value.appointmentContact || ''} onChange={(event) => set('appointmentContact', event.target.value)} /></Field>
          <div><span className="mb-1.5 block text-sm font-bold text-slate-700">Bevestiging</span><label className="flex min-h-11 items-center gap-3 rounded-xl border px-3 py-2.5"><input type="checkbox" checked={Boolean(value.slotConfirmed)} onChange={(event) => set('slotConfirmed', event.target.checked)} /><span className="text-sm font-semibold">Bloktijd schriftelijk bevestigd</span></label></div>
          <Field label="Werkelijke aankomst"><input type="time" value={value.actualArrivalTime || ''} onChange={(event) => set('actualArrivalTime', event.target.value)} /></Field>
          <Field label="Omschrijving *" wide><input required maxLength={1000} value={value.description} onChange={(event) => set('description', event.target.value)} /></Field>
          <Field label="Herkomst"><input value={value.originLocation} onChange={(event) => set('originLocation', event.target.value)} list="locations" /></Field>
          <Field label="Bestemming"><input value={value.destinationLocation} onChange={(event) => set('destinationLocation', event.target.value)} list="locations" /></Field>
          <datalist id="locations">{data.locations.map((location) => <option key={location.id} value={location.name} />)}</datalist>
          <Field label="Pallets"><input type="number" min="0" value={value.expectedPallets} onChange={(event) => set('expectedPallets', Number(event.target.value))} /></Field>
          <Field label="Dozen / colli"><input type="number" min="0" value={value.expectedCases} onChange={(event) => set('expectedCases', Number(event.target.value))} /></Field>
          <Field label="Verantwoordelijke *"><select value={value.responsibleEmployee} onChange={(event) => set('responsibleEmployee', event.target.value)}><option>Jorn / Hidde</option><option>Jorn</option><option>Hidde</option></select></Field>
          <Field label="Status"><select value={value.status} onChange={(event) => set('status', event.target.value)}>{statuses.map((status) => <option key={status}>{status}</option>)}</select></Field>
          <Field label="Opmerkingen" wide><textarea maxLength={5000} rows={3} value={value.notes} onChange={(event) => set('notes', event.target.value)} /></Field>
        </div>
        <div className="mt-6 flex justify-end gap-3"><button type="button" onClick={onClose} className="rounded-xl border px-5 py-3 font-bold">Annuleren</button><button className="rounded-xl bg-navy px-5 py-3 font-bold text-white">Leverafspraak opslaan</button></div>
      </form>
    </div>
  );
}

function Field({label, wide, children}: {label: string; wide?: boolean; children: React.ReactElement}) {
  const id = useId();
  return <div className={wide ? 'sm:col-span-2' : ''}><label htmlFor={id} className="mb-1.5 block text-sm font-bold text-slate-700">{label}</label><span className="[&>input]:w-full [&>select]:w-full [&>textarea]:w-full [&>*]:rounded-xl [&>*]:border [&>*]:px-3 [&>*]:py-2.5">{cloneElement(children as React.ReactElement<{id?: string}>, {id})}</span></div>;
}
