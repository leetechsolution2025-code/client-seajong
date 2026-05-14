import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

// GET: Fetch requests for the current employee
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.employeeId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const requests = await (prisma as any).personalRequest.findMany({
      where: {
        employeeId: session.user.employeeId,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(requests);
  } catch (error) {
    console.error("GET Personal Requests Error:", error);
    return NextResponse.json({ error: "Failed to fetch requests" }, { status: 500 });
  }
}

// POST: Create a new personal request
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.employeeId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { 
      type, 
      reason, 
      startDate, 
      endDate, 
      totalDays, 
      totalHours, 
      details 
    } = body;

    if (!type) {
      return NextResponse.json({ error: "Request type is required" }, { status: 400 });
    }

    const newRequest = await (prisma as any).personalRequest.create({
      data: {
        employeeId: session.user.employeeId,
        type,
        status: "PENDING",
        reason,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        totalDays: totalDays ? parseFloat(totalDays) : null,
        totalHours: totalHours ? parseFloat(totalHours) : null,
        details: typeof details === 'object' ? JSON.stringify(details) : details,
      },
    });

    // Special Logic: If it's a Resignation Request, create a TerminationRequest entry
    const isResignation = type === "hr-request" && (
      (typeof details === 'object' && details.requestType?.includes("nghỉ việc")) ||
      (typeof details === 'string' && details.includes("nghỉ việc"))
    );

    if (isResignation) {
      await (prisma as any).terminationRequest.create({
        data: {
          employeeId: session.user.employeeId,
          type: "RESIGNATION",
          reason: reason,
          requestDate: new Date(),
          lastWorkingDay: startDate ? new Date(startDate) : null,
          status: "Pending",
          step: 1
        }
      });
    }

    // Notify HR/Manager logic
    try {
      const { notifyHRManager } = await import("@/lib/hr-notifications");
      const requesterName = session.user.name || "Một nhân viên";
      
      const typeLabels: Record<string, string> = {
        "leave": "Nghỉ phép",
        "overtime": "Làm thêm giờ",
        "business-trip": "Công tác",
        "hr-request": "Nhân sự & Hồ sơ",
        "finance": "Tài chính",
        "asset": "Tài sản",
      };

      let notificationTitle = `Yêu cầu ${typeLabels[type] || type} mới`;
      let notificationMessage = `**${requesterName}** vừa gửi một yêu cầu **${typeLabels[type] || type}**.`;

      // More specific content for HR requests
      if (type === "hr-request" && details && typeof details === 'object') {
        const subType = (details as any).requestType || "Nhân sự & Hồ sơ";
        notificationTitle = `Yêu cầu ${subType} mới`;
        notificationMessage = `**${requesterName}** vừa gửi một **${subType}**. Vui lòng kiểm tra và phê duyệt.`;
      }

      await notifyHRManager(
        notificationTitle,
        notificationMessage,
        session.user.id
      );
    } catch (e) {
      console.error("Notification Error:", e);
    }

    return NextResponse.json(newRequest);
  } catch (error) {
    console.error("CREATE Personal Request Error:", error);
    return NextResponse.json({ 
      error: "Failed to create request",
      message: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}
