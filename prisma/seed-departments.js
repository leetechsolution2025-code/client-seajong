/**
 * seed-departments.js — Auto-generated for client: seajong
 * Chỉ chứa các phòng ban được chọn lúc export.
 * Tổng: 9 phòng ban.
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const departments = [
  {
    "code": "board",
    "nameVi": "Ban Giám đốc",
    "nameEn": "Board of Directors",
    "group": "management",
    "icon": "bi-building",
    "sortOrder": 1
  },
  {
    "code": "hr",
    "nameVi": "Nhân sự",
    "nameEn": "Human Resources",
    "group": "core",
    "icon": "bi-people",
    "sortOrder": 10
  },
  {
    "code": "finance",
    "nameVi": "Tài chính – Kế toán",
    "nameEn": "Finance & Accounting",
    "group": "core",
    "icon": "bi-cash-stack",
    "sortOrder": 11
  },
  {
    "code": "sales",
    "nameVi": "Kinh doanh",
    "nameEn": "Sales",
    "group": "business",
    "icon": "bi-graph-up-arrow",
    "sortOrder": 20
  },
  {
    "code": "marketing",
    "nameVi": "Marketing",
    "nameEn": "Marketing",
    "group": "business",
    "icon": "bi-megaphone",
    "sortOrder": 21
  },
  {
    "code": "logistics",
    "nameVi": "Kho vận",
    "nameEn": "Logistics & Warehouse",
    "group": "support",
    "icon": "bi-truck",
    "sortOrder": 31
  },
  {
    "code": "purchase",
    "nameVi": "Mua hàng",
    "nameEn": "Purchasing",
    "group": "support",
    "icon": "bi-cart3",
    "sortOrder": 32
  },
  {
    "code": "qa",
    "nameVi": "Đảm bảo chất lượng",
    "nameEn": "Quality Assurance",
    "group": "support",
    "icon": "bi-patch-check",
    "sortOrder": 33
  },
  {
    "code": "production",
    "nameVi": "Sản xuất",
    "nameEn": "Production",
    "group": "support",
    "icon": "bi-tools",
    "sortOrder": 35
  }
];

async function main() {
  console.log('🌱 Seeding department categories...');
  let created = 0;
  for (const dept of departments) {
    await prisma.departmentCategory.upsert({
      where: { code: dept.code },
      update: {},
      create: dept,
    });
    created++;
  }
  console.log(`✅ Done: ${created} departments upserted.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
