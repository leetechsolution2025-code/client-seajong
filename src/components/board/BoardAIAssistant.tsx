"use client";
import React, { useState, useRef, useEffect } from "react";
import { useToast } from "@/components/ui/Toast";

interface Message {
  id: number;
  role: "user" | "assistant";
  content: string;
  loading?: boolean;
}

const ACCENT    = "#6366f1";
const ACCENT2   = "#8b5cf6";
const ACCENT_BG = "rgba(99,102,241,0.07)";
const ACCENT_BORDER = "rgba(99,102,241,0.25)";

const SUGGESTED_QUESTIONS = [
  "Tóm tắt tình hình kinh doanh hiện tại",
  "Hợp đồng nào đang chậm tiến độ?",
  "Win rate báo giá đang ở mức bao nhiêu?",
  "Tổng công nợ hợp đồng hiện là bao nhiêu?",
];

// ── Simple inline markdown renderer ──────────────────────────────────────────
function renderMarkdown(text: string): React.ReactNode[] {
  const lines = text.split("\n");
  return lines.map((line, li) => {
    const isBullet = /^[*-] /.test(line);
    const lineText = isBullet ? line.slice(2) : line;
    const parts = lineText.split(/\*\*(.*?)\*\*/g);
    const inlineNodes: React.ReactNode[] = parts.map((part, pi) =>
      pi % 2 === 1
        ? <strong key={pi} style={{ fontWeight: 700, color: ACCENT }}>{part}</strong>
        : part
    );
    if (isBullet) {
      return (
        <div key={li} style={{ display: "flex", gap: 8, marginTop: li === 0 ? 0 : 5 }}>
          <span style={{ color: ACCENT, fontWeight: 800, flexShrink: 0 }}>•</span>
          <span>{inlineNodes}</span>
        </div>
      );
    }
    if (line === "") return <div key={li} style={{ height: 5 }} />;
    return <div key={li} style={{ marginTop: li === 0 ? 0 : 3 }}>{inlineNodes}</div>;
  });
}

