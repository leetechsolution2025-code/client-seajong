const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const http = require('http');

// A script that literally runs the exact logic of route.ts to see where it crashes.
async function runLogic() {
  const currentYear = new Date().getFullYear();
  const startOfYear = new Date(`${currentYear}-01-01T00:00:00.000Z`);
  const endOfYear = new Date(`${currentYear + 1}-01-01T00:00:00.000Z`);
  const now = new Date();

  // 1. Fetch Sales Orders
  const [b2bOrders, retailInvoices, invoiceItems, omniItems, saleOrderItems] = await Promise.all([
    prisma.saleOrder.findMany({ where: { createdAt: { gte: startOfYear, lt: endOfYear }, trangThai: { notIn: ["draft", "cancelled"] } } }),
    prisma.retailInvoice.findMany({ where: { createdAt: { gte: startOfYear, lt: endOfYear } } }),
    prisma.retailInvoiceItem.findMany({ where: { invoice: { createdAt: { gte: startOfYear, lt: endOfYear } } }, include: { inventoryItem: { include: { category: true } } } }),
    prisma.omnichannelOrderItem.findMany({ where: { order: { createdAt: { gte: startOfYear, lt: endOfYear } } } }),
    prisma.saleOrderItem.findMany({ where: { saleOrder: { createdAt: { gte: startOfYear, lt: endOfYear }, trangThai: { notIn: ["draft", "cancelled"] } } }, include: { inventoryItem: true } })
  ]);
  
  // 2. Fetch Debts
  const debts = await prisma.debt.findMany({ where: { status: "UNPAID" } });

  // 3. Fetch Inventory
  const [inventoryItems, materialStocks] = await Promise.all([
    prisma.inventoryItem.findMany({ include: { category: true } }),
    prisma.materialStock.findMany({ include: { material: true } })
  ]);

  // 4. Fetch Expenses
  const expenses = await prisma.expense.findMany({ where: { paymentDate: { gte: startOfYear, lt: endOfYear }, status: "PAID" } });
  const payrolls = await prisma.payroll.findMany({ where: { month: { gte: startOfYear, lt: endOfYear }, status: "PAID" } });
  
  console.log("All fetches succeeded!");
}
runLogic().catch(e => console.error("RUNTIME ERROR:", e)).finally(() => prisma.$disconnect());
