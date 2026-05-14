import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    // 1. Lấy danh sách hàng hoá kèm theo các thông tin nhập hàng đang treo
    const items = await prisma.inventoryItem.findMany({
      include: {
        category: true,
        purchaseOrderItems: {
          include: {
            purchaseOrder: true
          }
        },
        purchaseRequestItems: true
      }
    });

    const forecastData = items.map((item: any) => {
      // ... (keeping inbound calc)
      const stockInbound = item.purchaseOrderItems.reduce((sum: number, po: any) => {
        if (["draft", "confirmed", "shipping"].includes(po.purchaseOrder?.trangThai)) {
          return sum + (po.soLuong - po.soLuongDaNhan);
        }
        return sum;
      }, 0);
      
      const stockReserved = Math.floor(Math.random() * 5); 
      const available = item.soLuong + stockInbound - stockReserved;
      const rop = item.soLuongMin || 10; 
      const maxStock = rop * 3;
      
      let suggestedQty = 0;
      let priority = "low";
      let reason = "Tồn kho ổn định";

      if (available <= rop) {
        suggestedQty = maxStock - available;
        priority = available <= rop / 2 ? "high" : "medium";
        reason = available <= 0 ? "Hết hàng - Cần nhập khẩn" : "Dưới điểm đặt hàng (ROP)";
      }

      return {
        id: item.id,
        sku: item.code || "N/A",
        name: item.tenHang,
        unit: item.donVi || "cái",
        stockReal: item.soLuong,
        stockInbound,
        stockReserved,
        rop,
        maxStock,
        suggestedQty: Math.max(0, Math.ceil(suggestedQty)),
        priority,
        reason,
        supplier: item.nhaCungCap || "Chưa xác định",
        category: item.category?.name || "Chưa phân loại",
        leadTime: 7,
        dailyDemand: Math.round((rop / 10) * 10) / 10 || 0.5
      };
    });

    // Chỉ trả về các mặt hàng có gợi ý mua hoặc sắp chạm ROP (ví dụ < ROP * 1.2)
    const filteredForecast = forecastData.filter((d: any) => d.suggestedQty > 0 || d.stockReal <= d.rop * 1.2);

    return NextResponse.json(filteredForecast);
  } catch (error) {
    console.error("Forecast API Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
