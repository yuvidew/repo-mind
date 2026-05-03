type GitHubRepoMetadata = {
  default_branch: string;
  description: string | null;
  full_name: string;
  html_url: string;
  language: string | null;
  name: string;
  private: boolean;
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
