import re

with open('src/app/api/logistics/inventory/route.ts', 'r') as f:
    content = f.read()

# For source === "inventory"
content = content.replace(
"""    if (source === "inventory") {
      const item = await prisma.inventoryItem.findUnique({ where: { id } });
      if (item && item.code) {
         await deleteAutoJournalByReference(item.code, "Xoá mã hàng hoá");
      }
      await prisma.stockMovement.deleteMany({ where: { inventoryItemId: id } });
      await prisma.inventoryItem.delete({ where: { id } });""",
"""    if (source === "inventory") {
      const item = await prisma.inventoryItem.findUnique({ where: { id } });
      if (!item) return NextResponse.json({ ok: true });
      if (item && item.code) {
         await deleteAutoJournalByReference(item.code, "Xoá mã hàng hoá");
      }
      await prisma.stockMovement.deleteMany({ where: { inventoryItemId: id } });
      try { await prisma.inventoryItem.delete({ where: { id } }); } catch (e) {}"""
)

# For source === "manufactured"
content = content.replace(
"""    } else if (source === "manufactured") {
      const item = await prisma.inventoryItem.findUnique({ where: { id } });
      if (item && item.code) {
         await deleteAutoJournalByReference(item.code, "Xoá thành phẩm");
      }
      await prisma.inventoryItem.delete({ where: { id } });""",
"""    } else if (source === "manufactured") {
      const item = await prisma.inventoryItem.findUnique({ where: { id } });
      if (!item) return NextResponse.json({ ok: true });
      if (item && item.code) {
         await deleteAutoJournalByReference(item.code, "Xoá thành phẩm");
      }
      try { await prisma.inventoryItem.delete({ where: { id } }); } catch (e) {}"""
)

# For source === "material" or default
content = content.replace(
"""    } else {
      const item = await prisma.inventoryItem.findUnique({ where: { id } });
      if (item && item.code) {
         await deleteAutoJournalByReference(item.code, "Xoá vật tư");
      }
      await prisma.stockMovement.deleteMany({ where: { inventoryItemId: id } });
      await prisma.inventoryItem.delete({ where: { id } });
    }""",
"""    } else {
      const item = await prisma.inventoryItem.findUnique({ where: { id } });
      if (!item) return NextResponse.json({ ok: true });
      if (item && item.code) {
         await deleteAutoJournalByReference(item.code, "Xoá vật tư");
      }
      await prisma.stockMovement.deleteMany({ where: { inventoryItemId: id } });
      try { await prisma.inventoryItem.delete({ where: { id } }); } catch (e) {}
    }"""
)

with open('src/app/api/logistics/inventory/route.ts', 'w') as f:
    f.write(content)

