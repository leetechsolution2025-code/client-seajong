import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import fs from "fs/promises";
import path from "path";

/**
 * Nếu logoUrl là data URL base64 → lưu file vào public/uploads/ và trả về path tĩnh.
 * Nếu là URL thường hoặc null → giữ nguyên.
 */
async function persistLogo(logoUrl: string | null | undefined): Promise<string | null> {
  if (!logoUrl) return null;
  const match = logoUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return logoUrl.trim() || null; // URL thường, giữ nguyên
  const [, mimeType, base64Data] = match;
  const ext = mimeType.split("/")[1]?.replace("jpeg", "jpg") || "png";
  const fileName = `logo_${Date.now()}.${ext}`;
  const uploadsDir = path.join(process.cwd(), "storage", "uploads");
  await fs.mkdir(uploadsDir, { recursive: true });
  await fs.writeFile(path.join(uploadsDir, fileName), Buffer.from(base64Data, "base64"));
  return `/uploads/${fileName}`;
}


export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, shortName, address, phone, email, taxCode, slogan, logoUrl, branches, industryId } = body;

    if (!name || !shortName) {
      return NextResponse.json({ error: "Thiếu thông tin bắt buộc (tên, short name)" }, { status: 400 });
    }

    // Validate shortName
    const cleanShortName = shortName.toLowerCase().replace(/[^a-z0-9-]/g, "");
    if (!cleanShortName) {
      return NextResponse.json({ error: "Tên viết tắt không hợp lệ" }, { status: 400 });
    }

    // Check duplicate
    const existing = await prisma.client.findUnique({ where: { shortName: cleanShortName } });
    if (existing) {
      return NextResponse.json({ error: `Tên viết tắt "${cleanShortName}" đã tồn tại` }, { status: 400 });
    }

    // Lưu logo ra file tĩnh (nếu là data URL)
    const savedLogoUrl = await persistLogo(logoUrl);

    // Tạo Client
    const client = await prisma.client.create({
      data: {
        name,
        shortName: cleanShortName,
        address:  address?.trim()  || null,
        phone:    phone?.trim()    || null,
        email:    email?.trim()    || null,
        taxCode:  taxCode?.trim()  || null,
        slogan:   slogan?.trim()   || null,
        logoUrl:  savedLogoUrl,
        status: "active",
        industryId: industryId || null,
        modules: {
          connectOrCreate: [
            {
              where:  { name: "Core" },
              create: { name: "Core", description: "Module cốt lõi hệ thống" },
            },
            {
              where:  { name: "HR" },
              create: { name: "HR", description: "Module nhân sự" },
            },
          ],
        },
      },
    });

    // Tạo các chi nhánh (nếu có)
    if (Array.isArray(branches) && branches.length > 0) {
      const branchData = branches
        .filter((b: any) => b.name?.trim())
        .map((b: any, idx: number) => ({
          code:      `${cleanShortName}-branch-${idx + 1}`,
          name:      b.name.trim(),
          address:   b.address?.trim()  || null,
          phone:     b.phone?.trim()    || null,
          status:    "active",
          sortOrder: idx,
          clientId:  client.id,
        }));

      if (branchData.length > 0) {
        await prisma.branch.createMany({ data: branchData });
      }
    }

    // Tạo tài khoản admin mặc định
    const hashedPassword = await bcrypt.hash("Admin@123", 12);
    await prisma.user.create({
      data: {
        email:    `admin@${cleanShortName}.vn`,
        password: hashedPassword,
        name:     `${name} Admin`,
        role:     "ADMIN",
        clientId: client.id,
      },
    });

    return NextResponse.json({ success: true, client });
  } catch (error) {
    console.error("Provisioning error:", error);
    return NextResponse.json({ error: "Lỗi máy chủ nội bộ" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const clients = await prisma.client.findMany({
      where: {
        // Ẩn LEETECH (chủ quản) khỏi danh sách khách hàng
        shortName: { not: "leetech" },
      },
      include: {
        _count: { select: { modules: true, users: true } },
        modules: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(clients);
  } catch (error) {
    console.error("Error fetching clients:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
