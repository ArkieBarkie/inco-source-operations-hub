'use client';

import Link from 'next/link';
import {useMemo, useState} from 'react';
import {useOperations} from '@/components/operations-provider';
import {PageTitle} from '@/components/ui';

export default function Voorraad() {
  const {data, canEdit} = useOperations();
  const [query, setQuery] = useState('');
  const items = useMemo(() => data.articles.filter((article) => `${article.articleNumber} ${article.description} ${article.productGroup}`.toLocaleLowerCase('nl-NL').includes(query.toLocaleLowerCase('nl-NL'))), [data.articles, query]);
  const total = data.articles.reduce((sum, article) => sum + article.stockByLocation.reduce((stock, location) => stock + location.quantity, 0), 0);
  const blocked = data.articles.reduce((sum, article) => sum + article.blockedQuantity, 0);
  const reserved = data.articles.reduce((sum, article) => sum + article.reservedQuantity, 0);

  return <div className="container-page">
    <PageTitle eyebrow="Beschikbaarheid en locatie" title="Voorraad" description="Zoek producten en zie direct wat intern, extern, onderweg, gereserveerd of geblokkeerd staat." action={canEdit ? <Link href="/instellingen" className="rounded-xl bg-navy px-5 py-3 font-bold text-white">Voorraad importeren</Link> : undefined} />
    <div className="grid gap-4 sm:grid-cols-3"><Metric value={total} label="Totaal geregistreerd" /><Metric value={reserved} label="Gereserveerd" /><Metric value={blocked} label="Geblokkeerd" tone={blocked ? 'red' : 'green'} /></div>
    <div className="card mt-6 p-4"><input aria-label="Voorraad doorzoeken" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Zoek op artikelnummer, omschrijving of productgroep" className="min-h-12 w-full rounded-xl border px-4 py-3 outline-none focus:border-accent" /></div>
    {items.length ? <div className="card mt-5 overflow-x-auto"><table className="w-full min-w-[980px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr>{['Artikel', 'Omschrijving', 'Productgroep', 'Totaal', 'Amstelveen', 'Extern / 3PL', 'Onderweg', 'Gereserveerd', 'Geblokkeerd', 'Vrij', 'Bijgewerkt'].map((label) => <th className="px-4 py-3" key={label}>{label}</th>)}</tr></thead><tbody>{items.map((article) => {const articleTotal = article.stockByLocation.reduce((sum, location) => sum + location.quantity, 0); const get = (id: string) => article.stockByLocation.find((location) => location.locationId === id)?.quantity || 0; return <tr className="border-t" key={article.id}><td className="px-4 py-4 font-bold text-navy">{article.articleNumber}</td><td className="px-4">{article.description}</td><td className="px-4">{article.productGroup}</td><td className="px-4 font-bold">{articleTotal}</td><td className="px-4">{get('amstelveen')}</td><td className="px-4">{get('extern')}</td><td className="px-4">{get('transit')}</td><td className="px-4">{article.reservedQuantity}</td><td className="px-4">{article.blockedQuantity}</td><td className="px-4 font-bold text-emerald-700">{articleTotal - article.reservedQuantity - article.blockedQuantity}</td><td className="px-4">{article.lastUpdated}</td></tr>;})}</tbody></table></div> : <div className="card mt-5 border-dashed p-10 text-center"><h2 className="font-bold text-navy">Geen actuele voorraad geladen</h2><p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-500">Importeer een actuele voorraadexport zodra de kolommen uit het gebruikte administratiesysteem of het 3PL-portaal bekend zijn. Er worden bewust geen fictieve artikelen getoond.</p>{canEdit && <Link href="/instellingen" className="mt-5 inline-block rounded-xl bg-navy px-4 py-2.5 text-sm font-bold text-white">Naar importinstellingen</Link>}</div>}
  </div>;
}

function Metric({value, label, tone = 'blue'}: {value: number; label: string; tone?: 'blue' | 'red' | 'green'}) {
  return <section className="card p-5"><div className={`text-3xl font-bold ${tone === 'red' ? 'text-red-700' : tone === 'green' ? 'text-emerald-700' : 'text-navy'}`}>{value}</div><div className="mt-1 text-sm font-bold text-slate-600">{label}</div></section>;
}
