import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  const cats = await prisma.category.findMany({ where: { type: 'lo_i_kh_ch_h_ng' } })
  const map: Record<string, string> = {}
  
  for (const cat of cats) {
    if (cat.name === 'Kim cương') map['kim-cuong'] = cat.code;
    if (cat.name === 'Vàng') map['vang'] = cat.code;
    if (cat.name === 'Bạc') map['bac'] = cat.code;
    if (cat.name === 'Đồng') map['dong'] = cat.code;
  }
  
  const customers = await prisma.customer.findMany()
  for (const c of customers) {
    if (c.loai && map[c.loai]) {
      await prisma.customer.update({
        where: { id: c.id },
        data: { loai: map[c.loai] }
      })
      console.log(`Updated ${c.name} loai to ${map[c.loai]}`)
    }
  }
}
main()
