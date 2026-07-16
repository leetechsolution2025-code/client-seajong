const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function syncCategoryToInventory(categoryId) {
  if (!categoryId) return null;
  const cat = await prisma.category.findUnique({ where: { id: categoryId } });
  if (!cat) return null;
  
  const existing = await prisma.inventoryCategory.findFirst({
    where: {
      OR: [
        { name: cat.name },
        ...(cat.code ? [{ code: cat.code }] : [])
      ]
    }
  });

  if (existing) return existing.id;

  const newCat = await prisma.inventoryCategory.create({
    data: {
      id: cat.id,
      name: cat.name,
      code: cat.code,
      sortOrder: cat.sortOrder,
      isActive: cat.isActive,
      parentId: null 
    }
  });
  return newCat.id;
}

async function main() {
  console.log("Syncing Manufactured Products...");
  const mfps = await prisma.manufacturedProduct.findMany();
  for (const item of mfps) {
    if (!item.code) continue;
    try {
      const catId = await syncCategoryToInventory(item.productCategoryId);
      await prisma.inventoryItem.upsert({
        where: { code: item.code },
        create: {
          code: item.code,
          tenHang: item.name,
          loai: "thanh-pham",
          donVi: item.unit || "bộ",
          categoryId: catId,
        },
        update: {
          tenHang: item.name,
          loai: "thanh-pham",
          donVi: item.unit || "bộ",
          categoryId: catId,
        }
      });
    } catch (e) {
      console.log("Error syncing MFP:", item.code, e.message);
    }
  }

  console.log("Syncing Material Items...");
  const mats = await prisma.materialItem.findMany();
  for (const item of mats) {
    if (!item.code) continue;
    try {
      const catId = await syncCategoryToInventory(item.categoryId);
      await prisma.inventoryItem.upsert({
        where: { code: item.code },
        create: {
          code: item.code,
          tenHang: item.name,
          loai: "vat-tu",
          donVi: item.unit || "cái",
          categoryId: catId,
        },
        update: {
          tenHang: item.name,
          loai: "vat-tu",
          donVi: item.unit || "cái",
          categoryId: catId,
        }
      });
    } catch (e) {
      console.log("Error syncing Material:", item.code, e.message);
    }
  }

  console.log("Done.");
}

main().finally(() => prisma.$disconnect());
