import fs from "fs";
import path from "path";
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

function filterValidImagePath(url: string | null | undefined): string | null {
  if (!url || typeof url !== "string") return null;
  const trimmed = url.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("/uploads/")) {
    try {
      const localPath = path.join(process.cwd(), "public", trimmed);
      if (!fs.existsSync(localPath)) {
        return null;
      }
    } catch {
      return null;
    }
  }
  return trimmed;
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

  // Fetch images from SeajongProduct if any
  let webProductMap = new Map<number, string | null>();
  if (webProductIds.size > 0) {
    const webProducts = await prisma.seajongProduct.findMany({
      where: { id: { in: Array.from(webProductIds) } },
      select: { id: true, images: true }
    });
    webProductMap = new Map(webProducts.map(wp => [wp.id, wp.images]));
  }

  // Attach images to items
  return items.map(item => {
    let images: string[] = [];
    const wpId = item.webProductId || item.inventoryItem?.webProductId;
    
    if (wpId && webProductMap.has(wpId)) {
      try {
        images = JSON.parse(webProductMap.get(wpId) || "[]");
      } catch (e) {}
    }
    
    // Filter out any broken local paths in web images
    images = images.map(filterValidImagePath).filter(Boolean) as string[];

    // Fallback logic: check item's own imageUrl
    const validItemImageUrl = filterValidImagePath(item.imageUrl);
    if (images.length === 0 && validItemImageUrl) {
      images = [validItemImageUrl];
    }
    
    const finalImageUrl = validItemImageUrl || (images.length > 0 ? images[0] : null);

    return {
      ...item,
      images,
      imageUrl: finalImageUrl
    };
  });
}
