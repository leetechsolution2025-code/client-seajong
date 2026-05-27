"use server";

import { prisma, db } from "../../lib/prisma";
import { startOfMonth, endOfMonth, eachDayOfInterval, format } from "date-fns";
import { calculateDailyAttendance } from "@/lib/attendance-utils";

export async function getAttendanceData(month: number, year: number) {
  try {
    const startDate = startOfMonth(new Date(year, month - 1));
    const endDate = endOfMonth(new Date(year, month - 1));
    const daysInMonthCount = new Date(year, month, 0).getDate();

    let sundaysCount = 0;
    for (let d = 1; d <= daysInMonthCount; d++) {
      const day = new Date(year, month - 1, d);
      if (day.getDay() === 0) sundaysCount++;
    }
    const calculatedStandardWorkDays = daysInMonthCount - sundaysCount;

    // 1. Fetch Holiday Data from DB
    const holidayPolicy = await (db as any).laborPolicy.findFirst({
      where: { type: "holiday_regulation" }
    });

    let holidays: any[] = [];
    if (holidayPolicy?.content) {
      try {
        const parsed = JSON.parse(holidayPolicy.content);
        holidays = parsed[year] || [];
      } catch (e) {
        console.error("Error parsing holiday policy:", e);
      }
    }

    const employees = await (db.employee as any).findMany({
      where: { status: "active" },
      select: {
        id: true,
        code: true,
        fullName: true,
        position: true,
        departmentName: true,
        avatarUrl: true,
        baseSalary: true,
        mealAllowance: true,
        fuelAllowance: true,
        phoneAllowance: true,
        seniorityAllowance: true,
        userId: true,
        attendanceConfirmations: {
          where: { month, year }
        },
        payrollConfirmations: {
          where: { month, year }
        }
      },
      orderBy: [
        { departmentName: "asc" },
        { fullName: "asc" }
      ]
    });

    const attendances = await (db as any).attendance.findMany({
      where: {
        date: {
          gte: startDate,
          lte: endDate,
        }
      }
    });

    // Cập nhật: Tìm kiếm không phân biệt hoa thường và bao gồm cả business-trip, late, early
    const leaveRequests = await (prisma as any).personalRequest.findMany({
      where: {
        type: { in: ["leave", "LEAVE", "business-trip", "work", "unpaid_leave", "late", "early"] },
        status: "APPROVED",
        OR: [
          { startDate: { lte: endDate, gte: startDate } },
          { endDate: { lte: endDate, gte: startDate } },
          { AND: [{ startDate: { lte: startDate } }, { endDate: { gte: endDate } }] }
        ]
      }
    });

    const extractTimeFromRequest = (request: any, field: "startDate" | "endDate") => {
      const dateObj = request[field] ? new Date(request[field]) : null;
      if (dateObj && !isNaN(dateObj.getTime())) {
        const hours = dateObj.getHours();
        const minutes = dateObj.getMinutes();
        if (hours !== 0 || minutes !== 0) {
          return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
        }
      }
      if (request.details) {
        try {
          const parsed = typeof request.details === "string" ? JSON.parse(request.details) : request.details;
          const timeVal = parsed.time || parsed.requestedTime || parsed.lateTime || parsed.earlyTime || parsed.timeValue;
          if (typeof timeVal === "string" && /^\d{2}:\d{2}$/.test(timeVal)) {
            return timeVal;
          }
        } catch (e) {
          if (typeof request.details === "string") {
            const match = request.details.match(/(\d{2}):(\d{2})/);
            if (match) return `${match[1]}:${match[2]}`;
          }
        }
      }
      return null;
    };

    // Lấy Nội quy lao động để có khung giờ chuẩn và OT
    const laborPolicy = await (db as any).laborPolicy.findFirst({
      where: { type: "labor_regulation" }
    });

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

    // Group by department
    const departments: Record<string, any[]> = {};
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const dowMap = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

    employees.forEach((emp: any) => {
      const deptName = emp.departmentName || "Khác";
      if (!departments[deptName]) {
        departments[deptName] = [];
      }
      
      const days = eachDayOfInterval({ start: startDate, end: endDate }).map((day: Date) => {
        const dateStr = format(day, "yyyy-MM-dd");
        const now = new Date();
        now.setHours(23, 59, 59, 999);

        // Nếu là ngày trong tương lai -> Không tính công, để trống
        if (day > now) {
          return null;
        }

        // Kiểm tra ngày lễ (Ưu tiên hàng đầu)
        const isHoliday = holidays.some((h: any) => {
          const hStart = new Date(h.startDate);
          const hEnd = new Date(h.endDate);
          hStart.setHours(0,0,0,0);
          hEnd.setHours(23,59,59,999);
          return day >= hStart && day <= hEnd;
        });

        if (isHoliday) {
          return { code: "L", workday: 1.0, violationMinutes: 0 };
        }

        // 2. Kiểm tra đơn nghỉ phép đã duyệt
        const leaveReq = leaveRequests.find((l: any) => 
          ["leave", "LEAVE", "business-trip", "work", "unpaid_leave"].includes(l.type) &&
          l.employeeId === emp.id && 
          day >= new Date(l.startDate!) && 
          day <= new Date(l.endDate!)
        );

        const lateReq = leaveRequests.find((l: any) => 
          l.type === "late" &&
          l.employeeId === emp.id &&
          format(new Date(l.startDate!), "yyyy-MM-dd") === dateStr
        );

        const earlyReq = leaveRequests.find((l: any) => 
          l.type === "early" &&
          l.employeeId === emp.id &&
          format(new Date(l.startDate!), "yyyy-MM-dd") === dateStr
        );

        let requestedInMorning = null;
        let requestedInAfternoon = null;
        let requestedOutLunch = null;
        let requestedOutAfternoon = null;

        if (lateReq) {
          const timeStr = extractTimeFromRequest(lateReq, "startDate");
          if (timeStr) {
            const hour = parseInt(timeStr.split(":")[0]);
            if (hour < 12) requestedInMorning = timeStr;
            else requestedInAfternoon = timeStr;
          }
        }

        if (earlyReq) {
          const timeStr = extractTimeFromRequest(earlyReq, "startDate");
          if (timeStr) {
            const hour = parseInt(timeStr.split(":")[0]);
            if (hour < 13.5) requestedOutLunch = timeStr;
            else requestedOutAfternoon = timeStr;
          }
        }

        // 3. Lấy dữ liệu chấm công thực tế
        const att = attendances.find((a: any) => 
          a.employeeId === emp.id && format(new Date(a.date), "yyyy-MM-dd") === dateStr
        );

        // Chuẩn bị dữ liệu để tính toán bằng hàm dùng chung
        const dayAttendance = {
          date: day,
          checkInMorning: att?.checkInMorning ? new Date(att.checkInMorning) : null,
          checkOutMorning: att?.checkOutMorning ? new Date(att.checkOutMorning) : null,
          checkInAfternoon: att?.checkInAfternoon ? new Date(att.checkInAfternoon) : null,
          checkOutAfternoon: att?.checkOutAfternoon ? new Date(att.checkOutAfternoon) : null,
          status: isHoliday ? "L" : (leaveReq ? "P" : (att?.status || null)),
          isPermission: att?.isPermission || !!lateReq || !!earlyReq,
          requestedInMorning,
          requestedInAfternoon,
          requestedOutLunch,
          requestedOutAfternoon
        };

        const result = calculateDailyAttendance(dayAttendance, rules);

        // Trả về Object theo định dạng UI cũ nhưng có thêm dữ liệu tính toán mới
        let code = null;
        if (result.status === "L") code = "L";
        else if (result.status === "P") code = "P";
        else if (result.status === "Sun") code = "CN";
        else if (result.status === "INSUFFICIENT") code = "ERR";
        else if (result.violationMinutes > rules.late.allowance) {
          code = result.violationMinutes > rules.late.t50 ? "ERR" : "WARN";
        }
        else if (result.workPoints > 0) code = dowMap[day.getDay()];
        else if (day <= today && day.getDay() !== 0) code = "-";

        return {
          code,
          workday: result.workPoints,
          otHours: result.otHours,
          violationMinutes: result.violationMinutes,
          registeredLunch: att?.registeredLunch || false,
          registeredDinner: att?.registeredDinner || false
        };
      });

      departments[deptName].push({ 
        ...emp, 
        attendance: days,
        isConfirmed: !!(emp.attendanceConfirmations && emp.attendanceConfirmations.length > 0),
        isPayrollConfirmed: !!((emp as any).payrollConfirmations && (emp as any).payrollConfirmations.length > 0)
      });
    });

    const confirmedNames = Object.values(departments).flat().filter(e => e.isConfirmed).map(e => e.fullName);
    console.log(`Confirmed employees for ${month}/${year}:`, confirmedNames);

    // Calculate Stats for Today
    const todayIndex = eachDayOfInterval({ start: startDate, end: endDate }).findIndex(d => format(d, "yyyy-MM-dd") === format(today, "yyyy-MM-dd"));
    let totalEmployees = employees.length;
    let presentToday = 0;
    let absentToday = 0;
    let leaveToday = 0;
    let totalViolationMinutes = 0;

    const departmentList = Object.entries(departments).map(([name, emps]) => {
      if (todayIndex !== -1) {
        emps.forEach(emp => {
          const status = emp.attendance[todayIndex]?.code;
          if (["T2", "T3", "T4", "T5", "T6", "T7", "OK", "WARN", "ERR"].includes(status)) presentToday++;
          else if (status === "P") leaveToday++;
          else if (status === "-") absentToday++;
        });
      }

      // Tính tổng vi phạm của phòng ban trong tháng
      emps.forEach(emp => {
        totalViolationMinutes += emp.attendance.reduce((acc: number, a: any) => acc + (a?.violationMinutes || 0), 0);
      });
      
      return {
        id: name,
        name,
        employees: emps
      };
    });


    return {
      departments: departmentList,
      stats: {
        totalEmployees,
        presentToday,
        absentToday,
        leaveToday,
        totalViolationMinutes,
        workDays: calculatedStandardWorkDays 
      }
    };
  } catch (error) {
    console.error("Action Error:", error);
    return { departments: [], stats: { totalEmployees: 0, presentToday: 0, absentToday: 0, leaveToday: 0, workDays: 0, totalViolationMinutes: 0 } };
  }
}

export async function getCompanyInfo() {
  try {
    return await prisma.companyInfo.findFirst();
  } catch (error) {
    console.error("getCompanyInfo error:", error);
    return null;
  }
}
