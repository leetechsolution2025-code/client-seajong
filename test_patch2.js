const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const orderId = 'LSX-20260721-01';
  let order = await prisma.saleOrder.findUnique({
    where: { code: 'DBH-20260721-01' },
    include: { saleOrderItems: true }
  });

  const qaUsers = await prisma.employee.findMany({
    where: { status: "active", OR: [{ departmentCode: { contains: "qa" } }, { departmentName: { contains: "chất lượng" } }, { departmentName: { contains: "Chất lượng" } }] },
    select: { userId: true }
  });
  const qaUserIds = qaUsers.map(u => u.userId).filter(Boolean);

  let producedItems = [];
  for (const item of order.saleOrderItems) {
     const product = await prisma.manufacturedProduct.findFirst({
       where: { name: item.tenHang },
       include: { dinhMucs: true }
     });
     if (product && product.dinhMucs.length > 0) {
       producedItems.push(`${item.tenHang} (x${item.soLuong})`);
     }
  }
  const productNameDesc = producedItems.length > 0 ? producedItems.join(", ") : `Thành phẩm lệnh sản xuất ${order.code}`;

  const qcCode = "QC-" + new Date().toISOString().slice(0,10).replace(/-/g,"") + "-" + Math.floor(100 + Math.random() * 900);
  
  await prisma.$transaction(async (tx) => {
    await tx.saleOrder.update({
      where: { id: order.id },
      data: { trangThai: "completed", ngayHoanThanhSanXuat: new Date() }
    });

    const qcRequest = await tx.qualityInspection.create({
      data: {
        code: qcCode,
        type: "OQC",
        status: "Chưa thực hiện",
        productName: productNameDesc,
        requesterName: "System",
        requesterDept: "Sản xuất",
        executionTime: order.ngayYeuCauQC || order.ngayGiao || new Date(),
        notes: `Test completion`
      }
    });
    console.log("Created QC:", qcRequest.id);
  });
  console.log("Transaction OK");
}
main().catch(console.error).finally(() => prisma.$disconnect());
