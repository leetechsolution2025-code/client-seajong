import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getAttendanceData } from "@/components/hr/attendance-actions";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const month = parseInt(searchParams.get("month") || "");
    const year = parseInt(searchParams.get("year") || "");

    if (!month || !year) {
      return NextResponse.json({ error: "Month and year are required" }, { status: 400 });
    }

    const attendanceData = await getAttendanceData(month, year);
    if (!attendanceData || attendanceData.departments.length === 0) {
      return NextResponse.json({ error: "No payroll data found" }, { status: 404 });
    }

    const daysInMonthCount = new Date(year, month, 0).getDate();
    let sundaysCount = 0;
    for (let d = 1; d <= daysInMonthCount; d++) {
      const day = new Date(year, month - 1, d);
      if (day.getDay() === 0) sundaysCount++;
    }
    const standardWorkDays = daysInMonthCount - sundaysCount || 1;

    const payrollRecords = await prisma.payroll.findMany({
      where: { thang: month, nam: year }
    });

    const employeePayrolls = [];
    const positionsList = await prisma.category.findMany({
      where: { type: "position" },
      select: { code: true, name: true }
    });
    
    const getPositionLabel = (code: string) => {
      if (!code) return "—";
      const pos = positionsList.find(p => p.code === code);
      return pos ? pos.name : code;
    };

    for (const dept of attendanceData.departments) {
      for (const emp of dept.employees) {
        const cong = emp.attendance.reduce((acc: number, a: any) => acc + (a?.workday || 0), 0);
        const ot = emp.attendance.reduce((acc: number, a: any) => acc + (a?.otHours || 0), 0);
        const salary = emp.baseSalary || 0;
        const allowances = (emp.mealAllowance || 0) + (emp.fuelAllowance || 0) + (emp.phoneAllowance || 0) + (emp.seniorityAllowance || 0);
        
        const salaryTheoCong = (salary / standardWorkDays) * cong;
        const otSalary = ot * (salary / standardWorkDays / 8);
        const khauTruBH = salary * 0.105;
        const net = salaryTheoCong + allowances + otSalary - khauTruBH;

        const payrollRecord = payrollRecords.find(p => p.employeeId === emp.id);
        const statusText = payrollRecord?.trangThai || (emp.isPayrollConfirmed ? "Đã duyệt" : "Bản nháp");

        employeePayrolls.push({
          id: emp.id,
          fullName: emp.fullName,
          positionName: getPositionLabel(emp.position),
          departmentName: dept.name,
          baseSalary: salary,
          cong,
          allowances,
          khauTruBH,
          otHours: ot,
          otSalary,
          net,
          statusText
        });
      }
    }

    return NextResponse.json({
      success: true,
      standardWorkDays,
      employeePayrolls
    });
  } catch (error: any) {
    console.error("Fetch payroll details error:", error);
    return NextResponse.json({ error: "Internal Server Error", details: error.message }, { status: 500 });
  }
}
