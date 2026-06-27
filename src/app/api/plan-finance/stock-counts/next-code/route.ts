import { NextRequest, NextResponse } from "next/server";
import { getServerSession }          from "next-auth";
import { authOptions }               from "@/lib/auth";
import { prisma }                    from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    const prefix = `KK-${yyyy}${mm}${dd}`;

    // Query existing stock counts starting with today's prefix to determine the next sequence number
    const todayCounts = await prisma.stockCount.findMany({
      where: {
        soChungTu: {
          startsWith: `${prefix}-`,
        },
      },
      select: {
        soChungTu: true,
      },
    });

    let nextSeq = 1;
    if (todayCounts.length > 0) {
      const seqNums = todayCounts
        .map((c) => {
          if (!c.soChungTu) return 0;
          const parts = c.soChungTu.split("-");
          const seqStr = parts[parts.length - 1];
          const seq = parseInt(seqStr, 10);
          return isNaN(seq) ? 0 : seq;
        })
        .filter((seq) => seq > 0);

      if (seqNums.length > 0) {
        nextSeq = Math.max(...seqNums) + 1;
      } else {
        nextSeq = todayCounts.length + 1;
      }
    }

    const nextCode = `${prefix}-${String(nextSeq).padStart(3, "0")}`;
    return NextResponse.json({ nextCode });
  } catch (e) {
    console.error("[GET /stock-counts/next-code]", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
