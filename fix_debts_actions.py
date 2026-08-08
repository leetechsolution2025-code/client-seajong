import re

file_path = "src/app/(dashboard)/finance/debts/page.tsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Remove the second actions column push (lines 473-546 approx)
# It starts with `    resultCols.push({\n      header: "",\n      align: "center",\n      width: 40,\n      render: (row) => {`
start_marker = '    resultCols.push({\n      header: "",\n      align: "center",\n      width: 40,\n      render: (row) => {\n        if (row.id?.toString().startsWith("AUTO_")) return null;'
if start_marker in content:
    idx_start = content.index(start_marker)
    # find the closing `      },\n    });`
    idx_end = content.find('      },\n    });', idx_start) + len('      },\n    });')
    
    # Let's verify we found the correct block
    block_to_remove = content[idx_start:idx_end]
    if 'setSelectedPaymentDebt' in block_to_remove:
        content = content[:idx_start] + content[idx_end:]
        print("Removed redundant actions column.")
    else:
        print("Could not find the expected block to remove.")

# 2. Update the first actions column in commonCols
target_actions = '''                <li>
                  <button 
                    className="dropdown-item d-flex align-items-center gap-2 py-1.5" 
                    onClick={(e) => { 
                      e.stopPropagation(); 
                      setSelectedPaymentDebt(row);
                      setShowPaymentOffcanvas(true);
                    }}
                  >
                    <i className="bi bi-cash-coin text-success fs-6" />
                    <span>Ghi nhận thanh toán</span>
                  </button>
                </li>
                <li>
                  <button 
                    className="dropdown-item d-flex align-items-center gap-2 py-1.5" 
                    onClick={(e) => { 
                      e.stopPropagation(); 
                      setEditingItem(row);
                      setShowDebtForm(true);
                    }}
                  >
                    <i className="bi bi-pencil-square text-primary fs-6" />
                    <span>Chỉnh sửa thông tin</span>
                  </button>
                </li>
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
                </li>'''

replacement_actions = '''                <li>
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
                )}'''

if target_actions in content:
    content = content.replace(target_actions, replacement_actions)
    print("Updated commonCols actions.")
else:
    print("Could not find target_actions in commonCols.")

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
