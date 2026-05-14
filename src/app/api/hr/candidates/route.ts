import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Helper function to get AI Match Score and Analysis with KEY ROTATION
async function calculateMatchScore(candidateData: any, requirements: string) {
  try {
    const keys = (process.env.GEMINI_API_KEYS || "").split(",")
      .map(k => k.trim().replace(/^["']|["']$/g, ""))
      .filter(k => k);
    
    if (keys.length === 0) return { score: 0, analysis: "Thiếu cấu hình GEMINI_API_KEYS" };

    let lastError = null;

    // Try each key in the list
    for (const key of keys) {
      try {
        const genAI = new GoogleGenerativeAI(key);
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        const prompt = `
          Bạn là một chuyên gia tuyển dụng hắc ám và cực kỳ khắt khe. Hãy đánh giá độ phù hợp giữa ứng viên và yêu cầu công việc.
          
          YÊU CẦU CÔNG VIỆC:
          "${requirements || "Không có yêu cầu cụ thể"}"
          
          THÔNG TIN ỨNG VIÊN:
          - Vị trí: ${candidateData.position}
          - Kinh nghiệm: ${candidateData.expYears}
          - Chi tiết kinh nghiệm: ${candidateData.experience}
          - Kỹ năng: ${candidateData.skills}
          - Học vấn: ${candidateData.education}

          Hãy trả về định dạng JSON:
          {
            "score": (số từ 0-100, hãy cực kỳ khắt khe, 100 là không tưởng, nếu không có yêu cầu công việc hãy chấm dựa trên vị trí ứng tuyển),
            "analysis": "Một câu tóm tắt ngắn gọn (dưới 30 từ) về lý do chấm điểm này, nêu rõ ưu và nhược điểm lớn nhất."
          }

          Chỉ trả về DUY NHẤT mã JSON, không giải thích gì thêm.
        `;

        const result = await model.generateContent(prompt);
        const resultText = result.response.text().trim();
        const cleanJson = resultText.replace(/```json|```/g, "").trim();
        const parsed = JSON.parse(cleanJson);
        
        return {
          score: Math.min(100, Math.max(0, parseInt(parsed.score) || 0)),
          analysis: parsed.analysis || ""
        };
      } catch (err: any) {
        console.warn(`Key ${key.substring(0, 8)}... failed for match score. Error:`, err.message);
        lastError = err;
        continue; // Try next key
      }
    }

    throw new Error(lastError?.message || "Tất cả các keys đều thất bại");
  } catch (error: any) {
    console.error("AI Match Final Error:", error);
    return { score: 0, analysis: `Lỗi AI: ${error.message}` };
  }
}

// Get all candidates
export async function GET() {
  try {
    const candidates = await (prisma as any).candidate.findMany({
      include: {
        request: {
          select: {
            department: true,
            position: true,
            requirements: true
          }
        }
      },
      orderBy: {
        createdAt: "desc"
      }
    });

    return NextResponse.json(candidates);
  } catch (error) {
    console.error("Get Candidates Error:", error);
    return NextResponse.json({ error: "Failed to fetch candidates" }, { status: 500 });
  }
}

// Bulk delete candidates
export async function DELETE(req: Request) {
  try {
    const { ids } = await req.json();
    if (!ids || !Array.isArray(ids)) {
      return NextResponse.json({ error: "Invalid IDs" }, { status: 400 });
    }

    await (prisma as any).candidate.deleteMany({
      where: {
        id: { in: ids }
      }
    });

    return NextResponse.json({ message: "Candidates deleted successfully" });
  } catch (error) {
    console.error("Bulk Delete Candidates Error:", error);
    return NextResponse.json({ error: "Failed to delete candidates" }, { status: 500 });
  }
}

// Create manual candidate
export async function POST(req: Request) {
  try {
    const data = await req.json();
    
    if (!data.name) return NextResponse.json({ error: "Thiếu họ tên ứng viên" }, { status: 400 });
    if (!data.requestId) return NextResponse.json({ error: "Thiếu mã yêu cầu tuyển dụng (requestId)" }, { status: 400 });
    if (!data.position) return NextResponse.json({ error: "Thiếu vị trí ứng tuyển" }, { status: 400 });

    // Fetch requirements
    const recruitmentRequest = await (prisma as any).recruitmentRequest.findUnique({
      where: { id: data.requestId },
      select: { requirements: true }
    });

    console.log(`Matching candidate ${data.name} for request ${data.requestId}. Requirements found: ${!!recruitmentRequest?.requirements}`);

    // Calculate Match Score and Analysis with Key Rotation
    const aiResult = await calculateMatchScore(data, recruitmentRequest?.requirements || "");

    const candidate = await (prisma as any).candidate.create({
      data: {
        requestId: data.requestId,
        name: data.name,
        position: data.position,
        source: data.source || "MANUAL",
        experience: data.experience,
        expYears: data.expYears,
        status: data.status || "Pending Review",
        phone: data.phone,
        email: data.email,
        address: data.address,
        profileUrl: data.profileUrl,
        cvUrl: data.cvUrl,
        skills: data.skills,
        summary: aiResult.analysis, 
        gender: data.gender,
        birthDate: (data.birthDate && !isNaN(Date.parse(data.birthDate))) ? new Date(data.birthDate) : null,
        desiredSalary: data.desiredSalary,
        education: data.education,
        matchScore: aiResult.score 
      }
    });

    return NextResponse.json(candidate);
  } catch (error: any) {
    console.error("Create Candidate Error:", error);
    return NextResponse.json({ 
      error: "Failed to create candidate",
      details: error.message 
    }, { status: 500 });
  }
}
