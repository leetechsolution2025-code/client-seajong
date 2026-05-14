import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma'; // Assuming this is the standard prisma client path
// If there's an issue with the prisma path, we will adjust it. Many next.js projects use @/lib/prisma

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { 
      candidateId, 
      interviewerId, 
      interviewTime, 
      interviewMode, 
      interviewLoc, 
      interviewerRole, 
      interviewerDept, 
      scoreKnowledge, 
      scoreExperience, 
      scoreComm, 
      scoreRespons, 
      scoreTeamwork, 
      totalScore, 
      decision, 
      salarySuggest, 
      probationSuggest, 
      interviewerNote,
      audioRecordUrl
    } = body;

    // Validate required fields
    if (!candidateId || !interviewerId || !interviewerRole || !interviewerDept) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Resolve a valid user ID if "user-system" is provided
    let finalInterviewerId = interviewerId;
    if (finalInterviewerId === 'user-system') {
      const firstUser = await prisma.user.findFirst();
      if (firstUser) {
        finalInterviewerId = firstUser.id;
      }
    }

    // @ts-ignore - Bỏ qua lỗi cache TS của IDE do Prisma Client chưa kịp reload
    const scorecard = await prisma.interviewScorecard.create({
      data: {
        candidateId,
        interviewerId: finalInterviewerId,
        interviewTime: new Date(interviewTime),
        interviewMode,
        interviewLoc: interviewLoc || '',
        interviewerRole,
        interviewerDept,
        scoreKnowledge: Number(scoreKnowledge),
        scoreExperience: Number(scoreExperience),
        scoreComm: Number(scoreComm),
        scoreRespons: Number(scoreRespons),
        scoreTeamwork: Number(scoreTeamwork),
        totalScore: Number(totalScore),
        decision,
        salarySuggest: salarySuggest ? Number(salarySuggest) : null,
        probationSuggest: probationSuggest || null,
        interviewerNote: interviewerNote || '',
        audioRecordUrl: audioRecordUrl || null
      }
    });

    // --- Tự động cập nhật Task công việc ---
    try {
      // 1. Lấy thông tin ứng viên
      const candidate = await (prisma as any).candidate.findUnique({
        where: { id: candidateId },
        select: { name: true }
      });

      if (candidate && finalInterviewerId) {
        // Tìm task liên quan dựa trên tiêu đề và người được giao
        // Tiêu đề Task chuẩn: "Phỏng vấn ứng viên: [Tên]"
        // Cập nhật TẤT CẢ các task liên quan (tránh việc có nhiều task trùng tên)
        const updatedTasks = await (prisma as any).task.updateMany({
          where: {
            assigneeId: finalInterviewerId, // interviewerId chính là userId
            title: { contains: candidate.name },
            status: { not: "done" }
          },
          data: { 
            status: "done",
            completedAt: new Date()
          }
        });
        
        if (updatedTasks.count > 0) {
          console.log(`Auto-completed ${updatedTasks.count} tasks for candidate ${candidate.name} and user ${finalInterviewerId}`);
        }
      }
    } catch (taskErr) {
      console.error("Auto update task error:", taskErr);
      // Không ném lỗi ra ngoài để tránh làm hỏng việc lưu Scorecard
    }

    return NextResponse.json({ success: true, data: scorecard }, { status: 201 });
  } catch (error: any) {
    console.error('Error saving interview scorecard:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}
