const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const http = require('http');

async function main() {
  const wh = await prisma.warehouse.findFirst({ where: { code: 'KHO-THANHPHAM' } });
  if (wh) {
    http.get('http://localhost:3000/api/logistics/inventory?warehouseId=' + wh.id, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => console.log(data.substring(0, 1000)));
    });
  }
}
main();
