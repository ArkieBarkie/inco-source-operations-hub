'use client';

import Link from 'next/link';
import {useEffect, useRef, useState} from 'react';
import {useOperations} from './operations-provider';
import {formatDateTime} from '@/lib/shipments';
import {MarkdownContent} from './markdown-content';
import type {ActionItem, OperationsData, Partner, Shipment} from '@/types/operations';

type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: AnswerSource[];
  mode?: 'ai' | 'preview';
  model?: string | null;
  usage?: TokenUsage | null;
  proposals?: WriteProposal[];
};

type PartnerWriteProposal = {
  id: string;
  kind: 'create_partner';
  title: string;
  partner: Partner;
};
type ShipmentWriteProposal = {
  id: string;
  kind: 'create_shipment' | 'update_shipment';
  title: string;
  shipment: Shipment;
  changes?: string[];
};
type ActionWriteProposal = {
  id: string;
  kind: 'create_action';
  title: string;
  action: ActionItem;
};
type WriteProposal = PartnerWriteProposal | ShipmentWriteProposal | ActionWriteProposal;

type TokenUsage = {
  inputTokens: number;
  cachedInputTokens: number;
  outputTokens: number;
  totalTokens: number;
};

type ApiStatus = {
  configured: boolean;
  model: string;
  connection: 'unchecked' | 'missing_key' | 'ok' | 'error';
  message?: string;
  checkedAt?: string;
  limits?: {
    perTenMinutes: number;
    per24Hours: number;
    maxRequestCharacters: number;
  };
};

type AnswerSource = {
  kind: 'shipment' | 'sop' | 'action' | 'article' | 'planning' | 'partner' | 'movement' | 'ordercheck' | 'warehouse';
  label: string;
  reference: string;
  updatedAt?: string;
};

const initialMessage: Message = {
  id: 'welcome',
  role: 'assistant',
  content: 'Ik ben Inco Assist. Vraag naar een zending, relatie, voorraad, ordervrijgave, planning, SOP of de keuze intern versus 3PL. Je kunt me ook een klant, zending, opvolgactie of afwijking laten voorbereiden. Iedere wijziging wacht op jouw bevestiging.',
};

function accountInitials(displayName: string) {
  const nameParts = displayName.trim().split(/\s+/).filter(Boolean);
  if (!nameParts.length) return '?';
  if (nameParts.length === 1) return Array.from(nameParts[0])[0]?.toLocaleUpperCase('nl-NL') ?? '?';
  const first = Array.from(nameParts[0])[0] ?? '';
  const last = Array.from(nameParts.at(-1) ?? '')[0] ?? '';
  return `${first}${last}`.toLocaleUpperCase('nl-NL');
}

function privacySafeSnapshot(data: OperationsData) {
  return {
    shipments: data.shipments.slice(0, 200).map((shipment) => ({...shipment, notes: '', events: shipment.events.slice(-10).map((event) => ({...event, detail: undefined}))})),
    activities: data.activities.slice(0, 200).map((activity) => ({...activity, notes: '', appointmentContact: undefined})),
    actions: data.actions.slice(0, 200).map((action) => ({...action, notes: '', description: action.description.slice(0, 500)})),
    articles: data.articles.slice(0, 200).map((article) => ({...article, notes: ''})),
    partners: data.partners.slice(0, 200).map((partner) => ({...partner, contactPerson: '', email: '', phone: '', notes: ''})),
    movements: data.movements.slice(0, 200).map((movement) => ({...movement, notes: ''})),
    orderChecks: data.orderChecks.slice(0, 200).map((record) => ({...record, notes: ''})),
  };
}

