with open("src/app/api/logistics/inventory/import/route.ts", "r") as f:
    content = f.read()

# Replace existingInventory block
content = content.replace(
"""        if (existingInventory) {
          inventoryId = existingInventory.id;
        } else {""",
"""        if (existingInventory) {
          inventoryId = existingInventory.id;
          // Cập nhật lại thông tin nếu đã tồn tại nhưng thiếu category
          await tx.inventoryItem.update({
             where: { id: inventoryId },
             data: {
               erpCategoryId: mappedCategoryId,
               tenHang: item.name,
               maThayThe: item.alternateCode || null,
             }
          });
        } else {""")

# Replace newInventory block
content = content.replace(
"""              maThayThe: item.alternateCode || null,
              loai: whCode === "KVP" ? "vat-tu" : "hang-hoa"
            }""",
"""              maThayThe: item.alternateCode || null,
              loai: whCode === "KVP" ? "vat-tu" : "hang-hoa",
              erpCategoryId: mappedCategoryId
            }""")

with open("src/app/api/logistics/inventory/import/route.ts", "w") as f:
    f.write(content)
