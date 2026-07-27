import { NextRequest, NextResponse } from "next/server";
import { getServerSession }          from "next-auth";
import { authOptions }               from "@/lib/auth";
import { prisma }                    from "@/lib/prisma";
import * as XLSX                     from "xlsx";
import fs                            from "fs";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const formData = await req.formData();
    const file = formData.get("file") as File;
    if (!file) return NextResponse.json({ error: "No file uploaded" }, { status: 400 });

    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    // Chuyển Excel sang mảng JSON 2 chiều (bảng có mảng, có the skip header nếu cần)
    const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    if (!rawData || rawData.length === 0) {
      return NextResponse.json({ error: "File rỗng hoặc không đúng định dạng" }, { status: 400 });
    }

    // Tự động detect cột dựa trên dòng có nhiều dữ liệu nhất hoặc dựa trên index.
    // Dựa theo hình ảnh:
    // Cột 1: Mã (Code định mức/sản phẩm)
    // Cột 2: Mã nguyên vật liệu
    // Cột 3: ĐVT
    // Cột 4: Số lượng
    let startIndex = 0;
    let colPCode = 0;
    let colMCode = 1;
    let colMName = -1; // -1 means no column for material name found
    let colUnit = 2;
    let colQty = 3;
    let colReplaceCode = -1;
    let colCatCode = -1;

    // Tìm dòng tiêu đề (tìm dòng đầu tiên có chữ "Mã" hoặc "Sản phẩm")
    for (let i = 0; i < rawData.length; i++) {
      const row = rawData[i] as any[];
      const rowStr = row.map(c => String(c || "").toLowerCase().trim());
      
      const pCodeIdx = rowStr.findIndex(c => 
        c === "mã" || 
        (c && c.includes("mã") && (c.includes("sản phẩm") || c.includes("thành phẩm") || c.includes("định mức") || c.includes("đm")))
      );
      if (pCodeIdx !== -1) {
        startIndex = i + 1; // Bắt đầu từ dòng tiếp theo
        colPCode = pCodeIdx;
        
        // Tìm các cột còn lại dựa trên dòng header này
        const mCodeIdx = rowStr.findIndex(c => c && (c.includes("mã") && c.includes("vật tư") || (c.includes("mã") && c.includes("nguyên vật liệu")) || c === "mã nvl" || c === "mã vt"));
        if (mCodeIdx !== -1) colMCode = mCodeIdx;
        
        const mNameIdx = rowStr.findIndex(c => c && (c.includes("tên") && (c.includes("vật tư") || c.includes("nguyên vật liệu")) || c === "tên nvl" || c === "tên vt"));
        if (mNameIdx !== -1) colMName = mNameIdx;
        
        const unitIdx = rowStr.findIndex(c => c === "đvt" || c === "đơn vị tính" || c === "đơn vị");
        if (unitIdx !== -1) colUnit = unitIdx;

        const qtyIdx = rowStr.findIndex(c => c && (c.includes("số lượng") || c === "sl"));
        if (qtyIdx !== -1) colQty = qtyIdx;

        const replaceCodeIdx = rowStr.findIndex(c => c && (c.includes("mã thay thế") || c === "mã tt"));
        if (replaceCodeIdx !== -1) colReplaceCode = replaceCodeIdx;

        const catCodeIdx = rowStr.findIndex(c => c && (c.includes("mã nhóm pm") || c.includes("danh mục") || c.includes("nhóm")));
        if (catCodeIdx !== -1) colCatCode = catCodeIdx;

        break;
      }
    }
    // Nếu không tìm thấy header rõ ràng, giả sử dòng 1 là header và dùng index mặc định
    if (startIndex === 0 && rawData.length > 1) startIndex = 1;

    fs.writeFileSync('import-log.json', JSON.stringify({
      foundHeader: startIndex > 1 || (startIndex === 1 && (rawData[0] as any[])?.[0] !== "DANH SÁCH VẬT TƯ, HÀNG HÓA, DỊCH VỤ"), // just an approximation
      startIndex,
      colPCode,
      colMCode,
      colUnit,
      colQty,
      firstRows: rawData.slice(0, 3)
    }, null, 2));

    // XÓA TOÀN BỘ định mức (BOM) hiện có theo yêu cầu
    await prisma.dinhMuc.deleteMany({});

    // Tải tất cả MaterialItem
    const allMaterials = await prisma.materialItem.findMany({
      select: { id: true, code: true, unit: true, categoryId: true }
    });
    const materialMap = new Map();
    allMaterials.forEach(m => {
      if (m.code) materialMap.set(m.code.trim().toUpperCase(), m);
    });

    let bomsCreated = 0;
    let bomsUpdated = 0;
    let componentsAdded = 0;
    const missingProducts = new Set<string>();
    const missingMaterials = new Set<string>();
    const categoryIdsToUpdate = new Set<string>();

    let currentDinhMucId: string | null = null;
    let currentProductCode: string | null = null;

    // Bắt đầu transaction hoặc thực hiện tuần tự để tránh lỗi đồng thời
    for (let i = startIndex; i < rawData.length; i++) {
      const row = rawData[i] as any[];
      // Dùng các cột đã xác định được từ header
      const rawPCode = (row[colPCode] !== undefined && row[colPCode] !== null && row[colPCode] !== "") ? String(row[colPCode]).trim() : null;
      const mCodeRaw = (row[colMCode] !== undefined && row[colMCode] !== null && row[colMCode] !== "") ? String(row[colMCode]).trim() : null;
      const mNameRaw = (colMName !== -1 && row[colMName] !== undefined && row[colMName] !== null) ? String(row[colMName]).trim() : null;
      const mUnit = (row[colUnit] !== undefined && row[colUnit] !== null) ? String(row[colUnit]).trim() : "cái";
      const mQty = parseFloat(row[colQty]) || 0;

      // Nếu cả Mã SP và Mã VL đều trống thì bỏ qua
      if (!rawPCode && !mCodeRaw) continue;

      // 1. Kiểm tra Mã Sản Phẩm / Định Mức
      if (rawPCode) {
        currentProductCode = rawPCode;
        const product = materialMap.get(rawPCode.toUpperCase());
        
        if (product) {
          if (product.categoryId) {
            categoryIdsToUpdate.add(product.categoryId);
          }

          // Tìm định mức cho sản phẩm này
          let dinhMuc = await prisma.dinhMuc.findFirst({
            where: { materialItemId: product.id }
          });

          if (dinhMuc) {
            // Xoá vật tư cũ nếu đã tồn tại để thay thế bằng danh sách mới
            await prisma.dinhMucVatTu.deleteMany({
              where: { dinhMucId: dinhMuc.id }
            });
            currentDinhMucId = dinhMuc.id;
            bomsUpdated++;
          } else {
            // Tạo mới định mức
            const codeDm = `DM-${rawPCode}`;
            dinhMuc = await prisma.dinhMuc.create({
              data: {
                code: codeDm,
                tenDinhMuc: `Định mức tiêu chuẩn ${rawPCode}`,
                materialItemId: product.id
              }
            });
            currentDinhMucId = dinhMuc.id;
            bomsCreated++;
          }
        } else {
          missingProducts.add(rawPCode);
          currentDinhMucId = null; // Bỏ qua vật tư nếu không tìm thấy SP
        }
      }

      // 2. Thêm vật tư vào định mức hiện tại
      if (currentDinhMucId && mCodeRaw) {
        const material = materialMap.get(mCodeRaw.toUpperCase());
        if (!material) {
          missingMaterials.add(mCodeRaw);
        }
        
        await prisma.dinhMucVatTu.create({
          data: {
            dinhMucId: currentDinhMucId,
            materialId: material?.id || null,
            maVatTu: mCodeRaw,
            tenVatTu: material?.name || mNameRaw || mCodeRaw,
            donViTinh: mUnit || material?.unit || "cái",
            soLuong: mQty
          }
        });
        componentsAdded++;
      }
    }

    if (categoryIdsToUpdate.size > 0) {
      await prisma.category.updateMany({
        where: { id: { in: Array.from(categoryIdsToUpdate) } },
        data: { hasBom: true }
      });
    }

    const missingProductsArr = Array.from(missingProducts);
    
    // Save to temporary file for displaying in offcanvas
    if (missingProductsArr.length > 0) {
      fs.writeFileSync('missing-products.json', JSON.stringify(missingProductsArr));
    } else if (fs.existsSync('missing-products.json')) {
      fs.unlinkSync('missing-products.json');
    }

    return NextResponse.json({
      message: "Import thành công",
      bomsCreated,
      bomsUpdated,
      componentsAdded,
      missingProducts: missingProductsArr,
      missingMaterials: Array.from(missingMaterials)
    });

  } catch (e: any) {
    console.error("[POST /api/production/bom/import-excel]", e);
    fs.writeFileSync('import-error.log', e.stack || e.message || String(e));
    return NextResponse.json({ error: e.message || "Internal error" }, { status: 500 });
  }
}
