const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  console.log('====== START CLEANING DB ======');

  // 1. Dọn dẹp CashTransaction mồ côi (từ RetailInvoice đã xóa)
  const orphanCashTx = await p.cashTransaction.findMany({
    where: { nguonLoai: 'hoa-don-ban-le' },
    select: { id: true, nguonId: true, soTien: true }
  });
  let deletedOrphans = 0;
  for (const tx of orphanCashTx) {
    if (tx.nguonId) {
      const ri = await p.retailInvoice.findUnique({ where: { id: tx.nguonId } });
      if (!ri) {
        await p.cashTransaction.delete({ where: { id: tx.id } });
        console.log(`  [Xóa] Phiếu thu mồ côi ${tx.soTien}đ`);
        deletedOrphans++;
      }
    }
  }

  // 2. Bắt đầu bổ sung phiếu chi cho Lương (da-tra)
  // Tính theo tổng payroll "da-tra" thay vì batch
  const payrolls = await p.payroll.findMany({
    where: { trangThai: 'da-tra' },
    select: { id: true, thang: true, nam: true, luongThucNhan: true, batchId: true, ngayTra: true }
  });
  
  const payrollByBatch = {};
  for(const r of payrolls) {
    const key = r.batchId || 'orphan';
    if (!payrollByBatch[key]) payrollByBatch[key] = { items: [], thang: r.thang, nam: r.nam, sum: 0, date: r.ngayTra || new Date() };
    payrollByBatch[key].sum += (r.luongThucNhan || 0);
    payrollByBatch[key].items.push(r.id);
  }

  let createdPayrolls = 0;
  for (const [batchId, group] of Object.entries(payrollByBatch)) {
    if (group.sum > 0) {
      const nguonId = batchId === 'orphan' ? group.items[0] : batchId;
      const existing = await p.cashTransaction.findFirst({ where: { nguonLoai: 'luong', nguonId } });
      if (!existing) {
        await p.cashTransaction.create({
          data: {
            loai: 'chi', soTien: group.sum, ngay: group.date,
            moTa: `Chi lương tháng ${group.thang}/${group.nam} (auto-backfill)`,
            nguoiThucHien: 'Hệ thống', nguonLoai: 'luong', nguonId,
            nguonCode: `LUONG-${group.nam}${String(group.thang).padStart(2,'0')}`,
            kenh: 'ngan-hang'
          }
        });
        console.log(`  [Thêm] Phiếu chi lương T${group.thang}/${group.nam}: -${group.sum.toLocaleString('vi-VN')}đ`);
        createdPayrolls++;
      }
    }
  }

  // 3. Bổ sung phiếu chi cho Expense
  const expenses = await p.expense.findMany({
    // Lấy hết các expense có một trong các trạng thái đã xử lý ở legacy
    where: { trangThai: { in: ['TTCP-DD', 'approved', 'TTCP-DTT', 'paid'] } },
    select: { id: true, tenChiPhi: true, soTien: true, ngayChiTra: true }
  });

  let createdExpenses = 0;
  for (const e of expenses) {
    if ((e.soTien || 0) > 0) {
      const existing = await p.cashTransaction.findFirst({ where: { nguonLoai: 'chi-phi', nguonId: e.id } });
      if (!existing) {
        await p.cashTransaction.create({
          data: {
            loai: 'chi', soTien: e.soTien, ngay: e.ngayChiTra || new Date(),
            moTa: `Chi phí: ${(e.tenChiPhi || '').slice(0, 30)} (auto-backfill)`,
            nguoiThucHien: 'Hệ thống', nguonLoai: 'chi-phi', nguonId: e.id,
            nguonCode: `EXP-${e.id.slice(-8).toUpperCase()}`,
            kenh: 'ngan-hang'
          }
        });
        console.log(`  [Thêm] Phiếu chi phí: -${(e.soTien||0).toLocaleString('vi-VN')}đ (${e.tenChiPhi})`);
        createdExpenses++;
      }
    }
  }

  console.log(`\n====== KẾT QUẢ ======`);
  console.log(`- Xóa ${deletedOrphans} phiếu thu rác`);
  console.log(`- Tạo bổ sung ${createdPayrolls} phiếu chi lương`);
  console.log(`- Tạo bổ sung ${createdExpenses} phiếu chi phí`);
}

main().catch(console.error).finally(() => p.$disconnect());