export function CopilotChat() {
  const {data, loadDemoData, savePartner, saveShipment, saveAction, canEdit, session} = useOperations();
  const accountName = session?.displayName ?? 'Gebruiker';
  const initials = accountInitials(accountName);
  const suggestions = [
    `Hoe zit het met zending ${data.shipments[0]?.reference ?? 'INCO-…'}?`,
    'Welke zendingen vragen nu aandacht?',
    'Geef mij een korte operationele dagstart.',
    `Maak een opvolgactie voor ${data.shipments.find((item) => ['Vertraagd', 'Geblokkeerd'].includes(item.status))?.reference ?? 'de belangrijkste vertraagde zending'}.`,
    'Ik wil een nieuwe klant aanmaken.',
    'Ik wil een nieuwe zending aanmaken.',
    `Is ${data.shipments.find((item) => item.direction === 'Inbound')?.reference ?? 'de eerstvolgende inbound'} beter intern of via de 3PL?`,
  ];
  const [messages, setMessages] = useState<Message[]>([initialMessage]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [apiStatus, setApiStatus] = useState<ApiStatus | null>(null);
  const [appliedProposals, setAppliedProposals] = useState<string[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const question = new URLSearchParams(window.location.search).get('question');
    if (question) setInput(question.slice(0, 2_000));
  }, []);

  useEffect(() => {
    let active = true;
    void fetch('/api/copilot/status', {cache: 'no-store'})
      .then(async (response) => {
        const result = await response.json() as ApiStatus;
        if (active) setApiStatus(result);
      })
      .catch(() => {
        if (active) setApiStatus({configured: false, model: 'gpt-5.6-luna', connection: 'error', message: 'API-status kon niet worden opgehaald.'});
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({top: scrollRef.current.scrollHeight, behavior: 'smooth'});
  }, [loading, messages]);

  const ask = async (question: string) => {
    const cleanQuestion = question.trim();
    if (!cleanQuestion || loading) return;
    const userMessage: Message = {id: crypto.randomUUID(), role: 'user', content: cleanQuestion};
    const nextMessages = [...messages.filter((message) => message.id !== 'welcome'), userMessage];
    setMessages((current) => [...current, userMessage]);
    setInput('');
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/copilot', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          messages: nextMessages.map(({role, content}) => ({role, content})),
          snapshot: privacySafeSnapshot(data),
        }),
      });
      const result = await response.json() as {answer?: string; sources?: AnswerSource[]; proposals?: WriteProposal[]; mode?: 'ai' | 'preview'; model?: string | null; usage?: TokenUsage | null; error?: string};
      if (!response.ok || !result.answer) throw new Error(result.error || 'Geen antwoord ontvangen.');
      setMessages((current) => [...current, {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: result.answer as string,
        sources: result.sources ?? [],
        mode: result.mode,
        model: result.model,
        usage: result.usage,
        proposals: result.proposals ?? [],
      }]);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Inco Assist is tijdelijk niet beschikbaar.');
    } finally {
      setLoading(false);
    }
  };

  const applyProposal = (proposal: WriteProposal) => {
    if (!canEdit) return;
    if (proposal.kind === 'create_partner') {
      if (!proposal.partner.name.trim()) return;
      const duplicate = data.partners.some((partner) => partner.name.trim().toLocaleLowerCase('nl-NL') === proposal.partner.name.trim().toLocaleLowerCase('nl-NL'));
      if (duplicate) return;
      savePartner(proposal.partner);
    } else if (proposal.kind === 'create_action') {
      if (!proposal.action.title.trim()) return;
      const duplicate = data.actions.some((action) => !['Opgelost', 'Gesloten'].includes(action.status) && action.title.trim().toLocaleLowerCase('nl-NL') === proposal.action.title.trim().toLocaleLowerCase('nl-NL'));
      if (duplicate) return;
      saveAction(proposal.action);
    } else {
      if (!proposal.shipment.reference.trim()) return;
      const duplicate = data.shipments.some((shipment) => shipment.id !== proposal.shipment.id && shipment.reference.trim().toLocaleLowerCase('nl-NL') === proposal.shipment.reference.trim().toLocaleLowerCase('nl-NL'));
      if (duplicate) return;
      saveShipment(proposal.shipment);
    }
    setAppliedProposals((current) => current.includes(proposal.id) ? current : [...current, proposal.id]);
  };

  return (
    <div className="grid min-h-[680px] overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-soft xl:grid-cols-[310px_1fr]">
      <aside className="border-b bg-navy p-6 text-white xl:border-b-0 xl:border-r xl:border-white/10">
        <div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-white/10 text-xs font-black tracking-wide">AI</span><div><p className="text-xs font-bold uppercase tracking-widest text-blue-200">AI testversie</p><h2 className="font-bold">Inco Assist</h2></div></div>
        <p className="mt-5 text-sm leading-6 text-blue-100">Assistent over zendingen, relaties, planning, acties, ordervrijgave, voorraad, SOP’s en intern versus 3PL. Kan opvolgacties en afwijkingen veilig voorbereiden.</p>

        <div className="mt-6 rounded-2xl bg-white/10 p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-blue-200">Huidige context</p>
          <div className="mt-3 grid grid-cols-2 gap-3 text-center"><MiniKpi value={data.shipments.length} label="Zendingen" /><MiniKpi value={data.actions.filter((item) => !['Opgelost', 'Gesloten'].includes(item.status)).length} label="Open acties" /><MiniKpi value={data.articles.length} label="Artikelen" /><MiniKpi value={data.orderChecks.length} label="Vrijgaven" /></div>
        </div>

        <ApiStatusCard status={apiStatus} />

        {canEdit && !data.shipments.length && <button onClick={loadDemoData} className="mt-4 w-full rounded-xl bg-white px-4 py-3 text-sm font-bold text-navy">Laad complete testomgeving</button>}

        <div className="mt-7 space-y-2">
          <p className="text-xs font-bold uppercase tracking-wide text-blue-200">Probeer bijvoorbeeld</p>
          {suggestions.map((suggestion) => <button key={suggestion} onClick={() => ask(suggestion)} className="w-full rounded-xl bg-white/5 px-3 py-2.5 text-left text-xs leading-5 text-blue-50 transition hover:bg-white/10">{suggestion}</button>)}
        </div>
      </aside>

      <section className="flex min-h-[680px] flex-col">
        <div className="flex items-center justify-between border-b px-5 py-4 sm:px-7"><div><h1 className="font-bold text-navy">Vraag het aan Inco Assist</h1><p className="text-xs text-slate-500">Antwoorden bevatten bron, actualiteit en rekenaannames</p></div><button onClick={() => {setMessages([initialMessage]); setError('');}} className="rounded-lg border px-3 py-2 text-xs font-bold text-slate-600">Nieuw gesprek</button></div>

        <div ref={scrollRef} className="flex-1 space-y-5 overflow-y-auto bg-slate-50/60 p-5 sm:p-7">
          {messages.map((message) => <MessageBubble key={message.id} message={message} appliedProposals={appliedProposals} onApplyProposal={applyProposal} accountName={accountName} initials={initials} />)}
          {loading && <div className="flex gap-3"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-navy text-[10px] font-black text-white">AI</span><div className="rounded-2xl rounded-tl-sm bg-white px-4 py-3 text-sm text-slate-500 shadow-sm"><span className="animate-pulse">Bronnen raadplegen en antwoord samenstellen…</span></div></div>}
          {error && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"><b>Inco Assist niet beschikbaar.</b><p className="mt-1">{error}</p></div>}
        </div>

        <form onSubmit={(event) => {event.preventDefault(); void ask(input);}} className="border-t bg-white p-4 sm:p-6">
          <div className="flex items-end gap-3 rounded-2xl border bg-slate-50 p-2 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100">
            <textarea aria-label="Vraag aan Inco Assist" value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => {if (event.key === 'Enter' && !event.shiftKey) {event.preventDefault(); void ask(input);}}} rows={2} placeholder="Vraag iets of laat een klant of zending voorbereiden…" className="max-h-36 flex-1 resize-none bg-transparent px-3 py-2 text-sm outline-none" />
            <button disabled={loading || !input.trim()} className="rounded-xl bg-navy px-5 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-40">Vraag</button>
          </div>
          <p className="mt-2 text-center text-[11px] text-slate-400">Vrije notities en persoonlijke contactvelden worden niet naar het model gestuurd. Voorstellen worden pas na jouw bevestiging opgeslagen.</p>
        </form>
      </section>
    </div>
  );
}

