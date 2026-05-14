import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const requests = await (prisma as any).trainingRequest.findMany({
      include: { 
        plan: true,
        courses: {
          include: {
            participants: true
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });
    return NextResponse.json(requests);
  } catch (error) {
    console.error("GET Training Requests Error:", error);
    return NextResponse.json({ 
      error: "Failed to fetch training requests", 
      message: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    console.log("POST Training Request Body:", body);
    
    const newRequest = await (prisma as any).trainingRequest.create({
      data: {
        topic: String(body.topic || ""),
        target: String(body.target || ""),
        goal: String(body.goal || ""),
        duration: String(body.duration || ""),
        type: body.type || "PERIODIC",
        status: "PENDING",
        priority: body.priority || "NORMAL",
        description: body.description || null,
        requesterId: body.requesterId || null,
      }
    });
    // Gửi thông báo cho TPNS
    try {
      const { notifyHRManager } = await import("@/lib/hr-notifications");
      let requesterName = "Một quản lý";
      if (body.requesterId) {
        const user = await prisma.user.findUnique({ where: { id: body.requesterId } });
        if (user && user.name) requesterName = user.name;
      }
      await notifyHRManager(
        "Yêu cầu đào tạo mới",
        `**${requesterName}** vừa gửi yêu cầu đào tạo với chủ đề **${newRequest.topic}**.`,
        body.requesterId
      );
    } catch (e) {
      console.error("Notify HR Manager Error:", e);
    }
    
    return NextResponse.json(newRequest);
  } catch (error) {
    console.error("Create training request error:", error);
    return NextResponse.json({ 
      error: "Failed to create training request",
      message: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}
