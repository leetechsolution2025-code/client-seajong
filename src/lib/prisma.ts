import { PrismaClient } from "@prisma/client";

// Force refresh: 2026-06-22 (Force refresh cabinet category model)
const globalForPrisma = globalThis as unknown as {
  prisma_smtp_v8: PrismaClient | undefined; 
}; 

const prismaClientSingleton = () => {
  console.log("Prisma Client initialized with DB:", process.env.DATABASE_URL);
  return new PrismaClient();
};

const prisma = globalForPrisma.prisma_smtp_v8 ?? prismaClientSingleton();

export { prisma };
export const db = prisma;

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma_smtp_v8 = prisma;
}

export default prisma;
