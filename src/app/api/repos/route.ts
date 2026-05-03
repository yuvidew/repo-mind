import { z } from "zod";
import { requireApiAuth } from "@/lib/auth-utils";
import {
  analyzeAndPersistRepo,
  createRepoForUser,
} from "@/lib/repos/repo-service";

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

    void analyzeAndPersistRepo({
      mode: body.mode,
      repoId: repo.id,
      userId: auth.session.user.id,
    }).catch((error) => {
      console.error("Repo analysis failed", error);
    });

    return Response.json({ id: repo.id, status: repo.status });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to create repository.";
    return Response.json({ error: message }, { status: 400 });
  }
}
