export function buildOwnerScopedRepoWhere(input: {
  repoId: string;
  userId: string;
}) {
  return {
    id: input.repoId,
    userId: input.userId,
  } as const;
}

export function buildOwnerScopedChatMessageWhere(input: {
  repoId: string;
  userId: string;
}) {
  return {
    repoId: input.repoId,
    userId: input.userId,
  } as const;
}
