import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const departmentId = searchParams.get("departmentId");

    // Fetch all employees and their active handovers
    const employees = await (prisma as any).employee.findMany({
      where: {
        status: "active",
        departmentCode: departmentId || undefined
      },
      include: {
        hrAssetHandovers: {
          include: {
            asset: true,
            supplyItem: true
          },
          orderBy: {
            handoverDate: 'desc'
          }
        }
      },
      orderBy: {
        fullName: 'asc'
      }
    });

    // Map to the format expected by the frontend
    const result = employees.map((emp: any) => ({
      employeeId: emp.id,
      employeeName: emp.fullName,
      employeeCode: emp.code,
      departmentName: emp.departmentName,
      assets: (emp.hrAssetHandovers || []).map((h: any) => ({
        handoverId: h.id,
        assetId: h.assetId || h.supplyItemId,
        assetName: h.asset?.tenTaiSan || h.supplyItem?.name || "N/A",
        assetCode: h.asset?.code || h.supplyItem?.code,
        handoverDate: h.handoverDate,
        returnDate: h.returnDate,
        condition: h.condition,
        status: h.status
      }))
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error("GET handovers error:", error);
    return NextResponse.json({ error: "Failed to fetch handovers" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { employeeId, assetId, condition, note } = body;

    if (!employeeId || !assetId) {
      return NextResponse.json({ error: "Employee and Item are required" }, { status: 400 });
    }

    // Check if assetId is a SupplyItem or a real Asset
    const supplyItem = await (prisma as any).hrSupplyItem.findUnique({
      where: { id: assetId }
    });

    let handover;
    if (supplyItem) {
      handover = await (prisma as any).hrAssetHandover.create({
        data: {
          employeeId,
          supplyItemId: assetId,
          condition,
          note,
          status: "USING",
          handoverDate: body.handoverDate ? new Date(body.handoverDate) : new Date()
        }
      });

      // Decrease stock
      await (prisma as any).hrSupplyItem.update({
        where: { id: assetId },
        data: { currentStock: { decrement: 1 } }
      });
    } else {
      handover = await (prisma as any).hrAssetHandover.create({
        data: {
          employeeId,
          assetId,
          condition,
          note,
          status: "USING",
          handoverDate: body.handoverDate ? new Date(body.handoverDate) : new Date()
        }
      });

      await (prisma as any).asset.update({
        where: { id: assetId },
        data: { trangThai: "dang-su-dung" }
      });
    }

    return NextResponse.json(handover);
  } catch (error) {
    console.error("POST handover error:", error);
    return NextResponse.json({ error: "Failed to create handover" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { handoverId } = body;

    if (!handoverId) {
      return NextResponse.json({ error: "Handover ID is required" }, { status: 400 });
    }

    const handover = await (prisma as any).hrAssetHandover.findUnique({
      where: { id: handoverId },
      include: { asset: true, supplyItem: true }
    });

    if (!handover) {
      return NextResponse.json({ error: "Handover record not found" }, { status: 404 });
    }

    // Update status to RETURNED
    const updated = await (prisma as any).hrAssetHandover.update({
      where: { id: handoverId },
      data: {
        status: "RETURNED",
        returnDate: body.returnDate ? new Date(body.returnDate) : new Date()
      }
    });

    // If it's a SupplyItem, increment stock
    if (handover.supplyItemId) {
      await (prisma as any).hrSupplyItem.update({
        where: { id: handover.supplyItemId },
        data: { currentStock: { increment: 1 } }
      });
    } else if (handover.assetId) {
      // If it's a regular Asset, set back to available
      await (prisma as any).asset.update({
        where: { id: handover.assetId },
        data: { trangThai: "san-sang" }
      });
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("PUT handover error:", error);
    return NextResponse.json({ error: "Failed to recover item" }, { status: 500 });
  }
}
