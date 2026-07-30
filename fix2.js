const fs = require('fs');

let content = fs.readFileSync('src/app/(dashboard)/qa/inspections/page.tsx', 'utf8');

// Fix Date
content = content.replace(/\{selectedInspection\.date\.split\(' '\)\[0\]\}/g, "{selectedInspection.date}");

// Add id="iqc-preview-doc" to IQC preview
content = content.replace(
  /<div \n\s*className="bg-white shadow border mx-auto position-relative" \n\s*style=\{\{ \n\s*width: "21cm", \n\s*minHeight: "29.7cm", /g,
  `<div 
                      id="iqc-preview-doc"
                      className="bg-white shadow border mx-auto position-relative" 
                      style={{ 
                        width: "21cm", 
                        minHeight: "29.7cm", `
);

// Add id="oqc-preview-doc" to OQC preview. Wait, the regex replaced globally. So both have "iqc-preview-doc".
// We will replace the second one to "oqc-preview-doc".
let occurrences = 0;
content = content.replace(/id="iqc-preview-doc"/g, (match) => {
  occurrences++;
  return occurrences === 2 ? 'id="oqc-preview-doc"' : match;
});

// Update In biên bản buttons
content = content.replace(
  /<button className="btn btn-primary px-4"><i className="bi bi-printer me-2"><\/i>In biên bản<\/button>/g,
  (match, offset, string) => {
    // If it's the first one, it's IQC. If it's the second, it's OQC.
    // However, I can just use a trick.
    return match; // We will handle this carefully below.
  }
);

let btnOccurrences = 0;
content = content.replace(/<button className="btn btn-primary px-4"><i className="bi bi-printer me-2"><\/i>In biên bản<\/button>/g, (match) => {
  btnOccurrences++;
  if (btnOccurrences === 1) {
    return `<button className="btn btn-primary px-4" onClick={() => printDocumentById("iqc-preview-doc", "portrait", "IQC-" + selectedInspection.id)}><i className="bi bi-printer me-2"></i>In biên bản</button>`;
  } else if (btnOccurrences === 2) {
    return `<button className="btn btn-primary px-4" onClick={() => printDocumentById("oqc-preview-doc", "portrait", "OQC-" + selectedInspection.id)}><i className="bi bi-printer me-2"></i>In biên bản</button>`;
  }
  return match;
});


fs.writeFileSync('src/app/(dashboard)/qa/inspections/page.tsx', content);
