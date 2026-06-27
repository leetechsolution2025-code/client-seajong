import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/prisma";
import { calculateDailyAttendance } from "@/lib/attendance-utils";
import { format, eachDayOfInterval } from "date-fns";

export const dynamic = 'force-dynamic';

function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371e3; // metres
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) *
    Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // in metres
}

function ipToLong(ip: string) {
  return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0) >>> 0;
}

function isIpInRange(ip: string, start: string, end: string) {
  try {
    const target = ipToLong(ip);
    return target >= ipToLong(start) && target <= ipToLong(end);
  } catch (e) {
    return false;
  }
}

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.employeeId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const month = parseInt(url.searchParams.get("month") || (new Date().getMonth() + 1).toString());
    const year = parseInt(url.searchParams.get("year") || new Date().getFullYear().toString());

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);

    const attendance = await (db as any).attendance.findUnique({
      where: {
        employeeId_date: {
          employeeId: session.user.employeeId,
          date: today,
        },
      },
      select: {
        id: true,
        date: true,
        checkInMorning: true,
        checkOutMorning: true,
        checkInAfternoon: true,
        checkOutAfternoon: true,
        status: true,
        note: true,
        registeredLunch: true,
        registeredDinner: true,
      }
    });

    const history = await (db as any).attendance.findMany({
      where: {
        employeeId: session.user.employeeId,
        date: {
          gte: startDate,
          lte: endDate,
        }
      },
      select: {
        id: true,
        date: true,
        checkInMorning: true,
        checkOutMorning: true,
        checkInAfternoon: true,
        checkOutAfternoon: true,
        status: true,
        registeredLunch: true,
        registeredDinner: true,
      },
      orderBy: {
        date: "desc",
      },
      take: 31,
    });

    const personalRequests = await (db as any).personalRequest.findMany({
      where: {
        employeeId: session.user.employeeId,
        status: "APPROVED",
        OR: [
          { startDate: { gte: startDate, lte: endDate } },
          { endDate: { gte: startDate, lte: endDate } }
        ]
      }
    });

    const employee = await (db as any).employee.findUnique({
      where: { id: session.user.employeeId },
      select: { workLocation: true }
    });

    let branch = null;
    const branchKey = employee?.workLocation || "main";
    
    // Tìm ID của địa điểm dựa trên mã (code)
    const workplace = await (db as any).category.findFirst({
      where: { 
        type: 'dia_diem_lam_viec',
        code: branchKey
      }
    });

    if (workplace) {
      branch = await (db as any).branch.findUnique({
        where: { id: workplace.id },
        include: { subnets: true }
      });
    }

    // IP Detection & Normalization
    const xForwardedFor = req.headers.get("x-forwarded-for");
    const xRealIp = req.headers.get("x-real-ip");
    let ip = "127.0.0.1";
    if (xForwardedFor) ip = xForwardedFor.split(',')[0].trim();
    else if (xRealIp) ip = xRealIp;
    
    if (ip.includes("::ffff:")) ip = ip.replace("::ffff:", "");
    if (ip === "::1") ip = "127.0.0.1"; 

    console.log(`[Attendance Debug GET] Employee: ${session.user.employeeId}, Normalized IP: ${ip}, WorkLocation: ${workplace?.name}`);
    
    let isInternalNetwork = false;

    // Kiểm tra nếu có cấu hình mạng hợp lệ
    const hasNetworkConfig = branch && (branch.wifiIp || (branch.subnets && branch.subnets.length > 0));

    if (hasNetworkConfig) {
      console.log(`[Attendance Debug GET] Final Branch: ${branch.name}, Subnets: ${branch.subnets?.length}`);
      const allowedIps = branch.wifiIp ? [branch.wifiIp] : [];
      
      const isInSubnet = branch.subnets?.some((s: any) => {
        return isIpInRange(ip, s.startIp, s.endIp);
      });

      isInternalNetwork = allowedIps.includes(ip) || isInSubnet;
      
      // Khôi phục đặc quyền test local NHƯNG CHỈ KHI ĐÃ CÓ CẤU HÌNH MẠNG
      if (!isInternalNetwork && (ip === "127.0.0.1" || ip === "::1")) {
         isInternalNetwork = true;
      }
    } else {
      console.log(`[Attendance Debug GET] No valid network config found for workplace.`);
    }

    const todayStart = new Date(today);
    const todayEnd = new Date(today);
    todayEnd.setHours(23, 59, 59, 999);

    const isSunday = today.getDay() === 0;
    let hasOvertimeApproval = false;

    if (isSunday) {
      const overtimeRequest = await (db as any).personalRequest.findFirst({
        where: {
          employeeId: session.user.employeeId,
          type: "overtime",
          status: { in: ["approved", "APPROVED"] },
          startDate: { lte: todayEnd },
          endDate: { gte: todayStart }
        }
      });
      if (overtimeRequest) {
        hasOvertimeApproval = true;
      }
    }

    const isSundayLocked = isSunday && !hasOvertimeApproval;

    // Lấy Nội quy lao động
    const laborPolicy = await (db as any).laborPolicy.findFirst({
      where: { type: "labor_regulation" }
    });

    const holidayPolicy = await (db as any).laborPolicy.findFirst({
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

    const now = new Date();
    now.setHours(23, 59, 59, 999);

    // Tính toán công cho từng ngày trong tháng
    const calculatedHistory = eachDayOfInterval({ start: startDate, end: endDate }).map((day) => {
      const dateStr = format(day, "yyyy-MM-dd");
      
      // Tìm xem ngày này có bản ghi chấm công thực tế trong database không
      const h = history.find((x: any) => format(new Date(x.date), "yyyy-MM-dd") === dateStr);
      
      const leaveReq = personalRequests.find((r: any) => {
        if (["late", "early"].includes(r.type)) return false;
        const start = new Date(r.startDate);
        const end = new Date(r.endDate);
        const current = new Date(day);
        current.setHours(0, 0, 0, 0);
        return current >= start && current <= end;
      });

      const lateReq = personalRequests.find((r: any) => 
        r.type === "late" && 
        format(new Date(r.startDate), "yyyy-MM-dd") === dateStr
      );
      
      const earlyReq = personalRequests.find((r: any) => 
        r.type === "early" && 
        format(new Date(r.startDate), "yyyy-MM-dd") === dateStr
      );

      // Kiểm tra ngày lễ
      const holiday = holidays.find((hol: any) => {
        const hStart = new Date(hol.startDate);
        const hEnd = new Date(hol.endDate);
        hStart.setHours(0,0,0,0);
        hEnd.setHours(23,59,59,999);
        return day >= hStart && day <= hEnd;
      });

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
          } catch (e) {
            if (typeof request.details === "string") {
              const match = request.details.match(/(\d{2}):(\d{2})/);
              if (match) return `${match[1]}:${match[2]}`;
            }
          }
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

      const dayAttendance = {
        date: day,
        checkInMorning: h?.checkInMorning ? new Date(h.checkInMorning) : null,
        checkOutMorning: h?.checkOutMorning ? new Date(h.checkOutMorning) : null,
        checkInAfternoon: h?.checkInAfternoon ? new Date(h.checkInAfternoon) : null,
        checkOutAfternoon: h?.checkOutAfternoon ? new Date(h.checkOutAfternoon) : null,
        status: holiday ? "L" : (leaveStatus || h?.status || null),
        isPermission: !!lateReq || !!earlyReq,
        requestedInMorning,
        requestedInAfternoon,
        requestedOutLunch,
        requestedOutAfternoon
      };

      const result = calculateDailyAttendance(dayAttendance, rules);

      let approvedLateTime = null;
      if (lateReq) {
        approvedLateTime = extractTimeFromRequest(lateReq, "startDate");
      }

      let approvedEarlyTime = null;
      if (earlyReq) {
        approvedEarlyTime = extractTimeFromRequest(earlyReq, "startDate");
      }

      return {
        id: h?.id || `empty-${dateStr}`,
        date: day,
        checkInMorning: h?.checkInMorning || null,
        checkOutMorning: h?.checkOutMorning || null,
        checkInAfternoon: h?.checkInAfternoon || null,
        checkOutAfternoon: h?.checkOutAfternoon || null,
        status: dayAttendance.status,
        workday: day > now ? 0 : result.workPoints,
        otHours: result.otHours,
        violationMinutes: result.violationMinutes,
        lateMinutes: (result as any).lateMinutes || 0,
        earlyMinutes: (result as any).earlyMinutes || 0,
        approvedLateTime,
        approvedEarlyTime,
        isHoliday: !!holiday,
        holidayName: holiday?.name || null,
        registeredLunch: h?.registeredLunch || false,
        registeredDinner: h?.registeredDinner || false,
      };
    });

    const todayStr = format(new Date(), "yyyy-MM-dd");
    const todayCalculated = calculatedHistory.find(x => format(new Date(x.date), "yyyy-MM-dd") === todayStr);
    
    const mergedAttendance = attendance ? {
      ...attendance,
      status: attendance.status || todayCalculated?.status || null
    } : (todayCalculated ? {
      id: todayCalculated.id,
      date: todayCalculated.date,
      checkInMorning: todayCalculated.checkInMorning,
      checkOutMorning: todayCalculated.checkOutMorning,
      checkInAfternoon: todayCalculated.checkInAfternoon,
      checkOutAfternoon: todayCalculated.checkOutAfternoon,
      status: todayCalculated.status,
      note: null,
      registeredLunch: todayCalculated.registeredLunch,
      registeredDinner: todayCalculated.registeredDinner,
    } : null);

    return NextResponse.json({ 
      attendance: mergedAttendance, 
      history: calculatedHistory, 
      branch, 
      ip, 
      isInternalNetwork,
      isSunday,
      hasOvertimeApproval,
      isSundayLocked,
      holidays,
      rules // Trả về rules để frontend dùng nếu cần
    });

  } catch (error: any) {
    console.error("GET Attendance Error:", error);
    return NextResponse.json({ 
      attendance: null,
      history: [],
      branch: { name: `LỖI API: ${error.message}` },
      ip: "error",
      isInternalNetwork: false 
    }, { status: 200 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.employeeId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const xForwardedFor = req.headers.get("x-forwarded-for");
    const xRealIp = req.headers.get("x-real-ip");
    let ip = "127.0.0.1";
    if (xForwardedFor) ip = xForwardedFor.split(',')[0].trim();
    else if (xRealIp) ip = xRealIp;

    const body = await req.json();
    const { lat, lng, registeredLunch, registeredDinner } = body;

    const employee = await (db as any).employee.findUnique({
      where: { id: session.user.employeeId },
    });

    if (!employee) return NextResponse.json({ error: "Employee not found" }, { status: 404 });

    // 1. Tìm ID của địa điểm dựa trên mã (code) trong hồ sơ nhân viên
    const workplace = await (db as any).category.findFirst({
      where: { 
        type: 'dia_diem_lam_viec',
        code: employee.workLocation || "main"
      }
    });

    // 2. Lấy cấu hình mạng dựa trên ID của địa điểm đó
    const branch = workplace ? await (db as any).branch.findUnique({
      where: { id: workplace.id },
      include: { subnets: true }
    }) : null;

    let verificationNote = "";

    console.log(`[Attendance Check] Workplace: ${workplace?.name}, Has WifiIp: ${!!branch?.wifiIp}, Subnets: ${branch?.subnets?.length || 0}`);

    // Kiểm tra nếu không tìm thấy cấu hình mạng hoặc GPS hợp lệ
    const hasNetworkConfig = branch && (branch.wifiIp || (branch.subnets && branch.subnets.length > 0));
    const hasGPSConfig = branch && branch.latitude !== null && branch.longitude !== null;
    
    if (!hasNetworkConfig && !hasGPSConfig) {
      return NextResponse.json({ 
        error: "Địa điểm chưa cấu hình", 
        message: `Nơi làm việc "${workplace?.name || employee.workLocation}" chưa được thiết lập thông số mạng nội bộ hoặc tọa độ GPS. Vui lòng liên hệ quản lý.` 
      }, { status: 403 });
    }

    // Tiến hành kiểm tra IP mạng nội bộ
    let isInternal = false;
    if (hasNetworkConfig) {
      const allowedIps = branch.wifiIp ? [branch.wifiIp] : [];
      const isInSubnet = branch.subnets?.some((s: any) => isIpInRange(ip, s.startIp, s.endIp));
      isInternal = allowedIps.includes(ip) || isInSubnet;
      
      // Đặc quyền test local: Chỉ áp dụng khi ĐÃ CÓ cấu hình mạng
      if (!isInternal && (ip === "127.0.0.1" || ip === "::1")) {
         isInternal = true;
      }
    }

    // Tiến hành kiểm tra GPS
    let isWithinGPSRange = false;
    let computedDistance = null;
    const allowedRadius = branch?.radius || 200;

    if (hasGPSConfig && lat !== undefined && lng !== undefined && lat !== null && lng !== null) {
      computedDistance = getDistance(parseFloat(lat), parseFloat(lng), branch.latitude, branch.longitude);
      if (computedDistance <= allowedRadius) {
        isWithinGPSRange = true;
      }
    }

    if (!isInternal && !isWithinGPSRange) {
      let errorMessage = `Bạn đang kết nối mạng ngoài (IP: ${ip})`;
      if (hasGPSConfig) {
        if (lat !== undefined && lng !== undefined && lat !== null && lng !== null) {
          errorMessage += ` và vị trí của bạn không nằm trong bán kính cho phép của văn phòng (${Math.round(computedDistance || 0)}m > ${allowedRadius}m).`;
        } else {
          errorMessage += ` và không lấy được thông tin GPS của bạn. Vui lòng cho phép trình duyệt truy cập GPS.`;
        }
      } else {
        errorMessage += `.`;
      }
      
      return NextResponse.json({ 
        error: "Xác thực vị trí thất bại", 
        message: `${errorMessage} Vui lòng sử dụng Wifi/LAN nội bộ hoặc di chuyển vào gần khu vực văn phòng "${workplace?.name}" để chấm công.` 
      }, { status: 403 });
    }

    if (isWithinGPSRange && !isInternal) {
      verificationNote = `GPS (${Math.round(computedDistance || 0)}m)`;
    } else if (isInternal) {
      verificationNote = `WiFi (${ip})`;
    }

    // Sunday Locking Logic
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const isSunday = todayStart.getDay() === 0;
    if (isSunday) {
      const overtimeRequest = await (db as any).personalRequest.findFirst({
        where: {
          employeeId: session.user.employeeId,
          type: "overtime",
          status: { in: ["approved", "APPROVED"] },
          startDate: { lte: todayEnd },
          endDate: { gte: todayStart }
        }
      });
      
      if (!overtimeRequest) {
        return NextResponse.json({ 
          error: "Máy chấm công đã khoá", 
          message: "Hôm nay là Chủ nhật. Bạn cần có yêu cầu làm thêm giờ được phê duyệt để chấm công." 
        }, { status: 403 });
      }
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const existing = await (db as any).attendance.findUnique({
      where: { employeeId_date: { employeeId: session.user.employeeId, date: today } }
    });

    // 1. Kiểm tra ngày lễ
    const holidayPolicy = await (db as any).laborPolicy.findFirst({
      where: { type: "holiday_regulation" }
    });
    let holidays: any[] = [];
    if (holidayPolicy?.content) {
      try {
        const parsed = JSON.parse(holidayPolicy.content);
        const year = today.getFullYear();
        holidays = parsed[year] || [];
      } catch (e) {}
    }
    const isHoliday = holidays.some((hol: any) => {
      const hStart = new Date(hol.startDate);
      const hEnd = new Date(hol.endDate);
      hStart.setHours(0,0,0,0);
      hEnd.setHours(23,59,59,999);
      return today >= hStart && today <= hEnd;
    });

    if (isHoliday) {
      return NextResponse.json({ 
        error: "Máy chấm công đã khoá", 
        message: "Hôm nay là ngày nghỉ lễ/tết được cấu hình trên hệ thống, không cần chấm công." 
      }, { status: 403 });
    }

    // 2. Kiểm tra nghỉ phép được duyệt
    const leaveRequest = await (db as any).personalRequest.findFirst({
      where: {
        employeeId: session.user.employeeId,
        status: "APPROVED",
        type: { notIn: ["late", "early", "overtime"] },
        startDate: { lte: todayEnd },
        endDate: { gte: todayStart }
      }
    });

    if (leaveRequest || (existing && ["P", "L", "KL", "BHXH", "leave", "holiday"].includes(existing.status))) {
      return NextResponse.json({ 
        error: "Máy chấm công đã khoá", 
        message: "Hôm nay bạn được nghỉ phép theo chế độ được duyệt, không cần chấm công." 
      }, { status: 403 });
    }

    const now = new Date();
    let updateData: any = {};
    let createData: any = {
      employeeId: session.user.employeeId,
      date: today,
      status: "present",
    };

    // 4-Slot Sequential Logic
    if (!existing) {
      // First action of the day: Morning Check-in
      createData.checkInMorning = now;
      createData.checkInIp = ip;
      createData.checkInLoc = lat && lng ? `${lat},${lng}` : null;
      createData.note = verificationNote || null;
      createData.registeredLunch = registeredLunch || false;
      createData.registeredDinner = registeredDinner || false;
    } else if (!existing.checkOutMorning) {
      updateData.checkOutMorning = now;
      updateData.checkOutIp = ip;
      updateData.checkOutLoc = lat && lng ? `${lat},${lng}` : null;
      if (typeof registeredLunch === "boolean") updateData.registeredLunch = registeredLunch;
      if (typeof registeredDinner === "boolean") updateData.registeredDinner = registeredDinner;
    } else if (!existing.checkInAfternoon) {
      updateData.checkInAfternoon = now;
      if (typeof registeredLunch === "boolean") updateData.registeredLunch = registeredLunch;
      if (typeof registeredDinner === "boolean") updateData.registeredDinner = registeredDinner;
    } else if (!existing.checkOutAfternoon) {
      updateData.checkOutAfternoon = now;
      updateData.checkOutIp = ip;
      updateData.checkOutLoc = lat && lng ? `${lat},${lng}` : null;
      if (typeof registeredLunch === "boolean") updateData.registeredLunch = registeredLunch;
      if (typeof registeredDinner === "boolean") updateData.registeredDinner = registeredDinner;
    } else {
      return NextResponse.json({ error: "Bạn đã hoàn thành các mốc chấm công hôm nay." }, { status: 400 });
    }

    const attendance = await (db as any).attendance.upsert({
      where: { employeeId_date: { employeeId: session.user.employeeId, date: today } },
      update: updateData,
      create: createData,
    });

    return NextResponse.json(attendance);
  } catch (error: any) {
    console.error("POST Attendance Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
