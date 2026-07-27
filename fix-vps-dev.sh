source scripts/config.sh
SSH_USER="${SSH_USER:-root}"
SSH_DIR="${SSH_DIR:-/root/${APP_NAME}}"
SSH_KEY="${HOME}/.ssh/id_ed25519"
SSH_OPTS="-i ${SSH_KEY} -o StrictHostKeyChecking=no -o PasswordAuthentication=no"

ssh ${SSH_OPTS} "${SSH_USER}@${SSH_HOST}" << 'REMOTESCRIPT'
cd /root/seajong
cat << 'INLINE' > fix-users.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  datasources: { db: { url: 'file:/root/seajong/prisma/dev.db' } }
});
async function main() {
  const users = await prisma.user.findMany({ select: { email: true, role: true } });
  console.log("Found users in dev.db:", users.map(u => u.email));
}
main().then(() => prisma.$disconnect()).catch(console.error);
INLINE
node fix-users.js
REMOTESCRIPT
