const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const woodItems = [
  // ── Vật tư chính ──
  {
    id: 'cmq0rmatwood0001gosoi',
    name: 'Gỗ sồi Mỹ nhập khẩu (26mm)',
    code: 'GO-SOI-26',
    unit: 'm3',
    price: 15000000,
    giaBan: 18000000,
    brand: 'Sồi Mỹ',
    spec: '26mm',
    categoryId: 'cmq0rwood0000vattuchinh',
    ghiChu: 'Gỗ sồi trắng nhập khẩu Bắc Mỹ'
  },
  {
    id: 'cmq0rmatwood0002gotanbi',
    name: 'Gỗ tần bì bào 4 mặt (20x150x2000)',
    code: 'GO-ASH-20',
    unit: 'Thanh',
    price: 120000,
    giaBan: 150000,
    brand: 'Ash Việt',
    spec: '20x150x2000',
    categoryId: 'cmq0rwood0000vattuchinh',
    ghiChu: 'Tần bì sấy khô đạt chuẩn'
  },
  {
    id: 'cmq0rmatwood0003vanmdf',
    name: 'Ván MDF chống ẩm Dongwha (17mm)',
    code: 'MDF-DW-17',
    unit: 'Tấm',
    price: 350000,
    giaBan: 450000,
    brand: 'Dongwha',
    spec: '1220x2440x17mm',
    categoryId: 'cmq0rwood0000vattuchinh',
    ghiChu: 'Lõi xanh chống ẩm'
  },

  // ── Vật tư phụ ──
  {
    id: 'cmq0rmatwood0007sonpu',
    name: 'Sơn PU bóng mờ cao cấp Oseven',
    code: 'SON-OS-BOM',
    unit: 'Thùng',
    price: 1800000,
    giaBan: 2200000,
    brand: 'Oseven',
    spec: 'Thùng 20L',
    categoryId: 'cmq0rwood0000vattuphu',
    ghiChu: 'Độ bóng mờ 50%'
  },
  {
    id: 'cmq0rmatwood0008keosua',
    name: 'Keo sữa dán gỗ Titebond II',
    code: 'KEO-TB-II',
    unit: 'Chai',
    price: 95000,
    giaBan: 120000,
    brand: 'Titebond',
    spec: 'Chai 473ml',
    categoryId: 'cmq0rwood0000vattuphu',
    ghiChu: 'Keo dán gỗ chống nước cao cấp'
  },
  {
    id: 'cmq0rmatwood0009dinhvit',
    name: 'Vít bắn gỗ đầu bằng 4x30',
    code: 'VIT-GB-430',
    unit: 'Hộp',
    price: 40000,
    giaBan: 55000,
    brand: 'Việt Nam',
    spec: 'Hộp 500 con',
    categoryId: 'cmq0rwood0000vattuphu',
    ghiChu: 'Thép mạ kẽm'
  },

  // ── Vật tư tiêu hao ──
  {
    id: 'cmq0rmatwood0010giaynham',
    name: 'Giấy nhám cuộn siêu mịn P240',
    code: 'NM-P240',
    unit: 'Cuộn',
    price: 320000,
    giaBan: 400000,
    brand: 'Kovax',
    spec: 'Cuộn 50m',
    categoryId: 'cmq0rwood0000vattutieuhao',
    ghiChu: 'Chuyên trà nhám tinh bề mặt gỗ'
  },
  {
    id: 'cmq0rmatwood0011luoicua',
    name: 'Lưỡi cưa gỗ hợp kim 120 răng',
    code: 'LC-HK-120',
    unit: 'Cái',
    price: 450000,
    giaBan: 550000,
    brand: 'Freud',
    spec: 'Đường kính 300mm',
    categoryId: 'cmq0rwood0000vattutieuhao',
    ghiChu: 'Lưỡi cắt mịn không xơ xước ván'
  },

  // ── Phụ kiện ──
  {
    id: 'cmq0rmatwood0004banle',
    name: 'Bản lề giảm chấn Hafele Metalla',
    code: 'BL-HF-MET',
    unit: 'Cặp',
    price: 45000,
    giaBan: 60000,
    brand: 'Hafele',
    spec: 'Metalla 110 độ cong nhiều',
    categoryId: 'cmq0rwood0000phukien',
    ghiChu: 'Thép mạ niken cao cấp'
  },
  {
    id: 'cmq0rmatwood0005raytruot',
    name: 'Ray trượt bi 3 tầng Hafele (450mm)',
    code: 'RAY-HF-450',
    unit: 'Bộ',
    price: 85000,
    giaBan: 110000,
    brand: 'Hafele',
    spec: '450mm mở toàn phần',
    categoryId: 'cmq0rwood0000phukien',
    ghiChu: 'Tải trọng 30kg'
  },
  {
    id: 'cmq0rmatwood0006taynam',
    name: 'Tay nắm cửa tủ gỗ hiện đại',
    code: 'TAY-NM-01',
    unit: 'Cái',
    price: 25000,
    giaBan: 35000,
    brand: 'Ivan',
    spec: 'Nhôm anot mờ',
    categoryId: 'cmq0rwood0000phukien',
    ghiChu: 'Kèm vít bắt'
  }
];

