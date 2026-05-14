import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    console.log("Session User:", session?.user);

    if (!session?.user?.employeeId) {
      console.error("No employeeId in session");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const employee = await prisma.employee.findUnique({
      where: { id: session.user.employeeId },
      select: { annualLeave: true, fullName: true }
    });

    console.log("Found Employee:", employee);

    if (!employee) {
      return NextResponse.json({ error: "Employee record not found in DB" }, { status: 404 });
    }

    console.log("Prisma keys in API:", Object.keys(prisma).filter(k => !k.startsWith('_')));
    
    if (!(prisma as any).personalRequest) {
      console.error("personalRequest model NOT FOUND in prisma instance!");
    }

    // Calculate used leave
    const personalRequestModel = (prisma as any).personalRequest;
    const approvedLeaveRequests = personalRequestModel ? await personalRequestModel.findMany({
      where: {
        employeeId: session.user.employeeId,
        type: "leave",
        status: "APPROVED"
      },
      select: { totalDays: true }
    }) : [];

    const usedLeave = approvedLeaveRequests.reduce((sum: number, req: any) => sum + (req.totalDays || 0), 0);
    const totalLeave = employee.annualLeave || 12;
    const remainingLeave = totalLeave - usedLeave;

    console.log("Leave Stats:", { totalLeave, usedLeave, remainingLeave });

    return NextResponse.json({
      total: totalLeave,
      used: usedLeave,
      remaining: remainingLeave,
      employeeName: employee.fullName
    });
  } catch (error: any) {
    console.error("GET Leave Balance Error:", error);
    return NextResponse.json({ 
      error: "Server Error", 
      message: error?.message || String(error),
      stack: error?.stack
    }, { status: 500 });
  }
}
