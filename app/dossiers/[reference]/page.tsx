'use client';

import Link from 'next/link';
import {useState} from 'react';
import {useParams} from 'next/navigation';
import {ActionProposal} from '@/components/action-proposal';
import {useOperations} from '@/components/operations-provider';
import {ShipmentRelease} from '@/components/shipment-release';
import {ShipmentControls} from '@/components/shipment-controls';
import {ShipmentCompletionPanel} from '@/components/shipment-completion-panel';
import {ShipmentForm} from '@/components/shipment-form';
import {StatusBadge} from '@/components/ui';
import {buildDecisionItems} from '@/lib/decision-center';
import {formatDateTime, sourceLabels} from '@/lib/shipments';
import type {ShipmentStatus} from '@/types/operations';

const normalize = (value?: string) => (value ?? '').trim().toLocaleLowerCase('nl-NL');
const euro = (value: number) => new Intl.NumberFormat('nl-NL', {style: 'currency', currency: 'EUR', maximumFractionDigits: 0}).format(value);
const atNoon = (value: string) => value.includes('T') ? value : `${value}T12:00`;

export default function OperationsDossierPage() {
  const params = useParams<{reference: string}>();
  const {data, ready, canEdit} = useOperations();
  const [released, setReleased] = useState<{status: ShipmentStatus; actions: number} | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const reference = decodeURIComponent(String(params.reference ?? ''));
  const shipment = data.shipments.find((item) =>
    normalize(item.reference) === normalize(reference)
    || normalize(item.orderReference) === normalize(reference)
    || normalize(item.trackingNumber) === normalize(reference)
  );

  if (!shipment) {
    return <div className="container-page"><div className="card p-8 text-center"><h1 className="text-2xl font-bold text-navy">{ready ? 'Dossier niet gevonden' : 'Dossier laden…'}</h1><p className="mt-2 text-sm text-slate-500">Referentie: {reference}</p><Link href="/zendingen" className="mt-5 inline-flex rounded-xl bg-navy px-4 py-2.5 text-sm font-bold text-white">Terug naar zendingen</Link></div></div>;
  }

  const references = [shipment.reference, shipment.orderReference].filter(Boolean).map((value) => normalize(value));
  const includesReference = (value: string) => references.some((item) => normalize(value).includes(item));
  const activities = data.activities.filter((activity) => includesReference(`${activity.reference} ${activity.description} ${activity.notes}`));
  const actions = data.actions.filter((action) => includesReference(`${action.title} ${action.description} ${action.notes}`));
  const orderCheck = shipment.orderReference ? data.orderChecks.find((item) => normalize(item.orderReference) === normalize(shipment.orderReference)) : undefined;
  const releaseConflict = shipment.status === 'Geblokkeerd' && orderCheck?.outcome === 'Vrijgegeven';
  const parties = data.partners.filter((partner) => [shipment.supplier, shipment.customer, shipment.carrier].some((name) => normalize(name) === normalize(partner.name)));
  const decision = buildDecisionItems(data).find((item) => item.reference === shipment.reference);
  const blockingEvent = [...shipment.events].filter((event) => event.status === 'Geblokkeerd').sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))[0];
  const sopLinks = [
    shipment.direction === 'Inbound' ? ['/sops/sop-005-inbound-en-goederenontvangst', 'SOP-005 · Inbound en ontvangst'] : null,
    shipment.direction === 'Outbound' ? ['/sops/sop-010-uitgaande-levering-aan-klant', 'SOP-010 · Uitgaande levering'] : null,
    shipment.direction === 'Transfer' ? ['/sops/sop-007-keuze-intern-magazijn-3pl-en-transfers', 'SOP-007 · Intern of 3PL'] : null,
    shipment.direction === 'Retour' ? ['/sops/sop-015-retouren-en-productdispositie', 'SOP-015 · Retour en dispositie'] : null,
    ['Vertraagd', 'Geblokkeerd'].includes(shipment.status) ? ['/sops/sop-013-afwijkingen-klachten-en-claims', 'SOP-013 · Afwijkingen en claims'] : null,
  ].filter(Boolean) as string[][];
  const timeline = [
    ...shipment.events.map((event) => ({id: event.id, at: event.occurredAt, title: event.title, detail: `${event.status}${event.detail ? ` · ${event.detail}` : ''}`, tone: 'blue'})),
    ...activities.map((activity) => ({id: activity.id, at: `${activity.date}T${activity.startTime || '00:00'}`, title: activity.description, detail: `Planning · ${activity.status} · ${activity.responsibleEmployee}`, tone: activity.status === 'Vertraagd' ? 'red' : 'slate'})),
    ...actions.map((action) => ({id: action.id, at: atNoon(action.createdAt), title: action.title, detail: `${action.type} · ${action.priority} · ${action.owner} · deadline ${action.dueDate}`, tone: action.priority === 'Kritiek' ? 'red' : 'amber'})),
    ...(orderCheck ? [{id: orderCheck.id, at: orderCheck.checkedAt, title: `Ordercheck: ${orderCheck.outcome}`, detail: `${orderCheck.netMarginPercentage.toFixed(1)}% marge · ${euro(orderCheck.netProfit)} nettowinst`, tone: orderCheck.outcome === 'Vrijgegeven' ? 'green' : 'red'}] : []),
  ].sort((a, b) => b.at.localeCompare(a.at));
  const copilotQuestion = encodeURIComponent(`Analyseer dossier ${shipment.reference}. Geef status, risico, mogelijke commerciële impact, ontbrekende informatie en de eerstvolgende veilige actie.`);

  return (
    <div className="container-page">
      <div className="mb-6 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <div className="flex flex-wrap items-center gap-2"><p className="label">Operationeel dossier</p>{shipment.source.system === 'demo' && <span className="rounded-full bg-violet-100 px-2 py-1 text-[10px] font-bold uppercase text-violet-800">Testgegevens</span>}</div>
          <div className="mt-2 flex flex-wrap items-center gap-3"><h1 className="text-3xl font-bold text-navy sm:text-4xl">{shipment.reference}</h1><StatusBadge value={shipment.status} /></div>
          <p className="mt-2 text-slate-600">{shipment.direction} · {shipment.origin} → {shipment.destination}{shipment.orderReference ? ` · ${shipment.orderReference}` : ''}</p>
        </div>
        <div className="flex flex-wrap gap-2 no-print">
          <button type="button" onClick={() => window.print()} className="rounded-xl border bg-white px-4 py-2.5 text-sm font-bold text-navy">Print dossier</button>
          <Link href={`/copilot?question=${copilotQuestion}`} className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white">Analyseer met Inco Assist</Link>
          <Link href="/zendingen" className="rounded-xl bg-navy px-4 py-2.5 text-sm font-bold text-white">Alle zendingen</Link>
        </div>
      </div>

      {released && <div className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-900"><b>Vrijgave vastgelegd.</b> De zending staat nu op {released.status}.{released.actions > 0 ? ` ${released.actions} gekoppelde actie${released.actions === 1 ? '' : 's'} opgelost.` : ''} De tijdlijn en bronmetadata zijn bijgewerkt.</div>}
      <ShipmentControls shipment={shipment} onEdit={() => setEditOpen(true)} />
      <ShipmentCompletionPanel shipment={shipment} />

      {decision && <section className={`mb-6 rounded-3xl p-6 text-white ${decision.severity === 'Kritiek' ? 'bg-red-800' : 'bg-amber-700'}`}>
        <p className="text-xs font-bold uppercase tracking-widest opacity-75">Besluit nodig · {decision.severity}</p>
        <div className="mt-3 grid gap-5 lg:grid-cols-[1.1fr_.9fr]">
          <div><h2 className="text-2xl font-bold">{decision.nextAction}</h2><p className="mt-3 text-sm leading-6 text-white/85">{decision.impact}</p></div>
          <div className="rounded-2xl bg-white/10 p-4"><p className="text-xs font-bold uppercase tracking-wide opacity-75">Signalen</p><ul className="mt-2 space-y-1.5 text-sm">{decision.signals.map((signal) => <li key={signal}>• {signal}</li>)}</ul>{shipment.status === 'Geblokkeerd' && <div className="mt-4 border-t border-white/20 pt-4"><p className="text-xs font-bold uppercase tracking-wide opacity-75">Herkomst blokkade</p><p className="mt-2 text-sm font-semibold">{shipment.source.system === 'demo' ? 'Handmatig samengesteld testscenario' : sourceLabels[blockingEvent?.source.system ?? shipment.source.system]}</p><p className="mt-1 text-xs leading-5 text-white/75">{shipment.source.system === 'demo' ? 'De reden “ontbrekende batchdocumentatie” is door de testgenerator toegevoegd en komt niet uit een echte documentcontrole.' : `${blockingEvent ? formatDateTime(blockingEvent.occurredAt) : 'Tijdstip onbekend'} · ${blockingEvent?.detail || shipment.notes || 'Geen reden vastgelegd.'}`}</p></div>}</div>
        </div>
        <div className="mt-5 max-w-2xl space-y-3">
          {shipment.status === 'Geblokkeerd' && <ShipmentRelease shipment={shipment} onReleased={(status, actions) => setReleased({status, actions})} />}
          {decision.preparedAction && <ActionProposal proposal={decision.preparedAction} buttonLabel="Veilige opvolgactie voorbereiden" />}
        </div>
      </section>}

      <div className="grid gap-6 xl:grid-cols-[1.2fr_.8fr]">
        <div className="space-y-6">
          <section className="card p-6">
            <div className="flex items-center justify-between gap-3"><h2 className="text-lg font-bold text-navy">Dossieroverzicht</h2><span className="text-xs text-slate-500">Bijgewerkt {formatDateTime(shipment.updatedAt)}</span></div>
            <dl className="mt-5 grid gap-5 text-sm sm:grid-cols-2 lg:grid-cols-3">
              <Info label="Klant" value={shipment.customer} />
              <Info label="Leverancier" value={shipment.supplier} />
              <Info label="Vervoerder" value={shipment.carrier} />
              <Info label="Tracking" value={shipment.trackingNumber} />
              <Info label="Geplande ophaling" value={formatDateTime(shipment.plannedPickupAt)} />
              <Info label="Geplande levering" value={formatDateTime(shipment.plannedDeliveryAt)} />
              <Info label="Werkelijke ophaling" value={formatDateTime(shipment.actualPickupAt)} />
              <Info label="Werkelijke levering" value={formatDateTime(shipment.actualDeliveryAt)} />
              <Info label="Goederen" value={`${shipment.pallets} pallets · ${shipment.cases} colli · ${shipment.items} stuks`} />
              <Info label="Verantwoordelijke" value={shipment.responsibleEmployee} />
              <Info label="Afhandeling" value={shipment.handlingMode || (shipment.direction === 'Transfer' ? 'Extern magazijn / 3PL' : 'Eigen magazijn')} />
              <Info label="Magazijnpartner" value={shipment.warehousePartner} />
              <Info label="3PL-/WMS-referentie" value={shipment.warehouseReference} />
              <Info label="Bron" value={sourceLabels[shipment.source.system]} />
              <Info label="Synchronisatie" value={shipment.source.syncStatus} />
            </dl>
            {shipment.notes && <p className="mt-5 rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-600">{shipment.notes}</p>}
          </section>

          <section className="card p-6">
            <h2 className="text-lg font-bold text-navy">Complete tijdlijn</h2>
            <p className="mt-1 text-sm text-slate-500">Zending, planning, acties en commerciële controle in één spoor.</p>
            <div className="mt-5 space-y-4">{timeline.length ? timeline.map((item) => <div key={`${item.id}-${item.at}`} className="grid grid-cols-[14px_1fr] gap-3"><span className={`mt-1.5 h-3 w-3 rounded-full ${item.tone === 'red' ? 'bg-red-500' : item.tone === 'amber' ? 'bg-amber-500' : item.tone === 'green' ? 'bg-emerald-500' : item.tone === 'blue' ? 'bg-blue-500' : 'bg-slate-300'}`} /><div className="border-b pb-4"><div className="flex flex-col justify-between gap-1 sm:flex-row"><b className="text-sm text-navy">{item.title}</b><span className="text-xs text-slate-400">{formatDateTime(item.at)}</span></div><p className="mt-1 text-xs leading-5 text-slate-500">{item.detail}</p></div></div>) : <p className="text-sm text-slate-500">Nog geen tijdlijngebeurtenissen.</p>}</div>
          </section>
        </div>

        <aside className="space-y-6">
          <section className="card p-6">
            <p className="label">Commerciële poort</p>
            <h2 className="mt-2 text-lg font-bold text-navy">{orderCheck ? orderCheck.outcome : 'Nog geen gekoppelde ordercheck'}</h2>
            {releaseConflict && <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs leading-5 text-red-800"><b>Controleconflict gedetecteerd.</b> De ordercheck is vrijgegeven, maar de zending staat geblokkeerd. Herbevestig documentatie en vrijgave voordat de operatie doorgaat.</div>}
            {orderCheck ? <div className="mt-4 space-y-3 text-sm"><Metric label="Orderwaarde" value={euro(orderCheck.orderValue)} /><Metric label="Nettomarge" value={`${orderCheck.netMarginPercentage.toFixed(1)}%`} /><Metric label="Nettowinst" value={euro(orderCheck.netProfit)} /><Check label="Voorraad" value={orderCheck.stockAvailable} /><Check label="Compliance" value={orderCheck.complianceComplete} /><Check label="Documentatie" value={orderCheck.documentationComplete} /></div> : <p className="mt-3 text-sm leading-6 text-slate-500">Voeg de Odoo-orderreferentie toe om waarde, marge en vrijgave in dit dossier op te nemen.</p>}
            <Link href="/ordercheck" className="mt-5 inline-flex text-sm font-bold text-accent">Open ordercheck →</Link>
          </section>

          <section className="card p-6">
            <h2 className="font-bold text-navy">Gekoppelde context</h2>
            <div className="mt-4 grid grid-cols-3 gap-2 text-center"><Mini value={activities.length} label="Planning" /><Mini value={actions.length} label="Acties" /><Mini value={parties.length} label="Partijen" /></div>
            {actions.length > 0 && <div className="mt-4 space-y-2">{actions.slice(0, 4).map((action) => <div key={action.id} className="rounded-xl bg-slate-50 p-3"><div className="flex items-start justify-between gap-2"><b className="text-xs text-navy">{action.title}</b><StatusBadge value={action.priority} /></div><p className="mt-1 text-[11px] text-slate-500">{action.owner} · {action.status}</p></div>)}</div>}
          </section>

          <section className="card p-6">
            <h2 className="font-bold text-navy">Verplichte werkwijze</h2>
            <div className="mt-3 space-y-2">{sopLinks.map(([href, label]) => <Link key={href} href={href} className="block rounded-xl border p-3 text-sm font-semibold text-navy hover:border-blue-300 hover:bg-blue-50">{label} →</Link>)}</div>
          </section>
        </aside>
      </div>
      {canEdit && editOpen && <ShipmentForm shipment={shipment} onClose={() => setEditOpen(false)} />}
    </div>
  );
}

function Info({label, value}: {label: string; value?: string}) {return <div><dt className="text-xs text-slate-500">{label}</dt><dd className="mt-1 font-semibold text-slate-800">{value || 'Niet vastgelegd'}</dd></div>;}
function Metric({label, value}: {label: string; value: string}) {return <div className="flex justify-between border-b pb-2"><span className="text-slate-500">{label}</span><b className="text-navy">{value}</b></div>;}
function Check({label, value}: {label: string; value: boolean}) {return <div className={`flex justify-between rounded-lg px-3 py-2 ${value ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-800'}`}><span>{label}</span><b>{value ? 'Compleet' : 'Ontbreekt'}</b></div>;}
function Mini({value, label}: {value: number; label: string}) {return <div className="rounded-xl bg-slate-50 p-3"><div className="text-xl font-bold text-navy">{value}</div><div className="text-[10px] text-slate-500">{label}</div></div>;}
