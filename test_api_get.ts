import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const id = "cmrirh7vg00048oc12dorw1q0"; // The test order ID
  const order = await prisma.saleOrder.findUnique({
    where: { id },
    include: {
      saleOrderItems: {
        include: {
          inventoryItem: { select: { imageUrl: true, code: true, soLuong: true, isManufactured: true, dinhMucId: true } }
        }
      },
    },
  });

  const quotation = await prisma.quotation.findFirst({
    where: { thanhTien: order?.tongTien, trangThai: "won" },
    include: { items: { orderBy: { sortOrder: "asc" } } },
    orderBy: { createdAt: "desc" }
  });

  let orderItems = order?.saleOrderItems || [];
  if (orderItems.length === 0 && quotation) {
    orderItems = quotation.items as any;
  }

  // Populate inventoryItem details
  for (const item of orderItems) {
    if (!item.inventoryItem && item.tenHang) {
      const invItem = await prisma.inventoryItem.findFirst({
        where: { tenHang: item.tenHang },
        select: { imageUrl: true, code: true, soLuong: true, isManufactured: true, dinhMucId: true }
      });
      if (invItem) {
        item.inventoryItem = invItem;
      }
    }
  }

  // Calculate missingQty & canProduce flag
  for (const item of orderItems) {
    const requiredQty = item.soLuong || 1;
    const currentStock = item.inventoryItem?.soLuong || 0;
    const missingQty = Math.max(0, requiredQty - currentStock);
    item.missingQty = missingQty;
    item.canProduce = false;
    
    if (missingQty > 0) {
      // Find BOM
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
          where: { OR: [ { code: `DM-${itemCode}` }, { code: itemCode } ] } 
        });
        if (dm) resolvedDinhMucId = dm.id;
      }

      if (resolvedDinhMucId) {
        // Fetch BOM materials
        const bom = await prisma.dinhMuc.findUnique({
          where: { id: resolvedDinhMucId },
          include: { vatTu: { include: { inventoryItem: true } } }
        });
        if (bom && bom.vatTu && bom.vatTu.length > 0) {
          let hasEnoughMaterials = true;
          for (const vt of bom.vatTu) {
            const neededMat = (vt.soLuong || 1) * missingQty;
            const stockMat = vt.inventoryItem?.soLuong || 0;
            if (stockMat < neededMat) {
              hasEnoughMaterials = false;
              break;
            }
          }
          item.canProduce = hasEnoughMaterials;
        }
      }
    }
  }
  
  console.log(JSON.stringify(orderItems, null, 2));
}

main().finally(() => prisma.$disconnect());
