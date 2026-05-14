const fs = require('fs');

function findFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = dir + '/' + file;
    if (fs.statSync(filePath).isDirectory()) {
      findFiles(filePath, fileList);
    } else if (filePath.endsWith('.tsx') || filePath.endsWith('.jsx')) {
      fileList.push(filePath);
    }
  }
  return fileList;
}

const files = findFiles('/Users/leanhvan/master-project/src/app/(dashboard)');

let count = 0;
files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let original = content;

  // Pattern for all standard modules
  const p8Regex = /\s*<div className="p-8 flex-1">[\s\S]*?Module .* đang được.*?\n\s*<\/div>\n\s*<\/div>/g;
  let newContent = content.replace(p8Regex, '\n      <div className="p-8 flex-1"></div>');
  
  // also check for "đang được" with different unicode marks or strictly generic
  const genericRegex = /\s*<div className="p-8 flex-1">[\s\S]*?<i className="bi bi-.*?\n\s*<p .*?Module .* đang được.*\n\s*<\/div>\n\s*<\/div>/g;
  newContent = newContent.replace(genericRegex, '\n      <div className="p-8 flex-1"></div>');

  // Pattern for HR
  const hrRegex = /\s*<div className="flex-grow-1 p-4 overflow-y-auto">\s*<div className="p-8 flex-1">[\s\S]*?Module Nhân sự đang được.*\n\s*<\/div>\n\s*<\/div>\n\s*<\/div>/g;
  newContent = newContent.replace(hrRegex, '\n      <div className="flex-grow-1 p-4 overflow-y-auto"></div>');

  if (newContent !== original) {
    fs.writeFileSync(file, newContent);
    console.log(`Updated: ${file}`);
    count++;
  }
});
console.log(`Total files updated: ${count}`);
