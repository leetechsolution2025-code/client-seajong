const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const userId = "cmra9vxh2000d8oq7eyssxqnm"; // Trần Thị Linh
  const recipients = await prisma.notificationRecipient.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: {
      notification: {
        select: {
          id: true,
          title: true,
          content: true,
          type: true,
          priority: true,
          audienceType: true,
          attachments: true,
          createdAt: true,
          createdBy: {
            select: {
              id: true,
              name: true,
              employee: {
                select: { fullName: true, departmentName: true, position: true },
              },
            },
          },
        },
      },
    },
  });

  console.log("RECIPIENTS FOR ACCOUNTING USER:", JSON.stringify(recipients, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
