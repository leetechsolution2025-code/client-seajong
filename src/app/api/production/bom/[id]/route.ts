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
        dv.materialId  AS dv_materialId,
        dv.tenVatTu    AS dv_tenVatTu,
        dv.soLuong     AS dv_soLuong,
        dv.donViTinh   AS dv_donViTinh,
        dv.ghiChu      AS dv_ghiChu,
        mi.id          AS mi_id,
        mi.name        AS mi_name,
        mi.code        AS mi_code,
        mi.unit        AS mi_unit,
        mi.material    AS mi_material,
        mi.spec        AS mi_spec,
        mi.thongSoKyThuat AS mi_thongSoKyThuat,
        mi.imageUrl    AS mi_imageUrl,
        ic.name        AS mi_categoryName
      FROM DinhMuc dm
      LEFT JOIN DinhMucVatTu dv ON dv.dinhMucId = dm.id
      LEFT JOIN MaterialItem mi ON mi.id = dv.materialId
      LEFT JOIN InventoryCategory ic ON ic.id = mi.categoryId
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
          materialId: r.dv_materialId,
          tenVatTu: r.dv_tenVatTu,
          soLuong: r.dv_soLuong,
          donViTinh: r.dv_donViTinh,
          ghiChu: r.dv_ghiChu,
          material: r.mi_id ? {
            id: r.mi_id,
            tenHang: r.mi_name,
            code: r.mi_code,
            donVi: r.mi_unit,
            material: r.mi_material,
            spec: r.mi_spec,
            thongSoKyThuat: r.mi_thongSoKyThuat,
            imageUrl: r.mi_imageUrl,
            category: r.mi_categoryName ? { name: r.mi_categoryName } : null
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
    const { code, tenDinhMuc, vatTu = [] } = body;

    // Xoá toàn bộ dòng cũ rồi tạo lại
    await prisma.$executeRaw`DELETE FROM DinhMucVatTu WHERE dinhMucId = ${id}`;

    await prisma.$executeRaw`
      UPDATE DinhMuc SET code = ${code}, tenDinhMuc = ${tenDinhMuc}, updatedAt = CURRENT_TIMESTAMP
      WHERE id = ${id}
    `;

    for (const v of vatTu) {
      const lineId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      await prisma.$executeRaw`
        INSERT INTO DinhMucVatTu (id, dinhMucId, materialId, tenVatTu, soLuong, donViTinh, ghiChu)
        VALUES (${lineId}, ${id}, ${v.materialId || null}, ${v.tenVatTu}, ${v.soLuong || 1}, ${v.donViTinh || ''}, ${v.ghiChu || ''})
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

    await prisma.$executeRaw`DELETE FROM DinhMucVatTu WHERE dinhMucId = ${id}`;
    await prisma.$executeRaw`DELETE FROM DinhMuc WHERE id = ${id}`;
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[DELETE /api/production/bom/:id]", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
