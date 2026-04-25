import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { prisma } from '@/lib/prisma';

function brandColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  const palette = ["#2563eb","#0ea5e9","#8b5cf6","#ec4899","#10b981","#f59e0b","#ef4444","#06b6d4","#6366f1","#14b8a6"];
  return palette[Math.abs(hash) % palette.length];
}

function sanitizeText(raw: string, maxChars = 2000): string {
  return raw
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;|&amp;|&lt;|&gt;|&quot;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxChars);
}

async function generateWithFallback(prompt: string): Promise<any> {
  const keysStr = process.env.GEMINI_API_KEYS || "";
  const keys = keysStr.split(',').map(k => k.trim()).filter(Boolean);
  if (keys.length === 0) throw new Error("Chua cau hinh GEMINI_API_KEYS");

  // Thu tu model: dung cac ten model dang duoc su dung trong cac file khac cua project
  const MODELS = ["gemini-2.5-flash", "gemini-2.5-flash-lite", "gemini-2.0-flash-lite"];

  for (const model of MODELS) {
    const shuffledKeys = [...keys].sort(() => Math.random() - 0.5);
    for (const key of shuffledKeys) {
      try {
        const ai = new GoogleGenAI({ apiKey: key });
        const response = await ai.models.generateContent({
          model,
          contents: prompt,
          config: { temperature: 0.1, responseMimeType: "application/json" },
        });
        
        const text = response.text || '';
        if (!text) continue;

        try {
          return JSON.parse(text);
        } catch {
          const match = text.match(/\{[\s\S]*\}/);
          if (match) return JSON.parse(match[0]);
          continue;
        }
      } catch (err: any) {
        const msg = String(err).toLowerCase();
        // Neu gap loi qua tai, het quota, hoac model khong ton tai, thu key khac hoac model khac
        if (
          msg.includes("503") || 
          msg.includes("429") || 
          msg.includes("404") ||
          msg.includes("not found") ||
          msg.includes("unavailable") || 
          msg.includes("demand") || 
          msg.includes("exhausted") ||
          msg.includes("limit")
        ) {
          console.warn(`[AI Fallback] Model ${model} failed with key ${key.slice(0, 6)}...: ${msg}`);
          continue;
        }
        // Neu la loi khac (syntax, etc.), throw luon
        throw err;
      }
    }
  }
  throw new Error("Dịch vụ AI đang quá tải (503). Vui lòng thử lại sau ít phút hoặc kiểm tra lại API Key.");
}

async function scrapeWebsite(domain: string): Promise<string> {
  const url = domain.startsWith('http') ? domain : `https://${domain}`;
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ResearchBot/1.0)' },
      signal: AbortSignal.timeout(7000),
    });
    const clean = sanitizeText(await res.text(), 2500);
    return clean ? `Website content (${domain}):\n${clean}` : '';
  } catch { return ''; }
}

async function scrapeProductPrices(domain: string, SERPAPI_KEY: string): Promise<string> {
  const base = domain.startsWith('http') ? domain : `https://${domain}`;
  const brandName = domain.replace(/^https?:\/\/(www\.)?/, '').replace(/\/.*$/, '');
  const priceTexts: string[] = [];

  // Try common product/price pages
  const pricePaths = ['/san-pham', '/products', '/gia', '/bang-gia', '/cua-hang', '/shop'];
  const pageResults = await Promise.allSettled(
    pricePaths.slice(0, 4).map(path =>
      fetch(`${base}${path}`, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ResearchBot/1.0)' },
        signal: AbortSignal.timeout(5000),
      }).then(r => r.text())
    )
  );

  for (const result of pageResults) {
    if (result.status === 'fulfilled') {
      const text = sanitizeText(result.value, 3000);
      const priceMatches = text.match(/(\d[\d.,]*\s*(?:tr\.?\.*|\.?000|\.?\d{3})?\s*(VND|dong|trieu|nghin|k\b))/gi) || [];
      if (priceMatches.length > 0) {
        priceTexts.push(`Prices on product page: ${priceMatches.slice(0, 10).join(' | ')}`);
        priceTexts.push(`Context: ${text.slice(0, 400)}`);
        break;
      }
    }
  }

  // SerpAPI price search
  try {
    const serpData = await fetch(
      `https://serpapi.com/search.json?q=${encodeURIComponent(brandName + ' bang gia san pham 2025 2026')}&api_key=${SERPAPI_KEY}&num=5&hl=vi&gl=vn`
    ).then(r => r.json());

    (serpData.organic_results || []).slice(0, 3).forEach((r: any) => {
      const snippet = sanitizeText(r.snippet || '', 300);
      if (/\d+.*(?:VND|dong|trieu|nghin|k\b)/i.test(snippet)) {
        priceTexts.push(`[Google] ${r.title}: ${snippet}`);
      }
    });

    (serpData.shopping_results || []).slice(0, 5).forEach((r: any) => {
      priceTexts.push(`[Shopping] ${r.title}: ${r.price || 'Unknown price'}`);
    });
  } catch { /* silent */ }

  if (priceTexts.length === 0) return '';
  return `ACTUAL PRODUCT PRICES (${brandName}):\n` + priceTexts.join('\n');
}

