import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sj_generateSKU } from "@/lib/sku-generator";
import * as cheerio from "cheerio";

const WP_BASE = "https://seajong.com/wp-json/wp/v2";

export async function GET() {
  const log = await (prisma as any).logisticsSyncLog.findFirst({
    orderBy: { startedAt: "desc" }
  });
  return NextResponse.json(log);
}

export async function POST(req: Request) {
  try {
    let itemId: string | undefined;
    try {
      const body = await req.json();
      itemId = body?.itemId;
    } catch (e) {}

    if (itemId) {
      const item = await prisma.inventoryItem.findUnique({ where: { id: itemId } }) as any;
      if (!item || !item.webProductId) return NextResponse.json({ error: "Lỗi" }, { status: 400 });
      const webProduct = await prisma.seajongProduct.findUnique({ where: { id: item.webProductId } });
      const updated = await syncItemFromWeb(item.id, webProduct);
      return NextResponse.json(updated);
    }

    const log = await (prisma as any).logisticsSyncLog.create({
      data: { status: "running", message: "GĐ1: Đang quét toàn bộ website Seajong...", total: 0, current: 0 }
    });

    performDeepSync(log.id).catch(err => console.error("Deep sync error:", err));
    return NextResponse.json({ logId: log.id, status: "started" });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

async function performDeepSync(logId: string) {
  try {
    // 0. Dọn dẹp log cũ (xóa các log thành công trước đó để tránh rác DB)
    await (prisma as any).logisticsSyncLog.deleteMany({
      where: { 
        status: { in: ["success", "error"] },
        id: { not: logId }
      }
    });

    // 1. Tải danh mục (Không lưu cache)
    const catRes = await fetch(`${WP_BASE}/product_cat?per_page=100`, { cache: "no-store" });
    const cats: any[] = await catRes.json();
    for (const c of cats.filter(c => c.count > 0)) {
      await prisma.seajongCategory.upsert({
        where: { id: c.id },
        create: { id: c.id, name: c.name, slug: c.slug, count: c.count, parent: c.parent },
        update: { name: c.name, slug: c.slug, count: c.count, parent: c.parent },
      });
    }

    // 2. Tải sản phẩm (Không lưu cache)
    let page = 1, totalPages = 1, totalWebProducts = 0;
    do {
      const res = await fetch(`${WP_BASE}/product?per_page=100&page=${page}&_embed`, { cache: "no-store" });
      if (!res.ok) break;
      totalPages = parseInt(res.headers.get("x-wp-totalpages") || "1");
      const rawProducts: any[] = await res.json();
      for (const p of rawProducts) {
        const html = p.content?.rendered || "";
        const specs: any = {};
        const rows = html.match(/<tr[\s\S]*?<\/tr>/gi) || [];
        for (const row of rows) {
          const kMatch = row.match(/<strong[^>]*>([\s\S]*?)<\/strong>/i);
          const vMatch = row.match(/<td[^>]*>[\s\S]*?<\/td>[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i);
          if (kMatch && vMatch) {
            specs[kMatch[1].replace(/<[^>]+>/g, "").trim()] = vMatch[1].replace(/<[^>]+>/g, "").trim();
          }
        }

        const imageUrl = p._embedded?.["wp:featuredmedia"]?.[0]?.source_url || null;

        // --- Web Scraping for Promotions & Policies ---
        let scrapedPromotions: string[] = [];
        let scrapedPolicies: string[] = [];
        let scrapedPriceHtml: string | null = null;
        let scrapedVariations: any[] = [];
        let scrapedVariationData: string | null = null;
        try {
          const htmlRes = await fetch(p.link, { cache: "no-store" });
          const htmlText = await htmlRes.text();
          const $ = cheerio.load(htmlText);
          
          // Scrape Policies (Vận chuyển, bảo hành...)
          $(".box-uu-dai-new ul li").each((_, el) => {
             const text = $(el).text().trim();
             if (text) scrapedPolicies.push(text);
          });
          if (scrapedPolicies.length === 0) {
            $("p:has(img[src*='hj.png'])").each((_, el) => {
              const text = $(el).text().trim();
              if (text) scrapedPolicies.push(text);
            });
          }

          // Scrape Promotions (Khuyến mãi)
          const khuyenmaiEl = $("*:contains('Khuyến mãi')").last();
          if (khuyenmaiEl.length) {
            const ul = khuyenmaiEl.parent().nextAll("ul").first();
            if (ul.length > 0) {
               ul.find("li").each((_, el) => {
                  const text = $(el).text().trim();
                  if (text) scrapedPromotions.push(text);
               });
            } else {
               khuyenmaiEl.parent().parent().find("ul").first().find("li").each((_, el) => {
                 const text = $(el).text().trim();
                 if (text) scrapedPromotions.push(text);
               });
            }
          }

          // Scrape Price and Variations
          scrapedPriceHtml = $("p.price").first().text().trim() || null;
          
          const varForm = $("form.variations_form").first();
          if (varForm.length > 0) {
            varForm.find("table.variations select").each((_, select) => {
              const nameAttr = $(select).attr("name") || "";
              const options: string[] = [];
              $(select).find("option").each((_, opt) => {
                const val = $(opt).text().trim();
                if (val && val !== "Choose an option" && val !== "Chọn một tùy chọn") options.push(val);
              });
              if (options.length > 0) {
                const name = nameAttr.replace("attribute_", "").replace("pa_", "");
                // label is usually in the preceding th or by for=name
                let label = varForm.find(`label[for='${name}']`).text().trim();
                if (!label) label = name;
                scrapedVariations.push({ name: label, key: nameAttr, options });
              }
            });
            const varDataAttr = varForm.attr("data-product_variations");
            if (varDataAttr) scrapedVariationData = varDataAttr;
          }
        } catch (e) {
          console.error("Scrape error for", p.link, e);
        }

        const productData = {
          slug: p.slug, url: p.link, name: (p.title?.rendered || "").replace(/<[^>]+>/g, "").trim(),
          excerpt: (p.excerpt?.rendered || "").replace(/<[^>]+>/g, "").substring(0, 500),
          description: html.replace(/<[^>]+>/g, " ").substring(0, 2000),
          specs: JSON.stringify(specs),
          imageUrl,
          promotions: JSON.stringify(scrapedPromotions),
          policies: JSON.stringify(scrapedPolicies),
          priceHtml: scrapedPriceHtml,
          variations: JSON.stringify(scrapedVariations),
          variationData: scrapedVariationData,
          updatedAt: new Date(p.modified), syncedAt: new Date(),
        };
        await prisma.seajongProduct.upsert({ where: { id: p.id }, create: { id: p.id, ...productData }, update: productData });
        if (p.product_cat) {
          await prisma.seajongProduct.update({ where: { id: p.id }, data: { categories: { set: p.product_cat.map((id: number) => ({ id })) } } });
        }
        totalWebProducts++;
      }
      await (prisma as any).logisticsSyncLog.update({ where: { id: logId }, data: { message: `GĐ1: Đã tải ${totalWebProducts} sản phẩm...` } });
      page++;
    } while (page <= totalPages);

    // 3. Nhập kho Logistics
    const webProducts = await prisma.seajongProduct.findMany({ include: { categories: true } });
    await (prisma as any).logisticsSyncLog.update({ where: { id: logId }, data: { message: "GĐ2: Đang nhập kho hàng...", total: webProducts.length, current: 0 } });
    
    const rootCat = await prisma.inventoryCategory.findFirst({
      where: { code: "SP_VESINH" }
    });
    const tbvsCat = await prisma.inventoryCategory.findFirst({
      where: { code: "TBVS" }
    });
    const tbnbCat = await prisma.inventoryCategory.findFirst({
      where: { code: "TBNB" }
    });
    const hangHoaWh = await prisma.warehouse.findFirst({
      where: { code: "KHO-CHINH" }
    });

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
      // Ưu tiên danh mục cụ thể (không phải Thiết bị vệ sinh hoặc Thiết bị nhà bếp nếu có lựa chọn khác)
      let selectedCat = categories[0];
      if (categories.length > 1) {
        const priorityCat = categories.find(c => 
          !["Thiết bị vệ sinh", "Thiết bị nhà bếp"].includes(c.name)
        );
        if (priorityCat) selectedCat = priorityCat;
      }
      
      const catName = selectedCat?.name || "Hàng hóa";
      const catCode = `${prefix}-${selectedCat?.id || "GEN"}`;
      
      const existingCat = await prisma.inventoryCategory.findUnique({
        where: { name: catName }
      });
      
      let parentCategory = tbvsCat;
      const catNameLower = catName.toLowerCase();
      if (
        catNameLower.includes("bếp") || 
        catNameLower.includes("chén") || 
        catNameLower.includes("bát") || 
        catNameLower.includes("hút mùi")
      ) {
        parentCategory = tbnbCat;
      }

      const parentId = existingCat?.parentId || (parentCategory ? parentCategory.id : (rootCat ? rootCat.id : null));

      let finalCatCode = catCode;
      const codeConflict = await prisma.inventoryCategory.findFirst({
        where: { code: catCode, name: { not: catName } }
      });
      if (codeConflict) {
        finalCatCode = `${catCode}-${selectedCat?.id || Math.floor(Math.random() * 1000)}`;
      }

      const invCat = await prisma.inventoryCategory.upsert({
        where: { name: catName },
        create: { name: catName, code: finalCatCode, parentId } as any,
        update: { code: finalCatCode, parentId } as any,
      });

      const modelIdentifier = model || wp.slug.substring(0, 15).toUpperCase();
      const color = specs["Màu sắc"] || specs["Màu"] || "";
      const version = specs["Phiên bản"] || "";
      
      // LOGIC MỚI: Nếu model đã bắt đầu bằng SJ-, dùng luôn nó. Nếu không mới ghép SJ-Prefix-Model
      let finalSKU = modelIdentifier.startsWith("SJ-") ? modelIdentifier : `SJ-${prefix}-${modelIdentifier}`;
      
      if (version) finalSKU += `-${version.substring(0, 3).toUpperCase()}`;
      if (color) finalSKU += `-${color.substring(0, 3).toUpperCase()}`;
      finalSKU = finalSKU.replace(/\s+/g, "").substring(0, 40).toUpperCase();

      const itemData: any = {
        tenHang: wp.name, code: finalSKU, webProductId: wp.id,
        categoryId: invCat.id, brand: specs["Thương hiệu"] || "Seajong",
        model, color, version, imageUrl: (wp as any).imageUrl,
        thongSoKyThuat: wp.description, updatedAt: new Date(),
        giaBan: wp.price || 0
      };

      // XỬ LÝ BIẾN THỂ (SeajongProductVariation)
      let parsedVariations = [];
      try {
        if (wp.variationData) parsedVariations = JSON.parse(wp.variationData);
      } catch(e) {}

      // Đồng bộ vào bảng con SeajongProductVariation
      for (const vData of parsedVariations) {
        await (prisma as any).seajongProductVariation.upsert({
          where: { variationId: vData.variation_id },
          create: {
            variationId: vData.variation_id,
            productId: wp.id,
            sku: vData.sku || `${finalSKU}-${vData.variation_id}`,
            price: vData.display_price || 0,
            attributes: JSON.stringify(vData.attributes || {}),
            imageUrl: vData.image?.url || null
          },
          update: {
            sku: vData.sku || `${finalSKU}-${vData.variation_id}`,
            price: vData.display_price || 0,
            attributes: JSON.stringify(vData.attributes || {}),
            imageUrl: vData.image?.url || null
          }
        });
      }

      // Tạo InventoryItem cho từng biến thể (hoặc 1 cho SP gốc nếu không có)
      const variationsToSync = parsedVariations.length > 0 ? parsedVariations : [null];
      
      for (const vData of variationsToSync) {
        let vSku = finalSKU;
        let vItemData = { ...itemData };
        
        if (vData) {
          vSku = vData.sku || `${finalSKU}-${vData.variation_id}`;
          vItemData.code = vSku;
          vItemData.webVariationId = vData.variation_id;
          vItemData.giaBan = vData.display_price || vItemData.giaBan;
          vItemData.imageUrl = vData.image?.url || vItemData.imageUrl;
          
          // Trích xuất màu sắc, version từ attributes nếu có thể
          const attrs = vData.attributes || {};
          const vColor = attrs['attribute_mau-sac'] || attrs['attribute_mau'] || vItemData.color;
          vItemData.color = vColor;
        }

        // TÌM KIẾM
        let existingItem = null;
        if (vData) {
          existingItem = await prisma.inventoryItem.findFirst({
            where: { webVariationId: vData.variation_id } as any
          });
        } else {
          existingItem = await prisma.inventoryItem.findFirst({
            where: { webProductId: wp.id, webVariationId: null } as any
          });
        }

        let finalItem: any;
        if (existingItem) {
          const skuConflict = await prisma.inventoryItem.findFirst({
            where: { code: vItemData.code, id: { not: existingItem.id } } as any
          });
          if (skuConflict) vItemData.code = `${vSku}-${wp.id}${vData ? '-' + vData.variation_id : ''}`;
          finalItem = await prisma.inventoryItem.update({ where: { id: existingItem.id }, data: vItemData as any });
        } else {
          const skuMatch = await prisma.inventoryItem.findUnique({ where: { code: vSku } });
          if (skuMatch) vItemData.code = `${vSku}-${wp.id}${vData ? '-' + vData.variation_id : ''}`;
          finalItem = await prisma.inventoryItem.create({
            data: { ...vItemData, donVi: "cái", soLuong: 0, trangThai: "het-hang" } as any
          });
        }

        // GÁN VÀO KHO TƯƠNG ỨNG
        const targetWarehouseId = hangHoaWh?.id || "";
        if (targetWarehouseId) {
          await (prisma as any).inventoryStock.upsert({
            where: {
              inventoryItemId_warehouseId: {
                inventoryItemId: finalItem.id,
                warehouseId: targetWarehouseId
              }
            },
            create: {
              inventoryItemId: finalItem.id,
              warehouseId: targetWarehouseId,
              soLuong: 0,
              viTriHang: "Chờ sắp xếp"
            },
            update: {} // Giữ nguyên số lượng hiện có nếu đã có
          });
        }
      }

      count++;
      if (count % 5 === 0) {
        await (prisma as any).logisticsSyncLog.update({
          where: { id: logId },
          data: { current: count, message: `Nhập kho: ${wp.name.substring(0, 30)}...` }
        });
      }
    }

    await (prisma as any).logisticsSyncLog.update({
      where: { id: logId },
      data: { status: "success", current: count, message: `Hoàn tất đồng bộ ${count} hàng hoá!`, finishedAt: new Date() }
    });

  } catch (error: any) {
    await (prisma as any).logisticsSyncLog.update({ where: { id: logId }, data: { status: "error", message: error.message, finishedAt: new Date() } });
  }
}

async function syncItemFromWeb(itemId: string, webProduct: any) {
  return await prisma.inventoryItem.update({
    where: { id: itemId },
    data: { webProductId: webProduct.id } as any
  });
}
