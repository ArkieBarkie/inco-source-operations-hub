import Link from 'next/link';
import {notFound} from 'next/navigation';
import {allSops,findSop} from '@/lib/data';
import {DetailActions} from '@/components/detail-actions';

export function generateStaticParams(){return allSops.map(s=>({slug:s.slug}))}

export default async function SopDetail({params}:{params:Promise<{slug:string}>}){
  const {slug}=await params;
  const s=findSop(slug);
  if(!s)notFound();
  const related=s.relatedSops.map(number=>allSops.find(item=>item.sopNumber===number)).filter(Boolean);
  const expired=s.status==='Vervallen';
  return <div className="container-page max-w-5xl">
    <Link href="/sops" className="no-print text-sm font-bold text-accent">← Terug naar SOP-bibliotheek</Link>
    <header className={`mt-5 rounded-3xl p-7 text-white sm:p-10 ${expired?'bg-slate-700':'bg-navy'}`}>
      <div className="flex flex-wrap items-center gap-3"><span className="rounded-full bg-white/10 px-3 py-1 text-sm font-bold">{s.sopNumber}</span><span className={`rounded-full px-3 py-1 text-sm font-bold ${expired?'bg-red-500/30 text-red-100':'bg-emerald-400/15 text-emerald-200'}`}>{s.status}</span></div>
      <h1 className="mt-5 text-3xl font-bold sm:text-4xl">{s.title}</h1><p className="mt-4 max-w-3xl leading-7 text-slate-100">{s.summary}</p>
      <dl className="mt-7 grid gap-4 border-t border-white/10 pt-6 text-sm sm:grid-cols-4">{[['Proces',s.process],['Eigenaar',s.owner],['Versie',s.version],['Ingangsdatum',s.lastUpdated]].map(([label,value])=><div key={label}><dt className="text-blue-200">{label}</dt><dd className="mt-1 font-bold">{value}</dd></div>)}</dl>
    </header>
    {expired&&<div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-5 text-red-900"><b>Deze SOP mag niet meer worden gebruikt.</b><p className="mt-1 text-sm leading-6">{s.summary}</p></div>}
    <div className="mt-5 flex justify-end"><DetailActions/></div>
    <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_280px]">
      <main className="space-y-6">{s.sourceSections.map(section=><Section key={section.title} title={section.title} items={section.content}/>)}</main>
      <aside className="space-y-6"><section className="card p-6"><h2 className="font-bold text-navy">Documentbeheer</h2><dl className="mt-4 space-y-3 text-sm">{[['Status',s.status],['Versie',s.version],['Ingangsdatum',s.lastUpdated],['Beoordeling',s.reviewDate]].map(([label,value])=><div key={label}><dt className="text-slate-500">{label}</dt><dd className="font-bold">{value}</dd></div>)}</dl></section>{related.length>0&&<section className="card p-6"><h2 className="font-bold text-navy">Gerelateerde SOP’s</h2><div className="mt-4 space-y-2">{related.map((item:any)=><Link className="block rounded-xl bg-slate-50 p-3 text-sm font-bold text-navy hover:bg-blue-50" href={`/sops/${item.slug}`} key={item.id}>{item.sopNumber} · {item.title}</Link>)}</div></section>}</aside>
    </div>
  </div>
}

function Section({title,items}:{title:string;items:string[]}){if(!items.length)return null;const numbered=title==='Processtappen';const checklist=title==='Verplichte controle';return <section className="card print-break p-6 sm:p-7"><h2 className="mb-5 text-xl font-bold text-navy">{title}</h2><div className="space-y-3">{items.map((item,index)=><div key={`${title}-${index}`} className={`flex gap-3 ${numbered?'rounded-xl border bg-slate-50 p-4':''}`}><span className={`mt-0.5 flex shrink-0 items-center justify-center font-bold ${numbered?'h-7 w-7 rounded-full bg-navy text-xs text-white':checklist?'h-5 w-5 rounded border-2 border-slate-300 text-transparent':'h-5 w-5 text-accent'}`}>{numbered?index+1:checklist?'✓':'•'}</span><p className="leading-7 text-slate-700">{item}</p></div>)}</div></section>}
