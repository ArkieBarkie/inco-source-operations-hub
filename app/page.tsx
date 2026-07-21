"use client";
import { useState } from "react";
import Link from "next/link";
import { allSops } from "@/lib/data";
import { useOperations } from "@/components/operations-provider";
import { ActivityList } from "@/components/activity-list";
import { ActionForm } from "@/components/action-form";
import { ActivityForm } from "@/components/activity-form";
import { StatusBadge } from "@/components/ui";
import { openAction, today, formatDate } from "@/lib/operations";
export default function Dashboard() {
  const { data } = useOperations();
  const [activity, setActivity] = useState(false),
    [action, setAction] = useState(false);
  const date = today(),
    todayItems = data.activities.filter((x) => x.date === date),
    open = data.actions.filter(openAction),
    late = open.filter((x) => x.dueDate < date),
    incoming = todayItems.filter(
      (x) => x.activityType === "Leverancierslevering",
    ),
    outgoing = todayItems.filter((x) =>
      ["Ophaling", "Klantbezorging"].includes(x.activityType),
    ),
    atRisk = todayItems.filter(
      (x) => x.status === "Vertraagd" || !x.slotConfirmed,
    );
  const quickSops = allSops.filter(
    (s) =>
      s.status === "Actief" &&
      ["SOP-004", "SOP-005", "SOP-007", "SOP-013"].includes(s.sopNumber),
  );
  return (
    <div className="container-page">
      <section className="overflow-hidden rounded-3xl bg-navy text-white">
        <div className="grid gap-8 p-7 sm:p-10 xl:grid-cols-[1.4fr_.6fr]">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.2em] text-blue-300">
              Operations Hub
            </p>
            <h1 className="mt-3 text-3xl font-bold sm:text-4xl">
              Dit vraagt vandaag aandacht.
            </h1>
            <p className="mt-3 max-w-2xl leading-7 text-blue-100">
              Planning, acties, voorraad, officiële SOP’s en de keuze tussen
              intern uitvoeren of het extern magazijn / 3PL.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <button
                onClick={() => setActivity(true)}
                className="rounded-xl bg-white px-5 py-3 font-bold text-navy"
              >
                + Leverafspraak
              </button>
              <button
                onClick={() => setAction(true)}
                className="rounded-xl bg-white/10 px-5 py-3 font-bold text-white ring-1 ring-white/20"
              >
                + Actie
              </button>
              <Link
                href="/magazijnbeslissing"
                className="rounded-xl bg-blue-500 px-5 py-3 font-bold text-white"
              >
                Start magazijnbeslissing
              </Link>
            </div>
          </div>
          <div className="rounded-2xl bg-white/10 p-5 ring-1 ring-white/10">
            <p className="text-sm text-blue-200">Vandaag</p>
            <p className="mt-1 text-2xl font-bold capitalize">
              {formatDate(date)}
            </p>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <Mini value={incoming.length} label="Leveringen" />
              <Mini value={outgoing.length} label="Uitgaand" />
              <Mini value={open.length} label="Open acties" />
              <Mini value={late.length + atRisk.length} label="Risico’s" />
            </div>
          </div>
        </div>
      </section>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi
          value={incoming.length}
          label="Binnenkomend vandaag"
          note={
            incoming.length
              ? "Controleer bloktijd en ETA"
              : "Geen levering gepland"
          }
        />
        <Kpi
          value={outgoing.length}
          label="Uitgaand vandaag"
          note={
            outgoing.length
              ? "Controleer cut-off en tracking"
              : "Geen verzending gepland"
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
        <Kpi
          value={allSops.filter((x) => x.status === "Actief").length}
          label="Actieve SOP’s"
          note="Actuele SOP-bibliotheek"
        />
      </div>
      <div className="mt-8 grid gap-6 xl:grid-cols-[1.5fr_.75fr]">
        <section>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-navy">Planning vandaag</h2>
              <p className="mt-1 text-sm text-slate-500">
                Leveringen en afhalingen op bevestigde bloktijd.
              </p>
            </div>
            <Link href="/planning" className="text-sm font-bold text-accent">
              Volledige planning →
            </Link>
          </div>
          {todayItems.length ? (
            <ActivityList items={todayItems} />
          ) : (
            <Empty action={() => setActivity(true)} />
          )}
        </section>
        <aside className="space-y-6">
          <section className="card p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-navy">Acties & afwijkingen</h2>
              <Link href="/acties" className="text-sm font-bold text-accent">
                Alles
              </Link>
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
          <section className="card p-5">
            <h2 className="font-bold text-navy">Snelle toegang</h2>
            <div className="mt-3 grid gap-2">
              {quickSops.map((s) => (
                <Link
                  key={s.id}
                  href={`/sops/${s.slug}`}
                  className="rounded-xl border bg-white p-3 text-sm font-semibold text-navy hover:border-blue-300 hover:bg-blue-50"
                >
                  <span className="mr-2 text-accent">{s.sopNumber}</span>
                  {s.title}
                </Link>
              ))}
            </div>
          </section>
        </aside>
      </div>
      {activity && <ActivityForm onClose={() => setActivity(false)} />}{" "}
      {action && <ActionForm onClose={() => setAction(false)} />}
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
  value: number;
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
function Empty({ action }: { action: () => void }) {
  return (
    <div className="card border-dashed p-8 text-center">
      <h3 className="font-bold text-navy">Nog niets gepland</h3>
      <p className="mt-2 text-sm text-slate-500">
        Leg de eerste levering of afhaling vast met een concrete bloktijd.
      </p>
      <button
        onClick={action}
        className="mt-4 rounded-xl bg-navy px-4 py-2 text-sm font-bold text-white"
      >
        Leverafspraak toevoegen
      </button>
    </div>
  );
}
