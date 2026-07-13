import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  // 1. Ensure Root category for Thành Phẩm
  let root = await prisma.inventoryCategory.findFirst({
    where: { code: 'SP_THANH_PHAM' }
  });
  if (!root) {
    root = await prisma.inventoryCategory.create({
      data: {
        code: 'SP_THANH_PHAM',
        name: 'Sản phẩm thành phẩm',
        isActive: true,
        sortOrder: 0
      }
    });
  }

  // 2. Create the 8 sub-categories
  const catNames = [
    "Vòi nước",
    "Sen tắm",
    "Phụ kiện phòng tắm",
    "Thiết bị khác",
    "Vòi xịt vệ sinh",
    "Bàn đá, Tủ chậu, Gương",
    "Chậu rửa bát, Chậu lavabo",
    "Linh kiện, Vật tư lắp ráp rời"
  ];
  const catMap: Record<string, string> = {};

  for (let i = 0; i < catNames.length; i++) {
    const name = catNames[i];
    let cat = await prisma.inventoryCategory.findFirst({
      where: { name, parentId: root.id }
    });
    if (!cat) {
      cat = await prisma.inventoryCategory.create({
        data: {
          name,
          code: `TP_${i + 1}`,
          parentId: root.id,
          isActive: true,
          sortOrder: i + 1
        }
      });
    }
    catMap[name] = cat.id;
  }

  // 3. Update products
  const mfps = await prisma.manufacturedProduct.findMany();
  let count = 0;
  for (const item of mfps) {
    const name = item.name.toLowerCase();
    let catName = "Thiết bị khác";
    
    if (name.includes("xịt")) {
      catName = "Vòi xịt vệ sinh";
    } else if (name.includes("vòi") || name.includes("củ")) {
      catName = "Vòi nước";
    } else if (name.includes("sen")) {
      catName = "Sen tắm";
    } else if (name.includes("phụ kiện") || name.includes("lô giấy") || name.includes("vắt khăn") || name.includes("kệ") || name.includes("thoát sàn")) {
      catName = "Phụ kiện phòng tắm";
    } else if (name.includes("bàn đá") || name.includes("tủ chậu") || name.includes("gương")) {
      catName = "Bàn đá, Tủ chậu, Gương";
    } else if (name.includes("chậu") || name.includes("lavabo")) {
      catName = "Chậu rửa bát, Chậu lavabo";
    } else if (name.includes("linh kiện") || name.includes("vật tư") || name.includes("dây") || name.includes("chân") || name.includes("ốc") || name.includes("gioăng") || name.includes("lõi") || name.includes("cần") || name.includes("bát") || name.includes("cài") || name.includes("núm")) {
      catName = "Linh kiện, Vật tư lắp ráp rời";
    }

    const catId = catMap[catName];
    if (catId && item.categoryId !== catId) {
      await prisma.manufacturedProduct.update({
        where: { id: item.id },
        data: { categoryId: catId }
      });
      count++;
    }
  }

  console.log(`Successfully mapped ${count} items.`);
}

main().finally(() => prisma.$disconnect());
