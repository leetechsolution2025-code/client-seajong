const fs = require('fs');

const file = 'src/app/api/logistics/sync-web/route.ts';
let content = fs.readFileSync(file, 'utf-8');

const oldLine = `          finalItem = await prisma.inventoryItem.create({
            data: { ...vItemData, donVi: "bộ", soLuong: 0, trangThai: "het-hang" } as any
          });
        }
`;

const newLine = `          finalItem = await prisma.inventoryItem.create({
            data: { ...vItemData, donVi: "bộ", soLuong: 0, trangThai: "het-hang" } as any
          });
        }

        // Tự động gán vào KHO-CHINH
        const khoChinh = await prisma.warehouse.findUnique({ where: { code: 'KHO-CHINH' } });
        if (khoChinh && finalItem) {
          await prisma.inventoryStock.upsert({
            where: {
              inventoryItemId_warehouseId: {
                inventoryItemId: finalItem.id,
                warehouseId: khoChinh.id
              }
            },
            update: {},
            create: {
              inventoryItemId: finalItem.id,
              warehouseId: khoChinh.id,
              soLuong: 0
            }
          });
        }
`;

if (content.includes(oldLine)) {
  content = content.replace(oldLine, newLine);
  fs.writeFileSync(file, content);
  console.log("Patched sync-web API!");
} else {
  console.log("Could not find line in sync-web API");
}
