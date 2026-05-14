/**
 * seed.ts — Dự án con (client-seajong)
 * Chỉ seed modules cơ bản. Không tạo superadmin.
 *
 * Thứ tự seed đầy đủ (npm run setup):
 *   1. seed.ts              → modules
 *   2. seed-departments.js  → phòng ban đã chọn
 *   3. seed-admin.js        → 1 tài khoản admin doanh nghiệp
 */
import { PrismaClient } from "@prisma/client";
import "dotenv/config";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding modules for child project...");

  const modules = [
    { name: "Core", description: "Hệ thống quản trị lõi (Người dùng, Phân quyền, Tổ chức)" },
    { name: "HR",   description: "Quản trị nhân sự và Sơ đồ tổ chức" },
  ];

  for (const module of modules) {
    await prisma.module.upsert({
      where: { name: module.name },
      update: {},
      create: module,
    });
  }

  console.log(`✅ Modules seeded: ${modules.map((m) => m.name).join(", ")}`);
  console.log("Seed complete.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
