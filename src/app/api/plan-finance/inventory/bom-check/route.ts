import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { removeVietnameseTones } from "@/lib/utils";

// POST /api/plan-finance/inventory/bom-check
// Body: { items: { tenHang: string; soLuong: number }[] }
// Returns detailed inventory + BOM breakdown for each item

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { items } = await req.json() as { items: { tenHang: string; soLuong: number }[] };
  if (!Array.isArray(items) || !items.length) return NextResponse.json([]);

  // Lấy toàn bộ inventory (kèm stocks + dinhMuc) một lần để tránh N+1
  const allInv = await prisma.inventoryItem.findMany({
    include: {
      stocks: { select: { soLuong: true } },
      dinhMuc: {
        include: {
          vatTu: {
            select: { id: true, tenVatTu: true, soLuong: true, donViTinh: true, ghiChu: true },
          },
        },
      },
    },
  });

  // Helper: tính tổng tồn kho
  // Nếu có InventoryStock records → cộng tất cả lại
  // Nếu chưa có stock nào (nhập legacy/Excel) → fallback về soLuong cũ
  const tonKhoOf = (inv: typeof allInv[0]) =>
    inv.stocks.length > 0
      ? inv.stocks.reduce((s, st) => s + (st.soLuong ?? 0), 0)
      : inv.soLuong;

  // Helper: tìm item gần đúng theo tên
  const findByName = (name: string) => {
    const norm = removeVietnameseTones(name).toLowerCase();
    return allInv.find(i => removeVietnameseTones(i.tenHang).toLowerCase().includes(norm)
        || norm.includes(removeVietnameseTones(i.tenHang).toLowerCase())) ?? null;
  };

  const result = items.map(({ tenHang, soLuong: yeuCau }) => {
    const invItem = findByName(tenHang);
    const tonKho  = invItem ? tonKhoOf(invItem) : 0;

    // Nếu có định mức → tính phụ kiện
    let dinhMuc: {
      tenDinhMuc: string | null;
      vatTu: {
        tenVatTu: string;
        donViTinh: string | null;
        soLuongMoi: number;     // số lượng phụ kiện cho 1 sản phẩm
        canTong: number;        // số phụ kiện cần cho toàn bộ yêu cầu
        tonKho: number;         // tồn kho hiện có của phụ kiện
        canMuaThem: number;     // cần mua / làm thêm
        ghiChu: string | null;
      }[];
    } | null = null;

    if (invItem?.dinhMuc) {
      const dm = invItem.dinhMuc;
      const vatTuChecked = dm.vatTu.map((vt) => {
        const canTong   = vt.soLuong * yeuCau;
        const vtInv     = findByName(vt.tenVatTu);
        const vtTon     = vtInv ? tonKhoOf(vtInv) : 0;
        const canMuaThem = Math.max(0, canTong - vtTon);
        return {
          tenVatTu:    vt.tenVatTu,
          donViTinh:   vt.donViTinh ?? null,
          soLuongMoi:  vt.soLuong,
          canTong,
          tonKho:      vtTon,
          canMuaThem,
          ghiChu:      vt.ghiChu ?? null,
        };
      });

      dinhMuc = {
        tenDinhMuc: dm.tenDinhMuc ?? null,
        vatTu: vatTuChecked,
      };
    }

    // Thiếu hàng: tự thân thiếu HOẶC phụ kiện thiếu
    const thieuHangThanThan = tonKho < yeuCau;
    const thieuVatTu = dinhMuc ? dinhMuc.vatTu.some(v => v.canMuaThem > 0) : false;

    return {
      tenHang,
      donVi:     invItem?.donVi ?? "cái",
      yeuCau,
      tonKho,
      thieuHang: thieuHangThanThan || thieuVatTu,
      coBOM:     !!invItem?.dinhMuc,
      dinhMuc,
    };
  });

  return NextResponse.json(result);
}
