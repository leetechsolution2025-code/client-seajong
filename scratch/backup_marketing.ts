import { PrismaClient } from "@prisma/client";
import fs from "fs";

const prisma = new PrismaClient();

async function main() {
  const data = {
    plans: await prisma.marketingYearlyPlan.findMany(),
    general: await prisma.marketingGeneralPlan.findMany(),
    goals: await prisma.marketingYearlyGoal.findMany(),
    tasks: await prisma.marketingYearlyTask.findMany(),
    outlines: await prisma.outlineMarketingPlan.findMany(),
    execution: await prisma.marketingExecutionMonth.findMany({
      include: {
        groups: {
          include: { tasks: true }
        }
      }
    })
  };
  fs.writeFileSync("/Users/leanhvan/master-project/scratch/marketing_backup.json", JSON.stringify(data, null, 2));
  console.log("Backup completed!");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
