'use client';

import {useEffect} from 'react';

export default function ErrorPage({error, reset}: {error: Error & {digest?: string}; reset: () => void}) {
  useEffect(() => { console.error('Portal page error', error.digest || error.name); }, [error]);
  return <div className="container-page"><section className="card mx-auto max-w-2xl p-8 text-center"><p className="label">Veilige foutafhandeling</p><h1 className="mt-2 text-2xl font-bold text-navy">Dit onderdeel kon niet worden geladen</h1><p className="mt-3 text-sm leading-6 text-slate-600">Er zijn geen gegevens gewijzigd. Probeer opnieuw; blijft het probleem bestaan, geef dan de foutcode door aan de beheerder.</p>{error.digest && <p className="mt-3 font-mono text-xs text-slate-500">Foutcode: {error.digest}</p>}<button onClick={reset} className="mt-6 min-h-11 rounded-xl bg-navy px-5 py-3 font-bold text-white">Opnieuw proberen</button></section></div>;
}
