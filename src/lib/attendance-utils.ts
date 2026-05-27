import { format, parse, differenceInMinutes, isSunday, getDaysInMonth, isSameDay } from "date-fns";

export interface AttendanceRules {
  summer: { inMorning: string; outLunch: string; inAfternoon: string; outAfternoon: string };
  winter: { enabled: boolean; inMorning: string; outLunch: string; inAfternoon: string; outAfternoon: string };
  late: { allowance: number; t75: number; t50: number };
  ot: { weekday: number; sat: number; sun: number; hol: number; min: number };
}

export interface DayAttendance {
  date: Date;
  checkInMorning?: Date | null;
  checkOutMorning?: Date | null;
  checkInAfternoon?: Date | null;
  checkOutAfternoon?: Date | null;
  status?: string; // 'L' for Holiday, 'P' for Leave
  isPermission?: boolean;
  requestedInMorning?: string | null;
  requestedOutLunch?: string | null;
  requestedInAfternoon?: string | null;
  requestedOutAfternoon?: string | null;
}

/**
 * Hàm tính toán công và OT cho một ngày cụ thể
 */
export function calculateDailyAttendance(day: DayAttendance, rules: AttendanceRules) {
  const { date } = day;
  const isHoliday = day.status === "L";
  const isLeave = day.status === "P";
  
  // 1. Nếu là ngày lễ: 1.0 công
  if (isHoliday) {
    return { workPoints: 1.0, otHours: 0, violationMinutes: 0, status: "L" };
  }

  // 2. Nếu là ngày nghỉ phép (P): Giả sử P là nghỉ cả ngày (1.0)
  // Thực tế có thể tách P sáng/chiều, nhưng ở đây tạm tính theo status
  if (isLeave) {
    return { workPoints: 1.0, otHours: 0, violationMinutes: 0, status: "P" };
  }

  // 3. Nếu là Chủ Nhật: 0 công, chỉ tính OT
  if (isSunday(date)) {
    // Logic tính OT ngày Chủ Nhật (Hệ số x2.0)
    const otHours = calculateOT(day, rules, rules.ot.sun);
    return { workPoints: 0, otHours, violationMinutes: 0, status: "Sun" };
  }

  // 4. Ngày thường (T2-T7): Tính công thực tế và OT
  let morningPoints = 0;
  let afternoonPoints = 0;
  let violationMinutes = 0;
  const violationDetails: any = {};
  
  let isAttendanceViolation = false; // Lỗi quên chấm (chỉ có 1 đầu dữ liệu)
  let isRegulationViolation = false; // Lỗi muộn/sớm (có đủ cặp nhưng sai giờ)
  let isInsufficientMorning = false;
  let isInsufficientAfternoon = false;

  // Lấy giờ làm chuẩn theo mùa từ nội quy lao động
  let baseConfig = rules.summer;
  if (rules.winter?.enabled) {
    const month = date.getMonth() + 1; // 1-indexed
    // Mùa đông: tháng 11, 12, 1, 2, 3
    if (month === 11 || month === 12 || month === 1 || month === 2 || month === 3) {
      baseConfig = rules.winter;
    }
  }

  const config = { ...baseConfig };
  if (day.requestedInMorning) config.inMorning = day.requestedInMorning;
  if (day.requestedOutLunch) config.outLunch = day.requestedOutLunch;
  if (day.requestedInAfternoon) config.inAfternoon = day.requestedInAfternoon;
  if (day.requestedOutAfternoon) config.outAfternoon = day.requestedOutAfternoon;

  // Tính buổi sáng
  if (day.checkInMorning || day.checkOutMorning) {
    if (day.checkInMorning && day.checkOutMorning) {
      const duration = differenceInMinutes(day.checkOutMorning, day.checkInMorning);
      if (duration < 60) {
        isInsufficientMorning = true;
        morningPoints = 0;
      } else {
        const { lateMin, earlyMin } = calculateViolation(day.checkInMorning, day.checkOutMorning, config.inMorning, config.outLunch);
        if (lateMin > 0) violationDetails.inM = { label: "Muộn", minutes: lateMin, color: "#ef4444" };
        if (earlyMin > 0) violationDetails.outM = { label: "Sớm", minutes: earlyMin, color: "#ef4444" };
        
        if (lateMin > 0 || earlyMin > 0) isRegulationViolation = true;

        if (day.isPermission) morningPoints = 0.5;
        else {
          morningPoints = applyPenalty(0.5, lateMin + earlyMin, rules.late);
          violationMinutes += (lateMin + earlyMin);
        }
      }
    } else {
      isAttendanceViolation = true;
    }
  }

  // Tính buổi chiều
  if (day.checkInAfternoon || day.checkOutAfternoon) {
    if (day.checkInAfternoon && day.checkOutAfternoon) {
      const duration = differenceInMinutes(day.checkOutAfternoon, day.checkInAfternoon);
      if (duration < 60) {
        isInsufficientAfternoon = true;
        afternoonPoints = 0;
      } else {
        const { lateMin, earlyMin } = calculateViolation(day.checkInAfternoon, day.checkOutAfternoon, config.inAfternoon, config.outAfternoon);
        if (lateMin > 0) violationDetails.inA = { label: "Muộn", minutes: lateMin, color: "#ef4444" };
        if (earlyMin > 0) violationDetails.outA = { label: "Sớm", minutes: earlyMin, color: "#ef4444" };

        if (lateMin > 0 || earlyMin > 0) isRegulationViolation = true;

        if (day.isPermission) afternoonPoints = 0.5;
        else {
          afternoonPoints = applyPenalty(0.5, lateMin + earlyMin, rules.late);
          violationMinutes += (lateMin + earlyMin);
        }
      }
    } else {
      isAttendanceViolation = true;
    }
  }

  const isFullWork = (day.checkInMorning && day.checkOutMorning && day.checkInAfternoon && day.checkOutAfternoon);
  const isFullAttendance = isFullWork && !isRegulationViolation && !isAttendanceViolation && !isInsufficientMorning && !isInsufficientAfternoon;

  const otMultiplier = isSunday(date) ? rules.ot.sun : rules.ot.weekday;
  const otHours = calculateOT(day, rules, otMultiplier);

  let status = "Absent";
  if (isFullAttendance) status = "OK";
  else if (isAttendanceViolation) status = "Miss";
  else if (morningPoints + afternoonPoints > 0) status = "Present";

  if ((isInsufficientMorning || isInsufficientAfternoon) && (morningPoints + afternoonPoints === 0)) {
    status = "INSUFFICIENT";
  }

  return {
    workPoints: morningPoints + afternoonPoints,
    otHours,
    violationMinutes,
    violationDetails,
    isAttendanceViolation,
    isRegulationViolation,
    isFullAttendance,
    isInsufficientMorning,
    isInsufficientAfternoon,
    status
  };
}

