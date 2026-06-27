import { NextRequest, NextResponse } from "next/server";
import { getServerSession }          from "next-auth";
import { authOptions }               from "@/lib/auth";
import { prisma }                    from "@/lib/prisma";

// GET /api/plan-finance/purchasing/[id]  — trả về PO kèm items + supplier
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;

    const po = await prisma.purchaseOrder.findUnique({
      where: { id },
      include: {
        supplier: { select: { id: true, name: true, address: true, phone: true, email: true } },
        items: {
          include: {
            inventoryItem: { select: { id: true, code: true, tenHang: true, donVi: true, giaNhap: true } },
          },
          orderBy: { sortOrder: "asc" },
        },
      },
    });

    if (!po) return NextResponse.json({ error: "Không tìm thấy PO" }, { status: 404 });
    return NextResponse.json(po);
  } catch (e) {
    console.error("[GET /purchasing/[id]]", e);
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 });
  }
}

// PATCH /api/plan-finance/purchasing/[id]  — cập nhật trạng thái hoặc ghi chú của PO
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const body = await req.json();
    const { trangThai, ghiChu } = body;

    // Lấy PO hiện tại để kiểm tra thay đổi trạng thái
    const oldPo = await prisma.purchaseOrder.findUnique({
      where: { id },
      select: { trangThai: true, code: true }
    });
    if (!oldPo) return NextResponse.json({ error: "Không tìm thấy PO" }, { status: 404 });

    const updateData: any = {};
    if (trangThai !== undefined) updateData.trangThai = trangThai;
    if (ghiChu !== undefined) updateData.ghiChu = ghiChu;

    // Cập nhật PO kèm theo tạo hoạt động nếu trạng thái thay đổi
    const po = await prisma.$transaction(async (tx) => {
      const updated = await tx.purchaseOrder.update({
        where: { id },
        data: updateData,
        include: {
          supplier: { select: { id: true, name: true, address: true, phone: true, email: true } },
          items: {
            include: {
              inventoryItem: { select: { id: true, code: true, tenHang: true, donVi: true, giaNhap: true } }
            },
            orderBy: { sortOrder: "asc" }
          }
        }
      });

      // Nếu trạng thái thay đổi, tự động thêm một log hệ thống
      if (trangThai !== undefined && trangThai !== oldPo.trangThai) {
        const statusLabels: Record<string, string> = {
          "draft": "Đang tạo đơn",
          "ordered": "Đã đặt hàng",
          "received": "Đã nhận hàng",
          "disputed": "Đang khiếu nại",
          "completed": "Hoàn thành",
          "paused": "Tạm dừng",
          "cancelled": "Huỷ bỏ",
        };
        const oldLabel = statusLabels[oldPo.trangThai] ?? oldPo.trangThai;
        const newLabel = statusLabels[trangThai] ?? trangThai;
        
        await (tx as any).purchaseOrderActivity.create({
          data: {
            purchaseOrderId: id,
            loai: "system",
            ngay: new Date(),
            nguoiThucHien: session.user?.name ?? "Hệ thống",
            ketQua: `Trạng thái đơn hàng thay đổi từ [${oldLabel}] sang [${newLabel}].`,
          }
        });
      }

      return updated;
    });

    // Gửi thông báo khi đơn hàng được chuyển sang trạng thái Đặt hàng (ordered)
    if (trangThai === "ordered" && oldPo.trangThai !== "ordered") {
      try {
        const poCode = po.code ?? id;
        const supplierName = po.supplier?.name ?? "Nhà cung cấp";
        const ngayNhanStr = po.ngayNhan ? new Date(po.ngayNhan).toLocaleDateString("vi-VN") : "Chưa xác định";

        // 1. Gửi thông báo cho thủ kho (các user thuộc phòng ban logistics)
        const logisticsEmployees = await prisma.employee.findMany({
          where: { departmentCode: "logistics" },
          select: { userId: true }
        });
        const logisticsUserIds = logisticsEmployees.map(e => e.userId).filter(Boolean) as string[];

        const logisNotifTitle = `Đơn mua hàng ${poCode} đã được đặt hàng`;
        const logisNotifContent = `Đơn mua hàng **${poCode}** đã được đặt hàng thành công từ nhà cung cấp **${supplierName}**.\n` +
          `Ngày giao hàng dự kiến: **${ngayNhanStr}**.\n\n` +
          `Chi tiết các mặt hàng đã đặt:\n` +
          po.items.map((i: any) => `• ${i.tenHang}: ${i.soLuong} ${i.donVi ?? ""}${i.ngayGiao ? ` (Dự kiến giao: ${new Date(i.ngayGiao).toLocaleDateString("vi-VN")})` : ""}`).join("\n");

        const logisNotif = await prisma.notification.create({
          data: {
            title: logisNotifTitle,
            content: logisNotifContent,
            type: "info",
            priority: "normal",
            audienceType: "department",
            audienceValue: "logistics",
            createdById: session.user?.id ?? "system",
          }
        });

        const uniqueLogisIds = [...new Set(logisticsUserIds)];
        if (uniqueLogisIds.length > 0) {
          await Promise.allSettled(
            uniqueLogisIds.map(uid =>
              prisma.notificationRecipient.create({
                data: { notificationId: logisNotif.id, userId: uid }
              })
            )
          );
        }

        // 2. Gửi thông báo cho người tạo yêu cầu mua hàng (PR Creators)
        const creatorMap = new Map<string, { prCodes: Set<string>; items: Array<{ tenHang: string; soLuong: number; donVi: string | null }> }>();

        if (po.purchaseRequestId) {
          const pr = await prisma.purchaseRequest.findUnique({
            where: { id: po.purchaseRequestId },
            select: { id: true, code: true, createdById: true }
          });
          if (pr?.createdById) {
            creatorMap.set(pr.createdById, {
              prCodes: new Set(pr.code ? [pr.code] : []),
              items: po.items.map((i: any) => ({ tenHang: i.tenHang, soLuong: i.soLuong, donVi: i.donVi }))
            });
          }
        } else {
          // Reconstruct links via matching tenHang on PurchaseRequestItem under the same supplier and marked as da-tao-don
          const matchingPrItems = await prisma.purchaseRequestItem.findMany({
            where: {
              tenHang: { in: po.items.map((i: any) => i.tenHang) },
              supplierId: po.supplierId,
              trangThaiXuLy: "da-tao-don"
            },
            include: {
              purchaseRequest: {
                select: {
                  id: true,
                  code: true,
                  createdById: true
                }
              }
            }
          });

          for (const prItem of matchingPrItems) {
            const creatorId = prItem.purchaseRequest?.createdById;
            if (!creatorId) continue;

            if (!creatorMap.has(creatorId)) {
              creatorMap.set(creatorId, { prCodes: new Set(), items: [] });
            }
            const entry = creatorMap.get(creatorId)!;
            if (prItem.purchaseRequest.code) {
              entry.prCodes.add(prItem.purchaseRequest.code);
            }
            const poItem = po.items.find((i: any) => i.tenHang === prItem.tenHang);
            entry.items.push({
              tenHang: prItem.tenHang,
              soLuong: poItem?.soLuong ?? prItem.soLuong,
              donVi: poItem?.donVi ?? prItem.donVi
            });
          }
        }

        // Gửi thông báo tới từng người tạo yêu cầu mua hàng
        for (const [creatorId, entry] of creatorMap.entries()) {
          const prCodesStr = Array.from(entry.prCodes).join(", ");
          const creatorNotifTitle = `Mặt hàng bạn yêu cầu đã được đặt (Đơn hàng ${poCode})`;
          const creatorNotifContent = `Các mặt hàng bạn yêu cầu trong phiếu **${prCodesStr || "yêu cầu mua hàng"}** đã được đặt hàng thành công trong đơn mua hàng **${poCode}**.\n` +
            `Ngày giao hàng dự kiến: **${ngayNhanStr}**.\n\n` +
            `Chi tiết các mặt hàng:\n` +
            entry.items.map(i => `• ${i.tenHang}: ${i.soLuong} ${i.donVi ?? ""}`).join("\n");

          const creatorNotif = await prisma.notification.create({
            data: {
              title: creatorNotifTitle,
              content: creatorNotifContent,
              type: "success",
              priority: "normal",
              audienceType: "individual",
              audienceValue: creatorId,
              createdById: session.user?.id ?? "system",
            }
          });

          await prisma.notificationRecipient.create({
            data: { notificationId: creatorNotif.id, userId: creatorId }
          });
        }
      } catch (err) {
        console.error("[PATCH /purchasing/[id]] Failed to send ordered notifications:", err);
      }
    }

    return NextResponse.json(po);
  } catch (e) {
    console.error("[PATCH /purchasing/[id]]", e);
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 });
  }
}

