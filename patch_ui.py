import os

files = [
    'src/components/logistics/batch-packing/LogisticsBatchPacking.tsx',
    'src/components/logistics/material-picking/LogisticsMaterialPicking.tsx'
]

for filename in files:
    with open(filename, 'r') as f:
        content = f.read()

    # 1. Update Interface
    interface_patch = '''
  orders: {
    id: string;
    code: string;
    soLuongTrongDon: number;
    ngayGiao?: string;
    assignedTo?: string;
  }[];
}

interface Employee {
  id: string;
  fullName: string;
}
'''
    content = content.replace('''  orders: {
    id: string;
    code: string;
    soLuongTrongDon: number;
    ngayGiao?: string;
  }[];
}''', interface_patch)

    # 2. Add State
    state_patch = '''
  const [isManager, setIsManager] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
'''
    # Find the exact line: const [loading, setLoading] = useState(true);
    content = content.replace('  const [loading, setLoading] = useState(true);', '  const [loading, setLoading] = useState(true);' + state_patch)

    # 3. Update fetchData
    fetchdata_patch = '''
      if (data.success) {
        setItems(data.items);
        setTotalOrders(data.totalOrders);
        setIsManager(data.isManager || false);
      }
'''
    content = content.replace('''      if (data.success) {
        setItems(data.items);
        setTotalOrders(data.totalOrders);
      }''', fetchdata_patch)

    # 4. Add fetchEmployees and handleAssign
    handlers_patch = '''
  const fetchEmployees = async () => {
    try {
      const res = await fetch("/api/hr/employees");
      const data = await res.json();
      if (Array.isArray(data)) {
        setEmployees(data.map((e: any) => ({ id: e.id, fullName: e.fullName })));
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (isManager && employees.length === 0) {
      fetchEmployees();
    }
  }, [isManager]);

  const openAssignModal = (ticketId: string) => {
    setSelectedTicketId(ticketId);
    setAssignModalOpen(true);
  };

  const handleAssignSubmit = async () => {
    if (!selectedEmployeeId || !selectedTicketId) return;
    try {
      const endpoint = window.location.pathname.includes("material") 
        ? "/api/logistics/material-picking" 
        : "/api/logistics/batch-packing";
        
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "assign_ticket", ticketId: selectedTicketId, employeeId: selectedEmployeeId })
      });
      const data = await res.json();
      if (data.success) {
        alert("Phân công thành công!");
        setAssignModalOpen(false);
        fetchData(); // reload
      } else {
        alert(data.error);
      }
    } catch (e) {
      alert("Đã xảy ra lỗi");
    }
  };
'''
    content = content.replace('  const handleComplete = async () => {', handlers_patch + '\n  const handleComplete = async () => {')

    # 5. Add UI logic for "Phân công" in rendering Orders
    orders_patch = '''                      {item.orders.map((o, idx) => (
                        <span key={idx} className="badge bg-light text-dark border d-inline-flex align-items-center gap-1" style={{ fontSize: 11, fontWeight: 500 }}>
                          {o.code}: {o.soLuongTrongDon}
                          {o.assignedTo && <span className="text-primary ms-1">({o.assignedTo})</span>}
                          {isManager && (
                            <button 
                              onClick={(e) => { e.stopPropagation(); openAssignModal(o.id); }}
                              className="btn btn-sm btn-link p-0 ms-1 text-decoration-none"
                              style={{ fontSize: 11 }}
                              title="Phân công"
                            >
                              <i className="bi bi-person-plus"></i>
                            </button>
                          )}
                        </span>
                      ))}'''
    
    # We have to replace the exact mapping block
    content = re.sub(
        r'\{item\.orders\.map\(\(o, idx\) => \(\s*<span key=\{idx\}.*?\{o\.code\}: \{o\.soLuongTrongDon\}\s*</span>\s*\)\)\}',
        orders_patch,
        content,
        flags=re.DOTALL
    )

    # 6. Append the Assign Modal at the very end of the file, before the closing bracket of the component (before the last `}`)
    # Find the last `);` and the `}`. 
    # Usually it's `  );` followed by `}`.
    modal_code = '''
      {assignModalOpen && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header py-2">
                <h6 className="modal-title">Phân công Phiếu điều phối</h6>
                <button type="button" className="btn-close" onClick={() => setAssignModalOpen(false)}></button>
              </div>
              <div className="modal-body">
                <label className="form-label fs-6">Chọn nhân viên kho:</label>
                <select className="form-select" value={selectedEmployeeId} onChange={(e) => setSelectedEmployeeId(e.target.value)}>
                  <option value="">-- Chọn nhân viên --</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.fullName}</option>
                  ))}
                </select>
              </div>
              <div className="modal-footer py-2">
                <button type="button" className="btn btn-light btn-sm" onClick={() => setAssignModalOpen(false)}>Hủy</button>
                <button type="button" className="btn btn-primary btn-sm" onClick={handleAssignSubmit}>Phân công</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </FullWidthTableLayout>
'''
    content = content.replace('    </FullWidthTableLayout>', modal_code)

    with open(filename, 'w') as f:
        f.write(content)

print("Done")
