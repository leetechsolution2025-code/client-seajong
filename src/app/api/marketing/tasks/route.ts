import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/marketing/tasks
export async function GET() {
  try {
    const tasks = await prisma.marketingTask.findMany({
      include: { 
        monthlyPlan: { select: { id: true, employeeName: true, month: true, year: true } },
        content: { include: { theme: true } },
        comments: { select: { id: true } }
      },
      orderBy: { createdAt: "desc" },
    });

    // Tính toán deadline dựa trên tuần nếu deadline trong DB trống
    const computedTasks = tasks.map(t => {
      if (!t.monthlyPlan) return t;
      const { month, year } = t.monthlyPlan;
      
      // Xác định tuần lớn nhất được chọn
      let maxWeek = 0;
      if (t.week4) maxWeek = 4;
      else if (t.week3) maxWeek = 3;
      else if (t.week2) maxWeek = 2;
      else if (t.week1) maxWeek = 1;

      // Xác định tuần nhỏ nhất được chọn (Start Date)
      let minWeek = 0;
      if (t.week1) minWeek = 1;
      else if (t.week2) minWeek = 2;
      else if (t.week3) minWeek = 3;
      else if (t.week4) minWeek = 4;

      const lastDayOfMonth = new Date(year, month || 0, 0).getDate();
      
      const getDay = (w: number, type: 'start' | 'end') => {
        if (w === 1) return type === 'start' ? 1 : 7;
        if (w === 2) return type === 'start' ? 8 : 14;
        if (w === 3) return type === 'start' ? 15 : 21;
        if (w === 4) return type === 'start' ? 22 : lastDayOfMonth;
        return null;
      };

      const startDay = minWeek ? getDay(minWeek, 'start') : 1;
      const endDay = maxWeek ? getDay(maxWeek, 'end') : lastDayOfMonth;

      return {
        ...t,
        startDate: new Date(year, (month || 1) - 1, startDay || 1),
        deadline: t.deadline || (endDay ? new Date(year, (month || 1) - 1, endDay) : null),
        commentsCount: (t as any).comments?.length || 0,
        comments: undefined
      };
    });

    // 2. Fetch all employees in marketing department to resolve their general tasks
    const employees = await prisma.employee.findMany({
      where: { userId: { not: null } },
      select: { userId: true, fullName: true, departmentCode: true }
    });

    const employeeMap = new Map<string, { fullName: string; departmentCode: string }>();
    for (const emp of employees) {
      if (emp.userId) {
        employeeMap.set(emp.userId, { 
          fullName: emp.fullName, 
          departmentCode: emp.departmentCode || "" 
        });
      }
    }

    // Helper to parse weeks from description
    const parseWeeksFromDescription = (desc: string | null) => {
      if (!desc) return null;
      const regex = /Thời\s*gian\s*thực\s*hiện:\s*Tuần\s*([\d,\s–-]+)/i;
      const match = desc.match(regex);
      if (!match) return null;

      const weekStr = match[1];
      const w1 = weekStr.includes("1");
      const w2 = weekStr.includes("2");
      const w3 = weekStr.includes("3");
      const w4 = weekStr.includes("4");

      if (!w1 && !w2 && !w3 && !w4) return null;
      return { w1, w2, w3, w4 };
    };

    // Query all general tasks
    const generalTasks = await prisma.task.findMany({
      include: { comments: { select: { id: true } } },
      orderBy: { createdAt: "desc" }
    });

    // Map and filter general tasks to match MarketingTask structure
    const mappedGeneralTasks = [];
    for (const t of generalTasks) {
      const empInfo = employeeMap.get(t.assigneeId);
      const isMarketingEmp = empInfo?.departmentCode.toLowerCase() === "marketing";
      const isMarketingTaskTitle = t.title?.startsWith("[KH MKT]");

      if (isMarketingEmp || isMarketingTaskTitle) {
        const date = t.dueDate ? new Date(t.dueDate) : new Date();
        const month = date.getMonth() + 1;
        const day = date.getDate();

        let w1 = false, w2 = false, w3 = false, w4 = false;
        const parsedWeeks = parseWeeksFromDescription(t.description);

        if (parsedWeeks) {
          w1 = parsedWeeks.w1;
          w2 = parsedWeeks.w2;
          w3 = parsedWeeks.w3;
          w4 = parsedWeeks.w4;
        } else {
          if (day <= 7) w1 = true;
          else if (day <= 14) w2 = true;
          else if (day <= 21) w3 = true;
          else w4 = true;
        }

        // Determine start day of the first week
        let minWeek = 0;
        if (w1) minWeek = 1;
        else if (w2) minWeek = 2;
        else if (w3) minWeek = 3;
        else if (w4) minWeek = 4;

        const lastDayOfMonth = new Date(date.getFullYear(), month, 0).getDate();
        const getDay = (w: number, type: 'start' | 'end') => {
          if (w === 1) return type === 'start' ? 1 : 7;
          if (w === 2) return type === 'start' ? 8 : 14;
          if (w === 3) return type === 'start' ? 15 : 21;
          if (w === 4) return type === 'start' ? 22 : lastDayOfMonth;
          return null;
        };

        const startDay = minWeek ? getDay(minWeek, 'start') : 1;
        const startDate = new Date(date.getFullYear(), month - 1, startDay || 1);

        mappedGeneralTasks.push({
          id: t.id,
          title: t.title,
          description: t.description,
          status: t.status,
          deadline: t.dueDate,
          startDate: startDate,
          assigneeName: empInfo ? empInfo.fullName : "Chưa phân công",
          week1: w1,
          week2: w2,
          week3: w3,
          week4: w4,
          monthlyPlan: {
            id: "", // dummy
            month: month,
            year: date.getFullYear(),
            employeeName: empInfo ? empInfo.fullName : "Chưa phân công"
          },
          isGeneric: true,
          actualResult: t.actualResult,
          createdAt: t.createdAt,
          updatedAt: t.updatedAt,
          commentsCount: t.comments?.length || 0
        });
      }
    }

    const allTasks = [...computedTasks, ...mappedGeneralTasks];
    return NextResponse.json(allTasks);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 });
  }
}

// POST /api/marketing/tasks
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const task = await prisma.marketingTask.create({
      data: {
        monthlyPlanId: body.monthlyPlanId,
        contentId: body.contentId || null,
        title: body.title,
        description: body.description || null,
        taskType: body.taskType || null,
        category: body.category || null,
        taskGroup: body.taskGroup || null,
        taskSubGroup: body.taskSubGroup || null,
        week1: body.week1 ?? false,
        week2: body.week2 ?? false,
        week3: body.week3 ?? false,
        week4: body.week4 ?? false,
        week1Content: body.week1Content || null,
        week2Content: body.week2Content || null,
        week3Content: body.week3Content || null,
        week4Content: body.week4Content || null,
        assigneeName: body.assigneeName || null,
        channel: body.channel || null,
        format: body.format || null,
        deadline: body.deadline ? new Date(body.deadline) : null,
        status: body.status || "pending",
        sortOrder: body.sortOrder || 0,
        budget: typeof body.budget === 'number' ? body.budget : (parseFloat(body.budget) || 0),
      },
      include: { 
        monthlyPlan: { select: { id: true, employeeName: true, month: true, year: true } },
        content: { include: { theme: true } } 
      },
    });
    return NextResponse.json(task, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Lỗi tạo task: " + (err instanceof Error ? err.message : String(err)) }, { status: 500 });
  }
}
