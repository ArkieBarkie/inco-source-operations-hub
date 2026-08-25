'use client';

import {useState} from 'react';
import {useOperations} from '@/components/operations-provider';
import {today} from '@/lib/operations';
import type {PreparedAction} from '@/lib/decision-center';

export function ActionProposal({proposal, buttonLabel = 'Actie voorbereiden'}: {proposal: PreparedAction; buttonLabel?: string}) {
  const {saveAction, canEdit} = useOperations();
  const [open, setOpen] = useState(false);
  const [applied, setApplied] = useState(false);

  const apply = () => {
    saveAction({
      ...proposal,
      id: crypto.randomUUID(),
      status: 'Nieuw',
      createdAt: today(),
    });
    setApplied(true);
    setOpen(false);
  };

  if (applied) {
    return <span className="inline-flex rounded-xl bg-emerald-100 px-3 py-2 text-xs font-bold text-emerald-800">Actie aangemaakt</span>;
  }
  if (!canEdit) return null;
  if (!open) {
    return <button type="button" onClick={() => setOpen(true)} className="rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white">{buttonLabel}</button>;
  }
  return (
    <div className="w-full rounded-2xl border border-blue-200 bg-blue-50 p-4">
      <p className="text-[10px] font-bold uppercase tracking-widest text-blue-700">Wacht op jouw bevestiging</p>
      <h4 className="mt-1 font-bold text-navy">{proposal.title}</h4>
      <p className="mt-2 text-xs leading-5 text-slate-600">{proposal.description}</p>
      <dl className="mt-3 grid gap-2 text-xs sm:grid-cols-3">
        <div><dt className="text-slate-500">Eigenaar</dt><dd className="font-bold">{proposal.owner}</dd></div>
        <div><dt className="text-slate-500">Prioriteit</dt><dd className="font-bold">{proposal.priority}</dd></div>
        <div><dt className="text-slate-500">Deadline</dt><dd className="font-bold">{proposal.dueDate}</dd></div>
      </dl>
      <div className="mt-4 flex flex-wrap justify-end gap-2">
        <button type="button" onClick={() => setOpen(false)} className="rounded-lg border bg-white px-3 py-2 text-xs font-bold">Annuleren</button>
        <button type="button" onClick={apply} className="rounded-lg bg-navy px-3 py-2 text-xs font-bold text-white">Bevestig en maak actie</button>
      </div>
    </div>
  );
}