function MessageBubble({message, appliedProposals, onApplyProposal, accountName, initials}: {message: Message; appliedProposals: string[]; onApplyProposal: (proposal: WriteProposal) => void; accountName: string; initials: string}) {
  const user = message.role === 'user';
  return <div className={`flex gap-3 ${user ? 'justify-end' : ''}`} aria-label={user ? `Bericht van ${accountName}` : 'Bericht van Inco Assist'}>{!user && <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-navy text-[10px] font-black text-white">AI</span>}<div className={`max-w-3xl rounded-2xl px-4 py-3 text-sm leading-6 shadow-sm ${user ? 'rounded-tr-sm bg-accent text-white' : 'rounded-tl-sm bg-white text-slate-700'}`}>{user ? <div className="whitespace-pre-line">{message.content}</div> : <MarkdownContent content={message.content} />}{message.proposals?.map((proposal) => <ProposalCard key={proposal.id} proposal={proposal} applied={appliedProposals.includes(proposal.id)} onApply={() => onApplyProposal(proposal)} />)}{!user && message.mode && <div className="mt-3 flex flex-wrap items-center gap-2 border-t pt-3 text-[10px] font-bold uppercase tracking-wide text-slate-400"><span className={`rounded-full px-2 py-1 ${message.mode === 'ai' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-800'}`}>{message.mode === 'ai' ? 'Brongebonden antwoord' : 'Veilige voorbeeldmodus'}</span><span>Wijzigingen met accountbevestiging</span></div>}{message.sources?.length ? <div className="mt-3 border-t pt-3"><p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Geraadpleegde bronnen</p><div className="mt-2 flex flex-wrap gap-2">{message.sources.map((source) => <SourceChip key={`${source.kind}-${source.reference}`} source={source} />)}</div></div> : null}</div>{user && <span title={accountName} aria-label={accountName} className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-blue-100 text-xs font-bold text-blue-800">{initials}</span>}</div>;
}

