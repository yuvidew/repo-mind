import { z } from "zod";
import {
  getRepoAnalysisQueueErrorMessage,
  queueRepoAnalysis,
} from "@/inngest/queue";
import { requireApiAuth } from "@/lib/auth-utils";
import { createRepoForUser, markRepoFailed } from "@/lib/repos/repo-service";

export const runtime = "nodejs";
export const maxDuration = 120;

const createRepoSchema = z.object({
  mode: z.enum(["fast", "deep"]).default("fast"),
  url: z.string().min(1),
});

export async function POST(request: Request) {
  const auth = await requireApiAuth(request);

  if (auth.error) {
    return Response.json({ error: auth.error }, { status: 401 });
  }

  try {
    const body = createRepoSchema.parse(await request.json());
    const repo = await createRepoForUser({
      mode: body.mode,
      url: body.url,
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

      return Response.json({
        id: repo.id,
        status: "FAILED",
        warning: message,
      });
    }

    return Response.json({ id: repo.id, status: repo.status });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to create repository.";
    return Response.json({ error: message }, { status: 400 });
  }
}
