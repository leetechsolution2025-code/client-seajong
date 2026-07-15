import { prisma } from "./prisma";

export async function syncCategoryToInventory(categoryId: string | null): Promise<string | null> {
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
