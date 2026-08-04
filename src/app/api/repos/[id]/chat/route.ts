import { z } from "zod";
import { requireApiAuth } from "@/lib/auth-utils";
import { isPublicAppError, toApiErrorResponse } from "@/lib/public-errors";
import {
  createRepoChatStream,
  getRepoChatModel,
} from "@/lib/repos/repo-chat-ai";
import { buildRepoChatResponseMetadata } from "@/lib/repos/repo-chat-core";
import {
  buildRepoChatFallbackAnswer,
  type RepoChatFallbackReason,
} from "@/lib/repos/repo-chat-fallback";
import {
  createRepoChatMessage,
  getRepoChatContext,
  listRepoChatMessages,
  type RepoChatContext,
} from "@/lib/repos/repo-chat-service";
import {
  logServerError,
  logServerInfo,
  logServerWarning,
} from "@/lib/safe-server-log";
import { consumeUsage } from "@/lib/usage-limits";

export const runtime = "nodejs";
export const maxDuration = 60;

const CHAT_COMPLETION_TIMEOUT_MS = 55_000;
const CHAT_FIRST_TOKEN_TIMEOUT_MS = 25_000;

type RepoChatRouteContext = {
  params: Promise<{ id: string }>;
};

type ChatTimeoutReason = "completion" | "first-token" | null;

const chatMessageSchema = z.object({
  message: z.string().trim().min(1).max(2000),
});

export async function GET(request: Request, { params }: RepoChatRouteContext) {
  const auth = await requireApiAuth(request);

  if (auth.error) {
    return Response.json({ error: auth.error }, { status: 401 });
  }

  const { id } = await params;
  const messages = await listRepoChatMessages({
    repoId: id,
    userId: auth.session.user.id,
  });

  if (!messages) {
    return Response.json({ error: "Repository not found." }, { status: 404 });
  }

  return Response.json({ messages });
}

