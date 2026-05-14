import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const candidates = await (prisma.candidate.findMany as any)({
      where: {
        status: {
          in: ["Đã tiếp nhận", "Đã gửi thư mời", "Đang thử việc", "Từ chối nhận việc", "Từ chối tiếp nhận", "Đã nhận việc", "Không nhận việc"]
        }
      },
      include: {
        request: {
          select: {
            position: true,
            department: true,
            level: true,
            requesterId: true
          }
        },
        scorecards: {
          select: {
            totalScore: true,
            salarySuggest: true,
            probationSuggest: true
          }
        }
      },
      orderBy: { updatedAt: "desc" }
    });

    return NextResponse.json({ success: true, data: candidates });
  } catch (error: any) {
    console.error("[PROBATION_GET_ERROR]", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