async function fetchNewsContext(brandName: string, SERPAPI_KEY: string) {
  const [newsRes, kgRes] = await Promise.all([
    fetch(`https://serpapi.com/search.json?q=${encodeURIComponent(brandName + " quang cao chien dich moi")}&api_key=${SERPAPI_KEY}&num=10&tbm=nws&tbs=qdr:m&hl=vi&gl=vn`),
    fetch(`https://serpapi.com/search.json?q=${encodeURIComponent(brandName)}&api_key=${SERPAPI_KEY}&num=5&hl=vi&gl=vn`),
  ]);
  const [newsData, kgData] = await Promise.all([newsRes.json(), kgRes.json()]);

  const newsList: { title: string; link: string; date?: string; source?: string }[] = (newsData.news_results || []).slice(0, 10).map((r: any) => ({
    title: r.title,
    link: r.link || "#",
    date: r.date,
    source: r.source?.name
  }));

  const rawNews: string[] = (newsData.news_results || []).slice(0, 10).map(
    (r: any) => `[${r.date || 'Recent'}] ${r.source?.name || ''} - ${r.title}: ${sanitizeText(r.snippet || '', 200)}`
  );

  if (rawNews.length === 0) {
    (kgData.organic_results || []).slice(0, 5).forEach((r: any) => {
      rawNews.push(`${r.title}: ${sanitizeText(r.snippet || '', 200)}`);
      newsList.push({
        title: r.title,
        link: r.link || "#",
        source: "Google Search"
      });
    });
  }

  const kgSummary = kgData.knowledge_graph
    ? `KG: ${kgData.knowledge_graph.title || ''} - ${sanitizeText(kgData.knowledge_graph.description || '', 300)}`
    : '';
  const relatedSearches: string[] = (kgData.related_searches || []).map((r: any) => r.query).slice(0, 6);
  const totalResults: number = kgData.search_information?.total_results || 0;

  return { newsSnippets: rawNews, kgSummary, relatedSearches, totalResults, newsList };
}

