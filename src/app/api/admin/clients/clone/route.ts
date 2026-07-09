import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { exec } from "child_process";
import path from "path";
import fs from "fs/promises";
import { promisify } from "util";

const execPromise = promisify(exec);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { clientId, selectedModules = ["hr"] } = body;

    if (!clientId) {
      return NextResponse.json({ error: "Missing Client ID" }, { status: 400 });
    }

    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: {
        id: true, name: true, shortName: true,
        logoUrl: true, address: true, slogan: true,
        phone: true, email: true,
        taxCode: true, legalRep: true,
        industryId: true,
        industry: {
          select: {
            id: true,
            code: true,
            name: true,
            rootCategoryCode: true
          }
        },
        users: { where: { role: "ADMIN" }, take: 1, select: { email: true } },
      },
    });

    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    // ── 0. Lấy danh sách phòng ban đã chọn từ DB master ──
    const selectedDeptCodes = selectedModules; // selectedModules là mảng dept codes
    const selectedDepts = await prisma.departmentCategory.findMany({
      where: { code: { in: selectedDeptCodes } },
      orderBy: { sortOrder: "asc" },
    });

    // ── 0b. Lấy danh sách Category & CategoryTypeDef (Master data chung) ──
    const categoryTypes = await prisma.categoryTypeDef.findMany({ orderBy: { sortOrder: "asc" } });
    const categories = await prisma.category.findMany({
      where: { clientId: null }, // Lấy danh mục dùng chung (không có clientId)
      orderBy: { sortOrder: "asc" },
    });

    let filteredCategories = categories;
    if (client && client.industry && client.industry.rootCategoryCode) {
      const rootCode = client.industry.rootCategoryCode;
      const rootCat = categories.find(c => c.type === "vat_tu_san_xuat" && c.code === rootCode);
      if (rootCat) {
        const allowedIds = new Set([rootCat.id]);
        let addedNew = true;
        while (addedNew) {
          addedNew = false;
          for (const c of categories) {
            if (c.type === "vat_tu_san_xuat" && c.parentId && allowedIds.has(c.parentId) && !allowedIds.has(c.id)) {
              allowedIds.add(c.id);
              addedNew = true;
            }
          }
        }
        filteredCategories = categories.filter(c => {
          if (c.type !== "vat_tu_san_xuat") return true;
          return allowedIds.has(c.id);
        });
      }
    }

    const baseDir = process.cwd();
    const parentDir = path.dirname(baseDir);
    const exportName = `client-${client.shortName}`;
    const exportPath = path.join(parentDir, exportName);

    // ── 1. Tạo thư mục đích & Xoá cache cũ ──
    await fs.mkdir(exportPath, { recursive: true });
    await fs.rm(path.join(exportPath, ".next"), { recursive: true, force: true }).catch(() => {});

    // logoStaticPath sẽ được set SAU rsync (sau bước 2)
    let logoStaticPath: string | null = null;

    // ── 2. rsync: copy source, loại bỏ những thứ không cần ──
    const baseExclude = [
      "node_modules",
      ".git",
      ".next",
      "**/*.db*",
      "prisma/migrations",
      "*.log",
      "artifacts",
      "test-prisma.ts",
      "ARCHITECTURE.md",
      // Loại bỏ TOÀN BỘ admin Master (không phải chỉ clients)
      "src/app/admin/",
      "src/app/api/admin/",
      // Loại bỏ proxy.ts master (child sẽ có middleware.ts riêng được generate)
      "src/proxy.ts",
      // Loại bỏ seed files của Master
      "prisma/seed-superadmin.js",
      "prisma/seed-employees.js",
      "prisma/seed-branches.js",  // sẽ được gen riêng từ client data
      "scratch",
      // Loại bỏ các thư mục module dashboard trước (giữ lại layout.tsx, page.tsx tại gốc)
      "src/app/(dashboard)/*/",
    ];

    const excludeFlags = baseExclude.map((item) => `--exclude="${item}"`).join(" ");
    await execPromise(`rsync -av --delete ${baseDir}/ ${exportPath}/ ${excludeFlags}`);

    // ── 2b. Copy logo vào public/ SAU rsync (tránh bị rsync ghi đè) ─────────
    await fs.mkdir(path.join(exportPath, "public"), { recursive: true });
    if (client.logoUrl) {
      try {
        const dataUrlMatch = client.logoUrl.match(/^data:([^;]+);base64,(.+)$/);
        if (dataUrlMatch) {
          // data URL base64 → decode và lưu file
          const mimeType = dataUrlMatch[1];
          const ext = mimeType.split("/")[1]?.replace("jpeg", "jpg") || "png";
          const buffer = Buffer.from(dataUrlMatch[2], "base64");
          const logoFileName = `client-logo.${ext}`;
          await fs.writeFile(path.join(exportPath, "public", logoFileName), buffer);
          logoStaticPath = `/${logoFileName}`;
          console.log(`✅ Logo (base64) → public/${logoFileName}`);
        } else if (client.logoUrl.startsWith("/uploads/")) {
          // Path local /uploads/xxx.png → copy file sang public/ của child cho chắc chắn hiển thị
          const srcFile = path.join(baseDir, "public", client.logoUrl);
          const ext = path.extname(client.logoUrl) || ".png";
          const logoFileName = `logo${ext}`;
          await fs.copyFile(srcFile, path.join(exportPath, "public", logoFileName));
          logoStaticPath = `/${logoFileName}`;
          console.log(`✅ Logo (local) → public/${logoFileName}`);
        } else if (client.logoUrl.startsWith("http")) {
          // Remote URL → download về
          const resp = await fetch(client.logoUrl);
          const contentType = resp.headers.get("content-type") || "image/png";
          const ext = contentType.split("/")[1]?.replace("jpeg", "jpg") || "png";
          const buffer = Buffer.from(await resp.arrayBuffer());
          const logoFileName = `client-logo.${ext}`;
          await fs.writeFile(path.join(exportPath, "public", logoFileName), buffer);
          logoStaticPath = `/${logoFileName}`;
          console.log(`✅ Logo (remote) → public/${logoFileName}`);
        } else if (client.logoUrl.startsWith("/")) {
          // Path tĩnh khác → copy từ public/ master
          const srcFile = path.join(baseDir, "public", client.logoUrl);
          const logoFileName = `client-logo${path.extname(client.logoUrl) || ".png"}`;
          await fs.copyFile(srcFile, path.join(exportPath, "public", logoFileName));
          logoStaticPath = `/${logoFileName}`;
          console.log(`✅ Logo (static) → public/${logoFileName}`);
        }
      } catch (logoErr) {
        console.warn("⚠️  Logo copy failed (non-critical):", logoErr);
      }
    }

    // ── 3. Xóa landing page — client load thẳng vào /login ──
    const clientRootPage = `import { redirect } from "next/navigation";

export default function Home() {
  // Client project: redirect thẳng về trang login
  redirect("/login");
}

export const dynamic = "force-dynamic";
`;
    await fs.writeFile(path.join(exportPath, "src/app/page.tsx"), clientRootPage);

    // ── 4. Copy các Module đã chọn ──
    // Mapping: module code → { apiDirs, componentDirs }
    const MODULE_MAP: Record<string, { apiDirs: string[]; componentDirs: string[] }> = {
      hr:           { apiDirs: ["hr"],           componentDirs: ["hr"] },
      plan_finance: { apiDirs: ["plan-finance"],  componentDirs: ["plan-finance"] },
      sales:        { apiDirs: ["sales"],         componentDirs: ["sales"] },
      finance:      { apiDirs: ["finance"],       componentDirs: ["finance"] },
      marketing:    { apiDirs: ["marketing"],     componentDirs: ["marketing"] },
      logistics:    { apiDirs: ["logistics"],     componentDirs: ["logistics"] },
      purchase:     { apiDirs: ["purchase"],      componentDirs: ["purchase"] },
      qa:           { apiDirs: ["qa"],            componentDirs: ["qa"] },
      production:   { apiDirs: ["production"],    componentDirs: ["production"] },
      it:           { apiDirs: ["it"],            componentDirs: ["it"] },
      legal:        { apiDirs: ["legal"],         componentDirs: ["legal"] },
      ops:          { apiDirs: ["ops"],           componentDirs: ["ops"] },
      rd:           { apiDirs: ["rd"],            componentDirs: ["rd"] },
      cs:           { apiDirs: ["cs"],            componentDirs: ["cs"] },
      bd:           { apiDirs: ["bd"],            componentDirs: ["bd"] },
      pr:           { apiDirs: ["pr"],            componentDirs: ["pr"] },
      board:        { apiDirs: ["board"],         componentDirs: ["board"] },
      exec:         { apiDirs: ["exec"],          componentDirs: ["exec"] },
      admin_ops:    { apiDirs: ["admin-ops"],     componentDirs: ["admin-ops"] },
      facility:     { apiDirs: ["facility"],      componentDirs: ["facility"] },
      security:     { apiDirs: ["security"],      componentDirs: ["security"] },
      product:      { apiDirs: ["product"],       componentDirs: ["product"] },
    };

    for (const mod of selectedModules) {
      const modLower = mod.toLowerCase();
      const mapping = MODULE_MAP[modLower] || { apiDirs: [modLower], componentDirs: [modLower] };

      // App Router pages
      const appSource = path.join(baseDir, `src/app/(dashboard)/${modLower}`);
      const appDest = path.join(exportPath, `src/app/(dashboard)/${modLower}`);
      try {
        await fs.access(appSource);
        await fs.rm(appDest, { recursive: true, force: true }).catch(() => {});
        await fs.mkdir(path.dirname(appDest), { recursive: true });
        await execPromise(`cp -R "${appSource}" "${appDest}"`);
      } catch { console.log(`Module UI ${mod} not found, skipping.`); }

      // API routes
      for (const apiDir of mapping.apiDirs) {
        const apiSrc = path.join(baseDir, `src/app/api/${apiDir}`);
        const apiDst = path.join(exportPath, `src/app/api/${apiDir}`);
        try {
          await fs.access(apiSrc);
          await fs.rm(apiDst, { recursive: true, force: true }).catch(() => {});
          await fs.mkdir(path.dirname(apiDst), { recursive: true });
          await execPromise(`cp -R "${apiSrc}" "${apiDst}"`);
          console.log(`Copied API: /api/${apiDir}`);
        } catch { console.log(`API route /api/${apiDir} not found, skipping.`); }
      }

      // Components
      for (const compDir of mapping.componentDirs) {
        const compSrc = path.join(baseDir, `src/components/${compDir}`);
        const compDst = path.join(exportPath, `src/components/${compDir}`);
        try {
          await fs.access(compSrc);
          await fs.rm(compDst, { recursive: true, force: true }).catch(() => {});
          await fs.mkdir(path.dirname(compDst), { recursive: true });
          await execPromise(`cp -R "${compSrc}" "${compDst}"`);
          console.log(`Copied components: ${compDir}`);
        } catch { console.log(`Components ${compDir} not found, skipping.`); }
      }
    }

    // ── 4b. Copy /company admin panel (luôn luôn, mọi child đều cần) ──
    const companyAppSrc = path.join(baseDir, "src/app/company");
    const companyAppDst = path.join(exportPath, "src/app/company");
    try {
      await fs.access(companyAppSrc);
      await fs.rm(companyAppDst, { recursive: true, force: true }).catch(() => {});
      await execPromise(`cp -R "${companyAppSrc}" "${companyAppDst}"`);
      console.log(`Copied /company admin panel`);
    } catch { console.log(`src/app/company not found, skipping.`); }

    // Copy /api/company
    const companyApiSrc = path.join(baseDir, "src/app/api/company");
    const companyApiDst = path.join(exportPath, "src/app/api/company");
    try {
      await fs.access(companyApiSrc);
      await fs.rm(companyApiDst, { recursive: true, force: true }).catch(() => {});
      await execPromise(`cp -R "${companyApiSrc}" "${companyApiDst}"`);
      console.log(`Copied /api/company routes`);
    } catch { console.log(`src/app/api/company not found, skipping.`); }

    // ── 4c. Copy /my/* (trang dùng chung: tasks cá nhân, chấm công, yêu cầu nghỉ phép) ──
    // Đây là các trang cá nhân — không thuộc phòng ban cụ thể nào — nên LUÔN LUÔN được copy
    const myAppSrc = path.join(baseDir, "src/app/(dashboard)/my");
    const myAppDst = path.join(exportPath, "src/app/(dashboard)/my");
    try {
      await fs.access(myAppSrc);
      await fs.rm(myAppDst, { recursive: true, force: true }).catch(() => {});
      await fs.mkdir(path.dirname(myAppDst), { recursive: true });
      await execPromise(`cp -R "${myAppSrc}" "${myAppDst}"`);
      console.log(`Copied /my (personal pages: tasks, attendance, leave-request)`);
    } catch { console.log(`src/app/(dashboard)/my not found, skipping.`); }

    // Copy các API shared (dùng chung cho mọi module)
    const sharedApiDirs = [
      "approvals",     // Phê duyệt
      "notifications", // Thông báo
      "messages",      // Tin nhắn nội bộ
      "me",            // Thông tin user hiện tại
      "user",          // User profile
      "client",        // Thông tin client
      "upload",        // Upload file/logo
    ];
    for (const apiDir of sharedApiDirs) {
      const sharedApiSrc = path.join(baseDir, `src/app/api/${apiDir}`);
      const sharedApiDst = path.join(exportPath, `src/app/api/${apiDir}`);
      try {
        await fs.access(sharedApiSrc);
        await fs.rm(sharedApiDst, { recursive: true, force: true }).catch(() => {});
        await fs.mkdir(path.dirname(sharedApiDst), { recursive: true });
        await execPromise(`cp -R "${sharedApiSrc}" "${sharedApiDst}"`);
        console.log(`Copied shared API: /api/${apiDir}`);
      } catch { console.log(`Shared API /api/${apiDir} not found, skipping.`); }
    }


    // ── 5. Stitch schema.prisma với models của các module đã chọn ──
    let masterSchema = await fs.readFile(path.join(baseDir, "prisma/schema.prisma"), "utf-8");
    for (const mod of selectedModules) {
      const modelFile = path.join(baseDir, `src/modules/${mod.toLowerCase()}/models.prisma`);
      try {
        const modelContent = await fs.readFile(modelFile, "utf-8");
        masterSchema += "\n" + modelContent;
      } catch {
        console.log(`No prisma models for ${mod}`);
      }
    }
    await fs.writeFile(path.join(exportPath, "prisma/schema.prisma"), masterSchema);

    // ── 6. Tạo .env cho dự án con ──
    const secret = `${client.shortName}-secret-${Date.now()}`;
    const geminiKeys = process.env.GEMINI_API_KEYS ?? "";
    const envContent = [
      `DATABASE_URL="file:./dev.db"`,
      `NEXTAUTH_SECRET="${secret}"`,
      `NEXTAUTH_URL="http://localhost:3001"`,
      `CLIENT_SHORT_NAME="${client.shortName}"`,
      `CLIENT_NAME="${client.name}"`,
      `# Biến public — để app detect đây là child project (không hardcode trong code)`,
      `NEXT_PUBLIC_CLIENT_SHORT_NAME="${client.shortName}"`,
      `# Trí tuệ nhân tạo — kế thừa từ master khi export`,
      `GEMINI_API_KEYS="${geminiKeys}"`,
    ].join("\n");
    await fs.writeFile(path.join(exportPath, ".env"), envContent);
    await fs.writeFile(path.join(exportPath, ".env.local"), envContent);

    // Xóa prisma.config.ts nếu có
    try { await fs.unlink(path.join(exportPath, "prisma.config.ts")); } catch { /* ok */ }

    // ── 7. Sinh seed-departments.js động — CHỈ CÁC DEPT ĐÃ CHỌN ──
    const deptsArray = selectedDepts.map((d) => ({
      code: d.code,
      nameVi: d.nameVi,
      nameEn: d.nameEn,
      group: d.group,
      icon: d.icon || "bi-diagram-3",
      sortOrder: d.sortOrder,
    }));

    const seedDepartmentsScript = `/**
 * seed-departments.js — Auto-generated for client: ${client.shortName}
 * Chỉ chứa các phòng ban được chọn lúc export.
 * Tổng: ${deptsArray.length} phòng ban.
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const departments = ${JSON.stringify(deptsArray, null, 2)};

async function main() {
  console.log('🌱 Seeding department categories...');
  let created = 0;
  for (const dept of departments) {
    await prisma.departmentCategory.upsert({
      where: { code: dept.code },
      update: {},
      create: dept,
    });
    created++;
  }
  console.log(\`✅ Done: \${created} departments upserted.\`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
`;
    await fs.writeFile(path.join(exportPath, "prisma/seed-departments.js"), seedDepartmentsScript);

    // ── 7b. Sinh seed-company-info.js ──
    const seedCompanyInfoScript = `/**
 * seed-company-info.js — Auto-generated for client: ${client.shortName}
 * Khởi tạo CompanyInfo cho dự án con. Chạy 1 lần khi setup.
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const companyData = {
  name:      ${JSON.stringify(client.name)},
  shortName: ${JSON.stringify(client.shortName)},
  slogan:    ${JSON.stringify(client.slogan || "")},
  logoUrl:   ${JSON.stringify((logoStaticPath || client.logoUrl || "").startsWith("/") || (logoStaticPath || client.logoUrl || "").startsWith("http") || (logoStaticPath || client.logoUrl || "").startsWith("data:") ? (logoStaticPath || client.logoUrl || "") : "/" + (logoStaticPath || client.logoUrl || ""))},
  address:   ${JSON.stringify((client as any).address  || "")},
  phone:     ${JSON.stringify((client as any).phone    || "")},
  email:     ${JSON.stringify((client as any).email    || "")},
  taxCode:   ${JSON.stringify((client as any).taxCode  || "")},
  legalRep:  ${JSON.stringify((client as any).legalRep || "")},
};

async function main() {
  console.log('\u{1F331} Seeding CompanyInfo for: ' + companyData.name);
  const existing = await prisma.companyInfo.findFirst();
  if (existing) {
    await prisma.companyInfo.update({ where: { id: existing.id }, data: companyData });
    console.log('\u2705 CompanyInfo updated.');
  } else {
    await prisma.companyInfo.create({ data: companyData });
    console.log('\u2705 CompanyInfo created.');
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$\disconnect());
`;
    await fs.writeFile(path.join(exportPath, "prisma/seed-company-info.js"), seedCompanyInfoScript);

    // ── 7c. Sinh seed-branches.js ── query branches của client này
    const clientBranches = await prisma.branch.findMany({
      where: { clientId: client.id },
      orderBy: { sortOrder: "asc" },
    });
    const branchesArray = clientBranches.map(b => ({
      code: b.code, name: b.name, shortName: b.shortName,
      address: b.address, phone: b.phone, email: b.email,
      status: b.status, sortOrder: b.sortOrder,
    }));
    const seedBranchesScript = `/**
 * seed-branches.js — Auto-generated for client: ${client.shortName}
 * Khởi tạo chi nhánh. Chạy 1 lần khi setup.
 * Tổng: ${branchesArray.length} chi nhánh.
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const branches = ${JSON.stringify(branchesArray, null, 2)};

async function main() {
  if (branches.length === 0) { console.log('\u2139\ufe0f  Không có chi nhánh'); return; }
  console.log('\u{1F331} Seeding ' + branches.length + ' branches...');
  for (const b of branches) {
    await prisma.branch.upsert({ where: { code: b.code }, update: b, create: b });
    console.log('  \u2705 ' + b.name);
  }
  console.log('\u2705 Branches seeded.');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
`;
    await fs.writeFile(path.join(exportPath, "prisma/seed-branches.js"), seedBranchesScript);

    // ── 7d. Sinh seed-categories.js (Danh mục chung) ──
    const seedCategoriesScript = `/**
 * seed-categories.js — Auto-generated cho client: ${client.shortName}
 * Khởi tạo dữ liệu danh mục Master (CategoryTypeDef & Category)
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const categoryTypes = ${JSON.stringify(categoryTypes, null, 2)};
const categories = ${JSON.stringify(filteredCategories, null, 2)};

async function main() {
  console.log('🌱 Seeding Category Types...');
  let createdTypes = 0;
  for (const t of categoryTypes) {
    await prisma.categoryTypeDef.upsert({ where: { value: t.value }, update: t, create: t });
    createdTypes++;
  }

  console.log('🌱 Seeding Categories...');
  // Chạy 2 lần: Lần 1 cho Parent, lần 2 cho Child (để không bị lỗi Foreign Key)
  let createdCats = 0;
  for (const c of categories) {
    if (!c.parentId) {
      await prisma.category.upsert({ where: { id: c.id }, update: c, create: c });
      createdCats++;
    }
  }
  for (const c of categories) {
    if (c.parentId) {
      await prisma.category.upsert({ where: { id: c.id }, update: c, create: c });
      createdCats++;
    }
  }
  console.log(\`✅ Done: \${createdTypes} types, \${createdCats} categories seeded.\`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
`;
    await fs.writeFile(path.join(exportPath, "prisma/seed-categories.js"), seedCategoriesScript);

    // ── 8. Sinh seed-admin.js — 1 tài khoản Admin doanh nghiệp ──
    const adminEmail = `admin@${client.shortName}.vn`;
    const rawLogo = logoStaticPath || client.logoUrl || "";
    const normalizedLogo = (rawLogo.startsWith("/") || rawLogo.startsWith("http") || rawLogo.startsWith("data:")) ? rawLogo : "/" + rawLogo;
    const logoUrlForSeed = normalizedLogo ? `'${normalizedLogo}'` : "null";
    const seedAdminScript = `/**
 * seed-admin.js — Auto-generated for client: ${client.shortName}
 * Tạo tài khoản Admin doanh nghiệp duy nhất.
 * Doanh nghiệp dùng tài khoản này để đăng nhập lần đầu.
 *
 * Email:    ${adminEmail}
 * Password: Admin@123
 */
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  const clientShortName = process.env.CLIENT_SHORT_NAME || '${client.shortName}';
  const clientName = process.env.CLIENT_NAME || '${client.name}';
  const adminEmail = '${adminEmail}';
  const adminPassword = 'Admin@123';
  // Logo đã được copy vào public/ khi export — chỉ cần lưu path tĩnh vào DB
  const logoUrl = ${logoUrlForSeed};

  console.log(\`🌱 Seeding enterprise admin for: \${clientName}\`);

  const hashed = await bcrypt.hash(adminPassword, 12);

  // Seed industry if it exists
  let industryRecord = null;
  ${client.industry ? `
  industryRecord = await prisma.industry.upsert({
    where: { code: ${JSON.stringify(client.industry.code)} },
    update: { name: ${JSON.stringify(client.industry.name)}, rootCategoryCode: ${JSON.stringify(client.industry.rootCategoryCode)} },
    create: {
      code: ${JSON.stringify(client.industry.code)},
      name: ${JSON.stringify(client.industry.name)},
      rootCategoryCode: ${JSON.stringify(client.industry.rootCategoryCode)}
    }
  });
  ` : ''}

  // Đảm bảo Client record tồn tại (với logo và industryId)
  const clientRecord = await prisma.client.upsert({
    where: { shortName: clientShortName },
    update: { logoUrl, industryId: industryRecord ? industryRecord.id : null },
    create: {
      name: clientName,
      shortName: clientShortName,
      status: 'active',
      logoUrl,
      industryId: industryRecord ? industryRecord.id : null,
    },
  });

  // Tạo Admin doanh nghiệp (duy nhất)
  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      password: hashed,
      name: \`\${clientName} — Admin\`,
      role: 'ADMIN',
      clientId: clientRecord.id,
    },
  });

  console.log('');
  console.log('✅ Enterprise Admin seeded successfully!');
  console.log('   Client  :', clientRecord.name, \`(\${clientRecord.shortName})\`);
  console.log('   Email   :', admin.email);
  console.log('   Logo    :', logoUrl || '(none)');
  console.log('   Password: Admin@123');
  console.log('');
  console.log('👉 Đăng nhập tại /login để bắt đầu thiết lập hệ thống.');
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => { console.error('❌ Seed error:', e); prisma.$disconnect(); process.exit(1); });
`;
    await fs.writeFile(path.join(exportPath, "prisma/seed-admin.js"), seedAdminScript);

    // ── Sinh seed.ts đúng cho dự án con (ghi đè bản bị rsync từ master) ──
    const seedTsScript = `/**
 * seed.ts — Dự án con (${exportName})
 * Chỉ seed modules cơ bản. Không tạo superadmin.
 *
 * Thứ tự seed đầy đủ (npm run setup):
 *   1. seed.ts              → modules
 *   2. seed-departments.js  → phòng ban đã chọn
 *   3. seed-admin.js        → 1 tài khoản admin doanh nghiệp
 */
import { PrismaClient } from "@prisma/client";
import "dotenv/config";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding modules for child project...");

  const modules = [
    { name: "Core", description: "Hệ thống quản trị lõi (Người dùng, Phân quyền, Tổ chức)" },
    { name: "HR",   description: "Quản trị nhân sự và Sơ đồ tổ chức" },
  ];

  for (const module of modules) {
    await prisma.module.upsert({
      where: { name: module.name },
      update: {},
      create: module,
    });
  }

  console.log(\`✅ Modules seeded: \${modules.map((m) => m.name).join(", ")}\`);
  console.log("Seed complete.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
`;
    await fs.writeFile(path.join(exportPath, "prisma/seed.ts"), seedTsScript);

    // Xóa seed-employees.js cũ khỏi dự án con (không nên có)
    try { await fs.unlink(path.join(exportPath, "prisma/seed-employees.js")); } catch { /* ok nếu không tồn tại */ }
    // Xóa seed-superadmin.js khỏi dự án con (chỉ dùng cho master)
    try { await fs.unlink(path.join(exportPath, "prisma/seed-superadmin.js")); } catch { /* ok */ }

    // ── 9. Cập nhật package.json của dự án con ──
    const pkgPath = path.join(exportPath, "package.json");
    const pkgRaw = await fs.readFile(pkgPath, "utf-8");
    const pkg = JSON.parse(pkgRaw);
    pkg.name = exportName;
    pkg.scripts = {
      ...pkg.scripts,
      setup: "npx prisma db push --accept-data-loss && npx tsx prisma/seed.ts && node prisma/seed-departments.js && node prisma/seed-company-info.js && node prisma/seed-branches.js && node prisma/seed-categories.js && node prisma/seed-inventory-v2.js && node prisma/seed-admin.js",
      "start:fresh": "npm install && npm run setup && npm run dev",
    };
    pkg.prisma = { seed: "npx tsx prisma/seed.ts" };
    await fs.writeFile(pkgPath, JSON.stringify(pkg, null, 2));

    // ── 10. npm install + db push + seed ──
    // ⚠️ QUAN TRỌNG: Phải truyền DATABASE_URL rõ ràng vào child process.
    // Nếu không, node sẽ kế thừa DATABASE_URL từ Master process
    // và seed sẽ ghi data Hào Nhài / client vào DB của MASTER!
    const childDbUrl = `file:${path.join(exportPath, "prisma", "dev.db")}`;
    const childEnv = { ...process.env, DATABASE_URL: childDbUrl };

    console.log("Installing dependencies...");
    await execPromise(`cd "${exportPath}" && npm install --prefer-offline --silent`, { env: childEnv });
    await execPromise(`cd "${exportPath}" && npx prisma db push --accept-data-loss`, { env: childEnv });

    console.log("Seeding: modules...");
    await execPromise(`cd "${exportPath}" && npx tsx prisma/seed.ts`, { env: childEnv });
    console.log("Seeding: departments...");
    await execPromise(`cd "${exportPath}" && node prisma/seed-departments.js`, { env: childEnv });
    console.log("Seeding: company info...");
    await execPromise(`cd "${exportPath}" && node prisma/seed-company-info.js`, { env: childEnv });
    console.log("Seeding: branches...");
    await execPromise(`cd "${exportPath}" && node prisma/seed-branches.js`, { env: childEnv });
    console.log("Seeding: categories...");
    await execPromise(`cd "${exportPath}" && node prisma/seed-categories.js`, { env: childEnv });
    console.log("Seeding: inventory...");
    await execPromise(`cd "${exportPath}" && node prisma/seed-inventory-v2.js`, { env: childEnv });
    console.log("Seeding: enterprise admin...");
    await execPromise(`cd "${exportPath}" && node prisma/seed-admin.js`, { env: childEnv });

    // ── 11. Copy và Cấu hình scripts deploy cho dự án con ──
    const scriptsSrc = path.join(baseDir, "scripts");
    const scriptsDst = path.join(exportPath, "scripts");
    try {
      await fs.access(scriptsSrc);
      // rsync đã copy rồi nhưng ta đảm bảo các file chuẩn được cập nhật
      await execPromise(`cp -R "${scriptsSrc}" "${exportPath}/"`);
      
      // Tự động generate file config.sh chuẩn cho dự án con
      // Tìm port trống (đơn giản nhất là lấy mặc định 3001 hoặc dựa trên ID)
      const childPort = 3000 + (Math.floor(Math.random() * 1000)); 
      const childDomain = `${client.shortName.toLowerCase()}.leetech.vn`;
      
      const configShContent = `#!/bin/bash
# =============================================================
# Cấu hình Deploy cho dự án: ${client.name}
# =============================================================

APP_NAME="${exportName}"
PORT=${childPort}
DOMAIN="${childDomain}"

# Nginx config path
NGINX_CONF="/etc/nginx/sites-available/\${APP_NAME}"

# Log file
LOG_FILE="/var/log/deploy_\${APP_NAME}.log"

# Cấu hình SSH để deploy từ máy cá nhân lên server (cho lệnh update.sh)
SSH_HOST=""
SSH_USER="root"
SSH_DIR="/root/${client.shortName.toLowerCase()}"
`;
      await fs.writeFile(path.join(exportPath, "scripts/config.sh"), configShContent);
      
      // Fix các file script khác nếu còn hardcode (loại bỏ seajong/haonhai nếu lọt lưới)
      try {
        await execPromise(`grep -rl "seajong" "${exportPath}/scripts" | xargs sed -i '' 's/seajong/${client.shortName}/g' 2>/dev/null || true`);
        await execPromise(`grep -rl "haonhai" "${exportPath}/scripts" | xargs sed -i '' 's/haonhai/${client.shortName}/g' 2>/dev/null || true`);
      } catch (e) { /* ignore sed errors */ }

      console.log(`✅ Generated scripts/config.sh (Port: ${childPort}, Domain: ${childDomain})`);
    } catch (err) {
      console.warn("⚠️  Scripts copy/config failed:", err);
    }

    // ── 12. Sinh proxy.ts cho child project ──
    // ⚠️ Next.js 16+ đã chuyển convention từ middleware.ts sang proxy.ts.
    // Nếu đặt tên cũ (middleware.ts) sẽ bị cảnh báo deprecation.
    const childMiddlewareContent = `import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function proxy(req) {
    const { token } = req.nextauth;
    const pathname = req.nextUrl.pathname;

    // /company: chỉ ADMIN được vào
    if (pathname.startsWith("/company")) {
      if (token?.role !== "ADMIN") {
        return NextResponse.redirect(new URL("/login", req.url));
      }
    }

    return NextResponse.next();
  },
  {
    callbacks: { authorized: ({ token }) => !!token },
    pages: { signIn: "/login" },
  }
);

export const config = {
  matcher: [
    "/company/:path*",
    "/my/:path*",
    ${selectedModules.map((m: string) => `"/${m.toLowerCase()}/:path*"`).join(",\n    ")},
  ],
};
`;
    await fs.mkdir(path.join(exportPath, "src"), { recursive: true });
    await fs.writeFile(path.join(exportPath, "src/proxy.ts"), childMiddlewareContent);
    console.log("✅ Generated src/proxy.ts for child project");

    // ── 12. Seed tài khoản bí mật (seed-client.js — chạy sau cùng, không ghi log ra) ──
    const seedClientPath = path.join(exportPath, "prisma/seed-client.js");
    try {
      await fs.access(seedClientPath);
      await execPromise(`cd "${exportPath}" && node prisma/seed-client.js`, { env: childEnv });
    } catch { /* seed-client.js không tồn tại — bỏ qua */ }

    return NextResponse.json({
      success: true,
      message: `Export thành công! Dự án: ${client.name} (${client.shortName})`,
      path: exportPath,
      adminEmail,
      adminPassword: "Admin@123",
      selectedDepts: deptsArray.length,
    });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Export error:", message);
    return NextResponse.json({ error: "Export thất bại", details: message }, { status: 500 });
  }
}
