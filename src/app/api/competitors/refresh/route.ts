import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/competitors/refresh
 * Tự động re-scan tất cả đối thủ đang theo dõi nếu data đã cũ hơn 3 ngày.
 * Gọi từ cronjob hoặc Vercel Cron (scheduled).
 * 
 * Bảo mật: dùng CRON_SECRET trong header Authorization
 * Header: Authorization: Bearer <CRON_SECRET>
 */
export async function GET(req: Request) {
  // Kiểm tra auth đơn giản
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = req.headers.get('authorization');
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  try {
    const competitors = await (prisma as any).competitor.findMany({
      where: { status: 'Đang theo dõi' },
      select: { id: true, website: true, lastScan: true },
    });

    const now = Date.now();
    const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;

    const toRefresh = competitors.filter((c: any) => {
      if (!c.lastScan) return true;
      // lastScan là string locale VN, thử parse
      const scanTime = new Date(c.lastScan).getTime();
      return isNaN(scanTime) || (now - scanTime) > THREE_DAYS_MS;
    });

    if (toRefresh.length === 0) {
      return NextResponse.json({ message: 'Tất cả dữ liệu đều còn mới, không cần re-scan.', refreshed: 0 });
    }

    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const results: { id: string; website: string; status: string }[] = [];

    // Chạy tuần tự để không quá tải API
    for (const comp of toRefresh) {
      try {
        const scanRes = await fetch(`${baseUrl}/api/competitors/scan`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ websiteUrl: comp.website }),
        });
        const scanData = await scanRes.json();

        if (scanData.success && scanData.data) {
          const d = scanData.data;
          await (prisma as any).competitor.update({
            where: { id: comp.id },
            data: {
              name: d.name,
              color: d.color,
              threat: d.threat,
              lastScan: d.lastScan,
              aiSummary: d.aiSummary,
              swot: JSON.stringify(d.swot || {}),
              metrics: JSON.stringify(d.metrics || {}),
              scores: JSON.stringify(d.scores || {}),
              newsHighlights: JSON.stringify(d.newsHighlights || []),
              dataSources: JSON.stringify(d.dataSources || {}),
              tags: JSON.stringify(d.tags || []),
            },
          });
          results.push({ id: comp.id, website: comp.website, status: 'refreshed' });
        } else {
          results.push({ id: comp.id, website: comp.website, status: `failed: ${scanData.error}` });
        }
      } catch (err: any) {
        results.push({ id: comp.id, website: comp.website, status: `error: ${err.message}` });
      }

      // Nghỉ 2s giữa mỗi lần scan để tránh rate limit
      await new Promise(r => setTimeout(r, 2000));
    }

    return NextResponse.json({
      message: `Đã re-scan ${results.filter(r => r.status === 'refreshed').length}/${toRefresh.length} đối thủ.`,
      refreshed: results.filter(r => r.status === 'refreshed').length,
      results,
    });

  } catch (error: any) {
    console.error('[GET /api/competitors/refresh]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
