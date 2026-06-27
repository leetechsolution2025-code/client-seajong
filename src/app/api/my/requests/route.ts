import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

// GET: Fetch requests for the current employee
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.employeeId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const requests = await (prisma as any).personalRequest.findMany({
      where: {
        employeeId: session.user.employeeId,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(requests);
  } catch (error) {
    console.error("GET Personal Requests Error:", error);
    return NextResponse.json({ error: "Failed to fetch requests" }, { status: 500 });
  }
}

// POST: Create a new personal request
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.employeeId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { 
      type, 
      reason, 
      startDate, 
      endDate, 
      totalDays, 
      totalHours, 
      details 
    } = body;

    if (!type) {
      return NextResponse.json({ error: "Request type is required" }, { status: 400 });
    }

    const newRequest = await (prisma as any).personalRequest.create({
      data: {
        employeeId: session.user.employeeId,
        type,
        status: "PENDING",
        reason,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        totalDays: totalDays ? parseFloat(totalDays) : null,
        totalHours: totalHours ? parseFloat(totalHours) : null,
        details: typeof details === 'object' ? JSON.stringify(details) : details,
      },
    });

    // Special Logic: If it's a Resignation Request, create a TerminationRequest entry
    const isResignation = type === "hr-request" && (
      (typeof details === 'object' && details.requestType?.includes("nghỉ việc")) ||
      (typeof details === 'string' && details.includes("nghỉ việc"))
    );

    if (isResignation) {
      await (prisma as any).terminationRequest.create({
        data: {
          employeeId: session.user.employeeId,
          type: "RESIGNATION",
          reason: reason,
          requestDate: new Date(),
          lastWorkingDay: startDate ? new Date(startDate) : null,
          status: "Pending",
          step: 1
        }
      });
    }

    // Notify HR/Manager logic
    try {
      const { notifyHRManager } = await import("@/lib/hr-notifications");
      const requesterName = session.user.name || "Một nhân viên";
      
      const typeLabels: Record<string, string> = {
        "leave": "Nghỉ phép",
        "overtime": "Làm thêm giờ",
        "business-trip": "Công tác",
        "hr-request": "Nhân sự & Hồ sơ",
        "finance": "Tài chính",
        "asset": "Tài sản",
        "late": "Đi muộn",
        "early": "Về sớm",
      };

      let notificationTitle = `Yêu cầu ${typeLabels[type] || type} mới`;
      let notificationMessage = `**${requesterName}** vừa gửi một yêu cầu **${typeLabels[type] || type}**.`;
      let attachmentsString: string | undefined = undefined;

      const formatDateString = (d: Date | string) => {
        const date = new Date(d);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };

      const parsedDetails = details ? (typeof details === "string" ? JSON.parse(details) : details) : {};
      const isLeaveRequest = type === "leave" || type === "unpaid_leave";

      if (type === "late" || type === "early") {
        let totalViolationMinutes = 0;
        try {
          const today = new Date();
          const start = new Date(today.getFullYear(), today.getMonth(), 1);
          const end = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);
          
          const attendances = await (prisma as any).attendance.findMany({
            where: {
              employeeId: session.user.employeeId,
              date: { gte: start, lte: end }
            }
          });

          const personalRequests = await (prisma as any).personalRequest.findMany({
            where: {
              employeeId: session.user.employeeId,
              status: "APPROVED",
              OR: [
                { startDate: { gte: start, lte: end } },
                { endDate: { gte: start, lte: end } }
              ]
            }
          });

          const laborPolicy = await (prisma as any).laborPolicy.findFirst({
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
              rules = { ...defaultRules, ...JSON.parse(laborPolicy.content) };
            } catch (e) {}
          }

          const { calculateDailyAttendance } = await import("@/lib/attendance-utils");

          attendances.forEach((h: any) => {
            const dateStr = formatDateString(h.date);
            const lateReq = personalRequests.find((r: any) => 
              r.type === "late" && 
              formatDateString(r.startDate!) === dateStr
            );
            
            const earlyReq = personalRequests.find((r: any) => 
              r.type === "early" && 
              formatDateString(r.startDate!) === dateStr
            );

            let requestedInMorning = null;
            let requestedInAfternoon = null;
            let requestedOutLunch = null;
            let requestedOutAfternoon = null;

            const extractTimeFromRequest = (request: any, field: "startDate" | "endDate") => {
              if (request.details) {
                try {
                  const parsed = typeof request.details === "string" ? JSON.parse(request.details) : request.details;
                  const timeVal = parsed.time || parsed.requestedTime || parsed.lateTime || parsed.earlyTime || parsed.timeValue;
                  if (typeof timeVal === "string" && /^\d{2}:\d{2}$/.test(timeVal)) {
                    return timeVal;
                  }
                } catch (e) {}
              }
              const dateObj = request[field] ? new Date(request[field]) : null;
              if (dateObj && !isNaN(dateObj.getTime())) {
                const hours = dateObj.getHours();
                const minutes = dateObj.getMinutes();
                if (hours !== 0 || minutes !== 0) {
                  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
                }
              }
              return null;
            };

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

            const dayAttendance = {
              date: new Date(h.date),
              checkInMorning: h.checkInMorning ? new Date(h.checkInMorning) : null,
              checkOutMorning: h.checkOutMorning ? new Date(h.checkOutMorning) : null,
              checkInAfternoon: h.checkInAfternoon ? new Date(h.checkInAfternoon) : null,
              checkOutAfternoon: h.checkOutAfternoon ? new Date(h.checkOutAfternoon) : null,
              status: h.status,
              isPermission: !!lateReq || !!earlyReq,
              requestedInMorning,
              requestedInAfternoon,
              requestedOutLunch,
              requestedOutAfternoon
            };

            const result = calculateDailyAttendance(dayAttendance, rules);
            totalViolationMinutes += result.violationMinutes;
          });
        } catch (calcError) {
          console.error("Error calculating total violation minutes for notification:", calcError);
        }

        const typeName = type === "late" ? "Đi muộn" : "Về sớm";
        const dateStr = startDate ? formatDateString(startDate) : "";
        const timeVal = details ? (typeof details === "string" ? JSON.parse(details).time : details.time) : "";

        notificationTitle = `Yêu cầu ${typeName} mới - ${requesterName}`;
        notificationMessage = `**${requesterName}** vừa gửi một yêu cầu **${typeName}** ngày **${dateStr}** lúc **${timeVal}**.\n\nTổng số phút vi phạm kỷ luật chấm công trong tháng này tính đến hiện tại của nhân viên: **${totalViolationMinutes} phút**.`;
        
        attachmentsString = JSON.stringify([
          {
            type: "late_early_approval",
            name: `Đơn xin ${typeName} ngày ${dateStr}`,
            url: "#",
            requestId: newRequest.id,
            requestType: type,
            employeeName: requesterName,
            date: dateStr,
            time: timeVal,
            status: "PENDING"
          }
        ]);
      } else if (isLeaveRequest) {
        let unexcusedDays = 0;
        let paidLeaveDays = 0;
        let unpaidLeaveDays = 0;

        try {
          const { calculateDailyAttendance } = await import("@/lib/attendance-utils");
          const { eachDayOfInterval } = await import("date-fns");

          const today = new Date();
          const start = new Date(today.getFullYear(), today.getMonth(), 1);
          const end = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);
          
          const attendances = await (prisma as any).attendance.findMany({
            where: {
              employeeId: session.user.employeeId,
              date: { gte: start, lte: end }
            }
          });

          const personalRequests = await (prisma as any).personalRequest.findMany({
            where: {
              employeeId: session.user.employeeId,
              status: "APPROVED",
              OR: [
                { startDate: { gte: start, lte: end } },
                { endDate: { gte: start, lte: end } }
              ]
            }
          });

          const laborPolicy = await (prisma as any).laborPolicy.findFirst({
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
              rules = { ...defaultRules, ...JSON.parse(laborPolicy.content) };
            } catch (e) {}
          }

          const holidayPolicy = await (prisma as any).laborPolicy.findFirst({
            where: { type: "holiday_regulation" }
          });

          let holidays: any[] = [];
          if (holidayPolicy?.content) {
            try {
              const parsed = JSON.parse(holidayPolicy.content);
              holidays = parsed[today.getFullYear()] || [];
            } catch (e) {}
          }

          const daysInMonth = eachDayOfInterval({ start, end });
          daysInMonth.forEach((day) => {
            const dateStr = formatDateString(day);
            const h = attendances.find((x: any) => formatDateString(x.date) === dateStr);

            const leaveReq = personalRequests.find((r: any) => {
              if (["late", "early"].includes(r.type)) return false;
              const startReq = new Date(r.startDate);
              const endReq = new Date(r.endDate);
              const current = new Date(day);
              current.setHours(0, 0, 0, 0);
              return current >= startReq && current <= endReq;
            });

            const holiday = holidays.find((hol: any) => {
              const hStart = new Date(hol.startDate);
              const hEnd = new Date(hol.endDate);
              hStart.setHours(0,0,0,0);
              hEnd.setHours(23,59,59,999);
              return day >= hStart && day <= hEnd;
            });

            let leaveStatus = null;
            if (leaveReq) {
              leaveStatus = "P";
              if (leaveReq.details) {
                try {
                  const parsed = typeof leaveReq.details === "string" ? JSON.parse(leaveReq.details) : leaveReq.details;
                  if (parsed.leaveType === "Nghỉ không lương") {
                    leaveStatus = "KL";
                  } else if (parsed.leaveType === "Nghỉ ốm có BHXH") {
                    leaveStatus = "BHXH";
                  }
                } catch (e) {}
              }
            }

            const status = holiday ? "L" : (leaveStatus || h?.status || null);
            const isHoliday = !!holiday || status === "L";
            const isLeave = ["P", "KL", "BHXH"].includes(status || "");
            const hasCheckIn = h?.checkInMorning || h?.checkOutMorning || h?.checkInAfternoon || h?.checkOutAfternoon;

            if (status === "KL") {
              unpaidLeaveDays++;
            } else if (status === "P" || status === "BHXH") {
              paidLeaveDays++;
            }

            if (day.getDate() < today.getDate() && day.getDay() !== 0 && !isHoliday && !isLeave && !hasCheckIn) {
              unexcusedDays++;
            }
          });
        } catch (calcError) {
          console.error("Error calculating stats for leave notification:", calcError);
        }

        const leaveTypeName = parsedDetails?.leaveType || "Nghỉ phép";
        const dateRangeStr = startDate === endDate ? formatDateString(startDate) : `từ ${formatDateString(startDate)} đến ${formatDateString(endDate)}`;
        notificationTitle = `Yêu cầu ${leaveTypeName} mới - ${requesterName}`;
        notificationMessage = `**${requesterName}** vừa gửi một yêu cầu **${leaveTypeName}** ${dateRangeStr}.\n\nTổng số ngày nghỉ không lương & không phép trong tháng của nhân viên: **${unpaidLeaveDays + unexcusedDays} ngày**.\nSố ngày nghỉ có phép trong tháng: **${paidLeaveDays} ngày**.`;
        
        attachmentsString = JSON.stringify([
          {
            type: "late_early_approval",
            name: `Đơn xin ${leaveTypeName.toLowerCase()} ${dateRangeStr}`,
            url: "#",
            requestId: newRequest.id,
            requestType: type,
            employeeName: requesterName,
            startDate: formatDateString(startDate),
            endDate: formatDateString(endDate),
            status: "PENDING"
          }
        ]);
      }

      // More specific content for HR requests
      if (type === "hr-request" && details && typeof details === 'object') {
        const subType = (details as any).requestType || "Nhân sự & Hồ sơ";
        notificationTitle = `Yêu cầu ${subType} mới`;
        notificationMessage = `**${requesterName}** vừa gửi một **${subType}**. Vui lòng kiểm tra và phê duyệt.`;
      }

      await notifyHRManager(
        notificationTitle,
        notificationMessage,
        session.user.id,
        attachmentsString
      );
    } catch (e) {
      console.error("Notification Error:", e);
    }

    return NextResponse.json(newRequest);
  } catch (error) {
    console.error("CREATE Personal Request Error:", error);
    return NextResponse.json({ 
      error: "Failed to create request",
      message: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}
