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
  throw new Error("Tất cả API keys đều hết quota.");
}

function fmtM(n: number) { return (n / 1e6).toFixed(1) + " tr"; }

// ── Tính điểm sức khỏe kinh doanh theo công thức xác định ────────────────────
// Không để AI tính → deterministic, nhất quán giữa các lần gọi
function calcHealthScore(cur: {
  quotationCount: number; quotationWon: number;
  contractCount: number; contractDone: number; contractOverdue: number;
  contractValue: number; contractPaid: number;
  retailRevenue: number; retailDebt: number;
  totalCustomers: number;
}): number {
  let score = 60; // Điểm trung tính mặc định

  const winRate       = cur.quotationCount > 0 ? cur.quotationWon / cur.quotationCount * 100 : 0;
  const debtRate      = cur.contractValue  > 0 ? (cur.contractValue - cur.contractPaid) / cur.contractValue * 100 : 0;
  const retailDebtRate= cur.retailRevenue  > 0 ? cur.retailDebt / cur.retailRevenue * 100 : 0;

  // ── Trừ điểm rủi ro ──────────────────────────────────────
  // 1. Công nợ hợp đồng
  if      (debtRate > 80) score -= 25;
  else if (debtRate > 60) score -= 15;
  else if (debtRate > 40) score -= 8;

  // 2. Công nợ bán lẻ
  if      (retailDebtRate > 60) score -= 15;
  else if (retailDebtRate > 40) score -= 8;
  else if (retailDebtRate > 20) score -= 3;

  // 3. Win rate thấp
  if      (cur.quotationCount >= 3 && winRate < 20) score -= 20;
  else if (cur.quotationCount >= 3 && winRate < 40) score -= 10;

  // 4. Hợp đồng chậm / quá hạn
  score -= Math.min(cur.contractOverdue * 8, 24);

  // ── Cộng điểm tích cực ───────────────────────────────────
  // 5. Hợp đồng hoàn thành
  score += Math.min(cur.contractDone * 4, 16);

  // 6. Win rate cao
  if (cur.quotationCount >= 3 && winRate >= 60) score += 8;
  else if (cur.quotationCount >= 3 && winRate >= 50) score += 4;

  // 7. Có doanh thu bán lẻ & nợ thấp
  if (cur.retailRevenue > 0 && retailDebtRate < 20) score += 5;

  // 8. Nhiều khách hàng
  if (cur.totalCustomers >= 20) score += 5;
  else if (cur.totalCustomers >= 5) score += 2;

  return Math.max(0, Math.min(100, Math.round(score)));
}

// POST /api/board/ai-sales
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Lấy lịch sử snapshot 6 tháng gần nhất
    // @ts-expect-error — TS server cache stale; monthlySalesSnapshot exists after `prisma generate`
    const history: Array<Record<string, number>> = await prisma.monthlySalesSnapshot.findMany({
      orderBy: [{ year: "desc" }, { month: "desc" }],
      take: 6,
    });

    // Dữ liệu hiện tại (được gửi từ client)
    const cur = body.current as {
      totalCustomers: number;
      quotationCount: number; quotationWon: number; quotationLost: number;
      contractCount: number; contractActive: number; contractDone: number; contractOverdue: number;
      contractValue: number; contractPaid: number;
      retailCount: number; retailRevenue: number; retailDebt: number;
    };

    // Tính điểm trong code — không để AI quyết định
    const diemNhanhCount = calcHealthScore(cur);

    const winRate       = cur.quotationCount > 0 ? Math.round(cur.quotationWon / cur.quotationCount * 100) : 0;
    const debtRate      = cur.contractValue  > 0 ? Math.round((cur.contractValue - cur.contractPaid) / cur.contractValue * 100) : 0;
    const retailDebtRate= cur.retailRevenue  > 0 ? Math.round(cur.retailDebt / cur.retailRevenue * 100) : 0;

    // Format lịch sử
    const historyText = history.length > 0
      ? history.map((h) => {
          const wr = h.quotationCount > 0 ? Math.round(h.quotationWon / h.quotationCount * 100) : 0;
          return `  - ${h.month}/${h.year}: Báo giá ${h.quotationCount} (win ${wr}%) | Hợp đồng ${h.contractCount} (${h.contractActive} đang chạy, ${h.contractOverdue} trễ) | Bán lẻ ${fmtM(h.retailRevenue)}`;
        }).join("\n")
      : "  (Chưa có lịch sử — đây là lần đầu phân tích)";

    const prompt = `Bạn là chuyên gia phân tích kinh doanh đang cố vấn cho Ban Giám đốc một doanh nghiệp SME Việt Nam.

DỮ LIỆU HIỆN TẠI (tích lũy đến nay):
- Tổng khách hàng: ${cur.totalCustomers}
- Báo giá: ${cur.quotationCount} tổng | ${cur.quotationWon} thắng (win rate ${winRate}%) | ${cur.quotationLost} thua
- Hợp đồng: ${cur.contractCount} tổng | ${cur.contractActive} đang thực hiện | ${cur.contractDone} hoàn thành | ${cur.contractOverdue} chậm/quá hạn
- Giá trị hợp đồng: ${fmtM(cur.contractValue)} | Đã thu: ${fmtM(cur.contractPaid)} | Tỷ lệ công nợ hợp đồng: ${debtRate}%
- Bán lẻ: ${cur.retailCount} hóa đơn | Doanh thu: ${fmtM(cur.retailRevenue)} | Tỷ lệ công nợ bán lẻ: ${retailDebtRate}%

LỊCH SỬ 6 THÁNG GẦN NHẤT:
${historyText}

NHIỆM VỤ: Viết nhận xét tóm tắt DỰA HOÀN TOÀN VÀO SỐ LIỆU TRÊN.
- Không được bịa hoặc suy diễn thêm thông tin ngoài số liệu
- Nêu số liệu cụ thể trong mỗi nhận xét
- Cảnh báo cần có số liệu cụ thể (ví dụ: "công nợ hợp đồng chiếm ${debtRate}%")
- Khuyến nghị phải thực tế, hành động được ngay
- Nếu dữ liệu còn ít (giai đoạn mới hoạt động), hãy nhận xét phù hợp với bối cảnh đó

Trả về JSON (không markdown, chỉ JSON thuần):
{
  "tongQuan": "2-3 câu tóm tắt tình trạng kinh doanh",
  "diemTot": ["điểm tích cực 1 (nêu số cụ thể)", "điểm tích cực 2"],
  "canhBao": ["cảnh báo 1 (nêu số cụ thể)", "cảnh báo 2"],
  "xuHuong": "nhận xét xu hướng so với lịch sử, hoặc null nếu chưa có lịch sử",
  "khuyenNghi": ["khuyến nghị hành động 1", "khuyến nghị 2", "khuyến nghị 3"]
}`;

    const raw = await generateWithFallback(prompt);
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("Trí tuệ nhân tạo không trả về JSON hợp lệ");
    const aiResult = JSON.parse(jsonMatch[0]);

    // Gắn điểm đã tính vào kết quả trả về
    return NextResponse.json({ success: true, data: { ...aiResult, diemNhanhCount } });
  } catch (err) {
    console.error("[ai-sales] error:", err);
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}
