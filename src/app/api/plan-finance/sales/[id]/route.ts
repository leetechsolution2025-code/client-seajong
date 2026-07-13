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
    const { keToanDuyet, decision, decisions, ngayGiao, ngayHoanThanhSanXuat, daThanhToan, trangThai, ghiChu, tongTien, items } = body;

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
      let orderUpdate = await tx.saleOrder.update({
        where: { id },
        data: {
          ...(keToanDuyet !== undefined && { keToanDuyet }),
          ...(ngayGiao !== undefined && { ngayGiao: ngayGiao ? new Date(ngayGiao) : null }),
          ...(ngayHoanThanhSanXuat !== undefined && { ngayHoanThanhSanXuat: ngayHoanThanhSanXuat ? new Date(ngayHoanThanhSanXuat) : null }),
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

      // Thông báo khi bộ phận sản xuất hoàn thành (in_production -> approved)
      if (trangThai === "approved" && order.trangThai === "in_production") {
        const storekeepers = await tx.employee.findMany({
          where: {
            OR: [
              { departmentName: { contains: "Kho" } },
              { departmentCode: { contains: "logistics" } },
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
              title: `📦 Hàng lắp ráp đã xong, lệnh xuất kho cho đơn ${order.code}`,
              content: `Bộ phận sản xuất đã hoàn thành lắp ráp cho đơn bán hàng ${order.code}. Vui lòng tiến hành xuất kho.`,
              type: "info",
              priority: "high",
              audienceType: "group",
              audienceValue: JSON.stringify(storekeeperUserIds),
              createdById: session.user.id ?? "system"
            }
          });
          await Promise.all(storekeeperUserIds.map(uid =>
            tx.notificationRecipient.upsert({
              where: { notificationId_userId: { notificationId: notif.id, userId: uid } },
              update: {},
              create: { notificationId: notif.id, userId: uid }
            })
          ));
        }

        // Notify Kinh doanh
        if (order.nguoiPhuTrach) {
          const notifKD = await tx.notification.create({
            data: {
              title: `✅ Sản xuất hoàn tất cho đơn ${order.code}`,
              content: `Bộ phận sản xuất đã hoàn thành đơn hàng ${order.code} và đã gửi yêu cầu xuất kho cho Thủ kho.`,
              type: "success",
              priority: "normal",
              audienceType: "individual",
              audienceValue: order.nguoiPhuTrach,
              createdById: session.user.id ?? "system"
            }
          });
          await tx.notificationRecipient.upsert({
            where: { notificationId_userId: { notificationId: notifKD.id, userId: order.nguoiPhuTrach } },
            update: {},
            create: { notificationId: notifKD.id, userId: order.nguoiPhuTrach }
          });
        }
      }

      // Thông báo khi thủ kho xuất hàng (-> shipped)
      if (trangThai === "shipped" && order.trangThai !== "shipped") {
        if (order.nguoiPhuTrach) {
          const notifKD = await tx.notification.create({
            data: {
              title: `🚚 Đơn hàng ${order.code} đã được xuất kho`,
              content: `Thủ kho đã xuất kho thành công cho đơn hàng ${order.code}. Đơn hàng đang trên đường giao.`,
              type: "success",
              priority: "normal",
              audienceType: "individual",
              audienceValue: order.nguoiPhuTrach,
              createdById: session.user.id ?? "system"
            }
          });
          await tx.notificationRecipient.upsert({
            where: { notificationId_userId: { notificationId: notifKD.id, userId: order.nguoiPhuTrach } },
            update: {},
            create: { notificationId: notifKD.id, userId: order.nguoiPhuTrach }
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

        const isPurchase = decisions?.purchase ?? (decision === "purchase");
        const isProduction = decisions?.production ?? (decision === "production");

        // GỬI LỆNH XUẤT KHO THÀNH PHẨM CHO THỦ KHO (Luôn luôn gửi khi kế toán duyệt)
        const storekeepers = await tx.employee.findMany({
          where: {
            OR: [
              { departmentName: { contains: "Kho" } },
              { departmentCode: { contains: "logistics" } },
              { position: { contains: "Thủ kho" } }
            ],
            userId: { not: null }
          },
          select: { userId: true }
        });
        const storekeeperUserIds = storekeepers.map(s => s.userId).filter(Boolean) as string[];

        if (storekeeperUserIds.length > 0) {
          const notifMsg = order.trangThaiKho === "in_stock" 
            ? `Đơn bán hàng ${order.code} của khách hàng ${order.customer?.name ?? "Khách vãng lai"} đã được phê duyệt và đủ hàng trong kho. Vui lòng tiến hành xuất kho.`
            : `Đơn bán hàng ${order.code} của khách hàng ${order.customer?.name ?? "Khách vãng lai"} đã được phê duyệt. Vui lòng xuất các mặt hàng có sẵn, phần thiếu sẽ được xử lý.`;
            
          const notifStorekeeper = await tx.notification.create({
            data: {
              title: `📦 Lệnh xuất kho cho đơn hàng ${order.code}`,
              content: notifMsg,
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
                where: { notificationId_userId: { notificationId: notifStorekeeper.id, userId: uid } },
                update: {},
                create: { notificationId: notifStorekeeper.id, userId: uid }
              })
            )
          );
        }

        // GỬI THÔNG BÁO CHO KINH DOANH
        if (order.nguoiPhuTrach) {
          const notifKD = await tx.notification.create({
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
            where: { notificationId_userId: { notificationId: notifKD.id, userId: order.nguoiPhuTrach } },
            update: {},
            create: { notificationId: notifKD.id, userId: order.nguoiPhuTrach }
          });
        }

        // Cập nhật trạng thái
        if (order.trangThaiKho === "in_stock") {
          orderUpdate = await tx.saleOrder.update({ where: { id: order.id }, data: { trangThai: "approved" } });
        } else if (order.trangThaiKho === "out_of_stock") {
          // Tính toán các mặt hàng thiếu từ báo giá tương ứng
          const quotation = await tx.quotation.findFirst({
            where: { customerId: order.customerId, thanhTien: order.tongTien, trangThai: "won" },
            include: { items: true }
          });

          const missingHangHoaItems: any[] = [];
          const missingThanhPhamItems: any[] = [];

          if (quotation) {
            for (const item of quotation.items) {
              const invItem = await tx.inventoryItem.findFirst({ where: { tenHang: item.tenHang } });
              const availableStock = invItem ? invItem.soLuong : 0;
              const requiredQty = item.soLuong;
              
              if (availableStock < requiredQty) {
                const missingQty = requiredQty - availableStock;
                const record = {
                  inventoryItemId: invItem?.id || null,
                  tenHang: item.tenHang,
                  donVi: item.donVi,
                  missingQty,
                  donGia: item.donGia,
                  dinhMucId: invItem?.dinhMucId
                };
                
                // KHO THÀNH PHẨM có định mức, KHO HÀNG HOÁ không có định mức
                if (invItem?.dinhMucId) missingThanhPhamItems.push(record);
                else missingHangHoaItems.push(record);
              }
            }
          }

          const prItemsToCreate: any[] = [];

          // XỬ LÝ SẢN XUẤT CHO KHO THÀNH PHẨM
          if (isProduction && missingThanhPhamItems.length > 0) {
            orderUpdate = await tx.saleOrder.update({ where: { id: order.id }, data: { trangThai: "in_production" } });

            const allMaterials: any[] = [];
            for (const item of missingThanhPhamItems) {
              const dm = await tx.dinhMuc.findUnique({
                where: { id: item.dinhMucId },
                include: { vatTu: { include: { material: true } } }
              });
              if (dm && dm.vatTu) {
                for (const m of dm.vatTu) {
                  allMaterials.push({
                    materialId: m.materialId,
                    tenVatTu: m.material?.name || "Vật tư không xác định",
                    donVi: m.material?.unit || "cái",
                    soLuongCan: m.soLuong * item.missingQty
                  });
                }
              }
            }

            const groupedMaterials = allMaterials.reduce((acc, curr) => {
              if (!acc[curr.materialId]) acc[curr.materialId] = { ...curr };
              else acc[curr.materialId].soLuongCan += curr.soLuongCan;
              return acc;
            }, {});

            const finalMaterialList: any[] = [];
            for (const mat of Object.values(groupedMaterials) as any[]) {
              const invMat = await tx.inventoryItem.findUnique({ where: { id: mat.materialId } });
              const currentStock = invMat ? invMat.soLuong : 0;
              finalMaterialList.push({
                materialId: mat.materialId,
                tenVatTu: mat.tenVatTu,
                donVi: mat.donVi,
                soLuong: mat.soLuongCan,
              });

              if (currentStock < mat.soLuongCan && isPurchase) {
                prItemsToCreate.push({
                  inventoryItemId: mat.materialId,
                  tenHang: mat.tenVatTu,
                  soLuong: mat.soLuongCan - currentStock,
                  donVi: mat.donVi,
                  ghiChu: `Bù vật tư thiếu để sản xuất đơn ${order.code}`
                });
              }
            }

            // Gửi lệnh sản xuất
            const prodHead = await tx.employee.findFirst({
              where: {
                status: "active",
                OR: [
                  { departmentName: { contains: "Sản xuất" }, position: { contains: "Trưởng" } },
                  { departmentCode: { contains: "production" }, position: { contains: "Trưởng" } }
                ]
              },
              select: { userId: true }
            });

            let desc = `Yêu cầu sản xuất cho đơn hàng ${order.code}.
Các mặt hàng:
`;
            missingThanhPhamItems.forEach(i => desc += `- ${i.tenHang}: ${i.missingQty} ${i.donVi}
`);

            let dueDate;
            if (order.ngayGiao) {
              dueDate = new Date(order.ngayGiao);
              dueDate.setDate(dueDate.getDate() - 2);
            }

            const prodTask = await tx.task.create({
              data: {
                title: `Lệnh sản xuất cho đơn hàng ${order.code}`,
                description: desc,
                assigneeId: prodHead?.userId || session.user.id,
                creatorId: session.user.id,
                deptCode: "production",
                priority: "high",
                status: "pending",
                ...(dueDate && { dueDate })
              }
            });

            if (prodHead?.userId) {
              const prodNotif = await tx.notification.create({
                data: {
                  title: `🏭 Yêu cầu sản xuất lắp ráp cho đơn ${order.code}`,
                  content: `Đơn bán hàng ${order.code} cần sản xuất lắp ráp. Đã tạo lệnh: "${prodTask.title}".`,
                  type: "warning",
                  priority: "high",
                  audienceType: "individual",
                  audienceValue: prodHead.userId,
                  createdById: session.user.id
                }
              });
              await tx.notificationRecipient.upsert({
                where: { notificationId_userId: { notificationId: prodNotif.id, userId: prodHead.userId } },
                update: {},
                create: { notificationId: prodNotif.id, userId: prodHead.userId }
              });
            }

            // Lệnh xuất KVP cho Thủ Kho
            if (finalMaterialList.length > 0) {
              let materialDesc = "Danh sách vật tư bóc tách:\n";
              finalMaterialList.forEach(m => materialDesc += `- ${m.tenVatTu}: ${m.soLuong} ${m.donVi}\n`);
              
              const khoTask = await tx.task.create({
                data: {
                  title: `Lệnh xuất kho KVP cho đơn hàng ${order.code}`,
                  description: `Yêu cầu xuất vật tư cho lệnh sản xuất đơn ${order.code}.\n\n${materialDesc}`,
                  assigneeId: storekeeperUserIds[0] || session.user.id,
                  creatorId: session.user.id,
                  deptCode: "logistics",
                  priority: "high",
                  status: "pending",
                  actualResult: JSON.stringify(finalMaterialList.map(m => ({ tenHang: m.tenVatTu, soLuong: m.soLuong, donVi: m.donVi }))),
                  ...(dueDate && { dueDate })
                }
              });

              if (storekeeperUserIds.length > 0) {
                const notifKhoKvp = await tx.notification.create({
                  data: {
                    title: `🔧 Lệnh xuất Kho Vật tư phụ kiện (KVP) cho đơn ${order.code}`,
                    content: `Đơn bán hàng ${order.code} cần xuất vật tư cho bộ phận sản xuất.\n\n${materialDesc}`,
                    type: "info",
                    priority: "high",
                    audienceType: "group",
                    audienceValue: JSON.stringify(storekeeperUserIds),
                    createdById: session.user.id
                  }
                });
                await Promise.all(
                  storekeeperUserIds.map(uid =>
                    tx.notificationRecipient.upsert({
                      where: { notificationId_userId: { notificationId: notifKhoKvp.id, userId: uid } },
                      update: {},
                      create: { notificationId: notifKhoKvp.id, userId: uid }
                    })
                  )
                );
              }
            }
          }

          // XỬ LÝ MUA HÀNG CHO KHO HÀNG HOÁ
          if (isPurchase) {
            for (const item of missingHangHoaItems) {
              prItemsToCreate.push({
                inventoryItemId: item.inventoryItemId,
                tenHang: item.tenHang,
                soLuong: item.missingQty,
                donVi: item.donVi || "cái",
                ghiChu: `Mua thẳng hàng hoá thiếu cho đơn ${order.code}`
              });
            }
          }

          // TẠO YÊU CẦU MUA HÀNG
          if (prItemsToCreate.length > 0) {
            if (!isProduction) {
              orderUpdate = await tx.saleOrder.update({ where: { id: order.id }, data: { trangThai: "processing" } });
            }
            
            const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, ""); // YYYYMMDD
            const countRequestsToday = await tx.purchaseRequest.count({
              where: { code: { startsWith: `YC-${todayStr}-` } }
            });
            const prSeqStr = String(countRequestsToday + 1).padStart(4, "0");
            const prCode = `YC-${todayStr}-${prSeqStr}`;

            const pr = await tx.purchaseRequest.create({
              data: {
                code: prCode,
                nguoiYeuCau: session.user.name ?? "Hệ thống",
                donVi: "Mua hàng",
                lyDo: `Bổ sung hàng hoá/vật tư do thiếu cho đơn ${order.code}`,
                trangThai: "chua-xu-ly",
                createdById: session.user.id,
                items: {
                  create: prItemsToCreate.map(item => ({
                    inventoryItemId: item.inventoryItemId,
                    tenHang: item.tenHang,
                    soLuong: item.soLuong,
                    donVi: item.donVi,
                    ghiChu: item.ghiChu
                  }))
                }
              }
            });

            const purchasingEmployees = await tx.employee.findMany({
              where: {
                status: "active",
                OR: [
                  { departmentName: { contains: "Mua hàng" } },
                  { departmentCode: { contains: "purchase" } }
                ]
              },
              select: { userId: true }
            });

            if (purchasingEmployees.length > 0) {
              const userIds = purchasingEmployees.map(e => e.userId).filter(Boolean) as string[];
              const poNotif = await tx.notification.create({
                data: {
                  title: `⚠️ Có Yêu cầu mua hàng mới: ${prCode}`,
                  content: `Hệ thống tự động lập YC ${prCode} cho các hàng hoá/vật tư còn thiếu để chạy đơn ${order.code}. Vui lòng xử lý.`,
                  type: "warning",
                  priority: "high",
                  audienceType: "group",
                  audienceValue: JSON.stringify(userIds),
                  createdById: session.user.id
                }
              });
              await Promise.all(
                userIds.map(uid =>
                  tx.notificationRecipient.upsert({
                    where: { notificationId_userId: { notificationId: poNotif.id, userId: uid } },
                    update: {},
                    create: { notificationId: poNotif.id, userId: uid }
                  })
                )
              );
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
