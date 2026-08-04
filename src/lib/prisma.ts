import { PrismaClient } from "@prisma/client";

// Force refresh: 2026-08-04
const globalForPrisma = globalThis as unknown as {
  prisma_sales_v5: PrismaClient | undefined; 
}; 

const prismaClientSingleton = () => {
  console.log("Prisma Client initialized with DB:", process.env.DATABASE_URL);
  return new PrismaClient();
};

const prisma = globalForPrisma.prisma_sales_v5 ?? prismaClientSingleton();

export { prisma };
export const db = prisma;

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma_sales_v5 = prisma;
}

export default prisma;
// Force reload
