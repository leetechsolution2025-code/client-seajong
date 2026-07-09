const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { GET } = require('./.next/server/app/api/board/finance-accounting/route.js');
// Next.js dynamic routing makes it hard to require directly in recent versions.
// Let's just modify the route.ts to temporarily bypass auth and curl it.
