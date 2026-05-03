export type ParsedGitHubRepoUrl = {
  owner: string;
  name: string;
  normalizedUrl: string;
};

export function parseGitHubRepoUrl(input: string): ParsedGitHubRepoUrl | null {
  try {
    const parsedUrl = new URL(input.trim());
    const isGitHub =
      parsedUrl.hostname === "github.com" ||
      parsedUrl.hostname === "www.github.com";
    const [owner, repo] = parsedUrl.pathname.split("/").filter(Boolean);

    if (!isGitHub || !owner || !repo) {
      return null;
    }

    const name = repo.replace(/\.git$/, "");

    parsedUrl.hash = "";
    parsedUrl.search = "";
    parsedUrl.hostname = "github.com";
    parsedUrl.pathname = `/${owner}/${name}`;

    return {
      owner,
      name,
      normalizedUrl: parsedUrl.toString(),
    };
  } catch {
    return null;
  }
}
