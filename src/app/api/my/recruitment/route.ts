import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

function mapStatus(dbStatus: string): string {
  const status = (dbStatus || "").toUpperCase();
  if (
    status === "PENDING" ||
    status === "RECEIVING" ||
    status === "DRAFT" ||
    status === "ACCOUNTING_APPROVED" ||
    status === "WAITING_DIRECTOR" ||
    status === "ORDERING"
  ) {
    return "Đang thực hiện";
  }
  if (
    status === "APPROVED" ||
    status === "DELIVERED" ||
    status === "DONE" ||
    status === "SUCCESS" ||
    status === "COMPLETED"
  ) {
    return "Đã thực hiện";
  }
  if (
    status === "REJECTED" ||
    status === "CANCELLED" ||
    status === "HUY" ||
    status === "CANCEL" ||
    status === "HUỶ BỎ"
  ) {
    return "Huỷ bỏ";
  }
  if (status === "HOLD" || status === "SUSPENDED" || status === "TẠM DỪNG" || status === "TAM DUNG") {
    return "Tạm dừng";
  }
  return dbStatus || "Đang thực hiện";
}

// GET: Fetch recruitment/training/promotion/salary/stationery requests for the logged-in user, normalized
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const employeeId = session.user.employeeId;

    // Query all 5 tables in parallel
    const [recRequests, trainRequests, promoRequests, salaryRequests, supplyRequests] = await Promise.all([
      (prisma as any).recruitmentRequest.findMany({
        where: { requesterId: userId },
        orderBy: { createdAt: "desc" }
      }),
      (prisma as any).trainingRequest.findMany({
        where: {
          OR: [
            { requesterId: userId },
            ...(employeeId ? [{ requesterId: employeeId }] : [])
          ]
        },
        orderBy: { createdAt: "desc" }
      }),
      employeeId ? (prisma as any).promotionRequest.findMany({
        where: { requesterId: employeeId },
        include: {
          employee: {
            select: { fullName: true, code: true, departmentName: true, position: true }
          }
        },
        orderBy: { createdAt: "desc" }
      }) : Promise.resolve([]),
      employeeId ? (prisma as any).salaryAdjustmentRequest.findMany({
        where: { requesterId: employeeId },
        include: {
          employee: {
            select: { fullName: true, code: true, departmentName: true, position: true }
          }
        },
        orderBy: { createdAt: "desc" }
      }) : Promise.resolve([]),
      employeeId ? (prisma as any).hrSupplyRequest.findMany({
        where: { requesterId: employeeId },
        include: {
          items: {
            include: {
              item: true
            }
          }
        },
        orderBy: { createdAt: "desc" }
      }) : Promise.resolve([])
    ]);

    // 1. RecruitmentRequest mapping
    const mappedRec = recRequests.map((item: any) => {
      let reqText = item.requirements || "";
      if (reqText && reqText.startsWith("{")) {
        try {
          const parsed = JSON.parse(reqText);
          reqText = parsed.requirementsText || parsed.note || reqText;
        } catch (e) {}
      }

      const formatMoney = (val: string) => {
        if (!val) return "";
        const num = Number(val.replace(/\D/g, ""));
        return isNaN(num) ? val : num.toLocaleString("vi-VN");
      };
      const minSalaryStr = formatMoney(item.salaryMin || "");
      const maxSalaryStr = formatMoney(item.salaryMax || "");
      const salaryText = minSalaryStr && maxSalaryStr 
        ? `${minSalaryStr} - ${maxSalaryStr} VNĐ` 
        : (minSalaryStr ? `${minSalaryStr} VNĐ` : (maxSalaryStr ? `${maxSalaryStr} VNĐ` : "Thỏa thuận"));

      return {
        id: `rec-${item.id}`,
        originalId: item.id,
        type: "Tuyển dụng",
        content: `Tuyển dụng ${item.position}`,
        date: item.date ? new Date(item.date).toLocaleDateString("vi-VN") : new Date(item.createdAt).toLocaleDateString("vi-VN"),
        status: mapStatus(item.status),
        details: {
          position: item.position,
          quantity: String(item.quantity),
          level: item.level || "Nhân viên",
          workType: item.workType || "Toàn thời gian",
          salary: salaryText,
          deadline: item.deadline ? new Date(item.deadline).toISOString().split("T")[0] : "",
          experience: item.experience || "",
          description: item.description || "",
          requirements: reqText,
          requestDate: item.date ? new Date(item.date).toISOString().split("T")[0] : new Date(item.createdAt).toISOString().split("T")[0],
          trainingTime: item.trainingTime || "",
          trainingLocation: item.trainingLocation || "",
          trainingParticipants: item.trainingParticipants || "",
          trainingContent: item.trainingContent || ""
        },
        createdAt: item.createdAt
      };
    });

    // 2. TrainingRequest mapping
    const mappedTrain = trainRequests.map((item: any) => {
      let suppliesList = [];
      if (item.trainingSupplies) {
        try {
          suppliesList = typeof item.trainingSupplies === "string" ? JSON.parse(item.trainingSupplies) : item.trainingSupplies;
        } catch (e) {
          suppliesList = [];
        }
      }
      return {
        id: `train-${item.id}`,
        originalId: item.id,
        type: "Đào tạo",
        content: `Đào tạo: ${item.topic}`,
        date: new Date(item.createdAt).toLocaleDateString("vi-VN"),
        status: mapStatus(item.status),
        details: {
          topic: item.topic,
          trainingType: item.type === "PERIODIC" ? "Định kỳ" : "Đột xuất",
          trainer: item.trainer || "",
          startTime: item.startTime ? new Date(item.startTime).toISOString().slice(0, 16) : "",
          endTime: item.endTime ? new Date(item.endTime).toISOString().slice(0, 16) : "",
          location: item.location || "",
          participants: item.participants || "",
          trainingContent: item.trainingContent || "",
          equipment: item.equipment || "",
          department: item.department || "",
          trainingSupplies: suppliesList
        },
        createdAt: item.createdAt
      };
    });

    // 3. PromotionRequest mapping
    const mappedPromo = promoRequests.map((item: any) => ({
      id: `promo-${item.id}`,
      originalId: item.id,
      type: "Đề bạt và thuyên chuyển",
      content: item.type === "TRANSFER"
        ? `Thuyên chuyển công tác ${item.employee?.fullName || "Nhân sự"}`
        : `Đề bạt ${item.employee?.fullName || "Nhân sự"} lên ${item.targetPos}`,
      date: new Date(item.createdAt).toLocaleDateString("vi-VN"),
      status: mapStatus(item.status),
      details: {
        employee: item.employee ? `${item.employee.fullName} - ${item.employee.departmentName || item.currentDept}` : "",
        employeeId: item.employeeId,
        currentRole: item.currentDept || item.employee?.departmentName || "",
        targetDepartment: item.targetDept || "",
        proposedRole: item.targetPos || "",
        effectiveDate: item.effectiveDate ? new Date(item.effectiveDate).toISOString().split("T")[0] : "",
        reason: item.reason || "",
        isTransfer: item.type === "TRANSFER"
      },
      createdAt: item.createdAt
    }));

    // 4. SalaryAdjustmentRequest mapping
    const mappedSalary = salaryRequests.map((item: any) => {
      let incomeDetailsList = [];
      try {
        const parsedProposed = item.proposedAllowances ? (typeof item.proposedAllowances === "string" ? JSON.parse(item.proposedAllowances) : item.proposedAllowances) : {};
        const parsedCurrent = item.currentAllowances ? (typeof item.currentAllowances === "string" ? JSON.parse(item.currentAllowances) : item.currentAllowances) : {};
        
        incomeDetailsList = [
          { key: "basic", label: "Lương cơ bản", current: item.currentBaseSalary || 0, proposed: item.proposedBaseSalary || 0 },
          { key: "lunch", label: "Phụ cấp ăn trưa", current: parsedCurrent.lunch || 0, proposed: parsedProposed.lunch || 0 },
          { key: "gas", label: "Phụ cấp xăng xe", current: parsedCurrent.gas || 0, proposed: parsedProposed.gas || 0 },
          { key: "phone", label: "Phụ cấp điện thoại", current: parsedCurrent.phone || 0, proposed: parsedProposed.phone || 0 },
          { key: "seniority", label: "Phụ cấp thâm niên", current: parsedCurrent.seniority || 0, proposed: parsedProposed.seniority || 0 }
        ];
      } catch (e) {
        incomeDetailsList = [
          { key: "basic", label: "Lương cơ bản", current: item.currentBaseSalary || 0, proposed: item.proposedBaseSalary || 0 }
        ];
      }

      const totalCurrent = incomeDetailsList.reduce((sum, i) => sum + i.current, 0);
      const totalProposed = incomeDetailsList.reduce((sum, i) => sum + i.proposed, 0);

      let adjustmentTypeLabel = "Tăng lương";
      if (item.adjustmentType === "DECREASE") adjustmentTypeLabel = "Giảm lương";
      if (item.adjustmentType === "RESTRUCTURE") adjustmentTypeLabel = "Tái cơ cấu thu nhập";

      return {
        id: `salary-${item.id}`,
        originalId: item.id,
        type: "Điều chỉnh thu nhập",
        content: `Đề xuất tăng lương quý 2 cho ${item.employee?.fullName || "Nhân sự"}`,
        date: new Date(item.createdAt).toLocaleDateString("vi-VN"),
        status: mapStatus(item.status),
        details: {
          employee: item.employee ? `${item.employee.fullName} - ${item.employee.departmentName || ""}` : "",
          employeeId: item.employeeId,
          adjustmentType: adjustmentTypeLabel,
          effectiveDate: item.effectiveDate ? new Date(item.effectiveDate).toISOString().split("T")[0] : "",
          reason: item.reason || "",
          currentSalary: totalCurrent.toLocaleString("vi-VN") + " VNĐ",
          proposedSalary: totalProposed.toLocaleString("vi-VN") + " VNĐ",
          incomeDetails: incomeDetailsList
        },
        createdAt: item.createdAt
      };
    });

    // 5. HrSupplyRequest mapping
    const mappedSupply = (supplyRequests || []).map((item: any) => {
      const itemDetails = (item.items || []).map((i: any) => {
        return `${i.item.name} (${i.quantity} ${i.item.unit || "cái"})`;
      }).join(", ");

      return {
        id: `stationery-${item.id}`,
        originalId: item.id,
        type: "Văn phòng phẩm và dụng cụ",
        content: item.note || `Yêu cầu VPP: ${itemDetails || "Văn phòng phẩm"}`,
        code: item.code,
        date: new Date(item.createdAt).toLocaleDateString("vi-VN"),
        status: item.status === "PENDING" ? "Chưa xử lý" : (item.status === "APPROVED" || item.status === "REJECTED" ? "Văn phòng đang xử lý" : mapStatus(item.status)),
        details: {
          note: item.note || "",
          totalAmount: item.totalAmount,
          items: (item.items || []).map((i: any) => ({
            id: i.id,
            itemId: i.itemId,
            name: i.item.name,
            quantity: i.quantity,
            price: i.unitPrice || i.item.price || 0,
            unit: i.item.unit || "cái"
          }))
        },
        createdAt: item.createdAt
      };
    });

    // Combine and sort by createdAt desc
    const combined = [...mappedRec, ...mappedTrain, ...mappedPromo, ...mappedSalary, ...mappedSupply].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return NextResponse.json(combined);
  } catch (error) {
    console.error("GET my recruitment requests error:", error);
    return NextResponse.json({ error: "Failed to fetch requests" }, { status: 500 });
  }
}

