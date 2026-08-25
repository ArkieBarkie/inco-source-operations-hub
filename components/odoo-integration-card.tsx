'use client';

import {useEffect, useState} from 'react';
import {useOperations} from './operations-provider';

type Status = {configured: boolean; valid: boolean; mode: 'read-only'; message?: string; writeBackEnabled: boolean};

export function OdooIntegrationCard() {
  const {canAdmin} = useOperations();
  const [status, setStatus] = useState<Status | null>(null);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!canAdmin) return;
    void fetch('/api/integrations/odoo/status', {cache: 'no-store'})
      .then(async (response) => response.ok ? response.json() as Promise<Status> : Promise.reject())
      .then(setStatus)
      .catch(() => setMessage('De Odoo-configuratiestatus kon niet worden geladen.'));
  }, [canAdmin]);

  const action = async (kind: 'test' | 'articles' | 'shipments') => {
    if (busy) return;
    setBusy(true);
    setMessage('Controle uitvoeren…');
    try {
      const response = await fetch(kind === 'test' ? '/api/integrations/odoo/status' : '/api/integrations/odoo/preview', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: kind === 'test' ? undefined : JSON.stringify({entity: kind}),
      });
      const result = await response.json() as {ok?: boolean; message?: string; records?: unknown[]; warnings?: string[]; error?: string};
      if (!response.ok) throw new Error(result.error || result.message || 'Controle mislukt.');
      setMessage(kind === 'test' ? result.message || 'Verbinding is bereikbaar.' : `${result.records?.length ?? 0} ${kind === 'articles' ? 'artikelen' : 'zendingen'} veilig als preview gelezen. ${result.warnings?.join(' ') ?? ''}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Controle mislukt.');
    } finally {
      setBusy(false);
    }
  };

  return <section className="card p-6">
    <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
      <div><h2 className="text-lg font-bold text-navy">Odoo-integratie</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Voorbereid voor de Odoo 19 JSON-2 API met een aparte API-sleutel, company scope en uitsluitend read-only previews. Import en terugschrijven zijn bewust geblokkeerd totdat de sandboxmapping en bronhouderschap zijn goedgekeurd.</p></div>
      <span className={`rounded-full px-3 py-1 text-xs font-bold ${status?.configured && status.valid ? 'bg-emerald-50 text-emerald-800' : 'bg-slate-100 text-slate-700'}`}>{status?.configured && status.valid ? 'Read-only geconfigureerd' : 'Niet geconfigureerd'}</span>
    </div>
    {!canAdmin && <p className="mt-4 rounded-xl bg-slate-50 p-3 text-sm text-slate-600">Alleen een beheerder kan integratieconfiguratie testen of een preview opvragen.</p>}
    {canAdmin && <div className="mt-5 flex flex-wrap gap-2">
      <button disabled={busy || !status?.configured || !status.valid} onClick={() => void action('test')} className="min-h-11 rounded-xl border px-4 py-2 text-sm font-bold disabled:opacity-40">Test read-only verbinding</button>
      <button disabled={busy || !status?.configured || !status.valid} onClick={() => void action('articles')} className="min-h-11 rounded-xl border px-4 py-2 text-sm font-bold disabled:opacity-40">Preview artikelen</button>
      <button disabled={busy || !status?.configured || !status.valid} onClick={() => void action('shipments')} className="min-h-11 rounded-xl border px-4 py-2 text-sm font-bold disabled:opacity-40">Preview zendingen</button>
    </div>}
    {message && <p aria-live="polite" className="mt-4 rounded-xl bg-blue-50 p-3 text-sm leading-6 text-blue-900">{message}</p>}
    <p className="mt-4 text-xs leading-5 text-slate-500">Nog vereist vóór synchronisatie: Odoo-versie/abonnement, bedrijven, dedicated bot-user, record rules, product.template versus product.product, UoM, barcode, HS-code, oorsprong, gewicht, fabrikantreferentie, prijzen, verpakking, lots/serials, magazijnlocaties en een reconciliatierapport.</p>
  </section>;
}
