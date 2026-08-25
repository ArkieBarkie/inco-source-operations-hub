'use client';

import {useState} from 'react';
import {useOperations} from './operations-provider';

type AuditEvent = {action: string; entity_type: string; entity_id?: string; actor_user_id: string; actor_role: string; correlation_id: string; created_at: string};

export function AuditLogView() {
  const {canAdmin, mode} = useOperations();
  const [events, setEvents] = useState<AuditEvent[] | null>(null);
  const [error, setError] = useState('');
  if (!canAdmin || mode !== 'database') return null;
  const load = async () => {
    setError('');
    try {
      const response = await fetch('/api/operations/audit', {cache: 'no-store'});
      const result = await response.json() as {events?: AuditEvent[]; error?: string};
      if (!response.ok) throw new Error(result.error || 'Auditlog kon niet worden geladen.');
      setEvents(result.events ?? []);
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Auditlog kon niet worden geladen.'); }
  };
  return <section className="card p-6"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-bold text-navy">Auditlog</h2><p className="mt-1 text-sm text-slate-600">Actor, rol, tijdstip, actie, entiteit en correlatie-ID; inhoudelijke vóór/na-data blijft alleen server-side beschikbaar.</p></div><button onClick={() => void load()} className="min-h-11 rounded-xl border px-4 py-2 text-sm font-bold">Laad laatste 100 gebeurtenissen</button></div>
    {error && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-800">{error}</p>}
    {events && <div className="mt-4 max-h-80 overflow-auto rounded-xl border"><table className="w-full min-w-[700px] text-left text-xs"><thead className="sticky top-0 bg-slate-50"><tr>{['Tijd', 'Actie', 'Entiteit', 'Gebruiker', 'Correlatie-ID'].map((label) => <th key={label} className="px-3 py-2">{label}</th>)}</tr></thead><tbody>{events.map((event) => <tr key={`${event.correlation_id}-${event.created_at}`} className="border-t"><td className="px-3 py-2">{new Date(event.created_at).toLocaleString('nl-NL')}</td><td className="px-3 py-2 font-semibold">{event.action}</td><td className="px-3 py-2">{event.entity_type}</td><td className="px-3 py-2">{event.actor_user_id} · {event.actor_role}</td><td className="px-3 py-2 font-mono">{event.correlation_id}</td></tr>)}</tbody></table></div>}
  </section>;
}
