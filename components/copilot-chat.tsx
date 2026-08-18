'use client';

import Link from 'next/link';
import {useEffect, useRef, useState} from 'react';
import {useOperations} from './operations-provider';
import {formatDateTime} from '@/lib/shipments';

type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: AnswerSource[];
  mode?: 'ai' | 'preview';
  model?: string | null;
  usage?: TokenUsage | null;
};

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
  content: 'Ik ben Inco Assist. Vraag naar een zending, relatie, voorraad, ordercheck, planning, SOP of de keuze intern versus 3PL. Ik gebruik alleen gegevens uit deze portal en laat mijn bronnen zien.',
};

export function CopilotChat() {
  const {data, loadDemoData} = useOperations();
  const suggestions = [
    `Hoe zit het met zending ${data.shipments[0]?.reference ?? 'IS-OUT-…'}?`,
    'Welke zendingen vragen nu aandacht?',
    'Geef mij een korte operationele dagstart.',
    'Welke orderchecks staan op hold?',
    `Is ${data.shipments.find((item) => item.direction === 'Inbound')?.reference ?? 'de eerstvolgende inbound'} beter intern of via de 3PL?`,
  ];
  const [messages, setMessages] = useState<Message[]>([initialMessage]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [apiStatus, setApiStatus] = useState<ApiStatus | null>(null);
  const [checkingApi, setCheckingApi] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

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

  const testApiConnection = async () => {
    if (checkingApi) return;
    setCheckingApi(true);
    try {
      const response = await fetch('/api/copilot/status', {method: 'POST'});
      const result = await response.json() as ApiStatus;
      setApiStatus(result);
    } catch {
      setApiStatus((current) => ({
        configured: current?.configured ?? false,
        model: current?.model ?? 'gpt-5.6-luna',
        connection: 'error',
        message: 'De verbindingscontrole kon niet worden uitgevoerd.',
      }));
    } finally {
      setCheckingApi(false);
    }
  };

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
          snapshot: {
            shipments: data.shipments,
            activities: data.activities,
            actions: data.actions,
            articles: data.articles,
            partners: data.partners,
            movements: data.movements,
            orderChecks: data.orderChecks,
          },
        }),
      });
      const result = await response.json() as {answer?: string; sources?: AnswerSource[]; mode?: 'ai' | 'preview'; model?: string | null; usage?: TokenUsage | null; error?: string};
      if (!response.ok || !result.answer) throw new Error(result.error || 'Geen antwoord ontvangen.');
      setMessages((current) => [...current, {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: result.answer as string,
        sources: result.sources ?? [],
        mode: result.mode,
        model: result.model,
        usage: result.usage,
      }]);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Inco Assist is tijdelijk niet beschikbaar.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid min-h-[680px] overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-soft xl:grid-cols-[310px_1fr]">
      <aside className="border-b bg-navy p-6 text-white xl:border-b-0 xl:border-r xl:border-white/10">
        <div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-white/10 text-xl">✦</span><div><p className="text-xs font-bold uppercase tracking-widest text-blue-200">AI testversie</p><h2 className="font-bold">Inco Assist</h2></div></div>
        <p className="mt-5 text-sm leading-6 text-blue-100">Read-only assistent over zendingen, relaties, planning, acties, orderchecks, voorraad, SOP’s en intern versus 3PL.</p>

        <div className="mt-6 rounded-2xl bg-white/10 p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-blue-200">Huidige context</p>
          <div className="mt-3 grid grid-cols-2 gap-3 text-center"><MiniKpi value={data.shipments.length} label="Zendingen" /><MiniKpi value={data.actions.filter((item) => !['Opgelost', 'Gesloten'].includes(item.status)).length} label="Open acties" /><MiniKpi value={data.articles.length} label="Artikelen" /><MiniKpi value={data.orderChecks.length} label="Orderchecks" /></div>
        </div>

        <ApiStatusCard status={apiStatus} checking={checkingApi} onTest={() => void testApiConnection()} />

        {!data.shipments.length && <button onClick={loadDemoData} className="mt-4 w-full rounded-xl bg-white px-4 py-3 text-sm font-bold text-navy">Laad complete testomgeving</button>}

        <div className="mt-7 space-y-2">
          <p className="text-xs font-bold uppercase tracking-wide text-blue-200">Probeer bijvoorbeeld</p>
          {suggestions.map((suggestion) => <button key={suggestion} onClick={() => ask(suggestion)} className="w-full rounded-xl bg-white/5 px-3 py-2.5 text-left text-xs leading-5 text-blue-50 transition hover:bg-white/10">{suggestion}</button>)}
        </div>
      </aside>

      <section className="flex min-h-[680px] flex-col">
        <div className="flex items-center justify-between border-b px-5 py-4 sm:px-7"><div><h1 className="font-bold text-navy">Vraag het aan Inco Assist</h1><p className="text-xs text-slate-500">Antwoorden bevatten bron, actualiteit en rekenaannames</p></div><button onClick={() => {setMessages([initialMessage]); setError('');}} className="rounded-lg border px-3 py-2 text-xs font-bold text-slate-600">Nieuw gesprek</button></div>

        <div ref={scrollRef} className="flex-1 space-y-5 overflow-y-auto bg-slate-50/60 p-5 sm:p-7">
          {messages.map((message) => <MessageBubble key={message.id} message={message} />)}
          {loading && <div className="flex gap-3"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-navy text-white">✦</span><div className="rounded-2xl rounded-tl-sm bg-white px-4 py-3 text-sm text-slate-500 shadow-sm"><span className="animate-pulse">Bronnen raadplegen en antwoord samenstellen…</span></div></div>}
          {error && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"><b>Inco Assist niet beschikbaar.</b><p className="mt-1">{error}</p></div>}
        </div>

        <form onSubmit={(event) => {event.preventDefault(); void ask(input);}} className="border-t bg-white p-4 sm:p-6">
          <div className="flex items-end gap-3 rounded-2xl border bg-slate-50 p-2 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100">
            <textarea value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => {if (event.key === 'Enter' && !event.shiftKey) {event.preventDefault(); void ask(input);}}} rows={2} placeholder="Bijvoorbeeld: welke zendingen zijn te laat en wat moet ik doen?" className="max-h-36 flex-1 resize-none bg-transparent px-3 py-2 text-sm outline-none" />
            <button disabled={loading || !input.trim()} className="rounded-xl bg-navy px-5 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-40">Vraag</button>
          </div>
          <p className="mt-2 text-center text-[11px] text-slate-400">Inco Assist mag in deze test niets wijzigen of versturen en vermeldt ontbrekende gegevens en aannames.</p>
        </form>
      </section>
    </div>
  );
}

