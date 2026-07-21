import { PrismaClient } from "@prisma/client";

// Force refresh: 2026-07-21 (Force refresh Sales schemas)
const globalForPrisma = globalThis as unknown as {
  prisma_sales_v3: PrismaClient | undefined; 
}; 

const prismaClientSingleton = () => {
  console.log("Prisma Client initialized with DB:", process.env.DATABASE_URL);
  return new PrismaClient();
};

const prisma = globalForPrisma.prisma_sales_v3 ?? prismaClientSingleton();

export { prisma };
export const db = prisma;

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma_sales_v3 = prisma;
}

export default prisma;
// Force reload