// POST: Create a request of any type
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { type, details } = body;
    if (!type) {
      return NextResponse.json({ error: "Request type is required" }, { status: 400 });
    }

    const userId = session.user.id;
    const employeeId = session.user.employeeId;

    if (type === "Tuyển dụng") {
      let department = "Khác";
      if (employeeId) {
        const emp = await prisma.employee.findUnique({
          where: { id: employeeId },
          select: { departmentName: true }
        });
        if (emp && emp.departmentName) {
          department = emp.departmentName;
        }
      }

      let salaryMin = null;
      let salaryMax = null;
      if (details.salary) {
        const parts = details.salary.split("-");
        if (parts.length === 2) {
          salaryMin = parts[0].replace(/\D/g, "");
          salaryMax = parts[1].replace(/\D/g, "");
        } else {
          salaryMin = details.salary.replace(/\D/g, "");
        }
      }

      const reqsObj = {
        department,
        position: details.position,
        quantity: parseInt(details.quantity) || 1,
        level: details.level || "Nhân viên",
        workType: details.workType || "Toàn thời gian",
        salaryMin: salaryMin || "",
        salaryMax: salaryMax || "",
        experience: details.experience || "",
        description: details.description || "",
        requirements: details.requirements || "",
        requirementsText: details.requirements || "",
        salaryRange: salaryMin && salaryMax 
          ? `${Number(salaryMin).toLocaleString("vi-VN")} - ${Number(salaryMax).toLocaleString("vi-VN")} VNĐ` 
          : (salaryMin ? `${Number(salaryMin).toLocaleString("vi-VN")} VNĐ` : (salaryMax ? `${Number(salaryMax).toLocaleString("vi-VN")} VNĐ` : "Thỏa thuận"))
      };

      const newRequest = await (prisma as any).recruitmentRequest.create({
        data: {
          department,
          position: details.position,
          quantity: parseInt(details.quantity) || 1,
          requesterId: userId,
          date: details.requestDate ? new Date(details.requestDate) : new Date(),
          deadline: details.deadline ? new Date(details.deadline) : null,
          status: "Pending",
          priority: "Normal",
          description: details.description || "",
          requirements: JSON.stringify(reqsObj),
          level: details.level || "Nhân viên",
          workType: details.workType || "Toàn thời gian",
          experience: details.experience || "",
          salaryMin,
          salaryMax,
          trainingTime: details.trainingTime || "",
          trainingLocation: details.trainingLocation || "",
          trainingParticipants: details.trainingParticipants || "",
          trainingContent: details.trainingContent || ""
        }
      });

      // Create ApprovalRequest
      try {
        const requesterName = session.user.name || "Một quản lý";
        const approvalRequest = await prisma.approvalRequest.create({
          data: {
            entityType: "RECRUITMENT",
            entityId: newRequest.id,
            entityTitle: `Yêu cầu tuyển dụng: ${newRequest.position}`,
            status: "pending",
            priority: "normal",
            requestedById: userId,
            requestedByName: requesterName,
            department: department,
          }
        });

        const { notifyDirector } = await import("@/lib/hr-notifications");
        const attachments = JSON.stringify([
          {
            name: "Xem chi tiết yêu cầu",
            type: "recruitment_approval",
            url: `/hr/recruitment?approvalId=${approvalRequest.id}`,
            approvalId: approvalRequest.id,
            entityId: newRequest.id
          }
        ]);

        await notifyDirector(
          "Yêu cầu tuyển dụng mới cần phê duyệt",
          `**${requesterName}** vừa gửi yêu cầu tuyển dụng cho vị trí **${newRequest.position}** (Số lượng: **${newRequest.quantity}**).\n\nVui lòng xem xét và phê duyệt để bộ phận Nhân sự có thể triển khai tìm kiếm ứng viên.`,
          userId,
          attachments
        );
      } catch (e) {
        console.error("Notify Director Error:", e);
      }

      return NextResponse.json({ success: true, id: `rec-${newRequest.id}` });
    }

    if (type === "Đào tạo") {
      const newRequest = await (prisma as any).trainingRequest.create({
        data: {
          topic: details.topic,
          target: details.participants || "",
          goal: details.trainingContent || "",
          duration: details.startTime && details.endTime ? `${details.startTime} - ${details.endTime}` : "Chưa xác định",
          type: details.trainingType === "Đột xuất" ? "AD_HOC" : "PERIODIC",
          status: "PENDING",
          priority: "NORMAL",
          description: details.trainingContent || "",
          requesterId: userId,
          trainer: details.trainer || "",
          startTime: details.startTime ? new Date(details.startTime) : null,
          endTime: details.endTime ? new Date(details.endTime) : null,
          location: details.location || "",
          participants: details.participants || "",
          trainingContent: details.trainingContent || "",
          equipment: details.equipment || "",
          trainingSupplies: details.trainingSupplies ? JSON.stringify(details.trainingSupplies) : "[]",
          department: details.department || ""
        }
      });

      try {
        const { notifyHRManager } = await import("@/lib/hr-notifications");
        const requesterName = session.user.name || "Một quản lý";
        await notifyHRManager(
          "Yêu cầu đào tạo mới",
          `**${requesterName}** vừa gửi yêu cầu đào tạo với chủ đề **${newRequest.topic}**.`,
          userId
        );
      } catch (e) {
        console.error("Notify HR Manager Error:", e);
      }

      return NextResponse.json({ success: true, id: `train-${newRequest.id}` });
    }

    if (type === "Đề bạt và thuyên chuyển") {
      if (!employeeId) {
        return NextResponse.json({ error: "Chỉ nhân viên có mã HR mới tạo được đề xuất này" }, { status: 400 });
      }
      if (!details.employeeId) {
        return NextResponse.json({ error: "Vui lòng chọn nhân viên được đề xuất" }, { status: 400 });
      }

      let targetEmployee = await prisma.employee.findUnique({
        where: { id: details.employeeId }
      });
      if (!targetEmployee) {
        targetEmployee = await prisma.employee.findUnique({
          where: { userId: details.employeeId }
        });
      }
      if (!targetEmployee) {
        return NextResponse.json({ error: "Không tìm thấy thông tin nhân sự tương ứng" }, { status: 400 });
      }

      const newRequest = await (prisma as any).promotionRequest.create({
        data: {
          employeeId: targetEmployee.id,
          type: details.isTransfer ? "TRANSFER" : "PROMOTION",
          currentDept: details.currentRole || "",
          currentPos: "",
          targetDept: details.targetDepartment || "",
          targetPos: details.proposedRole || "",
          reason: details.reason || "",
          status: "RECEIVING",
          requesterId: employeeId,
          effectiveDate: details.effectiveDate ? new Date(details.effectiveDate) : null
        }
      });

      try {
        const { notifyHRManager } = await import("@/lib/hr-notifications");
        const typeText = details.isTransfer ? "điều chuyển" : "đề bạt";
        const requesterName = session.user.name || "Một quản lý";

        await notifyHRManager(
          `Yêu cầu ${typeText} mới`,
          `**${requesterName}** vừa gửi yêu cầu ${typeText} cho nhân sự **${targetEmployee.fullName || "N/A"}**.`,
          userId
        );
      } catch (e) {
        console.error("Notify HR Manager Error:", e);
      }

      return NextResponse.json({ success: true, id: `promo-${newRequest.id}` });
    }

    if (type === "Điều chỉnh thu nhập") {
      if (!employeeId) {
        return NextResponse.json({ error: "Chỉ nhân viên có mã HR mới tạo được đề xuất này" }, { status: 400 });
      }
      if (!details.employeeId) {
        return NextResponse.json({ error: "Vui lòng chọn nhân viên được đề xuất" }, { status: 400 });
      }

      let targetEmployee = await prisma.employee.findUnique({
        where: { id: details.employeeId }
      });
      if (!targetEmployee) {
        targetEmployee = await prisma.employee.findUnique({
          where: { userId: details.employeeId }
        });
      }
      if (!targetEmployee) {
        return NextResponse.json({ error: "Không tìm thấy thông tin nhân sự tương ứng" }, { status: 400 });
      }

      const currentAllowances: any = {};
      const proposedAllowances: any = {};
      let currentBaseSalary = 0;
      let proposedBaseSalary = 0;

      if (Array.isArray(details.incomeDetails)) {
        details.incomeDetails.forEach((item: any) => {
          if (item.key === "basic") {
            currentBaseSalary = Number(item.current) || 0;
            proposedBaseSalary = Number(item.proposed) || 0;
          } else {
            currentAllowances[item.key] = Number(item.current) || 0;
            proposedAllowances[item.key] = Number(item.proposed) || 0;
          }
        });
      }

      let dbAdjustmentType = "INCREASE";
      if (details.adjustmentType === "Giảm lương") dbAdjustmentType = "DECREASE";
      if (details.adjustmentType === "Tái cơ cấu thu nhập") dbAdjustmentType = "RESTRUCTURE";

      const newRequest = await (prisma as any).salaryAdjustmentRequest.create({
        data: {
          employeeId: targetEmployee.id,
          adjustmentType: dbAdjustmentType,
          currentBaseSalary,
          proposedBaseSalary,
          currentAllowances: JSON.stringify(currentAllowances),
          proposedAllowances: JSON.stringify(proposedAllowances),
          reason: details.reason || "",
          effectiveDate: details.effectiveDate ? new Date(details.effectiveDate) : null,
          requesterId: employeeId,
          status: "PENDING"
        }
      });

      try {
        const { notifyHRManager } = await import("@/lib/hr-notifications");
        const requesterName = session.user.name || "Hệ thống";
        const typeLabel = details.adjustmentType.toLowerCase();

        const attachments = JSON.stringify([
          {
            name: "Chi tiết",
            type: "link",
            url: `/hr/salary-adjustments?id=${newRequest.id}`
          }
        ]);

        await notifyHRManager(
          `Yêu cầu điều chỉnh thu nhập mới`,
          `**${requesterName}** vừa gửi yêu cầu **${typeLabel}** cho nhân sự **${targetEmployee.fullName || "N/A"}**.\n\nVui lòng xem xét và xử lý yêu cầu này.`,
          userId,
          attachments
        );
      } catch (e) {
        console.error("Notify HR Manager Error:", e);
      }

      return NextResponse.json({ success: true, id: `salary-${newRequest.id}` });
    }

    if (type === "Văn phòng phẩm và dụng cụ") {
      let finalRequesterId = employeeId;
      let finalDepartmentId = null;

      if (!finalRequesterId) {
        const emp = await prisma.employee.findFirst({
          where: { userId: userId },
          select: { id: true, departmentCode: true }
        });
        if (emp) {
          finalRequesterId = emp.id;
          const dept = await prisma.departmentCategory.findFirst({
            where: { code: emp.departmentCode },
            select: { id: true }
          });
          if (dept) {
            finalDepartmentId = dept.id;
          }
        }
      } else {
        const emp = await prisma.employee.findUnique({
          where: { id: finalRequesterId },
          select: { departmentCode: true }
        });
        if (emp) {
          const dept = await prisma.departmentCategory.findFirst({
            where: { code: emp.departmentCode },
            select: { id: true }
          });
          if (dept) {
            finalDepartmentId = dept.id;
          }
        }
      }

      if (!finalRequesterId || !finalDepartmentId) {
        return NextResponse.json({ error: "Không tìm thấy thông tin nhân sự của bạn" }, { status: 400 });
      }

      const now = new Date();
      const dateStr = now.getFullYear().toString() + (now.getMonth() + 1).toString().padStart(2, '0');
      const prefix = "REQ";
      const count = await (prisma as any).hrSupplyRequest.count({
        where: {
          code: {
            startsWith: `${prefix}-${dateStr}`
          }
        }
      });
      const code = `${prefix}-${dateStr}-${(count + 1).toString().padStart(3, '0')}`;

      const items = details.stationeryItems || details.items || [];
      if (items.length === 0) {
        return NextResponse.json({ error: "Vui lòng chọn ít nhất một vật tư" }, { status: 400 });
      }

      // Resolve prices from DB
      const itemIds = items.map((i: any) => i.itemId).filter(Boolean);
      if (itemIds.length === 0) {
        return NextResponse.json({ error: "Danh sách vật tư không hợp lệ" }, { status: 400 });
      }

      const dbItems = await (prisma as any).hrSupplyItem.findMany({
        where: { id: { in: itemIds } }
      });

      const itemsWithPrice = items.map((item: any) => {
        const dbItem = dbItems.find((d: any) => d.id === item.itemId);
        const unitPrice = dbItem ? dbItem.price : 0;
        return {
          itemId: item.itemId,
          quantity: Number(item.quantity) || 1,
          unitPrice,
          totalPrice: (Number(item.quantity) || 1) * unitPrice
        };
      });

      const totalAmount = itemsWithPrice.reduce((sum: number, item: any) => sum + item.totalPrice, 0);

      const newRequest = await (prisma as any).hrSupplyRequest.create({
        data: {
          code,
          requesterId: finalRequesterId,
          departmentId: finalDepartmentId,
          type: "STATIONERY",
          note: details.note || "",
          status: "PENDING",
          totalAmount,
          items: {
            create: itemsWithPrice.map((item: any) => ({
              itemId: item.itemId,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              totalPrice: item.totalPrice
            }))
          }
        }
      });

      // Send notification to HR Managers
      try {
        const { notifyHRManager } = await import("@/lib/hr-notifications");
        const requesterName = session.user.name || "Một nhân viên";
        await notifyHRManager(
          "Yêu cầu cấp phát văn phòng phẩm mới",
          `**${requesterName}** vừa gửi yêu cầu cấp phát văn phòng phẩm mới (Mã: **${newRequest.code}**).`,
          userId
        );
      } catch (e) {
        console.error("Notify HR Manager Error:", e);
      }

      return NextResponse.json({ success: true, id: `stationery-${newRequest.id}` });
    }

    return NextResponse.json({ error: "Invalid request type" }, { status: 400 });
  } catch (error) {
    console.error("POST my recruitment requests error:", error);
    return NextResponse.json({ 
      error: "Failed to create request",
      message: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}
