import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
    const id = parseInt(resolvedParams.id);
    if (!id) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

    const p = await prisma.seajongProduct.findUnique({
      where: { id },
      include: { categories: { select: { id: true, name: true } } }
    });

    if (!p) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const mapped = {
      id:          p.id,
      slug:        p.slug,
      url:         p.url,
      name:        p.name,
      excerpt:     p.excerpt,
      description: p.description,
      images:      JSON.parse(p.images || "[]"),
      specs:       JSON.parse(p.specs  || "{}"),
      promotions:  JSON.parse(p.promotions || "[]"),
      policies:    JSON.parse(p.policies || "[]"),
      variations:  JSON.parse(p.variations || "[]"),
      variationData: p.variationData ? JSON.parse(p.variationData) : null,
      priceHtml:   p.priceHtml,
      price:       (p as any).price || 0,
      categories:  p.categories.map(c => c.id),
      categoryNames: p.categories.map(c => c.name),
      updatedAt:   p.updatedAt,
    };

    return NextResponse.json(mapped);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
