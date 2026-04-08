import { useState, useRef, useEffect } from 'react';
import type { FormEvent } from 'react';
import { MessageSquare, X, Send, Loader2, Bot } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { apiFetch } from '../../api';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ChatWidget() {
  const { isAdmin, isLoading } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // ── All hooks must come before any early return ────────────────────────────

  // Auto-scroll to latest message
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // ── Guard: only render for admins (AFTER all hooks) ────────────────────────
  if (isLoading || !isAdmin) return null;

  // ── Send a message ─────────────────────────────────────────────────────────
  async function handleSubmit(e?: FormEvent) {
    e?.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isPending) return;

    const userMsg: Message = { role: 'user', content: trimmed };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setInput('');
    setError(null);
    setIsPending(true);

    try {
      const data = await apiFetch('/api/chat/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmed,
          history: messages.map(m => ({ role: m.role, content: m.content })),
        }),
      });

      const assistantMsg: Message = {
        role: 'assistant',
        content: data?.response ?? 'No response received.',
      };
      setMessages(prev => [...prev, assistantMsg]);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'Something went wrong. Please try again.';
      setError(msg);
    } finally {
      setIsPending(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }

  // Allow Enter to send (Shift+Enter for newline)
  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }

  function handleClear() {
    setMessages([]);
    setError(null);
  }

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      {/* ── Floating trigger button ─────────────────────────────────────────── */}
      <button
        onClick={() => setIsOpen(prev => !prev)}
        aria-label={isOpen ? 'Close AI Helper' : 'Open AI Helper'}
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

      {/* ── Chat panel ──────────────────────────────────────────────────────── */}
      <div
        className={[
          'fixed bottom-5 left-5 z-50',
          'flex flex-col w-80 sm:w-96',
          'h-[520px]',
          'rounded-2xl shadow-2xl border',
          'bg-[var(--page-bg)] border-slate-200 dark:border-slate-700',
          'transition-all duration-200 ease-out origin-bottom-left',
          isOpen
            ? 'opacity-100 scale-100 translate-y-0'
            : 'opacity-0 scale-95 translate-y-4 pointer-events-none',
        ].join(' ')}
        aria-hidden={!isOpen}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-700 flex-shrink-0">
          <div className="flex items-center gap-2">
            <Bot size={18} className="text-safira-blue" />
            <span className="font-semibold text-sm text-[var(--page-fg)]">AI Helper</span>
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-safira-blue/10 text-safira-blue">
              Admin only
            </span>
          </div>
          <div className="flex items-center gap-1">
            {messages.length > 0 && (
              <button
                onClick={handleClear}
                title="Clear chat"
                className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 px-2 py-1 rounded transition-colors"
              >
                Clear
              </button>
            )}
            <button
              onClick={() => setIsOpen(false)}
              aria-label="Close AI Helper"
              className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Message area */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 scroll-smooth">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
              <Bot size={32} className="text-slate-300 dark:text-slate-600" />
              <p className="text-sm text-slate-500 dark:text-slate-400 max-w-[220px] leading-relaxed">
                Ask me anything about residents, donors, safehouses, or visitations.
              </p>
              <div className="flex flex-col gap-1.5 w-full mt-1">
                {[
                  'Give me an overview',
                  'How many active residents?',
                  'Are there donors at churn risk?',
                  'Any pending follow-ups?',
                ].map(prompt => (
                  <button
                    key={prompt}
                    onClick={() => { setInput(prompt); inputRef.current?.focus(); }}
                    className="text-xs text-left px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div
              key={i}
              className={[
                'flex',
                msg.role === 'user' ? 'justify-end' : 'justify-start',
              ].join(' ')}
            >
              <div
                className={[
                  'max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap',
                  msg.role === 'user'
                    ? 'bg-safira-blue text-white rounded-br-sm'
                    : 'bg-slate-100 dark:bg-slate-800 text-[var(--page-fg)] rounded-bl-sm',
                ].join(' ')}
              >
                {msg.content}
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

        {/* Input area */}
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
              'disabled:opacity-50 transition-colors',
              'max-h-28 overflow-y-auto',
            ].join(' ')}
            style={{ lineHeight: '1.4' }}
          />
          <button
            type="submit"
            disabled={!input.trim() || isPending}
            aria-label="Send message"
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
      </div>
    </>
  );
}
