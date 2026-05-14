import { PrismaClient } from "@prisma/client";

// Force refresh: 2026-05-13 (Active field update)
const globalForPrisma = globalThis as unknown as {
  prisma_smtp_v1: PrismaClient | undefined; 
}; 

const prismaClientSingleton = () => {
  return new PrismaClient();
};

const prisma = prismaClientSingleton();

export { prisma };
export const db = prisma;

if (process.env.NODE_ENV !== "production") {
  (globalThis as any).prisma_smtp_v1 = prisma;
}

export default prisma;
