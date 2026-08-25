'use client';

import {useEffect, useState} from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {usePathname} from 'next/navigation';
import logo from '@/public/brand/inco-source-logo.png';
import {Icon} from './icons';
import {useOperations} from './operations-provider';

type NavItem = {href: string; label: string; mobileLabel: string; icon: Parameters<typeof Icon>[0]['name']};
type NavSection = {label: string; adminOnly?: boolean; items: readonly NavItem[]};

export const navSections: readonly NavSection[] = [
  {label: 'Start', items: [
    {href: '/', label: 'Overzicht', mobileLabel: 'Overzicht', icon: 'grid'},
    {href: '/dagstart', label: 'Dagstart', mobileLabel: 'Dagstart', icon: 'home'},
  ]},
  {label: 'Sturing', items: [
    {href: '/besliscentrum', label: 'Besliscentrum', mobileLabel: 'Besluiten', icon: 'alert'},
    {href: '/kpis', label: 'KPI Cockpit', mobileLabel: 'KPI’s', icon: 'flow'},
  ]},
  {label: 'Uitvoering', items: [
    {href: '/zendingen', label: 'Zendingen', mobileLabel: 'Zendingen', icon: 'truck'},
    {href: '/planning', label: 'Planning', mobileLabel: 'Planning', icon: 'calendar'},
    {href: '/acties', label: 'Acties', mobileLabel: 'Acties', icon: 'alert'},
    {href: '/ordercheck', label: 'Ordervrijgave', mobileLabel: 'Vrijgave', icon: 'check'},
  ]},
  {label: 'Data & kennis', items: [
    {href: '/voorraad', label: 'Voorraad', mobileLabel: 'Voorraad', icon: 'box'},
    {href: '/leveranciers', label: 'Relaties', mobileLabel: 'Relaties', icon: 'users'},
    {href: '/sops', label: 'SOP-bibliotheek', mobileLabel: 'SOP’s', icon: 'doc'},
  ]},
  {label: 'Beheer', adminOnly: true, items: [
    {href: '/instellingen', label: 'Instellingen', mobileLabel: 'Instellingen', icon: 'settings'},
  ]},
];

export const nav = navSections.flatMap((section) => section.items);

const activeFor = (pathname: string, href: string) => {
  if (href === '/') return pathname === '/';
  if (href === '/besliscentrum' && pathname.startsWith('/dossiers/')) return true;
  return pathname === href || pathname.startsWith(`${href}/`);
};

export function Brand({light = false}: {light?: boolean}) {
  return <Link href="/" className="flex items-center gap-2.5"><span className="rounded-xl bg-white p-1.5 shadow-sm"><Image src={logo} alt="Inco-Source" className="h-8 w-auto sm:h-9" priority /></span><span className={`hidden text-xs font-semibold leading-4 sm:block ${light ? 'text-blue-100' : 'text-slate-500'}`}>Operations<br />Hub</span></Link>;
}

export function Sidebar() {
  const pathname = usePathname();
  const {canAdmin} = useOperations();
  return <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 overflow-y-auto bg-navy text-white lg:block"><div className="border-b border-white/10 p-5"><Brand light /></div><nav className="space-y-4 p-3">{navSections.filter((section) => !section.adminOnly || canAdmin).map((section) => <div key={section.label}><p className="px-4 pb-1 text-[10px] font-bold uppercase tracking-[.18em] text-blue-300/70">{section.label}</p><div className="space-y-1">{section.items.map((item) => {
    const active = activeFor(pathname, item.href);
    return <Link key={item.href} href={item.href} aria-current={active ? 'page' : undefined} className={`flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${active ? 'bg-white text-navy shadow-sm' : 'text-slate-200 hover:bg-white/10 hover:text-white'}`}><Icon name={item.icon} />{item.label}{item.href === '/besliscentrum' && <span className={`ml-auto h-2 w-2 rounded-full ${active ? 'bg-red-500' : 'bg-red-300'}`} aria-label="Nieuwe beslissingen" />}</Link>;
  })}</div></div>)}</nav></aside>;
}

