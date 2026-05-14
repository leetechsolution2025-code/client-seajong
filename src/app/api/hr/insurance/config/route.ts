import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    let config = await (prisma as any).insuranceConfig.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: "desc" },
    });

    // Default config if none exists
    if (!config) {
      config = await (prisma as any).insuranceConfig.create({
        data: {
          employerBhxh: 17.5,
          employerBhyt: 3,
          employerBhtn: 1,
          employeeBhxh: 8,
          employeeBhyt: 1.5,
          employeeBhtn: 1,
        },
      });
    }

    return NextResponse.json(JSON.parse(JSON.stringify(config)));
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch config" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    
    // Deactivate current config
    await (prisma as any).insuranceConfig.updateMany({
      where: { isActive: true },
      data: { isActive: false },
    });

    // Create new config
    const newConfig = await (prisma as any).insuranceConfig.create({
      data: {
        employerBhxh: data.employerBhxh,
        employerBhyt: data.employerBhyt,
        employerBhtn: data.employerBhtn,
        employeeBhxh: data.employeeBhxh,
        employeeBhyt: data.employeeBhyt,
        employeeBhtn: data.employeeBhtn,
        
        baseReferenceWage: data.baseReferenceWage,
        sickLeaveDays: data.sickLeaveDays,
        sickLeaveHeavyDays: data.sickLeaveHeavyDays,
        sickLeaveRate: data.sickLeaveRate,
        
        maternityDays: data.maternityDays,
        paternityDays: data.paternityDays,
        maternityRate: data.maternityRate,
        maternityAllowance: data.maternityAllowance,
        
        recoveryDays: data.recoveryDays,
        recoveryRate: data.recoveryRate,
        
        funeralAllowance: data.funeralAllowance,
      },
    });

    return NextResponse.json(JSON.parse(JSON.stringify(newConfig)));
  } catch (error: any) {
    console.error("Config save error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
