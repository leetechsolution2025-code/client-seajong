import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";


export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = req.nextUrl;
    const page       = Math.max(1, parseInt(searchParams.get("page")  ?? "1"));
    const limit      = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "10")));
    const search     = searchParams.get("search")     ?? "";
    const trangThai   = searchParams.get("trangThai")   ?? "";
    const categoryId  = searchParams.get("categoryId")  ?? "";
    const categoryIds = searchParams.get("categoryIds") ?? "";
    const partnerType = searchParams.get("partnerType") ?? ""; // "SUPPLIER" | "CARRIER"

    const categoryIdList = categoryIds ? categoryIds.split(",") : (categoryId ? [categoryId] : []);

    let where: any = {
      ...(search && {
        OR: [
          { name: { contains: search } },
          { contactName: { contains: search } },
          { phone: { contains: search } },
          { code: { contains: search } },
          { address: { contains: search } },
        ]
      }),
      ...(trangThai && { trangThai }),
    };

    if (categoryIdList.length > 0) {
      where.categories = { some: { categoryId: { in: categoryIdList } } };
    }

    const [total, items] = await Promise.all([
      prisma.supplier.count({ where }),
      prisma.supplier.findMany({
        where,
        skip:    (page - 1) * limit,
        take:    limit,
        orderBy: { createdAt: "desc" },
        select: {
          id:          true,
          code:        true,
          name:        true,
          contactName: true,
          xungHo:      true,
          phone:       true,
          email:       true,
          address:     true,
          taxCode:     true,
          website:     true,
          hanMucNo:    true,
          danhGia:     true,
          ghiChu:      true,
          trangThai:   true,
          createdAt:   true,
          categories:  { select: { category: { select: { id: true, name: true } } } },
        },
      }),
    ]);

    return NextResponse.json({ items, total, page, totalPages: Math.max(1, Math.ceil(total / limit)) });
  } catch (e: unknown) {
    console.error("[GET /suppliers]", e);
    return NextResponse.json({ items: [], total: 0, page: 1, totalPages: 1 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { name, taxCode, address, phone, email, website, contactName, xungHo, hanMucNo, categoryIds, trangThai } = body;
    const ghiChu = body.ghiChu || "";
    if (!name?.trim()) return NextResponse.json({ error: "Tên nhà cung cấp không được để trống" }, { status: 400 });

    // Auto-generate code: NCC-YYYYmmdd-STT
    const prefix = "NCC";
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const dateStr = `${yyyy}${mm}${dd}`;

    let generatedCode = body.code?.trim();
    if (!generatedCode) {
      const countToday = await prisma.supplier.count({
        where: {
          code: { startsWith: `${prefix}-${dateStr}` }
        }
      });
      const stt = String(countToday + 1).padStart(3, "0");
      generatedCode = `${prefix}-${dateStr}-${stt}`;
    }

    const item = await prisma.supplier.create({
      data: {
        name: name.trim(),
        code: generatedCode, 
        taxCode, address, phone, email, website, contactName, xungHo, ghiChu,
        hanMucNo: hanMucNo || 0,
        trangThai: trangThai || "active",
        categories: categoryIds ? {
          create: (categoryIds as string[]).map(id => ({ categoryId: id }))
        } : undefined
      }
    });
    return NextResponse.json(item, { status: 201 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