function ProposalCard({proposal, applied, onApply}: {proposal: WriteProposal; applied: boolean; onApply: () => void}) {
  let fields: Array<[string, string | undefined]> = [];
  let buttonLabel = 'Voorstel bevestigen';
  if (proposal.kind === 'create_partner') {
    fields = [
      ['Type', proposal.partner.kind],
      ['Naam', proposal.partner.name],
      ['Contact', proposal.partner.contactPerson],
      ['E-mail', proposal.partner.email],
      ['Telefoon', proposal.partner.phone],
      ['Locatie', proposal.partner.location],
    ];
    buttonLabel = `${proposal.partner.kind} aanmaken`;
  } else if (proposal.kind === 'create_action') {
    fields = [
      ['Type', proposal.action.type],
      ['Prioriteit', proposal.action.priority],
      ['Eigenaar', proposal.action.owner],
      ['Deadline', proposal.action.dueDate],
      ['Relatie', proposal.action.relatedParty],
      ['Status', proposal.action.status],
    ];
    buttonLabel = proposal.action.type === 'Afwijking' ? 'Afwijking aanmaken' : 'Actie aanmaken';
  } else {
    fields = [
      ['Referentie', proposal.shipment.reference],
      ['Richting', proposal.shipment.direction],
      ['Status', proposal.shipment.status],
      ['Route', `${proposal.shipment.origin} → ${proposal.shipment.destination}`],
      ['Klant', proposal.shipment.customer],
      ['Leverancier', proposal.shipment.supplier],
      ['Vervoerder', proposal.shipment.carrier],
      ['Geplande levering', proposal.shipment.plannedDeliveryAt ? formatDateTime(proposal.shipment.plannedDeliveryAt) : 'Nog niet gepland'],
    ];
    buttonLabel = proposal.kind === 'create_shipment' ? 'Zending aanmaken' : 'Wijziging doorvoeren';
  }
  fields = fields.filter(([, value]) => Boolean(value));
  return <div className={`mt-4 rounded-2xl border p-4 ${applied ? 'border-emerald-200 bg-emerald-50' : 'border-blue-200 bg-blue-50'}`}>
    <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start"><div><p className={`text-[10px] font-bold uppercase tracking-widest ${applied ? 'text-emerald-700' : 'text-blue-700'}`}>{applied ? 'Opgeslagen in de portal' : 'Wacht op jouw bevestiging'}</p><h3 className="mt-1 font-bold text-navy">{proposal.title}</h3>{proposal.kind === 'create_action' && <p className="mt-2 text-xs leading-5 text-slate-600">{proposal.action.description}</p>}</div><button type="button" onClick={onApply} disabled={applied} className="shrink-0 rounded-xl bg-navy px-4 py-2.5 text-xs font-bold text-white disabled:bg-emerald-600">{applied ? (proposal.kind === 'update_shipment' ? 'Bijgewerkt' : 'Aangemaakt') : buttonLabel}</button></div>
    {'changes' in proposal && proposal.changes?.length ? <div className="mt-3 rounded-xl bg-white/70 p-3"><p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Voorgestelde wijzigingen</p><ul className="mt-1 space-y-1 text-xs text-slate-700">{proposal.changes.map((change) => <li key={change}>• {change}</li>)}</ul></div> : null}
    <dl className="mt-3 grid gap-x-5 gap-y-2 text-xs sm:grid-cols-2">{fields.map(([label, value]) => <div key={label}><dt className="text-slate-500">{label}</dt><dd className="font-semibold text-slate-800">{value}</dd></div>)}</dl>
    {!applied && <p className="mt-3 text-[11px] text-slate-500">Er wordt nog niets gewijzigd totdat je op de knop drukt.</p>}
  </div>;
}

