import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const q = await prisma.quotation.findUnique({
      where: { id },
      include: {
        customer: { select: { id: true, name: true, dienThoai: true, email: true, address: true } },
        nguoiPhuTrach: { select: { id: true, fullName: true, userId: true } },
        items: { orderBy: { sortOrder: "asc" } },
      },
    });
    if (!q) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const resolvedItems = await Promise.all((q.items || []).map(async (item) => {
      const invItem = await prisma.inventoryItem.findFirst({
        where: { tenHang: item.tenHang },
        select: { imageUrl: true }
      });
      return {
        ...item,
        imageUrl: invItem?.imageUrl || null
      };
    }));

    const responseData = {
      ...q,
      items: resolvedItems
    };

    let ngayGiaoHang: Date | null = null;

    if (q.trangThai === "won" && q.customerId) {
      const saleOrder = await prisma.saleOrder.findFirst({
        where: {
          customerId: q.customerId,
          tongTien: q.thanhTien,
        },
        orderBy: {
          createdAt: "desc",
        },
      });
      if (saleOrder) {
        ngayGiaoHang = saleOrder.ngayGiao;
      }
    }

    return NextResponse.json({
      ...responseData,
      ngayGiaoHang,
    });
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;

    const quotation = await prisma.quotation.findUnique({
      where: { id },
      include: { nguoiPhuTrach: { select: { userId: true } } },
    });

    if (!quotation) {
      return NextResponse.json({ error: "Không tìm thấy báo giá" }, { status: 404 });
    }

    if (quotation.nguoiPhuTrach?.userId !== session.user.id) {
      return NextResponse.json({ error: "Bạn không có quyền xoá báo giá này" }, { status: 403 });
    }

    await prisma.$transaction([
      prisma.quotationItem.deleteMany({ where: { quotationId: id } }),
      prisma.quotation.delete({ where: { id } }),
    ]);

    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[DELETE /quotations/:id]", e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const body = await req.json();
    const {
      code, ngayBaoGia, ngayHetHan, trangThai, uuTien,
      tongTien, discount, vat, chiPhiThiCong, thanhTien, ghiChu, items,
      file3DUrl, fileDetailUrl, fileLayoutUrl,
    } = body;

    // Truly partial update — chỉ include field khi field đó có trong body
    const updateData: Record<string, any> = {};
    if (code !== undefined) updateData.code = code;
    if (trangThai !== undefined) updateData.trangThai = trangThai;
    if (uuTien !== undefined) updateData.uuTien = uuTien;
    if (tongTien !== undefined) updateData.tongTien = parseFloat(String(tongTien));
    if (discount !== undefined) updateData.discount = parseFloat(String(discount));
    if (vat !== undefined) updateData.vat = parseFloat(String(vat));
    if (chiPhiThiCong !== undefined) updateData.chiPhiThiCong = parseFloat(String(chiPhiThiCong));
    if (thanhTien !== undefined) updateData.thanhTien = parseFloat(String(thanhTien));
    if (ghiChu !== undefined) updateData.ghiChu = ghiChu;
    if (file3DUrl !== undefined) updateData.file3DUrl = file3DUrl;
    if (fileDetailUrl !== undefined) updateData.fileDetailUrl = fileDetailUrl;
    if (fileLayoutUrl !== undefined) updateData.fileLayoutUrl = fileLayoutUrl;
    if (ngayBaoGia !== undefined) updateData.ngayBaoGia = new Date(ngayBaoGia);
    if (ngayHetHan !== undefined) updateData.ngayHetHan = new Date(ngayHetHan);

    const updated = await prisma.$transaction(async (tx) => {
      // Chỉ xoá + tạo lại items khi body có mảng items
      if (Array.isArray(items)) {
        await tx.quotationItem.deleteMany({ where: { quotationId: id } });
        if (items.length > 0) {
          await tx.quotationItem.createMany({
            data: items.map((it: any, idx: number) => ({
              quotationId: id,
              tenHang: it.tenHang ?? "",
              donVi: it.donVi ?? "cái",
              soLuong: parseFloat(String(it.soLuong ?? 1)),
              donGia: parseFloat(String(it.donGia ?? 0)),
              thanhTien: parseFloat(String(it.thanhTien ?? 0)),
              ghiChu: it.ghiChu ?? null,
              sortOrder: it.sortOrder ?? idx,
            })),
          });
        }
      }

      const qResult = await tx.quotation.update({
        where: { id },
        data: updateData,
        include: { items: true }
      });

      // Business logic for WON status (Thành công)
      if (trangThai === "won") {
        const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, ""); // YYYYMMDD

        // 1. Generate Order Code: DHBL-YYYYmmdd-STT
        const countToday = await tx.saleOrder.count({
          where: {
            code: {
              startsWith: `DHBL-${todayStr}-`
            }
          }
        });
        const seqStr = String(countToday + 1).padStart(2, "0");
        const orderCode = `DHBL-${todayStr}-${seqStr}`;

        // 2. Stock Check
        const insufficientItems: any[] = [];
        for (const item of qResult.items) {
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

        // 3. Create SaleOrder
        const resolvedNgayGiao = body.ngayGiaoHang ? new Date(body.ngayGiaoHang) : null;
        await tx.saleOrder.create({
          data: {
            code: orderCode,
            customerId: qResult.customerId,
            ngayDat: new Date(),
            ngayGiao: resolvedNgayGiao,
            trangThai: "active", // Đang thực hiện
            tongTien: qResult.thanhTien,
            daThanhToan: 0,
            keToanDuyet: "pending",
            trangThaiKho: insufficientItems.length > 0 ? "out_of_stock" : "in_stock",
            ghiChu: qResult.ghiChu,
            nguoiPhuTrach: qResult.nguoiPhuTrachId ? String(qResult.nguoiPhuTrachId) : undefined,
          }
        });

        // 4. Send notification to Head of Finance & Accounting
        let customerName = "Khách hàng vãng lai";
        if (qResult.customerId) {
          const cust = await tx.customer.findUnique({
            where: { id: qResult.customerId },
            select: { name: true }
          });
          if (cust) customerName = cust.name;
        }

        const financeHead = await tx.employee.findFirst({
          where: {
            departmentCode: "finance",
            position: { contains: "1964-sbmg" },
            userId: { not: null }
          },
          select: { userId: true }
        }) || await tx.employee.findFirst({
          where: {
            departmentCode: "finance",
            userId: { not: null }
          },
          select: { userId: true }
        });

        if (financeHead?.userId) {
          const notif = await tx.notification.create({
            data: {
              title: `🛒 Đơn hàng mới cần duyệt: ${orderCode}`,
              content: `Đơn bán hàng bán lẻ ${orderCode} của khách hàng ${customerName} đã được khởi tạo và đang chờ kế toán phê duyệt.`,
              type: "info",
              priority: "high",
              audienceType: "individual",
              audienceValue: financeHead.userId,
              createdById: session.user.id ?? "system"
            }
          });
          await tx.notificationRecipient.upsert({
            where: { notificationId_userId: { notificationId: notif.id, userId: financeHead.userId } },
            update: {},
            create: { notificationId: notif.id, userId: financeHead.userId }
          });
        }

      }
      return qResult;
    });

    return NextResponse.json(updated);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[PATCH /quotations/:id]", e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
