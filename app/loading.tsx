export default function Loading() {
  return <div className="container-page" aria-live="polite"><div className="card animate-pulse p-8"><div className="h-4 w-32 rounded bg-slate-200" /><div className="mt-4 h-9 w-2/3 rounded bg-slate-200" /><div className="mt-8 grid gap-4 sm:grid-cols-3">{[1, 2, 3].map((item) => <div key={item} className="h-28 rounded-xl bg-slate-100" />)}</div><span className="sr-only">Portal laden…</span></div></div>;
}
