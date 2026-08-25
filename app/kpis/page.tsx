'use client';

import Link from 'next/link';
import {useMemo} from 'react';
import {KpiCard} from '@/components/kpi-card';
import {useOperations} from '@/components/operations-provider';
import {buildDecisionItems} from '@/lib/decision-center';
import {calculateOperationsKpis, statusForTarget} from '@/lib/kpis';
import type {ShipmentCompletionAssessment} from '@/lib/shipment-completion';

const euro = (value: number) => new Intl.NumberFormat('nl-NL', {style: 'currency', currency: 'EUR', maximumFractionDigits: 0}).format(value);

export default function KpiCockpitPage() {
  const {data} = useOperations();
  const kpis = useMemo(() => calculateOperationsKpis(data), [data]);
  const decisions = useMemo(() => buildDecisionItems(data), [data]);
  const completion = kpis.completion;
  const maxFlow = Math.max(1, ...kpis.dailyFlow.flatMap((day) => [day.planned, day.completed]));
  const otherActive = Math.max(0, completion.active - completion.readyNow - completion.waitingExternal - completion.needsReview);

  return (
    <div className="container-page">
      <section className="relative overflow-hidden rounded-[2rem] bg-navy text-white" style={{backgroundImage: 'radial-gradient(circle at 82% 16%, rgba(52,211,153,.2), transparent 28%), radial-gradient(circle at 15% 90%, rgba(59,130,246,.2), transparent 34%)'}}>
        <div className="relative grid gap-8 p-7 sm:p-9 xl:grid-cols-[1fr_420px] xl:items-center">
          <div>
            <div className="flex flex-wrap items-center gap-2"><p className="text-xs font-bold uppercase tracking-[.22em] text-blue-300">Operations Control Tower</p><span className="rounded-full bg-emerald-400/15 px-2.5 py-1 text-[10px] font-bold uppercase text-emerald-200">Berekend uit huidige dossiers</span></div>
            <h1 className="mt-4 max-w-2xl text-3xl font-bold leading-tight sm:text-5xl">Zie wat presteert.<br />Stuur wat vastloopt.</h1>
            <p className="mt-4 max-w-2xl leading-7 text-blue-100">Van leverbetrouwbaarheid tot 3PL-afronding: één beeld dat niet alleen rapporteert, maar direct laat zien waar de volgende actie zit.</p>
            <div className="mt-7 grid max-w-2xl grid-cols-2 gap-3 sm:grid-cols-4">
              <HeroMetric value={completion.readyNow} label="direct afrondbaar" tone="green" />
              <HeroMetric value={completion.waitingExternal} label="3PL-bevestiging open" tone="violet" />
              <HeroMetric value={completion.needsReview} label="handmatig beoordelen" tone="red" />
              <HeroMetric value={kpis.shipments.overdue} label="zendingen over tijd" tone="red" />
            </div>
          </div>

          <div className="rounded-[1.75rem] bg-white/10 p-6 ring-1 ring-white/10 backdrop-blur-sm">
            <div className="flex items-center gap-5">
              <div className="grid h-36 w-36 shrink-0 place-items-center rounded-full p-3" style={{background: `conic-gradient(#34d399 ${kpis.score * 3.6}deg, rgba(255,255,255,.12) 0)`}}><div className="grid h-full w-full place-items-center rounded-full bg-navy/90"><div className="text-center"><div className="text-4xl font-bold">{kpis.score}</div><div className="text-[10px] uppercase tracking-wide text-blue-200">van 100</div></div></div></div>
              <div><p className="text-xs uppercase tracking-wide text-blue-200">Operationele gezondheid</p><p className="mt-1 text-xl font-bold">{kpis.scoreLabel}</p><p className="mt-2 text-xs leading-5 text-blue-100">Doelscore ≥ 90 · gebaseerd op vijf procesgebieden</p></div>
            </div>
            <div className="mt-6 grid grid-cols-3 gap-3 border-t border-white/10 pt-5"><ScoreMetric value={`${kpis.shipments.onTimeRate}%`} label="op tijd" /><ScoreMetric value={`${kpis.actions.controlRate}%`} label="acties beheerst" /><ScoreMetric value={`${kpis.inventory.availabilityRate}%`} label="voorraad vrij" /></div>
          </div>
        </div>
      </section>

      <section className="mt-7">
        <SectionTitle title="Operationele puls" note="De vier signalen die vandaag het meeste verschil maken." />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <PulseCard href="/zendingen" label="Afrondbaar" value={completion.readyNow} note="Fysiek klaar, aantallen en documenten akkoord" tone="green" />
          <PulseCard href="/zendingen" label="Externe bevestiging" value={completion.waitingExternal} note="Ontvangst- of uitleverbevestiging staat open" tone="violet" />
          <PulseCard href="/besliscentrum" label="Open beslissingen" value={decisions.length} note={`${decisions.filter((item) => item.severity === 'Kritiek').length} met kritieke prioriteit`} tone="red" />
          <PulseCard href="/acties" label="Acties over tijd" value={kpis.actions.overdue} note={`${kpis.actions.controlRate}% van de open acties onder controle`} tone="amber" />
        </div>
      </section>

      <section className="mt-7 grid gap-6 xl:grid-cols-[.85fr_1.15fr]">
        <div className="card p-6">
          <SectionTitle title="Afrondstatus" note="Verdeling van actieve zendingen over de operationele afrondstappen." />
          <div className="mt-6 space-y-5">
            <RadarBar label="Direct afrondbaar" value={completion.readyNow} total={completion.active} tone="bg-emerald-500" note="Alle afrondcontroles zijn compleet" />
            <RadarBar label="Externe bevestiging open" value={completion.waitingExternal} total={completion.active} tone="bg-violet-500" note="Ontvangst- of uitleverbevestiging vereist" />
            <RadarBar label="Operationele controle open" value={completion.needsReview} total={completion.active} tone="bg-red-500" note="Blokkade, documentcontrole of afwijking" />
            <RadarBar label="In uitvoering" value={otherActive} total={completion.active} tone="bg-blue-300" note="Gepland, bevestigd of onderweg" />
          </div>
          <div className="mt-6 rounded-2xl bg-slate-50 p-4"><div className="flex items-end justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-wide text-slate-500">Standaard afhandelbaar</p><div className="mt-1 text-3xl font-bold text-navy">{completion.automationPotential}%</div></div><p className="max-w-48 text-right text-xs leading-5 text-slate-500">Dossiers zonder inhoudelijk afwijkingsbesluit.</p></div></div>
        </div>

        <div className="card p-6">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start"><SectionTitle title="Afrondwachtrijen" note="Open meteen het dossier dat aandacht nodig heeft." /><Link href="/zendingen" className="text-sm font-bold text-accent">Alle zendingen →</Link></div>
          <div className="mt-5 grid gap-4 lg:grid-cols-3">
            <Queue title="Nu afronden" items={completion.readyItems} empty="Niets gereed" tone="green" />
            <Queue title="3PL-bevestiging open" items={completion.waitingExternalItems} empty="Geen externe bevestigingen open" tone="violet" />
            <Queue title="Controle open" items={completion.reviewItems} empty="Geen controles open" tone="red" />
          </div>
        </div>
      </section>

      <section className="mt-7">
        <SectionTitle title="Magazijnmix & operationele status" note="Prestaties en open aandachtspunten voor eigen en externe magazijnafhandeling." />
        <div className="grid gap-4 lg:grid-cols-3">
          <WarehouseCard title="Extern magazijn / 3PL" eyebrow={`${completion.external.share}% van de zendingdossiers`} tone="dark" metrics={[
            [`${completion.external.active}`, 'actieve zendingen'],
            [completion.external.measuredDelivered ? `${completion.external.onTimeRate}%` : '–', 'op tijd geleverd'],
            [`${completion.external.stockShare}%`, 'van voorraad extern'],
          ]} footer={`${completion.external.stock.toLocaleString('nl-NL')} stuks geregistreerd bij externe opslag`} />
          <WarehouseCard title="Eigen magazijn" eyebrow={`${completion.internal.total} zendingdossiers`} tone="light" metrics={[
            [`${completion.internal.active}`, 'actieve zendingen'],
            [completion.internal.measuredDelivered ? `${completion.internal.onTimeRate}%` : '–', 'op tijd geleverd'],
            [`${Math.max(0, 100 - completion.external.stockShare)}%`, 'van voorraad intern/in transit'],
          ]} footer="Prestaties blijven vergelijkbaar met de externe stroom" />
          <div className="card p-6">
            <p className="text-xs font-bold uppercase tracking-[.16em] text-red-600">Operationele aandacht</p><h3 className="mt-2 text-xl font-bold text-navy">Direct sturen</h3>
            <div className="mt-5 space-y-3"><AttentionRow label="Zendingen over tijd" value={kpis.shipments.overdue} tone={kpis.shipments.overdue ? 'risk' : 'good'} /><AttentionRow label="Vertraagde zendingen" value={kpis.shipments.delayed} tone={kpis.shipments.delayed ? 'watch' : 'good'} /><AttentionRow label="Geblokkeerde zendingen" value={kpis.shipments.blocked} tone={kpis.shipments.blocked ? 'risk' : 'good'} /><AttentionRow label="3PL-bevestigingen open" value={completion.waitingExternal} tone={completion.waitingExternal ? 'watch' : 'good'} /></div>
            <Link href="/besliscentrum" className="mt-5 inline-flex text-sm font-bold text-accent">Open besliscentrum →</Link>
          </div>
        </div>
      </section>

      <section className="mt-7"><SectionTitle title="Kern-KPI’s" note="Groen haalt het doel, amber vraagt aandacht en rood vraagt directe bijsturing." /><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <KpiCard label="Op tijd geleverd" value={`${kpis.shipments.onTimeRate}%`} note={`${kpis.shipments.onTime} van ${kpis.shipments.measuredDelivered} meetbare leveringen`} target="95%" status={statusForTarget(kpis.shipments.onTimeRate, 95)} />
        <KpiCard label="Bloktijd bevestigd" value={`${kpis.planning.slotConfirmationRate}%`} note={`${kpis.planning.confirmed} van ${kpis.planning.total} afspraken`} target="95%" status={statusForTarget(kpis.planning.slotConfirmationRate, 95)} />
        <KpiCard label="Acties onder controle" value={`${kpis.actions.controlRate}%`} note={`${kpis.actions.overdue} open acties over tijd`} target="90%" status={statusForTarget(kpis.actions.controlRate, 90)} />
        <KpiCard label="Orderbesluit definitief" value={`${kpis.orders.decisionRate}%`} note={`${kpis.orders.open} orderchecks nog open`} target="90%" status={statusForTarget(kpis.orders.decisionRate, 90)} />
        <KpiCard label="Voorraad beschikbaar" value={`${kpis.inventory.availabilityRate}%`} note={`${kpis.inventory.blocked} stuks geblokkeerd`} target="90%" status={statusForTarget(kpis.inventory.availabilityRate, 90)} />
      </div></section>

      <div className="mt-7 grid gap-6 xl:grid-cols-[1.2fr_.8fr]">
        <section className="card p-6"><SectionTitle title="Leverflow · laatste 7 dagen" note="Geplande leveringen versus werkelijk afgeronde leveringen." /><div className="mt-6 grid h-52 grid-cols-7 items-end gap-2 sm:gap-4">{kpis.dailyFlow.map((day) => <div key={day.date} className="flex h-full min-w-0 flex-col justify-end"><div className="flex flex-1 items-end justify-center gap-1"><div title={`${day.planned} gepland`} className="w-3 rounded-t bg-blue-200 sm:w-5" style={{height: `${Math.max(day.planned ? 12 : 2, (day.planned / maxFlow) * 100)}%`}} /><div title={`${day.completed} afgerond`} className="w-3 rounded-t bg-emerald-500 sm:w-5" style={{height: `${Math.max(day.completed ? 12 : 2, (day.completed / maxFlow) * 100)}%`}} /></div><div className="mt-3 truncate text-center text-[10px] font-semibold text-slate-500">{day.label}</div></div>)}</div><div className="mt-5 flex gap-5 text-xs text-slate-500"><span><i className="mr-2 inline-block h-2.5 w-2.5 rounded-sm bg-blue-200" />Gepland</span><span><i className="mr-2 inline-block h-2.5 w-2.5 rounded-sm bg-emerald-500" />Afgerond</span></div></section>
        <section className="card p-6"><SectionTitle title="Financieel beslisrisico" note="Alleen orderchecks zonder definitief besluit." /><div className="mt-5 rounded-2xl bg-red-50 p-5"><p className="text-xs font-bold uppercase tracking-wide text-red-700">Orderwaarde open</p><div className="mt-2 text-3xl font-bold text-red-800">{euro(kpis.orders.orderValueAtRisk)}</div><p className="mt-1 text-sm text-red-700">{euro(kpis.orders.netProfitAtRisk)} nettowinst gekoppeld</p></div><div className="mt-4 grid grid-cols-2 gap-3"><KpiCard label="Vrijgegeven" value={kpis.orders.released} note={`${kpis.orders.releaseRate}% van alle checks`} status="good" /><KpiCard label="Nog open" value={kpis.orders.open} note="Hold of escalatie" status={kpis.orders.open ? 'risk' : 'good'} /></div><Link href="/ordercheck" className="mt-4 inline-flex text-sm font-bold text-accent">Open orderbesluiten →</Link></section>
      </div>

      <section className="mt-7"><SectionTitle title="Operationele verdieping" note="Dezelfde cijfers per procesgebied, met directe route naar de bron." /><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <ProcessCard title="Zendingen" href="/zendingen" stats={[`${kpis.shipments.overdue} over tijd`, `${kpis.shipments.delayed} vertraagd`, `${kpis.shipments.blocked} geblokkeerd`]} tone={kpis.shipments.overdue || kpis.shipments.blocked ? 'red' : 'green'} />
        <ProcessCard title="Planning" href="/planning" stats={[`${kpis.planning.arrivalOnTimeRate}% binnen bloktijd`, `${kpis.planning.overdue} activiteiten over tijd`, `${kpis.planning.completed} afgerond`]} tone={kpis.planning.overdue ? 'amber' : 'green'} />
        <ProcessCard title="Acties" href="/acties" stats={[`${kpis.actions.open} open`, `${kpis.actions.critical} kritiek`, `${kpis.actions.resolutionRate}% opgelost`]} tone={kpis.actions.overdue ? 'red' : 'green'} />
        <ProcessCard title="Voorraad" href="/voorraad" stats={[`${kpis.inventory.available} beschikbaar`, `${kpis.inventory.reserved} gereserveerd`, `${kpis.inventory.blocked} geblokkeerd`]} tone={kpis.inventory.blocked ? 'amber' : 'green'} />
      </div></section>

      <section className="card mt-7 p-6"><SectionTitle title="KPI-definities" note="Zodat iedereen dezelfde cijfers op dezelfde manier leest." /><div className="mt-5 grid gap-4 text-sm md:grid-cols-2 xl:grid-cols-4"><Definition title="Op tijd geleverd">Werkelijke levering ligt op of vóór de geplande levering, alleen voor dossiers met beide tijdstippen.</Definition><Definition title="Direct afrondbaar">Fysieke bevestiging, aantallen en documenten zijn aanwezig en er staat geen blokkade open.</Definition><Definition title="Externe bevestiging open">Voor de externe stroom is een ontvangst- of uitleverbevestiging vereist.</Definition><Definition title="Operationele score">Gewogen combinatie van leverbetrouwbaarheid, planning, acties, orderbesluiten en voorraadbeschikbaarheid.</Definition><Definition title="Bloktijd bevestigd">Niet-geannuleerde planning met schriftelijk bevestigde bloktijd.</Definition><Definition title="Acties onder controle">Open acties waarvan de deadline vandaag of later ligt.</Definition><Definition title="Orderbesluit definitief">Orderchecks met uitkomst Vrijgegeven of Afgewezen.</Definition><Definition title="Voorraad beschikbaar">Beschikbaar aantal gedeeld door de totale geregistreerde voorraad.</Definition></div></section>
    </div>
  );
}

