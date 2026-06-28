import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const [clients, modules, users] = await Promise.all([
    prisma.client.count({ where: { status: "active" } }),
    prisma.module.count(),
    prisma.user.count(),
  ]);
  return NextResponse.json({ clients, modules, users });
}
