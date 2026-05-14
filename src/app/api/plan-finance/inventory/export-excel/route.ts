import { NextResponse }   from "next/server";
import { getServerSession } from "next-auth";
import { authOptions }      from "@/lib/auth";
import { prisma }           from "@/lib/prisma";
import * as XLSX            from "xlsx";

// GET /api/plan-finance/inventory/export-excel
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const items = await prisma.inventoryItem.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        category: { select: { name: true } },
        stocks:   { select: { soLuong: true } },
      },
    });

    const headers = [
      "Tên hàng hoá", "Mã SKU", "Danh mục", "Đơn vị tính",
      "Tồn kho thực", "Tồn tối thiểu", "Giá nhập (VNĐ)", "Giá bán (VNĐ)",
      "Nhà cung cấp", "Trạng thái", "Thông số kỹ thuật", "Ghi chú",
    ];

    const STATUS_LABEL: Record<string, string> = {
      "con-hang": "Còn hàng",
      "sap-het":  "Sắp hết",
      "het-hang": "Đã hết",
    };

    const rows = items.map(it => {
      const tonThuc = it.stocks.reduce((s, st) => s + st.soLuong, 0);
      return [
        it.tenHang,
        it.code ?? "",
        it.category?.name ?? "",
        it.donVi ?? "",
        tonThuc > 0 ? tonThuc : it.soLuong,
        it.soLuongMin,
        it.giaNhap,
        it.giaBan,
        it.nhaCungCap ?? "",
        STATUS_LABEL[it.trangThai] ?? it.trangThai,
        it.thongSoKyThuat ?? "",
        it.ghiChu ?? "",
      ];
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    ws["!cols"] = [
      { wch: 30 }, { wch: 14 }, { wch: 18 }, { wch: 14 },
      { wch: 12 }, { wch: 14 }, { wch: 16 }, { wch: 16 },
      { wch: 20 }, { wch: 12 }, { wch: 30 }, { wch: 20 },
    ];
    XLSX.utils.book_append_sheet(wb, ws, "Hàng hoá");

    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
    const now = new Date().toISOString().slice(0, 10);

    return new NextResponse(buf, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="hang-hoa-${now}.xlsx"`,
      },
    });
  } catch (e) {
    console.error("[GET /inventory/export-excel]", e);
    return NextResponse.json({ error: "Lỗi xuất dữ liệu" }, { status: 500 });
  }
}
