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
    const page      = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
    const search    = searchParams.get("search")    ?? "";
    const trangThai = searchParams.get("trangThai") ?? "";
    const keToanDuyet = searchParams.get("keToanDuyet") ?? "";

    const where = {
      ...(search    && { OR: [{ code: { contains: search } }, { customer: { name: { contains: search } } }, { ghiChu: { contains: search } }] }),
      ...(trangThai && { trangThai }),
      ...(keToanDuyet && { keToanDuyet }),
    };

    const [total, items] = await Promise.all([
      prisma.saleOrder.count({ where }),
      prisma.saleOrder.findMany({
        where, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE,
        orderBy: { createdAt: "desc" },
        include: { customer: { select: { id: true, name: true, address: true, hanMucCongNo: true } } },
      }),
    ]);

    const employeeIds = Array.from(new Set(items.map(item => item.nguoiPhuTrach).filter(Boolean))) as string[];
    const employees = await prisma.employee.findMany({
      where: { id: { in: employeeIds } },
      select: { id: true, fullName: true }
    });
    const employeeMap = new Map(employees.map(e => [e.id, e.fullName]));

    // Query outstanding debts for customers
    const customerNames = items.map(item => item.customer?.name).filter(Boolean) as string[];
    const customerDebts = await prisma.debt.findMany({
      where: {
        partnerName: { in: customerNames },
        type: { in: ["RECEIVABLE", "phai-thu"] },
      },
      select: {
        partnerName: true,
        amount: true,
        paidAmount: true,
      }
    });

    const debtMap = new Map<string, number>();
    for (const d of customerDebts) {
      const outstanding = (d.amount || 0) - (d.paidAmount || 0);
      const prev = debtMap.get(d.partnerName) || 0;
      debtMap.set(d.partnerName, prev + outstanding);
    }

    const itemsWithCreator = items.map(item => {
      const debt = item.customer ? (debtMap.get(item.customer.name) || 0) : 0;
      const guest = parseGuestInfo(item.ghiChu);
      return {
        ...item,
        ghiChu: cleanGhiChu(item.ghiChu),
        nguoiPhuTrachName: item.nguoiPhuTrach ? (employeeMap.get(item.nguoiPhuTrach) || "Chưa rõ") : "Hệ thống",
        customer: item.customer ? {
          ...item.customer,
          outstandingDebt: debt,
          creditLimit: item.customer.hanMucCongNo,
        } : (guest ? {
          id: null,
          name: guest.name,
          dienThoai: guest.dienThoai,
          address: guest.address,
          outstandingDebt: 0,
          creditLimit: 0
        } : null),
      };
    });

    return NextResponse.json({ items: itemsWithCreator, total, page, totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)) });
  } catch (e: unknown) {
    console.error("[GET /sales]", e);
    return NextResponse.json({ items: [], total: 0, page: 1, totalPages: 1 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { code, customerId, ngayDat, ngayGiao, trangThai, tongTien, daThanhToan, keToanDuyet, ghiChu, nguoiPhuTrach, items } = body;

    const fullOrder = await prisma.$transaction(async (tx) => {
      const order = await tx.saleOrder.create({
        data: {
          code, trangThai: trangThai ?? "draft",
          tongTien:    parseFloat(tongTien    ?? 0),
          daThanhToan: parseFloat(daThanhToan ?? 0),
          keToanDuyet: keToanDuyet ?? "pending",
          ghiChu, nguoiPhuTrach,
          ...(customerId && { customerId }),
          ...(ngayDat    && { ngayDat: new Date(ngayDat) }),
          ...(ngayGiao   && { ngayGiao: new Date(ngayGiao) }),
        },
      });

      if (items && Array.isArray(items) && items.length > 0) {
        const orderItems = items.map((it: any) => ({
          saleOrderId: order.id,
          inventoryItemId: it.inventoryItemId || null,
          tenHang: it.tenHang || "",
          soLuong: parseFloat(it.soLuong ?? 1),
          donGia: parseFloat(it.donGia ?? 0),
          thanhTien: parseFloat(it.soLuong ?? 1) * parseFloat(it.donGia ?? 0),
        }));
        await tx.saleOrderItem.createMany({ data: orderItems });
      }

      return tx.saleOrder.findUnique({
        where: { id: order.id },
        include: { saleOrderItems: true },
      });
    });

    return NextResponse.json(fullOrder, { status: 201 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
