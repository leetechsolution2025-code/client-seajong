import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function PATCH(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const params = await props.params;
    const { id } = params;
    const body = await req.json();
    const { result, notes } = body;

    const inspection = await prisma.qualityInspection.findUnique({
      where: { code: id } // Note: The frontend passes 'code' as 'id' in selectedInspection
    });

    if (!inspection) {
      return NextResponse.json({ error: "Không tìm thấy phiếu kiểm tra" }, { status: 404 });
    }

    await prisma.$transaction(async (tx) => {
      // 1. Cập nhật trạng thái phiếu QC
      await tx.qualityInspection.update({
        where: { id: inspection.id },
        data: {
          result,
          notes: notes || inspection.notes,
          status: "Đã hoàn thành",
          inspectorName: session.user?.name || session.user?.email || "QA/QC"
        }
      });

      // 2. Nếu đạt yêu cầu và là OQC -> Tạo lệnh nhập kho
      if (result === "Đạt" && inspection.type === "OQC") {
        const storekeepers = await tx.employee.findMany({
          where: {
            status: "active",
            OR: [
              { departmentCode: { contains: "logistics" } },
              { departmentName: { contains: "kho" } },
              { departmentName: { contains: "Kho" } },
              { position: { contains: "thủ kho" } }
            ]
          },
          select: { userId: true }
        });
        const storekeeperUserIds = storekeepers.map(u => u.userId).filter(Boolean) as string[];

        // Tạo Task
        const khoTask = await tx.task.create({
          data: {
            title: `Nhập kho thành phẩm sau OQC (${inspection.code})`,
            description: `Kiểm tra OQC đạt yêu cầu. Đề nghị bộ phận Kho vận tiến hành nhập kho thành phẩm.\nSản phẩm: ${inspection.productName}`,
            assigneeId: storekeeperUserIds[0] || session.user.id,
            creatorId: session.user.id,
            deptCode: "logistics",
            priority: "high",
            status: "pending",
            actualResult: JSON.stringify([
              { tenHang: inspection.productName, soLuong: 1, donVi: "Lô", type: "Kho Thành Phẩm", isShortage: false }
            ])
          }
        });

        // Gửi Notification
        if (storekeeperUserIds.length > 0) {
          const khoNotif = await tx.notification.create({
            data: {
              title: `📦 Yêu cầu nhập kho thành phẩm mới`,
              content: `Sản phẩm từ sản xuất đã vượt qua OQC (${inspection.code}). Vui lòng tiến hành nhập kho thành phẩm.`,
              type: "success",
              priority: "high",
              audienceType: "group",
              audienceValue: JSON.stringify(storekeeperUserIds),
              createdById: session.user.id
            }
          });
          
          await Promise.all(
            storekeeperUserIds.map(uid =>
              tx.notificationRecipient.upsert({
                where: { notificationId_userId: { notificationId: khoNotif.id, userId: uid } },
                update: {},
                create: { notificationId: khoNotif.id, userId: uid }
              })
            )
          );
        }
      }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("QA Inspection PATCH Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
