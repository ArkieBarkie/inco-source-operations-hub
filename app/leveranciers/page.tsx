'use client';

import {useEffect, useMemo, useState} from 'react';
import {ActivityForm} from '@/components/activity-form';
import {useOperations} from '@/components/operations-provider';
import {PageTitle} from '@/components/ui';
import {today} from '@/lib/operations';
import type {Partner, PlannedActivity} from '@/types/operations';

type KindFilter = 'Alle relaties' | Partner['kind'];

export default function Relaties() {
  const {data, savePartner, canEdit} = useOperations();
  const [open, setOpen] = useState(false);
  const [appointment, setAppointment] = useState<Partner | null>(null);
  const [query, setQuery] = useState('');
  const [kind, setKind] = useState<KindFilter>('Alle relaties');
  const [activeOnly, setActiveOnly] = useState(false);
  const [selectedId, setSelectedId] = useState('');

  const partners = useMemo(() => data.partners.filter((partner) => {
    const search = `${partner.name} ${partner.contactPerson} ${partner.service} ${partner.location} ${partner.notes}`.toLocaleLowerCase('nl-NL');
    return (!query || search.includes(query.toLocaleLowerCase('nl-NL')))
      && (kind === 'Alle relaties' || partner.kind === kind)
      && (!activeOnly || partner.status === 'Actief');
  }).sort((left, right) => left.name.localeCompare(right.name, 'nl-NL')), [activeOnly, data.partners, kind, query]);

  useEffect(() => {
    if (!partners.some((partner) => partner.id === selectedId)) setSelectedId(partners[0]?.id ?? '');
  }, [partners, selectedId]);

  const selected = partners.find((partner) => partner.id === selectedId) ?? partners[0];
  const initial = (partner: Partner): PlannedActivity => ({
    id: crypto.randomUUID(), date: today(), startTime: partner.usualTime || '09:00', endTime: '10:00',
    activityType: partner.kind === 'Leverancier' ? 'Leverancierslevering' : partner.kind === 'Klant' ? 'Klantbezorging' : 'Ophaling',
    supplierId: partner.kind === 'Leverancier' ? partner.id : undefined,
    customerId: partner.kind === 'Klant' ? partner.id : undefined,
    carrierId: partner.kind === 'Transporteur' || partner.kind === 'Logistieke partner' ? partner.id : undefined,
    reference: '', description: `Afspraak met ${partner.name}`,
    originLocation: partner.kind === 'Klant' ? 'Amstelveen' : partner.location,
    destinationLocation: partner.kind === 'Klant' ? partner.location : 'Amstelveen',
    expectedPallets: 0, expectedCases: 0, expectedItems: 0, responsibleEmployee: 'Jorn / Hidde', status: 'Verwacht',
    notes: partner.notes, slotConfirmed: false, appointmentContact: partner.contactPerson,
  });

  const counts = (value: Partner['kind']) => data.partners.filter((partner) => partner.kind === value).length;
  return <div className="container-page">
    <PageTitle eyebrow="Relatiedesk" title="Relaties" description="Vind de juiste partij, zie direct de operationele afspraken en plan vanuit één compact dossier." action={canEdit ? <button type="button" onClick={() => setOpen(true)} className="rounded-xl bg-navy px-5 py-3 font-bold text-white">+ Relatie</button> : undefined} />
    <section className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4"><RelationMetric label="Leveranciers" value={counts('Leverancier')} /><RelationMetric label="Klanten" value={counts('Klant')} /><RelationMetric label="Vervoerders" value={counts('Transporteur')} /><RelationMetric label="Logistieke partners" value={counts('Logistieke partner')} /></section>

    <section className="card overflow-hidden">
      <div className="border-b bg-slate-50 p-4 sm:p-5">
        <div className="grid gap-3 lg:grid-cols-[1fr_auto]"><input aria-label="Relaties zoeken" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Zoek naam, contact, dienst, locatie of afspraak" className="min-h-12 rounded-xl border bg-white px-4 outline-none focus:border-blue-400" /><label className="flex min-h-12 items-center gap-3 rounded-xl border bg-white px-4 text-sm font-semibold text-slate-700"><input type="checkbox" checked={activeOnly} onChange={(event) => setActiveOnly(event.target.checked)} className="h-5 w-5 accent-blue-600" />Alleen actief</label></div>
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">{(['Alle relaties', 'Leverancier', 'Klant', 'Transporteur', 'Logistieke partner'] as KindFilter[]).map((value) => <button key={value} type="button" onClick={() => setKind(value)} className={`whitespace-nowrap rounded-full px-3.5 py-2 text-xs font-bold ${kind === value ? 'bg-navy text-white' : 'border bg-white text-slate-600'}`}>{value}</button>)}</div>
      </div>

      {partners.length ? <div className="grid min-h-[560px] lg:grid-cols-[360px_minmax(0,1fr)]">
        <div className="border-b lg:border-b-0 lg:border-r"><div className="border-b px-4 py-3 text-xs font-semibold text-slate-500">{partners.length} van {data.partners.length} relaties</div><div className="max-h-[650px] overflow-y-auto p-2">{partners.map((partner) => {
          const quality = relationshipQuality(partner);
          return <button type="button" onClick={() => setSelectedId(partner.id)} key={partner.id} className={`mb-1 w-full rounded-xl p-3 text-left transition ${selected?.id === partner.id ? 'bg-navy text-white' : 'hover:bg-slate-50'}`}><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className={`text-[10px] font-bold uppercase tracking-wider ${selected?.id === partner.id ? 'text-blue-200' : 'text-slate-400'}`}>{partner.kind}</p><p className="mt-1 truncate font-bold">{partner.name}</p><p className={`mt-1 truncate text-xs ${selected?.id === partner.id ? 'text-blue-100' : 'text-slate-500'}`}>{partner.contactPerson || 'Contact nog bepalen'} · {partner.location || 'Locatie nog bepalen'}</p></div><span className={`shrink-0 rounded-full px-2 py-1 text-[9px] font-bold ${selected?.id === partner.id ? 'bg-white/10 text-white' : quality.tone}`}>{quality.label}</span></div></button>;
        })}</div></div>

        {selected && <article className="p-5 sm:p-7"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start"><div><p className="label">{selected.kind}</p><h2 className="mt-2 text-2xl font-bold text-navy">{selected.name}</h2><p className="mt-2 text-sm text-slate-500">{selected.service || 'Dienst nog vastleggen'}</p></div><div className="flex flex-wrap gap-2"><span className={`rounded-full px-3 py-1.5 text-xs font-bold ${selected.status === 'Actief' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{selected.status}</span><span className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700">{selected.externalIdentities?.length ? 'Externe koppeling' : 'Portaldata'}</span></div></div>
          {selected.id === '3pl-mainfreight' && <div className="mt-5 rounded-2xl border border-violet-200 bg-violet-50 p-4 text-sm text-violet-950"><b>Placeholder · gesprek loopt</b><p className="mt-1 leading-6">Nog geen tarieven, kwalificatie, contactgegevens of operationele afspraken opgenomen. Deze relatie beïnvloedt geen advies.</p></div>}
          <div className="mt-6 grid gap-4 sm:grid-cols-2"><Detail label="Contactpersoon" value={selected.contactPerson} /><Detail label="E-mail" value={selected.email} /><Detail label="Telefoon" value={selected.phone} /><Detail label="Locatie" value={selected.location} /><Detail label="Vaste leverdag" value={selected.usualDays} /><Detail label="Voorkeursbloktijd" value={selected.usualTime} /><Detail label="Gemiddeld volume" value={selected.averageVolume} /><Detail label="Operationele status" value={relationshipQuality(selected).longLabel} /></div>
          <div className="mt-6 rounded-2xl bg-slate-50 p-5"><p className="text-xs font-bold uppercase tracking-wide text-slate-500">Afspraken en escalatie</p><p className="mt-2 text-sm leading-6 text-slate-700">{selected.notes || 'Nog geen afspraken vastgelegd.'}</p></div>
          {canEdit && selected.status === 'Actief' && <button type="button" onClick={() => setAppointment(selected)} className="mt-5 min-h-12 w-full rounded-xl bg-blue-600 px-4 py-3 font-bold text-white">Plan afspraak met {selected.name}</button>}
        </article>}
      </div> : <Empty canEdit={canEdit} onClick={() => setOpen(true)} />}
    </section>
    <p className="mt-5 rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm leading-6 text-blue-950"><b>Werkafspraak:</b> gebruik een concrete bloktijd, laat die schriftelijk bevestigen en leg afwijkingen direct vast bij de juiste relatie en zending.</p>
    {canEdit && open && <PartnerForm save={savePartner} close={() => setOpen(false)} />}
    {canEdit && appointment && <ActivityForm initial={initial(appointment)} onClose={() => setAppointment(null)} />}
  </div>;
}

