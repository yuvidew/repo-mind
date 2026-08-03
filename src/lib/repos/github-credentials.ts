import "server-only";

import { decryptOAuthToken, setTokenUtil } from "better-auth/oauth2";
import { auth } from "@/lib/auth";
import prisma from "@/lib/db";
import { GITHUB_RECONNECT_MESSAGE } from "@/lib/github-auth";

type GitHubCredentialErrorCode =
  | "github-account-missing"
  | "github-token-missing"
  | "github-token-scope-missing"
  | "github-token-unavailable";

type GitHubAccessTokenResult = {
  hasRepoScope: boolean;
  scopes: string[];
  token: string | null;
};

type OAuthTokenContext = Parameters<typeof setTokenUtil>[1] &
  Parameters<typeof decryptOAuthToken>[1];

export class GitHubCredentialError extends Error {
  code: GitHubCredentialErrorCode;
  status: number;

  constructor(code: GitHubCredentialErrorCode, message: string) {
    super(message);
    this.name = "GitHubCredentialError";
    this.code = code;
    this.status = 403;
  }
}

export async function getGitHubAccessTokenForUser(
  userId: string,
): Promise<GitHubAccessTokenResult> {
  const account = await prisma.account.findFirst({
    where: {
      providerId: "github",
      userId,
    },
    select: {
      accessToken: true,
      id: true,
      refreshToken: true,
      scope: true,
    },
  });

  if (!account) {
    return {
      hasRepoScope: false,
      scopes: [],
      token: null,
    };
  }

  try {
    const tokenResult = await auth.api.getAccessToken({
      body: {
        providerId: "github",
        userId,
      },
    });
    const token = tokenResult.accessToken ?? null;
    const scopes = normalizeGitHubScopes(
      tokenResult.scopes?.length ? tokenResult.scopes : account.scope,
    );

    await encryptLegacyPlaintextGithubTokens({
      accessToken: token,
      accountId: account.id,
      currentAccessToken: account.accessToken,
      currentRefreshToken: account.refreshToken,
    });

    return {
      hasRepoScope: scopes.includes("repo"),
      scopes,
      token,
    };
  } catch {
    throw new GitHubCredentialError(
      "github-token-unavailable",
      `Unable to read your GitHub access token. ${GITHUB_RECONNECT_MESSAGE}`,
    );
  }
}

export async function requireGitHubAccessTokenForPrivateRepo(userId: string) {
  const credential = await getGitHubAccessTokenForUser(userId);

  if (!credential.token) {
    throw new GitHubCredentialError(
      "github-token-missing",
      `Private repository access requires GitHub sign-in. ${GITHUB_RECONNECT_MESSAGE}`,
    );
  }

  if (!credential.hasRepoScope) {
    throw new GitHubCredentialError(
      "github-token-scope-missing",
      `Your GitHub connection does not include private repository access. ${GITHUB_RECONNECT_MESSAGE}`,
    );
  }

  return credential.token;
}

export function isGitHubCredentialError(
  error: unknown,
): error is GitHubCredentialError {
  return error instanceof GitHubCredentialError;
}

function normalizeGitHubScopes(value: string[] | string | null | undefined) {
  if (!value) return [];

  const scopes = Array.isArray(value) ? value : value.split(/[,\s]+/);

  return scopes.map((scope) => scope.trim()).filter(Boolean);
}

async function encryptLegacyPlaintextGithubTokens(input: {
  accessToken: string | null;
  accountId: string;
  currentAccessToken: string | null;
  currentRefreshToken: string | null;
}) {
  if (
    !input.accessToken ||
    isLikelyBetterAuthEncrypted(input.currentAccessToken)
  ) {
    return;
  }

  const context = (await auth.$context) as unknown as OAuthTokenContext;
  const encryptedAccessToken = await setTokenUtil(input.accessToken, context);

  if (!encryptedAccessToken) return;

  const data: { accessToken: string; refreshToken?: string } = {
    accessToken: encryptedAccessToken,
  };

  if (
    input.currentRefreshToken &&
    !isLikelyBetterAuthEncrypted(input.currentRefreshToken)
  ) {
    const refreshToken = await decryptOAuthToken(
      input.currentRefreshToken,
      context,
    );
    const encryptedRefreshToken = refreshToken
      ? await setTokenUtil(refreshToken, context)
      : null;

    if (encryptedRefreshToken) {
      data.refreshToken = encryptedRefreshToken;
    }
  }

  await prisma.account.update({
    where: { id: input.accountId },
    data,
  });
}

function isLikelyBetterAuthEncrypted(value: string | null) {
  if (!value) return true;

  return (
    value.startsWith("$ba$") ||
    (value.length % 2 === 0 && /^[0-9a-f]+$/i.test(value))
  );
}
