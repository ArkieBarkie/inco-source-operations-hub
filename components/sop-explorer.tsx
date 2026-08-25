'use client';

import Fuse from 'fuse.js';
import Link from 'next/link';
import {useMemo, useState} from 'react';
import type {Sop} from '@/types/sop';
import {WordDocumentLink} from './word-document-link';

export function SopExplorer({sops}: {sops: Sop[]}) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [process, setProcess] = useState('');
  const [owner, setOwner] = useState('');
  const [status, setStatus] = useState('');
  const [sort, setSort] = useState('number');
  const [view, setView] = useState<'cards' | 'table'>('cards');
  const options = (key: keyof Sop) => [...new Set(sops.map((sop) => String(sop[key])))].sort();
  const shown = useMemo(() => {
    let records = query.trim() ? new Fuse(sops, {keys: ['title', 'sopNumber', 'summary', 'fullText', 'steps', 'exceptions', 'keywords'], threshold: .35, ignoreLocation: true}).search(query).map((result) => result.item) : [...sops];
    records = records.filter((sop) => (!category || sop.category === category) && (!process || sop.process === process) && (!owner || sop.owner === owner) && (!status || sop.status === status));
    return records.sort((a, b) => sort === 'title' ? a.title.localeCompare(b.title) : sort === 'date' ? b.lastUpdated.localeCompare(a.lastUpdated) : a.sopNumber.localeCompare(b.sopNumber));
  }, [category, owner, process, query, sort, sops, status]);

  const filters: Array<{label: string; value: string; set: (value: string) => void; values: string[]}> = [
    {label: 'Categorie', value: category, set: setCategory, values: options('category')},
    {label: 'Proces', value: process, set: setProcess, values: options('process')},
    {label: 'Eigenaar', value: owner, set: setOwner, values: options('owner')},
    {label: 'Status', value: status, set: setStatus, values: options('status')},
  ];

  return <>
    <div className="card p-5">
      <input aria-label="SOP’s zoeken" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Zoek op onderwerp, nummer of processtap…" className="min-h-12 w-full rounded-xl border px-4 py-3 outline-none focus:border-accent" />
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
        {filters.map((filter) => <select aria-label={`Filter op ${filter.label.toLocaleLowerCase('nl-NL')}`} key={filter.label} value={filter.value} onChange={(event) => filter.set(event.target.value)} className="min-h-11 rounded-xl border bg-white px-3 py-2 text-sm"><option value="">{filter.label}: alles</option>{filter.values.map((value) => <option key={value}>{value}</option>)}</select>)}
        <select aria-label="SOP’s sorteren" value={sort} onChange={(event) => setSort(event.target.value)} className="min-h-11 rounded-xl border bg-white px-3 py-2 text-sm"><option value="number">SOP-nummer</option><option value="title">Titel</option><option value="date">Laatste wijziging</option></select>
        <div role="group" aria-label="SOP-weergave" className="flex rounded-xl bg-slate-100 p-1"><button type="button" aria-pressed={view === 'cards'} onClick={() => setView('cards')} className={`min-h-11 flex-1 rounded-lg text-sm ${view === 'cards' ? 'bg-white shadow' : ''}`}>Kaarten</button><button type="button" aria-pressed={view === 'table'} onClick={() => setView('table')} className={`min-h-11 flex-1 rounded-lg text-sm ${view === 'table' ? 'bg-white shadow' : ''}`}>Tabel</button></div>
      </div>
    </div>
    <div className="my-5 flex items-center justify-between gap-4 text-sm text-slate-500"><span>{shown.length} SOP’s gevonden</span><span>{sops.filter((sop) => sop.status === 'Actief').length} actief · {sops.filter((sop) => sop.status === 'Vervallen').length} vervallen</span></div>
    {view === 'cards' ? <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{shown.map((sop) => <SopCard key={sop.id} sop={sop} />)}</div> : <div className="card overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr>{['Nummer', 'Titel', 'Proces', 'Eigenaar', 'Versie', 'Status', 'Gewijzigd', 'Word'].map((label) => <th key={label} className="px-4 py-3">{label}</th>)}</tr></thead><tbody>{shown.map((sop) => <tr key={sop.id} className="border-t hover:bg-blue-50"><td className="px-4 py-4 font-bold text-accent">{sop.sopNumber}</td><td className="px-4 font-semibold text-navy"><Link href={`/sops/${sop.slug}`}>{sop.title}</Link></td><td className="px-4">{sop.process}</td><td className="px-4">{sop.owner}</td><td className="px-4">{sop.version}</td><td className={`px-4 font-bold ${sop.status === 'Vervallen' ? 'text-red-700' : 'text-emerald-700'}`}>{sop.status}</td><td className="px-4">{sop.lastUpdated}</td><td className="px-4"><WordDocumentLink fileName={sop.sourceFile} compact /></td></tr>)}</tbody></table></div>}
  </>;
}

export function SopCard({sop}: {sop: Sop}) {
  const expired = sop.status === 'Vervallen';
  return <article className={`card group flex min-h-64 flex-col p-6 transition hover:-translate-y-1 ${expired ? 'border-red-200 bg-red-50/30' : 'hover:border-blue-200'}`}><div className="flex items-center justify-between"><span className={`rounded-full px-3 py-1 text-xs font-bold ${expired ? 'bg-red-100 text-red-700' : 'bg-blue-50 text-accent'}`}>{sop.sopNumber}</span><span className={`text-xs font-bold ${expired ? 'text-red-600' : 'text-slate-400'}`}>{expired ? 'Vervallen' : `v${sop.version}`}</span></div><Link href={`/sops/${sop.slug}`} className="mt-5"><h3 className="text-lg font-bold text-navy group-hover:text-accent">{sop.title}</h3><p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-600">{sop.summary}</p></Link><div className="mt-auto pt-6"><div className="flex items-end justify-between gap-3"><div><div className="label">Proces</div><div className="mt-1 text-sm font-semibold">{sop.process}</div></div><Link href={`/sops/${sop.slug}`} aria-label={`${sop.sopNumber} bekijken`} className="text-xl text-accent">→</Link></div><div className="mt-4 border-t pt-4"><WordDocumentLink fileName={sop.sourceFile} compact /></div></div></article>;
}
