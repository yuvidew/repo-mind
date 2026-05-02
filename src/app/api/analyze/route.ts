import type { AnalysisMode } from "@/lib/analysis-types";
import { analyzeRepository } from "@/lib/repo-analyzer";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(request: Request) {
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

    const analysis = await analyzeRepository(url, { mode });
    return Response.json(analysis);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to analyze this repository.";
    return Response.json({ error: message }, { status: 500 });
  }
}
