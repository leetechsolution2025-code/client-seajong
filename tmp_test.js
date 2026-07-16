const fs = require('fs/promises');
const path = require('path');
async function test() {
  const p = path.join(process.cwd(), "storage", "uploads", "test.jpg");
  try {
    const s = await fs.stat(p);
    console.log("stat ok:", s.isFile());
  } catch (e) {
    console.error("error:", e.message);
  }
}
test();
