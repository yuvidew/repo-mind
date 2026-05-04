import { z } from "zod";
import { requireApiAuth } from "@/lib/auth-utils";
import { createRepoChatStream } from "@/lib/repos/repo-chat-ai";
import {
  createRepoChatMessage,
  getRepoChatContext,
  listRepoChatMessages,
} from "@/lib/repos/repo-chat-service";

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

  await createRepoChatMessage({
    content: body.data.message,
    repoId: id,
    role: "user",
    userId: auth.session.user.id,
  });

  const abortController = new AbortController();
  const timeout = setTimeout(() => abortController.abort(), CHAT_TIMEOUT_MS);
  let completion: Awaited<ReturnType<typeof createRepoChatStream>>;

  try {
    completion = await createRepoChatStream({
      context,
      question: body.data.message,
      signal: abortController.signal,
    });
  } catch (error) {
    clearTimeout(timeout);
    return Response.json(
      {
        error:
          error instanceof Error ? error.message : "Unable to start repo chat.",
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
        const errorMessage = formatChatStreamError(error);
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
            metadataJson: {
              model: process.env.CHAT_MODEL ?? "openai/gpt-oss-120b",
            },
            repoId: id,
            role: "assistant",
            userId: auth.session.user.id,
          });
        } catch (error) {
          console.error("Unable to persist repo chat response", error);
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

function formatChatStreamError(error: unknown) {
  if (error instanceof DOMException && error.name === "AbortError") {
    return "The chat model took too long to respond. Try again, or set CHAT_MODEL=openai/gpt-oss-20b for faster local testing.";
  }

  if (error instanceof Error) {
    return `Repo chat stopped before finishing: ${error.message}`;
  }

  return "Repo chat stopped before finishing. Try again in a moment.";
}
