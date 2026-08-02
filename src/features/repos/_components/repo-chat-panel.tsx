"use client";

import {
  AlertCircle,
  BookOpenText,
  Bot,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Database,
  ExternalLink,
  FileCode2,
  Loader2,
  type LucideIcon,
  MessageSquareText,
  Network,
  RefreshCw,
  Send,
  ShieldAlert,
  Sparkles,
  Square,
} from "lucide-react";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { SourceCitation } from "@/lib/analysis-types";
import { cn } from "@/lib/utils";
import type { DemoRepo } from "./repo-demo-data";

type RepoChatPanelProps = {
  layout?: "side" | "tab";
  repo: DemoRepo;
};

type ChatMessage = {
  content: string;
  createdAt?: string;
  id: string;
  metadataJson?: unknown;
  role: "assistant" | "user";
};

type ChatCitation = SourceCitation & {
  chunkId?: string;
  similarity?: number;
};

type ChatMetadata = {
  citations: ChatCitation[];
  model?: string;
};

const examplePrompts = [
  {
    description: "Get the project purpose without reading every file.",
    icon: BookOpenText,
    prompt: "Summarize this repository in five bullets.",
    title: "Summarize repo",
  },
  {
    description: "Start from the files most likely to matter.",
    icon: FileCode2,
    prompt: "Which files should I read first and why?",
    title: "Find entry points",
  },
  {
    description: "Trace how features move through the system.",
    icon: Network,
    prompt: "Explain the main architecture and data flow.",
    title: "Trace flow",
  },
  {
    description: "Surface areas to verify before changing code.",
    icon: ShieldAlert,
    prompt: "What risks should I check before contributing?",
    title: "Review risks",
  },
] satisfies Array<{
  description: string;
  icon: LucideIcon;
  prompt: string;
  title: string;
}>;

