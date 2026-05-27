
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const notif = await prisma.notification.findFirst({
    where: {
      title: { contains: '[Yêu cầu xét duyệt]' },
    },
    orderBy: { createdAt: 'desc' },
  });

  if (!notif) {
    console.log('No recruitment notification found');
    return;
  }

  console.log('Found notification:', notif.id, notif.title);

  // Try to find the candidate mention in the content
  // "Danh sách ứng viên:\n• Lê Thị Phương Thảo —"
  const candidateMatch = notif.content.match(/• (.*?) —/);
  if (candidateMatch) {
    const candidateName = candidateMatch[1].trim();
    console.log('Detected candidate name:', candidateName);

    const candidate = await prisma.candidate.findFirst({
      where: { name: candidateName },
      select: { id: true, name: true }
    });

    if (candidate) {
      console.log('Found candidate in DB:', candidate.id);
      
      const decisionData = [{ id: candidate.id, name: candidate.name }];
      const marker = `\n\n[RECRUITMENT_DECISION]:${JSON.stringify(decisionData)}`;
      
      if (!notif.content.includes('[RECRUITMENT_DECISION]')) {
        await prisma.notification.update({
          where: { id: notif.id },
          data: {
            content: notif.content + marker
          }
        });
        console.log('Updated notification with marker');
      } else {
        console.log('Notification already has marker');
      }
    } else {
      console.log('Could not find candidate in DB with name:', candidateName);
    }
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
