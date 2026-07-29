const fs = require('fs');
const file = 'src/app/(dashboard)/sales/omnichannel/ShopeeOrderDetailOffcanvas.tsx';
let content = fs.readFileSync(file, 'utf-8');

// Add import
if (!content.includes('ConfirmDialog')) {
  content = content.replace('import { BrandButton } from "@/components/ui/BrandButton";', 'import { BrandButton } from "@/components/ui/BrandButton";\nimport { ConfirmDialog } from "@/components/ui/ConfirmDialog";');
}

// Add state
if (!content.includes('showConfirmDelete')) {
  content = content.replace('const [loading, setLoading] = useState(false);', 'const [loading, setLoading] = useState(false);\n  const [showConfirmDelete, setShowConfirmDelete] = useState(false);');
}

// Replace confirm()
content = content.replace(
  /if \(confirm\("Bạn có chắc chắn muốn xoá đơn hàng này\?"\)\) \{\n\s*onDelete\(order.id\);\n\s*\}/g,
  `setShowConfirmDelete(true);`
);

// Add ConfirmDialog JSX
if (!content.includes('<ConfirmDialog')) {
  const dialogJSX = `
      <ConfirmDialog
        open={showConfirmDelete}
        title="Xoá đơn hàng"
        message="Bạn có chắc chắn muốn xoá đơn hàng này?"
        confirmLabel="Xoá"
        cancelLabel="Huỷ"
        onConfirm={() => {
          if (onDelete && order) {
            onDelete(order.id);
          }
          setShowConfirmDelete(false);
        }}
        onCancel={() => setShowConfirmDelete(false)}
      />`;
  content = content.replace('</>', `${dialogJSX}\n    </>`);
}

fs.writeFileSync(file, content);
console.log("Patched shopee offcanvas");
