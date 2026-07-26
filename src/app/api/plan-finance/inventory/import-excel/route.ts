import { NextRequest, NextResponse } from "next/server";
import { getServerSession }          from "next-auth";
import { authOptions }               from "@/lib/auth";
import { prisma }                    from "@/lib/prisma";
import * as XLSX                     from "xlsx";

const DVT_ALLOWED = new Set([
  "Cái","Chiếc","Bộ","Cuộn","Tấm","Thanh","Kg","Tấn","m","m²","m³","Hộp","Thùng","Lít",
]);

// Cột header trong file Excel
const COL_NAMES    = ["tên hàng hoá *", "tên sản phẩm", "tên vật tư"];
const COL_SKUS     = ["mã sku", "mã thành phẩm", "mã vật tư", "mã hàng"];
const COL_MATHAYTHES= ["mã thay thế", "ma thay the", "mã thay thê", "mã thay the", "ma thay thế"];
const COL_CATS     = ["danh mục", "mã nhóm pm", "mã nhóm"];
const COL_DVTS     = ["đơn vị tính *", "đơn vị tính", "đvt"];
const COL_SLS      = ["tồn đầu kỳ", "số lượng"];
const COL_SLMINS   = ["tồn tối thiểu"];
const COL_GNHAPS   = ["giá nhập (vnđ)", "giá nhập"];
const COL_GBANS    = ["giá bán (vnđ)", "giá bán"];
const COL_NCCS     = ["nhà cung cấp"];
const COL_THONGSOS = ["thông số kỹ thuật"];
const COL_GHICHUS  = ["ghi chú"];
const COL_DM_CODES = ["mã định mức"];
const COL_DM_TENS  = ["tên định mức"];
const COL_DM_VATTUS= ["vật tư định mức"];

function removeAccents(str: string) {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D');
}

function getVal(row: Record<string, unknown>, keys: string[]): any {
  for (const key of Object.keys(row)) {
    const normalizedKey = removeAccents(key.toLowerCase()).replace(/[^a-z0-9]/g, '');
    const normalizedKeys = keys.map(k => removeAccents(k.toLowerCase()).replace(/[^a-z0-9]/g, ''));
    if (normalizedKeys.includes(normalizedKey) || normalizedKeys.some(nk => normalizedKey.includes(nk))) {
      return row[key];
    }
  }
  return undefined;
}

