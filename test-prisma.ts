import { PrismaClient } from "@prisma/client";
import "dotenv/config";

console.log("DATABASE_URL:", process.env.DATABASE_URL);

const prisma = new PrismaClient();

async function test() {
  try {
    const modules = await prisma.module.findMany();
    console.log("Modules found:", modules.length);
  } catch (e) {
    console.error("Test failed:", e);
  } finally {
    await prisma.$disconnect();
  }
}

test();
