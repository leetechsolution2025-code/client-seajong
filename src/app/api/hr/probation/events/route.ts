import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { probationId, title, description, type, date } = body;

    if (!probationId || !title) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // @ts-ignore
    const newEvent = await prisma.employeeProbationEvent.create({
      data: {
        probationId,
        title,
        description,
        type: type || "EVENT",
        date: date ? new Date(date) : new Date(),
      },
    });

    return NextResponse.json(newEvent);
  } catch (error) {
    console.error("Create probation event error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
