import type {
  NoxConversationMessage,
  NoxQuickAction,
  NoxReply,
} from "@/lib/nox/types";

export type NoxConversationSession = {
  contextKey: string;
  messages: NoxConversationMessage[];
  currentReply: NoxReply | null;
  activeAction: NoxQuickAction | null;
};

export function currentNoxSession(
  session: NoxConversationSession | null,
  contextKey: string,
): NoxConversationSession | null {
  return session?.contextKey === contextKey ? session : null;
}

export function appendNoxExchange(
  session: NoxConversationSession | null,
  contextKey: string,
  userText: string,
  reply: NoxReply,
  activeAction: NoxQuickAction | null,
  idPrefix: string,
): NoxConversationSession {
  const previous = currentNoxSession(session, contextKey)?.messages ?? [];
  return {
    contextKey,
    messages: [
      ...previous,
      { id: `${idPrefix}:user`, role: "user", text: userText },
      { id: `${idPrefix}:nox`, role: "nox", text: reply.message },
    ],
    currentReply: reply,
    activeAction,
  };
}
