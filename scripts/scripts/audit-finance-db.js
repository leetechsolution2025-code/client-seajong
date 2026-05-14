const { PrismaClient } = require('./node_modules/@prisma/client');
const p = new PrismaClient();

async function main() {
  console.log('====== AUDIT DB FINANCE ======\n');

  // Lấy toàn bộ 1 lần, tránh N+1
  const [allTx, allRI, allBatches, allPayrolls, allExpenses, allContracts] = await Promise.all([
    p.cashTransaction.findMany({ select: { id: true, loai: true, soTien: true, nguonLoai: true, nguonId: true, moTa: true, ngay: true } }),
    p.retailInvoice.findMany({ select: { id: true, tongCong: true, tongTien: true, createdAt: true } }),
    p.payrollBatch.findMany({ select: { id: true, thang: true, nam: true, trangThai: true }, orderBy: { createdAt: 'desc' } }),
    p.payroll.groupBy({ by: ['batchId'], _sum: { luongThucNhan: true } }),
    p.expense.findMany({ select: { id: true, tenChiPhi: true, soTien: true, trangThai: true, ngayChiTra: true } }),
    p.contract.findMany({ select: { id: true, code: true, giaTriHopDong: true, daThanhToan: true } }),
  ]);

  const riIds = new Set(allRI.map(r => r.id));
  const txByNguonId = {};
  for (const t of allTx) {
    if (t.nguonId) {
      if (!txByNguonId[t.nguonId]) txByNguonId[t.nguonId] = [];
      txByNguonId[t.nguonId].push(t);
    }
  }
  const payrollByBatch = {};
  for (const p of allPayrolls) {
    if (p.batchId) payrollByBatch[p.batchId] = p._sum.luongThucNhan || 0;
  }

  // 1. CASH TRANSACTION
  console.log('--- [1] CashTransaction (' + allTx.length + ' records) ---');
  for (const t of allTx) {
    let note = '';
    if (t.nguonLoai === 'hoa-don-ban-le' && t.nguonId && !riIds.has(t.nguonId)) {
      note = '  ⚠ ORPHAN - RetailInvoice không tồn tại';
    }
    console.log('  [' + t.loai + '] ' + (t.soTien||0).toLocaleString('vi-VN') + 'd | src=' + t.nguonLoai + ' | ' + t.ngay.toISOString().slice(0,10) + note);
  }

  // 2. RETAIL INVOICES
  console.log('\n--- [2] RetailInvoice (' + allRI.length + ' records) ---');
  allRI.forEach(r => {
    const hasTx = !!(txByNguonId[r.id] || []).length;
    console.log('  ' + r.id.slice(-8) + ' | tongCong=' + (r.tongCong != null ? r.tongCong.toLocaleString('vi-VN') : 'NULL') + 'd | CashTx=' + (hasTx ? 'OK' : 'MISSING'));
  });

  // 3. PAYROLL BATCHES
  console.log('\n--- [3] PayrollBatch (' + allBatches.length + ' records) ---');
  for (const b of allBatches) {
    const total = payrollByBatch[b.id] || 0;
    const txs = (txByNguonId[b.id] || []).filter(t => t.nguonLoai === 'luong');
    const note = b.trangThai === 'da-tra' && !txs.length ? '  ⚠ MISSING CashTx chi' : '';
    console.log('  T' + b.thang + '/' + b.nam + ' | ' + b.trangThai + ' | ' + total.toLocaleString('vi-VN') + 'd | CashTx=' + (txs.length ? 'OK' : 'missing') + note);
  }

  // 4. EXPENSE
  console.log('\n--- [4] Expense (' + allExpenses.length + ' records) ---');
  const PAID_STATUS = ['TTCP-DTT', 'paid'];
  for (const ex of allExpenses) {
    const txs = (txByNguonId[ex.id] || []).filter(t => t.nguonLoai === 'chi-phi');
    const isPaid = PAID_STATUS.includes(ex.trangThai || '');
    const note = isPaid && !txs.length ? '  ⚠ PAID nhưng không có CashTx chi' : '';
    console.log('  ' + ex.trangThai + ' | ' + (ex.soTien||0).toLocaleString('vi-VN') + 'd | ' + (ex.tenChiPhi||'').slice(0,40) + note);
  }

  // 5. CONTRACT
  console.log('\n--- [5] Contract (' + allContracts.length + ' records) ---');
  for (const c of allContracts) {
    const txs = allTx.filter(t => ['cong-no','hop-dong'].includes(t.nguonLoai) && t.nguonId === c.id);
    const cashPaid = txs.reduce((s, t) => s + (t.soTien||0), 0);
    const mismatch = Math.abs(c.daThanhToan - cashPaid) > 0.5;
    console.log('  ' + (c.code||c.id.slice(-8)) + ' | HD=' + c.giaTriHopDong.toLocaleString('vi-VN') + 'd | field.daThanhToan=' + c.daThanhToan.toLocaleString('vi-VN') + 'd | CashTx_paid=' + cashPaid.toLocaleString('vi-VN') + 'd' + (mismatch ? '  ⚠ MISMATCH' : '  OK'));
  }

  // SUMMARY
  console.log('\n====== VIEN DE CAN SUA ======');
  const orphans = allTx.filter(t => t.nguonLoai === 'hoa-don-ban-le' && t.nguonId && !riIds.has(t.nguonId));
  const missingLuong = allBatches.filter(b => b.trangThai === 'da-tra' && !(txByNguonId[b.id]||[]).filter(t => t.nguonLoai === 'luong').length);
  const mismatchContracts = allContracts.filter(c => {
    const cashPaid = allTx.filter(t => ['cong-no','hop-dong'].includes(t.nguonLoai) && t.nguonId === c.id).reduce((s,t)=>s+(t.soTien||0),0);
    return Math.abs(c.daThanhToan - cashPaid) > 0.5;
  });

  console.log('1. CashTx orphan (invoice deleted):', orphans.length, '→', orphans.map(t => (t.soTien||0).toLocaleString('vi-VN')+'d').join(', '));
  console.log('2. Payroll da-tra thiếu CashTx chi:', missingLuong.length, 'batch →', missingLuong.map(b => 'T'+b.thang+'/'+b.nam).join(', '));
  console.log('3. Contract.daThanhToan mismatch với CashTx:', mismatchContracts.length, '→', mismatchContracts.map(c => (c.code||c.id.slice(-8))).join(', '));
}

main().catch(console.error).finally(() => p.$disconnect());
