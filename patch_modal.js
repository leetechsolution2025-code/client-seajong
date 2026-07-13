const fs = require('fs');

const path = 'src/components/plan-finance/kho_hang/XuatKhoModal.tsx';
let code = fs.readFileSync(path, 'utf8');

// 1. Update Props
code = code.replace(
  'interface XuatKhoModalProps { onClose: () => void; onSaved: () => void; }',
  'interface XuatKhoModalProps { onClose: () => void; onSaved: () => void; initialMode?: "manual" | "so" | "wo"; initialSoId?: string; }'
);

// 2. Update Component Signature and mode initial state
code = code.replace(
  'export function XuatKhoModal({ onClose, onSaved }: XuatKhoModalProps) {',
  'export function XuatKhoModal({ onClose, onSaved, initialMode, initialSoId }: XuatKhoModalProps) {'
);
code = code.replace(
  'const [mode, setMode]                 = React.useState<"manual" | "so" | "wo">("manual");',
  'const [mode, setMode]                 = React.useState<"manual" | "so" | "wo">(initialMode || "manual");'
);

// 3. Add useEffect to auto-select SO
// I will insert it after onSelectSo declaration
if (!code.includes('if (initialSoId && saleOrders.length > 0 && !hasAutoSelected.current) {')) {
  code = code.replace(
    'const onSelectSo = (id: string) => {',
    `const hasAutoSelected = React.useRef(false);
  React.useEffect(() => {
    if (initialMode === "so" && initialSoId && saleOrders.length > 0 && !hasAutoSelected.current) {
      hasAutoSelected.current = true;
      onSelectSo(initialSoId);
    }
  }, [initialMode, initialSoId, saleOrders]);

  const onSelectSo = (id: string) => {`
  );
}

fs.writeFileSync(path, code);
