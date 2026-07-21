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
    const skippedItems = [];
    let importedCount = 0;

    // Fetch all categories for validation mapping
    // We assume the user inputted the exact Category Code in the excel file
    const allCategories = await prisma.category.findMany({
      where: { isActive: true },
      select: { id: true, code: true }
    });
    const categoryMap = new Map();
    allCategories.forEach(c => categoryMap.set(c.code.toLowerCase(), c.id));

    // Transaction to insert items one by one (or batch if possible, but one by one is safer to skip existing ones)
    for (const item of items) {
      let sku = item.sku;
      if (!sku) {
        sku = "SP-" + Math.random().toString(36).substr(2, 6).toUpperCase();
      }

      // Check if exists in InventoryItem
      let inventoryId = "";
      const existingInventory = await prisma.inventoryItem.findUnique({
        where: { code: sku }
      });
      
      // Map category ID
      const catCodeStr = (item.categoryCode || "").trim().toLowerCase();
      const mappedCategoryId = categoryMap.get(catCodeStr) || null;

      if (whCode === "KHO-THANHPHAM") {
        const existingMfp = await prisma.manufacturedProduct.findUnique({ where: { code: sku } });
        if (existingMfp) {
          skippedItems.push({ sku, name: item.name, reason: "Mã SKU đã tồn tại trong Kho thành phẩm" });
          continue;
        }
      } else if (whCode === "KVP") {
        const existingMat = await prisma.materialItem.findUnique({ where: { code: sku } });
        if (existingMat) {
          skippedItems.push({ sku, name: item.name, reason: "Mã SKU đã tồn tại trong Kho vật tư" });
          continue;
        }
      }

      await prisma.$transaction(async (tx) => {
        // 1. Create or Reuse InventoryItem
        if (existingInventory) {
          inventoryId = existingInventory.id;
        } else {
          const newInventory = await tx.inventoryItem.create({
            data: {
              code: sku,
              tenHang: item.name,
              donVi: item.unit || "Cái",
              soLuong: item.quantity || 0,
              giaNhap: item.importPrice || 0,
              giaBan: item.sellPrice || 0,
              brand: item.brand || "Seajong",
              ghiChu: item.note || "",
              categoryId: mappedCategoryId,
              loai: whCode === "KHO-THANHPHAM" ? "thanh-pham" : (whCode === "KVP" ? "vat-tu" : "hang-hoa")
            }
          });
          inventoryId = newInventory.id;
        }

        // 2. Create specific item type and stock based on Warehouse
        if (whCode === "KHO-THANHPHAM") {
          // ManufacturedProduct
          await tx.manufacturedProduct.create({
            data: {
              code: sku,
              name: item.name,
              unit: item.unit || "Bộ",
              giaBan: item.sellPrice || 0,
              productCategoryId: mappedCategoryId,
              defaultWarehouse: warehouseId
            }
          });
        } else if (whCode === "KVP") {
          // MaterialItem
          const mat = await tx.materialItem.create({
            data: {
              code: sku,
              name: item.name,
              unit: item.unit || "Cái",
              price: item.importPrice || 0,
              giaBan: item.sellPrice || 0,
              brand: item.brand || "Seajong",
              ghiChu: item.note || "",
              categoryId: mappedCategoryId
            }
          });

          // Create MaterialStock
          await tx.materialStock.create({
            data: {
              materialId: mat.id,
              warehouseId: warehouseId,
              soLuong: item.quantity || 0
            }
          });
        }

        // 3. Create InventoryStock
        await tx.inventoryStock.create({
          data: {
            inventoryItemId: inventoryId,
            warehouseId: warehouseId,
            soLuong: item.quantity || 0
          }
        });

        // 4. Create StockMovement for the initial import if quantity > 0
        if (item.quantity > 0) {
          await tx.stockMovement.create({
            data: {
              inventoryItemId: inventoryId,
              toWarehouseId: warehouseId,
              type: "nhap",
              soLuong: item.quantity,
              lyDo: "Import dữ liệu ban đầu từ Excel",
              nguoiThucHien: session.user?.name || "System"
            }
          });
        }
      });
      
      importedCount++;
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
