const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();
db.departmentCategory.findMany({ select: { id: true, code: true, nameVi: true, clientId: true } })
  .then(r => {
    console.log(`Total: ${r.length} departments`);
    r.forEach(d => console.log(d.id, '|', d.code, '|', d.nameVi, '| clientId:', d.clientId));
    return db.$disconnect();
  });
