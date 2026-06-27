import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/plan-finance/contracts/[id]
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;

    const contract = await prisma.contract.findUnique({
      where: { id },
      include: {
        customer: {
          select: {
            id: true, name: true, nhom: true,
            dienThoai: true, email: true, address: true,
            daiDien: true, xungHo: true, chucVu: true,
          },
        },
        nguoiPhuTrach: { select: { id: true, fullName: true, position: true } },
        quotation: {
          select: {
            id: true, code: true, ngayBaoGia: true, thanhTien: true,
            items: {
              select: { tenHang: true, donVi: true, soLuong: true, donGia: true, thanhTien: true, sortOrder: true },
              orderBy: { sortOrder: "asc" },
            },
          },
        },
      },
    });

    if (!contract) return NextResponse.json({ error: "Không tìm thấy hợp đồng" }, { status: 404 });
    return NextResponse.json(contract);
  } catch (e: unknown) {
    console.error("[GET /contracts/[id]]", e);
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 });
  }
}

// PATCH /api/plan-finance/contracts/[id] — cập nhật trạng thái, ghi chú
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const body = await req.json();
    const { trangThai, uuTien, daThanhToan, ghiChu } = body;

    const updated = await prisma.$transaction(async (tx) => {
      const currentContract = await tx.contract.findUnique({
        where: { id },
        include: { customer: true }
      });
      if (!currentContract) throw new Error("Contract not found");

      const contractUpdate = await tx.contract.update({
        where: { id },
        data: {
          ...(trangThai    !== undefined && { trangThai }),
          ...(uuTien       !== undefined && { uuTien }),
          ...(daThanhToan  !== undefined && { daThanhToan: parseFloat(daThanhToan) }),
          ...(ghiChu       !== undefined && { ghiChu }),
        },
      });

      const nextDaThanhToan = daThanhToan !== undefined ? parseFloat(daThanhToan) : currentContract.daThanhToan;
      const refId = currentContract.code || currentContract.id;

      // Tìm bản ghi công nợ tương ứng
      const existingDebt = await tx.debt.findFirst({
        where: { referenceId: refId }
      });

      if (existingDebt) {
        const nextPaid = nextDaThanhToan;
        const nextStatus = nextPaid >= existingDebt.amount ? "PAID" : (nextPaid > 0 ? "PARTIAL" : "UNPAID");
        await tx.debt.update({
          where: { id: existingDebt.id },
          data: {
            paidAmount: nextPaid,
            status: nextStatus
          }
        });
      } else {
        const conNo = currentContract.giaTriHopDong - nextDaThanhToan;
        if (conNo > 0) {
          await (tx.debt as any).create({
            data: {
              type: "phai-thu",
              partnerName: currentContract.customer?.name ?? "Khách hàng",
              amount: currentContract.giaTriHopDong,
              paidAmount: nextDaThanhToan,
              status: nextDaThanhToan === 0 ? "UNPAID" : "PARTIAL",
              dueDate: currentContract.ngayKetThuc,
              referenceId: refId,
              description: `Công nợ tự động phát sinh từ hợp đồng thành công: ${refId}`,
            }
          });
        }
      }

      return contractUpdate;
    });

    return NextResponse.json(updated);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