async function fetchMetaAds(brandName: string): Promise<{ count: number; sampleAds: string[] }> {
  const APIFY_TOKEN = process.env.APIFY_TOKEN;
  if (!APIFY_TOKEN) return { count: 0, sampleAds: [] };
  try {
    const { data } = await fetch(
      `https://api.apify.com/v2/acts/apify~facebook-ads-library-scraper/runs?token=${APIFY_TOKEN}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ searchTerms: [brandName], country: "VN", adType: "all", maxResults: 15 }) }
    ).then(r => r.json());
    const runId = data?.id;
    if (!runId) return { count: 0, sampleAds: [] };

    let statusRes: any;
    for (let i = 0; i < 6; i++) {
      await new Promise(r => setTimeout(r, 5000));
      statusRes = await fetch(`https://api.apify.com/v2/actor-runs/${runId}?token=${APIFY_TOKEN}`).then(r => r.json());
      if (statusRes?.data?.status === 'SUCCEEDED') break;
      if (statusRes?.data?.status === 'FAILED') return { count: 0, sampleAds: [] };
    }
    if (statusRes?.data?.status !== 'SUCCEEDED') return { count: 0, sampleAds: [] };

    const items = await fetch(`https://api.apify.com/v2/datasets/${statusRes.data.defaultDatasetId}/items?token=${APIFY_TOKEN}&limit=15`).then(r => r.json());
    if (!Array.isArray(items)) return { count: 0, sampleAds: [] };
    const sampleAds = items.slice(0, 5).map((ad: any) => {
      const text = sanitizeText(ad.snapshot?.body?.markup?.__html || '', 150);
      return ad.adArchiveID && text ? `[${ad.startDate || ''}] "${text}"` : '';
    }).filter(Boolean);
    return { count: items.length, sampleAds };
  } catch { return { count: 0, sampleAds: [] }; }
}

