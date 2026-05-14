
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Cleaning up notification data...");

  // Delete NotificationRecipient first (dependent on Notification)
  const nrDeleted = await prisma.notificationRecipient.deleteMany({});
  console.log(`Deleted ${nrDeleted.count} notification recipients.`);

  // Delete Notifications
  const nDeleted = await prisma.notification.deleteMany({});
  console.log(`Deleted ${nDeleted.count} notifications.`);

  console.log("Cleanup complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
