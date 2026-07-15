import { prisma } from "@/lib/prisma";

// ==========================================
// MAPPING RULES (TỪ ĐIỂN QUY TẮC HẠCH TOÁN)
// ==========================================
export const ACCOUNTING_RULES = {
  // ==========================================
  // 1. KHỐI ĐẦU VÀO & ĐẦU RA (Commercial)
  // ==========================================
  // Bán hàng
  SALES_REVENUE: {
    debitCode: "131", // Phải thu khách hàng
    creditCode: "511", // Doanh thu bán hàng
    sourceModule: "SALES"
  },
  SALES_RECEIPT: {
    debitCode: "111", // Tiền mặt (hoặc 112)
    creditCode: "131", // Phải thu khách hàng
    sourceModule: "SALES"
  },
  // Mua hàng (Procurement)
  PROCUREMENT_LIABILITY: {
    debitCode: "156", // Hàng hoá (hoặc 152/642)
    creditCode: "331", // Phải trả người bán
    sourceModule: "PROCUREMENT"
  },

  // ==========================================
  // 2. KHỐI VẬN HÀNH & TÀI SẢN (Operations)
  // ==========================================
  // Kho hàng & Logistics
  INVENTORY_RECEIPT: {
    debitCode: "156", // Hàng hoá
    creditCode: "331", // Phải trả người bán
    sourceModule: "LOGISTICS"
  },
  INVENTORY_ISSUE: {
    debitCode: "632", // Giá vốn hàng bán
    creditCode: "156", // Hàng hoá
    sourceModule: "LOGISTICS"
  },
  INVENTORY_SHORTAGE: {
    debitCode: "1381", // Tài sản thiếu chờ xử lý
    creditCode: "156", // Hàng hoá
    sourceModule: "LOGISTICS"
  },
  INVENTORY_SURPLUS: {
    debitCode: "156", // Hàng hoá
    creditCode: "3381", // Tài sản thừa chờ xử lý
    sourceModule: "LOGISTICS"
  },
  // Sản xuất (Production)
  PRODUCTION_MATERIAL_ISSUE: {
    debitCode: "154", // Chi phí SXKD dở dang
    creditCode: "152", // Nguyên vật liệu
    sourceModule: "PRODUCTION"
  },
  PRODUCTION_FINISH_GOODS: {
    debitCode: "155", // Thành phẩm
    creditCode: "154", // Chi phí SXKD dở dang
    sourceModule: "PRODUCTION"
  },
  // Tài sản (Assets)
  ASSET_PURCHASE: {
    debitCode: "211", // Tài sản cố định
    creditCode: "331", // Phải trả
    sourceModule: "ASSETS"
  },
  ASSET_DEPRECIATION: {
    debitCode: "642", // Chi phí QLDN
    creditCode: "214", // Hao mòn TSCĐ
    sourceModule: "ASSETS"
  },

  // ==========================================
  // 3. KHỐI TÀI CHÍNH - DÒNG TIỀN (Finance)
  // ==========================================
  // Quỹ & Ngân hàng
  VENDOR_PAYMENT: {
    debitCode: "331", // Phải trả người bán
    creditCode: "111", // Tiền mặt (hoặc 112)
    sourceModule: "CASH"
  },
  CASH_RECEIPT_OTHER: {
    debitCode: "111",
    creditCode: "711", // Thu nhập khác (mặc định)
    sourceModule: "CASH"
  },
  CASH_PAYMENT_OTHER: {
    debitCode: "811", // Chi phí khác (mặc định)
    creditCode: "111",
    sourceModule: "CASH"
  },
  // Quản lý tạm ứng
  ADVANCE_PAYMENT: {
    debitCode: "141", // Tạm ứng
    creditCode: "111", // Tiền mặt
    sourceModule: "ADVANCE"
  },
  ADVANCE_REFUND: {
    debitCode: "642", // Chi phí
    creditCode: "141", // Tạm ứng
    sourceModule: "ADVANCE"
  },

  // ==========================================
  // 4. KHỐI CON NGƯỜI (Human Resources)
  // ==========================================
  PAYROLL_EXPENSE: {
    debitCode: "642", // Chi phí QLDN
    creditCode: "334", // Phải trả người lao động
    sourceModule: "HR"
  },
  PAYROLL_PAYMENT: {
    debitCode: "334", // Phải trả người lao động
    creditCode: "111", // Tiền mặt (hoặc 112)
    sourceModule: "HR"
  },
  INSURANCE_EXPENSE: {
    debitCode: "642", // Chi phí
    creditCode: "338", // Phải trả khác (BHXH)
    sourceModule: "HR"
  }
};

type EventType = keyof typeof ACCOUNTING_RULES;

interface AutoJournalParams {
  event: EventType;
  amount: number;
  referenceCode?: string;
  description: string;
  date?: Date;
  // Cho phép override tài khoản mặc định nếu cần (ví dụ: chuyển khoản ngân hàng thay vì tiền mặt)
  overrideDebitCode?: string;
  overrideCreditCode?: string;
}


async function updateAccountBalance(tx: any, accountId: string, amount: number, isDebit: boolean) {
  const account = await tx.accountingAccount.findUnique({ where: { id: accountId } });
  if (!account) return;
  
  let amountChange = 0;
  if (['ASSET', 'EXPENSE'].includes(account.type)) {
    amountChange = isDebit ? amount : -amount;
  } else {
    amountChange = isDebit ? -amount : amount;
  }

  if (amountChange !== 0) {
    await tx.accountingAccount.update({
      where: { id: accountId },
      data: { balance: { increment: amountChange } }
    });
    
    // Update parent recursively
    if (account.parentId) {
      await updateAccountBalance(tx, account.parentId, amount, isDebit);
    }
  }
}

