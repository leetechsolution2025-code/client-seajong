/**
 * seed-companyInfo.js — Master Project (LEETECH)
 * Khởi tạo hoặc cập nhật thông tin công ty vào bảng CompanyInfo.
 * Chạy: node prisma/seed-companyInfo.js
 */

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const companyData = {
  name:     "Công ty TNHH MTV Tư vấn và cung cấp giải pháp số LEE-TECH",
  shortName:"leetech",
  logoUrl:  "/uploads/logo_1774079920956.png",
  slogan:   "Đồng hành cùng doanh nghiêp bằng các giải pháp số hóa tối ưu và dễ tiếp cận. Đơn giản hóa công nghệ để giúp chủ doanh nghiệp quản trị thông minh hơn, tối ưu vận hành và bứt phá doanh thu.",
  address:  "Số 18 Đỗ Ngọc Du, phường Lê Thanh Nghị, TP. Hải Phòng",
  phone:    "0913527583",
  email:    "leetech.solution2025@gmail.com",
  website:  "https://leetech.vn",
  taxCode:  "0801471931",
  legalRep: "Lê Anh Vân",
};

async function main() {
  console.log("🌱 Seeding CompanyInfo...");
  const existing = await prisma.companyInfo.findFirst();
  if (existing) {
    await prisma.companyInfo.update({ where: { id: existing.id }, data: companyData });
    console.log("✅ CompanyInfo updated:", companyData.name);
  } else {
    await prisma.companyInfo.create({ data: companyData });
    console.log("✅ CompanyInfo created:", companyData.name);
  }
}

main()
  .catch((e) => { console.error("❌ Error:", e); process.exit(1); })
  .finally(() => prisma.$disconnect());
