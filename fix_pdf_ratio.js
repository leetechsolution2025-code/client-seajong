const fs = require('fs');
let code = fs.readFileSync('src/lib/utils/pdf.ts', 'utf8');

code = code.replace(/pdf\.addImage\(imgData, "JPEG", 0, 0, pageWidthMm, pageHeightMm\);/g, 
  `const imgWidth = pageWidthMm;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      pdf.addImage(imgData, "JPEG", 0, 0, imgWidth, imgHeight);`);

fs.writeFileSync('src/lib/utils/pdf.ts', code);
