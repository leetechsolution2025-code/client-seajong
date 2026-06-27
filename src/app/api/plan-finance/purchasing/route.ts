import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const PAGE_SIZE = 10;

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = req.nextUrl;
    const page      = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
    const limit     = Math.max(1, parseInt(searchParams.get("limit") ?? "10"));
    const search    = searchParams.get("search")    ?? "";
    const trangThai = searchParams.get("trangThai") ?? "";

    const where = {
      ...(search    && { OR: [{ code: { contains: search } }, { supplier: { name: { contains: search } } }] }),
      ...(trangThai && {
        trangThai: trangThai === "active_orders"
          ? { notIn: ["completed", "cancelled"] }
          : trangThai
      }),
    };

    const [total, items] = await Promise.all([
      prisma.purchaseOrder.count({ where }),
      prisma.purchaseOrder.findMany({
        where, skip: (page - 1) * limit, take: limit,
        orderBy: { createdAt: "desc" },
        include: { supplier: { select: { id: true, name: true, address: true, phone: true, email: true } } },
      }),
    ]);

    return NextResponse.json({ items, total, page, totalPages: Math.max(1, Math.ceil(total / limit)) });
  } catch (e: unknown) {
    console.error("[GET /purchasing]", e);
    return NextResponse.json({ items: [], total: 0, page: 1, totalPages: 1 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { code, supplierId, ngayDat, ngayNhan, trangThai, tongTien, daThanhToan, ghiChu } = body;

    const item = await prisma.purchaseOrder.create({
      data: {
        code, trangThai: trangThai ?? "draft",
        tongTien:    parseFloat(tongTien    ?? 0),
        daThanhToan: parseFloat(daThanhToan ?? 0),
        ghiChu,
        ...(supplierId && { supplierId }),
        ...(ngayDat    && { ngayDat: new Date(ngayDat) }),
        ...(ngayNhan   && { ngayNhan: new Date(ngayNhan) }),
        activities: {
          create: {
            loai: "create",
            ngay: new Date(),
            nguoiThucHien: session.user?.name ?? "Hệ thống",
            ketQua: `Đơn mua hàng ${code || ""} đã được khởi tạo.`,
          }
        }
      },
    });

    // Tự động tạo một yêu cầu duyệt và gửi thông báo cho phòng Tài chính - Kế toán
    try {
      const userId = session.user.id;
      const userName = session.user.name || "Hệ thống";
      
      let supplierName = "";
      if (supplierId) {
        const supplier = await prisma.supplier.findUnique({
          where: { id: supplierId },
          select: { name: true }
        });
        supplierName = supplier?.name || "";
      }
      const supplierNameStr = supplierName || "Chưa xác định";
      const totalAmount = parseFloat(tongTien ?? 0);

      await prisma.approvalRequest.create({
        data: {
          entityType: "purchase_order",
          entityId: item.id,
          entityCode: code,
          entityTitle: `Phê duyệt đơn mua hàng ${code} - Nhà cung cấp: ${supplierNameStr}`,
          status: "pending",
          priority: "high",
          requestedById: userId,
          requestedByName: userName,
          metadata: JSON.stringify({
            supplierId: supplierId || null,
            supplierName: supplierNameStr,
            totalAmount: totalAmount,
          }),
          comments: {
            create: [
              {
                authorId: userId,
                authorName: userName,
                authorRole: "requester",
                content: `📤 **${userName}** đã trình phê duyệt đơn mua hàng **${code}** trị giá **${totalAmount.toLocaleString("vi-VN")} đ** lên Trưởng phòng Tài chính - Kế toán.`,
                isSystem: true
              }
            ]
          }
        }
      });

      // Tìm Trưởng phòng kế toán và gửi thông báo
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
        select: { userId: true, fullName: true }
      });

      for (const manager of accountingManagers) {
        if (!manager.userId) continue;

        await prisma.notification.create({
          data: {
            title: "⚡ Trình phê duyệt đơn mua hàng (Tài chính - Kế toán)",
            content: `## ĐỀ XUẤT PHÊ DUYỆT ĐƠN MUA HÀNG MỚI\n---\n**${userName}** vừa trình phê duyệt đơn mua hàng **${code}** trị giá **${totalAmount.toLocaleString("vi-VN")} đ**.\n\nVui lòng xem xét và duyệt yêu cầu tại Trung tâm phê duyệt.`,
            type: "warning",
            priority: "high",
            audienceType: "individual",
            audienceValue: manager.userId,
            createdById: userId,
            attachments: JSON.stringify([{
               name: "Trung tâm phê duyệt",
               type: "link",
               url: "/board/approvals"
            }]),
            recipients: {
              create: { userId: manager.userId }
            }
          }
        });
      }
    } catch (err) {
      console.error("Failed to create approval request or notify for purchase order:", err);
    }

    return NextResponse.json(item, { status: 201 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
