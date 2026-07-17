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

export async function POST(req: NextRequest) {
  try {
    const { message, history = [], context = "" } = await req.json() as {
      message: string;
      history: { role: "user" | "assistant"; content: string }[];
      context: string;
    };

    if (!message?.trim()) {
      return NextResponse.json({ error: "Câu hỏi không được để trống" }, { status: 400 });
    }

    let systemPrompt = "";
    
    // --- CONTEXT: NHÂN SỰ (HR) ---
    if (context.includes("/hr")) {
      const [employees, attendances] = await Promise.all([
        prisma.employee.findMany({ select: { status: true, departmentName: true } }).catch(() => []),
        prisma.attendance.findMany({ take: 100, orderBy: { date: 'desc' } }).catch(() => [])
      ]);
      const activeEmployees = employees.filter(e => e.status === 'Active' || e.status === 'Working' || !e.status).length;
      
      systemPrompt = `Bạn là Trợ lý AI Giám đốc Nhân sự (HR).
Dữ liệu thực tế: 
- Tổng số nhân viên đang làm việc: ${activeEmployees}
- Tổng hồ sơ nhân sự: ${employees.length}
- Dữ liệu chấm công gần đây: ${attendances.length} bản ghi
Hãy trả lời các câu hỏi về quản trị nhân sự, luật lao động, BHXH và dữ liệu trên.`;
    } 
    
    // --- CONTEXT: KẾ TOÁN TÀI CHÍNH (FINANCE) ---
    else if (context.includes("/finance")) {
      const [retailInvoices, debts, expenses, journalEntries] = await Promise.all([
        prisma.retailInvoice.findMany({ select: { tongCong: true, conNo: true } }).catch(() => []),
        prisma.debt.findMany({ select: { type: true, amount: true, paidAmount: true } }).catch(() => []),
        prisma.expense.findMany({ select: { soTien: true } }).catch(() => []),
        prisma.journalEntry.findMany({ take: 50, select: { totalAmount: true, sourceModule: true } }).catch(() => [])
      ]);
      
      const retailRevenue = retailInvoices.reduce((s, r) => s + (r.tongCong || 0), 0);
      const totalExpense = expenses.reduce((s, r) => s + (r.soTien || 0), 0);
      const totalReceivable = debts.filter(d => d.type === "RECEIVABLE").reduce((s, d) => s + ((d.amount || 0) - (d.paidAmount || 0)), 0);
      const totalPayable = debts.filter(d => d.type === "PAYABLE").reduce((s, d) => s + ((d.amount || 0) - (d.paidAmount || 0)), 0);
      
      systemPrompt = `Bạn là Trợ lý AI Kế toán trưởng. Bạn rất giỏi về Luật Thuế, Chế độ Kế toán VN (Thông tư 200, 133).
Dữ liệu tài chính thực tế:
- Doanh thu bán lẻ: ${fmtM(retailRevenue)}
- Tổng chi phí ghi nhận: ${fmtM(totalExpense)}
- Công nợ phải thu: ${fmtM(totalReceivable)}
- Công nợ phải trả: ${fmtM(totalPayable)}
Hãy tư vấn nghiệp vụ kế toán, luật thuế và phân tích số liệu trên.`;
    }

    // --- CONTEXT: SẢN XUẤT (PRODUCTION) ---
    else if (context.includes("/production")) {
      const [inventory, manufactured] = await Promise.all([
        prisma.inventoryItem.findMany({ select: { soLuong: true, soLuongMin: true } }).catch(() => []),
        prisma.manufacturedProduct.findMany({ take: 50, orderBy: { createdAt: 'desc' } }).catch(() => [])
      ]);
      
      const lowStock = inventory.filter(i => (i.soLuong || 0) < (i.soLuongMin || 0)).length;
      
      systemPrompt = `Bạn là Trợ lý AI Giám đốc Sản xuất & Kho.
Dữ liệu thực tế:
- Tổng số mã hàng trong kho: ${inventory.length}
- Số mã hàng dưới định mức (cần nhập thêm): ${lowStock}
Hãy tư vấn về quy trình sản xuất, quản lý chất lượng (QA/QC), quản lý kho và số liệu trên.`;
    }

    // --- CONTEXT: KINH DOANH (SALES / CRM) ---
    else if (context.includes("/cs") || context.includes("/sales")) {
      const [customers, quotations, contracts] = await Promise.all([
        prisma.customer.findMany({ select: { nhom: true } }).catch(() => []),
        prisma.quotation.findMany({ select: { trangThai: true, tongTien: true } }).catch(() => []),
        prisma.contract.findMany({ select: { trangThai: true, giaTriHopDong: true } }).catch(() => [])
      ]);
      
      const wonQuotations = quotations.filter(q => q.trangThai === "won").length;
      const winRate = quotations.length > 0 ? Math.round((wonQuotations / quotations.length) * 100) : 0;
      
      systemPrompt = `Bạn là Trợ lý AI Giám đốc Kinh doanh (CCO) / CSKH.
Dữ liệu thực tế:
- Tổng Khách hàng: ${customers.length}
- Tỷ lệ chốt Sale (Win rate báo giá): ${winRate}% (trên ${quotations.length} báo giá)
- Tổng số hợp đồng: ${contracts.length}
Hãy tư vấn chiến lược sales, cskh, kịch bản chốt sale và phân tích dữ liệu trên.`;
    }

    // --- CONTEXT: BAN GIÁM ĐỐC (BOARD) ---
    else {
      // Default to Board context (Comprehensive query)
      const [customers, quotations, contracts, retailInvoices, expenses, debts] = await Promise.all([
        prisma.customer.findMany({ select: { id: true } }).catch(() => []),
        prisma.quotation.findMany({ select: { trangThai: true } }).catch(() => []),
        prisma.contract.findMany({ select: { trangThai: true, giaTriHopDong: true, daThanhToan: true } }).catch(() => []),
        prisma.retailInvoice.findMany({ select: { tongCong: true } }).catch(() => []),
        prisma.expense.findMany({ select: { soTien: true } }).catch(() => []),
        prisma.debt.findMany({ select: { type: true, amount: true, paidAmount: true } }).catch(() => [])
      ]);
      
      const retailRevenue = retailInvoices.reduce((s, r) => s + (r.tongCong || 0), 0);
      const totalExpense = expenses.reduce((s, r) => s + (r.soTien || 0), 0);
      const contractValue = contracts.reduce((s, c) => s + (c.giaTriHopDong || 0), 0);
      
      systemPrompt = `Bạn là Trợ lý AI Tổng Giám Đốc (CEO).
Dữ liệu tổng quan:
- Khách hàng: ${customers.length}
- Hợp đồng: ${contracts.length} (Tổng GT: ${fmtM(contractValue)})
- Doanh thu bán lẻ: ${fmtM(retailRevenue)}
- Chi phí: ${fmtM(totalExpense)}
Đóng vai chuyên gia quản trị chiến lược, hãy đưa ra lời khuyên ngắn gọn, dữ liệu phân tích sắc bén.`;
    }

    let taxContext = "";
    if (message.toLowerCase().includes("thuế") || message.toLowerCase().includes("hóa đơn") || message.toLowerCase().includes("tncn") || message.toLowerCase().includes("tndn") || message.toLowerCase().includes("đất")) {
      try {
        const qas = await (prisma as any).taxQA.findMany({
          take: 200,
          orderBy: { createdAt: 'desc' }
        });
        
        const keywords = message.toLowerCase().split(/\s+/).filter(w => w.length > 3 && !["thuế", "những", "được", "không"].includes(w));
        const scoredQAs = qas.map((qa: any) => {
          let score = 0;
          const q = qa.question.toLowerCase();
          const a = qa.answer.toLowerCase();
          keywords.forEach(kw => {
            if (q.includes(kw)) score += 2;
            if (a.includes(kw)) score += 1;
          });
          return { ...qa, score };
        }).filter((qa: any) => qa.score > 0).sort((a: any, b: any) => b.score - a.score).slice(0, 3);
        
        if (scoredQAs.length > 0) {
          taxContext = `\n\n[KIẾN THỨC PHÁP LÝ TỪ TỔNG CỤC THUẾ (GDT)]:\nDưới đây là các câu hỏi đáp chính thức từ GDT liên quan đến câu hỏi của người dùng. Hãy sử dụng thông tin này để trả lời chính xác (có thể trích dẫn nguồn):\n` + scoredQAs.map((qa: any) => `Hỏi: ${qa.question}\nĐáp: ${qa.answer}`).join("\n\n");
        }
      } catch (err) {
        console.error("Lỗi lấy dữ liệu RAG TaxQA:", err);
      }
    }

    const conversationStr = history.map(m => `[${m.role === "user" ? "USER" : "AI"}]: ${m.content}`).join("\n");
    const fullPrompt = `${systemPrompt}${taxContext}

LỊCH SỬ CHAT:
${conversationStr}

CÂU HỎI MỚI NHẤT CỦA USER: ${message}

(Hãy trả lời bằng định dạng Markdown. Tập trung trực tiếp vào câu hỏi. Đảm bảo cung cấp thông tin chính xác nếu có tài liệu tham khảo.)
`;

    const text = await generateWithFallback(fullPrompt);

    return NextResponse.json({ text });

  } catch (error: any) {
    console.error("AI Chat Error:", error);
    return NextResponse.json({ error: error.message || "Lỗi xử lý AI" }, { status: 500 });
  }
}
