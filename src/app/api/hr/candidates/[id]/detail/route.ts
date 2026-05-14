import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const candidate = await (prisma as any).candidate.findUnique({
      where: { id },
      include: {
        request: {
          select: {
            position: true,
            department: true,
            requirements: true
          }
        },
        scorecards: {
          include: {
            interviewer: {
              select: {
                name: true,
                role: true
              }
            }
          },
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!candidate) return NextResponse.json({ error: "Candidate not found" }, { status: 404 });

    return NextResponse.json({ success: true, data: candidate });
  } catch (e: any) {
    console.error("[GET /api/hr/candidates/[id]/detail]", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
