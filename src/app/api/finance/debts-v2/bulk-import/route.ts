import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { type, clearOld, debts } = body;

    if (!Array.isArray(debts)) {
      return NextResponse.json({ error: "Dữ liệu không hợp lệ" }, { status: 400 });
    }

    console.log(`[BULK IMPORT] Received ${debts.length} debts for type ${type}, clearOld: ${clearOld}`);

    const result = await prisma.$transaction(async (tx) => {
      let deletedCount = 0;
      
      if (clearOld) {
         // Xoá tất cả các dư nợ đầu kỳ cũ (dựa vào referenceId mặc định)
         const delRes = await (tx.debt as any).deleteMany({
           where: {
             type: {
               in: type === "RECEIVABLE" ? ["RECEIVABLE", "phai-thu"] : ["PAYABLE", "phai-tra"]
             }
           }
         });
         deletedCount = delRes.count;
      }

      let successCount = 0;

      for (const debt of debts) {
         let customerId = debt.customerId || null;
         let supplierId = debt.supplierId || null;

         if (!customerId && debt.customerCode) {
           // @ts-ignore
           const cust = await tx.customer.findUnique({ where: { code: debt.customerCode } });
           if (cust) customerId = cust.id;
         }

         if (!supplierId && debt.supplierCode) {
           // @ts-ignore
           const supp = await tx.supplier.findUnique({ where: { code: debt.supplierCode } });
           if (supp) supplierId = supp.id;
         }
         
         if (!customerId && !supplierId && debt.partnerName) {
           const baseName = debt.partnerName.split(/[-–]/)[0].trim();
           if (type === "RECEIVABLE" || type === "phai-thu") {
             const cust = await tx.customer.findFirst({ where: { name: { contains: baseName } } });
             if (cust) customerId = cust.id;
           } else if (type === "PAYABLE" || type === "phai-tra") {
             const supp = await tx.supplier.findFirst({ where: { name: { contains: baseName } } });
             if (supp) supplierId = supp.id;
           }
         }

         await (tx.debt as any).create({
           data: {
             type,
             partnerName: debt.partnerName,
             amount: debt.amount || 0,
             paidAmount: 0,
             createdAt: debt.createdAt ? new Date(debt.createdAt) : new Date(),
             dueDate: debt.dueDate ? new Date(debt.dueDate) : null,
             description: debt.description || "",
             referenceId: debt.referenceId || "Dư nợ đầu kỳ",
             status: debt.status || "UNPAID",
             customerId,
             supplierId,
           }
         });
         successCount++;
      }

      console.log(`[BULK IMPORT] Transaction success: deleted ${deletedCount}, created ${successCount}`);
      return { deletedCount, successCount, errorCount: 0 };
    });

    return NextResponse.json(result);

  } catch (error: any) {
    console.error("Lỗi bulk import:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
