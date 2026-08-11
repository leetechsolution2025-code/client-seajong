import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const month = parseInt(searchParams.get("month") || String(new Date().getMonth() + 1));
  const year = parseInt(searchParams.get("year") || String(new Date().getFullYear()));
  const department = searchParams.get("department") || "all";
  const search = searchParams.get("search") || "";

  try {
    // Fetch config to get rates
    const config = await (prisma as any).insuranceConfig.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: "desc" },
    });

    const employerRate = config
      ? config.employerBhxh + config.employerBhyt + config.employerBhtn
      : 21.5;
    const employeeRate = config
      ? config.employeeBhxh + config.employeeBhyt + config.employeeBhtn
      : 10.5;

    // Pull enrolled employees directly via raw SQL to bypass stale Prisma cache
    let query = `
      SELECT * FROM "Employee"
      WHERE (isInsuranceEnrolled = 1 OR (socialInsuranceNumber IS NOT NULL AND socialInsuranceNumber != ''))
        AND status = 'active'
    `;
    const queryParams: any[] = [];

    if (search) {
      query += ` AND (fullName LIKE ? OR code LIKE ?)`;
      queryParams.push(`%${search}%`, `%${search}%`);
    }

    if (department && department !== "all") {
      query += ` AND departmentCode = ?`;
      queryParams.push(department);
    }

    query += ` ORDER BY fullName ASC`;

    const employees = await (prisma as any).$queryRawUnsafe(query, ...queryParams);

    // For each employee, upsert an InsuranceHistory record for the given month/year
    const results = await Promise.all(
      employees.map(async (emp: any) => {
        const salary = emp.insuranceSalary || 0;
        const employerAmount = Math.round((salary * employerRate) / 100);
        const employeeAmount = Math.round((salary * employeeRate) / 100);
        const totalAmount = employerAmount + employeeAmount;

        // Upsert so re-fetching is idempotent
        const history = await (prisma as any).insuranceHistory.upsert({
          where: {
            employeeId_month_year: {
              employeeId: emp.id,
              month,
              year,
            },
          },
          create: {
            employeeId: emp.id,
            month,
            year,
            insuranceSalary: salary,
            employerAmount,
            employeeAmount,
            totalAmount,
            status: "active",
          },
          update: {
            insuranceSalary: salary,
            employerAmount,
            employeeAmount,
            totalAmount,
          },
          include: { employee: true },
        });

        return history;
      })
    );

    return NextResponse.json(JSON.parse(JSON.stringify(results)));
  } catch (error: any) {
    console.error("Fetch insurance history error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