export async function deleteAutoJournalByReference(referenceCode: string, reason: string) {
  try {
    const journalEntries = await (prisma as any).journalEntry.findMany({
      where: { referenceCode },
      include: { lines: true }
    });

    if (journalEntries.length === 0) return false;

    // Log deletion
    const fs = require('fs');
    const path = require('path');
    const logFile = path.join(process.cwd(), 'deleted_journals.log');
    
    for (const entry of journalEntries) {
      const logData = `[2026-07-15T07:35:10.964Z] DELETED: ${entry.referenceCode} - ${entry.description} - Reason: ${reason}\n` +
                      `Lines: ${JSON.stringify(entry.lines)}\n\n`;
      fs.appendFileSync(logFile, logData);

      // Revert balances
      await (prisma as any).$transaction(async (tx: any) => {
        for (const line of entry.lines) {
          // Reverse the amount: if it was DEBIT, we now simulate CREDIT to reverse it, etc.
          // Wait, reversing a debit means applying a debit of -amount.
          await updateAccountBalance(tx, line.accountId, -line.amount, line.type === 'DEBIT');
        }
        await tx.journalLine.deleteMany({ where: { journalEntryId: entry.id } });
        await tx.journalEntry.delete({ where: { id: entry.id } });
      });
    }
    console.log(`[AccountingEngine] Đã xoá và lưu log ${journalEntries.length} bút toán của ${referenceCode}`);
    return true;
  } catch (error) {
    console.error("[AccountingEngine] Lỗi xoá bút toán:", error);
    return false;
  }
}

export async function createAutoJournal(params: AutoJournalParams) {
  const { event, amount, referenceCode, description, date, overrideDebitCode, overrideCreditCode } = params;
  
  if (!amount || amount <= 0) {
    return null; // Không hạch toán giao dịch 0 đồng
  }

  const rule = ACCOUNTING_RULES[event];
  if (!rule) {
    console.error(`[AccountingEngine] Rule not found for event: ${event}`);
    return null;
  }

  const debitCode = overrideDebitCode || rule.debitCode;
  const creditCode = overrideCreditCode || rule.creditCode;

  try {
    // 1. Tìm ID của tài khoản Nợ & Có từ bảng AccountingAccount
    const debitAccount = await (prisma as any).accountingAccount.findFirst({
      where: { code: debitCode }
    });
    
    const creditAccount = await (prisma as any).accountingAccount.findFirst({
      where: { code: creditCode }
    });

    if (!debitAccount || !creditAccount) {
      console.error(`[AccountingEngine] Account not found: Nợ(${debitCode}) hoặc Có(${creditCode})`);
      return null;
    }

    // 2. Tạo Bút toán và cập nhật số dư
    const journalEntry = await (prisma as any).$transaction(async (tx: any) => {
      const entry = await tx.journalEntry.create({
        data: {
          entryDate: date || new Date(),
          referenceCode: referenceCode || null,
          description: description,
          sourceModule: rule.sourceModule,
          totalAmount: amount,
          lines: {
            create: [
              { accountId: debitAccount.id, type: "DEBIT", amount, description },
              { accountId: creditAccount.id, type: "CREDIT", amount, description }
            ]
          }
        }
      });
      
      await updateAccountBalance(tx, debitAccount.id, amount, true);
      await updateAccountBalance(tx, creditAccount.id, amount, false);
      
      return entry;
    });

    console.log(`[AccountingEngine] Tự động hạch toán thành công: ${event} (${amount}đ)`);
    
    // 3. Thông báo cho Kế toán và Giám đốc
    try {
      const financeUsers = await (prisma as any).user.findMany({
        where: {
          OR: [
            { role: { in: ["ACCOUNTANT", "KETOAN", "FINANCE", "admin", "ADMIN", "SUPERADMIN", "DIRECTOR", "CEO", "GIAMDOC"] } },
            { employee: { departmentCode: { in: ["KETOAN", "FINANCE", "TCKT", "KT", "TC", "BGD", "BOD"] } } },
            { employee: { position: { contains: "Giám đốc" } } },
            { employee: { position: { contains: "CEO" } } },
            { employee: { position: { contains: "Director" } } }
          ]
        },
        select: { id: true }
      });
      const userIds = financeUsers.map((u: any) => u.id);
      
      if (userIds.length > 0) {
        await (prisma as any).notification.create({
          data: {
            title: `🔔 Tự động hạch toán: Phát sinh nghiệp vụ mới`,
            content: `Hệ thống vừa tự động ghi nhận một nghiệp vụ phát sinh (${description}) với số tiền ${new Intl.NumberFormat("vi-VN").format(amount)} VNĐ. Sổ nhật ký chung và các báo cáo tài chính liên quan đã được cập nhật số liệu theo thời gian thực.`,
            type: "info",
            priority: "medium",
            audienceType: "group",
            audienceValue: JSON.stringify(userIds),
            createdById: userIds[0] // Default to a valid user id for system notification
          }
        });
      }
    } catch (notifErr) {
      console.error("[AccountingEngine] Không gửi được thông báo kế toán:", notifErr);
    }

    return journalEntry;
  } catch (error) {
    console.error(`[AccountingEngine] Lỗi tự động hạch toán:`, error);
    return null;
  }
}
