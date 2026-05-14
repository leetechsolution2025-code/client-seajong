import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ count: 0 });
    }

    const userId = session.user.id;
    const userName = session.user.name;

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    // 1. Count Generic Tasks due today
    const genericCount = await prisma.task.count({
      where: {
        assigneeId: userId,
        dueDate: {
          gte: startOfDay,
          lte: endOfDay
        },
        status: { not: "done" } // Chỉ đếm việc chưa xong
      }
    });

    // 2. Count Marketing Tasks due today
    // Note: Marketing tasks use a 'deadline' string field. 
    // We filter by date range if possible, or string match.
    // Assuming deadline is stored as ISO string in DB.
    const marketingTasks = await prisma.marketingTask.findMany({
      where: {
        OR: [
          { assigneeName: userName },
          { monthlyPlan: { employeeName: userName } }
        ],
        status: { not: "done" }
      },
      select: { deadline: true }
    });

    const marketingCount = marketingTasks.filter(t => {
      if (!t.deadline) return false;
      const d = new Date(t.deadline);
      return d >= startOfDay && d <= endOfDay;
    }).length;

    return NextResponse.json({ count: genericCount + marketingCount });

  } catch (error) {
    console.error("[TASKS_COUNT_TODAY]", error);
    return NextResponse.json({ count: 0 });
  }
}
