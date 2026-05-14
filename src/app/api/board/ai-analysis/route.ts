import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

// ── Lấy danh sách key ─────────────────────────────────────────────────────
function getKeys(): string[] {
  return (process.env.GEMINI_API_KEYS || "")
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean);
}

// ── Thử lần lượt từng key cho đến khi thành công ──────────────────────────
async function generateWithFallback(prompt: string): Promise<string> {
  const keys = getKeys();
  if (!keys.length) throw new Error("Chưa cấu hình GEMINI_API_KEYS");

  // Thử các model theo thứ tự ưu tiên (chỉ Gemini 2.0)
  const MODELS = ["gemini-2.5-flash", "gemini-2.5-flash-lite", "gemini-2.0-flash-lite"];

  for (const model of MODELS) {
    // Shuffle keys để load balance
    const shuffled = [...keys].sort(() => Math.random() - 0.5);
    for (const key of shuffled) {
      try {
        const ai = new GoogleGenAI({ apiKey: key });
        const response = await ai.models.generateContent({ model, contents: prompt });
        const text = response.text ?? "";
        if (text) {
          console.log(`[ai-analysis] ✅ model=${model} key=...${key.slice(-6)}`);
          return text;
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        // Nếu quota/auth lỗi thì thử key tiếp theo
        if (
          msg.includes("429") || 
          msg.includes("RESOURCE_EXHAUSTED") || 
          msg.includes("quota") || 
          msg.includes("403") || 
          msg.includes("404") || 
          msg.includes("NOT_FOUND") || 
          msg.includes("503") || 
          msg.includes("500") || 
          msg.includes("UNAVAILABLE") || 
          msg.includes("demand")
        ) {
          console.warn(`[ai-analysis] ⚠️ key ...${key.slice(-6)} model=${model}: quota/auth/503 → thử tiếp`);
          continue;
        }
        // Lỗi khác thì throw luôn
        throw err;
      }
    }
  }
  throw new Error("Tất cả API keys đều hết quota. Vui lòng thử lại sau ít phút.");
}

// ── POST /api/board/ai-analysis ────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { doanhThuNam, doanhThuThang, tongChiPhi, loiNhuan, cashFlowScore, months } = body;

    const prompt = `
Bạn là chuyên gia tài chính doanh nghiệp. Hãy đánh giá ngắn gọn tình trạng tài chính dựa trên số liệu sau:

📊 SỐ LIỆU THÁNG 3/2026:
- Doanh thu năm (lũy kế từ đầu năm đến tháng 3): ${doanhThuNam}
- Doanh thu tháng 3: ${doanhThuThang}
- Tổng chi phí năm (lũy kế từ đầu năm đến tháng 3): ${tongChiPhi}
- Lợi nhuận năm (lũy kế từ đầu năm đến tháng 3): ${loiNhuan}
- Chỉ số sức khoẻ dòng tiền: ${cashFlowScore}/100

📈 DIỄN BIẾN 3 THÁNG ĐẦU NĂM:
${months.map((m: { month: string; revenue: number; cost: number; cashFlow: number }) =>
  `- ${m.month}: Doanh thu ${m.revenue} tỷ | Chi phí ${m.cost} tỷ | Dòng tiền ${m.cashFlow} tỷ`
).join("\n")}

Hãy trả lời theo định dạng JSON sau (không kèm markdown, chỉ JSON thuần):
{
  "rating": "tốt" | "cần chú ý" | "nguy hiểm",
  "summary": "Một câu tóm tắt tổng quan ngắn gọn (tối đa 30 từ)",
  "insights": [
    { "type": "positive" | "warning" | "negative", "text": "Nhận định ngắn (tối đa 20 từ)" },
    { "type": "positive" | "warning" | "negative", "text": "Nhận định ngắn (tối đa 20 từ)" },
    { "type": "positive" | "warning" | "negative", "text": "Nhận định ngắn (tối đa 20 từ)" }
  ],
  "recommendation": "Một khuyến nghị hành động ưu tiên nhất cho Ban Giám đốc (tối đa 25 từ)"
}
`;

    const raw = await generateWithFallback(prompt);

    // Tách JSON ra nếu có bọc markdown
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("AI không trả về JSON hợp lệ");

    const result = JSON.parse(jsonMatch[0]);
    return NextResponse.json({ success: true, data: result });
  } catch (err) {
    console.error("[board/ai-analysis] error:", err);
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}
