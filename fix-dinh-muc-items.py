import re

with open('prisma/schema.prisma', 'r') as f:
    schema = f.read()

# Replace items InventoryItem[] in DinhMuc specifically
dinh_muc_match = re.search(r'(model DinhMuc \{.*?\})', schema, re.DOTALL)
if dinh_muc_match:
    dinh_muc_block = dinh_muc_match.group(1)
    
    # Replace the items field
    new_dinh_muc_block = dinh_muc_block.replace(
        'items      InventoryItem[]',
        'inventoryItemId String?\n  inventoryItem   InventoryItem? @relation(fields: [inventoryItemId], references: [id])'
    )
    
    # Add index if missing
    if '@@index([inventoryItemId])' not in new_dinh_muc_block:
        new_dinh_muc_block = new_dinh_muc_block.replace('@@index([code])', '@@index([code])\n  @@index([inventoryItemId])')
        
    schema = schema.replace(dinh_muc_block, new_dinh_muc_block)

with open('prisma/schema.prisma', 'w') as f:
    f.write(schema)

print("Fixed DinhMuc items!")
