import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const WP_BASE = "https://seajong.com/wp-json/wp/v2";
const PER_PAGE = 100;

// ── Helpers (same as products route) ─────────────────────────────────────────
// Lấy ảnh full-size từ data-large_image (WooCommerce gallery) + fallback từ content
function extractImages(html: string): string[] {
  const seen = new Set<string>();
  const imgs: string[] = [];

  // 1. Ưu tiên: data-large_image (full resolution từ WooCommerce gallery)
  const reLarge = /data-large_image="(https:\/\/seajong\.com\/wp-content\/uploads\/[^"]+?)"/g;
  let m;
  while ((m = reLarge.exec(html)) !== null) {
    if (!seen.has(m[1])) { seen.add(m[1]); imgs.push(m[1]); }
  }

  // 2. Thứ hai: href trong gallery item (link tới ảnh gốc)
  const reHref = /woocommerce-product-gallery__image[\s\S]{0,300}?href="(https:\/\/seajong\.com\/wp-content\/uploads\/[^"]+?)"/g;
  while ((m = reHref.exec(html)) !== null) {
    if (!seen.has(m[1])) { seen.add(m[1]); imgs.push(m[1]); }
  }

  // 3. Fallback: src không có kích thước (full-size) trong content
  if (imgs.length === 0) {
    const reSrc = /src="(https:\/\/seajong\.com\/wp-content\/uploads\/[^"]+?)"/g;
    while ((m = reSrc.exec(html)) !== null) {
      const url = m[1];
      if (!url.match(/-\d+x\d+\.(webp|jpg|png|jpeg)$/) && !seen.has(url)) {
        seen.add(url); imgs.push(url);
      }
    }
  }

  return imgs.slice(0, 20);
}

