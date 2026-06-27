import { NextRequest, NextResponse } from "next/server";
import { getServerSession }          from "next-auth";
import { authOptions }               from "@/lib/auth";
import { prisma }                    from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const searchParams = req.nextUrl.searchParams;
    const type = searchParams.get("type"); // "nhap" or "xuat"
    if (type !== "nhap" && type !== "xuat") {
      return NextResponse.json({ error: "Invalid type parameter" }, { status: 400 });
    }

    const prefix = type === "nhap" ? "PNH" : "PXH";
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    const todayPrefix = `${prefix}-${yyyy}${mm}${dd}`;

    // Query existing stock movements starting with today's prefix to determine the next sequence number
    const todayMovements = await prisma.stockMovement.findMany({
      where: {
        soChungTu: {
          startsWith: `${todayPrefix}-`,
        },
      },
      select: {
        soChungTu: true,
      },
    });

    let nextSeq = 1;
    if (todayMovements.length > 0) {
      const seqNums = todayMovements
        .map((m) => {
          if (!m.soChungTu) return 0;
          const parts = m.soChungTu.split("-");
          const seqStr = parts[parts.length - 1];
          const seq = parseInt(seqStr, 10);
          return isNaN(seq) ? 0 : seq;
        })
        .filter((seq) => seq > 0);

      if (seqNums.length > 0) {
        nextSeq = Math.max(...seqNums) + 1;
      } else {
        nextSeq = todayMovements.length + 1;
      }
    }

    const nextCode = `${todayPrefix}-${String(nextSeq).padStart(3, "0")}`;
    return NextResponse.json({ nextCode });
  } catch (e) {
    console.error("[GET /stock-movements/next-code]", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
