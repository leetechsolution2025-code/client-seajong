import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const year = parseInt(searchParams.get("year") || String(new Date().getFullYear()));
    const month = parseInt(searchParams.get("month") || String(new Date().getMonth() + 1));
    const tab = searchParams.get("tab") || "income";

    const startOfMonth = new Date(year, month - 1, 1);
    const endOfMonth = new Date(year, month, 1);

    // 1. Fetch all accounts
    const allAccounts = await (prisma as any).accountingAccount.findMany({
      orderBy: { code: 'asc' }
    });

    // 2. Fetch all journal lines before endOfMonth
    const allLines = await (prisma as any).journalLine.findMany({
      where: {
        journalEntry: {
          entryDate: { lt: endOfMonth }
        }
      },
      include: {
        journalEntry: true
      }
    });

    // 3. Setup balance map
    const accountBalances = new Map<string, {
      openingDebit: number, openingCredit: number,
      arisingDebit: number, arisingCredit: number,
      closingDebit: number, closingCredit: number
    }>();

    for (const acc of allAccounts) {
       accountBalances.set(acc.id, { openingDebit: 0, openingCredit: 0, arisingDebit: 0, arisingCredit: 0, closingDebit: 0, closingCredit: 0 });
    }

    // 4. Add manual opening balances (MonthlyBalance)
    // Assuming MonthlyBalance acts as the initial starting point (e.g. at the start of system usage)
    const manualBalances = await (prisma as any).monthlyBalance.findMany();
    for (const bal of manualBalances) {
        const balDate = new Date(bal.year, bal.month - 1, 1);
        if (balDate <= startOfMonth) { // If it was entered before or in this month
            const acc = accountBalances.get(bal.accountId);
            if (acc) {
                acc.openingDebit += bal.openingDebit;
                acc.openingCredit += bal.openingCredit;
            }
        }
    }

    // 5. Accumulate from JournalLines
    for (const line of allLines) {
       const acc = accountBalances.get(line.accountId);
       if (!acc) continue;
       
       const isBeforeMonth = line.journalEntry.entryDate < startOfMonth;
       
       if (isBeforeMonth) {
          if (line.type === "DEBIT") acc.openingDebit += line.amount;
          else acc.openingCredit += line.amount;
       } else {
          if (line.type === "DEBIT") acc.arisingDebit += line.amount;
          else acc.arisingCredit += line.amount;
       }
    }

    // 6. Consolidate Net Balances
    for (const acc of allAccounts) {
       const bal = accountBalances.get(acc.id)!;
       
       // Calculate net opening
       if (acc.type === "ASSET" || acc.type === "EXPENSE") {
           const netOpening = bal.openingDebit - bal.openingCredit;
           bal.openingDebit = netOpening > 0 ? netOpening : 0;
           bal.openingCredit = netOpening < 0 ? Math.abs(netOpening) : 0;
           
           const netClosing = bal.openingDebit - bal.openingCredit + bal.arisingDebit - bal.arisingCredit;
           bal.closingDebit = netClosing > 0 ? netClosing : 0;
           bal.closingCredit = netClosing < 0 ? Math.abs(netClosing) : 0;
       } else {
           const netOpening = bal.openingCredit - bal.openingDebit;
           bal.openingCredit = netOpening > 0 ? netOpening : 0;
           bal.openingDebit = netOpening < 0 ? Math.abs(netOpening) : 0;
           
           const netClosing = bal.openingCredit - bal.openingDebit + bal.arisingCredit - bal.arisingDebit;
           bal.closingCredit = netClosing > 0 ? netClosing : 0;
           bal.closingDebit = netClosing < 0 ? Math.abs(netClosing) : 0;
       }
    }

    // Helper to get balance for a specific code prefix (e.g. "111", "131")
    const getBalance = (prefix: string, type: 'opening' | 'arising' | 'closing' = 'closing') => {
        let total = 0;
        for (const acc of allAccounts) {
            if (acc.code.startsWith(prefix)) {
                const bal = accountBalances.get(acc.id)!;
                if (type === 'opening') {
                    total += (acc.type === 'ASSET' || acc.type === 'EXPENSE') ? (bal.openingDebit - bal.openingCredit) : (bal.openingCredit - bal.openingDebit);
                } else if (type === 'arising') {
                    total += (acc.type === 'ASSET' || acc.type === 'EXPENSE') ? (bal.arisingDebit - bal.arisingCredit) : (bal.arisingCredit - bal.arisingDebit);
                } else {
                    total += (acc.type === 'ASSET' || acc.type === 'EXPENSE') ? (bal.closingDebit - bal.closingCredit) : (bal.closingCredit - bal.closingDebit);
                }
            }
        }
        return total;
    };
    
    const getArising = (prefix: string, side: 'DEBIT' | 'CREDIT') => {
        let total = 0;
        for (const acc of allAccounts) {
            if (acc.code.startsWith(prefix)) {
                const bal = accountBalances.get(acc.id)!;
                total += side === 'DEBIT' ? bal.arisingDebit : bal.arisingCredit;
            }
        }
        return total;
    };

    // ==========================================
    // TAB 1: TRIAL BALANCE (CÂN ĐỐI TÀI KHOẢN)
    // ==========================================
    if (tab === "trial") {
      const trialData = allAccounts.map((acc: any) => {
          const bal = accountBalances.get(acc.id)!;
          return {
              accountCode: acc.code,
              accountName: acc.name,
              openingDebit: bal.openingDebit,
              openingCredit: bal.openingCredit,
              arisingDebit: bal.arisingDebit,
              arisingCredit: bal.arisingCredit,
              closingDebit: bal.closingDebit,
              closingCredit: bal.closingCredit,
          };
      }).filter((a: any) => a.openingDebit > 0 || a.openingCredit > 0 || a.arisingDebit > 0 || a.arisingCredit > 0 || a.closingDebit > 0 || a.closingCredit > 0);

      const analysis = { summary: "Dữ liệu được trích xuất trực tiếp từ Sổ nhật ký chung.", score: 95 };
      return NextResponse.json({ success: true, analysis, data: trialData });
    }

    // ==========================================
    // TAB 2: INCOME STATEMENT (KẾT QUẢ KINH DOANH)
    // ==========================================
    if (tab === "income") {
      // Doanh thu (511)
      const revenue = getArising("511", "CREDIT") - getArising("511", "DEBIT");
      // Các khoản giảm trừ (521) - if any
      const deductions = getArising("521", "DEBIT") - getArising("521", "CREDIT");
      const netRevenue = revenue - deductions;
      // Giá vốn (632)
      const cogs = getArising("632", "DEBIT") - getArising("632", "CREDIT");
      
      const grossProfit = netRevenue - cogs;
      
      const finRevenue = getArising("515", "CREDIT") - getArising("515", "DEBIT");
      const finExpense = getArising("635", "DEBIT") - getArising("635", "CREDIT");
      const sellExpense = getArising("641", "DEBIT") - getArising("641", "CREDIT");
      const adminExpense = getArising("642", "DEBIT") - getArising("642", "CREDIT");
      
      const operatingProfit = grossProfit + finRevenue - finExpense - sellExpense - adminExpense;
      
      const otherIncome = getArising("711", "CREDIT") - getArising("711", "DEBIT");
      const otherExpense = getArising("811", "DEBIT") - getArising("811", "CREDIT");
      const otherProfit = otherIncome - otherExpense;
      
      const profitBeforeTax = operatingProfit + otherProfit;
      const taxExpense = getArising("821", "DEBIT") - getArising("821", "CREDIT");
      const netProfit = profitBeforeTax - taxExpense;
      
      // Need previous month data for comparison
      // For simplicity, returning 0 for 'previous' in this implementation, can be calculated similarly later.

      const data = [
          { code: "01", item: "1. Doanh thu bán hàng và cung cấp dịch vụ", note: "VI.1", current: revenue, previous: 0 },
          { code: "02", item: "2. Các khoản giảm trừ doanh thu", note: "VI.2", current: deductions, previous: 0 },
          { code: "10", item: "3. Doanh thu thuần về bán hàng và cung cấp dịch vụ (10 = 01 - 02)", note: "", current: netRevenue, previous: 0, isParent: true },
          { code: "11", item: "4. Giá vốn hàng bán", note: "VI.3", current: cogs, previous: 0 },
          { code: "20", item: "5. Lợi nhuận gộp về bán hàng và cung cấp dịch vụ (20 = 10 - 11)", note: "", current: grossProfit, previous: 0, isParent: true, isCalculated: true },
          { code: "21", item: "6. Doanh thu hoạt động tài chính", note: "VI.4", current: finRevenue, previous: 0 },
          { code: "22", item: "7. Chi phí tài chính", note: "VI.5", current: finExpense, previous: 0 },
          { code: "23", item: "- Trong đó: Chi phí lãi vay", note: "", current: 0, previous: 0 },
          { code: "24", item: "8. Chi phí quản lý kinh doanh", note: "VI.6", current: adminExpense, previous: 0 },
          { code: "30", item: "9. Lợi nhuận thuần từ hoạt động kinh doanh (30 = 20 + 21 - 22 - 24)", note: "", current: operatingProfit, previous: 0, isParent: true, isCalculated: true },
          { code: "31", item: "10. Thu nhập khác", note: "VI.7", current: otherIncome, previous: 0 },
          { code: "32", item: "11. Chi phí khác", note: "VI.8", current: otherExpense, previous: 0 },
          { code: "40", item: "12. Lợi nhuận khác (40 = 31 - 32)", note: "", current: otherProfit, previous: 0, isParent: true, isCalculated: true },
          { code: "50", item: "13. Tổng lợi nhuận kế toán trước thuế (50 = 30 + 40)", note: "", current: profitBeforeTax, previous: 0, isParent: true, isCalculated: true },
          { code: "51", item: "14. Chi phí thuế TNDN", note: "VI.9", current: taxExpense, previous: 0 },
          { code: "60", item: "15. Lợi nhuận sau thuế thu nhập doanh nghiệp (60 = 50 - 51)", note: "", current: netProfit, previous: 0, isParent: true, isCalculated: true }
      ];

      return NextResponse.json({ success: true, analysis: { summary: "Đã cập nhật số liệu thực tế từ hệ thống.", score: 90 }, data });
    }

    // ==========================================
    // TAB 3: BALANCE SHEET (TÌNH HÌNH TÀI CHÍNH)
    // ==========================================
    if (tab === "balance") {
      const cash = getBalance("111") + getBalance("112");
      const receivables = getBalance("131") + getBalance("138");
      const inventory = getBalance("15");
      const fixedAssets = getBalance("211") - getBalance("214");
      const otherAssets = getBalance("141") + getBalance("242");
      
      const totalAssets = cash + receivables + inventory + fixedAssets + otherAssets;
      
      const payables = getBalance("331");
      const employees = getBalance("334");
      const taxes = getBalance("333");
      const otherLiabilities = getBalance("338");
      
      const equity = getBalance("411");
      const retainedEarnings = getBalance("421");
      
      const totalLiabilities = payables + employees + taxes + otherLiabilities;
      const totalEquity = equity + retainedEarnings;
      const totalCapital = totalLiabilities + totalEquity;

      const data = [
          { code: "", item: "TÀI SẢN", note: "", current: 0, previous: 0, isParent: true, isLevel1: true },
          { code: "110", item: "I. Tiền và các khoản tương đương tiền", note: "V.01", current: cash, previous: 0, isParent: true },
          { code: "111", item: "1. Tiền", note: "", current: cash, previous: 0 },
          { code: "112", item: "2. Các khoản tương đương tiền", note: "", current: 0, previous: 0 },
          { code: "120", item: "II. Đầu tư tài chính", note: "V.02", current: 0, previous: 0, isParent: true },
          { code: "121", item: "1. Chứng khoán kinh doanh", note: "", current: 0, previous: 0 },
          { code: "122", item: "2. Đầu tư nắm giữ đến ngày đáo hạn", note: "", current: 0, previous: 0 },
          { code: "123", item: "3. Đầu tư góp vốn vào đơn vị khác", note: "", current: 0, previous: 0 },
          { code: "124", item: "4. Dự phòng tổn thất đầu tư tài chính (*)", note: "", current: 0, previous: 0 },
          { code: "130", item: "III. Các khoản phải thu", note: "V.03", current: receivables, previous: 0, isParent: true },
          { code: "131", item: "1. Phải thu của khách hàng", note: "", current: receivables, previous: 0 },
          { code: "132", item: "2. Trả trước cho người bán", note: "", current: 0, previous: 0 },
          { code: "133", item: "3. Vốn kinh doanh ở đơn vị trực thuộc", note: "", current: 0, previous: 0 },
          { code: "134", item: "4. Phải thu khác", note: "", current: 0, previous: 0 },
          { code: "135", item: "5. Tài sản thiếu chờ xử lý", note: "", current: 0, previous: 0 },
          { code: "136", item: "6. Dự phòng phải thu khó đòi (*)", note: "", current: 0, previous: 0 },
          { code: "140", item: "IV. Hàng tồn kho", note: "V.04", current: inventory, previous: 0, isParent: true },
          { code: "141", item: "1. Hàng tồn kho", note: "", current: inventory, previous: 0 },
          { code: "142", item: "2. Dự phòng giảm giá hàng tồn kho (*)", note: "", current: 0, previous: 0 },
          { code: "150", item: "V. Tài sản cố định", note: "V.05", current: fixedAssets, previous: 0, isParent: true },
          { code: "151", item: "- Nguyên giá", note: "", current: fixedAssets, previous: 0 },
          { code: "152", item: "- Giá trị hao mòn lũy kế (*)", note: "", current: 0, previous: 0 },
          { code: "160", item: "VI. Bất động sản đầu tư", note: "V.06", current: 0, previous: 0, isParent: true },
          { code: "161", item: "- Nguyên giá", note: "", current: 0, previous: 0 },
          { code: "162", item: "- Giá trị hao mòn lũy kế (*)", note: "", current: 0, previous: 0 },
          { code: "170", item: "VII. Xây dựng cơ bản dở dang", note: "V.07", current: 0, previous: 0, isParent: true },
          { code: "180", item: "VIII. Tài sản khác", note: "V.08", current: otherAssets, previous: 0, isParent: true },
          { code: "181", item: "1. Thuế GTGT được khấu trừ", note: "", current: 0, previous: 0 },
          { code: "182", item: "2. Tài sản khác", note: "", current: otherAssets, previous: 0 },
          { code: "200", item: "TỔNG CỘNG TÀI SẢN (200 = 110 + 120 + 130 + 140 + 150 + 160 + 170 + 180)", note: "", current: totalAssets, previous: 0, isParent: true, isLevel1: true, isCalculated: true },
          
          { code: "", item: "NGUỒN VỐN", note: "", current: 0, previous: 0, isParent: true, isLevel1: true },
          { code: "300", item: "I. Nợ phải trả", note: "", current: totalLiabilities, previous: 0, isParent: true },
          { code: "311", item: "1. Phải trả người bán", note: "V.09.a", current: payables, previous: 0 },
          { code: "312", item: "2. Người mua trả tiền trước", note: "V.09.b", current: 0, previous: 0 },
          { code: "313", item: "3. Thuế và các khoản phải nộp Nhà nước", note: "V.10", current: taxes, previous: 0 },
          { code: "314", item: "4. Phải trả người lao động", note: "", current: employees, previous: 0 },
          { code: "315", item: "5. Phải trả khác", note: "V.09.c", current: otherLiabilities, previous: 0 },
          { code: "316", item: "6. Vay và nợ thuê tài chính", note: "V.11", current: 0, previous: 0 },
          { code: "317", item: "7. Phải trả nội bộ về vốn kinh doanh", note: "", current: 0, previous: 0 },
          { code: "318", item: "8. Dự phòng phải trả", note: "V.12", current: 0, previous: 0 },
          { code: "319", item: "9. Quỹ khen thưởng, phúc lợi", note: "", current: 0, previous: 0 },
          { code: "320", item: "10. Quỹ phát triển khoa học và công nghệ", note: "", current: 0, previous: 0 },
          { code: "400", item: "II. Vốn chủ sở hữu", note: "V.13", current: totalEquity, previous: 0, isParent: true },
          { code: "411", item: "1. Vốn góp của chủ sở hữu", note: "", current: equity, previous: 0 },
          { code: "412", item: "2. Thặng dư vốn cổ phần", note: "", current: 0, previous: 0 },
          { code: "413", item: "3. Vốn khác của chủ sở hữu", note: "", current: 0, previous: 0 },
          { code: "414", item: "4. Cổ phiếu quỹ (*)", note: "", current: 0, previous: 0 },
          { code: "415", item: "5. Chênh lệch tỷ giá hối đoái", note: "", current: 0, previous: 0 },
          { code: "416", item: "6. Các quỹ thuộc vốn chủ sở hữu", note: "", current: 0, previous: 0 },
          { code: "417", item: "7. Lợi nhuận sau thuế chưa phân phối", note: "", current: retainedEarnings, previous: 0 },
          { code: "500", item: "TỔNG CỘNG NGUỒN VỐN (500 = 300 + 400)", note: "", current: totalCapital, previous: 0, isParent: true, isLevel1: true, isCalculated: true }
      ];

      return NextResponse.json({ success: true, analysis: { summary: "Bảng cân đối được tính toán từ các số dư cuối kỳ.", score: 92 }, data });
    }

    // ==========================================
    // TAB 4: CASH FLOW (LƯU CHUYỂN TIỀN TỆ)
    // ==========================================
    if (tab === "cashflow") {
      // Direct method estimation: looking at journal entries involving Cash (111, 112)
      // 1. Thu từ bán hàng: Có 111/112, đối ứng Có 131/511
      // 2. Chi trả NCC: Có 111/112, đối ứng Nợ 331
      // 3. Chi trả nhân viên: Có 111/112, đối ứng Nợ 334
      let thuBanHang = 0;
      let chiTraNCC = 0;
      let chiTraNV = 0;
      let chiKhac = 0;
      
      for (const entry of allLines) {
         if (entry.journalEntry.entryDate >= startOfMonth && entry.journalEntry.entryDate < endOfMonth) {
             // Find if this entry has Cash
             const entryLines = allLines.filter((l: any) => l.journalEntryId === entry.journalEntryId);
             const cashLine = entryLines.find((l: any) => l.accountId && accountBalances.get(l.accountId) && accountBalances.get(l.accountId)?.openingDebit !== undefined && allAccounts.find((a: any) => a.id === l.accountId)?.code.startsWith("111"));
             
             if (cashLine && entry.id !== cashLine.id) {
                 const otherAccount = allAccounts.find((a: any) => a.id === entry.accountId);
                 if (cashLine.type === "DEBIT") { // Cash IN
                    if (otherAccount?.code.startsWith("131") || otherAccount?.code.startsWith("511")) {
                        thuBanHang += entry.amount;
                    }
                 } else { // Cash OUT
                    if (otherAccount?.code.startsWith("331")) {
                        chiTraNCC -= entry.amount;
                    } else if (otherAccount?.code.startsWith("334")) {
                        chiTraNV -= entry.amount;
                    } else {
                        chiKhac -= entry.amount;
                    }
                 }
             }
         }
      }
      
      const netCash = thuBanHang + chiTraNCC + chiTraNV + chiKhac;
      const openingCash = getBalance("111", "opening") + getBalance("112", "opening");
      const closingCash = getBalance("111", "closing") + getBalance("112", "closing");

      const data = [
          { code: "", item: "I. Lưu chuyển tiền từ hoạt động kinh doanh", current: 0, previous: 0, isParent: true, isLevel1: true },
          { code: "01", item: "1. Tiền thu từ bán hàng, cung cấp dịch vụ và doanh thu khác", current: thuBanHang, previous: 0 },
          { code: "02", item: "2. Tiền chi trả cho người cung cấp hàng hóa và dịch vụ", current: chiTraNCC, previous: 0 },
          { code: "03", item: "3. Tiền chi trả cho người lao động", current: chiTraNV, previous: 0 },
          { code: "07", item: "4. Tiền chi khác", current: chiKhac, previous: 0 },
          { code: "20", item: "Lưu chuyển tiền thuần từ hoạt động kinh doanh", current: netCash, previous: 0, isParent: true, isCalculated: true },
          
          { code: "50", item: "Lưu chuyển tiền thuần trong kỳ", current: netCash, previous: 0, isParent: true, isCalculated: true },
          { code: "60", item: "Tiền và tương đương tiền đầu kỳ", current: openingCash, previous: 0, isParent: true, isCalculated: true },
          { code: "70", item: "Tiền và tương đương tiền cuối kỳ", current: closingCash, previous: 0, isParent: true, isCalculated: true }
      ];

      return NextResponse.json({ success: true, analysis: { summary: "Dòng tiền được trích xuất từ các nghiệp vụ thực tế.", score: 85 }, data });
    }

    return NextResponse.json({ success: false, error: "Invalid tab" });
  } catch (error: any) {
    console.error("Error fetching financial reports:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
