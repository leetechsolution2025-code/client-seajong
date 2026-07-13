import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function run() {
  const product = await prisma.manufacturedProduct.findFirst({
    where: { name: { contains: "rumine" } },
    include: { dinhMucs: { include: { vatTu: { include: { material: true } } } } }
  });

  if (!product) return;

  for (const dinhMuc of product.dinhMucs) {
    if (!dinhMuc.vatTu || dinhMuc.vatTu.length === 0) continue;

    const cost = dinhMuc.vatTu.reduce((sum: number, item: any) => {
      const materialPrice = item.material?.price || item.material?.giaNhap || 0;
      return sum + (item.soLuong || 0) * materialPrice;
    }, 0);

    const marginPct = 0; // Let's use 0 margin just to see the pure cost, or let's just add 10%
    const calculated = Math.round((cost * 1.1) / 1000) * 1000;

    await prisma.dinhMuc.update({
      where: { id: dinhMuc.id },
      data: { giaBan: calculated }
    });
    console.log(`Updated ${dinhMuc.code} to ${calculated}`);
  }
}

run().then(() => process.exit(0));
