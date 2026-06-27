import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calculateLeadStars } from "@/lib/partner-utils";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

async function syncCustomerFormValues(id: string, formValuesStr: string) {
  try {
    const customer = await prisma.customer.findUnique({
      where: { id }
    });
    if (customer) {
      await prisma.customer.update({
        where: { id },
        data: { formValues: formValuesStr }
      });
    }
  } catch (e) {
    console.error("Lỗi sync formValues sang Customer:", e);
  }
}


/**
 * Maps a Prisma MarketingLead (including campaign and careHistories) to a PartnerProcessItem.
 * Blends care history records from both the relational PartnerCareHistory table and
 * any legacy/uncreated care histories cached in formValues.careHistories.
 */
function mapLeadToPartnerProcessItem(lead: any, matchingQuotation: any = null): any {
  let formValues: any = {};
  if (lead.formValues) {
    try {
      formValues = JSON.parse(lead.formValues);
    } catch (e) {
      console.error("Parse formValues error", e);
    }
  }

  // 1. Get histories from the database table relation
  const dbHistories = lead.careHistories || [];

  // 2. Get histories from formValues JSON array (to recover any failed database writes)
  let jsonHistories: any[] = [];
  if (formValues.careHistories && Array.isArray(formValues.careHistories)) {
    jsonHistories = formValues.careHistories;
  }

  // 3. Merge and de-duplicate by unique properties (date, approach step, outcomes)
  const mergedHistoriesMap = new Map<string, any>();

  // Add all database histories
  dbHistories.forEach((h: any) => {
    const execDate = h.executionDate instanceof Date ? h.executionDate : new Date(h.executionDate);
    const key = `${execDate.getTime()}_${h.approachStep || ""}_${h.otherRequirements || ""}`;
    mergedHistoriesMap.set(key, {
      id: h.id,
      partnerId: h.partnerId,
      fullName: h.fullName,
      role: h.role || "Ông chủ",
      phone: h.phone,
      email: h.email || "",
      companyName: h.companyName,
      businessAddress: h.businessAddress,
      businessType: h.businessType || "",
      premisesScale: h.premisesScale,
      collabNeeds: h.collabNeeds,
      currentBrands: h.currentBrands || "",
      deploymentPlan: h.deploymentPlan,
      expectedInvestment: h.expectedInvestment || "",
      investmentTimeframe: h.investmentTimeframe || "",
      approachStep: h.approachStep || "Tiếp cận",
      attitude: h.attitude || "Bình thường",
      interests: h.interests || "",
      painPoints: h.painPoints || "",
      premisesCondition: h.premisesCondition || "",
      otherRequirements: h.otherRequirements || "",
      stars: h.stars || 3,
      executionDate: execDate.toISOString(),
      executor: h.executor,
      cabinetArea: h.cabinetArea || "",
      cabinetUnitPrice: h.cabinetUnitPrice || "",
      cabinetBrandSupportRate: h.cabinetBrandSupportRate || "",
      cabinetOtherCosts: h.cabinetOtherCosts || "",
      cabinetNotes: h.cabinetNotes || "",
    });
  });

  // Merge JSON histories (recover missing database records)
  jsonHistories.forEach((h: any) => {
    if (!h.executionDate) return;
    const execDate = new Date(h.executionDate);
    if (isNaN(execDate.getTime())) return;
    const key = `${execDate.getTime()}_${h.approachStep || ""}_${h.otherRequirements || ""}`;

    if (!mergedHistoriesMap.has(key)) {
      const historyStars = calculateLeadStars({
        role: h.role,
        deploymentPlan: h.deploymentPlan,
        collabNeeds: h.collabNeeds,
        otherRequirements: h.otherRequirements,
        painPoints: h.painPoints,
        attitude: h.attitude,
      });

      mergedHistoriesMap.set(key, {
        id: h.id,
        partnerId: h.partnerId || lead.id,
        fullName: h.fullName || "",
        role: h.role || "Ông chủ",
        phone: h.phone || lead.phone || "",
        email: h.email || lead.email || "",
        companyName: h.companyName || "",
        businessAddress: h.businessAddress || "",
        businessType: h.businessType || "",
        premisesScale: h.premisesScale || "",
        collabNeeds: h.collabNeeds || "",
        currentBrands: h.currentBrands || "",
        deploymentPlan: h.deploymentPlan || "",
        expectedInvestment: h.expectedInvestment || "",
        investmentTimeframe: h.investmentTimeframe || "",
        approachStep: h.approachStep || "Tiếp cận",
        attitude: h.attitude || "Bình thường",
        interests: h.interests || "",
        painPoints: h.painPoints || "",
        premisesCondition: h.premisesCondition || "",
        otherRequirements: h.otherRequirements || "",
        stars: historyStars,
        executionDate: execDate.toISOString(),
        executor: h.executor || "",
        cabinetArea: h.cabinetArea || "",
        cabinetUnitPrice: h.cabinetUnitPrice || "",
        cabinetBrandSupportRate: h.cabinetBrandSupportRate || "",
        cabinetOtherCosts: h.cabinetOtherCosts || "",
        cabinetNotes: h.cabinetNotes || "",
      });
    }
  });

  // Sort by executionDate descending to get the latest first
  const finalSortedHistories = Array.from(mergedHistoriesMap.values()).sort(
    (a, b) => new Date(b.executionDate).getTime() - new Date(a.executionDate).getTime()
  );

  const finalLatestHistory = finalSortedHistories[0] || null;

  // Calculate main level stars for the partner
  const finalMainStars = finalLatestHistory
    ? finalLatestHistory.stars
    : calculateLeadStars({
        role: formValues.detailRole || "Ông chủ",
        deploymentPlan: formValues.detailDeploymentPlan || "",
        collabNeeds: formValues.detailCollabNeeds || formValues.needs || lead.notes || "",
        otherRequirements: formValues.detailOtherRequirements || "",
        painPoints: formValues.detailPainPoints || "",
        attitude: formValues.detailAttitude || "Bình thường"
      });

  return {
    id: lead.id,
    name: lead.fullName || "",
    contact: formValues.contact || (lead.phone ? `${lead.fullName} - ${lead.phone}` : (lead.fullName || "")),
    contactEmail: lead.email || undefined,
    area: formValues.area || "Hà Nội",
    source: lead.source || (lead.campaign?.platform === "facebook" ? "Facebook Ads" : "Website"),
    date: lead.createdAt instanceof Date ? lead.createdAt.toISOString() : new Date(lead.createdAt).toISOString(),
    scale: formValues.scale || "",
    needs: formValues.needs || lead.notes || "",
    step: formValues.step || 1,
    stars: finalMainStars,
    
    careStaff: formValues.careStaff || "Vũ Hoàng Long",
    lastCareDate: formValues.lastCareDate || "",
    careChannel: formValues.careChannel || "Zalo",
    careNote: formValues.careNote || "",
    nextSchedule: formValues.nextSchedule || "",
    
    quoteCode: matchingQuotation ? (matchingQuotation.code || "") : "",
    quoteValue: matchingQuotation ? (matchingQuotation.tongTien || 0) : 0,
    discountRate: matchingQuotation ? (matchingQuotation.discount || 0) : 0,
    quoteStatus: matchingQuotation 
      ? (matchingQuotation.trangThai === "draft" ? "Draft" : matchingQuotation.trangThai === "sent" ? "Sent" : matchingQuotation.trangThai === "approved" ? "Approved" : matchingQuotation.trangThai || "")
      : "",
    
    contractNo: formValues.contractNo || "",
    contractValue: formValues.contractValue || 0,
    creditLimit: formValues.creditLimit || 0,
    signDate: formValues.signDate || "",
    contractStatus: formValues.contractStatus || "Pending Signature",
    contractPdf: formValues.contractPdf || "",
    
    showroomArea: formValues.showroomArea || 0,
    designStatus: formValues.designStatus || "Not Started",
    constructionProgress: formValues.constructionProgress || 0,
    estOpeningDate: formValues.estOpeningDate || "",
    constructionStatus: formValues.constructionStatus || "Pending",
    consProgress1: formValues.consProgress1 || 0,
    consProgress2: formValues.consProgress2 || 0,
    consProgress3: formValues.consProgress3 || 0,
    consProgress4: formValues.consProgress4 || 0,
    consProgress5: formValues.consProgress5 || 0,
    reminderCount: formValues.reminderCount || 0,

    // Care details fields
    detailFullName: formValues.detailFullName || "",
    detailPhone: formValues.detailPhone || "",
    detailRole: formValues.detailRole || "Ông chủ",
    detailEmail: formValues.detailEmail || "",
    detailCompanyName: formValues.detailCompanyName || "",
    detailBusinessAddress: formValues.detailBusinessAddress || "",
    detailBusinessType: formValues.detailBusinessType || "",
    detailPremisesScale: formValues.detailPremisesScale || "",
    detailCollabNeeds: formValues.detailCollabNeeds || "",
    detailCurrentBrands: formValues.detailCurrentBrands || "",
    detailDeploymentPlan: formValues.detailDeploymentPlan || "",
    detailExpectedInvestment: formValues.detailExpectedInvestment || "",
    detailInvestmentTimeframe: formValues.detailInvestmentTimeframe || "",
    detailCabinetArea: formValues.detailCabinetArea || "",
    detailCabinetUnitPrice: formValues.detailCabinetUnitPrice || "",
    detailCabinetBrandSupportRate: formValues.detailCabinetBrandSupportRate || "",
    detailCabinetOtherCosts: formValues.detailCabinetOtherCosts || "",
    detailCabinetNotes: formValues.detailCabinetNotes || "",
    detailApproachStep: formValues.detailApproachStep || "Tiếp cận",
    detailAttitude: formValues.detailAttitude || "",
    detailInterests: formValues.detailInterests || "",
    detailPainPoints: formValues.detailPainPoints || "",
    detailPremisesCondition: formValues.detailPremisesCondition || "",
    detailOtherRequirements: formValues.detailOtherRequirements || "",
    detailExecutionDate: formValues.detailExecutionDate || "",
    detailExecutor: formValues.detailExecutor || "",
    detailSpecialRequestPending: formValues.detailSpecialRequestPending || false,
    detailSpecialRequestStatus: formValues.detailSpecialRequestStatus || "",
    careHistories: finalSortedHistories,
    quoteId: matchingQuotation ? matchingQuotation.id : "",
    quoteCreatedAt: matchingQuotation ? (matchingQuotation.createdAt instanceof Date ? matchingQuotation.createdAt.toISOString() : new Date(matchingQuotation.createdAt).toISOString()) : undefined,
    quoteNegotiations: matchingQuotation ? matchingQuotation.negotiations.map((n: any) => ({
      id: n.id,
      quotationId: n.quotationId,
      loai: n.loai,
      ngay: n.ngay instanceof Date ? n.ngay.toISOString() : new Date(n.ngay).toISOString(),
      nguoiThucHien: n.nguoiThucHien,
      ketQua: n.ketQua,
      createdAt: n.createdAt instanceof Date ? n.createdAt.toISOString() : new Date(n.createdAt).toISOString()
    })) : [],
    quoteType: formValues.quoteType || "",

    bbDate: formValues.bbDate || undefined,
    bbCode: formValues.bbCode || undefined,
    bbA_DienThoai: formValues.bbA_DienThoai || undefined,
    bbANguoiKy: formValues.bbANguoiKy || undefined,
    bbAChucVu: formValues.bbAChucVu || undefined,
    bbQuoteCode: formValues.bbQuoteCode || undefined,
    bbDiaDiem: formValues.bbDiaDiem || undefined,
    bbPdf: formValues.bbPdf || undefined,
    bbSigA: formValues.bbSigA || undefined,
    bbSigB: formValues.bbSigB || undefined,
    bbB_Ten: formValues.bbB_Ten || undefined,
    bbB_DiaChi: formValues.bbB_DiaChi || undefined,
    bbB_MST: formValues.bbB_MST || undefined,
    bbB_DaiDien: formValues.bbB_DaiDien || undefined,
    bbB_ChucVu: formValues.bbB_ChucVu || undefined,
    bbB_DienThoai: formValues.bbB_DienThoai || undefined,
    bbB_Email: formValues.bbB_Email || undefined,
    bbSupports: formValues.bbSupports || undefined,
    bbBonuses: lead.bonusFormulas && lead.bonusFormulas.length > 0
      ? lead.bonusFormulas.map((f: any) => ({
          id: f.id,
          title: f.title,
          desc: f.description || "",
          formula: f.formula,
        }))
      : (formValues.bbBonuses || undefined),

    // Contract fields mapping
    hdCode: formValues.hdCode || undefined,
    hdDate: formValues.hdDate || undefined,
    hdDiaDiem: formValues.hdDiaDiem || undefined,
    hdANguoiKy: formValues.hdANguoiKy || undefined,
    hdAChucVu: formValues.hdAChucVu || undefined,
    hdB_Ten: formValues.hdB_Ten || undefined,
    hdB_DiaChi: formValues.hdB_DiaChi || undefined,
    hdB_MST: formValues.hdB_MST || undefined,
    hdB_DaiDien: formValues.hdB_DaiDien || undefined,
    hdB_ChucVu: formValues.hdB_ChucVu || undefined,
    hdB_DienThoai: formValues.hdB_DienThoai || undefined,
    hdB_Email: formValues.hdB_Email || undefined,
    hdShowroomAddress: formValues.hdShowroomAddress || undefined,
    hdShowroomArea: formValues.hdShowroomArea || undefined,
    hdAnnualRevenue: formValues.hdAnnualRevenue || undefined,
    hdMonthlyRevenue: formValues.hdMonthlyRevenue || undefined,
    hdDurationYears: formValues.hdDurationYears || undefined,
    hdExclusiveRadius: formValues.hdExclusiveRadius || undefined,
    hdExclusiveMonths: formValues.hdExclusiveMonths || undefined,

    // Appendix (Phụ lục) fields mapping
    plNo: formValues.plNo || undefined,
    plDate: formValues.plDate || undefined,
    plAddress: formValues.plAddress || undefined,
    plCptc: formValues.plCptc || undefined,
    plCptcText: formValues.plCptcText || undefined,
    plRevenueMkt: formValues.plRevenueMkt || undefined,
    plRevenueMktText: formValues.plRevenueMktText || undefined,
    plRevenueCommit: formValues.plRevenueCommit || undefined,
    plRevenueCommitText: formValues.plRevenueCommitText || undefined,
    plDurationDays: formValues.plDurationDays || undefined,
    plTimeline1: formValues.plTimeline1 || undefined,
    plTimeline2: formValues.plTimeline2 || undefined,
    plTimeline3: formValues.plTimeline3 || undefined,
    plTimeline4: formValues.plTimeline4 || undefined,
    plTimeline5: formValues.plTimeline5 || undefined,
    plMaxDelayDays: formValues.plMaxDelayDays || undefined,
    plPhase1Date: formValues.plPhase1Date || undefined,
    plPhase1Rate: formValues.plPhase1Rate || undefined,
    plPhase1Amount: formValues.plPhase1Amount || undefined,
    plPhase1AmountText: formValues.plPhase1AmountText || undefined,
    plPhase2Date: formValues.plPhase2Date || undefined,
    plPhase2Rate: formValues.plPhase2Rate || undefined,
    plPhase2Amount: formValues.plPhase2Amount || undefined,
    plPhase2AmountText: formValues.plPhase2AmountText || undefined,
    plPhase3Date: formValues.plPhase3Date || undefined,
    plPhase3Rate: formValues.plPhase3Rate || undefined,
    plPhase3Amount: formValues.plPhase3Amount || undefined,
    plPhase3AmountText: formValues.plPhase3AmountText || undefined,
    plPenaltyMaxDelay: formValues.plPenaltyMaxDelay || undefined,
    plPdf: formValues.plPdf || undefined,
    consTimeline1: formValues.consTimeline1 || undefined,
    consTimeline2: formValues.consTimeline2 || undefined,
    consTimeline3: formValues.consTimeline3 || undefined,
    consTimeline4: formValues.consTimeline4 || undefined,
    consTimeline5: formValues.consTimeline5 || undefined,
  };
}

