import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function parseGuestInfo(ghiChu: string | null | undefined): { name: string; dienThoai: string; address: string } | null {
  if (!ghiChu) return null;
  const match = ghiChu.match(/\[GuestInfo:(.*?)\]/);
  if (match) {
    try {
      return JSON.parse(match[1]);
    } catch (e) {
      return null;
    }
  }
  return null;
}

function cleanGhiChu(ghiChu: string | null | undefined): string {
  if (!ghiChu) return "";
  return ghiChu.replace(/\[GuestInfo:(.*?)\]\n?/, "").trim();
}

// GET /api/plan-finance/sales/[id] — chi tiết đơn bán hàng kèm items
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;

    const order = await prisma.saleOrder.findUnique({
      where: { id },
      include: {
        customer: { select: { id: true, name: true, dienThoai: true, address: true } },
        saleOrderItems: {
          include: {
            inventoryItem: { select: { imageUrl: true, code: true } }
          }
        },
      },
    });

    if (!order) return NextResponse.json({ error: "Không tìm thấy đơn hàng" }, { status: 404 });

    let staffName = "Hệ thống";
    if (order.nguoiPhuTrach) {
      const emp = await prisma.employee.findUnique({
        where: { id: order.nguoiPhuTrach },
        select: { fullName: true }
      });
      if (emp) {
        staffName = emp.fullName;
      } else {
        const usr = await prisma.user.findUnique({
          where: { id: order.nguoiPhuTrach },
          select: { name: true }
        });
        if (usr?.name) {
          staffName = usr.name;
        } else {
          staffName = "Chưa rõ";
        }
      }
    }

    // Query related PurchaseRequest
    const pr = await prisma.purchaseRequest.findFirst({
      where: {
        lyDo: { contains: order.code || "" }
      },
      select: { code: true }
    });

    // Query related StockMovement (to get the XK- code if storekeeper processed it)
    const sm = await prisma.stockMovement.findFirst({
      where: {
        OR: [
          { soChungTu: { contains: order.code || "" } },
          { lyDo: { contains: order.code || "" } }
        ]
      },
      select: { soChungTu: true }
    });

    // Query related Notification
    const notif = await prisma.notification.findFirst({
      where: {
        title: { contains: `Lệnh xuất kho cho đơn hàng ${order.code}` }
      },
      select: { id: true }
    });

    // Fetch items from the corresponding won quotation
    let orderItems: any[] = [];
    
    if (order.saleOrderItems && order.saleOrderItems.length > 0) {
      orderItems = order.saleOrderItems;
    } else {
      // Fallback to Quotation
      const quotation = await prisma.quotation.findFirst({
        where: order.customerId ? {
          customerId: order.customerId,
          thanhTien: order.tongTien,
          trangThai: "won"
        } : {
          thanhTien: order.tongTien,
          ghiChu: order.ghiChu,
          trangThai: "won"
        },
        include: { items: { orderBy: { sortOrder: "asc" } } },
        orderBy: { createdAt: "desc" }
      });
      if (quotation && quotation.items) {
        orderItems = quotation.items;
      }
    }

    // Fallback: Populate missing inventoryItem details by matching tenHang
    for (const item of orderItems) {
      if (!item.inventoryItem && item.tenHang) {
        const invItem = await prisma.inventoryItem.findFirst({
          where: { tenHang: item.tenHang },
          select: { imageUrl: true, code: true }
        });
        if (invItem) {
          item.inventoryItem = invItem;
        }
      }
    }

    const guest = parseGuestInfo(order.ghiChu);
    const resolvedOrder = {
      ...order,
      ghiChu: cleanGhiChu(order.ghiChu),
      nguoiPhuTrach: staffName,
      purchaseRequestCode: pr?.code || null,
      stockMovementCode: sm?.soChungTu || null,
      hasLệnhXuatKho: !!notif || (order.keToanDuyet === "approved" && order.trangThaiKho === "in_stock"),
      items: orderItems,
      customer: order.customer || (guest ? {
        id: null,
        name: guest.name,
        dienThoai: guest.dienThoai,
        address: guest.address,
      } : null)
    };

    return NextResponse.json(resolvedOrder);
  } catch (e: unknown) {
    console.error("[GET /sales/[id]]", e);
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 });
  }
}

