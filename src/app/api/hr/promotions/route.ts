import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
// Force refresh: 2026-05-02T22:07:00

export async function GET() {
  try {
    const data = await (prisma as any).promotionRequest.findMany({
      include: {
        employee: {
          select: {
            fullName: true,
            code: true,
            avatarUrl: true,
            position: true
          }
        },
        requester: {
          select: {
            fullName: true,
            position: true
          }
        },
/*
        interviewer: {
          select: {
            fullName: true
          }
        }
        */
      },
      orderBy: {
        createdAt: "desc"
      }
    });

    // Map to the format expected by the UI
    const mapped = await Promise.all(data.map(async (item: any) => {
      let interviewerName = "";
      if (item.interviewerId) {
        try {
          const intv = await (prisma as any).employee.findUnique({
            where: { id: item.interviewerId },
            select: { fullName: true }
          });
          interviewerName = intv?.fullName || "";
        } catch (e) {}
      }

      return {
        ...item,
        employeeName: item.employee?.fullName,
        employeeId: item.employee?.code,
        avatar: item.employee?.avatarUrl,
        requesterName: item.requester?.fullName || "Hệ thống",
        requesterPos: item.requester?.position || "Quản trị viên",
        interviewerName
      };
    }));

    return NextResponse.json(mapped);
  } catch (error: any) {
    console.error("Error fetching promotions:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({
      where: { email: session.user.email! },
      include: { employee: true }
    });

    const body = await req.json();
    const newItem = await (prisma as any).promotionRequest.create({
      data: {
        employeeId: body.employeeId,
        type: body.type,
        currentDept: body.currentDept,
        currentPos: body.currentPos,
        targetDept: body.targetDept,
        targetPos: body.targetPos,
        reason: body.reason,
        status: "RECEIVING",
        requesterId: user?.employee?.id || null
      }
    });
    // Gửi thông báo cho TPNS
    try {
      const { notifyHRManager } = await import("@/lib/hr-notifications");
      const emp = await prisma.employee.findUnique({
        where: { id: body.employeeId },
        select: { fullName: true }
      });
      
      const typeText = body.type === "PROMOTION" ? "đề bạt" : body.type === "TRANSFER" ? "điều chuyển" : "bãi nhiệm";
      const requesterName = user?.name || user?.employee?.fullName || "Một quản lý";

      await notifyHRManager(
        `Yêu cầu ${typeText} mới`,
        `**${requesterName}** vừa gửi yêu cầu ${typeText} cho nhân sự **${emp?.fullName || "N/A"}**.`,
        user?.id || ""
      );
    } catch (e) {
      console.error("Notify HR Manager Error:", e);
    }

    return NextResponse.json(newItem);
  } catch (error: any) {
    console.error("Error creating promotion:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
