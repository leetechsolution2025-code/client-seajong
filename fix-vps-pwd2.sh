source scripts/config.sh
SSH_USER="${SSH_USER:-root}"
SSH_DIR="${SSH_DIR:-/root/${APP_NAME}}"
SSH_KEY="${HOME}/.ssh/id_ed25519"
SSH_OPTS="-i ${SSH_KEY} -o StrictHostKeyChecking=no -o PasswordAuthentication=no"

ssh ${SSH_OPTS} "${SSH_USER}@${SSH_HOST}" << 'REMOTESCRIPT'
cd /root/seajong
cat << 'INLINE' > fix-pwd-prod.js
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient({
  datasources: { db: { url: 'file:/root/seajong/prisma/prod.db' } }
});
async function main() {
  const h = await bcrypt.hash('Pass@123', 12);
  const updated = await prisma.user.updateMany({
    where: { email: 'lecongvu@seajong.com' },
    data: { password: h }
  });
  console.log("Updated count:", updated.count);
}
main().then(() => prisma.$disconnect()).catch(console.error);
INLINE
node fix-pwd-prod.js
REMOTESCRIPT
