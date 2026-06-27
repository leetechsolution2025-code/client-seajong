import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    // Current time in Vietnam (ICT) +07:00
    const now = new Date();
    const utcTime = now.getTime() + now.getTimezoneOffset() * 60000;
    const ICTTime = new Date(utcTime + 3600000 * 7);

    const yyyy = ICTTime.getFullYear();
    const mm = String(ICTTime.getMonth() + 1).padStart(2, "0");
    const dd = String(ICTTime.getDate()).padStart(2, "0");
    const dateStr = `${yyyy}${mm}${dd}`;
    const { searchParams } = req.nextUrl;
    const type = searchParams.get("type") ?? "retail";
    const prefix = (type === "agency" ? "QUO-" : "BG-") + `${dateStr}-`;

    // Query for the maximum STT of today
    const todayQuotes = await (prisma as any).quotation.findMany({
      where: {
        code: {
          startsWith: prefix
        }
      },
      select: {
        code: true
      }
    });

    let maxSTT = 0;
    for (const q of todayQuotes) {
      if (q.code) {
        const parts = q.code.split("-");
        const sttPart = parts[parts.length - 1];
        const sttVal = parseInt(sttPart, 10);
        if (!isNaN(sttVal) && sttVal > maxSTT) {
          maxSTT = sttVal;
        }
      }
    }

    const nextSTTStr = String(maxSTT + 1).padStart(3, "0");
    const nextCode = `${prefix}${nextSTTStr}`;

    return NextResponse.json({ nextCode });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