export function BoardAIAssistant() {
  const { error: toastError, success: toastSuccess } = useToast();
  const [open, setOpen]       = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput]     = useState("");
  const [loading, setLoading] = useState(false);
  const [idCounter, setIdCounter] = useState(1);
  const [closing, setClosing] = useState(false);
  
  const [isAudioEnabled, setIsAudioEnabled] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [currentlySpeakingId, setCurrentlySpeakingId] = useState<number | null>(null);
  const [isContinuousVoiceMode, setIsContinuousVoiceMode] = useState(false);

  const [isMobile, setIsMobile] = useState(false);
  const [viewportHeight, setViewportHeight] = useState<number | null>(null);
  const [viewportOffsetBottom, setViewportOffsetBottom] = useState(0);

  // ElevenLabs configurations
  const [showSettings, setShowSettings] = useState(false);
  const [useElevenLabs, setUseElevenLabs] = useState(false);
  const [elApiKey, setElApiKey] = useState("");
  const [elVoiceId, setElVoiceId] = useState("21m00Tcm4TlvDq8ikWAM");
  const [voiceSource, setVoiceSource] = useState<"preset" | "custom">("preset");
  const [customVoiceId, setCustomVoiceId] = useState("");
  const [apiVoices, setApiVoices] = useState<any[]>([]);
  const [isLoadingVoices, setIsLoadingVoices] = useState(false);
  const activeAudioRef = useRef<HTMLAudioElement | null>(null);

  // Drag-and-drop position offset for the floating button (FAB)
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const dragStartRef = useRef<{ clientX: number; clientY: number; offsetX: number; offsetY: number } | null>(null);
  const hasMovedRef = useRef<boolean>(false);

  const handleStart = (clientX: number, clientY: number) => {
    dragStartRef.current = {
      clientX,
      clientY,
      offsetX: offset.x,
      offsetY: offset.y
    };
    hasMovedRef.current = false;
  };

  const handleMove = (clientX: number, clientY: number) => {
    if (!dragStartRef.current) return;
    const dx = clientX - dragStartRef.current.clientX;
    const dy = clientY - dragStartRef.current.clientY;

    if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
      hasMovedRef.current = true;
    }

    let newOffsetX = dragStartRef.current.offsetX - dx;
    let newOffsetY = dragStartRef.current.offsetY - dy;

    // Apply viewport boundaries
    if (typeof window !== "undefined") {
      const padding = 24;
      const btnSize = 56;
      
      const maxOffsetX = window.innerWidth - btnSize - padding * 2;
      const minOffsetX = 0;
      const maxOffsetY = window.innerHeight - btnSize - padding * 2;
      const minOffsetY = 0;

      newOffsetX = Math.max(minOffsetX, Math.min(maxOffsetX, newOffsetX));
      newOffsetY = Math.max(minOffsetY, Math.min(maxOffsetY, newOffsetY));
    }

    setOffset({ x: newOffsetX, y: newOffsetY });
  };

  const handleEnd = () => {
    if (!dragStartRef.current) return;
    dragStartRef.current = null;
    if (!hasMovedRef.current) {
      setOpen(true);
    }
  };

  const onMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    handleStart(e.clientX, e.clientY);

    const onMouseMove = (moveEvent: MouseEvent) => {
      handleMove(moveEvent.clientX, moveEvent.clientY);
    };

    const onMouseUp = () => {
      handleEnd();
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  };

  const onTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    handleStart(touch.clientX, touch.clientY);

    const onTouchMove = (moveEvent: TouchEvent) => {
      const moveTouch = moveEvent.touches[0];
      handleMove(moveTouch.clientX, moveTouch.clientY);
    };

    const onTouchEnd = () => {
      handleEnd();
      document.removeEventListener("touchmove", onTouchMove);
      document.removeEventListener("touchend", onTouchEnd);
    };

    document.addEventListener("touchmove", onTouchMove, { passive: true });
    document.addEventListener("touchend", onTouchEnd);
  };

  const fetchVoicesFromApi = async (key: string) => {
    if (!key || !key.trim()) return;
    setIsLoadingVoices(true);
    try {
      const response = await fetch("/api/board/tts/voices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: key.trim() })
      });
      if (response.ok) {
        const data = await response.json();
        if (data.voices && Array.isArray(data.voices)) {
          setApiVoices(data.voices);
        }
      }
    } catch (err) {
      console.error("Error fetching voices:", err);
    } finally {
      setIsLoadingVoices(false);
    }
  };

  const handleSwitchVoiceSource = (source: "preset" | "custom") => {
    setVoiceSource(source);
    if (source === "preset") {
      const presets = ["21m00Tcm4TlvDq8ikWAM", "AZnzlk1XhkZOKCFLE30d", "EXAVITQu4vr4xnSDxMaL", "ErXwobaYiN019PkySvjV"];
      if (apiVoices.length > 0) {
        const hasCurrent = apiVoices.some(v => v.voiceId === elVoiceId);
        if (!hasCurrent) {
          setElVoiceId(apiVoices[0].voiceId);
        }
      } else if (!presets.includes(elVoiceId)) {
        setElVoiceId("21m00Tcm4TlvDq8ikWAM");
      }
    }
  };
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<any>(null);
  const sendMessageRef = useRef<any>(null);
  const isContinuousVoiceModeRef = useRef(isContinuousVoiceMode);
  const hasSentThisTurnRef = useRef(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const currentlySpeakingIdRef = useRef<number | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedUseEl = localStorage.getItem("ai_use_elevenlabs") === "true";
      const storedKey = localStorage.getItem("ai_elevenlabs_apikey") || "";
      const storedVoice = localStorage.getItem("ai_elevenlabs_voiceid") || "21m00Tcm4TlvDq8ikWAM";
      setUseElevenLabs(storedUseEl);
      setElApiKey(storedKey);
      
      const presets = ["21m00Tcm4TlvDq8ikWAM", "AZnzlk1XhkZOKCFLE30d", "EXAVITQu4vr4xnSDxMaL", "ErXwobaYiN019PkySvjV"];
      if (presets.includes(storedVoice)) {
        setVoiceSource("preset");
        setElVoiceId(storedVoice);
        setCustomVoiceId("");
      } else {
        setVoiceSource("custom");
        setElVoiceId("21m00Tcm4TlvDq8ikWAM"); // Fallback select view to default
        setCustomVoiceId(storedVoice);
      }

      if (storedKey.trim()) {
        fetchVoicesFromApi(storedKey);
      }
    }
  }, []);

  useEffect(() => {
    if (showSettings) {
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      if (activeAudioRef.current) {
        activeAudioRef.current.pause();
        activeAudioRef.current = null;
      }
      setCurrentlySpeakingId(null);
      currentlySpeakingIdRef.current = null;

      if (elApiKey.trim()) {
        fetchVoicesFromApi(elApiKey);
      }
    }
  }, [showSettings]);

  const handleSaveSettings = () => {
    const finalVoiceId = voiceSource === "preset" ? elVoiceId : customVoiceId.trim();
    const resolvedVoiceId = finalVoiceId || "21m00Tcm4TlvDq8ikWAM"; // Fallback to Rachel if empty

    localStorage.setItem("ai_use_elevenlabs", String(useElevenLabs));
    localStorage.setItem("ai_elevenlabs_apikey", elApiKey.trim());
    localStorage.setItem("ai_elevenlabs_voiceid", resolvedVoiceId);
    
    // Sync back to local component states
    setElVoiceId(resolvedVoiceId);
    if (voiceSource === "custom") {
      setCustomVoiceId(resolvedVoiceId);
    }
    
    setShowSettings(false);
    toastSuccess("Thành công", "Đã lưu cấu hình giọng đọc ElevenLabs!");
  };

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);
  useEffect(() => { if (open) inputRef.current?.focus(); }, [open]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    
    const handleViewportChange = () => {
      if (window.visualViewport) {
        const vv = window.visualViewport;
        const offsetBottom = window.innerHeight - vv.height - vv.offsetTop;
        setViewportOffsetBottom(offsetBottom > 0 ? offsetBottom : 0);
        setViewportHeight(vv.height);
      }
    };

    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", handleViewportChange);
      window.visualViewport.addEventListener("scroll", handleViewportChange);
    }
    
    handleViewportChange();

    return () => {
      if (window.visualViewport) {
        window.visualViewport.removeEventListener("resize", handleViewportChange);
        window.visualViewport.removeEventListener("scroll", handleViewportChange);
      }
    };
  }, [open]);

  useEffect(() => {
    if (open) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [viewportHeight, open]);

  useEffect(() => {
    sendMessageRef.current = sendMessage;
  });

  useEffect(() => {
    isContinuousVoiceModeRef.current = isContinuousVoiceMode;
  }, [isContinuousVoiceMode]);

  useEffect(() => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      // Prime voices loading early
      window.speechSynthesis.getVoices();
      const handleVoicesChanged = () => {
        window.speechSynthesis.getVoices();
      };
      window.speechSynthesis.addEventListener("voiceschanged", handleVoicesChanged);
      return () => {
        window.speechSynthesis.removeEventListener("voiceschanged", handleVoicesChanged);
      };
    }
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const rec = new SpeechRecognition();
        rec.continuous = false;
        rec.lang = "vi-VN";
        rec.interimResults = false;
        
        rec.onstart = () => {
          setIsListening(true);
          hasSentThisTurnRef.current = false;
        };
        
        rec.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          if (transcript.trim() && sendMessageRef.current) {
            hasSentThisTurnRef.current = true;
            setInput("");
            sendMessageRef.current(transcript);
          }
        };
        
        rec.onerror = (e: any) => {
          console.error("Speech recognition error:", e.error, e);
          setIsListening(false);
          if (e.error === "not-allowed" || e.error === "service-not-allowed") {
            setIsContinuousVoiceMode(false);
            isContinuousVoiceModeRef.current = false;
          }
        };
        
        rec.onend = () => {
          setIsListening(false);
          if (isContinuousVoiceModeRef.current && !hasSentThisTurnRef.current) {
            setTimeout(() => {
              if (isContinuousVoiceModeRef.current && !window.speechSynthesis.speaking) {
                try {
                  recognitionRef.current.start();
                } catch (err) {
                  // already started or not allowed
                }
              }
            }, 600);
          }
        };
        
        recognitionRef.current = rec;
      }
    }
    return () => {
      if (typeof window !== "undefined") {
        if (window.speechSynthesis) {
          window.speechSynthesis.cancel();
        }
      }
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {}
      }
    };
  }, []);

  const getBestVietnameseVoice = () => {
    if (typeof window === "undefined" || !window.speechSynthesis) return null;
    const voices = window.speechSynthesis.getVoices();
    const viVoices = voices.filter(v => v.lang.includes("vi-VN") || v.lang.includes("vi_VN"));
    if (viVoices.length === 0) return null;
    
    // Prioritize natural/google voices
    const premiumVoice = viVoices.find(v => 
      v.name.toLowerCase().includes("google") || 
      v.name.toLowerCase().includes("natural") || 
      v.name.toLowerCase().includes("premium")
    );
    return premiumVoice || viVoices[0];
  };

  const speakText = async (text: string, id: number) => {
    if (typeof window === "undefined") return;
    
    if (currentlySpeakingIdRef.current === id) {
      if (window.speechSynthesis) window.speechSynthesis.cancel();
      if (activeAudioRef.current) {
        activeAudioRef.current.pause();
        activeAudioRef.current = null;
      }
      currentlySpeakingIdRef.current = null;
      setCurrentlySpeakingId(null);
      if (isContinuousVoiceModeRef.current && recognitionRef.current) {
        try {
          recognitionRef.current.start();
        } catch (e) {
          console.error("Failed to restart speech recognition:", e);
        }
      }
      return;
    }

    if (window.speechSynthesis) window.speechSynthesis.cancel();
    if (activeAudioRef.current) {
      activeAudioRef.current.pause();
      activeAudioRef.current = null;
    }
    
    const cleanText = text
      .replace(/\*\*/g, "")
      .replace(/[*-]\s+/g, "")
      .replace(/#/g, "")
      .replace(/Lỗi:/g, "Có lỗi xảy ra.")
      .trim();

    if (!cleanText) {
      currentlySpeakingIdRef.current = null;
      setCurrentlySpeakingId(null);
      if (isContinuousVoiceModeRef.current && recognitionRef.current) {
        try {
          recognitionRef.current.start();
        } catch (e) {
          console.error("Failed to restart speech recognition:", e);
        }
      }
      return;
    }

    currentlySpeakingIdRef.current = id;
    setCurrentlySpeakingId(id);

    if (useElevenLabs) {
      try {
        const response = await fetch("/api/board/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: cleanText,
            apiKey: elApiKey || undefined,
            voiceId: elVoiceId || undefined
          })
        });

        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.error || "Gặp lỗi khi tạo giọng nói từ ElevenLabs.");
        }

        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        activeAudioRef.current = audio;

        audio.onended = () => {
          if (currentlySpeakingIdRef.current === id) {
            currentlySpeakingIdRef.current = null;
            setCurrentlySpeakingId(null);
            if (isContinuousVoiceModeRef.current && recognitionRef.current) {
              try {
                recognitionRef.current.start();
              } catch (e) {
                console.error("Failed to restart speech recognition:", e);
              }
            }
          }
        };

        audio.onerror = () => {
          if (currentlySpeakingIdRef.current === id) {
            currentlySpeakingIdRef.current = null;
            setCurrentlySpeakingId(null);
            if (isContinuousVoiceModeRef.current && recognitionRef.current) {
              try {
                recognitionRef.current.start();
              } catch (e) {
                console.error("Failed to restart speech recognition after error:", e);
              }
            }
          }
        };

        await audio.play();
      } catch (err: any) {
        console.error("ElevenLabs TTS Error:", err);
        toastError("Lỗi đọc giọng ElevenLabs", err.message || "Kiểm tra lại cấu hình hoặc API Key.");
        currentlySpeakingIdRef.current = null;
        setCurrentlySpeakingId(null);
        if (isContinuousVoiceModeRef.current && recognitionRef.current) {
          try {
            recognitionRef.current.start();
          } catch (e) {
            console.error("Failed to restart speech recognition after error:", e);
          }
        }
      }
    } else {
      if (!window.speechSynthesis) {
        currentlySpeakingIdRef.current = null;
        setCurrentlySpeakingId(null);
        return;
      }

      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.lang = "vi-VN";
      utterance.rate = 0.95;
      utterance.pitch = 1.0;
      
      const bestVoice = getBestVietnameseVoice();
      if (bestVoice) {
        utterance.voice = bestVoice;
      }
      
      utteranceRef.current = utterance;
      (window as any)._activeUtterances = (window as any)._activeUtterances || [];
      (window as any)._activeUtterances.push(utterance);
      if ((window as any)._activeUtterances.length > 8) {
        (window as any)._activeUtterances.shift();
      }
      
      utterance.onend = () => {
        if (currentlySpeakingIdRef.current === id) {
          currentlySpeakingIdRef.current = null;
          setCurrentlySpeakingId(null);
          if (isContinuousVoiceModeRef.current && recognitionRef.current) {
            try {
              recognitionRef.current.start();
            } catch (e) {
              console.error("Failed to restart speech recognition:", e);
            }
          }
        }
      };
      
      utterance.onerror = (event: any) => {
        if (event.error === "interrupted") return;
        if (currentlySpeakingIdRef.current === id) {
          currentlySpeakingIdRef.current = null;
          setCurrentlySpeakingId(null);
          if (isContinuousVoiceModeRef.current && recognitionRef.current) {
            try {
              recognitionRef.current.start();
            } catch (e) {
              console.error("Failed to restart speech recognition after error:", e);
            }
          }
        }
      };
      
      window.speechSynthesis.speak(utterance);
    }
  };

  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert("Trình duyệt của bạn không hỗ trợ nhận diện giọng nói (Speech Recognition). Vui lòng sử dụng Chrome hoặc Safari.");
      return;
    }
    if (isContinuousVoiceMode) {
      setIsContinuousVoiceMode(false);
      recognitionRef.current.stop();
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      setCurrentlySpeakingId(null);
      currentlySpeakingIdRef.current = null;
    } else {
      setIsContinuousVoiceMode(true);
      setIsAudioEnabled(true);
      try {
        recognitionRef.current.start();
      } catch (err) {
        console.error(err);
      }
    }
  };

  const hasUserMessage = messages.some(m => m.role === "user");

  const sendMessage = async (text: string) => {
    const userText = text.trim();
    if (!userText || loading) return;
    const userId = idCounter;
    const assistantId = idCounter + 1;
    setIdCounter(c => c + 2);
    setInput("");
    const newMessages = [...messages, { id: userId, role: "user" as const, content: userText }];
    setMessages([...newMessages, { id: assistantId, role: "assistant", content: "", loading: true }]);
    setLoading(true);
    try {
      const history = newMessages.slice(-6).map(m => ({ role: m.role, content: m.content }));
      const res = await fetch("/api/board/ai-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userText, history: history.slice(0, -1) }),
      });
      const json = await res.json();
      const reply = json.success ? json.reply : `Lỗi: ${json.error}`;
      setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, content: reply, loading: false } : m));
      
      if (isAudioEnabled && json.success) {
        speakText(reply, assistantId);
      } else {
        if (isContinuousVoiceModeRef.current && recognitionRef.current) {
          try {
            recognitionRef.current.start();
          } catch (e) {
            console.error("Failed to restart speech recognition after non-audio response:", e);
          }
        }
      }
    } catch (e) {
      setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, content: `Lỗi kết nối: ${String(e)}`, loading: false } : m));
      if (isContinuousVoiceModeRef.current && recognitionRef.current) {
        try {
          recognitionRef.current.start();
        } catch (err) {
          console.error("Failed to restart speech recognition after API error:", err);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(input); }
  };

  const handleClose = () => {
    setIsContinuousVoiceMode(false);
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
    }
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setCurrentlySpeakingId(null);
    currentlySpeakingIdRef.current = null;
    setClosing(true);
    setTimeout(() => { setOpen(false); setClosing(false); setMessages([]); }, 280);
  };

  return (
    <>
      <style>{`
        @keyframes ai-fab-in   { from { transform: scale(0.7); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        @keyframes ai-panel-in { from { opacity: 0; transform: translateY(20px) scale(0.97); } to { opacity: 1; transform: none; } }
        @keyframes ai-msg-in   { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
        @keyframes ai-panel-out { from { opacity: 1; transform: translateY(0) scale(1); } to { opacity: 0; transform: translateY(24px) scale(0.97); } }
        .ai-panel-closing { animation: ai-panel-out 0.26s cubic-bezier(0.4,0,0.2,1) forwards; }
        @keyframes ai-pulse    { 0%,100% { box-shadow: 0 0 0 0 rgba(99,102,241,0.5); } 60% { box-shadow: 0 0 0 10px rgba(99,102,241,0); } }
        @keyframes typing-dot  { 0%,80%,100% { transform: translateY(0); opacity: 0.5; } 40% { transform: translateY(-5px); opacity: 1; } }
        @keyframes mic-pulse   { 0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); } 70% { box-shadow: 0 0 0 8px rgba(239, 68, 68, 0); } 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); } }
        .ai-fab        { animation: ai-fab-in 0.22s cubic-bezier(0.34,1.56,0.64,1); }
        .ai-fab-pulse  { animation: ai-pulse 2s ease-in-out infinite; }
        .ai-panel      { animation: ai-panel-in 0.28s cubic-bezier(0.4,0,0.2,1); }
        .ai-msg        { animation: ai-msg-in 0.2s ease; }
        .ai-dot        { display:inline-block; width:7px; height:7px; border-radius:50%; background:${ACCENT}; animation:typing-dot 1.2s infinite; margin: 0 2px; }
        .ai-dot:nth-child(2) { animation-delay:.2s; }
        .ai-dot:nth-child(3) { animation-delay:.4s; }
        .ai-suggest:hover { background: ${ACCENT_BG} !important; border-color: ${ACCENT} !important; }
        .ai-send:hover:not(:disabled) { opacity: 0.85; transform: scale(1.05); }
        .ai-mic.listening { animation: mic-pulse 1.5s infinite; background: #ef4444 !important; border-color: #ef4444 !important; color: #fff !important; }
        .ai-mic:hover:not(.listening) { background: var(--border) !important; color: var(--foreground) !important; }
      `}</style>

      {/* Floating button — chỉ hiện khi chat đóng */}
      {!open && (
        <button
          onMouseDown={onMouseDown}
          onTouchStart={onTouchStart}
          className="ai-fab ai-fab-pulse"
          title="Trợ lý AI Ban Giám đốc"
          style={{
            position: "fixed", 
            bottom: 24 + offset.y, 
            right: 24 + offset.x, 
            zIndex: 1200,
            width: 56, height: 56, borderRadius: "50%", border: "none",
            background: `linear-gradient(135deg, ${ACCENT}, ${ACCENT2})`,
            color: "#fff", cursor: "pointer", fontSize: 24,
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 6px 24px rgba(99,102,241,0.45)",
            transition: "transform 0.2s, opacity 0.2s",
            userSelect: "none",
            touchAction: "none"
          }}
        >🤖</button>
      )}

      {/* Chat panel */}
      {open && (
        <div className={`ai-panel${closing ? " ai-panel-closing" : ""}`} style={{
          position: "fixed", 
          bottom: viewportOffsetBottom, 
          right: isMobile ? 0 : 24, 
          zIndex: 1199,
          width: isMobile ? "100%" : 420, 
          maxHeight: viewportHeight 
            ? `${viewportHeight - (isMobile ? 0 : 24)}px` 
            : "calc(100vh - 24px)",
          background: "var(--card)", 
          borderRadius: isMobile ? "16px 16px 0 0" : "20px 20px 0 0",
          border: "1px solid var(--border)",
          boxShadow: "0 24px 64px rgba(0,0,0,0.16)",
          display: "flex", flexDirection: "column", overflow: "hidden",
        }}>

          {/* Header */}
          <div style={{
            padding: "14px 16px",
            borderBottom: "1px solid var(--border)",
            display: "flex", alignItems: "center", gap: 12,
            background: "var(--card)",
          }}>
            <div style={{
              width: 42, height: 42, borderRadius: 12, flexShrink: 0, fontSize: 24,
              background: `linear-gradient(135deg, ${ACCENT}22, ${ACCENT2}33)`,
              border: `1.5px solid ${ACCENT_BORDER}`,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>🤖</div>
            <div style={{ flex: 1 }}>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: "var(--foreground)" }}>Trợ lý AI</p>
              <p style={{ margin: 0, fontSize: 11, color: "var(--muted-foreground)", display: "flex", alignItems: "center", gap: 5 }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: isContinuousVoiceMode ? "#ef4444" : "#10b981", display: "inline-block" }} className={isContinuousVoiceMode ? "listening" : ""} />
                {isContinuousVoiceMode ? "Đang đàm thoại liên tục..." : "Ban Giám đốc · Dữ liệu thực tế"}
              </p>
            </div>
            <button onClick={() => setShowSettings(!showSettings)} style={{
              width: 30, height: 30, borderRadius: 8, border: "1px solid var(--border)",
              background: showSettings ? "rgba(99,102,241,0.12)" : "var(--muted)", cursor: "pointer", 
              color: showSettings ? ACCENT : "var(--muted-foreground)",
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14,
              marginRight: 6
            }} title="Cấu hình giọng đọc ElevenLabs">
              <i className="bi bi-gear-fill" />
            </button>
            <button onClick={() => {
              const nextVal = !isAudioEnabled;
              setIsAudioEnabled(nextVal);
              if (!nextVal) {
                if (typeof window !== "undefined" && window.speechSynthesis) {
                  window.speechSynthesis.cancel();
                }
                if (activeAudioRef.current) {
                  activeAudioRef.current.pause();
                  activeAudioRef.current = null;
                }
                setCurrentlySpeakingId(null);
              }
            }} style={{
              width: 30, height: 30, borderRadius: 8, border: "1px solid var(--border)",
              background: isAudioEnabled ? "rgba(99,102,241,0.12)" : "var(--muted)", cursor: "pointer", 
              color: isAudioEnabled ? ACCENT : "var(--muted-foreground)",
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14,
              marginRight: 6
            }} title={isAudioEnabled ? "Tắt đọc câu trả lời" : "Bật đọc câu trả lời"}>
              <i className={`bi bi-volume-${isAudioEnabled ? "up-fill" : "mute-fill"}`} />
            </button>
            <button onClick={handleClose} style={{
              width: 30, height: 30, borderRadius: 8, border: "1px solid var(--border)",
              background: "var(--muted)", cursor: "pointer", color: "var(--muted-foreground)",
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13,
            }}>✕</button>
          </div>

          {/* Conditional Workspace */}
          {showSettings ? (
            <div style={{ flex: 1, padding: "20px 16px", display: "flex", flexDirection: "column", gap: 16, overflowY: "auto" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, borderBottom: "1px solid var(--border)", paddingBottom: 10 }}>
                <span style={{ fontSize: 20 }}>🎙️</span>
                <span style={{ fontWeight: 700, fontSize: 14, color: "var(--foreground)" }}>Giọng đọc ElevenLabs</span>
              </div>

              {/* Toggle ElevenLabs */}
              <div className="form-check form-switch d-flex align-items-center justify-content-between p-0 m-0">
                <label className="form-check-label" htmlFor="useElevenLabsSwitch" style={{ fontSize: 13, fontWeight: 600, color: "var(--foreground)", cursor: "pointer" }}>
                  Sử dụng giọng đọc ElevenLabs
                </label>
                <input 
                  className="form-check-input m-0" 
                  type="checkbox" 
                  role="switch" 
                  id="useElevenLabsSwitch"
                  checked={useElevenLabs}
                  onChange={e => setUseElevenLabs(e.target.checked)}
                  style={{ width: "36px", height: "18px", cursor: "pointer" }}
                />
              </div>

              {/* API Key */}
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: "var(--muted-foreground)" }}>API Key ElevenLabs</label>
                <div style={{ display: "flex", gap: 8 }}>
                  <input 
                    type="password" 
                    className="form-control form-control-sm"
                    placeholder="xi-api-key"
                    value={elApiKey}
                    onChange={e => setElApiKey(e.target.value)}
                    onBlur={() => fetchVoicesFromApi(elApiKey)}
                    style={{ fontSize: 13, padding: "8px 12px", borderRadius: 8, flex: 1 }}
                  />
                  <button 
                    type="button"
                    className="btn btn-sm btn-outline-secondary"
                    onClick={() => fetchVoicesFromApi(elApiKey)}
                    disabled={isLoadingVoices || !elApiKey.trim()}
                    style={{ borderRadius: 8, fontSize: 12, fontWeight: 600, padding: "0 12px", display: "flex", alignItems: "center", gap: 4, height: 38 }}
                  >
                    {isLoadingVoices ? (
                      <>
                        <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" style={{ width: 12, height: 12 }} />
                        Tải...
                      </>
                    ) : (
                      "Tải giọng"
                    )}
                  </button>
                </div>
                <span style={{ fontSize: 10.5, color: "var(--muted-foreground)" }}>
                  Nhập API Key ElevenLabs của bạn. Giá trị được bảo mật trên máy khách.
                </span>
              </div>

              {/* Voice Source selection */}
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: "var(--muted-foreground)" }}>Loại giọng đọc</label>
                <div style={{ display: "flex", gap: 16, marginTop: 4 }}>
                  <label style={{ fontSize: 13, display: "flex", alignItems: "center", gap: 6, cursor: "pointer", color: "var(--foreground)", fontWeight: 500 }}>
                    <input 
                      type="radio" 
                      name="voiceSource" 
                      checked={voiceSource === "preset"} 
                      onChange={() => handleSwitchVoiceSource("preset")}
                      style={{ cursor: "pointer", width: 15, height: 15 }}
                    />
                    Mặc định hệ thống
                  </label>
                  <label style={{ fontSize: 13, display: "flex", alignItems: "center", gap: 6, cursor: "pointer", color: "var(--foreground)", fontWeight: 500 }}>
                    <input 
                      type="radio" 
                      name="voiceSource" 
                      checked={voiceSource === "custom"} 
                      onChange={() => handleSwitchVoiceSource("custom")}
                      style={{ cursor: "pointer", width: 15, height: 15 }}
                    />
                    Dùng Voice ID tùy chỉnh
                  </label>
                </div>
              </div>

              {/* Voice Selection or Custom Voice Input */}
              {voiceSource === "preset" ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <label style={{ fontSize: 12, fontWeight: 700, color: "var(--muted-foreground)" }}>Chọn giọng đọc mẫu</label>
                  <select 
                    className="form-select form-select-sm"
                    value={elVoiceId}
                    onChange={e => setElVoiceId(e.target.value)}
                    style={{ fontSize: 13, padding: "8px 12px", borderRadius: 8 }}
                  >
                    {apiVoices.length > 0 ? (
                      apiVoices.map((v: any) => (
                        <option key={v.voiceId} value={v.voiceId}>
                          {v.name} ({v.category === "premade" ? "Mặc định" : "Thư viện"})
                        </option>
                      ))
                    ) : (
                      <>
                        <option value="21m00Tcm4TlvDq8ikWAM">Rachel (Nữ - Truyền cảm)</option>
                        <option value="AZnzlk1XhkZOKCFLE30d">Domi (Nữ - Trẻ trung)</option>
                        <option value="EXAVITQu4vr4xnSDxMaL">Bella (Nữ - Chuyên nghiệp)</option>
                        <option value="ErXwobaYiN019PkySvjV">Antoni (Nam - Trầm chững chạc)</option>
                      </>
                    )}
                  </select>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <label style={{ fontSize: 12, fontWeight: 700, color: "var(--muted-foreground)" }}>Nhập Voice ID tùy chỉnh</label>
                  <input 
                    type="text" 
                    className="form-control form-control-sm"
                    placeholder="Ví dụ: pNInz6obpgfrhhF21HLr"
                    value={customVoiceId}
                    onChange={e => setCustomVoiceId(e.target.value)}
                    style={{ fontSize: 13, padding: "8px 12px", borderRadius: 8 }}
                  />
                </div>
              )}

              {/* Note for Free accounts */}
              <div style={{ 
                backgroundColor: "rgba(99, 102, 241, 0.08)", 
                border: "1px solid rgba(99, 102, 241, 0.2)", 
                borderRadius: 8, 
                padding: "10px 12px", 
                display: "flex", 
                flexDirection: "column", 
                gap: 6 
              }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: "var(--primary)", display: "flex", alignItems: "center", gap: 4 }}>
                  💡 Cách có giọng đọc tiếng Việt chuẩn (Miễn phí)
                </span>
                <span style={{ fontSize: 11, color: "var(--muted-foreground)", lineHeight: "1.4" }}>
                  Mặc định ElevenLabs chỉ có giọng tiếng Anh (nên khi đọc tiếng Việt sẽ có <strong>giọng Tây</strong>). 
                  <br />
                  Để có giọng Việt chuẩn 100%: 
                  Bạn có thể lên web ElevenLabs, vào mục <strong>Voice Lab &gt; Instant Voice Cloning</strong>, đăng tải một đoạn ghi âm tiếng Việt (khoảng 1 phút) để <strong>tự clone giọng Việt</strong>. 
                  Giọng tự clone vẫn được ElevenLabs cho phép sử dụng qua API hoàn toàn miễn phí!
                </span>
              </div>

              {/* Action Buttons */}
              <div style={{ marginTop: "auto", display: "flex", gap: 10, paddingTop: 20 }}>
                <button 
                  onClick={() => setShowSettings(false)}
                  className="btn btn-sm btn-outline-secondary"
                  style={{ flex: 1, padding: "8px 0", borderRadius: 8, fontSize: 13, fontWeight: 600 }}
                >
                  Hủy bỏ
                </button>
                <button 
                  onClick={handleSaveSettings}
                  className="btn btn-sm btn-primary"
                  style={{ flex: 1, padding: "8px 0", borderRadius: 8, fontSize: 13, fontWeight: 600, background: ACCENT, borderColor: ACCENT }}
                >
                  Lưu cấu hình
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Messages area */}
              <div style={{ flex: 1, overflowY: "auto", padding: "16px" }}>

                {/* Welcome screen */}
                {!hasUserMessage && (
                  <div style={{ textAlign: "center", marginBottom: 20 }}>
                    <div style={{ fontSize: 52, marginBottom: 10 }}>🤖</div>
                    <p style={{ margin: "0 0 4px", fontSize: 15, fontWeight: 800, color: "var(--foreground)" }}>
                      Xin chào! Tôi là Trợ lý AI
                    </p>
                    <p style={{ margin: 0, fontSize: 12.5, color: "var(--muted-foreground)" }}>
                      Chuyên hỗ trợ <span style={{ color: ACCENT, fontWeight: 700 }}>Ban Giám đốc</span> phân tích dữ liệu kinh doanh
                    </p>
                  </div>
                )}

                {/* Suggested questions */}
                {!hasUserMessage && (
                  <div style={{ marginBottom: 16 }}>
                    <p style={{ margin: "0 0 10px", fontSize: 10.5, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.08em", display: "flex", alignItems: "center", gap: 6 }}>
                      💡 Gợi ý nhanh
                    </p>
                    <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                      {SUGGESTED_QUESTIONS.map((q, i) => (
                        <button key={i} className="ai-suggest" onClick={() => sendMessage(q)} style={{
                          padding: "10px 14px", borderRadius: 12,
                          border: `1px solid ${ACCENT_BORDER}`,
                          background: "var(--background)", cursor: "pointer", textAlign: "left",
                          fontSize: 12.5, color: "var(--foreground)",
                          transition: "all 0.15s", fontWeight: 500,
                        }}>{q}</button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Messages */}
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  {messages.map(msg => (
                    <div key={msg.id} style={{ display: "flex", flexDirection: "column" }}>
                      <div className="ai-msg" style={{
                        display: "flex", gap: 8,
                        justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
                        alignItems: "flex-start",
                      }}>
                        {msg.role === "assistant" && (
                          <div style={{
                            width: 28, height: 28, borderRadius: 8, flexShrink: 0, fontSize: 16,
                            background: `linear-gradient(135deg, ${ACCENT}22, ${ACCENT2}33)`,
                            border: `1px solid ${ACCENT_BORDER}`,
                            display: "flex", alignItems: "center", justifyContent: "center",
                          }}>🤖</div>
                        )}
                        <div style={{
                          maxWidth: "78%",
                          padding: "10px 14px",
                          borderRadius: msg.role === "user" ? "16px 16px 4px 16px" : "4px 16px 16px 16px",
                          background: msg.role === "user"
                            ? `linear-gradient(135deg, ${ACCENT}, ${ACCENT2})`
                            : "var(--muted)",
                          color: msg.role === "user" ? "#fff" : "var(--foreground)",
                          fontSize: 13, lineHeight: 1.6,
                        }}>
                          {msg.loading
                            ? <span><span className="ai-dot"/><span className="ai-dot"/><span className="ai-dot"/></span>
                            : <div>{renderMarkdown(msg.content)}</div>
                          }
                        </div>
                      </div>
                      {msg.role === "assistant" && !msg.loading && (
                        <div style={{ display: "flex", alignItems: "center", gap: 4, marginLeft: 36, marginTop: 4 }}>
                          <button onClick={() => speakText(msg.content, msg.id)} style={{
                            background: "none", border: "none", padding: "2px 6px", cursor: "pointer",
                            color: currentlySpeakingId === msg.id ? ACCENT : "var(--muted-foreground)",
                            display: "flex", alignItems: "center", gap: 4, fontSize: 11.5,
                            borderRadius: 6, transition: "all 0.1s"
                          }} className="ai-suggest" title="Đọc văn bản">
                            <i className={`bi bi-volume-${currentlySpeakingId === msg.id ? "up-fill" : "up"}`} style={{ fontSize: 13 }} />
                            <span>{currentlySpeakingId === msg.id ? "Đang phát..." : "Nghe đọc"}</span>
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                <div ref={messagesEndRef} />
              </div>

              {/* Input area */}
              <div style={{ padding: "10px 14px 6px", borderTop: "1px solid var(--border)" }}>
                <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
                  <textarea
                    ref={inputRef}
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Nhập câu hỏi... (Enter để gửi)"
                    rows={1}
                    style={{
                      flex: 1, resize: "none", padding: "9px 13px",
                      border: `1.5px solid ${input ? ACCENT : "var(--border)"}`,
                      borderRadius: 12, fontSize: 13, lineHeight: 1.5,
                      outline: "none", background: "var(--background)",
                      color: "var(--foreground)", maxHeight: 90, overflowY: "auto",
                      transition: "border-color 0.15s",
                    }}
                  />
                  <button
                    className={`ai-mic${isListening ? " listening" : ""}`}
                    onClick={toggleListening}
                    style={{
                      width: 38, height: 38, borderRadius: 11,
                      border: isContinuousVoiceMode ? `1.5px solid ${ACCENT}` : "1.5px solid var(--border)",
                      background: isListening ? "#ef4444" : (isContinuousVoiceMode ? "rgba(99,102,241,0.12)" : "var(--muted)"),
                      color: isListening ? "#fff" : (isContinuousVoiceMode ? ACCENT : "var(--muted-foreground)"),
                      cursor: "pointer",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 16, flexShrink: 0, transition: "all 0.15s",
                    }}
                    title={isListening 
                      ? "Đang nghe... Click để dừng hội thoại" 
                      : (isContinuousVoiceMode ? "Hội thoại liên tục đang chờ AI trả lời... Click để dừng" : "Bật trò chuyện bằng giọng nói liên tục")}
                  >
                    <i className={`bi bi-mic${isListening ? "-fill" : ""}`} />
                  </button>
                  <button
                    className="ai-send"
                    onClick={() => sendMessage(input)}
                    disabled={loading || !input.trim()}
                    style={{
                      width: 38, height: 38, borderRadius: 11, border: "none",
                      background: loading || !input.trim() ? "var(--muted)" : `linear-gradient(135deg, ${ACCENT}, ${ACCENT2})`,
                      color: loading || !input.trim() ? "var(--muted-foreground)" : "#fff",
                      cursor: loading || !input.trim() ? "not-allowed" : "pointer",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 17, flexShrink: 0, transition: "all 0.15s",
                    }}
                  >▶</button>
                </div>
                <p style={{ margin: "6px 0 8px", fontSize: 10, color: "var(--muted-foreground)", textAlign: "center" }}>
                  Trí tuệ nhân tạo · Dữ liệu được lọc theo phòng ban &amp; quyền hạn
                </p>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
