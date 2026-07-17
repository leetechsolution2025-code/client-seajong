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

    const existingBoms = await prisma.dinhMuc.findMany({
      where: { code: { startsWith: `${originalCode}-` } },
      select: { code: true }
    });

    const existingNumbers: number[] = [];
    for (const b of existingBoms) {
      if (!b.code) continue;
      const parts = b.code.split('-');
      const lastPart = parts[parts.length - 1];
      const num = parseInt(lastPart, 10);
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

    const nextCode = `${originalCode}-${String(nextNum).padStart(2, '0')}`;
    
    return NextResponse.json({ nextCode });
  } catch (e: any) {
    console.error("[GET /api/production/bom/next-code]", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
