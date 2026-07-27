source scripts/config.sh
SSH_USER="${SSH_USER:-root}"
SSH_DIR="${SSH_DIR:-/root/${APP_NAME}}"
SSH_KEY="${HOME}/.ssh/id_ed25519"
SSH_OPTS="-i ${SSH_KEY} -o StrictHostKeyChecking=no -o PasswordAuthentication=no"

ssh ${SSH_OPTS} "${SSH_USER}@${SSH_HOST}" << 'REMOTESCRIPT'
cd /root/seajong
cat << 'INLINE' > get-users.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const users = await prisma.user.findMany({ select: { email: true, password: true } });
  console.log("Users:", users);
  const clients = await prisma.client.findMany();
  console.log("Clients:", clients);
}
main().then(() => prisma.$disconnect()).catch(console.error);
INLINE
node get-users.js
REMOTESCRIPT
