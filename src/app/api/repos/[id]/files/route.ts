import { z } from "zod";
import { requireApiAuth } from "@/lib/auth-utils";
import {
  getRepoFileWithLazyContentForUser,
  listRepoFilesForUser,
} from "@/lib/repos/repo-service";

export const runtime = "nodejs";

type RepoFilesRouteContext = {
  params: Promise<{ id: string }>;
};

const filePathSchema = z.string().trim().min(1).max(2000);

export async function GET(request: Request, { params }: RepoFilesRouteContext) {
  const auth = await requireApiAuth(request);

  if (auth.error) {
    return Response.json({ error: auth.error }, { status: 401 });
  }

  const { id } = await params;
  const url = new URL(request.url);
  const requestedPath = url.searchParams.get("path");

  if (requestedPath) {
    const parsedPath = filePathSchema.safeParse(requestedPath);

    if (!parsedPath.success) {
      return Response.json({ error: "Invalid file path." }, { status: 400 });
    }

    const file = await getRepoFileWithLazyContentForUser({
      path: parsedPath.data,
      repoId: id,
      userId: auth.session.user.id,
    });

    if (!file) {
      return Response.json({ error: "File not found." }, { status: 404 });
    }

    return Response.json({ file });
  }

  const files = await listRepoFilesForUser({
    repoId: id,
    userId: auth.session.user.id,
  });

  if (!files) {
    return Response.json({ error: "Repository not found." }, { status: 404 });
  }

  return Response.json({ files });
}