function SectionTitle({title, note}: {title: string; note: string}) {return <div><h2 className="text-lg font-bold text-navy">{title}</h2><p className="mt-1 text-sm text-slate-500">{note}</p></div>;}
function HeroMetric({value, label, tone}: {value: number | string; label: string; tone: 'green' | 'violet' | 'red' | 'blue'}) {const style = {green: 'bg-emerald-400/15 text-emerald-100', violet: 'bg-violet-400/15 text-violet-100', red: 'bg-red-400/15 text-red-100', blue: 'bg-blue-400/15 text-blue-100'}[tone]; return <div className={`rounded-2xl p-3 ring-1 ring-white/10 ${style}`}><div className="text-2xl font-bold">{value}</div><div className="mt-1 text-[10px] font-bold uppercase leading-4 tracking-wide opacity-75">{label}</div></div>;}
function ScoreMetric({value, label}: {value: string; label: string}) {return <div><div className="text-lg font-bold">{value}</div><div className="mt-1 text-[10px] uppercase leading-4 tracking-wide text-blue-100/65">{label}</div></div>;}
function PulseCard({href, label, value, note, tone}: {href: string; label: string; value: number; note: string; tone: 'green' | 'violet' | 'red' | 'amber'}) {const style = {green: 'border-emerald-200 bg-emerald-50 text-emerald-900', violet: 'border-violet-200 bg-violet-50 text-violet-900', red: 'border-red-200 bg-red-50 text-red-900', amber: 'border-amber-200 bg-amber-50 text-amber-950'}[tone]; return <Link href={href} className={`group rounded-2xl border p-5 ${style}`}><div className="flex items-start justify-between"><p className="text-xs font-bold uppercase tracking-wide opacity-65">{label}</p><span className="transition-transform group-hover:translate-x-1">→</span></div><div className="mt-2 text-3xl font-bold">{value}</div><p className="mt-2 text-xs leading-5 opacity-75">{note}</p></Link>;}
function RadarBar({label, value, total, tone, note}: {label: string; value: number; total: number; tone: string; note: string}) {const width = total > 0 ? Math.max(value ? 6 : 0, Math.round((value / total) * 100)) : 0; return <div><div className="flex items-end justify-between gap-3"><div><b className="text-sm text-navy">{label}</b><p className="mt-0.5 text-[11px] text-slate-500">{note}</p></div><b className="text-lg text-navy">{value}</b></div><div className="mt-2 h-2.5 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${tone}`} style={{width: `${width}%`}} /></div></div>;}
function Queue({title, items, empty, tone}: {title: string; items: ShipmentCompletionAssessment[]; empty: string; tone: 'green' | 'violet' | 'red'}) {const style = {green: 'bg-emerald-50 text-emerald-900', violet: 'bg-violet-50 text-violet-900', red: 'bg-red-50 text-red-900'}[tone]; return <div className={`rounded-2xl p-4 ${style}`}><div className="flex items-center justify-between"><b className="text-sm">{title}</b><span className="rounded-full bg-white/70 px-2 py-1 text-xs font-bold">{items.length}</span></div><div className="mt-4 space-y-2">{items.length ? items.slice(0, 3).map((item) => <Link key={item.shipment.id} href={`/dossiers/${encodeURIComponent(item.shipment.reference)}`} className="block rounded-xl bg-white/70 p-3"><b className="block truncate text-xs">{item.shipment.reference}</b><span className="mt-1 block truncate text-[10px] opacity-65">{item.shipment.origin} → {item.shipment.destination}</span></Link>) : <p className="rounded-xl bg-white/50 p-3 text-xs opacity-65">{empty}</p>}</div></div>;}
function WarehouseCard({title, eyebrow, metrics, footer, tone}: {title: string; eyebrow: string; metrics: Array<[string, string]>; footer: string; tone: 'dark' | 'light'}) {return <div className={`rounded-3xl p-6 ${tone === 'dark' ? 'bg-gradient-to-br from-violet-700 to-navy text-white' : 'card text-navy'}`}><p className={`text-xs font-bold uppercase tracking-[.16em] ${tone === 'dark' ? 'text-violet-200' : 'text-blue-600'}`}>{eyebrow}</p><h3 className="mt-2 text-xl font-bold">{title}</h3><div className="mt-6 grid grid-cols-3 gap-3">{metrics.map(([value, label]) => <div key={label}><div className="text-2xl font-bold">{value}</div><div className={`mt-1 text-[10px] leading-4 ${tone === 'dark' ? 'text-white/60' : 'text-slate-500'}`}>{label}</div></div>)}</div><p className={`mt-6 border-t pt-4 text-xs leading-5 ${tone === 'dark' ? 'border-white/10 text-white/65' : 'border-slate-100 text-slate-500'}`}>{footer}</p></div>;}
function AttentionRow({label, value, tone}: {label: string; value: number; tone: 'good' | 'watch' | 'risk'}) {const style = tone === 'risk' ? 'bg-red-50 text-red-800' : tone === 'watch' ? 'bg-amber-50 text-amber-900' : 'bg-emerald-50 text-emerald-800'; return <div className={`flex items-center justify-between rounded-xl px-4 py-3 ${style}`}><span className="text-sm font-semibold">{label}</span><b>{value}</b></div>;}
function ProcessCard({title, href, stats, tone}: {title: string; href: string; stats: string[]; tone: 'red' | 'amber' | 'green'}) {const style = tone === 'red' ? 'border-red-200 bg-red-50' : tone === 'amber' ? 'border-amber-200 bg-amber-50' : 'border-emerald-200 bg-emerald-50'; return <Link href={href} className={`rounded-2xl border p-5 ${style}`}><div className="flex justify-between"><h3 className="font-bold text-navy">{title}</h3><span>→</span></div><ul className="mt-4 space-y-2 text-sm text-slate-700">{stats.map((stat) => <li key={stat}>• {stat}</li>)}</ul></Link>;}
function Definition({title, children}: {title: string; children: React.ReactNode}) {return <div className="rounded-xl bg-slate-50 p-4"><b className="text-navy">{title}</b><p className="mt-1 leading-6 text-slate-600">{children}</p></div>;}
