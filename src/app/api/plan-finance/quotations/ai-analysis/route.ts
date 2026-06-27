import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

function getKeys(): string[] {
  return (process.env.GEMINI_API_KEYS || "")
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean);
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
        if (text) {
          return text;
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
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
          continue;
        }
        throw err;
      }
    }
  }
  throw new Error("Tất cả API keys đều hết quota. Vui lòng thử lại sau ít phút.");
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      tenHang,
      qtyBo,
      vtChinh,
      vtPhu,
      vtTieuHao,
      pk,
      chiPhiSanXuatPerDoor,
      giaVonBanHang,
      loiNhuanVal,
      donGiaBoCua,
      donGiaM2,
      bienLoiNhuanPercent,
      kichThuoc
    } = body;

    const prompt = `
Bạn là chuyên gia phân tích tài chính và tối ưu hóa chi phí sản xuất đồ gỗ (đặc biệt là cửa gỗ công nghiệp và cửa chống cháy). Hãy phân tích bảng chiết tính chi phí tổng hợp dưới đây:

📊 THÔNG TIN SẢN PHẨM:
- Tên sản phẩm: ${tenHang || "Cửa gỗ công nghiệp"}
- Kích thước: ${kichThuoc || "Chưa xác định"}
- Số lượng sản xuất: ${qtyBo || 1} bộ

💰 CƠ CẤU CHI PHÍ TRÊN 1 BỘ CỬA:
- Chi phí vật tư & phụ kiện: ${(vtChinh || 0) + (vtPhu || 0) + (vtTieuHao || 0) + (pk || 0)} đ (Vật tư chính: ${vtChinh || 0} đ, Vật tư phụ: ${vtPhu || 0} đ, Vật tư tiêu hao: ${vtTieuHao || 0} đ, Phụ kiện: ${pk || 0} đ)
- Chi phí sản xuất (nhân công, quản lý, cố định, công cụ dụng cụ phân bổ): ${chiPhiSanXuatPerDoor || 0} đ
- Giá vốn bán hàng (COGS): ${giaVonBanHang || 0} đ

📈 LỢI NHUẬN & GIÁ BÁN ĐỀ XUẤT:
- Biên lợi nhuận định mức: ${bienLoiNhuanPercent || 0}%
- Lợi nhuận dự kiến: ${loiNhuanVal || 0} đ/bộ
- Đơn giá bán xuất xưởng đề xuất: ${donGiaBoCua || 0} đ/bộ
- Đơn giá trên mỗi m²: ${donGiaM2 || 0} đ/m²

Hãy cung cấp phân tích tài chính ngắn gọn, súc tích và trực quan bằng ngôn ngữ Tiếng Việt, sử dụng định dạng Markdown rõ ràng bao gồm:
1. **Phân tích cơ cấu chi phí**: Đánh giá tỷ trọng giữa vật tư chính, các vật tư phụ khác và chi phí sản xuất phân bổ. Nhận định xem cơ cấu này đã hợp lý và cân đối chưa.
2. **Đánh giá hiệu quả kinh doanh**: Tính toán tỷ suất lợi nhuận gộp trên doanh thu bán hàng (Gross Margin), nhận định mức biên lợi nhuận này có thực sự an toàn tài chính cho doanh nghiệp không.
3. **Đánh giá giá bán so với thị trường**: Đánh giá đơn giá bộ và đơn giá m² so với mặt bằng chung các xưởng sản xuất cửa gỗ công nghiệp khác.
4. **Khuyến nghị tối ưu hóa**: Cung cấp 2-3 khuyến nghị cụ thể (Ví dụ: bổ sung vật tư tiêu hao/vật tư phụ nếu đang hiển thị bằng 0 đ để tránh rủi ro lỗ ngầm, tối ưu hao hụt ván để tiết kiệm chi phí vật tư chính, hoặc nâng biên lợi nhuận để dự phòng rủi ro bảo hành nếu giá bán đang quá thấp v.v.).

Lưu ý quan trọng về định dạng:
- Hãy trả về nội dung phân tích bằng Markdown trực quan, ngắn gọn, súc tích, định dạng chuyên nghiệp với các bullet points, in đậm để người dùng dễ theo dõi. Không bọc mã markdown trong bất kỳ khối JSON nào, chỉ trả về chuỗi Markdown thô.
- Mỗi câu, nhận định hay khuyến nghị phải viết thành một câu đầy đủ chủ vị, rõ nghĩa và có ngữ nghĩa hoàn chỉnh. Tuyệt đối không viết nửa câu, câu cụt hoặc tự ý xuống dòng ngắt quãng làm xuất hiện các đầu dòng rời rạc không rõ ngữ cảnh (ví dụ như đầu dòng chỉ ghi vỏn vẹn mỗi chữ '(300 bộ).'). Nếu muốn nhắc đến số lượng sản xuất hoặc kích thước, hãy viết rõ ràng trong câu (ví dụ: 'Với quy mô đơn hàng sản xuất ${qtyBo || 1} bộ cửa gỗ...').
`;

    const analysis = await generateWithFallback(prompt);
    return NextResponse.json({ success: true, analysis });
  } catch (err) {
    console.error("[quotations/ai-analysis] error:", err);
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}
