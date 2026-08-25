'use client';

import {useState} from 'react';
import {ActivityForm} from '@/components/activity-form';
import {useOperations} from '@/components/operations-provider';
import {PageTitle} from '@/components/ui';
import {today} from '@/lib/operations';
import type {Partner, PlannedActivity} from '@/types/operations';

export default function Relaties() {
  const {data, savePartner, canEdit} = useOperations();
  const [open, setOpen] = useState(false);
  const [appointment, setAppointment] = useState<Partner | null>(null);
  const initial = (partner: Partner): PlannedActivity => ({
    id: crypto.randomUUID(),
    date: today(),
    startTime: partner.usualTime || '09:00',
    endTime: '10:00',
    activityType: partner.kind === 'Leverancier' ? 'Leverancierslevering' : partner.kind === 'Klant' ? 'Klantbezorging' : 'Ophaling',
    supplierId: partner.kind === 'Leverancier' ? partner.id : undefined,
    customerId: partner.kind === 'Klant' ? partner.id : undefined,
    carrierId: partner.kind === 'Transporteur' || partner.kind === 'Logistieke partner' ? partner.id : undefined,
    reference: '',
    description: `Afspraak met ${partner.name}`,
    originLocation: partner.kind === 'Klant' ? 'Amstelveen' : partner.location,
    destinationLocation: partner.kind === 'Klant' ? partner.location : 'Amstelveen',
    expectedPallets: 0,
    expectedCases: 0,
    expectedItems: 0,
    responsibleEmployee: 'Jorn / Hidde',
    status: 'Verwacht',
    notes: partner.notes,
    slotConfirmed: false,
    appointmentContact: partner.contactPerson,
  });

  return <div className="container-page">
    <PageTitle eyebrow="Operationele contacten" title="Relaties" description="Leveranciers, klanten, vervoerders en logistieke partners met contact- en leverafspraken." action={canEdit ? <button type="button" onClick={() => setOpen(true)} className="rounded-xl bg-navy px-5 py-3 font-bold text-white">+ Relatie</button> : undefined} />
    <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-5"><h2 className="font-bold text-amber-950">Standaard voor iedere levering</h2><p className="mt-1 text-sm leading-6 text-amber-900">Spreek een bloktijd af, laat deze schriftelijk bevestigen en bel vóór het einde van het venster wanneer de chauffeur nog niet onderweg is. “In de ochtend” is geen bruikbare afspraak.</p></div>
    {data.partners.length ? <div className="grid gap-5 lg:grid-cols-2">{data.partners.map((partner) => <article className="card p-6" key={partner.id}>
      <p className="label">{partner.kind}</p>
      <div className="mt-1 flex items-start justify-between gap-4"><h2 className="text-xl font-bold text-navy">{partner.name}</h2><span className={`rounded-full px-3 py-1 text-xs font-bold ${partner.status === 'Actief' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{partner.status}</span></div>
      <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2">{[['Contact', partner.contactPerson], ['E-mail', partner.email], ['Telefoon', partner.phone], ['Dienst', partner.service], ['Locatie', partner.location], ['Vaste leverdag', partner.usualDays], ['Voorkeurstijd', partner.usualTime], ['Afspraken / escalatie', partner.notes]].filter(([, value]) => value).map(([key, value]) => <div key={key}><dt className="text-slate-500">{key}</dt><dd className="mt-1 font-semibold">{value}</dd></div>)}</dl>
      {canEdit && <button type="button" onClick={() => setAppointment(partner)} className="mt-5 w-full rounded-xl bg-blue-50 px-4 py-3 text-sm font-bold text-accent">Afspraak maken</button>}
    </article>)}</div> : <Empty canEdit={canEdit} onClick={() => setOpen(true)} />}
    {canEdit && open && <PartnerForm save={savePartner} close={() => setOpen(false)} />}
    {canEdit && appointment && <ActivityForm initial={initial(appointment)} onClose={() => setAppointment(null)} />}
  </div>;
}

function Empty({canEdit, onClick}: {canEdit: boolean; onClick: () => void}) {
  return <div className="card border-dashed p-10 text-center"><h2 className="font-bold text-navy">Nog geen relaties toegevoegd</h2><p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-500">Voeg alleen partijen toe die nodig zijn voor bestellen, transport, opslag of escalatie.</p>{canEdit && <button type="button" onClick={onClick} className="mt-5 rounded-xl bg-navy px-4 py-2.5 text-sm font-bold text-white">Eerste relatie toevoegen</button>}</div>;
}

function PartnerForm({save, close}: {save: (value: Partner) => void; close: () => void}) {
  const [value, setValue] = useState<Partner>({id: crypto.randomUUID(), kind: 'Leverancier', name: '', contactPerson: '', email: '', phone: '', service: '', usualDays: '', usualTime: '', location: '', averageVolume: '', notes: '', status: 'Actief'});
  const [error, setError] = useState('');
  const change = (key: keyof Partner, next: string) => setValue({...value, [key]: next});
  return <div role="dialog" aria-modal="true" aria-labelledby="partner-form-title" className="fixed inset-0 z-50 grid place-items-center bg-navy/60 p-4">
    <form onSubmit={(event) => {event.preventDefault(); if (!value.name.trim()) {setError('Vul de naam van de relatie in.'); return;} save({...value, name: value.name.trim()}); close();}} className="max-h-[95vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6">
      <div className="flex justify-between"><h2 id="partner-form-title" className="text-2xl font-bold text-navy">Relatie toevoegen</h2><button type="button" onClick={close} aria-label="Sluiten" className="min-h-11 min-w-11 text-2xl">×</button></div>
      {error && <p role="alert" className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <Field label="Type"><select value={value.kind} onChange={(event) => change('kind', event.target.value)}><option>Leverancier</option><option>Klant</option><option>Transporteur</option><option>Logistieke partner</option></select></Field>
        <Field label="Naam *"><input required maxLength={120} value={value.name} onChange={(event) => change('name', event.target.value)} /></Field>
        <Field label="Contactpersoon"><input maxLength={120} value={value.contactPerson} onChange={(event) => change('contactPerson', event.target.value)} /></Field>
        <Field label="E-mail"><input type="email" maxLength={254} value={value.email} onChange={(event) => change('email', event.target.value)} /></Field>
        <Field label="Telefoon"><input type="tel" maxLength={40} value={value.phone} onChange={(event) => change('phone', event.target.value)} /></Field>
        <Field label="Dienst"><input maxLength={160} value={value.service} onChange={(event) => change('service', event.target.value)} /></Field>
        <Field label="Locatie"><input maxLength={160} value={value.location} onChange={(event) => change('location', event.target.value)} /></Field>
        <Field label="Vaste leverdag(en)"><input maxLength={100} value={value.usualDays} onChange={(event) => change('usualDays', event.target.value)} /></Field>
        <Field label="Voorkeurs-bloktijd"><input type="time" value={value.usualTime} onChange={(event) => change('usualTime', event.target.value)} /></Field>
        <Field label="Afspraken / escalatie"><textarea rows={3} maxLength={2_000} value={value.notes} onChange={(event) => change('notes', event.target.value)} /></Field>
      </div>
      <div className="mt-6 flex justify-end gap-2"><button type="button" onClick={close} className="rounded-xl border px-4 py-2">Annuleren</button><button className="rounded-xl bg-navy px-4 py-2 font-bold text-white">Opslaan</button></div>
    </form>
  </div>;
}

function Field({label, children}: {label: string; children: React.ReactElement}) {
  return <label><span className="mb-1 block text-sm font-bold">{label}</span><span className="[&>*]:w-full [&>*]:rounded-xl [&>*]:border [&>*]:px-3 [&>*]:py-2.5">{children}</span></label>;
}