function MessageBubble({message}: {message: Message}) {
  const user = message.role === 'user';
  return <div className={`flex gap-3 ${user ? 'justify-end' : ''}`}>{!user && <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-navy text-white">✦</span>}<div className={`max-w-3xl rounded-2xl px-4 py-3 text-sm leading-6 shadow-sm ${user ? 'rounded-tr-sm bg-accent text-white' : 'rounded-tl-sm bg-white text-slate-700'}`}><div className="whitespace-pre-line">{message.content}</div>{!user && message.mode && <div className="mt-3 flex flex-wrap items-center gap-2 border-t pt-3 text-[10px] font-bold uppercase tracking-wide text-slate-400"><span className={`rounded-full px-2 py-1 ${message.mode === 'ai' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-800'}`}>{message.mode === 'ai' ? `AI · ${message.model}` : 'Preview zonder API-sleutel'}</span><span>Read-only</span>{message.usage && <span>{message.usage.totalTokens.toLocaleString('nl-NL')} tokens</span>}</div>}{message.sources?.length ? <div className="mt-3 border-t pt-3"><p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Geraadpleegde bronnen</p><div className="mt-2 flex flex-wrap gap-2">{message.sources.map((source) => <SourceChip key={`${source.kind}-${source.reference}`} source={source} />)}</div></div> : null}</div>{user && <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-blue-100 text-xs font-bold text-blue-800">J/H</span>}</div>;
}

