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

export async function attachWebImages(items: any[]): Promise<any[]> {
  if (!items || items.length === 0) return items;

  // Extract all webProductIds from the items
  const webProductIds = new Set<number>();
  items.forEach(item => {
    if (item.webProductId) {
      webProductIds.add(item.webProductId);
    } else if (item.inventoryItem?.webProductId) { // For nested items like in batch-packing
      webProductIds.add(item.inventoryItem.webProductId);
    }
  });

  if (webProductIds.size === 0) return items;

  // Fetch images from SeajongProduct
  const webProducts = await prisma.seajongProduct.findMany({
    where: { id: { in: Array.from(webProductIds) } },
    select: { id: true, images: true }
  });
  
  const webProductMap = new Map(webProducts.map(wp => [wp.id, wp.images]));

  // Attach images to items
  return items.map(item => {
    let images: string[] = [];
    const wpId = item.webProductId || item.inventoryItem?.webProductId;
    
    if (wpId && webProductMap.has(wpId)) {
      try {
        images = JSON.parse(webProductMap.get(wpId) || "[]");
      } catch (e) {}
    }
    
    // Fallback logic: if it already has imageUrl but no images, put imageUrl as first element
    if (images.length === 0 && item.imageUrl) {
      images = [item.imageUrl];
    }
    
    return {
      ...item,
      images,
      // If we don't have an imageUrl, maybe we can set it from the first image
      imageUrl: item.imageUrl || (images.length > 0 ? images[0] : null)
    };
  });
}
