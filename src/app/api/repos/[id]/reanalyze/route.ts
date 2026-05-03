import { z } from "zod";
import { requireApiAuth } from "@/lib/auth-utils";
import {
  analyzeAndPersistRepo,
  getRepoForUser,
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
  const repo = await getRepoForUser({ id, userId: auth.session.user.id });

  if (!repo) {
    return Response.json({ error: "Repository not found." }, { status: 404 });
  }

  const body = reanalyzeSchema.parse(await request.json().catch(() => ({})));

  void analyzeAndPersistRepo({
    mode: body.mode,
    repoId: repo.id,
    userId: auth.session.user.id,
  }).catch((error) => {
    console.error("Repo reanalysis failed", error);
  });

  return Response.json({ id: repo.id, status: repo.status });
}
