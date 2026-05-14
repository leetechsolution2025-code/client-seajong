import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    
    // Parse requirements if it comes as a string from client
    const reqs = typeof body.requirements === 'string' ? JSON.parse(body.requirements) : (body.requirements || {});
    
    const updateData: any = {
      department: body.department,
      position: body.position,
      specialty: body.specialty,
      quantity: body.quantity,
      deadline: body.deadline ? new Date(body.deadline) : undefined,
      description: body.description,
      requestedBy: body.requestedBy,
      status: body.status,
      priority: body.priority,

      // Map new standardized fields from either body or reqs JSON
      salaryMin: reqs.salaryMin || body.salaryMin,
      salaryMax: reqs.salaryMax || body.salaryMax,
      workType: reqs.workType || body.workType,
      experience: reqs.experience || body.experience,
      education: reqs.education || body.education,
      gender: reqs.gender || body.gender,
      ageMin: reqs.ageMin || body.ageMin,
      ageMax: reqs.ageMax || body.ageMax,
      level: reqs.level || body.level,
      skills: reqs.skills || body.skills,

      // Also update requirements JSON string
      requirements: typeof body.requirements === 'string' ? body.requirements : JSON.stringify(reqs)
    };

    // Clean undefined values
    Object.keys(updateData).forEach(key => updateData[key] === undefined && delete updateData[key]);

    const updated = await (prisma as any).recruitmentRequest.update({
      where: { id },
      data: updateData
    });
    
    return NextResponse.json(updated);
  } catch (error) {
    console.error("Update request error:", error);
    return NextResponse.json({ error: "Failed to update request" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    
    // First delete candidates related to this request
    await (prisma as any).candidate.deleteMany({
      where: { requestId: id }
    });
    
    // Then delete the request
    await (prisma as any).recruitmentRequest.delete({
      where: { id }
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete request error:", error);
    return NextResponse.json({ error: "Failed to delete request" }, { status: 500 });
  }
}