function extractSpecs(html: string): Record<string, string> {
  const specs: Record<string, string> = {};

  // Seajong dùng: <tr><td><strong>Key</strong></td><td>Value</td></tr>
  const reRow = /<tr[\s\S]*?<\/tr>/gi;
  const rows = html.match(reRow) || [];

  for (const row of rows) {
    // Lấy text của td đầu tiên (có thể có <strong>) làm key
    const keyMatch = row.match(/<td[^>]*>[\s\S]*?<strong[^>]*>([\s\S]*?)<\/strong>/i)
                  || row.match(/<th[^>]*>([\s\S]*?)<\/th>/i);
    // Lấy text của td thứ hai làm value
    const valMatch = row.match(/<td[^>]*>[\s\S]*?<\/td>[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i);

    if (keyMatch && valMatch) {
      const k = keyMatch[1].replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").trim();
      const v = valMatch[1].replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&#8211;/g, "–").trim();
      // Bỏ qua nếu value là URL (link PDF...) hoặc rỗng
      if (k && v && !v.startsWith("http")) specs[k] = v;
    }
  }

  // Fallback: th/td cũ (WooCommerce attributes)
  if (Object.keys(specs).length === 0) {
    const re = /<tr[^>]*>[\s\S]*?<th[^>]*>([\s\S]*?)<\/th>[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>[\s\S]*?<\/tr>/gi;
    let m;
    while ((m = re.exec(html)) !== null) {
      const k = m[1].replace(/<[^>]+>/g, "").trim();
      const v = m[2].replace(/<[^>]+>/g, "").trim();
      if (k && v) specs[k] = v;
    }
  }

  return specs;
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&").replace(/&nbsp;/g, " ")
    .replace(/&#8211;/g, "\u2013").replace(/&#8220;/g, "\u201c").replace(/&#8221;/g, "\u201d")
    .replace(/\s+/g, " ").trim();
}

function extractPrice(html: string): number {
  if (!html) return 0;
  // 1. Loại bỏ các thẻ script để tránh lấy nhầm biến javascript
  const cleanHtml = html.replace(/<script[\s\S]*?<\/script>/gi, "");
  
  // 2. Tìm mẫu giá WooCommerce: <span class="woocommerce-Price-amount amount">...<bdi>58.000.000&nbsp;...
  const rePrice = /<span class="woocommerce-Price-amount amount">[\s\S]*?<bdi>([\s\S]*?)<\/bdi>/i;
  const match = cleanHtml.match(rePrice);
  if (match) {
    // Chỉ lấy phần số và dấu chấm/phẩy ngăn cách, bỏ qua các ký tự đặc biệt hoặc mã HTML đằng sau
    const priceMatch = match[1].replace(/<[^>]+>/g, "").match(/[\d\.,]+/);
    if (priceMatch) {
      const priceStr = priceMatch[0].replace(/[\.,]/g, "");
      return parseInt(priceStr) || 0;
    }
  }
  return 0;
}

// ── GET — trả về trạng thái sync mới nhất ───────────────────────────────────────────────
export async function GET() {
  try {
    let log = await prisma.seajongSyncLog.findFirst({ orderBy: { startedAt: "desc" } });
    
    // Auto-fail stuck jobs
    if (log && log.status === "running") {
      const hours = (new Date().getTime() - log.startedAt.getTime()) / (1000 * 60 * 60);
      if (hours > 1) {
        log = await prisma.seajongSyncLog.update({
          where: { id: log.id },
          data: { status: "error", message: "Quá thời gian đồng bộ (timeout tiến trình).", finishedAt: new Date() }
        });
      }
    }

    const productCount  = await prisma.seajongProduct.count();
    const categoryCount = await prisma.seajongCategory.count();
    return NextResponse.json({ log, productCount, categoryCount });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ log: null, productCount: 0, categoryCount: 0, error: msg });
  }
}

// ── POST — kích hoạt đồng bộ ──────────────────────────────────────────────────
export async function POST() {
  // Tạo log entry
  const log = await prisma.seajongSyncLog.create({
    data: { status: "running", message: "Bắt đầu đồng bộ..." },
  });

  // Chạy async — trả response ngay để client không bị timeout
  syncAll(log.id).catch(console.error);

  return NextResponse.json({ logId: log.id, message: "Đang đồng bộ trong nền..." });
}

async function syncAll(logId: string) {
  let totalSynced = 0;
  let totalImages = 0;
  try {
    // 1. Sync categories
    const catRes = await fetch(`${WP_BASE}/product_cat?per_page=100&orderby=count&order=desc`);
    const cats: Array<{ id: number; name: string; slug: string; count: number; parent: number }> = await catRes.json();

    for (const c of cats.filter(c => c.count > 0)) {
      await prisma.seajongCategory.upsert({
        where: { id: c.id },
        create: { id: c.id, name: c.name, slug: c.slug, count: c.count, parent: c.parent },
        update: { name: c.name, slug: c.slug, count: c.count, parent: c.parent, syncedAt: new Date() },
      });
    }

    // 2. Fetch all product pages
    let page = 1;
    let totalPages = 1;

    do {
      const url = `${WP_BASE}/product?per_page=${PER_PAGE}&page=${page}&_embed=1`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`WP API page ${page}: ${res.status}`);

      totalPages = parseInt(res.headers.get("x-wp-totalpages") || "1");
      const raw: Array<{
        id: number; slug: string; link: string; modified: string;
        title: { rendered: string };
        content: { rendered: string };
        excerpt: { rendered: string };
        product_cat: number[];
        _embedded?: { "wp:featuredmedia"?: Array<{ source_url: string }> };
      }> = await res.json();

      const CHUNK_SIZE = 10;
      for (let i = 0; i < raw.length; i += CHUNK_SIZE) {
        const chunk = raw.slice(i, i + CHUNK_SIZE);
        
        await Promise.all(chunk.map(async (p) => {
          const html     = p.content?.rendered || "";
          const featured = p._embedded?.["wp:featuredmedia"]?.[0]?.source_url;

          // Fetch trang sản phẩm để lấy gallery ảnh + specs
          let pageHtml = "";
          try {
            pageHtml = await fetch(p.link, {
              signal: AbortSignal.timeout(12000),
              headers: {
                "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                "Accept-Language": "vi-VN,vi;q=0.9",
              },
            })
              .then(r => r.ok ? r.text() : "")
              .catch(() => "");
          } catch { /* bỏ qua */ }

          // Ảnh: ưu tiên lấy từ page HTML (có data-large_image gallery), fallback về content
          const images = extractImages(pageHtml || html);
          if (featured && !images.includes(featured)) images.unshift(featured);

          // Specs & Price: từ page HTML nếu có, fallback về content
          let specs: Record<string, string> = {};
          let price = 0;
          if (pageHtml) {
            const pageSpecs = extractSpecs(pageHtml);
            specs = Object.keys(pageSpecs).length > 0 ? pageSpecs : extractSpecs(html);
            price = extractPrice(pageHtml);
          } else {
            specs = extractSpecs(html);
            price = extractPrice(html);
          }

          const productData = {
            slug:        p.slug,
            url:         p.link,
            name:        stripHtml(p.title?.rendered || ""),
            excerpt:     stripHtml(p.excerpt?.rendered || "").substring(0, 500),
            description: stripHtml(html).substring(0, 2000),
            images:      JSON.stringify(images),
            specs:       JSON.stringify(specs),
            price:       price,
            updatedAt:   new Date(p.modified),
            syncedAt:    new Date(),
          };

          // Cập nhật sản phẩm vào database
          // Sử dụng findUnique + update/create thay cho upsert để tránh lỗi đối số 'id'
          const existingProduct = await prisma.seajongProduct.findUnique({
            where: { slug: p.slug }
          });

          if (existingProduct) {
            await prisma.seajongProduct.update({
              where: { id: existingProduct.id },
              data: productData,
            });
          } else {
            await (prisma.seajongProduct as any).create({
              data: { 
                id: p.id,
                ...productData 
              },
            });
          }

          // Cập nhật giá bán vào InventoryItem nếu có webProductId khớp
          if (price > 0) {
            await prisma.inventoryItem.updateMany({
              where: { webProductId: p.id },
              data: { giaBan: price }
            });
          }

          // Sync category relations (disconnect all then reconnect)
          const validCatIds = p.product_cat.filter(cid => cats.some(c => c.id === cid && c.count > 0));
          await prisma.seajongProduct.update({
            where: { id: p.id },
            data: {
              categories: {
                set: validCatIds.map(id => ({ id })),
              },
            },
          });

          totalSynced++;
          totalImages += images.length;
        }));

        // Cập nhật tiến độ sau mỗi chunk (10 sản phẩm)
        await prisma.seajongSyncLog.update({
          where: { id: logId },
          data: { message: `Đã đồng bộ ${totalSynced} sản phẩm / ${totalImages} ảnh (trang ${page}/${totalPages})...`, totalSynced },
        });
      }

      // Update log progress at end of page
      await prisma.seajongSyncLog.update({
        where: { id: logId },
        data: { message: `Hoàn tất trang ${page}/${totalPages} (${totalSynced} sản phẩm)...`, totalSynced },
      });

      page++;
    } while (page <= totalPages);

    // Done
    await prisma.seajongSyncLog.update({
      where: { id: logId },
      data: { status: "success", message: `Hoàn tất: ${totalSynced} sản phẩm`, totalSynced, finishedAt: new Date() },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    await prisma.seajongSyncLog.update({
      where: { id: logId },
      data: { status: "error", message: msg, totalSynced, finishedAt: new Date() },
    });
  }
}
