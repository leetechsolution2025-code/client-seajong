import { PrismaClient } from "@prisma/client";
import "dotenv/config";

const prisma = new PrismaClient();

async function main() {
  const masterPlans = await prisma.masterYearlyPlan.findMany();
  console.log("=== MASTER YEARLY PLANS ===");
  for (const p of masterPlans) {
    console.log(`Year: ${p.year}, Status: ${p.status}`);
    try {
      const data = JSON.parse(p.planData || "{}");
      console.log("mkt_monthly_plans states:");
      if (data.mkt_monthly_plans) {
        for (const [m, plan] of Object.entries(data.mkt_monthly_plans) as any) {
          console.log(`  Month ${m}: status = ${plan.status}, code = ${plan.code}`);
        }
      }
      console.log("mkt_proposals states:");
      if (data.mkt_proposals) {
        for (const [m, prop] of Object.entries(data.mkt_proposals) as any) {
          console.log(`  Month ${m}: status = ${prop.status}, code = ${prop.code}`);
        }
      }
    } catch (e) {
      console.error("Error parsing planData:", e);
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
