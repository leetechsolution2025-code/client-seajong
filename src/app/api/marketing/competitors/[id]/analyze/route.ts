import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const maxDuration = 120;

/**
 * POST /api/marketing/competitors/[id]/analyze
 * Kích hoạt quy trình thu thập dữ liệu và phân tích AI cho một đối thủ cụ thể.
 */

import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const competitor = await prisma.competitor.findUnique({
      where: { id },
    });

    if (!competitor) {
      return NextResponse.json({ error: "Không tìm thấy đối thủ" }, { status: 404 });
    }

    const apiKeysEnv = process.env.GEMINI_API_KEYS || process.env.GEMINI_API_KEY;
    if (!apiKeysEnv) {
      return NextResponse.json({ error: "Chưa cấu hình GEMINI_API_KEYS" }, { status: 500 });
    }
    
    // Lấy key đầu tiên hoặc random nếu có nhiều key
    const apiKeys = apiKeysEnv.split(',').map(k => k.trim());
    const apiKey = apiKeys[Math.floor(Math.random() * apiKeys.length)];

    const genAI = new GoogleGenerativeAI(apiKey);
    
    let scrapedDataText = "";
    const makeWebhookUrl = process.env.MAKE_SCRAPER_WEBHOOK;
    
    if (makeWebhookUrl) {
      try {
        console.log(">>> Đang gọi Make.com Webhook:", makeWebhookUrl);
        const webhookBody = {
          competitorId: competitor.id,
          name: competitor.name,
          facebookUrl: (competitor as any).facebookUrl,
          tiktokUrl: (competitor as any).tiktokUrl,
          youtubeUrl: (competitor as any).youtubeUrl,
          shopeeUrl: (competitor as any).shopeeUrl
        };
        console.log(">>> Dữ liệu gửi sang Make.com:", JSON.stringify(webhookBody, null, 2));
        
        const response = await fetch(makeWebhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(webhookBody)
        });

        if (response.ok) {
          const text = await response.text();
          console.log(">>> Phản hồi từ Make.com:", text);
          try {
            const data = JSON.parse(text);
            if (data.scrapedText) {
              scrapedDataText = `\n--- DỮ LIỆU CÀO ĐƯỢC MỚI NHẤT (REAL-TIME) ---\n${data.scrapedText}\n---------------------------------------------\n`;
              console.log(">>> Đã nhận dữ liệu Scrape thành công! Nội dung dài:", data.scrapedText.length, "ký tự.");
            } else {
              console.warn(">>> Make.com trả về thành công nhưng trường 'scrapedText' bị TRỐNG.");
            }
          } catch (e) {
            console.error(">>> Lỗi Parse JSON từ Make.com:", e);
          }
        } else {
          console.error(">>> Make.com trả về lỗi Status:", response.status);
        }
      } catch (err) {
        console.error(">>> Lỗi kết nối tới Make.com:", err);
      }
    }

    const prompt = `
Bạn là một chuyên gia phân tích chiến lược kinh doanh và Marketing tại thị trường Việt Nam.
Dưới đây là thông tin về một đối thủ cạnh tranh của công ty chúng tôi:
- Tên thương hiệu: ${competitor.name}
- Website: ${competitor.website}
${(competitor as any).facebookUrl ? `- Facebook: ${(competitor as any).facebookUrl}` : ''}
${(competitor as any).tiktokUrl ? `- TikTok: ${(competitor as any).tiktokUrl}` : ''}
${(competitor as any).youtubeUrl ? `- Youtube: ${(competitor as any).youtubeUrl}` : ''}
${(competitor as any).shopeeUrl ? `- Shopee: ${(competitor as any).shopeeUrl}` : ''}

--- DỮ LIỆU CÀO ĐƯỢC MỚI NHẤT (REAL-TIME) ---
${scrapedDataText || "KHÔNG CÓ DỮ LIỆU CÀO ĐƯỢC CHO LẦN QUÉT NÀY."}
--------------------------------------------

YÊU CẦU QUAN TRỌNG:
1. Bạn PHẢI dựa trên dữ liệu cào được ở trên để phân tích.
2. Nếu mục "DỮ LIỆU CÀO ĐƯỢC" trống hoặc không chứa thông tin cụ thể về một kênh nào đó (ví dụ không có dữ liệu TikTok), bạn PHẢI ghi giá trị là "Chưa có dữ liệu hoạt động cụ thể" cho kênh đó. TUYỆT ĐỐI không được tự bịa ra hoạt động dựa trên phán đoán.
3. Bản tóm tắt (aiSummary) vẫn có thể dựa trên hiểu biết chung về thương hiệu nếu thương hiệu đó nổi tiếng, nhưng các mục trong channelActivities PHẢI sát với dữ liệu cào được.

CHỈ TRẢ VỀ ĐÚNG ĐỊNH DẠNG JSON NHƯ SAU, KHÔNG THÊM VĂN BẢN NÀO KHÁC:
{
  "aiSummary": "Tóm tắt ngắn gọn (khoảng 3-4 câu) về tình hình hoạt động hiện tại, chiến lược chính hoặc điểm nổi bật nhất của đối thủ này thời gian gần đây.",
  "swot": {
    "strengths": ["3 điểm mạnh lớn nhất"],
    "weaknesses": ["3 điểm yếu đáng chú ý"],
    "opportunities": ["3 cơ hội để chúng ta khai thác lỗ hổng của họ"],
    "threats": ["3 mối đe dọa trực tiếp từ đối thủ này tới chúng ta"]
  },
  "channelActivities": {
    "Facebook": "Liệt kê tối đa 3 bài đăng mới nhất theo định dạng: • [Thời gian]: [Tóm tắt nội dung ngắn] ([Số] Like, [Số] Comment, [Số] Share). Nếu không có dữ liệu cào, ghi 'Chưa có dữ liệu hoạt động cụ thể'.",
    "TikTok": "Liệt kê tối đa 3 hoạt động/video mới nhất theo định dạng tương tự bài đăng Facebook. Nếu không có dữ liệu cào, ghi 'Chưa có dữ liệu hoạt động cụ thể'.",
    "Youtube": "Liệt kê tối đa 3 video mới nhất theo định dạng tương tự. Nếu không có dữ liệu cào, ghi 'Chưa có dữ liệu hoạt động cụ thể'.",
    "Shopee": "Liệt kê các chương trình Flash Sale hoặc khuyến mãi mới nhất. Nếu không có dữ liệu cào, ghi 'Chưa có dữ liệu hoạt động cụ thể'."
  },
  "strategySuggestions": {
    "dos": ["3 hành động cụ thể và thực chiến chúng ta NÊN LÀM để cạnh tranh"],
    "donts": ["2 sai lầm chí mạng chúng ta KHÔNG NÊN LÀM khi đối đầu với họ"]
  },
  "newsHighlights": [
    "3 dự đoán hoặc thông tin về các hoạt động, sự kiện nổi bật gần đây của họ"
  ],
  "status": "Chỉ chọn 1 trong 3 từ sau để mô tả tình trạng của họ: aggressive, stable, declining"
}
`;

    let result = null;
    let lastError = null;

    // Cơ chế Quay vòng Key: Thử từng Key một với model 2.5 Flash
    for (let i = 0; i < apiKeys.length; i++) {
      const apiKey = apiKeys[i];
      try {
        console.log(`>>> Đang thử với Key thứ ${i + 1}/${apiKeys.length} (Model: gemini-2.5-flash)...`);
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ 
          model: "gemini-2.5-flash",
          generationConfig: { responseMimeType: "application/json" }
        });
        
        result = await model.generateContent(prompt);
        if (result) {
          console.log(`>>> Thành công với Key thứ ${i + 1}!`);
          break;
        }
      } catch (err) {
        lastError = err;
        console.warn(`>>> Key thứ ${i + 1} bị lỗi (403/429), đang thử Key tiếp theo...`);
      }
    }

    if (!result) {
      // Nếu tất cả các Key đều lỗi với 2.5, thử dùng bản 1.5 làm cứu cánh cuối cùng với key đầu tiên
      try {
        console.log(">>> Tất cả các Key đều không dùng được 2.5. Đang thử bản 1.5 làm phương án dự phòng...");
        const genAI = new GoogleGenerativeAI(apiKeys[0]);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash", generationConfig: { responseMimeType: "application/json" } });
        result = await model.generateContent(prompt);
      } catch (e) {
        throw lastError || new Error("Tất cả các API Keys đều không hoạt động.");
      }
    }

    let responseText = result.response.text();
    
    // Clean up potential markdown formatting from Gemini
    responseText = responseText.replace(/```json/g, "").replace(/```/g, "").trim();
    
    const aiData = JSON.parse(responseText);

    const updateData = {
      aiSummary: aiData.aiSummary || "Chưa có thông tin tổng quan.",
      swot: JSON.stringify(aiData.swot || {}),
      metrics: JSON.stringify(aiData.channelActivities || {}),
      strategySuggestions: JSON.stringify(aiData.strategySuggestions || {}),
      newsHighlights: JSON.stringify(aiData.newsHighlights || []),
      status: aiData.status || "stable",
      lastScan: new Date().toISOString() as any,
    };

    const updatedCompetitor = await prisma.competitor.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(updatedCompetitor);
  } catch (error) {
    console.error("AI Analysis Error:", error);
    return NextResponse.json(
      { error: "Quá trình phân tích AI gặp sự cố. Vui lòng thử lại sau." },
      { status: 500 }
    );
  }
}
