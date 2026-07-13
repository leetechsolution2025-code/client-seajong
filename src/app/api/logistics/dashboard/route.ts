import { NextRequest, NextResponse } from "next/server";
import { getServerSession }          from "next-auth";
import { authOptions }               from "@/lib/auth";
import { prisma }                    from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ── Resolve Active Industry Code ───────────────────────────────────────────
    const cookieHeader = req.headers.get("cookie") || "";
    let activeIndustryCode = cookieHeader
      .split("; ")
      .find(row => row.startsWith("active_industry_code="))
      ?.split("=")[1];

    if (!activeIndustryCode) {
      const client = await prisma.client.findFirst({
        include: { industry: true }
      });
      if (client?.industry) {
        activeIndustryCode = client.industry.code;
      }
    }

    if (!activeIndustryCode) {
      activeIndustryCode = "wood_door";
    }

    const industry = await prisma.industry.findUnique({
      where: { code: activeIndustryCode }
    });

    // 1. Resolve Material Categories for active industry
    let industryCategoryIds: string[] = [];
    if (industry) {
      const rootCategory = await prisma.category.findFirst({
        where: { code: industry.rootCategoryCode, type: "vat_tu_san_xuat", isActive: true }
      });
      if (rootCategory) {
        const categories = await prisma.category.findMany({
          where: { type: "vat_tu_san_xuat", isActive: true },
          select: { id: true, parentId: true }
        });
        const descendantIds = [rootCategory.id];
        const collectDescendants = (parentId: string) => {
          categories.forEach(cat => {
            if (cat.parentId === parentId) {
              descendantIds.push(cat.id);
              collectDescendants(cat.id);
            }
          });
        };
        collectDescendants(rootCategory.id);
        industryCategoryIds = descendantIds;
      }
    }

    // 2. Resolve Product Categories for active industry
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

    // 3. Resolve active products list under product categories
    const activeProducts = await prisma.inventoryItem.findMany({
      where: {
        categoryId: {
          in: industryProdCategoryIds
        }
      },
      select: {
        id: true,
        code: true,
        tenHang: true
      }
    });

    const activeProductIds = activeProducts.map(p => p.id);
    const activeSkus = new Set(activeProducts.map(p => p.code).filter(Boolean));
    const activeNames = new Set(activeProducts.map(p => p.tenHang).filter(Boolean));

    // 4. Fetch Omnichannel Orders (Unfulfilled) and filter by active industry items
    const rawOmnichannelOrders = await prisma.omnichannelOrder.findMany({
      where: {
        orderStatus: {
          in: ["Chờ xác nhận", "Đã xác nhận"]
        }
      },
      include: {
        items: true,
        channel: true
      },
      orderBy: {
        createdAt: "desc"
      }
    });

    const omnichannelOrders = rawOmnichannelOrders.filter(o => {
      // Keep order if at least one item matches active industry product codes or names
      return o.items.some(item => {
        return (item.sku && activeSkus.has(item.sku)) || activeNames.has(item.productName);
      });
    });

    // Map to Chờ đóng gói (orderStatus === 'Chờ xác nhận')
    const onlineOrdersToPack = omnichannelOrders
      .filter(o => o.orderStatus === "Chờ xác nhận")
      .map(o => {
        const timeStr = new Date(o.createdAt).toLocaleTimeString("vi-VN", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false
        });
        const itemsStr = o.items.map(item => `${item.productName} ×${item.quantity}`).join(", ");
        const firstSku = o.items.find(item => item.sku)?.sku || "N/A";

        return {
          id: o.externalOrderId || `ORD-${o.id.substring(0, 6).toUpperCase()}`,
          platform: o.channel?.platform || "Shopee",
          items: itemsStr || "Chưa có sản phẩm",
          sku: firstSku,
          time: timeStr
        };
      });

    // Map to Chờ shipper lấy (orderStatus === 'Đã xác nhận')
    const waitingPickup = omnichannelOrders
      .filter(o => o.orderStatus === "Đã xác nhận")
      .map(o => {
        const packedTime = new Date(o.updatedAt).toLocaleTimeString("vi-VN", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false
        });
        
        // Let's set deadline to 3 hours after updatedAt
        const deadlineDate = new Date(o.updatedAt.getTime() + 3 * 60 * 60 * 1000);
        const deadlineStr = deadlineDate.toLocaleTimeString("vi-VN", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false
        });

        const totalItems = o.items.reduce((sum, item) => sum + item.quantity, 0);
        const platformName = o.channel?.platform || "Website";
        
        // Carrier display helper
        let carrier = "SPX Express";
        if (platformName.toUpperCase() === "SHOPEE") carrier = "SPX Express";
        else if (platformName.toUpperCase() === "LAZADA") carrier = "LEX Express";
        else if (platformName.toUpperCase() === "TIKTOK") carrier = "J&T Express";
        else carrier = "GHTK";

        return {
          id: o.externalOrderId || `ORD-${o.id.substring(0, 6).toUpperCase()}`,
          carrier,
          packed: packedTime,
          deadline: deadlineStr,
          items: totalItems
        };
      });

    // 5. Fetch Material Stocks & filter warnings matching active industry categories
    const materialStocks = await prisma.materialStock.findMany({
      where: {
        material: {
          categoryId: {
            in: industryCategoryIds
          }
        }
      },
      include: {
        material: true,
        warehouse: true
      }
    });

    const packagingMaterials = materialStocks
      .map(ms => {
        const isLow = ms.soLuong <= ms.soLuongMin;
        const ratio = ms.soLuongMin > 0 ? ms.soLuong / ms.soLuongMin : 1;
        return {
          id: ms.id,
          name: ms.material.name,
          desc: ms.material.spec || ms.material.thongSoKyThuat || "Vật tư trong kho",
          qty: ms.soLuong,
          min: ms.soLuongMin,
          unit: ms.material.unit || "cái",
          isLow,
          ratio
        };
      })
      .sort((a, b) => {
        // Sort items that are below minimum first
        if (a.isLow && !b.isLow) return -1;
        if (!a.isLow && b.isLow) return 1;
        // Then by lowest ratio
        return a.ratio - b.ratio;
      });

    const criticalMaterials = packagingMaterials.filter(m => m.isLow).length;

    // 6. Fetch Stock Levels in Warehouses matching active industry products
    const allInventoryStocks = await prisma.inventoryStock.findMany({
      where: {
        inventoryItemId: {
          in: activeProductIds
        }
      },
      include: {
        warehouse: true
      }
    });

    // Tồn kho khả dụng = Sum of product stocks in warehouses of type PRODUCT
    const availableStock = allInventoryStocks
      .filter(s => s.warehouse?.type === "PRODUCT")
      .reduce((sum, s) => sum + s.soLuong, 0);

    // Hàng hoàn trong kho = Sum of product stocks in warehouses of type DEFECT
    const returnStock = allInventoryStocks
      .filter(s => s.warehouse?.type === "DEFECT")
      .reduce((sum, s) => sum + s.soLuong, 0);

    // Đang tạm khoá (Reserved) = Sum of quantities of all unfulfilled active industry order items
    const reservedStock = omnichannelOrders.reduce((sum, o) => {
      const orderQty = o.items.reduce((s, item) => s + item.quantity, 0);
      return sum + orderQty;
    }, 0);

    // 7. Batch Picking calculation
    // Group all pending items from active industry orders
    const pendingItemsMap: Record<string, { name: string; sku: string; orders: number }> = {};
    omnichannelOrders
      .filter(o => o.orderStatus === "Chờ xác nhận")
      .forEach(o => {
        o.items.forEach(item => {
          const key = item.sku || item.productName;
          if (!pendingItemsMap[key]) {
            pendingItemsMap[key] = {
              name: item.productName,
              sku: item.sku || "N/A",
              orders: 0
            };
          }
          pendingItemsMap[key].orders += item.quantity;
        });
      });

    // Try to find location for these batch items from InventoryStock
    const batchItems = await Promise.all(
      Object.values(pendingItemsMap).map(async (item) => {
        // Find if this item has stock with location
        const stockRecord = await prisma.inventoryStock.findFirst({
          where: {
            inventoryItemId: {
              in: activeProductIds
            },
            inventoryItem: {
              OR: [
                { code: item.sku },
                { tenHang: item.name }
              ]
            }
          }
        });

        let location = "A1-02"; // default fallback
        if (stockRecord) {
          const parts = [];
          if (stockRecord.viTriHang) parts.push(stockRecord.viTriHang);
          if (stockRecord.viTriCot) parts.push(stockRecord.viTriCot);
          if (stockRecord.viTriTang) parts.push(stockRecord.viTriTang);
          if (parts.length > 0) location = parts.join("-");
        }

        return {
          sku: item.sku,
          name: item.name,
          orders: item.orders,
          location
        };
      })
    );

    // 8. Traditional Orders (SaleOrder)
    const saleOrders = await prisma.saleOrder.findMany({
      where: {
        trangThai: {
          in: ["draft", "confirmed"]
        },
        keToanDuyet: "approved"
      },
      include: {
        customer: true
      },
      orderBy: {
        createdAt: "desc"
      }
    });

    const traditionalOrders = saleOrders.map(so => {
      return {
        id: so.code || `B2B-${so.id.substring(0, 5).toUpperCase()}`,
        type: "Đại lý",
        client: so.customer?.name || "Khách hàng truyền thống",
        items: so.ghiChu || "Thiết bị vệ sinh",
        weight: "120 kg", // Default mock weight
        trucks: 1,
        urgent: so.trangThai === "confirmed"
      };
    });

    return NextResponse.json({
      onlineOrdersToPack,
      waitingPickup,
      packagingMaterials: packagingMaterials.slice(0, 5), // Only return first 5 for dashboard
      criticalMaterials,
      availableStock,
      reservedStock,
      returnStock,
      batchItems,
      traditionalOrders
    });
  } catch (e: unknown) {
    console.error("[GET /api/logistics/dashboard]", e);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
