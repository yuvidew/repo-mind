import { Inngest } from "inngest";
import { serverConfig } from "@/lib/server-config";

const isInngestDev = !serverConfig.isProduction;

export const inngest = new Inngest({
  id: "repomind",
  isDev: isInngestDev,
  eventKey: serverConfig.inngest.eventKey,
  baseUrl: isInngestDev ? "http://localhost:8288" : undefined,
});
