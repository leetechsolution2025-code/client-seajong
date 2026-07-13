const fs = require('fs');
let code = fs.readFileSync('src/lib/utils/pdf.ts', 'utf8');

// Fix 1: injectPDFStyles call
code = code.replace(/injectPDFStyles\(clonedPage, orientation\);/g, 
  "injectPDFStyles(clonedPage, orientation, keepOriginalStyles);");

// Fix 2: remove width and height from html2canvas
code = code.replace(/width: isLandscape \? 1123 : 794,\n\s*height: isLandscape \? 794 : 1123/g, 
  "// width and height omitted to preserve aspect ratio");

fs.writeFileSync('src/lib/utils/pdf.ts', code);
