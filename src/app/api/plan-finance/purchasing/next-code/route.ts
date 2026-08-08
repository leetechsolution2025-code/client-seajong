import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    const dateStr = `${yyyy}${mm}${dd}`;

    const count = await prisma.purchaseOrder.count({
      where: {
        code: { startsWith: `DH-${dateStr}` }
      }
    });

    const nextCode = `DH-${dateStr}-${String(count + 1).padStart(4, "0")}`;

    return NextResponse.json({ nextCode });
  } catch (e: unknown) {
    console.error("[GET /purchasing/next-code]", e);
    // Fallback if db fails
    const d = new Date();
    const dateStr = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
    return NextResponse.json({ nextCode: `DH-${dateStr}-${String(Math.floor(Math.random() * 10000)).padStart(4, "0")}` });
  }
}
