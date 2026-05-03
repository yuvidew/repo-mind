import { requireApiAuth } from "@/lib/auth-utils";
import { getRepoForUser } from "@/lib/repos/repo-service";

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
  const repo = await getRepoForUser({ id, userId: auth.session.user.id });

  if (!repo) {
    return Response.json({ error: "Repository not found." }, { status: 404 });
  }

  return Response.json({
    errorMsg: repo.errorMsg,
    id: repo.id,
    progress: repo.progress,
    status: repo.status,
    updatedAt: repo.updatedAt,
  });
}
