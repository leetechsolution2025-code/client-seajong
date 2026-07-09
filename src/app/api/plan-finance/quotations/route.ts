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

const PAGE_SIZE = 10;

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = req.nextUrl;
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
    const search = searchParams.get("search") ?? "";
    const trangThai = searchParams.get("trangThai") ?? "";
    const uuTien = searchParams.get("uuTien") ?? "";
    const customerId = searchParams.get("customerId") ?? "";
    const type = searchParams.get("type") ?? "";

    const where = {
      ...(type && { type }),
      ...(customerId && { customerId }),
      ...(search && { OR: [{ code: { contains: search } }, { customer: { name: { contains: search } } }, { ghiChu: { contains: search } }] }),
      ...(trangThai && { trangThai }),
      ...(uuTien && { uuTien }),
    };

    const [total, items] = await Promise.all([
      prisma.quotation.count({ where }),
      prisma.quotation.findMany({
        where,
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
        orderBy: { createdAt: "desc" },
        include: {
          customer: { select: { id: true, name: true, dienThoai: true, email: true, address: true } },
          nguoiPhuTrach: { select: { id: true, fullName: true, position: true, userId: true } },
          items: { orderBy: { sortOrder: "asc" } },
        },
      }),
    ]);

    const parsedItems = items.map(it => {
      const guest = parseGuestInfo(it.ghiChu);
      return {
        ...it,
        ghiChu: cleanGhiChu(it.ghiChu),
        customer: it.customer || (guest ? {
          id: null,
          name: guest.name,
          dienThoai: guest.dienThoai,
          address: guest.address,
          email: null
        } : null)
      };
    });

    return NextResponse.json({
      items: parsedItems, total, page,
      totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    });
  } catch (e: unknown) {
    console.error("[GET /quotations]", e);
    return NextResponse.json({ items: [], total: 0, page: 1, totalPages: 1 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const {
      code, customerId,
      ngayBaoGia, ngayHetHan,
      trangThai, uuTien,
      tongTien, discount, vat, chiPhiThiCong, thanhTien, ghiChu,
      quoteType,
      type,
      file3DUrl, fileDetailUrl, fileLayoutUrl,
      items,
    } = body;

    // Tự động lấy employeeId của người tạo báo giá
    const creatorEmployee = await prisma.employee.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    });
    const nguoiPhuTrachId = creatorEmployee?.id ?? null;

    const quotation = await prisma.$transaction(async (tx) => {
      // Ensure customer exists to prevent foreign key constraint violation
      if (customerId) {
        const customer = await tx.customer.findUnique({
          where: { id: customerId }
        });
        if (!customer) {
          const lead = await tx.marketingLead.findUnique({
            where: { id: customerId }
          });
          if (lead) {
            await tx.customer.create({
              data: {
                id: customerId,
                name: lead.fullName || "Đại lý chưa đặt tên",
                dienThoai: lead.phone,
                email: lead.email,
                nguon: lead.source,
              }
            });
          }
        }
      }

      let finalCode = code;
      if (!finalCode || finalCode === "Đang tải...") {
        const now = new Date();
        const utcTime = now.getTime() + now.getTimezoneOffset() * 60000;
        const ICTTime = new Date(utcTime + 3600000 * 7);

        const yyyy = ICTTime.getFullYear();
        const mm = String(ICTTime.getMonth() + 1).padStart(2, "0");
        const dd = String(ICTTime.getDate()).padStart(2, "0");
        const dateStr = `${yyyy}${mm}${dd}`;
        const prefix = (type === "agency" ? "QUO-" : "BG-") + `${dateStr}-`;

        const todayQuotes = await tx.quotation.findMany({
          where: {
            code: {
              startsWith: prefix
            }
          },
          select: {
            code: true
          }
        });

        let maxSTT = 0;
        for (const q of todayQuotes) {
          if (q.code) {
            const parts = q.code.split("-");
            const sttPart = parts[parts.length - 1];
            const sttVal = parseInt(sttPart, 10);
            if (!isNaN(sttVal) && sttVal > maxSTT) {
              maxSTT = sttVal;
            }
          }
        }

        const nextSTTStr = String(maxSTT + 1).padStart(3, "0");
        finalCode = `${prefix}${nextSTTStr}`;
      }

      // 1. Tạo báo giá
      const q = await tx.quotation.create({
        data: {
          code: finalCode,
          trangThai: trangThai ?? "draft",
          uuTien: uuTien ?? "medium",
          tongTien: parseFloat(tongTien ?? 0),
          discount: parseFloat(discount ?? 0),
          vat: parseFloat(vat ?? 0),
          chiPhiThiCong: parseFloat(chiPhiThiCong ?? 0),
          thanhTien: parseFloat(thanhTien ?? 0),
          ghiChu,
          file3DUrl,
          fileDetailUrl,
          fileLayoutUrl,
          type: type ?? "retail",
          ...(customerId && { customerId }),
          ...(nguoiPhuTrachId && { nguoiPhuTrachId }),
          ...(ngayBaoGia && { ngayBaoGia: new Date(ngayBaoGia) }),
          ...(ngayHetHan && { ngayHetHan: new Date(ngayHetHan) }),
        },
      });

      // 2. Tạo các dòng hàng hoá (nếu có)
      if (Array.isArray(items) && items.length > 0) {
        await tx.quotationItem.createMany({
          data: items.map((it: {
            tenHang: string; donVi?: string;
            soLuong?: number; donGia?: number; thanhTien?: number;
            ghiChu?: string; sortOrder?: number;
          }, idx: number) => ({
            quotationId: q.id,
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

      // 3. Sync lead's formValues if it matches a marketing lead
      if (customerId) {
        const lead = await tx.marketingLead.findUnique({
          where: { id: customerId }
        });
        if (lead) {
          let currentFormValues = {};
          try {
            currentFormValues = JSON.parse(lead.formValues || "{}");
          } catch (e) { }

          const statusMap: Record<string, string> = {
            draft: "Draft",
            pending_approval: "Sent",
            approved: "Approved",
          };

          Object.assign(currentFormValues, {
            quoteCode: finalCode,
            quoteValue: parseFloat(String(thanhTien ?? 0)),
            discountRate: parseFloat(String(discount ?? 0)),
            quoteStatus: statusMap[trangThai ?? "draft"] || "Draft",
            quoteType: quoteType || "Có quầy kệ",
            step: 3
          });

          await tx.marketingLead.update({
            where: { id: customerId },
            data: {
              formValues: JSON.stringify(currentFormValues),
              status: "step_3"
            }
          });
        }
      }

      // 4. Business logic for WON status (Thành công)
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
        if (Array.isArray(items)) {
          for (const item of items) {
            const invItem = await tx.inventoryItem.findFirst({
              where: { tenHang: item.tenHang }
            });
            const availableStock = invItem ? invItem.soLuong : 0;
            const requiredQty = parseFloat(String(item.soLuong ?? 1));

            if (availableStock < requiredQty) {
              insufficientItems.push({
                inventoryItemId: invItem?.id || null,
                tenHang: item.tenHang,
                donVi: item.donVi ?? "cái",
                missingQty: requiredQty - availableStock,
                donGia: parseFloat(String(item.donGia ?? 0))
              });
            }
          }
        }

        // 3. Create SaleOrder
        const resolvedNgayGiao = body.ngayGiaoHang ? new Date(body.ngayGiaoHang) : null;
        await tx.saleOrder.create({
          data: {
            code: orderCode,
            customerId: q.customerId,
            ngayDat: new Date(),
            ngayGiao: resolvedNgayGiao,
            trangThai: "active", // Đang thực hiện
            tongTien: q.thanhTien,
            daThanhToan: 0,
            keToanDuyet: "pending",
            trangThaiKho: insufficientItems.length > 0 ? "out_of_stock" : "in_stock",
            ghiChu: q.ghiChu,
            nguoiPhuTrach: q.nguoiPhuTrachId ? String(q.nguoiPhuTrachId) : undefined,
            saleOrderItems: {
              create: (Array.isArray(items) ? items : []).map((it: any) => ({
                tenHang: it.tenHang ?? "",
                soLuong: parseFloat(String(it.soLuong ?? 1)),
                donGia: parseFloat(String(it.donGia ?? 0)),
                thanhTien: parseFloat(String(it.thanhTien ?? 0)),
              }))
            }
          }
        });

        // 4. Send notification to Head of Finance & Accounting
        let customerName = "Khách hàng vãng lai";
        if (q.customerId) {
          const cust = await tx.customer.findUnique({
            where: { id: q.customerId },
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

      return q;
    });

    return NextResponse.json(quotation, { status: 201 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

