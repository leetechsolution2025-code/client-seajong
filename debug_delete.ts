import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const itemCode = 'TSC03S';
  const item = await prisma.inventoryItem.findFirst({
    where: { code: itemCode },
    include: { stocks: true }
  });
  
  if (!item) {
    console.log("Item not found");
    return;
  }
  
  console.log(`Current stocks for ${itemCode}:`);
  console.dir(item.stocks, { depth: null });
  
  // Create a dummy sale order holding 10 items
  const order = await prisma.saleOrder.create({
    data: {
      code: 'DEBUG-DEL-1',
      trangThai: 'draft',
      saleOrderItems: {
        create: [
          {
            inventoryItemId: item.id,
            tenHang: item.tenHang,
            soLuong: 10,
            donGia: 1000,
            thanhTien: 10000
          }
        ]
      }
    }
  });
  
  console.log(`Created order ${order.id}`);
  
  // Manually increment stock to simulate hold
  const stock = item.stocks[0];
  await prisma.inventoryStock.update({
    where: { id: stock.id },
    data: { soLuongGiu: { increment: 10 } }
  });
  
  console.log(`Incremented soLuongGiu on stock ${stock.id} by 10`);
  
  const stockBeforeDelete = await prisma.inventoryStock.findUnique({ where: { id: stock.id } });
  console.log(`soLuongGiu before delete API: ${stockBeforeDelete?.soLuongGiu}`);
  
  // Call DELETE API endpoint locally via fetch
  const res = await fetch(`http://localhost:3000/api/plan-finance/sales/${order.id}`, {
    method: 'DELETE',
    headers: { 'Cookie': 'next-auth.session-token=1' } // this might fail due to auth, let's just run the logic directly
  });
  
  console.log(`API response status: ${res.status}`);
  if (!res.ok) {
     console.log(await res.text());
  }
  
  const stockAfterAPI = await prisma.inventoryStock.findUnique({ where: { id: stock.id } });
  console.log(`soLuongGiu after API delete: ${stockAfterAPI?.soLuongGiu}`);
}
main().catch(console.error).finally(() => prisma.$disconnect());
