import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

// GET /api/hr/terminations - Fetch all termination requests
export async function GET() {
  try {
    const requests = await (prisma as any).terminationRequest.findMany({
      include: {
        employee: {
          select: {
            id: true,
            fullName: true,
            code: true,
            avatarUrl: true,
            position: true,
            departmentName: true
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });
    return NextResponse.json(requests);
  } catch (error) {
    console.error("GET Terminations Error:", error);
    return NextResponse.json({ error: "Failed to fetch termination requests" }, { status: 500 });
  }
}

// POST /api/hr/terminations - Create a new request
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const newRequest = await (prisma as any).terminationRequest.create({
      data: {
        employeeId: body.employeeId,
        type: body.type, // "RESIGNATION" or "DISMISSAL"
        reason: body.reason,
        requestDate: body.requestDate ? new Date(body.requestDate) : new Date(),
        status: "Draft",
        step: 1
      }
    });
    return NextResponse.json(newRequest);
  } catch (error) {
    console.error("POST Termination Error:", error);
    return NextResponse.json({ error: "Failed to create termination request" }, { status: 500 });
  }
}
