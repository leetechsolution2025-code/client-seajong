const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.candidate.findFirst().then(c => console.log(c.status));
