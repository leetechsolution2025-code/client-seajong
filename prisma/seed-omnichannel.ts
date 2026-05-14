import { PrismaClient } from '@prisma/client'
// Force refresh types: 2026-05-07
const prisma = new PrismaClient()

async function main() {
  console.log('Seed: Omnichannel Data...')
  
  // 1. Tạo kết nối Shopee
  const connection = await prisma.channelConnection.upsert({
    where: { shopId: 'shopee_master_shop' },
    update: { status: 'ACTIVE' },
    create: {
      platform: 'SHOPEE',
      shopName: 'Shopee Master Store',
      shopId: 'shopee_master_shop',
      status: 'ACTIVE'
    }
  })

  // 2. Xóa đơn hàng cũ (nếu có) để tránh trùng lặp khi seed lại
  await prisma.omnichannelOrder.deleteMany({
    where: { channelId: connection.id }
  })

  // 3. Lấy một vài sản phẩm thật từ bảng SeajongProduct làm mẫu
  const realProducts = await prisma.seajongProduct.findMany({
    take: 10
  })

  const getProduct = (index: number) => {
    const p = realProducts[index % realProducts.length]
    return {
      productName: p?.name || 'Sản phẩm mẫu',
      imageUrl: p?.imageUrl || null,
      price: Math.floor(Math.random() * 500000) + 100000,
      quantity: Math.floor(Math.random() * 3) + 1,
      variantName: 'Mặc định'
    }
  }

  // 4. Tạo đơn hàng mô phỏng với sản phẩm thật
  const ordersData = [
    {
      externalOrderId: '240507VBS01',
      channelId: connection.id,
      customerName: 'Nguyễn Văn Hải',
      customerPhone: '0912345678',
      customerAddress: '15 Tố Hữu, Nam Từ Liêm, Hà Nội',
      totalAmount: 0, // Sẽ tính sau
      orderStatus: 'Chờ xác nhận',
      syncStatus: 'SUCCESS',
      items: {
        create: [getProduct(0), getProduct(1)]
      }
    },
    {
      externalOrderId: '240507XN02Y',
      channelId: connection.id,
      customerName: 'Phạm Thị Minh',
      customerPhone: '0988777666',
      customerAddress: 'Toà nhà Landmark 81, Quận 1, HCM',
      totalAmount: 0,
      orderStatus: 'Đã xác nhận',
      syncStatus: 'SUCCESS',
      items: {
        create: [getProduct(2)]
      }
    },
    {
      externalOrderId: '240507MMS03',
      channelId: connection.id,
      customerName: 'Hoàng Văn Bách',
      customerPhone: '0905123456',
      customerAddress: 'Khu công nghiệp VSIP, Thuận An, Bình Dương',
      totalAmount: 0,
      orderStatus: 'Đã chuyển',
      syncStatus: 'SUCCESS',
      items: {
        create: [getProduct(3), getProduct(4)]
      }
    },
    {
      externalOrderId: '240507CNC04',
      channelId: connection.id,
      customerName: 'Lê Minh Tâm',
      customerPhone: '0977112233',
      customerAddress: 'Phố cổ Hội An, Quảng Nam',
      totalAmount: 0,
      orderStatus: 'Đã xác nhận',
      syncStatus: 'SUCCESS',
      items: {
        create: [getProduct(5)]
      }
    }
  ]

  for (const order of ordersData) {
    // Tính lại totalAmount dựa trên items
    const total = order.items.create.reduce((acc, item) => acc + (item.price * item.quantity), 0)
    
    await prisma.omnichannelOrder.create({
      data: {
        ...order,
        totalAmount: total
      }
    })
  }

  console.log('Seed: Omnichannel Data Completed!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
