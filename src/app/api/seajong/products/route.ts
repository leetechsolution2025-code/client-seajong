import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const page    = Math.max(1, parseInt(searchParams.get("page")     || "1"));
  const perPage = Math.min(parseInt(searchParams.get("per_page")    || "24"), 100);
  const catId   = searchParams.get("category") || "";
  const search  = searchParams.get("search")   || "";

  const skip = (page - 1) * perPage;

  // Build where clause
  const where: any = {};
  if (catId) {
    where.categories = { some: { id: parseInt(catId) } };
  }

  let total = 0;
  let products = [];

  const removeAccents = (str: string) => {
    return str ? str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase() : '';
  };

  if (search) {
    // If search is provided, we fetch all matching the category, and filter in-memory.
    // This is required because SQLite does not support case-insensitive Unicode search or accent-insensitive search.
    const allProducts = await prisma.seajongProduct.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      include: { categories: { select: { id: true, name: true } } },
    });

    const searchNormalized = removeAccents(search);
    const filtered = allProducts.filter(p => {
      const nameNorm = removeAccents(p.name);
      const excerptNorm = removeAccents(p.excerpt);
      return nameNorm.includes(searchNormalized) || excerptNorm.includes(searchNormalized);
    });

    total = filtered.length;
    products = filtered.slice(skip, skip + perPage);
  } else {
    [total, products] = await Promise.all([
      prisma.seajongProduct.count({ where }),
      prisma.seajongProduct.findMany({
        where,
        skip,
        take: perPage,
        orderBy: { updatedAt: "desc" },
        include: { categories: { select: { id: true, name: true } } },
      }),
    ]);
  }

  const mapped = products.map(p => ({
    id:          p.id,
    slug:        p.slug,
    url:         p.url,
    name:        p.name,
    excerpt:     p.excerpt,
    description: p.description,
    images:      JSON.parse(p.images || "[]") as string[],
    specs:       JSON.parse(p.specs  || "{}") as Record<string, string>,
    price:       (p as any).price || 0,
    categories:  p.categories.map(c => c.id),
    categoryNames: p.categories.map(c => c.name),
    updatedAt:   p.updatedAt,
  }));

  return NextResponse.json({
    products: mapped,
    pagination: { page, perPage, total, totalPages: Math.ceil(total / perPage) },
  });
}
