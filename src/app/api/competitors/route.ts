import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/competitors → lấy toàn bộ danh sách
export async function GET() {
  try {
    const rows = await (prisma as any).competitor.findMany({
      orderBy: { createdAt: 'desc' },
    });

    const competitors = rows.map((row: any) => ({
      id: row.id,
      name: row.name,
      website: row.website,
      color: row.color,
      threat: row.threat,
      status: row.status,
      lastScan: row.lastScan,
      tags: JSON.parse(row.tags || '[]'),
      aiSummary: row.aiSummary,
      swot: JSON.parse(row.swot || '{}'),
      metrics: JSON.parse(row.metrics || '{}'),
      scores: JSON.parse(row.scores || '{}'),
      newsHighlights: row.newsHighlights ? JSON.parse(row.newsHighlights) : [],
      dataSources: row.dataSources ? JSON.parse(row.dataSources) : null,
    }));

    return NextResponse.json({ success: true, data: competitors });
  } catch (err: any) {
    console.error('[GET /api/competitors]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST /api/competitors → thêm mới từ dữ liệu đã scan
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, website, color, threat, status, lastScan, tags, aiSummary, swot, metrics, scores, newsHighlights, dataSources } = body;

    const row = await (prisma as any).competitor.create({
      data: {
        name,
        website,
        color,
        threat,
        status: status || 'Đang theo dõi',
        lastScan,
        tags: JSON.stringify(tags || []),
        aiSummary,
        swot: JSON.stringify(swot || {}),
        metrics: JSON.stringify(metrics || {}),
        scores: JSON.stringify(scores || {}),
        newsHighlights: newsHighlights ? JSON.stringify(newsHighlights) : null,
        dataSources: dataSources ? JSON.stringify(dataSources) : null,
      }
    });

    return NextResponse.json({ success: true, id: row.id });
  } catch (err: any) {
    console.error('[POST /api/competitors]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
