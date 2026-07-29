import fs from 'fs';
import path from 'path';

function patchBatchKiemKho() {
  const p = path.join('src/app/api/plan-finance/stock-movements/batch-kiem-kho/route.ts');
  let code = fs.readFileSync(p, 'utf-8');
  const target = `      await prisma.inventoryStock.upsert({
        where:  { inventoryItemId_warehouseId: { inventoryItemId, warehouseId: wId } },
        create: { inventoryItemId, warehouseId: wId, soLuong: Math.max(0, soLuongThucTe) },
        update: { soLuong: Math.max(0, soLuongThucTe) },
      });`;
  const addition = `

      // ĐỒNG BỘ SANG MATERIAL STOCK NẾU LÀ VẬT TƯ
      const invItemInfo = await prisma.inventoryItem.findUnique({ where: { id: inventoryItemId } });
      if (invItemInfo && invItemInfo.code) {
        const mat = await prisma.materialItem.findFirst({ where: { code: invItemInfo.code } });
        if (mat) {
          await prisma.materialStock.upsert({
            where: { materialId_warehouseId: { materialId: mat.id, warehouseId: wId } },
            create: { materialId: mat.id, warehouseId: wId, soLuong: Math.max(0, soLuongThucTe), soLuongMin: 0 },
            update: { soLuong: Math.max(0, soLuongThucTe) }
          });
        }
      }`;
  if (code.includes(target) && !code.includes('ĐỒNG BỘ SANG MATERIAL STOCK')) {
    code = code.replace(target, target + addition);
    fs.writeFileSync(p, code);
    console.log("Patched batch-kiem-kho/route.ts");
  }
}

function patchStockMovements() {
  const p = path.join('src/app/api/plan-finance/stock-movements/route.ts');
  let code = fs.readFileSync(p, 'utf-8');
  
  // Patch target 1 (xuat/nhap)
  const target1 = `      await prisma.inventoryStock.upsert({
        where:  { inventoryItemId_warehouseId: { inventoryItemId, warehouseId: toWarehouseId ?? fromWarehouseId ?? "" } },
        create: { inventoryItemId, warehouseId: toWarehouseId ?? fromWarehouseId ?? "", soLuong: soLuongMoi },
        update: { soLuong: soLuongMoi },
      });`;
  const addition1 = `
      const targetWId = toWarehouseId ?? fromWarehouseId ?? "";
      const invItemInfo = await prisma.inventoryItem.findUnique({ where: { id: inventoryItemId } });
      if (invItemInfo && invItemInfo.code) {
        const mat = await prisma.materialItem.findFirst({ where: { code: invItemInfo.code } });
        if (mat && targetWId) {
          await prisma.materialStock.upsert({
            where: { materialId_warehouseId: { materialId: mat.id, warehouseId: targetWId } },
            create: { materialId: mat.id, warehouseId: targetWId, soLuong: soLuongMoi, soLuongMin: 0 },
            update: { soLuong: soLuongMoi }
          });
        }
      }`;
      
  // Patch target 2 (dieu-chinh)
  const target2 = `      await prisma.inventoryStock.upsert({
        where:  { inventoryItemId_warehouseId: { inventoryItemId, warehouseId: adjWarehouseId } },
        create: { inventoryItemId, warehouseId: adjWarehouseId, soLuong: soLuongMoi },
        update: { soLuong: soLuongMoi },
      });`;
  const addition2 = `
      const invItemInfo2 = await prisma.inventoryItem.findUnique({ where: { id: inventoryItemId } });
      if (invItemInfo2 && invItemInfo2.code) {
        const mat = await prisma.materialItem.findFirst({ where: { code: invItemInfo2.code } });
        if (mat && adjWarehouseId) {
          await prisma.materialStock.upsert({
            where: { materialId_warehouseId: { materialId: mat.id, warehouseId: adjWarehouseId } },
            create: { materialId: mat.id, warehouseId: adjWarehouseId, soLuong: soLuongMoi, soLuongMin: 0 },
            update: { soLuong: soLuongMoi }
          });
        }
      }`;

  if (code.includes(target1) && !code.includes('const targetWId =')) {
    code = code.replace(target1, target1 + addition1);
  }
  if (code.includes(target2) && !code.includes('invItemInfo2')) {
    code = code.replace(target2, target2 + addition2);
  }
  fs.writeFileSync(p, code);
  console.log("Patched stock-movements/route.ts");
}

patchBatchKiemKho();
patchStockMovements();
