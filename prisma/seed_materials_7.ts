import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const materialsList = [
  { code: "DT04", name: "Đón ty TQ", ghiChu: "Linh kiện đi kèm ty sen" },
  { code: "RT06", name: "Rốn ty thép" },
  { code: "OST12", name: "Ống suốt thép" },
  { code: "TVA01", name: "Túi vải sen vòi", ghiChu: "Túi bọc bảo vệ bề mặt" },
];

async function main() {
  console.log("=== SEEDING SANITARY MATERIALS TO LINH KIỆN KHÁC ===");

  // Find the category "Linh kiện khác" under type "vat_tu_san_xuat"
  const category = await prisma.category.findFirst({
    where: { type: "vat_tu_san_xuat", code: "VT_LINH_KIEN_KHAC" }
  });

  if (!category) {
    throw new Error("Category VT_LINH_KIEN_KHAC not found! Please make sure update_sanitary_material_categories.ts was run.");
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
