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
    const { result, notes, passedQuantity, items } = body;

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

      // 1.5. Cập nhật trạng thái Công việc (Task) tương ứng
      const qcTasks = await tx.task.findMany({
        where: {
          deptCode: "qa",
          status: { in: ["pending", "in_progress", "todo"] },
          description: { contains: inspection.code }
        }
      });
      
      for (const task of qcTasks) {
        await tx.task.update({
          where: { id: task.id },
          data: {
            status: "completed",
            actualResult: JSON.stringify([{ msg: `Đã đánh giá chất lượng: ${result}. Phiếu: ${inspection.code}`, date: new Date().toISOString() }])
          }
        });
      }

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

        // Ghi nhận số lượng thực tế
        const meta = (inspection as any).metadata ? JSON.parse((inspection as any).metadata as string) : {};
        const finalQuantity = passedQuantity || meta.totalQuantity || 1;
        const itemName = meta.model ? meta.model.split(',')[0].trim() : inspection.productName;

        // Tạo Task
        const khoTask = await tx.task.create({
          data: {
            title: `Yêu cầu nhập kho thành phẩm (${inspection.code})`,
            description: `Kiểm tra OQC đạt yêu cầu. Đề nghị bộ phận Kho vận tiến hành nhập kho thành phẩm.\nSản phẩm: ${itemName}`,
            assigneeId: storekeeperUserIds[0] || session.user.id,
            creatorId: session.user.id,
            deptCode: "logistics",
            priority: "high",
            status: "pending",
            actualResult: JSON.stringify([
              { tenHang: itemName, soLuong: finalQuantity, donVi: "Bộ", type: "Kho Thành Phẩm", isShortage: false }
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

      // 3. Nếu là IQC và có items đạt -> Tạo lệnh nhập kho vật tư
      if (inspection.type === "IQC" && passedQuantity > 0 && Array.isArray(items)) {
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
        const storekeeperUserIds = storekeepers.map((u: any) => u.userId).filter(Boolean) as string[];

        const passedItems = items.filter((it: any) => parseInt(it.passQuantity?.toString() || "0", 10) > 0);
        
        if (passedItems.length > 0) {
          const taskItems = passedItems.map((it: any) => ({
            tenHang: it.name || it.productName || it.tenHang || "Vật tư không tên",
            soLuong: parseInt(it.passQuantity?.toString() || "0", 10),
            donVi: "Cái", // Defaulting to Cái, can be extended if needed
            type: "Kho Vật Tư / Linh kiện",
            isShortage: false
          }));

          const khoTask = await tx.task.create({
            data: {
              title: `Yêu cầu nhập kho vật tư (${inspection.code})`,
              description: `Kiểm tra IQC có hàng hóa đạt yêu cầu. Đề nghị bộ phận Kho vận tiến hành nhập kho vật tư / linh kiện.\nTừ đơn: ${inspection.productName || "N/A"}`,
              assigneeId: storekeeperUserIds[0] || session.user.id,
              creatorId: session.user.id,
              deptCode: "logistics",
              priority: "high",
              status: "pending",
              actualResult: JSON.stringify(taskItems)
            }
          });

          // Gửi Notification
          if (storekeeperUserIds.length > 0) {
            const khoNotif = await tx.notification.create({
              data: {
                title: `📦 Yêu cầu nhập kho vật tư mới`,
                content: `Hàng hóa nhập từ nhà cung cấp đã vượt qua kiểm định IQC (${inspection.code}). Vui lòng tiến hành nhập kho vật tư / linh kiện.`,
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
      }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("QA Inspection PATCH Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const params = await props.params;
    const { id } = params;

    const inspection = await prisma.qualityInspection.findUnique({
      where: { code: id }
    });

    if (!inspection) {
      return NextResponse.json({ error: "Không tìm thấy phiếu kiểm tra" }, { status: 404 });
    }

    await prisma.qualityInspection.delete({
      where: { id: inspection.id }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("QA Inspection DELETE Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
