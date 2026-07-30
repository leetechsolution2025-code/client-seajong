import fs from 'fs';

let content = fs.readFileSync('src/app/(dashboard)/qa/inspections/page.tsx', 'utf8');

// Fix Date
content = content.replace(/\{selectedInspection\.date\.split\(' '\)\[0\]\}/g, "{selectedInspection.date}");

// Add imports
if (!content.includes('PrintPreviewModal')) {
  content = content.replace('import toast from "react-hot-toast";', 'import { PrintPreviewModal, printDocumentById } from "@/components/ui/PrintPreviewModal";\nimport toast from "react-hot-toast";');
}

// Convert OQC modal
// The wrapper starts at <div className="modal fade show d-block" ... >
// Wait, I can just use printDocumentById on the button!
// If I use printDocumentById, it will print the content with the ID. 
// "Khi nhấn In biên bản, gọi PrintPreviewModal để hỗ trợ người dùng in biên và xuất PDF biên bản"
// I will wrap the whole preview inside PrintPreviewModal.

fs.writeFileSync('src/app/(dashboard)/qa/inspections/page.tsx', content);
