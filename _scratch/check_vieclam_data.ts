import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const counts = await prisma.candidate.groupBy({
    by: ['source'],
    _count: {
      id: true
    }
  });

  console.log('Candidate counts by source:');
  console.log(counts);

  const latestVieclamCandidates = await (prisma as any).candidate.findMany({
    where: { source: 'VIECLAM24H' },
    orderBy: { date: 'desc' },
    take: 5
  });

  console.log('\nLatest 5 candidates from Vieclam24h:');
  console.log(latestVieclamCandidates);

  const requests = await prisma.recruitmentRequest.findMany({
    where: { status: { in: ['Approved', 'Completed'] } },
    select: { id: true, position: true, status: true }
  });

  console.log('\nApproved/Completed Recruitment Requests:');
  console.log(requests);
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
