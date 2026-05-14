import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

function getKeys(): string[] {
  return (process.env.GEMINI_API_KEYS || "")
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean);
}

async function generateWithFallback(pdfUrl: string, entityType: string): Promise<string> {
  const keys = getKeys();
  if (!keys.length) throw new Error("Chưa cấu hình GEMINI_API_KEYS");
  
  // Tự động phân giải URL tương đối thành absolute url tại localhost (nếu cần)
  let absoluteUrl = pdfUrl;
  if (!pdfUrl.startsWith("http")) {
    const origin = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    absoluteUrl = origin + pdfUrl;
  }
  
  // Tải file PDF về dưới dạng arrayBuffer
  const pdfResp = await fetch(absoluteUrl);
  if (!pdfResp.ok) {
     throw new Error(`Failed to fetch PDF from ${absoluteUrl}: ${pdfResp.statusText}`);
  }
  const arrayBuffer = await pdfResp.arrayBuffer();
  const base64Data = Buffer.from(arrayBuffer).toString("base64");

  let prompt = `Bạn là Giám đốc điều hành xuất chúng. Nhiệm vụ của bạn là đọc và phân tích tài liệu đính kèm.
Hãy trình bày báo cáo bằng tiếng Việt, có format Markdown chuẩn xác, chia thành 2 phần rõ rệt:

### 1. Tóm tắt tài liệu
- (Tóm tắt cực kỳ súc tích nội dung cốt lõi của tài liệu vào 3-4 gạch đầu dòng)
- ...

### 2. Phân tích tài liệu
- **Tính khả thi:** (Đánh giá mức độ khả thi của nội dung)
- **Tài chính & Nguồn lực:** (Đánh giá chi phối ngân sách có hợp lý không)
- **Rủi ro:** (Nêu ra rủi ro tiềm ẩn)
- **Đề xuất:** (Khuyên Giám đốc có nên bấm "Phê duyệt" hay không?)

Tuyệt đối không bịa thông tin rác.`;

  if (entityType === "marketing_yearly_plan") {
    prompt = `Vai trò: Bạn là một Giám đốc Marketing (CMO) dày dặn kinh nghiệm trong ngành xây dựng và thiết bị hoàn thiện nhà cửa. Hãy phân tích và đánh giá bản kế hoạch marketing đính kèm dựa trên thang điểm 100 cho 5 tiêu chí thực chiến sau:

### 1. Độ thấu hiểu Khách hàng & Đại lý (20đ):
- Kế hoạch có bóc tách rõ nỗi đau của đại lý (tồn kho, vốn, marketing) và nhu cầu khách lẻ (cải tạo vs xây mới) không?
- Chân dung khách hàng có thực tế hay chỉ nói chung chung?

### 2. Chiến lược "Kéo & Đẩy" (25đ):
- Lực đẩy: Có chính sách hỗ trợ đại lý tại điểm bán (trưng bày, đào tạo, POSM) rõ ràng không?
- Lực kéo: Nội dung có đủ sức nặng để người dùng cuối chủ động tìm đến thương hiệu không?

### 3. Ma trận Nội dung & Tính chuyên gia (20đ):
- Tỷ lệ nội dung giáo dục (Educate) so với nội dung bán hàng có hợp lý không (kỳ vọng 60/40)?
- Có các nội dung mang tính minh chứng thực tế (dự án, review tính năng kỹ thuật, video lắp đặt) không?

### 4. Tính khả thi trong Vận hành & Roadmap (20đ):
- Cơ cấu nhân sự (WBS) có phân rõ người - rõ việc không?
- Lộ trình triển khai có đi theo mùa vụ của ngành xây dựng không?

### 5. Hệ thống KPI & Đo lường (15đ):
- Các chỉ số có được định lượng cụ thể (số Lead, số đại lý mới, ngân sách/Lead) hay vẫn để trống?

### Yêu cầu đầu ra:
- **Kết quả chấm điểm**: Ghi điểm theo dạng danh sách. Bạn PHẢI COPY CHÍNH XÁC cấu trúc sau và điền điểm + nhận xét:
  - **Độ thấu hiểu Khách hàng & Đại lý**: [Điểm]/20 - [Lý do ngắn gọn]
  - **Chiến lược Kéo & Đẩy**: [Điểm]/25 - [Lý do ngắn gọn]
  - **Ma trận Nội dung & Tính chuyên gia**: [Điểm]/20 - [Lý do ngắn gọn]
  - **Tính khả thi & Roadmap**: [Điểm]/20 - [Lý do ngắn gọn]
  - **Hệ thống KPI & Đo lường**: [Điểm]/15 - [Lý do ngắn gọn]
  - **Tổng điểm**: [Tổng]/100
Tuyệt đối KHÔNG sử dụng Table. Tuyệt đối KHÔNG ghi kiểu "Tiêu chí 1, Tiêu chí 2".
- **Phân tích chi tiết**: Với mỗi tiêu chí, hãy nêu rõ: "Điểm sáng thực tế" và "Lỗ hổng cần lấp đầy".
- **Hành động ngay**: Đề xuất 3 thay đổi cấp bách nhất để bản kế hoạch này có thể thực thi thành công.
- **Đánh giá rủi ro**: Chỉ ra rủi ro lớn nhất nếu triển khai bản kế hoạch này tại thị trường Việt Nam.
- **Khuyến nghị phê duyệt**: Đưa ra quyết định cuối cùng cho Giám đốc viết thành một dòng duy nhất bắt đầu bằng: [PHÊ DUYỆT], [TỪ CHỐI], hoặc [CÂN NHẮC] kèm lý do cốt lõi. Bắt buộc có dòng này.
- **Ngôn ngữ**: Tiếng Việt chuyên nghiệp, súc tích. LUÔN MỞ ĐẦU BÁO CÁO bằng câu: "Báo cáo Giám đốc," (không dùng Kính gửi).`;
  }

  // Học theo cấu trúc của Trợ lý AI đang hoạt động OK
  const MODELS = [
    "gemini-2.5-flash", 
    "gemini-2.5-flash-lite", 
    "gemini-2.0-flash-lite",
    "gemini-1.5-flash"
  ];

  for (const model of MODELS) {
    const shuffled = [...keys].sort(() => Math.random() - 0.5);
    for (const key of shuffled) {
      try {
        const ai = new GoogleGenAI({ apiKey: key });
        
        // Gửi tệp PDF kèm Prompt theo cấu trúc chuẩn
        const response = await ai.models.generateContent({
           model,
           contents: [
             {
               role: 'user', 
               parts: [
                 { inlineData: { data: base64Data, mimeType: "application/pdf" } },
                 { text: prompt }
               ]
             }
           ]
        });

        const text = response.text ?? "";
        if (text) {
          console.log(`[ai-pdf-analysis] ✅ model=${model} key=...${key.slice(-6)}`);
          return text;
        }
      } catch (err: any) {
        const msg = err?.message || String(err);
        const status = err?.status || err?.code || "unknown";
        
        console.error(`[ai-pdf-analysis] ❌ THẤT BẠI: key=...${key.slice(-6)} model=${model} status=${status}`);
        console.error(`[ai-pdf-analysis] Chi tiết lỗi: ${msg}`);

        // Nếu là lỗi "Model không tìm thấy" - Bỏ qua model này cho tất cả các key sau để tiết kiệm thời gian
        if (msg.includes("not found") || msg.includes("invalid model")) {
           console.warn(`[ai-pdf-analysis] Bỏ qua model ${model} do không tồn tại hoặc chưa được cấp quyền.`);
           break; // Thoát vòng lặp keys của model này, sang model tiếp theo
        }

        const isRetryable = 
          msg.includes("429") || msg.includes("RESOURCE_EXHAUSTED") || msg.includes("quota") || 
          msg.includes("503") || msg.includes("UNAVAILABLE") || msg.includes("500") || 
          msg.includes("502") || msg.includes("demand") || msg.includes("overloaded") ||
          msg.includes("Safety") || msg.includes("blocked");

        if (isRetryable) {
          continue; // Thử key tiếp theo cho model này
        }
        
        // Nếu là lỗi nghiêm trọng khác (như API Key sai hoàn toàn - 401)
        if (msg.includes("401") || msg.includes("API key not valid")) {
           console.error(`[ai-pdf-analysis] API Key ...${key.slice(-6)} KHÔNG HỢP LỆ.`);
           continue; 
        }

        throw err;
      }
    }
  }
  throw new Error("Tất cả các Model AI dự phòng hiện đang quá tải hoặc gặp lỗi kết nối. Vui lòng kiểm tra lại cấu hình API Key và thử lại sau ít phút.");
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { pdfUrl, entityType } = body;
    if (!pdfUrl) {
       return NextResponse.json({ success: false, error: "Missing pdfUrl" }, { status: 400 });
    }

    const text = await generateWithFallback(pdfUrl, entityType || "");
    return NextResponse.json({ success: true, data: text });
  } catch (err) {
    console.error("[approvals/ai-analysis] error:", err);
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}
