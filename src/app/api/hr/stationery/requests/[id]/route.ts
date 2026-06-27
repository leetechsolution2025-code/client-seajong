import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const resolvedParams = await params;
    const id = resolvedParams.id;
    const body = await req.json();
    const { action, note, rejectionNote, supplierId, invoiceNo } = body;

    const executorId = session.user.employeeId || "";
    const executorName = session.user.name || "Admin";

    const request = await (prisma as any).hrSupplyRequest.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            item: true,
          },
        },
      },
    });

    if (!request) {
      return NextResponse.json({ error: "Không tìm thấy yêu cầu" }, { status: 404 });
    }

    if (action === "APPROVE") {
      const updated = await (prisma as any).hrSupplyRequest.update({
        where: { id },
        data: {
          status: "APPROVED",
          note: note || request.note,
        },
      });
      return NextResponse.json(updated);
    }

    if (action === "REJECT") {
      const updated = await (prisma as any).hrSupplyRequest.update({
        where: { id },
        data: {
          status: "REJECTED",
          rejectionNote: rejectionNote || "Bị từ chối",
        },
      });
      return NextResponse.json(updated);
    }

    if (action === "DELIVER") {
      // Xác nhận cấp phát (Xuất kho) - Dành cho loại STATIONERY
      if (request.type !== "STATIONERY") {
        return NextResponse.json({ error: "Hành động chỉ áp dụng cho yêu cầu cấp phát" }, { status: 400 });
      }

      if (request.status !== "APPROVED") {
        return NextResponse.json({ error: "Yêu cầu phải được duyệt trước khi cấp phát" }, { status: 400 });
      }

      const result = await prisma.$transaction(async (tx) => {
        // 1. Cập nhật tồn kho từng vật tư (Giảm tồn kho)
        for (const reqItem of request.items) {
          const { itemId, quantity } = reqItem;
          const qty = Number(quantity);

          const supplyItem = await (tx as any).hrSupplyItem.findUnique({ where: { id: itemId } });
          if (!supplyItem || supplyItem.currentStock < qty) {
            throw new Error(`Vật tư "${supplyItem?.name || itemId}" không đủ tồn kho để cấp phát (Còn lại: ${supplyItem?.currentStock || 0}).`);
          }

          await (tx as any).hrSupplyItem.update({
            where: { id: itemId },
            data: {
              currentStock: {
                decrement: qty,
              },
            },
          });

          // 2. Ghi nhận lịch sử xuất kho
          await (tx as any).hrSupplyTransaction.create({
            data: {
              itemId,
              type: "EXPORT",
              quantity: qty,
              price: supplyItem.price,
              note: `Cấp phát theo yêu cầu ${request.code}`,
              executorId: executorId || null,
              executorName,
            },
          });
        }

        // 3. Cập nhật trạng thái yêu cầu thành DELIVERED
        return await (tx as any).hrSupplyRequest.update({
          where: { id },
          data: {
            status: "DELIVERED",
          },
        });
      });

      return NextResponse.json(result);
    }

    if (action === "SUBMIT_TO_DIRECTOR") {
      if (request.type !== "PURCHASE") {
        return NextResponse.json({ error: "Hành động chỉ áp dụng cho yêu cầu mua hàng" }, { status: 400 });
      }
      if (request.status !== "ACCOUNTING_APPROVED") {
        return NextResponse.json({ error: "Đơn mua hàng phải được Kế toán duyệt trước khi trình Giám đốc" }, { status: 400 });
      }

      // Tìm Giám đốc
      const directors = await prisma.employee.findMany({
        where: { 
          status: "active",
          OR: [
            { position: "Giám đốc" },
            { position: "vtr-20260401-8730-eauc" } 
          ]
        },
        select: { userId: true, fullName: true }
      });

      const targetDirectors = directors.filter(d => d.userId);
      const userId = session.user.id;
      const userName = session.user.name || "HR Manager";

      const itemSummary = request.items.map((i: any) => `${i.item.name} (${i.quantity})`).join(", ");
      const entityTitle = `Đề xuất mua văn phòng phẩm (GĐ duyệt): ${itemSummary.substring(0, 100)}`;

      let supplierName = "";
      if (request.supplierId) {
        const supplier = await prisma.supplier.findUnique({
          where: { id: request.supplierId },
          select: { name: true }
        });
        supplierName = supplier?.name || "";
      }

      // Tạo ApprovalRequest cho Giám đốc
      await prisma.approvalRequest.create({
        data: {
          entityType: "STATIONERY_PURCHASE_DIRECTOR",
          entityId: request.id,
          entityCode: request.code,
          entityTitle,
          status: "pending",
          priority: "high",
          requestedById: userId,
          requestedByName: userName,
          metadata: JSON.stringify({
            supplierId: request.supplierId,
            supplierName,
            invoiceNo: request.invoiceNo,
            totalAmount: request.totalAmount,
            itemsCount: request.items.length
          }),
          comments: {
            create: [
              {
                authorId: userId,
                authorName: userName,
                authorRole: "requester",
                content: `📤 **${userName}** đã trình phê duyệt đề xuất mua văn phòng phẩm trị giá **${request.totalAmount.toLocaleString("vi-VN")} đ** lên Giám đốc.`,
                isSystem: true
              }
            ]
          }
        }
      });

      // Cập nhật trạng thái đơn thành WAITING_DIRECTOR
      const updated = await (prisma as any).hrSupplyRequest.update({
        where: { id },
        data: {
          status: "WAITING_DIRECTOR"
        }
      });

      // Gửi thông báo đến Giám đốc
      for (const d of targetDirectors) {
        if (!d.userId) continue;
        await prisma.notification.create({
          data: {
            title: "⚡ Trình phê duyệt mua văn phòng phẩm (Giám đốc)",
            content: `## ĐỀ XUẤT MUA VĂN PHÒNG PHẨM MỚI\n---\n**${userName}** vừa trình phê duyệt mua văn phòng phẩm trị giá **${request.totalAmount.toLocaleString("vi-VN")} đ**.\n\nVui lòng xem xét và duyệt yêu cầu tại Trung tâm phê duyệt.`,
            type: "warning",
            priority: "high",
            audienceType: "individual",
            audienceValue: d.userId,
            createdById: userId,
            attachments: JSON.stringify([{
               name: "Trung tâm phê duyệt",
               type: "link",
               url: "/board/approvals"
            }]),
            recipients: {
              create: { userId: d.userId }
            }
          }
        });
      }

      return NextResponse.json(updated);
    }

    if (action === "START_PURCHASING") {
      if (request.type !== "PURCHASE") {
        return NextResponse.json({ error: "Hành động chỉ áp dụng cho yêu cầu mua hàng" }, { status: 400 });
      }

      const allowedStatuses = ["ACCOUNTING_APPROVED", "APPROVED"];
      if (!allowedStatuses.includes(request.status)) {
        return NextResponse.json({ error: "Đơn mua hàng phải được phê duyệt trước khi bắt đầu mua hàng" }, { status: 400 });
      }

      let supplierName = "Chưa rõ";
      if (request.supplierId) {
        const supplier = await prisma.supplier.findUnique({
          where: { id: request.supplierId },
          select: { name: true }
        });
        supplierName = supplier?.name || "Chưa rõ";
      }

      const result = await prisma.$transaction(async (tx) => {
        // 1. Cập nhật trạng thái yêu cầu thành ORDERING
        const updatedReq = await (tx as any).hrSupplyRequest.update({
          where: { id },
          data: {
            status: "ORDERING"
          }
        });

        // 2. Tự động tạo bản ghi chi phí (Expense) trạng thái approved
        await tx.expense.create({
          data: {
            tenChiPhi: `Chi phí mua văn phòng phẩm theo đơn ${request.code}`,
            loai: "Văn phòng phẩm",
            soTien: request.totalAmount,
            trangThai: "approved",
            ghiChu: `Tự động tạo từ đơn mua hàng ${request.code} - Nhà cung cấp: ${supplierName}`,
            ngayChiTra: new Date(),
            nguoiChiTra: executorName,
          }
        });

        return updatedReq;
      });

      return NextResponse.json(result);
    }

    if (action === "RECEIVE") {
      // Xác nhận nhập kho (Nhập kho mua hàng) - Dành cho loại PURCHASE
      if (request.type !== "PURCHASE") {
        return NextResponse.json({ error: "Hành động chỉ áp dụng cho yêu cầu mua hàng" }, { status: 400 });
      }

      if (request.status !== "ORDERING") {
        return NextResponse.json({ error: "Đơn mua hàng phải ở trạng thái Đang mua hàng mới có thể nhập kho" }, { status: 400 });
      }

      const result = await prisma.$transaction(async (tx) => {
        // 1. Cập nhật tồn kho từng vật tư (Tăng tồn kho)
        for (const reqItem of request.items) {
          const { itemId, quantity, unitPrice } = reqItem;
          const qty = Number(quantity);
          const price = Number(unitPrice || 0);

          await (tx as any).hrSupplyItem.update({
            where: { id: itemId },
            data: {
              currentStock: {
                increment: qty,
              },
              price: price > 0 ? price : undefined,
            },
          });

          // 2. Ghi nhận lịch sử nhập kho
          await (tx as any).hrSupplyTransaction.create({
            data: {
              itemId,
              type: "IMPORT",
              quantity: qty,
              price,
              note: `Nhập kho theo đơn mua ${request.code}`,
              invoiceNo: request.invoiceNo || invoiceNo || null,
              supplierId: request.supplierId || supplierId || null,
              executorId: executorId || null,
              executorName,
            },
          });
        }

        // 3. Cập nhật trạng thái yêu cầu thành DELIVERED
        return await (tx as any).hrSupplyRequest.update({
          where: { id },
          data: {
            status: "DELIVERED",
          },
        });
      });

      return NextResponse.json(result);
    }

    return NextResponse.json({ error: "Hành động không hợp lệ" }, { status: 400 });
  } catch (error: any) {
    console.error("[STATIONERY_REQUESTS_ID_PUT] ERROR:", error.message);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
