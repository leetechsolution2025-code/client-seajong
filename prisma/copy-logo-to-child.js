/**
 * copy-logo-to-child.js
 * Lấy logo từ DB master và copy vào public/ của dự án con.
 * Chạy: node prisma/copy-logo-to-child.js haonhai
 */
const { PrismaClient } = require("@prisma/client");
const fs = require("fs");
const path = require("path");

const prisma = new PrismaClient();
const shortName = process.argv[2];

if (!shortName) {
  console.error("❌ Thiếu shortName. Ví dụ: node copy-logo-to-child.js haonhai");
  process.exit(1);
}

async function main() {
  const client = await prisma.client.findFirst({
    where: { shortName },
    select: { name: true, shortName: true, logoUrl: true },
  });

  if (!client) {
    console.error(`❌ Không tìm thấy client: ${shortName}`);
    return;
  }

  console.log(`Client: ${client.name} (${client.shortName})`);

  if (!client.logoUrl) {
    console.log("⚠️  Client chưa có logo.");
    return;
  }

  // Xác định thư mục đích (dự án con nằm ngang cấp với master-project)
  const masterDir  = process.cwd();
  const parentDir  = path.dirname(masterDir);
  const childDir   = path.join(parentDir, `client-${shortName}`);
  const publicDir  = path.join(childDir, "public");

  if (!fs.existsSync(childDir)) {
    console.error(`❌ Không tìm thấy thư mục dự án con: ${childDir}`);
    return;
  }

  fs.mkdirSync(publicDir, { recursive: true });

  const dataUrlMatch = client.logoUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (dataUrlMatch) {
    const mimeType     = dataUrlMatch[1];
    const ext          = mimeType.split("/")[1]?.replace("jpeg", "jpg") || "png";
    const buffer       = Buffer.from(dataUrlMatch[2], "base64");
    const logoFileName = `client-logo.${ext}`;
    const dest         = path.join(publicDir, logoFileName);
    fs.writeFileSync(dest, buffer);
    console.log(`✅ Logo written to: ${dest}`);
    console.log(`   URL trong app: /${logoFileName}`);
  } else if (client.logoUrl.startsWith("http")) {
    console.log(`ℹ️  Logo là URL thường: ${client.logoUrl}`);
    console.log(`   Tải thủ công và đặt vào: ${path.join(publicDir, "client-logo.png")}`);
  } else {
    console.log("⚠️  logoUrl không phải base64 hay http URL. Bỏ qua.");
  }
}

main()
  .catch((e) => { console.error("❌ Lỗi:", e.message); })
  .finally(() => prisma.$disconnect());
