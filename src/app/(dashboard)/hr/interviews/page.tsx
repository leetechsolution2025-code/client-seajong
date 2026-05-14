"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { StandardPage } from "@/components/layout/StandardPage";
import { FilterBadgeGroup } from "@/components/ui/FilterBadge";
import { SearchInput } from "@/components/ui/SearchInput";
import { useToast } from "@/components/ui/Toast";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import { createPortal } from "react-dom";
import { Table, TableColumn } from "@/components/ui/Table";
import { WorkflowCard } from "@/components/ui/WorkflowCard";

declare global {
  interface Window {
    JitsiMeetExternalAPI: any;
  }
}

// --- TYPES ---
interface Participant {
  userId: string;
  fullName: string;
  status: 'pending' | 'accepted' | 'declined';
}

interface Candidate {
  id: string;
  name: string;
  position: string;
  status: string;
  interviewDate?: string;
  interviewLocation?: string;
  interviewer?: string;
  interviewNotes?: string;
  interviewParticipants?: string; // JSON string
  phone?: string;
  email?: string;
  cvUrl?: string;
  profileUrl?: string;
  request?: {
    department: string;
    requirements?: string;
  };
}

export default function InterviewPage() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [activeTab, setActiveTab] = useState<"info" | "scorecard" | "video">("info");
  const [mounted, setMounted] = useState(false);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isCamMuted, setIsCamMuted] = useState(false);
  const [scores, setScores] = useState<number[]>([3, 3, 3, 3, 3]); // Mặc định 5 tiêu chí đều là Tốt (Index 3)
  const [hireStatus, setHireStatus] = useState<'hire' | 'reject'>('hire');
  const [interviewMode, setInterviewMode] = useState<'Offline' | 'Online'>('Offline');
  const [selectedCriterion, setSelectedCriterion] = useState('1. Kiến thức chuyên môn');
  const [generatedQuestion, setGeneratedQuestion] = useState({ q: '', a: '' });
  const [questionHistory, setQuestionHistory] = useState<string[]>([]);
  const [interviewerNote, setInterviewerNote] = useState("");
  const [salarySuggest, setSalarySuggest] = useState("");
  const [probationSuggest, setProbationSuggest] = useState("30 ngày");
  const { success, error: toastError } = useToast();
  const { data: session } = useSession();

  // --- AUDIO RECORDER STATE ---
  const [recordingStatus, setRecordingStatus] = useState<'idle' | 'recording' | 'paused' | 'stopped'>('idle');
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  // --- TRANSCRIPT PANEL STATE ---
  const [showTranscriptPanel, setShowTranscriptPanel] = useState(false);
  const [transcript, setTranscript] = useState<string | null>(null);
  const [isTranscribing, setIsTranscribing] = useState(false);

  const handleTranscribe = async () => {
    if (!audioUrl) return;
    setShowTranscriptPanel(true);
    if (transcript) return; // already transcribed
    setIsTranscribing(true);
    try {
      const res = await fetch('/api/hr/interviews/transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audioUrl }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Lỗi không xác định');
      setTranscript(data.text);
    } catch (e: any) {
      setTranscript(`Lỗi: ${e.message}`);
    } finally {
      setIsTranscribing(false);
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const formData = new FormData();
        formData.append('audio', audioBlob, 'interview_audio.webm');
        if (selectedCandidate) formData.append('candidateId', selectedCandidate.id);

        try {
          const res = await fetch('/api/hr/interviews/upload-audio', {
            method: 'POST',
            body: formData,
          });
          if (res.ok) {
            const data = await res.json();
            setAudioUrl(data.url);
            success("File ghi âm đã được tải lên máy chủ!");
          } else {
            toastError("Lỗi tải lên file ghi âm");
          }
        } catch (error: any) {
          toastError(error.message);
        }
      };

      mediaRecorder.start(1000);
      setRecordingStatus('recording');
      setRecordingTime(0);
      timerIntervalRef.current = setInterval(() => setRecordingTime((prev) => prev + 1), 1000);
    } catch (err) {
      toastError("Lỗi truy cập Microphone. Vui lòng cấp quyền trên trình duyệt.");
    }
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.pause();
      setRecordingStatus('paused');
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    }
  };

  const resumeRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
      mediaRecorderRef.current.resume();
      setRecordingStatus('recording');
      timerIntervalRef.current = setInterval(() => setRecordingTime((prev) => prev + 1), 1000);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      setRecordingStatus('stopped');
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    }
  };

  useEffect(() => {
    if (interviewMode === 'Offline' && activeTab === 'video') {
      setActiveTab('info');
    }
  }, [interviewMode, activeTab]);

  const generateNewQuestion = () => {
    if (!selectedCandidate) return;
    const position = selectedCandidate.position || "ứng viên";

    const templates: Record<string, { q: string, a: string }[]> = {
      "1. Kiến thức chuyên môn": [
        { q: `Trong vai trò ${position}, quy trình nghiệp vụ phức tạp nhất mà bạn từng xây dựng hoặc tham gia tối ưu là gì?`, a: "Ứng viên trình bày được logic hệ thống, hiểu rõ luồng dữ liệu và các rủi ro (bottleneck) trong quy trình." },
        { q: `Nêu cách bạn cập nhật kiến thức mới về chuyên môn ${position} và áp dụng vào thực tế công việc?`, a: "Có phương pháp tự học rõ ràng, đưa ra ví dụ cụ thể về một công nghệ/quy trình mới đã áp dụng thành công." },
        { q: `Khi gặp một bài toán chuyên môn khó thuộc phạm vi công việc của ${position}, bạn sẽ bắt đầu giải quyết từ đâu?`, a: "Biết cách research, tham vấn chuyên gia, phân tích yêu cầu và chia nhỏ vấn đề." },
        { q: `Trình bày một sai lầm chuyên môn bạn từng mắc phải khi làm ${position} và cách khắc phục?`, a: "Thừa nhận sai lầm, phân tích nguyên nhân gốc rễ (root cause) và nêu giải pháp ngăn chặn lặp lại." },
        { q: `Các KPI/Metrics quan trọng nhất đối với vị trí ${position} theo bạn là gì và làm sao để đạt được?`, a: "Liệt kê được các chỉ số trọng yếu, hiểu bản chất chỉ số và đề xuất kế hoạch hành động thực tế." }
      ],
      "2. Kinh nghiệm làm việc": [
        { q: `Kể về dự án/chiến dịch thành công nhất mà bạn trực tiếp triển khai trong suốt thời gian làm ${position}?`, a: "Mô tả rõ vai trò, thách thức, cách vượt qua và kết quả định lượng (số liệu cụ thể)." },
        { q: `Khó khăn lớn nhất bạn từng gặp với khách hàng/đối tác khi làm ${position} là gì và cách xử lý?`, a: "Thể hiện sự chuyên nghiệp, kiên nhẫn và khả năng đàm phán win-win." },
        { q: "Sự khác biệt lớn nhất giữa môi trường làm việc lý tưởng của bạn và công ty cũ?", a: "Đánh giá mức độ phù hợp văn hoá. Trả lời tích cực, không nói xấu công ty cũ." },
        { q: `Nếu được làm lại một dự án thất bại trong quá khứ khi làm ${position}, bạn sẽ thay đổi điều gì?`, a: "Thể hiện tư duy phản biện (critical thinking) và bài học rút ra sau dự án." },
        { q: `Điều gì bạn tự hào nhất về bản thân sau ngần ấy năm kinh nghiệm làm ${position}?`, a: "Cho thấy mức độ hiểu biết sâu sắc và sự đóng góp giá trị cốt lõi cho tổ chức." }
      ],
      "3. Kỹ năng giao tiếp": [
        { q: `Làm thế nào để bạn thuyết phục một đồng nghiệp không đồng tình với ý kiến chuyên môn của ${position}?`, a: "Lắng nghe, đồng cảm, dùng dữ liệu/logic để chứng minh thay vì áp đặt." },
        { q: `Kể về một lần bạn phải truyền đạt thông tin phức tạp (như báo cáo ${position}) cho cấp trên/người ngoài ngành?`, a: "Biết cách sử dụng ngôn ngữ đơn giản, ví dụ minh hoạ dễ hiểu, kiểm tra lại mức độ tiếp thu." },
        { q: "Bạn xử lý thế nào khi nhận được một email/tin nhắn mang tính chất công kích trong công việc?", a: "Giữ bình tĩnh, không phản hồi ngay lúc nóng giận. Phân tích vấn đề khách quan và trao đổi trực tiếp." },
        { q: `Cách bạn báo cáo tiến độ công việc của ${position} cho quản lý để đảm bảo thông tin minh bạch mà không rườm rà?`, a: "Báo cáo theo format chuẩn (ví dụ: STAR, PDCA), nêu bật kết quả, rủi ro và đề xuất." },
        { q: `Khi nhận được phản hồi tiêu cực về chất lượng công việc của vị trí ${position}, thái độ tiếp nhận của bạn ra sao?`, a: "Không phản ứng phòng thủ, tiếp thu có chọn lọc và đề xuất phương án cải thiện." }
      ],
      "4. Tính trách nhiệm": [
        { q: `Khi dự án do bạn phụ trách (${position}) có nguy cơ trễ deadline do lỗi của team khác, bạn sẽ làm gì?`, a: "Không đổ lỗi. Chủ động tìm giải pháp khắc phục hậu quả trước, sau đó mới review rút kinh nghiệm." },
        { q: `Kể về một lần bạn phải hy sinh lợi ích cá nhân để hoàn thành mục tiêu chung của phòng ban ${position}?`, a: "Sẵn sàng hỗ trợ đồng đội khi cần thiết, đặt lợi ích tập thể lên trên." },
        { q: `Bạn định nghĩa thế nào về sự 'chủ động' đối với công việc của một ${position}?`, a: "Không chờ giao việc mới làm. Nhìn thấy vấn đề là đề xuất giải pháp. Báo cáo trước khi được hỏi." },
        { q: `Nếu phát hiện quy trình phối hợp công việc của ${position} có lỗ hổng gây ảnh hưởng, bạn làm gì?`, a: "Báo cáo ngay cho quản lý cấp cao kèm theo minh chứng và đề xuất phương án vá lỗ hổng." },
        { q: `Bạn xử lý thế nào nếu phát hiện bản thân vừa làm sai một việc ảnh hưởng lớn nhưng chưa ai biết?`, a: "Thừa nhận trách nhiệm ngay lập tức với quản lý, không che giấu, kèm theo phương án xử lý." }
      ],
      "5. Khả năng làm việc nhóm": [
        { q: `Mô tả vai trò thường thấy của bạn khi làm việc trong một dự án liên phòng ban với tư cách là ${position}?`, a: "Có khả năng thích nghi nhanh. Thể hiện rõ việc phối hợp ngang cấp nhịp nhàng." },
        { q: "Cách bạn xử lý xung đột cá nhân với một thành viên trong nhóm dự án?", a: "Tách bạch công việc và cá nhân. Trao đổi thẳng thắn, tôn trọng và hướng tới mục tiêu chung." },
        { q: `Làm sao để khích lệ một nhân sự cấp dưới hoặc đồng nghiệp vị trí ${position} đang mất động lực?`, a: "Tìm hiểu nguyên nhân (khó khăn chuyên môn, việc gia đình...), động viên, hỗ trợ thiết thực." },
        { q: "Kể về một lần nhóm bạn thất bại. Nguyên nhân là gì và bạn học được gì?", a: "Nhìn nhận khách quan về sự phối hợp. Rút kinh nghiệm về giao tiếp, phân công hoặc quản trị rủi ro." },
        { q: `Khi ý kiến cá nhân của bạn (với chuyên môn ${position}) đi ngược lại với đa số thành viên nhóm, bạn làm gì?`, a: "Tôn trọng quyết định tập thể sau khi đã phân tích rủi ro, bảo vệ quan điểm bằng data nhưng không cố chấp." }
      ]
    };

    const categoryQuestions = templates[selectedCriterion] || templates["1. Kiến thức chuyên môn"];
    let available = categoryQuestions.filter(q => !questionHistory.includes(q.q));

    if (available.length === 0) {
      setGeneratedQuestion({ q: "Đã hỏi hết câu hỏi chuyên sâu cho phần này.", a: "Vui lòng chuyển sang một tiêu chí đánh giá khác để tiếp tục." });
    } else {
      const picked = available[Math.floor(Math.random() * available.length)];
      setGeneratedQuestion(picked);
      setQuestionHistory([...questionHistory, picked.q]);
    }
  };

  useEffect(() => {
    if (selectedCandidate) {
      generateNewQuestion();
    }
  }, [selectedCriterion, selectedCandidate]);

  const calculateTotalScore = () => {
    return scores.reduce((total, scoreIndex) => total + (scoreIndex + 1) * 4, 0);
  };

  const handleScoreChange = (criteriaIndex: number, value: number) => {
    const newScores = [...scores];
    newScores[criteriaIndex] = value;
    setScores(newScores);
  };

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const jitsiContainerRef = useRef<HTMLDivElement>(null);
  const jitsiApiRef = useRef<any>(null);

  useEffect(() => {
    setMounted(true);
    fetchCandidates();

    // Load Jitsi script
    if (!window.JitsiMeetExternalAPI) {
      const script = document.createElement("script");
      script.src = "https://meet.jit.si/external_api.js";
      script.async = true;
      document.body.appendChild(script);
    }

    return () => {
      stopCamera();
      if (jitsiApiRef.current) jitsiApiRef.current.dispose();
    };
  }, []);

  useEffect(() => {
    if (activeTab === 'video' && selectedCandidate) {
      startCamera();
      initJitsi();
    } else {
      stopCamera();
      if (jitsiApiRef.current) {
        jitsiApiRef.current.dispose();
        jitsiApiRef.current = null;
      }
    }
  }, [activeTab, selectedCandidate]);

  const initJitsi = () => {
    // Wait a brief moment for the DOM container to be ready and script to load
    setTimeout(() => {
      if (window.JitsiMeetExternalAPI && jitsiContainerRef.current && !jitsiApiRef.current) {
        const domain = 'meet.jit.si';
        const options = {
          roomName: `LeeTechInterview_${selectedCandidate?.id.replace(/-/g, '')}`,
          width: '100%',
          height: '100%',
          parentNode: jitsiContainerRef.current,
          userInfo: {
            displayName: 'Trưởng phòng NS (Admin)'
          },
          configOverwrite: {
            prejoinPageEnabled: false,
            startWithAudioMuted: false,
            startWithVideoMuted: false,
          },
          interfaceConfigOverwrite: {
            SHOW_JITSI_WATERMARK: false,
            SHOW_WATERMARK_FOR_GUESTS: false,
          }
        };
        jitsiApiRef.current = new window.JitsiMeetExternalAPI(domain, options);
      }
    }, 500);
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      streamRef.current = stream;

      // Apply initial mute state if any
      stream.getAudioTracks().forEach(track => track.enabled = !isMicMuted);
      stream.getVideoTracks().forEach(track => track.enabled = !isCamMuted);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
      toastError("Không thể truy cập Camera. Vui lòng kiểm tra quyền trình duyệt.");
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  const toggleMic = () => {
    const newState = !isMicMuted;
    setIsMicMuted(newState);

    // Toggle Jitsi
    if (jitsiApiRef.current) {
      jitsiApiRef.current.executeCommand('toggleAudio');
    }

    // Toggle Local Preview
    if (streamRef.current) {
      streamRef.current.getAudioTracks().forEach(track => {
        track.enabled = !newState;
      });
    }
  };

  const toggleCam = () => {
    const newState = !isCamMuted;
    setIsCamMuted(newState);

    // Toggle Jitsi
    if (jitsiApiRef.current) {
      jitsiApiRef.current.executeCommand('toggleVideo');
    }

    // Toggle Local Preview
    if (streamRef.current) {
      streamRef.current.getVideoTracks().forEach(track => {
        track.enabled = !newState;
      });
    }
  };

  const fetchCandidates = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/hr/candidates", { cache: "no-store" });
      if (!res.ok) throw new Error("Không thể tải danh sách ứng viên");
      const data = await res.json();
      const interviewCandidates = data.filter((c: any) =>
        ["Interviewing", "DeptApproved", "Hired"].includes(c.status)
      );
      setCandidates(interviewCandidates);
    } catch (err: any) {
      toastError(err.message);
    } finally {
      setLoading(false);
    }
  };


  const getParticipants = (jsonStr?: string): Participant[] => {
    if (!jsonStr) return [];
    try {
      return JSON.parse(jsonStr);
    } catch {
      return [];
    }
  };

  const getEmbedUrl = (url: string) => {
    if (!url) return "";
    // Xử lý link Google Drive
    if (url.includes("drive.google.com") || url.includes("docs.google.com")) {
      const match = url.match(/\/d\/([^\/]+)/) || url.match(/id=([^&]+)/);
      if (match && match[1]) {
        return `https://drive.google.com/file/d/${match[1]}/preview`;
      }
    }
    return url;
  };

  // --- TABLE COLUMNS ---
  const columns: TableColumn<Candidate>[] = [
    {
      header: "Ứng viên",
      width: "22%",
      render: (c) => (
        <div>
          <div className="fw-bold text-dark" style={{ fontSize: '0.85rem' }}>{c.name}</div>
          <div className="text-muted" style={{ fontSize: '10px', fontWeight: 600 }}>ID: {c.id.slice(-6).toUpperCase()}</div>
        </div>
      )
    },
    {
      header: "Vị trí",
      width: "20%",
      render: (c) => (
        <div>
          <div className="fw-bold text-dark" style={{ fontSize: '0.85rem' }}>{c.position}</div>
          <div className="text-muted" style={{ fontSize: '11px' }}>{c.request?.department}</div>
        </div>
      )
    },
    {
      header: "Lịch phỏng vấn",
      width: "18%",
      render: (c) => c.interviewDate ? (
        <div className="d-flex align-items-center gap-2">
          <div style={{ padding: '0px' }}>
            <div style={{ fontWeight: 700, color: "#1e293b", fontSize: '0.85rem' }}>
              {new Date(c.interviewDate).toLocaleDateString('vi-VN')}
            </div>
            <div style={{ fontSize: "10px", color: "#6366f1", fontWeight: 700 }}>
              {new Date(c.interviewDate).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        </div>
      ) : <span className="text-muted small italic" style={{ fontSize: '11px' }}>Chưa lên lịch</span>
    },
    {
      header: "Hội đồng",
      width: "12%",
      align: "center",
      render: (c) => {
        const participants = getParticipants(c.interviewParticipants);
        return (
          <div className="d-flex justify-content-center">
            {participants.slice(0, 3).map((p, i) => (
              <div key={i} style={{
                width: 24, height: 24, borderRadius: "50%", background: "#e2e8f0",
                border: "2px solid #fff", marginLeft: i === 0 ? 0 : -8,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "10px", fontWeight: 800, color: '#4f46e5'
              }}>
                {p.fullName.charAt(0)}
              </div>
            ))}
            {participants.length > 3 && (
              <div style={{
                width: 24, height: 24, borderRadius: "50%", background: "#4f46e5",
                color: "#fff", border: "2px solid #fff", marginLeft: -8,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "9px", fontWeight: 800
              }}>
                +{participants.length - 3}
              </div>
            )}
          </div>
        );
      }
    },
    {
      header: "Trạng thái",
      width: "13%",
      align: "center",
      render: (c) => {
        const isInterviewing = c.status === 'Interviewing';
        return (
          <span style={{
            padding: "4px 10px", borderRadius: "20px", fontSize: "10px", fontWeight: 800,
            background: isInterviewing ? '#e0e7ff' : '#fef3c7',
            color: isInterviewing ? '#4338ca' : '#92400e',
            border: '1px solid rgba(0,0,0,0.05)',
            display: 'inline-block',
            whiteSpace: 'nowrap'
          }}>
            {isInterviewing ? 'ĐANG PHỎNG VẤN' : 'CHỜ ĐẶT LỊCH'}
          </span>
        );
      }
    },
    {
      header: "Thao tác",
      width: "150px",
      align: "right",
      render: (c) => (
        <button
          onClick={() => setSelectedCandidate(c)}
          className={`btn btn-sm rounded-pill px-3 fw-bold shadow-sm ${c.interviewDate ? 'btn-primary' : 'btn-light text-muted'}`}
          style={{ fontSize: '11px', height: 28, minWidth: '100px' }}
          disabled={!c.interviewDate}
        >
          {c.interviewDate ? "Tham gia" : "Chờ lịch"}
        </button>
      )
    }
  ];

  const myInterviews = useMemo(() => {
    const userId = (session?.user as any)?.id;
    if (!userId) return candidates;

    return candidates.filter(c => {
      const participants = getParticipants(c.interviewParticipants);
      return participants.some(p => p.userId === userId && p.status === 'accepted');
    });
  }, [candidates, session]);

  const filteredCandidates = myInterviews.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.position.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "All" || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const bottomToolbar = (
    <div className="d-flex align-items-center justify-content-between w-100" style={{ minHeight: 32 }}>
      <div className="d-flex align-items-center gap-2">
        <div style={{ width: 300 }}>
          <SearchInput
            placeholder="Tìm kiếm ứng viên hoặc vị trí..."
            value={searchQuery}
            onChange={setSearchQuery}
            className="border-0 shadow-sm hover-bg-light transition-all h-100"
          />
        </div>
        <FilterBadgeGroup
          options={[
            { label: "Tất cả", value: "All", count: myInterviews.length },
            { label: "Chờ lịch", value: "DeptApproved", count: myInterviews.filter(c => c.status === "DeptApproved").length },
            { label: "Đang PV", value: "Interviewing", count: myInterviews.filter(c => c.status === "Interviewing").length },
            { label: "Đã trúng tuyển", value: "Hired", count: myInterviews.filter(c => c.status === "Hired").length },
          ]}
          value={statusFilter}
          onChange={setStatusFilter}
        />
      </div>
      <div className="d-flex align-items-center gap-3">
        <div className="text-muted small fw-medium">
          <i className="bi bi-info-circle me-1 text-primary opacity-75" />
          Tổng: {filteredCandidates.length} buổi phỏng vấn
        </div>
      </div>
    </div>
  );

  const renderWorkspace = () => {
    if (!selectedCandidate || !mounted) return null;
    const participants = getParticipants(selectedCandidate.interviewParticipants);

    return createPortal(
      <div style={{ position: "fixed", inset: 0, zIndex: 99999, display: "flex", flexDirection: "column", background: "#EBF0F5", fontFamily: "'Roboto Condensed', sans-serif" }}>
        {/* Workspace Navbar */}
        <div style={{ height: 64, background: "#fff", borderBottom: "1px solid #e2e8f0", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 24px", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <button
              onClick={() => setSelectedCandidate(null)}
              style={{ border: "none", background: "#f1f5f9", width: 40, height: 40, borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
            >
              <i className="bi bi-chevron-left" style={{ fontSize: "1.2rem", color: "#64748b" }} />
            </button>
            <div>
              <h5 style={{ margin: 0, fontWeight: 700, color: "#1e293b", fontSize: '1rem' }}>{selectedCandidate.name}</h5>
              <p style={{ margin: 0, fontSize: "0.75rem", color: "#64748b" }}>{selectedCandidate.position} • {selectedCandidate.request?.department}</p>
            </div>
          </div>

          <div style={{ display: "flex", background: "#f1f5f9", padding: "4px", borderRadius: "14px", gap: "2px" }}>
            {[
              { id: "info", label: "Nội dung phỏng vấn", icon: "bi-file-person" },
              { id: "scorecard", label: "Phiếu đánh giá", icon: "bi-clipboard-check" },
              ...(interviewMode === 'Online' ? [{ id: "video", label: "Phòng họp Online", icon: "bi-camera-video" }] : [])
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                style={{
                  padding: "8px 20px", border: "none", borderRadius: "10px", fontWeight: 700, fontSize: "0.85rem",
                  background: activeTab === tab.id ? "#fff" : "transparent",
                  color: activeTab === tab.id ? "#4f46e5" : "#64748b",
                  boxShadow: activeTab === tab.id ? "0 2px 8px rgba(0,0,0,0.05)" : "none",
                  cursor: "pointer", display: "flex", alignItems: "center", gap: "8px"
                }}
              >
                <i className={tab.icon} /> {tab.label}
              </button>
            ))}
          </div>

          <div style={{ display: "flex", gap: "12px" }}>
            <button
              onClick={handleTranscribe}
              disabled={!audioUrl}
              title={!audioUrl ? "Cần có bản ghi âm trước" : "Xem nội dung phỏng vấn"}
              className="btn btn-sm fw-bold px-3"
              style={{
                background: audioUrl ? 'linear-gradient(135deg, #4f46e5, #7c3aed)' : '#e2e8f0',
                color: audioUrl ? '#fff' : '#94a3b8',
                border: 'none',
                borderRadius: '10px',
                cursor: audioUrl ? 'pointer' : 'not-allowed',
                display: 'flex', alignItems: 'center', gap: '6px'
              }}
            >
              <i className="bi bi-journal-text" /> Nội dung phỏng vấn
            </button>
            <button className="btn btn-primary btn-sm fw-bold px-4 rounded-3 shadow-sm" onClick={async () => {
              try {
                const totalScore = scores.reduce((total, scoreIndex) => total + (scoreIndex + 1) * 4, 0);
                const payload = {
                  candidateId: selectedCandidate.id,
                  interviewerId: (session?.user as any)?.id || "user-system",
                  interviewTime: new Date().toISOString(),
                  interviewMode,
                  interviewLoc: interviewMode === 'Online' ? `https://meet.jit.si/LeeTechInterview_${selectedCandidate.id.replace(/-/g, '')}` : "Phòng họp trực tiếp",
                  interviewerRole: (session?.user as any)?.role || "Giám khảo",
                  interviewerDept: (session?.user as any)?.department || "Phòng Nhân sự",
                  scoreKnowledge: (scores[0] + 1) * 4,
                  scoreExperience: (scores[1] + 1) * 4,
                  scoreComm: (scores[2] + 1) * 4,
                  scoreRespons: (scores[3] + 1) * 4,
                  scoreTeamwork: (scores[4] + 1) * 4,
                  totalScore,
                  decision: hireStatus === 'hire' ? 'HIRE' : 'REJECT',
                  salarySuggest: hireStatus === 'hire' ? salarySuggest.replace(/\D/g, '') : null,
                  probationSuggest: hireStatus === 'hire' ? probationSuggest : null,
                  interviewerNote,
                  audioRecordUrl: audioUrl
                };
                const res = await fetch('/api/hr/interviews/scorecards', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(payload)
                });
                if (!res.ok) throw new Error("Không thể lưu kết quả phỏng vấn.");


                success("Đã hoàn tất phỏng vấn và lưu phiếu đánh giá!");
                setSelectedCandidate(null);
                fetchCandidates();
              } catch (e: any) {
                toastError(e.message);
              }
            }}>Hoàn thành</button>
          </div>
        </div>

        {/* Workspace Body */}
        <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
          <div style={{ flex: 1, overflowY: "auto", padding: "24px" }}>

            {activeTab === 'info' && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 400px", gap: "24px", height: "100%", minHeight: 600 }}>
                <div style={{ background: "#fff", borderRadius: "20px", border: "1px solid #e2e8f0", overflow: "hidden", display: "flex", flexDirection: "column", boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
                  <div style={{ padding: "14px 24px", background: "#f8fafc", borderBottom: "1px solid #e2e8f0", fontWeight: 700, fontSize: "0.75rem", color: "#64748b", textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    <i className="bi bi-file-earmark-pdf me-2" /> Hồ sơ ứng tuyển
                  </div>
                  <div style={{ flex: 1, display: "flex", position: "relative", background: "#f1f5f9" }}>
                    {selectedCandidate.cvUrl ? (
                      <>
                        <iframe
                          src={getEmbedUrl(selectedCandidate.cvUrl)}
                          style={{ width: "100%", height: "100%", border: "none" }}
                          title="CV Preview"
                        />
                        <a
                          href={selectedCandidate.cvUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="btn btn-sm btn-light shadow-sm"
                          style={{ position: "absolute", bottom: "20px", right: "20px", borderRadius: "10px", fontWeight: "bold" }}
                        >
                          <i className="bi bi-download me-2" /> Tải xuống CV
                        </a>
                      </>
                    ) : (
                      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <div style={{ textAlign: "center", color: "#94a3b8" }}>
                          <i className="bi bi-file-pdf" style={{ fontSize: "5rem", opacity: 0.2 }} />
                          <p className="mt-3 fw-medium">Ứng viên chưa tải lên CV bản mềm</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                  <div style={{ background: "#fff", borderRadius: "20px", border: "1px solid #e2e8f0", padding: "24px", boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
                    <h6 style={{ fontWeight: 800, fontSize: "0.7rem", color: "#e11d48", textTransform: "uppercase", marginBottom: "20px", display: 'flex', justifyContent: 'space-between' }}>
                      <span>BẢNG ĐIỀU KHIỂN GHI ÂM</span>
                      {recordingStatus === 'recording' && <span style={{ color: '#e11d48', display: 'flex', alignItems: 'center', gap: '6px' }}><div style={{ width: 8, height: 8, borderRadius: '50%', background: '#e11d48', animation: 'pulse 1.5s infinite' }} /> Đang thu</span>}
                      {recordingStatus === 'paused' && <span style={{ color: '#f59e0b' }}>Tạm dừng</span>}
                      {recordingStatus === 'stopped' && <span style={{ color: '#16a34a' }}>Đã hoàn tất</span>}
                    </h6>

                    <div style={{ textAlign: "center", padding: "20px 0" }}>
                      <div style={{ fontSize: "2.5rem", fontWeight: 300, color: recordingStatus === 'recording' ? "#e11d48" : "#334155", fontFamily: "monospace" }}>
                        {formatTime(recordingTime)}
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
                      {recordingStatus === 'idle' && (
                        <button onClick={startRecording} className="btn btn-danger rounded-pill px-4 fw-bold" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <i className="bi bi-mic-fill" /> Bắt đầu ghi âm
                        </button>
                      )}

                      {(recordingStatus === 'recording' || recordingStatus === 'paused') && (
                        <>
                          {recordingStatus === 'recording' ? (
                            <button onClick={pauseRecording} className="btn btn-outline-warning rounded-pill px-4 fw-bold" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <i className="bi bi-pause-fill" /> Tạm dừng
                            </button>
                          ) : (
                            <button onClick={resumeRecording} className="btn btn-outline-primary rounded-pill px-4 fw-bold" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <i className="bi bi-play-fill" /> Tiếp tục
                            </button>
                          )}
                          <button onClick={stopRecording} className="btn btn-danger rounded-pill px-4 fw-bold" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <i className="bi bi-stop-fill" /> Kết thúc
                          </button>
                        </>
                      )}

                      {recordingStatus === 'stopped' && (
                        <div style={{ width: '100%' }}>
                          {audioUrl ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                              <div style={{ padding: '12px', background: '#ecfdf5', borderRadius: '12px', color: '#047857', fontSize: '0.85rem', fontWeight: 600, textAlign: 'center' }}>
                                <i className="bi bi-check-circle-fill me-2" />
                                Bản ghi đã sẵn sàng để gửi lên AI!
                              </div>
                              <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                                <button
                                  onClick={() => { setAudioUrl(null); setRecordingStatus('idle'); setRecordingTime(0); }}
                                  className="btn btn-outline-danger btn-sm fw-bold flex-fill"
                                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', borderRadius: '10px' }}
                                >
                                  <i className="bi bi-trash3" /> Xoá
                                </button>
                                <audio ref={audioPlayerRef} src={audioUrl} style={{ display: 'none' }} />
                                <button
                                  onClick={() => {
                                    if (audioPlayerRef.current) {
                                      audioPlayerRef.current.paused ? audioPlayerRef.current.play() : audioPlayerRef.current.pause();
                                    }
                                  }}
                                  className="btn btn-outline-primary btn-sm fw-bold flex-fill"
                                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', borderRadius: '10px' }}
                                >
                                  <i className="bi bi-play-circle" /> Nghe
                                </button>
                                <button
                                  onClick={() => { setAudioUrl(null); setRecordingStatus('idle'); setRecordingTime(0); audioChunksRef.current = []; }}
                                  className="btn btn-outline-secondary btn-sm fw-bold flex-fill"
                                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', borderRadius: '10px' }}
                                >
                                  <i className="bi bi-arrow-counterclockwise" /> Ghi lại
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div style={{ padding: '12px', background: '#f1f5f9', borderRadius: '12px', color: '#64748b', fontSize: '0.85rem', fontWeight: 600, textAlign: 'center' }}>
                              <div className="spinner-border spinner-border-sm me-2" role="status"></div>
                              Đang nén và lưu trữ...
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Pulse Animation Definition */}
                    <style>{`
                        @keyframes pulse {
                          0% { box-shadow: 0 0 0 0 rgba(225, 29, 72, 0.4); }
                          70% { box-shadow: 0 0 0 6px rgba(225, 29, 72, 0); }
                          100% { box-shadow: 0 0 0 0 rgba(225, 29, 72, 0); }
                        }
                      `}</style>
                  </div>
                  <div style={{ flex: 1, background: "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)", borderRadius: "20px", padding: "24px", color: '#fff', boxShadow: '0 8px 24px rgba(79, 70, 229, 0.2)', display: "flex", flexDirection: "column", overflow: "hidden" }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: "16px" }}>
                      <h6 style={{ margin: 0, fontWeight: 800, fontSize: "0.75rem", color: "rgba(255,255,255,0.9)", textTransform: "uppercase", letterSpacing: "0.05em" }}>GỢI Ý NỘI DUNG PHỎNG VẤN</h6>
                      <button
                        onClick={generateNewQuestion}
                        disabled={generatedQuestion.q === "Đã hỏi hết câu hỏi chuyên sâu cho phần này."}
                        style={{ background: generatedQuestion.q === "Đã hỏi hết câu hỏi chuyên sâu cho phần này." ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.2)', color: generatedQuestion.q === "Đã hỏi hết câu hỏi chuyên sâu cho phần này." ? 'rgba(255,255,255,0.5)' : '#fff', border: 'none', padding: '6px 12px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 700, cursor: generatedQuestion.q === "Đã hỏi hết câu hỏi chuyên sâu cho phần này." ? 'not-allowed' : 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '6px' }}
                      >
                        Tiếp tục <i className="bi bi-arrow-right" />
                      </button>
                    </div>

                    <div style={{ position: 'relative', marginBottom: "16px" }}>
                      <select
                        value={selectedCriterion}
                        onChange={(e) => setSelectedCriterion(e.target.value)}
                        style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.1)', color: '#fff', outline: 'none', fontSize: '0.85rem', fontWeight: 700, appearance: 'none', cursor: 'pointer', backdropFilter: 'blur(5px)' }}
                      >
                        <option value="1. Kiến thức chuyên môn" style={{ color: '#1e293b' }}>1. Kiến thức chuyên môn</option>
                        <option value="2. Kinh nghiệm làm việc" style={{ color: '#1e293b' }}>2. Kinh nghiệm làm việc</option>
                        <option value="3. Kỹ năng giao tiếp" style={{ color: '#1e293b' }}>3. Kỹ năng giao tiếp</option>
                        <option value="4. Tính trách nhiệm" style={{ color: '#1e293b' }}>4. Tính trách nhiệm</option>
                        <option value="5. Khả năng làm việc nhóm" style={{ color: '#1e293b' }}>5. Khả năng làm việc nhóm</option>
                      </select>
                      <i className="bi bi-chevron-down" style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', color: '#fff', pointerEvents: 'none', fontSize: '0.9rem' }} />
                    </div>

                    <div style={{ flex: 1, overflowY: 'auto', display: "flex", flexDirection: "column", gap: "16px", paddingRight: '8px' }}>
                      <div style={{ background: "rgba(255,255,255,0.1)", padding: "16px", borderRadius: "16px", border: "1px solid rgba(255,255,255,0.2)", fontSize: "0.85rem", lineHeight: 1.6 }}>
                        <i className="bi bi-stars me-2 text-warning" />
                        Hệ thống AI tự động đề xuất các câu hỏi chuyên sâu xoáy vào <strong>{selectedCriterion.substring(3)}</strong> để kiểm tra kỹ năng của ứng viên.
                      </div>

                      <AnimatePresence mode="wait">
                        {generatedQuestion.q && (
                          <motion.div
                            key={generatedQuestion.q}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.2 }}
                            style={{ background: "rgba(0,0,0,0.15)", padding: "16px", borderRadius: "16px", border: "1px solid rgba(0,0,0,0.1)" }}
                          >
                            <div style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: '12px', color: '#fbbf24', lineHeight: 1.4 }}>
                              <i className="bi bi-chat-right-quote-fill me-2 opacity-75" /> {generatedQuestion.q}
                            </div>
                            <div style={{ fontSize: '0.85rem', opacity: 0.9, lineHeight: 1.5, background: 'rgba(255,255,255,0.05)', padding: '12px', borderRadius: '10px' }}>
                              <span style={{ fontWeight: 800, color: '#a78bfa', display: 'block', marginBottom: '4px' }}><i className="bi bi-check2-circle me-1" /> Đáp án kỳ vọng:</span> {generatedQuestion.a}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'scorecard' && (
              <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: "24px", height: "100%" }}>
                {/* SIDEBAR */}
                <div style={{ background: "#fff", borderRadius: "24px", border: "1px solid #e2e8f0", padding: "24px", display: "flex", flexDirection: "column", gap: "24px", overflowY: "auto", boxShadow: '0 4px 20px rgba(0,0,0,0.02)' }}>
                  {/* Candidate Summary */}
                  <div style={{ textAlign: "center", paddingBottom: "24px", borderBottom: "1px dashed #e2e8f0" }}>
                    <div style={{ width: 80, height: 80, borderRadius: "24px", background: "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: '2rem', margin: "0 auto 16px" }}>
                      {selectedCandidate.name.charAt(0)}
                    </div>
                    <h5 style={{ fontWeight: 800, color: "#1e293b", margin: "0 0 4px" }}>{selectedCandidate.name}</h5>
                    <div style={{ fontSize: "0.85rem", color: "#64748b", fontWeight: 600 }}>{selectedCandidate.position}</div>
                    <div style={{ fontSize: "0.75rem", color: "#94a3b8", marginTop: "4px" }}>{selectedCandidate.request?.department}</div>
                  </div>

                  {/* Interview Info */}
                  <div>
                    <h6 style={{ fontWeight: 800, fontSize: "0.7rem", color: "#94a3b8", textTransform: "uppercase", marginBottom: "12px", letterSpacing: "0.05em" }}>THÔNG TIN BUỔI PHỎNG VẤN</h6>
                    <div style={{ background: "#f8fafc", padding: "16px", borderRadius: "16px", display: "flex", flexDirection: "column", gap: "12px" }}>
                      <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
                        <i className="bi bi-calendar-event text-indigo" style={{ fontSize: "1.1rem" }} />
                        <div>
                          <div style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 600 }}>Thời gian</div>
                          <div style={{ fontSize: "0.85rem", color: "#1e293b", fontWeight: 700 }}>
                            {selectedCandidate.interviewDate ? new Date(selectedCandidate.interviewDate).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' }) : 'Chưa xếp lịch'}
                          </div>
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                        <i className="bi bi-geo-alt text-indigo" style={{ fontSize: "1.1rem" }} />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 600, marginBottom: "4px" }}>Hình thức</div>
                          <div style={{ display: 'flex', gap: '4px', background: '#e2e8f0', padding: '4px', borderRadius: '8px' }}>
                            <button onClick={() => setInterviewMode('Offline')} style={{ flex: 1, padding: '6px', borderRadius: '6px', border: 'none', background: interviewMode === 'Offline' ? '#fff' : 'transparent', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', boxShadow: interviewMode === 'Offline' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', color: interviewMode === 'Offline' ? '#1e293b' : '#64748b', transition: 'all 0.2s' }}>Offline</button>
                            <button onClick={() => setInterviewMode('Online')} style={{ flex: 1, padding: '6px', borderRadius: '6px', border: 'none', background: interviewMode === 'Online' ? '#fff' : 'transparent', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', boxShadow: interviewMode === 'Online' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', color: interviewMode === 'Online' ? '#4f46e5' : '#64748b', transition: 'all 0.2s' }}>Online</button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Interviewers */}
                  <div>
                    <h6 style={{ fontWeight: 800, fontSize: "0.7rem", color: "#94a3b8", textTransform: "uppercase", marginBottom: "12px", letterSpacing: "0.05em" }}>HỘI ĐỒNG ĐÁNH GIÁ</h6>
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                      {participants.length > 0 ? participants.map((p, i) => (
                        <div key={i} style={{ background: i === 0 ? "#f0fdfa" : "#f8fafc", border: `1px solid ${i === 0 ? '#ccfbf1' : '#e2e8f0'}`, padding: "10px 14px", borderRadius: "12px" }}>
                          <div style={{ fontSize: "0.65rem", color: i === 0 ? "#0f766e" : "#475569", fontWeight: 800, marginBottom: "2px", textTransform: 'uppercase' }}>{i === 0 ? 'TRƯỞNG HỘI ĐỒNG' : 'THÀNH VIÊN'}</div>
                          <div style={{ fontSize: "0.85rem", color: i === 0 ? "#134e4a" : "#1e293b", fontWeight: 700 }}>{p.fullName}</div>
                        </div>
                      )) : (
                        <div style={{ fontSize: '0.8rem', color: '#64748b', fontStyle: 'italic' }}>Chưa có thành viên</div>
                      )}
                    </div>
                  </div>
                </div>

                {/* MAIN SCORECARD */}
                <div style={{ background: "#fff", borderRadius: "24px", border: "1px solid #e2e8f0", overflowY: "auto", boxShadow: '0 4px 20px rgba(0,0,0,0.02)', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ padding: "24px 32px", borderBottom: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center", position: "sticky", top: 0, background: "rgba(255,255,255,0.9)", backdropFilter: "blur(10px)", zIndex: 10 }}>
                    <div>
                      <h4 style={{ margin: 0, fontWeight: 800, color: "#1e293b" }}>Kết quả đánh giá ứng viên</h4>
                      <div style={{ fontSize: "0.85rem", color: "#64748b", marginTop: "4px" }}>Đánh giá theo chuẩn khung năng lực của vị trí {selectedCandidate.position}</div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
                        <span style={{ fontSize: "0.7rem", fontWeight: 800, color: "#94a3b8", textTransform: "uppercase" }}>TỔNG ĐIỂM ĐÁNH GIÁ</span>
                        <div style={{ fontSize: "1.5rem", fontWeight: 900, color: calculateTotalScore() >= 80 ? "#10b981" : calculateTotalScore() >= 60 ? "#4f46e5" : "#f59e0b" }}>
                          {calculateTotalScore()}<span style={{ fontSize: "1rem", color: "#94a3b8", fontWeight: 600 }}>/100</span>
                        </div>
                      </div>
                      <button
                        onClick={handleTranscribe}
                        disabled={!audioUrl}
                        title={!audioUrl ? "Cần có bản ghi âm trước" : "Xem nội dung phỏng vấn"}
                        style={{
                          padding: "8px 16px",
                          background: audioUrl ? 'linear-gradient(135deg, #4f46e5, #7c3aed)' : '#eef2ff',
                          color: audioUrl ? '#fff' : '#94a3b8',
                          borderRadius: "10px",
                          border: 'none',
                          fontSize: "0.8rem",
                          fontWeight: 700,
                          cursor: audioUrl ? 'pointer' : 'not-allowed',
                          display: 'flex', alignItems: 'center', gap: '6px',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        <i className="bi bi-journal-text" /> Nội dung phỏng vấn
                      </button>
                    </div>
                  </div>

                  <div style={{ padding: "20px 32px 32px" }}>
                    {/* Criteria Table */}
                    <div style={{ marginBottom: "24px" }}>
                      <table style={{ width: "100%", borderCollapse: 'collapse' }}>
                        <thead>
                          <tr>
                            <th style={{ padding: '0 0 12px 0', textAlign: 'left', fontSize: '0.75rem', color: '#94a3b8', fontWeight: 800, textTransform: 'uppercase', borderBottom: '2px solid #f1f5f9' }}>TIÊU CHUẨN ĐÁNH GIÁ</th>
                            <th style={{ padding: '0 0 12px 0', textAlign: 'right', fontSize: '0.75rem', color: '#94a3b8', fontWeight: 800, textTransform: 'uppercase', borderBottom: '2px solid #f1f5f9' }}>MỨC ĐỘ ĐÁNH GIÁ</th>
                          </tr>
                        </thead>
                        <tbody>
                          <RatingRow label="1. Kiến thức chuyên môn" value={scores[0]} onChange={(val) => handleScoreChange(0, val)} />
                          <RatingRow label="2. Kinh nghiệm làm việc" value={scores[1]} onChange={(val) => handleScoreChange(1, val)} />
                          <RatingRow label="3. Kỹ năng giao tiếp" value={scores[2]} onChange={(val) => handleScoreChange(2, val)} />
                          <RatingRow label="4. Tính trách nhiệm" value={scores[3]} onChange={(val) => handleScoreChange(3, val)} />
                          <RatingRow label="5. Khả năng làm việc nhóm" value={scores[4]} onChange={(val) => handleScoreChange(4, val)} />
                        </tbody>
                      </table>
                    </div>

                    {/* Additional Questions */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                      <div>
                        <label style={{ display: 'block', fontWeight: 700, marginBottom: '8px', fontSize: '0.85rem', color: '#334155' }}>Lý do nghỉ việc chỗ cũ</label>
                        <input type="text" style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #e2e8f0', background: '#f8fafc', fontSize: '0.9rem', outline: 'none' }} placeholder="Ghi chú lý do..." />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontWeight: 700, marginBottom: '8px', fontSize: '0.85rem', color: '#334155' }}>Ngày có thể nhận việc</label>
                        <input type="date" style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #e2e8f0', background: '#f8fafc', fontSize: '0.9rem', outline: 'none' }} />
                      </div>
                    </div>

                    {/* General Comment */}
                    <div style={{ marginBottom: "24px" }}>
                      <label style={{ display: "block", fontWeight: 700, marginBottom: "8px", fontSize: '0.85rem', color: '#334155' }}>Nhận xét chung</label>
                      <textarea value={interviewerNote} onChange={(e) => setInterviewerNote(e.target.value)} style={{ width: "100%", minHeight: 80, padding: "12px 14px", borderRadius: "10px", border: "1px solid #e2e8f0", background: '#f8fafc', resize: 'vertical', fontSize: '0.9rem', outline: 'none' }} placeholder="Đánh giá tổng quan về thái độ, sự phù hợp với văn hóa công ty..."></textarea>
                    </div>

                    {/* Conclusion Section */}
                    <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '20px', border: '1px solid #e2e8f0' }}>
                      <h6 style={{ fontWeight: 800, color: '#1e293b', marginBottom: '16px', fontSize: '0.95rem' }}>KẾT LUẬN CUỐI CÙNG</h6>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                        <div>
                          <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
                            <label onClick={() => setHireStatus('hire')} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', background: hireStatus === 'hire' ? '#fff' : '#f1f5f9', padding: '10px', borderRadius: '10px', cursor: 'pointer', border: hireStatus === 'hire' ? '2px solid #10b981' : '1px solid #e2e8f0', color: hireStatus === 'hire' ? '#10b981' : '#64748b', boxShadow: hireStatus === 'hire' ? '0 2px 8px rgba(16,185,129,0.1)' : 'none', transition: 'all 0.2s' }}>
                              <input type="radio" name="hire_status" checked={hireStatus === 'hire'} readOnly style={{ display: 'none' }} /> <strong style={{ fontSize: '0.85rem' }}>Tuyển dụng</strong>
                            </label>
                            <label onClick={() => setHireStatus('reject')} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', background: hireStatus === 'reject' ? '#fff' : '#f1f5f9', padding: '10px', borderRadius: '10px', cursor: 'pointer', border: hireStatus === 'reject' ? '2px solid #ef4444' : '1px solid #e2e8f0', color: hireStatus === 'reject' ? '#ef4444' : '#64748b', boxShadow: hireStatus === 'reject' ? '0 2px 8px rgba(239,68,68,0.1)' : 'none', transition: 'all 0.2s' }}>
                              <input type="radio" name="hire_status" checked={hireStatus === 'reject'} readOnly style={{ display: 'none' }} /> <strong style={{ fontSize: '0.85rem' }}>Không đạt</strong>
                            </label>
                          </div>

                          <div style={{ display: 'flex', gap: '16px', alignItems: 'center', background: '#fff', padding: '10px 16px', borderRadius: '10px', border: '1px solid #e2e8f0', opacity: hireStatus === 'reject' ? 0.4 : 1, pointerEvents: hireStatus === 'reject' ? 'none' : 'auto', transition: 'all 0.2s' }}>
                            <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 700 }}>THỬ VIỆC:</span>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', cursor: 'pointer' }}><input type="radio" name="probation" checked={probationSuggest === "30 ngày"} onChange={() => setProbationSuggest("30 ngày")} /> 30 ngày</label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', cursor: 'pointer' }}><input type="radio" name="probation" checked={probationSuggest === "60 ngày"} onChange={() => setProbationSuggest("60 ngày")} /> 60 ngày</label>
                          </div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', opacity: hireStatus === 'reject' ? 0.4 : 1, pointerEvents: hireStatus === 'reject' ? 'none' : 'auto', transition: 'all 0.2s' }}>
                          <div style={{ display: 'flex', alignItems: 'center', background: '#fff', borderRadius: '10px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                            <div style={{ padding: '0 12px', color: '#64748b', fontSize: '0.7rem', fontWeight: 800, background: '#f1f5f9', height: '100%', display: 'flex', alignItems: 'center', alignSelf: 'stretch' }}>LƯƠNG ĐỀ XUẤT</div>
                            <input type="text" value={salarySuggest ? Number(salarySuggest).toLocaleString('en-US') : ""} onChange={(e) => setSalarySuggest(e.target.value.replace(/\D/g, ''))} style={{ flex: 1, padding: '10px', border: 'none', textAlign: 'right', fontWeight: 700, outline: 'none', fontSize: '0.9rem' }} placeholder="Nhập số tiền (VND)" />
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', background: '#fff', borderRadius: '10px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                            <div style={{ padding: '0 12px', color: '#64748b', fontSize: '0.7rem', fontWeight: 800, background: '#f1f5f9', height: '100%', display: 'flex', alignItems: 'center', alignSelf: 'stretch' }}>PHÂN LOẠI</div>
                            <select style={{ flex: 1, padding: '10px', border: 'none', background: 'transparent', outline: 'none', fontSize: '0.9rem', fontWeight: 600, color: '#1e293b' }}>
                              <option>Ứng viên tiềm năng</option>
                              <option>Nhân sự dự phòng</option>
                              <option>Cần đào tạo thêm</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'video' && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: "24px", height: "100%", minHeight: 600 }}>
                <div ref={jitsiContainerRef} style={{ background: "#0f172a", borderRadius: "32px", position: "relative", display: "flex", alignItems: "center", justifyContent: "center", overflow: 'hidden', boxShadow: '0 20px 50px rgba(0,0,0,0.2)' }}>
                  {!window.JitsiMeetExternalAPI && (
                    <div style={{ color: '#fff', textAlign: 'center' }}>
                      <div className="spinner-border text-primary mb-3" />
                      <p>Đang khởi tạo nền tảng Video...</p>
                    </div>
                  )}

                  <motion.div
                    drag
                    dragConstraints={jitsiContainerRef}
                    dragMomentum={false}
                    whileDrag={{ cursor: 'grabbing', scale: 1.05, boxShadow: '0 10px 25px rgba(0,0,0,0.3)' }}
                    style={{ position: "absolute", top: 30, left: 30, background: "rgba(0,0,0,0.6)", padding: "10px 20px", borderRadius: "16px", color: "#fff", backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.1)', cursor: 'grab', zIndex: 10 }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                      <i className="bi bi-arrows-move" style={{ opacity: 0.6, fontSize: '0.8rem' }} />
                      <span style={{ fontSize: '1rem', fontWeight: 700 }}>{selectedCandidate.name}</span>
                    </div>
                    <div style={{ fontSize: '0.75rem', opacity: 0.7, paddingLeft: '24px' }}>Ứng viên phỏng vấn</div>
                  </motion.div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                  <div style={{ flex: 1, background: "#1e293b", borderRadius: "24px", border: "2px solid #4f46e5", position: "relative", overflow: 'hidden' }}>
                    <video ref={videoRef} autoPlay playsInline muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <div style={{ position: "absolute", bottom: 15, left: 15, color: "#fff", fontSize: "0.75rem", background: "rgba(0,0,0,0.6)", padding: "4px 10px", borderRadius: "8px", fontWeight: 700 }}>Bạn (Cao Thị Phương)</div>
                  </div>

                  <div style={{ background: "#fff", padding: "20px", borderRadius: "28px", border: "1px solid #e2e8f0", display: "flex", justifyContent: "center", gap: "16px", boxShadow: '0 10px 25px rgba(0,0,0,0.05)' }}>
                    <button
                      onClick={toggleMic}
                      style={{ width: 50, height: 50, borderRadius: "50%", border: "none", background: isMicMuted ? "#fee2e2" : "#f1f5f9", color: isMicMuted ? "#ef4444" : "#1e293b", display: "flex", alignItems: "center", justifyContent: "center", cursor: 'pointer', transition: 'all 0.2s' }}
                      title="Tắt/Mở Mic"
                    >
                      <i className={`bi ${isMicMuted ? 'bi-mic-mute-fill' : 'bi-mic-fill'}`} style={{ fontSize: '1.2rem' }} />
                    </button>
                    <button
                      onClick={toggleCam}
                      style={{ width: 50, height: 50, borderRadius: "50%", border: "none", background: isCamMuted ? "#fee2e2" : "#f1f5f9", color: isCamMuted ? "#ef4444" : "#1e293b", display: "flex", alignItems: "center", justifyContent: "center", cursor: 'pointer', transition: 'all 0.2s' }}
                      title="Tắt/Mở Camera"
                    >
                      <i className={`bi ${isCamMuted ? 'bi-camera-video-off-fill' : 'bi-camera-video-fill'}`} style={{ fontSize: '1.2rem' }} />
                    </button>
                    <button style={{ width: 50, height: 50, borderRadius: "50%", border: "none", background: "#ef4444", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: 'pointer', boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)' }} onClick={() => setActiveTab('info')} title="Kết thúc cuộc gọi"><i className="bi bi-telephone-x-fill" style={{ fontSize: '1.2rem' }} /></button>
                  </div>

                  <div style={{ padding: '20px', background: '#fff', borderRadius: '24px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <h6 style={{ fontWeight: 800, fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', margin: 0 }}>QUẢN TRỊ CUỘC HỌP</h6>
                    <button
                      onClick={() => {
                        const roomUrl = `https://meet.jit.si/LeeTechInterview_${selectedCandidate.id.replace(/-/g, '')}`;
                        navigator.clipboard.writeText(roomUrl);
                        success("Đã sao chép link phỏng vấn. Hãy gửi cho ứng viên qua Zalo!");
                      }}
                      style={{ width: '100%', padding: '10px', borderRadius: '12px', border: '1px solid #4f46e5', background: '#eef2ff', color: '#4f46e5', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                    >
                      <i className="bi bi-link-45deg" /> Sao chép link gửi Zalo
                    </button>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', textAlign: 'center' }}>
                      Ứng viên vào thẳng, không cần duyệt.
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>,
      document.body
    );
  };

  const RatingRow = ({ label, value, onChange }: { label: string, value: number, onChange: (val: number) => void }) => {
    return (
      <tr style={{ borderBottom: '1px dashed #e2e8f0' }}>
        <td style={{ padding: '12px 0', fontSize: '0.9rem', fontWeight: 600, color: '#334155' }}>{label}</td>
        <td style={{ padding: '12px 0', textAlign: 'right' }}>
          <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
            {['Yếu', 'Trung bình', 'Khá', 'Tốt', 'Xuất sắc'].map((v, i) => (
              <button
                key={i}
                onClick={() => onChange(i)}
                style={{
                  padding: '8px 16px', border: i === value ? 'none' : '1px solid #e2e8f0', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 700,
                  background: i === value ? '#4f46e5' : '#fff',
                  color: i === value ? '#fff' : '#64748b',
                  cursor: 'pointer', transition: 'all 0.2s',
                  boxShadow: i === value ? '0 4px 10px rgba(79,70,229,0.2)' : 'none'
                }}>{v}</button>
            ))}
          </div>
        </td>
      </tr>
    );
  };

  return (
    <>
      <StandardPage
        title="Phỏng vấn ứng viên"
        description="Số hóa quy trình đánh giá và phỏng vấn tập trung"
        icon="bi-chat-quote"
        color="violet"
        useCard={false}
      >
        <WorkflowCard
          bottomToolbar={bottomToolbar}
          contentPadding="p-0"
        >
          <Table
            rows={filteredCandidates}
            columns={columns}
            loading={loading}
            rowKey={(c) => c.id}
            fontSize={13}
            striped
            compact
          />
        </WorkflowCard>
      </StandardPage>

      {selectedCandidate && renderWorkspace()}

      {/* Transcript Offcanvas */}
      {mounted && showTranscriptPanel && createPortal(
        <>
          {/* Backdrop */}
          <div
            onClick={() => setShowTranscriptPanel(false)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.3)', zIndex: 100001, backdropFilter: 'blur(2px)' }}
          />
          {/* Panel */}
          <div style={{
            position: 'fixed', top: 0, right: 0, bottom: 0, width: 400,
            background: '#fff', zIndex: 100002, display: 'flex', flexDirection: 'column',
            boxShadow: '-8px 0 40px rgba(15,23,42,0.15)'
          }}>
            {/* Header */}
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h5 style={{ margin: 0, fontWeight: 800, fontSize: '1rem', color: '#1e293b' }}>
                  <i className="bi bi-journal-text me-2" style={{ color: '#4f46e5' }} />
                  Nội dung phỏng vấn
                </h5>
                <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
                  Được chuyển đổi từ bản ghi âm bằng Groq Whisper AI
                </p>
              </div>
              <button
                onClick={() => setShowTranscriptPanel(false)}
                style={{ background: 'none', border: 'none', fontSize: '1.2rem', color: '#64748b', cursor: 'pointer', padding: '4px 8px', borderRadius: '8px' }}
              >
                <i className="bi bi-x-lg" />
              </button>
            </div>

            {/* Body */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
              {isTranscribing ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '16px', color: '#64748b' }}>
                  <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#ede9fe', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div className="spinner-border text-primary" style={{ width: '1.5rem', height: '1.5rem' }} role="status" />
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <p style={{ fontWeight: 700, color: '#1e293b', margin: 0 }}>Đang phân tích giọng nói...</p>
                    <p style={{ fontSize: '0.8rem', margin: '4px 0 0' }}>Groq Whisper đang xử lý bản ghi âm</p>
                  </div>
                </div>
              ) : transcript ? (
                <div>
                  <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '16px' }}>
                    <p style={{ fontSize: '0.7rem', fontWeight: 700, color: '#4f46e5', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 8px' }}>
                      <i className="bi bi-file-earmark-text me-1" /> Nội dung hội thoại
                    </p>
                    <p style={{ margin: 0, fontSize: '0.9rem', lineHeight: 1.7, color: '#334155', whiteSpace: 'pre-wrap' }}>
                      {transcript}
                    </p>
                  </div>
                  <button
                    onClick={() => { setTranscript(null); handleTranscribe(); }}
                    className="btn btn-outline-primary btn-sm w-100 fw-bold"
                    style={{ borderRadius: '10px' }}
                  >
                    <i className="bi bi-arrow-repeat me-2" /> Phân tích lại
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </>,
        document.body
      )}
    </>
  );
}
