import { requireApiAuth } from "@/lib/auth-utils";
import {
  getRepoForUser,
  refreshRepoFreshnessForUser,
} from "@/lib/repos/repo-service";

type RepoStatusRouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(
  request: Request,
  { params }: RepoStatusRouteContext,
) {
  const auth = await requireApiAuth(request);

  if (auth.error) {
    return Response.json({ error: auth.error }, { status: 401 });
  }

  const { id } = await params;
  const url = new URL(request.url);
  const shouldRefreshFreshness =
    url.searchParams.get("refreshFreshness") === "1";
  const repo = shouldRefreshFreshness
    ? await refreshRepoFreshnessForUser({
        repoId: id,
        userId: auth.session.user.id,
      })
    : await getRepoForUser({ id, userId: auth.session.user.id });

  if (!repo) {
    return Response.json({ error: "Repository not found." }, { status: 404 });
  }

  return Response.json({
    errorMsg: repo.errorMsg,
    id: repo.id,
    analyzedCommitSha: repo.analyzedCommitSha,
    freshnessStatus: repo.freshnessStatus,
    latestCommitSha: repo.latestCommitSha,
    lastFreshnessCheckAt: repo.lastFreshnessCheckAt,
    progress: repo.progress,
    status: repo.status,
    updatedAt: repo.updatedAt,
  });
}
