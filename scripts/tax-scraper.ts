import { chromium, Browser, Page } from 'playwright';
import { PrismaClient } from '@prisma/client';
import { GoogleGenAI } from '@google/genai';
import * as fs from 'fs';
import * as path from 'path';
const pdfParse = require('pdf-parse');

const prisma = new PrismaClient();

function getGeminiKey(): string {
  const keys = (process.env.GEMINI_API_KEYS || "").split(",").map(k => k.trim()).filter(Boolean);
  return keys[0] || process.env.GEMINI_API_KEY || "";
}

const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Edge/120.0.0.0 Safari/537.36",
];

const randomSleep = () => new Promise(resolve => setTimeout(resolve, Math.floor(Math.random() * 5000) + 3000));

async function summarizeText(text: string): Promise<string> {
  const key = getGeminiKey();
  if (!key) return "Không có API Key để tóm tắt.";
  try {
    const ai = new GoogleGenAI({ apiKey: key });
    const truncatedText = text.substring(0, 15000); 
    const prompt = `Bạn là một chuyên gia về Thuế. Hãy đọc nội dung văn bản sau và viết một câu tóm tắt (dưới 30 từ) thật ngắn gọn, dễ hiểu để chạy trên bảng điện tử tin tức (Ticker) cho kế toán viên đọc.\n\nNội dung:\n${truncatedText}`;
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt
    });
    return response.text || "Có chính sách thuế mới được ban hành.";
  } catch (e) {
    console.error("AI Summarize error:", e);
    return "Cập nhật chính sách thuế mới từ Tổng cục Thuế.";
  }
}

async function scrapeGDT() {
  console.log("🚀 Bắt đầu chạy Tax Scraper Bot...");
  
  const proxyStr = process.env.SCRAPER_PROXY; 
  let launchOptions: any = { headless: true };
  if (proxyStr) {
    launchOptions.proxy = { server: proxyStr };
    console.log(`🌐 Đang sử dụng Proxy: ${proxyStr}`);
  }

  const browser = await chromium.launch(launchOptions);
  const context = await browser.newContext({
    userAgent: USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)]
  });
  const page = await context.newPage();

  const urlsToScrape = [
    { url: "https://www.gdt.gov.vn/wps/portal/home/vbpq", type: "Văn bản pháp quy" },
    { url: "https://www.gdt.gov.vn/wps/portal/home/chinh-sach-thue-moi", type: "Chính sách mới" }
  ];

  for (const target of urlsToScrape) {
    console.log(`\n🔍 Đang cào trang: ${target.type} (${target.url})`);
    try {
      await page.goto(target.url, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await randomSleep();

      const newsItems = await page.evaluate(() => {
        const items: any[] = [];
        const links = document.querySelectorAll('.portlet-body a, .list-news a, td a, a.tinbai');
        links.forEach((a: any) => {
          const title = a.innerText.trim();
          const href = a.href;
          if (title.length > 20 && href.includes('wps/portal')) {
            items.push({ title, link: href });
          }
        });
        return items.slice(0, 5);
      });

      console.log(`Tìm thấy ${newsItems.length} bài viết tiềm năng.`);

      for (const item of newsItems) {
        const exists = await (prisma as any).taxPolicyNews.findUnique({ where: { link: item.link } });
        if (exists) {
          console.log(`⏩ Đã tồn tại, bỏ qua: ${item.title.substring(0,30)}...`);
          continue;
        }

        console.log(`\n📥 Bài viết mới: ${item.title.substring(0,30)}...`);
        await page.goto(item.link, { waitUntil: 'domcontentloaded', timeout: 60000 });
        await randomSleep();

        let extractedContent = await page.evaluate(() => {
          const contentDiv = document.querySelector('.portlet-body, .content-detail, .news-detail, article');
          return contentDiv ? (contentDiv as HTMLElement).innerText : "";
        });

        const pdfLink = await page.evaluate(() => {
          const a = document.querySelector('a[href$=".pdf"]');
          return a ? (a as HTMLAnchorElement).href : null;
        });

        if (pdfLink) {
          console.log(`📎 Phát hiện PDF đính kèm: ${pdfLink}`);
          try {
            const response = await fetch(pdfLink);
            const arrayBuffer = await response.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            const pdfData = await pdfParse(buffer);
            extractedContent += "\n[NỘI DUNG PDF]:\n" + pdfData.text;
          } catch (pdfErr) {
            console.error("Lỗi đọc PDF:", pdfErr);
          }
        }

        console.log(`🤖 Đang tóm tắt bằng AI...`);
        const summary = await summarizeText(extractedContent || item.title);

        await (prisma as any).taxPolicyNews.create({
          data: {
            title: item.title,
            link: item.link,
            docType: target.type,
            summary: summary.replace(/\n/g, ' ').trim(),
            publishDate: new Date()
          }
        });
        console.log(`✅ Đã lưu thành công!`);
      }

    } catch (e) {
      console.error(`❌ Lỗi khi quét ${target.url}:`, e);
    }
  }

  await browser.close();
  console.log("\n🎉 Quá trình Scraping hoàn tất!");
}

scrapeGDT()
  .then(async () => {
    await prisma.$disconnect();
    process.exit(0);
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
