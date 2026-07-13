const fs = require('fs');
let code = fs.readFileSync('src/lib/utils/pdf.ts', 'utf8');

code = code.replace(/if \(\!keepOriginalStyles\) stripTableBackgrounds\(clonedPage\);\n\s*injectPDFStyles\(clonedPage, orientation\);/g, 
  "if (!keepOriginalStyles) stripTableBackgrounds(clonedPage);\n      injectPDFStyles(clonedPage, orientation, keepOriginalStyles);");

code = code.replace(/stripTableBackgrounds\(clonedPage\);\n\s*injectPDFStyles\(clonedPage, orientation\);/g, 
  "if (!keepOriginalStyles) stripTableBackgrounds(clonedPage);\n  injectPDFStyles(clonedPage, orientation, keepOriginalStyles);");

fs.writeFileSync('src/lib/utils/pdf.ts', code);
