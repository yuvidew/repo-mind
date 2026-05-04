import { serve } from "inngest/next";
import { inngest } from "@/inngest/client";
import { analyzeRepo } from "@/inngest/functions/analyze-repo";

export const runtime = "nodejs";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [analyzeRepo],
});
