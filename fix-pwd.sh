source scripts/config.sh
SSH_USER="${SSH_USER:-root}"
SSH_DIR="${SSH_DIR:-/root/${APP_NAME}}"
SSH_KEY="${HOME}/.ssh/id_ed25519"
SSH_OPTS="-i ${SSH_KEY} -o StrictHostKeyChecking=no -o PasswordAuthentication=no"

ssh ${SSH_OPTS} "${SSH_USER}@${SSH_HOST}" << 'REMOTESCRIPT'
cd /root/seajong
npm install bcryptjs
cat << 'INLINE' > reset-pwd.js
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();
async function main() {
  const h = await bcrypt.hash('Pass@123', 12);
  await prisma.user.updateMany({
    where: { email: 'lecongvu@seajong.com' },
    data: { password: h }
  });
  console.log("Password reset successfully for lecongvu@seajong.com");
}
main().then(() => prisma.$disconnect()).catch(console.error);
INLINE
node reset-pwd.js
REMOTESCRIPT
