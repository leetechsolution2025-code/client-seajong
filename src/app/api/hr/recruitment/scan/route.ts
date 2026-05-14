import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateAIContent } from "@/lib/ai";

async function searchSerp(query: string) {
  const apiKey = process.env.SERPAPI_KEY;
  if (!apiKey) throw new Error("Missing SERPAPI_KEY");

  const url = `https://serpapi.com/search.json?q=${encodeURIComponent(query)}&api_key=${apiKey}&engine=google&num=10&gl=vn&hl=vi`;
  const res = await fetch(url);
  if (!res.ok) return { organic_results: [] };
  return await res.json();
}

async function searchTopCV(request: any, providedToken?: string) {
  console.log("[Source: TopCV] Connecting to OFFICIAL API...");
  
  const accessToken = providedToken || process.env.TOPCV_ACCESS_TOKEN;
  if (!accessToken) {
    throw new Error("Chưa có Access Token. Vui lòng nhập Access Token của bạn trên giao diện Cấu hình Tích hợp TopCV.");
  }

  // Chế độ DEMO để test giao diện
  if (accessToken.toLowerCase() === "demo") {
    console.log("[Source: TopCV] Running in DEMO mode...");
    return {
      candidates: [
        {
          name: "Nguyễn Thị TopCV",
          email: "nguyenthi.topcv@gmail.com",
          phone: "0988777666",
          address: "Hà Nội",
          position: request.position,
          experience: "4 năm",
          profileUrl: "https://topcv.vn/profile/demo1",
          matchScore: 90,
          summary: "Ứng viên cực kỳ tiềm năng, kinh nghiệm dày dặn từ TopCV.",
          source: "TOPCV",
          appliedAt: new Date()
        },
        {
          name: "Lê Văn B (TopCV)",
          email: "levanb.topcv@example.com",
          phone: "0977111222",
          address: "Đà Nẵng",
          position: request.position,
          experience: "2 năm",
          profileUrl: "https://topcv.vn/profile/demo2",
          matchScore: 75,
          summary: "Ứng viên trẻ, năng động, cần đào tạo thêm.",
          source: "TOPCV",
          appliedAt: new Date()
        }
      ]
    };
  }

  let responseData;
  try {
    const url = `https://api.topcv.vn/v1/candidates?job_title=${encodeURIComponent(request.position)}`; 
    const res = await fetch(url, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Accept": "application/json"
      }
    });

    if (!res.ok) {
      throw new Error(`API returned ${res.status}`);
    }
    responseData = await res.json();
  } catch (err) {
    console.warn("[Source: TopCV] Official API failed (403/404). Falling back to Google X-Ray Search...");
    
    const query = `site:topcv.vn/profile "${request.position}"`;
    const data = await searchSerp(query);
    
    if (!data.organic_results || data.organic_results.length === 0) {
      return { candidates: [] };
    }

    const analysisPrompt = `Dưới đây là kết quả tìm kiếm THỰC TẾ từ Google cho các hồ sơ công khai trên TopCV.
    Lệnh nghiêm ngặt: TUYỆT ĐỐI KHÔNG BỊA ĐẶT THÔNG TIN. Chỉ lấy đúng những người trong danh sách.
    
    KẾT QUẢ THỰC TẾ:
    ${data.organic_results.map((r: any, i: number) => `[${i}] Title: ${r.title}\nSnippet: ${r.snippet}\nLink: ${r.link}`).join("\n\n")}
    
    Hãy bóc tách thông tin bao gồm: name, email, phone, address, experience, matchScore (0-100), summary.
    Trả về JSON mảng candidates.`;
    
    return await generateAIContent(analysisPrompt);
  }
  
  const candidates = (responseData.data || []).map((c: any) => ({
    name: c.name || c.full_name || "Ứng viên TopCV",
    email: c.email || "Chưa cập nhật",
    phone: c.phone || "Chưa cập nhật",
    address: c.address || c.city || "Chưa xác định",
    profileUrl: c.profile_url || c.cv_url || `https://topcv.vn/profile/api_${Math.random().toString(36).substring(7)}`,
    position: c.job_title || c.position || request.position,
    experience: c.experience || (c.years_of_experience ? `${c.years_of_experience} năm` : "Chưa xác định"),
    skills: c.skills || [],
    matchScore: c.match_score || 80,
    summary: c.objective || c.summary || "Hồ sơ được đồng bộ qua TopCV API chính thức."
  }));

  return { candidates };
}

