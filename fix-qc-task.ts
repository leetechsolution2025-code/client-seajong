import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const order = await prisma.saleOrder.findUnique({ where: { code: "DBH-20260730-01" } });
  if (!order) return;

  const qaHead = await prisma.employee.findFirst({
    where: {
      status: "active",
      OR: [
        { departmentCode: { contains: "qa" }, position: { contains: "Trưởng" } },
        { departmentName: { contains: "chất lượng" }, position: { contains: "Trưởng" } },
        { departmentName: { contains: "Chất lượng" }, position: { contains: "Trưởng" } },
      ],
    },
    select: { userId: true },
  });

  const someTask = await prisma.task.findFirst({ where: { title: { contains: "DBH-20260730-01" } }});

  const assigneeId = qaHead?.userId || someTask?.creatorId || "cmra9q6qi00018oq7nniehh75";
  const creatorId = someTask?.creatorId || "cmra9q6qi00018oq7nniehh75";

  await prisma.task.create({
    data: {
      title: `Yêu cầu kiểm soát chất lượng cho đơn hàng ${order.code || order.id}`,
      description: `Mã phiếu QC: QC-20260730-123\nThành phẩm: Thành phẩm lệnh sản xuất ${order.code || order.id}`,
      assigneeId: assigneeId,
      creatorId: creatorId,
      deptCode: "qa",
      priority: "high",
      status: "pending",
      dueDate: order.ngayYeuCauQC || order.ngayGiao || new Date(),
    },
  });
  console.log("Created missing QA task for DBH-20260730-01");
}
main();
