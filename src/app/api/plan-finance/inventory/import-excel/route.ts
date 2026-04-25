import { NextRequest, NextResponse } from "next/server";
import { getServerSession }          from "next-auth";
import { authOptions }               from "@/lib/auth";
import { prisma }                    from "@/lib/prisma";
import * as XLSX                     from "xlsx";

const DVT_ALLOWED = new Set([
  "Cái","Chiếc","Bộ","Cuộn","Tấm","Thanh","Kg","Tấn","m","m²","m³","Hộp","Thùng","Lít",
]);

// Cột header trong file Excel
const COL_NAME     = "Tên hàng hoá *";
const COL_SKU      = "Mã SKU";
const COL_CAT      = "Danh mục";
const COL_DVT      = "Đơn vị tính *";
const COL_SL       = "Tồn đầu kỳ";
const COL_SLMIN    = "Tồn tối thiểu";
const COL_GNHAP    = "Giá nhập (VNĐ)";
const COL_GBAN     = "Giá bán (VNĐ)";
const COL_NCC      = "Nhà cung cấp";
const COL_THONGSO  = "Thông số kỹ thuật";
const COL_GHICHU   = "Ghi chú";
const COL_DM_CODE  = "Mã định mức";
const COL_DM_TEN   = "Tên định mức";
const COL_DM_VATTU = "Vật tư định mức";

/** Parse chuỗi vật tư: "TênVậtTư|SốLượng|ĐơnVịTính|GhiChú;..." */
function parseVatTu(raw: string) {
  return raw
    .split(";")
    .map(s => s.trim())
    .filter(Boolean)
    .map(s => {
      const parts = s.split("|");
      return {
        tenVatTu:  (parts[0] ?? "").trim(),
        soLuong:   Math.max(0, Number(parts[1] ?? "1") || 1),
        donViTinh: (parts[2] ?? "").trim() || undefined,
        ghiChu:    (parts[3] ?? "").trim() || undefined,
      };
    })
    .filter(v => v.tenVatTu.length > 0);
}

// POST /api/plan-finance/inventory/import-excel
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "Không tìm thấy file" }, { status: 400 });

    const arrayBuffer = await file.arrayBuffer();
    const wb = XLSX.read(arrayBuffer, { type: "buffer" });

    const sheetName = wb.SheetNames[0];
    const ws = wb.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "" });

    if (rows.length === 0) {
      return NextResponse.json({ error: "File không có dữ liệu" }, { status: 400 });
    }

    // Fetch danh mục → map tên → id
    const allCats = await prisma.inventoryCategory.findMany({ select: { id: true, name: true } });
    const catMap  = new Map(allCats.map(c => [c.name.toLowerCase().trim(), c.id]));

    const errors: string[] = [];

    type RowData = {
      tenHang: string; code?: string; categoryId?: string; donVi?: string;
      soLuong: number; soLuongMin: number; giaNhap: number; giaBan: number;
      nhaCungCap?: string; thongSoKyThuat?: string; ghiChu?: string; trangThai: string;
      dmCode?: string; dmTen?: string; dmVatTu?: string;
    };

    const toCreate: RowData[] = [];

    rows.forEach((row, idx) => {
      const rowNum  = idx + 2;
      const tenHang = String(row[COL_NAME] ?? "").trim();
      const dvt     = String(row[COL_DVT]  ?? "").trim();

      if (!tenHang) { errors.push(`Hàng ${rowNum}: Tên hàng hoá không được để trống`); return; }
      if (!dvt)     { errors.push(`Hàng ${rowNum}: Đơn vị tính không được để trống`);  return; }
      if (!DVT_ALLOWED.has(dvt)) {
        errors.push(`Hàng ${rowNum}: Đơn vị tính "${dvt}" không hợp lệ`); return;
      }

      const soLuong    = Math.max(0, Number(row[COL_SL]    ?? 0) || 0);
      const soLuongMin = Math.max(0, Number(row[COL_SLMIN] ?? 0) || 0);
      const giaNhap    = Math.max(0, Number(row[COL_GNHAP] ?? 0) || 0);
      const giaBan     = Math.max(0, Number(row[COL_GBAN]  ?? 0) || 0);

      const catName = String(row[COL_CAT] ?? "").trim();
      const catId   = catName ? catMap.get(catName.toLowerCase()) : undefined;

      const trangThai = soLuong === 0 ? "het-hang"
        : soLuongMin > 0 && soLuong <= soLuongMin ? "sap-het"
        : "con-hang";

      toCreate.push({
        tenHang,
        code:           String(row[COL_SKU]      ?? "").trim() || undefined,
        categoryId:     catId,
        donVi:          dvt,
        soLuong,
        soLuongMin,
        giaNhap,
        giaBan,
        nhaCungCap:     String(row[COL_NCC]      ?? "").trim() || undefined,
        thongSoKyThuat: String(row[COL_THONGSO]  ?? "").trim() || undefined,
        ghiChu:         String(row[COL_GHICHU]   ?? "").trim() || undefined,
        trangThai,
        dmCode:  String(row[COL_DM_CODE]  ?? "").trim() || undefined,
        dmTen:   String(row[COL_DM_TEN]   ?? "").trim() || undefined,
        dmVatTu: String(row[COL_DM_VATTU] ?? "").trim() || undefined,
      });
    });

    if (errors.length > 0 && toCreate.length === 0) {
      return NextResponse.json({ error: "File có lỗi dữ liệu", errors }, { status: 422 });
    }

    let created = 0;
    let skipped = 0;

    for (const data of toCreate) {
      try {
        const { dmCode, dmTen, dmVatTu, ...itemData } = data;

        // ── Xử lý định mức ──────────────────────────────────────────────────
        let dinhMucId: string | undefined;

        if (dmCode || dmVatTu) {
          const vatTuList = dmVatTu ? parseVatTu(dmVatTu) : [];

          if (dmCode) {
            // Tìm định mức đã tồn tại theo code
            const existing = await prisma.dinhMuc.findUnique({ where: { code: dmCode } });
            if (existing) {
              dinhMucId = existing.id;
            } else {
              // Tạo mới định mức (có hoặc không có vật tư)
              const dm = await prisma.dinhMuc.create({
                data: {
                  code:       dmCode,
                  tenDinhMuc: dmTen || undefined,
                  ...(vatTuList.length > 0 ? { vatTu: { create: vatTuList } } : {}),
                },
              });
              dinhMucId = dm.id;
            }
          } else if (vatTuList.length > 0) {
            // Không có mã định mức nhưng có vật tư → tạo mới không có code
            const dm = await prisma.dinhMuc.create({
              data: {
                tenDinhMuc: dmTen || undefined,
                vatTu: { create: vatTuList },
              },
            });
            dinhMucId = dm.id;
          }
        }

        await prisma.inventoryItem.create({
          data: {
            ...itemData,
            ...(dinhMucId ? { dinhMucId } : {}),
          },
        });
        created++;
      } catch {
        skipped++;
      }
    }

    return NextResponse.json({
      success: true,
      created,
      skipped,
      errors: errors.length > 0 ? errors : undefined,
      message: `Đã nhập ${created} hàng hoá thành công${skipped > 0 ? `, bỏ qua ${skipped} hàng bị lỗi` : ""}.`,
    });
  } catch (e) {
    console.error("[POST /inventory/import-excel]", e);
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
