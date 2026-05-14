import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  try {
    const count = await prisma.recruitmentRequest.count();
    console.log("Database connection successful. Request count:", count);
  } catch (e) {
    console.error("Database connection failed:", e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
