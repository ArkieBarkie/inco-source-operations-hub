'use client';

import Link from 'next/link';
import {useState} from 'react';
import {ActionProposal} from '@/components/action-proposal';
import {useOperations} from '@/components/operations-provider';
import {formatDateTime} from '@/lib/shipments';
import type {DecisionItem} from '@/lib/decision-center';

const severityStyle = {
  Kritiek: 'border-red-200 bg-red-50 text-red-800',
  Hoog: 'border-amber-200 bg-amber-50 text-amber-900',
  Normaal: 'border-blue-200 bg-blue-50 text-blue-800',
};

export function DecisionCard({decision, compact = false}: {decision: DecisionItem; compact?: boolean}) {
  const {data, saveAction, canEdit} = useOperations();
  const [confirmResolve, setConfirmResolve] = useState(false);
  const action = decision.category === 'Actie' ? data.actions.find((item) => item.id === decision.reference) : undefined;
  const linkLabel = decision.category === 'Zending' ? 'Afhandelen in dossier →' : decision.category === 'Order' ? 'Order beoordelen →' : 'Open actie →';
  return (
    <article className={`card overflow-hidden ${decision.severity === 'Kritiek' ? 'border-red-200' : decision.severity === 'Hoog' ? 'border-amber-200' : ''}`}>
      <div className="p-5 sm:p-6">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${severityStyle[decision.severity]}`}>{decision.severity}</span>
              <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{decision.category}</span>
              <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Eigenaar · {decision.owner}</span>
            </div>
            <h3 className="mt-3 text-lg font-bold text-navy">{decision.title}</h3>
            <p className="mt-1 text-sm text-slate-600">{decision.summary}</p>
          </div>
          <Link href={decision.href} className="shrink-0 rounded-xl border bg-white px-4 py-2.5 text-xs font-bold text-navy hover:border-blue-300">{linkLabel}</Link>
        </div>
        {!compact && (
          <>
            <div className="mt-5 grid gap-3 lg:grid-cols-2">
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Waarom nu</p>
                <ul className="mt-2 space-y-1.5 text-sm text-slate-700">{decision.signals.map((signal) => <li key={signal}>• {signal}</li>)}</ul>
              </div>
              <div className="rounded-xl bg-navy p-4 text-white">
                <p className="text-[10px] font-bold uppercase tracking-wide text-blue-200">Impact bij uitblijven actie</p>
                <p className="mt-2 text-sm leading-6 text-blue-50">{decision.impact}</p>
              </div>
            </div>
            <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50/60 p-4">
              <p className="text-[10px] font-bold uppercase tracking-wide text-blue-700">Eerstvolgende actie</p>
              <p className="mt-1 text-sm font-semibold text-slate-800">{decision.nextAction}</p>
            </div>
          </>
        )}
        <div className="mt-4 flex flex-col justify-between gap-3 border-t pt-4 sm:flex-row sm:items-center">
          <p className="text-[11px] text-slate-500">Bron: {decision.sourceLabel}{decision.sourceUpdatedAt ? ` · ${formatDateTime(decision.sourceUpdatedAt)}` : ''}</p>
          {!compact && canEdit && <div className="flex flex-wrap justify-end gap-2">{decision.preparedAction && <ActionProposal proposal={decision.preparedAction} />}{action && !['Opgelost', 'Gesloten'].includes(action.status) && (confirmResolve ? <><button type="button" onClick={() => setConfirmResolve(false)} className="rounded-xl border bg-white px-3 py-2 text-xs font-bold">Annuleren</button><button type="button" onClick={() => saveAction({...action, status: 'Opgelost', resolvedAt: new Date().toISOString()})} className="rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white">Ja, opgelost</button></> : <button type="button" onClick={() => setConfirmResolve(true)} className="rounded-xl bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800">Markeer opgelost</button>)}</div>}
        </div>
      </div>
    </article>
  );
}
