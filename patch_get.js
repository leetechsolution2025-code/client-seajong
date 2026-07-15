const fs = require('fs');
const file = 'src/app/api/plan-finance/sales/[id]/route.ts';
let code = fs.readFileSync(file, 'utf8');

const fetchItemsRegex = /(\/\/ Fallback: Populate missing inventoryItem details.*?)(const guest = parseGuestInfo\(order\.ghiChu\);)/s;

const newCode = `// Fallback: Populate missing inventoryItem details by matching tenHang
    for (const item of orderItems) {
      if (!item.inventoryItem && item.tenHang) {
        const invItem = await prisma.inventoryItem.findFirst({
          where: { tenHang: item.tenHang },
          select: { imageUrl: true, code: true, soLuong: true, dinhMucId: true }
        });
        if (invItem) {
          item.inventoryItem = invItem;
        }
      }
    }

    // Tính toán số lượng thiếu và kiểm tra kho vật tư
    for (const item of orderItems) {
      const requiredQty = item.soLuong || 1;
      const currentStock = item.inventoryItem?.soLuong || 0;
      const missingQty = Math.max(0, requiredQty - currentStock);
      
      item.missingQty = missingQty;
      item.canProduce = false;
      
      if (missingQty > 0) {
        // Tìm BOM
        let itemCode = null;
        try {
          if (item.ghiChu) {
            const meta = JSON.parse(item.ghiChu);
            if (meta.code) itemCode = meta.code;
          }
        } catch(e){}

        let resolvedDinhMucId = item.inventoryItem?.dinhMucId || null;
        if (!resolvedDinhMucId && itemCode) {
          const dm = await prisma.dinhMuc.findFirst({ 
            where: { OR: [ { code: \`DM-\${itemCode}\` }, { code: itemCode } ] } 
          });
          if (dm) resolvedDinhMucId = dm.id;
        }

        if (resolvedDinhMucId) {
          // Fetch BOM materials
          const bom = await prisma.dinhMuc.findUnique({
            where: { id: resolvedDinhMucId },
            include: { vatTu: true }
          });
          
          if (bom && bom.vatTu && bom.vatTu.length > 0) {
            let hasEnoughMaterials = true;
            for (const vt of bom.vatTu) {
              const neededMat = (vt.soLuong || 1) * missingQty;
              // Check stock in MaterialStock for KVP or general
              const matStock = await prisma.materialStock.aggregate({
                where: { materialId: vt.materialId },
                _sum: { soLuong: true }
              });
              const stockMat = matStock._sum.soLuong || 0;
              if (stockMat < neededMat) {
                hasEnoughMaterials = false;
                break;
              }
            }
            item.canProduce = hasEnoughMaterials;
            item.dinhMucId = resolvedDinhMucId;
            item.isManufactured = true;
          } else {
            item.isManufactured = false;
          }
        } else {
          item.isManufactured = false;
        }
      }
    }

    `;

code = code.replace(fetchItemsRegex, newCode + "$2");
fs.writeFileSync(file, code);
