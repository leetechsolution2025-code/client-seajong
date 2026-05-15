import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const { id } = resolvedParams;
    
    if (!id) return NextResponse.json({ error: "Missing candidate ID" }, { status: 400 });

    const data = await req.json();
    console.log("Updating candidate", id, "with data:", data);

    // 1. Get current candidate
    const oldCandidate = await (prisma as any).candidate.findUnique({
      where: { id },
      include: { request: { select: { position: true, requesterId: true } } }
    });

    if (!oldCandidate) return NextResponse.json({ error: "Candidate not found" }, { status: 404 });

    // 2. Comprehensive list of allowed fields based on schema
    const allowedFields = [
      'name', 'position', 'source', 'experience', 'expYears', 'status', 
      'matchScore', 'phone', 'email', 'profileUrl', 'skills', 'summary', 
      'cvUrl', 'address', 'birthDate', 'desiredSalary', 'education', 'gender', 'requestId',
      'interviewDate', 'interviewLocation', 'interviewNotes', 'interviewer', 'interviewParticipants'
    ];

    const updateData: any = {};
    allowedFields.forEach(field => {
      if (data[field] !== undefined) {
        updateData[field] = data[field];
      }
    });

    // Handle special types conversion
    if (updateData.birthDate) {
      const bDate = new Date(updateData.birthDate);
      updateData.birthDate = isNaN(bDate.getTime()) ? null : bDate;
    }
    
    if (updateData.matchScore !== undefined) {
      updateData.matchScore = parseInt(updateData.matchScore) || 0;
    }

    // Ensure requestId update is handled properly (Prisma needs valid ID)
    if (updateData.requestId === "") {
        delete updateData.requestId;
    }

    // 3. Execute update
    const candidate = await (prisma as any).candidate.update({
      where: { id },
      data: updateData
    });

    // 4. If status changed to 'Pending Review', notify requester
    if (data.status === 'Pending Review' && oldCandidate?.request?.requesterId) {
      // Check if notification already exists to avoid spamming
      await (prisma as any).notification.create({
        data: {
          title: "Ứng viên mới chờ duyệt",
          content: `HR đã cập nhật hồ sơ ứng viên ${candidate.name} cho vị trí ${oldCandidate.request.position} và đang chờ bạn phê duyệt.`,
          type: "recruitment",
          priority: "high",
          createdById: "system",
          recipients: {
            create: {
              userId: oldCandidate.request.requesterId
            }
          }
        }
      });
    }

    return NextResponse.json(candidate);
  } catch (error: any) {
    console.error("Update Candidate Error:", error);
    return NextResponse.json({ 
      error: "Failed to update candidate",
      details: error.message 
    }, { status: 500 });
  }
}
