import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const { id } = params;
    const body = await req.json();
    
    const updated = await (prisma as any).trainingCourse.update({
      where: { id },
      data: {
        status: body.status,
        startDate: body.startDate ? new Date(body.startDate) : undefined,
        endDate: body.endDate ? new Date(body.endDate) : undefined,
        materials: body.materials ? JSON.stringify(body.materials) : undefined,
      }
    });
    
    return NextResponse.json(updated);
  } catch (error) {
    console.error("Update training course error:", error);
    return NextResponse.json({ error: "Failed to update training course" }, { status: 500 });
  }
}
