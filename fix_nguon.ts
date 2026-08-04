import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  const cats = await prisma.category.findMany({ where: { type: 'customer_source' } })
  const map: Record<string, string> = {}
  
  // Create mapping from old values to new codes
  for (const cat of cats) {
    if (cat.name === 'Tự nhiên') map['tu-nhien'] = cat.code;
    if (cat.name === 'Giới thiệu') map['gioi-thieu'] = cat.code;
    if (cat.name === 'Quảng cáo') map['quang-cao'] = cat.code;
    if (cat.name === 'Loại khác') map['khac'] = cat.code;
    if (cat.name === 'Tự khai thác') map['Kinh doanh tự khai thác'] = cat.code;
  }
  
  const customers = await prisma.customer.findMany()
  for (const c of customers) {
    if (c.nguon && map[c.nguon]) {
      await prisma.customer.update({
        where: { id: c.id },
        data: { nguon: map[c.nguon] }
      })
      console.log(`Updated ${c.name} nguon to ${map[c.nguon]}`)
    }
  }
}
main()
