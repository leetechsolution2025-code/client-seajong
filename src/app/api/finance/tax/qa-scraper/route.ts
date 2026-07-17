import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import * as cheerio from 'cheerio';
import { prisma } from '@/lib/prisma';

function getGeminiKey(): string {
  const keys = (process.env.GEMINI_API_KEYS || "").split(",").map(k => k.trim()).filter(Boolean);
  if (keys.length === 0) return process.env.GEMINI_API_KEY || "";
  return keys[Math.floor(Math.random() * keys.length)];
}

export async function GET(req: Request) {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  const urlObj = new URL(req.url);
  const targetUrl = urlObj.searchParams.get('url') || 'https://www.gdt.gov.vn/wps/portal';

  try {
    console.log(`[QA Scraper] Fetching from ${targetUrl}`);
    const response = await fetch(targetUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
    });

    if (!response.ok) {
      throw new Error(`Fetch failed: ${response.status}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);
    
    // Extract text from main content areas
    let textContent = $('body').text().replace(/\s+/g, ' ').trim();
    // To avoid hitting token limits, we can truncate if it's too long, but GDT pages are usually < 50k chars.
    if (textContent.length > 50000) {
      textContent = textContent.substring(0, 50000);
    }

    const ai = new GoogleGenAI({ apiKey: getGeminiKey() });
    
    const prompt = `
Dưới đây là nội dung văn bản lấy từ chuyên trang Hỏi Đáp của Tổng cục Thuế Việt Nam:
---
${textContent}
---

Nhiệm vụ của bạn:
Trích xuất TẤT CẢ các câu Hỏi và Đáp (Q&A) có trong văn bản trên.
- Chỉ lấy các câu hỏi thực tế và câu trả lời tương ứng (có thể là câu trả lời trực tiếp hoặc hướng dẫn).
- Đảm bảo giữ nguyên văn phong pháp lý.
- Trả về kết quả dưới định dạng JSON là một mảng các object. Mỗi object có 3 thuộc tính:
  - "question": Nội dung câu hỏi.
  - "answer": Nội dung trả lời chi tiết.
  - "category": Phân loại (ví dụ: Thuế GTGT, Thuế TNCN, Hóa đơn điện tử, Tiền thuê đất, v.v. tự nội suy).

Nếu không tìm thấy câu hỏi nào, hãy trả về mảng rỗng [].
Chỉ trả về JSON, không thêm bất kỳ văn bản nào khác.
`;

    console.log(`[QA Scraper] Sending to Gemini to extract Q&A...`);
    const aiResponse = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json"
      }
    });

    const resultText = aiResponse.text || "[]";
    let extractedQAs: any[] = [];
    try {
      extractedQAs = JSON.parse(resultText);
    } catch (e) {
      console.error("Failed to parse Gemini response:", resultText);
      return NextResponse.json({ error: "Failed to parse AI response" }, { status: 500 });
    }

    console.log(`[QA Scraper] Gemini extracted ${extractedQAs.length} Q&As.`);

    const db = prisma as any;
    let savedCount = 0;
    let duplicateCount = 0;

    for (const qa of extractedQAs) {
      if (!qa.question || !qa.answer) continue;

      // Deduplication: Check if an exact or very similar question already exists
      const existing = await db.taxQA.findFirst({
        where: {
          question: qa.question
        }
      });

      if (!existing) {
        await db.taxQA.create({
          data: {
            question: qa.question,
            answer: qa.answer,
            category: qa.category || 'Khác',
            sourceUrl: targetUrl,
            publishDate: new Date()
          }
        });
        savedCount++;
      } else {
        duplicateCount++;
      }
    }

    return NextResponse.json({
      success: true,
      extracted: extractedQAs.length,
      saved: savedCount,
      duplicates: duplicateCount,
      data: extractedQAs
    });

  } catch (error) {
    console.error("QA Scraper Error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
