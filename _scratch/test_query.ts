import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  try {
    const data = await (prisma as any).promotionRequest.findMany({
      include: {
        employee: {
          select: {
            fullName: true,
            code: true,
            avatarUrl: true,
            position: true
          }
        },
        requester: {
          select: {
            fullName: true,
            position: true
          }
        },
        interviewer: {
          select: {
            fullName: true
          }
        }
      },
      orderBy: {
        createdAt: "desc"
      }
    });
    console.log('Success:', data.length);
  } catch (e: any) {
    console.error('Error:', e.message);
  }
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
