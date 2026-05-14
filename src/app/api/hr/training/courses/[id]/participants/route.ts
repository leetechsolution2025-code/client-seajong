import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const participants = await (prisma as any).trainingParticipant.findMany({
      where: { courseId: params.id },
      orderBy: { createdAt: "asc" }
    });
    return NextResponse.json(participants);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch participants" }, { status: 500 });
  }
}

export async function POST(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const body = await req.json(); // Array of employeeIds
    const { id: courseId } = params;

    if (Array.isArray(body)) {
      // Add multiple participants
      const data = body.map(empId => ({
        courseId,
        employeeId: empId,
        attendance: "PENDING"
      }));

      await (prisma as any).trainingParticipant.createMany({
        data,
        skipDuplicates: true
      });
    } else {
      // Update single participant (attendance or score)
      const { employeeId, attendance, testScore, feedback, rating } = body;
      await (prisma as any).trainingParticipant.upsert({
        where: {
          courseId_employeeId: { courseId, employeeId }
        },
        update: { attendance, testScore, feedback, rating },
        create: { courseId, employeeId, attendance, testScore, feedback, rating }
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Manage participants error:", error);
    return NextResponse.json({ error: "Failed to manage participants" }, { status: 500 });
  }
}
