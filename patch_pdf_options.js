const fs = require('fs');
let code = fs.readFileSync('src/lib/utils/pdf.ts', 'utf8');

code = code.replace(/paginate = true,\n  } = options;/g, 
  "paginate = true,\n    keepOriginalStyles = false,\n  } = options;");

fs.writeFileSync('src/lib/utils/pdf.ts', code);
