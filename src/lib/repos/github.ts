type GitHubRepoMetadata = {
  default_branch: string;
  description: string | null;
  full_name: string;
  html_url: string;
  language: string | null;
  name: string;
  private: boolean;
};

type GitHubBranchMetadata = {
  commit?: {
    sha?: string;
  };
};

type GitHubRequestOptions = {
  accessToken?: string | null;
};

export class GitHubRequestError extends Error {
  body: string;
  status: number;

  constructor(input: { body: string; message: string; status: number }) {
    super(input.message);
    this.name = "GitHubRequestError";
    this.body = input.body;
    this.status = input.status;
  }
}

export async function fetchGitHubRepoMetadata(
  owner: string,
  name: string,
  options: GitHubRequestOptions = {},
) {
  const response = await fetch(
    `https://api.github.com/repos/${owner}/${name}`,
    {
      headers: getGitHubHeaders(options.accessToken),
      cache: "no-store",
    },
  );

  if (!response.ok) {
    const message = await response.text();
    throw new GitHubRequestError({
      body: message,
      message: getGitHubRequestErrorMessage({
        action: "repository lookup",
        message,
        status: response.status,
      }),
      status: response.status,
    });
  }

  return (await response.json()) as GitHubRepoMetadata;
}

export async function fetchGitHubBranchCommitSha(input: {
  accessToken?: string | null;
  branch: string;
  name: string;
  owner: string;
}) {
  const response = await fetch(
    `https://api.github.com/repos/${input.owner}/${input.name}/branches/${encodeURIComponent(input.branch)}`,
    {
      headers: getGitHubHeaders(input.accessToken),
      cache: "no-store",
    },
  );

  if (!response.ok) {
    const message = await response.text();
    throw new GitHubRequestError({
      body: message,
      message: getGitHubRequestErrorMessage({
        action: "branch lookup",
        message,
        status: response.status,
      }),
      status: response.status,
    });
  }

  const data = (await response.json()) as GitHubBranchMetadata;
  return data.commit?.sha ?? null;
}

export async function fetchGitHubRawFile(input: {
  accessToken?: string | null;
  branch: string;
  maxChars?: number;
  name: string;
  owner: string;
  path: string;
}) {
  const response = await fetch(
    `https://api.github.com/repos/${input.owner}/${input.name}/contents/${encodeGitHubPath(input.path)}?ref=${encodeURIComponent(input.branch)}`,
    {
      headers: getGitHubHeaders(input.accessToken, {
        Accept: "application/vnd.github.raw",
      }),
      cache: "no-store",
    },
  );

  if (!response.ok) return null;

  const content = await response.text();
  return content.slice(0, input.maxChars ?? 200_000);
}

function encodeGitHubPath(value: string) {
  return value.split("/").map(encodeURIComponent).join("/");
}

function getGitHubHeaders(
  accessToken?: string | null,
  overrides: Record<string, string> = {},
) {
  const token = accessToken?.trim() || process.env.GITHUB_TOKEN?.trim();
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "RepoMind",
    "X-GitHub-Api-Version": "2022-11-28",
    ...overrides,
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
}

function getGitHubRequestErrorMessage(input: {
  action: string;
  message: string;
  status: number;
}) {
  const message = input.message.slice(0, 180);

  if (input.status === 401) {
    return "GitHub access failed because the saved token is invalid. Reconnect GitHub, then try again.";
  }

  if (input.status === 403) {
    return `GitHub ${input.action} failed because access was denied or rate limited. ${message}`;
  }

  if (input.status === 404) {
    return `GitHub ${input.action} failed because the repository was not found or is not accessible.`;
  }

  return `GitHub ${input.action} failed (${input.status}): ${message}`;
}
