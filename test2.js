const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.inventoryStock.findMany({include: {inventoryItem: true}}).then(d => { console.log(d.length, 'stocks'); console.log(d[0]); prisma.$disconnect(); })
