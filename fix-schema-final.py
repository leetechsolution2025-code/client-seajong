import re

with open('prisma/schema.prisma', 'r') as f:
    schema = f.read()

# Fix InventoryItem
item_match = re.search(r'(model InventoryItem \{.*?\n\})', schema, re.DOTALL)
if item_match:
    item_block = item_match.group(1)
    
    # Remove dinhMucId and dinhMuc relation
    new_item_block = re.sub(r'\s*dinhMucId\s+String\?\n', '\n', item_block)
    new_item_block = re.sub(r'\s*dinhMuc\s+DinhMuc\?\s+@relation\(fields:\s*\[dinhMucId\],\s*references:\s*\[id\]\)\n', '\n  dinhMucs             DinhMuc[]\n', new_item_block)
    
    # Remove @@index([dinhMucId])
    new_item_block = re.sub(r'\s*@@index\(\[dinhMucId\]\)\n', '\n', new_item_block)
    
    schema = schema.replace(item_block, new_item_block)

# Fix InventoryCategory
cat_match = re.search(r'(model InventoryCategory \{.*?\n\})', schema, re.DOTALL)
if cat_match:
    cat_block = cat_match.group(1)
    
    # Remove inventoryItemId and inventoryItem relation
    new_cat_block = re.sub(r'\s*inventoryItemId\s+String\?\n', '\n', cat_block)
    new_cat_block = re.sub(r'\s*inventoryItem\s+InventoryItem\?\s+@relation\(fields:\s*\[inventoryItemId\],\s*references:\s*\[id\]\)\n', '\n', new_cat_block)
    
    # Ensure items InventoryItem[] is present if missing
    if 'items                InventoryItem[]' not in new_cat_block:
        new_cat_block = new_cat_block.replace('children             InventoryCategory[]   @relation("CategoryHierarchy")', 'children             InventoryCategory[]   @relation("CategoryHierarchy")\n  items                InventoryItem[]')
        
    # Remove @@index([inventoryItemId])
    new_cat_block = re.sub(r'\s*@@index\(\[inventoryItemId\]\)\n', '\n', new_cat_block)
    
    schema = schema.replace(cat_block, new_cat_block)

with open('prisma/schema.prisma', 'w') as f:
    f.write(schema)

print("Fixed schema!")
