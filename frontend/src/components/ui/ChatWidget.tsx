import { useState, useRef, useEffect, Fragment } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { MessageSquare, X, Send, Loader2, Bot, ChevronLeft, Pencil } from 'lucide-react';
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
    {
      label: 'Content calendar suggestions',
      message: "Suggest a content calendar for this month based on our org's campaigns and upcoming events.",
      promptKey: 'social.content_calendar',     // Tier 4
    },
    {
      label: 'Tone check a post',
      message: 'Check this post for trauma-informed, sensitive language: [paste your draft here]',
      promptKey: 'social.tone_check',           // Tier 4
    },
  ],
};

// ─── Simple markdown renderer ─────────────────────────────────────────────────
// Handles **bold**, bullet lines (• or -), and blank-line paragraph breaks.

function renderMarkdown(text: string): ReactNode {
  const paragraphs = text.split(/\n{2,}/);          // split on blank lines

  return paragraphs.map((para, pi) => {
    const lines = para.split('\n');
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

export default function ChatWidget() {
  const { isAdmin, isLoading } = useAuth();
  const [isOpen, setIsOpen]       = useState(false);
  const [category, setCategory]   = useState<Category>(null);
  const [input, setInput]         = useState('');
  const [messages, setMessages]   = useState<Message[]>([]);
  const [isPending, setIsPending] = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef       = useRef<HTMLTextAreaElement>(null);

  // ── All hooks before early return ─────────────────────────────────────────

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
    setCategory(null);
    setInput('');
    setError(null);
  }

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <>
      {/* ── Floating trigger button ─────────────────────────────────────── */}
      <button
        onClick={() => setIsOpen(prev => !prev)}
        aria-label="Open AI Helper"
        className={[
          'fixed bottom-5 left-5 z-50',
          'flex items-center gap-1.5 rounded-full px-3.5 py-2 shadow-lg',
          'bg-safira-blue text-white',
          'hover:bg-safira-blue-dark active:scale-95 transition-all duration-150',
          isOpen ? 'opacity-0 pointer-events-none' : 'opacity-100',
        ].join(' ')}
      >
        <MessageSquare size={16} strokeWidth={2} />
        <span className="text-xs font-semibold tracking-wide whitespace-nowrap">AI Helper</span>
      </button>

      {/* ── Chat panel ──────────────────────────────────────────────────── */}
      {isOpen && (
      <div
        className={[
          'fixed bottom-5 left-5 z-50 flex flex-col w-80 sm:w-96 h-[560px]',
          'rounded-2xl shadow-2xl border',
          'bg-[var(--page-bg)] border-slate-200 dark:border-slate-700',
          'transition-all duration-200 ease-out origin-bottom-left',
          'opacity-100 scale-100 translate-y-0',
        ].join(' ')}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-700 flex-shrink-0">
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