// PATCH /api/plan-finance/sales/[id] — cập nhật thông tin đơn bán hàng
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const body = await req.json();
    const { keToanDuyet, decision, ngayGiao, daThanhToan, trangThai, ghiChu, tongTien, items } = body;

    if (keToanDuyet !== undefined && !["pending", "approved", "rejected"].includes(keToanDuyet)) {
      return NextResponse.json({ error: "Trạng thái duyệt không hợp lệ" }, { status: 400 });
    }

    const order = await prisma.saleOrder.findUnique({
      where: { id },
      include: { customer: true }
    });

    if (!order) {
      return NextResponse.json({ error: "Không tìm thấy đơn hàng" }, { status: 404 });
    }

    const isTransitioningToApproved = keToanDuyet === "approved" && order.keToanDuyet !== "approved";

    const updated = await prisma.$transaction(async (tx) => {
      const orderUpdate = await tx.saleOrder.update({
        where: { id },
        data: {
          ...(keToanDuyet !== undefined && { keToanDuyet }),
          ...(ngayGiao !== undefined && { ngayGiao: ngayGiao ? new Date(ngayGiao) : null }),
          ...(daThanhToan !== undefined && { daThanhToan: parseFloat(String(daThanhToan)) }),
          ...(trangThai !== undefined && { trangThai }),
          ...(ghiChu !== undefined && { ghiChu }),
          ...(tongTien !== undefined && { tongTien: parseFloat(String(tongTien)) }),
        } as any,
      });

      if (Array.isArray(items)) {
        await tx.saleOrderItem.deleteMany({ where: { saleOrderId: id } });
        if (items.length > 0) {
          await tx.saleOrderItem.createMany({
            data: items.map((it: any) => ({
              saleOrderId: id,
              tenHang: it.tenHang ?? "",
              soLuong: parseFloat(String(it.soLuong ?? 1)),
              donGia: parseFloat(String(it.donGia ?? 0)),
              thanhTien: parseFloat(String(it.thanhTien ?? 0)),
            }))
          });
        }
      }

      // Cập nhật Debt liên quan nếu daThanhToan thay đổi và Debt tồn tại
      if (daThanhToan !== undefined) {
        const amt = parseFloat(String(daThanhToan));
        const status = amt >= order.tongTien ? "PAID" : amt === 0 ? "UNPAID" : "PARTIAL";
        if (order.code) {
          await tx.debt.updateMany({
            where: { referenceId: order.code },
            data: { paidAmount: amt, status }
          });
        }
        await tx.debt.updateMany({
          where: { referenceId: order.id },
          data: { paidAmount: amt, status }
        });
      }

      if (isTransitioningToApproved) {
        // Tự động tạo bản ghi Debt khi kế toán duyệt đơn hàng
        const conNo = order.tongTien - order.daThanhToan;
        if (conNo > 0) {
          const doiTuong = order.customer?.name 
            ? `${order.customer.name}${order.customer.dienThoai ? " – " + order.customer.dienThoai : ""}`
            : `Khách hàng lẻ – Đơn ${order.code || order.id}`;
          
          await (tx.debt as any).create({
            data: {
              type: "phai-thu",
              partnerName: doiTuong,
              amount: order.tongTien,
              paidAmount: order.daThanhToan,
              status: order.daThanhToan === 0 ? "UNPAID" : "PARTIAL",
              dueDate: order.ngayGiao ? new Date(order.ngayGiao) : new Date(),
              referenceId: order.code || order.id,
              description: `Công nợ tự động phát sinh từ đơn hàng ${order.code || order.id}`,
            }
          });
        }

        if (order.trangThaiKho === "in_stock") {
          // 1. Gửi lệnh xuất kho cho thủ kho
          const storekeepers = await tx.employee.findMany({
            where: {
              OR: [
                { departmentName: { contains: "Kho" } },
                { departmentCode: { contains: "logistics" } },
                { departmentCode: { contains: "inventory" } },
                { position: { contains: "Thủ kho" } }
              ],
              userId: { not: null }
            },
            select: { userId: true }
          });
          const storekeeperUserIds = storekeepers.map(s => s.userId).filter(Boolean) as string[];

          if (storekeeperUserIds.length > 0) {
            const notif = await tx.notification.create({
              data: {
                title: `📦 Lệnh xuất kho cho đơn hàng ${order.code}`,
                content: `Đơn bán hàng ${order.code} của khách hàng ${order.customer?.name ?? "Khách vãng lai"} đã được phê duyệt và đủ hàng trong kho. Vui lòng tiến hành xuất kho.`,
                type: "info",
                priority: "high",
                audienceType: "group",
                audienceValue: JSON.stringify(storekeeperUserIds),
                createdById: session.user.id ?? "system"
              }
            });
            await Promise.all(
              storekeeperUserIds.map(uid =>
                tx.notificationRecipient.upsert({
                  where: { notificationId_userId: { notificationId: notif.id, userId: uid } },
                  update: {},
                  create: { notificationId: notif.id, userId: uid }
                })
              )
            );
          }

          // 2. Thông báo việc phê duyệt đơn hàng cho người tạo đơn
          if (order.nguoiPhuTrach) {
            const notif = await tx.notification.create({
              data: {
                title: `✅ Đơn hàng ${order.code} đã được phê duyệt`,
                content: `Đơn bán hàng ${order.code} của khách hàng ${order.customer?.name ?? "Khách vãng lai"} đã được kế toán phê duyệt.`,
                type: "success",
                priority: "normal",
                audienceType: "individual",
                audienceValue: order.nguoiPhuTrach,
                createdById: session.user.id ?? "system"
              }
            });
            await tx.notificationRecipient.upsert({
              where: { notificationId_userId: { notificationId: notif.id, userId: order.nguoiPhuTrach } },
              update: {},
              create: { notificationId: notif.id, userId: order.nguoiPhuTrach }
            });
          }
        } else if (order.trangThaiKho === "out_of_stock") {
          // Tính toán các mặt hàng thiếu từ báo giá tương ứng
          const quotation = await tx.quotation.findFirst({
            where: {
              customerId: order.customerId,
              thanhTien: order.tongTien,
              trangThai: "won"
            },
            include: { items: true }
          });

          const insufficientItems: any[] = [];
          if (quotation) {
            for (const item of quotation.items) {
              const invItem = await tx.inventoryItem.findFirst({
                where: { tenHang: item.tenHang }
              });
              const availableStock = invItem ? invItem.soLuong : 0;
              const requiredQty = item.soLuong;
              
              if (availableStock < requiredQty) {
                insufficientItems.push({
                  inventoryItemId: invItem?.id || null,
                  tenHang: item.tenHang,
                  donVi: item.donVi,
                  missingQty: requiredQty - availableStock,
                  donGia: item.donGia
                });
              }
            }
          }

          if (decision === "purchase") {
            // 1. Tạo yêu cầu mua hàng
            if (insufficientItems.length > 0) {
              const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, ""); // YYYYMMDD
              const countRequestsToday = await tx.purchaseRequest.count({
                where: {
                  code: {
                    startsWith: `YC-${todayStr}-`
                  }
                }
              });
              const prSeqStr = String(countRequestsToday + 1).padStart(4, "0");
              const prCode = `YC-${todayStr}-${prSeqStr}`;

              const pr = await tx.purchaseRequest.create({
                data: {
                  code: prCode,
                  nguoiYeuCau: session.user.name ?? "Hệ thống",
                  donVi: "Mua hàng",
                  lyDo: `Bổ sung hàng tồn kho do thiếu hàng cho đơn bán lẻ ${order.code}`,
                  trangThai: "chua-xu-ly",
                  createdById: session.user.id,
                  items: {
                    create: insufficientItems.map((item) => ({
                      inventoryItemId: item.inventoryItemId,
                      tenHang: item.tenHang,
                      donVi: item.donVi,
                      soLuong: item.missingQty,
                      donGiaDK: item.donGia,
                      trangThaiXuLy: "cho-xu-ly"
                    }))
                  }
                }
              });

              // 2. Gửi thông báo cho trưởng bộ phận mua hàng
              const purchaseHead = await tx.employee.findFirst({
                where: {
                  OR: [
                    { departmentName: { contains: "Mua" }, position: { contains: "Trưởng" } },
                    { departmentCode: { contains: "purchase" }, position: { contains: "Trưởng" } },
                    { departmentName: { contains: "Mua" } },
                    { departmentCode: { contains: "purchase" } }
                  ],
                  userId: { not: null }
                },
                select: { userId: true }
              });
              const purchaseHeadUserId = purchaseHead?.userId;
              
              if (purchaseHeadUserId) {
                const notif = await tx.notification.create({
                  data: {
                    title: `Thiếu hàng trong kho cho đơn hàng ${order.code}`,
                    content: `Đơn bán lẻ ${order.code} bị thiếu hàng trong kho. Đã tạo yêu cầu mua hàng ${prCode} cho các mặt hàng: ${insufficientItems.map(i => `${i.tenHang} (thiếu ${i.missingQty} ${i.donVi})`).join(", ")}.`,
                    type: "warning",
                    priority: "high",
                    audienceType: "individual",
                    audienceValue: purchaseHeadUserId,
                    createdById: session.user.id
                  }
                });
                await tx.notificationRecipient.create({
                  data: { notificationId: notif.id, userId: purchaseHeadUserId }
                });
              }

              // 2b. Gửi thông báo cho trưởng phòng tài chính - kế toán để duyệt
              const accountingManagers = await tx.employee.findMany({
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

              const validAcctUserIds = Array.from(
                new Set(accountingManagers.map((m) => m.userId).filter(Boolean))
              ) as string[];

              if (validAcctUserIds.length > 0) {
                const acctNotif = await tx.notification.create({
                  data: {
                    title: `Yêu cầu mua hàng mới cần duyệt: ${prCode}`,
                    content: `Nhân viên **${session.user.name ?? "Hệ thống"}** thuộc bộ phận **Mua hàng** đã gửi một yêu cầu mua hàng mới: **${prCode}** (Lý do: Bổ sung hàng tồn kho do thiếu hàng cho đơn bán lẻ ${order.code}). Vui lòng xem xét và phê duyệt.`,
                    type: "info",
                    priority: "high",
                    audienceType: validAcctUserIds.length > 1 ? "group" : "individual",
                    audienceValue: validAcctUserIds.length > 1 ? JSON.stringify(validAcctUserIds) : validAcctUserIds[0],
                    createdById: session.user.id
                  }
                });

                await Promise.all(
                  validAcctUserIds.map((userId) =>
                    tx.notificationRecipient.create({
                      data: {
                        notificationId: acctNotif.id,
                        userId: userId,
                        isRead: false
                      }
                    })
                  )
                );
              }
            }
          } else if (decision === "production") {
            // 1. Tạo lệnh sản xuất (Task)
            const productionHead = await tx.employee.findFirst({
              where: {
                OR: [
                  { departmentName: { contains: "Sản xuất" }, position: { contains: "Trưởng" } },
                  { departmentCode: { contains: "production" }, position: { contains: "Trưởng" } },
                  { departmentName: { contains: "Sản xuất" } },
                  { departmentCode: { contains: "production" } }
                ],
                userId: { not: null }
              },
              select: { userId: true }
            });
            const productionHeadUserId = productionHead?.userId;
            const assigneeId = productionHeadUserId ?? session.user.id;

            const descItems = insufficientItems.length > 0 
              ? `Các mặt hàng thiếu: ${insufficientItems.map(i => `${i.tenHang} (thiếu ${i.missingQty} ${i.donVi})`).join(", ")}.`
              : "Không có mặt hàng thiếu.";

            const task = await tx.task.create({
              data: {
                title: `Lệnh sản xuất cho đơn hàng ${order.code}`,
                description: `Sản xuất lắp ráp sản phẩm cho đơn bán hàng ${order.code}. ${descItems}`,
                assigneeId: assigneeId,
                creatorId: session.user.id,
                deptCode: "production",
                priority: "high",
                status: "pending"
              }
            });

            // 2. Gửi thông báo cho trưởng bộ phận sản xuất
            if (productionHeadUserId) {
              const notif = await tx.notification.create({
                data: {
                  title: `🏭 Yêu cầu sản xuất lắp ráp cho đơn hàng ${order.code}`,
                  content: `Đơn bán hàng ${order.code} bị thiếu hàng và được chỉ định sản xuất lắp ráp. Đã tạo lệnh sản xuất: "${task.title}".`,
                  type: "warning",
                  priority: "high",
                  audienceType: "individual",
                  audienceValue: productionHeadUserId,
                  createdById: session.user.id
                }
              });
              await tx.notificationRecipient.create({
                data: { notificationId: notif.id, userId: productionHeadUserId }
              });
            }
          }
        }
      }

      return orderUpdate;
    });

    const guest = parseGuestInfo(updated.ghiChu);
    const resolvedUpdated = {
      ...updated,
      ghiChu: cleanGhiChu(updated.ghiChu),
      customer: order.customer || (guest ? {
        id: null,
        name: guest.name,
        dienThoai: guest.dienThoai,
        address: guest.address,
      } : null)
    };

    return NextResponse.json(resolvedUpdated);
  } catch (e: unknown) {
    console.error("[PATCH /sales/[id]]", e);
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// DELETE /api/plan-finance/sales/[id] — xoá đơn bán hàng và công nợ liên quan
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;

    const order = await prisma.saleOrder.findUnique({
      where: { id },
    });

    if (!order) {
      return NextResponse.json({ error: "Không tìm thấy đơn hàng" }, { status: 404 });
    }

    await prisma.$transaction(async (tx) => {
      // Xoá công nợ liên quan nếu có
      if (order.code) {
        await tx.debt.deleteMany({
          where: { referenceId: order.code },
        });
      }
      await tx.debt.deleteMany({
        where: { referenceId: order.id },
      });

      // Xoá đơn hàng
      await tx.saleOrder.delete({
        where: { id },
      });
    });

    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[DELETE /sales/[id]]", e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
