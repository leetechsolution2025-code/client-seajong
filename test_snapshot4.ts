import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const activeIndustryCode = "wood_door";
  let industryProdCategoryIds: string[] = [];
  const industryProductCodeMap: Record<string, string> = {
    "wood_door": "SP_GO",
    "sanitary": "SP_VESINH",
    "building_materials": "SP_VLXD"
  };
  const prodRootCode = industryProductCodeMap[activeIndustryCode] || "SP_GO";
  const prodRootCategory = await prisma.inventoryCategory.findFirst({
    where: { code: prodRootCode, parentId: null, isActive: true }
  });

  if (prodRootCategory) {
    const categories = await prisma.inventoryCategory.findMany({
      where: { isActive: true },
      select: { id: true, parentId: true }
    });
    const descendantIds = [prodRootCategory.id];
    const collectDescendants = (parentId: string) => {
      categories.forEach(cat => {
        if (cat.parentId === parentId) {
          descendantIds.push(cat.id);
          collectDescendants(cat.id);
        }
      });
    };
    collectDescendants(prodRootCategory.id);
    industryProdCategoryIds = descendantIds;
  }
  
  const syncedCategories = await prisma.category.findMany({
    where: { type: { in: ['danh_muc_thanh_pham', 'vat_tu_san_xuat'] } },
    select: { id: true }
  });
  const syncedIds = syncedCategories.map(c => c.id);
  
  const whFilter = { loai: "thanh-pham" };
  const isManufactured = whFilter.loai === "thanh-pham" || whFilter.loai === "vat-tu";
  
  const items = await prisma.inventoryItem.findMany({
    where: {
      ...whFilter,
      ...(!isManufactured && industryProdCategoryIds.length > 0 ? {
        OR: [
          { categoryId: { in: industryProdCategoryIds } },
          { categoryId: { in: syncedIds } },
          { categoryId: null }
        ]
      } : {})
    },
    select: { id: true }
  });
  console.log("Items found:", items.length);
}
main();
