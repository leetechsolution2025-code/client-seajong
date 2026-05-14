import { PrismaClient } from "@prisma/client";

async function main() {
  const prisma = new PrismaClient();
  try {
    const employees = await prisma.employee.findMany({
      take: 1,
      select: { avatarUrl: true }
    });
    console.log("Success: avatarUrl exists in Prisma Client types and DB.");
    console.log("Result:", employees);
  } catch (err) {
    console.error("Error: avatarUrl is missing from Prisma Client!");
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
