import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const incidents = await prisma.productionIncident.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: {
        saleOrder: {
          select: {
            code: true,
            id: true
          }
        }
      }
    });

    return NextResponse.json(incidents);
  } catch (e) {
    console.error("[GET /api/production/dashboard/incidents]", e);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
