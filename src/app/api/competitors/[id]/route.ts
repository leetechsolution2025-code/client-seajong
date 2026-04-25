import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// DELETE /api/competitors/[id]
export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await (prisma as any).competitor.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[DELETE /api/competitors/[id]]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PATCH /api/competitors/[id] → cập nhật sau re-scan
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { name, website, color, threat, status, lastScan, tags, aiSummary, swot, metrics, scores, newsHighlights, dataSources } = body;

    await (prisma as any).competitor.update({
      where: { id },
      data: {
        name,
        website,
        color,
        threat,
        status,
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

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[PATCH /api/competitors/[id]]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
