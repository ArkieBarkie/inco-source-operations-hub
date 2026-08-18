'use client';

import {useMemo, useState} from 'react';
import {useOperations} from '@/components/operations-provider';
import {ShipmentForm} from '@/components/shipment-form';
import {Empty, PageTitle, StatusBadge} from '@/components/ui';
import {formatDateTime, isShipmentOverdue, shipmentNeedsAttention, shipmentSearchText, sourceLabels} from '@/lib/shipments';
import type {Shipment} from '@/types/operations';

export default function ShipmentsPage() {
  const {data, loadDemoData, clearDemoData, deleteShipment} = useOperations();
  const [form, setForm] = useState<Shipment | 'new' | null>(null);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('');
  const [direction, setDirection] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const search = query.trim().toLocaleLowerCase('nl-NL');
    return [...data.shipments]
      .filter((shipment) => !search || shipmentSearchText(shipment).includes(search))
      .filter((shipment) => !status || shipment.status === status)
      .filter((shipment) => !direction || shipment.direction === direction)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }, [data.shipments, direction, query, status]);

  const demoCount = data.shipments.filter((shipment) => shipment.source.system === 'demo').length;
  const active = data.shipments.filter((shipment) => !['Afgeleverd', 'Geannuleerd'].includes(shipment.status)).length;
  const attention = data.shipments.filter(shipmentNeedsAttention).length;
  const dueToday = data.shipments.filter((shipment) => {
    if (!shipment.plannedDeliveryAt) return false;
    return new Date(shipment.plannedDeliveryAt).toLocaleDateString('sv-SE', {timeZone: 'Europe/Amsterdam'}) === new Date().toLocaleDateString('sv-SE', {timeZone: 'Europe/Amsterdam'});
  }).length;

  return (
    <div className="container-page">
      <PageTitle
        eyebrow="Control Tower"
        title="Zendingen"
        description="Eén operationeel dossier voor inbound, outbound, transfers en retouren, inclusief tracking, partijen en tijdlijn."
        action={<button onClick={() => setForm('new')} className="rounded-xl bg-navy px-5 py-3 font-bold text-white">+ Zending toevoegen</button>}
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi value={data.shipments.length} label="Totaal zichtbaar" />
        <Kpi value={active} label="Actieve zendingen" />
        <Kpi value={attention} label="Aandacht nodig" danger={attention > 0} />
        <Kpi value={dueToday} label="Levering vandaag" />
      </div>

      <section className="card mt-6 p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_180px_180px_auto]">
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Zoek referentie, klant, leverancier of trackingnummer" className="rounded-xl border px-4 py-2.5" />
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-xl border bg-white px-3 py-2.5"><option value="">Alle statussen</option>{[...new Set(data.shipments.map((shipment) => shipment.status))].map((value) => <option key={value}>{value}</option>)}</select>
          <select value={direction} onChange={(e) => setDirection(e.target.value)} className="rounded-xl border bg-white px-3 py-2.5"><option value="">Alle richtingen</option>{['Inbound', 'Outbound', 'Transfer', 'Retour'].map((value) => <option key={value}>{value}</option>)}</select>
          {demoCount ? <button onClick={() => confirm('De complete testomgeving verwijderen? Handmatig ingevoerde gegevens blijven staan.') && clearDemoData()} className="rounded-xl border border-amber-200 px-4 py-2 text-sm font-bold text-amber-800">Verwijder testomgeving</button> : <button onClick={loadDemoData} className="rounded-xl bg-violet-50 px-4 py-2 text-sm font-bold text-violet-800">Laad complete testomgeving</button>}
        </div>
      </section>

      <div className="mt-6 space-y-3">
        {filtered.length ? filtered.map((shipment) => {
          const isExpanded = expanded === shipment.id;
          const overdue = isShipmentOverdue(shipment);
          return (
            <article key={shipment.id} className={`card overflow-hidden ${shipmentNeedsAttention(shipment) ? 'border-amber-300' : ''}`}>
              <button onClick={() => setExpanded(isExpanded ? null : shipment.id)} className="grid w-full gap-4 p-5 text-left md:grid-cols-[1.2fr_1fr_1fr_auto] md:items-center">
                <div><div className="flex flex-wrap items-center gap-2"><b className="text-lg text-navy">{shipment.reference}</b>{shipment.source.system === 'demo' && <span className="rounded-full bg-violet-100 px-2 py-1 text-[10px] font-bold uppercase text-violet-800">Test</span>}</div><p className="mt-1 text-xs text-slate-500">{shipment.orderReference || 'Geen orderreferentie'} · {shipment.direction}</p></div>
                <div><p className="text-sm font-semibold text-slate-700">{shipment.origin} → {shipment.destination}</p><p className="mt-1 text-xs text-slate-500">{shipment.carrier || 'Vervoerder niet vastgelegd'}</p></div>
                <div><p className={`text-sm font-semibold ${overdue ? 'text-red-700' : 'text-slate-700'}`}>{formatDateTime(shipment.plannedDeliveryAt)}</p><p className="mt-1 text-xs text-slate-500">Geplande levering</p></div>
                <div className="flex items-center justify-between gap-3"><StatusBadge value={shipment.status} /><span className="text-slate-400">{isExpanded ? '−' : '+'}</span></div>
              </button>
              {isExpanded && <div className="border-t bg-slate-50 p-5">
                <div className="grid gap-5 lg:grid-cols-[1fr_1fr_1.4fr]">
                  <Info title="Partijen" lines={[shipment.supplier && `Leverancier: ${shipment.supplier}`, shipment.customer && `Klant: ${shipment.customer}`, `Verantwoordelijk: ${shipment.responsibleEmployee}`]} />
                  <Info title="Goederen & tracking" lines={[`Pallets: ${shipment.pallets} · Colli: ${shipment.cases} · Stuks: ${shipment.items}`, shipment.trackingNumber && `Tracking: ${shipment.trackingNumber}`, `Bron: ${sourceLabels[shipment.source.system]}`, `Laatste update: ${formatDateTime(shipment.updatedAt)}`]} />
                  <div><h3 className="text-sm font-bold text-navy">Tijdlijn</h3><div className="mt-3 space-y-3">{[...shipment.events].sort((a, b) => b.occurredAt.localeCompare(a.occurredAt)).map((event) => <div key={event.id} className="border-l-2 border-blue-200 pl-3"><p className="text-sm font-semibold">{event.title}</p><p className="text-xs text-slate-500">{formatDateTime(event.occurredAt)}{event.location ? ` · ${event.location}` : ''}</p></div>)}</div></div>
                </div>
                {shipment.notes && <p className="mt-4 rounded-xl bg-white p-3 text-sm text-slate-600">{shipment.notes}</p>}
                <div className="mt-4 flex justify-end gap-2"><button onClick={() => confirm(`Zending ${shipment.reference} verwijderen?`) && deleteShipment(shipment.id)} className="rounded-lg px-3 py-2 text-xs font-bold text-red-700">Verwijderen</button><button onClick={() => setForm(shipment)} className="rounded-lg bg-navy px-4 py-2 text-xs font-bold text-white">Bijwerken</button></div>
              </div>}
            </article>
          );
        }) : <Empty>{data.shipments.length ? 'Geen zendingen gevonden met deze filters.' : 'Nog geen zendingen. Voeg er één toe of laad de herkenbare testset voor de eerste proef.'}</Empty>}
      </div>
      {form && <ShipmentForm shipment={form === 'new' ? undefined : form} onClose={() => setForm(null)} />}
    </div>
  );
}

function Kpi({value, label, danger = false}: {value: number; label: string; danger?: boolean}) {return <div className={`card p-4 ${danger ? 'border-red-200 bg-red-50' : ''}`}><div className={`text-2xl font-bold ${danger ? 'text-red-700' : 'text-navy'}`}>{value}</div><div className="mt-1 text-xs text-slate-500">{label}</div></div>}

function Info({title, lines}: {title: string; lines: Array<string | undefined>}) {return <div><h3 className="text-sm font-bold text-navy">{title}</h3><div className="mt-2 space-y-1 text-sm text-slate-600">{lines.filter(Boolean).map((line) => <p key={line}>{line}</p>)}</div></div>}
