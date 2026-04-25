import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const now = new Date();
    // 7 ngày trước (tính từ thời điểm hiện tại)
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    // Fetch dữ liệu khách hàng
    const customers = await prisma.customer.findMany({
      select: {
        id: true,
        name: true,
        nhom: true,
        dienThoai: true,
        nguoiChamSoc: {
          select: { fullName: true }
        },
        careHistories: {
          orderBy: { ngayChamSoc: "desc" },
          take: 1,
          select: { ngayChamSoc: true }
        }
      }
    });

    const homNay: any[] = [];
    const boQuen: any[] = [];
    const chuaChamSoc: any[] = [];

    customers.forEach(customer => {
      // @ts-ignore
      const lastCare = customer.careHistories[0]?.ngayChamSoc;

      if (!lastCare) {
        // 1. CHƯA CHĂM SÓC
        chuaChamSoc.push({
          id: customer.id,
          name: customer.name,
          nhom: customer.nhom,
          dienThoai: customer.dienThoai,
          // @ts-ignore
          nguoiChamSoc: customer.nguoiChamSoc
        });
      } else {
        const d_last = new Date(lastCare);
        const d_7 = new Date(sevenDaysAgo);

        // Kiểm tra cùng ngày (năm, tháng, ngày)
        const isSameDay = 
          d_last.getFullYear() === d_7.getFullYear() &&
          d_last.getMonth() === d_7.getMonth() &&
          d_last.getDate() === d_7.getDate();

        // Kiểm tra xem có trước ngày 7 (lâu hơn 7 ngày) không
        const lastTimestamp = new Date(d_last.getFullYear(), d_last.getMonth(), d_last.getDate()).getTime();
        const sevenDaysAgoTimestamp = new Date(d_7.getFullYear(), d_7.getMonth(), d_7.getDate()).getTime();

        const diffDays = Math.floor((new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() - lastTimestamp) / (24 * 60 * 60 * 1000));

        if (isSameDay) {
          // 2. CHĂM SÓC HÔM NAY (Đúng 7 ngày)
          homNay.push({
            id: customer.id,
            name: customer.name,
            nhom: customer.nhom,
            dienThoai: customer.dienThoai,
            // @ts-ignore
            nguoiChamSoc: customer.nguoiChamSoc,
            lastCareDate: lastCare,
            daysSinceLastCare: 7
          });
        } else if (lastTimestamp < sevenDaysAgoTimestamp) {
          // 3. BỊ BỎ QUÊN (> 7 ngày)
          boQuen.push({
            id: customer.id,
            name: customer.name,
            nhom: customer.nhom,
            dienThoai: customer.dienThoai,
            // @ts-ignore
            nguoiChamSoc: customer.nguoiChamSoc,
            lastCareDate: lastCare,
            daysSinceLastCare: diffDays
          });
        }
      }
    });

    return NextResponse.json({ homNay, boQuen, chuaChamSoc });
  } catch (error) {
    console.error("Care plan API error:", error);
    return NextResponse.json({ error: "Lỗi Server" }, { status: 500 });
  }
}
