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

function fmtMoney(n: number | null | undefined): string {
  if (typeof n !== "number" || isNaN(n)) return "0 đ";
  return Math.round(n).toLocaleString("vi-VN") + " đ";
}

function fmtM(n: number | null | undefined): string {
  if (typeof n !== "number" || isNaN(n)) return "0 đ";
  if (n >= 1e9) return (n / 1e9).toFixed(2) + " tỷ";
  if (n >= 1e6) return (n / 1e6).toFixed(1) + " triệu";
  return n.toLocaleString("vi-VN") + " đ";
}

// Trích xuất các từ khoá tìm kiếm từ câu hỏi của người dùng
function extractKeywords(message: string): string[] {
  const raw = message.toLowerCase();
  const stopWords = new Set([
    "giá", "bao", "nhiêu", "là", "thế", "nào", "đang", "tồn", "kho", "ở", "cho",
    "tôi", "hỏi", "với", "ạ", "nhé", "có", "không", "những", "loại", "mặt", "hàng",
    "sản", "phẩm", "chi", "tiết", "xem", "tra", "cứu", "tìm", "kiếm", "báo", "cáo",
    "của", "và", "các", "như", "được", "ra", "sao", "hiện", "tại", "gì"
  ]);

  // Tìm các cụm từ quan trọng dạng SKU hoặc mã hiệu (vd: 01s, sj-..., sh0004s, tl0011w...)
  const skuMatches = raw.match(/[a-z0-9]+-[a-z0-9-]+|[a-z]+[0-9]+[a-z]*|[0-9]+[a-z]+/gi) || [];

  // Tách từ thông thường
  const words = raw
    .replace(/[.,?!:;'"()\[\]{}]/g, " ")
    .split(/\s+/)
    .filter(w => w.length >= 2 && !stopWords.has(w));

  const combined = Array.from(new Set([...skuMatches.map(s => s.toLowerCase()), ...words]));
  return combined;
}

// ── 1. Tìm kiếm Hàng hoá & Tồn kho ──────────────────────────────────────────
async function searchInventory(message: string, keywords: string[]) {
  try {
    const raw = message.toLowerCase();
    const isInventoryQuery =
      raw.includes("giá") || raw.includes("tồn") || raw.includes("kho") ||
      raw.includes("hàng") || raw.includes("sản phẩm") || raw.includes("sen") ||
      raw.includes("vòi") || raw.includes("chậu") || raw.includes("bồn") ||
      raw.includes("bếp") || raw.includes("tủ") || raw.includes("phụ kiện") ||
      keywords.length > 0;

    if (!isInventoryQuery) return "";

    // Xây dựng điều kiện OR dựa trên từ khoá và các cụm từ
    const orConditions: any[] = [];

    // Thử tìm theo nguyên chuỗi ngắn (nếu có cụm "sen vòi 01s", "sen vòi", "vòi chậu"...)
    const potentialPhrases = ["sen vòi", "sen cây", "vòi chậu", "vòi bếp", "bồn cầu", "chậu rửa", "vắt khăn", "bồn tiểu"];
    for (const phrase of potentialPhrases) {
      if (raw.includes(phrase)) {
        orConditions.push({ tenHang: { contains: phrase } });
      }
    }

    for (const kw of keywords) {
      if (kw.length >= 2) {
        orConditions.push({ code: { contains: kw } });
        orConditions.push({ tenHang: { contains: kw } });
        orConditions.push({ model: { contains: kw } });
        orConditions.push({ thongSoKyThuat: { contains: kw } });
      }
    }

    let items: any[] = [];
    if (orConditions.length > 0) {
      items = await prisma.inventoryItem.findMany({
        where: { OR: orConditions },
        take: 35,
        orderBy: [{ soLuong: "desc" }, { tenHang: "asc" }],
        select: {
          id: true,
          code: true,
          tenHang: true,
          model: true,
          donVi: true,
          soLuong: true,
          soLuongMin: true,
          giaBan: true,
          giaNhap: true,
          giaVon: true,
          trangThai: true,
          loai: true,
          brand: true,
          stocks: {
            select: {
              soLuong: true,
              warehouse: { select: { name: true, code: true } }
            }
          }
        }
      });
    }

    // Nếu không tìm thấy bằng từ khoá chi tiết nhưng câu hỏi hỏi về sen vòi / bồn cầu / chậu:
    if (items.length === 0 && (raw.includes("sen") || raw.includes("vòi") || raw.includes("bồn") || raw.includes("chậu"))) {
      const fallbackKws = ["sen", "vòi", "bồn", "chậu"].filter(k => raw.includes(k));
      items = await prisma.inventoryItem.findMany({
        where: {
          OR: fallbackKws.map(k => ({ tenHang: { contains: k } }))
        },
        take: 25,
        orderBy: [{ soLuong: "desc" }],
        select: {
          id: true,
          code: true,
          tenHang: true,
          model: true,
          donVi: true,
          soLuong: true,
          giaBan: true,
          giaNhap: true,
          trangThai: true,
          stocks: {
            select: {
              soLuong: true,
              warehouse: { select: { name: true, code: true } }
            }
          }
        }
      });
    }

    if (items.length === 0) return "";

    const lines = items.map((it, idx) => {
      const stocksDetail = (it.stocks && it.stocks.length > 0)
        ? ` (Tồn chi tiết: ${it.stocks.map((s: any) => `${s.warehouse?.name || s.warehouse?.code}: ${s.soLuong}`).join(", ")})`
        : "";
      return `${idx + 1}. [${it.code || "N/A"}] ${it.tenHang}
   - Giá bán niêm yết: ${fmtMoney(it.giaBan)} | Giá vốn/nhập: ${fmtMoney(it.giaNhap || it.giaVon)}
   - Tồn kho: ${it.soLuong} ${it.donVi || "cái"}${stocksDetail} | Trạng thái: ${it.trangThai || (it.soLuong > 0 ? "Còn hàng" : "Hết hàng")}`;
    });

    return `\n\n[DỮ LIỆU SẢN PHẨM & TỒN KHO THỰC TẾ TRONG HỆ THỐNG (${items.length} mặt hàng khớp)]:
${lines.join("\n")}`;
  } catch (err) {
    console.error("Lỗi searchInventory:", err);
    return "";
  }
}

// ── 2. Tìm kiếm Công nợ (Debts) ─────────────────────────────────────────────
async function searchDebts(message: string, keywords: string[]) {
  try {
    const raw = message.toLowerCase();
    const isDebtQuery = raw.includes("nợ") || raw.includes("công nợ") || raw.includes("phải thu") || raw.includes("phải trả");
    
    // Tìm các nhà cung cấp hoặc khách hàng tương ứng theo từ khoá
    const matchedPartnerIds: string[] = [];
    const nameVariants: string[] = [];

    for (const kw of keywords) {
      if (kw.length >= 2) {
        nameVariants.push(kw.toLowerCase());
        nameVariants.push(kw.toUpperCase());
        nameVariants.push(kw.charAt(0).toUpperCase() + kw.slice(1).toLowerCase());
      }
    }

    // Trích xuất các cụm 2 từ (như "anh quang", "hưng châu"...)
    const wordsList = raw.split(/\s+/);
    for (let i = 0; i < wordsList.length - 1; i++) {
      const bigram = `${wordsList[i]} ${wordsList[i + 1]}`;
      nameVariants.push(bigram.toLowerCase());
      nameVariants.push(bigram.toUpperCase());
      nameVariants.push(bigram.split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" "));
    }

    const uniqueVariants = Array.from(new Set(nameVariants)).filter(Boolean);

    // Tra cứu ID theo Rules: dùng ID thay vì Tên
    const [matchedSuppliers, matchedCustomers] = await Promise.all([
      prisma.supplier.findMany({
        where: {
          OR: uniqueVariants.map(v => ({ name: { contains: v } }))
        },
        select: { id: true, name: true, phone: true }
      }).catch(() => []),
      prisma.customer.findMany({
        where: {
          OR: uniqueVariants.map(v => ({ name: { contains: v } }))
        },
        select: { id: true, name: true, dienThoai: true }
      }).catch(() => [])
    ]);

    matchedSuppliers.forEach(s => matchedPartnerIds.push(s.id));
    matchedCustomers.forEach(c => matchedPartnerIds.push(c.id));

    const orConditions: any[] = [];
    for (const v of uniqueVariants) {
      orConditions.push({ partnerName: { contains: v } });
      orConditions.push({ referenceId: { contains: v } });
      orConditions.push({ description: { contains: v } });
    }
    for (const pid of matchedPartnerIds) {
      orConditions.push({ supplierId: pid });
      orConditions.push({ customerId: pid });
    }

    let debts: any[] = [];
    if (orConditions.length > 0) {
      debts = await prisma.debt.findMany({
        where: { OR: orConditions },
        take: 25,
        orderBy: [{ amount: "desc" }]
      });
    }

    if (debts.length === 0 && isDebtQuery) {
      debts = await prisma.debt.findMany({
        take: 20,
        orderBy: [{ amount: "desc" }]
      });
    }

    if (debts.length === 0) return "";

    const lines = debts.map((d, idx) => {
      const typeStr = (d.type === "RECEIVABLE" || d.type === "phai-thu") ? "Phải thu (Khách nợ)" : "Phải trả (Nợ NCC/ĐVVC)";
      const remaining = (d.amount || 0) - (d.paidAmount || 0);
      const dueStr = d.dueDate ? new Date(d.dueDate).toLocaleDateString("vi-VN") : "Chưa có hạn";
      return `${idx + 1}. Đối tác: ${d.partnerName} [${typeStr}]
   - Mã CT: ${d.referenceId || "N/A"} | Gốc: ${fmtMoney(d.amount)} | Đã trả: ${fmtMoney(d.paidAmount)} | Còn nợ: ${fmtMoney(remaining)}
   - Hạn TT: ${dueStr} | Trạng thái: ${d.status} | Nội dung: ${d.description || "—"}`;
    });

    return `\n\n[DỮ LIỆU CÔNG NỢ THỰC TẾ TRONG HỆ THỐNG (${debts.length} khoản nợ khớp)]:
${lines.join("\n")}`;
  } catch (err) {
    console.error("Lỗi searchDebts:", err);
    return "";
  }
}

// ── 3. Tìm kiếm Chi phí (Expenses) ──────────────────────────────────────────
async function searchExpenses(message: string, keywords: string[]) {
  try {
    const raw = message.toLowerCase();
    const isExpenseQuery = raw.includes("chi phí") || raw.includes("khoản chi") || raw.includes("chi tiêu") || raw.includes("tiền điện") || raw.includes("tiền nước") || raw.includes("ngân sách");
    if (!isExpenseQuery) return "";

    const expenses = await prisma.expense.findMany({
      take: 20,
      orderBy: [{ ngayChiTra: "desc" }, { createdAt: "desc" }]
    });

    if (expenses.length === 0) return "";

    const lines = expenses.map((ex, idx) => {
      const dateStr = ex.ngayChiTra ? new Date(ex.ngayChiTra).toLocaleDateString("vi-VN") : "—";
      return `${idx + 1}. ${ex.tenChiPhi}: ${fmtMoney(ex.soTien)} (Loại: ${ex.loai || "Khác"}, Ngày: ${dateStr}, Trạng thái: ${ex.trangThai || "—"}, Ghi chú: ${ex.ghiChu || "—"})`;
    });

    return `\n\n[DỮ LIỆU CHI PHÍ HOẠT ĐỘNG GẦN ĐÂY]:
${lines.join("\n")}`;
  } catch (err) {
    console.error("Lỗi searchExpenses:", err);
    return "";
  }
}

// ── 4. Tìm kiếm Đơn hàng (SaleOrder & PurchaseOrder) ─────────────────────────
async function searchOrders(message: string, keywords: string[]) {
  try {
    const raw = message.toLowerCase();
    const isOrderQuery = raw.includes("đơn hàng") || raw.includes("đơn bán") || raw.includes("đơn mua") || raw.includes("dbh-") || raw.includes("dh-");
    if (!isOrderQuery) return "";

    const [saleOrders, purchaseOrders] = await Promise.all([
      prisma.saleOrder.findMany({
        take: 10,
        orderBy: [{ ngayDat: "desc" }, { createdAt: "desc" }],
        select: {
          code: true,
          ngayDat: true,
          tongTien: true,
          trangThai: true,
          customer: { select: { name: true } },
          saleOrderItems: { select: { tenHang: true, soLuong: true, donGia: true } }
        }
      }).catch(() => []),
      prisma.purchaseOrder.findMany({
        take: 10,
        orderBy: [{ ngayDat: "desc" }, { createdAt: "desc" }],
        select: {
          code: true,
          ngayDat: true,
          tongTien: true,
          trangThai: true,
          supplier: { select: { name: true } },
          items: { select: { tenHang: true, soLuong: true, donGia: true } }
        }
      }).catch(() => [])
    ]);

    let res = "";
    if (saleOrders.length > 0) {
      res += `\n\n[ĐƠN BÁN HÀNG GẦN ĐÂY]:\n` + saleOrders.map((s: any, idx: number) => {
        const itemsSummary = s.saleOrderItems?.map((i: any) => `${i.tenHang} (SL: ${i.soLuong})`).join(", ") || "";
        return `${idx + 1}. Đơn ${s.code} | Khách: ${s.customer?.name || "Khách lẻ"} | Tổng: ${fmtMoney(s.tongTien)} | Trạng thái: ${s.trangThai} | Hàng: ${itemsSummary}`;
      }).join("\n");
    }
    if (purchaseOrders.length > 0) {
      res += `\n\n[ĐƠN MUA HÀNG GẦN ĐÂY]:\n` + purchaseOrders.map((p: any, idx: number) => {
        const itemsSummary = p.items?.map((i: any) => `${i.tenHang} (SL: ${i.soLuong})`).join(", ") || "";
        return `${idx + 1}. Đơn ${p.code} | NCC: ${p.supplier?.name || "Nhà cung cấp"} | Tổng: ${fmtMoney(p.tongTien)} | Trạng thái: ${p.trangThai} | Hàng: ${itemsSummary}`;
      }).join("\n");
    }
    return res;
  } catch (err) {
    console.error("Lỗi searchOrders:", err);
    return "";
  }
}

// ── 5. Thống kê Toàn cảnh Doanh nghiệp (Realtime Snapshot) ───────────────────
async function getRealtimeSnapshot() {
  try {
    const [
      itemCount,
      outOfStockCount,
      debts,
      expenses,
      employees,
      retailInvoices
    ] = await Promise.all([
      prisma.inventoryItem.count().catch(() => 0),
      prisma.inventoryItem.count({ where: { soLuong: { lte: 0 } } }).catch(() => 0),
      prisma.debt.findMany({ select: { type: true, amount: true, paidAmount: true } }).catch(() => []),
      prisma.expense.findMany({ select: { soTien: true } }).catch(() => []),
      prisma.employee.count({ where: { status: { in: ["Active", "Working", ""] } } }).catch(() => 0),
      prisma.retailInvoice.findMany({ select: { tongCong: true } }).catch(() => []),
    ]);

    const totalReceivable = debts.filter(d => d.type === "RECEIVABLE" || d.type === "phai-thu")
      .reduce((s, d) => s + Math.max(0, (d.amount || 0) - (d.paidAmount || 0)), 0);
    const totalPayable = debts.filter(d => d.type === "PAYABLE" || d.type === "phai-tra")
      .reduce((s, d) => s + Math.max(0, (d.amount || 0) - (d.paidAmount || 0)), 0);
    const totalExpense = expenses.reduce((s, e) => s + (e.soTien || 0), 0);
    const retailRevenue = retailInvoices.reduce((s, r) => s + (r.tongCong || 0), 0);

    return `\n[TỔNG QUAN HỆ THỐNG SEAJONG REALTIME]:
- Tổng số mặt hàng quản lý: ${itemCount} mã (Trong đó hết hàng/tồn 0: ${outOfStockCount} mã)
- Tổng công nợ phải thu (Khách hàng nợ): ${fmtM(totalReceivable)}
- Tổng công nợ phải trả (Nợ nhà cung cấp/ĐVVC): ${fmtM(totalPayable)}
- Tổng chi phí ghi nhận: ${fmtM(totalExpense)}
- Doanh thu bán lẻ: ${fmtM(retailRevenue)}
- Tổng nhân sự đang làm việc: ${employees} người`;
  } catch (err) {
    console.error("Lỗi getRealtimeSnapshot:", err);
    return "";
  }
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

    const keywords = extractKeywords(message);

    // Truy vấn dữ liệu thực tế song song từ toàn bộ các bảng trong CSDL
    const [
      inventoryContext,
      debtContext,
      expenseContext,
      orderContext,
      snapshotContext
    ] = await Promise.all([
      searchInventory(message, keywords),
      searchDebts(message, keywords),
      searchExpenses(message, keywords),
      searchOrders(message, keywords),
      getRealtimeSnapshot()
    ]);

    // RAG TaxQA nếu có liên quan đến thuế
    let taxContext = "";
    if (message.toLowerCase().includes("thuế") || message.toLowerCase().includes("hóa đơn") || message.toLowerCase().includes("tncn") || message.toLowerCase().includes("tndn")) {
      try {
        const qas = await (prisma as any).taxQA.findMany({
          take: 100,
          orderBy: { createdAt: "desc" }
        });
        const scoredQAs = qas.map((qa: any) => {
          let score = 0;
          const q = qa.question.toLowerCase();
          keywords.forEach(kw => {
            if (q.includes(kw)) score += 2;
          });
          return { ...qa, score };
        }).filter((qa: any) => qa.score > 0).sort((a: any, b: any) => b.score - a.score).slice(0, 3);

        if (scoredQAs.length > 0) {
          taxContext = `\n\n[KIẾN THỨC PHÁP LÝ TỪ TỔNG CỤC THUẾ (GDT)]:\n` + scoredQAs.map((qa: any) => `Hỏi: ${qa.question}\nĐáp: ${qa.answer}`).join("\n\n");
        }
      } catch (err) {
        console.warn("Lỗi taxQA:", err);
      }
    }

    const systemPrompt = `Bạn là Trợ lý AI Thông Minh Cao Cấp của Hệ điều hành Quản trị Seajong (Công ty Cổ phần Seajong Việt Nam - Thương hiệu thiết bị vệ sinh, sen vòi, bồn cầu thông minh, thiết bị phòng tắm & nhà bếp Hàn Quốc).
Bạn được phân quyền truy cập TOÀN BỘ CƠ SỞ DỮ LIỆU thực tế của doanh nghiệp: Hàng hoá kho vận, Tồn kho, Giá niêm yết, Giá vốn, Công nợ khách hàng & nhà cung cấp, Chi phí, Đơn hàng, Nhân sự.

QUY TẮC BẮT BUỘC KHI TRẢ LỜI:
1. **TRUNG THỰC VÀ CHÍNH XÁC TUYỆT ĐỐI**: Bạn PHẢI sử dụng trực tiếp các số liệu từ các phần dữ liệu [DỮ LIỆU SẢN PHẨM & TỒN KHO], [DỮ LIỆU CÔNG NỢ], [DỮ LIỆU CHI PHÍ], [TỔNG QUAN HỆ THỐNG] được cung cấp dưới đây để trả lời.
2. **KHI HỎI VỀ GIÁ & TỒN KHO SẢN PHẨM** (Ví dụ: "Giá sen vòi là bao nhiêu", "Giá sen vòi 01s là bao nhiêu, đang tồn kho bao nhiêu"):
   - Hãy liệt kê cụ thể mã sản phẩm (SKU), tên sản phẩm đầy đủ, giá bán niêm yết (VNĐ) và số lượng tồn kho khả dụng hiện tại (bao nhiêu cái/bộ).
   - Nếu người dùng hỏi một nhóm chung (ví dụ "các loại sen vòi", "các loại chậu"), hãy lập danh sách/bảng giá các mẫu sản phẩm tương ứng kèm giá và số lượng tồn kho.
   - Nếu hỏi một sản phẩm cụ thể (như "sen vòi 01s"), hãy trả lời chính xác thông số giá và tồn kho của sản phẩm đó. Nếu mã hoặc tên gần giống, hãy nêu rõ thông tin sản phẩm tìm thấy.
3. **KHI HỎI VỀ CÔNG NỢ / CHI PHÍ / TÀI CHÍNH**:
   - Trả lời rõ ràng tên đối tác, số tiền nợ gốc, đã trả, còn nợ và hạn thanh toán.
4. **ĐỊNH DẠNG**:
   - Trả lời bằng tiếng Việt lịch sự, chuẩn mực, văn phong quản trị chuyên nghiệp.
   - Sử dụng định dạng Markdown phong phú: in đậm số tiền/mã hàng, dùng bảng biểu (|...|) hoặc danh sách gạch đầu dòng để người dùng dễ theo dõi.
${snapshotContext}
${inventoryContext}
${debtContext}
${expenseContext}
${orderContext}
${taxContext}
`;

    const conversationStr = history.map(m => `[${m.role === "user" ? "USER" : "AI"}]: ${m.content}`).join("\n");
    const fullPrompt = `${systemPrompt}

LỊCH SỬ CHAT:
${conversationStr}

CÂU HỎI MỚI NHẤT CỦA USER: ${message}

(Hãy trả lời câu hỏi trên thật cụ thể, rõ ràng, trích dẫn giá cả và tồn kho chính xác dựa trên dữ liệu hệ thống ở trên)`;

    const text = await generateWithFallback(fullPrompt);

    return NextResponse.json({ text });

  } catch (error: any) {
    console.error("AI Chat Error:", error);
    return NextResponse.json({ error: error.message || "Lỗi xử lý AI" }, { status: 500 });
  }
}
