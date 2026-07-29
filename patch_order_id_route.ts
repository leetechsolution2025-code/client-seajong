import fs from 'fs';

const path = 'src/app/api/production/orders/[id]/route.ts';
let code = fs.readFileSync(path, 'utf-8');

const targetFallback = `      // Fallback: Tìm sản phẩm cấu thành (ManufacturedProduct) theo tên hàng
      const product = await prisma.manufacturedProduct.findFirst({
        where: { name: orderItem.tenHang },
        include: {
          dinhMucs: {
            include: {
              vatTu: {
                include: {
                  material: true,
                  category: true
                }
              }
            }
          }
        }
      });
      bom = product?.dinhMucs?.[0] || null;

      if (!bom) {
        // Fallback 2: Tìm MaterialItem theo tên hàng
        const materialItem = await prisma.materialItem.findFirst({
          where: { name: orderItem.tenHang },
          include: {
            dinhMucs: {
              include: {
                vatTu: {
                  include: {
                    material: true,
                    category: true
                  }
                }
              }
            }
          }
        });
        bom = materialItem?.dinhMucs?.[0] || null;
      }`;
const replaceFallback = `      // Tìm BOM qua InventoryItem
      const invItem = await prisma.inventoryItem.findFirst({
        where: { tenHang: orderItem.tenHang },
        include: {
          dinhMuc: {
            include: {
              vatTu: {
                include: {
                  inventoryItem: true,
                  category: true
                }
              }
            }
          }
        }
      });
      bom = invItem?.dinhMuc || null;`;
if (code.includes(targetFallback)) {
  code = code.replace(targetFallback, replaceFallback);
}

// In loop `for (const vt of bom.vatTu)`
code = code.replace(/const matId = vt\.material\?\.id \|\| vt\.id;/g, 'const matId = vt.inventoryItem?.id || vt.id;');
code = code.replace(/const matCode = vt\.material\?\.code \|\| vt\.maVatTu \|\| "UNKNOWN";/g, 'const matCode = vt.inventoryItem?.code || vt.maVatTu || "UNKNOWN";');
code = code.replace(/const matName = vt\.material\?\.name \|\| vt\.tenVatTu \|\| "UNKNOWN";/g, 'const matName = vt.inventoryItem?.tenHang || vt.tenVatTu || "UNKNOWN";');
code = code.replace(/const categoryName = vt\.category\?\.name \|\| vt\.material\?\.category\?\.name \|\| "Khác";/g, 'const categoryName = vt.category?.name || "Khác";');

// In PATCH handler
const targetProductUpdate = `           const product = await tx.manufacturedProduct.findFirst({
             where: { name: item.tenHang }
           });
           
           if (product) {
             // 3. Cập nhật tồn kho thành phẩm (+ số lượng)
             await tx.manufacturedProduct.update({
               where: { id: product.id },
               data: {
                 soLuong: { increment: item.soLuong }
               }
             });
             
             // Ghi lịch sử nhập kho thành phẩm
             await tx.stockMovement.create({
               data: {
                 manufacturedProductId: product.id,
                 type: 'IN',
                 quantity: item.soLuong,
                 reference: \`Hoàn thành sản xuất lệnh \${order.code}\`,
                 description: 'Nhập kho thành phẩm'
               }
             });
           } else {
              // try material
              const mat = await tx.materialItem.findFirst({ where: { name: item.tenHang } });
              if (mat) {
                // update material stock in KHO-THANHPHAM (or KVP if appropriate)
                const ws = "KHO-THANHPHAM";
                await tx.materialStock.upsert({
                  where: { materialId_warehouseId: { materialId: mat.id, warehouseId: ws } },
                  create: { materialId: mat.id, warehouseId: ws, soLuong: item.soLuong, soLuongMin: 0 },
                  update: { soLuong: { increment: item.soLuong } }
                });
                
                await tx.stockMovement.create({
                  data: {
                    materialId: mat.id,
                    warehouseId: ws,
                    type: 'IN',
                    quantity: item.soLuong,
                    reference: \`Hoàn thành sản xuất lệnh \${order.code}\`,
                    description: 'Nhập kho thành phẩm (phụ kiện)'
                  }
                });
              }
           }`;
const replaceProductUpdate = `           const invItem = await tx.inventoryItem.findFirst({
             where: { tenHang: item.tenHang }
           });
           
           if (invItem) {
             const ws = "KHO-CHINH";
             // 3. Cập nhật tồn kho InventoryStock (+ số lượng)
             await tx.inventoryStock.upsert({
               where: { inventoryItemId_warehouseId: { inventoryItemId: invItem.id, warehouseId: ws } },
               create: { inventoryItemId: invItem.id, warehouseId: ws, soLuong: item.soLuong },
               update: { soLuong: { increment: item.soLuong } }
             });
             
             // Cập nhật tổng số lượng
             const allStocks = await tx.inventoryStock.findMany({ where: { inventoryItemId: invItem.id } });
             const tongSL = allStocks.reduce((a, b) => a + b.soLuong, 0) + item.soLuong;
             await tx.inventoryItem.update({
               where: { id: invItem.id },
               data: { soLuong: tongSL }
             });
             
             // Ghi lịch sử nhập kho thành phẩm (StockMovement)
             await tx.stockMovement.create({
               data: {
                 inventoryItemId: invItem.id,
                 toWarehouseId: ws,
                 type: 'nhap',
                 soLuong: item.soLuong,
                 lyDo: 'Nhập kho thành phẩm',
                 soChungTu: \`Hoàn thành SX \${order.code}\`
               }
             });
           }`;
if (code.includes('const product = await tx.manufacturedProduct.findFirst')) {
  code = code.replace(/const product = await tx\.manufacturedProduct\.findFirst\(\{[\s\S]*?\}\s*\n\s*\}\n/m, replaceProductUpdate);
  // Using a simpler replace because of regex complexity with many nested blocks
} else {
  console.log("targetProductUpdate not found");
}

fs.writeFileSync(path, code);
console.log('Patched production orders [id]/route.ts');
