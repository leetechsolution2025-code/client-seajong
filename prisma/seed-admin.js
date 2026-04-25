/**
 * seed-admin.js — Auto-generated for client: seajong
 * Tạo tài khoản Admin doanh nghiệp duy nhất.
 * Doanh nghiệp dùng tài khoản này để đăng nhập lần đầu.
 *
 * Email:    admin@seajong.vn
 * Password: Admin@123
 */
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  const clientShortName = process.env.CLIENT_SHORT_NAME || 'seajong';
  const clientName = process.env.CLIENT_NAME || 'Công ty cổ phần Seajong Faucet Việt Nam';
  const adminEmail = 'admin@seajong.vn';
  const adminPassword = 'Admin@123';
  // Logo đã được copy vào public/ khi export — chỉ cần lưu path tĩnh vào DB
  const logoUrl = '/uploads/logo_1777138276299.png';

  console.log(`🌱 Seeding enterprise admin for: ${clientName}`);

  const hashed = await bcrypt.hash(adminPassword, 12);

  // Đảm bảo Client record tồn tại (với logo)
  const clientRecord = await prisma.client.upsert({
    where: { shortName: clientShortName },
    update: { logoUrl },
    create: {
      name: clientName,
      shortName: clientShortName,
      status: 'active',
      logoUrl,
    },
  });

  // Tạo Admin doanh nghiệp (duy nhất)
  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      password: hashed,
      name: `${clientName} — Admin`,
      role: 'ADMIN',
      clientId: clientRecord.id,
    },
  });

  console.log('');
  console.log('✅ Enterprise Admin seeded successfully!');
  console.log('   Client  :', clientRecord.name, `(${clientRecord.shortName})`);
  console.log('   Email   :', admin.email);
  console.log('   Logo    :', logoUrl || '(none)');
  console.log('   Password: Admin@123');
  console.log('');
  console.log('👉 Đăng nhập tại /login để bắt đầu thiết lập hệ thống.');
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => { console.error('❌ Seed error:', e); prisma.$disconnect(); process.exit(1); });
