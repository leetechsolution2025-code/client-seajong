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

    // Tự động quét thêm nội dung từ Website bằng Cheerio (Lấy giá, chính sách, v.v...)
    if (competitor.website) {
      try {
        console.log(">>> Bắt đầu tự động cào dữ liệu từ website đối thủ (Cheerio):", competitor.website);
        const res = await fetch(competitor.website, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
          },
          // timeout khoảng 10s
          signal: AbortSignal.timeout(10000) 
        });
        if (res.ok) {
          const html = await res.text();
          const cheerio = require('cheerio');
          const $ = cheerio.load(html);
          
          // Xoá các thẻ rác không mang ý nghĩa text
          $('script, style, iframe, noscript, svg, img, path, meta, link, header, footer').remove();
          
          // Lấy text và nén khoảng trắng
          let bodyText = $('body').text().replace(/\s+/g, ' ').trim();
          
          // Giới hạn độ dài để không tràn Context Window của AI (tối đa 50k ký tự)
          if (bodyText.length > 50000) {
            bodyText = bodyText.substring(0, 50000);
          }
          
          if (bodyText.length > 100) {
            scrapedDataText += `\\n\\n--- DỮ LIỆU CÀO ĐƯỢC TỪ WEBSITE ĐỐI THỦ (${competitor.website}) ---\\n${bodyText}\\n---------------------------------------------\\n`;
            console.log(">>> Đã cào website đối thủ thành công! Nội dung dài:", bodyText.length, "ký tự.");
          } else {
            console.warn(">>> Cào website đối thủ thành công nhưng không có text hữu ích.");
          }
        } else {
          console.error(">>> Lỗi khi fetch website đối thủ. Status:", res.status);
        }
      } catch (err) {
        console.error(">>> Lỗi cào dữ liệu trực tiếp từ website đối thủ:", err);
      }
    }

    // Tự động quét thông tin từ Seajong.com để làm cơ sở so sánh
    let seajongDataText = "";
    try {
      console.log(">>> Bắt đầu tự động cào dữ liệu từ website Seajong (Cheerio): https://seajong.com");
      const res = await fetch("https://seajong.com", {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        },
        signal: AbortSignal.timeout(10000) 
      });
      if (res.ok) {
        const html = await res.text();
        const cheerio = require('cheerio');
        const $ = cheerio.load(html);
        $('script, style, iframe, noscript, svg, img, path, meta, link, header, footer').remove();
        let bodyText = $('body').text().replace(/\\s+/g, ' ').trim();
        if (bodyText.length > 50000) {
          bodyText = bodyText.substring(0, 50000);
        }
        if (bodyText.length > 100) {
          seajongDataText = `\\n\\n--- DỮ LIỆU TỪ WEBSITE CỦA CÔNG TY CHÚNG TA (seajong.com) ---\\n${bodyText}\\n---------------------------------------------\\n`;
          console.log(">>> Đã cào website Seajong thành công! Nội dung dài:", bodyText.length, "ký tự.");
        }
      }
    } catch (err) {
      console.error(">>> Lỗi khi cào dữ liệu từ website Seajong:", err);
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

--- DỮ LIỆU CÀO ĐƯỢC MỚI NHẤT VỀ ĐỐI THỦ (REAL-TIME) ---
${scrapedDataText || "KHÔNG CÓ DỮ LIỆU CÀO ĐƯỢC CHO LẦN QUÉT NÀY."}
--------------------------------------------
${seajongDataText}
YÊU CẦU QUAN TRỌNG:
1. Bạn PHẢI dựa trên dữ liệu cào được ở trên để phân tích.
2. Nếu mục "DỮ LIỆU CÀO ĐƯỢC" trống hoặc không chứa thông tin cụ thể về một kênh nào đó, bạn PHẢI ghi giá trị là "Chưa có dữ liệu hoạt động cụ thể" cho kênh đó. TUYỆT ĐỐI không được tự bịa ra hoạt động dựa trên phán đoán.
3. TUYỆT ĐỐI KHÔNG ĐƯỢC MÔ PHỎNG, DỰ ĐOÁN HOẶC DÙNG KIẾN THỨC CÓ SẴN (HALLUCINATION). Mọi phân tích (SWOT, chiến lược, hoạt động nổi bật, tóm tắt) PHẢI 100% dựa trên nội dung có trong phần "DỮ LIỆU CÀO ĐƯỢC". Nếu không có dữ liệu cào được, bạn phải trả về các mảng rỗng [] hoặc nội dung "Chưa có dữ liệu thực tế để phân tích".
4. ĐẶC BIỆT: Nếu có dữ liệu của cả Đối thủ và công ty Seajong (seajong.com), hãy ĐƯA RA SO SÁNH RÕ RÀNG VỀ GIÁ CẢ VÀ CHÍNH SÁCH BÁN HÀNG giữa 2 bên trong mục "aiSummary".

CHỈ TRẢ VỀ ĐÚNG ĐỊNH DẠNG JSON NHƯ SAU, KHÔNG THÊM VĂN BẢN NÀO KHÁC:
{
  "aiSummary": "Tóm tắt ngắn gọn và bắt buộc có đoạn: SO SÁNH VỚI SEAJONG: (phân tích ưu nhược điểm về giá cả, chính sách của đối thủ so với Seajong nếu có dữ liệu cào được của cả hai). Nếu không có dữ liệu cào được, bắt buộc ghi 'Chưa có dữ liệu thực tế để phân tích.'",
  "swot": {
    "strengths": ["Liệt kê các điểm mạnh dựa trên dữ liệu cào. Trả về mảng rỗng [] nếu không có dữ liệu."],
    "weaknesses": ["Tương tự, trả về mảng rỗng [] nếu không có dữ liệu."],
    "opportunities": ["Tương tự, trả về mảng rỗng [] nếu không có dữ liệu."],
    "threats": ["Tương tự, trả về mảng rỗng [] nếu không có dữ liệu."]
  },
  "channelActivities": {
    "Facebook": "Liệt kê bài đăng. Nếu không có dữ liệu cào, ghi 'Chưa có dữ liệu hoạt động cụ thể'.",
    "TikTok": "Liệt kê hoạt động. Nếu không có dữ liệu cào, ghi 'Chưa có dữ liệu hoạt động cụ thể'.",
    "Youtube": "Liệt kê video. Nếu không có dữ liệu cào, ghi 'Chưa có dữ liệu hoạt động cụ thể'.",
    "Shopee": "Liệt kê Flash Sale/Khuyến mãi. Nếu không có dữ liệu cào, ghi 'Chưa có dữ liệu hoạt động cụ thể'."
  },
  "strategySuggestions": {
    "dos": ["Dựa trên dữ liệu cào được. Nếu không có, bắt buộc trả về mảng rỗng []"],
    "donts": ["Dựa trên dữ liệu cào được. Nếu không có, bắt buộc trả về mảng rỗng []"]
  },
  "newsHighlights": [
    "Thông tin sự kiện thực tế chỉ lấy từ dữ liệu cào được. Tuyệt đối không tự dự đoán. Trả về mảng rỗng [] nếu không có dữ liệu."
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
  } catch (error: any) {
    console.error("AI Analysis Error:", error);
    return NextResponse.json(
      { error: "Quá trình phân tích AI gặp sự cố. Vui lòng thử lại sau.", details: error.message, stack: error.stack },
      { status: 500 }
    );
  }
}
