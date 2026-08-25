import type {KpiStatus} from '@/lib/kpis';

const styles: Record<KpiStatus | 'neutral', string> = {
  good: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  watch: 'border-amber-200 bg-amber-50 text-amber-900',
  risk: 'border-red-200 bg-red-50 text-red-800',
  neutral: 'border-slate-200 bg-white text-navy',
};

export function KpiCard({label, value, note, status = 'neutral', target}: {label: string; value: string | number; note?: string; status?: KpiStatus | 'neutral'; target?: string}) {
  return <article className={`rounded-2xl border p-4 ${styles[status]}`}><div className="flex items-start justify-between gap-3"><p className="text-xs font-bold uppercase tracking-wide opacity-70">{label}</p>{target && <span className="rounded-full bg-white/60 px-2 py-1 text-[10px] font-bold">Doel {target}</span>}</div><div className="mt-2 text-2xl font-bold">{value}</div>{note && <p className="mt-1 text-xs leading-5 opacity-75">{note}</p>}</article>;
}
