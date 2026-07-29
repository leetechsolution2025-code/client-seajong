const fs = require('fs');

const file = 'src/components/finance/InventoryManagement.tsx';
let content = fs.readFileSync(file, 'utf-8');

const regex = /setStats\(data\.stats \|\| data\);/;
const replacement = `
      if (data.error) {
        console.error("API returned error:", data.error);
        return; // Don't set stats to error object
      }
      setStats(data.stats || data);
`;

if (regex.test(content)) {
  content = content.replace(regex, replacement);
  fs.writeFileSync(file, content);
  console.log("Patched UI error handling successfully!");
} else {
  console.log("Could not find setStats call in UI.");
}
