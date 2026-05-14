/**
 * Script: fix-debt-sync.ts
 * Đồng bộ conNo và trangThaiId cho các RetailInvoice
 * đã có Debt liên kết với trangThai = "da-thu"
 *
 * Chạy: npx tsx scripts/fix-debt-sync.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🔍 Tìm các debt 'da-thu' có liên kết RetailInvoice...");

  // Lấy tất cả debt da-thu có retailInvoiceId
  const paidDebts = await prisma.debt.findMany({
    where: {
      trangThai: "da-thu",
      retailInvoiceId: { not: null },
    },
    select: {
      id: true,
      doiTuong: true,
      soTien: true,
      retailInvoiceId: true,
    },
  });

  console.log(`→ Tìm thấy ${paidDebts.length} debt đã thanh toán xong\n`);

  if (paidDebts.length === 0) {
    console.log("✅ Không có gì cần đồng bộ.");
    return;
  }

  // Tìm category "Hoàn thành"
  const catHoanThanh = await prisma.category.findFirst({
    where: { type: "tr_ng_th_i_ho_n_b_n_l_", name: "Hoàn thành" },
    select: { id: true },
  });

  if (!catHoanThanh) {
    console.error("❌ Không tìm thấy category 'Hoàn thành' — kiểm tra lại DB");
    return;
  }

  let updated = 0;
  let skipped = 0;

  for (const debt of paidDebts) {
    const inv = await prisma.retailInvoice.findUnique({
      where: { id: debt.retailInvoiceId! },
      select: { id: true, code: true, conNo: true, trangThaiId: true },
    });

    if (!inv) { skipped++; continue; }

    if (inv.conNo === 0 && inv.trangThaiId === catHoanThanh.id) {
      console.log(`  ⏭  ${inv.code} — đã đúng rồi, bỏ qua`);
      skipped++;
      continue;
    }

    await prisma.retailInvoice.update({
      where: { id: inv.id },
      data: {
        conNo: 0,
        trangThaiId: catHoanThanh.id,
      },
    });

    console.log(`  ✅ ${inv.code} — đã cập nhật (conNo: ${inv.conNo} → 0, trangThai → Hoàn thành)`);
    updated++;
  }

  console.log(`\n🎉 Xong! Đã cập nhật ${updated} hoá đơn, bỏ qua ${skipped}.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
