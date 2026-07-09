const fs = require("fs");
let content = fs.readFileSync("src/components/marketing/ProductDrawer.tsx", "utf8");

// Move the closing div from before the footer to after the footer.
content = content.replace(/      <\/div>\n\n      \{\/\* ── FOOTER CỐ ĐỊNH ── \*\/\}/g, "      {/* ── FOOTER CỐ ĐỊNH ── */}");
content = content.replace(/          seajong\.com\n        <\/a>\n      <\/div>\n    <\/>/g, "          seajong.com\n        </a>\n      </div>\n      </div>\n    </>");

fs.writeFileSync("src/components/marketing/ProductDrawer.tsx", content);
console.log("Patched ProductDrawer.tsx successfully");