export async function POST(request: Request, { params }: RepoChatRouteContext) {
  const requestStartedAt = Date.now();
  const auth = await requireApiAuth(request);

  if (auth.error) {
    return Response.json({ error: auth.error }, { status: 401 });
  }

  const body = chatMessageSchema.safeParse(
    await request.json().catch(() => null),
  );

  if (!body.success) {
    return Response.json(
      { error: "Enter a message to send." },
      { status: 400 },
    );
  }

  const { id } = await params;
  const contextStartedAt = Date.now();
  const context = await getRepoChatContext({
    question: body.data.message,
    repoId: id,
    userId: auth.session.user.id,
  });

  if (!context) {
    return Response.json({ error: "Repository not found." }, { status: 404 });
  }

  if (context.repo.status !== "READY") {
    return Response.json(
      { error: "Repository analysis must be ready before chatting." },
      { status: 409 },
    );
  }

  logServerInfo("Repo chat context loaded", {
    chunkCount: context.chunks.length,
    contextLoadedMs: Date.now() - contextStartedAt,
    fileCount: context.files.length,
    historyCount: context.history.length,
    model: getRepoChatModel(),
    repoId: id,
    userId: auth.session.user.id,
  });

  try {
    await consumeUsage({
      repoId: id,
      type: "CHAT_MESSAGE",
      userId: auth.session.user.id,
    });
  } catch (error) {
    return toApiErrorResponse(error, {
      fallbackMessage: "Unable to send this message.",
    });
  }

  await createRepoChatMessage({
    content: body.data.message,
    repoId: id,
    role: "user",
    userId: auth.session.user.id,
  });

  const abortController = new AbortController();
  const modelStartedAt = Date.now();
  let timeoutReason: ChatTimeoutReason = null;
  let timeout: ReturnType<typeof setTimeout> | null = null;
  const clearChatTimeout = () => {
    if (!timeout) return;

    clearTimeout(timeout);
    timeout = null;
  };
  const scheduleChatTimeout = (
    reason: Exclude<ChatTimeoutReason, null>,
    timeoutMs: number,
  ) => {
    clearChatTimeout();
    timeout = setTimeout(
      () => {
        timeoutReason = reason;
        abortController.abort();
      },
      Math.max(1, timeoutMs),
    );
  };
  let completion: Awaited<ReturnType<typeof createRepoChatStream>>;

  scheduleChatTimeout("first-token", CHAT_FIRST_TOKEN_TIMEOUT_MS);
  logServerInfo("Repo chat model request started", {
    model: getRepoChatModel(),
    repoId: id,
    totalElapsedMs: Date.now() - requestStartedAt,
    userId: auth.session.user.id,
  });

  try {
    completion = await createRepoChatStream({
      context,
      question: body.data.message,
      signal: abortController.signal,
    });
    logServerInfo("Repo chat model stream opened", {
      model: getRepoChatModel(),
      modelOpenMs: Date.now() - modelStartedAt,
      repoId: id,
      totalElapsedMs: Date.now() - requestStartedAt,
      userId: auth.session.user.id,
    });
  } catch (error) {
    clearChatTimeout();
    if (shouldUseFallbackAnswer(error, timeoutReason)) {
      return createFallbackChatResponse({
        context,
        model: getRepoChatModel(),
        question: body.data.message,
        reason: "model-timeout",
        repoId: id,
        requestStartedAt,
        userId: auth.session.user.id,
      });
    }

    logServerError("Unable to start repo chat stream", {
      error: error instanceof Error ? error : new Error("Unknown chat error"),
      model: getRepoChatModel(),
      repoId: id,
      timedOut: Boolean(timeoutReason),
      timeoutReason: timeoutReason ?? undefined,
      userId: auth.session.user.id,
    });
    return Response.json(
      {
        error: formatChatStreamError(error, Boolean(timeoutReason)),
      },
      { status: 503 },
    );
  }

  let assistantContent = "";
  let assistantFallbackReason: RepoChatFallbackReason | undefined;
  let didReceiveFirstToken = false;
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of completion) {
          const reasoning = (
            chunk.choices[0]?.delta as { reasoning_content?: string }
          )?.reasoning_content;
          const content = chunk.choices[0]?.delta?.content ?? "";

          if (!(content || reasoning)) continue;

          if (!content) continue;

          if (!didReceiveFirstToken) {
            didReceiveFirstToken = true;
            logServerInfo("Repo chat first token received", {
              firstTokenMs: Date.now() - modelStartedAt,
              model: getRepoChatModel(),
              repoId: id,
              totalElapsedMs: Date.now() - requestStartedAt,
              userId: auth.session.user.id,
            });
            scheduleChatTimeout(
              "completion",
              CHAT_COMPLETION_TIMEOUT_MS - (Date.now() - requestStartedAt),
            );
          }

          assistantContent += content;
          controller.enqueue(encoder.encode(content));
        }

        if (!assistantContent.trim()) {
          assistantFallbackReason = "model-timeout";
          const fallback = buildRepoChatFallbackAnswer({
            context,
            question: body.data.message,
            reason: assistantFallbackReason,
          });

          logServerWarning("Repo chat fallback used", {
            fallbackReason: assistantFallbackReason,
            model: getRepoChatModel(),
            repoId: id,
            totalElapsedMs: Date.now() - requestStartedAt,
            userId: auth.session.user.id,
          });

          assistantContent = fallback;
          controller.enqueue(encoder.encode(fallback));
        }
      } catch (error) {
        if (
          !assistantContent.trim() &&
          shouldUseFallbackAnswer(error, timeoutReason)
        ) {
          assistantFallbackReason = "model-timeout";
          const fallback = buildRepoChatFallbackAnswer({
            context,
            question: body.data.message,
            reason: assistantFallbackReason,
          });

          logServerWarning("Repo chat fallback used", {
            fallbackReason: assistantFallbackReason,
            model: getRepoChatModel(),
            repoId: id,
            totalElapsedMs: Date.now() - requestStartedAt,
            userId: auth.session.user.id,
          });

          assistantContent = fallback;
          controller.enqueue(encoder.encode(fallback));
        } else {
          const errorMessage = assistantContent.trim()
            ? "\n\nRepo chat stopped before finishing. Retry for a fuller answer."
            : formatChatStreamError(
                error,
                Boolean(timeoutReason) || abortController.signal.aborted,
              );

          assistantContent += errorMessage;
          controller.enqueue(encoder.encode(errorMessage));
        }
      } finally {
        clearChatTimeout();
      }

      controller.close();

      if (assistantContent.trim()) {
        try {
          await createRepoChatMessage({
            content: assistantContent,
            metadataJson: buildRepoChatResponseMetadata({
              chunks: context.chunks,
              fallbackReason: assistantFallbackReason,
              model: getRepoChatModel(),
            }),
            repoId: id,
            role: "assistant",
            userId: auth.session.user.id,
          });
        } catch (error) {
          logServerError("Unable to persist repo chat response", {
            error:
              error instanceof Error
                ? error
                : new Error("Unknown chat persistence error"),
            repoId: id,
            userId: auth.session.user.id,
          });
        }
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Cache-Control": "no-cache, no-transform",
      "Content-Type": "text/plain; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

function formatChatStreamError(error: unknown, timedOut = false) {
  if (isPublicAppError(error)) {
    return error.message;
  }

  if (timedOut || isAbortLikeError(error)) {
    return "Repo chat could not get a model response in time. Retry in a moment, or ask the project owner to use a faster chat model.";
  }

  if (error instanceof Error) {
    return "Repo chat stopped before finishing because the AI provider did not return a complete response. Try again in a moment.";
  }

  return "Repo chat stopped before finishing. Try again in a moment.";
}

function createFallbackChatResponse(input: {
  context: RepoChatContext;
  model: string;
  question: string;
  reason: RepoChatFallbackReason;
  repoId: string;
  requestStartedAt: number;
  userId: string;
}) {
  const assistantContent = buildRepoChatFallbackAnswer({
    context: input.context,
    question: input.question,
    reason: input.reason,
  });
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      controller.enqueue(encoder.encode(assistantContent));
      controller.close();

      logServerWarning("Repo chat fallback used", {
        fallbackReason: input.reason,
        model: input.model,
        repoId: input.repoId,
        totalElapsedMs: Date.now() - input.requestStartedAt,
        userId: input.userId,
      });

      try {
        await createRepoChatMessage({
          content: assistantContent,
          metadataJson: buildRepoChatResponseMetadata({
            chunks: input.context.chunks,
            fallbackReason: input.reason,
            model: input.model,
          }),
          repoId: input.repoId,
          role: "assistant",
          userId: input.userId,
        });
      } catch (error) {
        logServerError("Unable to persist repo chat fallback response", {
          error:
            error instanceof Error
              ? error
              : new Error("Unknown chat fallback persistence error"),
          repoId: input.repoId,
          userId: input.userId,
        });
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Cache-Control": "no-cache, no-transform",
      "Content-Type": "text/plain; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

function shouldUseFallbackAnswer(
  error: unknown,
  timeoutReason: ChatTimeoutReason,
) {
  if (isPublicAppError(error)) return false;

  return Boolean(timeoutReason) || isAbortLikeError(error);
}

function isAbortLikeError(error: unknown) {
  if (error instanceof DOMException && error.name === "AbortError") {
    return true;
  }

  if (!(error instanceof Error)) return false;

  return (
    error.name === "AbortError" ||
    error.constructor.name === "APIUserAbortError" ||
    error.constructor.name === "APIConnectionTimeoutError" ||
    error.message === "Request was aborted."
  );
}
