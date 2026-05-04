import { Inngest } from "inngest";

const isInngestDev = process.env.NODE_ENV !== "production";

export const inngest = new Inngest({
  id: "repomind",
  isDev: isInngestDev,
  eventKey: process.env.INNGEST_EVENT_KEY,
  baseUrl: isInngestDev ? "http://localhost:8288" : undefined,
});
