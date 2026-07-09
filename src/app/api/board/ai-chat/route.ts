import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { prisma } from "@/lib/prisma";

function getKeys(): string[] {
  return (process.env.GEMINI_API_KEYS || "")
    .split(",").map(k => k.trim()).filter(Boolean);
}

async function generateWithFallback(prompt: string): Promise<string> {
  const keys = getKeys();
  if (!keys.length) throw new Error("Chưa cấu hình GEMINI_API_KEYS");
  const MODELS = ["gemini-2.5-flash", "gemini-2.5-flash-lite", "gemini-2.0-flash-lite"];
  for (const model of MODELS) {
    const shuffled = [...keys].sort(() => Math.random() - 0.5);
    for (const key of shuffled) {
      try {
        const ai = new GoogleGenAI({ apiKey: key });
        const response = await ai.models.generateContent({ model, contents: prompt });
        const text = response.text ?? "";
        if (text) return text;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes("429") || msg.includes("quota") || msg.includes("403") || msg.includes("404") || msg.includes("503") || msg.includes("500") || msg.includes("UNAVAILABLE") || msg.includes("demand")) continue;
        throw err;
      }
    }
  }
  throw new Error("Tất cả API keys đều hết quota. Vui lòng thử lại sau.");
}

function fmtM(n: number) {
  if (n >= 1e9) return (n / 1e9).toFixed(1) + " tỷ";
  if (n >= 1e6) return (n / 1e6).toFixed(1) + " triệu";
  return n.toLocaleString("vi-VN") + " đồng";
}

