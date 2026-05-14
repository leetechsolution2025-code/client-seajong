import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Đang xoá dữ liệu bảng Thông báo...");
  
  // Xoá Recipient trước vì có quan hệ khóa ngoại
  const recipients = await prisma.notificationRecipient.deleteMany({});
  console.log(`Đã xoá ${recipients.count} bản ghi người nhận thông báo.`);
  
  const notifications = await prisma.notification.deleteMany({});
  console.log(`Đã xoá ${notifications.count} bản ghi thông báo.`);
  
  console.log("Xoá dữ liệu hoàn tất.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
