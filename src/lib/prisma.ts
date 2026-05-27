import { PrismaClient } from "@prisma/client";

// Force refresh: 2026-05-13 (Active field update)
const globalForPrisma = globalThis as unknown as {
  prisma_smtp_v1: PrismaClient | undefined; 
}; 

const prismaClientSingleton = () => {
  console.log("Prisma Client initialized with DB:", process.env.DATABASE_URL);
  return new PrismaClient();
};

const prisma = globalForPrisma.prisma_smtp_v1 ?? prismaClientSingleton();

export { prisma };
export const db = prisma;

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma_smtp_v1 = prisma;
}

export default prisma;
