import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function test() {
  try {
    const orders = await prisma.omnichannelOrder.findMany({
      include: {
        channel: true,
        items: true,
      }
    });
    console.log('Success:', orders.length);
  } catch (e) {
    console.error('Error details:', e);
  } finally {
    await prisma.$disconnect();
  }
}

test();
