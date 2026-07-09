const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const materialStocks = await prisma.materialStock.findMany({ include: { material: true } });
  const inventoryAlerts = [];
  
  materialStocks.forEach(stock => {
    const cost = stock.material?.price || (stock.material?.giaBan || 0) * 0.4 || 0;
    
    const safeLimit = stock.soLuongMin || stock.material?.minStock || 50;
    if (stock.soLuong <= safeLimit) {
       const alertLevel = stock.soLuong <= (safeLimit / 2) ? "Nguy cấp" : "Cảnh báo";
       const suggestedRestock = Math.max(safeLimit * 2 - stock.soLuong, 100);
       inventoryAlerts.push({
        id: stock.id,
        name: stock.material?.name || "Vật tư",
        code: stock.material?.code || "MAT-" + stock.id.substring(0,4).toUpperCase(),
        currentStock: stock.soLuong,
        safeStock: safeLimit,
        suggestedRestock: suggestedRestock,
        level: alertLevel,
        category: "Vật tư & Linh kiện"
      });
    }
  });
  
  console.log("Alerts:", inventoryAlerts.length);
}
main().catch(console.error).finally(() => prisma.$disconnect());
