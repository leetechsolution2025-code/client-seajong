import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") || "1");
  const search = searchParams.get("search") || "";
  const categoryId = searchParams.get("categoryId") || "";
  const perPage = 100; // Matches pageSize in InventoryManagement
  const skip = (page - 1) * perPage;

  import("fs").then(fs => fs.appendFileSync("/tmp/seajong-api-log2.txt", `[API Call] seajong-inventory page=${page} search='${search}' categoryId='${categoryId}'\n`));

  const where: any = {};
  if (categoryId) {
    where.categories = { some: { id: parseInt(categoryId) } };
  }


  const removeAccents = (str: string) => {
    return str ? str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase() : '';
  };

  const [totalCount, products] = await Promise.all([
    prisma.seajongProduct.count({ where }),
    prisma.seajongProduct.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      include: { categories: { select: { id: true, name: true } } },
    }),
  ]);

  let filteredProducts = products;
  let total = totalCount;

  if (search) {
    const searchNormalized = removeAccents(search);
    filteredProducts = products.filter(p => {
      const nameNorm = removeAccents(p.name);
      const slugNorm = removeAccents(p.slug);
      return nameNorm.includes(searchNormalized) || slugNorm.includes(searchNormalized);
    });
    total = filteredProducts.length;
  }

  const paginated = filteredProducts.slice(skip, skip + perPage);

  const items = paginated.map(p => {

    let images = [];
    try {
      images = JSON.parse(p.images || "[]");
    } catch (e) {}

    return {
      id: p.id.toString(),
      code: p.slug,
      name: p.name,
      tenHang: p.name,
      donVi: "Cái",
      soLuong: 0, 
      giaNhap: (p as any).price || 0,
      category: { name: p.categories.map(c => c.name).join(", ") },
      brand: "Seajong",
      imageUrl: images[0] || null,
      trangThai: "Còn hàng",
      source: "seajong"
    };
  });

  return NextResponse.json({
    items,
    totalPages: Math.ceil(total / perPage)
  });
}
