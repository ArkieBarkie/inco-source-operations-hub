'use client';

import {useEffect, useMemo, useState} from 'react';
import Link from 'next/link';
import {companyProfile} from '@/data/company-profile';
import {useOperations} from '@/components/operations-provider';
import {OrderCheckReview} from '@/components/order-check-review';
import type {OrderCheckOutcome, OrderCheckRecord} from '@/types/operations';

type Incoterm = 'EXW' | 'DAP' | 'Overig';

export default function Ordervrijgave() {
  const {data, canEdit} = useOperations();
  const [review, setReview] = useState<OrderCheckRecord | null>(null);
  const [queryLoaded, setQueryLoaded] = useState(false);
  const policy = companyProfile.commercialPolicy;
  const [value, setValue] = useState(0);
  const [margin, setMargin] = useState(0);
  const [profit, setProfit] = useState(0);
  const [incoterm, setIncoterm] = useState<Incoterm>('EXW');
  const [dapApproved, setDapApproved] = useState(false);
  const [complete, setComplete] = useState(false);

  const rules = useMemo(() => {
    const valueRules = incoterm === 'EXW'
      ? [{label: `Orderwaarde EXW minimaal € ${policy.minimumOrderValueExw.toLocaleString('nl-NL')}`, ok: value >= policy.minimumOrderValueExw}]
      : incoterm === 'DAP'
        ? [{label: `Orderwaarde DAP minimaal € ${policy.dapExceptionMinimumOrderValue.toLocaleString('nl-NL')}`, ok: value >= policy.dapExceptionMinimumOrderValue}, {label: 'DAP-uitzonderingsakkoord vastgelegd', ok: dapApproved}]
        : [{label: 'Voor overige Incoterms ontbreekt nog een bevestigde waarderegel', ok: false}];
    return [...valueRules, {label: `Nettomarge minimaal ${policy.minimumNetMarginPercentage}%`, ok: margin >= policy.minimumNetMarginPercentage}, {label: `Nettowinst minimaal € ${policy.minimumNetProfitPerOrder.toLocaleString('nl-NL')} per order`, ok: profit >= policy.minimumNetProfitPerOrder}, {label: 'Klant-, product-, voorraad-, leverdatum- en compliancecontrole is afgerond', ok: complete}];
  }, [complete, dapApproved, incoterm, margin, policy, profit, value]);
  const release = rules.every((rule) => rule.ok);
  const counts = (outcome: OrderCheckOutcome) => data.orderChecks.filter((item) => item.outcome === outcome).length;

  useEffect(() => {
    if (queryLoaded) return;
    const reference = new URLSearchParams(window.location.search).get('reference');
    if (reference) {
      const item = data.orderChecks.find((candidate) => candidate.orderReference === reference);
      if (item) {setReview(item); setQueryLoaded(true); return;}
    }
    if (data.orderChecks.length) setQueryLoaded(true);
  }, [data.orderChecks, queryLoaded]);

  return <div className="container-page">
    <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="label">Commerciële poort</p><h1 className="mt-2 text-4xl font-bold text-navy">Ordervrijgave</h1><p className="mt-3 max-w-2xl leading-7 text-slate-600">Bevestig dat commerciële én operationele minimumregels zijn gehaald voordat een order wordt toegezegd of uitgevoerd.</p></div><Link href="/sops/sop-009-klantorder-verwerken" className="text-sm font-bold text-accent">Open SOP-009 →</Link></header>
    <p className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950"><b>Voorlopige beleidsregels.</b> De grenswaarden komen uit de ingevulde vragenlijst. De exacte marge-opbouw en overige Incoterms moeten vóór Odoo-writeback formeel worden bevestigd.</p>

    {data.orderChecks.length > 0 && <section className="card mt-7 overflow-hidden">
      <div className="border-b bg-slate-50 px-5 py-4"><div className="flex flex-col justify-between gap-3 md:flex-row md:items-center"><div><p className="text-xs font-bold uppercase tracking-widest text-slate-500">Testdata · huidige week</p><h2 className="mt-1 text-lg font-bold text-navy">Te beoordelen orderdossiers</h2></div><div className="flex flex-wrap gap-2"><CheckKpi label="Vrijgegeven" value={counts('Vrijgegeven')} tone="green"/><CheckKpi label="Hold" value={counts('Hold')} tone="red"/><CheckKpi label="Escalatie" value={counts('Escalatie nodig')} tone="amber"/><CheckKpi label="Afgewezen" value={counts('Afgewezen')} tone="red"/></div></div></div>
      {canEdit && review && <div className="p-4 pb-0"><OrderCheckReview key={`${review.id}-${review.checkedAt}`} item={review} onClose={() => setReview(null)}/></div>}
      <div className="divide-y lg:hidden">{data.orderChecks.map((item) => <OrderCard key={item.id} item={item} canEdit={canEdit} review={() => setReview(item)} />)}</div>
      <div className="hidden overflow-x-auto lg:block"><table className="w-full min-w-[1200px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr>{['Order','Klant','Incoterm','Waarde','Marge','Winst','Voorraad','Compliance','Documenten','Uitkomst','Eigenaar',...(canEdit?['Actie']:[])].map((label)=><th key={label} className="px-4 py-3">{label}</th>)}</tr></thead><tbody className="divide-y">{data.orderChecks.map((item)=><tr key={item.id} className={review?.id===item.id?'bg-blue-50':'hover:bg-slate-50'}><td className="px-4 py-3 font-bold text-navy">{item.orderReference}</td><td className="px-4 py-3">{item.customer}</td><td className="px-4 py-3">{item.incoterm}</td><td className="px-4 py-3">€ {item.orderValue.toLocaleString('nl-NL')}</td><td className="px-4 py-3">{item.netMarginPercentage.toFixed(1)}%</td><td className="px-4 py-3">€ {item.netProfit.toLocaleString('nl-NL')}</td><Bool value={item.stockAvailable}/><Bool value={item.complianceComplete}/><Bool value={item.documentationComplete}/><td className="px-4 py-3"><Outcome value={item.outcome}/></td><td className="px-4 py-3">{item.owner}</td>{canEdit&&<td className="px-4 py-3"><button type="button" onClick={()=>setReview(item)} className="rounded-lg border bg-white px-3 py-2 text-xs font-bold text-navy">Beoordelen</button></td>}</tr>)}</tbody></table></div>
    </section>}

    <div className="mt-7 grid gap-6 lg:grid-cols-[1fr_.8fr]">
      <section className="card p-6"><h2 className="text-lg font-bold text-navy">Nieuwe vrijgave toetsen</h2><div className="mt-5 grid gap-4 sm:grid-cols-2"><Field label="Orderwaarde (€)"><input type="number" min="0" value={value} onChange={(event)=>setValue(Number(event.target.value))}/></Field><Field label="Incoterm"><select value={incoterm} onChange={(event)=>{setIncoterm(event.target.value as Incoterm);setDapApproved(false)}}><option>EXW</option><option>DAP</option><option>Overig</option></select></Field><Field label="Nettomarge (%)"><input type="number" min="0" step="0.1" value={margin} onChange={(event)=>setMargin(Number(event.target.value))}/></Field><Field label="Nettowinst per order (€)"><input type="number" min="0" value={profit} onChange={(event)=>setProfit(Number(event.target.value))}/></Field></div>{incoterm==='DAP'&&<label className="mt-5 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><input type="checkbox" checked={dapApproved} onChange={(event)=>setDapApproved(event.target.checked)} className="mt-0.5 h-5 w-5 accent-amber-600"/><span><b>DAP-uitzondering akkoord</b><br/>Leg het akkoord van een bevoegde tweede beoordelaar vast.</span></label>}<label className="mt-5 flex items-start gap-3 rounded-xl border p-4 text-sm text-slate-700"><input type="checkbox" checked={complete} onChange={(event)=>setComplete(event.target.checked)} className="mt-0.5 h-5 w-5 accent-blue-600"/><span><b>Operationele controle compleet</b><br/>Klant, product, voorraad, leverdatum, documentatie en compliance zijn gecontroleerd.</span></label></section>
      <aside className={`rounded-3xl p-6 text-white ${release?'bg-emerald-700':'bg-navy'}`}><p className="text-xs font-bold uppercase tracking-widest text-blue-100">Uitkomst</p><h2 className="mt-2 text-2xl font-bold">{release?'Vrijgave mogelijk':'Order op hold'}</h2><p className="mt-2 text-sm leading-6 text-blue-50">{release?'De bevestigde minimumregels zijn gehaald. Leg de vrijgave vast en vervolg SOP-009.':'Los de rode controles op of heronderhandel voordat de order wordt vrijgegeven.'}</p><div className="mt-5 space-y-2">{rules.map((rule)=><div key={rule.label} className={`rounded-xl p-3 text-sm font-semibold ${rule.ok?'bg-white/15':'bg-red-500/30'}`}><span className="mr-2">{rule.ok?'✓':'!'}</span>{rule.label}</div>)}</div></aside>
    </div>
  </div>;
}

function OrderCard({item, canEdit, review}: {item: OrderCheckRecord; canEdit: boolean; review: () => void}) {return <article className="p-5"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-bold text-slate-400">{item.customer}</p><h3 className="mt-1 font-bold text-navy">{item.orderReference}</h3></div><Outcome value={item.outcome}/></div><div className="mt-4 grid grid-cols-3 gap-3 text-sm"><Small label="Waarde" value={`€ ${item.orderValue.toLocaleString('nl-NL')}`} /><Small label="Marge" value={`${item.netMarginPercentage.toFixed(1)}%`} /><Small label="Winst" value={`€ ${item.netProfit.toLocaleString('nl-NL')}`} /></div><div className="mt-4 flex flex-wrap gap-2 text-xs"><Check value={item.stockAvailable} label="Voorraad"/><Check value={item.complianceComplete} label="Compliance"/><Check value={item.documentationComplete} label="Documenten"/></div><div className="mt-4 flex items-center justify-between"><span className="text-xs text-slate-500">{item.incoterm} · {item.owner}</span>{canEdit&&<button type="button" onClick={review} className="rounded-lg border px-3 py-2 text-xs font-bold text-navy">Beoordelen</button>}</div></article>}
function Small({label,value}:{label:string;value:string}){return <div><p className="text-[10px] uppercase text-slate-400">{label}</p><p className="mt-1 font-bold text-navy">{value}</p></div>}
function Check({value,label}:{value:boolean;label:string}){return <span className={`rounded-full px-2.5 py-1 font-bold ${value?'bg-emerald-50 text-emerald-700':'bg-red-50 text-red-700'}`}>{value?'✓':'—'} {label}</span>}
function Field({label,children}:{label:string;children:React.ReactElement}){return <label><span className="mb-1.5 block text-sm font-bold text-slate-700">{label}</span><span className="[&>*]:w-full [&>*]:rounded-xl [&>*]:border [&>*]:bg-white [&>*]:px-3 [&>*]:py-2.5">{children}</span></label>}
function CheckKpi({label,value,tone}:{label:string;value:number;tone:'green'|'red'|'amber'}){const style=tone==='green'?'bg-emerald-100 text-emerald-800':tone==='red'?'bg-red-100 text-red-800':'bg-amber-100 text-amber-900';return <span className={`rounded-full px-3 py-1.5 text-xs font-bold ${style}`}>{value} {label}</span>}
function Bool({value}:{value:boolean}){return <td className={`px-4 py-3 font-bold ${value?'text-emerald-700':'text-red-700'}`}>{value?'✓':'—'}</td>}
function Outcome({value}:{value:OrderCheckOutcome}){const style=value==='Vrijgegeven'?'bg-emerald-50 text-emerald-700':value==='Hold'||value==='Afgewezen'?'bg-red-50 text-red-700':'bg-amber-50 text-amber-800';return <span className={`whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold ${style}`}>{value}</span>}
