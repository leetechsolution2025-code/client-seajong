import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const { items } = await req.json();
    
    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ success: false, error: "Dữ liệu không hợp lệ" }, { status: 400 });
    }

    // items is an array of { inventoryItemId: string, pickedQuantity: number }
    for (const item of items) {
      if (!item.inventoryItemId || !item.pickedQuantity) continue;
      
      // Find main warehouse stock
      const stock = await prisma.inventoryStock.findFirst({
        where: {
          inventoryItemId: item.inventoryItemId,
          warehouse: { code: 'KHO-CHINH' }
        }
      });
      
      if (stock) {
        await prisma.inventoryStock.update({
          where: { id: stock.id },
          data: {
            soLuongGiu: {
              increment: item.pickedQuantity
            }
          }
        });
      } else {
        // Fallback: If not found in KHO-CHINH, add to the first available warehouse that has stock
        const anyStock = await prisma.inventoryStock.findFirst({
          where: {
            inventoryItemId: item.inventoryItemId,
            soLuong: { gt: 0 }
          }
        });
        
        if (anyStock) {
          await prisma.inventoryStock.update({
            where: { id: anyStock.id },
            data: {
              soLuongGiu: {
                increment: item.pickedQuantity
              }
            }
          });
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Lỗi khi báo cáo gom hàng:", error);
    return NextResponse.json({ success: false, error: "Đã xảy ra lỗi hệ thống" }, { status: 500 });
  }
}