// DELETE /api/plan-finance/purchasing/[id]  — xóa PO
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    await prisma.purchaseOrder.delete({
      where: { id }
    });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("[DELETE /purchasing/[id]]", e);
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 });
  }
}

// PUT /api/plan-finance/purchasing/[id] — cập nhật toàn bộ thông tin đơn hàng và mặt hàng
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const body = await req.json();
    const { supplierId, ngayNhan, ghiChu, items } = body as {
      supplierId: string | null;
      ngayNhan: string | null;
      ghiChu: string | null;
      items: Array<{
        id?: string;
        inventoryItemId: string | null;
        tenHang: string;
        donVi: string | null;
        soLuong: number;
        donGia: number;
        ghiChu: string | null;
        sortOrder: number;
        ngayGiao?: string | null;
      }>;
    };

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "Đơn hàng phải có ít nhất 1 mặt hàng" }, { status: 400 });
    }

    const oldPo = (await prisma.purchaseOrder.findUnique({
      where: { id },
      select: {
        id: true,
        code: true,
        supplierId: true,
        ngayNhan: true,
        ghiChu: true,
        tongTien: true,
        supplier: { select: { id: true, name: true } },
        items: {
          select: {
            id: true,
            tenHang: true,
            soLuong: true,
            donGia: true,
            inventoryItemId: true,
            ngayGiao: true,
          } as any,
          orderBy: { sortOrder: "asc" },
        },
      },
    })) as any;
    if (!oldPo) return NextResponse.json({ error: "Không tìm thấy PO" }, { status: 404 });

    const tongTien = items.reduce((s, i) => s + i.soLuong * i.donGia, 0);

    const changes: string[] = [];

    // 1. So sánh nhà cung cấp
    if (supplierId !== oldPo.supplierId) {
      const oldSupName = oldPo.supplier?.name ?? "Chưa chọn";
      const newSup = supplierId
        ? await prisma.supplier.findUnique({ where: { id: supplierId }, select: { name: true } })
        : null;
      const newSupName = newSup?.name ?? "Chưa chọn";
      changes.push(`Nhà cung cấp: từ "${oldSupName}" thành "${newSupName}"`);
    }

    // 2. So sánh ngày nhận hàng
    const oldNgayNhanStr = oldPo.ngayNhan ? new Date(oldPo.ngayNhan).toISOString().slice(0, 10) : null;
    const newNgayNhanStr = ngayNhan ? new Date(ngayNhan).toISOString().slice(0, 10) : null;
    if (oldNgayNhanStr !== newNgayNhanStr) {
      changes.push(`Ngày nhận hàng: từ "${oldNgayNhanStr ?? "Chưa có"}" thành "${newNgayNhanStr ?? "Chưa có"}"`);
    }

    // 3. So sánh ghi chú
    if (ghiChu !== oldPo.ghiChu) {
      changes.push(`Ghi chú: từ "${oldPo.ghiChu ?? "Trống"}" thành "${ghiChu ?? "Trống"}"`);
    }

    // 4. So sánh danh sách mặt hàng
    const oldItemsMap = new Map<string, any>((oldPo.items as any[]).map((it: any) => [it.tenHang, it]));
    const itemChanges: string[] = [];

    items.forEach(newItem => {
      const oldItem = oldItemsMap.get(newItem.tenHang);
      if (!newItem.soLuong) return;
      if (!oldItem) {
        itemChanges.push(`Thêm "${newItem.tenHang}" (SL: ${newItem.soLuong}, Đơn giá: ${newItem.donGia.toLocaleString("vi-VN")} ₫${newItem.ngayGiao ? `, Ngày giao: ${newItem.ngayGiao.slice(0, 10)}` : ""})`);
      } else {
        const subChanges: string[] = [];
        if (oldItem.soLuong !== newItem.soLuong) {
          subChanges.push(`SL từ ${oldItem.soLuong} thành ${newItem.soLuong}`);
        }
        if (oldItem.donGia !== newItem.donGia) {
          subChanges.push(`Đơn giá từ ${oldItem.donGia.toLocaleString("vi-VN")} ₫ thành ${newItem.donGia.toLocaleString("vi-VN")} ₫`);
        }
        const oldItemNgayGiaoStr = oldItem.ngayGiao ? new Date(oldItem.ngayGiao).toISOString().slice(0, 10) : null;
        const newItemNgayGiaoStr = newItem.ngayGiao ? new Date(newItem.ngayGiao).toISOString().slice(0, 10) : null;
        if (oldItemNgayGiaoStr !== newItemNgayGiaoStr) {
          subChanges.push(`Ngày giao từ ${oldItemNgayGiaoStr ?? "Chưa có"} thành ${newItemNgayGiaoStr ?? "Chưa có"}`);
        }
        if (subChanges.length > 0) {
          itemChanges.push(`Thay đổi "${newItem.tenHang}" (${subChanges.join(", ")})`);
        }
        oldItemsMap.delete(newItem.tenHang);
      }
    });

    oldItemsMap.forEach(oldItem => {
      itemChanges.push(`Xoá "${oldItem.tenHang}"`);
    });

    if (itemChanges.length > 0) {
      changes.push(`Mặt hàng: ${itemChanges.join("; ")}`);
    }

    // 5. So sánh tổng tiền
    if (tongTien !== oldPo.tongTien) {
      changes.push(`Tổng tiền: từ ${oldPo.tongTien.toLocaleString("vi-VN")} ₫ thành ${tongTien.toLocaleString("vi-VN")} ₫`);
    }

    if (changes.length === 0) {
      const po = await prisma.purchaseOrder.findUnique({
        where: { id },
        include: {
          supplier: { select: { id: true, name: true, address: true, phone: true, email: true } },
          items: {
            include: {
              inventoryItem: { select: { id: true, code: true, tenHang: true, donVi: true, giaNhap: true } }
            },
            orderBy: { sortOrder: "asc" }
          }
        }
      });
      return NextResponse.json(po);
    }

    const logText = `Cập nhật đơn hàng:\n` + changes.map(c => `• ${c}`).join("\n");

    const updatedPo = await prisma.$transaction(async (tx) => {
      // 1. Xóa các items cũ của PO này
      await tx.purchaseOrderItem.deleteMany({
        where: { purchaseOrderId: id }
      });

      // 2. Tạo các items mới
      const newItems = items.map((item, idx) => ({
        inventoryItemId: item.inventoryItemId,
        tenHang: item.tenHang,
        donVi: item.donVi,
        soLuong: item.soLuong,
        donGia: item.donGia,
        thanhTien: item.soLuong * item.donGia,
        ghiChu: item.ghiChu,
        sortOrder: idx,
        ngayGiao: item.ngayGiao ? new Date(item.ngayGiao) : null,
      }));

      // 3. Cập nhật PurchaseOrder
      const po = await tx.purchaseOrder.update({
        where: { id },
        data: {
          supplierId,
          ngayNhan: ngayNhan ? new Date(ngayNhan) : null,
          ghiChu,
          tongTien,
          items: {
            create: newItems,
          },
        },
        include: {
          supplier: { select: { id: true, name: true, address: true, phone: true, email: true } },
          items: {
            include: {
              inventoryItem: { select: { id: true, code: true, tenHang: true, donVi: true, giaNhap: true } }
            },
            orderBy: { sortOrder: "asc" }
          }
        }
      });

      // 4. Log hoạt động cập nhật hệ thống
      await (tx as any).purchaseOrderActivity.create({
        data: {
          purchaseOrderId: id,
          loai: "update",
          ngay: new Date(),
          nguoiThucHien: session.user?.name ?? "Hệ thống",
          ketQua: logText,
        }
      });

      return po;
    });

    return NextResponse.json(updatedPo);
  } catch (e) {
    console.error("[PUT /purchasing/[id]]", e);
    return NextResponse.json({ error: "Lỗi server: " + (e instanceof Error ? e.message : String(e)) }, { status: 500 });
  }
}

