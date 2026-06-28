import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const materialsList = [
  { code: "TAY15", name: "Tay cầm sen vòi 01" },
  { code: "TAY16", name: "Tay cầm khum" },
  { code: "TAY17", name: "Tay cầm rãnh 40mm" },
  { code: "TAY03", name: "Tay cầm phẳng 35mm" },
  { code: "TAY47", name: "Tay cầm vòi lạnh 05" },
  { code: "TAY14", name: "Tay cầm sen vòi 09" },
  { code: "TAY07", name: "Tay cầm vuông nhỏ" },
  { code: "NR07", name: "Núm rút đồng trung quốc 7g", ghiChu: "Núm chuyển hướng sen/vòi" },
  { code: "NRV05", name: "Núm rút màu vàng" },
  { code: "CCD21", name: "Chân vòi chuyển đổi nóng lạnh" },
];

async function main() {
  console.log("=== SEEDING SANITARY MATERIALS TO TAY CẦM VÀ TAY GẠT CHUYỂN ĐỔI ===");

  // Find the category "Tay cầm và tay gạt chuyển đổi" under type "vat_tu_san_xuat"
  const category = await prisma.category.findFirst({
    where: { type: "vat_tu_san_xuat", code: "VT_TAY_CAM" }
  });

  if (!category) {
    throw new Error("Category VT_TAY_CAM not found! Please make sure update_sanitary_material_categories.ts was run.");
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
