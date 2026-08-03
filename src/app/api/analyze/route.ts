import type { AnalysisMode } from "@/lib/analysis-types";
import { toApiErrorResponse } from "@/lib/public-errors";
import { analyzeRepository } from "@/lib/repo-analyzer";
import { parseGitHubRepoUrl } from "@/lib/repos/repo-url";
import { serverConfig } from "@/lib/server-config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function POST(request: Request) {
  if (serverConfig.isProduction) {
    return Response.json(
      { error: "Direct analysis is disabled in production." },
      { status: 404 },
    );
  }

  try {
    const body = (await request.json()) as { mode?: unknown; url?: unknown };
    const url = typeof body.url === "string" ? body.url : "";
    const mode: AnalysisMode = body.mode === "deep" ? "deep" : "fast";

    if (!url.trim()) {
      return Response.json(
        { error: "Repository URL is required." },
        { status: 400 },
      );
    }

    if (!parseGitHubRepoUrl(url)) {
      return Response.json(
        {
          error:
            "Enter a GitHub repository URL like https://github.com/owner/repo.",
        },
        { status: 400 },
      );
    }

    const analysis = await analyzeRepository(url, { mode });
    return Response.json(analysis);
  } catch (error) {
    return toApiErrorResponse(error, {
      fallbackMessage: "Unable to analyze this repository.",
    });
  }
}
