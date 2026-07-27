const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  console.log('Starting Phase 3: Syncing SeajongProduct to InventoryItem');
  const webProducts = await prisma.seajongProduct.findMany({ include: { categories: true } });
  
  const rootCat = await prisma.inventoryCategory.findFirst({ where: { code: "SP_VESINH" } });
  const tbvsCat = await prisma.inventoryCategory.findFirst({ where: { code: "TBVS" } });
  const tbnbCat = await prisma.inventoryCategory.findFirst({ where: { code: "TBNB" } });

  let count = 0;
  for (const wp of webProducts) {
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

    const categories = wp.categories || [];
    let selectedCat = categories[0];
    if (categories.length > 1) {
      const priorityCat = categories.find((c: any) => !["Thiết bị vệ sinh", "Thiết bị nhà bếp"].includes(c.name));
      if (priorityCat) selectedCat = priorityCat;
    }
    
    const catName = selectedCat?.name || "Hàng hóa";
    const catCode = `${prefix}-${selectedCat?.id || "GEN"}`;
    
    const existingCat = await prisma.inventoryCategory.findFirst({ where: { name: catName } });
    
    let parentCategory = tbvsCat;
    const catNameLower = catName.toLowerCase();
    if (catNameLower.includes("bếp") || catNameLower.includes("chén") || catNameLower.includes("bát") || catNameLower.includes("hút mùi")) {
      parentCategory = tbnbCat;
    }

    const parentId = existingCat?.parentId || (parentCategory ? parentCategory.id : (rootCat ? rootCat.id : null));

    let finalCatCode = catCode;
    const codeConflict = await prisma.inventoryCategory.findFirst({ where: { code: catCode, name: { not: catName } } });
    if (codeConflict) {
      finalCatCode = `${catCode}-${selectedCat?.id || Math.floor(Math.random() * 1000)}`;
    }

    const invCat = await prisma.inventoryCategory.upsert({
      where: { name: catName },
      create: { name: catName, code: finalCatCode, parentId: parentId },
      update: { code: finalCatCode, parentId: parentId },
    });

    const modelIdentifier = model || wp.slug.substring(0, 15).toUpperCase();
    const color = specs["Màu sắc"] || specs["Màu"] || "";
    const version = specs["Phiên bản"] || "";
    
    let finalSKU = modelIdentifier.startsWith("SJ-") ? modelIdentifier : `SJ-${prefix}-${modelIdentifier}`;
    if (version) finalSKU += `-${version.substring(0, 3).toUpperCase()}`;
    if (color) finalSKU += `-${color.substring(0, 3).toUpperCase()}`;
    finalSKU = finalSKU.replace(/\s+/g, "").substring(0, 40).toUpperCase();

    const itemData = {
      tenHang: wp.name, code: finalSKU, webProductId: wp.id, loai: 'hang-hoa',
      categoryId: invCat.id, brand: specs["Thương hiệu"] || "Seajong",
      model, color, version, imageUrl: wp.imageUrl || null,
      thongSoKyThuat: wp.description, updatedAt: new Date(),
      giaBan: wp.price || 0,
      donVi: "bộ"
    };

    let parsedVariations = [];
    try { if (wp.variationData) parsedVariations = JSON.parse(wp.variationData); } catch(e) {}

    const variationsToSync = parsedVariations.length > 0 ? parsedVariations : [null];
    
    for (const vData of variationsToSync) {
      let vSku = finalSKU;
      let vItemData: any = { ...itemData };
      
      if (vData) {
        vSku = vData.sku || `${finalSKU}-${vData.variation_id}`;
        vItemData.code = vSku;
        vItemData.webVariationId = vData.variation_id;
        vItemData.giaBan = vData.display_price || vItemData.giaBan;
        vItemData.imageUrl = vData.image?.url || vItemData.imageUrl;
        const attrs = vData.attributes || {};
        const vColor = attrs['attribute_mau-sac'] || attrs['attribute_mau'] || vItemData.color;
        vItemData.color = vColor;
      }

      let existingItem = null;
      if (vData) {
        existingItem = await prisma.inventoryItem.findFirst({ where: { webVariationId: vData.variation_id } });
      } else {
        existingItem = await prisma.inventoryItem.findFirst({ where: { webProductId: wp.id, webVariationId: null } });
      }

      if (existingItem) {
        const skuConflict = await prisma.inventoryItem.findFirst({ where: { code: vItemData.code, id: { not: existingItem.id } } });
        if (skuConflict) vItemData.code = `${vSku}-${wp.id}${vData ? '-' + vData.variation_id : ''}`;
        await prisma.inventoryItem.update({ where: { id: existingItem.id }, data: vItemData });
      } else {
        const skuMatch = await prisma.inventoryItem.findFirst({ where: { code: vSku } });
        if (skuMatch) vItemData.code = `${vSku}-${wp.id}${vData ? '-' + vData.variation_id : ''}`;
        await prisma.inventoryItem.create({ data: { ...vItemData, donVi: "bộ", soLuong: 0, trangThai: "het-hang" } });
      }
      count++;
    }
  }
  console.log(`Finished! Synced ${count} variations/products into InventoryItem with loai='hang-hoa'.`);
}

run().catch(console.error).finally(() => prisma.$disconnect());