export function Header() {
  const pathname = usePathname();
  const {session, syncState, canAdmin} = useOperations();
  const [moreOpen, setMoreOpen] = useState(false);
  useEffect(() => setMoreOpen(false), [pathname]);
  useEffect(() => {
    if (!session) return;
    const expire = () => void fetch('/api/auth/logout', {method: 'POST'}).finally(() => window.location.replace('/login?reason=session_expired'));
    const remaining = session.expiresAt * 1_000 - Date.now();
    if (remaining <= 0) { expire(); return; }
    const timer = window.setTimeout(expire, remaining);
    return () => window.clearTimeout(timer);
  }, [session]);
  const primary = nav.filter((item) => ['/', '/besliscentrum', '/zendingen'].includes(item.href));
  const moreSections = navSections.map((section) => ({...section, items: section.items.filter((item) => !primary.includes(item))})).filter((section) => section.items.length && (!section.adminOnly || canAdmin));

  return <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
    <div className="container-page flex h-16 items-center justify-between gap-3">
      <div className="lg:hidden"><Brand /></div>
      <div className="hidden text-sm text-slate-500 lg:block">Inco-Source <span className="mx-2">/</span> Operations Hub</div>
      <div className="flex items-center gap-2">
        <Link href="/copilot" className="rounded-full bg-navy px-3 py-2 text-xs font-bold text-white sm:px-4 sm:text-sm"><span className="sm:hidden">Inco Assist</span><span className="hidden sm:inline">Vraag Inco Assist</span></Link>
        <Link href="/dagstart" className="hidden rounded-full bg-violet-50 px-4 py-2 text-sm font-bold text-violet-700 sm:block">Open dagstart</Link>
        {session && <div className="hidden text-right xl:block"><p className="text-xs font-bold text-navy">{session.displayName}</p><p className="text-[10px] uppercase tracking-wide text-slate-400">{session.role} · {syncState === 'saving' ? 'opslaan…' : syncState === 'conflict' ? 'conflict' : 'verbonden'}</p></div>}
        {session && <button type="button" onClick={() => void fetch('/api/auth/logout', {method: 'POST'}).finally(() => window.location.assign('/login'))} className="min-h-10 rounded-full border px-3 py-2 text-xs font-bold text-slate-600">Uitloggen</button>}
      </div>
    </div>
    <nav aria-label="Mobiele hoofdnavigatie" className="grid grid-cols-4 gap-1 border-t p-2 lg:hidden">
      {primary.map((item) => {
        const active = activeFor(pathname, item.href);
        return <Link key={item.href} href={item.href} aria-current={active ? 'page' : undefined} className={`flex min-w-0 flex-col items-center gap-1 rounded-lg px-1 py-2 text-[10px] font-bold ${active ? 'bg-navy text-white' : 'bg-slate-50 text-slate-700'}`}><Icon name={item.icon} className="h-4 w-4" /><span className="truncate">{item.mobileLabel}</span></Link>;
      })}
      <button type="button" onClick={() => setMoreOpen((value) => !value)} aria-expanded={moreOpen} className={`flex flex-col items-center gap-1 rounded-lg px-1 py-2 text-[10px] font-bold ${moreOpen ? 'bg-navy text-white' : 'bg-slate-50 text-slate-700'}`}><Icon name="grid" className="h-4 w-4" />Meer</button>
    </nav>
    {moreOpen && <nav aria-label="Alle onderdelen" className="max-h-[calc(100vh-8rem)] overflow-y-auto border-t bg-white p-3 shadow-lg lg:hidden">{moreSections.map((section) => <div className="mb-3 last:mb-0" key={section.label}><p className="mb-1 px-1 text-[9px] font-bold uppercase tracking-widest text-slate-400">{section.label}</p><div className="grid grid-cols-2 gap-2">{section.items.map((item) => {
      const active = activeFor(pathname, item.href);
      return <Link key={item.href} href={item.href} aria-current={active ? 'page' : undefined} className={`flex items-center gap-2 rounded-xl px-3 py-2.5 text-xs font-semibold ${active ? 'bg-navy text-white' : 'bg-slate-50 text-slate-700'}`}><Icon name={item.icon} className="h-4 w-4" />{item.mobileLabel}</Link>;
    })}</div></div>)}</nav>}
  </header>;
}

export function Shell({children}: {children: React.ReactNode}) {
  const pathname = usePathname();
  const {mode, error, clearError, canEdit, session, ready} = useOperations();
  if (pathname === '/login') return <>{children}</>;
  return <><Sidebar /><div className="lg:pl-72" data-role={session?.role ?? 'anonymous'}><Header />
    {ready && <div aria-live="polite" className="container-page pt-4">
      {mode === 'demo' && <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950"><b>Afgeschermde demo-stand.</b> Alleen testdata; gegevens blijven tenantgebonden in deze browser. Koppel hier geen Odoo-account of echte persoonsgegevens aan.</div>}
      {!canEdit && session && <div className="mt-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-950"><b>Alleen-lezen.</b> Je kunt gegevens bekijken, maar niet wijzigen.</div>}
      {error && <div role="alert" className="mt-2 flex items-start justify-between gap-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900"><span><b>Portalwaarschuwing.</b> {error}</span><button type="button" onClick={clearError} className="shrink-0 font-bold underline">Sluiten</button></div>}
    </div>}
    <main className="min-h-screen py-8 sm:py-10">{children}</main>
  </div></>;
}
