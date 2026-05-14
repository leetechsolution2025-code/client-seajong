import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const courses = await (prisma as any).trainingCourse.findMany({
      include: { 
        request: true,
        plan: true,
        participants: true,
        questions: true
      },
      orderBy: { createdAt: "desc" }
    });
    return NextResponse.json(courses);
  } catch (error) {
    console.error("GET Training Courses Error:", error);
    return NextResponse.json({ error: "Failed to fetch training courses" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // Create course from request/plan
    const newCourse = await (prisma as any).trainingCourse.create({
      data: {
        requestId: body.requestId,
        planId: body.planId,
        status: "PLANNED",
        startDate: body.startDate ? new Date(body.startDate) : null,
        endDate: body.endDate ? new Date(body.endDate) : null,
        materials: "[]"
      }
    });
    
    return NextResponse.json(newCourse);
  } catch (error) {
    console.error("Create training course error:", error);
    return NextResponse.json({ error: "Failed to create training course" }, { status: 500 });
  }
}
