const fs = require('fs');

const file = 'src/app/api/logistics/inventory/route.ts';
let content = fs.readFileSync(file, 'utf-8');

const regex = /(return NextResponse\.json\(newItem\);)/g;

let count = 0;
content = content.replace(regex, (match) => {
  count++;
  // We want to inject before the return NextResponse.json(newItem)
  // to create the InventoryStock mapping.
  return `
      // Tự động gán vào kho
      let targetWhId = warehouseId;
      if (!targetWhId) {
        if (source === "manufactured" || isInventoryCategory) {
          const khoChinh = await prisma.warehouse.findUnique({ where: { code: 'KHO-CHINH' } });
          targetWhId = khoChinh?.id;
        } else {
          const kvp = await prisma.warehouse.findUnique({ where: { code: 'KVP' } });
          targetWhId = kvp?.id;
        }
      }
      if (targetWhId && newItem && newItem.id) {
        // Kiểm tra xem ID có hợp lệ cho bảng InventoryStock không
        // (chỉ dành cho InventoryItem)
        const isInvItem = source === "manufactured" || isInventoryCategory;
        if (isInvItem) {
          await prisma.inventoryStock.upsert({
            where: {
              inventoryItemId_warehouseId: {
                inventoryItemId: newItem.id,
                warehouseId: targetWhId
              }
            },
            update: {},
            create: {
              inventoryItemId: newItem.id,
              warehouseId: targetWhId,
              soLuong: 0
            }
          });
        }
      }
      ${match}`;
});

if (count > 0) {
  fs.writeFileSync(file, content);
  console.log(`Patched POST API in ${count} places!`);
} else {
  console.log("Could not find the return statements.");
}
