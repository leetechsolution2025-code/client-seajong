import fs from 'fs';
let content = fs.readFileSync('src/app/(dashboard)/marketing/products/page.tsx', 'utf-8');

// Fix line 115 back to fetchStatus
content = content.replace("useEffect(() => { fetchSyncStatus(); }, []);", "useEffect(() => { fetchStatus(); }, []);");

// Remove handleCancelSync from SyncPanel
const handleCancelRegex = /const handleCancelSync = async \(\) => \{[\s\S]*?fetchSyncStatus\(\);\n  \};\n\n  /;
content = content.replace(handleCancelRegex, "");

// Fix fetchSyncStatus back to fetchStatus inside SyncPanel's handleSync
content = content.replace(
  /const handleSync = async \(\) => \{\n    setSyncing\(true\);\n    await fetch\("\/api\/seajong\/sync", \{ method: "POST" \}\);\n    fetchSyncStatus\(\);\n  \};/,
  \`const handleSync = async () => {
    setSyncing(true);
    await fetch("/api/seajong/sync", { method: "POST" });
    fetchStatus();
  };\`
);

// Add handleCancelSync to MarketingProductsPage
const handleCancelCode = \`
  const handleCancelSync = async () => {
    if (!confirm("Bạn có chắc chắn muốn huỷ tiến trình đồng bộ đang chạy?")) return;
    setSyncing(false);
    await fetch("/api/seajong/sync", { method: "DELETE" });
    fetchSyncStatus();
  };
\`;
if (!content.includes("handleCancelSync = async () => {") && content.includes("const handleSync = async () => {\\n    setShowSyncModal")) {
    content = content.replace(
      'const handleSync = async () => {\\n    setShowSyncModal(true);', 
      handleCancelCode + '\\n  const handleSync = async () => {\\n    setShowSyncModal(true);'
    );
}

// Add variantCount extraction in fetchSyncStatus if missing
if (!content.includes("setVariantCount(d.variantCount)")) {
    content = content.replace(
      "setSyncing(d.log?.status === \\"running\\");",
      "setSyncing(d.log?.status === \\"running\\");\\n      if (d.variantCount !== undefined) setVariantCount(d.variantCount);"
    );
}

fs.writeFileSync('src/app/(dashboard)/marketing/products/page.tsx', content);
