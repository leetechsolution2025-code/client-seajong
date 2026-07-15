const fs = require('fs');
const file = 'src/app/api/plan-finance/sales/[id]/route.ts';
let content = fs.readFileSync(file, 'utf8');

// We will use replace with regex to rewrite the whole "if (order.trangThaiKho === 'out_of_stock')" block until "return NextResponse.json"
const startIndex = content.indexOf('        } else if (order.trangThaiKho === "out_of_stock") {');
const endIndex = content.indexOf('      return orderUpdate;');

if (startIndex === -1 || endIndex === -1) {
    console.error("Could not find boundaries");
    process.exit(1);
}

const replacement = `        } else if (order.trangThaiKho === "out_of_stock") {
          const missingHangHoaItems: any[] = [];
          const missingThanhPhamItems: any[] = [];
          const itemsInStockToExport: any[] = [];

          // Phân loại các mặt hàng trong đơn
          for (const item of order.saleOrderItems) {
            const invItem = await tx.inventoryItem.findFirst({ where: { id: item.inventoryItemId } });
            const availableStock = invItem ? invItem.soLuong : 0;
            const requiredQty = item.soLuong;
            
            // 1. Phần có sẵn trong kho thì đưa vào danh sách xuất kho giao khách
            const exportQty = Math.min(availableStock, requiredQty);
            if (exportQty > 0) {
              itemsInStockToExport.push({
                tenHang: invItem?.tenHang || "Hàng hoá không xác định",
                donVi: invItem?.donVi || "cái",
                soLuong: exportQty
              });
            }

            // 2. Phần thiếu hụt
            if (availableStock < requiredQty) {
              const missingQty = requiredQty - availableStock;
              
              let resolvedDinhMucId = invItem?.dinhMucId || null;
              let itemCode = null;
              try {
                if (item.ghiChu) {
                  const meta = JSON.parse(item.ghiChu);
                  if (meta.code) itemCode = meta.code;
                }
              } catch(e){}

              if (!resolvedDinhMucId && itemCode) {
                const dm = await tx.dinhMuc.findFirst({ 
                  where: { OR: [{ code: \`DM-\${itemCode}\` }, { code: itemCode }] } 
                });
                if (dm) resolvedDinhMucId = dm.id;
              }

              const record = {
                saleOrderItemId: item.id,
                inventoryItemId: invItem?.id || null,
                tenHang: invItem?.tenHang || "Hàng hoá",
                donVi: invItem?.donVi || "cái",
                missingQty,
                donGia: item.donGia,
                dinhMucId: resolvedDinhMucId
              };
              
              // Nếu item.id nằm trong danh sách được tích Checkbox ở offcanvas -> Cho vào sản xuất
              const isSelectedForProduction = productionItemIds.includes(item.id);
              
              if (isSelectedForProduction && resolvedDinhMucId) {
                missingThanhPhamItems.push(record);
              } else {
                missingHangHoaItems.push(record);
              }
            }
          }

          const prItemsToCreate: any[] = [];
          const extractedMaterials: any[] = [];

          // A. XỬ LÝ MUA HÀNG CHO CÁC HÀNG HOÁ THIẾU (Không tick sản xuất)
          for (const item of missingHangHoaItems) {
            prItemsToCreate.push({
              inventoryItemId: item.inventoryItemId,
              tenHang: item.tenHang,
              soLuong: item.missingQty,
              donVi: item.donVi || "cái",
              ghiChu: \`Mua thẳng hàng hoá thiếu cho đơn \${order.code}\`
            });
          }

          // B. XỬ LÝ SẢN XUẤT VÀ BÓC TÁCH VẬT TƯ (Cho các item có tick sản xuất)
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
                    tenVatTu: m.material?.name || "Vật tư không xác định",
                    donVi: m.material?.unit || "cái",
                    soLuongCan: m.soLuong * item.missingQty
                  });
                }
              }
            }

            const groupedMaterials = allMaterials.reduce((acc, curr) => {
              if (!acc[curr.materialId]) acc[curr.materialId] = { ...curr };
              else acc[curr.materialId].soLuongCan += curr.soLuongCan;
              return acc;
            }, {});

            for (const mat of Object.values(groupedMaterials) as any[]) {
              // Lấy tồn kho vật tư từ MaterialStock
              const matStock = await tx.materialStock.aggregate({
                where: { materialId: mat.materialId },
                _sum: { soLuong: true }
              });
              const currentStock = matStock._sum.soLuong || 0;
              
              extractedMaterials.push({
                materialId: mat.materialId,
                tenVatTu: mat.tenVatTu,
                donVi: mat.donVi,
                soLuong: mat.soLuongCan,
              });

              if (currentStock < mat.soLuongCan) {
                prItemsToCreate.push({
                  inventoryItemId: null,
                  tenHang: mat.tenVatTu,
                  soLuong: mat.soLuongCan - currentStock,
                  donVi: mat.donVi,
                  ghiChu: \`Bù vật tư thiếu để sản xuất đơn \${order.code}\`
                });
              }
            }

            // Gửi lệnh sản xuất
            const prodHead = await tx.employee.findFirst({
              where: {
                status: "active",
                OR: [
                  { departmentName: { contains: "Sản xuất" }, position: { contains: "Trưởng" } },
                  { departmentCode: { contains: "production" }, position: { contains: "Trưởng" } }
                ]
              },
              select: { userId: true }
            });

            let desc = \`Yêu cầu sản xuất cho đơn hàng \${order.code}.\\nCác mặt hàng:\\n\`;
            missingThanhPhamItems.forEach(i => desc += \`- \${i.tenHang}: \${i.missingQty} \${i.donVi}\\n\`);

            let dueDate;
            if (order.ngayGiao) {
              dueDate = new Date(order.ngayGiao);
              dueDate.setDate(dueDate.getDate() - 2);
            }

            const prodTask = await tx.task.create({
              data: {
                title: \`Lệnh sản xuất cho đơn hàng \${order.code}\`,
                description: desc,
                assigneeId: prodHead?.userId || session.user.id,
                creatorId: session.user.id,
                deptCode: "production",
                priority: "high",
                status: "pending",
                ...(dueDate && { dueDate })
              }
            });

            if (prodHead?.userId) {
              const prodNotif = await tx.notification.create({
                data: {
                  title: \`🏭 Yêu cầu sản xuất lắp ráp cho đơn \${order.code}\`,
                  content: \`Đơn bán hàng \${order.code} cần sản xuất lắp ráp. Đã tạo lệnh: "\${prodTask.title}".\`,
                  type: "warning",
                  priority: "high",
                  audienceType: "individual",
                  audienceValue: prodHead.userId,
                  createdById: session.user.id
                }
              });
              await tx.notificationRecipient.upsert({
                where: { notificationId_userId: { notificationId: prodNotif.id, userId: prodHead.userId } },
                update: {},
                create: { notificationId: prodNotif.id, userId: prodHead.userId }
              });
            }
          }

          // C. TẠO LỆNH XUẤT KHO CHUNG (Hàng có sẵn + Vật tư sản xuất)
          if (itemsInStockToExport.length > 0 || extractedMaterials.length > 0) {
            let materialDesc = \`Yêu cầu xuất kho cho đơn hàng \${order.code}.\\n\\n\`;
            
            if (itemsInStockToExport.length > 0) {
              materialDesc += \`📦 1. HÀNG HOÁ GIAO KHÁCH (Kho thành phẩm):\\n\`;
              itemsInStockToExport.forEach(m => materialDesc += \`- \${m.tenHang}: \${m.soLuong} \${m.donVi}\\n\`);
              materialDesc += \`\\n\`;
            }

            if (extractedMaterials.length > 0) {
              materialDesc += \`🔧 2. VẬT TƯ SẢN XUẤT (Kho linh kiện KVP):\\n\`;
              extractedMaterials.forEach(m => materialDesc += \`- \${m.tenVatTu}: \${m.soLuong} \${m.donVi}\\n\`);
            }

            const khoTask = await tx.task.create({
              data: {
                title: \`Lệnh xuất kho cho đơn hàng \${order.code}\`,
                description: materialDesc,
                assigneeId: storekeeperUserIds[0] || session.user.id,
                creatorId: session.user.id,
                deptCode: "logistics",
                priority: "high",
                status: "pending"
              }
            });

            // Gửi thông báo Lệnh Xuất Kho
            if (storekeeperUserIds.length > 0) {
              const khoNotif = await tx.notification.create({
                data: {
                  title: \`📦 Lệnh xuất kho mới (\${order.code})\`,
                  content: \`Đã tạo Lệnh xuất kho cho đơn hàng \${order.code}. Xem chi tiết trong module Công việc.\`,
                  type: "info",
                  priority: "high",
                  audienceType: "group",
                  audienceValue: JSON.stringify(storekeeperUserIds),
                  createdById: session.user.id
                }
              });
              await Promise.all(
                storekeeperUserIds.map(uid =>
                  tx.notificationRecipient.upsert({
                    where: { notificationId_userId: { notificationId: khoNotif.id, userId: uid } },
                    update: {},
                    create: { notificationId: khoNotif.id, userId: uid }
                  })
                )
              );
            }
          }

          // D. TẠO YÊU CẦU MUA HÀNG (Cho hàng hoá thiếu và vật tư thiếu)
          if (prItemsToCreate.length > 0) {
            // Find PR manager
            const prHead = await tx.employee.findFirst({
              where: {
                status: "active",
                OR: [
                  { departmentName: { contains: "Mua hàng" }, position: { contains: "Trưởng" } },
                  { departmentCode: { contains: "purchase" }, position: { contains: "Trưởng" } }
                ]
              },
              select: { userId: true }
            });

            const code = "YC-" + new Date().toISOString().slice(0,10).replace(/-/g,"") + "-" + Math.floor(1000 + Math.random() * 9000);
            const pr = await tx.purchaseRequest.create({
              data: {
                code,
                departmentCode: "finance",
                departmentName: "Phòng Tài chính Kế toán",
                requestedById: session.user.id,
                requestedByName: staffName,
                status: "pending",
                reason: \`Bổ sung hàng hoá/vật tư do thiếu cho đơn \${order.code}\`,
                items: { create: prItemsToCreate }
              }
            });

            if (prHead?.userId) {
              const prNotif = await tx.notification.create({
                data: {
                  title: \`🛒 Yêu cầu mua hàng mới từ Tài chính\`,
                  content: \`Có yêu cầu mua hàng mới (\${code}) để bổ sung cho đơn bán hàng \${order.code}.\`,
                  type: "info",
                  priority: "high",
                  audienceType: "individual",
                  audienceValue: prHead.userId,
                  createdById: session.user.id
                }
              });
              await tx.notificationRecipient.upsert({
                where: { notificationId_userId: { notificationId: prNotif.id, userId: prHead.userId } },
                update: {},
                create: { notificationId: prNotif.id, userId: prHead.userId }
              });
            }
          }
        }
`;

const newContent = content.substring(0, startIndex) + replacement + content.substring(endIndex);
fs.writeFileSync(file, newContent, 'utf8');
console.log('Patched route.ts successfully');
