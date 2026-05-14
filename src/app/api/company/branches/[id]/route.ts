import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// PUT /api/company/branches/[id]
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session || !["ADMIN", "SUPERADMIN"].includes(session.user?.role as string))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  try {
    const body = await req.json();
    const { name, shortName, address, phone, email, status } = body;
    const branch = await prisma.branch.update({
      where: { id },
      data: { name: name?.trim(), shortName: shortName?.trim() || null, address: address?.trim() || null, phone: phone?.trim() || null, email: email?.trim() || null, status: status || "active" },
    });
    return NextResponse.json(branch);
  } catch (e) {
    console.error("[PUT /api/company/branches/[id]]", e);
    return NextResponse.json({ error: "Lỗi máy chủ" }, { status: 500 });
  }
}

// DELETE /api/company/branches/[id]
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session || !["ADMIN", "SUPERADMIN"].includes(session.user?.role as string))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  try {
    await prisma.branch.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("[DELETE /api/company/branches/[id]]", e);
    return NextResponse.json({ error: "Lỗi máy chủ" }, { status: 500 });
  }
}
