import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");
    const status = searchParams.get("status");
    const dept = searchParams.get("dept");

    // Xây dựng bộ lọc động
    const where: any = {};
    if (type) where.type = type;
    if (status) where.status = status;
    if (dept) where.employee = { departmentCode: dept };

    const requests = await prisma.personalRequest.findMany({
      where,
      include: {
        employee: {
          select: {
            fullName: true,
            code: true,
            avatarUrl: true,
            departmentName: true,
            departmentCode: true,
            userId: true,
            position: true,
          }
        }
      },
      orderBy: {
        createdAt: "desc"
      }
    });

    // Tính toán số liệu thống kê nhanh cho KPI
    const stats = {
      pending: await prisma.personalRequest.count({ where: { status: "PENDING" } }),
      approvedToday: await prisma.personalRequest.count({ 
        where: { 
          status: "APPROVED",
          updatedAt: {
            gte: new Date(new Date().setHours(0,0,0,0)),
            lte: new Date(new Date().setHours(23,59,59,999))
          }
        } 
      }),
      rejected: await prisma.personalRequest.count({ where: { status: "REJECTED" } }),
    };

    // Lấy danh sách phòng ban thực tế từ DB
    const departments = await prisma.departmentCategory.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" }
    });

    return NextResponse.json({ requests, stats, departments });
  } catch (error) {
    console.error("[APPROVALS_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
