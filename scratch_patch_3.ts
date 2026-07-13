import fs from 'fs';
let content = fs.readFileSync('src/app/(dashboard)/marketing/products/page.tsx', 'utf-8');

// 1. Add variantCount state
if (!content.includes("const [variantCount, setVariantCount] = useState(0);")) {
    content = content.replace("const [syncLog, setSyncLog] = useState<any>(null);", 
        "const [syncLog, setSyncLog] = useState<any>(null);\n  const [variantCount, setVariantCount] = useState(0);");
}

// 2. Fetch variantCount from API
if (!content.includes("setVariantCount(data.variantCount || 0);")) {
    content = content.replace(
        "if (data.log) setSyncLog(data.log);",
        "if (data.log) setSyncLog(data.log);\n      if (data.variantCount !== undefined) setVariantCount(data.variantCount);"
    );
}

// 3. Add handleCancelSync
if (!content.includes("const handleCancelSync = async () => {")) {
    const handleCancelCode = `
  const handleCancelSync = async () => {
    if (!confirm("Bạn có chắc chắn muốn huỷ tiến trình đồng bộ đang chạy?")) return;
    setSyncing(false);
    await fetch("/api/seajong/sync", { method: "DELETE" });
    fetchSyncStatus();
  };
`;
    content = content.replace("const handleSync = async () => {", handleCancelCode + "\n  const handleSync = async () => {");
}

// 4. Modify Close button / Cancel button
if (content.includes("{!isRunning && (")) {
    content = content.replace(
        "{!isRunning && (",
        `{isRunning && (
            <button
              onClick={handleCancelSync}
              title="Huỷ đồng bộ"
              style={{
                width: 30, height: 30, borderRadius: 8,
                border: "1.5px solid var(--border)", background: "transparent",
                cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                color: "var(--danger)", marginRight: 8
              }}
            >
              <i className="bi bi-stop-circle" style={{ fontSize: 14 }} />
            </button>
          )}
          {!isRunning && (`
    );
}

// 5. Add "Số hàng hoá có biến thể: " line below the log message
const variantText = `
          {variantCount > 0 && (
            <div style={{ marginTop: 8, fontSize: 12, color: "var(--muted-foreground)", fontWeight: 500, paddingLeft: 14 }}>
              Số hàng hoá có biến thể: <span style={{ color: "var(--foreground)", fontWeight: 700 }}>{variantCount}</span>
            </div>
          )}
`;
if (!content.includes("Số hàng hoá có biến thể:")) {
    content = content.replace(
        `{syncLog?.message || "Bắt đầu..."}\n            </p>\n          </div>`,
        `{syncLog?.message || "Bắt đầu..."}\n            </p>\n          </div>\n${variantText}`
    );
}

fs.writeFileSync('src/app/(dashboard)/marketing/products/page.tsx', content);
