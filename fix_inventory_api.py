import re

with open('src/app/api/logistics/inventory/route.ts', 'r') as f:
    content = f.read()

# Replace the Promise.all and manual merging logic
old_logic = r'''    const mfpWhere: any = {};
    // Không lọc ManufacturedProduct theo categoryId vì nó dùng bảng Category khác với InventoryCategory
    // Thay vào đó, nếu không có search \(tải danh sách kho\) thì không trả về ManufacturedProduct để tránh loãng dữ liệu.
    // Nếu có search \(tìm kiếm gợi ý\) thì trả về để lọc in-memory.
    const includeManufactured = searchParams.get\("includeManufactured"\) === "true";
    const excludeMaterials = searchParams.get\("excludeMaterials"\) === "true";

    const \[invItems, matItems, invTotal, matTotal, mfpItems, mfpTotal\] = await Promise.all\(\[.*?\n    \]\);

    // Map and Merge\n.*?    // Paginate manually
    const total = search \? filteredItems.length : invTotal \+ matTotal \+ mfpTotal;'''

new_logic = '''    const includeManufactured = searchParams.get("includeManufactured") === "true";
    const excludeMaterials = searchParams.get("excludeMaterials") === "true";

    if (warehouseType === "PRODUCT_SYNC") {
      where.loai = "hang-hoa";
    } else if (warehouseType === "MATERIAL") {
      where.loai = "vat-tu";
    } else if (warehouseType === "PRODUCT") {
      where.loai = "thanh-pham";
    }
    
    if (excludeMaterials && warehouseType === "ALL") {
      where.loai = { not: "vat-tu" };
    }

    const [invItems, invTotal] = await Promise.all([
      prisma.inventoryItem.findMany({
        where,
        include: {
          category: { select: { id: true, name: true } },
          stocks: { include: { warehouse: true } },
          dinhMucs: true,
        },
        orderBy: { updatedAt: "desc" },
      }),
      prisma.inventoryItem.count({ where })
    ]);

    const allItems = invItems.map((it: any) => ({
      ...it,
      source: it.loai === "hang-hoa" ? "inventory" : (it.loai === "vat-tu" ? "material" : "manufactured"),
      categoryName: it.category?.name,
      dinhMucs: it.dinhMucs || []
    }));

    // Restore deduplication: Merge items with same code/name and COMBINE their stocks
    const deduplicatedMap = new Map();
    for (const item of allItems) {
      const key = item.code ? item.code.toLowerCase() : item.tenHang.toLowerCase();
      if (deduplicatedMap.has(key)) {
        const existing = deduplicatedMap.get(key);
        // Combine stocks
        existing.stocks = [...existing.stocks, ...item.stocks];
      } else {
        deduplicatedMap.set(key, { ...item, stocks: [...item.stocks] });
      }
    }
    const deduplicatedItems = Array.from(deduplicatedMap.values());

    // Compute total stats on allItems
    let tongGiaTri = 0;
    let hetHangCount = 0;
    let sapHetCount = 0;

    const allItemsWithStock = deduplicatedItems.map(item => {
      const relevantStocks = warehouseId
        ? item.stocks.filter((s: any) => s.warehouseId === warehouseId)
        : item.stocks;

      const soLuong = relevantStocks.reduce((acc: number, s: any) => acc + s.soLuong, 0);
      let trangThai = "con-hang";
      if (soLuong === 0) trangThai = "het-hang";
      else if ((item.soLuongMin || 0) > 0 && soLuong <= (item.soLuongMin || 0)) trangThai = "sap-het";

      const price = item.giaNhap || item.giaBan || 0;
      tongGiaTri += soLuong * price;

      if (soLuong === 0) {
        hetHangCount++;
      } else if ((item.soLuongMin || 0) > 0 && soLuong <= (item.soLuongMin || 0)) {
        sapHetCount++;
      }

      return {
        ...item,
        soLuong,
        trangThai,
      };
    });

    // Sort combined
    allItemsWithStock.sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime());

    const removeAccents = (str: string) => {
      return str ? str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase() : '';
    };

    let filteredItems = allItemsWithStock;
    if (search) {
      const searchNormalized = removeAccents(search);
      filteredItems = allItemsWithStock.filter(item => {
        const nameNorm = removeAccents(item.tenHang);
        const codeNorm = removeAccents(item.code);
        const modelNorm = removeAccents(item.model || '');
        return nameNorm.includes(searchNormalized) || codeNorm.includes(searchNormalized) || modelNorm.includes(searchNormalized);
      });
    }

    // Paginate manually
    const total = search ? filteredItems.length : invTotal;'''

new_content = re.sub(old_logic, new_logic, content, flags=re.DOTALL)
if new_content == content:
    print("FAILED to replace")
else:
    with open('src/app/api/logistics/inventory/route.ts', 'w') as f:
        f.write(new_content)
    print("Replaced successfully")
