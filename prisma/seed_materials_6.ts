import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const materialsList = [
  { code: "CVT50", name: "Chân vòi thép 50 gram", ghiChu: "Chân kết nối gá chậu" },
  { code: "ON08", name: "Ốc nhựa chân vòi đơn" },
  { code: "CDN35", name: "Chân đế nhựa lavabo", ghiChu: "Đế tròn" },
  { code: "CDNV35", name: "Chân đế nhựa lavabo vuông", ghiChu: "Đế vuông" },
  { code: "DCK14", name: "Dây cấp kim su304", ghiChu: "Dây cấp nước" },
];

async function main() {
  console.log("=== SEEDING SANITARY MATERIALS TO CHÂN CHẬU VÀ LINH KIỆN LẮP ĐẶT ĐÁY ===");

  // Find the category "Chân chậu và linh kiện lắp đặt đáy" under type "vat_tu_san_xuat"
  const category = await prisma.category.findFirst({
    where: { type: "vat_tu_san_xuat", code: "VT_CHAN_CHAU" }
  });

  if (!category) {
    throw new Error("Category VT_CHAN_CHAU not found! Please make sure update_sanitary_material_categories.ts was run.");
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
