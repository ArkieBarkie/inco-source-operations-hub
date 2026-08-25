'use client';

import Link from 'next/link';
import {useMemo, useState} from 'react';
import {useOperations} from '@/components/operations-provider';
import {PageTitle} from '@/components/ui';
import type {Article} from '@/types/operations';

export default function Voorraad() {
  const {data, canEdit, mode, syncState} = useOperations();
  const [query, setQuery] = useState('');
  const items = useMemo(() => data.articles.filter((article) => `${article.articleNumber} ${article.description} ${article.productGroup} ${article.barcode ?? ''}`.toLocaleLowerCase('nl-NL').includes(query.toLocaleLowerCase('nl-NL'))), [data.articles, query]);
  const total = data.articles.reduce((sum, article) => sum + article.stockByLocation.reduce((stock, location) => stock + location.quantity, 0), 0);
  const blocked = data.articles.reduce((sum, article) => sum + article.blockedQuantity, 0);
  const reserved = data.articles.reduce((sum, article) => sum + article.reservedQuantity, 0);
  const lastUpdated = [...data.articles].sort((left, right) => right.lastUpdated.localeCompare(left.lastUpdated))[0]?.lastUpdated;

  return <div className="container-page">
    <PageTitle eyebrow="Beschikbaarheid en locatie" title="Voorraad" description="Zoek producten en zie direct wat intern, extern, onderweg, gereserveerd of geblokkeerd staat." action={canEdit ? <Link href="/instellingen#data" className="rounded-xl bg-navy px-5 py-3 font-bold text-white">Import & koppeling</Link> : undefined} />
    <div className="mb-5 flex flex-col justify-between gap-3 rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-950 md:flex-row md:items-center"><p><b>Bronhouderschap:</b> {mode === 'demo' ? 'afgeschermde portaltestdata' : 'centrale portaldatabase'}. Odoo wordt pas leidend na mapping en reconciliatie.</p><div className="flex flex-wrap gap-2"><span className="rounded-full bg-white px-3 py-1.5 text-xs font-bold text-blue-700">Sync: {syncState}</span><span className="rounded-full bg-white px-3 py-1.5 text-xs font-bold text-blue-700">Bijgewerkt: {lastUpdated ? new Date(lastUpdated).toLocaleString('nl-NL') : '—'}</span></div></div>
    <div className="grid gap-4 sm:grid-cols-3"><Metric value={total} label="Totaal geregistreerd" /><Metric value={reserved} label="Gereserveerd" /><Metric value={blocked} label="Geblokkeerd" tone={blocked ? 'red' : 'green'} /></div>
    <div className="card mt-6 p-4"><input aria-label="Voorraad doorzoeken" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Zoek op artikelnummer, omschrijving, barcode of productgroep" className="min-h-12 w-full rounded-xl border px-4 py-3 outline-none focus:border-accent" /></div>
    {items.length ? <>
      <div className="mt-5 space-y-3 lg:hidden">{items.map((article) => <StockCard article={article} key={article.id} />)}</div>
      <div className="card mt-5 hidden overflow-x-auto lg:block"><table className="w-full min-w-[1120px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr>{['Artikel', 'Omschrijving', 'Eenheid', 'Tracking', 'Totaal', 'Amstelveen', 'Extern / 3PL', 'Onderweg', 'Gereserveerd', 'Geblokkeerd', 'Vrij', 'Bijgewerkt'].map((label) => <th className="px-4 py-3" key={label}>{label}</th>)}</tr></thead><tbody>{items.map((article) => {const articleTotal = totalFor(article); return <tr className="border-t" key={article.id}><td className="px-4 py-4 font-bold text-navy">{article.articleNumber}</td><td className="px-4">{article.description}<p className="mt-1 text-xs text-slate-400">{article.productGroup}</p></td><td className="px-4">{article.unit}</td><td className="px-4">{article.tracking === 'lot' ? 'Lot' : article.tracking === 'serial' ? 'Serienummer' : 'Geen'}</td><td className="px-4 font-bold">{articleTotal}</td><td className="px-4">{at(article, 'amstelveen')}</td><td className="px-4">{at(article, 'extern')}</td><td className="px-4">{at(article, 'transit')}</td><td className="px-4">{article.reservedQuantity}</td><td className="px-4">{article.blockedQuantity}</td><td className="px-4 font-bold text-emerald-700">{articleTotal - article.reservedQuantity - article.blockedQuantity}</td><td className="px-4 text-xs">{new Date(article.lastUpdated).toLocaleString('nl-NL')}</td></tr>;})}</tbody></table></div>
    </> : <div className="card mt-5 border-dashed p-10 text-center"><h2 className="font-bold text-navy">Geen voorraad gevonden</h2><p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-500">Pas de zoekopdracht aan of controleer de actuele bron en mapping.</p></div>}
    <p className="mt-5 rounded-xl bg-slate-100 p-3 text-xs leading-5 text-slate-600"><b>Reconciliatie vereist vóór Odoo-koppeling:</b> totalen per artikel, locatie, eenheid, reservering, blokkade en lot/serie moeten zonder onverklaard verschil aansluiten.</p>
  </div>;
}

const totalFor = (article: Article) => article.stockByLocation.reduce((sum, location) => sum + location.quantity, 0);
const at = (article: Article, id: string) => article.stockByLocation.find((location) => location.locationId === id)?.quantity || 0;

function StockCard({article}: {article: Article}) {const total = totalFor(article); const free = total - article.reservedQuantity - article.blockedQuantity; return <article className="card p-5"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-bold text-blue-700">{article.articleNumber}</p><h2 className="mt-1 font-bold text-navy">{article.description}</h2><p className="mt-1 text-xs text-slate-500">{article.productGroup} · {article.unit} · {article.tracking === 'lot' ? 'lottracking' : article.tracking === 'serial' ? 'serienummertracking' : 'geen tracking'}</p></div><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${free > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>{free} vrij</span></div><div className="mt-4 grid grid-cols-3 gap-3"><StockMini label="Amstelveen" value={at(article,'amstelveen')} /><StockMini label="3PL" value={at(article,'extern')} /><StockMini label="Onderweg" value={at(article,'transit')} /></div><div className="mt-4 flex flex-wrap gap-2 text-xs"><span className="rounded-full bg-blue-50 px-2.5 py-1 font-bold text-blue-700">{article.reservedQuantity} gereserveerd</span>{article.blockedQuantity > 0 && <span className="rounded-full bg-red-50 px-2.5 py-1 font-bold text-red-700">{article.blockedQuantity} geblokkeerd</span>}<span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-600">{new Date(article.lastUpdated).toLocaleString('nl-NL')}</span></div></article>}
function StockMini({label,value}:{label:string;value:number}){return <div className="rounded-xl bg-slate-50 p-3"><p className="text-lg font-bold text-navy">{value}</p><p className="text-[10px] text-slate-500">{label}</p></div>}
function Metric({value, label, tone = 'blue'}: {value: number; label: string; tone?: 'blue' | 'red' | 'green'}) {return <section className="card p-5"><div className={`text-3xl font-bold ${tone === 'red' ? 'text-red-700' : tone === 'green' ? 'text-emerald-700' : 'text-navy'}`}>{value}</div><div className="mt-1 text-sm font-bold text-slate-600">{label}</div></section>}
