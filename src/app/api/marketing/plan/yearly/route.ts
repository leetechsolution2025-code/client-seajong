import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const { id, action, status, year } = data;

    // 1. Handle "Adjust" action (create new draft from current)
    if (action === "adjust") {
      if (!year) return NextResponse.json({ success: false, error: "Thiếu năm kế hoạch" }, { status: 400 });

      const session = await getServerSession(authOptions);
      const currentUserId = session?.user?.id;

      // Find current active plan to clone from
      const current = await prisma.marketingYearlyPlan.findFirst({
        where: { year, isCurrent: true },
        include: {
          generalPlan: true,
          goals: true,
          tasks: true,
          budgetPlan: {
            include: {
              items: { include: { monthlyDetails: true } },
              monthlyTotals: true
            }
          },
          executionMonths: {
            include: {
              groups: { include: { tasks: { include: { children: true } } } }
            }
          }
        }
      });

      if (!current) {
        return NextResponse.json({ success: false, error: "Không tìm thấy kế hoạch đang hiệu lực để điều chỉnh" }, { status: 404 });
      }

      // Fetch strategy data separately
      const currentOutline = await prisma.outlineMarketingPlan.findUnique({
        where: { planId: current.id }
      });

      const newPlan = await prisma.$transaction(async (tx) => {
        // A. Create new Plan record
        const draft = await tx.marketingYearlyPlan.create({
          data: {
            year,
            status: "ban-nhap",
            versionStatus: "ttvb-20260423-9046-cxbz", // Bản nháp
            isCurrent: false,
            code: `MKT-${year}-${new Date().getTime()}`,
            authorId: currentUserId || current.authorId,
            revisionCount: (current.revisionCount || 0) + 1
          }
        });

        // B. Clone General Plan
        if (current.generalPlan) {
          await tx.marketingGeneralPlan.create({
            data: {
              planId: draft.id,
              primaryGoal: current.generalPlan.primaryGoal,
              totalBudget: current.generalPlan.totalBudget,
              platforms: current.generalPlan.platforms,
              targetAudience: current.generalPlan.targetAudience
            }
          });
        }

        // C. Clone Goals
        if (current.goals.length > 0) {
          await tx.marketingYearlyGoal.createMany({
            data: current.goals.map(g => ({
              planId: draft.id,
              label: g.label,
              description: g.description,
              icon: g.icon,
              color: g.color,
              sortOrder: g.sortOrder
            }))
          });
        }

        // D. Clone Yearly Tasks (Tree)
        const taskMap = new Map<string, string>(); // oldId -> newId
        
        // D1. Create tasks (flat first)
        const sortedTasks = [...current.tasks].sort((a, b) => {
          // Simplistic sort to handle hierarchy: parents should be created before children
          // In a real tree we'd do it recursively, but let's try a robust approach
          return (a.parentId ? 1 : 0) - (b.parentId ? 0 : 1);
        });

        // Since createMany doesn't return IDs easily, we'll create one by one or in batches
        for (const t of sortedTasks) {
          const newTask = await tx.marketingYearlyTask.create({
            data: {
              planId: draft.id,
              name: t.name,
              description: t.description,
              department: t.department,
              assigneeId: t.assigneeId,
              color: t.color,
              sortOrder: t.sortOrder,
              status: "pending", // Reset status
              parentId: t.parentId ? taskMap.get(t.parentId) : null
            }
          });
          taskMap.set(t.id, newTask.id);
        }

        // E. Clone Strategy Data
        if (currentOutline) {
          await tx.outlineMarketingPlan.create({
            data: {
              year,
              planId: draft.id,
              planData: currentOutline.planData
            }
          });
        }

        // F. Clone Budget Plan
        if (current.budgetPlan) {
          const newBudgetPlan = await tx.marketingBudgetPlan.create({
            data: {
              planId: draft.id,
              revenueGoal: current.budgetPlan.revenueGoal,
              mktRate: current.budgetPlan.mktRate,
              mktValue: current.budgetPlan.mktValue,
              agencyRate: current.budgetPlan.agencyRate,
              agencyValue: current.budgetPlan.agencyValue,
              brandingRate: current.budgetPlan.brandingRate,
              brandingValue: current.budgetPlan.brandingValue
            }
          });

          // F1. Clone Budget Items & Details
          for (const item of current.budgetPlan.items) {
            const newItem = await tx.marketingBudgetItem.create({
              data: {
                budgetPlanId: newBudgetPlan.id,
                type: item.type,
                name: item.name,
                rate: item.rate,
                value: item.value,
                note: item.note,
                sortOrder: item.sortOrder
              }
            });

            if (item.monthlyDetails.length > 0) {
              await tx.marketingMonthlyBudgetItem.createMany({
                data: item.monthlyDetails.map(d => ({
                  itemId: newItem.id,
                  month: d.month,
                  rate: d.rate,
                  value: d.value,
                  note: d.note
                }))
              });
            }
          }

          // F2. Clone Monthly Totals
          if (current.budgetPlan.monthlyTotals.length > 0) {
            await tx.marketingMonthlyBudgetTotal.createMany({
              data: current.budgetPlan.monthlyTotals.map(t => ({
                budgetPlanId: newBudgetPlan.id,
                month: t.month,
                totalValue: t.totalValue
              }))
            });
          }
        }

        // G. Clone Execution Months (Roadmap)
        for (const em of current.executionMonths) {
          const newTaskId = taskMap.get(em.taskId);
          if (!newTaskId) continue;

          const newEm = await tx.marketingExecutionMonth.create({
            data: {
              planId: draft.id,
              taskId: newTaskId,
              month: em.month
            }
          });

          for (const group of em.groups) {
            const newGroup = await tx.marketingExecutionGroup.create({
              data: {
                monthId: newEm.id,
                name: group.name,
                color: group.color,
                orderIndex: group.orderIndex,
                strategyPillarId: group.strategyPillarId
              }
            });

            // Clone Detail Tree
            const detailMap = new Map<string, string>();
            
            // Helper function to clone details recursively
            const cloneDetails = async (details: any[], parentId: string | null = null) => {
              for (const d of details) {
                const newDetail = await tx.marketingExecutionDetail.create({
                  data: {
                    groupId: newGroup.id,
                    parentId: parentId,
                    name: d.name,
                    isDetail: d.isDetail,
                    week: d.week,
                    orderIndex: d.orderIndex,
                    visual: d.visual,
                    quantity: d.quantity,
                    channel: d.channel,
                    ads: d.ads,
                    targetAudience: d.targetAudience,
                    recordTime: d.recordTime,
                    location: d.location,
                    detailContent: d.detailContent,
                    pic: d.pic,
                    status: "pending", // Reset status
                    note: d.note
                  }
                });
                
                // Fetch and clone children (since our current join might be flat, we need the full tree)
                const children = await tx.marketingExecutionDetail.findMany({ where: { parentId: d.id } });
                if (children.length > 0) {
                  await cloneDetails(children, newDetail.id);
                }
              }
            };

            // Filter only top-level details for this group
            const topLevelDetails = group.tasks.filter((t: any) => !t.parentId);
            await cloneDetails(topLevelDetails);
          }
        }

        return draft;
      });

      return NextResponse.json({ success: true, plan: newPlan });
    }

    if (!id) {
      return NextResponse.json({ success: false, error: "Thiếu ID kế hoạch" }, { status: 400 });
    }

    // 2. Delegate content update to lib
    const { processPlanSubmission } = await import("@/lib/marketing-plan");
    await processPlanSubmission(id, data);

    // 3. Handle Status / Version updates
    const updateData: any = {};
    if (status === "ban-hanh") {
      updateData.status = "ban-hanh";
      updateData.versionStatus = "ttvb-20260423-5393-chxz"; // Đang hiệu lực
      updateData.isCurrent = true;

      // Deactivate other plans for the same year
      const plan = await prisma.marketingYearlyPlan.findUnique({ where: { id } });
      if (plan) {
        await prisma.marketingYearlyPlan.updateMany({
          where: { year: plan.year, id: { not: id } },
          data: { 
            isCurrent: false,
            versionStatus: "ttvb-20260423-3682-yfmr" // Đã thay thế
          }
        });
      }

      // ── Gửi thông báo cho toàn bộ phòng Marketing ──
      try {
        const session = await getServerSession(authOptions);
        const creatorId = session?.user?.id;

        if (creatorId) {
          const notification = await prisma.notification.create({
            data: {
              title: "Kế hoạch Marketing Tổng thể đã được ban hành",
              content: "Đã ban hành kế hoạch marketing tổng thể, đề nghị mọi người triển khai lập kế hoạch chi tiết từng tháng đối với lĩnh vực mình phụ trách. Trình trưởng phòng duyệt.",
              type: "success",
              priority: "high",
              audienceType: "department",
              audienceValue: "marketing",
              createdById: creatorId,
            }
          });

          // Tìm user thuộc phòng marketing
          const marketingEmployees = await prisma.employee.findMany({
            where: { departmentCode: "marketing" },
            select: { userId: true }
          });

          const userIds = marketingEmployees.map(e => e.userId).filter(Boolean) as string[];
          if (userIds.length > 0) {
            await Promise.allSettled(
              userIds.map(uid => 
                prisma.notificationRecipient.upsert({
                  where: { notificationId_userId: { notificationId: notification.id, userId: uid } },
                  update: {},
                  create: { notificationId: notification.id, userId: uid }
                })
              )
            );
          }
        }
      } catch (notifError) {
        console.error("Failed to create publish notification:", notifError);
      }
    } else if (status) {
      updateData.status = status;
    }

    if (Object.keys(updateData).length > 0) {
      await prisma.marketingYearlyPlan.update({
        where: { id },
        data: updateData
      });
    }

    // Fetch updated plan to return
    const updated = await prisma.marketingYearlyPlan.findUnique({
      where: { id },
      include: {
        generalPlan: true,
        goals: true,
        tasks: true
      }
    });

    return NextResponse.json({ success: true, plan: updated });
  } catch (error: any) {
    console.error("POST error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const year = searchParams.get("year") ? Number(searchParams.get("year")) : null;
    const allVersions = searchParams.get("allVersions") === "true";

    const where: any = {};
    if (year) where.year = year;
    if (!allVersions) where.isCurrent = true;

    const rawPlans = await prisma.marketingYearlyPlan.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        author: { select: { name: true } },
        generalPlan: true,
        goals: true,
        budgetPlan: {
          include: {
            items: {
              include: { monthlyDetails: true }
            },
            monthlyTotals: true
          }
        },
        tasks: true,
        executionMonths: {
          include: {
            groups: {
              include: { tasks: true }
            }
          }
        }
      }
    });

    const planIds = rawPlans.map(p => p.id);
    const outlines = await prisma.outlineMarketingPlan.findMany({
      where: { planId: { in: planIds } }
    });

    const assigneeIds = new Set<string>();
    rawPlans.forEach((p: any) => p.tasks.forEach((t: any) => { if (t.assigneeId) assigneeIds.add(t.assigneeId); }));
    const employees = await prisma.employee.findMany({
      where: { id: { in: Array.from(assigneeIds) } },
      select: { id: true, fullName: true }
    });
    const employeeMap = new Map(employees.map(e => [e.id, e.fullName]));

    const plans = rawPlans.map((p: any) => {
      const outline = outlines.find((o: any) => o.planId === p.id);
      return {
        ...p,
        strategyData: outline ? JSON.parse(outline.planData) : null
      };
    });

    return NextResponse.json({ success: true, plans });
  } catch (error: any) {
    console.error("GET error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing ID" }, { status: 400 });

    // Cascade delete manually since SQLite might not have it configured
    await prisma.marketingYearlyGoal.deleteMany({ where: { planId: id } });
    await prisma.marketingYearlyTask.deleteMany({ where: { planId: id } });
    await prisma.marketingGeneralPlan.deleteMany({ where: { planId: id } });
    await prisma.outlineMarketingPlan.deleteMany({ where: { planId: id } });
    
    await prisma.marketingYearlyPlan.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
