const fs = require('fs');

const file = '/Users/leanhvan/client-seajong/src/components/logistics/inventory/LogisticsInventory.tsx';
let content = fs.readFileSync(file, 'utf8');

const returnStart = content.indexOf('  return (\n    <div className="d-flex flex-column gap-3" style={{ height: "100%" }}>');
const appCardEnd = content.indexOf('      </div>\n\n      {/* Price Ratio Modal */}');

if (returnStart === -1 || appCardEnd === -1) {
  console.log('Could not find boundaries');
  process.exit(1);
}

const beforeReturn = content.substring(0, returnStart);
const returnBlock = content.substring(returnStart, appCardEnd + 12);
const afterReturn = content.substring(appCardEnd + 12); // right before {/* Price Ratio Modal */}

// Now we transform returnBlock
let newReturnBlock = `  const headerContent = (
    <div className="d-flex flex-column gap-3">
      <div className="d-flex align-items-center justify-content-between mb-0">
        <h6
          className="mb-0 fw-bold text-uppercase d-flex align-items-center gap-2"
          style={{ color: "var(--muted-foreground)", fontSize: 11, letterSpacing: "0.05em", lineHeight: 1 }}
        >
          <i className="bi bi-boxes" style={{ fontSize: 13 }} />
          Danh mục hàng hoá
          <span className="badge bg-danger rounded-pill ms-2" style={{ fontSize: "9px", fontWeight: "bold", padding: "3px 7px", textTransform: "none", letterSpacing: "0.1px" }}>
            Tổng số: {items.length} sản phẩm
          </span>
        </h6>
      </div>

      <div className="d-flex align-items-center gap-3">
        <select
          className="form-select border-0 shadow-sm rounded-pill px-4 text-truncate"
          style={{ width: "160px", fontSize: 13, height: 40, background: "var(--card)", color: "var(--foreground)", border: "1px solid var(--border)" }}
          value={filterWarehouse}
          onChange={(e) => {
            setFilterWarehouse(e.target.value);
            setFilterCategory("");
          }}
        >
          <option value="">Tất cả kho hàng</option>
          {warehouses.map(w => (
            <option key={w.id} value={w.id}>{w.name}</option>
          ))}
        </select>

        <TreeFilterSelect
          options={categoryOptions}
          value={filterCategory}
          onChange={setFilterCategory}
          placeholder="Tất cả danh mục"
          className="rounded-pill shadow-sm"
          width={160}
        />

        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Tìm theo tên, mã SKU hoặc Model..."
          className="flex-grow-1"
          style={{ height: 40 }}
        />
      </div>
    </div>
  );

  const footerContent = (!hideAddButton || selectedIds.length > 0) ? (
    <div className="d-flex align-items-center justify-content-end gap-3 w-100">
      {fromAdmin && isMaterialWarehouse && (
        <button
          className="btn btn-sm btn-danger text-white rounded-pill px-4 fw-bold me-auto"
          style={{ fontSize: 13, height: 32, border: 'none' }}
          onClick={() => setShowPriceModal(true)}
        >
          <i className="bi bi-tag me-2" />
          Cập nhật giá bán
        </button>
      )}

      {selectedIds.length > 0 && (
        <button
          className="btn btn-sm btn-outline-danger rounded-pill px-4 fw-bold"
          style={{ fontSize: 13, height: 32 }}
          onClick={() => setConfirmBulkDelete(true)}
        >
          <i className="bi bi-trash me-2" />
          Xoá {selectedIds.length} đã chọn
        </button>
      )}

      {!hideAddButton && (
        <button
          id="logistics-add-item-btn"
          className="btn btn-sm rounded-pill px-4 fw-bold text-white d-none d-xl-flex align-items-center"
          style={{
            fontSize: 13,
            height: 32,
            backgroundColor: isDefectWarehouse ? "#94a3b8" : "#011F58",
            borderColor: isDefectWarehouse ? "#94a3b8" : "#011F58",
            cursor: isDefectWarehouse ? "not-allowed" : "pointer",
            opacity: isDefectWarehouse ? 0.65 : 1
          }}
          onClick={() => !isDefectWarehouse && setIsAddModalOpen(true)}
          disabled={isDefectWarehouse}
        >
          <i className="bi bi-plus-lg me-2" />
          Thêm hàng hóa
        </button>
      )}
    </div>
  ) : undefined;
`;

// Extract table content
const tableMatch = returnBlock.match(/<table className="table table-hover align-middle mb-0" style={{ fontSize: 13 }}>([\s\S]*?)<\/table>/);
if (!tableMatch) {
  console.log("Could not find table");
  process.exit(1);
}

newReturnBlock += `
  const tableContent = (
    <div className="h-100 overflow-auto custom-scrollbar">
      <table className="table table-hover align-middle mb-0" style={{ fontSize: 13 }}>
${tableMatch[1]}      </table>
    </div>
  );

  return (
    <>
      <FullWidthTableLayout 
        header={headerContent}
        table={tableContent}
        footer={footerContent}
      />

`;

// Extract Modals
const modalsMatch = returnBlock.match(/<AddLogisticsProductModal[\s\S]*?<\/ConfirmDialog>\n/);
if (modalsMatch) {
  newReturnBlock += modalsMatch[0].split('\\n').map(line => '      ' + line).join('\\n') + '\\n';
} else {
  console.log("Could not find modals");
  process.exit(1);
}

fs.writeFileSync(file, beforeReturn + newReturnBlock + afterReturn);
console.log("Success");
