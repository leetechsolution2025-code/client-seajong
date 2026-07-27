import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const webProducts = await prisma.seajongProduct.findMany({ include: { categories: true } });
    
    // Fetch all current inventory items that might be linked
    const inventoryItems = await prisma.inventoryItem.findMany({
      where: { loai: 'hang-hoa' }
    });

    const newItems: any[] = [];
    const priceChanges: any[] = [];
    const nameChanges: any[] = [];

    // Helper to generate SKU (same logic as populate script)
    const generateSKU = (wp: any, vData: any) => {
      let specs: any = {};
      try { specs = JSON.parse(wp.specs || "{}"); } catch (e) {}

      let model = specs["Model"] || specs["Mã sản phẩm"] || "";
      if (!model) {
        const match = wp.name.match(/SJ-([A-Z]*[0-9]+[A-Z]*)/i);
        if (match) model = match[1];
      }

      const nameLower = wp.name.toLowerCase();
      let prefix = "HH";
      if (nameLower.includes("bồn cầu")) prefix = "BC";
      else if (nameLower.includes("sen cây") || nameLower.includes("củ sen")) prefix = "SC";
      else if (nameLower.includes("lavabo") && !nameLower.includes("tủ")) prefix = "LB";
      else if (nameLower.includes("tủ lavabo")) prefix = "TL";
      else if (nameLower.includes("vòi")) prefix = "VB";
      else if (nameLower.includes("bồn tắm")) prefix = "BT";
      else if (nameLower.includes("phụ kiện") || nameLower.includes("mắc áo") || nameLower.includes("kệ")) prefix = "PK";

      const modelIdentifier = model || wp.slug.substring(0, 15).toUpperCase();
      const color = specs["Màu sắc"] || specs["Màu"] || "";
      const version = specs["Phiên bản"] || "";
      
      let finalSKU = modelIdentifier.startsWith("SJ-") ? modelIdentifier : `SJ-${prefix}-${modelIdentifier}`;
      if (version) finalSKU += `-${version.substring(0, 3).toUpperCase()}`;
      if (color) finalSKU += `-${color.substring(0, 3).toUpperCase()}`;
      finalSKU = finalSKU.replace(/\s+/g, "").substring(0, 40).toUpperCase();

      if (vData) {
        return vData.sku || `${finalSKU}-${vData.variation_id}`;
      }
      return finalSKU;
    };

    for (const wp of webProducts) {
      let parsedVariations = [];
      try { if (wp.variationData) parsedVariations = JSON.parse(wp.variationData); } catch(e) {}
      const variationsToSync = parsedVariations.length > 0 ? parsedVariations : [null];

      for (const vData of variationsToSync) {
        const targetSku = generateSKU(wp, vData);
        let existingItem = null;
        if (vData) {
          existingItem = inventoryItems.find((i: any) => i.webVariationId === vData.variation_id);
        } else {
          existingItem = inventoryItems.find((i: any) => i.webProductId === wp.id && !i.webVariationId);
        }

        if (!existingItem) {
          // Check by SKU fallback
          existingItem = inventoryItems.find((i: any) => i.code === targetSku);
        }

        const newName = wp.name;
        const newPrice = vData ? (vData.display_price || wp.price) : wp.price;

        if (!existingItem) {
          newItems.push({
            webProductId: wp.id,
            webVariationId: vData?.variation_id || null,
            name: newName,
            sku: targetSku,
            price: newPrice
          });
        } else {
          if (existingItem.giaBan !== newPrice) {
            priceChanges.push({
              inventoryItemId: existingItem.id,
              name: existingItem.tenHang,
              sku: existingItem.code,
              oldPrice: existingItem.giaBan,
              newPrice: newPrice
            });
          }
          if (existingItem.tenHang !== newName) {
            nameChanges.push({
              inventoryItemId: existingItem.id,
              sku: existingItem.code,
              oldName: existingItem.tenHang,
              newName: newName
            });
          }
        }
      }
    }

    return NextResponse.json({
      newItems, priceChanges, nameChanges, totalProcessed: webProducts.length
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
