const fs = require('fs');
const file = 'src/app/api/plan-finance/sales/[id]/route.ts';
let code = fs.readFileSync(file, 'utf8');

const regexAPI = /(const { keToanDuyet, decision, decisions, ngayGiao, ngayHoanThanhSanXuat, daThanhToan, trangThai, ghiChu, tongTien, items } = body;).*?(if \(!order\) {)/s;

const newAPI = `const { keToanDuyet, ngayGiao, ngayHoanThanhSanXuat, daThanhToan, trangThai, ghiChu, tongTien, productionItemIds = [] } = body;

    if (keToanDuyet !== undefined && !["pending", "approved", "rejected"].includes(keToanDuyet)) {
      return NextResponse.json({ error: "Trạng thái duyệt không hợp lệ" }, { status: 400 });
    }

    const order = await prisma.saleOrder.findUnique({
      where: { id },
      include: { customer: true, saleOrderItems: { include: { inventoryItem: true } } }
    });

    if (!order) {`;

code = code.replace(regexAPI, newAPI);

const regexLogic = /(\/\/ --- XỬ LÝ DUYỆT ĐƠN HÀNG: CHẠY NGẦM ---).*?(await tx\.debt\.create)/s;

const newLogic = `// --- XỬ LÝ DUYỆT ĐƠN HÀNG: CHẠY NGẦM ---
        if (order.trangThaiKho === "out_of_stock") {
          let orderItems = order.saleOrderItems || [];
          if (orderItems.length === 0) {
            const quotation = await prisma.quotation.findFirst({
              where: order.customerId ? { customerId: order.customerId, thanhTien: order.tongTien, trangThai: "won" } : { thanhTien: order.tongTien, ghiChu: order.ghiChu, trangThai: "won" },
              include: { items: { orderBy: { sortOrder: "asc" } } },
              orderBy: { createdAt: "desc" }
            });
            if (quotation) orderItems = quotation.items as any;
          }

          const missingHangHoaItems: any[] = [];
          const missingThanhPhamItems: any[] = [];

          for (const item of orderItems) {
            let invItem = item.inventoryItem;
            if (!invItem && item.tenHang) {
              invItem = await tx.inventoryItem.findFirst({ where: { tenHang: item.tenHang } });
            }
            if (!invItem) continue;

            const requiredQty = item.soLuong || 1;
            const currentStock = invItem.soLuong || 0;
            const missingQty = Math.max(0, requiredQty - currentStock);

            if (missingQty > 0) {
              const isChecked = productionItemIds.includes(item.id);
              
              if (isChecked) {
                // Đưa vào lệnh sản xuất
                let itemCode = null;
                try {
                  if (item.ghiChu) { const meta = JSON.parse(item.ghiChu); if (meta.code) itemCode = meta.code; }
                } catch(e){}
                let resolvedDinhMucId = invItem.dinhMucId;
                if (!resolvedDinhMucId && itemCode) {
                  const dm = await tx.dinhMuc.findFirst({ where: { OR: [{ code: \`DM-\${itemCode}\` }, { code: itemCode }] } });
                  if (dm) resolvedDinhMucId = dm.id;
                }
                if (resolvedDinhMucId) {
                  missingThanhPhamItems.push({ ...item, inventoryItemId: invItem.id, missingQty, dinhMucId: resolvedDinhMucId });
                } else {
                  // Fallback to mua hàng nếu không tìm thấy BOM
                  missingHangHoaItems.push({ ...item, inventoryItemId: invItem.id, missingQty });
                }
              } else {
                // Không tick chọn -> Đưa vào lệnh xuất kho bán hàng (nhưng thiếu hàng -> Mua hàng)
                missingHangHoaItems.push({ ...item, inventoryItemId: invItem.id, missingQty });
              }
            }
          }

          let prItemsToCreate = [];

          // XỬ LÝ SẢN XUẤT CHO CÁC MẶT HÀNG ĐƯỢC CHỌN
          if (missingThanhPhamItems.length > 0) {
            orderUpdate = await tx.saleOrder.update({ where: { id: order.id }, data: { trangThai: "in_production" } });

            const allMaterials: any[] = [];
            for (const item of missingThanhPhamItems) {
              const dm = await tx.dinhMuc.findUnique({
                where: { id: item.dinhMucId },
                include: { vatTu: { include: { material: true } } }
              });
              if (dm && dm.vatTu) {
                for (const m of dm.vatTu) {
                  allMaterials.push({
                    materialId: m.materialId,
                    tenVatTu: m.material?.name || m.tenVatTu || "Vật tư",
                    donVi: m.material?.unit || m.donViTinh || "cái",
                    soLuongCan: (m.soLuong || 1) * item.missingQty
                  });
                }
              }
            }

            const groupedMaterials = allMaterials.reduce((acc, curr) => {
              if (!acc[curr.materialId]) acc[curr.materialId] = { ...curr };
              else acc[curr.materialId].soLuongCan += curr.soLuongCan;
              return acc;
            }, {});

            const finalMaterialList: any[] = [];
            for (const mat of Object.values(groupedMaterials) as any[]) {
              // Get current stock
              const matStock = await tx.materialStock.aggregate({
                where: { materialId: mat.materialId },
                _sum: { soLuong: true }
              });
              const currentStock = matStock._sum.soLuong || 0;
              finalMaterialList.push({
                materialId: mat.materialId,
                tenVatTu: mat.tenVatTu,
                donVi: mat.donVi,
                soLuong: mat.soLuongCan,
              });

              if (currentStock < mat.soLuongCan) {
                prItemsToCreate.push({
                  inventoryItemId: mat.materialId,
                  tenHang: mat.tenVatTu,
                  soLuong: mat.soLuongCan - currentStock,
                  donVi: mat.donVi,
                  ghiChu: \`Bù vật tư thiếu để sản xuất đơn \${order.code}\`
                });
              }
            }

            if (finalMaterialList.length > 0) {
              await tx.task.create({
                data: {
                  title: \`Lệnh xuất kho KVP cho đơn hàng \${order.code}\`,
                  description: \`Xuất kho vật tư để sản xuất đơn bán hàng \${order.code}.\\n\\nDanh sách vật tư:\\n\` + finalMaterialList.map(m => \`- \${m.tenVatTu} (\${m.soLuong} \${m.donVi})\`).join('\\n'),
                  priority: "high",
                  status: "pending",
                  deptCode: "logistics",
                  creatorId: session.user?.id || "",
                  assigneeId: "cmra9w69y000e8oq76v24c2g6",
                }
              });
            }

            await tx.task.create({
              data: {
                title: \`Lệnh sản xuất cho đơn hàng \${order.code}\`,
                description: \`Sản xuất lắp ráp sản phẩm cho đơn bán hàng \${order.code}. Các mặt hàng cần sản xuất:\\n\` + missingThanhPhamItems.map(i => \`- \${i.tenHang} (cần \${i.missingQty} \${i.donVi || 'cái'})\`).join('\\n'),
                priority: "high",
                status: "pending",
                deptCode: "production",
                creatorId: session.user?.id || "",
                assigneeId: "cmra9xkfp000j8oq7nf53lib2",
              }
            });
          }

          // XỬ LÝ MUA HÀNG THIẾU
          for (const item of missingHangHoaItems) {
            prItemsToCreate.push({
              inventoryItemId: item.inventoryItemId,
              tenHang: item.tenHang,
              soLuong: item.missingQty,
              donVi: item.donVi || "cái",
              ghiChu: \`Mua bù hàng hoá thiếu cho đơn \${order.code}\`
            });
          }

          if (prItemsToCreate.length > 0) {
            await tx.purchaseRequest.create({
              data: {
                code: \`YCMH-\${new Date().getFullYear()}${(new Date().getMonth()+1).toString().padStart(2,'0')}\${new Date().getDate().toString().padStart(2,'0')}-\${Math.floor(Math.random()*1000).toString().padStart(3,'0')}\`,
                nguoiYeuCau: "Hệ thống tự động (Kế toán)",
                donVi: "Mua hàng",
                lyDo: \`Bổ sung hàng/vật tư cho đơn \${order.code}\`,
                trangThai: "cho-xu-ly",
                createdById: session.user?.id || "",
                items: { create: prItemsToCreate }
              }
            });

            await tx.notification.create({
              data: {
                title: \`Yêu cầu mua hàng mới từ đơn \${order.code}\`,
                message: \`Hệ thống tự động bóc tách và tạo yêu cầu mua hàng.\`,
                type: "alert",
                isRead: false,
                userId: "cmrbs33zy0000gr670d0icaru", // Người phụ trách mua hàng
                link: "/logistics/procurement"
              }
            });
          }
        }

        // Notify Logistics
        await tx.notification.create({
          data: {
            title: \`Lệnh xuất kho cho đơn hàng \${order.code}\`,
            message: \`Kế toán đã duyệt đơn bán hàng \${order.code}. Vui lòng kiểm tra và chuẩn bị hàng.\`,
            type: "alert",
            isRead: false,
            userId: "cmra9w69y000e8oq76v24c2g6", // Thủ kho
            link: "/logistics"
          }
        });

        `;
code = code.replace(regexLogic, newLogic + "\n        await tx.debt.create");
fs.writeFileSync(file, code);
