"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import MediaLibrary from "@/components/marketing/MediaLibrary";
import { PrintPreviewModal, printDocumentById } from "@/components/ui/PrintPreviewModal";

interface EmployeeAttendee {
  id: string;
  name: string;
  email: string;
  position?: string | null;
  department?: string | null;
}

interface ActionItem {
  id?: string;
  task: string;
  assignee: string; // Employee name or ID
  startDate: string;
  deadline: string;
  completed?: boolean;
}

interface Meeting {
  id: string;
  title: string;
  description: string | null;
  startTime: string;
  endTime: string;
  location: string | null;
  creatorId: string;
  attendees: string; // JSON string of EmployeeAttendee[]
  minutes: string | null;
  actionItems: string; // JSON string of ActionItem[]
  files: string; // JSON string of MediaAsset IDs
  host?: string | null;
  secretary?: string | null;
  createdAt: string;
}

interface MediaAsset {
  id: string;
  name: string;
  fileSize: number;
  fileType: string;
  fileUrl: string;
  thumbnail: string | null;
}

interface CompanyInfo {
  name: string;
  shortName?: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  taxCode: string | null;
  logoUrl: string | null;
  legalRep: string | null;
}

function fmtBytes(b: number) {
  if (!b) return "0 B";
  const k = 1024, s = ["B", "KB", "MB", "GB"], i = Math.floor(Math.log(b) / Math.log(k));
  return `${parseFloat((b / Math.pow(k, i)).toFixed(1))} ${s[i]}`;
}

