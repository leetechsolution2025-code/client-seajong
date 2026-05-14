import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request, props: { params: Promise<any> }) {
  const params = await props.params;
  try {
    // Next.js 15+ handles params as a Promise. For safety, we check and await if needed.
    const resolvedParams = params instanceof Promise ? await params : params;
    const id = resolvedParams?.id;
    
    console.log("GET Warehouse ID:", id);
    
    if (!id) {
      return NextResponse.json({ error: "Missing ID" }, { status: 400 });
    }

    const warehouse = await prisma.warehouse.findUnique({
      where: { id },
    });
    
    if (!warehouse) {
      return NextResponse.json({ error: "Warehouse not found" }, { status: 404 });
    }

    return NextResponse.json(warehouse);
  } catch (error: any) {
    console.error("Prisma GET Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: Request, props: { params: Promise<any> }) {
  const params = await props.params;
  try {
    const resolvedParams = params instanceof Promise ? await params : params;
    const id = resolvedParams?.id;
    const body = await req.json();
    
    console.log("PATCH Warehouse ID:", id);
    console.log("PATCH Body:", body);
    
    if (!id) {
      return NextResponse.json({ error: "Missing ID" }, { status: 400 });
    }

    const updated = await prisma.warehouse.update({
      where: { id },
      data: body,
    });
    
    return NextResponse.json(updated);
  } catch (error: any) {
    console.error("Prisma PATCH Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
