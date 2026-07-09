const fs = require('fs');

function fixFile(file) {
  let content = fs.readFileSync(file, 'utf-8');
  
  // Fix currentStep === 1 closing div
  // The end of step 1 is right before {/* STEP 2: KẾ HOẠCH THÁNG */}
  content = content.replace(
    /(\s*)(\s*<\/div>\n\s*<\/div>\n\s*\)}\n\n\s*\{\/\* STEP 2)/,
    '$1$2\n$1</div>' // Actually wait, I need to add one more </div> before )}
  );
  
  fs.writeFileSync(file, content);
}

// Just trying to see if I can do it with regex
