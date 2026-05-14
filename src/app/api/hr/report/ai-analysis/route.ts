import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

// ── Lấy danh sách key ─────────────────────────────────────────────────────
function getKeys(): string[] {
  return (process.env.GEMINI_API_KEYS || "")
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean);
}

async function generateWithFallback(prompt: string): Promise<string> {
  const keys = getKeys();
  if (!keys.length) throw new Error("Chưa cấu hình GEMINI_API_KEYS");

  // Thử các model theo thứ tự ưu tiên (Gemini 2.5/2.0)
  const MODELS = ["gemini-2.5-flash", "gemini-2.5-flash-lite", "gemini-2.0-flash-lite"];

  for (const model of MODELS) {
    // Shuffle keys để quay vòng và load balance
    const shuffled = [...keys].sort(() => Math.random() - 0.5);
    for (const key of shuffled) {
      try {
        const ai = new GoogleGenAI({ apiKey: key });
        const response = await ai.models.generateContent({ model, contents: prompt });
        const text = response.text ?? "";
        if (text) {
          console.log(`[hr-ai-analysis] ✅ model=${model} key=...${key.slice(-6)}`);
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
          msg.includes("503") || 
          msg.includes("demand")
        ) {
          console.warn(`[hr-ai-analysis] ⚠️ key ...${key.slice(-6)} model=${model}: quota/auth/503 → thử tiếp`);
          continue;
        }
        throw err;
      }
    }
  }
  throw new Error("Tất cả API keys đều hết quota hoặc gặp lỗi.");
}

