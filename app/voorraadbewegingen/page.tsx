'use client';

import {useState} from 'react';
import {useOperations} from '@/components/operations-provider';
import {Empty, PageTitle} from '@/components/ui';
import type {StockMovement} from '@/types/operations';

export default function Bewegingen() {
  const {data, saveMovement, canEdit} = useOperations();
  const [form, setForm] = useState(false);
  return <div className="container-page">
    <PageTitle eyebrow="Traceerbaarheid" title="Voorraadbewegingen" description="Ontvangsten, uitleveringen, correcties, retouren en verplaatsingen." action={canEdit ? <button type="button" onClick={() => setForm(true)} className="rounded-xl bg-navy px-5 py-3 font-bold text-white">+ Beweging registreren</button> : undefined} />
    {data.movements.length ? <div className="card overflow-x-auto"><table className="w-full min-w-[900px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr>{['Datum en tijd', 'Artikel', 'Type', 'Aantal', 'Van', 'Naar', 'Referentie', 'Uitgevoerd door', 'Opmerking'].map((label) => <th className="px-4 py-3" key={label}>{label}</th>)}</tr></thead><tbody>{[...data.movements].sort((a, b) => b.dateTime.localeCompare(a.dateTime)).map((movement) => {const article = data.articles.find((item) => item.id === movement.articleId); return <tr key={movement.id} className="border-t"><td className="px-4 py-4">{movement.dateTime.replace('T', ' ')}</td><td className="px-4 font-bold text-navy">{article?.articleNumber || '—'}</td><td className="px-4">{movement.type}</td><td className="px-4 font-bold">{movement.quantity}</td><td className="px-4">{movement.fromLocation}</td><td className="px-4">{movement.toLocation}</td><td className="px-4">{movement.reference}</td><td className="px-4">{movement.performedBy}</td><td className="px-4">{movement.notes || '—'}</td></tr>;})}</tbody></table></div> : <Empty><div><p className="font-bold text-navy">Nog geen bewegingen geregistreerd</p><p className="mt-1">Registreer alleen een beweging als deze niet automatisch uit het administratiesysteem of het 3PL-portaal komt.</p></div></Empty>}
    {canEdit && form && <MovementForm onClose={() => setForm(false)} save={saveMovement} />}
  </div>;
}

function MovementForm({onClose, save}: {onClose: () => void; save: (value: StockMovement) => void}) {
  const {data} = useOperations();
  const [value, setValue] = useState<StockMovement>({id: crypto.randomUUID(), dateTime: new Date().toISOString().slice(0, 16), articleId: data.articles[0]?.id || '', quantity: 0, fromLocation: 'Amstelveen', toLocation: 'Extern magazijn / 3PL', type: 'Verplaatsing', reference: '', performedBy: 'Jorn / Hidde', notes: ''});
  const [error, setError] = useState('');
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!value.articleId || value.quantity <= 0 || !value.reference.trim() || !value.performedBy.trim()) {setError('Kies een artikel en vul een positief aantal, referentie en uitvoerder in.'); return;}
    if (value.quantity > 1_000_000) {setError('Het aantal is onwaarschijnlijk hoog. Controleer de invoer.'); return;}
    save({...value, reference: value.reference.trim(), performedBy: value.performedBy.trim()});
    onClose();
  };
  return <div role="dialog" aria-modal="true" aria-labelledby="movement-form-title" className="fixed inset-0 z-50 grid place-items-center bg-navy/60 p-4"><form onSubmit={submit} className="max-h-[95vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6"><div className="flex justify-between"><h2 id="movement-form-title" className="text-2xl font-bold text-navy">Voorraadbeweging registreren</h2><button type="button" onClick={onClose} aria-label="Sluiten" className="min-h-11 min-w-11 text-2xl">×</button></div>{error && <p role="alert" className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}<div className="mt-5 grid gap-4 sm:grid-cols-2">
    <Field label="Datum en tijd"><input required type="datetime-local" value={value.dateTime} onChange={(event) => setValue({...value, dateTime: event.target.value})} /></Field>
    <Field label="Artikel"><select required value={value.articleId} onChange={(event) => setValue({...value, articleId: event.target.value})}><option value="">Selecteer artikel</option>{data.articles.map((article) => <option value={article.id} key={article.id}>{article.articleNumber} · {article.description}</option>)}</select></Field>
    <Field label="Type"><select value={value.type} onChange={(event) => setValue({...value, type: event.target.value as StockMovement['type']})}>{['Ontvangst', 'Uitlevering', 'Verplaatsing', 'Correctie', 'Retour', 'Beschadiging', 'Blokkering', 'Vrijgave', 'Transport externe opslag', 'Terughalen externe opslag'].map((type) => <option key={type}>{type}</option>)}</select></Field>
    <Field label="Aantal"><input required type="number" min="1" max="1000000" value={value.quantity} onChange={(event) => setValue({...value, quantity: Number(event.target.value)})} /></Field>
    <Field label="Van locatie"><input maxLength={160} value={value.fromLocation} onChange={(event) => setValue({...value, fromLocation: event.target.value})} /></Field>
    <Field label="Naar locatie"><input maxLength={160} value={value.toLocation} onChange={(event) => setValue({...value, toLocation: event.target.value})} /></Field>
    <Field label="Referentie *"><input required maxLength={120} value={value.reference} onChange={(event) => setValue({...value, reference: event.target.value})} /></Field>
    <Field label="Uitgevoerd door *"><select required value={value.performedBy} onChange={(event) => setValue({...value, performedBy: event.target.value})}><option>Jorn / Hidde</option><option>Jorn</option><option>Hidde</option></select></Field>
    <Field label="Opmerking"><textarea rows={3} maxLength={2_000} value={value.notes} onChange={(event) => setValue({...value, notes: event.target.value})} /></Field>
  </div><div className="mt-6 flex justify-end gap-2"><button type="button" onClick={onClose} className="rounded-xl border px-4 py-2">Annuleren</button><button className="rounded-xl bg-navy px-4 py-2 font-bold text-white">Opslaan</button></div></form></div>;
}

function Field({label, children}: {label: string; children: React.ReactElement}) {
  return <label><span className="mb-1 block text-sm font-bold">{label}</span><span className="[&>*]:w-full [&>*]:rounded-xl [&>*]:border [&>*]:bg-white [&>*]:px-3 [&>*]:py-2.5">{children}</span></label>;
}
