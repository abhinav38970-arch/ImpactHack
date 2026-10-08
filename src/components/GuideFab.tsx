import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { GUIDE_LIMITS } from '../lib/guide/contract';
import type { GuideMode, GuideSource } from '../lib/guide/contract';
import { GuideRequestError, buildGuideRequest, postGuide } from '../lib/guide-client';
import { newId } from '../lib/dates';
import { useApp } from '../state/AppContext';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: GuideSource[];
  questions?: string[];
  demoUsed?: boolean;
}

const QUICK = [
  { label: 'Log a result?', message: 'How do I log a result?', mode: 'general' as GuideMode },
  { label: 'What is ALT?', message: 'What does ALT measure?', mode: 'general' as GuideMode },
  { label: 'Prep for visit?', message: 'Help me phrase an appointment question about my recorded results.', mode: 'general' as GuideMode },
];

/**
 * Global floating Guide — always visible bottom-right on every route
 * (Opening + Shell). Same server endpoint + privacy as full Guide page:
 * sends only message/history/mode/demo-flag, never entries or localStorage.
 */
export default function GuideFab() {
  const { activeMode, addGuideDraft } = useApp();
  const [open, setOpen] = useState(false);
  const [consented, setConsented] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [saved, setSaved] = useState<Record<string, boolean>>({});
  const abortRef = useRef<AbortController | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const lastPayload = useRef<{ text: string; history: Array<{ role: 'user' | 'assistant'; content: string }> } | null>(null);

  const isDemo = activeMode === 'demo';

  useEffect(() => {
    abortRef.current?.abort();
    setMessages([]);
    setSending(false);
    setError(null);
    setErrorCode(null);
    setSaved({});
    lastPayload.current = null;
    // Keep consent + open state across profile switch? No — reset consent
    // so fictional context can never leak between demo/personal.
    setConsented(false);
  }, [activeMode]);

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [messages.length, sending, open]);

  async function execute(text: string, history: Array<{ role: 'user' | 'assistant'; content: string }>) {
    lastPayload.current = { text, history };
    setError(null);
    setErrorCode(null);
    setSending(true);
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const res = await postGuide(buildGuideRequest(text, history, 'general', false), controller.signal);
      setMessages((ms) => [
        ...ms,
        { id: newId(), role: 'assistant', content: res.answer, sources: res.sources, questions: res.suggestedQuestions, demoUsed: res.demoBaselineUsed },
      ]);
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return;
      if (e instanceof GuideRequestError) {
        setError(e.message);
        setErrorCode(e.code);
      } else {
        setError('The Guide is temporarily unavailable.');
        setErrorCode('provider_error');
      }
    } finally {
      setSending(false);
    }
  }

  async function send(raw: string) {
    const text = raw.trim();
    if (!text || sending) return;
    const userMsg: ChatMessage = { id: newId(), role: 'user', content: text };
    const history = [...messages, userMsg]
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .slice(-7, -1)
      .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }));
    setMessages((ms) => [...ms, userMsg]);
    setInput('');
    await execute(text, history);
  }

  function saveQuestion(q: string, mid: string) {
    const key = `${mid}:${q}`;
    if (saved[key]) return;
    addGuideDraft({ id: newId(), text: q, selected: true, createdAt: new Date().toISOString() });
    setSaved((s) => ({ ...s, [key]: true }));
  }

  return (
    <div className="no-print">
      {!open && (
        <button
          onClick={() => setOpen(true)}
          aria-label="Open LiverLoop Guide"
          className="fixed bottom-20 right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-loop-teal text-2xl text-white shadow-lg ring-1 ring-black/10 transition hover:bg-loop-tealDark md:bottom-6 md:right-6"
        >
          <span aria-hidden>💬</span>
          {messages.length > 0 && (
            <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[11px] font-bold text-white">
              {messages.length > 9 ? '9+' : messages.length}
            </span>
          )}
        </button>
      )}

      {open && (
        <section
          aria-label="LiverLoop Guide chat"
          className="fixed bottom-20 right-4 z-50 flex max-h-[70vh] w-[calc(100vw-2rem)] max-w-sm flex-col overflow-hidden rounded-2xl bg-white shadow-xl ring-1 ring-black/10 md:bottom-6 md:right-6"
        >
          <header className="flex items-center gap-2 bg-loop-teal px-4 py-3 text-white">
            <span aria-hidden className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/20 font-bold">L</span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold leading-tight">LiverLoop Guide</p>
              <p className="truncate text-xs text-white/80">Educational help only — not medical advice</p>
            </div>
            <button onClick={() => setOpen(false)} aria-label="Close Guide" className="rounded-lg px-2 py-1 text-lg leading-none hover:bg-white/20">×</button>
          </header>

          <div className="flex-1 space-y-2 overflow-y-auto px-3 py-3">
            {!consented ? (
              <div className="space-y-2">
                <p className="text-sm text-slate-600">
                  An educational assistant for app help and verified learning material. It does not diagnose or interpret your results.
                </p>
                <p className="rounded-xl bg-amber-50 p-2 text-xs text-amber-900 ring-1 ring-inset ring-amber-200">
                  Messages go to our AI provider. Don&apos;t enter personal health info.
                </p>
                <button className="btn-primary w-full" onClick={() => setConsented(true)}>I understand — start</button>
                <p className="text-center">
                  <Link to="/insights/guide" onClick={() => setOpen(false)} className="text-xs font-semibold text-loop-teal underline">Open full Guide page</Link>
                </p>
              </div>
            ) : (
              <>
                {messages.length === 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-loop-ink">Hi! What can I help with?</p>
                    <div className="flex flex-wrap gap-1.5">
                      {QUICK.map((q) => (
                        <button key={q.label} disabled={sending} onClick={() => send(q.message)} className="btn-secondary !px-2.5 !py-1.5 text-xs">
                          {q.label}
                        </button>
                      ))}
                    </div>
                    {!isDemo && <p className="text-xs text-slate-500">Tip: try Maya&apos;s demo for sample records.</p>}
                  </div>
                )}

                {messages.map((m) => (
                  <article key={m.id} className={`rounded-xl p-2.5 text-sm ${m.role === 'user' ? 'ml-6 bg-loop-mist text-loop-ink' : 'mr-2 bg-slate-50 text-loop-ink ring-1 ring-slate-100'}`}>
                    {m.demoUsed && <p className="mb-1 text-[11px] font-semibold text-loop-teal">Fictional demo baseline — not a real patient.</p>}
                    <p className="whitespace-pre-wrap">{m.content}</p>
                    {m.sources && m.sources.length > 0 && (
                      <div className="mt-1.5 border-t border-slate-200/70 pt-1.5">
                        <p className="text-[11px] font-semibold text-slate-500">Verified sources</p>
                        {m.sources.map((s) => (
                          <a key={s.id} href={s.url} target="_blank" rel="noreferrer" className="block truncate text-xs font-medium text-loop-teal underline">{s.title}</a>
                        ))}
                      </div>
                    )}
                    {m.questions && m.questions.length > 0 && (
                      <div className="mt-1.5 space-y-1 border-t border-slate-200/70 pt-1.5">
                        {m.questions.map((q) => {
                          const k = `${m.id}:${q}`;
                          return (
                            <div key={k} className="flex items-start gap-1.5">
                              <p className="flex-1 text-xs">“{q}”</p>
                              {saved[k] ? (
                                <span className="shrink-0 rounded-full bg-loop-mint px-2 py-0.5 text-[11px] font-semibold">Saved ✓</span>
                              ) : (
                                <button onClick={() => saveQuestion(q, m.id)} className="shrink-0 rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold text-loop-teal ring-1 ring-loop-teal/30">+ Visit</button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </article>
                ))}
                {sending && <p className="text-xs text-slate-500" role="status">Guide is responding…</p>}
                {error && (
                  <div role="alert" className="rounded-xl bg-red-50 p-2.5 text-xs text-red-900 ring-1 ring-red-200">
                    <p className="font-semibold">{errorCode === 'not_configured' ? 'Live Guide is not configured.' : 'Guide could not respond.'}</p>
                    <p className="mt-0.5">{error}</p>
                    {errorCode === 'not_configured' ? (
                      <p className="mt-1 text-slate-600">You can still use Log, Trends, Habits. On Vercel this works once <code>GROQ_API_KEY</code> is set.</p>
                    ) : (
                      <button
                        onClick={() => lastPayload.current && execute(lastPayload.current.text, lastPayload.current.history)}
                        disabled={sending}
                        className="mt-1.5 rounded-lg bg-white px-2.5 py-1 font-semibold text-loop-teal ring-1 ring-loop-teal/30"
                      >
                        Retry
                      </button>
                    )}
                  </div>
                )}
                <div ref={bottomRef} />
              </>
            )}
          </div>

          {consented && (
            <form
              className="flex gap-1.5 border-t border-slate-100 p-2.5"
              onSubmit={(e) => {
                e.preventDefault();
                send(input);
              }}
            >
              <label htmlFor="fab-guide-input" className="sr-only">Message the Guide</label>
              <input
                id="fab-guide-input"
                className="field !mt-0 flex-1"
                value={input}
                maxLength={GUIDE_LIMITS.maxMessageChars}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about LiverLoop…"
                autoComplete="off"
                disabled={sending}
              />
              <button type="submit" className="btn-primary shrink-0 !px-3" disabled={sending || input.trim().length === 0} aria-label="Send">↑</button>
            </form>
          )}
        </section>
      )}
    </div>
  );
}
