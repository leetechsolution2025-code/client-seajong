const fs = require('fs');

let content = fs.readFileSync('src/app/(dashboard)/qa/inspections/page.tsx', 'utf8');

if (!content.includes('import { PrintPreviewModal, printDocumentById }')) {
  content = content.replace(
    'import toast from "react-hot-toast";',
    'import toast from "react-hot-toast";\nimport { PrintPreviewModal, printDocumentById } from "@/components/ui/PrintPreviewModal";'
  );
}

// 1. OQC Modal
content = content.replace(
  /<div className="modal-backdrop fade show" style=\{\{ zIndex: 1050 \}\}\><\/div>\s*<div className="modal fade show d-block" tabIndex=\{-1\} style=\{\{ zIndex: 1055 \}\}\>\s*<div className="modal-dialog modal-fullscreen">\s*<div className="modal-content bg-light">\s*<div className="modal-header border-bottom bg-white px-4 py-3">\s*<h5 className="modal-title fw-bold">Biên bản đánh giá chất lượng \(OQC\)<\/h5>\s*<button type="button" className="btn-close" onClick=\{.*\}><\/button>\s*<\/div>\s*<div className="modal-body p-0 d-flex flex-column flex-xl-row" style=\{\{ backgroundColor: "#e9ecef" \}\}>\s*\{\/\* Left Panel \*\/\}\s*<div className="bg-white border-end p-4 custom-scrollbar flex-shrink-0" style=\{\{ width: "380px", overflowY: "auto" \}\}>\s*<h6 className="fw-bold mb-4">THÔNG TIN BIÊN BẢN<\/h6>/,
  `<PrintPreviewModal
          title="Biên bản đánh giá chất lượng (OQC)"
          subtitle={\`Phiếu: \${selectedInspection.id}\`}
          onClose={() => setShowOqcModal(false)}
          documentId="oqc-preview-doc"
          actions={[
            <button key="save" className="btn btn-success px-4" onClick={handleSaveOqcResult}>
              <i className="bi bi-floppy me-2"></i>Lưu kết quả
            </button>
          ]}
          sidebar={
            <div className="d-flex flex-column gap-3 p-1">
              <h6 className="fw-bold mb-2">THÔNG TIN BIÊN BẢN</h6>`
);

content = content.replace(
  /<\/div>\s*\{\/\* Right Panel - A4 Preview \*\/\}\s*<div className="flex-grow-1 p-4 p-md-5 custom-scrollbar" style=\{\{ overflowY: "auto" \}\}>\s*<div\s*className="bg-white shadow border mx-auto position-relative"\s*style=\{\{\s*width: "21cm",\s*minHeight: "29.7cm",\s*padding: "1.5cm 2cm",\s*color: "black",\s*fontFamily: "'Roboto Condensed', sans-serif"\s*\}\}\s*>/,
  `           </div>
          }
          document={
            <div
              id="oqc-preview-doc"
              style={{
                color: "black",
                fontFamily: "'Roboto Condensed', sans-serif"
              }}
            >`
);

content = content.replace(
  /<div className="modal-footer bg-white border-top p-3 d-flex justify-content-end gap-2">\s*<button className="btn btn-light border px-4" onClick=\{\(\) => \{\s*setShowOqcModal\(false\);\s*setSelectedInspection\(null\);\s*\}\}>Hủy<\/button>\s*<button className="btn btn-primary px-4"><i className="bi bi-printer me-2"><\/i>In biên bản<\/button>\s*<button className="btn btn-success px-4" onClick=\{handleSaveOqcResult\}><i className="bi bi-floppy me-2"><\/i>Lưu kết quả<\/button>\s*<\/div>\s*<\/div>\s*<\/div>\s*<\/div>\s*<\/>/,
  `          }
        />`
);

// Fix date split for OQC
content = content.replace(
  /<div className="fst-italic">Ngày lập: \{selectedInspection\.date\}<\/div>/g,
  '<div className="fst-italic">Ngày lập: {selectedInspection.date}</div>'
); // Already fixed

fs.writeFileSync('src/app/(dashboard)/qa/inspections/page.tsx', content);
