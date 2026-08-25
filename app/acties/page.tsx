'use client';
import {useMemo,useState} from 'react';
import {useOperations} from '@/components/operations-provider';
import {ActionForm} from '@/components/action-form';
import {KpiCard} from '@/components/kpi-card';
import {Empty,PageTitle,StatusBadge} from '@/components/ui';
import {openAction,today} from '@/lib/operations';
import type {ActionItem} from '@/types/operations';
import {calculateOperationsKpis,statusForTarget} from '@/lib/kpis';

export default function Acties(){
  const {data,saveAction,deleteAction,canEdit}=useOperations();
  const [form,setForm]=useState<'Actie'|'Afwijking'|null>(null);
  const [edit,setEdit]=useState<ActionItem|null>(null);
  const [showClosed,setShowClosed]=useState(false);
  const kpis=useMemo(()=>calculateOperationsKpis(data),[data]);
  const items=data.actions.filter(x=>showClosed||openAction(x)).sort((a,b)=>a.dueDate.localeCompare(b.dueDate));
  return <div className="container-page">
    <PageTitle eyebrow="Centraal opvolgen" title="Acties en afwijkingen" description="Taken, problemen en afspraken met een duidelijke eigenaar en deadline." action={canEdit?<div className="flex gap-2"><button onClick={()=>setForm('Actie')} className="rounded-xl bg-navy px-4 py-3 font-bold text-white">+ Actie</button><button onClick={()=>setForm('Afwijking')} className="rounded-xl bg-red-50 px-4 py-3 font-bold text-red-700">+ Afwijking</button></div>:undefined}/>
    <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4"><KpiCard label="Open" value={kpis.actions.open} note={`${kpis.actions.critical} kritiek`} status={kpis.actions.critical?'watch':'good'}/><KpiCard label="Over tijd" value={kpis.actions.overdue} note="Deadline verstreken" status={kpis.actions.overdue?'risk':'good'}/><KpiCard label="Onder controle" value={`${kpis.actions.controlRate}%`} note="Open acties binnen deadline" target="90%" status={statusForTarget(kpis.actions.controlRate,90)}/><KpiCard label="Opgelost" value={`${kpis.actions.resolutionRate}%`} note={`${kpis.actions.resolved} van ${kpis.actions.total}`}/></div>
    <label className="mb-5 flex items-center gap-2 text-sm"><input type="checkbox" checked={showClosed} onChange={e=>setShowClosed(e.target.checked)}/> Toon opgeloste en gesloten items</label>
    {items.length?<div className="space-y-4">{items.map(x=><article key={x.id} className={`card p-5 ${x.dueDate<today()&&openAction(x)?'border-red-300':''}`}><div className="flex flex-col justify-between gap-4 sm:flex-row"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h2 className="font-bold text-navy">{x.title}</h2><StatusBadge value={x.priority}/><StatusBadge value={x.status}/></div><p className="mt-2 text-sm text-slate-600">{x.description}</p><div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-500"><span>Type: {x.type}</span><span>Eigenaar: {x.owner}</span><span>Deadline: {x.dueDate}</span>{x.relatedParty&&<span>Relatie: {x.relatedParty}</span>}</div></div>{canEdit&&<div className="flex shrink-0 gap-2"><button onClick={()=>setEdit(x)} className="rounded-lg border px-3 py-2 text-xs font-bold">Bewerken</button>{openAction(x)&&<button onClick={()=>saveAction({...x,status:'Opgelost',resolvedAt:today()})} className="rounded-lg bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700">Opgelost</button>}<button onClick={()=>confirm('Dit item verwijderen?')&&deleteAction(x.id)} className="rounded-lg bg-red-50 px-3 py-2 text-xs font-bold text-red-700">Verwijderen</button></div>}</div></article>)}</div>:<Empty><div><p className="font-bold text-navy">Geen open acties</p><p className="mt-1">Leg alleen vast wat echt opvolging of een besluit nodig heeft.</p></div></Empty>}
    {canEdit&&form&&<ActionForm type={form} onClose={()=>setForm(null)}/>} {canEdit&&edit&&<ActionForm initial={edit} onClose={()=>setEdit(null)}/>}
  </div>
}
