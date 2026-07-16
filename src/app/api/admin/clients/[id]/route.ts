import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import fs from "fs/promises";
import path from "path";

async function persistLogo(logoUrl: string | null | undefined): Promise<string | null> {
  if (!logoUrl) return null;
  const match = logoUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return logoUrl.trim() || null;
  const [, mimeType, base64Data] = match;
  const ext = mimeType.split("/")[1]?.replace("jpeg", "jpg") || "png";
  const fileName = `logo_${Date.now()}.${ext}`;
  const uploadsDir = path.join(process.cwd(), "storage", "uploads");
  await fs.mkdir(uploadsDir, { recursive: true });
  await fs.writeFile(path.join(uploadsDir, fileName), Buffer.from(base64Data, "base64"));
  return `/uploads/${fileName}`;
}

// ── PATCH /api/admin/clients/[id] — Cập nhật thông tin khách hàng ──────────────
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session || !["ADMIN", "SUPERADMIN"].includes(session.user?.role as string)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = await req.json();
    const { name, address, phone, email, taxCode, slogan, logoUrl, config } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: "Tên khách hàng không được để trống" }, { status: 400 });
    }

    // Không cho sửa LEETECH
    const target = await prisma.client.findUnique({ where: { id }, select: { shortName: true } });
    if (target?.shortName === "leetech") {
      return NextResponse.json({ error: "Không thể chỉnh sửa cấu hình công ty chủ quản tại đây" }, { status: 403 });
    }

    const savedLogoUrl = await persistLogo(logoUrl);

    const updated = await prisma.client.update({
      where: { id },
      data: {
        name:    name.trim(),
        address: address?.trim() || null,
        phone:   phone?.trim()   || null,
        email:   email?.trim()   || null,
        taxCode: taxCode?.trim() || null,
        slogan:  slogan?.trim()  || null,
        logoUrl: savedLogoUrl,
        config:  config !== undefined ? config : undefined,
      },
    });

    return NextResponse.json({ success: true, client: updated });
  } catch (error) {
    console.error("PATCH client error:", error);
    return NextResponse.json({ error: "Cập nhật thất bại" }, { status: 500 });
  }
}

// ── DELETE /api/admin/clients/[id] — Xoá khách hàng ───────────────────────
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.role !== "SUPERADMIN") {
    return NextResponse.json({ error: "Chỉ SUPERADMIN mới được xoá khách hàng" }, { status: 403 });
  }

  try {
    const { id } = await params;

    // 🔒 Bảo vệ LEETECH — tuyệt đối không cho xoá
    const target = await prisma.client.findUnique({ where: { id }, select: { shortName: true, name: true } });
    if (!target) return NextResponse.json({ error: "Không tìm thấy khách hàng" }, { status: 404 });
    if (target.shortName === "leetech") {
      return NextResponse.json(
        { error: "Không thể xoá LEETECH — đây là công ty chủ quản hệ thống" },
        { status: 403 }
      );
    }

    // Xoá users thuộc client trước
    await prisma.user.deleteMany({ where: { clientId: id } });
    // Xoá client
    await prisma.client.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE client error:", error);
    return NextResponse.json({ error: "Xoá thất bại" }, { status: 500 });
  }
}
