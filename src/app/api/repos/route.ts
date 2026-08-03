import { z } from "zod";
import {
  getRepoAnalysisQueueErrorMessage,
  queueRepoAnalysis,
} from "@/inngest/queue";
import { requireApiAuth } from "@/lib/auth-utils";
import { toApiErrorResponse } from "@/lib/public-errors";
import { createRepoForUser, markRepoFailed } from "@/lib/repos/repo-service";
import { assertUsageAvailable, recordUsageEvent } from "@/lib/usage-limits";

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
    const body = createRepoSchema.safeParse(
      await request.json().catch(() => null),
    );

    if (!body.success) {
      return Response.json(
        { error: "Enter a GitHub repository URL to analyze." },
        { status: 400 },
      );
    }

    await assertUsageAvailable({
      type: "REPO_ANALYSIS",
      userId: auth.session.user.id,
    });

    const repo = await createRepoForUser({
      mode: body.data.mode,
      url: body.data.url,
      userId: auth.session.user.id,
    });

    try {
      await queueRepoAnalysis({
        mode: body.data.mode,
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

    await recordUsageEvent({
      repoId: repo.id,
      type: "REPO_ANALYSIS",
      userId: auth.session.user.id,
    });

    return Response.json({ id: repo.id, status: repo.status });
  } catch (error) {
    return toApiErrorResponse(error, {
      fallbackMessage: "Unable to create repository.",
      fallbackStatus: 400,
    });
  }
}
