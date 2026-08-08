const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { sendInterviewEmail } = require('./src/lib/mail-utils');

async function main() {
  const config = await prisma.emailConfig.findFirst({ where: { isActive: true } });
  console.log("Active config:", config);
  
  if (!config) {
     console.log("No config");
     return;
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
