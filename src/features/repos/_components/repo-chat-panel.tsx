"use client";

import { Bot, Loader2, RefreshCw, Send } from "lucide-react";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type { DemoRepo } from "./repo-demo-data";

type RepoChatPanelProps = {
  repo: DemoRepo;
};

type ChatMessage = {
  content: string;
  createdAt?: string;
  id: string;
  role: "assistant" | "user";
};

const examplePrompts = [
  "What does this repository do?",
  "Which files should I read first?",
  "Explain the architecture simply.",
];

export const RepoChatPanel = ({ repo }: RepoChatPanelProps) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoadingInitial, setIsLoadingInitial] = useState(true);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFailedMessage, setLastFailedMessage] = useState<string | null>(
    null,
  );
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const lastScrollKeyRef = useRef("");
  const isReady = repo.status === "READY";
  const lastMessage = messages.at(-1);
  const scrollKey = `${messages.length}:${lastMessage?.id ?? ""}:${lastMessage?.content.length ?? 0}`;

  useEffect(() => {
    let isMounted = true;

    async function loadMessages() {
      setIsLoadingInitial(true);
      setError(null);

      try {
        const response = await fetch(`/api/repos/${repo.id}/chat`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error ?? "Unable to load repo chat.");
        }

        if (isMounted) {
          setMessages(data.messages ?? []);
        }
      } catch (loadError) {
        if (isMounted) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Unable to load repo chat.",
          );
        }
      } finally {
        if (isMounted) {
          setIsLoadingInitial(false);
        }
      }
    }

    loadMessages();

    return () => {
      isMounted = false;
    };
  }, [repo.id]);

  useEffect(() => {
    if (lastScrollKeyRef.current === scrollKey) return;

    lastScrollKeyRef.current = scrollKey;

    const viewport = bottomRef.current?.closest(
      "[data-slot='scroll-area-viewport']",
    );

    if (viewport) {
      viewport.scrollTo({ top: viewport.scrollHeight, behavior: "smooth" });
    }
  });

  async function sendMessage(messageText: string) {
    const trimmedMessage = messageText.trim();

    if (!(trimmedMessage && isReady) || isStreaming) return;

    const userMessage: ChatMessage = {
      content: trimmedMessage,
      id: `user-${crypto.randomUUID()}`,
      role: "user",
    };
    const assistantId = `assistant-${crypto.randomUUID()}`;
    const assistantMessage: ChatMessage = {
      content: "",
      id: assistantId,
      role: "assistant",
    };

    setInput("");
    setError(null);
    setLastFailedMessage(null);
    setIsStreaming(true);
    setMessages((currentMessages) => [
      ...currentMessages,
      userMessage,
      assistantMessage,
    ]);

    try {
      const response = await fetch(`/api/repos/${repo.id}/chat`, {
        body: JSON.stringify({ message: trimmedMessage }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });

      if (!response.ok || !response.body) {
        throw new Error(await readErrorMessage(response));
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();

        if (done) break;
        if (!value) continue;

        const chunk = decoder.decode(value, { stream: true });
        setMessages((currentMessages) =>
          currentMessages.map((message) =>
            message.id === assistantId
              ? { ...message, content: message.content + chunk }
              : message,
          ),
        );
      }

      const finalChunk = decoder.decode();
      if (finalChunk) {
        setMessages((currentMessages) =>
          currentMessages.map((message) =>
            message.id === assistantId
              ? { ...message, content: message.content + finalChunk }
              : message,
          ),
        );
      }
    } catch (sendError) {
      setError(
        sendError instanceof Error
          ? sendError.message
          : "Unable to send this message.",
      );
      setLastFailedMessage(trimmedMessage);
      setMessages((currentMessages) =>
        currentMessages.filter((message) => message.id !== assistantId),
      );
      setInput(trimmedMessage);
    } finally {
      setIsStreaming(false);
    }
  }

  return (
    <aside className="lg:sticky lg:top-6">
      <Card className="h-[min(640px,calc(100vh-3rem))] min-h-110 overflow-hidden p-0">
        <div className="flex h-full min-h-0 flex-col p-4">
          <div className="border-b pb-3">
            <h2 className="font-semibold">Repo chat</h2>
            <p className="text-muted-foreground text-sm">
              Ask about {repo.owner}/{repo.name}
            </p>
          </div>

          <ScrollArea className="my-3 min-h-0 flex-1 overflow-hidden pr-3 **:data-[slot=scroll-area-scrollbar]:w-1.5 **:data-[slot=scroll-area-thumb]:bg-muted-foreground/25 **:data-[slot=scroll-area-thumb]:hover:bg-muted-foreground/45 **:data-[slot=scroll-area-viewport]:pb-4 **:data-[slot=scroll-area-viewport]:pr-2">
            {isLoadingInitial ? (
              <div className="flex h-full min-h-64 flex-col items-center justify-center gap-3 text-muted-foreground text-sm">
                <Loader2 className="size-5 animate-spin" />
                Loading chat history
              </div>
            ) : messages.length > 0 ? (
              <div className="space-y-3 pb-1">
                {messages.map((message) => (
                  <div
                    className={cn(
                      "flex",
                      message.role === "user" ? "justify-end" : "justify-start",
                    )}
                    key={message.id}
                  >
                    <div
                      className={cn(
                        "min-w-0 overflow-hidden rounded-lg px-3 py-2 text-sm leading-6 wrap-anywhere",
                        message.role === "user"
                          ? "max-w-[86%] bg-primary text-primary-foreground"
                          : "max-w-full border bg-muted/40 text-foreground",
                      )}
                    >
                      {message.content ? (
                        <ChatMessageContent content={message.content} />
                      ) : (
                        <span className="inline-flex items-center gap-2 text-muted-foreground">
                          <Loader2 className="size-3.5 animate-spin" />
                          Thinking
                        </span>
                      )}
                    </div>
                  </div>
                ))}
                <div ref={bottomRef} />
              </div>
            ) : (
              <div className="flex h-full min-h-64 flex-col items-center justify-center text-center">
                <div className="mb-4 flex size-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Bot className="size-6" />
                </div>
                <p className="font-medium">Ask about this repository</p>
                <p className="mt-2 max-w-56 text-muted-foreground text-sm leading-6">
                  Get answers from the saved analysis for {repo.owner}/
                  {repo.name}.
                </p>
                <div className="mt-4 flex flex-col gap-2">
                  {examplePrompts.map((prompt) => (
                    <Button
                      className="h-auto justify-start whitespace-normal text-left"
                      disabled={!isReady || isStreaming}
                      key={prompt}
                      onClick={() => sendMessage(prompt)}
                      size="sm"
                      type="button"
                      variant="outline"
                    >
                      {prompt}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </ScrollArea>

          <form
            className="shrink-0 space-y-2 border-t bg-card pt-3"
            onSubmit={(event) => {
              event.preventDefault();
              sendMessage(input);
            }}
          >
            {error ? (
              <div className="flex flex-wrap items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-destructive text-xs">
                <p className="min-w-0 flex-1">{error}</p>
                {lastFailedMessage ? (
                  <Button
                    className="h-7 border-destructive/30 px-2 text-xs"
                    disabled={isStreaming || !isReady}
                    onClick={() => sendMessage(lastFailedMessage)}
                    type="button"
                    variant="outline"
                  >
                    <RefreshCw className="size-3" />
                    Retry
                  </Button>
                ) : null}
              </div>
            ) : null}
            <div className="flex gap-2">
              <Input
                disabled={!isReady || isStreaming}
                onChange={(event) => setInput(event.target.value)}
                placeholder={
                  isReady
                    ? "Ask about this repository"
                    : "Analysis is not ready"
                }
                value={input}
              />
              <Button
                disabled={!input.trim() || !isReady || isStreaming}
                size="icon"
                type="submit"
              >
                {isStreaming ? <Loader2 className="animate-spin" /> : <Send />}
                <span className="sr-only">Send</span>
              </Button>
            </div>
            <p className="text-center text-muted-foreground text-xs">
              {isReady
                ? "Answers stream from the saved repo analysis."
                : "Chat unlocks when analysis is ready."}
            </p>
          </form>
        </div>
      </Card>
    </aside>
  );
};

async function readErrorMessage(response: Response) {
  const fallback = "Unable to send this message.";

  try {
    const contentType = response.headers.get("content-type") ?? "";

    if (contentType.includes("application/json")) {
      const data = await response.json();
      return data.error ?? fallback;
    }

    const text = await response.text();
    return text || fallback;
  } catch {
    return fallback;
  }
}

function ChatMessageContent({ content }: { content: string }) {
  const blocks = stripThinkingNotice(content)
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);
  const keyedBlocks = toKeyedValues(blocks);

  return (
    <div className="min-w-0 space-y-3 wrap-anywhere">
      {keyedBlocks.map(({ key, value }) => (
        <ChatMessageBlock block={value} key={key} />
      ))}
    </div>
  );
}

function stripThinkingNotice(content: string) {
  return content.replace(
    /^Thinking through the saved repository analysis\.\.\.\s*/,
    "",
  );
}

function ChatMessageBlock({ block }: { block: string }) {
  const lines = block
    .split("\n")
    .map((line) => line.trimEnd())
    .filter(Boolean);

  if (isMarkdownTable(lines)) {
    return <MarkdownTable lines={lines} />;
  }

  if (lines.every((line) => /^\d+\.\s+/.test(line))) {
    return (
      <ol className="list-decimal space-y-1 pl-5">
        {toKeyedValues(lines).map(({ key, value: line }) => {
          const text = line.replace(/^\d+\.\s+/, "");
          return <li key={key}>{renderInline(text)}</li>;
        })}
      </ol>
    );
  }

  if (lines.every((line) => /^[-*]\s+/.test(line))) {
    return (
      <ul className="list-disc space-y-1 pl-5">
        {toKeyedValues(lines).map(({ key, value: line }) => {
          const text = line.replace(/^[-*]\s+/, "");
          return <li key={key}>{renderInline(text)}</li>;
        })}
      </ul>
    );
  }

  return <p className="whitespace-pre-wrap">{renderInline(block)}</p>;
}

function MarkdownTable({ lines }: { lines: string[] }) {
  const [headerLine, , ...bodyLines] = lines;
  const headers = parseTableCells(headerLine ?? "");
  const keyedHeaders = toKeyedValues(headers);
  const keyedBodyLines = toKeyedValues(bodyLines);

  return (
    <div className="max-w-full overflow-hidden rounded-md border bg-background/60">
      <table className="w-full table-fixed text-left text-xs leading-5 [&_code]:whitespace-normal [&_code]:break-words [&_strong]:break-words">
        <thead className="bg-muted/60">
          <tr>
            {keyedHeaders.map(({ key, value: header }, index) => (
              <th
                className="border-b px-2 py-1.5 font-medium whitespace-normal"
                key={key}
                style={{
                  width: getChatTableColumnWidth(index, headers.length),
                }}
              >
                {renderInline(header)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {keyedBodyLines.map(({ key, value: line }) => {
            const cells = parseTableCells(line);
            const keyedCells = toKeyedValues(cells);
            return (
              <tr key={key}>
                {keyedCells.map(({ key: cellKey, value: cell }) => (
                  <td
                    className="border-t px-2 py-1.5 align-top whitespace-normal break-words"
                    key={cellKey}
                  >
                    {renderInline(cell)}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function getChatTableColumnWidth(index: number, columnCount: number) {
  if (columnCount === 2) {
    return index === 0 ? "52%" : "48%";
  }

  return `${100 / columnCount}%`;
}

function isMarkdownTable(lines: string[]) {
  return (
    lines.length >= 2 &&
    lines[0]?.includes("|") &&
    /^\s*\|?[\s:-]+\|/.test(lines[1] ?? "")
  );
}

function parseTableCells(line: string) {
  return line
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim());
}

function renderInline(value: string): ReactNode[] {
  return toKeyedValues(
    value.split(/(`[^`]+`|\*\*[^*]+\*\*)/g).filter(Boolean),
  ).map(({ key, value: part }) => {
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code
          className="rounded bg-muted px-1 py-0.5 font-mono text-[0.85em]"
          key={key}
        >
          {part.slice(1, -1)}
        </code>
      );
    }

    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={key}>{part.slice(2, -2)}</strong>;
    }

    return part;
  });
}

function toKeyedValues(values: string[]) {
  const counts = new Map<string, number>();

  return values.map((value) => {
    const baseKey = hashString(value);
    const count = (counts.get(baseKey) ?? 0) + 1;
    counts.set(baseKey, count);

    return { key: `${baseKey}-${count}`, value };
  });
}

function hashString(value: string) {
  let hash = 0;

  for (let charIndex = 0; charIndex < value.length; charIndex += 1) {
    hash = (hash * 31 + value.charCodeAt(charIndex)) >>> 0;
  }

  return hash.toString(36);
}
