import {allSops} from '@/lib/data';
import {SopExplorer} from '@/components/sop-explorer';

export default function Sops() {
  const active = allSops.filter((sop) => sop.status === 'Actief');
  const expired = allSops.filter((sop) => sop.status === 'Vervallen');
  const today = new Date().toISOString().slice(0, 10);
  const reviewDue = active.filter((sop) => sop.reviewDate && sop.reviewDate < today);

  return <div className="container-page">
    <p className="label">Kennisbank</p>
    <h1 className="mt-2 text-3xl font-bold text-navy">SOP-bibliotheek</h1>
    <p className="mt-3 max-w-3xl text-slate-600">De actuele werkwijze met zichtbaar versienummer, eigenaar, reviewdatum en bronbestand.</p>
    <section className="card mt-6 overflow-hidden border-blue-200">
      <div className="grid gap-4 bg-navy p-5 text-white sm:grid-cols-3">
        <GovernanceMetric label="Actief en bruikbaar" value={active.length} note="Alleen deze versies gelden" />
        <GovernanceMetric label="Review verstreken" value={reviewDue.length} note="Eigenaar moet herbevestigen" risk={reviewDue.length > 0} />
        <GovernanceMetric label="Vervallen" value={expired.length} note="Alleen voor historie" />
      </div>
      <div className="grid gap-3 p-5 text-sm text-slate-600 md:grid-cols-3">
        <p><b className="text-navy">Werken:</b> controleer status en versie vóór uitvoering.</p>
        <p><b className="text-navy">Wijzigen:</b> alleen de proceseigenaar publiceert een nieuwe versie.</p>
        <p><b className="text-navy">Bewijs:</b> het gekoppelde Word-bronbestand blijft leidend bij twijfel.</p>
      </div>
    </section>
    <div className="mt-7"><SopExplorer sops={allSops} /></div>
  </div>;
}

function GovernanceMetric({label, value, note, risk = false}: {label: string; value: number; note: string; risk?: boolean}) {
  return <div className={`rounded-2xl p-4 ${risk ? 'bg-amber-300/15 text-amber-100' : 'bg-white/10'}`}><div className="text-3xl font-bold">{value}</div><p className="mt-1 text-sm font-bold">{label}</p><p className="mt-1 text-xs text-blue-100">{note}</p></div>;
}
