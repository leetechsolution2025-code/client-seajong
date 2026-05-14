import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    console.log("Checking attendance model...");
    // @ts-ignore
    console.log("Attendance keys:", Object.keys(prisma).filter(k => k.toLowerCase().includes('attendance')));
    
    // @ts-ignore
    const count = await prisma.attendance.count();
    console.log("Attendance count:", count);
  } catch (error) {
    console.error("Prisma error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
