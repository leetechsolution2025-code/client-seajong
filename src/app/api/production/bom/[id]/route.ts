import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/production/bom/[id] – Lấy định mức theo ID
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Step 1: Lấy DinhMuc + vatTu bằng raw query để tránh type conflict với IDE cache
    const rows = await prisma.$queryRaw<any[]>`
      SELECT 
        dm.id          AS dm_id,
        dm.code        AS dm_code,
        dm.tenDinhMuc  AS dm_tenDinhMuc,
        dm.createdAt   AS dm_createdAt,
        dv.id          AS dv_id,
        dv.inventoryItemId  AS dv_inventoryItemId,
        dv.maVatTu     AS dv_maVatTu,
        dv.tenVatTu    AS dv_tenVatTu,
        dv.soLuong     AS dv_soLuong,
        dv.donViTinh   AS dv_donViTinh,
        dv.ghiChu      AS dv_ghiChu,
        mi.id          AS mi_id,
        mi.tenHang        AS mi_name,
        mi.code        AS mi_code,
        mi.maThayThe AS mi_maThayThe,
        mi.donVi        AS mi_unit,
        NULL            AS mi_material,
        NULL            AS mi_spec,
        mi.thongSoKyThuat AS mi_thongSoKyThuat,
        mi.imageUrl    AS mi_imageUrl,
        mi.categoryId  AS mi_categoryId,
        mi.erpCategoryId AS mi_erpCategoryId,
        mi.giaNhap       AS mi_price,
        ic.name        AS mi_categoryName,
        ic.code        AS mi_categoryCode,
        c.name         AS mi_erpCategoryName,
        c.code         AS mi_erpCategoryCode
      FROM DinhMuc dm
      LEFT JOIN DinhMucVatTu dv ON dv.dinhMucId = dm.id
      LEFT JOIN InventoryItem mi ON mi.id = dv.inventoryItemId
      LEFT JOIN InventoryCategory ic ON ic.id = mi.categoryId
      LEFT JOIN Category c ON c.id = mi.erpCategoryId
      WHERE dm.id = ${id}
      ORDER BY dv.id ASC
    `;

    if (!rows || rows.length === 0) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const first = rows[0];
    const result = {
      id: first.dm_id,
      code: first.dm_code,
      tenDinhMuc: first.dm_tenDinhMuc,
      createdAt: first.dm_createdAt,
      vatTu: rows
        .filter((r: any) => r.dv_id)
        .map((r: any) => ({
          id: r.dv_id,
          inventoryItemId: r.dv_inventoryItemId,
          maVatTu: r.dv_maVatTu,
          tenVatTu: r.dv_tenVatTu,
          soLuong: r.dv_soLuong,
          donViTinh: r.dv_donViTinh,
          ghiChu: r.dv_ghiChu,
          material: r.mi_id ? {
            id: r.mi_id,
            tenHang: r.mi_name,
            code: r.mi_code,
            maThayThe: r.mi_maThayThe,
            donVi: r.mi_unit,
            giaNhap: r.mi_price,
            material: r.mi_material,
            spec: r.mi_spec,
            thongSoKyThuat: r.mi_thongSoKyThuat,
            imageUrl: r.mi_imageUrl,
            category: (r.mi_categoryId || r.mi_erpCategoryId) ? { 
              id: r.mi_erpCategoryId || r.mi_categoryId, 
              tenHang: r.mi_erpCategoryName || r.mi_categoryName, 
              code: r.mi_erpCategoryCode || r.mi_categoryCode 
            } : null
          } : null
        }))
    };

    return NextResponse.json(result);
  } catch (e) {
    console.error("[GET /api/production/bom/:id]", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

// PUT /api/production/bom/[id] – Cập nhật định mức
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { code, tenDinhMuc, inventoryItemId, vatTu = [] } = body;

    // Xoá toàn bộ dòng cũ rồi tạo lại
    await prisma.$executeRaw`DELETE FROM DinhMucVatTu WHERE dinhMucId = ${id}`;

    await prisma.$executeRaw`
      UPDATE DinhMuc 
      SET code = ${code}, tenDinhMuc = ${tenDinhMuc}, inventoryItemId = ${inventoryItemId || null}, updatedAt = CURRENT_TIMESTAMP
      WHERE id = ${id}
    `;

    for (const v of vatTu) {
      if (!v.inventoryItemId && (v.maVatTu || v.tenVatTu)) {
        let mat = null;
        if (v.maVatTu) {
          mat = await prisma.inventoryItem.findFirst({ where: { code: v.maVatTu } });
        }
        if (!mat && v.tenVatTu) {
          mat = await prisma.inventoryItem.findFirst({
            where: { tenHang: v.tenVatTu }
          });
        }
        if (!mat) {
          const defaultPrice = 10000 + ((v.tenVatTu || v.maVatTu || "Vattu").length * 2000);
          const giaBan = Math.round((defaultPrice * 1.2) / 1000) * 1000;
          mat = await prisma.inventoryItem.create({
            data: {
              tenHang: v.tenVatTu || v.maVatTu || "Chưa có tên",
              code: v.maVatTu || `AUTO-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
              donVi: v.donViTinh || "Cái",
              giaNhap: defaultPrice,
              giaBan: giaBan
            }
          });
        }
        v.inventoryItemId = mat.id;
      }

      const lineId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      await prisma.$executeRaw`
        INSERT INTO DinhMucVatTu (id, dinhMucId, inventoryItemId, maVatTu, tenVatTu, soLuong, donViTinh, ghiChu)
        VALUES (${lineId}, ${id}, ${v.inventoryItemId || null}, ${v.maVatTu || null}, ${v.tenVatTu || 'Chưa có tên'}, ${v.soLuong || 1}, ${v.donViTinh || ''}, ${v.ghiChu || ''})
      `;
    }

    if (inventoryItemId) {
      await prisma.$executeRaw`
        UPDATE InventoryItem
        SET giaNhap = (
          SELECT COALESCE(SUM(dv.soLuong * i.giaNhap), 0)
          FROM DinhMucVatTu dv
          JOIN InventoryItem i ON dv.inventoryItemId = i.id
          WHERE dv.dinhMucId = ${id}
        )
        WHERE id = ${inventoryItemId}
      `;

      // Tự động tính toán lại giá bán dựa trên giá vốn mới và cấu hình lợi nhuận
      await prisma.$executeRaw`
        UPDATE InventoryItem
        SET giaBan = CASE 
          WHEN phuongPhapTinhLoiNhuan = 'revenue' AND loiNhuanKyVong < 100 THEN ROUND((giaNhap / (1.0 - loiNhuanKyVong / 100.0)) / 1000.0) * 1000
          WHEN phuongPhapTinhLoiNhuan = 'cost' THEN ROUND((giaNhap * (1.0 + loiNhuanKyVong / 100.0)) / 1000.0) * 1000
          ELSE ROUND((giaNhap * 1.3) / 1000.0) * 1000
        END
        WHERE id = ${inventoryItemId}
      `;
    }

    return NextResponse.json({ ok: true, id });
  } catch (e) {
    console.error("[PUT /api/production/bom/:id]", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

// DELETE /api/production/bom/[id]
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // UPDATE ManufacturedProduct is removed because DinhMuc now references ManufacturedProduct, and deleting DinhMuc handles it.
    const dm = await prisma.dinhMuc.findUnique({
      where: { id },
      include: { inventoryItem: true }
    });
    if (dm && dm.inventoryItem && dm.code === `DM-${dm.inventoryItem.code}`) {
      return NextResponse.json({ error: "Không được phép xoá định mức tiêu chuẩn" }, { status: 400 });
    }

    await prisma.$executeRaw`DELETE FROM DinhMucVatTu WHERE dinhMucId = ${id}`;
    await prisma.$executeRaw`DELETE FROM DinhMuc WHERE id = ${id}`;
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[DELETE /api/production/bom/:id]", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

// PATCH /api/production/bom/[id] – Cập nhật thông tin lẻ của định mức (ví dụ: giaBan)
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { giaBan, marginPct, marginType } = body;

    if (giaBan !== undefined) {
      await prisma.$executeRaw`
        UPDATE DinhMuc SET giaBan = ${giaBan}, updatedAt = CURRENT_TIMESTAMP
        WHERE id = ${id}
      `;
      if (marginPct !== undefined && marginType !== undefined) {
        await prisma.$executeRaw`
          UPDATE InventoryItem 
          SET giaBan = ${giaBan}, 
              loiNhuanKyVong = ${marginPct}, 
              phuongPhapTinhLoiNhuan = ${marginType === "revenue" ? "revenue" : "cost"}
          WHERE id = (SELECT inventoryItemId FROM DinhMuc WHERE id = ${id})
        `;
      } else {
        await prisma.$executeRaw`
          UPDATE InventoryItem SET giaBan = ${giaBan}
          WHERE id = (SELECT inventoryItemId FROM DinhMuc WHERE id = ${id})
        `;
      }
    }

    return NextResponse.json({ ok: true, id });
  } catch (e) {
    console.error("[PATCH /api/production/bom/:id]", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
