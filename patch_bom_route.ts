import fs from 'fs';

const path = 'src/app/api/production/bom/route.ts';
let code = fs.readFileSync(path, 'utf-8');

// Replace body destructuring
code = code.replace(/const \{ code, tenDinhMuc, materialItemId, manufacturedProductId, vatTu = \[\] \} = body;/, 'const { code, tenDinhMuc, targetInventoryItemId, vatTu = [] } = body;');

// Replace vatTu loop
const targetLoop = `    for (const v of vatTu) {
      if (!v.materialId && (v.maVatTu || v.tenVatTu)) {
        let mat = null;
        if (v.maVatTu) {
          mat = await prisma.materialItem.findFirst({ where: { code: v.maVatTu } });
        }
        if (!mat && v.tenVatTu) {
          mat = await prisma.materialItem.findFirst({
            where: { name: v.tenVatTu }
          });
        }
        if (!mat) {
          const defaultPrice = 10000 + ((v.tenVatTu || v.maVatTu || "Vattu").length * 2000);
          const giaBan = Math.round((defaultPrice * 1.2) / 1000) * 1000;
          mat = await prisma.materialItem.create({
            data: {
              name: v.tenVatTu || v.maVatTu || "Chưa có tên",
              code: v.maVatTu || \`AUTO-\${Math.random().toString(36).substring(2, 8).toUpperCase()}\`,
              unit: v.donViTinh || "Cái",
              price: defaultPrice,
              giaBan: giaBan
            }
          });
        }
        v.materialId = mat.id;
      }
    }`;

const replaceLoop = `    for (const v of vatTu) {
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
              code: v.maVatTu || \`AUTO-\${Math.random().toString(36).substring(2, 8).toUpperCase()}\`,
              donVi: v.donViTinh || "Cái",
              giaNhap: defaultPrice,
              giaBan: giaBan,
              loai: 'vat-tu'
            }
          });
        }
        v.inventoryItemId = mat.id;
      }
    }`;

if (code.includes(targetLoop)) {
  code = code.replace(targetLoop, replaceLoop);
}

// Replace creation logic
const targetCreate = `    // Tạo định mức mới
    const dm = await prisma.dinhMuc.create({
      data: {
        code: finalCode,
        tenDinhMuc,
        manufacturedProductId: manufacturedProductId || null,
        materialItemId: materialItemId || null,
        vatTu: {
          create: vatTu.map((v: any) => ({
            materialId: v.materialId || null,
            maVatTu: v.maVatTu || null,
            tenVatTu: v.tenVatTu || "Chưa có tên",
            soLuong: v.soLuong || 1,
            donViTinh: v.donViTinh || "Cái",
            ghiChu: v.ghiChu || null
          }))
        }
      }
    });`;

const replaceCreate = `    // Tạo định mức mới
    const dm = await prisma.dinhMuc.create({
      data: {
        code: finalCode,
        tenDinhMuc,
        vatTu: {
          create: vatTu.map((v: any) => ({
            inventoryItemId: v.inventoryItemId || null,
            maVatTu: v.maVatTu || null,
            tenVatTu: v.tenVatTu || "Chưa có tên",
            soLuong: v.soLuong || 1,
            donViTinh: v.donViTinh || "Cái",
            ghiChu: v.ghiChu || null
          }))
        }
      }
    });
    if (targetInventoryItemId) {
      await prisma.inventoryItem.update({
        where: { id: targetInventoryItemId },
        data: { dinhMucId: dm.id }
      });
    }`;

if (code.includes(targetCreate)) {
  code = code.replace(targetCreate, replaceCreate);
}

fs.writeFileSync(path, code);
console.log('Patched bom/route.ts');