// POST /api/board/ai-chat
export async function POST(req: NextRequest) {
  try {
    const { message, history = [] } = await req.json() as {
      message: string;
      history: { role: "user" | "assistant"; content: string }[];
    };

    if (!message?.trim()) {
      return NextResponse.json({ error: "Câu hỏi không được để trống" }, { status: 400 });
    }

    // ── Load dữ liệu thực tế từ DB ──────────────────────────────────────────
    const [
      customers, 
      quotations, 
      contracts, 
      retailInvoices, 
      careHistories,
      assets,
      debts,
      expenses,
      inventoryItems,
      marketingCampaigns,
      categories
    ] = await Promise.all([
      prisma.customer.findMany({ select: { id: true, nguon: true, nhom: true } }),
      prisma.quotation.findMany({ select: { trangThai: true, thanhTien: true, tongTien: true, createdAt: true } }),
      prisma.contract.findMany({ select: { trangThai: true, giaTriHopDong: true, daThanhToan: true, ngayKetThuc: true } }),
      prisma.retailInvoice.findMany({ select: { tongCong: true, conNo: true, trangThai: true } }),
      prisma.customerCareHistory.findMany({
        select: { thaiDo: true, hinhThuc: true, ngayChamSoc: true },
        orderBy: { ngayChamSoc: "desc" },
        take: 20,
      }),
      prisma.asset.findMany({ select: { giaTriMua: true, giaTriConLai: true, trangThai: true } }),
      prisma.debt.findMany({ select: { type: true, amount: true, paidAmount: true, status: true } }),
      prisma.expense.findMany({ select: { soTien: true, trangThai: true } }),
      prisma.inventoryItem.findMany({ select: { soLuong: true, soLuongMin: true, giaNhap: true } }),
      prisma.marketingCampaign.findMany({ select: { spent: true, budget: true, status: true, platform: true } }),
      prisma.category.findMany({ where: { type: "nen_tang" }, select: { name: true } })
    ]);

    // ── Tổng hợp số liệu ────────────────────────────────────────────────────
    const totalCustomers   = customers.length;
    const quotationWon     = quotations.filter(q => q.trangThai === "won").length;
    const quotationLost    = quotations.filter(q => q.trangThai === "lost").length;
    const quotationActive  = quotations.filter(q => ["sent", "draft"].includes(q.trangThai)).length;
    const winRate          = quotations.length > 0 ? Math.round(quotationWon / quotations.length * 100) : 0;

    const contractActive   = contracts.filter(c => c.trangThai === "active").length;
    const contractDone     = contracts.filter(c => c.trangThai === "done").length;
    const contractOverdue  = contracts.filter(c => ["overdue", "delayed"].includes(c.trangThai)).length;
    const contractValue    = contracts.reduce((s, c) => s + c.giaTriHopDong, 0);
    const contractPaid     = contracts.reduce((s, c) => s + c.daThanhToan, 0);
    const contractDebt     = contractValue - contractPaid;
    const debtRate         = contractValue > 0 ? Math.round(contractDebt / contractValue * 100) : 0;

    const retailRevenue    = retailInvoices.reduce((s, r) => s + r.tongCong, 0);
    const retailDebt       = retailInvoices.reduce((s, r) => s + r.conNo, 0);

    const carePositive     = careHistories.filter(h => h.thaiDo === "tich-cuc").length;
    const careNegative     = careHistories.filter(h => h.thaiDo === "tieu-cuc").length;

    // 🧳 1. Tài sản cố định (Assets)
    const assetCount = assets.length;
    const totalAssetCost = assets.reduce((s, a) => s + a.giaTriMua, 0);
    const assetRemainingValue = assets.reduce((s, a) => s + a.giaTriConLai, 0);

    // 💸 2. Công nợ & Vay (Debts & Loans)
    const receivables = debts.filter(d => d.type === "RECEIVABLE" || d.type === "phai-thu");
    const payables = debts.filter(d => d.type === "PAYABLE" || d.type === "phai-tra");
    const loans = debts.filter(d => d.type === "LOAN");
    const totalReceivable = receivables.reduce((s, d) => s + (d.amount - d.paidAmount), 0);
    const totalPayable = payables.reduce((s, d) => s + (d.amount - d.paidAmount), 0);
    const totalLoan = loans.reduce((s, d) => s + (d.amount - d.paidAmount), 0);

    // 📉 3. Chi phí hoạt động (Expenses)
    const totalExpenses = expenses.reduce((s, e) => s + e.soTien, 0);
    const paidExpenses = expenses.filter(e => e.trangThai === "paid").reduce((s, e) => s + e.soTien, 0);

    // 📦 4. Kho & Tồn kho (Inventory)
    const totalSKUs = inventoryItems.length;
    const inventoryValuation = inventoryItems.reduce((s, item) => s + (item.soLuong * item.giaNhap), 0);
    const alertSKUs = inventoryItems.filter(item => item.soLuong <= item.soLuongMin).length;

    // 📣 5. Kênh & Chiến dịch Marketing (Marketing)
    const platformCount = categories.length;
    const campaignCount = marketingCampaigns.length;
    const totalMarketingSpent = marketingCampaigns.reduce((s, c) => s + c.spent, 0);
    const activeCampaigns = marketingCampaigns.filter(c => c.status === "Active").length;

    // Snapshot lịch sử gần nhất
    // @ts-expect-error — stale TS server cache
    const snapshots = await prisma.monthlySalesSnapshot.findMany({
      orderBy: [{ year: "desc" }, { month: "desc" }],
      take: 3,
    }) as Array<Record<string, number>>;

    const snapshotText = snapshots.length > 0
      ? snapshots.map(s => `  ${s.month}/${s.year}: ${s.quotationWon} báo giá thắng / ${s.contractCount} hợp đồng / Bán lẻ ${fmtM(s.retailRevenue)}`).join("\n")
      : "  Chưa có dữ liệu lịch sử";

    // ── Xây dựng prompt ─────────────────────────────────────────────────────
    const systemContext = `Bạn là trợ lý AI thông minh toàn quyền của Ban Giám đốc doanh nghiệp. Bạn được cấp quyền tối cao truy cập và phân tích TOÀN BỘ dữ liệu vận hành, tài chính, nhân sự, kho bãi và kinh doanh của hệ thống.

PHONG CÁCH TRẢ LỜI:
- Ngắn gọn, đi thẳng vào vấn đề — tối đa 150 từ mỗi câu trả lời
- Dùng tiếng Việt tự nhiên, lịch sự, không dùng ngôn ngữ quá trang trọng
- Luôn nêu con số cụ thể từ dữ liệu khi trả lời
- Khi liệt kê nhiều điểm: dùng "* **Tiêu đề:** nội dung" cho mỗi mục (markdown bullet)
- Không dùng tiêu đề lớn (#, ##) — chỉ dùng **in đậm** cho từ khóa quan trọng

DỮ LIỆU VẬN HÀNH TOÀN HỆ THỐNG:
📊 Báo cáo Kinh doanh & Bán lẻ:
- Khách hàng: ${totalCustomers} khách
- Báo giá: ${quotations.length} tổng | ${quotationWon} thắng (win rate ${winRate}%) | ${quotationLost} thua | ${quotationActive} đang chờ
- Hợp đồng: ${contracts.length} tổng | ${contractActive} đang chạy | ${contractDone} hoàn thành | ${contractOverdue} trễ hạn
- Giá trị hợp đồng: ${fmtM(contractValue)} | Đã thu: ${fmtM(contractPaid)} | Công nợ hợp đồng: ${fmtM(contractDebt)} (${debtRate}%)
- Bán lẻ: ${retailInvoices.length} hóa đơn | Doanh thu bán lẻ: ${fmtM(retailRevenue)} | Nợ bán lẻ: ${fmtM(retailDebt)}

🧳 Tài sản cố định:
- Tổng số tài sản: ${assetCount} tài sản
- Tổng nguyên giá: ${fmtM(totalAssetCost)} | Giá trị còn lại: ${fmtM(assetRemainingValue)} | Khấu hao lũy kế: ${fmtM(totalAssetCost - assetRemainingValue)}

💸 Công nợ & Các khoản vay:
- Phải thu khách hàng: ${fmtM(totalReceivable)}
- Phải trả nhà cung cấp: ${fmtM(totalPayable)}
- Dư nợ vay ngân hàng: ${fmtM(totalLoan)}

📉 Chi phí vận hành:
- Tổng chi phí phát sinh: ${fmtM(totalExpenses)} | Đã chi trả: ${fmtM(paidExpenses)} | Chờ thanh toán: ${fmtM(totalExpenses - paidExpenses)}

📦 Kho bãi & Tồn kho:
- Danh mục sản phẩm: ${totalSKUs} SKU
- Tổng giá trị hàng tồn kho: ${fmtM(inventoryValuation)}
- Cảnh báo tồn kho an toàn: ${alertSKUs} SKU cần nhập gấp

📣 Hoạt động Marketing:
- Số kênh truyền thông (DB Platforms): ${platformCount} kênh
- Tổng số chiến dịch: ${campaignCount} chiến dịch | Đang chạy: ${activeCampaigns}
- Tổng chi phí thực chi: ${fmtM(totalMarketingSpent)}

💬 Chăm sóc khách hàng (20 lần chăm sóc gần nhất):
- Tích cực: ${carePositive} | Tiêu cực: ${careNegative} | Trung lập/do dự: ${careHistories.length - carePositive - careNegative}

📅 Doanh thu lịch sử 3 tháng gần nhất:
${snapshotText}`;

    // Xây dựng conversation turns
    const conversationHistory = history
      .map(m => `${m.role === "user" ? "Người dùng" : "Trợ lý"}: ${m.content}`)
      .join("\n");

    const fullPrompt = `${systemContext}

${conversationHistory ? `LỊCH SỬ TRÒ CHUYỆN:\n${conversationHistory}\n` : ""}
Người dùng: ${message}
Trợ lý:`;

    const reply = await generateWithFallback(fullPrompt);
    return NextResponse.json({ success: true, reply: reply.trim() });

  } catch (err) {
    console.error("[ai-chat] error:", err);
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}
