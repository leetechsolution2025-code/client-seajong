import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const PAGE_SIZE = 20;

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const status  = searchParams.get("status")  ?? "";
  const donVi   = searchParams.get("donVi")   ?? "";
  const search  = searchParams.get("search")  ?? "";
  const createdByFinance = searchParams.get("createdByFinance") === "true";
  const page    = Math.max(1, parseInt(searchParams.get("page") ?? "1"));

  // Tìm tất cả các user ID của nhân viên thuộc phòng tài chính - kế toán
  const financeEmployees = await prisma.employee.findMany({
    where: {
      OR: [
        { departmentCode: "finance" },
        { departmentName: { contains: "Kế toán" } },
        { departmentName: { contains: "Tài chính" } }
      ]
    },
    select: { userId: true }
  });
  const financeUserIds = financeEmployees.map(e => e.userId).filter(Boolean) as string[];

  const where: Record<string, any> = {
    ...(status && { trangThai: status }),
    ...(createdByFinance
      ? { createdById: { in: financeUserIds } }
      : {
          ...(donVi  && { donVi }),
          ...(donVi === "Mua hàng" && {
            createdById: { notIn: financeUserIds }
          }),
        }),
    ...(search && {
      OR: [
        { code:         { contains: search } },
        { nguoiYeuCau:  { contains: search } },
        { donVi:        { contains: search } },
        { lyDo:         { contains: search } },
      ],
    }),
  };

  const [total, items] = await prisma.$transaction([
    prisma.purchaseRequest.count({ where }),
    prisma.purchaseRequest.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        items: { select: { id: true } },  // chỉ đếm số dòng
      },
    }),
  ]);

  return NextResponse.json({
    items: items.map(r => ({
      id:           r.id,
      code:         r.code,
      nguoiYeuCau:  r.nguoiYeuCau,
      donVi:        r.donVi,
      ngayTao:      r.ngayTao,
      ngayCanCo:    r.ngayCanCo,
      lyDo:         r.lyDo,
      trangThai:    r.trangThai,
      soMatHang:    r.items.length,
    })),
    total,
    page,
    totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
  });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { donVi, nguoiYeuCau, ngayCanCo, lyDo, ghiChu, lines } = body;

  // Auto-generate code: YCMH-YYYYmmdd-STT (STT resets to 001 every day)
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const dateStr = `${yyyy}${mm}${dd}`;

  const countToday = await prisma.purchaseRequest.count({
    where: {
      createdAt: {
        gte: new Date(new Date().setHours(0, 0, 0, 0))
      }
    }
  });
  const stt = String(countToday + 1).padStart(3, "0");
  const code = `YCMH-${dateStr}-${stt}`;

  const created = await prisma.purchaseRequest.create({
    data: {
      code,
      donVi,
      nguoiYeuCau,
      ngayCanCo: ngayCanCo ? new Date(ngayCanCo) : null,
      lyDo,
      ghiChu,
      createdById: session.user.id,
      items: {
        create: (lines as Array<{
          inventoryItemId?: string;
          tenHang: string;
          donVi?: string;
          soLuong: number;
          donGiaDK: number;
          ghiChu?: string;
          sortOrder?: number;
        }>).map((l, i) => ({
          inventoryItemId: l.inventoryItemId ?? null,
          tenHang:  l.tenHang,
          donVi:    l.donVi ?? null,
          soLuong:  l.soLuong,
          donGiaDK: l.donGiaDK,
          ghiChu:   l.ghiChu ?? null,
          sortOrder: i,
        })),
      },
    },
  });

  // Gửi thông báo đến Trưởng phòng Tài chính - Kế toán (chỉ khi yêu cầu từ bộ phận "Mua hàng")
  if (donVi === "Mua hàng") {
    try {
      const accountingManagers = await prisma.employee.findMany({
        where: {
          status: "active",
          OR: [
            { departmentCode: "finance" },
            { departmentName: { contains: "Kế toán" } },
            { departmentName: { contains: "Tài chính" } }
          ],
          position: "vtr-20260401-1964-sbmg" // Trưởng phòng
        },
        select: { userId: true }
      });

      const validUserIds = Array.from(
        new Set(accountingManagers.map((m) => m.userId).filter(Boolean))
      ) as string[];

      if (validUserIds.length > 0) {
        const notif = await prisma.notification.create({
          data: {
            title: `Yêu cầu mua hàng mới cần duyệt: ${code}`,
            content: `Nhân viên **${nguoiYeuCau}** thuộc bộ phận **${donVi}** đã gửi một yêu cầu mua hàng mới: **${code}** (Lý do: ${lyDo || "Không có"}). Vui lòng xem xét và phê duyệt.`,
            type: "info",
            priority: "high",
            audienceType: validUserIds.length > 1 ? "group" : "individual",
            audienceValue: validUserIds.length > 1 ? JSON.stringify(validUserIds) : validUserIds[0],
            createdById: session.user.id
          }
        });

        await Promise.all(
          validUserIds.map((userId) =>
            prisma.notificationRecipient.create({
              data: {
                notificationId: notif.id,
                userId: userId,
                isRead: false
              }
            })
          )
        );
      }
    } catch (err) {
      console.error("Failed to send purchase request notification to accounting managers:", err);
    }
  }

  return NextResponse.json(created, { status: 201 });
}
