/**
 * fix-client-shortname.js
 * Sửa shortName của client trong DB.
 * Chạy: node prisma/fix-client-shortname.js
 */
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  // Tìm client theo shortName cũ hoặc tên công ty
  const client = await prisma.client.findFirst({
    where: {
      OR: [
        { shortName: "seajong" },
        { name: { contains: "Hào Nhài" } },
        { name: { contains: "Hao Nhai" } },
      ],
    },
  });

  if (!client) {
    console.log("❌ Không tìm thấy client. Danh sách client hiện có:");
    const all = await prisma.client.findMany({ select: { id: true, name: true, shortName: true } });
    console.table(all);
    return;
  }

  console.log("🔍 Tìm thấy client:");
  console.log(`   Tên    : ${client.name}`);
  console.log(`   shortName cũ: ${client.shortName}`);

  const newShortName = "haonhai"; // ← Sửa tại đây nếu muốn tên khác

  const updated = await prisma.client.update({
    where: { id: client.id },
    data: { shortName: newShortName },
  });

  console.log(`\n✅ Đã cập nhật shortName: "${client.shortName}" → "${updated.shortName}"`);
  console.log(`   Email admin mới: admin@${newShortName}.vn`);
  console.log(`\n⚠️  Nếu còn user có email @${client.shortName}.vn, chạy thêm script bên dưới để cập nhật.`);

  // Cập nhật email của các user thuộc client này
  const users = await prisma.user.findMany({
    where: { clientId: client.id },
  });

  for (const user of users) {
    if (user.email.endsWith(`@${client.shortName}.com`) || user.email.endsWith(`@${client.shortName}.vn`)) {
      const namePart = user.email.split("@")[0];
      const newEmail = `${namePart}@${newShortName}.vn`;
      await prisma.user.update({
        where: { id: user.id },
        data: { email: newEmail },
      });
      console.log(`   Email cập nhật: ${user.email} → ${newEmail}`);
    }
  }
}

main()
  .catch((e) => { console.error("❌ Lỗi:", e); process.exit(1); })
  .finally(() => prisma.$disconnect());
