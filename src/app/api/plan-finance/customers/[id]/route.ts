import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";


// GET /api/plan-finance/customers/[id]
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await context.params;
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        nguoiChamSoc: { select: { id: true, fullName: true } },
        saleOrders: {
          orderBy: { createdAt: "desc" },
          take: 20
        }
      },
    });

    if (!customer) return NextResponse.json({ error: "Customer not found" }, { status: 404 });

    // Query outstanding debt from Debt table
    const customerDebts = await prisma.debt.findMany({
      where: {
        partnerName: customer.name,
        type: { in: ["RECEIVABLE", "phai-thu"] },
      },
      select: {
        amount: true,
        paidAmount: true,
      }
    });

    const outstandingDebt = customerDebts.reduce((sum, d) => sum + ((d.amount || 0) - (d.paidAmount || 0)), 0);

    // Query yearly sales (from current year)
    const currentYear = new Date().getFullYear();
    const startOfYear = new Date(`${currentYear}-01-01T00:00:00.000Z`);
    const endOfYear = new Date(`${currentYear}-12-31T23:59:59.999Z`);
    const yearlyOrders = await prisma.saleOrder.findMany({
      where: {
        customerId: id,
        trangThai: { notIn: ["cancelled", "draft"] },
        createdAt: {
          gte: startOfYear,
          lte: endOfYear
        }
      },
      select: {
        tongTien: true
      }
    });
    const yearlySales = yearlyOrders.reduce((sum, o) => sum + (o.tongTien || 0), 0);

    // Query committed sales and merge extra fields from customer.formValues
    let committedSales = 0;
    let extraFields = {};
    if (customer.formValues) {
      try {
        const fVals = JSON.parse(customer.formValues);
        extraFields = fVals;
        const rawRevenue = fVals.hdAnnualRevenue;
        if (rawRevenue) {
          const cleanRevenue = String(rawRevenue).replace(/\./g, "").trim();
          const parsedRev = parseFloat(cleanRevenue);
          if (!isNaN(parsedRev)) {
            committedSales = parsedRev;
          }
        }
      } catch (e) {
        console.error("Lỗi đọc formValues từ customer:", e);
      }
    }

    if (committedSales === 0) {
      try {
        const activeContract = await prisma.contract.findFirst({
          where: { customerId: id },
          orderBy: { createdAt: "desc" }
        });
        if (activeContract) {
          committedSales = activeContract.giaTriHopDong;
        }
      } catch (e) {
        console.error("Lỗi đọc contract table:", e);
      }
    }

    return NextResponse.json({
      ...customer,
      ...extraFields,
      outstandingDebt,
      creditLimit: customer.hanMucCongNo,
      yearlySales,
      committedSales,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[GET /customers/:id]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// DELETE /api/plan-finance/customers/[id]
export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await context.params;
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    await prisma.customer.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[DELETE /customers]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// PATCH /api/plan-finance/customers/[id]
export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await context.params;
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    const body = await req.json();
    const { name, address, nguon, nhom, loai, daiDien, xungHo, chucVu, dienThoai, email, ghiChu, nguoiChamSocId, hanMucCongNo } = body;

    const updated = await prisma.customer.update({
      where: { id },
      data: {
        ...(name        !== undefined && { name }),
        ...(address     !== undefined && { address }),
        ...(nguon       !== undefined && { nguon }),
        ...(nhom        !== undefined && { nhom }),
        ...(loai        !== undefined && { loai }),
        ...(daiDien     !== undefined && { daiDien }),
        ...(xungHo      !== undefined && { xungHo }),
        ...(chucVu      !== undefined && { chucVu }),
        ...(dienThoai   !== undefined && { dienThoai }),
        ...(email       !== undefined && { email }),
        ...(ghiChu      !== undefined && { ghiChu }),
        ...(hanMucCongNo !== undefined && { hanMucCongNo: parseFloat(hanMucCongNo) || 0 }),
        nguoiChamSocId: nguoiChamSocId || null,
      },
      include: { nguoiChamSoc: { select: { id: true, fullName: true } } },
    });

    return NextResponse.json(updated);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[PATCH /customers]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
