import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { DisclaimerStrip } from '../components/bits';
import { newId } from '../lib/dates';
import { GUIDE_LIMITS } from '../lib/guide/contract';
import type { GuideMode, GuideSource } from '../lib/guide/contract';
import { GuideRequestError, buildGuideRequest, postGuide } from '../lib/guide-client';
import { useApp } from '../state/AppContext';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: GuideSource[];
  questions?: string[];
  demoUsed?: boolean;
}

interface Starter {
  label: string;
  message: string;
  mode: GuideMode;
  demo: boolean;
}

const STARTERS: Starter[] = [
  { label: 'How do I log a result?', message: 'How do I log a result?', mode: 'general', demo: false },
  { label: 'What does ALT measure?', message: 'What does ALT measure?', mode: 'general', demo: false },
  {
    label: 'Help me phrase an appointment question.',
    message: 'Help me phrase an appointment question about my recorded results.',
    mode: 'general',
    demo: false,
  },
  {
    label: 'Summarize Maya’s fictional demo baseline.',
    message: 'Summarize Maya’s fictional demo baseline.',
    mode: 'fictional-demo',
    demo: true,
  },
];

interface SendError {
  code: string;
  message: string;
}

export default function Guide() {
  const { activeMode, addGuideDraft } = useApp();
  const [consented, setConsented] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<SendError | null>(null);
  const [useDemoBaseline, setUseDemoBaseline] = useState(false);
  const [savedQuestions, setSavedQuestions] = useState<Record<string, 'selected' | 'unselected'>>({});
  const [capacityNote, setCapacityNote] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const isDemo = activeMode === 'demo';

  // Session-only conversation. Cleared on profile switch — fictional
  // context must never leak into personal mode (or vice versa).
  useEffect(() => {
    abortRef.current?.abort();
    setConsented(false);
    setInput('');
    setMessages([]);
    setSending(false);
    setSendError(null);
    setUseDemoBaseline(false);
    setSavedQuestions({});
    setCapacityNote(false);
    lastPayload.current = null;
  }, [activeMode]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [messages.length, sending]);

  interface Payload {
    text: string;
    history: Array<{ role: 'user' | 'assistant'; content: string }>;
    mode: GuideMode;
    demo: boolean;
  }
  const lastPayload = useRef<Payload | null>(null);

  async function execute(payload: Payload) {
    lastPayload.current = payload;
    setSendError(null);
    setSending(true);
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      // Demo baseline only in demo mode on explicit request.
      const includeDemo = isDemo && payload.mode === 'fictional-demo' && payload.demo;
      const res = await postGuide(
        buildGuideRequest(
          payload.text,
          payload.history,
          includeDemo ? 'fictional-demo' : 'general',
          includeDemo,
        ),
        controller.signal,
      );
      setMessages((ms) => [
        ...ms,
        {
          id: newId(),
          role: 'assistant',
          content: res.answer,
          sources: res.sources,
          questions: res.suggestedQuestions,
          demoUsed: res.demoBaselineUsed,
        },
      ]);
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') {
        // Aborted (clear or profile switch): drop the unanswered question.
      } else if (e instanceof GuideRequestError) {
        setSendError({ code: e.code, message: e.message });
      } else {
        setSendError({ code: 'provider_error', message: 'The Guide is temporarily unavailable.' });
      }
    } finally {
      setSending(false);
    }
  }

  async function send(message: string, mode: GuideMode, demo: boolean) {
    const text = message.trim();
    if (text.length === 0 || sending) return;
    const userMsg: ChatMessage = { id: newId(), role: 'user', content: text };
    const history = [...messages, userMsg]
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .slice(-7, -1)
      .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }));
    setMessages((ms) => [...ms, userMsg]);
    setInput('');
    await execute({ text, history, mode, demo });
  }

  async function retry() {
    if (lastPayload.current && !sending) await execute(lastPayload.current);
  }

  function saveQuestion(question: string, messageId: string) {
    const key = `${messageId}:${question}`;
    if (savedQuestions[key]) return;
    const selected = addGuideDraft({
      id: newId(),
      text: question,
      selected: true,
      createdAt: new Date().toISOString(),
    });
    setSavedQuestions((s) => ({ ...s, [key]: selected ? 'selected' : 'unselected' }));
    if (!selected) setCapacityNote(true);
  }

  if (!consented) {
    return (
      <div className="mx-auto max-w-xl space-y-4 pt-4">
        <div className="card" aria-label="Before using LiverLoop Guide">
          <p className="text-xs font-semibold uppercase tracking-wide text-loop-teal">AI assistant</p>
          <h1 className="mt-1 text-xl font-bold text-loop-ink">LiverLoop Guide</h1>
          <p className="mt-2 text-sm text-slate-600">
            An educational assistant that explains LiverLoop features, answers
            from verified learning material, and helps phrase appointment
            questions. It does not diagnose, interpret personal results, or
            replace your care team.
          </p>
          <div className="mt-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-900 ring-1 ring-inset ring-amber-200" role="note">
            Your message will be sent to our AI provider. Do not enter personal
            or sensitive health information.
          </div>
          <button className="btn-primary mt-4" onClick={() => setConsented(true)}>
            I understand — start the Guide
          </button>
          <p className="mt-3">
            <Link to="/insights" className="text-xs font-semibold text-loop-teal underline">
              Back to Insights
            </Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl space-y-4 pt-2">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-loop-teal">AI assistant</p>
        <h1 className="text-xl font-bold text-loop-ink">LiverLoop Guide</h1>
        <p className="text-sm text-slate-500">
          Educational help only — not medical advice.{' '}
          <Link to="/insights" className="font-semibold text-loop-teal underline">
            Back to Insights
          </Link>
        </p>
      </div>

      {messages.length === 0 && (
        <div className="card" aria-label="Starter prompts">
          <h2 className="text-sm font-semibold text-loop-ink">Try one of these to start</h2>
          <div className="mt-2 flex flex-wrap gap-2">
            {STARTERS.map((s) => (
              <button
                key={s.label}
                className="btn-secondary !py-2 text-xs"
                disabled={sending}
                onClick={() => send(s.message, s.mode, s.demo)}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-3" aria-live="polite" aria-label="Conversation">
        {messages.map((m) => (
          <article
            key={m.id}
            className={`card !p-4 ${m.role === 'user' ? '!bg-loop-mist' : ''}`}
            aria-label={m.role === 'user' ? 'Your message' : 'Guide response'}
          >
            {m.demoUsed && (
              <p className="mb-1 text-xs font-semibold text-loop-teal">
                Based on the fictional demo baseline — not a real patient.
              </p>
            )}
            <p className="whitespace-pre-wrap text-sm text-loop-ink">{m.content}</p>
            {m.role === 'assistant' && m.sources && m.sources.length > 0 && (
              <div className="mt-2 border-t border-slate-100 pt-2">
                <p className="text-xs font-semibold text-slate-500">Verified sources</p>
                <ul className="mt-1 space-y-1">
                  {m.sources.map((s) => (
                    <li key={s.id}>
                      <a
                        href={s.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs font-medium text-loop-teal underline"
                      >
                        {s.title}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {m.role === 'assistant' && m.questions && m.questions.length > 0 && (
              <div className="mt-2 border-t border-slate-100 pt-2">
                <p className="text-xs font-semibold text-slate-500">Suggested appointment questions</p>
                <ul className="mt-1 space-y-2">
                  {m.questions.map((q) => {
                    const key = `${m.id}:${q}`;
                    const saved = savedQuestions[key];
                    return (
                      <li key={key} className="flex items-start gap-2">
                        <p className="flex-1 text-sm text-loop-ink">“{q}”</p>
                        {saved ? (
                          <span className="shrink-0 rounded-full bg-loop-mint px-2 py-1 text-[11px] font-semibold text-loop-ink">
                            {saved === 'selected' ? 'Saved ✓' : 'Saved'}
                          </span>
                        ) : (
                          <button
                            className="btn-secondary shrink-0 !px-2 !py-1 text-[11px]"
                            onClick={() => saveQuestion(q, m.id)}
                          >
                            Add to Visit Prep
                          </button>
                        )}
                      </li>
                    );
                  })}
                </ul>
                {capacityNote && (
                  <p className="hint-text mt-1">
                    Visit Prep holds up to 3 selected questions — extras are kept unselected.
                  </p>
                )}
              </div>
            )}
          </article>
        ))}
        {sending && (
          <div className="card !p-4" role="status" aria-label="Guide is responding">
            <p className="text-sm text-slate-500">Guide is responding…</p>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {sendError && (
        <div className="card !border-red-200" role="alert">
          <p className="text-sm font-semibold text-red-800">
            {sendError.code === 'not_configured'
              ? 'Live Guide is not configured.'
              : 'The Guide could not respond.'}
          </p>
          <p className="mt-1 text-sm text-slate-600">{sendError.message}</p>
          {sendError.code === 'not_configured' ? (
            <div className="mt-2 text-sm text-slate-600">
              <p>You can still:</p>
              <ul className="mt-1 list-disc pl-5">
                <li><Link to="/log" className="text-loop-teal underline">Record results in Log</Link></li>
                <li><Link to="/trends" className="text-loop-teal underline">Review Trends</Link></li>
                <li><Link to="/habits" className="text-loop-teal underline">Track Habits</Link></li>
              </ul>
            </div>
          ) : (
            <button className="btn-secondary mt-2" disabled={sending} onClick={retry}>
              Retry
            </button>
          )}
        </div>
      )}

      {isDemo && (
        <label className="flex cursor-pointer items-start gap-2 text-xs text-slate-600">
          <input
            type="checkbox"
            className="mt-0.5 h-4 w-4 accent-teal-700"
            checked={useDemoBaseline}
            onChange={(e) => setUseDemoBaseline(e.target.checked)}
          />
          <span>
            Allow the Guide to use Maya’s fictional demo baseline for my next
            message. Never on by default; personal profiles never send records.
          </span>
        </label>
      )}

      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          send(input, 'general', useDemoBaseline);
        }}
      >
        <label htmlFor="guide-input" className="sr-only">
          Message the Guide
        </label>
        <input
          id="guide-input"
          className="field !mt-0 flex-1"
          value={input}
          maxLength={GUIDE_LIMITS.maxMessageChars}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about LiverLoop or verified learning material…"
          autoComplete="off"
          disabled={sending}
        />
        <button type="submit" className="btn-primary shrink-0" disabled={sending || input.trim().length === 0}>
          Send
        </button>
      </form>
      <div className="flex items-center gap-2">
        <button
          className="btn-secondary !py-1.5 text-xs"
          onClick={() => {
            abortRef.current?.abort();
            setMessages([]);
            setSendError(null);
            setSavedQuestions({});
          }}
        >
          Clear conversation
        </button>
      </div>

      <div className="card space-y-2">
        <DisclaimerStrip />
      </div>
    </div>
  );
}
