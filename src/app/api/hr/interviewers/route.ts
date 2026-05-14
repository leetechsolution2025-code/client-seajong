import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const departmentName = searchParams.get("dept");

    // Lấy danh sách nhân viên:
    // 1. Lãnh đạo cấp trung/cao (level != 'staff')
    // 2. Nhân viên cùng phòng (departmentName)
    const employees = await (prisma as any).employee.findMany({
      where: {
        OR: [
          { level: { not: "staff" } },
          departmentName ? { departmentName } : {}
        ],
        status: "active"
      },
      select: {
        id: true,
        fullName: true,
        position: true,
        level: true,
        departmentName: true,
        userId: true
      },
      orderBy: [
        { level: "desc" },
        { fullName: "asc" }
      ]
    });

    return NextResponse.json(employees);
  } catch (error: any) {
    console.error("[INTERVIEWERS_GET]", error);
    return NextResponse.json({ error: "Lỗi Server" }, { status: 500 });
  }
}