async function searchVieclam24h(request: any, providedToken?: string) {
  console.log("[Source: Vieclam24h] Connecting to OFFICIAL API...");
  
  const token = providedToken || process.env.VIECLAM24H_ACCESS_TOKEN;
  console.log(`[Source: Vieclam24h] Using token: ${token ? token.substring(0, 10) + "..." : "MISSING"}`);
  
  if (!token) {
    return { candidates: [], error: "Missing token" };
  }

  // Chế độ DEMO để test giao diện nếu không có Token thật
  if (token.toLowerCase() === "demo") {
    console.log("[Source: Vieclam24h] Running in DEMO mode...");
    return {
      candidates: [
        {
          name: "Nguyễn Văn Demo 1",
          email: "demo1@example.com",
          phone: "0901234567",
          address: "Hà Nội",
          position: request.position,
          experience: "3 năm",
          profileUrl: "https://vieclam24h.vn/demo1",
          matchScore: 85,
          summary: "Ứng viên mẫu từ hệ thống demo Vieclam24h.",
          source: "VIECLAM24H",
          appliedAt: new Date()
        },
        {
          name: "Trần Thị Demo 2",
          email: "demo2@example.com",
          phone: "0907654321",
          address: "TP. HCM",
          position: request.position,
          experience: "5 năm",
          profileUrl: "https://vieclam24h.vn/demo2",
          matchScore: 92,
          summary: "Ứng viên kinh nghiệm lâu năm, phù hợp với vị trí quản lý.",
          source: "VIECLAM24H",
          appliedAt: new Date()
        }
      ]
    };
  }

  let allCandidates: any[] = [];
  let page = 1;
  const perPage = 50;
  const branches = ["vl24h.south", "vl24h.north"];
  
  for (const branch of branches) {
    console.log(`[Source: Vieclam24h] Trying branch: ${branch}...`);
    page = 1;
    while (true) {
      const url = `https://apiv2.vieclam24h.vn/mix/fe/employer/resume-applied-history?includes=employer_note_resume_applied,tags,resume_info&page=${page}&per_page=${perPage}`;
      
      const res = await fetch(url, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`,
          "accept": "application/json",
          "origin": "https://ntd.vieclam24h.vn",
          "referer": "https://ntd.vieclam24h.vn/",
          "x-branch": branch,
          "x-lang": "vi",
          "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
        }
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        console.error(`[Source: Vieclam24h] ${branch} API Error:`, res.status, err);
        break; // Try next branch
      }

      const json = await res.json();
      const items = json?.data?.items || json?.data || [];
      
      if (!Array.isArray(items) || items.length === 0) {
        console.log(`[Source: Vieclam24h] ${branch} Page ${page} returned 0 items.`);
        break;
      }

      console.log(`[Source: Vieclam24h] ${branch} Page ${page} returned ${items.length} items`);

      const mapped = items.map((item: any) => {
        const seeker = item.seeker_info || {};
        const job = item.job_info || {};
        return {
          name: seeker.name || "Nặc danh",
          email: seeker.email || "",
          phone: seeker.mobile || "",
          address: seeker.address || seeker.city_name || seeker.district_name || "Chưa xác định",
          position: job.title || request.position,
          experience: item.resume_info?.experience ? `${item.resume_info.experience} năm` : "Chưa xác định",
          profileUrl: `https://ntd.vieclam24h.vn/chi-tiet-nguoi-tim-viec?id=${item.resume_id}&id_applied=${item.id}&is_resume_applied=`,
          cvUrl: item.file ? `https://cdn1.vieclam24h.vn${item.file}` : undefined,
          matchScore: item.resume_info?.match_score || 0,
          skills: item.resume_info?.skills || [],
          summary: item.resume_info?.career_objective || `Hồ sơ ứng tuyển vị trí ${job.title || request.position} từ Vieclam24h`,
          source: "VIECLAM24H",
          appliedAt: item.applied_at ? new Date(item.applied_at * 1000) : new Date()
        };
      });

      allCandidates = [...allCandidates, ...mapped];
      if (items.length < perPage || page >= 10) break;
      page++;
    }
    
    if (allCandidates.length > 0) {
      console.log(`[Source: Vieclam24h] Found ${allCandidates.length} candidates in ${branch}. Stopping search.`);
      break; 
    }
  }

  console.log(`[Source: Vieclam24h] Final total candidates fetched: ${allCandidates.length}`);
  return { candidates: allCandidates };
}

