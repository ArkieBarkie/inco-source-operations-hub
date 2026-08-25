'use client';

import {useState} from 'react';
import type {ActionItem} from '@/types/operations';
import {today} from '@/lib/operations';
import {useOperations} from './operations-provider';

export function ActionForm({initial, onClose, type = 'Actie'}: {initial?: ActionItem; onClose: () => void; type?: 'Actie' | 'Afwijking'}) {
  const {saveAction} = useOperations();
  const [value, setValue] = useState<ActionItem>(initial || {id: crypto.randomUUID(), title: '', description: '', type, priority: 'Normaal', owner: 'Jorn / Hidde', status: 'Nieuw', createdAt: new Date().toISOString(), dueDate: today(), notes: ''});
  const [error, setError] = useState('');
  const change = (key: keyof ActionItem, next: string) => setValue((current) => ({...current, [key]: next}));
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!value.title.trim() || !value.description.trim() || !value.owner || !value.dueDate) {
      setError('Vul titel, omschrijving, verantwoordelijke en deadline in.');
      return;
    }
    if (value.title.length > 250 || value.description.length > 2_000 || value.notes.length > 5_000) {
      setError('Eén of meer tekstvelden zijn te lang.');
      return;
    }
    saveAction({...value, title: value.title.trim(), description: value.description.trim(), notes: value.notes.trim()});
    onClose();
  };
  return <div className="fixed inset-0 z-50 grid place-items-center bg-navy/60 p-4" role="dialog" aria-modal="true" aria-labelledby="action-form-title">
    <form onSubmit={submit} className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-6">
      <div className="flex justify-between gap-4"><h2 id="action-form-title" className="text-2xl font-bold text-navy">{initial ? 'Item bewerken' : `${type} toevoegen`}</h2><button type="button" onClick={onClose} aria-label="Sluiten" className="min-h-11 min-w-11 text-2xl">×</button></div>
      {error && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <div className="mt-5 space-y-4">
        <label className="block"><span className="mb-1 block text-sm font-bold">Titel *</span><input required maxLength={250} className="w-full rounded-xl border px-3 py-2.5" value={value.title} onChange={(event) => change('title', event.target.value)} /></label>
        <label className="block"><span className="mb-1 block text-sm font-bold">Korte omschrijving *</span><textarea required maxLength={2000} rows={3} className="w-full rounded-xl border px-3 py-2.5" value={value.description} onChange={(event) => change('description', event.target.value)} /></label>
        <label className="block"><span className="mb-1 block text-sm font-bold">Gekoppelde leverancier of klant</span><input maxLength={500} className="w-full rounded-xl border px-3 py-2.5" value={value.relatedParty || ''} onChange={(event) => change('relatedParty', event.target.value)} /></label>
        <div className="grid gap-3 sm:grid-cols-2">
          <Select label="Type" value={value.type} options={['Actie', 'Afwijking']} onChange={(next) => change('type', next)} />
          <Select label="Prioriteit" value={value.priority} options={['Laag', 'Normaal', 'Hoog', 'Kritiek']} onChange={(next) => change('priority', next)} />
          <Select label="Verantwoordelijke" value={value.owner} options={['Jorn / Hidde', 'Jorn', 'Hidde']} onChange={(next) => change('owner', next)} />
          <Select label="Status" value={value.status} options={['Nieuw', 'In behandeling', 'Wacht op informatie', 'Opgelost', 'Gesloten']} onChange={(next) => change('status', next)} />
          <label><span className="mb-1 block text-sm font-bold">Deadline *</span><input required className="w-full rounded-xl border px-3 py-2.5" type="date" value={value.dueDate} onChange={(event) => change('dueDate', event.target.value)} /></label>
        </div>
        <label className="block"><span className="mb-1 block text-sm font-bold">Notities</span><textarea maxLength={5000} rows={3} className="w-full rounded-xl border px-3 py-2.5" value={value.notes} onChange={(event) => change('notes', event.target.value)} /></label>
      </div>
      <div className="mt-6 flex justify-end gap-3"><button type="button" onClick={onClose} className="min-h-11 rounded-xl border px-4 py-2.5 font-bold">Annuleren</button><button className="min-h-11 rounded-xl bg-navy px-4 py-2.5 font-bold text-white">Opslaan</button></div>
    </form>
  </div>;
}

function Select({label, value, options, onChange}: {label: string; value: string; options: string[]; onChange: (value: string) => void}) {
  return <label><span className="mb-1 block text-sm font-bold">{label}</span><select className="w-full rounded-xl border bg-white px-3 py-2.5" value={value} onChange={(event) => onChange(event.target.value)}>{options.map((option) => <option key={option}>{option}</option>)}</select></label>;
}
