import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { items, warehouseId } = body;

    if (!warehouseId || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "Dữ liệu không hợp lệ." }, { status: 400 });
    }

    const warehouse = await prisma.warehouse.findUnique({
      where: { id: warehouseId },
      select: { code: true, type: true }
    });

    if (!warehouse) {
      return NextResponse.json({ error: "Không tìm thấy thông tin kho hàng." }, { status: 404 });
    }

    const whCode = warehouse.code;
    const skippedItems: any[] = [];
    let importedCount = 0;

    // Fetch all categories for validation mapping
    const allCategories = await prisma.category.findMany({
      where: { isActive: true },
      select: { id: true, code: true, name: true }
    });
    const categoryMap = new Map<string, string>();
    allCategories.forEach(c => {
      if (c.code) categoryMap.set(c.code.toLowerCase().trim(), c.id);
      if (c.name) categoryMap.set(c.name.toLowerCase().trim(), c.id);
    });

    // Pre-fetch all existing inventory items and their stocks for fast matching
    const existingItems = await prisma.inventoryItem.findMany({
      include: {
        stocks: {
          select: { warehouseId: true, soLuong: true, soLuongGiu: true }
        }
      }
    });

    const itemByCode = new Map<string, (typeof existingItems)[0]>();
    const itemByName = new Map<string, (typeof existingItems)[0]>();
    for (const ex of existingItems) {
      if (ex.code) {
        itemByCode.set(ex.code.trim().toLowerCase(), ex);
      }
      if (ex.tenHang) {
        itemByName.set(ex.tenHang.trim().toLowerCase(), ex);
      }
    }

    const defaultLoai = whCode === "KVP" || warehouse.type === "MATERIAL" ? "vat-tu" : "hang-hoa";
    const CHUNK_SIZE = 50;

    for (let i = 0; i < items.length; i += CHUNK_SIZE) {
      const chunk = items.slice(i, i + CHUNK_SIZE);

      await prisma.$transaction(async (tx) => {
        for (const item of chunk) {
          const rawName = (item.name || "").toString().trim();
          if (!rawName) continue;

          let sku = (item.sku || "").toString().trim();
          const qty = Math.max(0, Number(item.quantity) || 0);
          const itemLoai = ["vat-tu", "hang-hoa", "thanh-pham"].includes((item.loai || "").trim())
            ? item.loai.trim()
            : defaultLoai;

          const catCodeStr = (item.categoryCode || "").toString().trim().toLowerCase();
          const mappedCategoryId = catCodeStr ? (categoryMap.get(catCodeStr) || null) : null;

          // Match existing item by SKU first, or by exact name if SKU is empty
          let existingInventory = sku ? itemByCode.get(sku.toLowerCase()) : undefined;
          if (!existingInventory && !sku) {
            existingInventory = itemByName.get(rawName.toLowerCase());
          }

          if (existingInventory) {
            const inventoryId = existingInventory.id;
            const existingWhStock = existingInventory.stocks.find(s => s.warehouseId === warehouseId);
            const oldWhQty = existingWhStock ? existingWhStock.soLuong : 0;
            const soLuongGiu = existingWhStock ? (existingWhStock.soLuongGiu || 0) : 0;
            const otherWhQty = existingInventory.stocks
              .filter(s => s.warehouseId !== warehouseId)
              .reduce((acc, s) => acc + s.soLuong, 0);
            const newTotalQty = otherWhQty + qty;
            const thucTon = Math.max(0, qty - soLuongGiu);
            const minQty = existingInventory.soLuongMin || 0;
            const trangThai = thucTon <= 0
              ? "het-hang"
              : (minQty > 0 && qty <= minQty ? "sap-het" : "con-hang");

            await tx.inventoryItem.update({
              where: { id: inventoryId },
              data: {
                tenHang: rawName,
                ...(item.unit ? { donVi: item.unit.toString().trim() } : {}),
                ...(item.brand ? { brand: item.brand.toString().trim() } : {}),
                ...(item.loai ? { loai: itemLoai } : {}),
                ...(mappedCategoryId ? { erpCategoryId: mappedCategoryId } : {}),
                ...(item.alternateCode ? { maThayThe: item.alternateCode.toString().trim() } : {}),
                ...(item.importPrice !== undefined && Number(item.importPrice) > 0 ? { giaNhap: Number(item.importPrice) } : {}),
                ...(item.costPrice !== undefined && Number(item.costPrice) > 0 ? { giaVon: Number(item.costPrice) } : {}),
                ...(item.sellPrice !== undefined && Number(item.sellPrice) > 0 ? { giaBan: Number(item.sellPrice) } : {}),
                ...(item.note ? { ghiChu: item.note.toString().trim() } : {}),
                soLuong: newTotalQty,
                trangThai,
              }
            });

            // Ghi đè số lượng tồn theo đúng số lượng trong file Excel
            await tx.inventoryStock.upsert({
              where: {
                inventoryItemId_warehouseId: {
                  inventoryItemId: inventoryId,
                  warehouseId: warehouseId
                }
              },
              update: {
                soLuong: qty
              },
              create: {
                inventoryItemId: inventoryId,
                warehouseId: warehouseId,
                soLuong: qty
              }
            });

            // Cập nhật lại cache trong bộ nhớ cho các dòng trùng lặp tiếp theo (nếu có)
            if (existingWhStock) {
              existingWhStock.soLuong = qty;
            } else {
              existingInventory.stocks.push({ warehouseId, soLuong: qty, soLuongGiu: 0 });
            }

            const diff = qty - oldWhQty;
            if (diff !== 0) {
              await tx.stockMovement.create({
                data: {
                  inventoryItemId: inventoryId,
                  ...(diff > 0 ? { toWarehouseId: warehouseId } : { fromWarehouseId: warehouseId }),
                  type: "dieu-chinh",
                  soLuong: Math.abs(diff),
                  lyDo: "Cập nhật tồn kho từ file Excel",
                  nguoiThucHien: session.user?.name || "System"
                }
              });
            }
          } else {
            if (!sku) {
              sku = "AUTO-" + Math.random().toString(36).substring(2, 8).toUpperCase();
            }

            const importPriceNum = Number(item.importPrice) || 0;
            const costPriceNum = Number(item.costPrice) || importPriceNum;
            const sellPriceNum = Number(item.sellPrice) || 0;
            const trangThai = qty <= 0 ? "het-hang" : "con-hang";

            const newInventory = await tx.inventoryItem.create({
              data: {
                code: sku,
                tenHang: rawName,
                donVi: (item.unit || "Cái").toString().trim(),
                soLuong: qty,
                giaNhap: importPriceNum,
                giaVon: costPriceNum,
                giaBan: sellPriceNum,
                brand: (item.brand || "Seajong").toString().trim(),
                ghiChu: (item.note || "").toString().trim(),
                maThayThe: item.alternateCode ? item.alternateCode.toString().trim() : null,
                loai: itemLoai,
                trangThai,
                erpCategoryId: mappedCategoryId
              }
            });

            await tx.inventoryStock.create({
              data: {
                inventoryItemId: newInventory.id,
                warehouseId: warehouseId,
                soLuong: qty
              }
            });

            if (qty > 0) {
              await tx.stockMovement.create({
                data: {
                  inventoryItemId: newInventory.id,
                  toWarehouseId: warehouseId,
                  type: "nhap",
                  soLuong: qty,
                  lyDo: "Import dữ liệu từ Excel",
                  nguoiThucHien: session.user?.name || "System"
                }
              });
            }

            const createdWithStocks = {
              ...newInventory,
              stocks: [{ warehouseId, soLuong: qty, soLuongGiu: 0 }]
            };
            itemByCode.set(sku.toLowerCase(), createdWithStocks as any);
            itemByName.set(rawName.toLowerCase(), createdWithStocks as any);
          }

          importedCount++;
        }
      });
    }

    return NextResponse.json({
      success: true,
      imported: importedCount,
      skipped: skippedItems
    });

  } catch (error: any) {
    console.error("Import error:", error);
    return NextResponse.json({ error: error.message || "Lỗi xử lý hệ thống" }, { status: 500 });
  }
}
