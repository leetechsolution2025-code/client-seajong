import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import * as cheerio from 'cheerio';
import { prisma } from '@/lib/prisma';

function getGeminiKey(): string {
  const keys = (process.env.GEMINI_API_KEYS || "").split(",").map(k => k.trim()).filter(Boolean);
  if (keys.length === 0) return process.env.GEMINI_API_KEY || "";
  return keys[Math.floor(Math.random() * keys.length)];
}

export async function GET(req: NextRequest) {
  // Bypass SSL certificate errors for Vietnamese government websites
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

  try {
    const url = req.nextUrl.searchParams.get('url');
    if (!url || !url.startsWith("http")) {
      return NextResponse.json({ error: "URL không hợp lệ" }, { status: 400 });
    }

    console.log(`[Summarize API] Đang lấy nội dung từ: ${url}`);

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36'
      }
    });

    if (!response.ok) {
      throw new Error(`Trang web Tổng cục Thuế không phản hồi (Mã lỗi: ${response.status}). Có thể do link chuyên trang đã hết hạn phiên làm việc. Vui lòng làm mới trang (F5) và thử lại.`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    let extractedContent = $('.portlet-body, .content-detail, .news-detail, article').text() || $('body').text();
    extractedContent = extractedContent.replace(/\s+/g, ' ').trim();

    let fileLink: string | null = null;
    $('a').each((_, el) => {
      const href = $(el).attr('href');
      if (href && (href.toLowerCase().endsWith('.pdf') || href.toLowerCase().endsWith('.doc') || href.toLowerCase().endsWith('.docx') || href.toLowerCase().endsWith('.zip'))) {
        fileLink = href.startsWith('http') ? href : new URL(href, url).href;
        return false;
      }
    });

    let pdfPart: any = null;
    if (fileLink && (fileLink as string).toLowerCase().endsWith('.pdf')) {
      try {
        console.log(`[Summarize API] Tải PDF đính kèm để phân tích bằng AI: ${fileLink}`);
        const pdfRes = await fetch(fileLink);
        const arrayBuffer = await pdfRes.arrayBuffer();
        pdfPart = {
          inlineData: {
            data: Buffer.from(arrayBuffer).toString('base64'),
            mimeType: 'application/pdf'
          }
        };
      } catch (pdfErr) {
        console.error("Lỗi tải PDF gửi lên AI:", pdfErr);
      }
    }

    // Check cache
    const existing = await (prisma as any).taxPolicyNews.findUnique({ where: { link: url } });
    if (existing && existing.detailedSummary) {
      console.log(`[Summarize API] Trả về tóm tắt từ Cache DB...`);
      return NextResponse.json({
        summary: existing.detailedSummary,
        fileLink
      });
    }

    const key = getGeminiKey();
    if (!key) {
      return NextResponse.json({ 
        summary: "Không có cấu hình GEMINI_API_KEYS. Xin vui lòng cấu hình để sử dụng tính năng tóm tắt.",
        fileLink 
      });
    }

    const ai = new GoogleGenAI({ apiKey: key });
    const truncatedText = extractedContent.substring(0, 20000); 
    
    const prompt = `Bạn là một Kế toán trưởng dày dặn kinh nghiệm và am hiểu sâu rộng về luật Thuế.
Nhiệm vụ của bạn là đọc toàn văn bản/công văn Thuế dưới đây và tóm tắt chi tiết TOÀN BỘ CÁC NỘI DUNG CHÍNH trọng tâm nhất.

Yêu cầu trình bày:
- Viết bằng ngôn ngữ chuyên môn Kế toán rõ ràng, mạch lạc, đi thẳng vào vấn đề.
- Dùng cấu trúc Markdown, chia thành các phần rõ ràng như: **1. Đối tượng áp dụng**, **2. Nội dung chính**, **3. Hiệu lực thi hành**...
- KHÔNG GIỚI HẠN số lượng ý, cứ thấy nội dung nào quan trọng thì gạch đầu dòng phân tích ra.

Nội dung văn bản:
${truncatedText}`;

    let requestContents: any[] = [prompt];
    if (pdfPart) {
      requestContents = [
        prompt + "\n\n(Lưu ý: Tôi có đính kèm file PDF gốc của văn bản, hãy đọc và phân tích chi tiết nội dung trong file PDF đính kèm đó, vì đôi khi nội dung trên website bị thiếu sót.)",
        pdfPart
      ];
    }

    console.log(`[Summarize API] Gửi tới Gemini...`);
    const aiResponse = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: requestContents
    });

    const finalSummary = aiResponse.text || "Không thể phân tích nội dung.";

    // Save to cache
    if (existing) {
      try {
        await (prisma as any).taxPolicyNews.update({
          where: { link: url },
          data: { detailedSummary: finalSummary }
        });
      } catch (updateErr) {
        console.error("Lỗi lưu cache (Prisma):", updateErr);
      }
    }

    return NextResponse.json({
      summary: finalSummary,
      fileLink
    });

  } catch (error) {
    console.error("Summarize API Error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
