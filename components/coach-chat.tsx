"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useState } from "react";
import { COACH_PROMPTS } from "@/lib/coach-plan";

export function CoachChat({
  configured,
  initialMessages,
}: {
  configured: boolean;
  initialMessages: UIMessage[];
}) {
  if (!configured) {
    return <Transcript messages={initialMessages} configured={false} />;
  }
  return <LiveCoach initialMessages={initialMessages} />;
}

function LiveCoach({ initialMessages }: { initialMessages: UIMessage[] }) {
  const [input, setInput] = useState("");
  const { messages, sendMessage, status, error, stop } = useChat({
    id: "freedom-coach",
    messages: initialMessages,
    transport: new DefaultChatTransport({ api: "/api/coach/chat" }),
  });
  const busy = status === "submitted" || status === "streaming";

  function ask(text: string) {
    const question = text.trim();
    if (!question || busy) return;
    setInput("");
    void sendMessage({ text: question });
  }

  return (
    <Transcript
      messages={messages}
      configured
      busy={busy}
      error={error ? "The coach could not answer just now. Your earlier messages are still saved." : ""}
      input={input}
      onInput={setInput}
      onAsk={ask}
      onStop={stop}
    />
  );
}

function Transcript({
  messages,
  configured,
  busy = false,
  error = "",
  input = "",
  onInput,
  onAsk,
  onStop,
}: {
  messages: UIMessage[];
  configured: boolean;
  busy?: boolean;
  error?: string;
  input?: string;
  onInput?: (value: string) => void;
  onAsk?: (text: string) => void;
  onStop?: () => void;
}) {
  return (
    <section className="wc-card flex flex-col p-5 sm:p-6">
      <p className="wc-eyebrow">Conversation</p>
      <h2 className="mt-2 text-xl font-semibold tracking-tight">Ask the coach</h2>
      <p className="mt-2 text-sm leading-6 text-muted">
        The reply uses your Freedom Score, gap, goals, check-ins, and lessons. It does not see bank
        names, account numbers, or connection tokens.
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        {COACH_PROMPTS.map((prompt) => (
          <button
            key={prompt}
            type="button"
            className="rounded-full border border-line px-3 py-1.5 text-left text-xs leading-5 text-muted hover:border-gold-muted hover:text-ink disabled:cursor-not-allowed disabled:opacity-60"
            disabled={!configured || busy}
            onClick={() => onAsk?.(prompt)}
          >
            {prompt}
          </button>
        ))}
      </div>

      <div className="mt-4 max-h-[28rem] space-y-3 overflow-y-auto pr-1" aria-live="polite">
        {messages.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-line px-4 py-6 text-sm leading-6 text-muted">
            No messages yet. Start with one of the questions above, or write your own.
          </p>
        ) : (
          messages.map((message) => <Bubble key={message.id} message={message} />)
        )}
        {busy ? <p className="text-sm text-gold-muted">Writing a reply…</p> : null}
      </div>

      {configured ? (
        <form
          className="mt-4 flex flex-col gap-2 sm:flex-row"
          onSubmit={(event) => {
            event.preventDefault();
            onAsk?.(input);
          }}
        >
          <label className="sr-only" htmlFor="coach-question">
            Your question
          </label>
          <input
            id="coach-question"
            className="wc-input min-w-0 flex-1"
            value={input}
            maxLength={2000}
            placeholder="Ask about this month"
            disabled={busy}
            onChange={(event) => onInput?.(event.target.value)}
          />
          {busy ? (
            <button type="button" className="wc-btn wc-btn-ghost" onClick={() => onStop?.()}>
              Stop
            </button>
          ) : (
            <button type="submit" className="wc-btn wc-btn-primary" disabled={!input.trim()}>
              Send
            </button>
          )}
        </form>
      ) : (
        <p className="mt-4 rounded-2xl border border-line bg-background px-4 py-3 text-sm leading-6 text-muted">
          Chat is off until an operator sets the AI Gateway key. Your sample conversation, if you
          have one, stays on this page. Nothing here calls a model.
        </p>
      )}
      {error ? (
        <p role="alert" className="mt-3 text-sm text-danger">
          {error}
        </p>
      ) : null}
    </section>
  );
}

function Bubble({ message }: { message: UIMessage }) {
  const text = message.parts
    .map((part) => (part.type === "text" ? part.text : ""))
    .join("")
    .trim();
  if (!text) return null;
  const mine = message.role === "user";
  return (
    <article
      className={`rounded-2xl px-4 py-3 text-sm leading-6 ${
        mine ? "ml-0 border border-gold-muted/40 bg-surface-raised sm:ml-8" : "mr-0 border border-line bg-background sm:mr-8"
      }`}
    >
      <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-gold-muted">
        {mine ? "You" : "Coach"}
      </p>
      <p className="mt-1 whitespace-pre-wrap text-ink">{text}</p>
    </article>
  );
}
