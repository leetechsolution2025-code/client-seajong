import fs from 'fs';

const path = 'src/app/api/plan-finance/sales/[id]/route.ts';
let code = fs.readFileSync(path, 'utf-8');

// Replace the warehouse logic
const target = `      let warehouseCode = "KHO-CHINH";
      
      const mfp = await prisma.manufacturedProduct.findFirst({
        where: { name: item.tenHang }
      });
      if (mfp) {
        warehouseCode = "KHO-THANHPHAM";
        if (!resolvedDinhMucId) {
          const dm = await prisma.dinhMuc.findFirst({
            where: { manufacturedProductId: mfp.id }
          });
          if (dm) resolvedDinhMucId = dm.id;
        }
      } else if (item.inventoryItem?.loai === "hang-hoa") {
        warehouseCode = "KHO-CHINH";
      } else if (item.materialItem) {
        warehouseCode = "KVP";
      }`;

const replacement = `      let warehouseCode = "KHO-CHINH";
      if (!resolvedDinhMucId && item.inventoryItem) {
        const dm = await prisma.dinhMuc.findFirst({
          where: { items: { some: { id: item.inventoryItem.id } } }
        });
        if (dm) resolvedDinhMucId = dm.id;
      }`;

if (code.includes(target)) {
  code = code.replace(target, replacement);
}

// Another place where materialItem might be used? Let's remove any other occurrences.
code = code.replace(/include:\s*\{\s*materialItem:\s*true\s*\}/g, '');
code = code.replace(/include:\s*\{\s*vatTu:\s*\{\s*include:\s*\{\s*material:\s*true\s*\}\s*\}\s*\}/g, 'include: { vatTu: { include: { inventoryItem: true } } }');
code = code.replace(/\.material\./g, '.inventoryItem.');
code = code.replace(/item\.materialItem/g, 'null');

fs.writeFileSync(path, code);
console.log('Patched sales/[id]/route.ts');
