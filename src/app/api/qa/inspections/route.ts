import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { searchParams } = req.nextUrl;
    const isSeed = searchParams.get("seed") === "true";

    // Auto seed mock data if empty and seed param is provided
    const count = await prisma.qualityInspection.count();
    if (count === 0 && isSeed) {
      const mockData = [
        { code: "QC-20260717-107", type: "IQC", productName: "Cartridge gốm 35mm", requesterName: "Nguyễn Thị D", requesterDept: "Bộ phận Mua hàng", status: "Chưa thực hiện", notes: "Chờ kiểm tra lô hàng mới nhập", executionTime: new Date("2026-07-17T09:00:00Z"), metadata: JSON.stringify({ supplierName: "Công ty Phụ kiện Nhà bếp T&T", poNumber: "PO-202607-042", deliveryNote: "DN-42991" }) },
        { code: "QC-20260717-106", type: "OQC", productName: "Thân vòi đồng thau đúc", requesterName: "Lê Văn E", requesterDept: "Bộ phận Sản xuất", status: "Chưa thực hiện", notes: "Cần kiểm tra độ dày thành lỗ", executionTime: new Date("2026-07-17T08:30:00Z"), metadata: JSON.stringify({ productionOrder: "LSX-20260717-01", bomCode: "BOM-TV01-TH", assemblyTeam: "Tổ Đúc 02" }) },
        { code: "QC-20260716-105", type: "IQC", productName: "Lõi đồng van chia nước", requesterName: "Trần Văn A", requesterDept: "Bộ phận Mua hàng", status: "Đã hoàn thành", result: "Đạt", notes: "Kích thước ren đạt chuẩn", executionTime: new Date("2026-07-16T14:30:00Z"), inspectorName: "Nguyễn Văn QC", metadata: JSON.stringify({ supplierName: "Vật tư điện nước Hải Âu", poNumber: "PO-202607-021", deliveryNote: "DN-88211" }) },
        { code: "QC-20260716-104", type: "OQC", productName: "Sen cây truyền thống", requesterName: "Lê Thị B", requesterDept: "Bộ phận Kho vận", status: "Đã hoàn thành", result: "Không đạt", notes: "Trầy xước bề mặt mạ (x2 SP)", executionTime: new Date("2026-07-16T13:15:00Z"), inspectorName: "Nguyễn Văn QC", metadata: JSON.stringify({ productionOrder: "LSX-20260715-05", bomCode: "BOM-SC03-TR", assemblyTeam: "Tổ Lắp Ráp 01" }) },
        { code: "QC-20260716-103", type: "OQC", productName: "Vòi lavabo âm tường (BTP)", requesterName: "Nguyễn Văn C", requesterDept: "Bộ phận Sản xuất", status: "Đã hoàn thành", result: "Đạt", notes: "Kiểm tra áp lực nội bộ: OK", executionTime: new Date("2026-07-16T10:45:00Z"), inspectorName: "Nguyễn Văn QC", metadata: JSON.stringify({ productionOrder: "LSX-20260715-02", bomCode: "BOM-VL02-AT", assemblyTeam: "Tổ Kiểm Thử" }) },
        { code: "QC-20260715-089", type: "IQC", productName: "Dây cấp nước Inox 304", requesterName: "Trần Văn A", requesterDept: "Bộ phận Mua hàng", status: "Đã hoàn thành", result: "Không đạt", notes: "Chiều dài hụt 2cm so với chuẩn", executionTime: new Date("2026-07-15T16:00:00Z"), inspectorName: "Nguyễn Văn QC", metadata: JSON.stringify({ supplierName: "Inox Toàn Cầu", poNumber: "PO-202607-009", deliveryNote: "DN-11200" }) },
        { code: "QC-20260715-088", type: "OQC", productName: "Vòi bếp dây rút mạ đồng", requesterName: "Lê Thị B", requesterDept: "Bộ phận Kho vận", status: "Đã hoàn thành", result: "Đạt", notes: "Đầy đủ phụ kiện, ngoại quan đẹp", executionTime: new Date("2026-07-15T14:20:00Z"), inspectorName: "Nguyễn Văn QC", metadata: JSON.stringify({ productionOrder: "LSX-20260714-08", bomCode: "BOM-VB05-DR", assemblyTeam: "Tổ Đóng Gói" }) },
        { code: "QC-20260715-087", type: "OQC", productName: "Củ sen nóng lạnh", requesterName: "Nguyễn Văn C", requesterDept: "Bộ phận Sản xuất", status: "Đã hoàn thành", result: "Không đạt", notes: "Lắp ráp sai vị trí gioăng cao su", executionTime: new Date("2026-07-15T09:30:00Z"), inspectorName: "Nguyễn Văn QC", metadata: JSON.stringify({ productionOrder: "LSX-20260714-02", bomCode: "BOM-CS02-NL", assemblyTeam: "Tổ Lắp Ráp 03" }) },
      ];
      await prisma.qualityInspection.createMany({ data: mockData });
    }

    const q = searchParams.get("q") ?? "";

    let whereClause: any = {};
    if (q) {
      whereClause.OR = [
        { code: { contains: q } },
        { productName: { contains: q } },
        { inspectorName: { contains: q } },
      ];
    }

    const list = await prisma.qualityInspection.findMany({
      where: whereClause,
      orderBy: { executionTime: "desc" },
      include: {
        inventoryItem: { select: { tenHang: true, code: true } }
      }
    });

    const enrichedList = await Promise.all(list.map(async (ins) => {
      let meta: any = null;
      if (ins.metadata) {
        try {
          meta = typeof ins.metadata === "string" ? JSON.parse(ins.metadata) : ins.metadata;
        } catch (e) {}
      }

      let items: any[] = meta?.items || [];

      // If items is empty and it has a productionOrder, attempt to resolve items from production task or saleOrder
      if (items.length === 0 && meta?.productionOrder) {
        try {
          const prodTask = await prisma.task.findFirst({
            where: {
              deptCode: "production",
              title: { contains: meta.productionOrder }
            }
          });

          if (prodTask && prodTask.actualResult) {
            const parsed = JSON.parse(prodTask.actualResult);
            for (const pt of parsed) {
              let bom: any = null;
              if (pt.dinhMucId) {
                bom = await prisma.dinhMuc.findUnique({ where: { id: pt.dinhMucId } });
              }
              items.push({
                saleOrderItemId: pt.saleOrderItemId,
                tenHang: pt.tenHang,
                soLuong: pt.missingQty || pt.soLuong || 1,
                donVi: pt.donVi || "bộ",
                dinhMucId: pt.dinhMucId,
                dinhMucCode: bom?.code || null,
                dinhMucTen: bom?.tenDinhMuc || null
              });
            }
          }

          if (items.length === 0) {
            const so = await prisma.saleOrder.findFirst({
              where: {
                OR: [{ code: meta.productionOrder }, { id: meta.productionOrder }]
              },
              include: { saleOrderItems: true }
            });
            if (so && so.saleOrderItems) {
              for (const it of so.saleOrderItems) {
                let parsedGhiChu: any = null;
                if (it.ghiChu) {
                  try { parsedGhiChu = JSON.parse(it.ghiChu); } catch (e) {}
                }
                const resolvedDinhMucId = it.dinhMucId || parsedGhiChu?.dinhMucId || null;
                let bom: any = null;
                if (resolvedDinhMucId) {
                  bom = await prisma.dinhMuc.findUnique({ where: { id: resolvedDinhMucId } });
                }
                items.push({
                  saleOrderItemId: it.id,
                  tenHang: it.tenHang,
                  soLuong: it.soLuong,
                  donVi: "cái",
                  dinhMucId: resolvedDinhMucId,
                  dinhMucCode: bom?.code || parsedGhiChu?.bomCode || null,
                  dinhMucTen: bom?.tenDinhMuc || parsedGhiChu?.dinhMucTen || null
                });
              }
            }
          }
        } catch (err) {
          console.error("Error resolving items for QC:", err);
        }
      }

      // Remove mock bomCode starting with BOM- if present
      if (meta && meta.bomCode && meta.bomCode.startsWith("BOM-")) {
        delete meta.bomCode;
      }

      // Ensure every item has its real product code (Model/SKU) and NOT dinhMucCode
      items = await Promise.all(items.map(async (it: any) => {
        let model = it.model || it.productCode || it.code || "";
        if (model && (model.startsWith("DM-") || model.startsWith("BOM-") || model === it.dinhMucCode)) {
          model = "";
        }

        if (!model && it.dinhMucId) {
          try {
            const bom = await prisma.dinhMuc.findUnique({
              where: { id: it.dinhMucId },
              include: { inventoryItem: true }
            });
            if (bom?.inventoryItem?.code) model = bom.inventoryItem.code;
            else if (bom?.inventoryItem?.model) model = bom.inventoryItem.model;
          } catch (e) {}
        }

        if (!model && it.saleOrderItemId) {
          try {
            const soItem = await prisma.saleOrderItem.findUnique({
              where: { id: it.saleOrderItemId },
              include: { inventoryItem: true }
            });
            if (soItem?.inventoryItem?.code) model = soItem.inventoryItem.code;
            else if (soItem?.inventoryItem?.model) model = soItem.inventoryItem.model;
          } catch (e) {}
        }

        if (!model && ins.inventoryItemId) {
          try {
            const inv = await prisma.inventoryItem.findUnique({ where: { id: ins.inventoryItemId } });
            if (inv?.code) model = inv.code;
            else if (inv?.model) model = inv.model;
          } catch (e) {}
        }

        if (!model && (it.tenHang || it.productName)) {
          try {
            const inv = await prisma.inventoryItem.findFirst({
              where: { tenHang: it.tenHang || it.productName }
            });
            if (inv?.code) model = inv.code;
            else if (inv?.model) model = inv.model;
          } catch (e) {}
        }

        return {
          ...it,
          model: model || "",
          productCode: model || ""
        };
      }));

      return {
        ...ins,
        metadata: meta ? JSON.stringify({ ...meta, items }) : JSON.stringify({ items }),
        items
      };
    }));

    return NextResponse.json(enrichedList);
  } catch (error: any) {
    console.error("QA Inspection GET Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
