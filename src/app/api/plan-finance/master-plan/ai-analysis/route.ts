import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

function getKeys(): string[] {
  return (process.env.GEMINI_API_KEYS || "")
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean);
}

async function generateStreamWithFallback(prompt: string): Promise<any> {
  const keys = getKeys();
  if (!keys.length) throw new Error("Chưa cấu hình GEMINI_API_KEYS");

  const MODELS = ["gemini-2.5-flash", "gemini-2.5-flash-lite", "gemini-2.0-flash-lite"];

  for (const model of MODELS) {
    const shuffled = [...keys].sort(() => Math.random() - 0.5);
    for (const key of shuffled) {
      try {
        const ai = new GoogleGenAI({ apiKey: key });
        const responseStream = await ai.models.generateContentStream({ model, contents: prompt });
        return responseStream;
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
      year,
      revenueTraditional,
      revenueEcommerce,
      revenueAgent,
      revenueAgentDev,
      totalRevenue,
      valDeductions,
      deductionsRate,
      valNetRevenue,
      costSales,
      costSalesPercent,
      valGrossProfit,
      grossProfitMargin,
      valOperatingExpenses,
      opexPctOfRevenue,
      c_biz_salary,
      c_biz_agentopen,
      c_biz_promo,
      f_mkt_ads,
      f_ops_depr,
      f_ops_rent,
      f_ops_utilities,
      totalStaffCount,
      grandTotalFund,
      salaryPct,
      avgMonthlySalary,
      indirectStaffCount,
      indirectStaffPct,
      valTotalProfit,
      netProfitMarginOnNetRev,
      othersOpex
    } = body;

    const dataFormatted = `
BẢN SỐ LIỆU KẾ HOẠCH HOẠT ĐỘNG SẢN XUẤT KINH DOANH NĂM ${year || 2026}
1. DOANH THU & KÊNH PHÂN PHỐI:
- Kênh Đại lý sỉ (Agent): ${Number(revenueAgent).toLocaleString("vi-VN")} đ
- Kênh Phát triển đại lý (Agent Dev): ${Number(revenueAgentDev).toLocaleString("vi-VN")} đ
- Kênh Showroom bán lẻ truyền thống (Traditional): ${Number(revenueTraditional).toLocaleString("vi-VN")} đ
- Kênh Thương mại điện tử (E-commerce): ${Number(revenueEcommerce).toLocaleString("vi-VN")} đ
- Tổng Doanh thu kế hoạch: ${Number(totalRevenue).toLocaleString("vi-VN")} đ
- Giảm trừ doanh thu: ${Number(valDeductions).toLocaleString("vi-VN")} đ (Tỷ lệ: ${Number(deductionsRate).toFixed(1)}%)
- Doanh thu thuần: ${Number(valNetRevenue).toLocaleString("vi-VN")} đ

2. CHI PHÍ GIÁ VỐN & LỢI NHUẬN GỘP:
- Giá vốn hàng bán (COGS): ${Number(costSales).toLocaleString("vi-VN")} đ (Chiếm ${costSalesPercent || 0}% Doanh thu)
- Lợi nhuận gộp: ${Number(valGrossProfit).toLocaleString("vi-VN")} đ (Biên lợi nhuận gộp: ${Number(grossProfitMargin).toFixed(1)}%)

3. CHI PHÍ VẬN HÀNH (OPEX) - Tổng: ${Number(valOperatingExpenses).toLocaleString("vi-VN")} đ (Chiếm ${Number(opexPctOfRevenue).toFixed(1)}% Doanh thu)
Chi tiết định mức:
- Chi phí Lương và thưởng bộ phận kinh doanh: ${Number(c_biz_salary).toLocaleString("vi-VN")} đ
- Chi phí Mở đại lý: ${Number(c_biz_agentopen).toLocaleString("vi-VN")} đ
- Thưởng đại lý sỉ & Khuyến mãi: ${Number(c_biz_promo).toLocaleString("vi-VN")} đ
- Chi phí Marketing & Ads: ${Number(f_mkt_ads).toLocaleString("vi-VN")} đ
- Chi phí Khấu hao cố định dùng chung cấp Công ty: ${Number(f_ops_depr).toLocaleString("vi-VN")} đ
- Chi phí Thuê văn phòng & Hệ thống kho bãi dùng chung cấp Công ty: ${Number(f_ops_rent).toLocaleString("vi-VN")} đ
- Chi phí Điện nước & Tiện ích văn phòng/kho cấp Công ty: ${Number(f_ops_utilities).toLocaleString("vi-VN")} đ
- Chi phí vận hành khác: ${Number(othersOpex || 0).toLocaleString("vi-VN")} đ
- Lưu ý: Tổng chi phí cố định cấp Công ty (Khấu hao + Thuê mặt bằng + Điện nước) = ${(Number(f_ops_depr) + Number(f_ops_rent) + Number(f_ops_utilities)).toLocaleString("vi-VN")} đ (xấp xỉ 2.34 tỷ VNĐ/năm).

4. QUY MÔ NHÂN SỰ & QUỸ LƯƠNG:
- Tổng định biên nhân sự: ${totalStaffCount || 0} nhân sự
- Tổng quỹ lương & phúc lợi: ${Number(grandTotalFund).toLocaleString("vi-VN")} đ (Chiếm ${Number(salaryPct).toFixed(1)}% tổng chi phí hoạt động)
- Thu nhập trung bình tháng: ${Number(avgMonthlySalary).toLocaleString("vi-VN")} đ/tháng/người
- Định biên nhân sự gián tiếp (CSKH + Tài chính/Hành chính): ${indirectStaffCount || 0} nhân sự (Chiếm ${Number(indirectStaffPct).toFixed(1)}% tổng định biên)

5. LỢI NHUẬN MỤC TIÊU:
- Lợi nhuận trước thuế kế hoạch: ${Number(valTotalProfit).toLocaleString("vi-VN")} đ
- Biên lợi nhuận trước thuế trên Doanh thu thuần: ${Number(netProfitMarginOnNetRev).toFixed(1)}%
`;

    const prompt = `
Tôi sẽ gửi cho bạn một bản Master Plan/Kế hoạch kinh doanh tổng thể của doanh nghiệp dưới đây:

${dataFormatted}

Hãy đóng vai Hội đồng thẩm định cấp cao gồm:
- CEO có 30 năm kinh nghiệm điều hành doanh nghiệp.
- CFO chuyên lập và thẩm định kế hoạch tài chính.
- Chuyên gia chiến lược doanh nghiệp.
- Chuyên gia quản trị vận hành.
- Chuyên gia xây dựng hệ thống KPI.
- Nhà đầu tư chuyên thẩm định doanh nghiệp trước M&A hoặc rót vốn.

Nhiệm vụ của bạn là PHÂN TÍCH, PHẢN BIỆN, SOI LỖI, THẨM ĐỊNH và ĐÁNH GIÁ toàn bộ kế hoạch trên.

Lưu ý đặc biệt quan trọng về phân bổ chi phí cố định:
- Khấu hao (${Number(f_ops_depr).toLocaleString("vi-VN")} đ) + Thuê mặt bằng (${Number(f_ops_rent).toLocaleString("vi-VN")} đ) + Điện nước (${Number(f_ops_utilities).toLocaleString("vi-VN")} đ) = ${(Number(f_ops_depr) + Number(f_ops_rent) + Number(f_ops_utilities)).toLocaleString("vi-VN")} đ (khoảng 2.34 tỷ/năm) là CHI PHÍ VẬN HÀNH CỐ ĐỊNH CẤP CÔNG TY (văn phòng chính, hệ thống kho bãi trung tâm dùng chung, hạ tầng kỹ thuật), không phải là chi phí riêng của hệ thống đại lý sỉ hay showroom bán lẻ. Hãy đánh giá đúng bản chất dùng chung cấp công ty này khi thẩm định cơ cấu chi phí.

YÊU CẦU:
1. KHÔNG được tóm tắt lại tài liệu.
2. KHÔNG được mô tả lại những gì đã có sẵn.
3. PHẢI tập trung tìm: Lỗ hổng, Điểm bất hợp lý, Giả định chưa được chứng minh, Rủi ro tiềm ẩn, Các chỉ tiêu chưa khả thi, Những khoản mục bị thiếu, Các nguy cơ khiến kế hoạch thất bại.
4. Trình bày nội dung phân tích chi tiết, sâu sắc bằng ngôn ngữ Tiếng Việt sử dụng định dạng Markdown rõ ràng, chuyên nghiệp (sử dụng in đậm, danh sách gạch đầu dòng, các bảng số liệu so sánh nếu cần).
5. CẤM TUYỆT ĐỐI việc thêm các câu mở đầu lịch sự, chào hỏi (ví dụ: "Kính gửi Ban Giám đốc...", "Hội đồng thẩm định..."), không thêm lời dẫn dắt hay ký tên ở cuối. Báo cáo phải bắt đầu trực tiếp bằng tiêu đề "PHẦN 1. ĐÁNH GIÁ CHIẾN LƯỢC TỔNG THỂ".
6. Cấu trúc các câu hỏi lớn và nội dung thẩm định phải phân cấp rõ ràng (danh sách lồng nhau). Mỗi khía cạnh đánh giá (ví dụ: "- Doanh thu mục tiêu có hợp lý không?") phải là gạch đầu dòng cấp 1. Các phản biện, giả định, đánh giá chi tiết của khía cạnh đó phải là gạch đầu dòng cấp 2 (thụt đầu dòng bằng 2 khoảng trắng, ví dụ: "  - **Chưa đủ cơ sở...**"). Tránh sử dụng danh sách phẳng cùng một cấp.

HÃY CẤU TRÚC BÁO CÁO THEO ĐÚNG 10 PHẦN SAU ĐÂY:

==================================================

PHẦN 1. ĐÁNH GIÁ CHIẾN LƯỢC TỔNG THỂ
- Doanh thu mục tiêu có hợp lý không?
- Tốc độ tăng trưởng có khả thi không?
- Kế hoạch có phù hợp với quy mô doanh nghiệp không?
- Nguồn lực hiện tại có đủ để thực hiện không?
- Điểm mạnh và điểm yếu của kế hoạch.
- Cho điểm tổng thể từ 0-100.

==================================================

PHẦN 2. THẨM ĐỊNH DOANH THU
Phân tích:
- Doanh thu dự kiến, Cơ cấu doanh thu, Nguồn hình thành doanh thu, Tính khả thi của từng nguồn doanh thu.
Tìm:
- Doanh thu bị đánh giá quá cao, Doanh thu chưa có cơ sở, Doanh thu thiếu dữ liệu chứng minh.
Đưa ra:
- Kịch bản lạc quan.
- Kịch bản trung bình.
- Kịch bản bi quan.

==================================================

PHẦN 3. THẨM ĐỊNH CHI PHÍ
Kiểm tra toàn bộ chi phí.
Đánh giá:
- Chi phí nào đang thấp bất thường, chi phí nào đang cao bất thường, chi phí nào bị bỏ sót.
Đặc biệt kiểm tra:
- Chi phí nhân sự, chi phí marketing, chi phí bán hàng, chi phí vận hành, chi phí kho vận, chi phí bảo hành, chi phí công nghệ, chi phí pháp lý, chi phí tài chính, quỹ dự phòng rủi ro.
- Tính tỷ trọng từng khoản chi phí trên doanh thu.
*Lưu ý làm rõ tính chất 2.34 tỷ VNĐ chi phí cố định cấp Công ty.*

==================================================

PHẦN 4. THẨM ĐỊNH NHÂN SỰ
Đánh giá:
- Cơ cấu tổ chức, định biên nhân sự, mức lương, năng suất lao động.
Tìm:
- Bộ phận thiếu người, bộ phận dư người, chức năng chồng chéo, rủi ro phụ thuộc cá nhân.
Tính:
- Doanh thu/người, Lợi nhuận/người, Chi phí lương/doanh thu.
- So sánh với benchmark ngành (nếu có).

==================================================

PHẦN 5. THẨM ĐỊNH LỢI NHUẬN
Kiểm tra:
- Biên lợi nhuận gộp, biên lợi nhuận hoạt động, điểm hòa vốn.
Đánh giá:
- Lợi nhuận có bền vững không? Có phụ thuộc vào giả định nào không?
- Chỉ cần sai lệch bao nhiêu % doanh thu thì doanh nghiệp bắt đầu lỗ?
- Thực hiện phân tích độ nhạy (Sensitivity Analysis).

==================================================

PHẦN 6. PHÂN TÍCH DÒNG TIỀN
Đánh giá:
- Dòng tiền hoạt động, dòng tiền đầu tư, dòng tiền tài trợ.
Xác định:
- Nguy cơ thiếu vốn, nguy cơ mất thanh khoản, nhu cầu vốn lưu động.
Ước tính:
- Số vốn tối thiểu cần duy trì để đảm bảo an toàn.

==================================================

PHẦN 7. PHÂN TÍCH RỦI RO
Liệt kê tất cả rủi ro (Thị trường, Tài chính, Nhân sự, Vận hành, Công nghệ, Pháp lý, Nhà cung cấp, Đại lý, Công nợ).
Cho mỗi rủi ro:
- Xác suất (%), Mức độ ảnh hưởng (1-10), Mức độ ưu tiên, Giải pháp kiểm soát.

==================================================

PHẦN 8. PHẢN BIỆN NHƯ NHÀ ĐẦU TƯ
Nếu là nhà đầu tư:
- Tôi sẽ nghi ngờ điều gì?
- Tôi sẽ yêu cầu bổ sung dữ liệu nào?
- Tôi sẽ từ chối đầu tư vì lý do gì?
- Điều kiện nào để tôi chấp thuận đầu tư?

==================================================

PHẦN 9. ĐỀ XUẤT TỐI ƯU
Đưa ra:
- Top 20 vấn đề nghiêm trọng nhất.
- Top 20 hành động ưu tiên.
- Top 10 KPI cần theo dõi.
- Top 10 cảnh báo sớm cần thiết lập.

==================================================

PHẦN 10. KẾT LUẬN HỘI ĐỒNG THẨM ĐỊNH
Xuất bảng (Markdown):
- Tiêu chí | Điểm (trên thang điểm 100)
- Tính khả thi
- Tính thực thi
- Hiệu quả tài chính
- Quản trị rủi ro
- Năng lực tăng trưởng
- Tính bền vững
- Mức độ hấp dẫn đầu tư

Cuối cùng đưa ra:
- 10 điểm mạnh nhất.
- 10 điểm yếu nhất.
- 10 rủi ro lớn nhất.
- Khả năng hoàn thành kế hoạch (%).
- Khả năng vượt kế hoạch (%).
- Khả năng thất bại (%).
- Khuyến nghị cuối cùng của Hội đồng thẩm định.

YÊU CẦU THỂ HIỆN:
- Phân tích cực kỳ chi tiết, thẳng thắn, không nể nang, không bỏ qua lỗi nhỏ. Luôn đặt câu hỏi: "Điều gì có thể khiến kế hoạch này thất bại?".
- Trình bày như báo cáo tư vấn chiến lược trị giá hàng trăm triệu đồng.
- Không thêm bất kỳ nội dung hướng dẫn hay phần bọc JSON/code block nào khác, hãy trả về trực tiếp chuỗi văn bản Markdown thô.
`;

    const responseStream = await generateStreamWithFallback(prompt);

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of responseStream) {
            const text = chunk.text || "";
            if (text) {
              controller.enqueue(encoder.encode(text));
            }
          }
        } catch (streamErr) {
          console.error("Stream generation error:", streamErr);
          controller.enqueue(encoder.encode(`\nLỖI: ${String(streamErr)}`));
        } finally {
          controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        "Connection": "keep-alive",
      },
    });
  } catch (err) {
    console.error("[master-plan/ai-analysis] error:", err);
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}
