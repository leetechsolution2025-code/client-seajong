/**
 * seed-branches.js — Auto-generated for client: seajong
 * Khởi tạo chi nhánh. Chạy 1 lần khi setup.
 * Tổng: 0 chi nhánh.
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const branches = [];

async function main() {
  if (branches.length === 0) { console.log('ℹ️  Không có chi nhánh'); return; }
  console.log('🌱 Seeding ' + branches.length + ' branches...');
  for (const b of branches) {
    await prisma.branch.upsert({ where: { code: b.code }, update: b, create: b });
    console.log('  ✅ ' + b.name);
  }
  console.log('✅ Branches seeded.');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