/** Parse chuỗi vật tư: "TênVậtTư|SốLượng|ĐơnVịTính|GhiChú;..." */
function parseVatTu(raw: string) {
  return raw
    .split(";")
    .map(s => s.trim())
    .filter(Boolean)
    .map(s => {
      const parts = s.split("|");
      return {
        materialId: undefined as string | undefined,
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
    
    // DEBUG: Write headers to file
    const fs = require("fs");
    fs.writeFileSync("/tmp/excel-headers.json", JSON.stringify(Object.keys(rows[0])));
    fs.writeFileSync("/tmp/excel-row-tay47.json", JSON.stringify(rows.find((r: any) => Object.values(r).some(v => String(v).includes("TAY47"))) || {}));

    // Đọc active_industry_code để lọc theo ngành hàng (loại doanh nghiệp)
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
      activeIndustryCode = "sanitary";
    }

    // Fetch danh mục → map tên → id cho InventoryCategory
    const allInvCats = await prisma.inventoryCategory.findMany({
      where: { isActive: true },
      select: { id: true, name: true, code: true },
    });
    const invCatMap = new Map<string, string>();
    allInvCats.forEach(c => {
      if (c.name) invCatMap.set(c.name.toLowerCase().trim(), c.id);
      if (c.code) invCatMap.set(c.code.toLowerCase().trim(), c.id);
    });

    // Fetch danh mục cho MaterialItem (Category table)
    const allCats = await prisma.category.findMany({
      where: { isActive: true },
      select: { id: true, name: true, code: true },
    });
    const matCatMap = new Map<string, string>();
    allCats.forEach(c => {
      if (c.name) matCatMap.set(c.name.toLowerCase().trim(), c.id);
      if (c.code) matCatMap.set(c.code.toLowerCase().trim(), c.id);
    });

    const errors: string[] = [];

    type RowData = {
      tenHang: string; code?: string; maThayThe?: string; categoryId?: string; matCategoryId?: string; donVi?: string;
      soLuong: number; soLuongMin: number; giaNhap: number; giaBan: number;
      nhaCungCap?: string; thongSoKyThuat?: string; ghiChu?: string; trangThai: string;
      dmCode?: string; dmTen?: string; dmVatTu?: string;
    };

    const toCreate: RowData[] = [];

    for (const [idx, row] of rows.entries()) {
      const rowNum  = idx + 2;
      const tenHang = String(getVal(row, COL_NAMES) ?? "").trim();
      const dvt     = String(getVal(row, COL_DVTS) ?? "cái").trim();

      if (!tenHang) { errors.push(`Hàng ${rowNum}: Tên hàng hoá không được để trống`); continue; }
      if (!dvt)     { errors.push(`Hàng ${rowNum}: Đơn vị tính không được để trống`);  continue; }

      const catName = String(getVal(row, COL_CATS) ?? "").trim();
      const catId   = catName ? invCatMap.get(catName.toLowerCase()) : undefined;
      const matCategoryId = catName ? matCatMap.get(catName.toLowerCase()) : undefined;

      if (catName && !catId && !matCategoryId) {
        errors.push(`Hàng ${rowNum}: Danh mục "${catName}" không tồn tại trong hệ thống (Sai mã nhóm)`);
        continue;
      }

      const soLuong    = Math.max(0, Number(getVal(row, COL_SLS) ?? 0) || 0);
      const soLuongMin = Math.max(0, Number(getVal(row, COL_SLMINS) ?? 0) || 0);
      const giaNhap    = Math.max(0, Number(getVal(row, COL_GNHAPS) ?? 0) || 0);
      const giaBan     = Math.max(0, Number(getVal(row, COL_GBANS) ?? 0) || 0);

      const trangThai = soLuong === 0 ? "het-hang"
        : soLuongMin > 0 && soLuong <= soLuongMin ? "sap-het"
        : "con-hang";

      toCreate.push({
        tenHang,
        code:           String(getVal(row, COL_SKUS) ?? "").trim() || undefined,
        maThayThe:      String(getVal(row, COL_MATHAYTHES) ?? "").trim() || undefined,
        categoryId:     catId,
        matCategoryId:  matCategoryId,
        donVi:          dvt,
        soLuong,
        soLuongMin,
        giaNhap,
        giaBan,
        nhaCungCap:     String(getVal(row, COL_NCCS) ?? "").trim() || undefined,
        thongSoKyThuat: String(getVal(row, COL_THONGSOS) ?? "").trim() || undefined,
        ghiChu:         String(getVal(row, COL_GHICHUS) ?? "").trim() || undefined,
        trangThai,
        dmCode:         String(getVal(row, COL_DM_CODES) ?? "").trim() || undefined,
        dmTen:          String(getVal(row, COL_DM_TENS) ?? "").trim() || undefined,
        dmVatTu:        String(getVal(row, COL_DM_VATTUS) ?? "").trim() || undefined,
      });
    }

    if (errors.length > 0 && toCreate.length === 0) {
      return NextResponse.json({ error: "File có lỗi dữ liệu", errors }, { status: 422 });
    }

    // XÓA dữ liệu Hàng hoá hiện tại để cập nhật toàn bộ dữ liệu mới từ Excel
    await prisma.inventoryItem.deleteMany({});
    
    // Nếu muốn xóa trắng cả Vật tư (Material) thì mở comment dòng dưới (Lưu ý: sẽ làm đứt liên kết BOM)
    // await prisma.materialItem.deleteMany({});

    let created = 0;
    let skipped = 0;

    for (const data of toCreate) {
      try {
        const { dmCode, dmTen, dmVatTu, ...itemData } = data;

        // ── Xử lý định mức ──────────────────────────────────────────────────
        let dinhMucId: string | undefined;

        if (dmCode || dmVatTu) {
          const vatTuList = dmVatTu ? parseVatTu(dmVatTu) : [];

          // Auto lookup or create MaterialItems for vatTuList
          for (const v of vatTuList) {
            let mat = await prisma.materialItem.findFirst({
              where: { name: v.tenVatTu }
            });
            if (!mat) {
              const defaultPrice = 10000 + (v.tenVatTu.length * 2000);
              const giaBan = Math.round((defaultPrice * 1.2) / 1000) * 1000;
              mat = await prisma.materialItem.create({
                data: {
                  name: v.tenVatTu,
                  code: `AUTO-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
                  maThayThe: itemData.maThayThe || null,
                  unit: v.donViTinh || "Cái",
                  price: defaultPrice,
                  giaBan: giaBan,
                  categoryId: itemData.matCategoryId || null
                } as any
              });
            } else if (itemData.maThayThe && (mat as any).maThayThe !== itemData.maThayThe) {
              mat = await prisma.materialItem.update({
                where: { id: mat.id },
                data: { maThayThe: itemData.maThayThe, categoryId: itemData.matCategoryId || null } as any
              });
            }
            v.materialId = mat.id;
          }

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

        if (itemData.code) {
          await prisma.inventoryItem.upsert({
            where: { code: itemData.code },
            update: {
              ...itemData,
              maThayThe: itemData.maThayThe || null,
              ...(dinhMucId ? { dinhMucId } : {}),
            } as any,
            create: {
              ...itemData,
              maThayThe: itemData.maThayThe || null,
              ...(dinhMucId ? { dinhMucId } : {}),
            } as any,
          });
        } else {
          await prisma.inventoryItem.create({
            data: {
              ...itemData,
              maThayThe: itemData.maThayThe || null,
              ...(dinhMucId ? { dinhMucId } : {}),
            } as any,
          });
        }

        // ĐỒNG BỘ: Cập nhật luôn MaterialItem (Vật tư nền tảng) nếu nó tồn tại để BOM (Định mức) nhận được dữ liệu mới
        if (itemData.code) {
          await prisma.materialItem.updateMany({
            where: { code: itemData.code },
            data: {
              maThayThe: itemData.maThayThe || null,
              categoryId: itemData.matCategoryId || null,
            }
          });
        }
        
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
