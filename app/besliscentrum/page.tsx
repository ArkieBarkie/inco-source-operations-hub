'use client';

import {useMemo, useState} from 'react';
import {DecisionCard} from '@/components/decision-card';
import {useOperations} from '@/components/operations-provider';
import {buildDecisionItems, decisionTotals, type DecisionCategory, type DecisionSeverity} from '@/lib/decision-center';

const euro = (value: number) => new Intl.NumberFormat('nl-NL', {style: 'currency', currency: 'EUR', maximumFractionDigits: 0}).format(value);

export default function DecisionCenterPage() {
  const {data} = useOperations();
  const [severity, setSeverity] = useState<DecisionSeverity | ''>('');
  const [category, setCategory] = useState<DecisionCategory | ''>('');
  const [owner, setOwner] = useState('');
  const decisions = useMemo(() => buildDecisionItems(data), [data]);
  const totals = useMemo(() => decisionTotals(decisions), [decisions]);
  const filtered = decisions.filter((decision) =>
    (!severity || decision.severity === severity)
    && (!category || decision.category === category)
    && (!owner || decision.owner === owner)
  );
  const owners = [...new Set(decisions.map((decision) => decision.owner))];

  return (
    <div className="container-page">
      <section className="overflow-hidden rounded-3xl bg-navy text-white">
        <div className="grid gap-7 p-7 sm:p-9 xl:grid-cols-[1.25fr_.75fr] xl:items-end">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.2em] text-blue-300">Inco Besliscentrum</p>
            <h1 className="mt-3 text-3xl font-bold sm:text-4xl">Dit moet vandaag besloten worden.</h1>
            <p className="mt-3 max-w-2xl leading-7 text-blue-100">Geen losse tellingen, maar gerangschikte uitzonderingen met impact, bron, eigenaar en een veilige eerstvolgende actie.</p>
            <div className="mt-6 flex flex-wrap gap-2 text-xs font-bold">
              <span className="rounded-full bg-white/10 px-3 py-2">{totals.total} besluiten</span>
              <span className="rounded-full bg-red-400/20 px-3 py-2 text-red-100">{totals.critical} kritiek</span>
              <span className="rounded-full bg-amber-300/20 px-3 py-2 text-amber-100">{totals.high} hoog</span>
            </div>
          </div>
          <div className="rounded-2xl bg-white/10 p-5 ring-1 ring-white/10">
            <p className="text-xs font-bold uppercase tracking-wide text-blue-200">Financieel zichtbaar risico</p>
            <div className="mt-3 text-3xl font-bold">{euro(totals.orderValueAtRisk)}</div>
            <p className="mt-1 text-sm text-blue-100">orderwaarde gekoppeld aan open beslissingen</p>
            <div className="mt-4 border-t border-white/10 pt-4 text-sm"><b>{euro(totals.netProfitAtRisk)}</b> nettowinst zichtbaar in deze dossiers</div>
          </div>
        </div>
      </section>

      <section className="card mt-6 p-4 no-print">
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-[1fr_1fr_1fr_auto]">
          <select aria-label="Filter op prioriteit" value={severity} onChange={(event) => setSeverity(event.target.value as DecisionSeverity | '')} className="min-h-11 rounded-xl border bg-white px-3 py-2.5 text-sm"><option value="">Alle prioriteiten</option><option>Kritiek</option><option>Hoog</option><option>Normaal</option></select>
          <select aria-label="Filter op categorie" value={category} onChange={(event) => setCategory(event.target.value as DecisionCategory | '')} className="min-h-11 rounded-xl border bg-white px-3 py-2.5 text-sm"><option value="">Alle categorieën</option><option>Zending</option><option>Order</option><option>Actie</option></select>
          <select aria-label="Filter op eigenaar" value={owner} onChange={(event) => setOwner(event.target.value)} className="min-h-11 rounded-xl border bg-white px-3 py-2.5 text-sm"><option value="">Alle eigenaren</option>{owners.map((value) => <option key={value}>{value}</option>)}</select>
          <button type="button" onClick={() => window.print()} className="rounded-xl border px-4 py-2.5 text-sm font-bold text-navy">Print dagstart</button>
        </div>
      </section>

      <div className="mt-6 space-y-4">
        {filtered.length ? filtered.map((decision) => <DecisionCard key={decision.id} decision={decision} />) : <div className="card p-8 text-center"><h2 className="font-bold text-navy">Geen beslissingen binnen dit filter</h2><p className="mt-2 text-sm text-slate-500">De actuele uitzonderingen zijn afgehandeld of vallen buiten de gekozen selectie.</p></div>}
      </div>
    </div>
  );
}
