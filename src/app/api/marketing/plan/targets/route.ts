import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const year = searchParams.get("year") || new Date().getFullYear().toString();

    // Mock data to prevent frontend crash on missing endpoint
    const mockTargets = {
      totalBudget: 500000000,
      totalRevenue: 2000000000,
      monthlyBudget: Array.from({ length: 12 }).map(() => ({ value: 41666666 })),
      monthlyRevenue: Array.from({ length: 12 }).map(() => ({ total: 166666666 })),
    };

    return NextResponse.json(mockTargets);
  } catch (error: any) {
    console.error("API /marketing/plan/targets error:", error);
    return NextResponse.json(
      { error: "Internal Server Error", message: error.message },
      { status: 500 }
    );
  }
}
