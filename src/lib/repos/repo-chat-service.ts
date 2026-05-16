import "server-only";

import type {
  ChatMessage,
  File,
  Prisma,
  Repo,
} from "@/generated/prisma/client";
import type { RepositoryAnalysis } from "@/lib/analysis-types";
import prisma from "@/lib/db";
import { type RetrievedRepoChunk, retrieveRepoChunks } from "./repo-retrieval";

export type RepoChatMessageRole = "user" | "assistant";

export type RepoChatContext = {
  chunks: RetrievedRepoChunk[];
  files: Pick<File, "path" | "summary">[];
  history: Pick<ChatMessage, "content" | "createdAt" | "id" | "role">[];
  report: RepositoryAnalysis | null;
  repo: Repo;
};

export async function listRepoChatMessages(input: {
  repoId: string;
  userId: string;
}) {
  const repo = await prisma.repo.findFirst({
    where: { id: input.repoId, userId: input.userId },
    select: { id: true },
  });

  if (!repo) return null;

  return prisma.chatMessage.findMany({
    where: { repoId: input.repoId, userId: input.userId },
    orderBy: { createdAt: "asc" },
    select: {
      content: true,
      createdAt: true,
      id: true,
      role: true,
    },
  });
}

export async function getRepoChatContext(input: {
  question: string;
  repoId: string;
  userId: string;
}): Promise<RepoChatContext | null> {
  const repo = await prisma.repo.findFirst({
    where: { id: input.repoId, userId: input.userId },
  });

  if (!repo) return null;

  const [history, files, chunks] = await Promise.all([
    prisma.chatMessage.findMany({
      where: { repoId: input.repoId, userId: input.userId },
      orderBy: { createdAt: "desc" },
      take: 12,
      select: {
        content: true,
        createdAt: true,
        id: true,
        role: true,
      },
    }),
    prisma.file.findMany({
      where: { repoId: input.repoId, summary: { not: null } },
      orderBy: { path: "asc" },
      take: 40,
      select: {
        path: true,
        summary: true,
      },
    }),
    retrieveRepoChunks({
      question: input.question,
      repoId: input.repoId,
      userId: input.userId,
    }),
  ]);

  return {
    chunks,
    files,
    history: history.reverse(),
    report: parseReport(repo.reportJson),
    repo,
  };
}

export async function createRepoChatMessage(input: {
  content: string;
  metadataJson?: Prisma.InputJsonValue;
  repoId: string;
  role: RepoChatMessageRole;
  userId: string;
}) {
  return prisma.chatMessage.create({
    data: {
      content: input.content,
      metadataJson: input.metadataJson,
      repoId: input.repoId,
      role: input.role,
      userId: input.userId,
    },
    select: {
      content: true,
      createdAt: true,
      id: true,
      role: true,
    },
  });
}

function parseReport(value: unknown): RepositoryAnalysis | null {
  if (!value || typeof value !== "object") return null;
  return value as RepositoryAnalysis;
}
