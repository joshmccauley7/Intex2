import { useState, useRef, useEffect, Fragment } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { X, Send, Loader2, Bot, ChevronLeft, Pencil } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { apiFetch } from '../../api';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

// null = no category chosen yet
// 'other' = user clicked "Something else" — skip chips, show input directly
type Category = 'resident' | 'donor' | 'social' | 'other' | null;

interface Prompt {
  label: string;
  message: string;
  /** Sent to the backend so it can choose the right tier (Tier1/2/4).
   *  null means free-typed → always Tier 4. */
  promptKey: string;
}

// ─── Category definitions ────────────────────────────────────────────────────

const CATEGORIES: { id: Exclude<Category, null>; label: string; emoji: string }[] = [
  { id: 'resident', label: 'A Resident',    emoji: '🏠' },
  { id: 'donor',    label: 'Donors',        emoji: '💛' },
  { id: 'social',   label: 'Social Media',  emoji: '📣' },
  { id: 'other',    label: 'Something else', emoji: '💬' },
];

// ─── Suggested prompts per category ──────────────────────────────────────────
// promptKey tells the backend which tier to use for each button.
// Tier 1 → instant DB response (no Claude)
// Tier 2 → pre-aggregated summary → tiny Claude narration
// Tier 4 → targeted context → full Claude (creative/draft tasks)

const CATEGORY_PROMPTS: Record<'resident' | 'donor' | 'social', Prompt[]> = {
  resident: [
    {
      label: '30+ day residents',
      message: 'Which residents have been here 30 or more days and may need transition planning?',
      promptKey: 'resident.long_stay',          // Tier 1
    },
    {
      label: 'Safety concerns this week',
      message: 'Are there any residents with safety concerns flagged in home visitations this week?',
      promptKey: 'resident.safety_concerns',    // Tier 1
    },
    {
      label: 'Pending follow-ups',
      message: "Show me all residents with pending follow-up visits.",
      promptKey: 'resident.pending_followups',  // Tier 1
    },
    {
      label: 'Case status overview',
      message: 'Give me an overview of current resident case statuses and reintegration progress.',
      promptKey: 'resident.status_overview',    // Tier 2
    },
    {
      label: 'Who needs attention?',
      message: "Which residents might be falling through the cracks — long stays, no recent visits, or unresolved follow-ups?",
      promptKey: 'resident.needs_attention',    // Tier 2
    },
  ],
  donor: [
    {
      label: 'Churn risk donors',
      message: "Which donors are at high churn risk?",
      promptKey: 'donor.churn_risk',            // Tier 1
    },
    {
      label: 'Lapsed donors (6+ months)',
      message: "Show me donors who haven't made a donation in the last 6 months.",
      promptKey: 'donor.lapsed',                // Tier 1
    },
    {
      label: 'Giving summary',
      message: 'Give me a giving summary — monthly totals, top donors, and new vs returning supporters.',
      promptKey: 'donor.giving_summary',        // Tier 2
    },
    {
      label: 'Draft a thank-you message',
      message: 'Draft a warm thank-you message for our most recent donors, tailored to their donation type.',
      promptKey: 'donor.thank_you',             // Tier 4
    },
    {
      label: 'Draft a re-engagement email',
      message: 'Draft a personalized re-engagement email for a lapsed donor who gave last year.',
      promptKey: 'donor.reengage',              // Tier 4
    },
  ],
  social: [
    {
      label: 'Top performing content',
      message: "Which of our social media posts have performed best in terms of engagement and reach?",
      promptKey: 'social.top_content',          // Tier 1
    },
    {
      label: 'Draft an awareness post',
      message: 'Draft a trauma-informed awareness post we could use for Domestic Violence Awareness Month.',
      promptKey: 'social.awareness_post',       // Tier 4
    },
    {
      label: "Post ideas (haven't posted recently)",
      message: "We haven't posted in a while — give me 3 post ideas based on our mission and recent activity.",
      promptKey: 'social.post_ideas',           // Tier 4
    },
  ],
};

// ─── Simple markdown renderer ─────────────────────────────────────────────────
// Handles **bold**, bullet lines (• or -), and blank-line paragraph breaks.

