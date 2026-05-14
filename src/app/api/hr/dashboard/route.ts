import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    // ── 1. Employee stats ───────────────────────────────────────────────────
    const [totalActive, totalProbation, newThisMonth, totalLastMonth] = await Promise.all([
      prisma.employee.count({ where: { status: "active" } }),
      prisma.employee.count({ where: { status: "probation" } }),
      prisma.employee.count({
        where: {
          status: { in: ["active", "probation"] },
          createdAt: { gte: startOfMonth },
        },
      }),
      prisma.employee.count({
        where: {
          OR: [
            { status: { in: ["active", "probation"] }, createdAt: { lt: startOfMonth } },
            { status: "resigned", updatedAt: { gte: startOfMonth } }
          ]
        }
      })
    ]);

    // ── 2. Gender & Contract Breakdown ──────────────────────────────────────
    const [genderGroups, contractGroups, typeGroups] = await Promise.all([
      prisma.employee.groupBy({
        by: ["gender"],
        where: { status: { in: ["active", "probation"] } },
        _count: { id: true },
      }),
      prisma.employee.groupBy({
        by: ["contractType"],
        where: { status: { in: ["active", "probation"] } },
        _count: { id: true },
      }),
      prisma.employee.groupBy({
        by: ["employeeType"],
        where: { status: { in: ["active", "probation"] } },
        _count: { id: true },
      }),
    ]);

    // ── 3. Age Breakdown ───────────────────────────────────────────────────
    const allAges = await prisma.employee.findMany({
      where: { status: { in: ["active", "probation"] }, birthDate: { not: null } },
      select: { birthDate: true }
    });
    
    const ages = allAges.map(e => {
      const age = now.getFullYear() - new Date(e.birthDate!).getFullYear();
      return age;
    });
    const avgAge = ages.length > 0 ? Math.round(ages.reduce((a, b) => a + b, 0) / ages.length) : 0;
    const ageGroups = {
      under25: ages.filter(a => a < 25).length,
      from25to35: ages.filter(a => a >= 25 && a <= 35).length,
      over35: ages.filter(a => a > 35).length
    };

    // ── 4. Terminations & Attrition ─────────────────────────────────────────
    const [personalResignations, terminations] = await Promise.all([
      prisma.personalRequest.findMany({
        where: {
          type: "resignation",
          status: "APPROVED",
          createdAt: { gte: startOfMonth },
        },
        select: { reason: true }
      }),
      prisma.terminationRequest.findMany({
        where: {
          status: { in: ["Approved", "Handover", "Finalizing", "Completed", "Pending"] },
          updatedAt: { gte: startOfMonth },
        },
        select: { type: true, reason: true }
      })
    ]);

    const voluntary = personalResignations.length + terminations.filter(r => r.type === "RESIGNATION").length;
    const involuntary = terminations.filter(r => r.type === "DISMISSAL").length;
    const resignedThisMonth = voluntary + involuntary;

    const attritionRequests = [...personalResignations, ...terminations.map(t => ({ reason: t.reason }))];
    const resignationReasons = attritionRequests.reduce((acc: any, curr) => {
      const reason = curr.reason || "Lý do khác";
      acc[reason] = (acc[reason] || 0) + 1;
      return acc;
    }, {});

    const topReasons = Object.entries(resignationReasons)
      .map(([reason, count]) => ({ reason, count: count as number }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);

    // ── 5. Recruitment funnel ──────────────────────────────────────────────
    const [pending, approved, recruiting, interviewing, submitting] = await Promise.all([
      (prisma as any).recruitmentRequest.count({ where: { status: "Pending" } }),
      (prisma as any).recruitmentRequest.count({ where: { status: "Approved" } }),
      (prisma as any).recruitmentRequest.count({ where: { status: "Recruiting" } }),
      (prisma as any).recruitmentRequest.count({ where: { status: "Interviewing" } }),
      (prisma as any).recruitmentRequest.count({ where: { status: "Submitting" } }),
    ]);

    const activeRecruitment = pending + approved + recruiting + interviewing + submitting;
    
    const activeRequests = await (prisma as any).recruitmentRequest.findMany({
      where: { status: { in: ["Recruiting", "Interviewing", "Pending", "Approved"] } },
      select: { quantity: true }
    });
    const openPositions = activeRequests.reduce((acc: number, curr: any) => acc + (curr.quantity || 1), 0);

    const hiredCandidates = await (prisma as any).candidate.findMany({
      where: { 
        status: { 
          in: ["Hired", "Đã chuyển thành nhân viên", "Đã tuyển", "Success"] 
        } 
      },
      include: { request: true }
    });
    
    let timeToHire = 0;
    if (hiredCandidates.length > 0) {
      const totalDays = hiredCandidates.reduce((acc: number, curr: any) => {
        const start = new Date(curr.request?.createdAt || curr.createdAt);
        const end = new Date(curr.updatedAt);
        const diffDays = Math.max(0, (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
        return acc + diffDays;
      }, 0);
      timeToHire = Math.round(totalDays / hiredCandidates.length);
    }

    const candidateSources = await (prisma as any).candidate.groupBy({
      by: ["source"],
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
      take: 1
    });
    const topSource = candidateSources[0] ? `${candidateSources[0].source} (${Math.round((candidateSources[0]._count.id / (await (prisma as any).candidate.count() || 1)) * 100)}%)` : "N/A";

    const recruitmentStats = { 
      pending, 
      recruiting: approved + recruiting, 
      interviewing, 
      activeRecruitment,
      openPositions,
      timeToHire,
      costPerHire: 0,
      topSource
    };

    // ── 6. Contracts expiring ───────────────────────────────────────────────
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const contractsExpiring = await prisma.employee.count({
      where: {
        status: { in: ["active", "probation"] },
        contractEndDate: { gte: now, lte: thirtyDaysFromNow },
      },
    });

    // ── 7. Insurance ────────────────────────────────────────────────────────
    const insuranceEnrolled = await prisma.employee.count({
      where: {
        OR: [
          { isInsuranceEnrolled: true },
          {
            AND: [
              { socialInsuranceNumber: { not: null } },
              { socialInsuranceNumber: { not: "" } }
            ]
          }
        ],
        status: "active"
      },
    });

    // ── 7. Financials & Performance ──────────────────────────────────────
    const [retailRevenue, contractRevenue, expenses, totalAttendance] = await Promise.all([
      prisma.retailInvoice.aggregate({
        where: { createdAt: { gte: startOfMonth } },
        _sum: { tongCong: true }
      }),
      prisma.contract.aggregate({
        where: { createdAt: { gte: startOfMonth } },
        _sum: { giaTriHopDong: true }
      }),
      prisma.expense.aggregate({
        where: { createdAt: { gte: startOfMonth } },
        _sum: { soTien: true }
      }),
      prisma.attendance.count({
        where: { date: { gte: startOfMonth } }
      })
    ]);

    const totalRevenue = (retailRevenue._sum.tongCong || 0) + (contractRevenue._sum.giaTriHopDong || 0);
    const operatingCost = expenses._sum.soTien || 0;
    
    const currentPayroll = await prisma.payroll.aggregate({
      where: { thang: now.getMonth() + 1, nam: now.getFullYear() },
      _sum: { tongChiPhiCty: true }
    });
    const laborCost = currentPayroll._sum.tongChiPhiCty || 0;

    const totalHeadcount = totalActive + totalProbation;
    const revenuePerEmp = totalHeadcount > 0 ? totalRevenue / totalHeadcount : 0;
    const laborCostPercent = totalRevenue > 0 ? (laborCost / totalRevenue) * 100 : 0;
    const laborCostVsOperating = operatingCost > 0 ? (laborCost / (laborCost + operatingCost)) * 100 : 0;

    // Tính số ngày công chuẩn (Tổng số ngày trong tháng - số ngày Chủ Nhật)
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    let workingDaysInMonth = 0;
    for (let d = 1; d <= daysInMonth; d++) {
      const day = new Date(now.getFullYear(), now.getMonth(), d).getDay();
      if (day !== 0) workingDaysInMonth++; // 0 là Chủ Nhật
    }

    // Tỷ lệ vắng mặt: (Kỳ vọng - Thực tế) / Kỳ vọng.
    const expectedAttendance = (totalHeadcount * workingDaysInMonth);
    const absenceRate = expectedAttendance > 0 
      ? Math.max(0, parseFloat(((1 - (totalAttendance / expectedAttendance)) * 100).toFixed(1)))
      : 0;

    // ── 8. Birthdays & Anniversaries ────────────────────────────────────────
    const allEmployees = await prisma.employee.findMany({
      where: { status: { in: ["active", "probation"] } },
      select: { id: true, fullName: true, birthDate: true, position: true, departmentName: true, avatarUrl: true, startDate: true, employeeType: true, createdAt: true },
    });

    const currentMonth = now.getMonth() + 1;
    const currentDay = now.getDate();
    const birthdaysThisMonth = allEmployees
      .filter(e => e.birthDate && new Date(e.birthDate).getMonth() + 1 === currentMonth)
      .map(e => ({
        id: e.id, fullName: e.fullName, position: e.position, departmentName: e.departmentName,
        avatarUrl: e.avatarUrl, birthdayDay: new Date(e.birthDate!).getDate(),
        isToday: new Date(e.birthDate!).getDate() === currentDay,
      }))
      .sort((a, b) => a.birthdayDay - b.birthdayDay);

    const anniversaries = allEmployees
      .filter(e => {
        if (!e.startDate) return false;
        return new Date(e.startDate).getMonth() + 1 === currentMonth && (now.getFullYear() - new Date(e.startDate).getFullYear()) > 0;
      })
      .map(e => ({
        id: e.id, fullName: e.fullName, position: e.position, departmentName: e.departmentName,
        avatarUrl: e.avatarUrl, yearsWorked: now.getFullYear() - new Date(e.startDate!).getFullYear(),
      }))
      .sort((a, b) => b.yearsWorked - a.yearsWorked);

    // ── 10. Department breakdown ─────────────────────────────────────────────
    const deptGroups = await prisma.employee.groupBy({
      by: ["departmentName"],
      where: { status: { in: ["active", "probation"] } },
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
      take: 8,
    });
    const departmentBreakdown = deptGroups.map(d => ({ name: d.departmentName || "Khác", count: d._count.id }));

    // ── 11. Recent employees
    const recentEmployees = [...allEmployees]
      .sort((a, b) => {
        const dateA = a.startDate ? new Date(a.startDate).getTime() : 0;
        const dateB = b.startDate ? new Date(b.startDate).getTime() : 0;
        if (dateB !== dateA) return dateB - dateA;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      })
      .slice(0, 5)
      .map(e => ({
        id: e.id,
        fullName: e.fullName,
        position: e.position,
        departmentName: e.departmentName,
        avatarUrl: e.avatarUrl,
        startDate: e.startDate?.toISOString() || null,
        employeeType: e.employeeType,
        createdAt: e.createdAt.toISOString()
      }));

    // ── 12. 12-Month Trends (Joiners vs Leavers) ──────────────────────────
    const monthlyTrends = [];
    for (let m = 0; m < 12; m++) {
      const monthStart = new Date(now.getFullYear(), m, 1);
      const monthEnd = new Date(now.getFullYear(), m + 1, 0);

      if (monthStart > now) {
        monthlyTrends.push({ month: `T${m + 1}`, joined: null, left: null });
        continue;
      }

      const [joined, personalLeft, terminationLeft] = await Promise.all([
        prisma.employee.count({
          where: { startDate: { gte: monthStart, lte: monthEnd } }
        }),
        prisma.personalRequest.count({
          where: {
            type: "resignation",
            status: "APPROVED",
            updatedAt: { gte: monthStart, lte: monthEnd }
          }
        }),
        prisma.terminationRequest.count({
          where: {
            status: { in: ["Approved", "Handover", "Finalizing", "Completed"] },
            updatedAt: { gte: monthStart, lte: monthEnd }
          }
        })
      ]);
      monthlyTrends.push({ month: `T${m + 1}`, joined, left: personalLeft + terminationLeft });
    }

    // ── 13. Training stats ──────────────────────────────────────────────────
    let trainingStats = { 
      activeCourses: 0, 
      pendingRequests: 0,
      avgTrainingHours: 0,
      totalTrainingCost: 0,
      completionRate: 0,
      effectivenessScore: "Chưa có dữ liệu"
    };

    try {
      const [activeCourses, pendingReqs, courses, participants] = await Promise.all([
        (prisma as any).trainingCourse.count({ where: { status: "IN_PROGRESS" } }),
        (prisma as any).trainingRequest.count({ where: { status: { in: ["PENDING", "PLANNING", "APPROVED"] } } }),
        (prisma as any).trainingCourse.findMany({
          include: { request: true, plan: true }
        }),
        (prisma as any).trainingParticipant.findMany()
      ]);

      const totalHours = courses.reduce((acc: number, curr: any) => acc + (parseFloat(curr.request?.duration) || 0), 0);
      const avgTrainingHours = courses.length > 0 ? parseFloat((totalHours / (allEmployees.length || 1)).toFixed(1)) : 0;
      const totalTrainingCost = courses.reduce((acc: number, curr: any) => acc + (curr.plan?.cost || 0), 0);
      
      const attended = participants.filter((p: any) => p.attendance === "ATTENDED").length;
      const completionRate = participants.length > 0 ? parseFloat(((attended / participants.length) * 100).toFixed(1)) : 0;
      
      const ratedParticipants = participants.filter((p: any) => p.rating && p.rating > 0);
      const avgRating = ratedParticipants.length > 0 
        ? (ratedParticipants.reduce((acc: number, curr: any) => acc + curr.rating, 0) / ratedParticipants.length).toFixed(1)
        : null;

      trainingStats = { 
        activeCourses, 
        pendingRequests: pendingReqs,
        avgTrainingHours, 
        totalTrainingCost,
        completionRate,
        effectivenessScore: avgRating ? `Tốt (${avgRating}/5)` : "Chưa có dữ liệu"
      };
    } catch (_) {}

    // ── 14. Final response ───────────────────────────────────────────────────
    return NextResponse.json({
      stats: {
        totalActive,
        totalProbation,
        totalHeadcount: totalActive + totalProbation,
        totalLastMonth: totalLastMonth || (totalActive + totalProbation - 2),
        newThisMonth,
        resignedThisMonth,
        topReasons,
        attritionBreakdown: {
          voluntary,
          involuntary,
        },
        contractsExpiring,
        insuranceEnrolled,
        avgAge,
        ageGroups,
        genderBreakdown: {
          male: genderGroups.find(g => g.gender === "male")?._count.id || 0,
          female: genderGroups.find(g => g.gender === "female")?._count.id || 0,
        },
        contractBreakdown: contractGroups.map(c => ({ type: c.contractType, count: c._count.id })),
        typeBreakdown: typeGroups.map(t => ({ type: t.employeeType, count: t._count.id })),
        laborCost,
        revenuePerEmp,
        absenceRate,
        laborCostPercent,
        laborCostVsOperating,
        kpiRate: 0,
        ...recruitmentStats,
        ...trainingStats,
        monthlyTrends,
      },
      birthdaysThisMonth,
      anniversaries,
      departmentBreakdown,
      recentEmployees,
    });
  } catch (err: any) {
    console.error("[GET /api/hr/dashboard]", err);
    return NextResponse.json({ error: err?.message || "Lỗi máy chủ" }, { status: 500 });
  }
}
