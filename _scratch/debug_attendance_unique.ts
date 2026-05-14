import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const employeeId = "cmob0i1uv00028onjmakqv32a"; // Nguyễn Văn Hùng
    
    console.log("Testing findUnique with composite key...");
    // @ts-ignore
    const result = await prisma.attendance.findUnique({
      where: {
        employeeId_date: {
          employeeId: employeeId,
          date: today,
        },
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
