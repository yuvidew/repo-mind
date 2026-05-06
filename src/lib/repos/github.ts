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

export async function fetchGitHubRepoMetadata(owner: string, name: string) {
  const response = await fetch(
    `https://api.github.com/repos/${owner}/${name}`,
    {
      headers: {
        Accept: "application/vnd.github+json",
        "User-Agent": "RepoMind",
      },
      cache: "no-store",
    },
  );

  if (!response.ok) {
    const message = await response.text();
    throw new Error(
      `GitHub repository lookup failed (${response.status}): ${message.slice(0, 180)}`,
    );
  }

  return (await response.json()) as GitHubRepoMetadata;
}

export async function fetchGitHubBranchCommitSha(input: {
  branch: string;
  name: string;
  owner: string;
}) {
  const response = await fetch(
    `https://api.github.com/repos/${input.owner}/${input.name}/branches/${encodeURIComponent(input.branch)}`,
    {
      headers: {
        Accept: "application/vnd.github+json",
        "User-Agent": "RepoMind",
      },
      cache: "no-store",
    },
  );

  if (!response.ok) {
    const message = await response.text();
    throw new Error(
      `GitHub branch lookup failed (${response.status}): ${message.slice(0, 180)}`,
    );
  }

  const data = (await response.json()) as GitHubBranchMetadata;
  return data.commit?.sha ?? null;
}

export async function fetchGitHubRawFile(input: {
  branch: string;
  maxChars?: number;
  name: string;
  owner: string;
  path: string;
}) {
  const response = await fetch(
    `https://raw.githubusercontent.com/${input.owner}/${input.name}/${encodeGitHubPath(input.branch)}/${encodeGitHubPath(input.path)}`,
    {
      headers: {
        "User-Agent": "RepoMind",
      },
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