export async function GET(req: NextRequest) {
  try {
    // Find or create the default partner development campaign
    let campaign = await (prisma as any).marketingCampaign.findUnique({
      where: { externalId: "partner-development-campaign" }
    });

    if (!campaign) {
      campaign = await (prisma as any).marketingCampaign.create({
        data: {
          externalId: "partner-development-campaign",
          name: "Phát triển đại lý",
          platform: "CRM",
          status: "active"
        }
      });
    }

    const leads = await (prisma as any).marketingLead.findMany({
      include: {
        campaign: true,
        careHistories: {
          orderBy: {
            executionDate: "desc"
          }
        },
        bonusFormulas: {
          orderBy: {
            sortOrder: "asc"
          }
        }
      },
      orderBy: {
        createdAt: "desc"
      }
    });

    const leadIds = leads.map((l: any) => l.id);
    const quoteCodes = leads
      .map((l: any) => {
        try {
          return JSON.parse(l.formValues || "{}").quoteCode;
        } catch (e) {
          return null;
        }
      })
      .filter(Boolean) as string[];

    const quotations = await (prisma as any).quotation.findMany({
      where: {
        OR: [
          { customerId: { in: leadIds } },
          { code: { in: quoteCodes } }
        ]
      },
      include: {
        negotiations: {
          orderBy: { ngay: "desc" }
        }
      }
    });

    const partners = [];
    for (const lead of leads) {
      let formValues: any = {};
      try {
        formValues = JSON.parse(lead.formValues || "{}");
      } catch (e) {}

      let matchingQuotation = quotations.find(
        (q: any) => q.customerId === lead.id || (formValues.quoteCode && q.code === formValues.quoteCode)
      );

      // No automatic quotation creation here; quotation must be explicitly created by the user clicking "Tạo báo giá"

      partners.push(mapLeadToPartnerProcessItem(lead, matchingQuotation));
    }

    return NextResponse.json(partners);
  } catch (error: any) {
    console.error("[Sales Partners GET Error]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const body = await req.json();
    const { name, area, source, scale, contact, contactEmail, needs, role } = body;

    let campaign = await (prisma as any).marketingCampaign.findUnique({
      where: { externalId: "partner-development-campaign" }
    });

    if (!campaign) {
      campaign = await (prisma as any).marketingCampaign.create({
        data: {
          externalId: "partner-development-campaign",
          name: "Phát triển đại lý",
          platform: "CRM",
          status: "active"
        }
      });
    }

    // Parse contact name and phone from "Name - Phone"
    const parts = contact.split(" - ");
    const phone = parts[1] || "";

    // Find default care staff (CRM employee)
    let careStaffName = "Vũ Hoàng Long";
    if (session?.user?.id) {
      const currentUser = await prisma.user.findUnique({
        where: { id: session.user.id }
      });
      let hasCrm = false;
      if (currentUser?.permissions) {
        try {
          const perms = JSON.parse(currentUser.permissions);
          if (Array.isArray(perms) && perms.includes("crm")) {
            hasCrm = true;
          }
        } catch (e) {
          hasCrm = currentUser.permissions.includes("crm");
        }
      }
      if (hasCrm && currentUser?.name) {
        careStaffName = currentUser.name;
      } else {
        const firstCrmUser = await prisma.user.findFirst({
          where: {
            permissions: { contains: '"crm"' }
          },
          select: {
            name: true
          }
        });
        if (firstCrmUser?.name) {
          careStaffName = firstCrmUser.name;
        }
      }
    }

    const formValuesObj = {
      area: area || "",
      scale: scale || "",
      needs: needs || "",
      step: 1,
      contact: contact || "",
      detailRole: role || "Ông chủ",
      careStaff: careStaffName,
    };

    const newLead = await (prisma as any).marketingLead.create({
      data: {
        campaignId: campaign.id,
        fullName: name,
        email: contactEmail || null,
        phone: phone || null,
        source: source || "Website",
        notes: needs || null,
        formValues: JSON.stringify(formValuesObj),
        status: "new"
      }
    });

    return NextResponse.json(newLead);
  } catch (error: any) {
    console.error("[Sales Partners POST Error]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { id, name, area, source, scale, contact, contactEmail, needs, step, exceptionReason, ...formValuesRest } = body;

    const existingLead = await (prisma as any).marketingLead.findUnique({
      where: { id }
    });

    if (!existingLead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    // Parse current formValues
    let currentFormValues: any = {};
    if (existingLead.formValues) {
      try {
        currentFormValues = JSON.parse(existingLead.formValues);
      } catch (e) {}
    }

    // Intercept SAVE_PHU_LUC action
    if (body.action === "SAVE_PHU_LUC") {
      // 1. Copy plTimeline1-5 to consTimeline1-5
      currentFormValues.consTimeline1 = body.plTimeline1 || "";
      currentFormValues.consTimeline2 = body.plTimeline2 || "";
      currentFormValues.consTimeline3 = body.plTimeline3 || "";
      currentFormValues.consTimeline4 = body.plTimeline4 || "";
      currentFormValues.consTimeline5 = body.plTimeline5 || "";

      // Move step to 5 and initialize construction fields
      const newStep = 5;
      currentFormValues.showroomArea = currentFormValues.showroomArea || 100;
      currentFormValues.designStatus = currentFormValues.designStatus || "Designing";
      currentFormValues.constructionProgress = currentFormValues.constructionProgress || 10;
      currentFormValues.estOpeningDate = currentFormValues.estOpeningDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
      currentFormValues.constructionStatus = currentFormValues.constructionStatus || "Pending";
      currentFormValues.step = newStep;

      // Sync form values
      const updatedFormValues = {
        ...currentFormValues,
        ...formValuesRest,
        step: newStep
      };

      // Update lead
      await (prisma as any).marketingLead.update({
        where: { id },
        data: {
          fullName: name !== undefined ? name : existingLead.fullName,
          email: contactEmail !== undefined ? (contactEmail || null) : existingLead.email,
          source: source !== undefined ? source : existingLead.source,
          notes: needs !== undefined ? (needs || null) : existingLead.notes,
          formValues: JSON.stringify(updatedFormValues),
          status: `step_${newStep}`
        }
      });

      await syncCustomerFormValues(id, JSON.stringify(updatedFormValues));

      // 2. Synchronize payment phases to Debt table
      // Clean up existing unpaid receivable debts for this partner's appendix
      await (prisma as any).debt.deleteMany({
        where: {
          referenceId: id,
          type: "RECEIVABLE",
          description: {
            contains: "CPTC - Phụ lục HĐ"
          },
          status: "UNPAID"
        }
      });

      const parseDotSeparatedNumber = (val: any): number => {
        if (!val) return 0;
        const str = String(val).replace(/\./g, "").trim();
        const num = parseFloat(str);
        return isNaN(num) ? 0 : num;
      };

      const parseDate = (val: any): Date | null => {
        if (!val) return null;
        const d = new Date(val);
        return isNaN(d.getTime()) ? null : d;
      };

      const phases = [
        {
          amount: parseDotSeparatedNumber(body.plPhase1Amount),
          date: parseDate(body.plPhase1Date),
          desc: `Thanh toán đợt 1 CPTC - Phụ lục HĐ số ${body.plNo || ""}`.trim()
        },
        {
          amount: parseDotSeparatedNumber(body.plPhase2Amount),
          date: parseDate(body.plPhase2Date),
          desc: `Thanh toán đợt 2 CPTC - Phụ lục HĐ số ${body.plNo || ""}`.trim()
        },
        {
          amount: parseDotSeparatedNumber(body.plPhase3Amount),
          date: parseDate(body.plPhase3Date),
          desc: `Thanh toán đợt 3 CPTC - Phụ lục HĐ số ${body.plNo || ""}`.trim()
        }
      ];

      for (const phase of phases) {
        if (phase.amount > 0 && phase.date) {
          await (prisma as any).debt.create({
            data: {
              type: "RECEIVABLE",
              partnerName: name || existingLead.fullName || "Đại lý",
              amount: phase.amount,
              paidAmount: 0,
              dueDate: phase.date,
              status: "UNPAID",
              description: phase.desc,
              referenceId: id
            }
          });
        }
      }

      // Fetch the updated lead
      const finalLead = await (prisma as any).marketingLead.findUnique({
        where: { id },
        include: {
          campaign: true,
          careHistories: { orderBy: { executionDate: "desc" } },
          bonusFormulas: { orderBy: { sortOrder: "asc" } }
        }
      });

      let formValues: any = {};
      try {
        formValues = JSON.parse(finalLead.formValues || "{}");
      } catch (e) {}

      const matchingQuotation = await (prisma as any).quotation.findFirst({
        where: {
          OR: [
            { customerId: finalLead.id },
            { code: formValues.quoteCode || "" }
          ]
        },
        include: {
          negotiations: { orderBy: { ngay: "desc" } }
        }
      });

      const mappedLead = mapLeadToPartnerProcessItem(finalLead, matchingQuotation);
      return NextResponse.json(mappedLead);
    }

    // Intercept CREATE_QUOTATION action
    if (body.action === "CREATE_QUOTATION") {
      const { quoteValue, discountRate, quoteStatus } = body;

      // 1. Ensure customer exists to prevent foreign key constraint violation
      let customer = await (prisma as any).customer.findUnique({
        where: { id }
      });
      if (!customer) {
        customer = await (prisma as any).customer.create({
          data: {
            id,
            name: existingLead.fullName || "Đại lý chưa đặt tên",
            dienThoai: existingLead.phone,
            email: existingLead.email,
            nguon: existingLead.source,
          }
        });
      }

      // Calculate next code using QUO-YYYYmmdd-STT rule
      const now = new Date();
      const utcTime = now.getTime() + now.getTimezoneOffset() * 60000;
      const ICTTime = new Date(utcTime + 3600000 * 7);

      const yyyy = ICTTime.getFullYear();
      const mm = String(ICTTime.getMonth() + 1).padStart(2, "0");
      const dd = String(ICTTime.getDate()).padStart(2, "0");
      const dateStr = `${yyyy}${mm}${dd}`;
      const prefix = `QUO-${dateStr}-`;

      const todayQuotes = await (prisma as any).quotation.findMany({
        where: {
          code: {
            startsWith: prefix
          }
        },
        select: {
          code: true
        }
      });

      let maxSTT = 0;
      for (const q of todayQuotes) {
        if (q.code) {
          const parts = q.code.split("-");
          const sttPart = parts[parts.length - 1];
          const sttVal = parseInt(sttPart, 10);
          if (!isNaN(sttVal) && sttVal > maxSTT) {
            maxSTT = sttVal;
          }
        }
      }

      const nextSTTStr = String(maxSTT + 1).padStart(3, "0");
      const finalQuoteCode = `${prefix}${nextSTTStr}`;

      // 2. Create quotation
      const quotation = await (prisma as any).quotation.create({
        data: {
          code: finalQuoteCode,
          customerId: id,
          tongTien: parseFloat(String(quoteValue ?? 150000000)),
          discount: parseFloat(String(discountRate ?? 35)),
          trangThai: (quoteStatus || "Draft").toLowerCase(),
          ngayBaoGia: new Date(),
        },
        include: {
          negotiations: true
        }
      });

      // 3. Update the lead's formValues
      currentFormValues.quoteCode = finalQuoteCode;
      currentFormValues.quoteValue = quoteValue;
      currentFormValues.discountRate = discountRate;
      currentFormValues.quoteStatus = quoteStatus;
      currentFormValues.step = 3;

      const updatedLead = await (prisma as any).marketingLead.update({
        where: { id },
        data: {
          formValues: JSON.stringify(currentFormValues),
          status: "step_3"
        },
        include: {
          campaign: true,
          careHistories: { orderBy: { executionDate: "desc" } },
          bonusFormulas: { orderBy: { sortOrder: "asc" } }
        }
      });

      await syncCustomerFormValues(id, JSON.stringify(currentFormValues));

      return NextResponse.json(mapLeadToPartnerProcessItem(updatedLead, quotation));
    }

    // Intercept delete care history action
    if (body.action === "DELETE_HISTORY") {
      const { careHistoryId } = body;
      if (!careHistoryId) {
        return NextResponse.json({ error: "Missing careHistoryId" }, { status: 400 });
      }

      // 1. Find the DB record first to get its unique properties (to clean up cached JSON)
      let dbRecord = null;
      if (!careHistoryId.startsWith("0.")) {
        dbRecord = await (prisma as any).partnerCareHistory.findUnique({
          where: { id: careHistoryId }
        });
      }

      // 2. Delete history from relational DB if it exists (including any duplicate copies in the table)
      if (dbRecord) {
        await (prisma as any).partnerCareHistory.deleteMany({
          where: {
            partnerId: id,
            approachStep: dbRecord.approachStep,
            otherRequirements: dbRecord.otherRequirements,
            executionDate: dbRecord.executionDate
          }
        });
      }

      // 3. Remove from lead's formValues by ID or by matching date + step + requirements
      const updatedHistories = (currentFormValues.careHistories || []).filter(
        (h: any) => {
          if (h.id === careHistoryId) return false;
          
          if (dbRecord) {
            const hDate = new Date(h.executionDate).getTime();
            const dbDate = new Date(dbRecord.executionDate).getTime();
            // Allow 10 seconds boundary difference due to JSON parsing/date rounding
            const dateMatches = Math.abs(hDate - dbDate) < 10000;
            const stepMatches = (h.approachStep || "") === (dbRecord.approachStep || "");
            const reqMatches = (h.otherRequirements || "") === (dbRecord.otherRequirements || "");
            
            if (dateMatches && stepMatches && reqMatches) {
              return false;
            }
          }
          return true;
        }
      );

      // Recalculate latest stars & details from the remaining histories
      const sortedRemaining = [...updatedHistories].sort(
        (a, b) => new Date(b.executionDate).getTime() - new Date(a.executionDate).getTime()
      );

      const latestHistory = sortedRemaining[0] || null;
      let finalMainStars = 3;
      let latestDetails: any = {
        detailFullName: "",
        detailPhone: "",
        detailRole: "Ông chủ",
        detailEmail: "",
        detailCompanyName: "",
        detailBusinessAddress: "",
        detailBusinessType: "",
        detailPremisesScale: "",
        detailCollabNeeds: "",
        detailCurrentBrands: "",
        detailDeploymentPlan: "",
        detailExpectedInvestment: "",
        detailInvestmentTimeframe: "",
        detailApproachStep: "Tiếp cận",
        detailAttitude: "",
        detailInterests: "",
        detailPainPoints: "",
        detailPremisesCondition: "",
        detailOtherRequirements: "",
        detailExecutionDate: "",
        detailExecutor: ""
      };

      if (latestHistory) {
        finalMainStars = latestHistory.stars || calculateLeadStars({
          role: latestHistory.role,
          deploymentPlan: latestHistory.deploymentPlan,
          collabNeeds: latestHistory.collabNeeds,
          otherRequirements: latestHistory.otherRequirements,
          painPoints: latestHistory.painPoints,
          attitude: latestHistory.attitude,
        });

        latestDetails = {
          detailFullName: latestHistory.fullName,
          detailPhone: latestHistory.phone,
          detailRole: latestHistory.role,
          detailEmail: latestHistory.email,
          detailCompanyName: latestHistory.companyName,
          detailBusinessAddress: latestHistory.businessAddress,
          detailBusinessType: latestHistory.businessType,
          detailPremisesScale: latestHistory.premisesScale,
          detailCollabNeeds: latestHistory.collabNeeds,
          detailCurrentBrands: latestHistory.currentBrands,
          detailDeploymentPlan: latestHistory.deploymentPlan,
          detailExpectedInvestment: latestHistory.expectedInvestment,
          detailInvestmentTimeframe: latestHistory.investmentTimeframe,
          detailApproachStep: latestHistory.approachStep,
          detailAttitude: latestHistory.attitude,
          detailInterests: latestHistory.interests,
          detailPainPoints: latestHistory.painPoints,
          detailPremisesCondition: latestHistory.premisesCondition,
          detailOtherRequirements: latestHistory.otherRequirements,
          detailExecutionDate: latestHistory.executionDate,
          detailExecutor: latestHistory.executor,
          careStaff: latestHistory.executor
        };
      }

      const updatedFormValues = {
        ...currentFormValues,
        ...latestDetails,
        stars: finalMainStars,
        careHistories: updatedHistories
      };

      await (prisma as any).marketingLead.update({
        where: { id },
        data: {
          formValues: JSON.stringify(updatedFormValues)
        }
      });

      await syncCustomerFormValues(id, JSON.stringify(updatedFormValues));

      const finalLead = await (prisma as any).marketingLead.findUnique({
        where: { id },
        include: {
          campaign: true,
          careHistories: {
            orderBy: {
              executionDate: "desc"
            }
          },
          bonusFormulas: {
            orderBy: {
              sortOrder: "asc"
            }
          }
        }
      });

      return NextResponse.json(mapLeadToPartnerProcessItem(finalLead));
    }

    // Intercept Sales Manager Action (APPROVE_EXCEPTION or REJECT_EXCEPTION)
    if (body.action === "APPROVE_EXCEPTION" || body.action === "REJECT_EXCEPTION") {
      const isApprove = body.action === "APPROVE_EXCEPTION";
      
      // 1. Update Lead formValues
      const updatedFormValues = {
        ...currentFormValues,
        detailSpecialRequestPending: false,
        detailSpecialRequestStatus: isApprove ? "APPROVED" : "REJECTED"
      };

      await (prisma as any).marketingLead.update({
        where: { id },
        data: {
          formValues: JSON.stringify(updatedFormValues)
        }
      });

      await syncCustomerFormValues(id, JSON.stringify(updatedFormValues));

      // 1.2 Create PartnerCareHistory for manager approval/rejection
      await (prisma as any).partnerCareHistory.create({
        data: {
          partnerId: id,
          fullName: currentFormValues.detailFullName || existingLead.fullName || "",
          role: currentFormValues.detailRole || "Ông chủ",
          phone: currentFormValues.detailPhone || existingLead.phone || "",
          email: currentFormValues.detailEmail || existingLead.email || "",
          companyName: currentFormValues.detailCompanyName || "",
          businessAddress: currentFormValues.detailBusinessAddress || "",
          businessType: currentFormValues.detailBusinessType || "",
          premisesScale: currentFormValues.detailPremisesScale || "",
          collabNeeds: currentFormValues.detailCollabNeeds || existingLead.notes || "",
          currentBrands: currentFormValues.detailCurrentBrands || "",
          deploymentPlan: currentFormValues.detailDeploymentPlan || "",
          approachStep: isApprove ? "[Đặc cách được duyệt]" : "[Đặc cách bị từ chối]",
          attitude: currentFormValues.detailAttitude || "Bình thường",
          otherRequirements: isApprove 
            ? "Trưởng phòng đồng ý phê duyệt chuyển bước đặc cách." 
            : `Trưởng phòng từ chối yêu cầu đặc cách chuyển bước.`,
          stars: currentFormValues.stars || 3,
          executionDate: new Date(),
          executor: session.user.name || "Trưởng phòng",
        }
      });

      // 2. Update Notification status in attachments
      let requesterId = session.user.id;
      let requesterName = session.user.name || "Nhân viên";
      if (body.notificationId) {
        const notif = await prisma.notification.findUnique({
          where: { id: body.notificationId }
        });
        if (notif && notif.attachments) {
          try {
            const arr = JSON.parse(notif.attachments);
            if (Array.isArray(arr) && arr[0]) {
              arr[0].status = isApprove ? "APPROVED" : "REJECTED";
              requesterId = arr[0].requesterId || requesterId;
              requesterName = arr[0].requesterName || requesterName;
              
              await prisma.notification.update({
                where: { id: body.notificationId },
                data: { attachments: JSON.stringify(arr) }
              });
            }
          } catch(e){}
        }
      }

      // 3. Send notification back to caregiver (requester)
      const title = isApprove ? "Yêu cầu đặc cách đã được duyệt" : "Yêu cầu đặc cách đã bị từ chối";
      const content = isApprove
        ? `Trưởng phòng ${session.user.name} đã đồng ý phê duyệt đặc cách chuyển bước cho đại lý ${existingLead.fullName || "đại lý"}.`
        : `Trưởng phòng ${session.user.name} đã từ chối yêu cầu đặc cách chuyển bước cho đại lý ${existingLead.fullName || "đại lý"}.`;

      const notification = await prisma.notification.create({
        data: {
          title,
          content,
          type: isApprove ? "success" : "error",
          priority: "high",
          audienceType: "individual",
          audienceValue: requesterId,
          attachments: JSON.stringify([{
            type: "special_transition_response",
            name: isApprove ? `Đặc cách đã được phê duyệt: ${existingLead.fullName || "Đại lý"}` : `Đặc cách bị từ chối: ${existingLead.fullName || "Đại lý"}`,
            url: "/sales/partners",
            partnerId: id,
            status: isApprove ? "APPROVED" : "REJECTED"
          }]),
          createdById: session.user.id,
        }
      });

      await prisma.notificationRecipient.create({
        data: {
          notificationId: notification.id,
          userId: requesterId
        }
      });

      // Fetch the updated lead and map it back
      const freshLead = await (prisma as any).marketingLead.findUnique({
        where: { id },
        include: {
          campaign: true,
          careHistories: {
            orderBy: {
              executionDate: "desc"
            }
          },
          bonusFormulas: {
            orderBy: {
              sortOrder: "asc"
            }
          }
        }
      });
      return NextResponse.json(mapLeadToPartnerProcessItem(freshLead));
    }

    // Parse phone from contact
    let phone = existingLead.phone;
    if (contact) {
      const parts = contact.split(" - ");
      if (parts[1]) {
        phone = parts[1];
      }
    }

    // Calculate stars for this update
    const calculatedStars = calculateLeadStars({
      role: body.detailRole || currentFormValues.detailRole,
      deploymentPlan: body.detailDeploymentPlan || currentFormValues.detailDeploymentPlan,
      collabNeeds: body.detailCollabNeeds || currentFormValues.detailCollabNeeds || needs || existingLead.notes,
      otherRequirements: body.detailOtherRequirements || currentFormValues.detailOtherRequirements,
      painPoints: body.detailPainPoints || currentFormValues.detailPainPoints,
      attitude: body.detailAttitude || currentFormValues.detailAttitude,
    });

    // Merge formValues
    const updatedFormValues = {
      ...currentFormValues,
      area: area !== undefined ? area : currentFormValues.area,
      scale: scale !== undefined ? scale : currentFormValues.scale,
      needs: needs !== undefined ? needs : currentFormValues.needs,
      step: step !== undefined ? step : (currentFormValues.step || 1),
      stars: calculatedStars,
      contact: contact !== undefined ? contact : currentFormValues.contact,
      ...formValuesRest
    };

    const updatedLead = await (prisma as any).marketingLead.update({
      where: { id },
      data: {
        fullName: name !== undefined ? name : existingLead.fullName,
        email: contactEmail !== undefined ? (contactEmail || null) : existingLead.email,
        phone: phone || null,
        source: source !== undefined ? source : existingLead.source,
        notes: needs !== undefined ? (needs || null) : existingLead.notes,
        formValues: JSON.stringify(updatedFormValues),
        status: step ? `step_${step}` : existingLead.status
      }
    });

    // Sync to Customer & Contract tables if hdCode is provided (Contract Saved)
    if (body.hdCode) {
      try {
        let customer = await prisma.customer.findUnique({
          where: { id }
        });
        if (!customer) {
          customer = await prisma.customer.create({
            data: {
              id,
              name: name || existingLead.fullName || "Đại lý chưa đặt tên",
              dienThoai: phone || existingLead.phone,
              email: contactEmail || existingLead.email,
              nguon: source || existingLead.source,
              nhom: "dai-ly",
              formValues: JSON.stringify(updatedFormValues),
            }
          });
        } else {
          await prisma.customer.update({
            where: { id },
            data: {
              name: name || customer.name,
              dienThoai: phone || customer.dienThoai,
              email: contactEmail || customer.email,
              nguon: source || customer.nguon,
              nhom: "dai-ly",
              formValues: JSON.stringify(updatedFormValues),
            }
          });
        }

        let contractVal = 0;
        if (body.hdAnnualRevenue) {
          const cleanRevenue = String(body.hdAnnualRevenue).replace(/\./g, "").trim();
          const parsed = parseFloat(cleanRevenue);
          if (!isNaN(parsed)) {
            contractVal = parsed;
          }
        }

        const contractData = {
          code: body.hdCode,
          customerId: id,
          ngayKy: body.hdDate ? new Date(body.hdDate) : new Date(),
          giaTriHopDong: contractVal,
          trangThai: "active",
        };

        const existingContract = await prisma.contract.findFirst({
          where: { customerId: id }
        });

        if (existingContract) {
          await prisma.contract.update({
            where: { id: existingContract.id },
            data: contractData
          });
        } else {
          await prisma.contract.create({
            data: contractData
          });
        }
      } catch (e) {
        console.error("Lỗi đồng bộ dữ liệu hợp đồng sang bảng Customer/Contract:", e);
      }
    } else {
      // Sync form values to Customer if it already exists
      await syncCustomerFormValues(id, JSON.stringify(updatedFormValues));
    }

    // Upsert bonus formulas if bbBonuses is provided in the body
    if (body.bbBonuses !== undefined && Array.isArray(body.bbBonuses)) {
      await (prisma as any).partnerBonusFormula.deleteMany({
        where: { partnerId: id }
      });
      const formulasToCreate = body.bbBonuses.map((b: any, idx: number) => ({
        partnerId: id,
        title: b.title || "",
        description: b.desc || "",
        formula: b.formula || "",
        sortOrder: idx,
      }));
      if (formulasToCreate.length > 0) {
        await (prisma as any).partnerBonusFormula.createMany({
          data: formulasToCreate
        });
      }
    }

    if (body.detailExecutionDate) {
      const historyStars = calculateLeadStars({
        role: body.detailRole,
        deploymentPlan: body.detailDeploymentPlan,
        collabNeeds: body.detailCollabNeeds,
        otherRequirements: body.detailOtherRequirements,
        painPoints: body.detailPainPoints,
        attitude: body.detailAttitude,
      });

      // Defensive checking: if ID is temporary or record is not in database, do a create/upsert
      let existingRecord = null;
      if (body.careHistoryId && !body.careHistoryId.startsWith("0.")) {
        existingRecord = await (prisma as any).partnerCareHistory.findUnique({
          where: { id: body.careHistoryId }
        });
      }

      if (!existingRecord && body.detailExecutionDate) {
        const targetDate = new Date(body.detailExecutionDate);
        const margin = 10000; // 10 seconds
        const possibleDuplicates = await (prisma as any).partnerCareHistory.findMany({
          where: {
            partnerId: id,
            approachStep: body.detailApproachStep || "Tiếp cận",
            otherRequirements: body.detailOtherRequirements || "",
          }
        });
        existingRecord = possibleDuplicates.find((r: any) => {
          const rDate = new Date(r.executionDate).getTime();
          return Math.abs(rDate - targetDate.getTime()) < margin;
        }) || null;
        
        // If we found a duplicate database record, we use its ID instead of creating a new one
        if (existingRecord) {
          body.careHistoryId = existingRecord.id;
        }
      }

      if (existingRecord) {
        await (prisma as any).partnerCareHistory.update({
          where: { id: body.careHistoryId },
          data: {
            fullName: body.detailFullName || "",
            role: body.detailRole || "Ông chủ",
            phone: body.detailPhone || "",
            email: body.detailEmail || "",
            companyName: body.detailCompanyName || "",
            businessAddress: body.detailBusinessAddress || "",
            businessType: body.detailBusinessType || "",
            premisesScale: body.detailPremisesScale || "",
            collabNeeds: body.detailCollabNeeds || "",
            currentBrands: body.detailCurrentBrands || "",
            deploymentPlan: body.detailDeploymentPlan || "",
            expectedInvestment: body.expectedInvestment || body.detailExpectedInvestment || "",
            investmentTimeframe: body.detailInvestmentTimeframe || "",
            approachStep: body.detailApproachStep || "Tiếp cận",
            attitude: body.detailAttitude || "Bình thường",
            interests: body.detailInterests || "",
            painPoints: body.detailPainPoints || "",
            premisesCondition: body.detailPremisesCondition || "",
            otherRequirements: body.detailOtherRequirements || "",
            stars: historyStars,
            executionDate: new Date(body.detailExecutionDate),
            executor: body.detailExecutor || "",
            cabinetArea: body.cabinetArea || body.detailCabinetArea || "",
            cabinetUnitPrice: body.cabinetUnitPrice || body.detailCabinetUnitPrice || "",
            cabinetBrandSupportRate: body.cabinetBrandSupportRate || body.detailCabinetBrandSupportRate || "",
            cabinetOtherCosts: body.cabinetOtherCosts || body.detailCabinetOtherCosts || "",
            cabinetNotes: body.cabinetNotes || body.detailCabinetNotes || "",
          }
        });
      } else {
        await (prisma as any).partnerCareHistory.create({
          data: {
            partnerId: id,
            fullName: body.detailFullName || "",
            role: body.detailRole || "Ông chủ",
            phone: body.detailPhone || "",
            email: body.detailEmail || "",
            companyName: body.detailCompanyName || "",
            businessAddress: body.detailBusinessAddress || "",
            businessType: body.detailBusinessType || "",
            premisesScale: body.detailPremisesScale || "",
            collabNeeds: body.detailCollabNeeds || "",
            currentBrands: body.detailCurrentBrands || "",
            deploymentPlan: body.detailDeploymentPlan || "",
            expectedInvestment: body.expectedInvestment || body.detailExpectedInvestment || "",
            investmentTimeframe: body.detailInvestmentTimeframe || "",
            approachStep: body.detailApproachStep || "Tiếp cận",
            attitude: body.detailAttitude || "Bình thường",
            interests: body.detailInterests || "",
            painPoints: body.detailPainPoints || "",
            premisesCondition: body.detailPremisesCondition || "",
            otherRequirements: body.detailOtherRequirements || "",
            stars: historyStars,
            executionDate: new Date(body.detailExecutionDate),
            executor: body.detailExecutor || "",
            cabinetArea: body.cabinetArea || body.detailCabinetArea || "",
            cabinetUnitPrice: body.cabinetUnitPrice || body.detailCabinetUnitPrice || "",
            cabinetBrandSupportRate: body.cabinetBrandSupportRate || body.detailCabinetBrandSupportRate || "",
            cabinetOtherCosts: body.cabinetOtherCosts || body.detailCabinetOtherCosts || "",
            cabinetNotes: body.cabinetNotes || body.detailCabinetNotes || "",
          }
        });
      }
    }

    // Fetch the updated lead with histories and campaign to return full mapped object
    const finalLead = await (prisma as any).marketingLead.findUnique({
      where: { id },
      include: {
        campaign: true,
        careHistories: {
          orderBy: {
            executionDate: "desc"
          }
        },
        bonusFormulas: {
          orderBy: {
            sortOrder: "asc"
          }
        }
      }
    });

    if (!finalLead) {
      return NextResponse.json({ error: "Lead not found after update" }, { status: 404 });
    }

    // Send notification to Sales Managers when caregiver requests special exception
    if (body.detailSpecialRequestPending === true) {
      // Find position category codes that contain "Trưởng phòng" or "Trưởng bộ phận"
      const positionCats = await prisma.category.findMany({
        where: {
          type: "position",
          OR: [
            { name: { contains: "Trưởng phòng" } },
            { name: { contains: "Trưởng bộ phận" } }
          ]
        },
        select: { code: true }
      });
      const managerPositionCodes = positionCats.map(c => c.code);

      const salesManagers = await prisma.user.findMany({
        where: {
          OR: [
            { role: "SUPERADMIN" },
            { role: "admin" },
            { email: "tp.sales@leetech.vn" },
            { email: { startsWith: "tp.sales@" } },
            {
              employee: {
                departmentCode: "sales",
                position: { in: managerPositionCodes }
              }
            }
          ]
        },
        select: { id: true }
      });
      const managerIds = salesManagers.map(m => m.id).filter(id => id !== session.user.id);

      if (managerIds.length > 0) {
        const unmetReasons: string[] = [];
        const role = body.detailRole || currentFormValues.detailRole || "";
        const deploymentPlan = body.detailDeploymentPlan || currentFormValues.detailDeploymentPlan || "";
        const collabNeeds = body.detailCollabNeeds || currentFormValues.detailCollabNeeds || needs || existingLead.notes || "";
        const otherRequirements = body.detailOtherRequirements || currentFormValues.detailOtherRequirements || "";
        const painPoints = body.detailPainPoints || currentFormValues.detailPainPoints || "";

        const hasDecisionPower = role === "Ông chủ" || role === "Bà chủ";
        const isShortTimeline = /30|ngay|sớm|tức|1\s*tháng|immediate/i.test(deploymentPlan);
        const hasClearNeeds = collabNeeds.trim().length > 10;
        const hasNegativeSignals = /hỏi\s*giá|không\s*đúng\s*mô\s*hình|không\s*quan\s*tâm|từ\s*chối|không\s*hợp\s*tác/i.test(
          collabNeeds + " " + otherRequirements + " " + painPoints
        );

        if (calculatedStars < 4) {
          unmetReasons.push(`Phân loại khách hàng: ${calculatedStars} sao (Yêu cầu từ 4-5 sao).`);
        }
        if (!hasDecisionPower && role !== "Quản lý") {
          unmetReasons.push(`Quyền quyết định: ${role || "Chưa xác định"} (Yêu cầu vai trò là Ông chủ, Bà chủ hoặc Quản lý).`);
        }
        if (!isShortTimeline) {
          unmetReasons.push(`Kế hoạch triển khai: ${deploymentPlan || "Chưa xác định"} (Yêu cầu trong vòng 30 ngày).`);
        }
        if (!hasClearNeeds) {
          unmetReasons.push(`Nhu cầu hợp tác: ${collabNeeds || "Chưa xác định"} (Yêu cầu chi tiết hơn 10 ký tự).`);
        }
        if (hasNegativeSignals) {
          unmetReasons.push(`Dấu hiệu tiêu cực: Phát hiện tín hiệu tiêu cực (chỉ hỏi giá, không đúng mô hình, từ chối, không quan tâm...).`);
        }

        const title = "Yêu cầu đặc cách chuyển bước đại lý";
        let content = `Nhân viên ${session.user.name} yêu cầu đặc cách chuyển bước cho đại lý ${existingLead.fullName || "đại lý"}.`;

        if (exceptionReason && exceptionReason.trim()) {
          content += `\n\nLý do xin đặc cách: ${exceptionReason.trim()}`;
        }

        content += `\n\nDanh sách các thông tin không đạt yêu cầu:\n`;
        if (unmetReasons.length > 0) {
          unmetReasons.forEach(reason => {
            content += `◦ ${reason}\n`;
          });
        } else {
          content += `◦ Không có thông tin cụ thể không đạt yêu cầu.\n`;
        }

        const notification = await prisma.notification.create({
          data: {
            title,
            content,
            type: "warning",
            priority: "high",
            audienceType: "group",
            audienceValue: JSON.stringify(managerIds),
            attachments: JSON.stringify([{
              type: "special_transition_request",
              name: `Yêu cầu đặc cách đại lý: ${existingLead.fullName || "Chưa cập nhật"}`,
              url: "/sales/partners",
              partnerId: id,
              partnerName: existingLead.fullName || "",
              requesterId: session.user.id,
              requesterName: session.user.name || "Nhân viên",
              status: "PENDING"
            }]),
            createdById: session.user.id,
          }
        });

        // Create recipients
        await Promise.all(
          managerIds.map(uid =>
            prisma.notificationRecipient.create({
              data: { notificationId: notification.id, userId: uid }
            })
          )
        );

        // Create PartnerCareHistory for exception request
        await (prisma as any).partnerCareHistory.create({
          data: {
            partnerId: id,
            fullName: updatedFormValues.detailFullName || existingLead.fullName || "",
            role: updatedFormValues.detailRole || "Ông chủ",
            phone: updatedFormValues.detailPhone || existingLead.phone || "",
            email: updatedFormValues.detailEmail || existingLead.email || "",
            companyName: updatedFormValues.detailCompanyName || "",
            businessAddress: updatedFormValues.detailBusinessAddress || "",
            businessType: updatedFormValues.detailBusinessType || "",
            premisesScale: updatedFormValues.detailPremisesScale || "",
            collabNeeds: updatedFormValues.detailCollabNeeds || existingLead.notes || "",
            currentBrands: updatedFormValues.detailCurrentBrands || "",
            deploymentPlan: updatedFormValues.detailDeploymentPlan || "",
            approachStep: "[Yêu cầu đặc cách]",
            attitude: updatedFormValues.detailAttitude || "Bình thường",
            otherRequirements: exceptionReason || "",
            stars: calculatedStars,
            executionDate: new Date(),
            executor: session.user.name || "Nhân viên",
          }
        });
      }
    }

    let formValues: any = {};
    try {
      formValues = JSON.parse(finalLead.formValues || "{}");
    } catch (e) {}

    let matchingQuotation = await (prisma as any).quotation.findFirst({
      where: {
        OR: [
          { customerId: finalLead.id },
          { code: formValues.quoteCode || "" }
        ]
      },
      include: {
        negotiations: {
          orderBy: { ngay: "desc" }
        }
      }
    });

    // No automatic quotation creation here; quotation must be explicitly created by the user clicking "Tạo báo giá"
 
    const mappedLead = mapLeadToPartnerProcessItem(finalLead, matchingQuotation);
    return NextResponse.json(mappedLead);
  } catch (error: any) {
    console.error("[Sales Partners PATCH Error]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const idsParam = searchParams.get("ids");

    if (idsParam) {
      const ids = idsParam.split(",");
      await (prisma as any).marketingLead.deleteMany({
        where: {
          id: { in: ids }
        }
      });
      return NextResponse.json({ success: true });
    }

    if (!id) {
      return NextResponse.json({ error: "Missing id parameter" }, { status: 400 });
    }

    await (prisma as any).marketingLead.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[Sales Partners DELETE Error]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
