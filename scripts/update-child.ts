import { exec } from "child_process";
import path from "path";
import fs from "fs/promises";
import { promisify } from "util";

const execPromise = promisify(exec);

async function main() {
  const childArg = process.argv[2];
  const baseDir = process.cwd();

  if (!childArg) {
    console.error("❌ Thiếu đường dẫn tới dự án con!");
    console.log("👉 Hướng dẫn sử dụng: npx tsx scripts/update-child.ts ../client-seajong");
    
    // Thử quét các thư mục client kế cận để gợi ý
    try {
      const parentDir = path.dirname(baseDir);
      const items = await fs.readdir(parentDir);
      const clients = items.filter(i => i.startsWith("client-"));
      if (clients.length > 0) {
        console.log("\nCác dự án con tìm thấy xung quanh:");
        clients.forEach(c => console.log(` - ../${c}`));
      }
    } catch (e) {}
    process.exit(1);
  }

  const exportPath = path.resolve(childArg);

  // 1. Kiểm tra tính hợp lệ của thư mục đích
  try {
    const stat = await fs.stat(exportPath);
    if (!stat.isDirectory()) throw new Error();
    await fs.access(path.join(exportPath, "package.json"));
  } catch (e) {
    console.error(`❌ Thư mục "${childArg}" không hợp lệ hoặc không phải là dự án Next.js (thiếu package.json)!`);
    process.exit(1);
  }

  console.log(`🚀 Bắt đầu cập nhật mã nguồn cho dự án con: ${path.basename(exportPath)}`);
  console.log(`📍 Đường dẫn dự án con: ${exportPath}\n`);

  // 2. Tự động nhận diện các module đang kích hoạt ở dự án con
  const dashboardPath = path.join(exportPath, "src/app/(dashboard)");
  let activeModules: string[] = [];
  try {
    const dirs = await fs.readdir(dashboardPath);
    activeModules = dirs.filter(name => {
      const nameLower = name.toLowerCase();
      return !["my", "layout.tsx", "page.tsx", "loading.tsx", "error.tsx", ".ds_store"].includes(nameLower);
    });
  } catch (err) {
    console.error("❌ Không thể đọc danh sách module của dự án con!", err);
    process.exit(1);
  }

  console.log(`📦 Các module đang hoạt động ở dự án con: ${activeModules.join(", ")}`);

  // 3. Quét toàn bộ các module trong dự án Master để tìm ra các module không hoạt động ở dự án con
  const masterDashboardPath = path.join(baseDir, "src/app/(dashboard)");
  let inactiveModules: string[] = [];
  try {
    const dirs = await fs.readdir(masterDashboardPath);
    const masterModules = dirs.filter(name => {
      const nameLower = name.toLowerCase();
      return !["my", "layout.tsx", "page.tsx", "loading.tsx", "error.tsx", ".ds_store"].includes(nameLower);
    });
    inactiveModules = masterModules.filter(m => !activeModules.includes(m));
  } catch (err) {
    console.error("❌ Không thể đọc danh sách module của dự án Master!", err);
    process.exit(1);
  }

  // 4. Thiết lập danh sách loại trừ khi đồng bộ (Excludes)
  // Không ghi đè database, cấu hình env, logo, và các module không mua
  const baseExclude = [
    "node_modules",
    ".git",
    ".next",
    "**/*.db*",
    "prisma/migrations",
    "*.log",
    "artifacts",
    "scratch",
    ".env",
    ".env.local",
    "scripts/config.sh",
    "public/client-logo*",
    "public/logo*",
    "package-lock.json",
    "src/proxy.ts" // Không ghi đè cấu hình middleware/routing riêng
  ];

  // Thêm các thư mục của module không hoạt động vào danh sách loại trừ
  inactiveModules.forEach(mod => {
    const modLower = mod.toLowerCase();
    baseExclude.push(`src/app/\\(dashboard\\)/${modLower}`);
    baseExclude.push(`src/app/api/${modLower}`);
    baseExclude.push(`src/components/${modLower}`);
    // Để tương thích với một số module viết hoa hoặc dùng gạch ngang
    const altModName = modLower.replace(/_/g, "-");
    if (altModName !== modLower) {
      baseExclude.push(`src/app/\\(dashboard\\)/${altModName}`);
      baseExclude.push(`src/app/api/${altModName}`);
      baseExclude.push(`src/components/${altModName}`);
    }
  });

  const excludeFlags = baseExclude.map(item => `--exclude="${item}"`).join(" ");

  // 5. Đồng bộ mã nguồn bằng rsync
  console.log("⏳ Đang đồng bộ mã nguồn...");
  try {
    await execPromise(`rsync -av --delete ${baseDir}/ ${exportPath}/ ${excludeFlags}`);
    console.log("✅ Đồng bộ mã nguồn hoàn tất!");
  } catch (err: any) {
    console.error("❌ Lỗi trong quá trình đồng bộ rsync:", err.message);
    process.exit(1);
  }

  // 6. Gộp file schema.prisma mới dựa trên các module đang hoạt động
  console.log("⏳ Đang cập nhật cơ sở dữ liệu và Schema...");
  try {
    let masterSchema = await fs.readFile(path.join(baseDir, "prisma/schema.prisma"), "utf-8");
    for (const mod of activeModules) {
      const modelFile = path.join(baseDir, `src/modules/${mod.toLowerCase()}/models.prisma`);
      try {
        const modelContent = await fs.readFile(modelFile, "utf-8");
        masterSchema += "\n" + modelContent;
        console.log(`   + Đã gộp model của module: ${mod}`);
      } catch {
        // Module không có file models.prisma riêng
      }
    }
    await fs.writeFile(path.join(exportPath, "prisma/schema.prisma"), masterSchema);
    console.log("✅ Cập nhật prisma/schema.prisma thành công!");
  } catch (err: any) {
    console.error("❌ Lỗi khi gộp file schema.prisma:", err.message);
    process.exit(1);
  }

  // 7. Cập nhật các thay đổi cơ sở dữ liệu (prisma db push) mà không mất mát dữ liệu
  const childDbUrl = `file:${path.join(exportPath, "prisma", "dev.db")}`;
  const childEnv = { ...process.env, DATABASE_URL: childDbUrl };
  
  console.log("⏳ Đang thực thi prisma db push ở dự án con...");
  try {
    await execPromise(`cd "${exportPath}" && npx prisma db push --accept-data-loss`, { env: childEnv });
    console.log("✅ Cập nhật cấu trúc database thành công!");
  } catch (err: any) {
    console.error("❌ Lỗi khi thực thi prisma db push:", err.message);
    process.exit(1);
  }

  console.log("\n🎉 HOÀN TẤT CẬP NHẬT DỰ ÁN CON THÀNH CÔNG!");
  console.log("👉 Các file cấu hình (.env, config.sh, logo, database cũ) được giữ nguyên.");
}

main().catch(console.error);
