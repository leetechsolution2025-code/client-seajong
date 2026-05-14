import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const PAGE_SIZE = 7;

// GET /api/plan-finance/customers
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = req.nextUrl;
    const page   = Math.max(1, parseInt(searchParams.get("page")  ?? "1"));
    const search = searchParams.get("search") ?? "";
    const nguon  = searchParams.get("nguon")  ?? "";
    const nhom   = searchParams.get("nhom")   ?? "";

    const where = {
      ...(search && { name: { contains: search } }),
      ...(nguon  && { nguon }),
      ...(nhom   && { nhom }),
    };

    const [total, customers] = await Promise.all([
      prisma.customer.count({ where }),
      prisma.customer.findMany({
        where,
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
        orderBy: { createdAt: "desc" },
        include: { nguoiChamSoc: { select: { id: true, fullName: true } } },
      }),
    ]);

    return NextResponse.json({ customers, total, page, totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)) });
  } catch (e) {
    console.error("[GET /customers]", e);
    return NextResponse.json({ customers: [], total: 0, page: 1, totalPages: 1 });
  }
}

// POST /api/plan-finance/customers
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { name, address, nguon, nhom, daiDien, xungHo, chucVu, dienThoai, email, ghiChu, nguoiChamSocId, ngayTao } = body;

    const resolvedName = name?.trim() || daiDien?.trim() || "—";

    const customer = await prisma.customer.create({
      data: {
        name: resolvedName, address, nguon, nhom, daiDien, xungHo, chucVu, dienThoai, email, ghiChu,
        ...(nguoiChamSocId && { nguoiChamSocId }),
        ...(ngayTao && { createdAt: new Date(ngayTao) }),
      },
    });

    return NextResponse.json(customer, { status: 201 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[POST /customers]", msg);
    return NextResponse.json({ error: `Lỗi: ${msg}` }, { status: 500 });
  }
}

