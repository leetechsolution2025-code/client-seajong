const fs = require('fs');
const file = 'src/app/(dashboard)/sales/partners/page.tsx';
let content = fs.readFileSync(file, 'utf-8');

// Add state
if (!content.includes('showConfirmDeleteCabinetItem')) {
  content = content.replace(
    'const [deletingPartner, setDeletingPartner] = useState(false);',
    'const [deletingPartner, setDeletingPartner] = useState(false);\n  const [showConfirmDeleteCabinetItem, setShowConfirmDeleteCabinetItem] = useState(false);'
  );
}

// Replace handleDeleteCabinetItem
const oldFunc = `  const handleDeleteCabinetItem = async () => {
    if (!editingCabinetItemId) {
      toastError("Lỗi", "Vui lòng chọn một hạng mục để xoá.");
      return;
    }
    const selectedItem = cabinetItems.find(item => item.id === editingCabinetItemId);
    if (!selectedItem) return;

    if (!window.confirm(\`Bạn có chắc chắn muốn xoá vĩnh viễn hạng mục "\${selectedItem.name}" không? Hành động này không thể hoàn tác.\`)) {
      return;
    }

    setSavingCabinetItem(true);
    try {
      const res = await fetch(\`/api/sales/cabinet-items?id=\${editingCabinetItemId}\`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Không thể xoá hạng mục");
      }

      toastSuccess("Thành công", "Đã xoá hạng mục quầy kệ.");
      setShowAddCabinetItemModal(false);
      await fetchCabinetItems();
    } catch (err: any) {
      toastError("Lỗi", err.message || "Lỗi xoá hạng mục.");
    } finally {
      setSavingCabinetItem(false);
    }
  };`;

const newFunc = `  const handleDeleteCabinetItem = () => {
    if (!editingCabinetItemId) {
      toastError("Lỗi", "Vui lòng chọn một hạng mục để xoá.");
      return;
    }
    setShowConfirmDeleteCabinetItem(true);
  };

  const executeDeleteCabinetItem = async () => {
    setSavingCabinetItem(true);
    try {
      const res = await fetch(\`/api/sales/cabinet-items?id=\${editingCabinetItemId}\`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Không thể xoá hạng mục");
      }

      toastSuccess("Thành công", "Đã xoá hạng mục quầy kệ.");
      setShowAddCabinetItemModal(false);
      setShowConfirmDeleteCabinetItem(false);
      await fetchCabinetItems();
    } catch (err: any) {
      toastError("Lỗi", err.message || "Lỗi xoá hạng mục.");
    } finally {
      setSavingCabinetItem(false);
    }
  };`;

content = content.replace(oldFunc, newFunc);

// Add ConfirmDialog
const confirmDialogHtml = `      <ConfirmDialog
        open={showConfirmDeleteCabinetItem}
        variant="danger"
        title="Xoá hạng mục quầy kệ?"
        message="Bạn có chắc chắn muốn xoá vĩnh viễn hạng mục này không? Hành động này không thể hoàn tác."
        confirmLabel="Xoá"
        loading={savingCabinetItem}
        onConfirm={executeDeleteCabinetItem}
        onCancel={() => setShowConfirmDeleteCabinetItem(false)}
      />

      <ConfirmDialog`;

content = content.replace('      <ConfirmDialog\n        open={confirmDeleteHistoryOpen}', confirmDialogHtml);

fs.writeFileSync(file, content);
console.log("Patched partners page");
