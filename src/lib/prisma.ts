import { PrismaClient } from "@prisma/client";

// Force refresh: 2026-07-21 (Force refresh SoftSkillQA schema)
const globalForPrisma = globalThis as unknown as {
  prisma_tax_v2: PrismaClient | undefined; 
}; 

const prismaClientSingleton = () => {
  console.log("Prisma Client initialized with DB:", process.env.DATABASE_URL);
  return new PrismaClient();
};

const prisma = globalForPrisma.prisma_tax_v2 ?? prismaClientSingleton();

export { prisma };
export const db = prisma;

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma_tax_v2 = prisma;
}

export default prisma;
// Force reload