const vlxdItems = [
  {
    id: 'cmq0rmatvlxd0001ximang',
    name: 'Xi măng Hoàng Thạch PCB40',
    code: 'XM-HT-40',
    unit: 'Bao',
    price: 85000,
    giaBan: 95000,
    brand: 'Hoàng Thạch',
    spec: '50kg',
    categoryId: 'cmq0rvlxd0005ximang',
    ghiChu: 'Độ bền nén cao'
  },
  {
    id: 'cmq0rmatvlxd0002catvang',
    name: 'Cát vàng xây dựng hạt lớn',
    code: 'CAT-V-HL',
    unit: 'm3',
    price: 350000,
    giaBan: 420000,
    brand: 'Cát Việt',
    spec: 'Hạt lớn sạch',
    categoryId: 'cmq0rvlxd0004catda',
    ghiChu: 'Cát xây tô trát'
  },
  {
    id: 'cmq0rmatvlxd0003gachxay',
    name: 'Gạch đỏ 2 lỗ đặc biệt',
    code: 'GACH-D2L',
    unit: 'Viên',
    price: 1200,
    giaBan: 1600,
    brand: 'Gạch Việt',
    spec: 'Đất sét nung',
    categoryId: 'cmq0rvlxd0006gachxay',
    ghiChu: 'Đạt chuẩn TCVN'
  },
  {
    id: 'cmq0rmatvlxd0004thepcuon',
    name: 'Thép cuộn Việt Úc phi 6',
    code: 'THEP-VU-P6',
    unit: 'Tấn',
    price: 15500000,
    giaBan: 16800000,
    brand: 'Việt Úc',
    spec: 'Phi 6 trơn',
    categoryId: 'cmq0rvlxd0003satthep',
    ghiChu: 'Độ dẻo cao'
  }
];

async function main() {
  console.log('🌱 Seeding Material Items...');

  // Gộp các mặt hàng gỗ và VLXD
  const allItems = [...woodItems, ...vlxdItems];
  
  for (const item of allItems) {
    await prisma.materialItem.upsert({
      where: { id: item.id },
      update: item,
      create: item
    });
  }

  console.log(`✅ Seeded ${allItems.length} material items.`);

  // Seed tồn kho cho các vật tư trong "Kho vật tư & phụ kiện"
  const warehouseId = 'cmoit7ttx0000i4514gkqzm1k';
  
  const allMaterialItemsInDb = await prisma.materialItem.findMany();

  console.log('🌱 Seeding Stocks for Warehouse: cmoit7ttx0000i4514gkqzm1k...');
  let stocksCreated = 0;
  
  for (const item of allMaterialItemsInDb) {
    const qty = Math.floor(Math.random() * 200) + 50; // Random tồn kho từ 50-250
    await prisma.materialStock.upsert({
      where: {
        materialId_warehouseId: {
          materialId: item.id,
          warehouseId: warehouseId
        }
      },
      update: {
        soLuong: qty,
        soLuongMin: 10
      },
      create: {
        materialId: item.id,
        warehouseId: warehouseId,
        soLuong: qty,
        soLuongMin: 10
      }
    });
    stocksCreated++;
  }

  console.log(`✅ Seeded stocks for ${stocksCreated} materials.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
