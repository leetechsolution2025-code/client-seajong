import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const questions = await (prisma as any).trainingQuestion.findMany({
      where: { courseId: params.id },
      orderBy: { createdAt: "asc" }
    });
    return NextResponse.json(questions);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch questions" }, { status: 500 });
  }
}

export async function POST(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const body = await req.json();
    const { id: courseId } = params;

    if (Array.isArray(body)) {
      // Replace all questions for this course
      await prisma.$transaction([
        (prisma as any).trainingQuestion.deleteMany({ where: { courseId } }),
        (prisma as any).trainingQuestion.createMany({
          data: body.map(q => ({
            courseId,
            question: q.question,
            options: JSON.stringify(q.options),
            correctAnswer: q.correctAnswer
          }))
        })
      ]);
    } else {
      // Add single
      await (prisma as any).trainingQuestion.create({
        data: {
          courseId,
          question: body.question,
          options: JSON.stringify(body.options),
          correctAnswer: body.correctAnswer
        }
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Manage questions error:", error);
    return NextResponse.json({ error: "Failed to manage questions" }, { status: 500 });
  }
}
