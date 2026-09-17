import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const company = await prisma.companyInfo.findFirst({
      select: {
        maintenanceActive: true,
        maintenanceAt: true,
        maintenanceUntil: true,
        maintenanceReason: true,
      },
    });

    return NextResponse.json({
      maintenanceActive: company?.maintenanceActive ?? false,
      maintenanceAt: company?.maintenanceAt ? company.maintenanceAt.toISOString() : null,
      maintenanceUntil: company?.maintenanceUntil ? company.maintenanceUntil.toISOString() : null,
      maintenanceReason: company?.maintenanceReason ?? "",
      serverTime: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[GET /api/company/maintenance]", error);
    return NextResponse.json(
      {
        maintenanceActive: false,
        maintenanceAt: null,
        maintenanceUntil: null,
        maintenanceReason: "",
        serverTime: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user?.role !== "ADMIN" && session.user?.role !== "SUPERADMIN")) {
    return NextResponse.json({ error: "Unauthorized: Chỉ Quản trị viên mới có quyền thiết lập bảo trì." }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { active, maintenanceAt, maintenanceUntil, maintenanceReason } = body;

    const existing = await prisma.companyInfo.findFirst();
    if (!existing) {
      return NextResponse.json({ error: "Không tìm thấy thông tin công ty." }, { status: 404 });
    }

    if (active) {
      if (!maintenanceAt) {
        return NextResponse.json({ error: "Thời điểm bắt đầu (Từ thời điểm) là bắt buộc." }, { status: 400 });
      }

      const parsedStart = new Date(maintenanceAt);
      if (isNaN(parsedStart.getTime())) {
        return NextResponse.json({ error: "Thời điểm bắt đầu không hợp lệ." }, { status: 400 });
      }

      let parsedUntil: Date | null = null;
      if (maintenanceUntil) {
        const u = new Date(maintenanceUntil);
        if (!isNaN(u.getTime())) {
          parsedUntil = u;
        }
      }

      const updated = await prisma.companyInfo.update({
        where: { id: existing.id },
        data: {
          maintenanceActive: true,
          maintenanceAt: parsedStart,
          maintenanceUntil: parsedUntil,
          maintenanceReason: maintenanceReason ? String(maintenanceReason).trim() : null,
        },
      });

      return NextResponse.json({
        success: true,
        maintenanceActive: updated.maintenanceActive,
        maintenanceAt: updated.maintenanceAt?.toISOString() ?? null,
        maintenanceUntil: updated.maintenanceUntil?.toISOString() ?? null,
        maintenanceReason: updated.maintenanceReason ?? "",
        serverTime: new Date().toISOString(),
      });
    } else {
      // Tắt dừng hoạt động
      const updated = await prisma.companyInfo.update({
        where: { id: existing.id },
        data: {
          maintenanceActive: false,
          maintenanceAt: null,
          maintenanceUntil: null,
          maintenanceReason: null,
        },
      });

      return NextResponse.json({
        success: true,
        maintenanceActive: false,
        maintenanceAt: null,
        maintenanceUntil: null,
        maintenanceReason: "",
        serverTime: new Date().toISOString(),
      });
    }
  } catch (error) {
    console.error("[POST /api/company/maintenance]", error);
    return NextResponse.json({ error: "Lỗi máy chủ khi cập nhật trạng thái bảo trì." }, { status: 500 });
  }
}
