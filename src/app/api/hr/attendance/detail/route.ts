import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { startOfMonth, endOfMonth, eachDayOfInterval, format } from "date-fns";
import { calculateDailyAttendance } from "@/lib/attendance-utils";

export async function GET(req: NextRequest) {
  try {
    const employeeId = req.nextUrl.searchParams.get("employeeId");
    const month = parseInt(req.nextUrl.searchParams.get("month") || "0");
    const year = parseInt(req.nextUrl.searchParams.get("year") || "0");

    if (!employeeId || !month || !year) {
      return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
    }

    const startDate = startOfMonth(new Date(year, month - 1));
    const endDate = endOfMonth(new Date(year, month - 1));

    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      select: { fullName: true }
    });

    if (!employee) return NextResponse.json({ error: "Employee not found" }, { status: 404 });

    const attendances = await (prisma as any).attendance.findMany({
      where: {
        employeeId,
        date: { gte: startDate, lte: endDate }
      },
      orderBy: { date: "asc" }
    });

    const personalRequests = await (prisma as any).personalRequest.findMany({
      where: {
        employeeId,
        status: "APPROVED",
        OR: [
          { startDate: { gte: startDate, lte: endDate } },
          { endDate: { gte: startDate, lte: endDate } }
        ]
      }
    });

    const laborPolicy = await (prisma as any).laborPolicy.findFirst({
      where: { type: "labor_regulation" }
    });

    const holidayPolicy = await (prisma as any).laborPolicy.findFirst({
      where: { type: "holiday_regulation" }
    });

    let holidays: any[] = [];
    if (holidayPolicy?.content) {
      try {
        const parsed = JSON.parse(holidayPolicy.content);
        holidays = parsed[year] || [];
      } catch (e) {}
    }

    const defaultRules = {
      summer: { inMorning: "08:00", outLunch: "12:00", inAfternoon: "13:30", outAfternoon: "17:30" },
      winter: { enabled: false, inMorning: "08:30", outLunch: "12:00", inAfternoon: "13:00", outAfternoon: "17:00" },
      late: { allowance: 30, t75: 30, t50: 60 },
      ot: { weekday: 1.5, sat: 2, sun: 2, hol: 3, min: 30 }
    };

    let rules = defaultRules;
    if (laborPolicy?.content) {
      try {
        const parsed = JSON.parse(laborPolicy.content);
        rules = { ...defaultRules, ...parsed };
      } catch (e) {}
    }

    const days = eachDayOfInterval({ start: startDate, end: endDate }).map(day => {
      const dateStr = format(day, "yyyy-MM-dd");
      const dowMap = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
      const now = new Date();
      now.setHours(23, 59, 59, 999);

      // Nếu là ngày trong tương lai -> Trả về null hoặc object trống tùy UI
      if (day > now) {
        return {
          day: day.getDate(),
          dow: dowMap[day.getDay()],
          date: dateStr,
          isWeekend: day.getDay() === 0,
          statusLabel: "",
          statusColor: "transparent"
        };
      }

      const att = attendances.find((a: any) => format(new Date(a.date), "yyyy-MM-dd") === dateStr);
      
      // Kiểm tra ngày lễ
      const isHoliday = holidays.some((h: any) => {
        const hStart = new Date(h.startDate);
        const hEnd = new Date(h.endDate);
        hStart.setHours(0,0,0,0);
        hEnd.setHours(23,59,59,999);
        return day >= hStart && day <= hEnd;
      });

      // Kiểm tra xem ngày này có đơn nghỉ phép đã duyệt không
      const leaveReq = personalRequests.find((r: any) => {
        const start = new Date(r.startDate);
        const end = new Date(r.endDate);
        const current = new Date(day);
        current.setHours(0,0,0,0);
        return current >= start && current <= end;
      });

      const dayAttendance = {
        date: day,
        checkInMorning: att?.checkInMorning ? new Date(att.checkInMorning) : null,
        checkOutMorning: att?.checkOutMorning ? new Date(att.checkOutMorning) : null,
        checkInAfternoon: att?.checkInAfternoon ? new Date(att.checkInAfternoon) : null,
        checkOutAfternoon: att?.checkOutAfternoon ? new Date(att.checkOutAfternoon) : null,
        status: isHoliday ? "L" : (leaveReq ? "P" : (att?.status || null)),
        isPermission: att?.isPermission || false
      };

      // Sử dụng hàm dùng chung để tính toán
      const result = calculateDailyAttendance(dayAttendance, rules);

      const statusMap: Record<string, { label: string, color: string }> = {
        "L": { label: "Ngày lễ", color: "#6366f1" },
        "P": { label: "Nghỉ phép", color: "#8b5cf6" },
        "OK": { label: "Đủ công", color: "#10b981" },
        "Present": { label: "Có đi làm", color: "#f59e0b" },
        "Miss": { label: "Vi phạm chấm công", color: "#ef4444" },
        "Absent": { label: "Vắng", color: "#ef4444" },
        "Sun": { label: "Chủ nhật", color: "#64748b" }
      };

      let finalLabel = statusMap[result.status]?.label || result.status;
      let finalColor = statusMap[result.status]?.color || "#64748b";

      // Nếu có đi làm (Present) nhưng vi phạm nội quy (muộn/sớm)
      if (result.status === "Present" && result.isRegulationViolation) {
        finalLabel = "Vi phạm nội quy";
        finalColor = result.workPoints >= 0.75 ? "#f59e0b" : "#ef4444";
      }

      return {
        day: day.getDate(),
        dow: dowMap[day.getDay()],
        date: dateStr,
        checkInMorning: dayAttendance.checkInMorning ? format(dayAttendance.checkInMorning, "HH:mm") : null,
        checkOutMorning: dayAttendance.checkOutMorning ? format(dayAttendance.checkOutMorning, "HH:mm") : null,
        checkInAfternoon: dayAttendance.checkInAfternoon ? format(dayAttendance.checkInAfternoon, "HH:mm") : null,
        checkOutAfternoon: dayAttendance.checkOutAfternoon ? format(dayAttendance.checkOutAfternoon, "HH:mm") : null,
        status: dayAttendance.status,
        statusLabel: finalLabel,
        statusColor: finalColor,
        isWeekend: day.getDay() === 0,
        workday: result.workPoints,
        otHours: result.otHours,
        violationMinutes: result.violationMinutes,
        details: result.violationDetails,
        isViolation: result.isAttendanceViolation || result.isRegulationViolation,
        isAttendanceViolation: result.isAttendanceViolation,
        isRegulationViolation: result.isRegulationViolation
      };
    });

    const totalWorkValue = days.reduce((acc, d) => acc + (d.workday || 0), 0);
    const totalLeave = days.filter(d => d.status === "P").length;
    const totalOTHours = days.reduce((acc, d) => acc + (d.otHours || 0), 0);

    return NextResponse.json({
      employeeId,
      employeeName: employee.fullName,
      month,
      year,
      days,
      totalWorkDays: totalWorkValue,
      totalLeave,
      totalOTHours
    });


  } catch (error: any) {
    console.error("Attendance Detail API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
