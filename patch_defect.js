const fs = require('fs');
const file = 'src/app/(dashboard)/production/defects/components/DefectSummaryOffcanvas.tsx';
let content = fs.readFileSync(file, 'utf-8');

// Add import
if (!content.includes('ConfirmDialog')) {
  content = content.replace("import { useState } from 'react';", "import { useState } from 'react';\nimport { ConfirmDialog } from '@/components/ui/ConfirmDialog';");
}

// Add state
if (!content.includes('showConfirmDelete')) {
  content = content.replace('const [isDeleting, setIsDeleting] = useState(false);', 'const [isDeleting, setIsDeleting] = useState(false);\n  const [showConfirmDelete, setShowConfirmDelete] = useState(false);');
}

// Replace confirm
content = content.replace(
  /if \(confirm\('Bạn có chắc chắn muốn xoá hồ sơ lỗi này và toàn bộ tập tin đính kèm\? Hành động này không thể hoàn tác\.'\)\) \{/,
  `setShowConfirmDelete(true);
    return;
  }
  
  const executeDelete = async () => {
    setIsDeleting(true);
    try {
      const res = await fetch(\`/api/production/defects/\${defect.id}\`, {
        method: 'DELETE'
      });
      if (res.ok) {
        onClose();
        if (onRefresh) onRefresh();
      } else {
        alert('Xoá thất bại');
      }
    } catch (err) {
      alert('Có lỗi xảy ra');
    } finally {
      setIsDeleting(false);
      setShowConfirmDelete(false);
    }
  };

  if (false) { // Skip old code`
);

// Add ConfirmDialog to JSX return
if (!content.includes('<ConfirmDialog')) {
  content = content.replace('</>', `
      <ConfirmDialog
        open={showConfirmDelete}
        title="Xoá hồ sơ lỗi"
        message="Bạn có chắc chắn muốn xoá hồ sơ lỗi này và toàn bộ tập tin đính kèm? Hành động này không thể hoàn tác."
        confirmLabel="Xoá"
        cancelLabel="Huỷ"
        loading={isDeleting}
        onConfirm={executeDelete}
        onCancel={() => setShowConfirmDelete(false)}
      />
    </>`);
}

fs.writeFileSync(file, content);
console.log("Patched defect offcanvas");
