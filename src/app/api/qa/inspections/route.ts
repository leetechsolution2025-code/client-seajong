import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    // Auto seed mock data if empty
    const count = await prisma.qualityInspection.count();
    if (count === 0) {
      const mockData = [
        { code: "QC-20260717-107", type: "IQC", productName: "Cartridge gốm 35mm", inspectorName: "Nguyễn Thị D", requesterDept: "Bộ phận Mua hàng", status: "Chưa thực hiện", notes: "Chờ kiểm tra lô hàng mới nhập", executionTime: new Date("2026-07-17T09:00:00Z") },
        { code: "QC-20260717-106", type: "OQC", productName: "Thân vòi đồng thau đúc", inspectorName: "Lê Văn E", requesterDept: "Bộ phận Sản xuất", status: "Chưa thực hiện", notes: "Cần kiểm tra độ dày thành lỗ", executionTime: new Date("2026-07-17T08:30:00Z") },
        { code: "QC-20260716-105", type: "IQC", productName: "Lõi đồng van chia nước", inspectorName: "Trần Văn A", requesterDept: "Bộ phận Mua hàng", status: "Đã hoàn thành", result: "Đạt", notes: "Kích thước ren đạt chuẩn", executionTime: new Date("2026-07-16T14:30:00Z") },
        { code: "QC-20260716-104", type: "OQC", productName: "Sen cây truyền thống", inspectorName: "Lê Thị B", requesterDept: "Bộ phận Kho vận", status: "Đã hoàn thành", result: "Không đạt", notes: "Trầy xước bề mặt mạ (x2 SP)", executionTime: new Date("2026-07-16T13:15:00Z") },
        { code: "QC-20260716-103", type: "OQC", productName: "Vòi lavabo âm tường (BTP)", inspectorName: "Nguyễn Văn C", requesterDept: "Bộ phận Sản xuất", status: "Đã hoàn thành", result: "Đạt", notes: "Kiểm tra áp lực nội bộ: OK", executionTime: new Date("2026-07-16T10:45:00Z") },
        { code: "QC-20260715-089", type: "IQC", productName: "Dây cấp nước Inox 304", inspectorName: "Trần Văn A", requesterDept: "Bộ phận Mua hàng", status: "Đã hoàn thành", result: "Không đạt", notes: "Chiều dài hụt 2cm so với chuẩn", executionTime: new Date("2026-07-15T16:00:00Z") },
        { code: "QC-20260715-088", type: "OQC", productName: "Vòi bếp dây rút mạ đồng", inspectorName: "Lê Thị B", requesterDept: "Bộ phận Kho vận", status: "Đã hoàn thành", result: "Đạt", notes: "Đầy đủ phụ kiện, ngoại quan đẹp", executionTime: new Date("2026-07-15T14:20:00Z") },
        { code: "QC-20260715-087", type: "OQC", productName: "Củ sen nóng lạnh", inspectorName: "Nguyễn Văn C", requesterDept: "Bộ phận Sản xuất", status: "Đã hoàn thành", result: "Không đạt", notes: "Lắp ráp sai vị trí gioăng cao su", executionTime: new Date("2026-07-15T09:30:00Z") },
      ];
      await prisma.qualityInspection.createMany({ data: mockData });
    }

    const { searchParams } = req.nextUrl;
    const q = searchParams.get("q") ?? "";

    let whereClause: any = {};
    if (q) {
      whereClause.OR = [
        { code: { contains: q } },
        { productName: { contains: q } },
        { inspectorName: { contains: q } },
      ];
    }

    const list = await prisma.qualityInspection.findMany({
      where: whereClause,
      orderBy: { executionTime: "desc" },
      include: {
        inventoryItem: { select: { tenHang: true, code: true } }
      }
    });

    return NextResponse.json(list);
  } catch (error: any) {
    console.error("QA Inspection GET Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
