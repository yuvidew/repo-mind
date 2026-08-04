import "server-only";

import OpenAI from "openai";
import { PublicAppError } from "@/lib/public-errors";
import { serverConfig } from "@/lib/server-config";
import { buildRepoChatMessages } from "./repo-chat-prompt";
import type { RepoChatContext } from "./repo-chat-service";

export function createRepoChatStream(input: {
  context: RepoChatContext;
  question: string;
  signal?: AbortSignal;
}) {
  const apiKey = serverConfig.ai.nvidiaApiKey;

  if (!apiKey) {
    throw new PublicAppError({
      code: "chat-model-not-configured",
      message:
        "Repo chat is not available right now. Ask the project owner to enable AI chat.",
      status: 503,
    });
  }

  const openai = new OpenAI({
    apiKey,
    baseURL: serverConfig.ai.nvidiaBaseUrl,
  });

  return openai.chat.completions.create(
    {
      model: getRepoChatModel(),
      messages: buildRepoChatMessages(input),
      temperature: 0.4,
      top_p: 0.9,
      max_tokens: 1400,
      stream: true,
    },
    { signal: input.signal },
  );
}

export function getRepoChatModel() {
  return serverConfig.ai.chatModel;
}