function renderMarkdown(text: string): ReactNode {
  const paragraphs = text.split(/\n{2,}/);

  return paragraphs.map((para, pi) => {
    const lines = para.split('\n').filter((_, i, arr) =>
      // keep separator lines only for table detection, strip them from output
      true || i < arr.length
    );

    // ── Heading (## or ###) ──────────────────────────────────────────────────
    const headingMatch = para.match(/^(#{1,3})\s+(.+)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const cls = level === 1
        ? 'text-base font-bold mt-3 mb-1 text-[var(--page-fg)]'
        : level === 2
          ? 'text-sm font-bold mt-2 mb-0.5 text-[var(--page-fg)]'
          : 'text-sm font-semibold mt-1 text-[var(--page-fg)]';
      return <p key={pi} className={cls}>{inlineBold(headingMatch[2])}</p>;
    }

    // ── Markdown table ───────────────────────────────────────────────────────
    const tableLines = lines.filter(l => l.trim().startsWith('|'));
    if (tableLines.length >= 2) {
      const parseRow = (row: string) =>
        row.split('|').map(c => c.trim()).filter((_, i, a) => i > 0 && i < a.length - 1);
      const isSeparator = (row: string) => /^\|[\s\-:|]+\|/.test(row);
      const dataRows = tableLines.filter(l => !isSeparator(l));
      const [header, ...body] = dataRows;
      const headers = parseRow(header);
      return (
        <div key={pi} className="overflow-x-auto my-2 rounded-lg border border-slate-200 dark:border-slate-700">
          <table className="text-xs w-full border-collapse">
            <thead>
              <tr className="bg-slate-100 dark:bg-slate-800">
                {headers.map((h, i) => (
                  <th key={i} className="px-2 py-1.5 text-left font-semibold text-[var(--page-fg)] border-b border-slate-200 dark:border-slate-700 whitespace-nowrap">
                    {inlineBold(h)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {body.map((row, ri) => (
                <tr key={ri} className={ri % 2 === 0 ? '' : 'bg-slate-50 dark:bg-slate-900/40'}>
                  {parseRow(row).map((cell, ci) => (
                    <td key={ci} className="px-2 py-1.5 text-[var(--page-fg)] border-b border-slate-100 dark:border-slate-800 last:border-b-0">
                      {inlineBold(cell)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    // ── Bullet list ──────────────────────────────────────────────────────────
    const isList = lines.every(l => /^[•\-\*] /.test(l.trim()) || l.trim() === '');
    if (isList) {
      return (
        <ul key={pi} className="list-none space-y-1 my-1">
          {lines.filter(l => l.trim()).map((line, li) => (
            <li key={li} className="flex gap-1.5">
              <span className="shrink-0 mt-0.5">•</span>
              <span>{inlineBold(line.replace(/^[•\-\*]\s*/, ''))}</span>
            </li>
          ))}
        </ul>
      );
    }

    // ── Paragraph ────────────────────────────────────────────────────────────
    return (
      <p key={pi} className={pi > 0 ? 'mt-2' : ''}>
        {lines.map((line, li) => (
          <Fragment key={li}>
            {inlineBold(line)}
            {li < lines.length - 1 && <br />}
          </Fragment>
        ))}
      </p>
    );
  });
}

/** Convert **text** to <strong> inline */
function inlineBold(text: string): ReactNode {
  const parts = text.split(/\*\*(.*?)\*\*/g);
  return parts.map((part, i) =>
    i % 2 === 1 ? <strong key={i} className="font-semibold">{part}</strong> : part
  );
}

// ─── Collapsible long responses ──────────────────────────────────────────────
// Responses longer than this many characters get a "Show more" button.
const COLLAPSE_THRESHOLD = 600;

function CollapsibleMessage({ content }: { content: string }) {
  const [expanded, setExpanded] = useState(false);
  const isLong = content.length > COLLAPSE_THRESHOLD;

  if (!isLong) {
    return <>{renderMarkdown(content)}</>;
  }

  return (
    <div>
      <div className={`relative${expanded ? '' : ' max-h-48 overflow-hidden'}`}>
        {renderMarkdown(content)}
        {!expanded && (
          <div className="absolute bottom-0 inset-x-0 h-14 bg-gradient-to-t from-slate-100 dark:from-slate-800 to-transparent pointer-events-none" />
        )}
      </div>
      <button
        onClick={() => setExpanded(e => !e)}
        className="mt-2 text-xs font-semibold text-safira-blue hover:text-safira-blue-dark transition-colors"
      >
        {expanded ? '↑ Show less' : '↓ Show more'}
      </button>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

interface ChatWidgetProps {
  open: boolean;
  onClose: () => void;
  initialCategory?: Exclude<Category, null>;
}

export default function ChatWidget({ open, onClose, initialCategory }: ChatWidgetProps) {
  const { isAdmin, isLoading } = useAuth();
  const isOpen = open;
  const setIsOpen = (v: boolean) => { if (!v) onClose(); };
  const [category, setCategory]   = useState<Category>(initialCategory ?? null);
  const [input, setInput]         = useState('');
  const [messages, setMessages]   = useState<Message[]>([]);
  const [isPending, setIsPending] = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef       = useRef<HTMLTextAreaElement>(null);

  // ── Drag + Resize state ───────────────────────────────────────────────────
  const MIN_W = 280; const MAX_W = 700;
  const MIN_H = 300; const MAX_H = 900;

  const [pos,  setPos]  = useState(() => ({
    x: 20,
    y: typeof window !== 'undefined' ? Math.max(20, window.innerHeight - 580) : 100,
  }));
  const [size, setSize] = useState({ w: 384, h: 560 });

  const dragMode   = useRef<'move' | 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw' | null>(null);
  const dragStart  = useRef({ mx: 0, my: 0, x: 0, y: 0, w: 0, h: 0 });

  function startInteraction(mode: typeof dragMode.current, e: React.PointerEvent) {
    e.currentTarget.setPointerCapture(e.pointerId);
    dragMode.current  = mode;
    dragStart.current = { mx: e.clientX, my: e.clientY, x: pos.x, y: pos.y, w: size.w, h: size.h };
  }

  function onHeaderPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if ((e.target as HTMLElement).closest('button')) return;
    startInteraction('move', e);
  }

  function onPanelPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const mode = dragMode.current;
    if (!mode) return;
    const dx = e.clientX - dragStart.current.mx;
    const dy = e.clientY - dragStart.current.my;
    const { x: ox, y: oy, w: ow, h: oh } = dragStart.current;

    if (mode === 'move') {
      setPos({
        x: Math.max(0, Math.min(window.innerWidth  - size.w, ox + dx)),
        y: Math.max(0, Math.min(window.innerHeight - 60,     oy + dy)),
      });
      return;
    }

    let newX = ox, newY = oy, newW = ow, newH = oh;
    if (mode.includes('e')) newW = Math.min(MAX_W, Math.max(MIN_W, ow + dx));
    if (mode.includes('s')) newH = Math.min(MAX_H, Math.max(MIN_H, oh + dy));
    if (mode.includes('w')) {
      newW = Math.min(MAX_W, Math.max(MIN_W, ow - dx));
      newX = ox + (ow - newW);
    }
    if (mode.includes('n')) {
      newH = Math.min(MAX_H, Math.max(MIN_H, oh - dy));
      newY = oy + (oh - newH);
    }
    setSize({ w: newW, h: newH });
    setPos({ x: newX, y: newY });
  }

  function onPanelPointerUp() {
    dragMode.current = null;
  }

  // Resize handle style helper
  const rh = (cursor: string, style: React.CSSProperties): React.CSSProperties => ({
    position: 'absolute', cursor, zIndex: 10, ...style,
  });

  // ── All hooks before early return ─────────────────────────────────────────

  // When opened with a pre-selected category, jump straight to prompts
  useEffect(() => {
    if (isOpen && initialCategory) {
      setCategory(initialCategory);
      setMessages([]);
      setInput('');
      setError(null);
    }
  }, [isOpen, initialCategory]);

  useEffect(() => {
    if (isOpen) messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen]);

  useEffect(() => {
    if (isOpen && category !== null && messages.length === 0)
      setTimeout(() => inputRef.current?.focus(), 50);
  }, [isOpen, category, messages.length]);

  // ── Guard ─────────────────────────────────────────────────────────────────
  if (isLoading || !isAdmin) return null;

  // ── Helpers ───────────────────────────────────────────────────────────────

  const inChat = messages.length > 0;
  const showInput = category !== null; // input visible once any category is chosen

  async function sendMessage(text: string, promptKey?: string) {
    const trimmed = text.trim();
    if (!trimmed || isPending) return;

    setMessages(prev => [...prev, { role: 'user', content: trimmed }]);
    setInput('');
    setError(null);
    setIsPending(true);

    try {
      const data = await apiFetch('/api/chat/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmed,
          // Only include history for free-typed / Tier 4; not needed for Tier 1/2
          history: promptKey ? [] : messages.map(m => ({ role: m.role, content: m.content })),
          promptKey: promptKey ?? null,
        }),
      });
      setMessages(prev => [...prev, { role: 'assistant', content: data?.response ?? 'No response received.' }]);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setIsPending(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }

  function handleSubmit(e?: FormEvent) {
    e?.preventDefault();
    // Free-typed → no promptKey (Tier 4)
    sendMessage(input);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(); }
  }

  function handleReset() {
    setMessages([]);
    setCategory(initialCategory ?? null);
    setInput('');
    setError(null);
  }

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <>
      {/* ── Chat panel ──────────────────────────────────────────────────── */}
      {isOpen && (
      <div
        className="fixed z-[200] flex flex-col rounded-2xl shadow-2xl border bg-[var(--page-bg)] border-slate-200 dark:border-slate-700"
        style={{ left: pos.x, top: pos.y, width: size.w, height: size.h }}
        onPointerMove={onPanelPointerMove}
        onPointerUp={onPanelPointerUp}
        onPointerLeave={onPanelPointerUp}
      >
        {/* Resize handles */}
        <div style={rh('ns-resize',   { top: 0,    left: 8,  right: 8,  height: 5 })}         onPointerDown={e => startInteraction('n',  e)} />
        <div style={rh('ns-resize',   { bottom: 0, left: 8,  right: 8,  height: 5 })}         onPointerDown={e => startInteraction('s',  e)} />
        <div style={rh('ew-resize',   { left: 0,   top: 8,   bottom: 8, width: 5 })}          onPointerDown={e => startInteraction('w',  e)} />
        <div style={rh('ew-resize',   { right: 0,  top: 8,   bottom: 8, width: 5 })}          onPointerDown={e => startInteraction('e',  e)} />
        <div style={rh('nwse-resize', { top: 0,    left: 0,  width: 12, height: 12 })}        onPointerDown={e => startInteraction('nw', e)} />
        <div style={rh('nesw-resize', { top: 0,    right: 0, width: 12, height: 12 })}        onPointerDown={e => startInteraction('ne', e)} />
        <div style={rh('nesw-resize', { bottom: 0, left: 0,  width: 12, height: 12 })}        onPointerDown={e => startInteraction('sw', e)} />
        <div style={rh('nwse-resize', { bottom: 0, right: 0, width: 12, height: 12 })}        onPointerDown={e => startInteraction('se', e)} />

        {/* Header — drag handle */}
        <div
          className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-700 flex-shrink-0 cursor-move select-none"
          onPointerDown={onHeaderPointerDown}
        >
          <div className="flex items-center gap-2">
            {category !== null && !inChat && (
              <button
                onClick={() => setCategory(null)}
                className="p-1 -ml-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 transition-colors"
                aria-label="Back"
              >
                <ChevronLeft size={16} />
              </button>
            )}
            <Bot size={18} className="text-safira-blue" />
            <span className="font-semibold text-sm text-[var(--page-fg)]">AI Helper</span>
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-safira-blue/10 text-safira-blue">
              Admin only
            </span>
          </div>
          <div className="flex items-center gap-1">
            {inChat && (
              <button
                onClick={handleReset}
                className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 px-2 py-1 rounded transition-colors"
              >
                Start over
              </button>
            )}
            <button
              onClick={() => setIsOpen(false)}
              aria-label="Close"
              className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-700 transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-4 py-4 scroll-smooth">

          {/* ── Welcome screen ─────────────────────────────────────────────── */}
          {!inChat && category === null && (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
              <Bot size={32} className="text-slate-300 dark:text-slate-600" />
              <p className="text-sm font-medium text-[var(--page-fg)]">I want to help with…</p>
              <div className="flex flex-col gap-2 w-full">
                {CATEGORIES.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setCategory(cat.id)}
                    className="flex items-center gap-3 w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-left text-sm font-medium text-[var(--page-fg)] hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-safira-blue/40 transition-all"
                  >
                    <span className="text-lg">{cat.emoji}</span>
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── "Something else" — just show input, no chips ───────────────── */}
          {!inChat && category === 'other' && (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
              <Pencil size={28} className="text-slate-300 dark:text-slate-600" />
              <p className="text-sm text-slate-500 dark:text-slate-400 max-w-[220px] leading-relaxed">
                Ask me anything about residents, donors, safehouses, sessions, or social media.
              </p>
            </div>
          )}

          {/* ── Category prompt chips ───────────────────────────────────────── */}
          {!inChat && category !== null && category !== 'other' && (
            <div className="flex flex-col gap-2 h-full">
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">
                Choose a starting point, or type your own question below:
              </p>
              {CATEGORY_PROMPTS[category].map(p => (
                <button
                  key={p.promptKey}
                  onClick={() => sendMessage(p.message, p.promptKey)}
                  className="text-xs text-left px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-[var(--page-fg)] hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-safira-blue/40 transition-all leading-relaxed"
                >
                  {p.label}
                </button>
              ))}
            </div>
          )}

          {/* ── Chat messages ───────────────────────────────────────────────── */}
          {inChat && (
            <div className="flex flex-col gap-3">
              {messages.map((msg, i) => (
                <div key={i} className={['flex', msg.role === 'user' ? 'justify-end' : 'justify-start'].join(' ')}>
                  <div
                    className={[
                      'max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed',
                      msg.role === 'user'
                        ? 'bg-safira-blue text-white rounded-br-sm whitespace-pre-wrap'
                        : 'bg-slate-100 dark:bg-slate-800 text-[var(--page-fg)] rounded-bl-sm',
                    ].join(' ')}
                  >
                    {msg.role === 'user'
                      ? msg.content
                      : <CollapsibleMessage content={msg.content} />}
                  </div>
                </div>
              ))}

              {isPending && (
                <div className="flex justify-start">
                  <div className="bg-slate-100 dark:bg-slate-800 rounded-2xl rounded-bl-sm px-3.5 py-2.5">
                    <div className="flex items-center gap-1.5 text-slate-400">
                      <Loader2 size={13} className="animate-spin" />
                      <span className="text-xs">Thinking…</span>
                    </div>
                  </div>
                </div>
              )}

              {error && (
                <div className="text-xs text-red-500 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2">
                  {error}
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input — shown once a category is chosen */}
        {showInput && (
          <form
            onSubmit={handleSubmit}
            className="flex items-end gap-2 px-4 py-3 border-t border-slate-200 dark:border-slate-700 flex-shrink-0"
          >
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask a question…"
              rows={1}
              disabled={isPending}
              className={[
                'flex-1 resize-none rounded-xl border px-3 py-2 text-sm',
                'bg-slate-50 dark:bg-slate-800',
                'border-slate-200 dark:border-slate-700',
                'text-[var(--page-fg)] placeholder-slate-400',
                'focus:outline-none focus:ring-2 focus:ring-safira-blue/40 focus:border-safira-blue',
                'disabled:opacity-50 transition-colors max-h-28 overflow-y-auto',
              ].join(' ')}
              style={{ lineHeight: '1.4' }}
            />
            <button
              type="submit"
              disabled={!input.trim() || isPending}
              aria-label="Send"
              className={[
                'p-2.5 rounded-xl flex-shrink-0 transition-all',
                'bg-safira-blue text-white',
                'hover:bg-safira-blue-dark active:scale-95',
                'disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100',
              ].join(' ')}
            >
              <Send size={15} />
            </button>
          </form>
        )}
      </div>
      )}
    </>
  );
}
