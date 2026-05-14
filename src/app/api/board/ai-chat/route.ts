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
    const [customers, quotations, contracts, retailInvoices, careHistories] = await Promise.all([
      prisma.customer.findMany({ select: { id: true, nguon: true, nhom: true } }),
      prisma.quotation.findMany({ select: { trangThai: true, thanhTien: true, tongTien: true, createdAt: true } }),
      prisma.contract.findMany({ select: { trangThai: true, giaTriHopDong: true, daThanhToan: true, ngayKetThuc: true } }),
      prisma.retailInvoice.findMany({ select: { tongCong: true, conNo: true, trangThai: true } }),
      prisma.customerCareHistory.findMany({
        select: { thaiDo: true, hinhThuc: true, ngayChamSoc: true },
        orderBy: { ngayChamSoc: "desc" },
        take: 20,
      }),
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
    const systemContext = `Bạn là trợ lý AI thông minh của Ban Giám đốc doanh nghiệp. Bạn có quyền truy cập dữ liệu kinh doanh thực tế và hỗ trợ Ban Giám đốc phân tích, ra quyết định.

PHONG CÁCH TRẢ LỜI:
- Ngắn gọn, đi thẳng vào vấn đề — tối đa 120 từ mỗi câu trả lời
- Dùng tiếng Việt tự nhiên, lịch sự, không dùng ngôn ngữ quá trang trọng
- Luôn nêu con số cụ thể từ dữ liệu khi trả lời
- Khi liệt kê nhiều điểm: dùng "* **Tiêu đề:** nội dung" cho mỗi mục (markdown bullet)
- Không dùng tiêu đề lớn (#, ##) — chỉ dùng **in đậm** cho từ khóa quan trọng
- Nếu câu hỏi không liên quan đến kinh doanh, lịch sự từ chối và gợi ý câu hỏi phù hợp

DỮ LIỆU KINH DOANH HIỆN TẠI:
📊 Tổng quan:
- Khách hàng: ${totalCustomers} khách
- Báo giá: ${quotations.length} tổng | ${quotationWon} thắng (win rate ${winRate}%) | ${quotationLost} thua | ${quotationActive} đang chờ

📄 Hợp đồng:
- ${contracts.length} hợp đồng tổng | ${contractActive} đang thực hiện | ${contractDone} hoàn thành | ${contractOverdue} chậm/quá hạn
- Tổng giá trị: ${fmtM(contractValue)} | Đã thu: ${fmtM(contractPaid)} | Công nợ: ${fmtM(contractDebt)} (${debtRate}%)

🧾 Bán lẻ:
- ${retailInvoices.length} hóa đơn | Doanh thu: ${fmtM(retailRevenue)} | Công nợ: ${fmtM(retailDebt)}

💬 Chăm sóc khách hàng (20 lần chăm sóc gần nhất):
- Tích cực: ${carePositive} | Tiêu cực: ${careNegative} | Trung lập/do dự: ${careHistories.length - carePositive - careNegative}

📅 Lịch sử 3 tháng gần nhất:
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
