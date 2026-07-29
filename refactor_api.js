const fs = require('fs');
const path = '/Users/leanhvan/client-seajong/src/app/api/logistics/inventory/route.ts';

let content = fs.readFileSync(path, 'utf8');

const postStart = content.indexOf('export async function POST(req: Request) {');
if (postStart === -1) throw new Error('POST not found');

const newCode = `export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { tenHang, code, categoryId, brand, donVi, soLuongMin, giaNhap, giaBan, kieuDang, thongSoKyThuat, ghiChu, imageUrl, warehouseId, chieuDai, chieuRong, chieuDay, source, material, maThayThe } = body;

    if (!tenHang) return NextResponse.json({ error: "Thiếu tên hàng hoá" }, { status: 400 });

    if (code) {
        const duplicateItem = await prisma.inventoryItem.findFirst({ where: { code } });
        if (duplicateItem) return NextResponse.json({ error: "Mã định danh đã tồn tại trong hệ thống. Vui lòng sử dụng mã khác." }, { status: 400 });
    }

    let mappedCategoryId = categoryId || null;
    let erpCatId = null;
    let loai = "vat-tu";
    
    if (source === "inventory") {
        loai = "hang-hoa";
        mappedCategoryId = categoryId || null;
    } else if (source === "manufactured") {
        loai = "thanh-pham";
        mappedCategoryId = await syncCategoryToInventory(categoryId || null);
    } else {
        loai = "vat-tu";
        mappedCategoryId = await syncCategoryToInventory(categoryId || null);
        erpCatId = categoryId || null;
    }

    const newItem = await prisma.inventoryItem.create({
        data: {
            tenHang,
            code,
            categoryId: mappedCategoryId,
            erpCategoryId: erpCatId,
            brand: brand || "Seajong",
            model: kieuDang || "",
            donVi: donVi || "cái",
            soLuongMin: Number(soLuongMin) || 0,
            giaNhap: Number(giaNhap) || 0,
            giaBan: Number(giaBan) || 0,
            thongSoKyThuat: thongSoKyThuat || "",
            ghiChu: ghiChu || "",
            imageUrl: imageUrl || null,
            soLuong: 0,
            trangThai: "het-hang",
            chieuDai: chieuDai ? parseFloat(chieuDai) : null,
            chieuRong: chieuRong ? parseFloat(chieuRong) : null,
            chieuDay: chieuDay ? parseFloat(chieuDay) : null,
            version: maThayThe || null,
            loai
        } as any
    });

    if (warehouseId) {
        await (prisma as any).inventoryStock.create({
            data: {
                inventoryItemId: newItem.id,
                warehouseId,
                soLuong: 0,
                soLuongMin: Number(soLuongMin) || 0,
                viTriHang: "Chờ sắp xếp"
            }
        });
    }

    return NextResponse.json(newItem);
  } catch (error: any) {
    console.error("[POST /api/logistics/inventory]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const {
      id, tenHang, code, categoryId, brand, donVi, soLuongMin, giaNhap, giaBan, kieuDang, thongSoKyThuat, ghiChu, imageUrl, source,
      chieuDai, chieuRong, chieuDay, material, maThayThe
    } = body;

    if (!id) return NextResponse.json({ error: "Thiếu ID hàng hoá" }, { status: 400 });

    if (code) {
      let currentCode = "";
      if (source === "seajong") {
        const current = await prisma.seajongProduct.findUnique({ where: { id: Number(id) }, select: { slug: true } });
        currentCode = current?.slug || "";
      } else {
        const current = await prisma.inventoryItem.findUnique({ where: { id }, select: { code: true } });
        currentCode = current?.code || "";
      }

      if (code !== currentCode) {
        if (source === "seajong") {
          const duplicateSeajong = await prisma.seajongProduct.findFirst({ where: { slug: code, id: { not: Number(id) } } });
          if (duplicateSeajong) return NextResponse.json({ error: "Mã định danh đã tồn tại trong hệ thống. Vui lòng sử dụng mã khác." }, { status: 400 });
        } else {
          const duplicateItem = await prisma.inventoryItem.findFirst({ where: { code, id: { not: id } } });
          if (duplicateItem) return NextResponse.json({ error: "Mã định danh đã tồn tại trong hệ thống. Vui lòng sử dụng mã khác." }, { status: 400 });
        }
      }
    }

    if (source === "seajong") {
      const updated = await prisma.seajongProduct.update({
        where: { id: Number(id) },
        data: {
          name: tenHang,
          slug: code || undefined,
          price: Number(giaBan) || Number(giaNhap) || undefined,
          description: thongSoKyThuat || undefined,
          images: imageUrl ? JSON.stringify([imageUrl]) : undefined,
        }
      });
      return NextResponse.json(updated);
    } else {
      let mappedCategoryId = categoryId || null;
      let erpCatId = null;

      if (source === "inventory") {
          mappedCategoryId = categoryId || null;
      } else {
          mappedCategoryId = await syncCategoryToInventory(categoryId || null);
          erpCatId = categoryId || null;
      }

      const updated = await prisma.inventoryItem.update({
        where: { id },
        data: {
          tenHang,
          code,
          categoryId: mappedCategoryId,
          ...(source === "material" ? { erpCategoryId: erpCatId } : {}),
          brand: brand || "Seajong",
          model: kieuDang || "",
          donVi,
          soLuongMin: Number(soLuongMin) || 0,
          giaNhap: Number(giaNhap) || 0,
          giaBan: Number(giaBan) || 0,
          thongSoKyThuat,
          ghiChu,
          imageUrl: imageUrl !== undefined ? imageUrl : undefined,
          chieuDai: chieuDai ? parseFloat(chieuDai) : null,
          chieuRong: chieuRong ? parseFloat(chieuRong) : null,
          chieuDay: chieuDay ? parseFloat(chieuDay) : null,
          version: maThayThe || null
        } as any,
      });

      return NextResponse.json(updated);
    }
  } catch (error: any) {
    console.error("[PUT /api/logistics/inventory]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const source = searchParams.get("source") || "material";

    if (!id) return NextResponse.json({ error: "Thiếu ID hàng hoá" }, { status: 400 });

    if (source === "seajong") {
      await prisma.seajongProduct.delete({ where: { id: Number(id) } });
    } else {
      const item = await prisma.inventoryItem.findUnique({ where: { id } });
      if (item && item.code) {
        let text = "Xoá hàng hoá/vật tư";
        if (item.loai === "thanh-pham") text = "Xoá thành phẩm";
        else if (item.loai === "vat-tu") text = "Xoá vật tư";
        await deleteAutoJournalByReference(item.code, text);
      }
      
      await prisma.dinhMucVatTu.updateMany({
        where: { inventoryItemId: id },
        data: { inventoryItemId: null }
      });
      await prisma.stockMovement.deleteMany({ where: { inventoryItemId: id } });
      await prisma.inventoryStock.deleteMany({ where: { inventoryItemId: id } });
      await prisma.inventoryItem.delete({ where: { id } });
    }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error("[DELETE /api/logistics/inventory]", error);
    if (error?.code === "P2003") {
      return NextResponse.json({ error: "Không thể xoá vì mặt hàng này đang được dùng trong Phiếu kho/Đơn hàng/Định mức." }, { status: 400 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
`;

content = content.substring(0, postStart) + newCode;
fs.writeFileSync(path, content);
console.log('Successfully refactored API routes');
