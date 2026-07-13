const fs = require('fs');

const path = 'src/app/(dashboard)/finance/page.tsx';
let code = fs.readFileSync(path, 'utf8');

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

if (!code.includes('Chi tiết hàng hoá')) {
  code = code.replace(
    '    </StandardPage>\n  );\n}',
    offcanvasHtml + '\n    </StandardPage>\n  );\n}'
  );
  fs.writeFileSync(path, code);
  console.log("Successfully appended offcanvas");
} else {
  console.log("Offcanvas already exists");
}
