import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma_v6_events: PrismaClient | undefined; 
};

export const prisma =
  globalForPrisma.prisma_v6_events ??
  new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma_v6_events = prisma;
// Bumping for schema change 2026-04-23 12:03 - Absolute path enforced
