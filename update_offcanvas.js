const fs = require('fs');
let code = fs.readFileSync('src/app/(dashboard)/logistics/page.tsx', 'utf-8');

// Add import
if (!code.includes('XuatKhoModal')) {
  code = code.replace(
    'import { Table, TableColumn } from "@/components/ui/Table";',
    'import { Table, TableColumn } from "@/components/ui/Table";\nimport { XuatKhoModal } from "@/components/plan-finance/kho_hang/XuatKhoModal";'
  );
}

// Add state
if (!code.includes('showXuatKhoModal')) {
  code = code.replace(
    'const [fetchingDetails, setFetchingDetails] = useState(false);',
    'const [fetchingDetails, setFetchingDetails] = useState(false);\n  const [showXuatKhoModal, setShowXuatKhoModal] = useState(false);'
  );
}

// Update offcanvas-body
code = code.replace(
  /<div className="d-flex flex-column gap-3">[\s\S]*?<\/div>\s*\) : \(/g,
  `<div>
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
            ) : (`
);

// Update offcanvas-footer button
code = code.replace(
  /<button className="btn btn-primary w-100" onClick={\(\) => setSelectedOrder\(null\)}>\s*Xác nhận\s*<\/button>/g,
  `<button className="btn btn-primary w-100" onClick={() => setShowXuatKhoModal(true)}>
            Thực hiện
          </button>`
);

// Add modal render at the end
if (!code.includes('<XuatKhoModal')) {
  code = code.replace(
    '    </div>\n  );\n}',
    `      {showXuatKhoModal && (
        <XuatKhoModal 
          onClose={() => setShowXuatKhoModal(false)}
          onSaved={() => {
            setShowXuatKhoModal(false);
            setSelectedOrder(null);
          }}
        />
      )}
    </div>
  );
}`
  );
}

fs.writeFileSync('src/app/(dashboard)/logistics/page.tsx', code);
