import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");
    const status = searchParams.get("status");
    const dept = searchParams.get("dept");

    // Fetch all employees for mapping requesters/subjects to Employee info
    const employees = await prisma.employee.findMany({
      select: {
        id: true,
        userId: true,
        fullName: true,
        code: true,
        avatarUrl: true,
        departmentName: true,
        departmentCode: true,
        position: true,
      }
    });

    const empById: Record<string, typeof employees[0]> = {};
    const empByUserId: Record<string, typeof employees[0]> = {};
    for (const emp of employees) {
      empById[emp.id] = emp;
      if (emp.userId) {
        empByUserId[emp.userId] = emp;
      }
    }

    const getEmployeeInfo = (requesterId: string | null) => {
      if (!requesterId) return null;
      return empById[requesterId] || empByUserId[requesterId] || null;
    };

    // Get today's start and end date
    const todayStart = new Date(new Date().setHours(0, 0, 0, 0));
    const todayEnd = new Date(new Date().setHours(23, 59, 59, 999));

    // Combine and build request results
    let allMappedRequests: any[] = [];

    // 1. PersonalRequest
    const personalWhere: any = {};
    if (status) personalWhere.status = status;
    if (dept) personalWhere.employee = { departmentCode: dept };
    if (!type || ["leave", "unpaid_leave", "late", "early", "overtime", "hr-request", "work", "business-trip"].includes(type.toLowerCase())) {
      if (type) personalWhere.type = type;
      const personalRequests = await prisma.personalRequest.findMany({
        where: personalWhere,
        include: {
          employee: {
            select: {
              fullName: true,
              code: true,
              avatarUrl: true,
              departmentName: true,
              departmentCode: true,
              userId: true,
              position: true,
            }
          }
        },
        orderBy: { createdAt: "desc" }
      });
      allMappedRequests.push(...personalRequests.map(r => ({
        id: r.id,
        employeeId: r.employeeId,
        employee: r.employee,
        type: r.type,
        startDate: r.startDate ? r.startDate.toISOString() : null,
        endDate: r.endDate ? r.endDate.toISOString() : null,
        reason: r.reason,
        status: r.status,
        hrApproved: r.hrApproved,
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
        details: r.details
      })));
    }

    // 2. RecruitmentRequest
    const recWhere: any = {};
    if (status) {
      if (status === "PENDING") recWhere.status = "Pending";
      else if (status === "APPROVED") recWhere.status = "Approved";
      else if (status === "REJECTED") recWhere.status = "Rejected";
    }
    if (!type || type.toLowerCase() === "recruitment" || type.toLowerCase() === "tuyển dụng") {
      const recRequests = await (prisma as any).recruitmentRequest.findMany({
        where: recWhere,
        orderBy: { createdAt: "desc" }
      });
      for (const r of recRequests) {
        const emp = getEmployeeInfo(r.requesterId);
        if (dept && emp?.departmentCode !== dept) continue;
        const detailsObj = {
          position: r.position,
          quantity: r.quantity,
          level: r.level || "Nhân viên",
          workType: r.workType || "Toàn thời gian",
          salary: r.salaryMin && r.salaryMax ? `${r.salaryMin} - ${r.salaryMax} VNĐ` : "Thỏa thuận",
          deadline: r.deadline ? r.deadline.toISOString() : ""
        };
        allMappedRequests.push({
          id: `rec-${r.id}`,
          employeeId: emp?.id || "",
          employee: emp || {
            fullName: r.requestedBy || "Hệ thống",
            code: "SYSTEM",
            avatarUrl: null,
            departmentName: r.department || "Khác",
            departmentCode: "other",
            userId: r.requesterId,
            position: "Quản lý"
          },
          type: "recruitment",
          startDate: r.date ? r.date.toISOString() : null,
          endDate: r.deadline ? r.deadline.toISOString() : null,
          reason: `Tuyển dụng vị trí: ${r.position}\nSố lượng: ${r.quantity}\nCấp bậc: ${r.level || "Nhân viên"}\nLương: ${detailsObj.salary}\n\nMô tả chi tiết:\n${r.description || "Không có"}`,
          status: r.status === "Approved" ? "APPROVED" : (r.status === "Rejected" ? "REJECTED" : "PENDING"),
          hrApproved: r.status === "Approved",
          createdAt: r.createdAt.toISOString(),
          updatedAt: r.updatedAt.toISOString(),
          details: JSON.stringify(detailsObj)
        });
      }
    }

    // 3. TrainingRequest
    const trainWhere: any = {};
    if (status) {
      if (status === "PENDING") trainWhere.status = "PENDING";
      else if (status === "APPROVED") trainWhere.status = "APPROVED";
      else if (status === "REJECTED") trainWhere.status = "REJECTED";
    }
    if (!type || type.toLowerCase() === "training" || type.toLowerCase() === "đào tạo") {
      const trainRequests = await (prisma as any).trainingRequest.findMany({
        where: trainWhere,
        orderBy: { createdAt: "desc" }
      });
      for (const r of trainRequests) {
        const emp = getEmployeeInfo(r.requesterId);
        if (dept && emp?.departmentCode !== dept) continue;
        const detailsObj = {
          topic: r.topic,
          trainer: r.trainer || "",
          location: r.location || "",
          participants: r.participants || ""
        };
        allMappedRequests.push({
          id: `train-${r.id}`,
          employeeId: emp?.id || "",
          employee: emp || {
            fullName: "Quản lý",
            code: "SYSTEM",
            avatarUrl: null,
            departmentName: r.department || "Khác",
            departmentCode: "other",
            userId: r.requesterId,
            position: "Quản lý"
          },
          type: "training",
          startDate: r.startTime ? r.startTime.toISOString() : null,
          endDate: r.endTime ? r.endTime.toISOString() : null,
          reason: `Đào tạo chủ đề: ${r.topic}\nGiảng viên: ${r.trainer || "Chưa rõ"}\nĐịa điểm: ${r.location || "Chưa rõ"}\nĐối tượng: ${r.participants || "Chưa rõ"}\n\nNội dung chi tiết:\n${r.trainingContent || "Không có"}`,
          status: r.status === "APPROVED" ? "APPROVED" : (r.status === "REJECTED" ? "REJECTED" : "PENDING"),
          hrApproved: r.status === "APPROVED",
          createdAt: r.createdAt.toISOString(),
          updatedAt: r.updatedAt.toISOString(),
          details: JSON.stringify(detailsObj)
        });
      }
    }

    // 4. PromotionRequest
    const promoWhere: any = {};
    if (status) {
      if (status === "PENDING") promoWhere.status = { not: "CONCLUSION" };
      else if (status === "APPROVED") {
        promoWhere.status = "CONCLUSION";
        promoWhere.directorApproved = true;
      } else if (status === "REJECTED") {
        promoWhere.status = "CONCLUSION";
        promoWhere.directorApproved = false;
      }
    }
    if (!type || type.toLowerCase() === "promotion" || type.toLowerCase() === "đề bạt và thuyên chuyển") {
      const promoRequests = await (prisma as any).promotionRequest.findMany({
        where: promoWhere,
        include: {
          requester: {
            select: {
              fullName: true,
              code: true,
              avatarUrl: true,
              departmentName: true,
              departmentCode: true,
              userId: true,
              position: true,
            }
          },
          employee: {
            select: {
              fullName: true,
              code: true,
              avatarUrl: true,
              departmentName: true,
              departmentCode: true,
              userId: true,
              position: true,
            }
          }
        },
        orderBy: { createdAt: "desc" }
      });
      for (const r of promoRequests) {
        if (dept && r.employee.departmentCode !== dept) continue;
        const detailsObj = {
          employee: r.employee.fullName,
          currentRole: r.currentDept,
          targetDepartment: r.targetDept,
          proposedRole: r.targetPos,
          isTransfer: r.type === "TRANSFER"
        };
        const statusVal = r.status === "CONCLUSION" ? (r.directorApproved ? "APPROVED" : "REJECTED") : "PENDING";
        allMappedRequests.push({
          id: `promo-${r.id}`,
          employeeId: r.employeeId,
          employee: r.requester || r.employee,
          type: "promotion",
          startDate: r.effectiveDate ? r.effectiveDate.toISOString() : null,
          endDate: null,
          reason: `Đề xuất: ${r.type === "TRANSFER" ? "Thuyên chuyển" : "Đề bạt"}\nNhân viên: ${r.employee.fullName}\nBộ phận hiện tại: ${r.currentDept}\nBộ phận đề xuất: ${r.targetDept}\nVị trí đề xuất: ${r.targetPos}\n\nLý do chi tiết:\n${r.reason || "Không có"}`,
          status: statusVal,
          hrApproved: r.hrApproved,
          createdAt: r.createdAt.toISOString(),
          updatedAt: r.updatedAt.toISOString(),
          details: JSON.stringify(detailsObj)
        });
      }
    }

    // 5. SalaryAdjustmentRequest
    const salaryWhere: any = {};
    if (status) {
      if (status === "PENDING") salaryWhere.status = "PENDING";
      else if (status === "APPROVED") salaryWhere.status = "APPROVED";
      else if (status === "REJECTED") salaryWhere.status = "REJECTED";
    }
    if (!type || type.toLowerCase() === "salary-adjustment" || type.toLowerCase() === "điều chỉnh thu nhập") {
      const salaryRequests = await (prisma as any).salaryAdjustmentRequest.findMany({
        where: salaryWhere,
        include: {
          requester: {
            select: {
              fullName: true,
              code: true,
              avatarUrl: true,
              departmentName: true,
              departmentCode: true,
              userId: true,
              position: true,
            }
          },
          employee: {
            select: {
              fullName: true,
              code: true,
              avatarUrl: true,
              departmentName: true,
              departmentCode: true,
              userId: true,
              position: true,
            }
          }
        },
        orderBy: { createdAt: "desc" }
      });
      for (const r of salaryRequests) {
        if (dept && r.employee.departmentCode !== dept) continue;
        const detailsObj = {
          employee: r.employee.fullName,
          adjustmentType: r.adjustmentType === "INCREASE" ? "Tăng lương" : (r.adjustmentType === "DECREASE" ? "Giảm lương" : "Tái cơ cấu"),
          currentSalary: r.currentBaseSalary ? `${r.currentBaseSalary.toLocaleString("vi-VN")} VNĐ` : "0 VNĐ",
          proposedSalary: r.proposedBaseSalary ? `${r.proposedBaseSalary.toLocaleString("vi-VN")} VNĐ` : "0 VNĐ"
        };
        allMappedRequests.push({
          id: `salary-${r.id}`,
          employeeId: r.employeeId,
          employee: r.requester || r.employee,
          type: "salary-adjustment",
          startDate: r.effectiveDate ? r.effectiveDate.toISOString() : null,
          endDate: null,
          reason: `Đề xuất điều chỉnh thu nhập\nNhân viên: ${r.employee.fullName}\nLoại điều chỉnh: ${detailsObj.adjustmentType}\nLương hiện tại: ${detailsObj.currentSalary}\nLương mới đề xuất: ${detailsObj.proposedSalary}\n\nLý do chi tiết:\n${r.reason || "Không có"}`,
          status: r.status === "APPROVED" ? "APPROVED" : (r.status === "REJECTED" ? "REJECTED" : "PENDING"),
          hrApproved: r.status === "APPROVED" || r.status === "Approved" || r.hrNote === "Đã trình lãnh đạo",
          createdAt: r.createdAt.toISOString(),
          updatedAt: r.updatedAt.toISOString(),
          details: JSON.stringify(detailsObj)
        });
      }
    }

    // 6. HrSupplyRequest (Stationery)
    if (!type || type.toLowerCase() === "stationery" || type.toLowerCase() === "văn phòng phẩm và dụng cụ") {
      const stationeryWhere: any = { type: "STATIONERY" };
      if (status) stationeryWhere.status = status;
      if (dept) stationeryWhere.requester = { departmentCode: dept };

      const stationeryRequests = await (prisma as any).hrSupplyRequest.findMany({
        where: stationeryWhere,
        include: {
          requester: {
            select: {
              id: true,
              userId: true,
              fullName: true,
              code: true,
              avatarUrl: true,
              departmentName: true,
              departmentCode: true,
              position: true,
            }
          },
          items: {
            include: {
              item: {
                select: {
                  name: true,
                  unit: true,
                }
              }
            }
          }
        },
        orderBy: { createdAt: "desc" }
      });

      for (const r of stationeryRequests) {
        const detailsObj = {
          note: r.note,
          totalAmount: r.totalAmount,
          items: r.items.map((i: any) => ({
            name: i.item?.name || "Vật tư",
            unit: i.item?.unit || "cái",
            quantity: i.quantity,
            price: i.unitPrice || 0,
            totalPrice: i.totalPrice || 0
          }))
        };

        allMappedRequests.push({
          id: `stationery-${r.id}`,
          employeeId: r.requesterId,
          employee: r.requester,
          type: "stationery",
          startDate: null,
          endDate: null,
          reason: r.note || "Đề xuất cấp phát văn phòng phẩm và dụng cụ",
          status: r.status,
          hrApproved: r.status === "APPROVED" || r.status === "DELIVERED",
          createdAt: r.createdAt.toISOString(),
          updatedAt: r.updatedAt.toISOString(),
          details: JSON.stringify(detailsObj)
        });
      }
    }

    // Sort combined by createdAt descending
    allMappedRequests.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Compute stats
    const stats = {
      pending: 0,
      approvedToday: 0,
      rejected: 0
    };

    // Calculate PersonalRequest stats
    stats.pending += await prisma.personalRequest.count({ where: { status: "PENDING" } });
    stats.approvedToday += await prisma.personalRequest.count({
      where: {
        status: "APPROVED",
        updatedAt: { gte: todayStart, lte: todayEnd }
      }
    });
    stats.rejected += await prisma.personalRequest.count({ where: { status: "REJECTED" } });

    // Calculate RecruitmentRequest stats
    stats.pending += await (prisma as any).recruitmentRequest.count({ where: { status: "Pending" } });
    stats.approvedToday += await (prisma as any).recruitmentRequest.count({
      where: {
        status: "Approved",
        updatedAt: { gte: todayStart, lte: todayEnd }
      }
    });
    stats.rejected += await (prisma as any).recruitmentRequest.count({ where: { status: "Rejected" } });

    // Calculate TrainingRequest stats
    stats.pending += await (prisma as any).trainingRequest.count({ where: { status: "PENDING" } });
    stats.approvedToday += await (prisma as any).trainingRequest.count({
      where: {
        status: "APPROVED",
        updatedAt: { gte: todayStart, lte: todayEnd }
      }
    });
    stats.rejected += await (prisma as any).trainingRequest.count({ where: { status: "REJECTED" } });

    // Calculate PromotionRequest stats
    stats.pending += await (prisma as any).promotionRequest.count({ where: { status: { not: "CONCLUSION" } } });
    stats.approvedToday += await (prisma as any).promotionRequest.count({
      where: {
        status: "CONCLUSION",
        directorApproved: true,
        updatedAt: { gte: todayStart, lte: todayEnd }
      }
    });
    stats.rejected += await (prisma as any).promotionRequest.count({
      where: {
        status: "CONCLUSION",
        directorApproved: false
      }
    });

    // Calculate SalaryAdjustmentRequest stats
    stats.pending += await (prisma as any).salaryAdjustmentRequest.count({ where: { status: "PENDING" } });
    stats.approvedToday += await (prisma as any).salaryAdjustmentRequest.count({
      where: {
        status: "APPROVED",
        updatedAt: { gte: todayStart, lte: todayEnd }
      }
    });
    stats.rejected += await (prisma as any).salaryAdjustmentRequest.count({ where: { status: "REJECTED" } });

    // Calculate HrSupplyRequest (Stationery) stats
    stats.pending += await (prisma as any).hrSupplyRequest.count({ where: { type: "STATIONERY", status: "PENDING" } });
    stats.approvedToday += await (prisma as any).hrSupplyRequest.count({
      where: {
        type: "STATIONERY",
        status: "APPROVED",
        updatedAt: { gte: todayStart, lte: todayEnd }
      }
    });
    stats.rejected += await (prisma as any).hrSupplyRequest.count({ where: { type: "STATIONERY", status: "REJECTED" } });

    // Fetch department category list
    const departments = await prisma.departmentCategory.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" }
    });

    return NextResponse.json({ requests: allMappedRequests, stats, departments });
  } catch (error) {
    console.error("[APPROVALS_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