function fmtDateTime(dStr: string) {
  return new Date(dStr).toLocaleDateString("vi-VN", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatMeetingTime(startStr: string, endStr: string) {
  if (!startStr) return "—";
  try {
    const start = new Date(startStr);
    const startFmt = start.toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
    if (!endStr) return startFmt;
    const end = new Date(endStr);
    const endFmt = end.toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
    return `${startFmt} đến ${endFmt}`;
  } catch {
    return startStr;
  }
}

function getFileIcon(ext: string) {
  const e = ext.toLowerCase();
  if (e === "pdf") return "bi-file-earmark-pdf text-danger";
  if (["doc", "docx"].includes(e)) return "bi-file-earmark-word text-primary";
  if (["xls", "xlsx", "csv"].includes(e)) return "bi-file-earmark-excel text-success";
  if (["ppt", "pptx"].includes(e)) return "bi-file-earmark-ppt text-warning";
  if (["zip", "rar"].includes(e)) return "bi-file-earmark-zip text-secondary";
  if (["mp3", "wav"].includes(e)) return "bi-file-earmark-music text-info";
  if (["mp4", "mov", "avi"].includes(e)) return "bi-file-earmark-play text-info";
  if (["jpg", "jpeg", "png", "gif", "webp"].includes(e)) return "bi-file-earmark-image text-info";
  return "bi-file-earmark text-muted";
}

export default function MeetingsWorkspace() {
  const { data: session } = useSession();
  const userId = session?.user?.id;

  // State
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMeeting, setSelectedMeeting] = useState<(Meeting & { resolvedFiles: MediaAsset[] }) | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "upcoming" | "past">("all");

  // Modals
  const [formOpen, setFormOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileView, setMobileView] = useState<"list" | "detail">("list");
  const [isEdit, setIsEdit] = useState(false);
  const [meetingToDelete, setMeetingToDelete] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [previewAsset, setPreviewAsset] = useState<MediaAsset | null>(null);

  // Form State
  const [formTitle, setFormTitle] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formStartTime, setFormStartTime] = useState("");
  const [formEndTime, setFormEndTime] = useState("");
  const [formLocation, setFormLocation] = useState("");
  const [formMinutes, setFormMinutes] = useState("");
  const [formTextColor, setFormTextColor] = useState("#000000");
  const [formHighlightColor, setFormHighlightColor] = useState("#ffff00");
  const [formHost, setFormHost] = useState("");
  const [formSecretary, setFormSecretary] = useState("");
  const [showMinutesTemplate, setShowMinutesTemplate] = useState(true);

  const [formAttendees, setFormAttendees] = useState<EmployeeAttendee[]>([]);
  const [formActionItems, setFormActionItems] = useState<ActionItem[]>([]);
  const [formFiles, setFormFiles] = useState<MediaAsset[]>([]); // Resolved objects for UI rendering
  const [actionItemsExpanded, setActionItemsExpanded] = useState(false);
  const [printOpen, setPrintOpen] = useState(false);

  // Employee dropdown for multi-select
  const [allEmployees, setAllEmployees] = useState<EmployeeAttendee[]>([]);
  const [empSearch, setEmpSearch] = useState("");
  const [empDropdownOpen, setEmpDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const restoreAttemptedRef = useRef(false);
  const [editorKey, setEditorKey] = useState(0);
  const [currentBlockType, setCurrentBlockType] = useState<"normal" | "heading">("normal");
  const [currentFontSize, setCurrentFontSize] = useState("14"); // px
  const [currentFontFamily, setCurrentFontFamily] = useState("default");

  // Custom dropdowns for text editor formatting
  const blockTypeDropdownRef = useRef<HTMLDivElement>(null);
  const fontFamilyDropdownRef = useRef<HTMLDivElement>(null);
  const fontSizeDropdownRef = useRef<HTMLDivElement>(null);

  const [blockDropdownOpen, setBlockDropdownOpen] = useState(false);
  const [fontDropdownOpen, setFontDropdownOpen] = useState(false);
  const [sizeDropdownOpen, setSizeDropdownOpen] = useState(false);

  const savedSelectionRef = useRef<Range | null>(null);
  const selectionOverlaysRef = useRef<HTMLElement[]>([]);

  // Remove all fake-selection overlay divs
  function clearSelectionOverlays() {
    selectionOverlaysRef.current.forEach(el => el.remove());
    selectionOverlaysRef.current = [];
  }

  // Draw fixed-position overlay rects to simulate selection highlight when editor is unfocused
  function drawSelectionOverlays() {
    clearSelectionOverlays();
    const range = savedSelectionRef.current;
    if (!range || range.collapsed) return;
    try {
      Array.from(range.getClientRects()).forEach(rect => {
        if (rect.width === 0 && rect.height === 0) return;
        const el = document.createElement('div');
        el.style.cssText = [
          'position:fixed',
          `left:${rect.left}px`,
          `top:${rect.top}px`,
          `width:${rect.width}px`,
          `height:${rect.height}px`,
          'background:rgba(26,115,232,0.18)',
          'pointer-events:none',
          'z-index:99999',
          'border-radius:1px',
        ].join(';');
        document.body.appendChild(el);
        selectionOverlaysRef.current.push(el);
      });
    } catch {}
  }

  // Save/restore editor selection so toolbar clicks don't lose the highlighted text
  function saveSelection() {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      savedSelectionRef.current = sel.getRangeAt(0).cloneRange();
    }
  }
  function restoreSelection() {
    clearSelectionOverlays();
    const sel = window.getSelection();
    if (sel && savedSelectionRef.current) {
      editorRef.current?.focus();
      sel.removeAllRanges();
      sel.addRange(savedSelectionRef.current);
    }
  }

  // Read current cursor styles (font family, font size, block type) and update toolbar states
  function updateEditorToolbarState() {
    try {
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0) {
        const range = sel.getRangeAt(0);
        const node = range.startContainer;
        const el = (node.nodeType === Node.TEXT_NODE ? node.parentElement : node) as HTMLElement | null;
        if (el && editorRef.current?.contains(el)) {
          // 1. Block type
          const block = document.queryCommandValue('formatBlock').toLowerCase();
          setCurrentBlockType(block === 'h2' ? 'heading' : 'normal');

          // 2. Font Size
          const style = window.getComputedStyle(el);
          const px = parseInt(style.fontSize);
          if (px) {
            setCurrentFontSize(px.toString());
          }

          // 3. Font Family
          const computedFontFamily = style.fontFamily.toLowerCase();
          if (computedFontFamily.includes("roboto") || computedFontFamily.includes("system-ui")) {
            setCurrentFontFamily("default");
          } else if (computedFontFamily.includes("arial")) {
            setCurrentFontFamily("arial");
          } else if (computedFontFamily.includes("times new roman") || computedFontFamily.includes("times")) {
            setCurrentFontFamily("times");
          } else if (computedFontFamily.includes("courier new") || computedFontFamily.includes("courier")) {
            setCurrentFontFamily("courier");
          } else if (computedFontFamily.includes("georgia")) {
            setCurrentFontFamily("georgia");
          } else if (computedFontFamily.includes("verdana")) {
            setCurrentFontFamily("verdana");
          } else if (computedFontFamily.includes("tahoma")) {
            setCurrentFontFamily("tahoma");
          } else {
            // Fallback match
            const list = ["arial", "times", "courier", "georgia", "verdana", "tahoma"];
            const matched = list.find(f => computedFontFamily.includes(f));
            setCurrentFontFamily(matched || "default");
          }
        }
      }
    } catch (e) {
      console.error("Lỗi cập nhật trạng thái toolbar:", e);
    }
  }

  function applyFontSize(px: number) {
    if (!px || px < 6 || px > 200) return;
    const editor = editorRef.current;
    if (!editor) return;

    if (document.activeElement !== editor) {
      restoreSelection();
    }

    document.execCommand('fontSize', false, '7');
    editor.querySelectorAll('font[size="7"]').forEach(font => {
      const span = document.createElement('span');
      span.style.fontSize = `${px}px`;
      while (font.firstChild) span.appendChild(font.firstChild);
      font.parentNode?.replaceChild(span, font);
    });
    localStorage.setItem(EDITOR_LIVE_KEY, editor.innerHTML);
    setCurrentFontSize(px.toString());
    updateEditorToolbarState();
  }

  function changeFontSize(delta: number) {
    let px = parseInt(currentFontSize) || 14;
    px = Math.max(6, Math.min(200, px + delta));
    applyFontSize(px);
  }

  // Separate localStorage key for live editor content (saved on every keystroke)
  const EDITOR_LIVE_KEY = "meetings_editor_live_content";



  const [saving, setSaving] = useState(false);
  const [company, setCompany] = useState<CompanyInfo | null>(null);

  useEffect(() => {
    fetch("/api/company")
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d && d.name) setCompany(d);
      })
      .catch(() => {});
  }, []);

  const sidebarOpenRef = useRef(sidebarOpen);
  useEffect(() => {
    sidebarOpenRef.current = sidebarOpen;
  }, [sidebarOpen]);

  // Bind Touch Gestures programmatically to prevent browser overscroll navigation (back/forward page transition)
  useEffect(() => {
    if (!formOpen) return;

    const modalElement = document.getElementById("meeting-form-modal");
    if (!modalElement) return;

    let startX = 0;
    let startY = 0;

    const handleTouchStart = (e: TouchEvent) => {
      if (window.innerWidth > 835) return;
      const touch = e.touches[0];
      startX = touch.clientX;
      startY = touch.clientY;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (window.innerWidth > 835) return;
      const touch = e.touches[0];
      const diffX = touch.clientX - startX;
      const diffY = touch.clientY - startY;

      // If predominantly swiping horizontally
      if (Math.abs(diffX) > Math.abs(diffY)) {
        // Block browser history navigation swiping when swiping right from edge (to open)
        // or swiping left (to close) when the sidebar is open
        if ((diffX > 0 && startX < 50 && !sidebarOpenRef.current) || (diffX < 0 && sidebarOpenRef.current)) {
          if (e.cancelable) {
            e.preventDefault();
          }
        }
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (window.innerWidth > 835) return;
      const touch = e.changedTouches[0];
      const diffX = touch.clientX - startX;
      const diffY = touch.clientY - startY;

      if (Math.abs(diffX) > 60 && Math.abs(diffY) < 40) {
        if (diffX > 0 && !sidebarOpenRef.current && startX < 50) {
          setSidebarOpen(true);
        } else if (diffX < 0 && sidebarOpenRef.current) {
          setSidebarOpen(false);
        }
      }
    };

    modalElement.addEventListener("touchstart", handleTouchStart, { passive: true });
    modalElement.addEventListener("touchmove", handleTouchMove, { passive: false });
    modalElement.addEventListener("touchend", handleTouchEnd, { passive: true });

    return () => {
      modalElement.removeEventListener("touchstart", handleTouchStart);
      modalElement.removeEventListener("touchmove", handleTouchMove);
      modalElement.removeEventListener("touchend", handleTouchEnd);
    };
  }, [formOpen]);

  // Save full draft metadata (non-editor fields) to localStorage
  function saveDraftMeta() {
    if (!formOpen) return;
    const draftData = {
      isEdit,
      meetingId: isEdit ? selectedMeeting?.id : undefined,
      title: formTitle,
      description: formDesc,
      startTime: formStartTime,
      endTime: formEndTime,
      location: formLocation,
      attendees: JSON.stringify(formAttendees),
      host: formHost,
      secretary: formSecretary,
      showMinutesTemplate,
      minutes: localStorage.getItem(EDITOR_LIVE_KEY) || editorRef.current?.innerHTML || "",
      actionItems: JSON.stringify(formActionItems),
      files: JSON.stringify(formFiles),
      timestamp: Date.now()
    };
    localStorage.setItem("meetings_draft_data", JSON.stringify(draftData));
  }

  // Keep a ref so beforeunload/visibilitychange always has latest closure
  const saveDraftMetaRef = useRef<() => void>(() => {});
  saveDraftMetaRef.current = saveDraftMeta;

  // Save draft when user closes tab or navigates away
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") saveDraftMetaRef.current();
    };
    const handleBeforeUnload = () => saveDraftMetaRef.current();

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, []);

  // Initialize editor content from localStorage or formMinutes when form opens / editor re-mounts
  useEffect(() => {
    if (!formOpen || !editorRef.current) return;
    const liveContent = localStorage.getItem(EDITOR_LIVE_KEY);
    editorRef.current.innerHTML = liveContent !== null ? liveContent : formMinutes;
  }, [formOpen, editorKey]); // eslint-disable-line

  // Load draft from localStorage silently on mount/remount
  useEffect(() => {
    if (restoreAttemptedRef.current) return;
    
    const savedDraft = localStorage.getItem("meetings_draft_data");
    if (!savedDraft) {
      restoreAttemptedRef.current = true;
      return;
    }

    try {
      const draft = JSON.parse(savedDraft);
      
      // Discard drafts older than 24 hours
      if (!draft.timestamp || Date.now() - draft.timestamp > 24 * 60 * 60 * 1000) {
        localStorage.removeItem("meetings_draft_data");
        restoreAttemptedRef.current = true;
        return;
      }

      restoreAttemptedRef.current = true;

      const restoredMinutes = draft.minutes || "";

      setIsEdit(draft.isEdit);
      setFormTitle(draft.title);
      setFormDesc(draft.description || "");
      setFormStartTime(draft.startTime);
      setFormEndTime(draft.endTime);
      setFormLocation(draft.location);
      setFormAttendees(JSON.parse(draft.attendees || "[]"));
      setFormHost(draft.host);
      setFormSecretary(draft.secretary);
      setShowMinutesTemplate(draft.showMinutesTemplate);
      setFormMinutes(restoredMinutes);
      let draftItems: any[] = [];
      try {
        draftItems = JSON.parse(draft.actionItems || "[]");
      } catch (e) {}
      setFormActionItems(draftItems.map((item: any) => ({
        id: item.id || Math.random().toString(36).substring(2, 11),
        ...item
      })));
      setFormFiles(JSON.parse(draft.files || "[]"));

      if (draft.isEdit && draft.meetingId) {
        selectMeeting(draft.meetingId);
      }

      // Force editor re-mount so dangerouslySetInnerHTML picks up restored content
      setEditorKey(k => k + 1);
      setFormOpen(true);
    } catch (e) {
      console.error("Lỗi khôi phục bản nháp:", e);
      localStorage.removeItem("meetings_draft_data");
      restoreAttemptedRef.current = true;
    }
  }, [meetings]);

  // Load meetings
  useEffect(() => {
    if (session) {
      loadMeetings();
      loadEmployees();
    }
  }, [session, filter, search]); // eslint-disable-line

  // Click outside listener for employee dropdown and custom editor dropdowns
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (dropdownRef.current && !dropdownRef.current.contains(target)) {
        setEmpDropdownOpen(false);
      }
      if (blockTypeDropdownRef.current && !blockTypeDropdownRef.current.contains(target)) {
        setBlockDropdownOpen(false);
      }
      if (fontFamilyDropdownRef.current && !fontFamilyDropdownRef.current.contains(target)) {
        setFontDropdownOpen(false);
      }
      if (fontSizeDropdownRef.current && !fontSizeDropdownRef.current.contains(target)) {
        setSizeDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Keep sidebar visible on desktop sizes when screen is resized
  useEffect(() => {
    if (!formOpen) return;
    function handleResize() {
      if (window.innerWidth > 835) {
        setSidebarOpen(true);
      }
    }
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [formOpen]);

  async function loadMeetings() {
    setLoading(true);
    try {
      const res = await fetch(`/api/meetings?filter=${filter}&search=${encodeURIComponent(search)}`);
      if (!res.ok) {
        let errorMsg = "Lỗi tải cuộc họp";
        try {
          const data = await res.json();
          errorMsg = data.error || errorMsg;
        } catch (_) {}
        throw new Error(errorMsg);
      }
      const data = await res.json();
      setMeetings(data);

      // Auto-select first meeting if none selected
      if (data.length > 0 && !selectedMeeting) {
        selectMeeting(data[0].id);
      } else if (data.length === 0) {
        setSelectedMeeting(null);
      } else if (selectedMeeting) {
        // Refresh currently selected meeting
        const exists = data.find((m: Meeting) => m.id === selectedMeeting.id);
        if (exists) selectMeeting(selectedMeeting.id);
        else selectMeeting(data[0].id);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function loadEmployees() {
    try {
      const res = await fetch("/api/notifications/recipients");
      if (!res.ok) return;
      const data = await res.json();
      if (data.users) {
        // Lọc bỏ tài khoản công ty và các tài khoản admin không trực thuộc phòng ban
        const filtered = data.users.filter((u: any) => 
          u.department !== null && 
          !u.name.toLowerCase().includes("công ty") && 
          !u.name.toLowerCase().includes("admin")
        );
        setAllEmployees(filtered);
      }
    } catch (e) {
      console.error("Lỗi tải danh sách nhân viên:", e);
    }
  }

  async function selectMeeting(id: string) {
    setDetailLoading(true);
    setActionItemsExpanded(false);
    try {
      const res = await fetch(`/api/meetings/${id}`);
      if (!res.ok) {
        console.error("Lỗi tải chi tiết cuộc họp:", res.statusText);
        return;
      }
      const data = await res.json();
      setSelectedMeeting(data);
    } catch (e) {
      console.error("Lỗi tải chi tiết cuộc họp:", e);
    } finally {
      setDetailLoading(false);
    }
  }

  function openCreateForm() {
    // Clear live editor content so new form starts blank
    localStorage.removeItem(EDITOR_LIVE_KEY);
    localStorage.removeItem("meetings_draft_data");

    setIsEdit(false);
    setFormTitle("");
    setFormDesc("");

    // Default meeting time: now to 1 hour later
    const now = new Date();
    const tzOffset = now.getTimezoneOffset() * 60000;
    const localNow = new Date(now.getTime() - tzOffset);
    const localOneHourLater = new Date(now.getTime() + 3600000 - tzOffset);

    setFormStartTime(localNow.toISOString().slice(0, 16));
    setFormEndTime(localOneHourLater.toISOString().slice(0, 16));
    setFormLocation("");
    setFormMinutes("");
    setFormAttendees([]);
    setFormActionItems([]);
    setFormFiles([]);
    setFormHost("");
    setFormSecretary("");
    setShowMinutesTemplate(true);
    setEditorKey(k => k + 1); // Ensure editor re-initializes
    setFormOpen(true);
    setSidebarOpen(true);
  }

  function openEditForm() {
    if (!selectedMeeting) return;

    // Clear live editor content so edit form starts from saved data
    localStorage.removeItem(EDITOR_LIVE_KEY);
    localStorage.removeItem("meetings_draft_data");

    setIsEdit(true);
    setFormTitle(selectedMeeting.title);
    setFormDesc(selectedMeeting.description || "");

    // Format dates for input type datetime-local (YYYY-MM-DDThh:mm)
    const start = new Date(selectedMeeting.startTime);
    const end = new Date(selectedMeeting.endTime);
    const tzOffset = start.getTimezoneOffset() * 60000;

    setFormStartTime(new Date(start.getTime() - tzOffset).toISOString().slice(0, 16));
    setFormEndTime(new Date(end.getTime() - tzOffset).toISOString().slice(0, 16));

    setFormLocation(selectedMeeting.location || "");
    setFormMinutes((selectedMeeting.minutes || "").replace(/border-bottom:\s*2px\s*solid\s*(#000000|#000|rgb\(0,\s*0,\s*0\));?\s*(padding-bottom:\s*4px;?)?/gi, ""));
    const rawMinutes = (selectedMeeting.minutes || "").replace(/border-bottom:\s*2px\s*solid\s*(#000000|#000|rgb\(0,\s*0,\s*0\));?\s*(padding-bottom:\s*4px;?)?/gi, "");
    const hasTrueMarker = rawMinutes.includes('data-enabled="true"');
    const hasFalseMarker = rawMinutes.includes('data-enabled="false"');
    if (hasTrueMarker) {
      setShowMinutesTemplate(true);
    } else if (hasFalseMarker) {
      setShowMinutesTemplate(false);
    } else {
      setShowMinutesTemplate(true);
    }

    try {
      setFormAttendees(JSON.parse(selectedMeeting.attendees) || []);
      let parsedItems: any[] = [];
      try {
        parsedItems = JSON.parse(selectedMeeting.actionItems) || [];
      } catch (e) {}
      setFormActionItems(parsedItems.map((item: any) => ({
        id: item.id || Math.random().toString(36).substring(2, 11),
        ...item
      })));
    } catch (e) {
      setFormAttendees([]);
      setFormActionItems([]);
    }

    setFormFiles(selectedMeeting.resolvedFiles || []);
    setFormHost(selectedMeeting.host || "");
    setFormSecretary(selectedMeeting.secretary || "");
    setEditorKey(k => k + 1); // Ensure editor re-initializes with saved content
    setFormOpen(true);
    setSidebarOpen(true);
  }

  async function handleSaveMeeting() {
    if (!formTitle.trim()) return alert("Vui lòng nhập tiêu đề cuộc họp");
    if (!formStartTime || !formEndTime) return alert("Vui lòng chọn thời gian bắt đầu và kết thúc");
    if (new Date(formStartTime) >= new Date(formEndTime)) return alert("Thời gian kết thúc phải sau thời gian bắt đầu");

    setSaving(true);
    try {
      const url = isEdit ? `/api/meetings/${selectedMeeting?.id}` : "/api/meetings";
      const method = isEdit ? "PUT" : "POST";

      const payload = {
        title: formTitle,
        description: formDesc,
        startTime: new Date(formStartTime).toISOString(),
        endTime: new Date(formEndTime).toISOString(),
        location: formLocation,
        minutes: `<div id="minutes-template-marker" data-enabled="${showMinutesTemplate}" style="display:none;"></div>` + (editorRef.current?.innerHTML || formMinutes).replace(/<div id="minutes-template-marker"[^>]*><\/div>/g, ""),
        attendees: formAttendees,
        actionItems: formActionItems,
        files: formFiles.map(f => f.id),
        host: formHost,
        secretary: formSecretary,
      };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        let errorMsg = "Lỗi lưu cuộc họp";
        try {
          const data = await res.json();
          errorMsg = data.error || errorMsg;
        } catch (_) {}
        throw new Error(errorMsg);
      }
      const data = await res.json();

      setFormOpen(false);
      localStorage.removeItem("meetings_draft_data");
      localStorage.removeItem(EDITOR_LIVE_KEY);
      await loadMeetings();
      if (isEdit && selectedMeeting) {
        selectMeeting(selectedMeeting.id);
      } else if (data.id) {
        selectMeeting(data.id);
      }
    } catch (e: any) {
      alert(e.message || "Lỗi máy chủ");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteMeeting() {
    if (!meetingToDelete) return;
    try {
      const res = await fetch(`/api/meetings/${meetingToDelete}`, { method: "DELETE" });
      if (res.ok) {
        setMeetingToDelete(null);
        setSelectedMeeting(null);
        loadMeetings();
      } else {
        let errorMsg = "Không thể xóa cuộc họp";
        try {
          const data = await res.json();
          errorMsg = data.error || errorMsg;
        } catch (_) {}
        alert(errorMsg);
      }
    } catch (e) {
      console.error(e);
      alert("Lỗi máy chủ");
    }
  }

  // File picker handler
  function handleSelectFileFromLibrary(asset: any) {
    // Avoid duplicates
    if (!formFiles.some(f => f.id === asset.id)) {
      setFormFiles(prev => [...prev, {
        id: asset.id,
        name: asset.name,
        fileSize: asset.fileSize,
        fileType: asset.fileType,
        fileUrl: asset.fileUrl,
        thumbnail: asset.thumbnail,
      }]);
    }
  }

  // Attendees selection handlers
  function removeAttendee(empId: string, empName: string) {
    setFormAttendees(prev => prev.filter(att => att.id !== empId));
    setFormHost(curr => curr === empName ? "" : curr);
    setFormSecretary(curr => curr === empName ? "" : curr);
  }

  function toggleEmployeeAttendee(emp: EmployeeAttendee) {
    if (formAttendees.some(a => a.id === emp.id)) {
      removeAttendee(emp.id, emp.name);
    } else {
      setFormAttendees(prev => [...prev, emp]);
    }
  }

  function formatTaskDate(dateStr: string) {
    if (!dateStr) return "—";
    try {
      const parts = dateStr.split("-");
      if (parts.length === 3) {
        const [year, month, day] = parts;
        return `${day}/${month}/${year}`;
      }
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString("vi-VN");
    } catch {
      return dateStr;
    }
  }

  function syncActionItemsToEditor(items: ActionItem[]) {
    if (!editorRef.current) return;

    let currentHtml = editorRef.current.innerHTML || "";
    
    // Filter out empty action items
    const validItems = items.filter(item => item.task.trim() !== "" || item.assignee.trim() !== "");

    if (validItems.length === 0) {
      // Remove the section if it exists
      const parser = new DOMParser();
      const doc = parser.parseFromString(currentHtml, "text/html");
      const section = doc.getElementById("editor-action-items-section");
      if (section) {
        section.remove();
        const newHtml = doc.body.innerHTML;
        editorRef.current.innerHTML = newHtml;
        localStorage.setItem(EDITOR_LIVE_KEY, newHtml);
      }
      return;
    }

    const tableRows = validItems.map(item => {
      const task = item.task.trim() || "—";
      const assignee = item.assignee.trim() || "—";
      const start = formatTaskDate(item.startDate);
      const deadline = formatTaskDate(item.deadline);
      return `
        <tr>
          <td style="border: 1px solid #000; padding: 6px 8px; text-align: left;">${task}</td>
          <td style="border: 1px solid #000; padding: 6px 8px; text-align: left;">${assignee}</td>
          <td style="border: 1px solid #000; padding: 6px 8px; text-align: center;">${start}</td>
          <td style="border: 1px solid #000; padding: 6px 8px; text-align: center;">${deadline}</td>
        </tr>
      `;
    }).join("");

    const newSectionHtml = `
<div id="editor-action-items-section" style="margin-top: 24px;" contenteditable="false">
  <h4 style="font-size: 14px; font-weight: bold; text-transform: uppercase; margin-top: 0; margin-bottom: 8px; color: #000;">
    Phân công công việc
  </h4>
  <table style="width: 100%; border-collapse: collapse; font-size: 13px; color: #000; border: 1px solid #000;">
    <thead>
      <tr style="background-color: #f2f2f2;">
        <th style="border: 1px solid #000; padding: 6px 8px; text-align: left; font-weight: bold;">Nội dung công việc</th>
        <th style="border: 1px solid #000; padding: 6px 8px; text-align: left; font-weight: bold; width: 250px;">Người thực hiện</th>
        <th style="border: 1px solid #000; padding: 6px 8px; text-align: center; font-weight: bold; width: 100px;">Bắt đầu</th>
        <th style="border: 1px solid #000; padding: 6px 8px; text-align: center; font-weight: bold; width: 100px;">Hạn chót</th>
      </tr>
    </thead>
    <tbody>
      ${tableRows}
    </tbody>
  </table>
</div>`.trim();

    const parser = new DOMParser();
    const doc = parser.parseFromString(currentHtml, "text/html");
    const existingSection = doc.getElementById("editor-action-items-section");

    if (existingSection) {
      const tempDiv = doc.createElement("div");
      tempDiv.innerHTML = newSectionHtml;
      const newSectionNode = tempDiv.firstElementChild;
      if (newSectionNode) {
        existingSection.replaceWith(newSectionNode);
      }
    } else {
      const tempDiv = doc.createElement("div");
      tempDiv.innerHTML = newSectionHtml;
      const newSectionNode = tempDiv.firstElementChild;
      if (newSectionNode) {
        doc.body.appendChild(newSectionNode);
      }
    }

    const finalHtml = doc.body.innerHTML;
    editorRef.current.innerHTML = finalHtml;
    localStorage.setItem(EDITOR_LIVE_KEY, finalHtml);
  }

  // Action Items builder
  function addActionItem() {
    setFormActionItems(prev => {
      const updated = [...prev, { id: Math.random().toString(36).substring(2, 11), task: "", assignee: "", startDate: "", deadline: "", completed: false }];
      syncActionItemsToEditor(updated);
      return updated;
    });
  }

  function removeActionItem(idx: number) {
    setFormActionItems(prev => {
      const updated = prev.filter((_, i) => i !== idx);
      syncActionItemsToEditor(updated);
      return updated;
    });
  }

  function updateActionItem(idx: number, field: keyof ActionItem, value: any) {
    setFormActionItems(prev => {
      const updated = prev.map((item, i) => i === idx ? { ...item, [field]: value } : item);
      syncActionItemsToEditor(updated);
      return updated;
    });
  }

  function getMeetingStatus(m: Meeting) {
    const now = new Date();
    const end = new Date(m.endTime);
    const start = new Date(m.startTime);

    if (now > end) return { label: "Đã diễn ra", class: "bg-secondary" };
    if (now < start) return { label: "Sắp diễn ra", class: "bg-success" };
    return { label: "Đang diễn ra", class: "bg-danger" };
  }

  const getMeetingNumber = (meetingId: string | null, startTimeStr: string) => {
    if (!startTimeStr) return "YYYYmmdd-001";
    try {
      const targetDate = new Date(startTimeStr);
      const targetDateStr = targetDate.toLocaleDateString("en-CA"); // YYYY-MM-DD
      
      const dayMeetings = meetings
        .filter(m => {
          const mDate = new Date(m.startTime);
          return mDate.toLocaleDateString("en-CA") === targetDateStr && m.id !== meetingId;
        });

      let finalIndex = 1;
      if (meetingId) {
        const currentMeeting = meetings.find(m => m.id === meetingId);
        if (currentMeeting) {
          const sorted = [...dayMeetings, currentMeeting].sort((a, b) => {
            const timeA = new Date(a.startTime).getTime();
            const timeB = new Date(b.startTime).getTime();
            if (timeA !== timeB) return timeA - timeB;
            return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          });
          finalIndex = sorted.findIndex(m => m.id === meetingId) + 1;
        } else {
          finalIndex = dayMeetings.length + 1;
        }
      } else {
        finalIndex = dayMeetings.length + 1;
      }

      const yyyy = targetDate.getFullYear();
      const mm = String(targetDate.getMonth() + 1).padStart(2, "0");
      const dd = String(targetDate.getDate()).padStart(2, "0");
      const xxx = String(finalIndex).padStart(3, "0");
      
      return `${yyyy}${mm}${dd}-${xxx}`;
    } catch {
      return "YYYYmmdd-001";
    }
  };

  const hostDept = formAttendees.find(a => a.name === formHost)?.department || "";

  const topRulerNumbers = [];
  // Left margin centimeter labels (1, 2) going left from the 174px margin boundary (left margin = 3cm)
  for (let i = 1; i <= 2; i++) {
    topRulerNumbers.push(
      <span key={`top-margin-left-${i}`} style={{ position: "absolute", left: 174 - i * 38, bottom: 8, fontSize: 8.5, color: "#6b7280", transform: "translateX(-50%)", userSelect: "none", fontWeight: "600" }}>
        {i}
      </span>
    );
  }
  // Active region centimeter labels (1, 2, ..., 16) going right from the 174px margin boundary
  for (let i = 1; i <= 16; i++) {
    topRulerNumbers.push(
      <span key={`top-active-${i}`} style={{ position: "absolute", left: 174 + i * 38, bottom: 8, fontSize: 8.5, color: "#6b7280", transform: "translateX(-50%)", userSelect: "none", fontWeight: "600" }}>
        {i}
      </span>
    );
  }

  const leftRulerNumbers = [];
  // Top margin centimeter labels (1, 2) going up from the 108px margin boundary (top margin = 2cm)
  for (let i = 1; i <= 2; i++) {
    leftRulerNumbers.push(
      <span key={`left-margin-top-${i}`} style={{ position: "absolute", top: 108 - i * 38, right: 6, fontSize: 8.5, color: "#6b7280", transform: "translateY(-50%) rotate(-90deg)", transformOrigin: "center", userSelect: "none", fontWeight: "600" }}>
        {i}
      </span>
    );
  }
  // Active region centimeter labels (1, 2, ..., 120) going down from the 108px margin boundary
  for (let i = 1; i <= 120; i++) {
    leftRulerNumbers.push(
      <span key={`left-active-${i}`} style={{ position: "absolute", top: 108 + i * 38, right: 6, fontSize: 8.5, color: "#6b7280", transform: "translateY(-50%) rotate(-90deg)", transformOrigin: "center", userSelect: "none", fontWeight: "600" }}>
        {i}
      </span>
    );
  }

  return (
    <div style={{ display: "flex", height: "100%", background: "var(--background)", borderRadius: 14, overflow: "hidden", border: "1px solid var(--border)" }}>
      {/* ── Master List Panel (Left) ── */}
      <div
        className={`master-list-panel ${mobileView === "list" ? "mobile-active" : "mobile-inactive"}`}
        style={{ width: 340, borderRight: "1px solid var(--border)", display: "flex", flexDirection: "column", background: "var(--card)", flexShrink: 0 }}
      >
        {/* Search & Filters */}
        <div style={{ padding: 12, borderBottom: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ position: "relative", flex: 1 }}>
              <i className="bi bi-search" style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--muted-foreground)", fontSize: 12 }} />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Tìm cuộc họp..."
                style={{ width: "100%", height: 34, paddingLeft: 30, borderRadius: 8, border: "1px solid var(--border)", background: "var(--muted)", color: "var(--foreground)", fontSize: 13, outline: "none" }}
              />
            </div>
            <button
              onClick={openCreateForm}
              className="btn btn-primary d-flex align-items-center justify-content-center"
              style={{ width: 34, height: 34, padding: 0, borderRadius: 8, flexShrink: 0 }}
              title="Tạo cuộc họp mới"
            >
              <i className="bi bi-plus-lg" style={{ fontSize: 15 }} />
            </button>
          </div>

          <div style={{ display: "flex", background: "var(--muted)", borderRadius: 8, padding: 3, gap: 2 }}>
            {(["all", "upcoming", "past"] as const).map(type => {
              const active = filter === type;
              const labels = {
                all: "Tất cả",
                upcoming: "Sắp họp",
                past: "Đã họp",
              };
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => setFilter(type)}
                  style={{
                    flex: 1,
                    height: 28,
                    border: "none",
                    borderRadius: 6,
                    fontSize: 12.5,
                    fontWeight: 600,
                    transition: "all 0.2s ease",
                    background: active ? "var(--primary)" : "transparent",
                    color: active ? "#fff" : "var(--muted-foreground)",
                    boxShadow: active ? "0 2px 6px rgba(99,102,241,0.2)" : "none",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer"
                  }}
                  className="filter-tab-button"
                >
                  {labels[type]}
                </button>
              );
            })}
          </div>
        </div>

        {/* Scrollable list */}
        <div style={{ flex: 1, overflowY: "auto", padding: "8px 0" }}>
          {loading ? (
            <div style={{ padding: 24, textAlign: "center", color: "var(--muted-foreground)", fontSize: 13 }}>
              <i className="bi bi-hourglass-split" /> Đang tải cuộc họp...
            </div>
          ) : meetings.length === 0 ? (
            <div style={{ padding: 24, textAlign: "center", color: "var(--muted-foreground)", fontSize: 13 }}>
              Không tìm thấy cuộc họp nào
            </div>
          ) : (
            meetings.map(m => {
              const active = selectedMeeting?.id === m.id;
              const status = getMeetingStatus(m);
              return (
                <div
                  key={m.id}
                  onClick={() => {
                    selectMeeting(m.id);
                    setMobileView("detail");
                  }}
                  style={{
                    padding: "12px 16px",
                    borderBottom: "1px solid var(--border)",
                    cursor: "pointer",
                    background: active ? "rgba(99,102,241,0.08)" : "transparent",
                    borderLeft: active ? "4px solid var(--primary)" : "4px solid transparent",
                    transition: "all 0.15s",
                  }}
                  className="list-item-hover"
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
                    <span className={`badge ${status.class}`} style={{ fontSize: 10, fontWeight: 700 }}>
                      {status.label}
                    </span>
                    <span style={{ fontSize: 11, color: "var(--muted-foreground)" }}>
                      {new Date(m.startTime).toLocaleDateString("vi-VN")}
                    </span>
                  </div>
                  <h4 style={{ margin: 0, fontSize: 13.5, fontWeight: 700, color: "var(--foreground)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {m.title}
                  </h4>
                  <div style={{ fontSize: 11.5, color: "var(--muted-foreground)", display: "flex", alignItems: "center", gap: 4, marginTop: 4 }}>
                    <i className="bi bi-geo-alt" />
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {m.location || "Không rõ địa điểm"}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ── Details Panel (Right) ── */}
      <div
        className={`details-panel ${mobileView === "detail" ? "mobile-active" : "mobile-inactive"}`}
        style={{ flex: 1, display: "flex", flexDirection: "column", background: "var(--background)", minWidth: 0 }}
      >
        {detailLoading ? (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--muted-foreground)" }}>
            <div style={{ textAlign: "center" }}>
              <i className="bi bi-arrow-repeat" style={{ animation: "spin 1s linear infinite", fontSize: 24 }} />
              <div style={{ fontSize: 13, marginTop: 8 }}>Đang tải thông tin cuộc họp...</div>
            </div>
          </div>
        ) : !selectedMeeting ? (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--muted-foreground)" }}>
            <div style={{ textAlign: "center" }}>
              <i className="bi bi-calendar-check" style={{ fontSize: 40, opacity: 0.3 }} />
              <div style={{ fontSize: 13, marginTop: 12 }}>Chọn một cuộc họp từ danh sách để xem chi tiết</div>
            </div>
          </div>
        ) : (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0, padding: 24 }}>
            {/* Header info */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "1px solid var(--border)", paddingBottom: 16, marginBottom: 20 }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                <button
                  onClick={() => setMobileView("list")}
                  className="btn btn-outline-secondary btn-sm mobile-back-btn"
                  style={{ display: "none", padding: "4px 8px", borderRadius: 6, marginTop: 2 }}
                  type="button"
                >
                  <i className="bi bi-arrow-left" style={{ fontSize: 14 }} />
                </button>
                <div>
                  <h2 style={{ margin: 0, fontSize: 19, fontWeight: 800, color: "var(--foreground)" }}>
                    {selectedMeeting.title}
                  </h2>
                  <div style={{ display: "flex", columnGap: 16, rowGap: 6, marginTop: 4, fontSize: 13, color: "var(--muted-foreground)", flexWrap: "wrap", alignItems: "center" }}>
                    <span>
                      <i className="bi bi-clock me-1" />
                      {fmtDateTime(selectedMeeting.startTime)} - {new Date(selectedMeeting.endTime).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                    {selectedMeeting.location && (
                      <span>
                        <i className="bi bi-geo-alt me-1" />
                        {selectedMeeting.location}
                      </span>
                    )}
                    {(selectedMeeting.host || selectedMeeting.secretary) && (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 4, whiteSpace: "nowrap" }}>
                        <i className="bi bi-person-badge me-1" />
                        {selectedMeeting.host && (
                          <span>
                            Chủ trì: <strong>{selectedMeeting.host}</strong>
                          </span>
                        )}
                        {selectedMeeting.host && selectedMeeting.secretary && <span style={{ margin: "0 6px", color: "var(--border)" }}>|</span>}
                        {selectedMeeting.secretary && (
                          <span>
                            Thư ký: <strong>{selectedMeeting.secretary}</strong>
                          </span>
                        )}
                      </span>
                    )}
                  </div>
                  {(() => {
                    let attendees: EmployeeAttendee[] = [];
                    try {
                      attendees = JSON.parse(selectedMeeting.attendees) || [];
                    } catch (e) { }

                    if (attendees.length === 0) return null;

                    return (
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6, fontSize: 13, color: "var(--muted-foreground)" }}>
                        <i className="bi bi-people" style={{ fontSize: 14 }} />
                        <span>
                          Thành viên ({attendees.length}): <strong>{attendees.map(a => a.name).join(", ")}</strong>
                        </span>
                      </div>
                    );
                  })()}
                </div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={openEditForm} className="btn btn-outline-primary btn-sm d-flex align-items-center justify-content-center" style={{ width: 32, height: 32, padding: 0 }} title="Sửa">
                  <i className="bi bi-pencil" style={{ fontSize: 14 }} />
                </button>
                <button onClick={() => setMeetingToDelete(selectedMeeting.id)} className="btn btn-outline-danger btn-sm d-flex align-items-center justify-content-center" style={{ width: 32, height: 32, padding: 0 }} title="Xóa">
                  <i className="bi bi-trash" style={{ fontSize: 14 }} />
                </button>
              </div>
            </div>

            {/* Content areas */}
            {(() => {
              const hasAttachments = selectedMeeting.resolvedFiles && selectedMeeting.resolvedFiles.length > 0;
              return (
                <div style={{ display: "grid", gridTemplateColumns: hasAttachments ? "1fr 280px" : "1fr", gap: 24, flex: 1, minHeight: 0 }}>
                  {/* Left pane: Description, Minutes, Action items */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 24, flex: 1, minHeight: 0 }}>
                    {selectedMeeting.description && (
                      <div>
                        <h5 style={{ fontSize: 13.5, fontWeight: 700, color: "var(--foreground)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>
                          Mô tả cuộc họp
                        </h5>
                        <p style={{ fontSize: 13, color: "var(--muted-foreground)", lineHeight: 1.5, margin: 0, whiteSpace: "pre-wrap" }}>
                          {selectedMeeting.description}
                        </p>
                      </div>
                    )}

                    <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
                      <h5 style={{ fontSize: 13.5, fontWeight: 700, color: "var(--foreground)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>
                        {selectedMeeting.minutes?.includes('data-enabled="false"') ? "Nội dung cuộc họp" : "Biên bản cuộc họp"}
                      </h5>
                      <div style={{
                        fontSize: 12,
                        color: "var(--foreground)",
                        lineHeight: 1.6,
                        padding: 16,
                        borderRadius: 10,
                        background: "#ffffff",
                        border: "1px solid var(--border)",
                        flex: 1,
                        overflowY: "auto",
                        minHeight: 120,
                        fontFamily: "'Roboto Condensed', 'Arial Narrow', Arial, sans-serif",
                      }}>
                        {selectedMeeting.minutes ? (
                          <div className="rich-text-content">
                            {!selectedMeeting.minutes.includes('data-enabled="false"') && (
                              <div style={{
                                fontFamily: "'Roboto Condensed', 'Arial Narrow', Arial, sans-serif",
                                fontSize: "12px",
                                lineHeight: "1.6",
                                color: "#000",
                                marginBottom: 16,
                                textAlign: "left"
                              }}>
                                <div style={{ textAlign: "center", fontWeight: "bold", fontSize: "13px", textTransform: "uppercase", marginBottom: 4 }}>
                                  BIÊN BẢN CUỘC HỌP
                                </div>
                                <div style={{ textAlign: "center", fontSize: "12px", marginBottom: 4 }}>
                                  Số: {getMeetingNumber(selectedMeeting.id, selectedMeeting.startTime)}
                                </div>
                                <div style={{ textAlign: "center", fontSize: "12px", fontStyle: "italic", marginBottom: 16 }}>
                                  Về việc: {selectedMeeting.title || "—"}
                                </div>
                                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                                  <div><strong>Thời gian:</strong> {formatMeetingTime(selectedMeeting.startTime, selectedMeeting.endTime)}</div>
                                  <div><strong>Địa điểm:</strong> {selectedMeeting.location || "—"}</div>
                                  <div>
                                    <strong>Thành phần tham dự:</strong>
                                    {(() => {
                                      try {
                                        const atts = JSON.parse(selectedMeeting.attendees) as EmployeeAttendee[];
                                        if (atts.length === 0) return <div style={{ paddingLeft: 12 }}>—</div>;
                                        return (
                                          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                                            {atts.map(a => (
                                              <div key={a.id} style={{ display: "grid", gridTemplateColumns: "180px 150px 1fr", paddingLeft: 12 }}>
                                                <div>- {a.name}</div>
                                                <div>{a.position ? `- ${a.position}` : ""}</div>
                                                <div>{a.department ? `- ${a.department}` : ""}</div>
                                              </div>
                                            ))}
                                          </div>
                                        );
                                      } catch {
                                        return <div style={{ paddingLeft: 12 }}>—</div>;
                                      }
                                    })()}
                                  </div>
                                  <div><strong>Chủ trì:</strong> {selectedMeeting.host || "—"}</div>
                                  <div><strong>Thư ký:</strong> {selectedMeeting.secretary || "—"}</div>
                                </div>
                              </div>
                            )}
                            <div dangerouslySetInnerHTML={{ __html: selectedMeeting.minutes?.replace(/border-bottom:\s*2px\s*solid\s*(#000000|#000|rgb\(0,\s*0,\s*0\));?\s*(padding-bottom:\s*4px;?)?/gi, "") || "" }} />
                            
                            {/* Signature block for detail view */}
                            {!selectedMeeting.minutes?.includes('data-enabled="false"') && (
                              <div style={{
                                display: "flex",
                                justifyContent: "space-between",
                                marginTop: "48px",
                                fontFamily: "'Roboto Condensed', 'Arial Narrow', Arial, sans-serif",
                                color: "#000",
                                fontSize: "13px",
                                borderTop: "1px dashed var(--border)",
                                paddingTop: 24,
                                pageBreakInside: "avoid"
                              }}>
                                <div style={{ width: "45%", textAlign: "center" }}>
                                  <div style={{ fontWeight: "bold", textTransform: "uppercase" }}>THƯ KÝ CUỘC HỌP</div>
                                  <div style={{ fontStyle: "italic", fontSize: "11px", color: "#4b5563", marginTop: 4 }}>(Ký, ghi rõ họ tên)</div>
                                  <div style={{ height: 60 }} />
                                  <div style={{ fontWeight: "bold" }}>{selectedMeeting.secretary || "—"}</div>
                                </div>
                                <div style={{ width: "45%", textAlign: "center" }}>
                                  <div style={{ fontWeight: "bold", textTransform: "uppercase" }}>CHỦ TRÌ CUỘC HỌP</div>
                                  <div style={{ fontStyle: "italic", fontSize: "11px", color: "#4b5563", marginTop: 4 }}>(Ký, ghi rõ họ tên)</div>
                                  <div style={{ height: 60 }} />
                                  <div style={{ fontWeight: "bold" }}>{selectedMeeting.host || "—"}</div>
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          <span style={{ color: "var(--muted-foreground)", fontStyle: "italic" }}>Chưa ghi nhận nội dung cuộc họp</span>
                        )}
                      </div>
                    </div>

                    {/* Action Items */}
                    {(() => {
                      let items: ActionItem[] = [];
                      try {
                        items = JSON.parse(selectedMeeting.actionItems) || [];
                      } catch (e) { }

                      if (items.length === 0) return null;

                      return (
                        <div style={{ borderTop: "1px solid var(--border)", paddingTop: 16 }}>
                          <div
                            onClick={() => setActionItemsExpanded(!actionItemsExpanded)}
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              cursor: "pointer",
                              userSelect: "none",
                              paddingBottom: actionItemsExpanded ? 12 : 0,
                            }}
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <h5 style={{ margin: 0, fontSize: 13.5, fontWeight: 700, color: "var(--foreground)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                                Phân công công việc
                              </h5>
                              <span className="badge bg-primary rounded-pill" style={{ fontSize: 10, padding: "3px 6px" }}>
                                {items.length}
                              </span>
                            </div>
                            <button
                              type="button"
                              className="btn btn-link p-0 text-muted-foreground d-flex align-items-center"
                              style={{ color: "var(--muted-foreground)", textDecoration: "none" }}
                            >
                              <span style={{ fontSize: 12, marginRight: 6, color: "var(--muted-foreground)" }}>
                                {actionItemsExpanded ? "Thu gọn" : "Hiển thị"}
                              </span>
                              <i className={`bi bi-chevron-${actionItemsExpanded ? "up" : "down"}`} style={{ fontSize: 13 }} />
                            </button>
                          </div>
                          
                          {/* Collapsible Container */}
                          <div
                            style={{
                              maxHeight: actionItemsExpanded ? "2000px" : "0px",
                              overflow: "hidden",
                              transition: "all 0.3s ease-in-out",
                              opacity: actionItemsExpanded ? 1 : 0,
                              display: "flex",
                              flexDirection: "column",
                              gap: 8,
                            }}
                          >
                            {items.map((item, idx) => (
                              <div
                                key={idx}
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 12,
                                  padding: "10px 14px",
                                  borderRadius: 8,
                                  background: "var(--card)",
                                  border: "1px solid var(--border)",
                                  boxShadow: "0 1px 2px rgba(0,0,0,0.02)",
                                }}
                              >
                                <i className="bi bi-check-square-fill text-primary" style={{ fontSize: 14 }} />
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--foreground)" }}>{item.task}</div>
                                  <div style={{ fontSize: 11, color: "var(--muted-foreground)", marginTop: 2 }}>
                                    Người thực hiện: <span className="fw-semibold">{item.assignee}</span>
                                    {item.startDate && ` · Bắt đầu: ${formatTaskDate(item.startDate)}`}
                                    {item.deadline && ` · Hạn chót: ${formatTaskDate(item.deadline)}`}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Right pane: Attachments (only if there are attachments) */}
                  {hasAttachments && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 24, overflowY: "auto" }}>
                      {/* Attachments */}
                      <div>
                        <h5 style={{ fontSize: 13.5, fontWeight: 700, color: "var(--foreground)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 10 }}>
                          Tài liệu ({selectedMeeting.resolvedFiles?.length || 0})
                        </h5>
                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                          {selectedMeeting.resolvedFiles.map(f => (
                            <div
                              key={f.id}
                              onClick={() => setPreviewAsset(f)}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 8,
                                padding: "8px 10px",
                                borderRadius: 8,
                                border: "1px solid var(--border)",
                                background: "var(--card)",
                                cursor: "pointer",
                                transition: "all 0.15s",
                              }}
                              className="file-card-hover"
                            >
                              <i className={`bi ${getFileIcon(f.fileType)}`} style={{ fontSize: 16 }} />
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: 12, fontWeight: 600, color: "var(--foreground)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={f.name}>
                                  {f.name}
                                </div>
                                <div style={{ fontSize: 10, color: "var(--muted-foreground)", marginTop: 1 }}>
                                  {fmtBytes(f.fileSize)}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        )}
      </div>

      {/* ── Create / Edit Meeting Modal ── */}
      {formOpen && (
        <div id="meeting-form-modal" style={{ position: "fixed", inset: 0, background: "var(--background)", zIndex: 9999, display: "flex", flexDirection: "column", overscrollBehaviorX: "none" }}>
          {/* Modal Header */}
          <div style={{ padding: "16px 24px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--card)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="btn btn-outline-secondary btn-sm mobile-toggle-btn"
                style={{ display: "none", padding: "4px 8px", borderRadius: 6 }}
                type="button"
              >
                <i className={`bi ${sidebarOpen ? "bi-x-lg" : "bi-layout-sidebar"}`} style={{ fontSize: 14 }} />
              </button>
              <i className="bi bi-calendar-plus text-primary" style={{ fontSize: 20 }}></i>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "var(--foreground)" }}>
                {isEdit ? "Cập nhật cuộc họp" : "Tạo cuộc họp mới"}
              </h3>
            </div>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <button onClick={() => {
                setFormOpen(false);
                localStorage.removeItem("meetings_draft_data");
                localStorage.removeItem(EDITOR_LIVE_KEY);
              }} className="btn btn-outline-secondary btn-sm px-4 fw-semibold" style={{ fontSize: 12.5, borderRadius: 8 }}>Hủy</button>
              <button onClick={handleSaveMeeting} disabled={saving} className="btn btn-primary btn-sm px-4 fw-semibold" style={{ fontSize: 12.5, borderRadius: 8, display: "flex", alignItems: "center", gap: 6 }}>
                {saving ? <i className="bi bi-arrow-repeat" style={{ animation: "spin 1s linear infinite" }} /> : <i className="bi bi-check-lg" />}
                {saving ? "Đang lưu..." : "Lưu cuộc họp"}
              </button>
            </div>
          </div>

          {/* Modal Body: Left Sidebar + Right Main content */}
          <div style={{ display: "flex", flex: 1, overflow: "hidden", minHeight: 0, position: "relative" }}>
            {/* Mobile Backdrop */}
            {sidebarOpen && (
              <div
                className="mobile-sidebar-backdrop"
                onClick={() => setSidebarOpen(false)}
                style={{
                  display: "none",
                  position: "absolute",
                  inset: 0,
                  background: "rgba(0,0,0,0.3)",
                  backdropFilter: "blur(2px)",
                  zIndex: 40,
                }}
              />
            )}
            {/* Sidebar (Left) */}
            <div
              className={`meeting-sidebar ${sidebarOpen ? "mobile-sidebar-expanded" : "mobile-sidebar-collapsed"}`}
              style={{
                width: 440,
                borderRight: "1px solid var(--border)",
                display: "flex",
                flexDirection: "column",
                background: "var(--card)",
                overflowY: "auto",
                padding: "24px 20px",
                gap: 24,
                flexShrink: 0,
                transition: "all 0.25s ease-in-out"
              }}
            >

              {/* Basic Fields */}
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <h4 style={{ margin: 0, fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--primary)" }}>Thông tin chung</h4>

                <div>
                  <label className="form-label mb-1" style={{ fontSize: 12.5, fontWeight: 600, color: "var(--foreground)" }}>Tiêu đề cuộc họp *</label>
                  <input
                    type="text"
                    value={formTitle}
                    onChange={e => setFormTitle(e.target.value)}
                    placeholder="Nhập tiêu đề cuộc họp..."
                    className="form-control form-control-sm"
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <label className="form-label mb-1" style={{ fontSize: 12.5, fontWeight: 600, color: "var(--foreground)" }}>Thời gian bắt đầu *</label>
                    <input
                      type="datetime-local"
                      value={formStartTime}
                      onChange={e => setFormStartTime(e.target.value)}
                      className="form-control form-control-sm"
                    />
                  </div>
                  <div>
                    <label className="form-label mb-1" style={{ fontSize: 12.5, fontWeight: 600, color: "var(--foreground)" }}>Thời gian kết thúc *</label>
                    <input
                      type="datetime-local"
                      value={formEndTime}
                      onChange={e => setFormEndTime(e.target.value)}
                      className="form-control form-control-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="form-label mb-1" style={{ fontSize: 12.5, fontWeight: 600, color: "var(--foreground)" }}>Địa điểm cuộc họp</label>
                  <input
                    type="text"
                    value={formLocation}
                    onChange={e => setFormLocation(e.target.value)}
                    placeholder="Ví dụ: Phòng họp A, hoặc Link Google Meet..."
                    className="form-control form-control-sm"
                  />
                </div>
              </div>

              <hr style={{ margin: 0, marginTop: -8, marginBottom: -16, borderColor: "var(--border)" }} />

              {/* Attendees Multi-select with dropdown */}
              <div style={{ position: "relative" }} ref={dropdownRef}>
                <h4 style={{ margin: "0 0 8px 0", fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--primary)" }}>Thành viên tham dự</h4>
                <div
                  onClick={() => setEmpDropdownOpen(true)}
                  style={{
                    minHeight: 38,
                    borderRadius: 6,
                    border: "1px solid var(--border)",
                    padding: "4px 8px",
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 6,
                    background: "var(--muted)",
                    cursor: "pointer",
                  }}
                >
                  {formAttendees.length === 0 ? (
                    <span style={{ color: "var(--muted-foreground)", fontSize: 13, alignSelf: "center" }}>Chọn nhân viên...</span>
                  ) : (
                    formAttendees.map(a => (
                      <span
                        key={a.id}
                        style={{
                          background: "var(--primary)",
                          color: "white",
                          borderRadius: 4,
                          padding: "2px 6px",
                          fontSize: 12,
                          display: "flex",
                          alignItems: "center",
                          gap: 4,
                        }}
                      >
                        {a.name}
                        <i
                          onClick={(e) => {
                            e.stopPropagation();
                            removeAttendee(a.id, a.name);
                          }}
                          className="bi bi-x"
                          style={{ cursor: "pointer", fontSize: 13 }}
                        />
                      </span>
                    ))
                  )}
                </div>

                {empDropdownOpen && (
                  <div
                    style={{
                      position: "absolute",
                      bottom: "100%",
                      left: 0,
                      right: 0,
                      background: "var(--card)",
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                      boxShadow: "0 6px 16px rgba(0,0,0,0.1)",
                      zIndex: 10,
                      marginTop: 4,
                      padding: 8,
                      maxHeight: 200,
                      display: "flex",
                      flexDirection: "column",
                      gap: 6,
                    }}
                  >
                    <input
                      type="text"
                      value={empSearch}
                      onChange={e => setEmpSearch(e.target.value)}
                      placeholder="Tìm tên nhân viên..."
                      className="form-control form-control-sm mb-2"
                      onClick={(e) => e.stopPropagation()}
                    />
                    <div style={{ overflowY: "auto", flex: 1, display: "flex", flexDirection: "column", gap: 2 }}>
                      {allEmployees
                        .filter(e => e.name.toLowerCase().includes(empSearch.toLowerCase()))
                        .map(emp => {
                          const selected = formAttendees.some(a => a.id === emp.id);
                          return (
                            <div
                              key={emp.id}
                              onClick={() => toggleEmployeeAttendee(emp)}
                              style={{
                                padding: "6px 8px",
                                cursor: "pointer",
                                borderRadius: 4,
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                background: selected ? "rgba(99,102,241,0.08)" : "transparent",
                                fontSize: 12.5,
                              }}
                              className="dropdown-item-hover"
                            >
                              <div>
                                <span style={{ fontWeight: 600, color: "var(--foreground)" }}>{emp.name}</span>
                                {emp.position && <span style={{ fontSize: 10, color: "var(--muted-foreground)", marginLeft: 6 }}>({emp.position} · {emp.department})</span>}
                              </div>
                              {selected && <i className="bi bi-check text-primary" style={{ fontSize: 15 }} />}
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}
              </div>

              {/* Host and Secretary Fields */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label className="form-label mb-1" style={{ fontSize: 12.5, fontWeight: 600, color: "var(--foreground)" }}>Chủ trì</label>
                  <select
                    value={formHost}
                    onChange={e => setFormHost(e.target.value)}
                    className="form-select form-select-sm"
                    style={{ fontSize: 12 }}
                    disabled={formAttendees.length === 0}
                  >
                    <option value="">{formAttendees.length === 0 ? "Chưa có thành viên..." : "Chọn chủ trì..."}</option>
                    {formAttendees.map(emp => (
                      <option key={emp.id} value={emp.name}>{emp.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="form-label mb-1" style={{ fontSize: 12.5, fontWeight: 600, color: "var(--foreground)" }}>Thư ký</label>
                  <select
                    value={formSecretary}
                    onChange={e => setFormSecretary(e.target.value)}
                    className="form-select form-select-sm"
                    style={{ fontSize: 12 }}
                    disabled={formAttendees.length === 0}
                  >
                    <option value="">{formAttendees.length === 0 ? "Chưa có thành viên..." : "Chọn thư ký..."}</option>
                    {formAttendees.map(emp => (
                      <option key={emp.id} value={emp.name}>{emp.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <hr style={{ margin: 0, borderColor: "var(--border)" }} />

              {/* Action Items builder */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <h4 style={{ margin: 0, fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--primary)" }}>Phân công công việc</h4>
                  <button onClick={addActionItem} type="button" className="btn btn-outline-primary btn-sm py-0.5 px-2" style={{ fontSize: 11 }}>
                    + Thêm công việc
                  </button>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {formActionItems.length === 0 ? (
                    <div style={{ fontSize: 12, color: "var(--muted-foreground)", fontStyle: "italic", textAlign: "center", padding: 8, border: "1px dashed var(--border)", borderRadius: 6 }}>
                      Chưa có phân công công việc nào
                    </div>
                  ) : (
                    formActionItems.map((item, idx) => (
                      <div key={idx} style={{ display: "flex", flexDirection: "column", gap: 6, padding: 10, border: "1px solid var(--border)", borderRadius: 8, background: "var(--background)" }}>
                        <div style={{ display: "flex", gap: 6 }}>
                          <input
                            type="text"
                            value={item.task}
                            onChange={e => updateActionItem(idx, "task", e.target.value)}
                            placeholder="Mô tả công việc..."
                            className="form-control form-control-sm"
                            style={{ fontSize: 12, flex: 1 }}
                          />
                          <button
                            type="button"
                            onClick={() => removeActionItem(idx)}
                            className="btn btn-outline-danger btn-sm p-0 d-flex align-items-center justify-content-center"
                            style={{ height: 28, width: 28, flexShrink: 0 }}
                          >
                            <i className="bi bi-trash" style={{ fontSize: 11 }} />
                          </button>
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 1fr", gap: 6, alignItems: "end" }}>
                          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                            <label style={{ fontSize: 10, color: "var(--muted-foreground)" }}>Người làm</label>
                            <input
                              type="text"
                              list="all-employees-datalist"
                              value={item.assignee}
                              onChange={e => updateActionItem(idx, "assignee", e.target.value)}
                              placeholder="Chọn..."
                              className="form-control form-control-sm"
                              style={{ fontSize: 12 }}
                            />
                          </div>
                          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                            <label style={{ fontSize: 10, color: "var(--muted-foreground)" }}>Bắt đầu</label>
                            <input
                              type="date"
                              value={item.startDate || ""}
                              onChange={e => updateActionItem(idx, "startDate", e.target.value)}
                              className="form-control form-control-sm"
                              style={{ fontSize: 12, padding: "4px 4px" }}
                            />
                          </div>
                          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                            <label style={{ fontSize: 10, color: "var(--muted-foreground)" }}>Kết thúc</label>
                            <input
                              type="date"
                              value={item.deadline || ""}
                              onChange={e => updateActionItem(idx, "deadline", e.target.value)}
                              className="form-control form-control-sm"
                              style={{ fontSize: 12, padding: "4px 4px" }}
                            />
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                {/* Datalist gợi ý cho input người thực hiện */}
                <datalist id="all-employees-datalist">
                  {allEmployees.map(emp => (
                    <option key={emp.id} value={emp.name}>
                      {emp.department ? `${emp.name} (${emp.department})` : emp.name}
                    </option>
                  ))}
                </datalist>
              </div>

              <hr style={{ margin: 0, borderColor: "var(--border)" }} />

              {/* Attachments list & picker button */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <h4 style={{ margin: 0, fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--primary)" }}>Tài liệu đính kèm</h4>
                  <button onClick={() => setPickerOpen(true)} type="button" className="btn btn-outline-primary btn-sm py-0.5 px-2" style={{ fontSize: 11 }}>
                    <i className="bi bi-paperclip" /> Chọn từ Thư viện
                  </button>
                </div>
                {formFiles.length === 0 ? (
                  <div style={{ fontSize: 12, color: "var(--muted-foreground)", fontStyle: "italic", textAlign: "center", padding: 8, border: "1px dashed var(--border)", borderRadius: 6 }}>
                    Chưa đính kèm tài liệu nào
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {formFiles.map(file => (
                      <div
                        key={file.id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          padding: "6px 10px",
                          borderRadius: 6,
                          border: "1px solid var(--border)",
                          background: "var(--card)",
                          position: "relative",
                        }}
                      >
                        <i className={`bi ${getFileIcon(file.fileType)}`} style={{ fontSize: 14 }} />
                        <span style={{ fontSize: 11.5, fontWeight: 600, color: "var(--foreground)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
                          {file.name}
                        </span>
                        <i
                          onClick={() => setFormFiles(prev => prev.filter(f => f.id !== file.id))}
                          className="bi bi-x-circle-fill text-muted-foreground"
                          style={{ cursor: "pointer", fontSize: 13, color: "#888" }}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Right Main Content (Biên bản họp / Kết luận) */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column", background: "var(--background)", minWidth: 0 }}>
              {/* Header Info */}
              <div style={{ padding: "20px 24px 10px 24px", display: "flex", flexDirection: "column", gap: 4 }}>
                <h4 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "var(--foreground)" }}>Biên bản cuộc họp & Kết luận</h4>
                <p style={{ margin: 0, fontSize: 12.5, color: "var(--muted-foreground)" }}>Ghi lại các nội dung chính, kết luận, thảo luận trong cuộc họp.</p>
              </div>

              {/* Rich Text Editor Toolbar */}
              <div className="editor-toolbar" style={{ margin: "0 24px 12px 24px", display: "flex", alignItems: "center", gap: 6, padding: 8, background: "var(--muted)", borderRadius: 8, border: "1px solid var(--border)", flexWrap: "wrap" }}>

                {/* Block Type Dropdown */}
                <div style={{ position: "relative" }} ref={blockTypeDropdownRef}>
                  <button
                    type="button"
                    className="btn btn-sm btn-light d-flex align-items-center justify-content-between"
                    style={{
                      width: 120,
                      height: 28,
                      fontSize: 12,
                      borderRadius: 6,
                      background: "var(--card)",
                      color: "var(--foreground)",
                      border: "1px solid var(--border)",
                      textAlign: "left",
                      padding: "0 8px",
                    }}
                    onMouseDown={e => e.preventDefault()}
                    onClick={() => setBlockDropdownOpen(!blockDropdownOpen)}
                  >
                    <span>{currentBlockType === "heading" ? "Heading 2" : "Normal Text"}</span>
                    <i className="bi bi-chevron-down" style={{ fontSize: 10, color: "var(--muted-foreground)" }} />
                  </button>
                  {blockDropdownOpen && (
                    <div
                      style={{
                        position: "absolute",
                        top: 32,
                        left: 0,
                        zIndex: 1050,
                        background: "var(--card)",
                        border: "1px solid var(--border)",
                        borderRadius: 6,
                        padding: 4,
                        width: 130,
                        boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                        display: "flex",
                        flexDirection: "column",
                        gap: 2,
                      }}
                    >
                      {[
                        { value: "normal", label: "Normal Text" },
                        { value: "heading", label: "Heading 2" },
                      ].map(opt => (
                        <div
                          key={opt.value}
                          onMouseDown={e => e.preventDefault()}
                          onClick={() => {
                            const val = opt.value;
                            if (val === "heading") document.execCommand('formatBlock', false, '<h2>');
                            else document.execCommand('formatBlock', false, '<p>');
                            setCurrentBlockType(val as "normal" | "heading");
                            const editor = editorRef.current;
                            if (editor) {
                              localStorage.setItem(EDITOR_LIVE_KEY, editor.innerHTML);
                            }
                            setBlockDropdownOpen(false);
                            updateEditorToolbarState();
                          }}
                          style={{
                            padding: "6px 8px",
                            fontSize: 12,
                            borderRadius: 4,
                            cursor: "pointer",
                            background: currentBlockType === opt.value ? "var(--muted)" : "transparent",
                            transition: "background 0.15s ease",
                          }}
                          className="editor-dropdown-item"
                        >
                          {opt.label}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div style={{ width: 1, height: 20, background: "var(--border)" }} />

                {/* Font Family Dropdown */}
                <div style={{ position: "relative" }} ref={fontFamilyDropdownRef}>
                  <button
                    type="button"
                    className="btn btn-sm btn-light d-flex align-items-center justify-content-between"
                    style={{
                      width: 140,
                      height: 28,
                      fontSize: 12,
                      borderRadius: 6,
                      background: "var(--card)",
                      color: "var(--foreground)",
                      border: "1px solid var(--border)",
                      textAlign: "left",
                      padding: "0 8px",
                    }}
                    onMouseDown={e => e.preventDefault()}
                    onClick={() => setFontDropdownOpen(!fontDropdownOpen)}
                  >
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {(() => {
                        const labels: Record<string, string> = {
                          default: "Roboto (Mặc định)",
                          arial: "Arial",
                          times: "Times New Roman",
                          courier: "Courier New",
                          georgia: "Georgia",
                          verdana: "Verdana",
                          tahoma: "Tahoma",
                        };
                        return labels[currentFontFamily] || "Roboto (Mặc định)";
                      })()}
                    </span>
                    <i className="bi bi-chevron-down ms-1" style={{ fontSize: 10, color: "var(--muted-foreground)" }} />
                  </button>
                  {fontDropdownOpen && (
                    <div
                      style={{
                        position: "absolute",
                        top: 32,
                        left: 0,
                        zIndex: 1050,
                        background: "var(--card)",
                        border: "1px solid var(--border)",
                        borderRadius: 6,
                        padding: 4,
                        width: 160,
                        boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                        display: "flex",
                        flexDirection: "column",
                        gap: 2,
                      }}
                    >
                      {[
                        { value: "default", label: "Roboto (Mặc định)", className: "font-item-default" },
                        { value: "arial", label: "Arial", className: "font-item-arial" },
                        { value: "times", label: "Times New Roman", className: "font-item-times" },
                        { value: "courier", label: "Courier New", className: "font-item-courier" },
                        { value: "georgia", label: "Georgia", className: "font-item-georgia" },
                        { value: "verdana", label: "Verdana", className: "font-item-verdana" },
                        { value: "tahoma", label: "Tahoma", className: "font-item-tahoma" },
                      ].map(opt => (
                        <div
                          key={opt.value}
                          onMouseDown={e => e.preventDefault()}
                          onClick={() => {
                            const fontMap: Record<string, string> = {
                              default: "'Roboto Condensed', Arial Narrow, Arial, sans-serif",
                              arial: "Arial, Helvetica, sans-serif",
                              times: "'Times New Roman', Times, serif",
                              courier: "'Courier New', Courier, monospace",
                              georgia: "Georgia, serif",
                              verdana: "Verdana, Geneva, sans-serif",
                              tahoma: "Tahoma, sans-serif",
                            };
                            const ff = fontMap[opt.value] || fontMap.default;
                            
                            document.execCommand('fontSize', false, '7');
                            const editor = editorRef.current;
                            if (editor) {
                              editor.querySelectorAll('font[size="7"]').forEach(font => {
                                const span = document.createElement('span');
                                span.style.fontFamily = ff;
                                while (font.firstChild) span.appendChild(font.firstChild);
                                font.parentNode?.replaceChild(span, font);
                              });
                              localStorage.setItem(EDITOR_LIVE_KEY, editor.innerHTML);
                            }
                            
                            setCurrentFontFamily(opt.value);
                            setFontDropdownOpen(false);
                            updateEditorToolbarState();
                          }}
                          style={{
                            padding: "6px 8px",
                            fontSize: 12.5,
                            borderRadius: 4,
                            cursor: "pointer",
                            background: currentFontFamily === opt.value ? "var(--muted)" : "transparent",
                            transition: "background 0.15s ease",
                          }}
                          className={`editor-dropdown-item ${opt.className}`}
                        >
                          {opt.label}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div style={{ width: 1, height: 20, background: "var(--border)" }} />

                {/* Font Size controls */}
                <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
                  <button
                    type="button"
                    title="Giảm kích thước"
                    className="btn btn-sm btn-light d-flex align-items-center justify-content-center"
                    style={{
                      height: 28,
                      width: 28,
                      fontSize: 13,
                      border: "1px solid var(--border)",
                      borderRadius: "6px",
                      background: "var(--card)",
                      color: "var(--foreground)",
                    }}
                    onMouseDown={e => e.preventDefault()}
                    onClick={() => changeFontSize(-1)}
                  >
                    <i className="bi bi-dash" />
                  </button>

                  <div style={{ position: "relative", display: "flex", alignItems: "center" }} ref={fontSizeDropdownRef}>
                    <input
                      type="number"
                      value={currentFontSize}
                      min={6}
                      max={200}
                      onMouseDown={saveSelection}
                      onChange={e => setCurrentFontSize(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          applyFontSize(parseInt(currentFontSize));
                          (e.target as HTMLInputElement).blur();
                        }
                      }}
                      onBlur={() => applyFontSize(parseInt(currentFontSize))}
                      style={{
                        width: 44,
                        height: 28,
                        fontSize: 12.5,
                        textAlign: "center",
                        borderRadius: "6px 0 0 6px",
                        border: "1px solid var(--border)",
                        borderRight: "none",
                        background: "var(--card)",
                        color: "var(--foreground)",
                        padding: "0 2px",
                        outline: "none"
                      }}
                    />
                    <button
                      type="button"
                      className="btn btn-sm btn-light d-flex align-items-center justify-content-center"
                      style={{
                        height: 28,
                        width: 20,
                        border: "1px solid var(--border)",
                        borderRadius: "0 6px 6px 0",
                        background: "var(--card)",
                        color: "var(--foreground)",
                        padding: 0,
                      }}
                      onMouseDown={e => e.preventDefault()}
                      onClick={() => setSizeDropdownOpen(!sizeDropdownOpen)}
                    >
                      <i className="bi bi-chevron-down" style={{ fontSize: 9, color: "var(--muted-foreground)" }} />
                    </button>

                    {sizeDropdownOpen && (
                      <div
                        style={{
                          position: "absolute",
                          top: 32,
                          left: 0,
                          zIndex: 1050,
                          background: "var(--card)",
                          border: "1px solid var(--border)",
                          borderRadius: 6,
                          padding: 4,
                          maxHeight: 200,
                          overflowY: "auto",
                          width: 80,
                          boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                          display: "flex",
                          flexDirection: "column",
                          gap: 2,
                        }}
                      >
                        {[8, 9, 10, 11, 12, 13, 14, 15, 16, 18, 20, 22, 24, 28, 32, 36, 48, 60, 72, 96].map(s => (
                          <div
                            key={s}
                            onMouseDown={e => e.preventDefault()}
                            onClick={() => {
                              applyFontSize(s);
                              setSizeDropdownOpen(false);
                            }}
                            style={{
                              padding: "4px 6px",
                              fontSize: 12,
                              textAlign: "center",
                              borderRadius: 4,
                              cursor: "pointer",
                              background: parseInt(currentFontSize) === s ? "var(--muted)" : "transparent",
                              transition: "background 0.15s ease",
                            }}
                            className="editor-dropdown-item"
                          >
                            {s}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <span style={{ fontSize: 11, color: "var(--muted-foreground)", userSelect: "none" }}>px</span>

                  <button
                    type="button"
                    title="Tăng kích thước"
                    className="btn btn-sm btn-light d-flex align-items-center justify-content-center"
                    style={{
                      height: 28,
                      width: 28,
                      fontSize: 13,
                      border: "1px solid var(--border)",
                      borderRadius: "6px",
                      background: "var(--card)",
                      color: "var(--foreground)",
                    }}
                    onMouseDown={e => e.preventDefault()}
                    onClick={() => changeFontSize(1)}
                  >
                    <i className="bi bi-plus" />
                  </button>
                </div>

                <div style={{ width: 1, height: 20, background: "var(--border)" }} />

                {/* Formatting Buttons: Bold / Italic / Underline */}
                <div style={{ display: "flex", gap: 4 }}>
                  {[
                    { cmd: 'bold', icon: 'bi-type-bold', title: 'In đậm' },
                    { cmd: 'italic', icon: 'bi-type-italic', title: 'In nghiêng' },
                    { cmd: 'underline', icon: 'bi-type-underline', title: 'Gạch chân' },
                  ].map(item => (
                    <button
                      key={item.cmd}
                      type="button"
                      title={item.title}
                      className="btn btn-sm btn-light d-flex align-items-center justify-content-center"
                      style={{ height: 28, width: 28, fontSize: 13, border: "1px solid var(--border)", borderRadius: "6px", background: "var(--card)", color: "var(--foreground)" }}
                      onMouseDown={e => e.preventDefault()}
                      onClick={() => document.execCommand(item.cmd)}
                    >
                      <i className={`bi ${item.icon}`}></i>
                    </button>
                  ))}

                  {/* Text Color */}
                  <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                    <button
                      type="button"
                      title="Màu chữ"
                      className="btn btn-sm btn-light d-flex align-items-center justify-content-center"
                      style={{ height: 28, width: 28, fontSize: 13, border: "1px solid var(--border)", borderRadius: "6px", background: "var(--card)", color: "var(--foreground)" }}
                      onMouseDown={e => e.preventDefault()}
                      onClick={() => document.getElementById("foreColorInput")?.click()}
                    >
                      <i className="bi bi-type" style={{ position: "relative" }}>
                        <span style={{ position: "absolute", bottom: -2, left: 0, right: 0, height: 3, background: formTextColor }} />
                      </i>
                    </button>
                    <input
                      id="foreColorInput"
                      type="color"
                      value={formTextColor}
                      onChange={(e) => {
                        setFormTextColor(e.target.value);
                        document.execCommand('foreColor', false, e.target.value);
                      }}
                      style={{ position: "absolute", visibility: "hidden", width: 0, height: 0 }}
                    />
                  </div>

                  {/* Highlight Color */}
                  <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                    <button
                      type="button"
                      title="Tô highlight"
                      className="btn btn-sm btn-light d-flex align-items-center justify-content-center"
                      style={{ height: 28, width: 28, fontSize: 13, border: "1px solid var(--border)", borderRadius: "6px", background: "var(--card)", color: "var(--foreground)" }}
                      onMouseDown={e => e.preventDefault()}
                      onClick={() => document.getElementById("hiliteColorInput")?.click()}
                    >
                      <i className="bi bi-pencil-fill" style={{ fontSize: 10, position: "relative" }}>
                        <span style={{ position: "absolute", bottom: -4, left: -2, right: -2, height: 3, background: formHighlightColor }} />
                      </i>
                    </button>
                    <input
                      id="hiliteColorInput"
                      type="color"
                      value={formHighlightColor}
                      onChange={(e) => {
                        setFormHighlightColor(e.target.value);
                        document.execCommand('hiliteColor', false, e.target.value);
                      }}
                      style={{ position: "absolute", visibility: "hidden", width: 0, height: 0 }}
                    />
                  </div>
                </div>

                <div style={{ width: 1, height: 20, background: "var(--border)" }} />

                {/* Lists */}
                <div style={{ display: "flex", gap: 4 }}>
                  <button
                    type="button"
                    title="Danh sách dấu chấm"
                    className="btn btn-sm btn-light d-flex align-items-center justify-content-center"
                    style={{ height: 28, width: 28, fontSize: 13, border: "1px solid var(--border)", borderRadius: "6px", background: "var(--card)", color: "var(--foreground)" }}
                    onMouseDown={e => e.preventDefault()}
                    onClick={() => document.execCommand('insertUnorderedList')}
                  >
                    <i className="bi bi-list-ul"></i>
                  </button>
                  <button
                    type="button"
                    title="Danh sách số"
                    className="btn btn-sm btn-light d-flex align-items-center justify-content-center"
                    style={{ height: 28, width: 28, fontSize: 13, border: "1px solid var(--border)", borderRadius: "6px", background: "var(--card)", color: "var(--foreground)" }}
                    onMouseDown={e => e.preventDefault()}
                    onClick={() => document.execCommand('insertOrderedList')}
                  >
                    <i className="bi bi-list-ol"></i>
                  </button>
                </div>

                <div style={{ width: 1, height: 20, background: "var(--border)" }} />

                {/* Alignment */}
                <div style={{ display: "flex", gap: 4 }}>
                  {[
                    { cmd: 'justifyLeft', icon: 'bi-text-left', title: 'Căn trái' },
                    { cmd: 'justifyCenter', icon: 'bi-text-center', title: 'Căn giữa' },
                    { cmd: 'justifyRight', icon: 'bi-text-right', title: 'Căn phải' },
                  ].map(item => (
                    <button
                      key={item.cmd}
                      type="button"
                      title={item.title}
                      className="btn btn-sm btn-light d-flex align-items-center justify-content-center"
                      style={{ height: 28, width: 28, fontSize: 13, border: "1px solid var(--border)", borderRadius: "6px", background: "var(--card)", color: "var(--foreground)" }}
                      onMouseDown={e => e.preventDefault()}
                      onClick={() => document.execCommand(item.cmd)}
                    >
                      <i className={`bi ${item.icon}`}></i>
                    </button>
                  ))}
                </div>

                {/* Minutes Template Toggle + Print — pushed to right */}
                <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}>
                  {/* Print Button */}
                  <button
                    type="button"
                    title="In biên bản"
                    className="btn btn-sm btn-light d-flex align-items-center justify-content-center"
                    style={{ height: 28, width: 28, fontSize: 14, border: "1px solid var(--border)", borderRadius: "6px", background: "var(--card)", color: "var(--foreground)" }}
                    onMouseDown={e => e.preventDefault()}
                    onClick={() => {
                      printDocumentById("meeting-editor-paper-page", "portrait", `Biên bản cuộc họp - ${formTitle || "Chưa đặt tên"}`, true);
                    }}
                  >
                    <i className="bi bi-printer"></i>
                  </button>

                  <div style={{ width: 1, height: 20, background: "var(--border)" }} />

                  <span style={{ fontSize: "12.5px", fontWeight: 600, color: "var(--foreground)" }}>Biên bản</span>
                  <div className="form-check form-switch m-0" style={{ display: "flex", alignItems: "center" }}>
                    <input
                      className="form-check-input"
                      type="checkbox"
                      role="switch"
                      id="toggle-minutes-template"
                      checked={showMinutesTemplate}
                      onChange={(e) => setShowMinutesTemplate(e.target.checked)}
                      style={{ cursor: "pointer" }}
                    />
                  </div>
                </div>
              </div>

              {/* Rulers and Canvas Container */}
              <div
                style={{
                  flex: 1,
                  overflow: "auto",
                  background: "var(--muted)",
                  borderTop: "1px solid var(--border)",
                  position: "relative"
                }}
              >
                {/* Full-Viewport Sticky Grid Wrapper */}
                <div className="editor-grid-wrapper" style={{
                  display: "grid",
                  gridTemplateColumns: "30px 1fr",
                  gridTemplateRows: "24px auto",
                  width: "950px",
                  margin: "0 auto",
                  position: "relative"
                }}>
                  {/* Sticky Corner Corner */}
                  <div className="editor-sticky-corner" style={{
                    gridColumn: 1,
                    gridRow: 1,
                    position: "sticky",
                    top: 0,
                    left: 0,
                    zIndex: 20,
                    background: "var(--muted)",
                    borderBottom: "1px solid var(--border)",
                    borderRight: "1px solid var(--border)",
                    height: 24,
                    width: 30
                  }} />                  {/* Sticky Top Ruler */}
                  <div className="editor-top-ruler" style={{
                    gridColumn: 2,
                    gridRow: 1,
                    position: "sticky",
                    top: 0,
                    zIndex: 10,
                    height: 24,
                    width: "100%",
                    background: "linear-gradient(to right, var(--muted) 0px, var(--muted) 174px, #ffffff 174px, #ffffff 784px, var(--muted) 784px, var(--muted) 100%)",
                    borderBottom: "1px solid var(--border)",
                    overflow: "hidden"
                  }}>
                    <div style={{ position: "relative", width: "100%", height: "100%" }}>
                      {/* Margin Markers (hourglasscaret at boundaries) */}
                      <div style={{ position: "absolute", left: 174, bottom: 0, transform: "translate(-50%, 2px)", zIndex: 5, color: "#9ca3af", fontSize: 10, cursor: "ew-resize" }}>
                        <i className="bi bi-caret-up-fill" style={{ fontSize: 7 }} />
                      </div>
                      <div style={{ position: "absolute", left: 784, bottom: 0, transform: "translate(-50%, 2px)", zIndex: 5, color: "#9ca3af", fontSize: 10, cursor: "ew-resize" }}>
                        <i className="bi bi-caret-up-fill" style={{ fontSize: 7 }} />
                      </div>

                      {/* SVG Ticks (offset by page left position 60px so pattern aligns perfectly with margin at 174px) */}
                      <div style={{
                        position: "absolute",
                        left: 60,
                        top: 0,
                        width: 800,
                        height: "100%",
                        backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='38' height='24'><line x1='0' y1='12' x2='0' y2='24' stroke='%23a1a1aa' stroke-width='1'/><line x1='19' y1='16' x2='19' y2='24' stroke='%23a1a1aa' stroke-width='1'/><line x1='4' y1='20' x2='4' y2='24' stroke='%23e4e4e7' stroke-width='1'/><line x1='8' y1='20' x2='8' y2='24' stroke='%23e4e4e7' stroke-width='1'/><line x1='11' y1='20' x2='11' y2='24' stroke='%23e4e4e7' stroke-width='1'/><line x1='15' y1='20' x2='15' y2='24' stroke='%23e4e4e7' stroke-width='1'/><line x1='23' y1='20' x2='23' y2='24' stroke='%23e4e4e7' stroke-width='1'/><line x1='27' y1='20' x2='27' y2='24' stroke='%23e4e4e7' stroke-width='1'/><line x1='30' y1='20' x2='30' y2='24' stroke='%23e4e4e7' stroke-width='1'/><line x1='34' y1='20' x2='34' y2='24' stroke='%23e4e4e7' stroke-width='1'/></svg>")`,
                        backgroundRepeat: "repeat-x"
                      }} />

                      {/* Numbers */}
                      {topRulerNumbers}
                    </div>
                  </div>

                  {/* Sticky Left Ruler */}
                  <div className="editor-left-ruler" style={{
                    gridColumn: 1,
                    gridRow: 2,
                    position: "sticky",
                    left: 0,
                    zIndex: 10,
                    width: 30,
                    height: "100%",
                    background: "linear-gradient(to bottom, var(--muted) 0px, var(--muted) 108px, #ffffff 108px, #ffffff calc(100% - 76px), var(--muted) calc(100% - 76px), var(--muted) 100%)",
                    borderRight: "1px solid var(--border)",
                    overflow: "hidden"
                  }}>
                    <div style={{ position: "relative", width: "100%", height: "100%" }}>
                      {/* Margin Markers */}
                      <div style={{ position: "absolute", top: 108, right: 0, transform: "translate(2px, -50%) rotate(-90deg)", zIndex: 5, color: "#9ca3af", fontSize: 10, cursor: "ns-resize" }}>
                        <i className="bi bi-caret-up-fill" style={{ fontSize: 7 }} />
                      </div>
                      <div style={{ position: "absolute", bottom: 76, right: 0, transform: "translate(2px, 50%) rotate(90deg)", zIndex: 5, color: "#9ca3af", fontSize: 10, cursor: "ns-resize" }}>
                        <i className="bi bi-caret-up-fill" style={{ fontSize: 7 }} />
                      </div>

                      {/* SVG Ticks (offset by page top position 32px so pattern aligns perfectly with top margin at 108px) */}
                      <div style={{
                        position: "absolute",
                        top: 32,
                        left: 0,
                        width: "100%",
                        height: "100%",
                        backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='30' height='38'><line x1='14' y1='0' x2='30' y2='0' stroke='%23a1a1aa' stroke-width='1'/><line x1='18' y1='19' x2='30' y2='19' stroke='%23a1a1aa' stroke-width='1'/><line x1='22' y1='4' x2='30' y2='4' stroke='%23e4e4e7' stroke-width='1'/><line x1='22' y1='8' x2='30' y2='8' stroke='%23e4e4e7' stroke-width='1'/><line x1='22' y1='11' x2='30' y2='11' stroke='%23e4e4e7' stroke-width='1'/><line x1='22' y1='15' x2='30' y2='15' stroke='%23e4e4e7' stroke-width='1'/><line x1='22' y1='23' x2='30' y2='23' stroke='%23e4e4e7' stroke-width='1'/><line x1='22' y1='27' x2='30' y2='27' stroke='%23e4e4e7' stroke-width='1'/><line x1='22' y1='30' x2='30' y2='30' stroke='%23e4e4e7' stroke-width='1'/><line x1='22' y1='34' x2='30' y2='34' stroke='%23e4e4e7' stroke-width='1'/></svg>")`,
                        backgroundRepeat: "repeat-y"
                      }} />

                      {/* Numbers */}
                      {leftRulerNumbers}
                    </div>
                  </div>

                  {/* Centered A4 Page Workspace */}
                  <div className="editor-workspace-container" style={{
                    gridColumn: 2,
                    gridRow: 2,
                    display: "flex",
                    justifyContent: "flex-start",
                    alignItems: "flex-start",
                    padding: "32px 60px",
                    width: "100%",
                    height: "100%"
                  }}>
                    {/* Centered A4 Page */}
                    <div
                      id="meeting-editor-paper-page"
                      className="editor-paper-page"
                      style={{
                        width: 800,
                        minHeight: 1000,
                        height: "auto",
                        background: "#fff",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                        border: "1px solid var(--border)",
                        padding: "76px 76px 76px 114px",
                        color: "#333", // Ensure text contrast inside page
                        display: "flex",
                        flexDirection: "column"
                      }}
                    >
                      {/* Company Info Header */}
                      <div style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        marginBottom: 24,
                        fontSize: "12px",
                        fontFamily: "'Roboto Condensed', 'Arial Narrow', Arial, sans-serif",
                        color: "#000",
                        lineHeight: 1.3
                      }}>
                        <div style={{ display: "flex", alignItems: "flex-start", gap: 10, width: "48%", flexShrink: 0 }}>
                          {company?.logoUrl && (
                            <img
                              src={company.logoUrl}
                              alt="Logo"
                              style={{
                                width: 44,
                                height: 44,
                                objectFit: "contain",
                                flexShrink: 0,
                                marginTop: 2
                              }}
                            />
                          )}
                          <div style={{ display: "flex", flexDirection: "column", textAlign: "left" }}>
                            <div style={{ fontWeight: "bold", textTransform: "uppercase", fontSize: "11px", lineHeight: 1.2 }}>
                              {company?.name || "CÔNG TY CỔ PHẦN CÔNG NGHỆ LÊ TECH SOLUTION"}
                            </div>
                            {hostDept && (
                              <div style={{ fontSize: "9.5px", marginTop: 2, textTransform: "uppercase" }} className="text-uppercase">
                                {/^(phòng|ban|bộ phận)/i.test(hostDept) ? hostDept : `Phòng ${hostDept}`}
                              </div>
                            )}
                          </div>
                        </div>
                        {showMinutesTemplate ? (
                          <div style={{ textAlign: "center", width: "48%", flexShrink: 0 }}>
                            <div style={{ fontWeight: "bold", fontSize: "11px", textTransform: "uppercase" }}>CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
                            <div style={{ fontWeight: "bold", fontSize: "9.5px", marginTop: 2 }}>Độc lập - Tự do - Hạnh phúc</div>
                            <div style={{ fontSize: "11px", width: "35%", height: "1px", background: "#000", margin: "6px auto 0 auto" }} />
                          </div>
                        ) : (
                          <div style={{ textAlign: "right", width: "48%", flexShrink: 0, fontSize: "11px", lineHeight: "1.4" }}>
                            <div style={{ fontWeight: "bold", fontSize: "11.5px", textTransform: "uppercase", color: "var(--primary)" }}>THÔNG TIN CUỘC HỌP</div>
                            <div style={{ fontWeight: "bold", marginTop: 4, fontSize: "11.5px" }}>{formTitle || "—"}</div>
                            <div style={{ marginTop: 2 }}><strong>Thời gian:</strong> {formatMeetingTime(formStartTime, formEndTime)}</div>
                            {formLocation && <div style={{ marginTop: 2 }}><strong>Địa điểm:</strong> {formLocation}</div>}
                            {formAttendees.length > 0 && (
                              <div style={{ marginTop: 2 }}><strong>Thành phần tham dự:</strong> {formAttendees.map(a => a.name).join(", ")}</div>
                            )}
                            {formHost && <div style={{ marginTop: 2 }}><strong>Chủ trì:</strong> {formHost}</div>}
                            {formSecretary && <div style={{ marginTop: 2 }}><strong>Thư ký:</strong> {formSecretary}</div>}
                          </div>
                        )}
                      </div>

                      {/* Personal Notes Header */}
                      {!showMinutesTemplate && (
                        <div style={{
                          fontFamily: "'Roboto Condensed', 'Arial Narrow', Arial, sans-serif",
                          fontSize: "14px",
                          fontWeight: "bold",
                          textTransform: "uppercase",
                          color: "#000",
                          marginBottom: 12,
                          textAlign: "left"
                        }}>
                          NỘI DUNG CUỘC HỌP:
                        </div>
                      )}

                      {/* Minutes Template Block */}
                      {showMinutesTemplate && (
                        <div style={{
                          fontFamily: "'Roboto Condensed', 'Arial Narrow', Arial, sans-serif",
                          fontSize: "14px",
                          lineHeight: "1.6",
                          color: "#000",
                          marginBottom: 16,
                          textAlign: "left"
                        }}>
                          <div style={{ textAlign: "center", fontWeight: "bold", fontSize: "16px", textTransform: "uppercase", marginBottom: 4 }}>
                            BIÊN BẢN CUỘC HỌP
                          </div>
                          <div style={{ textAlign: "center", fontSize: "14px", marginBottom: 4 }}>
                            Số: {getMeetingNumber(isEdit ? selectedMeeting?.id || null : null, formStartTime)}
                          </div>
                          <div style={{ textAlign: "center", fontSize: "14px", fontStyle: "italic", marginBottom: 16 }}>
                            Về việc: {formTitle || "—"}
                          </div>
                          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                            <div><strong>Thời gian:</strong> {formatMeetingTime(formStartTime, formEndTime)}</div>
                            <div><strong>Địa điểm:</strong> {formLocation || "—"}</div>
                            <div>
                              <strong>Thành phần tham dự:</strong>
                              {formAttendees.length === 0 ? (
                                <div style={{ paddingLeft: 12 }}>—</div>
                              ) : (
                                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                                  {formAttendees.map(a => (
                                    <div key={a.id} style={{ display: "grid", gridTemplateColumns: "180px 150px 1fr", paddingLeft: 12 }}>
                                      <div>- {a.name}</div>
                                      <div>{a.position ? `- ${a.position}` : ""}</div>
                                      <div>{a.department ? `- ${a.department}` : ""}</div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                            <div><strong>Chủ trì:</strong> {formHost || "—"}</div>
                            <div><strong>Thư ký:</strong> {formSecretary || "—"}</div>
                          </div>
                        </div>
                      )}

                      <div
                        key={editorKey}
                        ref={editorRef}
                        contentEditable
                        suppressContentEditableWarning={true}
                        className="rich-text-editor flex-grow-1"
                        style={{
                          outline: "none",
                          fontFamily: "'Roboto Condensed', 'Arial Narrow', Arial, sans-serif",
                          fontSize: "14px",
                          lineHeight: "1.6",
                          height: "100%"
                        }}
                        onInput={() => {
                          // Save on every keystroke—most reliable way to prevent data loss
                          if (editorRef.current) {
                            localStorage.setItem(EDITOR_LIVE_KEY, editorRef.current.innerHTML);
                          }
                        }}
                        onBlur={() => {
                          // Save selection and draw overlay so it stays visible while toolbar is used
                          saveSelection();
                          drawSelectionOverlays();
                        }}
                        onFocus={() => {
                          // Remove fake overlays — real selection highlight takes over
                          clearSelectionOverlays();
                        }}
                        onKeyUp={updateEditorToolbarState}
                        onMouseUp={updateEditorToolbarState}
                      />

                      {/* Signature block for edit/print view */}
                      {showMinutesTemplate && (
                        <div style={{
                          display: "flex",
                          justifyContent: "space-between",
                          marginTop: "48px",
                          fontFamily: "'Roboto Condensed', 'Arial Narrow', Arial, sans-serif",
                          color: "#000",
                          fontSize: "14px",
                          pageBreakInside: "avoid"
                        }}>
                          <div style={{ width: "45%", textAlign: "center" }}>
                            <div style={{ fontWeight: "bold", textTransform: "uppercase" }}>THƯ KÝ CUỘC HỌP</div>
                            <div style={{ fontStyle: "italic", fontSize: "12px", color: "#4b5563", marginTop: 4 }}>(Ký, ghi rõ họ tên)</div>
                            <div style={{ height: 80 }} />
                            <div style={{ fontWeight: "bold" }}>{formSecretary || "—"}</div>
                          </div>
                          <div style={{ width: "45%", textAlign: "center" }}>
                            <div style={{ fontWeight: "bold", textTransform: "uppercase" }}>CHỦ TRÌ CUỘC HỌP</div>
                            <div style={{ fontStyle: "italic", fontSize: "12px", color: "#4b5563", marginTop: 4 }}>(Ký, ghi rõ họ tên)</div>
                            <div style={{ height: 80 }} />
                            <div style={{ fontWeight: "bold" }}>{formHost || "—"}</div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Sub-modal: MediaLibrary File Picker ── */}
      {pickerOpen && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)", zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center", padding: 32 }}>
          <div style={{ background: "var(--background)", borderRadius: 16, width: "100%", maxWidth: 1000, height: "80vh", display: "flex", flexDirection: "column", overflow: "hidden", border: "1px solid var(--border)", boxShadow: "0 10px 30px rgba(0,0,0,0.2)" }}>
            <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--card)" }}>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "var(--foreground)" }}>
                Chọn file đính kèm từ Thư viện tài liệu
              </h3>
              <button onClick={() => setPickerOpen(false)} style={{ background: "none", border: "none", color: "var(--muted-foreground)", fontSize: 18, cursor: "pointer" }}>✕ Close</button>
            </div>

            <div style={{ flex: 1, minHeight: 0 }}>
              <MediaLibrary mode="picker" onSelect={handleSelectFileFromLibrary} />
            </div>

            <div style={{ padding: "12px 20px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "flex-end", background: "var(--card)" }}>
              <button onClick={() => setPickerOpen(false)} className="btn btn-primary btn-sm px-4 fw-bold" style={{ fontSize: 12.5 }}>
                Hoàn thành
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Fullscreen Preview Viewer ── */}
      {previewAsset && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.96)", backdropFilter: "blur(12px)", zIndex: 10000, color: "#fff" }} onClick={() => setPreviewAsset(null)}>
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 60, padding: "0 24px", borderBottom: "1px solid rgba(255,255,255,0.08)", display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(15, 23, 42, 0.8)", backdropFilter: "blur(20px)", zIndex: 10 }} onClick={e => e.stopPropagation()}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15, color: "#fff" }}>{previewAsset.name}</div>
              <div style={{ fontSize: 11.5, color: "rgba(255,255,255,0.5)", marginTop: 2 }}>{previewAsset.fileType.toUpperCase()}</div>
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <button
                onClick={() => {
                  const a = document.createElement("a");
                  a.href = previewAsset.fileUrl;
                  a.download = previewAsset.name;
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                }}
                style={{ background: "var(--primary)", color: "#fff", border: "none", borderRadius: 8, padding: "8px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}
              >
                <i className="bi bi-download" /> Tải về
              </button>
              <div style={{ width: 1, height: 20, background: "rgba(255,255,255,0.15)", margin: "0 4px" }} />
              <button onClick={() => setPreviewAsset(null)} style={{ background: "rgba(255,255,255,0.08)", border: "none", borderRadius: 8, width: 32, height: 32, fontSize: 14, cursor: "pointer", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
            </div>
          </div>
          <div style={{ position: "absolute", top: 60, left: 0, right: 0, bottom: 0, padding: 24, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }} onClick={e => e.stopPropagation()}>
            {previewAsset.fileType.toLowerCase() === "pdf" ? (
              <iframe src={previewAsset.fileUrl} style={{ width: "100%", height: "100%", border: "none", borderRadius: 8, background: "#fff", boxShadow: "0 12px 36px rgba(0,0,0,0.5)" }} title={previewAsset.name} />
            ) : ["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(previewAsset.fileType.toLowerCase()) ? (
              <img src={previewAsset.fileUrl} alt={previewAsset.name} style={{ maxWidth: "100%", maxHeight: "85vh", borderRadius: 8, objectFit: "contain", boxShadow: "0 12px 36px rgba(0,0,0,0.5)" }} />
            ) : ["mp4", "webm", "mov", "avi"].includes(previewAsset.fileType.toLowerCase()) ? (
              <video src={previewAsset.fileUrl} controls autoPlay style={{ maxWidth: "100%", maxHeight: "85vh", borderRadius: 8, boxShadow: "0 12px 36px rgba(0,0,0,0.5)" }} />
            ) : (
              <div style={{ textAlign: "center", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: "48px 64px", boxShadow: "0 12px 36px rgba(0,0,0,0.3)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                <i className="bi bi-file-earmark" style={{ fontSize: 64, color: "var(--primary)" }} />
                <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 14, marginTop: 20, marginBottom: 20 }}>Không thể xem trực tiếp loại file này trên trình duyệt</p>
                <button
                  onClick={() => {
                    const a = document.createElement("a");
                    a.href = previewAsset.fileUrl;
                    a.download = previewAsset.name;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                  }}
                  style={{ background: "var(--primary)", color: "#fff", border: "none", borderRadius: 8, padding: "10px 24px", fontSize: 14, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}
                >
                  <i className="bi bi-download" /> Tải về để xem chi tiết
                </button>
              </div>
            )}
          </div>
        </div>
      )}


      {/* Delete Confirmation */}
      <ConfirmDialog
        open={meetingToDelete !== null}
        variant="danger"
        title="Xóa cuộc họp?"
        message="Thông tin cuộc họp này sẽ bị xóa vĩnh viễn và không thể khôi phục."
        confirmLabel="Xóa cuộc họp"
        cancelLabel="Hủy"
        onConfirm={handleDeleteMeeting}
        onCancel={() => setMeetingToDelete(null)}
      />

      <style>{`
        #editor-action-items-section h4 {
          border-bottom: none !important;
          padding-bottom: 0 !important;
        }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .dropdown-item-hover:hover { background: var(--muted) !important; }
        .list-item-hover:hover { background: rgba(0, 0, 0, 0.02) !important; }
        .file-card-hover:hover { background: var(--muted) !important; border-color: var(--primary) !important; }
        .editor-dropdown-item { color: var(--foreground) !important; transition: background-color 0.15s, color 0.15s; }
        .editor-dropdown-item:hover { background-color: var(--border) !important; }
        .font-item-default { font-family: 'Roboto Condensed', Arial Narrow, Arial, sans-serif; }
        .font-item-arial { font-family: Arial, Helvetica, sans-serif; }
        .font-item-times { font-family: 'Times New Roman', Times, serif; }
        .font-item-courier { font-family: 'Courier New', Courier, monospace; }
        .font-item-georgia { font-family: Georgia, serif; }
        .font-item-verdana { font-family: Verdana, Geneva, sans-serif; }
        .font-item-tahoma { font-family: Tahoma, sans-serif; }
        .rich-text-content ul, .rich-text-editor ul { list-style-type: disc !important; padding-left: 24px !important; margin-bottom: 10px !important; }
        .rich-text-content ol, .rich-text-editor ol { list-style-type: decimal !important; padding-left: 24px !important; margin-bottom: 10px !important; }
        .rich-text-content p, .rich-text-editor p { margin-bottom: 6px !important; }
        .rich-text-content h2 { font-size: 12px !important; font-weight: bold !important; margin-top: 8px !important; margin-bottom: 4px !important; line-height: 1.5 !important; }
        .rich-text-editor h2 { font-size: 16px !important; font-weight: bold !important; margin-top: 14px !important; margin-bottom: 6px !important; line-height: 1.4 !important; }
        .rich-text-content { font-size: 12px !important; }

        @media (max-width: 835px) {
          .meeting-sidebar.mobile-sidebar-collapsed {
            width: 0px !important;
            padding: 0px !important;
            overflow: hidden !important;
            border-right: none !important;
          }
          .meeting-sidebar.mobile-sidebar-expanded {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            bottom: 0 !important;
            z-index: 50 !important;
            width: 100% !important;
            max-width: 380px !important;
            box-shadow: 4px 0 15px rgba(0, 0, 0, 0.15) !important;
            border-right: 1px solid var(--border) !important;
          }
          .mobile-sidebar-backdrop {
            display: block !important;
          }
          .mobile-toggle-btn {
            display: flex !important;
            align-items: center;
            justify-content: center;
          }

          /* Hide Rulers and Corner on mobile/tablet */
          .editor-sticky-corner,
          .editor-top-ruler,
          .editor-left-ruler {
            display: none !important;
          }

          /* Convert grid wrapper to block layout and reset min-width */
          .editor-grid-wrapper {
            display: block !important;
            min-width: 100% !important;
            width: 100% !important;
          }

          /* Reduce padding on the workspace */
          .editor-workspace-container {
            padding: 12px !important;
            width: 100% !important;
          }

          /* Expand document page editor to fill full screen width */
          .editor-paper-page {
            width: 100% !important;
            min-width: 0 !important;
            min-height: calc(100vh - 180px) !important;
            padding: 24px 20px !important;
            box-shadow: none !important;
            border-radius: 0 !important;
            border-left: none !important;
            border-right: none !important;
          }

          /* Align editor toolbar margins nicely */
          .editor-toolbar {
            margin: 0 12px 12px 12px !important;
          }

          /* Master-Detail panel layout styles for phone screens */
          .master-list-panel.mobile-inactive {
            display: none !important;
          }
          .master-list-panel.mobile-active {
            width: 100% !important;
            display: flex !important;
          }
          .details-panel.mobile-inactive {
            display: none !important;
          }
          .details-panel.mobile-active {
            width: 100% !important;
            display: flex !important;
          }
          .mobile-back-btn {
            display: flex !important;
            align-items: center;
            justify-content: center;
          }

        }
      `}</style>
    </div>
  );
}
