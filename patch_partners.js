const fs = require('fs');
const file = 'src/app/(dashboard)/sales/partners/page.tsx';
let content = fs.readFileSync(file, 'utf-8');

// The file already imports ConfirmDialog. I just need to check if there is a ConfirmDialog for cabinet items.
// wait, let's look for "Bạn có chắc chắn muốn xoá vĩnh viễn hạng mục"
content = content.replace(
  /if \(!window.confirm\(\`Bạn có chắc chắn muốn xoá vĩnh viễn hạng mục "\$\{selectedItem.name\}" không\? Hành động này không thể hoàn tác.\`\)\) \{\n\s*return;\n\s*\}/g,
  `// Instead of window.confirm, we use the ConfirmDialog.
    setConfirmModal({
      isOpen: true,
      title: "Xoá hạng mục",
      message: \`Bạn có chắc chắn muốn xoá vĩnh viễn hạng mục "\${selectedItem.name}" không? Hành động này không thể hoàn tác.\`,
      onConfirm: async () => {
        setSavingCabinetItem(true);
        try {
          const res = await fetch(\`/api/sales/cabinet-items/\${editingCabinetItemId}\`, {
            method: 'DELETE',
          });
          if (res.ok) {
            setCabinetItems(prev => prev.filter(i => i.id !== editingCabinetItemId));
            setEditingCabinetItemId(null);
            setConfirmModal({ isOpen: false, title: "", message: "", onConfirm: () => {} });
          } else {
            alert("Lỗi khi xoá hạng mục");
          }
        } catch (error) {
          console.error(error);
          alert("Có lỗi xảy ra");
        } finally {
          setSavingCabinetItem(false);
        }
      }
    });
    return;`
);

// We need to carefully remove the original deletion logic below window.confirm!
content = content.replace(
  /setSavingCabinetItem\(true\);\n\s*try \{\n\s*const res = await fetch\(`\/api\/sales\/cabinet-items\/\$\{editingCabinetItemId\}`\, \{\n\s*method: 'DELETE',\n\s*\}\);\n\s*if \(res\.ok\) \{\n\s*setCabinetItems\(prev => prev\.filter\(i => i\.id !== editingCabinetItemId\)\);\n\s*setEditingCabinetItemId\(null\);\n\s*\} else \{\n\s*alert\("Lỗi khi xoá hạng mục"\);\n\s*\}\n\s*\} catch \(error\) \{\n\s*console\.error\(error\);\n\s*alert\("Có lỗi xảy ra"\);\n\s*\} finally \{\n\s*setSavingCabinetItem\(false\);\n\s*\}/g,
  `// Original block removed (moved to ConfirmDialog)`
);

fs.writeFileSync(file, content);
console.log("Patched partners page");