export async function POST(req: Request) {
  try {
    const { requestId, source = "agent", topcvToken, vieclam24hToken } = await req.json();
    
    const recruitmentRequest = await prisma.recruitmentRequest.findUnique({
      where: { id: requestId }
    });

    if (!recruitmentRequest) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    await prisma.candidate.updateMany({
      where: { requestId, status: "New" },
      data: { status: "Screened" }
    });

    let candidates: any[] = [];

    if (source === "agent") {
      const queryPrompt = `Dựa trên yêu cầu tuyển dụng sau, hãy tạo 3 câu lệnh Google X-Ray search chuyên sâu để tìm profile ứng viên trên LinkedIn, Facebook và các trang CV.
      Vị trí: ${recruitmentRequest.position}
      Chuyên môn: ${recruitmentRequest.specialty || "N/A"}
      Yêu cầu: ${recruitmentRequest.requirements || "N/A"}
      Trả về JSON: { "queries": ["query1", "query2", "query3"] }`;

      const { queries } = await generateAIContent(queryPrompt);
      
      let allResults: any[] = [];
      for (const q of queries) {
        const data = await searchSerp(q);
        if (data.organic_results) allResults = [...allResults, ...data.organic_results];
      }

      const uniqueResults = Array.from(new Map(allResults.map(item => [item.link, item])).values());
      
      if (uniqueResults.length > 0) {
        const analysisPrompt = `Bóc tách thông tin từ các kết quả Google Search này thành danh sách ứng viên chất lượng cho vị trí ${recruitmentRequest.position}:
        ${uniqueResults.map((r, i) => `[${i}] Title: ${r.title}\nSnippet: ${r.snippet}\nLink: ${r.link}`).join("\n\n")}
        Hãy bóc tách các trường: name, email, phone, address, position, experience, matchScore (0-100), skills (mảng), summary.
        Trả về JSON mảng candidates.`;

        const result = await generateAIContent(analysisPrompt);
        candidates = result.candidates || [];
      }
    } else if (source === "topcv") {
      const result = await searchTopCV(recruitmentRequest, topcvToken);
      candidates = result.candidates || [];
    } else if (source === "vieclam24h") {
      const allFromVieclam = await searchVieclam24h(recruitmentRequest, vieclam24hToken);
      
      if ((allFromVieclam as any).error === "Missing token") {
        return NextResponse.json({ error: "Chưa có Access Token Vieclam24h. Vui lòng cấu hình trong mục Kết nối Tích hợp (biểu tượng răng cưa)." }, { status: 400 });
      }

      const allCandidates = allFromVieclam.candidates || [];

      if (allCandidates.length === 0) {
        return NextResponse.json({ message: "Không tìm thấy ứng viên nào từ Vieclam24h.", foundCount: 0 });
      }

      const allRequests = await prisma.recruitmentRequest.findMany({
        where: { status: { in: ["Approved", "Completed"] } }
      });

      const normalize = (str: string) =>
        str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").trim();

      const BATCH_SIZE = 10;
      const candidatesToProcess: any[] = [];
      
      for (const candidate of allCandidates) {
        const candidatePosition = normalize(candidate.position || "");
        
        let bestMatch = null;
        let bestScore = -1;

        for (const r of allRequests) {
          const reqPos = normalize(r.position);
          let score = 0;
          
          if (candidatePosition === reqPos) {
             score = 100; // Khớp chính xác hoàn toàn
          } else if (candidatePosition.includes(reqPos)) {
             score = 80;  // Ứng viên chứa tên vị trí yêu cầu (Vd: "Nhân viên thủ kho" chứa "Thủ kho")
          } else if (reqPos.includes(candidatePosition) && candidatePosition.length > 5) {
             score = 60;  // Yêu cầu chứa tên ứng viên (ngược lại)
          }

          if (score > bestScore) {
             bestScore = score;
             bestMatch = r;
          }
        }

        if (bestScore < 60) {
          console.log(`[Source: Vieclam24h] Skipping candidate ${candidate.name} - Position "${candidate.position}" did not match any requests (Best score: ${bestScore})`);
        }

        // Chỉ chấp nhận nếu có độ khớp hợp lý (score >= 60)
        if (bestMatch && bestScore >= 60) {
          candidatesToProcess.push({ ...candidate, matchedRequest: bestMatch });
        }
      }
      console.log(`[Source: Vieclam24h] Candidates after position matching: ${candidatesToProcess.length}`);

      // Batch AI Processing
      for (let i = 0; i < candidatesToProcess.length; i += BATCH_SIZE) {
        const chunk = candidatesToProcess.slice(i, i + BATCH_SIZE);
        try {
          const prompt = `
            Phân tích danh sách tóm tắt ứng viên dưới đây và trích xuất vị trí công việc gần nhất + số năm kinh nghiệm.
            Danh sách:
            ${chunk.map((c, idx) => `${idx + 1}. Tên: ${c.name}, Tóm tắt: ${c.summary}`).join("\n")}
            Trả về duy nhất một mảng JSON theo thứ tự:
            [ { "latest_role": "Vị trí", "years": "Số năm" }, ... ]
            Nếu không thấy thông tin, để null. Chỉ trả về JSON mảng.
          `;
          
          const aiResults = await generateAIContent(prompt);
          if (Array.isArray(aiResults)) {
            aiResults.forEach((res, idx) => {
              if (chunk[idx] && res && res.latest_role) {
                chunk[idx].aiExperience = `${res.latest_role}${res.years ? ` (${res.years})` : ""}`;
              }
            });
          }
        } catch (e) {
          console.error("[AI Batch Error] Skipping batch.");
        }
      }

      const savedCandidates = [];
      for (const candidate of candidatesToProcess) {
        const matchedRequest = candidate.matchedRequest;
        const candidatePosition = normalize(candidate.position || "");
        const safeProfileUrl = candidate.profileUrl || `https://vieclam24h.vn/profile/tmp_${Math.random().toString(36).substring(7)}`;

        const existing = await prisma.candidate.findFirst({
          where: { profileUrl: safeProfileUrl }
        });

        const finalPhone = candidate.phone || "";
        const finalEmail = candidate.email || "";
        const finalAddress = candidate.address || "Chưa xác định";

        let aiScore = candidate.matchScore;
        if (!aiScore || aiScore === 0) {
          const reqPosWords = normalize(matchedRequest.position).split(" ");
          const matchCount = reqPosWords.filter(w => candidatePosition.includes(w)).length;
          const matchRatio = matchCount / reqPosWords.length;
          const baseScore = matchRatio >= 0.5 ? 80 : 65;
          aiScore = baseScore + Math.floor(Math.random() * 15);
          if (aiScore > 98) aiScore = 98;
        }

        const finalExperience = candidate.aiExperience || (typeof candidate.experience === "string" ? candidate.experience : "Chưa xác định");

        if (!existing) {
          const saved = await (prisma as any).candidate.create({
            data: {
              requestId: matchedRequest.id,
              name: candidate.name || "Nặc danh",
              position: matchedRequest.position,
              source: candidate.source || "VIECLAM24H",
              experience: finalExperience,
              matchScore: aiScore,
              phone: finalPhone,
              email: finalEmail,
              address: finalAddress,
              profileUrl: safeProfileUrl,
              cvUrl: candidate.cvUrl || null,
              skills: JSON.stringify(candidate.skills || []),
              summary: candidate.summary || "Hồ sơ từ Vieclam24h",
              date: candidate.appliedAt || new Date(),
              status: "New"
            }
          });
          savedCandidates.push(saved);
        } else {
          const updated = await (prisma as any).candidate.update({
            where: { id: existing.id },
            data: { 
              // Giữ nguyên status hiện tại, không reset
              phone: finalPhone, 
              email: finalEmail, 
              address: finalAddress,
              requestId: matchedRequest.id,
              matchScore: aiScore,
              cvUrl: candidate.cvUrl || null,
              date: candidate.appliedAt || new Date(),
              experience: finalExperience
            }
          });
          savedCandidates.push(updated);
        }
      }

      return NextResponse.json({
        message: `Đã phân loại ${savedCandidates.length}/${allCandidates.length} ứng viên.`,
        foundCount: savedCandidates.length,
        candidates: savedCandidates
      });
    }

    // Agent/TopCV generic processing
    const savedCandidates = [];
    for (const p of candidates) {
      const safeProfileUrl = p.profileUrl || `https://${source}.vn/profile/tmp_${Math.random().toString(36).substring(7)}`;
      const existing = await (prisma as any).candidate.findFirst({
        where: { requestId: recruitmentRequest.id, profileUrl: safeProfileUrl }
      });

      if (!existing) {
        const saved = await (prisma as any).candidate.create({
          data: {
            requestId: recruitmentRequest.id,
            name: p.name || "Nặc danh",
            position: recruitmentRequest.position,
            source: source === "agent" ? (p.source || "Web") : source.toUpperCase(),
            experience: typeof p.experience === "string" ? p.experience : "Chưa xác định",
            matchScore: p.matchScore || 70,
            phone: p.phone || "Liên hệ qua cổng",
            email: p.email || "Liên hệ qua cổng",
            address: p.address || "Chưa xác định",
            profileUrl: safeProfileUrl,
            cvUrl: p.cvUrl || null,
            skills: JSON.stringify(p.skills || []),
            summary: p.summary || `Hồ sơ bóc tách từ ${source}.`,
            status: "New"
          }
        });
        savedCandidates.push(saved);
      } else {
        const updated = await (prisma as any).candidate.update({
          where: { id: existing.id },
          data: { 
            // Giữ nguyên status hiện tại, không reset
            address: p.address || existing.address
          }
        });
        savedCandidates.push(updated);
      }
    }

    return NextResponse.json({ 
      message: "Search completed successfully", 
      foundCount: savedCandidates.length,
      candidates: savedCandidates
    });

  } catch (error: any) {
    console.error("Scan error:", error);
    return NextResponse.json({ error: "Failed: " + error.message }, { status: 500 });
  }
}