function SourceChip({source}: {source: AnswerSource}) {
  const href = source.kind === 'sop' ? `/sops/${source.reference}` : source.kind === 'shipment' ? '/zendingen' : source.kind === 'action' ? '/acties' : source.kind === 'article' ? '/voorraad' : source.kind === 'partner' ? '/leveranciers' : source.kind === 'movement' ? '/voorraadbewegingen' : source.kind === 'ordercheck' ? '/ordercheck' : source.kind === 'warehouse' ? '/magazijnbeslissing' : '/planning';
  return <Link href={href} className="rounded-lg border bg-slate-50 px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 hover:border-blue-300"><span>{source.label}</span>{source.updatedAt && <span className="ml-1 text-slate-400">· {formatDateTime(source.updatedAt)}</span>}</Link>;
}

function MiniKpi({value, label}: {value: number; label: string}) {return <div><div className="text-lg font-bold">{value}</div><div className="text-[10px] text-blue-200">{label}</div></div>}

function ApiStatusCard({status, checking, onTest}: {status: ApiStatus | null; checking: boolean; onTest: () => void}) {
  if (!status) {
    return <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4 text-xs text-blue-100">API-configuratie controleren…</div>;
  }

  if (!status.configured || status.connection === 'missing_key') {
    return <div className="mt-4 rounded-2xl border border-amber-300/40 bg-amber-300/10 p-4">
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-amber-200"><span className="h-2 w-2 rounded-full bg-amber-300" /> API-sleutel ontbreekt</div>
      <p className="mt-2 text-xs leading-5 text-blue-50">De volledige API-chat staat klaar. Voeg één server-side sleutel toe aan <code className="rounded bg-black/20 px-1 py-0.5">.env.local</code> en herstart de app.</p>
      {status.limits && <p className="mt-2 text-[11px] text-blue-100">Gebruiksrem: {status.limits.perTenMinutes} vragen / 10 min · {status.limits.per24Hours} / 24 uur</p>}
      <div className="mt-3 flex flex-wrap gap-2">
        <a href="https://platform.openai.com/api-keys" target="_blank" rel="noreferrer" className="rounded-lg bg-white px-3 py-2 text-xs font-bold text-navy">Maak API-sleutel</a>
        <button onClick={onTest} disabled={checking} className="rounded-lg border border-white/20 px-3 py-2 text-xs font-bold text-white disabled:opacity-50">{checking ? 'Controleren…' : 'Opnieuw controleren'}</button>
      </div>
    </div>;
  }

  const ok = status.connection === 'ok';
  return <div className={`mt-4 rounded-2xl border p-4 ${ok ? 'border-emerald-300/30 bg-emerald-300/10' : status.connection === 'error' ? 'border-red-300/30 bg-red-300/10' : 'border-white/10 bg-white/5'}`}>
    <div className={`flex items-center gap-2 text-xs font-bold uppercase tracking-wide ${ok ? 'text-emerald-200' : status.connection === 'error' ? 'text-red-200' : 'text-blue-100'}`}><span className={`h-2 w-2 rounded-full ${ok ? 'bg-emerald-300' : status.connection === 'error' ? 'bg-red-300' : 'bg-blue-300'}`} />{ok ? 'OpenAI API actief' : status.connection === 'error' ? 'API-configuratie fout' : 'API-sleutel ingesteld'}</div>
    <p className="mt-2 text-xs text-blue-100">Model: {status.model}</p>
    {status.limits && <p className="mt-1 text-[11px] text-blue-100">Limiet: {status.limits.perTenMinutes} vragen / 10 min · {status.limits.per24Hours} / 24 uur</p>}
    {status.message && <p className="mt-2 text-xs leading-5 text-red-100">{status.message}</p>}
    <button onClick={onTest} disabled={checking} className="mt-3 rounded-lg border border-white/20 px-3 py-2 text-xs font-bold text-white disabled:opacity-50">{checking ? 'Verbinding testen…' : ok ? 'Opnieuw testen' : 'Test verbinding'}</button>
  </div>;
}
