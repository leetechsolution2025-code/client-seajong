import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const materialsList = [
  { code: "TS01", name: "Thân sen 01" },
  { code: "TS02", name: "Thân sen 02" },
  { code: "TS03", name: "Thân sen 03" },
  { code: "TS05", name: "Thân sen 05" },
  { code: "TS06", name: "Thân sen 06" },
  { code: "TS07", name: "Thân sen 07" },
  { code: "TS07-1", name: "Thân sen 07-1" },
  { code: "TS08", name: "Thân sen 08" },
  { code: "TS08-1", name: "Thân sen 08-1" },
  { code: "TS09", name: "Thân sen 09" },
  { code: "TS10", name: "Thân sen 10" },
  { code: "TV01", name: "Thân vòi 01" },
  { code: "TV02", name: "Thân vòi 02" },
  { code: "TV03", name: "Thân vòi 03" },
  { code: "TV05", name: "Thân vòi 05" },
  { code: "TV05F", name: "Thân vòi 1 lỗ 05", ghiChu: "Dòng vòi 1 lỗ" },
  { code: "TV06", name: "Thân vòi 06" },
  { code: "TV07", name: "Thân vòi 07" },
  { code: "TV07-1", name: "Thân vòi 07-1" },
  { code: "TV07F", name: "Thân vòi một lỗ 07F", ghiChu: "Dòng vòi 1 lỗ" },
  { code: "TV08", name: "Thân vòi 08" },
  { code: "TV08-1", name: "Thân vòi 08-1" },
  { code: "TV08F", name: "Thân vòi 1 lỗ 08", ghiChu: "Dòng vòi 1 lỗ" },
  { code: "TV09", name: "Thân vòi 09" },
  { code: "TV09F", name: "Thân vòi một lỗ 09F", ghiChu: "Dòng vòi 1 lỗ" },
  { code: "TV10", name: "Thân vòi 10" },
  { code: "10FG", name: "Vòi lavabo vuông xám nóng lạnh 10F", ghiChu: "Thành phẩm/Củ vòi đặc thù" },
];

async function main() {
  console.log("=== SEEDING SANITARY MATERIALS TO THÀNH PHẦN CHÍNH ===");

  // Find the category "Thành phần chính" under type "vat_tu_san_xuat"
  const category = await prisma.category.findFirst({
    where: { type: "vat_tu_san_xuat", code: "VT_TP_CHINH" }
  });

  if (!category) {
    throw new Error("Category VT_TP_CHINH not found! Please make sure update_sanitary_material_categories.ts was run.");
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
