"use client";
import { useState } from "react";
import Link from "next/link";
import { useOperations } from "@/components/operations-provider";
import { ActivityList } from "@/components/activity-list";
import { ActionForm } from "@/components/action-form";
import { ActivityForm } from "@/components/activity-form";
import { StatusBadge } from "@/components/ui";
import { openAction, today, formatDate } from "@/lib/operations";
import { shipmentNeedsAttention } from "@/lib/shipments";
import { buildDecisionItems, decisionTotals } from "@/lib/decision-center";
import { DecisionCard } from "@/components/decision-card";
export default function Dashboard() {
  const { data, canEdit } = useOperations();
  const [activity, setActivity] = useState(false),
    [action, setAction] = useState(false);
  const date = today(),
    todayItems = data.activities.filter((x) => x.date === date),
    open = data.actions.filter(openAction),
    late = open.filter((x) => x.dueDate < date),
    atRisk = todayItems.filter(
      (x) => x.status === "Vertraagd" || !x.slotConfirmed,
    ),
    activeShipments = data.shipments.filter((x) => !["Afgeleverd", "Geannuleerd"].includes(x.status)),
    shipmentAttention = data.shipments.filter(shipmentNeedsAttention),
    shipmentsDueToday = activeShipments.filter((x) => x.plannedDeliveryAt && new Date(x.plannedDeliveryAt).toLocaleDateString("sv-SE", { timeZone: "Europe/Amsterdam" }) === date);
  const decisions = buildDecisionItems(data),
    decisionSummary = decisionTotals(decisions);
  return (
    <div className="container-page">
      <section className="overflow-hidden rounded-3xl bg-navy text-white">
        <div className="grid gap-8 p-7 sm:p-10 xl:grid-cols-[1.4fr_.6fr]">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.2em] text-blue-300">
              Operations Hub
            </p>
            <h1 className="mt-3 text-3xl font-bold sm:text-4xl">
              Dit moet vandaag besloten worden.
            </h1>
            <p className="mt-3 max-w-2xl leading-7 text-blue-100">
              Van losse signalen naar gerangschikte beslissingen met impact,
              bron, eigenaar en een veilige eerstvolgende actie.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                href="/besliscentrum"
                className="rounded-xl bg-white px-5 py-3 font-bold text-navy"
              >
                Open Besliscentrum
              </Link>
              <Link
                href="/dagstart"
                className="rounded-xl bg-blue-500 px-5 py-3 font-bold text-white"
              >
                Start dagstart
              </Link>
            </div>
          </div>
          <div className="rounded-2xl bg-white/10 p-5 ring-1 ring-white/10">
            <p className="text-sm text-blue-200">Vandaag</p>
            <p className="mt-1 text-2xl font-bold capitalize">
              {formatDate(date)}
            </p>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <Mini value={shipmentsDueToday.length} label="Vandaag verwacht" />
              <Mini value={decisionSummary.critical} label="Kritieke besluiten" />
              <Mini value={open.length} label="Open acties" />
              <Mini value={decisionSummary.total} label="Te besluiten" />
            </div>
          </div>
        </div>
      </section>
      <section className="mt-7">
        <div className="mb-4 flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
          <div>
            <p className="label">Nu beslissen</p>
            <h2 className="mt-1 text-xl font-bold text-navy">Hoogste operationele impact</h2>
            <p className="mt-1 text-sm text-slate-500">Automatisch gerangschikt op blokkade, vertraging, ouderdom en commerciële impact.</p>
          </div>
          <Link href="/besliscentrum" className="text-sm font-bold text-accent">Alle {decisionSummary.total} beslissingen →</Link>
        </div>
        {decisions.length ? (
          <div className="grid gap-4 xl:grid-cols-2">
            {decisions.slice(0, 2).map((decision) => <DecisionCard key={decision.id} decision={decision} compact />)}
          </div>
        ) : (
          <div className="card p-6 text-sm text-emerald-800">Geen kritieke operationele beslissingen gevonden.</div>
        )}
      </section>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi
          value={activeShipments.length}
          label="Actieve zendingen"
          note={
            activeShipments.length
              ? "Open het centrale zendingendossier"
              : "Nog geen zendingen geregistreerd"
          }
        />
        <Kpi
          value={shipmentAttention.length}
          label="Zendingen met aandacht"
          tone={shipmentAttention.length ? "red" : "green"}
          note={
            shipmentAttention.length
              ? "Vertraagd, geblokkeerd of over tijd"
              : "Geen zichtbare uitzonderingen"
          }
        />
        <Kpi
          value={late.length}
          label="Achterstallige acties"
          tone={late.length ? "red" : "green"}
          note={
            late.length ? "Direct verdelen in dagstart" : "Alles binnen termijn"
          }
        />
        <Kpi value={todayItems.length} label="Afspraken vandaag" note={`${atRisk.length} zonder bevestigde bloktijd of vertraagd`} tone={atRisk.length ? "red" : "green"} />
      </div>
      <div className="mt-8 grid gap-6 xl:grid-cols-[1.5fr_.75fr]">
        <section>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold text-navy">Planning vandaag</h2>
              <p className="mt-1 text-sm text-slate-500">
                Leveringen en afhalingen op bevestigde bloktijd.
              </p>
            </div>
            <div className="flex items-center gap-3">{canEdit && <button onClick={() => setActivity(true)} className="text-sm font-bold text-accent">+ Afspraak</button>}<Link href="/planning" className="text-sm font-bold text-accent">Volledige planning →</Link></div>
          </div>
          {todayItems.length ? (
            <ActivityList items={todayItems} />
          ) : (
            <Empty action={canEdit ? () => setActivity(true) : undefined} />
          )}
        </section>
        <aside className="space-y-6">
          <section className="card p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-bold text-navy">Acties & afwijkingen</h2>
              <div className="flex items-center gap-3">{canEdit && <button onClick={() => setAction(true)} className="text-sm font-bold text-accent">+ Actie</button>}<Link href="/acties" className="text-sm font-bold text-accent">Alles</Link></div>
            </div>
            {open.length ? (
              <div className="mt-4 space-y-3">
                {open.slice(0, 5).map((x) => (
                  <div key={x.id} className="rounded-xl bg-slate-50 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <b className="text-sm text-navy">{x.title}</b>
                      <StatusBadge value={x.priority} />
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      {x.owner} · {x.dueDate}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-4 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800">
                Geen openstaande acties.
              </p>
            )}
          </section>
        </aside>
      </div>
      {canEdit && activity && <ActivityForm onClose={() => setActivity(false)} />}{" "}
      {canEdit && action && <ActionForm onClose={() => setAction(false)} />}
    </div>
  );
}
function Mini({ value, label }: { value: number; label: string }) {
  return (
    <div className="rounded-xl bg-white/10 p-3">
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs text-blue-100">{label}</div>
    </div>
  );
}
function Kpi({
  value,
  label,
  note,
  tone = "blue",
}: {
  value: number | string;
  label: string;
  note: string;
  tone?: string;
}) {
  return (
    <section className="card p-5">
      <div
        className={`text-3xl font-bold ${tone === "red" ? "text-red-700" : "text-navy"}`}
      >
        {value}
      </div>
      <div className="mt-1 font-bold text-slate-700">{label}</div>
      <p className="mt-2 text-xs text-slate-500">{note}</p>
    </section>
  );
}
function Empty({ action }: { action?: () => void }) {
  return (
    <div className="card border-dashed p-8 text-center">
      <h3 className="font-bold text-navy">Nog niets gepland</h3>
      <p className="mt-2 text-sm text-slate-500">
        Leg de eerste levering of afhaling vast met een concrete bloktijd.
      </p>
      {action && <button
        onClick={action}
        className="mt-4 rounded-xl bg-navy px-4 py-2 text-sm font-bold text-white"
      >
        Leverafspraak toevoegen
      </button>}
    </div>
  );
}