export const RepoChatPanel = ({
  layout = "side",
  repo,
}: RepoChatPanelProps) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoadingInitial, setIsLoadingInitial] = useState(true);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFailedMessage, setLastFailedMessage] = useState<string | null>(
    null,
  );
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const activeRequestRef = useRef<AbortController | null>(null);
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
        const loadedMessages = await fetchRepoChatMessages(repo.id);

        if (isMounted) {
          setMessages(loadedMessages);
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
    const abortController = new AbortController();
    activeRequestRef.current = abortController;

    try {
      const response = await fetch(`/api/repos/${repo.id}/chat`, {
        body: JSON.stringify({ message: trimmedMessage }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
        signal: abortController.signal,
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

      try {
        setMessages(await fetchRepoChatMessages(repo.id));
      } catch {
        // The streamed answer is already visible; persisted citations can load on refresh.
      }
    } catch (sendError) {
      if (abortController.signal.aborted) {
        setMessages((currentMessages) =>
          currentMessages.map((message) =>
            message.id === assistantId
              ? {
                  ...message,
                  content: message.content.trim()
                    ? `${message.content}\n\nStopped by user.`
                    : "Stopped by user.",
                }
              : message,
          ),
        );
        return;
      }

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
      activeRequestRef.current = null;
      setIsStreaming(false);
    }
  }

  function stopStreaming() {
    activeRequestRef.current?.abort();
  }

  return (
    <aside className={cn(layout === "side" && "lg:sticky lg:top-6")}>
      <Card
        className={cn(
          "overflow-hidden border-primary/10 bg-background p-0 shadow-sm",
          layout === "side"
            ? "h-[min(680px,calc(100vh-3rem))] min-h-110"
            : "h-[720px]",
        )}
      >
        <div className="flex h-full min-h-0 flex-col">
          <div className="border-b bg-muted/20 p-4">
            <div className="flex items-start gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Bot className="size-5" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-semibold">Repo chat</h2>
                  <Badge variant={isReady ? "secondary" : "outline"}>
                    {isReady ? "Grounded" : "Locked"}
                  </Badge>
                </div>
                <p className="truncate text-muted-foreground text-sm">
                  Ask about {repo.owner}/{repo.name}
                </p>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-3">
              <ChatContextPill
                icon={Database}
                label="Saved context"
                value={isReady ? "Ready" : "Locked"}
              />
              <ChatContextPill
                icon={MessageSquareText}
                label="History"
                value={`${messages.length.toLocaleString()} messages`}
              />
              <ChatContextPill
                icon={Sparkles}
                label="Answer mode"
                value="Grounded"
              />
            </div>
          </div>

          <ScrollArea className="min-h-0 flex-1 overflow-hidden px-4 py-3 **:data-[slot=scroll-area-scrollbar]:w-1.5 **:data-[slot=scroll-area-thumb]:bg-muted-foreground/25 **:data-[slot=scroll-area-thumb]:hover:bg-muted-foreground/45 **:data-[slot=scroll-area-viewport]:pb-4 **:data-[slot=scroll-area-viewport]:pr-2">
            {isLoadingInitial ? (
              <div className="flex h-full min-h-64 flex-col items-center justify-center gap-3 text-muted-foreground text-sm">
                <Loader2 className="size-5 animate-spin" />
                Loading chat history
              </div>
            ) : messages.length > 0 ? (
              <div className="space-y-3 pb-1">
                {messages.map((message) => (
                  <ChatMessageRow key={message.id} message={message} />
                ))}
                <div ref={bottomRef} />
              </div>
            ) : (
              <div className="flex h-full min-h-64 flex-col justify-center text-center">
                <div className="mb-4 flex size-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Bot className="size-6" />
                </div>
                <p className="font-medium">Ask with saved repo context</p>
                <p className="mx-auto mt-2 max-w-md text-muted-foreground text-sm leading-6">
                  Get answers from the saved analysis for {repo.owner}/
                  {repo.name}. Source citations open directly in the Files tab.
                </p>
                <div className="mt-5 grid gap-2 text-left md:grid-cols-2">
                  {examplePrompts.map((prompt) => {
                    const Icon = prompt.icon;

                    return (
                      <Button
                        className="h-auto min-h-24 justify-start whitespace-normal rounded-lg p-3 text-left"
                        disabled={!isReady || isStreaming}
                        key={prompt.title}
                        onClick={() => sendMessage(prompt.prompt)}
                        size="sm"
                        type="button"
                        variant="outline"
                      >
                        <span className="flex min-w-0 items-start gap-3">
                          <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                            <Icon className="size-4" />
                          </span>
                          <span className="min-w-0">
                            <span className="block font-medium">
                              {prompt.title}
                            </span>
                            <span className="mt-1 block text-muted-foreground text-xs leading-5">
                              {prompt.description}
                            </span>
                          </span>
                        </span>
                      </Button>
                    );
                  })}
                </div>
              </div>
            )}
          </ScrollArea>

          <form
            className="shrink-0 space-y-2 border-t bg-muted/20 p-4"
            onSubmit={(event) => {
              event.preventDefault();
              sendMessage(input);
            }}
          >
            {error ? (
              <div className="flex flex-wrap items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-destructive text-xs">
                <AlertCircle className="size-3.5 shrink-0" />
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
                className="bg-background"
                onChange={(event) => setInput(event.target.value)}
                placeholder={
                  isReady
                    ? "Ask about this repository"
                    : "Analysis is not ready"
                }
                value={input}
              />
              {isStreaming ? (
                <Button
                  aria-label="Stop response"
                  onClick={stopStreaming}
                  size="icon"
                  type="button"
                  variant="outline"
                >
                  <Square className="size-4" />
                </Button>
              ) : null}
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
                ? "Answers stream from saved repo context. Citations open in Files."
                : "Chat unlocks when analysis is ready."}
            </p>
          </form>
        </div>
      </Card>
    </aside>
  );
};

function ChatContextPill({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0 rounded-md border bg-background/80 px-2.5 py-2">
      <div className="flex min-w-0 items-center gap-1.5 text-muted-foreground">
        <Icon className="size-3.5 shrink-0" />
        <span className="truncate">{label}</span>
      </div>
      <p className="mt-1 truncate font-medium text-foreground">{value}</p>
    </div>
  );
}

function ChatMessageRow({ message }: { message: ChatMessage }) {
  const metadata = normalizeChatMetadata(message.metadataJson);
  const isAssistant = message.role === "assistant";

  return (
    <div
      className={cn(
        "flex gap-2",
        message.role === "user" ? "justify-end" : "justify-start",
      )}
    >
      {isAssistant ? (
        <span className="mt-1 flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Bot className="size-4" />
        </span>
      ) : null}
      <div
        className={cn(
          "min-w-0 overflow-hidden rounded-lg text-sm leading-6 shadow-sm wrap-anywhere",
          message.role === "user"
            ? "max-w-[86%] bg-primary px-3 py-2 text-primary-foreground"
            : "max-w-[calc(100%-2.25rem)] border bg-background text-foreground",
        )}
      >
        {isAssistant ? (
          <AssistantMessageHeader
            citationCount={metadata.citations.length}
            createdAt={message.createdAt}
            model={metadata.model}
          />
        ) : null}
        <div className={cn(isAssistant ? "px-3 py-2" : "")}>
          {message.content ? (
            <>
              <ChatMessageContent content={message.content} />
              {isAssistant ? <ChatMessageSources metadata={metadata} /> : null}
            </>
          ) : (
            <span className="inline-flex items-center gap-2 text-muted-foreground">
              <Loader2 className="size-3.5 animate-spin" />
              Building grounded answer
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function AssistantMessageHeader({
  citationCount,
  createdAt,
  model,
}: {
  citationCount: number;
  createdAt?: string;
  model?: string;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-muted/20 px-3 py-2 text-muted-foreground text-xs">
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1 font-medium text-foreground">
          <CheckCircle2 className="size-3.5 text-primary" />
          Grounded answer
        </span>
        {citationCount > 0 ? (
          <Badge variant="outline">{citationCount} sources</Badge>
        ) : (
          <Badge variant="outline">Context only</Badge>
        )}
      </div>
      <div className="flex min-w-0 items-center gap-2">
        {model ? <span className="max-w-44 truncate">{model}</span> : null}
        {createdAt ? (
          <span className="inline-flex items-center gap-1">
            <Clock3 className="size-3" />
            {formatChatTime(createdAt)}
          </span>
        ) : null}
      </div>
    </div>
  );
}

async function fetchRepoChatMessages(repoId: string) {
  const response = await fetch(`/api/repos/${repoId}/chat`);

  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }

  const data = (await response.json()) as { messages?: ChatMessage[] };
  return data.messages ?? [];
}

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

function ChatMessageSources({ metadata }: { metadata: ChatMetadata }) {
  if (metadata.citations.length === 0) return null;

  return (
    <div className="mt-3 space-y-2 border-t pt-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-medium text-muted-foreground text-[11px] uppercase tracking-normal">
          Grounded sources
        </p>
        <span className="text-muted-foreground text-xs">
          Open source in Files
        </span>
      </div>
      <div className="grid gap-2 md:grid-cols-2">
        {metadata.citations.map((citation) => (
          <ChatSourceCard
            citation={citation}
            key={`${citation.path}-${citation.startLine ?? ""}-${citation.endLine ?? ""}`}
          />
        ))}
      </div>
    </div>
  );
}

function ChatSourceCard({ citation }: { citation: ChatCitation }) {
  const lineLabel = formatCitationLineLabel(citation);
  const sourceLabel = formatCitationSourceLabel(citation.source);

  return (
    <div className="flex min-w-0 items-stretch overflow-hidden rounded-md border bg-muted/10">
      <button
        aria-label={`${citation.path}${lineLabel ? ` ${lineLabel}` : ""} - open in Files`}
        className="group/source min-w-0 flex-1 px-2.5 py-2 text-left transition-colors hover:bg-primary/5"
        onClick={() => openChatCitation(citation)}
        title={citation.path}
        type="button"
      >
        <span className="flex min-w-0 items-start gap-2">
          <FileCode2 className="mt-0.5 size-3.5 shrink-0 text-primary" />
          <span className="min-w-0 flex-1">
            <span className="block truncate font-medium text-xs text-foreground">
              {citation.path}
            </span>
            <span className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px] text-muted-foreground">
              <span className="rounded bg-background px-1.5 py-0.5">
                {sourceLabel}
              </span>
              {lineLabel ? (
                <span className="rounded bg-background px-1.5 py-0.5">
                  {lineLabel}
                </span>
              ) : null}
              {typeof citation.similarity === "number" ? (
                <span className="rounded bg-background px-1.5 py-0.5">
                  {Math.round(citation.similarity * 100)}% match
                </span>
              ) : null}
            </span>
          </span>
          <ChevronRight className="mt-0.5 size-3.5 shrink-0 text-muted-foreground transition-transform group-hover/source:translate-x-0.5" />
        </span>
      </button>
      {citation.url ? (
        <a
          aria-label={`Open ${citation.path} externally`}
          className="flex w-8 shrink-0 items-center justify-center border-l text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          href={citation.url}
          rel="noreferrer"
          target="_blank"
        >
          <ExternalLink className="size-3.5" />
        </a>
      ) : null}
    </div>
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
      <table className="w-full table-fixed text-left text-xs leading-5 [&_code]:whitespace-normal [&_code]:wrap-break-word [&_strong]:wrap-break-word">
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
                    className="border-t px-2 py-1.5 align-top whitespace-normal wrap-break-word"
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

function normalizeChatMetadata(metadataJson: unknown): ChatMetadata {
  if (!metadataJson || typeof metadataJson !== "object") {
    return { citations: [] };
  }

  return {
    citations: normalizeChatCitations(metadataJson),
    model: normalizeMetadataString((metadataJson as { model?: unknown }).model),
  };
}

function normalizeChatCitations(metadataJson: unknown): ChatCitation[] {
  if (!metadataJson || typeof metadataJson !== "object") return [];
  if (!("citations" in metadataJson)) return [];

  const citations = (metadataJson as { citations?: unknown }).citations;

  if (!Array.isArray(citations)) return [];

  const seen = new Set<string>();
  const normalized: ChatCitation[] = [];

  for (const citation of citations) {
    const normalizedCitation = normalizeChatCitation(citation);

    if (!normalizedCitation) continue;

    const key = [
      normalizedCitation.path,
      normalizedCitation.startLine ?? "",
      normalizedCitation.endLine ?? "",
    ].join(":");

    if (seen.has(key)) continue;

    seen.add(key);
    normalized.push(normalizedCitation);
  }

  return normalized.slice(0, 8);
}

function normalizeChatCitation(value: unknown): ChatCitation | null {
  if (!value || typeof value !== "object") return null;

  const citation = value as {
    chunkId?: unknown;
    endLine?: unknown;
    path?: unknown;
    similarity?: unknown;
    source?: unknown;
    startLine?: unknown;
    url?: unknown;
  };

  if (typeof citation.path !== "string" || !citation.path.trim()) {
    return null;
  }

  return {
    chunkId: normalizeMetadataString(citation.chunkId),
    endLine: normalizeLineNumber(citation.endLine),
    path: citation.path,
    similarity: normalizeSimilarity(citation.similarity),
    source: normalizeCitationSource(citation.source),
    startLine: normalizeLineNumber(citation.startLine),
    url: normalizeMetadataString(citation.url),
  };
}

function normalizeMetadataString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function normalizeSimilarity(value: unknown) {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : undefined;
}

function normalizeLineNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.max(1, Math.floor(value))
    : undefined;
}

function normalizeCitationSource(value: unknown): SourceCitation["source"] {
  if (value === "sampled-source") return "sampled-source";

  if (typeof value === "string") {
    if (value.includes("github")) return "github";
    if (value.includes("report")) return "report";
  }

  return "manual";
}

function openChatCitation(citation: ChatCitation) {
  window.dispatchEvent(
    new CustomEvent("repomind:open-file", {
      detail: {
        endLine: citation.endLine,
        path: citation.path,
        startLine: citation.startLine,
      },
    }),
  );

  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(() => {
      document.getElementById("files")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  });
}

function formatCitationLineLabel(citation: ChatCitation) {
  if (!citation.startLine) return "";

  return citation.endLine && citation.endLine !== citation.startLine
    ? `L${citation.startLine}-${citation.endLine}`
    : `L${citation.startLine}`;
}

function formatCitationSourceLabel(source: SourceCitation["source"]) {
  switch (source) {
    case "github":
      return "GitHub";
    case "sampled-source":
      return "Source";
    case "report":
      return "Report";
    default:
      return "Context";
  }
}

function formatChatTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Saved";

  return new Intl.DateTimeFormat("en", {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}