export async function POST(req: NextRequest) {
  try {
    const { type, data } = await req.json();

    let prompt = "";
    if (type === "overview") {
      prompt = `
Bạn là một Giám đốc Nhân sự (CHRO) dày dạn kinh nghiệm. Hãy phân tích báo cáo hiện trạng nhân sự dựa trên dữ liệu:
- Tổng nhân sự: ${data.totalHeadcount} (Tăng trưởng ${data.growthRate}% so with last month)
- Cơ cấu loại hợp đồng: ${JSON.stringify(data.typeBreakdown)}
- Cơ cấu giới tính: Nam ${data.genderBreakdown.male} | Nữ ${data.genderBreakdown.female}
- Độ tuổi trung bình: ${data.avgAge} tuổi
- Tỷ lệ lấp đầy: ${data.fillRate}%

YÊU CẦU QUAN TRỌNG: KHÔNG sử dụng ký tự asterisk (*) trong bất kỳ phần nội dung nào. Không dùng markdown để in đậm.
Trả về JSON: { "summary": "...", "insights": ["...", "..."], "recommendations": ["...", "..."] }
`;
    } else if (type === "attrition") {
      prompt = `
Bạn là Giám đốc Nhân sự. Hãy phân tích biến động nhân sự trong kỳ:
- Số nhân viên mới: ${data.newHires}
- Số nhân viên nghỉ việc: ${data.attrition}
- Tỷ lệ nghỉ việc (Turnover Rate): ${data.turnoverRate}%
- Phân loại: Tự nguyện (${data.breakdown.voluntary}), Không tự nguyện (${data.breakdown.involuntary})
- Lý do nghỉ việc chính: ${JSON.stringify(data.topReasons)}

Hãy đưa ra nhận định về độ ổn định của đội ngũ và đề xuất các giải pháp giữ chân nhân tài.
YÊU CẦU QUAN TRỌNG: KHÔNG sử dụng ký tự asterisk (*) trong bất kỳ phần nội dung nào. Không dùng markdown để in đậm.
Trả về JSON thuần: { "summary": "...", "insights": ["...", "..."], "recommendations": ["...", "..."] }
`;
    } else if (type === "recruitment") {
      prompt = `
Bạn là Giám đốc Nhân sự. Hãy phân tích hiệu quả công tác Tuyển dụng và Đào tạo:
- Vị trí đang mở: ${data.openPositions}
- Thời gian tuyển dụng TB (Time-to-hire): ${data.timeToHire} ngày
- Chi phí tuyển dụng TB (Cost-per-hire): ${data.costPerHire} VNĐ
- Nguồn hiệu quả nhất: ${data.topSource}
- Đào tạo: Số giờ đào tạo bình quân ${data.avgTrainingHours}h, Tỷ lệ hoàn thành ${data.completionRate}%

Hãy đánh giá khả năng thu hút nhân tài và hiệu quả nâng cao năng lực đội ngũ. Đề xuất cải thiện quy trình tuyển dụng và tối ưu hóa ngân sách đào tạo.
YÊU CẦU QUAN TRỌNG: KHÔNG sử dụng ký tự asterisk (*) trong bất kỳ phần nội dung nào. Không dùng markdown để in đậm.
Trả về JSON thuần: { "summary": "...", "insights": ["...", "..."], "recommendations": ["...", "..."] }
`;
    } else if (type === "performance") {
      prompt = `
Bạn là Giám đốc Nhân sự. Hãy phân tích Hiệu suất nhân sự và Chi phí lao động:
- Doanh thu trung bình trên mỗi nhân viên: ${data.revenuePerEmp} VNĐ
- Tổng chi phí tiền lương & phúc lợi: ${data.laborCost} VNĐ
- Tỷ lệ chi phí lương trên doanh thu: ${data.laborCostPercent}%
- Tỷ lệ vắng mặt (Absence Rate): ${data.absenceRate}%
- Tỷ lệ đạt KPI: ${data.kpiRate}%

Hãy đưa ra nhận xét về năng suất lao động và tính hợp lý của quỹ lương so với doanh thu. Đề xuất các biện pháp tối ưu hóa hiệu suất và giảm thiểu tỷ lệ vắng mặt.
YÊU CẦU QUAN TRỌNG: KHÔNG sử dụng ký tự asterisk (*) trong bất kỳ phần nội dung nào. Không dùng markdown để in đậm.
Trả về JSON thuần: { "summary": "...", "insights": ["...", "..."], "recommendations": ["...", "..."] }
`;
    } else if (type === "final_proposals") {
      prompt = `
Bạn là Giám đốc Nhân sự cấp cao (CHRO). Hãy thực hiện đánh giá tổng thể báo cáo nhân sự tháng này và đưa ra các kiến nghị chiến lược cho Ban Giám Đốc.

DỮ LIỆU TỔNG HỢP:
1. Hiện trạng: ${data.totalHeadcount} nhân sự (Tăng trưởng ${data.growthRate}%). Tỷ lệ lấp đầy: ${data.fillRate}%.
2. Biến động: ${data.newHires} mới, ${data.resignedThisMonth} nghỉ việc. Tỷ lệ nghỉ việc: ${data.turnoverRate}%.
3. Tuyển dụng & Đào tạo: Đang tuyển ${data.openPositions} vị trí. Thời gian tuyển TB: ${data.timeToHire} ngày. Hoàn thành đào tạo: ${data.completionRate}%.
4. Hiệu suất & Chi phí: Doanh thu/NS: ${data.revenuePerEmp} VNĐ. Chi phí lương/Doanh thu: ${data.laborCostPercent}%. Tỷ lệ vắng mặt: ${data.absenceRate}%.

NHIỆM VỤ:
- Đưa ra một tóm tắt mang tính chiến lược về sức khỏe nguồn nhân lực của công ty hiện tại.
- Chỉ ra 2-3 rủi ro hoặc điểm nghẽn cần lưu ý.
- Đề xuất 3-4 kiến nghị hành động cụ thể cho tháng tiếp theo để tối ưu hóa bộ máy.

YÊU CẦU QUAN TRỌNG: KHÔNG sử dụng ký tự asterisk (*) trong bất kỳ phần nội dung nào. Không dùng markdown để in đậm.
Trả về JSON thuần: { "summary": "...", "insights": ["...", "..."], "recommendations": ["...", "..."] }
`;
    }

    const raw = await generateWithFallback(prompt);
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("AI không trả về JSON hợp lệ");

    const result = JSON.parse(jsonMatch[0]);
    return NextResponse.json({ success: true, data: result });
  } catch (err) {
    console.error("[hr/ai-analysis] error:", err);
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}
