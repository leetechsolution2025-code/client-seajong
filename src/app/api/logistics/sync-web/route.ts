import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sj_generateSKU } from "@/lib/sku-generator";

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

        const productData = {
          slug: p.slug, url: p.link, name: (p.title?.rendered || "").replace(/<[^>]+>/g, "").trim(),
          excerpt: (p.excerpt?.rendered || "").replace(/<[^>]+>/g, "").substring(0, 500),
          description: html.replace(/<[^>]+>/g, " ").substring(0, 2000),
          specs: JSON.stringify(specs),
          imageUrl,
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
      const invCat = await prisma.inventoryCategory.upsert({
        where: { name: catName },
        create: { name: catName, code: catCode } as any,
        update: { code: catCode } as any,
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
        thongSoKyThuat: wp.description, updatedAt: new Date()
      };

      // TÌM KIẾM THEO WEB ID (1-1)
      const existingByWebId = await prisma.inventoryItem.findFirst({
        where: { webProductId: wp.id } as any
      });

      let finalItem: any;
      if (existingByWebId) {
        const skuConflict = await prisma.inventoryItem.findFirst({
          where: { code: itemData.code, id: { not: existingByWebId.id } } as any
        });
        if (skuConflict) itemData.code = `${finalSKU}-${wp.id}`;
        finalItem = await prisma.inventoryItem.update({ where: { id: existingByWebId.id }, data: itemData as any });
      } else {
        const skuMatch = await prisma.inventoryItem.findUnique({ where: { code: finalSKU } });
        if (skuMatch) itemData.code = `${finalSKU}-${wp.id}`;
        finalItem = await prisma.inventoryItem.create({
          data: { ...itemData, donVi: "Cái", soLuong: 0, trangThai: "het-hang" } as any
        });
      }

      // GÁN VÀO KHO TƯƠNG ỨNG
      const KHO_CHINH = "cmoip699s0000i4almoh1zuqs";
      const KHO_PHU_KIEN = "cmoit7ttx0000i4514gkqzm1k";
      const targetWarehouseId = prefix === "PK" ? KHO_PHU_KIEN : KHO_CHINH;

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
