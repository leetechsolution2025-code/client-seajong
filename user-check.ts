import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const user = await prisma.user.findFirst({
    where: { email: 'nguyenthuhuyen@leetech.vn' }
  });
  console.log(user);
}
main();
