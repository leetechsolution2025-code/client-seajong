import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const task = await prisma.task.findFirst({
    where: { title: { contains: "DBH-20260730-01" } }
  });
  console.log("Current task:", task);
  
  if (task) {
    // Add 2 days back
    const newDueDate = new Date(task.dueDate as Date);
    newDueDate.setDate(newDueDate.getDate() + 2);
    
    await prisma.task.update({
      where: { id: task.id },
      data: { dueDate: newDueDate }
    });
    console.log("Updated dueDate to:", newDueDate);
  }
}
main();
