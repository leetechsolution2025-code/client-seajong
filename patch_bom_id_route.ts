import fs from 'fs';

const path = 'src/app/api/production/bom/[id]/route.ts';
let code = fs.readFileSync(path, 'utf-8');

// Replace materialItem related code
code = code.replace(/manufacturedProduct\s*:\s*\{\s*include:\s*\{\s*category:\s*true\s*\}\s*\}/g, 'items: { include: { category: true } }');
code = code.replace(/materialItem\s*:\s*true/g, '/* materialItem removed */');
code = code.replace(/\.materialItem\./g, '.inventoryItem.');

// Replace update logic
const targetUpdate = `    const dm = await prisma.dinhMuc.update({
      where: { id },
      data: {
        code,
        tenDinhMuc,
        manufacturedProductId: manufacturedProductId || null,
        materialItemId: materialItemId || null,
        vatTu: {
          deleteMany: {},
          create: (vatTu || []).map((v: any) => ({
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
const replaceUpdate = `    const dm = await prisma.dinhMuc.update({
      where: { id },
      data: {
        code,
        tenDinhMuc,
        vatTu: {
          deleteMany: {},
          create: (vatTu || []).map((v: any) => ({
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
    // Link to targetInventoryItemId if specified
    if (targetInventoryItemId) {
      await prisma.inventoryItem.update({
        where: { id: targetInventoryItemId },
        data: { dinhMucId: dm.id }
      });
    }`;
if (code.includes(targetUpdate)) {
  code = code.replace(targetUpdate, replaceUpdate);
}

// Replace vatTu lookup
code = code.replace(/const \{ code, tenDinhMuc, materialItemId, manufacturedProductId, vatTu = \[\] \} = body;/, 'const { code, tenDinhMuc, targetInventoryItemId, vatTu = [] } = body;');

const targetVatTuLookup = `    for (const v of vatTu) {
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
const replaceVatTuLookup = `    for (const v of vatTu) {
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
if (code.includes(targetVatTuLookup)) {
  code = code.replace(targetVatTuLookup, replaceVatTuLookup);
}

fs.writeFileSync(path, code);
console.log('Patched bom/[id]/route.ts');
