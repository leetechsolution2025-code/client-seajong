import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(req: Request) {
  try {
    const { text } = await req.json();

    if (!text) {
      return NextResponse.json({ success: false, message: "Không có nội dung văn bản" }, { status: 400 });
    }

    const keys = (process.env.GEMINI_API_KEYS || "").split(",")
      .map(k => k.trim().replace(/^["']|["']$/g, ""))
      .filter(k => k);
    
    if (keys.length === 0) {
      return NextResponse.json({ success: false, message: "Không tìm thấy GEMINI_API_KEYS trong cấu hình" }, { status: 500 });
    }

    let lastError = null;

    // Rotate through keys until one works
    for (const key of keys) {
      try {
        const genAI = new GoogleGenerativeAI(key);
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        const prompt = `
          Bạn là một trợ lý nhân sự chuyên nghiệp. Hãy phân tích đoạn văn bản CV sau đây và trích xuất thông tin theo định dạng JSON chính xác.
          Văn bản CV:
          "${text}"

          Yêu cầu định dạng JSON trả về:
          {
            "name": "Họ và tên",
            "email": "Email",
            "phone": "Số điện thoại",
            "birthDate": "Ngày sinh định dạng YYYY-MM-DD (nếu có)",
            "gender": "Nam hoặc Nữ (nếu có)",
            "education": "Đại học/Cao đẳng/Thạc sĩ/Tiến sĩ/Phổ thông (chọn 1 cái khớp nhất)",
            "expYears": "Số năm kinh nghiệm (ví dụ: 3 năm, 5 năm)",
            "desiredSalary": "Mức lương mong muốn (nếu có)",
            "address": "Địa chỉ hiện tại",
            "experience": "Mô tả chi tiết kinh nghiệm làm việc (tóm tắt các dự án, vai trò)",
            "skills": "Danh sách kỹ năng (ngôn ngữ, công cụ, chứng chỉ...)"
          }

          Lưu ý: 
          - Chỉ trả về DUY NHẤT mã JSON, không thêm văn bản giải thích.
          - Nếu không tìm thấy thông tin nào, hãy để chuỗi rỗng "".
          - Hãy cố gắng chuẩn hóa tên và thông tin liên hệ.
        `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const resultText = response.text();
        
        const cleanJson = resultText.replace(/```json|```/g, "").trim();
        const parsedData = JSON.parse(cleanJson);

        // Success! Return immediately
        return NextResponse.json({ success: true, data: parsedData });
      } catch (err: any) {
        console.warn(`Key ${key.substring(0, 8)}... failed, trying next. Error:`, err.message);
        lastError = err;
        continue; // Try next key
      }
    }

    // If we reach here, all keys failed
    throw new Error(`Tất cả các API Keys đều thất bại. Lỗi cuối cùng: ${lastError?.message}`);

  } catch (error: any) {
    console.error("AI Parse Final Error:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
