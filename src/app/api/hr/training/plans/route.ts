import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const plans = await (prisma as any).trainingPlan.findMany({
      include: { 
        request: true,
        course: true
      },
      orderBy: { createdAt: "desc" }
    });
    return NextResponse.json(plans);
  } catch (error) {
    console.error("GET Training Plans Error:", error);
    return NextResponse.json({ error: "Failed to fetch training plans" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // Create plan and update request status to PLANNING
    const [newPlan] = await prisma.$transaction([
      (prisma as any).trainingPlan.create({
        data: {
          requestId: body.requestId,
          startDate: body.startDate ? new Date(body.startDate) : null,
          endDate: body.endDate ? new Date(body.endDate) : null,
          cost: parseFloat(body.cost) || 0,
          location: body.location,
          instructor: body.instructor,
          approvalStatus: "PENDING"
        }
      }),
      (prisma as any).trainingRequest.update({
        where: { id: body.requestId },
        data: { status: "PLANNING" }
      })
    ]);
    
    return NextResponse.json(newPlan);
  } catch (error) {
    console.error("Create training plan error:", error);
    return NextResponse.json({ error: "Failed to create training plan" }, { status: 500 });
  }
}
