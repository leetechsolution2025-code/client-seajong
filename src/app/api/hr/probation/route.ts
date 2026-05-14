import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    // @ts-ignore - Bảo vệ trong trường hợp Prisma Client chưa cập nhật kịp type
    const probations = await prisma.employeeProbation.findMany({
      include: {
        employee: true,
        mentor: true,
        events: {
          orderBy: { date: "desc" }
        },
      },
      orderBy: {
        startDate: "desc",
      },
    });

    // Lấy map tên vị trí để hiển thị tên đầy đủ thay vì mã
    const positions = await prisma.category.findMany({
      where: { type: "position" },
      select: { code: true, name: true }
    });
    const positionMap = Object.fromEntries(positions.map(p => [p.code, p.name]));

    const formattedData = probations.map((p: any) => ({
      id: p.id,
      employeeCode: p.employee.code,
      fullName: p.employee.fullName,
      avatar: p.employee.avatarUrl,
      position: positionMap[p.employee.position] || p.employee.position,
      department: p.employee.departmentName,
      startDate: p.startDate.toISOString().split("T")[0],
      endDate: p.endDate.toISOString().split("T")[0],
      mentorName: p.mentor?.name || "Chưa phân công",
      status: p.status,
      progress: p.progress,
      events: p.events || [],
    }));

    return NextResponse.json(formattedData);
  } catch (error) {
    console.error("CRITICAL API ERROR [GET /api/hr/probation]:", error);
    return NextResponse.json({ error: "Internal Server Error", details: String(error) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { employeeId, startDate, endDate, mentorId, status, progress } = body;

    // @ts-ignore
    const newProbation = await prisma.employeeProbation.create({
      data: {
        employeeId,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        mentorId,
        status,
        progress: progress || 0,
      },
    });

    return NextResponse.json(newProbation);
  } catch (error) {
    console.error("CRITICAL API ERROR [POST /api/hr/probation]:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
