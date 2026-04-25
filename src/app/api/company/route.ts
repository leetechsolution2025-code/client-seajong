import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import fs from "fs/promises";
import path from "path";

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function persistLogo(logoUrl: string | null | undefined): Promise<string | null> {
  if (!logoUrl) return null;
  const match = logoUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return logoUrl.trim() || null;
  const [, mimeType, base64Data] = match;
  const ext = mimeType.split("/")[1]?.replace("jpeg", "jpg") || "png";
  const fileName = `logo_${Date.now()}.${ext}`;
  const uploadsDir = path.join(process.cwd(), "public", "uploads");
  await fs.mkdir(uploadsDir, { recursive: true });
  await fs.writeFile(path.join(uploadsDir, fileName), Buffer.from(base64Data, "base64"));
  return `/uploads/${fileName}`;
}

export async function GET() {
  // Thông tin công ty là public — không cần session để Topbar có thể fetch ngay
  try {
    const company = await prisma.companyInfo.findFirst();
    return NextResponse.json(company ?? {});
  } catch {
    return NextResponse.json({});
  }
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const { name, shortName, slogan, address, phone, email, website, taxCode, legalRep, logoUrl } = body;

    if (!name?.trim())      return NextResponse.json({ error: "Tên công ty không được để trống" }, { status: 400 });
    if (!shortName?.trim()) return NextResponse.json({ error: "Tên viết tắt không được để trống" }, { status: 400 });

    // Lưu logo ra file tĩnh nếu là data URL
    const savedLogoUrl = await persistLogo(logoUrl);

    const existing = await prisma.companyInfo.findFirst();
    const data = {
      name: name.trim(), shortName: shortName.trim(),
      slogan, address, phone, email, website, taxCode, legalRep,
      logoUrl: savedLogoUrl,
    };

    const company = existing
      ? await prisma.companyInfo.update({ where: { id: existing.id }, data })
      : await prisma.companyInfo.create({ data });

    return NextResponse.json(company);
  } catch (e) {
    console.error("[PUT /company]", e);
    return NextResponse.json({ error: "Lỗi máy chủ" }, { status: 500 });
  }
}

