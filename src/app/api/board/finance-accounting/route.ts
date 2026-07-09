import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    // const session = await getServerSession(authOptions);
    // if (!session) {
    //   return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    // }

    const now = new Date();
    const currentYear = now.getFullYear();

    const startOfYear = new Date(`${currentYear}-01-01T00:00:00.000Z`);
    const endOfYear = new Date(`${currentYear + 1}-01-01T00:00:00.000Z`);

    // ── 1. Fetch Sales Orders (B2B & B2C) ────────────────────────────────────
    const [b2bOrders, retailInvoices, invoiceItems, omniItems, saleOrderItems] = await Promise.all([
      prisma.saleOrder.findMany({
        where: {
          createdAt: { gte: startOfYear, lt: endOfYear },
          trangThai: { notIn: ["draft", "cancelled"] }
        }
      }),
      prisma.retailInvoice.findMany({
        where: {
          createdAt: { gte: startOfYear, lt: endOfYear }
        }
      }),
      prisma.retailInvoiceItem.findMany({
        where: {
          invoice: {
            createdAt: { gte: startOfYear, lt: endOfYear }
          }
        },
        include: {
          inventoryItem: {
            include: {
              category: true
            }
          }
        }
      }),
      prisma.omnichannelOrderItem.findMany({
        where: {
          order: {
            createdAt: { gte: startOfYear, lt: endOfYear }
          }
        }
      }),
      prisma.saleOrderItem.findMany({
        where: {
          saleOrder: {
            createdAt: { gte: startOfYear, lt: endOfYear },
            trangThai: { notIn: ["draft", "cancelled"] }
          }
        },
        include: {
          inventoryItem: true
        }
      })
    ]);

    let yearlyRevenue = 0;
    b2bOrders.forEach(o => yearlyRevenue += (o.tongTien || 0));
    retailInvoices.forEach(r => yearlyRevenue += (r.tongCong || 0));

    // Dynamic Category Split
    let sanitaryRevenue = 0;
    let kitchenRevenue = 0;
    let otherRevenue = 0;

    invoiceItems.forEach(item => {
      const catName = (item.inventoryItem?.category?.name || "").toLowerCase();
      const itemVal = item.thanhTien || ((item.soLuong || 0) * (item.donGia || 0));
      
      if (
        catName.includes("vệ sinh") || 
        catName.includes("ve sinh") || 
        catName.includes("sen") || 
        catName.includes("vòi") || 
        catName.includes("voi") || 
        catName.includes("chậu") || 
        catName.includes("chau") || 
        catName.includes("lavabo") || 
        catName.includes("bồn") || 
        catName.includes("bon")
      ) {
        sanitaryRevenue += itemVal;
      } else if (
        catName.includes("bếp") || 
        catName.includes("bep") || 
        catName.includes("nấu") || 
        catName.includes("nau") || 
        catName.includes("hút mùi") || 
        catName.includes("hut mui") || 
        catName.includes("lò") || 
        catName.includes("lo")
      ) {
        kitchenRevenue += itemVal;
      } else {
        otherRevenue += itemVal;
      }
    });

    const totalB2CRevenue = sanitaryRevenue + kitchenRevenue + otherRevenue;

    const productSalesMap: Record<string, { id: string, name: string, code: string, quantity: number, revenue: number }> = {};
    
    invoiceItems.forEach(item => {
      if (item.inventoryItem) {
        const pId = item.inventoryItemId!;
        if (!productSalesMap[pId]) {
          productSalesMap[pId] = {
            id: pId,
            name: item.tenHang || item.inventoryItem.tenHang,
            code: item.inventoryItem.code || "",
            quantity: 0,
            revenue: 0
          };
        }
        productSalesMap[pId].quantity += (item.soLuong || 0);
        productSalesMap[pId].revenue += (item.thanhTien || 0);
      }
    });

    omniItems.forEach(item => {
      const pId = item.sku || item.productName;
      if (!productSalesMap[pId]) {
        productSalesMap[pId] = {
          id: pId,
          name: item.productName,
          code: item.sku || "",
          quantity: 0,
          revenue: 0
        };
      }
      productSalesMap[pId].quantity += item.quantity;
      productSalesMap[pId].revenue += (item.price * item.quantity);
    });

    saleOrderItems.forEach(item => {
      const pId = item.inventoryItemId || item.id;
      if (!productSalesMap[pId]) {
        productSalesMap[pId] = {
          id: pId,
          name: item.tenHang || item.inventoryItem?.tenHang || "",
          code: item.inventoryItem?.code || "",
          quantity: 0,
          revenue: 0
        };
      }
      productSalesMap[pId].quantity += (item.soLuong || 0);
      productSalesMap[pId].revenue += (item.thanhTien || 0);
    });

    const topSellingProducts = Object.values(productSalesMap)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);

    let sanitaryRatio = 0;
    let kitchenRatio = 0;
    let otherRatio = 0;

    if (totalB2CRevenue > 0) {
      sanitaryRatio = sanitaryRevenue / totalB2CRevenue;
      kitchenRatio = kitchenRevenue / totalB2CRevenue;
      otherRatio = otherRevenue / totalB2CRevenue;
    }

    const finalSanitaryRevenue = Math.round(yearlyRevenue * sanitaryRatio);
    const finalKitchenRevenue = Math.round(yearlyRevenue * kitchenRatio);
    const finalOtherRevenue = Math.round(yearlyRevenue * otherRatio);

    // ── 2. Fetch Debts (Công nợ / Phải thu) ───────────────────────────────────
    const debts = await prisma.debt.findMany({
      where: { status: "UNPAID" }
    });

    let totalReceivables = 0;
    let receivablesOverdue = 0;
    let receivablesDue = 0;
    let receivablesInTerm = 0;

    debts.forEach(d => {
      const outstanding = (d.amount || 0) - (d.paidAmount || 0);
      const typeLower = (d.type || "").toLowerCase();
      if (typeLower === "receivable" || typeLower === "phai-thu") {
        totalReceivables += outstanding;
        if (d.dueDate && new Date(d.dueDate) < now) {
          receivablesOverdue += outstanding;
        } else if (d.dueDate && new Date(d.dueDate).getTime() - now.getTime() < 7 * 24 * 3600 * 1000) {
          receivablesDue += outstanding;
        } else {
          receivablesInTerm += outstanding;
        }
      }
    });

    // ── 3. Fetch Inventory Value, Valuations, and Alerts ────────────────────
    const [inventoryItems, materialStocks] = await Promise.all([
      prisma.inventoryItem.findMany({
        include: { category: true }
      }),
      prisma.materialStock.findMany({
        include: { material: true }
      })
    ]);

    let sanitaryValue = 0;
    let kitchenValue = 0;
    let materialValue = 0;
    const inventoryAlerts: any[] = [];

    inventoryItems.forEach((item) => {
      const costPrice = item.giaNhap || (item.giaBan * 0.4) || 0;
      const totalQty = item.soLuong || 0;
      const itemValue = totalQty * costPrice;

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
        // Any other finished goods are grouped into sanitary by default or ignored. Let's group them into sanitaryValue.
        sanitaryValue += itemValue;
      }

      const safeLimit = item.soLuongMin || 10;
      if (item.soLuong <= safeLimit || item.trangThai === "het-hang") {
        const alertLevel = item.soLuong <= (safeLimit / 2) ? "Nguy cấp" : "Cảnh báo";
        const suggestedRestock = Math.max(safeLimit * 2 - item.soLuong, 15);
        
        inventoryAlerts.push({
          id: item.id,
          name: item.tenHang,
          code: item.code || "SKU-" + item.id.substring(0,4).toUpperCase(),
          currentStock: item.soLuong,
          safeStock: safeLimit,
          suggestedRestock: suggestedRestock,
          level: alertLevel,
          category: item.category?.name || "Khác"
        });
      }
    });

    materialStocks.forEach(stock => {
      const cost = stock.material?.price || (stock.material?.giaBan || 0) * 0.4 || 0;
      const stockValue = (stock.soLuong || 0) * cost;
      materialValue += stockValue;
      
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

    const totalInventoryValue = sanitaryValue + kitchenValue + materialValue;

    const inventoryValuations = [
      { name: "Thiết bị vệ sinh", amount: sanitaryValue, pct: "0%", color: "#3b82f6" },
      { name: "Thiết bị nhà bếp", amount: kitchenValue, pct: "0%", color: "#f59e0b" },
      { name: "Vật tư và linh kiện", amount: materialValue, pct: "0%", color: "#10b981" }
    ];

    inventoryValuations.forEach(cat => {
      cat.pct = totalInventoryValue > 0 ? Math.round((cat.amount / totalInventoryValue) * 100) + "%" : "0%";
    });
    inventoryValuations.sort((a, b) => b.amount - a.amount);

    inventoryAlerts.sort((a, b) => (a.currentStock - a.safeStock) - (b.currentStock - b.safeStock));

    // ── 4. Fetch Expenses & Payrolls (Chi phí) ───────────────────────────────
    const [expenses, payrolls] = await Promise.all([
      prisma.expense.findMany({
        where: {
          ngayChiTra: { gte: startOfYear, lt: endOfYear },
          trangThai: "paid"
        }
      }),
      prisma.payroll.findMany({
        where: {
          createdAt: { gte: startOfYear, lt: endOfYear }
        }
      })
    ]);

    let totalCost = 0;
    expenses.forEach(e => totalCost += (e.soTien || 0));
    payrolls.forEach(p => totalCost += (p.tongChiPhiCty || p.luongThucNhan || p.luongCoBan || 0));

    // ── 5. Cash Flow (Dòng tiền) ─────────────────────────────────────────────
    // Inflow: daThanhToan from B2B + paid from retail
    let yearlyCashInflow = 0;
    b2bOrders.forEach(o => yearlyCashInflow += (o.daThanhToan || 0));
    retailInvoices.forEach(r => yearlyCashInflow += ((r.tongCong || 0) - (r.conNo || 0)));

    const yearlyCashFlow = yearlyCashInflow - totalCost;
    const totalCashAvailable = yearlyCashFlow;

    // ── 6. Query Plan Targets ────────────────────────────────────────────────
    const salesPlan = await prisma.salesYearlyPlan.findUnique({
      where: { year: currentYear }
    });

    let targetRevenue = 0;
    let targetCost = 0;

    if (salesPlan) {
      try {
        const planRowsList = JSON.parse(salesPlan.planRows || "[]");
        
        const revRow = planRowsList.find((r: any) => r.stt === "1" || r.item?.toLowerCase().includes("doanh thu"));
        if (revRow?.target) {
          targetRevenue = Number(revRow.target);
        }

        const costRow = planRowsList.find((r: any) => r.stt === "2" || r.item?.toLowerCase().includes("chi phí") || r.item?.toLowerCase().includes("chi phi"));
        if (costRow?.target) {
          targetCost = Number(costRow.target);
        }
      } catch (e) {}
    }

    const grossProfit = Math.round(yearlyRevenue * 0.4);
    const profitBeforeTax = Math.round(yearlyRevenue - totalCost);

    const progressRevenue = targetRevenue > 0 ? Math.min(100, Math.round((yearlyRevenue / targetRevenue) * 100)) : 0;
    const progressCost = targetCost > 0 ? Math.min(100, Math.round((totalCost / targetCost) * 100)) : 0;

    // ── 7. Construct Response Data ───────────────────────────────────────────
    const rows = [
      // 1. DOANH THU
      { stt: 1, item: "Doanh thu", value: yearlyRevenue, target: targetRevenue, progress: progressRevenue },
      { stt: "1.1", item: "Doanh thu thuần luỹ kế", value: yearlyRevenue, target: targetRevenue, progress: progressRevenue, isChild: true },
      { stt: "-", item: "Thiết bị vệ sinh", value: finalSanitaryRevenue, target: 0, progress: 0, isGrandchild: true },
      { stt: "-", item: "Thiết bị nhà bếp", value: finalKitchenRevenue, target: 0, progress: 0, isGrandchild: true },
      { stt: "-", item: "Phụ kiện và các loại thiết bị khác", value: finalOtherRevenue, target: 0, progress: 0, isGrandchild: true },
      { stt: "1.2", item: "Lợi nhuận gộp", value: grossProfit, target: 0, progress: 0, isChild: true },

      // 2. DÒNG TIỀN
      { stt: 2, item: "Dòng tiền", value: totalCashAvailable, target: 0, progress: 0 },
      { stt: "2.1", item: "Tổng tiền mặt sẵn có", value: totalCashAvailable, target: 0, progress: 0, isChild: true, hideProgress: true },
      { stt: "2.2", item: "Tổng nợ phải thu từ khách hàng", value: totalReceivables, target: 0, progress: 0, isChild: true, hideProgress: true },
      { stt: "-", item: "Nợ phải thu quá hạn", value: receivablesOverdue, target: 0, progress: 0, isGrandchild: true },
      { stt: "-", item: "Nợ phải thu đến hạn", value: receivablesDue, target: 0, progress: 0, isGrandchild: true },
      { stt: "-", item: "Nợ phải thu trong hạn", value: receivablesInTerm, target: 0, progress: 0, isGrandchild: true },
      { stt: "2.3", item: "Giá trị tồn kho hiện tại", value: totalInventoryValue, target: 0, progress: 0, isChild: true, hideProgress: true },

      // 3. CHI PHÍ VÀ LỢI NHUẬN
      { stt: 3, item: "Chi phí và lợi nhuận", value: totalCost, target: targetCost, progress: progressCost },
      { stt: "3.1", item: "Chi phí bán hàng và quản lý luỹ kế", value: totalCost, target: targetCost, progress: progressCost, isChild: true },
      { stt: "3.2", item: "Lợi nhuận trước thuế", value: profitBeforeTax, target: 0, progress: 0, isChild: true },
    ];

    return NextResponse.json({
      success: true,
      rows,
      indicators: {
        yearlyRevenue,
        monthlyRevenue: Math.round(yearlyRevenue / 12),
        cashAvailable: totalCashAvailable,
        inventoryValue: totalInventoryValue,
        targetRevenue
      },
      inventoryValuations,
      inventoryAlerts,
      topSellingProducts
    });
  } catch (e: unknown) {
    console.error("[GET /api/board/finance-accounting] ERROR:", e);
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
