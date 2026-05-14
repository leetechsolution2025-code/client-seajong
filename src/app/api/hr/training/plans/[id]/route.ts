import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const { id } = params;
    const body = await req.json();
    
    // If approving, also update request status to APPROVED
    if (body.approvalStatus === "APPROVED") {
      const plan = await (prisma as any).trainingPlan.findUnique({ where: { id } });
      if (plan) {
        await prisma.$transaction([
          (prisma as any).trainingPlan.update({
            where: { id },
            data: { 
              approvalStatus: "APPROVED",
              approvalNote: body.approvalNote,
              approvedById: body.approvedById
            }
          }),
          (prisma as any).trainingRequest.update({
            where: { id: plan.requestId },
            data: { status: "APPROVED" }
          })
        ]);
      }
    } else {
      // General update or rejection
      await (prisma as any).trainingPlan.update({
        where: { id },
        data: {
          startDate: body.startDate ? new Date(body.startDate) : undefined,
          endDate: body.endDate ? new Date(body.endDate) : undefined,
          cost: body.cost !== undefined ? parseFloat(body.cost) : undefined,
          location: body.location,
          instructor: body.instructor,
          approvalStatus: body.approvalStatus,
          approvalNote: body.approvalNote
        }
      });
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Update training plan error:", error);
    return NextResponse.json({ error: "Failed to update training plan" }, { status: 500 });
  }
}
