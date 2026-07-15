const fs = require('fs');
const file = 'src/app/(dashboard)/finance/page.tsx';
let code = fs.readFileSync(file, 'utf8');

// 1. Add productionItemIds state
code = code.replace(
  'const [fetchingDetails, setFetchingDetails] = useState(false);',
  'const [fetchingDetails, setFetchingDetails] = useState(false);\n  const [productionItemIds, setProductionItemIds] = useState<string[]>([]);'
);

// 2. Update setOrderDetails
code = code.replace(
  'setOrderDetails((detail.saleOrderItems ?? []).map((it: any) => ({ name: it.tenHang, qty: it.soLuong, unit: it.inventoryItem?.donVi })));',
  'setOrderDetails(detail.items || []);\n        // Auto-check items that can be produced\n        const prodIds = (detail.items || []).filter((it: any) => it.missingQty > 0 && it.isManufactured && it.canProduce).map((it: any) => it.id);\n        setProductionItemIds(prodIds);'
);

// 3. Update handleApprove
const handleApproveRegex = /const handleApprove = async \(\) => {.*?setDecisions\(\{\}\);\n    \}\n  };/s;
code = code.replace(handleApproveRegex, `const handleApprove = async () => {
    if (!selectedOrder) return;
    if (!confirm(\`Duyệt đơn hàng \${selectedOrder.code}?\`)) return;
    try {
      const res = await fetch(\`/api/plan-finance/sales/\${selectedOrder.id}\`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keToanDuyet: "approved", trangThai: "active", productionItemIds })
      });
      if (res.ok) {
        toast.success("Đã duyệt đơn hàng!");
        fetchOrders(orderPage);
        setSelectedOrder(null);
        setShowItemsOffcanvas(false);
      } else {
        const err = await res.json();
        toast.error(err.error || "Lỗi khi duyệt");
      }
    } catch (error) {
      toast.error("Lỗi mạng");
    }
  };`);

// 4. Update Offcanvas
const offcanvasRegex = /(<Offcanvas show={showItemsOffcanvas} onHide={\(\) => setShowItemsOffcanvas\(false\)} placement="end" style={{ width: "450px" }}>.*?<\/Offcanvas>)/s;

const newOffcanvas = `<Offcanvas show={showItemsOffcanvas} onHide={() => setShowItemsOffcanvas(false)} placement="end" style={{ width: "500px" }}>
        <Offcanvas.Header closeButton className="border-bottom bg-light">
          <Offcanvas.Title className="fs-6 fw-bold">Chi tiết hàng hoá / Vật tư</Offcanvas.Title>
        </Offcanvas.Header>
        <Offcanvas.Body className="p-4 custom-scrollbar">
          {fetchingDetails ? (
            <div className="text-center p-5">
              <div className="spinner-border text-primary spinner-border-sm" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
            </div>
          ) : orderDetails.length > 0 ? (
            <div className="d-flex flex-column gap-3">
              {orderDetails.map((item, idx) => {
                const hasEnoughStock = item.missingQty <= 0;
                const isProdChecked = productionItemIds.includes(item.id);

                return (
                  <div key={item.id || idx} className="d-flex align-items-start gap-3 p-3 border rounded-3 bg-white shadow-sm position-relative">
                    <div className="mt-1">
                      <input 
                        type="checkbox" 
                        className="form-check-input" 
                        style={{ cursor: hasEnoughStock ? "not-allowed" : "pointer", width: "18px", height: "18px" }}
                        disabled={hasEnoughStock}
                        checked={hasEnoughStock ? false : isProdChecked}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setProductionItemIds(prev => [...prev, item.id]);
                          } else {
                            setProductionItemIds(prev => prev.filter(id => id !== item.id));
                          }
                        }}
                      />
                    </div>
                    <div className="flex-grow-1">
                      <div className="d-flex justify-content-between align-items-start mb-1">
                        <span className="fw-bold text-dark" style={{ fontSize: "14px" }}>{item.tenHang || item.name}</span>
                        <span className="fw-bold text-primary" style={{ fontSize: "14px" }}>{item.soLuong || item.qty} {item.donVi || item.unit || "cái"}</span>
                      </div>
                      
                      {!hasEnoughStock ? (
                        <div className="d-flex flex-column gap-1 mt-2">
                          <span className="text-danger fw-semibold" style={{ fontSize: "12px" }}>
                            <i className="bi bi-exclamation-triangle me-1"></i> Thiếu: {item.missingQty} {item.donVi || item.unit || "cái"}
                          </span>
                          {item.isManufactured ? (
                            item.canProduce ? (
                              <span className="text-success fw-medium" style={{ fontSize: "11px" }}>
                                <i className="bi bi-check-circle me-1"></i> Đủ phụ kiện để sản xuất
                              </span>
                            ) : (
                              <span className="text-warning fw-medium" style={{ fontSize: "11px" }}>
                                <i className="bi bi-exclamation-circle me-1"></i> Thiếu phụ kiện, cần mua vật tư
                              </span>
                            )
                          ) : (
                            <span className="text-muted fw-medium" style={{ fontSize: "11px" }}>
                              <i className="bi bi-cart-x me-1"></i> Hết hàng, cần mua
                            </span>
                          )}
                        </div>
                      ) : (
                        <div className="mt-2">
                          <span className="text-success fw-semibold" style={{ fontSize: "12px" }}>
                            <i className="bi bi-check-circle-fill me-1"></i> Đủ hàng trong kho
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center p-5 text-muted border border-dashed rounded-3">
              Không tìm thấy hàng hoá nào
            </div>
          )}
        </Offcanvas.Body>
        {selectedOrder && selectedOrder.keToanDuyet !== "approved" && (
          <div className="border-top p-3 bg-light d-flex justify-content-end gap-2">
            <button 
              className="btn btn-danger fw-bold px-4 rounded-3 d-flex align-items-center gap-2"
              onClick={handleReject}
            >
              <i className="bi bi-x-lg" />
              Từ chối
            </button>
            <button 
              className="btn btn-success fw-bold px-4 rounded-3 d-flex align-items-center gap-2"
              onClick={handleApprove}
            >
              <i className="bi bi-check-lg" />
              Duyệt đơn
            </button>
          </div>
        )}
      </Offcanvas>`;

code = code.replace(offcanvasRegex, newOffcanvas);
fs.writeFileSync(file, code);
