const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.inventoryItem.findMany({include: {category: true}}).then(d => { console.log(d.length, 'items'); console.log(d[0]); prisma.$disconnect(); })
