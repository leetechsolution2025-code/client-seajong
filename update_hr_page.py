import re

with open("src/app/(dashboard)/hr/page.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# Add batchDeleteConfirm state
if "const [batchDeleteConfirm, setBatchDeleteConfirm]" not in content:
    content = content.replace(
        "const [deleteLoading, setDeleteLoading] = useState(false);",
        "const [deleteLoading, setDeleteLoading] = useState(false);\n  const [batchDeleteConfirm, setBatchDeleteConfirm] = useState(false);"
    )

# Add handleBatchDelete
batch_delete_func = """  const handleBatchDelete = async () => {
    setActionLoading(true);
    try {
      const ids = Array.from(selectedIds);
      const promises = ids.map(id => fetch(`/api/hr/approvals/${id}`, {
        method: "DELETE"
      }));
      await Promise.all(promises);
      toast.success("Đã xoá " + ids.length + " đề xuất");
      setSelectedIds(new Set());
      setBatchDeleteConfirm(false);
      fetchApprovals();
    } catch (err) {
      toast.error("Lỗi khi xoá hàng loạt");
    } finally {
      setActionLoading(false);
    }
  };"""

if "const handleBatchDelete =" not in content:
    content = content.replace(
        "const handleBatchAction = async",
        batch_delete_func + "\n\n  const handleBatchAction = async"
    )

# Replace buttons in ApprovalsBottomToolbar
# The buttons block starts at `{activeTabId === "pending" && (`
start_buttons = content.find('{activeTabId === "pending" && (')
if start_buttons != -1:
    end_buttons = content.find(')}', start_buttons)
    if end_buttons != -1:
        new_buttons = """
              <button 
                className="btn btn-danger btn-sm d-flex align-items-center gap-1 py-1 px-2 border-0 shadow-sm" 
                onClick={() => setBatchDeleteConfirm(true)}
                disabled={actionLoading}
                style={{ fontSize: 11, fontWeight: 600 }}
              >
                <i className="bi bi-trash3" /> Xoá
              </button>
        """
        # Replace the activeTabId condition to just always show the delete button
        content = content[:start_buttons] + new_buttons + content[end_buttons + 2:]

# Add ConfirmDialogModal for batch delete at the bottom
batch_delete_modal = """      <ConfirmDialog
        open={batchDeleteConfirm}
        title="Xác nhận xoá đề xuất"
        message={`Bạn có chắc chắn muốn xoá ${selectedIds.size} đề xuất đã chọn? Dữ liệu không thể khôi phục sau khi xoá.`}
        confirmLabel="Xoá dữ liệu"
        cancelLabel="Huỷ bỏ"
        variant="danger"
        loading={actionLoading}
        onConfirm={handleBatchDelete}
        onCancel={() => setBatchDeleteConfirm(false)}
      />"""

if "open={batchDeleteConfirm}" not in content:
    content = content.replace(
        "{/* Request Detail Offcanvas */}",
        batch_delete_modal + "\n\n      {/* Request Detail Offcanvas */}"
    )

with open("src/app/(dashboard)/hr/page.tsx", "w", encoding="utf-8") as f:
    f.write(content)

print("Updated hr/page.tsx")
