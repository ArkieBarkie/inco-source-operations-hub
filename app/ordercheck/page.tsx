'use client';

import {useMemo,useState} from 'react';
import Link from 'next/link';
import {companyProfile} from '@/data/company-profile';
import {useOperations} from '@/components/operations-provider';
import type {OrderCheckOutcome} from '@/types/operations';

type Incoterm='EXW'|'DAP'|'Overig';

export default function Ordercheck(){
  const {data}=useOperations();
  const policy=companyProfile.commercialPolicy;
  const [value,setValue]=useState(0),[margin,setMargin]=useState(0),[profit,setProfit]=useState(0),[incoterm,setIncoterm]=useState<Incoterm>('EXW'),[dapApproved,setDapApproved]=useState(false),[complete,setComplete]=useState(false);
  const rules=useMemo(()=>{
    const valueRule=incoterm==='EXW'
      ? {label:`Orderwaarde EXW minimaal € ${policy.minimumOrderValueExw.toLocaleString('nl-NL')}`,ok:value>=policy.minimumOrderValueExw}
      : incoterm==='DAP'
        ? {label:`DAP-uitzondering minimaal € ${policy.dapExceptionMinimumOrderValue.toLocaleString('nl-NL')}`,ok:value>=policy.dapExceptionMinimumOrderValue&&dapApproved}
        : {label:'Voor overige Incoterms ontbreekt nog een bevestigde waarderegel',ok:false};
    return [
      valueRule,
      {label:`Nettomarge minimaal ${policy.minimumNetMarginPercentage}%`,ok:margin>=policy.minimumNetMarginPercentage},
      {label:`Nettowinst minimaal € ${policy.minimumNetProfitPerOrder.toLocaleString('nl-NL')} per order`,ok:profit>=policy.minimumNetProfitPerOrder},
      {label:'Klant-, product-, voorraad-, leverdatum- en compliancecontrole is afgerond',ok:complete},
    ];
  },[complete,dapApproved,incoterm,margin,policy,profit,value]);
  const release=rules.every(x=>x.ok);
  const counts=(outcome:OrderCheckOutcome)=>data.orderChecks.filter(item=>item.outcome===outcome).length;
  return <div className="container-page">
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="label">Commerciële vrijgave</p><h1 className="mt-2 text-4xl font-bold text-navy">Ordercheck</h1><p className="mt-3 max-w-2xl leading-7 text-slate-600">Eerste controle op de door Jorn bevestigde minimumregels. De volledige werkwijze en uitzonderingen blijven in SOP-009.</p></div><Link href="/sops/sop-009-klantorder-verwerken" className="text-sm font-bold text-accent">Open SOP-009 →</Link></div>
    {data.orderChecks.length>0&&<section className="card mt-7 overflow-hidden"><div className="border-b bg-amber-50 px-6 py-4"><div className="flex flex-col justify-between gap-3 md:flex-row md:items-center"><div><p className="text-xs font-bold uppercase tracking-widest text-amber-800">Testdata · huidige week</p><h2 className="mt-1 text-lg font-bold text-navy">Orderdossiers voor de testomgeving</h2></div><div className="flex flex-wrap gap-2"><CheckKpi label="Vrijgegeven" value={counts('Vrijgegeven')} tone="green"/><CheckKpi label="Hold" value={counts('Hold')} tone="red"/><CheckKpi label="Escalatie" value={counts('Escalatie nodig')} tone="amber"/></div></div></div><div className="overflow-x-auto"><table className="min-w-[1120px] w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr>{['Order','Klant','Incoterm','Waarde','Marge','Winst','Voorraad','Compliance','Documenten','Uitkomst','Eigenaar'].map(label=><th key={label} className="px-4 py-3">{label}</th>)}</tr></thead><tbody className="divide-y">{data.orderChecks.map(item=><tr key={item.id} className="hover:bg-slate-50"><td className="px-4 py-3 font-bold text-navy">{item.orderReference}</td><td className="px-4 py-3">{item.customer}</td><td className="px-4 py-3">{item.incoterm}</td><td className="px-4 py-3">€ {item.orderValue.toLocaleString('nl-NL')}</td><td className="px-4 py-3">{item.netMarginPercentage.toFixed(1)}%</td><td className="px-4 py-3">€ {item.netProfit.toLocaleString('nl-NL')}</td><Bool value={item.stockAvailable}/><Bool value={item.complianceComplete}/><Bool value={item.documentationComplete}/><td className="px-4 py-3"><Outcome value={item.outcome}/></td><td className="px-4 py-3">{item.owner}</td></tr>)}</tbody></table></div></section>}
    <div className="mt-7 grid gap-6 lg:grid-cols-[1fr_.8fr]">
      <section className="card p-6"><h2 className="text-lg font-bold text-navy">Ordergegevens</h2><div className="mt-5 grid gap-4 sm:grid-cols-2"><Field label="Orderwaarde (€)"><input type="number" min="0" value={value} onChange={e=>setValue(Number(e.target.value))}/></Field><Field label="Incoterm"><select value={incoterm} onChange={e=>{setIncoterm(e.target.value as Incoterm);setDapApproved(false)}}><option>EXW</option><option>DAP</option><option>Overig</option></select></Field><Field label="Nettomarge (%)"><input type="number" min="0" step="0.1" value={margin} onChange={e=>setMargin(Number(e.target.value))}/></Field><Field label="Nettowinst per order (€)"><input type="number" min="0" value={profit} onChange={e=>setProfit(Number(e.target.value))}/></Field></div>{incoterm==='DAP'&&<label className="mt-5 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><input type="checkbox" checked={dapApproved} onChange={e=>setDapApproved(e.target.checked)} className="mt-0.5 h-5 w-5 accent-amber-600"/><span><b>DAP-uitzondering akkoord</b><br/>Leg reden en akkoord van de andere compagnon vast.</span></label>}<label className="mt-5 flex items-start gap-3 rounded-xl border p-4 text-sm text-slate-700"><input type="checkbox" checked={complete} onChange={e=>setComplete(e.target.checked)} className="mt-0.5 h-5 w-5 accent-blue-600"/><span><b>Operationele controle compleet</b><br/>Klant, product, voorraad, leverdatum, documentatie en compliance zijn gecontroleerd.</span></label></section>
      <aside className={`rounded-3xl p-6 text-white ${release?'bg-emerald-700':'bg-navy'}`}><p className="text-xs font-bold uppercase tracking-widest text-blue-100">Uitkomst</p><h2 className="mt-2 text-2xl font-bold">{release?'Vrijgave mogelijk':'Order op hold'}</h2><p className="mt-2 text-sm leading-6 text-blue-50">{release?'De bevestigde minimumregels zijn gehaald. Leg de vrijgave vast en vervolg SOP-009.':'Los de rode controles op of heronderhandel voordat de order wordt vrijgegeven.'}</p><div className="mt-5 space-y-2">{rules.map(rule=><div key={rule.label} className={`rounded-xl p-3 text-sm font-semibold ${rule.ok?'bg-white/15':'bg-red-500/30'}`}><span className="mr-2">{rule.ok?'✓':'!'}</span>{rule.label}</div>)}</div></aside>
    </div>
    <p className="mt-5 text-xs leading-5 text-slate-500">Open punt: de exacte kostenopbouw van nettomarge en nettowinst is nog niet gedefinieerd. De check gebruikt de door Jorn genoemde grenswaarden, niet een eigen winstberekening.</p>
  </div>
}

function Field({label,children}:{label:string;children:React.ReactElement}){return <label><span className="mb-1.5 block text-sm font-bold text-slate-700">{label}</span><span className="[&>*]:w-full [&>*]:rounded-xl [&>*]:border [&>*]:bg-white [&>*]:px-3 [&>*]:py-2.5">{children}</span></label>}
function CheckKpi({label,value,tone}:{label:string;value:number;tone:'green'|'red'|'amber'}){const style=tone==='green'?'bg-emerald-100 text-emerald-800':tone==='red'?'bg-red-100 text-red-800':'bg-amber-100 text-amber-900';return <span className={`rounded-full px-3 py-1.5 text-xs font-bold ${style}`}>{value} {label}</span>}
function Bool({value}:{value:boolean}){return <td className={`px-4 py-3 font-bold ${value?'text-emerald-700':'text-red-700'}`}>{value?'✓':'—'}</td>}
function Outcome({value}:{value:OrderCheckOutcome}){const style=value==='Vrijgegeven'?'bg-emerald-50 text-emerald-700':value==='Hold'?'bg-red-50 text-red-700':'bg-amber-50 text-amber-800';return <span className={`whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold ${style}`}>{value}</span>}
