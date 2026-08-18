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
import { isShipmentOverdue, shipmentNeedsAttention } from "@/lib/shipments";
export default function Dashboard() {
  const { data } = useOperations();
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
  const currentDate = new Date(`${date}T12:00:00`),
    dayOfWeek = currentDate.getDay(),
    weekStartDate = new Date(currentDate),
    weekEndDate = new Date(currentDate);
  weekStartDate.setDate(currentDate.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
  weekEndDate.setDate(weekStartDate.getDate() + 6);
  const weekStart = weekStartDate.toISOString().slice(0, 10),
    weekEnd = weekEndDate.toISOString().slice(0, 10),
    weekItems = data.activities.filter((x) => x.date >= weekStart && x.date <= weekEnd),
    incomingWeek = weekItems.filter((x) => x.activityType === "Leverancierslevering"),
    pickupsWeek = weekItems.filter((x) => x.activityType === "Ophaling" && !["Afgerond", "Geannuleerd"].includes(x.status)),
    inboundShipmentsWeek = data.shipments.filter((x) => x.direction === "Inbound" && x.plannedDeliveryAt && new Date(x.plannedDeliveryAt).toLocaleDateString("sv-SE", { timeZone: "Europe/Amsterdam" }) >= weekStart && new Date(x.plannedDeliveryAt).toLocaleDateString("sv-SE", { timeZone: "Europe/Amsterdam" }) <= weekEnd),
    pickupShipmentsWeek = data.shipments.filter((x) => x.plannedPickupAt && new Date(x.plannedPickupAt).toLocaleDateString("sv-SE", { timeZone: "Europe/Amsterdam" }) >= weekStart && new Date(x.plannedPickupAt).toLocaleDateString("sv-SE", { timeZone: "Europe/Amsterdam" }) <= weekEnd && !["Afgeleverd", "Geannuleerd"].includes(x.status)),
    completedWithTimes = data.shipments.filter((x) => x.actualPickupAt && x.actualDeliveryAt),
    averageTransitHours = completedWithTimes.length ? Math.round(completedWithTimes.reduce((sum, x) => sum + (new Date(x.actualDeliveryAt as string).getTime() - new Date(x.actualPickupAt as string).getTime()) / 3_600_000, 0) / completedWithTimes.length) : null,
    staleShipments = activeShipments.filter((x) => Date.now() - new Date(x.updatedAt).getTime() > 72 * 3_600_000),
    lateActivities = data.activities.filter((x) => x.date < date && !["Afgerond", "Geannuleerd"].includes(x.status)),
    totalLate = lateActivities.length + data.shipments.filter((shipment) => isShipmentOverdue(shipment)).length;
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
              Zendingen, acties, voorraad en officiële SOP’s — met een
              bronvaste Inco Assist die alleen de gegevens in deze app gebruikt.
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
                href="/copilot"
                className="rounded-xl bg-blue-500 px-5 py-3 font-bold text-white"
              >
                Vraag Inco Assist
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
              <Mini value={activeShipments.length} label="Actieve zendingen" />
              <Mini value={open.length} label="Open acties" />
              <Mini value={shipmentAttention.length + atRisk.length} label="Aandacht" />
            </div>
          </div>
        </div>
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
        <Kpi
          value={allSops.filter((x) => x.status === "Actief").length}
          label="Actieve SOP’s"
          note="Actuele SOP-bibliotheek"
        />
      </div>
      <section className="mt-8">
        <div className="mb-4 flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
          <div><h2 className="text-xl font-bold text-navy">Weeksturing</h2><p className="mt-1 text-sm text-slate-500">Gebaseerd op de zendingen, activiteiten en acties die in deze portal zijn vastgelegd.</p></div>
          <span className="text-xs font-bold text-slate-500">{weekStart} t/m {weekEnd}</span>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <Kpi value={averageTransitHours === null ? "—" : `${averageTransitHours}u`} label="Gem. transporttijd" note={averageTransitHours === null ? "Nog geen complete tijdlijn" : `${completedWithTimes.length} afgeronde zending(en)`} />
          <Kpi value={inboundShipmentsWeek.length || incomingWeek.length} label="Komt deze week binnen" note="Zendingen of geplande leveranciersleveringen" />
          <Kpi value={pickupShipmentsWeek.length || pickupsWeek.length} label="Nog af te halen" note="Open ophalingen deze week" />
          <Kpi value={staleShipments.length} label="Zonder update > 3 dagen" tone={staleShipments.length ? "red" : "green"} note="Actieve zendingendossiers" />
          <Kpi value={totalLate} label="Te laat" tone={totalLate ? "red" : "green"} note="Open zendingen en activiteiten over tijd" />
        </div>
      </section>
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
