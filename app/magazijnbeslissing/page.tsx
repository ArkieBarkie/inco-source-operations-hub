'use client';

import {useEffect, useMemo, useState} from 'react';
import Link from 'next/link';
import {useOperations} from '@/components/operations-provider';
import {
  calculateWarehouseDecision,
  defaultWarehouseAssumptions,
  defaultWarehouseInputs,
  warehouseRouteLabels,
  type WarehouseAssumptions,
  type WarehouseDecisionInputs,
  type WarehouseRouteId,
  type WarehouseRouteOption,
} from '@/lib/warehouse-decision';
import {formatDateTime} from '@/lib/shipments';
import type {WarehouseDecision, WarehouseDecisionRoute} from '@/types/operations';

type Step = 1 | 2 | 3;

const routeChoices: WarehouseDecisionRoute[] = ['internal', 'current3pl', 'direct', 'alternative3pl', 'escalate'];

export default function Magazijnbeslissing() {
  const {data, session, canEdit, saveWarehouseDecision} = useOperations();
  const [step, setStep] = useState<Step>(1);
  const [inputs, setInputs] = useState<WarehouseDecisionInputs>(defaultWarehouseInputs);
  const [assumptions, setAssumptions] = useState<WarehouseAssumptions>(defaultWarehouseAssumptions);
  const [selectedShipmentId, setSelectedShipmentId] = useState('');
  const [chosenRoute, setChosenRoute] = useState<WarehouseDecisionRoute | ''>('');
  const [rationale, setRationale] = useState('');
  const [reviewAt, setReviewAt] = useState('');
  const [savedId, setSavedId] = useState('');
  const [saveError, setSaveError] = useState('');

  const internalLocation = data.locations.find((location) => location.type === 'Eigen magazijn');
  const availablePalletSlots = typeof internalLocation?.palletCapacity === 'number'
    ? Math.max(0, internalLocation.palletCapacity - internalLocation.currentPalletUsage)
    : null;
  const effectiveInputs = useMemo<WarehouseDecisionInputs>(() => ({
    ...inputs,
    internalCapacityAvailable: availablePalletSlots === null ? null : inputs.pallets <= availablePalletSlots,
  }), [availablePalletSlots, inputs]);
  const result = useMemo(() => calculateWarehouseDecision(effectiveInputs, assumptions), [assumptions, effectiveInputs]);
  const selectedShipment = data.shipments.find((shipment) => shipment.id === selectedShipmentId);
  const recentDecisions = [...data.warehouseDecisions].sort((left, right) => right.decidedAt.localeCompare(left.decidedAt)).slice(0, 6);

  useEffect(() => {
    setChosenRoute(result.recommendation ?? '');
    setSavedId('');
    setSaveError('');
  }, [result.recommendation]);

  const setInput = <K extends keyof WarehouseDecisionInputs>(key: K, value: WarehouseDecisionInputs[K]) => {
    setSavedId('');
    setInputs((current) => ({...current, [key]: value}));
  };

  const chooseShipment = (shipmentId: string) => {
    setSelectedShipmentId(shipmentId);
    setSavedId('');
    if (!shipmentId) {
      setInputs(defaultWarehouseInputs);
      return;
    }
    const shipment = data.shipments.find((item) => item.id === shipmentId);
    if (!shipment) return;
    const orderCheck = data.orderChecks.find((item) => item.orderReference === shipment.orderReference);
    setInputs({
      ...defaultWarehouseInputs,
      reference: shipment.reference,
      shipmentLinked: true,
      flow: 'Herhaalhandel',
      orderValue: orderCheck?.orderValue ?? 0,
      pallets: shipment.pallets,
      cases: shipment.cases,
      fragileOrHighValue: shipment.notes.toLocaleLowerCase('nl-NL').includes('kwetsbaar'),
    });
  };

  const saveDecision = () => {
    setSaveError('');
    if (!canEdit || !session) return setSaveError('Je account heeft geen schrijfrechten.');
    if (!result.ready || !result.recommendation || !chosenRoute) return setSaveError('De vergelijking is nog niet compleet.');
    const isOverride = chosenRoute !== result.recommendation;
    if (rationale.trim().length < (isOverride ? 10 : 3)) return setSaveError(isOverride ? 'Beschrijf de afwijkende motivatie in minimaal 10 tekens.' : 'Leg de hoofdreden kort vast.');
    if (isOverride && !reviewAt) return setSaveError('Een afwijkende keuze heeft een herbeoordelingsdatum nodig.');
    const decision: WarehouseDecision = {
      id: crypto.randomUUID(),
      shipmentId: selectedShipment?.id,
      reference: effectiveInputs.reference.trim(),
      recommendation: result.recommendation,
      chosenRoute,
      rationale: rationale.trim(),
      confidence: result.confidence,
      decidedAt: new Date().toISOString(),
      decidedByUserId: session.userId,
      decidedByName: session.displayName,
      reviewAt: reviewAt || undefined,
      inputSnapshot: {...effectiveInputs},
      optionSnapshot: result.options.map((option) => ({id: option.id, label: option.label, cost: option.cost, feasible: option.feasible, blockers: option.blockers})),
      assumptions: result.assumptions,
    };
    saveWarehouseDecision(decision);
    setSavedId(decision.id);
  };

  return <div className="container-page">
    <header className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
      <div>
        <p className="label">Onderbouwd locatiebesluit</p>
        <h1 className="mt-2 max-w-4xl text-4xl font-bold text-navy">Kies de beste afhandelroute</h1>
        <p className="mt-3 max-w-3xl leading-7 text-slate-600">Selecteer een zending en vergelijk intern Amstelveen, de huidige 3PL, directe levering en een kandidaat-3PL. Een advies verschijnt pas wanneer de noodzakelijke feiten zijn bevestigd.</p>
      </div>
      <Link href="/sops/sop-007-keuze-intern-magazijn-3pl-en-transfers" className="min-h-11 self-start rounded-xl border border-blue-200 bg-white px-4 py-3 text-sm font-bold text-accent">Open SOP-007 →</Link>
    </header>

    <div className="mt-6 flex flex-wrap gap-2 text-xs font-bold">
      <SourceBadge tone="blue">Zending en capaciteit · portaldata</SourceBadge>
      <SourceBadge tone="amber">Waarde en haalbaarheid · bevestigen</SourceBadge>
      <SourceBadge tone="slate">Tarieven · rekenaannames</SourceBadge>
    </div>

    <StepNavigation step={step} setStep={setStep} />

    <div className="mt-5 grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
      <section className="card overflow-hidden">
        {step === 1 && <div className="p-5 sm:p-7">
          <StepHeading number="01" title="Kies de goederenstroom" description="Neem bestaande portaldata over en vul alleen de commerciële of operationele gegevens aan die nog ontbreken." />
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <Field label="Bestaande zending" hint="Neemt referentie, pallets en colli over">
              <select value={selectedShipmentId} onChange={(event) => chooseShipment(event.target.value)}>
                <option value="">Nieuw handmatig scenario</option>
                {data.shipments.filter((shipment) => !['Afgeleverd', 'Geannuleerd'].includes(shipment.status)).map((shipment) => <option value={shipment.id} key={shipment.id}>{shipment.reference} · {shipment.direction} · {shipment.status}</option>)}
              </select>
            </Field>
            <Field label="Referentie" hint={inputs.shipmentLinked ? 'Overgenomen uit de portal' : 'Verplicht voor het besluitrecord'}>
              <input value={inputs.reference} onChange={(event) => setInput('reference', event.target.value.slice(0, 150))} placeholder="Bijvoorbeeld INCO-260825-01" />
            </Field>
            <Field label="Handelsstroom" hint="Bepaalt hoe vaste 3PL-kosten worden verdeeld">
              <select value={inputs.flow} onChange={(event) => setInput('flow', event.target.value as WarehouseDecisionInputs['flow'])}><option>Kansgestuurd</option><option>Herhaalhandel</option></select>
            </Field>
            {inputs.flow === 'Herhaalhandel' && <NumberField label="Orders per week" hint="Voor verdeling van de wekelijkse servicefee" value={inputs.weeklyOrders} set={(value) => setInput('weeklyOrders', value)} min={1} step={1} />}
            <NumberField label="Order- / inkoopwaarde" hint="Exclusief btw" value={inputs.orderValue} set={(value) => setInput('orderValue', value)} prefix="€" min={0} step={50} />
            <NumberField label="Verwachte brutomarge" hint="Voor toetsing van logistieke kosten" value={inputs.grossMarginPercentage} set={(value) => setInput('grossMarginPercentage', value)} suffix="%" min={0} max={100} step={0.5} />
            <NumberField label="Aantal pallets" value={inputs.pallets} set={(value) => setInput('pallets', value)} min={1} step={1} />
            <NumberField label="Aantal colli" value={inputs.cases} set={(value) => setInput('cases', value)} min={1} step={1} />
            <NumberField label="Interne handlingtijd" value={inputs.handlingMinutes} set={(value) => setInput('handlingMinutes', value)} suffix="min" min={0} step={5} />
            <NumberField label="Opslagduur" value={inputs.storageDays} set={(value) => setInput('storageDays', value)} suffix="dagen" min={0} step={1} />
            <NumberField label="Interne ritten" value={inputs.trips} set={(value) => setInput('trips', value)} min={0} step={1} />
          </div>
          {selectedShipment && <div className="mt-5 rounded-2xl bg-blue-50 p-4 text-sm text-blue-950"><b>{selectedShipment.reference}</b><p className="mt-1 text-xs leading-5 text-blue-800">{selectedShipment.origin} → {selectedShipment.destination} · {selectedShipment.pallets} pallets · {selectedShipment.cases} colli · bijgewerkt {formatDateTime(selectedShipment.updatedAt)}</p></div>}
          <StepActions next={() => setStep(2)} nextLabel="Controleer haalbaarheid" />
        </div>}

        {step === 2 && <div className="p-5 sm:p-7">
          <StepHeading number="02" title="Bevestig haalbaarheid en risico" description="Een lage prijs is pas bruikbaar als capaciteit, deadline, producteisen en traceerbaarheid kloppen." />
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <StatusCard label="Interne capaciteit" value={availablePalletSlots === null ? 'Niet beschikbaar' : `${availablePalletSlots} vrije palletplaatsen`} ok={availablePalletSlots !== null && inputs.pallets <= availablePalletSlots} detail={internalLocation ? `${internalLocation.currentPalletUsage} van ${internalLocation.palletCapacity ?? '—'} in gebruik · portaldata` : 'Geen interne locatie gevonden'} />
            <TriStateField label="Huidige 3PL haalt de deadline" value={inputs.current3plCanMeetDeadline} set={(value) => setInput('current3plCanMeetDeadline', value)} />
            <TriStateField label="Huidige 3PL is gekwalificeerd" value={inputs.current3plQualified} set={(value) => setInput('current3plQualified', value)} />
            <TriStateField label="Directe levering is haalbaar" value={inputs.directDeliveryPossible} set={(value) => setInput('directDeliveryPossible', value)} />
            {inputs.directDeliveryPossible === true && <><TriStateField label="Directe route is traceerbaar" value={inputs.directDeliveryQualified} set={(value) => setInput('directDeliveryQualified', value)} /><NumberField label="Directe transportkosten" value={inputs.directDeliveryCost} set={(value) => setInput('directDeliveryCost', value)} prefix="€" min={0} step={10} /></>}
          </div>

          <h3 className="mt-7 font-bold text-navy">Product- en procesrisico</h3>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <CheckCard label="Structurele opslag nodig" checked={inputs.structuralStorage} set={(value) => setInput('structuralStorage', value)} />
            <CheckCard label="Kwetsbaar of hoge waarde" checked={inputs.fragileOrHighValue} set={(value) => setInput('fragileOrHighValue', value)} />
            <CheckCard label="Batch, lot, houdbaarheid of speciale handling kritisch" checked={inputs.criticalHandling} set={(value) => setInput('criticalHandling', value)} />
            {inputs.criticalHandling && <TriStateField label="Amstelveen is hiervoor aantoonbaar geschikt" value={inputs.internalCriticalReady} set={(value) => setInput('internalCriticalReady', value)} />}
          </div>

          <details className="mt-6 rounded-2xl border bg-slate-50 p-4">
            <summary className="cursor-pointer font-bold text-navy">Kandidaat-3PL en offertetoeslagen</summary>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <TriStateField label="Logicall is gekwalificeerd" value={inputs.alternative3plQualified} set={(value) => setInput('alternative3plQualified', value)} />
              <TriStateField label="Logicall haalt de deadline" value={inputs.alternative3plCanMeetDeadline} set={(value) => setInput('alternative3plCanMeetDeadline', value)} />
              <CheckCard label="Niet-aangemelde inslag" checked={inputs.unannouncedInbound} set={(value) => setInput('unannouncedInbound', value)} />
              <CheckCard label="Spoedorder" checked={inputs.rush} set={(value) => setInput('rush', value)} />
              <CheckCard label="Pallets wikkelen" checked={inputs.wrapPallets} set={(value) => setInput('wrapPallets', value)} />
            </div>
          </details>
          <StepActions previous={() => setStep(1)} next={() => setStep(3)} nextLabel="Vergelijk routes" />
        </div>}

        {step === 3 && <div className="p-5 sm:p-7">
          <StepHeading number="03" title="Vergelijk en leg het besluit vast" description="Controleer haalbaarheid, kosten, marge-effect en de reden voordat je een locatiebesluit opslaat." />
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {result.options.map((option) => <RouteCard key={option.id} option={option} recommended={result.recommendation === option.id} grossMargin={result.grossMarginValue} />)}
          </div>

          <div className="mt-7 rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-start"><div><p className="label">Besluitrecord</p><h3 className="mt-1 text-xl font-bold text-navy">Leg keuze en hoofdreden vast</h3></div>{session && <span className="rounded-full bg-white px-3 py-1.5 text-xs font-bold text-slate-600">Account: {session.displayName}</span>}</div>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <Field label="Gekozen route"><select value={chosenRoute} onChange={(event) => setChosenRoute(event.target.value as WarehouseDecisionRoute)} disabled={!result.ready}><option value="">Nog geen besluit mogelijk</option>{routeChoices.map((route) => <option key={route} value={route}>{warehouseRouteLabels[route]}</option>)}</select></Field>
              <Field label="Herbeoordelen op" hint="Verplicht bij afwijking van het advies"><input type="date" value={reviewAt} onChange={(event) => setReviewAt(event.target.value)} /></Field>
            </div>
            <Field label="Hoofdreden / motivatie" hint={chosenRoute && result.recommendation && chosenRoute !== result.recommendation ? 'Afwijkende keuze: minimaal 10 tekens en herbeoordelingsdatum verplicht' : 'Wordt samen met invoer, uitkomst en account opgeslagen'}><textarea rows={3} value={rationale} onChange={(event) => setRationale(event.target.value.slice(0, 2_000))} placeholder="Waarom is deze route voor deze goederenstroom de juiste keuze?" /></Field>
            {saveError && <p role="alert" className="mt-3 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-800">{saveError}</p>}
            {savedId && <p className="mt-3 rounded-xl bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">Besluit opgeslagen met account, tijdstip, invoer, alternatieven en aannames.</p>}
            <button type="button" onClick={saveDecision} disabled={!canEdit || !result.ready} className="mt-4 min-h-12 w-full rounded-xl bg-blue-600 px-5 py-3.5 font-bold text-white disabled:cursor-not-allowed disabled:opacity-40">Besluit definitief vastleggen</button>
          </div>
          <StepActions previous={() => setStep(2)} />
        </div>}
      </section>

      <DecisionSummary result={result} goToMissing={() => setStep(result.missing.some((item) => /deadline|kwalificatie|capaciteit|directe|kritieke/i.test(item)) ? 2 : 1)} />
    </div>

    <AssumptionsPanel assumptions={assumptions} setAssumptions={setAssumptions} />

    <section className="card mt-6 p-5 sm:p-7">
      <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-end"><div><p className="label">Audittrail</p><h2 className="mt-1 text-xl font-bold text-navy">Recente locatiebesluiten</h2></div><p className="text-xs text-slate-500">In database-stand ook centraal met mutatie-auditlog opgeslagen.</p></div>
      {recentDecisions.length ? <div className="mt-5 divide-y overflow-hidden rounded-2xl border">{recentDecisions.map((decision) => <DecisionRow key={decision.id} decision={decision} />)}</div> : <div className="mt-5 rounded-2xl border border-dashed p-6 text-center text-sm text-slate-500">Nog geen locatiebesluiten vastgelegd.</div>}
    </section>

    <section className="mt-6 grid gap-4 md:grid-cols-3">
      <PartnerCard eyebrow="Huidige 3PL" title="Scan Global Logistics">Tarieven, cut-offs, voorraadbetrouwbaarheid en SLA moeten als actuele bron worden bevestigd.</PartnerCard>
      <PartnerCard eyebrow="Kandidaat-3PL" title="Logicall Zaandam">Offerte 20260254 is indicatief opgenomen; kwalificatie, deadline en medische handling blijven expliciete poorten.</PartnerCard>
      <PartnerCard eyebrow="Belangrijk" title="Geen migratie op uitstraling alleen">Voorraadreconciliatie, implementatie-uren, contract, testflow en terugvalscenario blijven onderdeel van de uiteindelijke partnerkeuze.</PartnerCard>
    </section>
  </div>;
}

