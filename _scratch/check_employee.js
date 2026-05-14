const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const employee = await prisma.employee.findFirst({
    where: { workEmail: "lecongvu@leetech.vn" }
  });
  console.log(JSON.stringify(employee, null, 2));
}

main();
