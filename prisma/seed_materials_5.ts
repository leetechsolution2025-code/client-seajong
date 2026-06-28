import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const materialsList = [
  { code: "CN40", name: "Chụp nhựa 40 cao cấp", ghiChu: "Chụp che lõi 40mm" },
  { code: "CN35", name: "Chụp nhựa 35mm", ghiChu: "Chụp che lõi 35mm" },
  { code: "CD40", name: "Chụp đồng 40mm", ghiChu: "Chụp che lõi bằng đồng" },
  { code: "CCV05", name: "Chụp cổ màu vàng" },
  { code: "MP01", name: "Miệng phun nhựa mạ", ghiChu: "Đầu tạo bọt / sục khí" },
  { code: "MPV05", name: "Miệng phun màu vàng" },
  { code: "ONT50", name: "Ốc ngoài thép không gỉ 50g" },
  { code: "ONV05", name: "Ốc ngoài màu vàng" },
  { code: "OTT23", name: "Ốc trong bằng thép 23g" },
  { code: "ODN35", name: "Ốc đồng ngoài có khía 35mm" },
];

async function main() {
  console.log("=== SEEDING SANITARY MATERIALS TO CHỤP TRANG TRÍ VÀ PHỤ KIỆN BỀ MẶT ===");

  // Find the category "Chụp trang trí và phụ kiện bề mặt" under type "vat_tu_san_xuat"
  const category = await prisma.category.findFirst({
    where: { type: "vat_tu_san_xuat", code: "VT_CHUP_TRANG_TRI" }
  });

  if (!category) {
    throw new Error("Category VT_CHUP_TRANG_TRI not found! Please make sure update_sanitary_material_categories.ts was run.");
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
