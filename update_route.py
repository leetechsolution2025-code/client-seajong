import re
with open('src/app/api/logistics/batch-packing/route.ts', 'r') as f:
    content = f.read()

# Change grouping key
search = '''      for (const item of order.saleOrderItems) {
        const key = item.inventoryItemId || item.tenHang;
        if (!key) continue;'''

repl = '''      for (const item of order.saleOrderItems) {
        const rawKey = item.inventoryItemId || item.tenHang;
        if (!rawKey) continue;
        const ngayGiaoStr = order.ngayGiao ? new Date(order.ngayGiao).toISOString() : "Không hẹn ngày";
        const key = `${ngayGiaoStr}_${rawKey}`;'''

content = content.replace(search, repl)

# Add ngayGiao to batchItem
search2 = '''            viTriKho: viTriStr,
            tongSoLuong: 0,
            orders: []
          });'''

repl2 = '''            viTriKho: viTriStr,
            tongSoLuong: 0,
            ngayGiao: order.ngayGiao,
            orders: []
          });'''

content = content.replace(search2, repl2)

with open('src/app/api/logistics/batch-packing/route.ts', 'w') as f:
    f.write(content)
print("Updated route.ts")
