const fs = require('fs');

// 1. Fix BOM page
let bomFile = 'src/app/(dashboard)/production/bom/page.tsx';
if (fs.existsSync(bomFile)) {
  let content = fs.readFileSync(bomFile, 'utf-8');
  content = content.replace(/r\.material\?\.category\?\.code/g, "(r.material?.erpCategory?.code || r.material?.category?.code)");
  content = content.replace(/row\.material\?\.category\?\.code/g, "(row.material?.erpCategory?.code || row.material?.category?.code)");
  content = content.replace(/row\.material\?\.category\?\.id/g, "(row.material?.erpCategory?.id || row.material?.category?.id)");
  fs.writeFileSync(bomFile, content);
  console.log("Fixed BOM page");
}

// 2. Fix TaoDonHangModal
let quoteFile = 'src/components/plan-finance/bao_gia/TaoDonHangModal.tsx';
if (fs.existsSync(quoteFile)) {
  let content = fs.readFileSync(quoteFile, 'utf-8');
  content = content.replace(/alternativeTarget\?\.material\?\.category\?\.code/g, "(alternativeTarget?.material?.erpCategory?.code || alternativeTarget?.material?.category?.code)");
  fs.writeFileSync(quoteFile, content);
  console.log("Fixed TaoDonHangModal");
}

// 3. Fix InventoryManagement
let invFile = 'src/components/finance/InventoryManagement.tsx';
if (fs.existsSync(invFile)) {
  let content = fs.readFileSync(invFile, 'utf-8');
  content = content.replace(
    /\{row\.category\?\.name \|\| "Chưa phân loại"\}/g,
    "{isMaterial ? (row.erpCategory?.name ? `${row.erpCategory.name} (PM: ${row.erpCategory.code || 'N/A'})` : 'Chưa phân loại') : (row.category?.name || 'Chưa phân loại')}"
  );
  content = content.replace(
    /title=\{row\.category\?\.name\}/g,
    "title={isMaterial ? row.erpCategory?.name : row.category?.name}"
  );
  fs.writeFileSync(invFile, content);
  console.log("Fixed InventoryManagement");
}
