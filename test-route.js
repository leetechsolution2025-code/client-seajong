const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const inventoryItems = await prisma.inventoryItem.findMany({ include: { category: true } });
  const materialStocks = await prisma.materialStock.findMany({ include: { material: true } });

  let sanitaryValue = 0;
  let kitchenValue = 0;
  let materialValue = 0;
  const inventoryAlerts = [];

  inventoryItems.forEach((item) => {
    const costPrice = item.giaNhap || (item.giaBan * 0.4) || 0;
    const itemValue = (item.soLuong || 0) * costPrice;

    const catName = (item.category?.name || "Khác").toLowerCase();
    
    if (
      catName.includes("vệ sinh") || catName.includes("ve sinh") || 
      catName.includes("sen") || catName.includes("vòi") || catName.includes("voi") || 
      catName.includes("chậu") || catName.includes("chau") || catName.includes("lavabo") || 
      catName.includes("bồn") || catName.includes("bon") || catName.includes("phòng tắm") || catName.includes("phong tam")
    ) {
      sanitaryValue += itemValue;
    } else if (
      catName.includes("bếp") || catName.includes("bep") || 
      catName.includes("nấu") || catName.includes("nau") || 
      catName.includes("hút mùi") || catName.includes("hut mui") || 
      catName.includes("lò") || catName.includes("lo")
    ) {
      kitchenValue += itemValue;
    } else {
      sanitaryValue += itemValue;
    }

    const safeLimit = item.soLuongMin || 10;
    if (item.soLuong <= safeLimit || item.trangThai === "het-hang") {
      inventoryAlerts.push(item.id);
    }
  });

  materialStocks.forEach(stock => {
    const cost = stock.material?.price || (stock.material?.giaBan || 0) * 0.4 || 0;
    const stockValue = (stock.soLuong || 0) * cost;
    materialValue += stockValue;
    
    const safeLimit = stock.soLuongMin || stock.material?.minStock || 50;
    if (stock.soLuong <= safeLimit) {
      inventoryAlerts.push(stock.id);
    }
  });

  console.log({ sanitaryValue, kitchenValue, materialValue, alerts: inventoryAlerts.length });
}
main().finally(() => prisma.$disconnect());
