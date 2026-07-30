const fs = require('fs');
let content = fs.readFileSync('src/app/(dashboard)/qa/inspections/page.tsx', 'utf8');

if (!content.includes('import { PrintPreviewModal, printDocumentById }')) {
  content = content.replace(
    'import toast from "react-hot-toast";',
    'import { PrintPreviewModal, printDocumentById } from "@/components/ui/PrintPreviewModal";\nimport toast from "react-hot-toast";'
  );
  fs.writeFileSync('src/app/(dashboard)/qa/inspections/page.tsx', content);
}