function SourceChip({source}: {source: AnswerSource}) {
  const href = source.kind === 'sop' ? `/sops/${source.reference}` : source.kind === 'shipment' ? '/zendingen' : source.kind === 'action' ? '/acties' : source.kind === 'article' ? '/voorraad' : source.kind === 'partner' ? '/leveranciers' : source.kind === 'movement' ? '/voorraadbewegingen' : source.kind === 'ordercheck' ? '/ordercheck' : source.kind === 'warehouse' ? '/magazijnbeslissing' : '/planning';
  return <Link href={href} className="rounded-lg border bg-slate-50 px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 hover:border-blue-300"><span>{source.label}</span>{source.updatedAt && <span className="ml-1 text-slate-400">· {formatDateTime(source.updatedAt)}</span>}</Link>;
}

function MiniKpi({value, label}: {value: number; label: string}) {return <div><div className="text-lg font-bold">{value}</div><div className="text-[10px] text-blue-200">{label}</div></div>}

function ApiStatusCard({status}: {status: ApiStatus | null}) {
  if (!status) {
    return <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4 text-xs text-blue-100">API-configuratie controleren…</div>;
  }

  if (!status.configured || status.connection === 'missing_key') {
    return <div className="mt-4 rounded-2xl border border-amber-300/40 bg-amber-300/10 p-4">
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-amber-200"><span className="h-2 w-2 rounded-full bg-amber-300" /> Voorbeeldmodus</div>
      <p className="mt-2 text-xs leading-5 text-blue-50">Antwoorden blijven lokaal voorbereid. Een beheerder kan de beveiligde AI-verbinding via Instellingen activeren.</p>
    </div>;
  }

  const ok = status.connection === 'ok';
  return <div className={`mt-4 rounded-2xl border p-4 ${ok ? 'border-emerald-300/30 bg-emerald-300/10' : status.connection === 'error' ? 'border-red-300/30 bg-red-300/10' : 'border-white/10 bg-white/5'}`}>
    <div className={`flex items-center gap-2 text-xs font-bold uppercase tracking-wide ${ok ? 'text-emerald-200' : status.connection === 'error' ? 'text-red-200' : 'text-blue-100'}`}><span className={`h-2 w-2 rounded-full ${ok ? 'bg-emerald-300' : status.connection === 'error' ? 'bg-red-300' : 'bg-blue-300'}`} />{ok ? 'Beveiligde assistent actief' : status.connection === 'error' ? 'Assistent tijdelijk beperkt' : 'Assistent wordt gecontroleerd'}</div>
    <p className="mt-2 text-xs leading-5 text-blue-100">Antwoorden tonen hun bronnen; opslaan vereist altijd bevestiging vanuit je eigen account.</p>
    {status.message && <p className="mt-2 text-xs leading-5 text-red-100">{status.message}</p>}
  </div>;
}
