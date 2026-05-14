import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/prisma";
import { calculateDailyAttendance } from "@/lib/attendance-utils";

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

    // Tính toán công cho từng bản ghi trong history
    const calculatedHistory = history.map((h: any) => {
      const result = calculateDailyAttendance({
        date: new Date(h.date),
        checkInMorning: h.checkInMorning ? new Date(h.checkInMorning) : null,
        checkOutMorning: h.checkOutMorning ? new Date(h.checkOutMorning) : null,
        checkInAfternoon: h.checkInAfternoon ? new Date(h.checkInAfternoon) : null,
        checkOutAfternoon: h.checkOutAfternoon ? new Date(h.checkOutAfternoon) : null,
        status: h.status,
        isPermission: false // Mặc định false nếu không có trường này
      }, rules);

      return {
        ...h,
        workday: result.workPoints,
        otHours: result.otHours,
        violationMinutes: result.violationMinutes
      };
    });

    return NextResponse.json({ 
      attendance, 
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

    // Kiểm tra nếu không tìm thấy cấu hình mạng hợp lệ
    const hasNetworkConfig = branch && (branch.wifiIp || (branch.subnets && branch.subnets.length > 0));
    
    if (!hasNetworkConfig) {
      return NextResponse.json({ 
        error: "Địa điểm chưa cấu hình", 
        message: `Nơi làm việc "${workplace?.name || employee.workLocation}" chưa được thiết lập thông số mạng nội bộ. Vui lòng liên hệ quản lý.` 
      }, { status: 403 });
    }

    // Nếu có cấu hình, tiến hành kiểm tra IP
    const allowedIps = branch.wifiIp ? [branch.wifiIp] : [];
    const isInSubnet = branch.subnets?.some((s: any) => isIpInRange(ip, s.startIp, s.endIp));
    let isInternal = allowedIps.includes(ip) || isInSubnet;
    
    // Đặc quyền test local: Chỉ áp dụng khi ĐÃ CÓ cấu hình mạng
    if (!isInternal && (ip === "127.0.0.1" || ip === "::1")) {
       isInternal = true;
    }

    if (!isInternal) {
      return NextResponse.json({ 
        error: "Mạng không hợp lệ", 
        message: `Bạn đang kết nối mạng ngoài (IP: ${ip}). Vui lòng sử dụng Wifi/LAN tại "${workplace?.name}".` 
      }, { status: 403 });
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
