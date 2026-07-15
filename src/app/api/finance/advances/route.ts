import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

// GET: Fetch all finance requests (advances) for the dashboard
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.employeeId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const requests = await (prisma as any).personalRequest.findMany({
      where: {
        type: "finance",
      },
      include: {
        employee: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const formattedRequests = requests.map((req: any) => {
      let parsedDetails = null;
      try {
        if (req.details) {
          parsedDetails = typeof req.details === 'string' ? JSON.parse(req.details) : req.details;
        }
      } catch (e) {
        console.error("Failed to parse details for request", req.id);
      }

      return {
        id: req.id,
        employeeName: req.employee?.fullName || "Unknown",
        department: "Phòng ban chung", // Can be updated if employee model has department relation
        role: req.employee?.position || "Nhân viên",
        amount: parsedDetails?.amount || 0,
        paidAmount: parsedDetails?.paidAmount || 0, // Mock paidAmount
        reason: req.reason || "Không có lý do",
        status: req.status.toLowerCase(), // e.g., 'pending', 'approved'
        createdAt: req.createdAt,
        expectedDate: req.startDate,
        paymentMethod: parsedDetails?.paymentMethod || "",
        bankInfo: parsedDetails?.bankInfo || "",
      };
    });

    return NextResponse.json(formattedRequests);
  } catch (error) {
    console.error("GET Finance Advances Error:", error);
    return NextResponse.json({ error: "Failed to fetch advances" }, { status: 500 });
  }
}
