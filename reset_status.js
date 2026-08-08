const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const candidate = await prisma.candidate.findFirst({
    where: { name: { contains: 'Nguyễn Mỹ Lan' } }
  });
  if (candidate) {
    await prisma.candidate.update({
      where: { id: candidate.id },
      data: { status: 'New' } // Change back to New
    });
    console.log("Status reset to New for " + candidate.name);
  }
  
  // also delete the old notification
  await prisma.notification.deleteMany({
    where: { content: { contains: 'Nguyễn Mỹ Lan' } }
  });
  console.log("Deleted old notifications");
}

main().catch(console.error).finally(() => prisma.$disconnect());
