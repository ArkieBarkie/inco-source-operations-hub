'use client';

import {useEffect, useState} from 'react';
import Image from 'next/image';
import logo from '@/public/brand/inco-source-logo.png';

export default function LoginPage() {
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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

  return <main className="relative min-h-[100svh] overflow-hidden bg-[#07182a] text-navy">
    <div aria-hidden="true" className="absolute inset-0 opacity-70">
      <div className="absolute -left-24 top-1/3 h-80 w-80 rounded-full bg-blue-500/20 blur-3xl" />
      <div className="absolute -right-24 -top-24 h-96 w-96 rounded-full bg-violet-500/20 blur-3xl" />
      <div className="absolute bottom-0 right-1/4 h-64 w-64 rounded-full bg-cyan-400/10 blur-3xl" />
    </div>

    <div className="relative mx-auto grid min-h-[100svh] w-full max-w-[1500px] lg:grid-cols-[minmax(0,0.9fr)_minmax(480px,1.1fr)]">
      <section className="flex items-center justify-center bg-slate-50 px-5 py-10 sm:px-10 lg:rounded-r-[3rem] lg:px-16 xl:px-24">
        <div className="w-full max-w-md">
          <div className="flex items-center justify-between gap-4">
            <Image src={logo} alt="Inco-Source" className="h-auto w-40 sm:w-[180px]" priority />
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[11px] font-bold text-emerald-800">
              <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_0_4px_rgba(16,185,129,.12)]" /> Beveiligd
            </span>
          </div>

          <div className="mt-12 sm:mt-16">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-accent">Operations Hub</p>
            <h1 className="mt-3 text-4xl font-black tracking-[-0.035em] text-navy sm:text-5xl">Welkom terug</h1>
            <p className="mt-4 max-w-sm text-sm leading-6 text-slate-600 sm:text-base">Log in om verder te werken aan planning, zendingen, voorraad en kwaliteitsprocessen.</p>
          </div>

          {error && <div role="alert" className="mt-7 flex gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold leading-5 text-red-800"><span aria-hidden="true" className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-red-100">!</span><span>{error}</span></div>}

          <form onSubmit={submit} className="mt-8 space-y-5">
            <label htmlFor="login" className="block text-sm font-bold text-slate-700">Accountnaam</label>
            <div className="relative -mt-3">
              <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-0 grid w-12 place-items-center text-slate-400">
                <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="1.8"><path d="M20 21a8 8 0 0 0-16 0M12 13a5 5 0 1 0 0-10 5 5 0 0 0 0 10Z" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </span>
              <input id="login" type="text" autoComplete="username" autoCapitalize="none" spellCheck={false} required minLength={2} maxLength={64} value={login} onChange={(event) => setLogin(event.target.value)} placeholder="Bijvoorbeeld: jorn" className="min-h-14 w-full rounded-2xl border border-slate-200 bg-white py-3 pl-12 pr-4 text-base text-navy shadow-sm transition placeholder:text-slate-400 hover:border-slate-300 focus:border-accent focus:outline-none focus:ring-4 focus:ring-blue-100" />
            </div>

            <label htmlFor="password" className="block text-sm font-bold text-slate-700">Wachtwoord</label>
            <div className="relative -mt-3">
              <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-0 grid w-12 place-items-center text-slate-400">
                <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="1.8"><rect x="4" y="10" width="16" height="11" rx="3" /><path d="M8 10V7a4 4 0 0 1 8 0v3" strokeLinecap="round" /></svg>
              </span>
              <input id="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" required maxLength={500} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Vul je wachtwoord in" className="min-h-14 w-full rounded-2xl border border-slate-200 bg-white py-3 pl-12 pr-14 text-base text-navy shadow-sm transition placeholder:text-slate-400 hover:border-slate-300 focus:border-accent focus:outline-none focus:ring-4 focus:ring-blue-100" />
              <button type="button" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? 'Wachtwoord verbergen' : 'Wachtwoord tonen'} className="absolute inset-y-0 right-1 grid w-12 place-items-center rounded-xl text-slate-400 transition hover:text-navy focus:outline-none focus:ring-2 focus:ring-accent">
                {showPassword ? <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="1.8"><path d="m3 3 18 18M10.6 10.7a2 2 0 0 0 2.7 2.7M9.9 4.2A10.5 10.5 0 0 1 12 4c5.5 0 9 5.5 9 5.5a16 16 0 0 1-2.2 2.8M6.6 6.6A16 16 0 0 0 3 9.5S6.5 15 12 15c.8 0 1.5-.1 2.2-.3" strokeLinecap="round" strokeLinejoin="round" /></svg> : <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="1.8"><path d="M3 12s3.5-5.5 9-5.5 9 5.5 9 5.5-3.5 5.5-9 5.5S3 12 3 12Z" /><circle cx="12" cy="12" r="2.5" /></svg>}
              </button>
            </div>

            <button disabled={loading} className="group flex min-h-14 w-full items-center justify-center gap-3 rounded-2xl bg-navy px-5 py-3.5 font-bold text-white shadow-[0_14px_30px_rgba(16,42,67,.22)] transition hover:-translate-y-0.5 hover:bg-[#163a5d] hover:shadow-[0_18px_36px_rgba(16,42,67,.28)] focus:outline-none focus:ring-4 focus:ring-blue-200 disabled:translate-y-0 disabled:cursor-wait disabled:opacity-60">
              {loading && <span aria-hidden="true" className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />}
              {loading ? 'Account controleren…' : 'Inloggen'}
              {!loading && <span aria-hidden="true" className="transition group-hover:translate-x-1">→</span>}
            </button>
          </form>

          <p className="mt-8 border-t border-slate-200 pt-6 text-xs leading-5 text-slate-500">Gebruik uitsluitend je persoonlijke account. Problemen met toegang? Neem contact op met de portalbeheerder.</p>
        </div>
      </section>

      <section className="relative hidden items-center px-16 py-20 text-white lg:flex xl:px-24">
        <div className="max-w-xl">
          <span className="inline-flex rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-blue-100 backdrop-blur">Eén operationeel overzicht</span>
          <h2 className="mt-8 text-5xl font-black leading-[1.05] tracking-[-0.04em] xl:text-6xl">Grip op iedere zending.</h2>
          <p className="mt-6 max-w-lg text-lg leading-8 text-slate-300">Van ordercontrole tot aflevering: werk vanuit één helder overzicht met dezelfde actuele operationele feiten.</p>

          <div className="mt-12 grid gap-4 sm:grid-cols-3">
            {[['01', 'Plan vooruit'], ['02', 'Bewaak risico’s'], ['03', 'Werk samen']].map(([number, label]) => <div key={number} className="rounded-2xl border border-white/10 bg-white/[0.07] p-4 backdrop-blur-sm"><span className="text-xs font-black text-cyan-300">{number}</span><p className="mt-2 text-sm font-bold text-white">{label}</p></div>)}
          </div>

          <div className="mt-14 flex items-center gap-3 text-sm text-slate-400"><span className="h-px w-10 bg-cyan-400/70" /> Afgeschermde Inco-Source werkomgeving</div>
        </div>
      </section>
    </div>
  </main>;
}