/**
 * Tính số phút vi phạm (Đi muộn + Về sớm)
 */
function calculateViolation(checkIn: Date, checkOut: Date, stdInStr: string, stdOutStr: string): { lateMin: number, earlyMin: number } {
  const dateStr = format(checkIn, "yyyy-MM-dd");
  const stdIn = parse(`${dateStr} ${stdInStr}`, "yyyy-MM-dd HH:mm", new Date());
  const stdOut = parse(`${dateStr} ${stdOutStr}`, "yyyy-MM-dd HH:mm", new Date());

  let lateMin = differenceInMinutes(checkIn, stdIn);
  let earlyMin = differenceInMinutes(stdOut, checkOut);

  return { 
    lateMin: Math.max(0, lateMin), 
    earlyMin: Math.max(0, earlyMin) 
  };
}

/**
 * Áp dụng trừ công dựa trên số phút vi phạm
 */
function applyPenalty(basePoints: number, violationMin: number, lateRules: AttendanceRules["late"]): number {
  if (violationMin <= lateRules.allowance) return basePoints;
  if (violationMin <= lateRules.t50) return basePoints * 0.75;
  return basePoints * 0.5;
}

/**
 * Tính giờ OT (đã nhân hệ số)
 */
function calculateOT(day: DayAttendance, rules: AttendanceRules, multiplier: number): number {
  if (!day.checkOutAfternoon) return 0;
  
  const dateStr = format(day.checkOutAfternoon, "yyyy-MM-dd");
  
  let baseConfig = rules.summer;
  if (rules.winter?.enabled) {
    const month = day.checkOutAfternoon.getMonth() + 1; // 1-indexed
    if (month === 11 || month === 12 || month === 1 || month === 2 || month === 3) {
      baseConfig = rules.winter;
    }
  }

  const stdOutAfternoonStr = day.requestedOutAfternoon || baseConfig.outAfternoon;
  const stdOutAfternoon = parse(`${dateStr} ${stdOutAfternoonStr}`, "yyyy-MM-dd HH:mm", new Date());
  
  const otMinutes = differenceInMinutes(day.checkOutAfternoon, stdOutAfternoon);
  
  if (otMinutes < rules.ot.min) return 0;
  
  return (otMinutes / 60) * multiplier;
}

/**
 * Hàm tổng hợp công cả tháng cho một nhân viên
 */
export function calculateMonthlySummary(attendances: DayAttendance[], rules: AttendanceRules, month: number, year: number) {
  let totalWorkPoints = 0;
  let totalOTHours = 0;
  let totalViolationMinutes = 0;
  
  attendances.forEach(day => {
    const result = calculateDailyAttendance(day, rules);
    totalWorkPoints += result.workPoints;
    totalOTHours += result.otHours;
    totalViolationMinutes += result.violationMinutes;
  });

  return {
    totalWorkPoints: Math.round(totalWorkPoints * 100) / 100,
    totalOTHours: Math.round(totalOTHours * 100) / 100,
    totalViolationMinutes
  };
}
