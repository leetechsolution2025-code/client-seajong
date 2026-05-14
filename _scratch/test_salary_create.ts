
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  try {
    const test = await prisma.salaryAdjustmentRequest.create({
      data: {
        employeeId: 'any-id', // We'll need a real one for relations though
        adjustmentType: 'INCREASE',
        reason: 'Test',
        status: 'PENDING'
      }
    });
    console.log('Success:', test);
  } catch (e) {
    console.error('Error:', e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
