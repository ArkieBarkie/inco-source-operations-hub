'use client';

import {useEffect, useState} from 'react';
import Image from 'next/image';
import logo from '@/public/brand/inco-source-logo.png';

export default function LoginPage() {
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('reason') === 'session_expired') {
      setError('Je sessie is verlopen. Log opnieuw in om verder te gaan.');
    }
  }, []);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (loading) return;
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({login, password}),
      });
      const result = await response.json() as {error?: string};
      if (!response.ok) throw new Error(result.error || 'Inloggen is niet gelukt.');
      const next = new URLSearchParams(window.location.search).get('next');
      let destination = '/';
      if (next) {
        try {
          const candidate = new URL(next, window.location.origin);
          if (candidate.origin === window.location.origin) destination = `${candidate.pathname}${candidate.search}${candidate.hash}`;
        } catch { /* Ongeldige of externe redirect blijft op het dashboard. */ }
      }
      window.location.assign(destination);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Inloggen is niet gelukt.');
    } finally {
      setLoading(false);
    }
  };

  return <main className="grid min-h-screen place-items-center bg-slate-100 p-4">
    <section className="w-full max-w-md rounded-3xl border bg-white p-7 shadow-soft sm:p-9">
      <div className="flex items-center gap-3"><span className="rounded-xl border bg-white p-2"><Image src={logo} alt="Inco-Source" className="h-10 w-auto" priority /></span><div><p className="text-xs font-bold uppercase tracking-widest text-slate-500">Beveiligde werkomgeving</p><h1 className="text-xl font-bold text-navy">Operations Hub</h1></div></div>
      <p className="mt-6 text-sm leading-6 text-slate-600">Log in met het account dat door de portalbeheerder is uitgegeven. Gebruik geen gedeelde accounts.</p>
      {error && <div role="alert" className="mt-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-800">{error}</div>}
      <form onSubmit={submit} className="mt-6 space-y-4">
        <label className="block text-sm font-bold text-slate-700">Accountnaam<input type="text" autoComplete="username" autoCapitalize="none" spellCheck={false} required minLength={2} maxLength={64} value={login} onChange={(event) => setLogin(event.target.value)} className="mt-1.5 w-full rounded-xl border px-4 py-3 font-normal" /></label>
        <label className="block text-sm font-bold text-slate-700">Wachtwoord<input type="password" autoComplete="current-password" required maxLength={500} value={password} onChange={(event) => setPassword(event.target.value)} className="mt-1.5 w-full rounded-xl border px-4 py-3 font-normal" /></label>
        <button disabled={loading} className="min-h-12 w-full rounded-xl bg-navy px-5 py-3 font-bold text-white disabled:opacity-50">{loading ? 'Controleren…' : 'Veilig inloggen'}</button>
      </form>
      <p className="mt-5 text-xs leading-5 text-slate-500">Toegang en wijzigingen worden per gebruiker en organisatie afgeschermd. Meld verlies van toegang direct bij de beheerder.</p>
    </section>
  </main>;
}
