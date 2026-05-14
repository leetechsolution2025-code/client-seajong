import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET /api/company/branches
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || !["ADMIN", "SUPERADMIN"].includes(session.user?.role as string))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const branches = await prisma.branch.findMany({ orderBy: { sortOrder: "asc" } });
  return NextResponse.json(branches);
}

// POST /api/company/branches
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !["ADMIN", "SUPERADMIN"].includes(session.user?.role as string))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const { code, name, shortName, address, phone, email, status } = body;
    if (!code?.trim()) return NextResponse.json({ error: "Mã chi nhánh không được để trống" }, { status: 400 });
    if (!name?.trim()) return NextResponse.json({ error: "Tên chi nhánh không được để trống" }, { status: 400 });

    const maxOrder = await prisma.branch.findFirst({ orderBy: { sortOrder: "desc" }, select: { sortOrder: true } });
    const branch = await prisma.branch.create({
      data: { code: code.trim(), name: name.trim(), shortName: shortName?.trim() || null, address: address?.trim() || null, phone: phone?.trim() || null, email: email?.trim() || null, status: status || "active", sortOrder: (maxOrder?.sortOrder ?? 0) + 1 },
    });
    return NextResponse.json(branch, { status: 201 });
  } catch (e: any) {
    if (e.code === "P2002") return NextResponse.json({ error: "Mã chi nhánh đã tồn tại" }, { status: 409 });
    console.error("[POST /api/company/branches]", e);
    return NextResponse.json({ error: "Lỗi máy chủ" }, { status: 500 });
  }
}
