import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const employeeId = "cmob0i1uv00028onjmakqv32a";
    
    console.log("Upserting attendance...");
    // @ts-ignore
    const result = await prisma.attendance.upsert({
      where: {
        employeeId_date: {
          employeeId: employeeId,
          date: today,
        },
      },
      update: {
        checkInMorning: new Date(),
      },
      create: {
        employeeId: employeeId,
        date: today,
        checkInMorning: new Date(),
        status: "present",
      },
    });
    console.log("Result:", result);
  } catch (error) {
    console.error("Prisma error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