function relationshipQuality(partner: Partner) {
  if (partner.status === 'Inactief') return {label: 'Placeholder', longLabel: 'Niet operationeel', tone: 'bg-slate-100 text-slate-600'};
  const complete = [partner.contactPerson, partner.email || partner.phone, partner.service, partner.location, partner.usualDays, partner.usualTime, partner.notes].filter((value) => value?.trim()).length;
  return complete >= 6 ? {label: 'Compleet', longLabel: 'Operationeel compleet', tone: 'bg-emerald-50 text-emerald-700'} : {label: 'Aanvullen', longLabel: `${complete} van 7 kernvelden gevuld`, tone: 'bg-amber-50 text-amber-800'};
}

function RelationMetric({label, value}: {label: string; value: number}) {return <div className="card p-4"><div className="text-2xl font-bold text-navy">{value}</div><div className="mt-1 text-xs font-semibold text-slate-500">{label}</div></div>}
function Detail({label, value}: {label: string; value?: string}) {return <div><p className="text-xs font-semibold text-slate-400">{label}</p><p className="mt-1 font-semibold text-slate-800">{value || 'Nog te bepalen'}</p></div>}
function Empty({canEdit, onClick}: {canEdit: boolean; onClick: () => void}) {return <div className="p-10 text-center"><h2 className="font-bold text-navy">Geen relaties gevonden</h2><p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-500">Pas de zoekopdracht of filters aan, of voeg een nieuwe operationele relatie toe.</p>{canEdit && <button type="button" onClick={onClick} className="mt-5 rounded-xl bg-navy px-4 py-2.5 text-sm font-bold text-white">Relatie toevoegen</button>}</div>}

function PartnerForm({save, close}: {save: (value: Partner) => void; close: () => void}) {
  const [value, setValue] = useState<Partner>({id: crypto.randomUUID(), kind: 'Leverancier', name: '', contactPerson: '', email: '', phone: '', service: '', usualDays: '', usualTime: '', location: '', averageVolume: '', notes: '', status: 'Actief'});
  const [error, setError] = useState('');
  const change = (key: keyof Partner, next: string) => setValue({...value, [key]: next});
  return <div role="dialog" aria-modal="true" aria-labelledby="partner-form-title" className="fixed inset-0 z-50 grid place-items-center bg-navy/60 p-4"><form onSubmit={(event) => {event.preventDefault(); if (!value.name.trim()) {setError('Vul de naam van de relatie in.'); return;} save({...value, name: value.name.trim()}); close();}} className="max-h-[95vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6">
    <div className="flex justify-between"><h2 id="partner-form-title" className="text-2xl font-bold text-navy">Relatie toevoegen</h2><button type="button" onClick={close} aria-label="Sluiten" className="min-h-11 min-w-11 text-2xl">×</button></div>{error && <p role="alert" className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    <div className="mt-5 grid gap-4 sm:grid-cols-2"><Field label="Type"><select value={value.kind} onChange={(event) => change('kind', event.target.value)}><option>Leverancier</option><option>Klant</option><option>Transporteur</option><option>Logistieke partner</option></select></Field><Field label="Naam *"><input required maxLength={120} value={value.name} onChange={(event) => change('name', event.target.value)} /></Field><Field label="Contactpersoon"><input maxLength={120} value={value.contactPerson} onChange={(event) => change('contactPerson', event.target.value)} /></Field><Field label="E-mail"><input type="email" maxLength={254} value={value.email} onChange={(event) => change('email', event.target.value)} /></Field><Field label="Telefoon"><input type="tel" maxLength={40} value={value.phone} onChange={(event) => change('phone', event.target.value)} /></Field><Field label="Dienst"><input maxLength={160} value={value.service} onChange={(event) => change('service', event.target.value)} /></Field><Field label="Locatie"><input maxLength={160} value={value.location} onChange={(event) => change('location', event.target.value)} /></Field><Field label="Vaste leverdag(en)"><input maxLength={100} value={value.usualDays} onChange={(event) => change('usualDays', event.target.value)} /></Field><Field label="Voorkeurs-bloktijd"><input type="time" value={value.usualTime} onChange={(event) => change('usualTime', event.target.value)} /></Field><Field label="Gemiddeld volume"><input maxLength={100} value={value.averageVolume} onChange={(event) => change('averageVolume', event.target.value)} /></Field><Field label="Afspraken / escalatie"><textarea rows={3} maxLength={2_000} value={value.notes} onChange={(event) => change('notes', event.target.value)} /></Field></div>
    <div className="mt-6 flex justify-end gap-2"><button type="button" onClick={close} className="rounded-xl border px-4 py-2">Annuleren</button><button className="rounded-xl bg-navy px-4 py-2 font-bold text-white">Opslaan</button></div>
  </form></div>;
}

function Field({label, children}: {label: string; children: React.ReactElement}) {return <label><span className="mb-1 block text-sm font-bold">{label}</span><span className="[&>*]:w-full [&>*]:rounded-xl [&>*]:border [&>*]:px-3 [&>*]:py-2.5">{children}</span></label>}
