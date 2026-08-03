import { z } from "zod";
import { requireApiAuth } from "@/lib/auth-utils";
import { isPublicAppError, toApiErrorResponse } from "@/lib/public-errors";
import {
  createRepoChatStream,
  getRepoChatModel,
} from "@/lib/repos/repo-chat-ai";
import { buildRepoChatResponseMetadata } from "@/lib/repos/repo-chat-core";
import {
  createRepoChatMessage,
  getRepoChatContext,
  listRepoChatMessages,
} from "@/lib/repos/repo-chat-service";
import { logServerError } from "@/lib/safe-server-log";
import { consumeUsage } from "@/lib/usage-limits";

export const runtime = "nodejs";
export const maxDuration = 60;

const CHAT_TIMEOUT_MS = 50_000;

type RepoChatRouteContext = {
  params: Promise<{ id: string }>;
};

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
  let didTimeout = false;
  const timeout = setTimeout(() => {
    didTimeout = true;
    abortController.abort();
  }, CHAT_TIMEOUT_MS);
  let completion: Awaited<ReturnType<typeof createRepoChatStream>>;

  try {
    completion = await createRepoChatStream({
      context,
      question: body.data.message,
      signal: abortController.signal,
    });
  } catch (error) {
    clearTimeout(timeout);
    logServerError("Unable to start repo chat stream", {
      error: error instanceof Error ? error : new Error("Unknown chat error"),
      model: getRepoChatModel(),
      repoId: id,
      timedOut: didTimeout,
      userId: auth.session.user.id,
    });
    return Response.json(
      {
        error: formatChatStreamError(error, didTimeout),
      },
      { status: 503 },
    );
  }

  let assistantContent = "";
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

          assistantContent += content;
          controller.enqueue(encoder.encode(content));
        }
      } catch (error) {
        const errorMessage = formatChatStreamError(
          error,
          didTimeout || abortController.signal.aborted,
        );
        const fallback = assistantContent.trim()
          ? `\n\n${errorMessage}`
          : errorMessage;

        assistantContent += fallback;
        controller.enqueue(encoder.encode(fallback));
      } finally {
        clearTimeout(timeout);
      }

      controller.close();

      if (assistantContent.trim()) {
        try {
          await createRepoChatMessage({
            content: assistantContent,
            metadataJson: buildRepoChatResponseMetadata({
              chunks: context.chunks,
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
    return "The chat model did not start responding before the server timeout. Try again in a moment, or configure CHAT_MODEL to a faster NVIDIA-hosted model.";
  }

  if (error instanceof Error) {
    return "Repo chat stopped before finishing because the AI provider did not return a complete response. Try again in a moment.";
  }

  return "Repo chat stopped before finishing. Try again in a moment.";
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
