/**
 * seed-company-info.js — Auto-generated for client: seajong
 * Khởi tạo CompanyInfo cho dự án con. Chạy 1 lần khi setup.
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const companyData = {
  name:      "Công ty cổ phần Seajong Faucet Việt Nam",
  shortName: "seajong",
  slogan:    "Tiên phong kiến tạo giá trị thực trong việc tạo ra các giải pháp thiết bị phòng tắm, thiết bị vệ sinh và nhà bếp hiện đại. Luôn hướng tới việc nâng cao chất lượng cuộc sống cho mọi gia đình.",
  logoUrl:   "/uploads/logo_1777138276299.png",
  address:   "LK7D4, KĐT Cầu Diễn, Phường Phú Diễn, Hà Nội",
  phone:     "0969309489 | 1900 633 862",
  email:     "",
  taxCode:   "",
  legalRep:  "",
};

async function main() {
  console.log('🌱 Seeding CompanyInfo for: ' + companyData.name);
  const existing = await prisma.companyInfo.findFirst();
  if (existing) {
    await prisma.companyInfo.update({ where: { id: existing.id }, data: companyData });
    console.log('✅ CompanyInfo updated.');
  } else {
    await prisma.companyInfo.create({ data: companyData });
    console.log('✅ CompanyInfo created.');
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
