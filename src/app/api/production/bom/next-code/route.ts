import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = req.nextUrl;
    const originalCode = searchParams.get("originalCode");
    
    if (!originalCode) {
      return NextResponse.json({ error: "Missing originalCode" }, { status: 400 });
    }

    let baseCode = originalCode;
    // Nếu originalCode đã có hậu tố -01, -02... thì cắt đi để lấy mã gốc
    if (/-\d{2}$/.test(baseCode)) {
      baseCode = baseCode.replace(/-\d{2}$/, '');
    }

    const existingBoms = await prisma.dinhMuc.findMany({
      where: { code: { startsWith: `${baseCode}-` } },
      select: { code: true }
    });

    const existingNumbers: number[] = [];
    for (const b of existingBoms) {
      if (!b.code) continue;
      // Chỉ lấy phần sau baseCode để tránh lỗi nếu baseCode chứa nhiều dấu '-'
      const suffix = b.code.replace(`${baseCode}-`, '');
      const num = parseInt(suffix, 10);
      if (!isNaN(num) && num > 0) {
        existingNumbers.push(num);
      }
    }

    // Find the first missing positive number
    existingNumbers.sort((a, b) => a - b);
    let nextNum = 1;
    for (const num of existingNumbers) {
      if (num === nextNum) {
        nextNum++;
      } else if (num > nextNum) {
        break;
      }
    }

    const nextCode = `${baseCode}-${String(nextNum).padStart(2, '0')}`;
    
    return NextResponse.json({ nextCode });
  } catch (e: any) {
    console.error("[GET /api/production/bom/next-code]", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
