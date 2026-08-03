import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { normalizePostgresSslMode } from "./postgres-url";
import { serverConfig } from "./server-config";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

const adapter = new PrismaPg({
  connectionString: normalizePostgresSslMode(serverConfig.database.url),
});
const cachedPrisma = globalForPrisma.prisma;
const prisma =
  cachedPrisma &&
  "repo" in cachedPrisma &&
  "chatMessage" in cachedPrisma &&
  "usageEvent" in cachedPrisma
    ? cachedPrisma
    : new PrismaClient({ adapter });

if (!serverConfig.isProduction) globalForPrisma.prisma = prisma;

export default prisma;
