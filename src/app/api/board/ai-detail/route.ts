import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

function getKeys(): string[] {
  return (process.env.GEMINI_API_KEYS || "")
    .split(",").map((k) => k.trim()).filter(Boolean);
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
        if (msg.includes("429") || msg.includes("RESOURCE_EXHAUSTED") || msg.includes("quota") || msg.includes("403") || msg.includes("404") || msg.includes("NOT_FOUND") || msg.includes("503") || msg.includes("500") || msg.includes("UNAVAILABLE") || msg.includes("demand")) continue;
        throw err;
      }
    }
  }
  throw new Error("Tất cả API keys đều hết quota. Vui lòng thử lại sau ít phút.");
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { doanhThuNam, doanhThuThang, tongChiPhi, loiNhuan, cashFlowScore, months, mucTieuNam } = body;

    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    const prompt = `
Bạn là chuyên gia tài chính cấp cao. Hãy phân tích TỔNG THỂ bức tranh tài chính và hoạt động kinh doanh lũy kế của doanh nghiệp trong năm nay (tính đến hiện tại).
ĐẶC BIỆT LƯU Ý: Hãy đánh giá bức tranh toàn cảnh của cả năm, xem xét tổng doanh thu năm, tổng chi phí năm và tiến độ hoàn thành so với mục tiêu năm đã đề ra.

📊 SỐ LIỆU TỔNG THỂ (Lũy kế từ đầu năm đến tháng ${currentMonth}/${currentYear}):
- Tổng doanh thu đạt được (từ đầu năm): ${doanhThuNam}
- Mục tiêu doanh thu năm: ${mucTieuNam}
- Doanh thu riêng trong tháng ${currentMonth}: ${doanhThuThang}
- Tổng chi phí (từ đầu năm): ${tongChiPhi}
- Lợi nhuận (từ đầu năm): ${loiNhuan}
- Chỉ số sức khoẻ dòng tiền: ${cashFlowScore}/100

📈 DIỄN BIẾN ${currentMonth} THÁNG ĐẦU NĂM:
${months.map((m: { month: string; revenue: number; cost: number; cashFlow: number }) =>
  `- ${m.month}: Doanh thu ${m.revenue} | Chi phí ${m.cost} | Dòng tiền ${m.cashFlow}`
).join("\n")}

Hãy cung cấp đánh giá chi tiết theo định dạng JSON sau (không kèm markdown, chỉ JSON thuần):
{
  "tongQuan": "Đánh giá tổng quan toàn diện về tình trạng doanh nghiệp (3-4 câu)",
  "doanhThu": {
    "danhGia": "tốt" | "cần chú ý" | "nguy hiểm",
    "nhanXet": "Nhận xét chi tiết về tình hình doanh thu (2-3 câu, bao gồm tốc độ tăng trưởng, xu hướng)"
  },
  "chiPhi": {
    "danhGia": "tốt" | "cần chú ý" | "nguy hiểm",
    "nhanXet": "Nhận xét chi tiết về cơ cấu và hiệu quả chi phí (2-3 câu)"
  },
  "dongTien": {
    "danhGia": "tốt" | "cần chú ý" | "nguy hiểm",
    "nhanXet": "Nhận xét chi tiết về sức khoẻ dòng tiền và khả năng thanh khoản (2-3 câu)"
  },
  "loiNhuan": {
    "danhGia": "tốt" | "cần chú ý" | "nguy hiểm",
    "nhanXet": "Nhận xét về biên lợi nhuận và hiệu quả sinh lời (2-3 câu)"
  },
  "ruiRo": ["Rủi ro 1 (ngắn gọn)", "Rủi ro 2", "Rủi ro 3"],
  "coHoi": ["Cơ hội 1 (ngắn gọn)", "Cơ hội 2", "Cơ hội 3"],
  "khuyen_nghi": ["Khuyến nghị hành động 1 cho BGĐ", "Khuyến nghị 2", "Khuyến nghị 3"]
}
`;

    const raw = await generateWithFallback(prompt);
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("AI không trả về JSON hợp lệ");
    const result = JSON.parse(jsonMatch[0]);
    return NextResponse.json({ success: true, data: result });
  } catch (err) {
    console.error("[board/ai-detail] error:", err);
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}
