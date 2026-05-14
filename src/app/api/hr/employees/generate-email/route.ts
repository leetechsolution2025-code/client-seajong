import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const fullName = searchParams.get("fullName");

    if (!fullName) {
      return NextResponse.json({ error: "Thiếu tên nhân viên" }, { status: 400 });
    }

    // 1. Tạo slug cơ bản
    const baseSlug = fullName
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .replace(/\u0111/g, "d")
      .replace(/\u0110/g, "D")
      .replace(/[^a-zA-Z0-9]/g, "")
      .toLowerCase();

    const domain = "leetech.vn";
    let email = `${baseSlug}@${domain}`;
    let counter = 1;

    // 2. Kiểm tra trùng lặp trong User table
    let exists = await prisma.user.findUnique({
      where: { email },
      select: { id: true }
    });

    while (exists) {
      counter++;
      email = `${baseSlug}${counter}@${domain}`;
      exists = await prisma.user.findUnique({
        where: { email },
        select: { id: true }
      });
    }

    return NextResponse.json({ success: true, email });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
