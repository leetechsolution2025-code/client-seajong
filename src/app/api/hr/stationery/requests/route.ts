import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const requests = await (prisma as any).hrSupplyRequest.findMany({
      where: {
        OR: [
          { type: "PURCHASE" },
          { type: "STATIONERY", status: { in: ["APPROVED", "DELIVERED"] } }
        ]
      },
      include: {
        requester: true,
        department: true,
        items: {
          include: {
            item: true,
          }
        }
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(requests);
  } catch (error: any) {
    console.error("[STATIONERY_REQUESTS_GET] ERROR:", error.message);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return new NextResponse("Unauthorized", { status: 401 });

    const body = await req.json();
    const { requesterId, departmentId, type, items, note, submitForApproval, supplierId, invoiceNo, requiresDirector } = body;

    let finalRequesterId = requesterId;
    let finalDepartmentId = departmentId;

    if (!finalRequesterId || !finalDepartmentId) {
      const emp = await prisma.employee.findFirst({
        where: { userId: session.user.id },
        select: { id: true, departmentCode: true }
      });
      if (emp) {
        if (!finalRequesterId) finalRequesterId = emp.id;
        if (!finalDepartmentId) {
          const dept = await prisma.departmentCategory.findFirst({
            where: { code: emp.departmentCode },
            select: { id: true }
          });
          if (dept) {
            finalDepartmentId = dept.id;
          }
        }
      }
    }

    if (!finalRequesterId || !finalDepartmentId) {
      return new NextResponse("Không tìm thấy thông tin nhân sự của bạn", { status: 400 });
    }

    const isPurchase = type === "PURCHASE";
    const now = new Date();
    const dateStr = now.getFullYear().toString() + (now.getMonth() + 1).toString().padStart(2, '0');

    // Generate Code based on type
    const prefix = isPurchase ? "PUR" : "REQ";
    const count = await (prisma as any).hrSupplyRequest.count({
      where: {
        code: {
          startsWith: `${prefix}-${dateStr}`
        }
      }
    });
    const code = `${prefix}-${dateStr}-${(count + 1).toString().padStart(3, '0')}`;

    // Calculate totalAmount
    const totalAmount = items.reduce((sum: number, item: any) => 
      sum + (Number(item.quantity) || 0) * (Number(item.unitPrice || item.price) || 0), 
      0
    );

    const request = await (prisma as any).hrSupplyRequest.create({
      data: {
        code,
        requesterId: finalRequesterId,
        departmentId: finalDepartmentId,
        type: type || "STATIONERY",
        note,
        status: "PENDING", // PENDING is default
        totalAmount,
        requiresDirector: isPurchase ? Boolean(requiresDirector) : false,
        supplierId: isPurchase ? (supplierId || null) : null,
        invoiceNo: isPurchase ? (invoiceNo || null) : null,
        items: {
          create: items.map((item: any) => ({
            itemId: item.itemId,
            quantity: Number(item.quantity),
            unitPrice: Number(item.unitPrice || item.price || 0),
            totalPrice: (Number(item.quantity) || 0) * (Number(item.unitPrice || item.price) || 0),
          }))
        }
      },
      include: {
        items: {
          include: {
            item: true
          }
        }
      }
    });

    // If it's a purchase request and submitForApproval is true, create Approval Request
    if (isPurchase && submitForApproval) {
      // Find Trưởng phòng kế toán
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

      const targetApprovers = accountingManagers.length > 0 ? accountingManagers : await prisma.employee.findMany({
        where: {
          status: "active",
          position: "vtr-20260401-1964-sbmg"
        },
        select: { userId: true, fullName: true }
      });

      const userId = session.user.id;
      const userName = session.user.name || "HR Manager";

      const itemSummary = request.items.map((i: any) => `${i.item.name} (${i.quantity})`).join(", ");
      const entityTitle = `Đề xuất mua văn phòng phẩm: ${itemSummary.substring(0, 100)}`;

      let supplierName = "";
      if (supplierId) {
        const supplier = await prisma.supplier.findUnique({
          where: { id: supplierId },
          select: { name: true }
        });
        supplierName = supplier?.name || "";
      }

      await prisma.approvalRequest.create({
        data: {
          entityType: "STATIONERY_PURCHASE",
          entityId: request.id,
          entityCode: request.code,
          entityTitle,
          status: "pending",
          priority: "high",
          requestedById: userId,
          requestedByName: userName,
          metadata: JSON.stringify({
            supplierId,
            supplierName,
            invoiceNo,
            totalAmount,
            itemsCount: items.length
          }),
          comments: {
            create: [
              {
                authorId: userId,
                authorName: userName,
                authorRole: "requester",
                content: `📤 **${userName}** đã trình phê duyệt đề xuất mua văn phòng phẩm trị giá **${totalAmount.toLocaleString("vi-VN")} đ** lên Trưởng phòng kế toán.`,
                isSystem: true
              }
            ]
          }
        }
      });

      // Send notifications to Accountant Managers
      for (const manager of targetApprovers) {
        if (!manager.userId) continue;
        
        await prisma.notification.create({
          data: {
            title: "⚡ Trình phê duyệt mua văn phòng phẩm (Kế toán)",
            content: `## ĐỀ XUẤT MUA VĂN PHÒNG PHẨM MỚI\n---\n**${userName}** vừa trình phê duyệt mua văn phòng phẩm trị giá **${totalAmount.toLocaleString("vi-VN")} đ**.\n\nVui lòng xem xét và duyệt yêu cầu tại Trung tâm phê duyệt.`,
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
    }

    return NextResponse.json(request);
  } catch (error: any) {
    console.error("[STATIONERY_REQUESTS_POST] ERROR:", error.message);
    return new NextResponse(error.message || "Internal Error", { status: 500 });
  }
}
