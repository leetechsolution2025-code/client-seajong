const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const inventoryItems = await prisma.inventoryItem.findMany({ include: { category: true } });
  const materialStocks = await prisma.materialStock.findMany({ include: { material: true } });

  let materialValue = 0;
  let contributors = [];

  inventoryItems.forEach((item) => {
    const costPrice = item.giaNhap || (item.giaBan * 0.4) || 0;
    const itemValue = (item.soLuong || 0) * costPrice;

    const catName = (item.category?.name || "Khác").toLowerCase();
    let isMaterial = false;
    if (
      catName.includes("vệ sinh") || catName.includes("ve sinh") || 
      catName.includes("sen") || catName.includes("vòi") || catName.includes("voi") || 
      catName.includes("chậu") || catName.includes("chau") || catName.includes("lavabo") || 
      catName.includes("bồn") || catName.includes("bon") || catName.includes("phòng tắm") || catName.includes("phong tam")
    ) {
      // sanitary
    } else if (
      catName.includes("bếp") || catName.includes("bep") || 
      catName.includes("nấu") || catName.includes("nau") || 
      catName.includes("hút mùi") || catName.includes("hut mui") || 
      catName.includes("lò") || catName.includes("lo")
    ) {
      // kitchen
    } else {
      isMaterial = true;
      materialValue += itemValue;
      if (itemValue > 0) {
        contributors.push({ type: 'InventoryItem', name: item.tenHang, qty: item.soLuong, costPrice, itemValue });
      }
    }
  });

  materialStocks.forEach(stock => {
    const cost = stock.material?.price || (stock.material?.giaBan || 0) * 0.4 || 0;
    const stockValue = (stock.soLuong || 0) * cost;
    materialValue += stockValue;
    if (stockValue > 0) {
      contributors.push({ type: 'MaterialStock', name: stock.material?.name, qty: stock.soLuong, cost, stockValue });
    }
  });

  console.log("Total Material Value:", materialValue);
  contributors.sort((a, b) => b.stockValue - a.stockValue || b.itemValue - a.itemValue);
  console.log("Top 10 contributors:");
  console.log(contributors.slice(0, 10));
}

main().finally(() => prisma.$disconnect());
