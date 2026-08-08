import re

file_path = "src/app/(dashboard)/finance/debts/page.tsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Define the shared actions column text
actions_col_text = '''    const actionsCol: TableColumn<any> = {
      header: "",
      align: "center",
      width: 40,
      render: (row) => {
        if (row.isGroupHeader) return null;
        if (row.id?.toString().startsWith("AUTO_")) return null;
        return (
          <div className="dropdown position-static">
            <button 
              className="btn btn-link btn-sm text-muted p-0 border-0 dropdown-toggle no-caret"
              type="button"
              data-bs-toggle="dropdown"
              aria-expanded="false"
            >
              <i className="bi bi-three-dots-vertical" />
            </button>
            <ul className="dropdown-menu dropdown-menu-end shadow border-0 py-2" style={{ fontSize: 12.5, minWidth: 200, zIndex: 1050 }}>
              <li>
                <button 
                  className="dropdown-item d-flex align-items-center gap-2 py-1.5" 
                  onClick={(e) => { 
                    e.stopPropagation(); 
                    if (isExpense) {
                      // Custom approval logic for expenses
                    } else {
                      setSelectedPaymentDebt(row);
                      setShowPaymentOffcanvas(true);
                    }
                  }}
                >
                  <i className="bi bi-cash-coin text-success fs-6" />
                  <span>{isExpense ? "Duyệt chi" : "Ghi nhận thanh toán"}</span>
                </button>
              </li>
              <li>
                <button 
                  className="dropdown-item d-flex align-items-center gap-2 py-1.5" 
                  onClick={(e) => { 
                    e.stopPropagation(); 
                    if (isExpense) {
                      setEditingItem(row);
                      setShowExpenseForm(true);
                    } else {
                      setEditingItem(row);
                      setShowDebtForm(true);
                    }
                  }}
                >
                  <i className="bi bi-pencil-square text-primary fs-6" />
                  <span>{isExpense ? "Chỉnh sửa khoản chi" : "Chỉnh sửa thông tin"}</span>
                </button>
              </li>
              {!isExpense && (
                <>
                  <li>
                    <button 
                      className="dropdown-item d-flex align-items-center gap-2 py-1.5" 
                      onClick={(e) => { 
                        e.stopPropagation(); 
                        setSelectedReconciliationDebt(row);
                        setShowReconciliationModal(true);
                      }}
                    >
                      <i className="bi bi-file-earmark-check text-info fs-6" />
                      <span>Đối chiếu công nợ</span>
                    </button>
                  </li>
                  <li>
                    <button className="dropdown-item d-flex align-items-center gap-2 py-1.5" onClick={(e) => { e.stopPropagation(); }}>
                      <i className="bi bi-bell text-warning fs-6" />
                      <span>Gửi nhắc nợ</span>
                    </button>
                  </li>
                </>
              )}
              <li><hr className="dropdown-divider opacity-50" /></li>
              <li>
                <button className="dropdown-item d-flex align-items-center gap-2 py-1.5 text-danger" onClick={(e) => { 
                  e.stopPropagation(); 
                  setDeletingId(row.id);
                  setShowDeleteConfirm(true);
                }}>
                  <i className="bi bi-trash fs-6" />
                  <span>Xóa khoản nợ</span>
                </button>
              </li>
            </ul>
          </div>
        );
      },
    };
'''

# 1. Insert `actionsCol` definition right after `commonCols` definition
# `commonCols` ends with `    ];\n` around line 291.
insert_marker = '    ];\n\n    if (isLoan) {'
if insert_marker in content:
    content = content.replace(insert_marker, '    ];\n\n' + actions_col_text + '\n    if (isLoan) {')

# 2. Replace the old actions block inside `isLoan` return with `actionsCol`
# The block to replace is lines 345-435 roughly.
# It starts with `        {\n          header: "",\n          align: "center",\n          width: 40,\n          render: (row) => {\n            if (row.isGroupHeader) return null;`
old_actions_start = '        {\n          header: "",\n          align: "center",\n          width: 40,\n          render: (row) => {\n            if (row.isGroupHeader) return null;'
if old_actions_start in content:
    idx_start = content.index(old_actions_start)
    idx_end = content.find('        },\n      ];\n    }', idx_start) + len('        },')
    content = content[:idx_start] + '        actionsCol\n' + content[idx_end:]

# 3. Add `resultCols.push(actionsCol);` to the end of non-loan logic
# The logic ends around line 480 before `    return resultCols;`
return_marker = '    return resultCols;'
if return_marker in content:
    content = content.replace(return_marker, '    resultCols.push(actionsCol);\n    return resultCols;')

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
print("Fixed actions column in DebtsPage.tsx")
