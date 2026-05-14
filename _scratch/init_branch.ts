import { prisma } from "../src/lib/prisma";

async function main() {
  const branch = await (prisma as any).branch.create({
    data: {
      name: "Trụ sở chính",
      address: "Hà Nội",
      clientId: "default",
    },
  });
  console.log("Created default branch:", branch);
}

main().catch(console.error).finally(() => prisma.$disconnect());