function StepNavigation({step, setStep}: {step: Step; setStep: (step: Step) => void}) {
  return <nav aria-label="Stappen locatiebesluit" className="mt-7 grid grid-cols-3 overflow-hidden rounded-2xl border bg-white p-1 shadow-sm">{[
    [1, 'Stroom'], [2, 'Haalbaarheid'], [3, 'Vergelijk & besluit'],
  ].map(([number, label]) => <button type="button" key={number} onClick={() => setStep(number as Step)} aria-current={step === number ? 'step' : undefined} className={`min-h-12 rounded-xl px-2 py-2 text-xs font-bold sm:text-sm ${step === number ? 'bg-navy text-white' : 'text-slate-500 hover:bg-slate-50'}`}><span className="mr-1 opacity-60">0{number}</span> {label}</button>)}</nav>;
}

function StepHeading({number, title, description}: {number: string; title: string; description: string}) {
  return <div className="flex gap-4"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-blue-50 text-xs font-black text-blue-700">{number}</span><div><h2 className="text-xl font-bold text-navy">{title}</h2><p className="mt-1 text-sm leading-6 text-slate-500">{description}</p></div></div>;
}

function DecisionSummary({result, goToMissing}: {result: ReturnType<typeof calculateWarehouseDecision>; goToMissing: () => void}) {
  const ready = result.ready && result.recommendation;
  const tone = result.recommendation === 'escalate' ? 'bg-amber-600' : ready ? 'bg-navy' : 'bg-slate-800';
  const recommendedOption = result.options.find((option) => option.id === result.recommendation);
  return <aside className="space-y-4 xl:sticky xl:top-24">
    <section className={`rounded-3xl p-6 text-white shadow-soft ${tone}`}>
      <div className="flex items-center justify-between gap-3"><p className="text-xs font-bold uppercase tracking-widest opacity-70">Actueel advies</p><span className="rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-bold uppercase">Zekerheid {result.confidence}</span></div>
      <h2 className="mt-3 text-2xl font-bold sm:text-3xl">{result.recommendationLabel}</h2>
      <p className="mt-3 text-sm leading-6 text-white/80">{result.reason}</p>
      {recommendedOption?.cost !== null && recommendedOption && <div className="mt-5 grid grid-cols-2 gap-3 border-t border-white/15 pt-4"><SummaryMetric label="Routekosten" value={money(recommendedOption.cost)} /><SummaryMetric label="Marge na logistiek" value={money(recommendedOption.contributionAfterLogistics)} /></div>}
    </section>
    {!result.ready && <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5"><h3 className="font-bold text-amber-950">Nog te bevestigen</h3><ul className="mt-3 space-y-2 text-sm text-amber-900">{result.missing.slice(0, 6).map((item) => <li key={item}>• {item}</li>)}</ul>{result.missing.length > 6 && <p className="mt-2 text-xs text-amber-700">+ {result.missing.length - 6} overige punten</p>}<button type="button" onClick={goToMissing} className="mt-4 min-h-11 w-full rounded-xl bg-amber-900 px-4 py-2.5 text-sm font-bold text-white">Vul ontbrekende gegevens aan</button></section>}
    <section className="card p-5"><h3 className="font-bold text-navy">Financieel kader</h3><div className="mt-4 space-y-3"><KeyValue label="Verwachte brutomarge" value={money(result.grossMarginValue)} />{result.savingsVersusNext !== null && <KeyValue label="Verschil met volgende route" value={money(result.savingsVersusNext)} strong />}</div><p className="mt-4 text-xs leading-5 text-slate-500">De uitkomst blijft indicatief totdat werkelijke tarieven, SLA en productkwalificatie zijn bevestigd.</p></section>
  </aside>;
}

function RouteCard({option, recommended, grossMargin}: {option: WarehouseRouteOption; recommended: boolean; grossMargin: number}) {
  return <article className={`rounded-2xl border p-4 ${recommended ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-100' : option.feasible ? 'border-emerald-200 bg-white' : 'border-slate-200 bg-slate-50'}`}>
    <div className="flex items-start justify-between gap-3"><div><p className={`text-[10px] font-bold uppercase tracking-widest ${option.feasible ? 'text-emerald-700' : 'text-slate-500'}`}>{recommended ? 'Aanbevolen' : option.feasible ? 'Haalbaar' : 'Niet haalbaar'}</p><h3 className="mt-1 font-bold text-navy">{option.label}</h3></div><b className="text-lg text-navy">{option.cost === null ? '—' : money(option.cost)}</b></div>
    {option.cost !== null && <p className="mt-3 text-xs text-slate-500">Marge na logistiek: <b className={grossMargin - option.cost >= 0 ? 'text-emerald-700' : 'text-red-700'}>{money(grossMargin - option.cost)}</b></p>}
    {option.blockers.length > 0 && <ul className="mt-3 space-y-1 text-xs leading-5 text-red-700">{option.blockers.map((blocker) => <li key={blocker}>• {blocker}</li>)}</ul>}
    {option.warnings.length > 0 && <ul className="mt-3 space-y-1 text-xs leading-5 text-amber-700">{option.warnings.map((warning) => <li key={warning}>• {warning}</li>)}</ul>}
  </article>;
}

function AssumptionsPanel({assumptions, setAssumptions}: {assumptions: WarehouseAssumptions; setAssumptions: (value: WarehouseAssumptions) => void}) {
  const set = <K extends keyof WarehouseAssumptions>(key: K, value: WarehouseAssumptions[K]) => setAssumptions({...assumptions, [key]: value});
  return <details className="card mt-6 p-5 sm:p-7"><summary className="cursor-pointer list-none"><div className="flex items-center justify-between gap-4"><div><p className="label">Transparant rekenmodel</p><h2 className="mt-1 text-xl font-bold text-navy">Bekijk en beheer alle aannames</h2><p className="mt-1 text-sm text-slate-500">Geen verborgen vaste bedragen: iedere tarief- en grenswaarde staat hieronder.</p></div><span className="text-2xl text-slate-400">+</span></div></summary><div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
    <Assumption label="Uurtarief" value={assumptions.hourlyRate} set={(value) => set('hourlyRate', value)} />
    <Assumption label="Interne administratie (min)" value={assumptions.internalAdminMinutes} set={(value) => set('internalAdminMinutes', value)} />
    <Assumption label="Rijtijd per rit (uur)" value={assumptions.travelHoursPerTrip} set={(value) => set('travelHoursPerTrip', value)} />
    <Assumption label="Autokosten per rit" value={assumptions.vehicleCostPerTrip} set={(value) => set('vehicleCostPerTrip', value)} />
    <Assumption label="Interne opslag / pallet / dag" value={assumptions.internalStoragePerPalletDay} set={(value) => set('internalStoragePerPalletDay', value)} />
    <Assumption label="Verwachte interne afwijkingskosten" value={assumptions.internalExpectedExceptionCost} set={(value) => set('internalExpectedExceptionCost', value)} />
    <Assumption label="Huidige 3PL inbound / pallet" value={assumptions.current3plInboundPerPallet} set={(value) => set('current3plInboundPerPallet', value)} />
    <Assumption label="Huidige 3PL outbound / order" value={assumptions.current3plOutboundPerOrder} set={(value) => set('current3plOutboundPerOrder', value)} />
    <Assumption label="Huidige 3PL pick / colli" value={assumptions.current3plPickPerCase} set={(value) => set('current3plPickPerCase', value)} />
    <Assumption label="Huidige 3PL opslag / pallet / dag" value={assumptions.current3plStoragePerPalletDay} set={(value) => set('current3plStoragePerPalletDay', value)} />
    <Assumption label="Huidige 3PL administratie (min)" value={assumptions.current3plAdminMinutes} set={(value) => set('current3plAdminMinutes', value)} />
    <Assumption label="Verwachte 3PL-afwijkingskosten" value={assumptions.current3plExpectedExceptionCost} set={(value) => set('current3plExpectedExceptionCost', value)} />
    <Assumption label="Logicall inbound / pallet" value={assumptions.alternativeInboundPerPallet} set={(value) => set('alternativeInboundPerPallet', value)} />
    <Assumption label="Logicall outbound / pallet" value={assumptions.alternativeOutboundPerPallet} set={(value) => set('alternativeOutboundPerPallet', value)} />
    <Assumption label="Logicall opslag / pallet / week" value={assumptions.alternativeStoragePerPalletWeek} set={(value) => set('alternativeStoragePerPalletWeek', value)} />
    <Assumption label="Logicall servicefee / week" value={assumptions.alternativeWeeklyServiceFee} set={(value) => set('alternativeWeeklyServiceFee', value)} />
    <Assumption label="Maximaal pallets intern" value={assumptions.maxInternalPallets} set={(value) => set('maxInternalPallets', value)} />
    <Assumption label="Maximale interne minuten" value={assumptions.maxInternalHandlingMinutes} set={(value) => set('maxInternalHandlingMinutes', value)} />
    <Assumption label="Maximale interne opslagdagen" value={assumptions.maxInternalStorageDays} set={(value) => set('maxInternalStorageDays', value)} />
    <Assumption label="Minimaal voordeel intern" value={assumptions.minimumInternalAdvantage} set={(value) => set('minimumInternalAdvantage', value)} />
  </div><p className="mt-5 rounded-xl bg-amber-50 p-3 text-xs leading-5 text-amber-900">Startwaarden zijn professionele rekenaannames. Vervang ze vóór operationeel gebruik door bevestigde contracttarieven, werkelijke tijdmetingen en SLA-data.</p></details>;
}

function DecisionRow({decision}: {decision: WarehouseDecision}) {
  const override = decision.chosenRoute !== decision.recommendation;
  return <div className="grid gap-2 bg-white px-4 py-4 text-sm md:grid-cols-[160px_1fr_180px]"><div><b className="text-navy">{decision.reference}</b><p className="mt-1 text-xs text-slate-500">{formatDateTime(decision.decidedAt)}</p></div><div><p className="font-semibold text-slate-800">{warehouseRouteLabels[decision.chosenRoute]}</p><p className="mt-1 text-xs leading-5 text-slate-500">{decision.rationale}</p>{override && <span className="mt-2 inline-block rounded-full bg-amber-50 px-2 py-1 text-[10px] font-bold uppercase text-amber-800">Afwijking van advies</span>}</div><div className="md:text-right"><p className="font-semibold text-navy">{decision.decidedByName}</p><p className="mt-1 text-xs text-slate-500">Zekerheid {decision.confidence}{decision.reviewAt ? ` · review ${decision.reviewAt}` : ''}</p></div></div>;
}

function Field({label, hint, children}: {label: string; hint?: string; children: React.ReactElement}) {
  return <label className="block"><span className="mb-1.5 block text-sm font-bold text-slate-700">{label}</span><span className="[&>*]:min-h-11 [&>*]:w-full [&>*]:rounded-xl [&>*]:border [&>*]:bg-white [&>*]:px-3 [&>*]:py-2.5 [&>*]:outline-none focus-within:[&>*]:border-blue-400 focus-within:[&>*]:ring-2 focus-within:[&>*]:ring-blue-100">{children}</span>{hint && <span className="mt-1.5 block text-[11px] leading-4 text-slate-400">{hint}</span>}</label>;
}

function NumberField({label, hint, value, set, prefix, suffix, min = 0, max, step = 1}: {label: string; hint?: string; value: number; set: (value: number) => void; prefix?: string; suffix?: string; min?: number; max?: number; step?: number}) {
  return <Field label={label} hint={hint}><span className="flex min-h-11 items-center rounded-xl border bg-white px-3 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100">{prefix && <span className="mr-2 text-sm font-semibold text-slate-400">{prefix}</span>}<input className="min-w-0 flex-1 bg-transparent py-2.5 outline-none" type="number" min={min} max={max} step={step} value={value} onChange={(event) => set(Math.max(min, Number(event.target.value) || 0))} />{suffix && <span className="ml-2 text-xs font-semibold text-slate-400">{suffix}</span>}</span></Field>;
}

function TriStateField({label, value, set}: {label: string; value: boolean | null; set: (value: boolean | null) => void}) {
  return <Field label={label}><select value={value === null ? '' : String(value)} onChange={(event) => set(event.target.value === '' ? null : event.target.value === 'true')}><option value="">Nog bevestigen</option><option value="true">Ja, bevestigd</option><option value="false">Nee</option></select></Field>;
}

function CheckCard({label, checked, set}: {label: string; checked: boolean; set: (value: boolean) => void}) {
  return <label className="flex min-h-12 items-center justify-between gap-3 rounded-xl border bg-white p-3 text-sm font-semibold text-slate-700"><span>{label}</span><input type="checkbox" checked={checked} onChange={(event) => set(event.target.checked)} className="h-5 w-5 shrink-0 accent-blue-600" /></label>;
}

function StatusCard({label, value, detail, ok}: {label: string; value: string; detail: string; ok: boolean}) {
  return <div className={`rounded-xl border p-4 ${ok ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'}`}><p className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</p><p className={`mt-1 font-bold ${ok ? 'text-emerald-800' : 'text-amber-900'}`}>{value}</p><p className="mt-1 text-[11px] leading-4 text-slate-500">{detail}</p></div>;
}

function StepActions({previous, next, nextLabel}: {previous?: () => void; next?: () => void; nextLabel?: string}) {
  return <div className="mt-7 flex flex-col-reverse justify-between gap-3 border-t pt-5 sm:flex-row">{previous ? <button type="button" onClick={previous} className="min-h-11 rounded-xl border px-5 py-2.5 text-sm font-bold text-slate-600">← Vorige stap</button> : <span />}{next && <button type="button" onClick={next} className="min-h-11 rounded-xl bg-navy px-5 py-2.5 text-sm font-bold text-white">{nextLabel} →</button>}</div>;
}

function Assumption({label, value, set}: {label: string; value: number; set: (value: number) => void}) {
  return <NumberField label={label} value={value} set={set} min={0} step={0.05} />;
}

function SourceBadge({children, tone}: {children: React.ReactNode; tone: 'blue' | 'amber' | 'slate'}) {
  const tones = {blue: 'bg-blue-50 text-blue-800', amber: 'bg-amber-50 text-amber-900', slate: 'bg-slate-100 text-slate-600'};
  return <span className={`rounded-full px-3 py-1.5 ${tones[tone]}`}>{children}</span>;
}

function SummaryMetric({label, value}: {label: string; value: string}) {return <div><p className="text-[10px] uppercase tracking-wide text-white/60">{label}</p><p className="mt-1 font-bold">{value}</p></div>}
function KeyValue({label, value, strong = false}: {label: string; value: string; strong?: boolean}) {return <div className={`flex items-center justify-between gap-3 ${strong ? 'border-t pt-3 font-bold text-navy' : ''}`}><span className="text-sm text-slate-600">{label}</span><span className="font-bold text-navy">{value}</span></div>}
function PartnerCard({eyebrow, title, children}: {eyebrow: string; title: string; children: React.ReactNode}) {return <div className="card p-5"><p className="label">{eyebrow}</p><h3 className="mt-2 font-bold text-navy">{title}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{children}</p></div>}
function money(value: number | null) {return value === null ? '—' : new Intl.NumberFormat('nl-NL', {style: 'currency', currency: 'EUR'}).format(value)}
