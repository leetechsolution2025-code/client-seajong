import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const materialsList = [
  { code: "LS40", name: "Lõi sen xanh gioăng rời 40mm", ghiChu: "Đường kính 40mm" },
  { code: "LS35", name: "Lõi sen xanh gioăng rời 35mm", ghiChu: "Đường kính 35mm" },
  { code: "LSH40", name: "Lõi sen hai lỗ 40mm", ghiChu: "Loại lõi 2 lỗ" },
  { code: "NLT40", name: "Ốc nén lõi thép size 40mm", ghiChu: "Dùng cho lõi 40mm" },
  { code: "NLT35", name: "Ốc nén lõi thép size 35mm", ghiChu: "Dùng cho lõi 35mm" },
];

async function main() {
  console.log("=== SEEDING SANITARY MATERIALS TO BỘ PHẬN ĐIỀU HƯỚNG/NGẮT MỞ NƯỚC ===");

  // Find the category "Bộ phận điều hướng/ngắt mở nước" under type "vat_tu_san_xuat"
  const category = await prisma.category.findFirst({
    where: { type: "vat_tu_san_xuat", code: "VT_BP_DIEU_HUONG" }
  });

  if (!category) {
    throw new Error("Category VT_BP_DIEU_HUONG not found! Please make sure update_sanitary_material_categories.ts was run.");
  }

  console.log(`Found category: ${category.name} (${category.id})`);

  // Find all warehouses of type "MATERIAL"
  const warehouses = await prisma.warehouse.findMany({
    where: { type: "MATERIAL" }
  } as any);
  console.log(`Found ${warehouses.length} Material Warehouses to seed stocks.`);

  for (const item of materialsList) {
    // Upsert MaterialItem
    const material = await (prisma as any).materialItem.upsert({
      where: { code: item.code },
      update: {
        name: item.name,
        categoryId: category.id,
        brand: "Seajong",
        unit: "cái",
        ghiChu: item.ghiChu || ""
      },
      create: {
        name: item.name,
        code: item.code,
        categoryId: category.id,
        brand: "Seajong",
        unit: "cái",
        ghiChu: item.ghiChu || ""
      }
    });
    console.log(`- Upserted MaterialItem: ${material.name} (${material.code})`);

    // Seed stock for each material warehouse
    for (const wh of warehouses) {
      await prisma.materialStock.upsert({
        where: {
          materialId_warehouseId: {
            materialId: material.id,
            warehouseId: wh.id
          }
        },
        update: {},
        create: {
          materialId: material.id,
          warehouseId: wh.id,
          soLuong: 0,
          soLuongMin: 0
        }
      });
    }
  }

  console.log("=== COMPLETED MATERIAL SEEDING ===");
}

main().catch(console.error).finally(() => prisma.$disconnect());
