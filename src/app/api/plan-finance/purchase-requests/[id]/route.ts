import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendPurchaseNotification, notifyContent } from "@/lib/sendPurchaseNotification";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const req = await prisma.purchaseRequest.findUnique({
    where: { id },
    include: {
      items: {
        orderBy: { sortOrder: "asc" },
        include: {
          inventoryItem: { select: { code: true, tenHang: true, donVi: true, categoryId: true, thongSoKyThuat: true } },
        },
      },
    },
  });

  if (!req) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(req);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const { trangThai } = body;

  const VALID_STATUSES = ["chua-xu-ly", "dang-xu-ly", "da-xu-ly", "tu-choi"];
  if (!trangThai || !VALID_STATUSES.includes(trangThai)) {
    return NextResponse.json({ error: "Trạng thái không hợp lệ" }, { status: 400 });
  }

  const updated = await prisma.purchaseRequest.update({
    where: { id },
    data: { trangThai },
  });

  // Gửi thông báo cho người tạo phiếu
  const event = trangThai === "tu-choi" ? "tu-choi"
    : trangThai === "chua-xu-ly"        ? "khoi-phuc"
    : trangThai === "dang-xu-ly"        ? "dang-xu-ly"
    : "da-xu-ly";
  const nc = notifyContent(event, updated.code);
  console.log(`[PATCH purchase-req] Sending notification event=${event} actorId=${session.user.id} reqId=${id}`);
  await sendPurchaseNotification({
    purchaseRequestId: id,
    actorId: session.user.id,
    ...nc,
  });

  return NextResponse.json(updated);
}

