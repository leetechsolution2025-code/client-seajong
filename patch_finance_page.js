const fs = require('fs');

const path = 'src/app/(dashboard)/finance/page.tsx';
let code = fs.readFileSync(path, 'utf8');

// Add Table import if needed
if (!code.includes('import { Table')) {
  code = code.replace(
    'import { SectionTitle } from "@/components/ui/SectionTitle";',
    'import { SectionTitle } from "@/components/ui/SectionTitle";\nimport { Table } from "@/components/ui/Table";'
  );
}

// Add state for offcanvas
if (!code.includes('showItemsOffcanvas')) {
  code = code.replace(
    'const [selectedOrder, setSelectedOrder] = useState<any | null>(null);',
    `const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [showItemsOffcanvas, setShowItemsOffcanvas] = useState(false);
  const [orderDetails, setOrderDetails] = useState<any[]>([]);
  const [fetchingDetails, setFetchingDetails] = useState(false);

  const handleViewItems = async () => {
    if (!selectedOrder) return;
    setShowItemsOffcanvas(true);
    setFetchingDetails(true);
    setOrderDetails([]);
    try {
      let items: any[] = [];
      if (selectedOrder.type === "contract") {
        const res = await fetch(\`/api/plan-finance/contracts/\${selectedOrder.id}\`);
        if (res.ok) {
          const detail = await res.json();
          items = (detail.quotation?.items ?? []).map((it: any) => ({ name: it.tenHang, qty: it.soLuong, unit: it.donVi }));
        }
      } else if (selectedOrder.type === "retail-invoice") {
        const res = await fetch(\`/api/plan-finance/retail-invoices/\${selectedOrder.id}\`);
        if (res.ok) {
          const detail = await res.json();
          items = (detail.items ?? []).map((it: any) => ({ name: it.tenHang, qty: it.soLuong, unit: it.dvt }));
        }
      } else if (selectedOrder.type === "sale-order") {
        const res = await fetch(\`/api/plan-finance/sales/\${selectedOrder.id}\`);
        if (res.ok) {
          const detail = await res.json();
          items = (detail.saleOrderItems ?? []).map((it: any) => ({ name: it.tenHang, qty: it.soLuong, unit: it.inventoryItem?.donVi }));
        }
      }
      setOrderDetails(items);
    } catch (error) {
      console.error(error);
    } finally {
      setFetchingDetails(false);
    }
  };`
  );
}

// Update the customer name line to be flex-between and add button
const targetHtml = `<div className="d-flex align-items-center gap-2 mb-1">
                              <span className="fw-semibold text-dark">{selectedOrder.customer?.name || "Khách vãng lai"}</span>
                              {(!selectedOrder.customer || selectedOrder.customer.id === null) && (
                                <span 
                                  className="badge bg-success bg-opacity-10 text-success fw-bold px-2 py-0.5 rounded-pill d-inline-flex align-items-center gap-1"
                                  style={{ fontSize: "10px", border: "1px solid rgba(25, 135, 84, 0.2)" }}
                                >
                                  <i className="bi bi-plus-circle" style={{ fontSize: "9px" }} />
                                  Khách vãng lai
                                </span>
                              )}
                            </div>`;

const replacementHtml = `<div className="d-flex align-items-center justify-content-between mb-1 w-100">
                              <div className="d-flex align-items-center gap-2">
                                <span className="fw-semibold text-dark">{selectedOrder.customer?.name || "Khách vãng lai"}</span>
                                {(!selectedOrder.customer || selectedOrder.customer.id === null) && (
                                  <span 
                                    className="badge bg-success bg-opacity-10 text-success fw-bold px-2 py-0.5 rounded-pill d-inline-flex align-items-center gap-1"
                                    style={{ fontSize: "10px", border: "1px solid rgba(25, 135, 84, 0.2)" }}
                                  >
                                    <i className="bi bi-plus-circle" style={{ fontSize: "9px" }} />
                                    Khách vãng lai
                                  </span>
                                )}
                              </div>
                              <button
                                className="btn btn-sm btn-outline-primary py-0 px-2 flex-shrink-0"
                                style={{ fontSize: "11px", height: "24px" }}
                                onClick={handleViewItems}
                              >
                                <i className="bi bi-box-seam me-1"></i> Xem hàng hoá
                              </button>
                            </div>`;

code = code.replace(targetHtml, replacementHtml);

// Add the Offcanvas at the end before final closing div
const offcanvasHtml = `
      {/* Items Offcanvas */}
      {showItemsOffcanvas && (
        <div className="offcanvas-backdrop fade show" onClick={() => setShowItemsOffcanvas(false)} style={{ zIndex: 1060 }}></div>
      )}
      <div 
        className={\`offcanvas offcanvas-end \${showItemsOffcanvas ? 'show' : ''}\`} 
        tabIndex={-1} 
        style={{ width: 400, zIndex: 1065 }}
      >
        <div className="offcanvas-header border-bottom px-4 py-3 bg-light">
          <div>
            <h5 className="offcanvas-title fw-bold mb-1">Chi tiết hàng hoá</h5>
            <div className="text-muted" style={{ fontSize: 13 }}>
              {selectedOrder?.typeLabel} {selectedOrder?.code}
            </div>
          </div>
          <button type="button" className="btn-close" onClick={() => setShowItemsOffcanvas(false)}></button>
        </div>
        <div className="offcanvas-body p-0 custom-scrollbar bg-white">
          <div className="p-4">
            {fetchingDetails ? (
              <div className="text-center p-4 text-muted">
                <div className="spinner-border spinner-border-sm me-2"></div>
                Đang tải dữ liệu...
              </div>
            ) : orderDetails.length > 0 ? (
              <div>
                <Table
                  rows={orderDetails}
                  columns={[
                    { header: "Sản phẩm", render: (row: any) => <span className="fw-medium text-dark">{row.name}</span>, width: "70%" },
                    { header: "SL", render: (row: any) => <div className="text-end fw-bold text-primary">{row.qty} <span className="fw-normal text-muted" style={{ fontSize: 11 }}>{row.unit || "cái"}</span></div>, align: "right", width: "30%" }
                  ]}
                  fixedLayout={false}
                  fontSize={12}
                  wrapperClassName="border rounded-3"
                  wrapperStyle={{ overflowX: "hidden" }}
                />
              </div>
            ) : (
              <div className="text-center p-4 text-muted border border-dashed rounded-3">
                Không tìm thấy hàng hoá nào
              </div>
            )}
          </div>
        </div>
        <div className="offcanvas-footer p-3 border-top bg-light">
          <button className="btn btn-secondary w-100" onClick={() => setShowItemsOffcanvas(false)}>
            Đóng
          </button>
        </div>
      </div>
`;

code = code.replace(
  '    </div>\n  );\n}',
  offcanvasHtml + '\n    </div>\n  );\n}'
);

fs.writeFileSync(path, code);
