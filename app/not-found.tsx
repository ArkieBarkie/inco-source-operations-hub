import Link from 'next/link';

export default function NotFound() {
  return <div className="container-page"><section className="card mx-auto max-w-xl p-8 text-center"><p className="label">404</p><h1 className="mt-2 text-2xl font-bold text-navy">Onderdeel niet gevonden</h1><p className="mt-3 text-sm text-slate-600">De link is ongeldig of het dossier bestaat niet binnen jouw organisatie.</p><Link href="/" className="mt-6 inline-flex min-h-11 items-center rounded-xl bg-navy px-5 py-3 font-bold text-white">Terug naar overzicht</Link></section></div>;
}
