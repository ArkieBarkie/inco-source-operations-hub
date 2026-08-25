'use client';

import {useEffect, useState} from 'react';
import {useOperations} from '@/components/operations-provider';
import type {PortalRole} from '@/lib/auth-token';

type Account = {
  id: string;
  login: string;
  displayName: string;
  tenantId: string;
  role: PortalRole;
  sessionVersion: number;
  active: boolean;
};

export function AccountManagementCard() {
  const {canAdmin} = useOperations();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!canAdmin) return;
    void fetch('/api/admin/users', {cache: 'no-store'})
      .then(async (response) => {
        const result = await response.json() as {users?: Account[]; error?: string};
        if (!response.ok || !result.users) throw new Error(result.error || 'Accounts konden niet worden geladen.');
        setAccounts(result.users);
      })
      .catch((caught) => setError(caught instanceof Error ? caught.message : 'Accounts konden niet worden geladen.'));
  }, [canAdmin]);

  if (!canAdmin) return null;
  return <section className="card p-6">
    <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start"><div><h2 className="text-lg font-bold text-navy">Accounts en rollen</h2><p className="mt-2 text-sm leading-6 text-slate-600">Persoonlijke accounts binnen deze tenant. Wachtwoordhashes en sessietokens worden nooit in dit overzicht of in de browser geleverd.</p></div><span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-800">{accounts.length} account{accounts.length === 1 ? '' : 's'}</span></div>
    {error && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    {accounts.length > 0 && <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[620px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-3 py-2">Naam</th><th className="px-3 py-2">Accountnaam</th><th className="px-3 py-2">Rol</th><th className="px-3 py-2">Status</th><th className="px-3 py-2">Sessieversie</th></tr></thead><tbody>{accounts.map((account) => <tr className="border-t" key={account.id}><td className="px-3 py-3 font-semibold text-navy">{account.displayName}</td><td className="px-3 py-3"><code>{account.login}</code></td><td className="px-3 py-3">{account.role}</td><td className="px-3 py-3"><span className={`rounded-full px-2 py-1 text-xs font-bold ${account.active ? 'bg-emerald-50 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>{account.active ? 'Actief' : 'Uitgeschakeld'}</span></td><td className="px-3 py-3">{account.sessionVersion}</td></tr>)}</tbody></table></div>}
    <p className="mt-4 rounded-xl bg-amber-50 p-3 text-xs leading-5 text-amber-900">Nieuwe accounts of rolwijzigingen worden bewust via de beveiligde hostingvariabele <code>PORTAL_USERS_JSON</code> beheerd. Verhoog <code>sessionVersion</code> om bestaande sessies van één account direct ongeldig te maken.</p>
  </section>;
}
