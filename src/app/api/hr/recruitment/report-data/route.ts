import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    // Lấy tất cả ứng viên đã có ít nhất 1 phiếu đánh giá
    const candidates = await prisma.candidate.findMany({
      where: {
        scorecards: { some: {} },
      },
      include: {
        // @ts-ignore
        scorecards: {
          include: {
            interviewer: {
              select: { id: true, name: true, email: true },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        request: {
          select: { position: true, department: true, quantity: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    // Tổng hợp thống kê cho từng ứng viên
    const data = candidates.map((c: any) => {
      const scorecards = c.scorecards || [];
      const totalScore = scorecards.length
        ? Math.round(scorecards.reduce((sum: number, s: any) => sum + s.totalScore, 0) / scorecards.length)
        : 0;
      const avgSalary = scorecards.filter((s: any) => s.salarySuggest).length
        ? Math.round(scorecards.reduce((sum: number, s: any) => sum + (s.salarySuggest || 0), 0) / scorecards.filter((s: any) => s.salarySuggest).length)
        : null;
      const hireVotes = scorecards.filter((s: any) => s.decision === 'HIRE').length;
      const rejectVotes = scorecards.filter((s: any) => s.decision === 'REJECT').length;
      const majorityDecision = hireVotes > rejectVotes ? 'HIRE' : hireVotes < rejectVotes ? 'REJECT' : 'PENDING';
      const lastInterview = scorecards[0];

      return {
        id: c.id,
        name: c.name,
        position: c.position,
        email: c.email,
        phone: c.phone,
        experience: c.experience,
        source: c.source,
        status: c.status,
        scorecardCount: scorecards.length,
        avgScore: totalScore,
        avgSalary,
        hireVotes,
        rejectVotes,
        majorityDecision,
        probationSuggest: lastInterview?.probationSuggest || null,
        lastInterviewTime: lastInterview?.interviewTime || null,
        department: c.request?.department || null,
        requestTitle: c.request?.position || null,
        scorecards: scorecards.map((s: any) => ({
          id: s.id,
          interviewTime: s.interviewTime,
          interviewMode: s.interviewMode,
          interviewerName: s.interviewer?.name || 'N/A',
          interviewerRole: s.interviewerRole,
          interviewerDept: s.interviewerDept,
          scoreKnowledge: s.scoreKnowledge,
          scoreExperience: s.scoreExperience,
          scoreComm: s.scoreComm,
          scoreRespons: s.scoreRespons,
          scoreTeamwork: s.scoreTeamwork,
          totalScore: s.totalScore,
          decision: s.decision,
          salarySuggest: s.salarySuggest,
          probationSuggest: s.probationSuggest,
          interviewerNote: s.interviewerNote,
          audioRecordUrl: s.audioRecordUrl,
        })),
      };
    });

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('Report data error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