export async function POST(req: Request) {
  const now = new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
  try {
    const { websiteUrl } = await req.json();
    if (!websiteUrl?.trim()) return NextResponse.json({ error: "Thieu URL" }, { status: 400 });

    const SERPAPI_KEY = process.env.SERPAPI_KEY || "";
    if (!SERPAPI_KEY) return NextResponse.json({ error: "SERPAPI_KEY chua cau hinh" }, { status: 500 });

    const brandName = websiteUrl.replace(/^https?:\/\/(www\.)?/, '').replace(/\/.*$/, '').trim();
    const companyInfo = await (prisma as any).companyInfo.findFirst();
    const myBrand = companyInfo?.shortName || companyInfo?.name || "Cong ty chung toi";

    const [newsData, adsData, websiteContent, priceData] = await Promise.all([
      fetchNewsContext(brandName, SERPAPI_KEY),
      fetchMetaAds(brandName),
      scrapeWebsite(brandName),
      scrapeProductPrices(brandName, SERPAPI_KEY),
    ]);

    const { newsSnippets, kgSummary, relatedSearches, totalResults, newsList } = newsData;
    const { count: adsCount, sampleAds } = adsData;

    const contextBlock = [
      `=== QUET LUC: ${now} ===`,
      kgSummary,
      priceData || '',
      newsSnippets.length > 0
        ? `TIN TUC MOI NHAT (30 ngay, ${newsSnippets.length} bai):\n` + newsSnippets.join('\n')
        : 'Khong tim thay tin tuc trong 30 ngay qua.',
      sampleAds.length > 0
        ? `QUANG CAO META ADS (${adsCount} ads, ${sampleAds.length} mau):\n` + sampleAds.join('\n')
        : '',
      relatedSearches.length > 0 ? `TIM KIEM LIEN QUAN: ${relatedSearches.join(', ')}` : '',
      websiteContent || '',
    ].filter(Boolean).join('\n\n');

    const priceInstruction = priceData
      ? `Ban CO du lieu gia thuc te ben tren. Dung de xac dinh priceIndex: $ = Duoi 5tr | $$ = 5-20tr | $$$ = 20-100tr | $$$$ = Tren 100tr.`
      : `Khong co du lieu gia thuc te. priceIndex = null. KHONG duoc doan mo.`;

    const prompt = `Ban la chuyen gia Tinh bao Canh tranh tai thi truong Viet Nam (${now}).

Phan tich doi thu "${brandName}" so voi "${myBrand}" dua tren DU LIEU THUC TE ben duoi.

NGUYEN TAC BAT BUOC:
1. aiSummary, newsHighlights, actionableAdvice: Chi dua tren du lieu duoc cung cap. Neu thieu du lieu thi dien null.
2. Tap trung hoat dong HIEN TAI (30 ngay qua). Khong dung thong tin cu hon 2024.
3. swot: Cu the, trich dan ten chien dich, so lieu thuc te. Khong viet sao rong.
4. Gia: ${priceInstruction}
5. scores (price,quality,marketing,distribution,innovation 1-10) va sentimentScore (0-100): Hay uoc tinh dua tren KIEN THUC THUC CHAT cua ban ve thuong hieu nay tai thi truong VN. Day la chi so dinh vi, khong phai du lieu thoi gian thuc - nen SE CO gia tri, khong duoc de null.

Tra ve JSON thuan (khong markdown, khong giai thich):
{
  "name": "Ten thuong hieu chinh xac",
  "threat": "Sap vuot | Canh tranh truc tiep | Tiem nang | Yeu",
  "tags": ["tag1", "tag2", "tag3"],
  "aiSummary": "3-4 câu tóm tắt ngắn gọn về đối thủ. Nêu bật định vị và điểm khác biệt cốt lõi. Nếu không có dữ liệu thì null.",
  "address": "Địa chỉ trụ sở chính hoặc văn phòng đại diện (nếu có), nếu không có thì null.",
  "swot": {
    "s": ["Diem manh cu the"],
    "w": ["Diem yeu cu the tu review/tin tuc"],
    "o": ["Co hoi tai VN"],
    "t": ["Thach thuc cu the"]
  },
  "metrics": { "sentimentScore": 65, "priceIndex": null },
  "scores": { "price": 7, "quality": 7, "marketing": 6, "distribution": 7, "innovation": 5 },
  "newsHighlights": ["(Ngay) Tom tat tin cu the co so lieu"],
  "marketingActivity": {
    "channels": [
      { "name": "Facebook", "activity": "Mô tả chi tiết hoạt động (số bài/tuần, loại nội dung, phong cách hình ảnh/video)", "followers": "số lượt theo dõi ước tính" },
      { "name": "YouTube/TikTok/Zalo/...", "activity": "Mô tả chi tiết hoạt động", "followers": "số lượt theo dõi" }
    ],
    "campaigns": ["Tên/mô tả chi tiết các chiến dịch marketing nổi bật, chương trình khuyến mãi trong 30 ngày qua"],
    "contentThemes": ["Chủ đề nội dung chính, thông điệp truyền thông cốt lõi (VD: Cam kết chất lượng, Giá rẻ nhất, Lifestyle sang trọng...)"],
    "postingFrequency": "Ước tính tần suất đăng bài chi tiết",
    "seoPower": "Đánh giá sức mạnh SEO: Cao | Trung bình | Thấp"
  },
  "strategySuggestions": {
    "dos": ["3-4 việc NÊN LÀM để tận dụng điểm yếu của đối thủ hoặc tối ưu hoá lợi thế của mình"],
    "donts": ["2-3 việc KHÔNG NÊN LÀM để tránh đối đầu trực diện lãng phí hoặc mắc bẫy truyền thông của họ"],
    "tacticalAdvice": "Tư vấn tác chiến cụ thể về thông điệp, kênh hoặc thời điểm tiếp cận để bứt phá."
  }
}

=== DU LIEU THUC TE VE ${brandName} ===
${contextBlock}`;

    const parsedData = await generateWithFallback(prompt);

    const newCompetitor = {
      id: `C_${Date.now()}`,
      website: brandName,
      color: brandColor(parsedData.name || brandName),
      status: "Dang theo doi",
      lastScan: now,
      ...parsedData,
      threat: parsedData.threat || "Tiem nang",
      metrics: {
        adsCount,
        socialMentions: totalResults,
        sentimentScore: parsedData.metrics?.sentimentScore ?? null,
        priceIndex: parsedData.metrics?.priceIndex ?? null,
      },
      dataSources: {
        newsArticles: newsList.length,
        newsList: newsList,
        hasKnowledgeGraph: !!kgSummary,
        adsScraped: adsCount > 0,
        websiteScraped: !!websiteContent,
        priceScraped: !!priceData,
        scannedAt: now,
      }
    };

    return NextResponse.json({ success: true, data: newCompetitor });
  } catch (error: any) {
    console.error("[/api/competitors/scan] Error:", error);
    return NextResponse.json({ error: error.message || "Loi khong xac dinh" }, { status: 500 });
  }
}
