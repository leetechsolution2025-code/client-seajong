const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
  const code = "DM-VT201-02";
  const tenDinhMuc = "Test";
  const id = "cmowm42cx00008o6tkaansqjw"; // DinhMuc ID

  try {
    console.log("Deleting...");
    await prisma.$executeRaw`DELETE FROM DinhMucVatTu WHERE dinhMucId = ${id}`;
    
    console.log("Updating...");
    await prisma.$executeRaw`
      UPDATE DinhMuc SET code = ${code}, tenDinhMuc = ${tenDinhMuc}, updatedAt = CURRENT_TIMESTAMP
      WHERE id = ${id}
    `;

    console.log("Inserting...");
    const lineId = Date.now().toString() + Math.random().toString(36).slice(2);
    // Insert with NO materialId first to isolate the issue
    await prisma.$executeRaw`
      INSERT INTO DinhMucVatTu (id, dinhMucId, materialId, tenVatTu, soLuong, donViTinh, ghiChu)
      VALUES (${lineId}, ${id}, NULL, 'Test', 1, 'Cái', '')
    `;
    console.log("SUCCESS");
  } catch(e) {
    console.error("ERROR", e);
  }
}
test();
