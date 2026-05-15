import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAttendanceData } from "@/components/hr/attendance-actions";

export async function GET(req: NextRequest) {
  try {
    const employeeId = req.nextUrl.searchParams.get("employeeId");
    const month = parseInt(req.nextUrl.searchParams.get("month") || "0");
    const year = parseInt(req.nextUrl.searchParams.get("year") || "0");

    if (!employeeId || !month || !year) {
      return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
    }

    const employeeInfo = await prisma.employee.findUnique({
      where: { id: employeeId },
      select: { fullName: true, position: true, departmentName: true }
    });

    if (!employeeInfo) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }

    // Map position code to full name
    const positions = await prisma.category.findMany({
      where: { type: "position" }
    });
    const positionMap = Object.fromEntries(positions.map(p => [p.code, p.name]));
    
    const mappedEmployeeInfo = {
      ...employeeInfo,
      position: positionMap[employeeInfo.position] || employeeInfo.position
    };

    const attendanceData = await getAttendanceData(month, year);
    let standardWorkDays = attendanceData.stats.workDays;
    
    let targetEmp = null;
    for (const dept of attendanceData.departments) {
      const emp = dept.employees.find((e: any) => e.id === employeeId);
      if (emp) {
        targetEmp = emp;
        break;
      }
    }

    if (!targetEmp) {
      return NextResponse.json({ error: "Payroll data not found for this employee" }, { status: 404 });
    }

    const policy = await (prisma as any).laborPolicy.findFirst({
      where: { type: "work_hours" }
    });
    if (policy && policy.content) {
      try {
        const parsed = JSON.parse(policy.content);
        if (parsed.standardWorkDays) standardWorkDays = Number(parsed.standardWorkDays);
      } catch (e) {}
    }

    const cong = targetEmp.attendance.reduce((acc: number, a: any) => acc + (a?.workday || 0), 0);
    const salary = targetEmp.baseSalary || 0;
    const meal = targetEmp.mealAllowance || 0;
    const fuel = targetEmp.fuelAllowance || 0;
    const phone = targetEmp.phoneAllowance || 0;
    const seniority = targetEmp.seniorityAllowance || 0;
    const totalAllowances = meal + fuel + phone + seniority;

    const salaryTheoCong = (salary / standardWorkDays) * cong;
    const net = salaryTheoCong + totalAllowances;

    // Lấy trạng thái đã xác nhận
    const confirmation = await (prisma as any).payrollConfirmation.findUnique({
      where: { employeeId_month_year: { employeeId, month, year } }
    });

    return NextResponse.json({
      employeeInfo: mappedEmployeeInfo,
      month, year, standardWorkDays,
      isConfirmed: !!confirmation,
      workDays: cong,
      baseSalary: salary,
      salaryTheoCong,
      allowances: { meal, fuel, phone, seniority, total: totalAllowances },
      deductions: { total: 0 },
      netPay: net
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
