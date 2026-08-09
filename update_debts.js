const fs = require('fs');
const file = 'src/app/(dashboard)/finance/debts/page.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Remove subtext below TỔNG CỘNG
const oldRenderChild = `            {row.isChild ? (
              <>
                <div className="fw-bold text-dark">
                  {row.referenceId || "Không có số ĐH"} <span className="text-muted mx-1">|</span> <span className={\`text-\${STATUS_MAP[row.status]?.color || "secondary"}\`}>{STATUS_MAP[row.status]?.label || row.status}</span>
                </div>
                <div className="text-muted small">
                  {row.createdAt ? format(new Date(row.createdAt), "HH:mm:ss dd/MM/yyyy") : "---"} <span className="mx-1">|</span> Hệ thống
                </div>
              </>
            ) : (
              <>
                <div className={\`fw-bold \${isAgencyChild ? 'text-uppercase' : 'text-dark'}\`} style={isAgencyChild ? { color: '#0d6efd' } : {}}>
                  {cleanedPartnerName}
                </div>
                <div className="text-muted" style={{ fontSize: 13 }}>
                  REF: {row.referenceId || "N/A"} <span className="mx-1">|</span> {row.description || "Không có nội dung"}
                </div>
              </>
            )}`;

const newRenderChild = `            {row.isChild ? (
              <>
                <div className="fw-bold text-dark">
                  {row.referenceId || "Không có số ĐH"} <span className="text-muted mx-1">|</span> <span className={\`text-\${STATUS_MAP[row.status]?.color || "secondary"}\`}>{STATUS_MAP[row.status]?.label || row.status}</span>
                </div>
                <div className="text-muted small">
                  {row.createdAt ? format(new Date(row.createdAt), "HH:mm:ss dd/MM/yyyy") : "---"} <span className="mx-1">|</span> Hệ thống
                </div>
              </>
            ) : (
              <>
                <div className={\`fw-bold \${isAgencyChild ? 'text-uppercase' : 'text-dark'}\`} style={isAgencyChild ? { color: '#0d6efd' } : {}}>
                  {cleanedPartnerName}
                </div>
                {!row.isTotalRow && (
                  <div className="text-muted" style={{ fontSize: 13 }}>
                    REF: {row.referenceId || "N/A"} <span className="mx-1">|</span> {row.description || "Không có nội dung"}
                  </div>
                )}
              </>
            )}`;

content = content.replace(oldRenderChild, newRenderChild);

// 2. Sort debts
const oldGroupLogic = `                  Object.entries(groupedByPartner).forEach(([groupKey, itemsValue]) => {
                    const items = itemsValue as any[];
                    // Lọc số điện thoại ra khỏi tên (VD: "Đại lý Hồng Liên - 0934...")
                    let displayName = items[0].partnerName || "";`;

const newGroupLogic = `                  const groupsArray = Object.entries(groupedByPartner).map(([groupKey, itemsValue]) => {
                    const items = itemsValue as any[];
                    items.sort((a, b) => {
                      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
                      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
                      return dateB - dateA;
                    });
                    return { groupKey, items };
                  });

                  groupsArray.sort((a, b) => {
                    const dateA = a.items[0]?.createdAt ? new Date(a.items[0].createdAt).getTime() : 0;
                    const dateB = b.items[0]?.createdAt ? new Date(b.items[0].createdAt).getTime() : 0;
                    return dateB - dateA;
                  });

                  groupsArray.forEach(({ groupKey, items }) => {
                    // Lọc số điện thoại ra khỏi tên (VD: "Đại lý Hồng Liên - 0934...")
                    let displayName = items[0].partnerName || "";`;

content = content.replace(oldGroupLogic, newGroupLogic);

// 3. Move toolbar to footer
const toolbarStart = `<div className="px-4 pt-3 pb-2 flex-shrink-0">`;
const toolbarEnd = `</div>
              </>
            }
            footer={`;

const startIndex = content.indexOf(toolbarStart);
const endIndex = content.indexOf(toolbarEnd, startIndex);
if (startIndex !== -1 && endIndex !== -1) {
  const toolbarContent = content.substring(startIndex, endIndex);
  content = content.substring(0, startIndex) + content.substring(endIndex + 6); // remove toolbar from header
  
  // now add it to footer
  const oldFooter = `            footer={
              <div className="d-flex justify-content-end w-100">
                <Pagination 
                  page={1} 
                  totalPages={1} 
                  onChange={() => {}} 
                />
              </div>
            }`;
            
  // The toolbar content starts with `<div className="px-4 pt-3 pb-2 flex-shrink-0">`
  // We can just embed its children inside the footer flex container
  // Replace the outermost `<div className="px-4 pt-3 pb-2 flex-shrink-0">` with a fragment
  const innerToolbar = toolbarContent.replace(`<div className="px-4 pt-3 pb-2 flex-shrink-0">`, "").slice(0, -6); // strip closing div
  
  const newFooter = `            footer={
              <div className="d-flex align-items-center w-100 px-4 py-2 border-top bg-light">
                <div className="flex-grow-1">
                  ${innerToolbar}
                </div>
                <div className="flex-shrink-0 ms-3">
                  <Pagination 
                    page={1} 
                    totalPages={1} 
                    onChange={() => {}} 
                  />
                </div>
              </div>
            }`;
            
  content = content.replace(oldFooter, newFooter);
}

fs.writeFileSync(file, content);
console.log("Done");
