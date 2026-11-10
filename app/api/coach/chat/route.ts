import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  generateId,
  streamText,
  toUIMessageStream,
  type UIMessage,
} from "ai";
import { coachConfigured, coachModel } from "@/lib/coach-config";
import { COACH_SYSTEM_RULES, stripInstitutions, textFromParts } from "@/lib/coach-plan";
import { ensureCoachThread, loadCoachPrompt, recentCoachUiMessages, upsertCoachMessage } from "@/lib/coach-store";
import { chicagoMonthKey } from "@/lib/month";
import { requireActor } from "@/lib/permissions";
import { staffApiBlock } from "@/lib/staff-mfa";

export const instant = false;
export const maxDuration = 60;

const MAX_QUESTION = 2000;

export async function POST(request: Request) {
  const actor = await requireActor();
  const blocked = staffApiBlock(actor);
  if (blocked) return Response.json(blocked.body, { status: blocked.status });
  if (!actor || actor.role !== "member") {
    return Response.json({ error: "Sign in as a member to use the coach." }, { status: 401 });
  }
  const member = actor;
  const model = coachModel();
  if (!coachConfigured() || !model) {
    return Response.json(
      { error: "The coach is not connected. Your saved plan and earlier messages are still here." },
      { status: 503 },
    );
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return Response.json({ error: "Send a question as JSON." }, { status: 400 });
  }
  const incoming = readMessages(payload);
  const last = incoming.at(-1);
  if (!last || last.role !== "user") {
    return Response.json({ error: "Ask a question to start." }, { status: 400 });
  }
  const question = textFromParts(last.parts).slice(0, MAX_QUESTION).trim();
  if (!question) return Response.json({ error: "Write a question first." }, { status: 400 });

  const context = await loadCoachPrompt(member.id, chicagoMonthKey());
  if (!context) return Response.json({ error: "Your plan is not available yet." }, { status: 404 });

  const threadId = await ensureCoachThread(member.id);
  const messageId = safeId(last.id);
  await upsertCoachMessage({ id: messageId, threadId, role: "user", body: question });
  const history = await recentCoachUiMessages(threadId, 20);
  const uiMessages: UIMessage[] = history.map((message) => ({
    id: message.id,
    role: message.role,
    parts: [{ type: "text" as const, text: message.body }],
  }));

  try {
    const result = streamText({
      model,
      system: `${COACH_SYSTEM_RULES}\n\n${context}`,
      messages: await convertToModelMessages(uiMessages),
    });
    return createUIMessageStreamResponse({
      stream: toUIMessageStream({
        stream: result.stream,
        originalMessages: uiMessages,
        onEnd: async ({ responseMessage }) => {
          if (responseMessage.role !== "assistant") return;
          const body = stripInstitutions(textFromParts(responseMessage.parts));
          if (!body) return;
          await upsertCoachMessage({
            id: responseMessage.id,
            threadId,
            role: "assistant",
            body,
          });
        },
      }),
    });
  } catch (error) {
    console.error("Freedom Coach stream failed", error instanceof Error ? error.name : "error");
    return Response.json(
      { error: "The coach could not answer just now. Your question is saved." },
      { status: 503 },
    );
  }
}

function readMessages(payload: unknown): UIMessage[] {
  if (!payload || typeof payload !== "object") return [];
  const messages = (payload as { messages?: unknown }).messages;
  if (!Array.isArray(messages)) return [];
  return messages.filter((message): message is UIMessage => {
    if (!message || typeof message !== "object") return false;
    const role = (message as { role?: unknown }).role;
    return role === "user" || role === "assistant";
  });
}

function safeId(value: string | undefined): string {
  if (value && /^[A-Za-z0-9_-]{1,80}$/.test(value)) return value;
  return generateId();
}
