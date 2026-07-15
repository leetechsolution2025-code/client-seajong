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

    // 2. Tạo Bút toán (JournalEntry)
    const journalEntry = await (prisma as any).journalEntry.create({
      data: {
        entryDate: date || new Date(),
        referenceCode: referenceCode || null,
        description: description,
        sourceModule: rule.sourceModule,
        totalAmount: amount,
        lines: {
          create: [
            {
              accountId: debitAccount.id,
              type: "DEBIT",
              amount: amount,
              description: description
            },
            {
              accountId: creditAccount.id,
              type: "CREDIT",
              amount: amount,
              description: description
            }
          ]
        }
      }
    });

    console.log(`[AccountingEngine] Tự động hạch toán thành công: ${event} (${amount}đ)`);
    return journalEntry;
  } catch (error) {
    console.error(`[AccountingEngine] Lỗi tự động hạch toán:`, error);
    return null;
  }
}
