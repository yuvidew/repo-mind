import { z } from "zod";
import {
  getRepoAnalysisQueueErrorMessage,
  queueRepoAnalysis,
} from "@/inngest/queue";
import { requireApiAuth } from "@/lib/auth-utils";
import { isGitHubCredentialError } from "@/lib/repos/github-credentials";
import {
  markRepoFailed,
  resetRepoAnalysis,
  verifyRepoGitHubAccessForUser,
} from "@/lib/repos/repo-service";

export const runtime = "nodejs";
export const maxDuration = 120;

type RepoReanalyzeRouteContext = {
  params: Promise<{ id: string }>;
};

const reanalyzeSchema = z.object({
  mode: z.enum(["fast", "deep"]).default("fast"),
});

export async function POST(
  request: Request,
  { params }: RepoReanalyzeRouteContext,
) {
  const auth = await requireApiAuth(request);

  if (auth.error) {
    return Response.json({ error: auth.error }, { status: 401 });
  }

  const { id } = await params;
  let repo: Awaited<ReturnType<typeof verifyRepoGitHubAccessForUser>>;

  try {
    repo = await verifyRepoGitHubAccessForUser({
      repoId: id,
      userId: auth.session.user.id,
    });
  } catch (error) {
    if (isGitHubCredentialError(error)) {
      return Response.json({ error: error.message }, { status: error.status });
    }

    throw error;
  }

  if (!repo) {
    return Response.json({ error: "Repository not found." }, { status: 404 });
  }

  const body = reanalyzeSchema.parse(await request.json().catch(() => ({})));
  const updatedRepo = await resetRepoAnalysis({
    mode: body.mode,
    repoId: repo.id,
    userId: auth.session.user.id,
  });

  try {
    await queueRepoAnalysis({
      mode: body.mode,
      repoId: repo.id,
      userId: auth.session.user.id,
    });
  } catch {
    const message = getRepoAnalysisQueueErrorMessage();
    await markRepoFailed({ error: new Error(message), repoId: repo.id });

    return Response.json({ error: message }, { status: 503 });
  }

  return Response.json({ id: repo.id, status: updatedRepo.status });
}
