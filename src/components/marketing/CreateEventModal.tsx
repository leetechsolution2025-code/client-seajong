"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/Toast";

const hoverRowStyle = `
  .hover-row:hover {
    background-color: rgba(99, 102, 241, 0.04) !important;
  }
`;

interface Props {
  isOpen: boolean;
  onClose: (refresh?: boolean) => void;
  onRefresh?: () => void;
  eventId?: string | null;
}

interface Task {
  id: string | number;
  name: string;
  span: number[];
  pic?: string;
  startDate?: string;
  endDate?: string;
  isByWeek?: boolean;
  weeks?: number[];
  content?: string;
  hasChildren?: boolean;
  progress?: number;
}

interface EventContent {
  id: string | number;
  item: string;
  description: string;
  unit: string;
  price: number;
  quantity: number;
  level: number;
  isParent?: boolean;
}

export function CreateEventModal({ isOpen, onClose, onRefresh, eventId }: Props) {
  const toast = useToast();
  const [marketingEmployees, setMarketingEmployees] = useState<any[]>([]);
  const [categoriesMap, setCategoriesMap] = useState<Record<string, string>>({});
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [viewType, setViewType] = React.useState<"table" | "gantt">("gantt");
  const [showSubTaskOffcanvas, setShowSubTaskOffcanvas] = React.useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showTaskDeleteConfirm, setShowTaskDeleteConfirm] = useState(false);
  const [showContentDeleteConfirm, setShowContentDeleteConfirm] = useState(false);
  const [contentIdxToDelete, setContentIdxToDelete] = useState<number | null>(null);
  const [activeTaskForSub, setActiveTaskForSub] = React.useState<string | null>(null);
  const [activeTaskName, setActiveTaskName] = React.useState<string>("");
  const [isByWeek, setIsByWeek] = React.useState(false);
  const [selectedSubWeeks, setSelectedSubWeeks] = React.useState<number[]>([]);
  const [showWeekDropdown, setShowWeekDropdown] = React.useState(false);
  const [hasSubTasks, setHasSubTasks] = React.useState(false);
  const [editingTask, setEditingTask] = React.useState<any>(null);
  const [isEditMode, setIsEditMode] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const [localEventId, setLocalEventId] = useState<string | null>(eventId || null);
  const [lastAddedId, setLastAddedId] = useState<number | string | null>(null);
  const inputRefs = React.useRef<Record<string, HTMLInputElement | null>>({});

  // Sync local ID when prop changes
  React.useEffect(() => {
    setLocalEventId(eventId || null);
  }, [eventId]);

  const scrollRef = React.useRef<HTMLDivElement>(null);
  const [subTaskProgress, setSubTaskProgress] = React.useState(0);
  const subTaskInputRef = React.useRef<HTMLInputElement>(null);

  // Focus sub-task input when offcanvas opens
  React.useEffect(() => {
    if (showSubTaskOffcanvas) {
      setTimeout(() => {
        subTaskInputRef.current?.focus();
      }, 300);
    }
  }, [showSubTaskOffcanvas]);

  const [formData, setFormData] = useState({
    name: "",
    type: "Workshop",
    category: "B2B",
    isOnline: false,
    startDate: "2026-03-24",
    endDate: "2026-08-06",
    startTime: "08:00",
    location: "",
    address: "",
    budget: "",
    expectedAttendees: "",
    description: "",
    pic: "",
  });

  const [mainTasks, setMainTasks] = useState<Task[]>([
    { id: `main-1-${Math.random().toString(36).substr(2, 9)}`, name: "Lập kế hoạch", span: [] },
    { id: `main-2-${Math.random().toString(36).substr(2, 9)}`, name: "Công tác chuẩn bị", span: [] },
    { id: `main-3-${Math.random().toString(36).substr(2, 9)}`, name: "Triển khai", span: [] },
    { id: `main-4-${Math.random().toString(36).substr(2, 9)}`, name: "Chăm sóc và lan toả", span: [] }
  ]);

  const [subTasks, setSubTasks] = useState<Record<string, Task[]>>({});
  const [eventContents, setEventContents] = useState<EventContent[]>([
    { id: 1, item: "Hạng mục mẫu", description: "", unit: "", price: 0, quantity: 0, level: 0 }
  ]);
  const [managementFeeRate, setManagementFeeRate] = useState<number>(5);
  const [vatRate, setVatRate] = useState<number>(10);

  const resizeTextareas = () => {
    const textareas = document.querySelectorAll('textarea');
    textareas.forEach(ta => {
      ta.style.height = 'auto';
      ta.style.height = ta.scrollHeight + 'px';
    });
  };

  // Focus new row when added
  React.useEffect(() => {
    if (lastAddedId && inputRefs.current[lastAddedId]) {
      inputRefs.current[lastAddedId]?.focus();
      setLastAddedId(null);
    }
  }, [lastAddedId, eventContents]);

  // Auto-resize textareas on mount or data load
  React.useEffect(() => {
    if (isOpen) {
      const runResize = () => {
        const textareas = document.querySelectorAll('.description-textarea');
        textareas.forEach(ta => {
          const t = ta as HTMLTextAreaElement;
          t.style.height = 'auto';
          t.style.height = t.scrollHeight + 'px';
        });
      };
      
      // Run multiple times to catch layout shifts
      runResize();
      setTimeout(runResize, 100);
      setTimeout(runResize, 500);
      setTimeout(runResize, 1000);
    }
  }, [isOpen, eventContents, currentStep]);

  // States for sub-task form
  const [subTaskName, setSubTaskName] = useState("");
  const [subTaskPic, setSubTaskPic] = useState("");
  const [subTaskContent, setSubTaskContent] = useState("");
  const [subTaskStartDate, setSubTaskStartDate] = useState("");
  const [subTaskEndDate, setSubTaskEndDate] = useState("");

  // States for event content offcanvas
  const [showContentOffcanvas, setShowContentOffcanvas] = useState(false);
  const [activeParentIdx, setActiveParentIdx] = useState<number | null>(null);
  const [editingContentIdx, setEditingContentIdx] = useState<number | null>(null);
  const [contentItem, setContentItem] = useState("");
  const [contentDesc, setContentDesc] = useState("");
  const [contentUnit, setContentUnit] = useState("");
  const [contentPrice, setContentPrice] = useState<number>(0);
  const [contentQty, setContentQty] = useState<number>(0);
  const [contentHasChildren, setContentHasChildren] = useState(false);

  const handleOpenContentOffcanvas = (parentIdx: number | null, editIdx: number | null = null) => {
    setActiveParentIdx(parentIdx);
    setEditingContentIdx(editIdx);
    if (editIdx !== null) {
      const item = eventContents[editIdx];
      setContentItem(item.item);
      setContentDesc(item.description);
      setContentUnit(item.unit);
      setContentPrice(item.price);
      setContentQty(item.quantity);
      
      // Detect if it has children
      const nextItem = eventContents[editIdx + 1];
      setContentHasChildren(item.isParent !== undefined ? item.isParent : (nextItem ? nextItem.level > item.level : false));
    } else {
      setContentItem("");
      setContentDesc("");
      setContentUnit("");
      setContentPrice(0);
      setContentQty(0);
      setContentHasChildren(false);
    }
    setShowContentOffcanvas(true);
  };

  const calculateItemTotal = (idx: number): number => {
    const item = eventContents[idx];
    const isParent = eventContents[idx + 1] ? eventContents[idx + 1].level > item.level : false;
    
    if (!isParent) return (item.price || 0) * (item.quantity || 0);
    
    let sum = 0;
    for (let i = idx + 1; i < eventContents.length; i++) {
      if (eventContents[i].level <= item.level) break;
      if (eventContents[i].level === item.level + 1) {
        sum += calculateItemTotal(i);
      }
    }
    return sum;
  };

  const handleSaveContentItem = () => {
    if (!contentItem.trim()) {
      toast.warning("Cảnh báo", "Vui lòng nhập tên hạng mục");
      return;
    }

    let targetLevel = 0;
    if (activeParentIdx !== null) {
      targetLevel = eventContents[activeParentIdx].level + 1;
    }

    const newItem: EventContent = {
      id: editingContentIdx !== null ? eventContents[editingContentIdx].id : Date.now(),
      item: contentItem,
      description: contentDesc,
      unit: contentUnit,
      price: contentHasChildren ? 0 : contentPrice,
      quantity: contentHasChildren ? 0 : contentQty,
      level: editingContentIdx !== null ? eventContents[editingContentIdx].level : targetLevel,
      isParent: contentHasChildren
    };

    const newContents = [...eventContents];
    if (editingContentIdx !== null) {
      newContents[editingContentIdx] = newItem;
    } else if (activeParentIdx !== null) {
      // Find the end of the parent branch to append at the bottom of its current children
      const parentLevel = Number(eventContents[activeParentIdx].level);
      let insertIdx = activeParentIdx + 1;
      while (insertIdx < eventContents.length && Number(eventContents[insertIdx].level) > parentLevel) {
        insertIdx++;
      }
      newContents.splice(insertIdx, 0, newItem);
    } else {
      newContents.push(newItem);
    }

    setEventContents(newContents);
    setShowContentOffcanvas(false);
    toast.success("Thành công", editingContentIdx !== null ? "Cập nhật hạng mục thành công" : "Đã thêm hạng mục mới");
  };

  const handleDeleteContentBranch = () => {
    if (contentIdxToDelete === null) return;
    const parent = eventContents[contentIdxToDelete];
    const newContents = [...eventContents];
    let countToRemove = 1;
    for (let i = contentIdxToDelete + 1; i < eventContents.length; i++) {
      if (eventContents[i].level > parent.level) {
        countToRemove++;
      } else {
        break;
      }
    }
    newContents.splice(contentIdxToDelete, countToRemove);
    setEventContents(newContents);
    setShowContentDeleteConfirm(false);
    setContentIdxToDelete(null);
    toast.success("Thành công", "Đã xóa hạng mục và các nội dung liên quan");
  };

  // Calculate dynamic weeks with actual dates and week numbers
  const calculateWeeks = () => {
    let baseDate = formData.startDate ? new Date(formData.startDate) : new Date();
    // Default to 8 weeks (55 days approx) if no end date
    let endDate = formData.endDate ? new Date(formData.endDate) : new Date(baseDate.getTime() + 55 * 24 * 60 * 60 * 1000);

    if (isNaN(baseDate.getTime())) baseDate = new Date();
    if (isNaN(endDate.getTime())) endDate = new Date(baseDate.getTime() + 27 * 24 * 60 * 60 * 1000);

    const getWeekOfYear = (date: Date) => {
      const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
      const dayNum = d.getUTCDay() || 7;
      d.setUTCDate(d.getUTCDate() + 4 - dayNum);
      const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
      return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    };

    const formatDate = (date: Date) => {
      return `${date.getDate().toString().padStart(2, "0")}/${(date.getMonth() + 1).toString().padStart(2, "0")}`;
    };

    const diffDays = Math.ceil(Math.abs(endDate.getTime() - baseDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const numWeeks = Math.max(1, Math.ceil(diffDays / 7));
    const safeWeeksCount = Math.min(numWeeks, 52);

    return Array.from({ length: safeWeeksCount }, (_, i) => {
      const startOfWeek = new Date(baseDate.getTime() + (i * 7 * 24 * 60 * 60 * 1000));
      const endOfWeek = new Date(Math.min(endDate.getTime(), startOfWeek.getTime() + 6 * 24 * 60 * 60 * 1000));

      const today = new Date();
      // Year 2026 is our baseline for this mock setup
      const checkToday = new Date(2026, today.getMonth(), today.getDate());
      const isCurrent = checkToday >= startOfWeek && checkToday <= endOfWeek;

      return {
        id: i + 1,
        weekNumber: getWeekOfYear(startOfWeek),
        range: `${formatDate(startOfWeek)} - ${formatDate(endOfWeek)}`,
        isCurrent: isCurrent
      };
    });
  };

  const dynamicWeeks = calculateWeeks();

  // Auto-scroll to current week at position 4
  React.useEffect(() => {
    if (isOpen && scrollRef.current && currentStep === 0) {
      const today = new Date();
      const currentWeekIdx = dynamicWeeks.findIndex(w => {
        // Simple range check: this is approximate but effective for UI positioning
        const [startStr] = w.range.split(" - ");
        const [d, m] = startStr.split("/").map(Number);
        const weekStartDate = new Date(2026, m - 1, d); // Year 2026 as per default
        const weekEndDate = new Date(weekStartDate.getTime() + 7 * 24 * 60 * 60 * 1000);
        return today >= weekStartDate && today < weekEndDate;
      });

      if (currentWeekIdx !== -1) {
        // To put currentWeekIdx at slot 4, we want 3 weeks to be visible BEFORE it
        const scrollOffset = Math.max(0, (currentWeekIdx - 3) * 80);
        scrollRef.current.scrollLeft = scrollOffset;
      }
    }
  }, [isOpen, currentStep, dynamicWeeks.length]);

  const getTodayLinePosition = () => {
    const today = new Date();
    const checkToday = new Date(2026, today.getMonth(), today.getDate());

    const currentWeekIdx = dynamicWeeks.findIndex(w => {
      const [startStr] = w.range.split(" - ");
      const [d, m] = startStr.split("/").map(Number);
      const weekStart = new Date(2026, m - 1, d);
      const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);
      return checkToday >= weekStart && checkToday < weekEnd;
    });

    if (currentWeekIdx === -1) return null;

    const [startStr] = dynamicWeeks[currentWeekIdx].range.split(" - ");
    const [d, m] = startStr.split("/").map(Number);
    const weekStart = new Date(2026, m - 1, d);

    const diffDays = Math.floor((checkToday.getTime() - weekStart.getTime()) / (1000 * 60 * 60 * 24));

    // Sticky columns total: 480px
    // Each week: 80px
    return 480 + (currentWeekIdx * 80) + (diffDays * (80 / 7)) + (80 / 14); // mid-day
  };

  const todayLinePos = getTodayLinePosition();

  // Handle Escape key
  React.useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  // Fetch marketing employees and categories
  React.useEffect(() => {
    if (isOpen && localEventId) {
      const fetchDetail = async () => {
        try {
          const res = await fetch(`/api/marketing/events/${localEventId}`);
          if (res.ok) {
            const data = await res.json();

            // Set form data
            setFormData({
              name: data.name || "",
              type: data.type || "Workshop",
              category: data.category || "B2B",
              startDate: data.startDate ? data.startDate.split('T')[0] : "2026-03-24",
              endDate: data.endDate ? data.endDate.split('T')[0] : "2026-08-06",
              startTime: "08:00",
              location: data.location || "",
              address: data.address || "",
              budget: data.budget?.toString() || "",
              expectedAttendees: data.expectedAttendees?.toString() || "",
              description: data.description || "",
              pic: data.pic || "",
              isOnline: data.isOnline || false,
            });

            // Map tasks
            if (data.tasks) {
              const apiTasks = data.tasks;
              const main: Task[] = apiTasks
                .filter((t: any) => !t.parentId)
                .map((t: any) => ({
                  id: t.id,
                  name: t.name,
                  pic: t.pic,
                  startDate: t.startDate?.split('T')[0],
                  endDate: t.endDate?.split('T')[0],
                  content: t.content,
                  hasChildren: t.hasChildren,
                  span: []
                }));

              // Build a map of parentId -> children, keyed by parent's id
              const subs: Record<string, Task[]> = {};
              apiTasks.filter((t: any) => t.parentId).forEach((t: any) => {
                const pId = t.parentId.toString();
                if (!subs[pId]) subs[pId] = [];
                const parseWeeks = (raw: any): number[] => {
                  if (!raw) return [];
                  try {
                    let parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
                    // Handle double-stringify: if parsed result is still a string, parse again
                    if (typeof parsed === 'string') parsed = JSON.parse(parsed);
                    return Array.isArray(parsed) ? parsed : [];
                  } catch { return []; }
                };
                const weeksArr = parseWeeks(t.weeks);
                subs[pId].push({
                  id: t.id,
                  name: t.name,
                  pic: t.pic,
                  startDate: t.startDate?.split('T')[0],
                  endDate: t.endDate?.split('T')[0],
                  content: t.content,
                  weeks: weeksArr,
                  isByWeek: weeksArr.length > 0,
                  span: weeksArr
                });
              });

              setMainTasks(main.length > 0 ? main : [
                { id: `main-1-${Math.random().toString(36).substr(2, 9)}`, name: "Lập kế hoạch", span: [] },
                { id: `main-2-${Math.random().toString(36).substr(2, 9)}`, name: "Công tác chuẩn bị", span: [] },
                { id: `main-3-${Math.random().toString(36).substr(2, 9)}`, name: "Triển khai", span: [] },
                { id: `main-4-${Math.random().toString(36).substr(2, 9)}`, name: "Chăm sóc và lan toả", span: [] }
              ]);
              setSubTasks(subs);
            }

            // Map contents (Tab 1)
            if (data.contents && data.contents.length > 0) {
              const formattedContents = data.contents.map((c: any, idx: number) => {
                const nextItem = data.contents[idx + 1];
                const hasChildren = nextItem ? Number(nextItem.level) > Number(c.level) : false;
                if (c.description) {
                  // Ensure every line starts with bullet if not already
                  const lines = c.description.split('\n');
                  const formattedLines = lines.map((line: string) => {
                    const trimmed = line.trim();
                    if (trimmed && !trimmed.startsWith('•')) {
                      return '• ' + trimmed;
                    }
                    return line;
                  });
                  return { ...c, description: formattedLines.join('\n') };
                }
                return { ...c, isParent: c.isParent ?? hasChildren };
              });
              setEventContents(formattedContents);
            }
            
            if (data.managementFeeRate !== undefined) {
              setManagementFeeRate(data.managementFeeRate);
            }
            if (data.vatRate !== undefined) {
              setVatRate(data.vatRate);
            }
          }
        } catch (err) {
          console.error("Error fetching event detail:", err);
        }
      };
      fetchDetail();
    } else if (isOpen && !eventId) {
      // Reset form for fresh create
      setFormData({
        name: "",
        type: "Workshop",
        category: "B2B",
        startDate: "2026-03-24",
        endDate: "2026-08-06",
        startTime: "08:00",
        location: "",
        address: "",
        budget: "",
        expectedAttendees: "",
        description: "",
        pic: "",
        isOnline: false,
      });
      setMainTasks([
        { id: `main-1-${Math.random().toString(36).substr(2, 9)}`, name: "Lập kế hoạch", span: [] },
        { id: `main-2-${Math.random().toString(36).substr(2, 9)}`, name: "Công tác chuẩn bị", span: [] },
        { id: `main-3-${Math.random().toString(36).substr(2, 9)}`, name: "Triển khai", span: [] },
        { id: `main-4-${Math.random().toString(36).substr(2, 9)}`, name: "Chăm sóc và lan toả", span: [] }
      ]);
      setSubTasks({});
      setEventContents([
        { id: Date.now(), item: "", description: "", unit: "", price: 0, quantity: 0, level: 0 }
      ]);
      setManagementFeeRate(5);
      setVatRate(10);
      setCurrentStep(0);
    }
  }, [isOpen, localEventId]);

  React.useEffect(() => {
    if (isOpen) {
      // 1. Fetch categories for mapping (positions and levels)
      Promise.all([
        fetch("/api/plan-finance/categories?type=position").then(r => r.json()),
        fetch("/api/plan-finance/categories?type=cap_bac").then(r => r.json()),
      ]).then(([positions, levels]) => {
        const map: Record<string, string> = {};
        if (Array.isArray(positions)) positions.forEach((c: any) => map[c.code] = c.name);
        if (Array.isArray(levels)) levels.forEach((c: any) => map[c.code] = c.name);
        setCategoriesMap(map);
      }).catch(err => console.error("Error fetching categories:", err));

      // 2. Fetch marketing employees
      fetch("/api/hr/employees?search=Marketing&status=active&pageSize=100")
        .then(res => res.json())
        .then(data => {
          if (data.employees) {
            // Lọc chính xác phòng Marketing và không lấy người đã nghỉ
            const filtered = data.employees.filter((emp: any) =>
              emp.departmentName.toLowerCase().includes("marketing") &&
              emp.status !== "resigned"
            );
            setMarketingEmployees(filtered);
          }
        })
        .catch(err => console.error("Error fetching employees:", err));
    }
  }, [isOpen]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSaveSubTask = () => {
    if (!subTaskName) return;
    // In edit mode we don't need activeTaskForSub (we search all parents by editingTask.id)
    if (!isEditMode && !activeTaskForSub) return;

    if (isEditMode && editingTask) {
      // Logic for editing
      setSubTasks(prev => {
        const updated = { ...prev };
        for (const parent in updated) {
          const index = updated[parent].findIndex(t => t.id === editingTask.id);
          if (index !== -1) {
            updated[parent][index] = {
              ...updated[parent][index],
              name: subTaskName,
              pic: marketingEmployees.find(e => e.id === subTaskPic)?.fullName || "---",
              startDate: subTaskStartDate,
              endDate: subTaskEndDate,
              isByWeek: isByWeek,
              weeks: selectedSubWeeks,
              content: subTaskContent,
              hasChildren: hasSubTasks,
              progress: subTaskProgress,
              span: isByWeek ? selectedSubWeeks : [1]
            };
            break;
          }
        }
        return updated;
      });
      toast.success("Thành công", "Đã cập nhật công việc!");
    } else {
      // Logic for adding new
      const newTask = {
        id: `sub-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        name: subTaskName,
        pic: marketingEmployees.find(e => e.id === subTaskPic)?.fullName || "---",
        startDate: subTaskStartDate,
        endDate: subTaskEndDate,
        isByWeek: isByWeek,
        weeks: selectedSubWeeks,
        content: subTaskContent,
        hasChildren: hasSubTasks,
        progress: subTaskProgress,
        span: isByWeek ? selectedSubWeeks : [1]
      };

      if (activeTaskForSub) {
        setSubTasks(prev => ({
          ...prev,
          [activeTaskForSub]: [...(prev[activeTaskForSub] || []), newTask]
        }));
        toast.success("Thành công", "Đã thêm công việc con mới!");
      }
    }

    // Reset and close
    resetOffcanvas();
  };

  const handleDeleteTask = () => {
    if (!editingTask) return;
    setShowTaskDeleteConfirm(true);
  };

  const executeDeleteTask = () => {
    if (!editingTask) return;

    // Remove from mainTasks if it's a level 0 task
    setMainTasks(prev => prev.filter(t => t.id !== editingTask.id));

    // Remove from subTasks (as a child and as a parent)
    setSubTasks(prev => {
      const updated = { ...prev };
      // Remove it from any parent's child list
      for (const parentId in updated) {
        updated[parentId] = updated[parentId].filter(t => t.id !== editingTask.id);
      }
      // Also remove its own children list
      delete updated[editingTask.id.toString()];
      return updated;
    });

    toast.success("Thành công", "Đã xóa công việc thành công!");
    resetOffcanvas();
    setShowTaskDeleteConfirm(false);
  };

  const resetOffcanvas = () => {
    setSubTaskName("");
    setSubTaskPic("");
    setSubTaskContent("");
    setSubTaskStartDate("");
    setSubTaskEndDate("");
    setSelectedSubWeeks([]);
    setHasSubTasks(false);
    setSubTaskProgress(0);
    setEditingTask(null);
    setIsEditMode(false);
    setShowSubTaskOffcanvas(false);
  };

  const openForEdit = (task: any) => {
    setEditingTask(task);
    setIsEditMode(true);
    setSubTaskName(task.name);
    setSubTaskPic(marketingEmployees.find(e => e.fullName === task.pic)?.id || "");
    setSubTaskContent(task.content || "");
    setSubTaskStartDate(task.startDate || "");
    setSubTaskEndDate(task.endDate || "");
    setSelectedSubWeeks(task.weeks || []);
    setHasSubTasks(task.hasChildren || false);
    setSubTaskProgress(task.progress || 0);
    setIsByWeek(task.isByWeek || false);
    setShowSubTaskOffcanvas(true);
  };

  const toggleTaskWeek = (taskId: string, weekId: number) => {
    // 1. Update mainTasks
    setMainTasks(prev => prev.map(t => {
      if (t.id === taskId) {
        const span = t.span || [];
        return {
          ...t,
          span: span.includes(weekId) ? span.filter(id => id !== weekId) : [...span, weekId]
        };
      }
      return t;
    }));

    // 2. Update subTasks
    setSubTasks(prev => {
      const updated = { ...prev };
      for (const parentId in updated) {
        updated[parentId] = updated[parentId].map(t => {
          if (t.id === taskId) {
            const span = t.span || [];
            return {
              ...t,
              span: span.includes(weekId) ? span.filter(id => id !== weekId) : [...span, weekId]
            };
          }
          return t;
        });
      }
      return updated;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) {
      toast.warning("Cảnh báo", "Vui lòng nhập tên sự kiện");
      return;
    }

    setIsSaving(true);
    try {
      // 1. Flatten hierarchical tasks into a single array for DB
      const allTasks: any[] = [];

      const flatten = (tasks: Task[], parentId: string | null = null) => {
        tasks.forEach((t, index) => {
          const stringId = t.id.toString();
          const children = subTasks[stringId] || [];
          const hasChildren = t.hasChildren || children.length > 0;

          allTasks.push({
            id: stringId,
            name: t.name,
            parentId: parentId,
            pic: t.pic || null,
            startDate: t.startDate || null,
            endDate: t.endDate || null,
            weeks: t.weeks || t.span || [],
            content: t.content || null,
            sortOrder: index,
            hasChildren: hasChildren
          });

          if (children.length > 0) {
            flatten(children, stringId);
          }
        });
      };

      flatten(mainTasks);

      // 2. Prepare payload
      const payload = {
        overview: { ...formData, id: localEventId },
        tasks: allTasks,
        contents: eventContents,
        managementFeeRate,
        vatRate
      };

      // 3. Call API
      const response = await fetch("/api/marketing/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || errorData.error || "Lỗi lưu dữ liệu");
      }

      const result = await response.json();
      console.log("Event saved successfully:", result);

      // Update local ID if it was a new event
      if (!localEventId && result.id) {
        setLocalEventId(result.id);
      }

      toast.success("Thành công", localEventId ? "Đã cập nhật sự kiện thành công!" : "Đã lưu sự kiện thành công!");
      if (onRefresh) onRefresh();
      // onClose(true); // Removed to keep modal open as per user request
    } catch (err: any) {
      console.error("Save error:", err);
      toast.error("Thất bại", err.message || "Đã có lỗi xảy ra khi lưu sự kiện");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!localEventId) return;
    setShowDeleteConfirm(true);
  };

  const executeDelete = async () => {
    try {
      setIsSaving(true);
      const response = await fetch(`/api/marketing/events/${localEventId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Lỗi khi xóa dữ liệu");
      }

      toast.success("Thành công", "Đã xóa sự kiện thành công!");
      onClose(true); // Close and refresh list
    } catch (err: any) {
      console.error("Delete error:", err);
      toast.error("Thất bại", err.message || "Đã có lỗi xảy ra khi xóa sự kiện");
    } finally {
      setIsSaving(false);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <>
      <style>{hoverRowStyle}</style>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="create-event-modal"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 9999,
              background: "var(--background)",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden"
            }}
          >
            {/* Header */}
            <div style={{
              padding: "16px 32px",
              borderBottom: "1px solid var(--border)",
              background: "var(--card)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              boxShadow: "0 2px 10px rgba(0,0,0,0.05)"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                <div style={{
                  width: "48px",
                  height: "48px",
                  borderRadius: "14px",
                  background: "linear-gradient(135deg, #ec4899, #be185d)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "white"
                }}>
                  <i className="bi bi-calendar-plus" style={{ fontSize: "24px" }}></i>
                </div>
                <div>
                  <h2 style={{ margin: 0, fontSize: "20px", fontWeight: 800 }}>{localEventId ? "Cập nhật thông tin sự kiện" : "Thiết lập sự kiện mới"}</h2>
                  <p style={{ margin: 0, fontSize: "13px", color: "var(--muted-foreground)" }}>Điền các thông số chi tiết để bắt đầu kế hoạch thực hiện</p>
                </div>
              </div>

              <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                {localEventId && (
                  <button
                    onClick={handleDelete}
                    disabled={isSaving}
                    style={{
                      padding: "10px 20px",
                      borderRadius: "10px",
                      border: "1px solid #ef4444",
                      background: "transparent",
                      color: "#ef4444",
                      fontWeight: 600,
                      cursor: isSaving ? "not-allowed" : "pointer",
                      transition: "all 0.2s"
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = "#fff5f5"}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                  >
                    <i className="bi bi-trash3"></i> Xóa sự kiện
                  </button>
                )}
                
                <button
                  onClick={() => onClose()}
                  style={{
                    padding: "10px 20px",
                    borderRadius: "10px",
                    border: "1px solid var(--border)",
                    background: "transparent",
                    fontWeight: 600,
                    cursor: "pointer",
                    color: "var(--foreground)",
                    transition: "all 0.2s"
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = "var(--muted)"}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                >
                  Đóng
                </button>

                <button
                  onClick={handleSubmit}
                  disabled={isSaving}
                  style={{
                    padding: "10px 24px",
                    borderRadius: "10px",
                    border: "none",
                    background: isSaving ? "var(--muted)" : "linear-gradient(135deg, #ec4899, #be185d)",
                    color: "white",
                    fontWeight: 700,
                    cursor: isSaving ? "not-allowed" : "pointer",
                    boxShadow: isSaving ? "none" : "0 4px 12px rgba(236, 72, 153, 0.3)",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    transition: "all 0.2s"
                  }}
                  onMouseEnter={e => !isSaving && (e.currentTarget.style.transform = "translateY(-1px)")}
                  onMouseLeave={e => !isSaving && (e.currentTarget.style.transform = "translateY(0)")}
                >
                  {isSaving && (
                    <div className="spinner-border spinner-border-sm" role="status" style={{ width: "14px", height: "14px", borderWidth: "2px" }}>
                      <span className="visually-hidden">Loading...</span>
                    </div>
                  )}
                  {isSaving ? "Đang xử lý..." : (localEventId ? "Cập nhật sự kiện" : "Lưu sự kiện")}
                </button>
              </div>
            </div>

            <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

              {/* Sidebar (Left) */}
              <div
                className="custom-scrollbar"
                style={{
                  width: "300px",
                  flexShrink: 0,
                  borderRight: "1px solid var(--border)",
                  background: "var(--background)",
                  padding: "32px",
                  overflowY: "auto",
                  display: "flex",
                  flexDirection: "column",
                  gap: "24px"
                }}
              >
                {/* Section 1: Thông tin chung */}
                <div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    <FormGroup label="Tên sự kiện">
                      <input
                        name="name" value={formData.name} onChange={handleInputChange}
                        placeholder="VD: Triển lãm Vietbuild 2026"
                        style={sidebarInputStyle}
                      />
                    </FormGroup>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                      <FormGroup label="Loại hình">
                        <select name="type" value={formData.type} onChange={handleInputChange} style={sidebarInputStyle}>
                          <option>Workshop</option>
                          <option>Exhibition</option>
                          <option>Launch Event</option>
                          <option>Activation</option>
                          <option>Press Conference</option>
                        </select>
                      </FormGroup>
                      <FormGroup label="Phân nhóm">
                        <select name="category" value={formData.category} onChange={handleInputChange} style={sidebarInputStyle}>
                          <option>B2B</option>
                          <option>B2C</option>
                          <option>Nội bộ</option>
                        </select>
                      </FormGroup>
                    </div>

                    <FormGroup label="Hình thức tổ chức">
                      <div style={{ display: "flex", gap: "24px", marginTop: "4px" }}>
                        <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "13px", fontWeight: 500 }}>
                          <input 
                            type="radio" 
                            name="isOnline" 
                            checked={formData.isOnline === false} 
                            onChange={() => setFormData(prev => ({ ...prev, isOnline: false }))}
                            style={{ width: "16px", height: "16px", accentColor: "#ec4899" }}
                          />
                          Offline
                        </label>
                        <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "13px", fontWeight: 500 }}>
                          <input 
                            type="radio" 
                            name="isOnline" 
                            checked={formData.isOnline === true} 
                            onChange={() => setFormData(prev => ({ ...prev, isOnline: true }))}
                            style={{ width: "16px", height: "16px", accentColor: "#ec4899" }}
                          />
                          Online
                        </label>
                      </div>
                    </FormGroup>
                  </div>
                </div>

                {/* Section 2: Thời gian & Địa điểm */}
                <div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                      <FormGroup label="Ngày bắt đầu">
                        <input type="date" name="startDate" value={formData.startDate} onChange={handleInputChange} style={sidebarInputStyle} />
                      </FormGroup>
                      <FormGroup label="Ngày kết thúc">
                        <input type="date" name="endDate" value={formData.endDate} onChange={handleInputChange} style={sidebarInputStyle} />
                      </FormGroup>
                    </div>
                    <FormGroup label="Địa điểm">
                      <input
                        name="location" value={formData.location} onChange={handleInputChange}
                        placeholder="VD: SECC"
                        style={sidebarInputStyle}
                      />
                    </FormGroup>
                    <FormGroup label="Địa chỉ">
                      <textarea
                        name="address" value={formData.address} onChange={handleInputChange}
                        placeholder="Số 799 Nguyễn Văn Linh..."
                        style={{ ...sidebarInputStyle, minHeight: "60px" }}
                      />
                    </FormGroup>
                  </div>
                </div>

                {/* Section 3: Ngân sách & Mục tiêu */}
                <div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                    <FormGroup label="Ngân sách (VNĐ)">
                      <input
                        type="number" name="budget" value={formData.budget} onChange={handleInputChange}
                        placeholder="VD: 150.000.000"
                        style={sidebarInputStyle}
                      />
                    </FormGroup>
                    <FormGroup label="Khách dự kiến">
                      <input
                        type="number" name="expectedAttendees" value={formData.expectedAttendees} onChange={handleInputChange}
                        placeholder="VD: 500"
                        style={sidebarInputStyle}
                      />
                    </FormGroup>
                  </div>
                </div>

                {/* Section 4: Nhân sự & Mô tả */}
                <div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    <FormGroup label="Người phụ trách (PIC)">
                      <select
                        name="pic" value={formData.pic} onChange={handleInputChange}
                        style={sidebarInputStyle}
                      >
                        <option value="">Chọn nhân viên Marketing...</option>
                        {marketingEmployees.map(emp => {
                          const mappedPos = categoriesMap[emp.position] || emp.position;
                          const displayPos = mappedPos?.startsWith("vtr-") ? "Thành viên" : (mappedPos || "Thành viên");
                          return (
                            <option key={emp.id} value={emp.fullName}>
                              {emp.fullName} - {displayPos}
                            </option>
                          );
                        })}
                      </select>
                    </FormGroup>
                    <FormGroup label="Mô tả tóm tắt">
                      <textarea
                        name="description" value={formData.description} onChange={handleInputChange}
                        placeholder="Nội dung chính..."
                        style={{ ...sidebarInputStyle, minHeight: "100px" }}
                      />
                    </FormGroup>
                  </div>
                </div>
              </div>

              {/* Main Content (Right) */}
              <div style={{
                flex: 1,
                background: "var(--card)",
                display: "flex",
                flexDirection: "column",
                padding: "0 20px 0 20px",
                overflow: "hidden"
              }}>
                {/* Top Navigation / Workflow Stepper */}
                <div style={{
                  padding: "24px 32px",
                  borderBottom: "1px solid var(--border)",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  background: "var(--card)"
                }}>
                  {[
                    { title: "Tổng quan", sub: "Mục tiêu & định hướng", icon: "bi-bullseye", color: "linear-gradient(135deg, #6366f1 0%, #a855f7 100%)" },
                    { title: "Nội dung", sub: "Định vị & Phân bổ", icon: "bi-layers" },
                    { title: "Kế hoạch", sub: "Roadmap & Lịch trình", icon: "bi-calendar4-week" },
                    { title: "Ngân sách", sub: "Chi phí & Nguồn lực", icon: "bi-wallet2" },
                    { title: "Doanh thu", sub: "Mục tiêu & Dự báo", icon: "bi-graph-up-arrow" }
                  ].map((step, idx) => (
                    <React.Fragment key={idx}>
                      <div
                        onClick={() => setCurrentStep(idx)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "14px",
                          cursor: "pointer",
                          opacity: currentStep === idx ? 1 : 0.6,
                          transition: "all 0.2s"
                        }}
                      >
                        <div style={{
                          width: "38px",
                          height: "38px",
                          borderRadius: "10px",
                          background: currentStep === idx ? (step.color || "var(--primary)") : "var(--muted)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: currentStep === idx ? "#fff" : "var(--muted-foreground)",
                          boxShadow: currentStep === idx ? "0 4px 10px rgba(99, 102, 241, 0.2)" : "none"
                        }}>
                          <i className={`bi ${step.icon}`} style={{ fontSize: "18px" }}></i>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column" }}>
                          <span style={{ fontSize: "13.5px", fontWeight: "700", color: currentStep === idx ? "var(--foreground)" : "var(--muted-foreground)", lineHeight: "1.2" }}>{step.title}</span>
                          <span style={{ fontSize: "10.5px", color: "var(--muted-foreground)", whiteSpace: "nowrap" }}>{step.sub}</span>
                        </div>
                      </div>
                      {idx < 4 && (
                        <div style={{ flex: 1, height: "1px", background: "var(--border)", maxWidth: "40px" }}></div>
                      )}
                    </React.Fragment>
                  ))}
                </div>

                {/* Main Workspace Area */}
                <div style={{
                  flex: 1,
                  background: "var(--card)",
                  display: "flex",
                  flexDirection: "column",
                  overflow: "hidden"
                }}>
                  {currentStep === 2 ? (
                    <div className="custom-scrollbar" style={{ flex: 1, overflow: "auto", padding: "32px" }}>
                      <div style={{ maxWidth: "1000px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "32px" }}>
                        {/* Header Summary */}
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                          <div>
                            <h2 style={{ fontSize: "28px", fontWeight: "800", color: "var(--foreground)", marginBottom: "8px" }}>{formData.name || "Tên sự kiện chưa cập nhật"}</h2>
                            <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                              <span style={{ padding: "4px 12px", borderRadius: "20px", background: "rgba(99, 102, 241, 0.1)", color: "var(--primary)", fontSize: "12px", fontWeight: "700" }}>{formData.type}</span>
                              <span style={{ padding: "4px 12px", borderRadius: "20px", background: "rgba(16, 185, 129, 0.1)", color: "#10b981", fontSize: "12px", fontWeight: "700" }}>{formData.category}</span>
                            </div>
                          </div>
                          <div style={{ textAlign: "right" }}>
                            <div style={{ fontSize: "11px", fontWeight: "700", color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "4px" }}>Tổng ngân sách dự tính</div>
                            <div style={{ fontSize: "24px", fontWeight: "800", color: "var(--primary)" }}>
                              {eventContents.reduce((sum, row) => sum + (row.price * row.quantity), 0).toLocaleString()} <span style={{ fontSize: "14px" }}>đ</span>
                            </div>
                          </div>
                        </div>

                        {/* Info Grid */}
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "24px" }}>
                          <div style={{ background: "var(--card)", padding: "24px", borderRadius: "20px", border: "1px solid var(--border)", display: "flex", alignItems: "center", gap: "16px" }}>
                            <div style={{ width: "48px", height: "48px", borderRadius: "14px", background: "rgba(99, 102, 241, 0.1)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--primary)" }}>
                              <i className="bi bi-calendar-check" style={{ fontSize: "20px" }}></i>
                            </div>
                            <div>
                              <div style={{ fontSize: "12px", color: "var(--muted-foreground)", fontWeight: "600" }}>Thời gian diễn ra</div>
                              <div style={{ fontSize: "14px", fontWeight: "700", marginTop: "2px" }}>{formData.startDate} - {formData.endDate}</div>
                            </div>
                          </div>

                          <div style={{ background: "var(--card)", padding: "24px", borderRadius: "20px", border: "1px solid var(--border)", display: "flex", alignItems: "center", gap: "16px" }}>
                            <div style={{ width: "48px", height: "48px", borderRadius: "14px", background: "rgba(16, 185, 129, 0.1)", display: "flex", alignItems: "center", justifyContent: "center", color: "#10b981" }}>
                              <i className="bi bi-geo-alt" style={{ fontSize: "20px" }}></i>
                            </div>
                            <div>
                              <div style={{ fontSize: "12px", color: "var(--muted-foreground)", fontWeight: "600" }}>Địa điểm</div>
                              <div style={{ fontSize: "14px", fontWeight: "700", marginTop: "2px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "150px" }}>{formData.location || "Chưa xác định"}</div>
                            </div>
                          </div>

                          <div style={{ background: "var(--card)", padding: "24px", borderRadius: "20px", border: "1px solid var(--border)", display: "flex", alignItems: "center", gap: "16px" }}>
                            <div style={{ width: "48px", height: "48px", borderRadius: "14px", background: "rgba(245, 158, 11, 0.1)", display: "flex", alignItems: "center", justifyContent: "center", color: "#f59e0b" }}>
                              <i className="bi bi-person-badge" style={{ fontSize: "20px" }}></i>
                            </div>
                            <div>
                              <div style={{ fontSize: "12px", color: "var(--muted-foreground)", fontWeight: "600" }}>Người phụ trách</div>
                              <div style={{ fontSize: "14px", fontWeight: "700", marginTop: "2px" }}>{formData.pic || "---"}</div>
                            </div>
                          </div>
                        </div>

                        {/* Description & Objectives */}
                        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "24px" }}>
                          <div style={{ background: "var(--card)", padding: "32px", borderRadius: "24px", border: "1px solid var(--border)" }}>
                            <h3 style={{ fontSize: "16px", fontWeight: "700", marginBottom: "20px", display: "flex", alignItems: "center", gap: "10px" }}>
                              <i className="bi bi-justify-left" style={{ color: "var(--primary)" }}></i>
                              Mô tả tổng quát
                            </h3>
                            <p style={{ fontSize: "14px", color: "var(--foreground)", lineHeight: "1.6", opacity: 0.8, whiteSpace: "pre-line" }}>
                              {formData.description || "Chưa có mô tả chi tiết cho sự kiện này. Hãy bổ sung thông tin ở bảng bên trái để hoàn thiện kế hoạch."}
                            </p>
                          </div>

                          <div style={{ background: "linear-gradient(135deg, #6366f1 0%, #a855f7 100%)", padding: "32px", borderRadius: "24px", color: "#fff", display: "flex", flexDirection: "column", gap: "20px" }}>
                            <h3 style={{ fontSize: "16px", fontWeight: "700", marginBottom: "4px" }}>Thông số dự kiến</h3>
                            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                              <div style={{ background: "rgba(255,255,255,0.1)", padding: "12px 16px", borderRadius: "12px" }}>
                                <div style={{ fontSize: "11px", opacity: 0.8, fontWeight: "600", textTransform: "uppercase" }}>Khách tham dự</div>
                                <div style={{ fontSize: "20px", fontWeight: "800" }}>{Number(formData.expectedAttendees).toLocaleString()} <span style={{ fontSize: "12px", fontWeight: "400" }}>người</span></div>
                              </div>
                              <div style={{ background: "rgba(255,255,255,0.1)", padding: "12px 16px", borderRadius: "12px" }}>
                                <div style={{ fontSize: "11px", opacity: 0.8, fontWeight: "600", textTransform: "uppercase" }}>Tình trạng</div>
                                <div style={{ fontSize: "14px", fontWeight: "700", display: "flex", alignItems: "center", gap: "6px" }}>
                                  <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#10b981" }}></div>
                                  Đang lập kế hoạch
                                </div>
                              </div>
                            </div>
                            <button 
                              onClick={() => setCurrentStep(1)}
                              style={{ marginTop: "auto", background: "#fff", color: "var(--primary)", border: "none", padding: "12px", borderRadius: "12px", fontWeight: "700", cursor: "pointer", transition: "all 0.2s" }}
                            >
                              Tiếp theo: Lập nội dung <i className="bi bi-arrow-right ms-1"></i>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : currentStep === 0 ? (
                    <>
                      {/* View Switcher Toolbar */}
                      <div style={{
                        padding: "6px 0",
                        borderBottom: "1px solid var(--border)",
                        display: "flex",
                        justifyContent: "flex-end",
                        background: "var(--card)"
                      }}>
                        <div style={{
                          display: "flex",
                          background: "var(--muted)",
                          padding: "3px",
                          borderRadius: "10px",
                          gap: "2px"
                        }}>
                          {[
                            { id: "table", label: "Dạng bảng", icon: "bi-table" },
                            { id: "gantt", label: "Biểu đồ Gantt", icon: "bi-bar-chart-steps" }
                          ].map(v => (
                            <button
                              key={v.id}
                              onClick={() => setViewType(v.id as any)}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "6px",
                                padding: "5px 12px",
                                borderRadius: "7px",
                                border: "none",
                                background: viewType === v.id ? "var(--background)" : "transparent",
                                color: viewType === v.id ? "var(--primary)" : "var(--muted-foreground)",
                                fontSize: "12px",
                                fontWeight: "700",
                                cursor: "pointer",
                                transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                                boxShadow: viewType === v.id ? "0 2px 8px rgba(0,0,0,0.1)" : "none"
                              }}
                            >
                              <i className={`bi ${v.icon}`} style={{ fontSize: "14px" }}></i>
                              {v.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Integrated Table/Gantt Workspace */}
                      <div ref={scrollRef} className="custom-scrollbar" style={{
                        flex: 1,
                        overflow: "auto",
                        width: "100%",
                        position: "relative",
                        borderRight: "1px solid var(--border)"
                      }}>
                        <div style={{ position: "relative", width: "max-content", minWidth: "100%" }}>
                          {/* Today Line Indicator */}
                          {viewType === "gantt" && todayLinePos !== null && (
                            <div style={{
                              position: "absolute",
                              left: `${todayLinePos}px`,
                              top: 0,
                              bottom: 0,
                              width: "1px",
                              background: "#ef4444",
                              zIndex: 2,
                              pointerEvents: "none",
                              opacity: 0.8
                            }}>
                              <div style={{
                                position: "absolute",
                                top: 0,
                                left: "50%",
                                width: "4px",
                                height: "4px",
                                background: "#ef4444",
                                borderRadius: "50%",
                                transform: "translate(-50%, -50%)"
                              }} />
                            </div>
                          )}

                          <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0, fontSize: "14px" }}>
                            <thead>
                              <tr style={{ background: "var(--muted)", position: "sticky", top: 0, zIndex: 40 }}>
                                <th style={{
                                  padding: "8px 16px", textAlign: "left", width: "40px",
                                  color: "var(--muted-foreground)", fontWeight: "600", fontSize: "12px", textTransform: "uppercase",
                                  background: "var(--muted)", borderBottom: "1px solid var(--border)",
                                  position: "sticky", left: 0, top: 0, zIndex: 45
                                }}>STT</th>
                                <th style={{
                                  padding: "8px 24px", textAlign: "left", width: "280px",
                                  color: "var(--muted-foreground)", fontWeight: "600", fontSize: "12px", textTransform: "uppercase",
                                  background: "var(--muted)", borderBottom: "1px solid var(--border)",
                                  position: "sticky", left: "40px", top: 0, zIndex: 35
                                }}>Hạng mục - Công việc</th>
                                <th style={{
                                  padding: "8px 24px", textAlign: "left", width: "160px",
                                  color: "var(--muted-foreground)", fontWeight: "600", fontSize: "12px", textTransform: "uppercase",
                                  background: "var(--muted)", borderBottom: "1px solid var(--border)",
                                  position: "sticky", left: "320px", top: 0, zIndex: 35,
                                  borderRight: "2px solid var(--border)"
                                }}>Thực hiện</th>
                                {dynamicWeeks.map(w => (
                                  <th key={w.id} style={{
                                    padding: "6px 8px", textAlign: "center", width: "80px",
                                    color: w.isCurrent ? "var(--primary)" : "var(--foreground)",
                                    fontWeight: "600", fontSize: "12px", textTransform: "uppercase",
                                    background: w.isCurrent ? "rgba(99, 102, 241, 0.2)" : "var(--muted)",
                                    borderBottom: w.isCurrent ? "2px solid var(--primary)" : "1px solid var(--border)"
                                  }}>
                                    <div style={{ fontSize: "11px", fontWeight: "800", lineHeight: "1", color: w.isCurrent ? "var(--primary)" : "var(--foreground)" }}>Tuần {w.weekNumber}</div>
                                    <div style={{ fontSize: "10px", fontWeight: "600", color: w.isCurrent ? "var(--primary)" : "var(--muted-foreground)", marginTop: "4px", textTransform: "none", opacity: w.isCurrent ? 1 : 0.8 }}>{w.range}</div>
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {(() => {
                                const renderRows = (task: Task, idx: number, level: number, parentSTT: string): React.ReactNode => {
                                  const currentSTT = parentSTT ? `${parentSTT}.${idx + 1}` : `${idx + 1}`;
                                  const children = subTasks[task.id.toString()] || [];
                                  const hasActualSubTasks = children.length > 0;

                                  return (
                                    <React.Fragment key={task.id}>
                                      <tr
                                        onClick={() => level > 0 && openForEdit(task)}
                                        style={{
                                          transition: "background 0.2s",
                                          background: "transparent",
                                          cursor: level > 0 ? "pointer" : "default"
                                        }}
                                      >
                                        <td style={{
                                          padding: "3px 16px", fontWeight: level === 0 ? "700" : "400",
                                          color: level === 0 ? "var(--foreground)" : "var(--muted-foreground)",
                                          fontSize: level === 0 ? "13px" : "11px",
                                          background: "var(--card)",
                                          borderBottom: "1px solid var(--border)",
                                          position: "sticky", left: 0, zIndex: 15
                                        }}>{currentSTT}</td>
                                        <td style={{
                                          padding: `3px 24px 3px ${level === 0 ? 24 : (level + 1) * 24}px`,
                                          fontWeight: level === 0 ? "700" : "500",
                                          color: "var(--foreground)",
                                          textTransform: level === 0 ? "uppercase" : "none",
                                          fontSize: level === 0 ? "12px" : "12.5px",
                                          letterSpacing: level === 0 ? "0.3px" : "0",
                                          background: "var(--card)",
                                          borderBottom: "1px solid var(--border)",
                                          position: "sticky", left: "40px", zIndex: 15,
                                          maxWidth: "280px"
                                        }}>
                                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px", overflow: "hidden" }}>
                                            <div style={{ display: "flex", alignItems: "center", gap: "8px", overflow: "hidden", flex: 1 }}>
                                              {level > 0 && <i className="bi bi-arrow-return-right" style={{ fontSize: "10px", color: "var(--muted-foreground)", flexShrink: 0 }}></i>}
                                              <span style={{
                                                whiteSpace: "nowrap",
                                                overflow: "hidden",
                                                textOverflow: "ellipsis",
                                                flex: 1,
                                                color: level === 0 ? "var(--primary)" : "inherit",
                                                fontWeight: level === 0 ? "700" : "500"
                                              }}>
                                                {task.name}
                                              </span>
                                            </div>
                                            {(Number(level) === 0 || task.hasChildren || (subTasks[task.id.toString()] && subTasks[task.id.toString()].length > 0)) && (
                                              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                                {level === 0 && (
                                                  <i
                                                    className="bi bi-x-circle-fill"
                                                    onClick={(e) => {
                                                      e.preventDefault();
                                                      e.stopPropagation();
                                                      setEditingTask(task);
                                                      setShowTaskDeleteConfirm(true);
                                                    }}
                                                    style={{ fontSize: "14px", color: "#ef4444", cursor: "pointer", opacity: 0.8 }}
                                                    title="Xóa công việc"
                                                  ></i>
                                                )}
                                                <i
                                                  className="bi bi-plus-circle-fill"
                                                  onClick={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    setActiveTaskForSub(task.id.toString());
                                                    setActiveTaskName(task.name);
                                                    setShowSubTaskOffcanvas(true);
                                                    setIsEditMode(false);
                                                  }}
                                                  style={{ fontSize: "14px", color: "var(--primary)", cursor: "pointer", opacity: 0.8 }}
                                                ></i>
                                              </div>
                                            )}
                                          </div>
                                        </td>
                                        <td style={{
                                          padding: "3px 24px",
                                          background: "var(--card)",
                                          borderBottom: "1px solid var(--border)",
                                          position: "sticky", left: "320px", zIndex: 15,
                                          borderRight: "2px solid var(--border)"
                                        }}>
                                          <div style={{ color: "var(--muted-foreground)", fontSize: level === 0 ? "12px" : "11px", fontWeight: "400" }}>
                                            {level === 0 ? "---" : (task.pic || "---")}
                                          </div>
                                        </td>
                                        {dynamicWeeks.map(w => {
                                          const isActive = (task.span || []).includes(w.id);
                                          const isStart = (task.span || []).indexOf(w.id) === 0;
                                          const isEnd = (task.span || []).indexOf(w.id) === (task.span || []).length - 1;
                                          const shouldShowBar = isActive && !hasActualSubTasks && !task.hasChildren;

                                          return (
                                            <td key={w.id} style={{
                                              padding: 0,
                                              borderRight: "1px solid var(--border)",
                                              borderBottom: "1px solid var(--border)",
                                              position: "relative",
                                              background: w.isCurrent ? "rgba(99, 102, 241, 0.05)" : "var(--card)",
                                              minWidth: "80px",
                                              verticalAlign: "middle"
                                            }}>
                                              <div style={{
                                                height: "28px",
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                position: "relative"
                                              }}>
                                                {viewType === "gantt" ? (
                                                  shouldShowBar && (
                                                    <div style={{
                                                      position: "absolute",
                                                      top: "6px",
                                                      bottom: "6px",
                                                      left: isStart ? "10%" : "-1px",
                                                      right: isEnd ? "10%" : "-1px",
                                                      background: isStart && isEnd
                                                        ? "linear-gradient(90deg, #6366f1 0%, #a855f7 100%)"
                                                        : isStart
                                                          ? "linear-gradient(90deg, #6366f1 0%, #818cf8 100%)"
                                                          : isEnd
                                                            ? "linear-gradient(90deg, #818cf8 0%, #a855f7 100%)"
                                                            : "#818cf8",
                                                      borderRadius: (isStart && isEnd) ? "10px" : isStart ? "10px 0 0 10px" : isEnd ? "0 10px 10px 0" : "0",
                                                      zIndex: 1,
                                                      boxShadow: "0 1px 4px rgba(99, 102, 241, 0.2)",
                                                      display: "flex",
                                                      alignItems: "center",
                                                      justifyContent: "flex-end",
                                                      paddingRight: "6px",
                                                      overflow: "hidden"
                                                    }}>
                                                      {isEnd && (
                                                        <span style={{
                                                          fontSize: "8.5px",
                                                          fontWeight: "500",
                                                          color: "#fff",
                                                          whiteSpace: "nowrap"
                                                        }}>
                                                          {task.progress || 0}%
                                                        </span>
                                                      )}
                                                    </div>
                                                  )
                                                ) : (
                                                  (!hasActualSubTasks && !task.hasChildren) && (
                                                    <div
                                                      style={{
                                                        width: "14px",
                                                        height: "14px",
                                                        borderRadius: "3px",
                                                        border: `1.5px solid ${isActive ? "var(--primary)" : "var(--border)"}`,
                                                        background: isActive ? "var(--primary)" : "transparent",
                                                        display: "flex",
                                                        alignItems: "center",
                                                        justifyContent: "center",
                                                        cursor: "default",
                                                        transition: "all 0.2s",
                                                        opacity: isActive ? 1 : 0.4
                                                      }}
                                                    >
                                                      {isActive && <i className="bi bi-check-lg" style={{ fontSize: "10px", color: "#fff" }}></i>}
                                                    </div>
                                                  )
                                                )}
                                              </div>
                                            </td>
                                          );
                                        })}
                                      </tr>
                                      {children.map((child, cIdx) => renderRows(child, cIdx, level + 1, currentSTT))}
                                    </React.Fragment>
                                  );
                                };

                                return (
                                  <>
                                    {mainTasks.map((task, idx) => renderRows(task, idx, 0, ""))}
                                    {/* Empty row for adding more */}
                                    <tr>
                                      <td style={{
                                        padding: "6px 16px", fontWeight: "700", color: "var(--foreground)", fontSize: "13px",
                                        background: "var(--card)", borderBottom: "1px solid var(--border)",
                                        position: "sticky", left: 0, zIndex: 5
                                      }}>{mainTasks.length + 1}</td>
                                      <td style={{
                                        padding: "6px 24px",
                                        background: "var(--card)", borderBottom: "1px solid var(--border)",
                                        position: "sticky", left: "40px", zIndex: 5,
                                        maxWidth: "280px"
                                      }}>
                                        <input
                                          placeholder="Thêm hạng mục chính mới (Nhấn Enter)..."
                                          onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                              const name = e.currentTarget.value.trim();
                                              if (name) {
                                                setMainTasks([...mainTasks, { id: Date.now(), name, span: [] }]);
                                                e.currentTarget.value = "";
                                              }
                                            }
                                          }}
                                          style={{
                                            width: "100%",
                                            border: "none",
                                            outline: "none",
                                            fontSize: "13px",
                                            background: "var(--card)",
                                            fontWeight: "500",
                                            color: "var(--primary)"
                                          }}
                                        />
                                      </td>
                                      <td style={{
                                        padding: "6px 24px",
                                        background: "var(--card)", borderBottom: "1px solid var(--border)",
                                        position: "sticky", left: "320px", zIndex: 5,
                                        borderRight: "2px solid var(--border)"
                                      }}></td>
                                      {dynamicWeeks.map(w => (
                                        <td key={w.id} style={{ padding: "6px 24px", borderBottom: "1px solid var(--border)", borderRight: "1px solid var(--border)" }}></td>
                                      ))}
                                    </tr>
                                  </>
                                );
                              })()}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </>
                  ) : currentStep === 1 ? (
                    <div className="custom-scrollbar" style={{ flex: 1, overflow: "auto", padding: "24px" }}>
                      <div style={{ background: "var(--card)", borderRadius: "16px", border: "1px solid var(--border)", overflow: "hidden", boxShadow: "0 4px 20px rgba(0,0,0,0.05)" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
                          <thead>
                            <tr style={{ background: "var(--muted)", borderBottom: "1px solid var(--border)" }}>
                              <th style={{ padding: "6px 14px", width: "50px", textAlign: "center", color: "var(--muted-foreground)", fontWeight: "700", textTransform: "uppercase", fontSize: "11px" }}>STT</th>
                              <th style={{ padding: "6px 14px", width: "250px", textAlign: "left", color: "var(--muted-foreground)", fontWeight: "700", textTransform: "uppercase", fontSize: "11px" }}>Hạng mục</th>
                              <th style={{ padding: "6px 14px", textAlign: "left", color: "var(--muted-foreground)", fontWeight: "700", textTransform: "uppercase", fontSize: "11px" }}>Diễn giải</th>
                              <th style={{ padding: "6px 14px", width: "50px", textAlign: "center", color: "var(--muted-foreground)", fontWeight: "700", textTransform: "uppercase", fontSize: "11px" }}>Đơn vị</th>
                              <th style={{ padding: "6px 14px", width: "120px", textAlign: "right", color: "var(--muted-foreground)", fontWeight: "700", textTransform: "uppercase", fontSize: "11px" }}>Đơn giá (đ)</th>
                              <th style={{ padding: "6px 14px", width: "80px", textAlign: "center", color: "var(--muted-foreground)", fontWeight: "700", textTransform: "uppercase", fontSize: "11px" }}>Số lượng</th>
                              <th style={{ padding: "6px 14px", width: "140px", textAlign: "right", color: "var(--muted-foreground)", fontWeight: "700", textTransform: "uppercase", fontSize: "11px" }}>Thành tiền (đ)</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(() => {
                              let pIdx = 0;
                              let sIdx = 0;
                              let ssIdx = 0;
                              let sssIdx = 0;
                              
                              return eventContents.map((row, idx) => {
                                let displaySTT = "";
                                const currentLevel = Number(row.level);
                                if (currentLevel === 0) {
                                  pIdx++; sIdx = 0; ssIdx = 0; sssIdx = 0;
                                  displaySTT = `${pIdx}`;
                                } else if (currentLevel === 1) {
                                  sIdx++; ssIdx = 0; sssIdx = 0;
                                  displaySTT = `${pIdx}.${sIdx}`;
                                } else if (currentLevel === 2) {
                                  ssIdx++; sssIdx = 0;
                                  displaySTT = `${pIdx}.${sIdx}.${ssIdx}`;
                                } else if (currentLevel === 3) {
                                  sssIdx++;
                                  displaySTT = `${pIdx}.${sIdx}.${ssIdx}.${sssIdx}`;
                                } else {
                                  // Fallback for any other levels
                                  displaySTT = "-";
                                }

                                return (
                                  <tr 
                                    key={row.id} 
                                    onClick={() => row.level > 0 && handleOpenContentOffcanvas(null, idx)}
                                    style={{ borderBottom: "1px solid var(--border)", transition: "all 0.2s", verticalAlign: "top", cursor: "pointer" }}
                                    className="hover-row"
                                  >
                                    <td style={{ 
                                      padding: "6px 14px", 
                                      textAlign: "center", 
                                      color: row.level === 0 ? "var(--primary)" : "var(--muted-foreground)", 
                                      fontWeight: row.level === 0 ? "800" : "500",
                                      fontSize: "12px"
                                    }}>
                                      {displaySTT}
                                    </td>
                                    <td style={{ padding: "6px 0" }}>
                                      <div style={{ display: "flex", alignItems: "flex-start", gap: "8px", paddingLeft: `${row.level * 20}px` }}>
                                       {row.level === 1 && <i className="bi bi-arrow-return-right" style={{ color: "var(--muted-foreground)", fontSize: "10px", marginLeft: "6px", marginTop: "4px" }}></i>}
                                       {row.level === 2 && <i className="bi bi-dash" style={{ color: "var(--muted-foreground)", fontSize: "14px", marginLeft: "12px", marginTop: "2px" }}></i>}
                                       <div style={{ 
                                         color: row.level === 0 ? "var(--primary)" : "var(--foreground)", 
                                         fontSize: "13px",
                                         fontWeight: row.level === 0 ? "800" : "500",
                                         textTransform: row.level === 0 ? "uppercase" : "none"
                                       }}>
                                         {row.item}
                                       </div>
                                       {(Number(row.level) === 0 || row.isParent) && (
                                         <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "8px", marginRight: "12px" }}>
                                           <i 
                                             className="bi bi-plus-circle-fill" 
                                             onClick={(e) => {
                                               e.stopPropagation();
                                               handleOpenContentOffcanvas(idx);
                                             }}
                                             style={{ cursor: "pointer", color: "var(--primary)", opacity: 0.8, fontSize: "14px" }}
                                             title="Thêm hạng mục con"
                                           ></i>
                                           {row.level === 0 && (
                                             <i 
                                               className="bi bi-x-circle-fill" 
                                               onClick={(e) => {
                                                 e.stopPropagation();
                                                 setContentIdxToDelete(idx);
                                                 setShowContentDeleteConfirm(true);
                                               }}
                                               style={{ cursor: "pointer", color: "#ef4444", opacity: 0.8, fontSize: "14px" }}
                                               title="Xóa toàn bộ hạng mục"
                                             ></i>
                                           )}
                                         </div>
                                       )}
                                      </div>
                                    </td>
                                    <td style={{ padding: "6px 14px", color: "var(--foreground)", fontSize: "13px", whiteSpace: "pre-line", lineHeight: "1.5" }}>
                                      {row.description}
                                    </td>
                                    <td style={{ padding: "6px 0", textAlign: "center", color: "var(--foreground)", fontSize: "13px" }}>
                                      {row.unit}
                                    </td>
                                    <td style={{ padding: "6px 14px", textAlign: "right", color: "var(--foreground)", fontWeight: "500", fontSize: "13px" }}>
                                      {row.price > 0 ? row.price.toLocaleString("vi-VN") : ""}
                                    </td>
                                    <td style={{ padding: "6px 0", textAlign: "center", color: "var(--foreground)", fontSize: "13px" }}>
                                      {row.quantity > 0 ? row.quantity.toLocaleString("vi-VN") : ""}
                                    </td>
                                    <td style={{ padding: "6px 14px", textAlign: "right", fontWeight: "700", color: "var(--primary)", fontSize: "14px" }}>
                                      {calculateItemTotal(idx).toLocaleString()}
                                    </td>
                                  </tr>
                                );
                              });
                            })()}
                            <tr style={{ background: "var(--card)" }}>
                              <td style={{ padding: "6px 14px", textAlign: "center", color: "var(--primary)", fontWeight: "800", fontSize: "12px", borderBottom: "1px solid var(--border)" }}>
                                {eventContents.filter(c => c.level === 0).length + 1}
                              </td>
                              <td colSpan={6} style={{ padding: "0", borderBottom: "1px solid var(--border)" }}>
                                <input
                                  placeholder="Thêm hạng mục chính mới (Nhấn Enter)..."
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter" && !e.nativeEvent.isComposing) {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      const name = e.currentTarget.value.trim();
                                      if (name) {
                                        const newRow = { 
                                          id: Date.now(), 
                                          item: name, 
                                          description: "", 
                                          unit: "", 
                                          price: 0, 
                                          quantity: 0, 
                                          level: 0,
                                          isParent: false 
                                        };
                                        setEventContents([...eventContents, newRow]);
                                        e.currentTarget.value = "";
                                      }
                                    }
                                  }}
                                  style={{
                                    width: "100%",
                                    padding: "16px 24px",
                                    border: "none",
                                    outline: "none",
                                    background: "transparent",
                                    fontSize: "13px",
                                    fontWeight: "700",
                                    color: "var(--primary)"
                                  }}
                                />
                              </td>
                            </tr>
                          </tbody>
                          <tfoot>
                            {(() => {
                              const subtotal = eventContents.reduce((sum, row, idx) => {
                                if (row.level === 0) return sum + calculateItemTotal(idx);
                                return sum;
                              }, 0);
                              const managementFee = subtotal * (managementFeeRate / 100);
                              const vat = (subtotal + managementFee) * (vatRate / 100);
                              const grandTotal = subtotal + managementFee + vat;

                              return (
                                <>
                                  <tr style={{ background: "rgba(0,0,0,0.02)", borderTop: "2px solid var(--border)" }}>
                                    <td colSpan={6} style={{ padding: "8px 16px", textAlign: "right" }}>
                                      <span style={{ fontWeight: "700", fontSize: "12px", color: "var(--muted-foreground)", textTransform: "uppercase" }}>TỔNG (CHƯA PHÍ/THUẾ):</span>
                                    </td>
                                    <td style={{ padding: "8px 16px", textAlign: "right", fontWeight: "700", fontSize: "14px", color: "var(--foreground)" }}>
                                      {subtotal.toLocaleString()} <span style={{ fontSize: "10px" }}>đ</span>
                                    </td>
                                  </tr>
                                  <tr style={{ background: "rgba(0,0,0,0.02)" }}>
                                    <td colSpan={6} style={{ padding: "4px 16px", textAlign: "right" }}>
                                      <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "4px" }}>
                                        <span style={{ fontWeight: "700", fontSize: "12px", color: "var(--muted-foreground)", textTransform: "uppercase" }}>CHI PHÍ QUẢN LÝ</span>
                                        <input 
                                          type="number" 
                                          value={managementFeeRate} 
                                          onChange={(e) => setManagementFeeRate(Number(e.target.value))}
                                          style={{ 
                                            width: "35px", 
                                            padding: "0", 
                                            border: "none", 
                                            borderBottom: "1.5px solid var(--primary)", 
                                            background: "transparent", 
                                            textAlign: "center", 
                                            fontSize: "13px", 
                                            fontWeight: "700", 
                                            color: "var(--primary)",
                                            outline: "none",
                                            marginLeft: "12px"
                                          }}
                                        />
                                        <span style={{ fontWeight: "700", fontSize: "12px", color: "var(--muted-foreground)", textTransform: "uppercase" }}>% :</span>
                                      </div>
                                    </td>
                                    <td style={{ padding: "4px 16px", textAlign: "right", fontWeight: "700", fontSize: "14px", color: "var(--foreground)" }}>
                                      {managementFee.toLocaleString()} <span style={{ fontSize: "10px" }}>đ</span>
                                    </td>
                                  </tr>
                                  <tr style={{ background: "rgba(0,0,0,0.02)" }}>
                                    <td colSpan={6} style={{ padding: "4px 16px", textAlign: "right" }}>
                                      <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "4px" }}>
                                        <span style={{ fontWeight: "700", fontSize: "12px", color: "var(--muted-foreground)", textTransform: "uppercase" }}>THUẾ VAT</span>
                                        <input 
                                          type="number" 
                                          value={vatRate} 
                                          onChange={(e) => setVatRate(Number(e.target.value))}
                                          style={{ 
                                            width: "35px", 
                                            padding: "0", 
                                            border: "none", 
                                            borderBottom: "1.5px solid var(--primary)", 
                                            background: "transparent", 
                                            textAlign: "center", 
                                            fontSize: "13px", 
                                            fontWeight: "700", 
                                            color: "var(--primary)",
                                            outline: "none",
                                            marginLeft: "12px"
                                          }}
                                        />
                                        <span style={{ fontWeight: "700", fontSize: "12px", color: "var(--muted-foreground)", textTransform: "uppercase" }}>% :</span>
                                      </div>
                                    </td>
                                    <td style={{ padding: "4px 16px", textAlign: "right", fontWeight: "700", fontSize: "14px", color: "var(--foreground)" }}>
                                      {vat.toLocaleString()} <span style={{ fontSize: "10px" }}>đ</span>
                                    </td>
                                  </tr>
                                  <tr style={{ background: "var(--muted)", borderTop: "1px solid var(--border)" }}>
                                    <td colSpan={6} style={{ padding: "10px 16px 4px 16px", textAlign: "right", verticalAlign: "middle" }}>
                                      <div style={{ fontWeight: "800", textTransform: "uppercase", fontSize: "13px", letterSpacing: "1px", color: "var(--primary)" }}>TỔNG CỘNG DỰ KIẾN:</div>
                                    </td>
                                    <td style={{ padding: "10px 16px 4px 16px", textAlign: "right", fontWeight: "800", fontSize: "18px", color: "var(--primary)", verticalAlign: "middle" }}>
                                      {grandTotal.toLocaleString()} <span style={{ fontSize: "12px", fontWeight: "500" }}>đ</span>
                                    </td>
                                  </tr>
                                  <tr style={{ background: "var(--muted)" }}>
                                    <td colSpan={7} style={{ padding: "0 16px 12px 16px", textAlign: "right" }}>
                                      <div style={{ fontSize: "11px", fontStyle: "italic", color: "var(--muted-foreground)", fontWeight: "500" }}>
                                        (Bằng chữ: {numberToVietnameseWords(grandTotal)})
                                      </div>
                                    </td>
                                  </tr>
                                </>
                              );
                            })()}
                          </tfoot>
                        </table>
                      </div>
                    </div>
                  ) : (
                    <div style={{
                      flex: 1,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "var(--muted-foreground)",
                      fontSize: "14px",
                      height: "100%"
                    }}>
                      Chưa có nội dùng cho bước: <strong>{["Tổng quan", "Nội dung", "Kế hoạch", "Ngân sách", "Doanh thu"][currentStep]}</strong>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <style>{`
            .custom-scrollbar::-webkit-scrollbar {
              width: 5px;
            }
            .custom-scrollbar::-webkit-scrollbar-track {
              background: transparent;
            }
            .custom-scrollbar::-webkit-scrollbar-thumb {
              background: var(--border);
              border-radius: 10px;
            }
            .custom-scrollbar {
              scrollbar-width: thin;
              scrollbar-color: var(--border) transparent;
            }
          `}</style>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sub-task Offcanvas Panel */}
      <AnimatePresence>
        {showSubTaskOffcanvas && (
          <div style={{ position: "fixed", inset: 0, zIndex: 20000 }}>
            {/* Overlay Background */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSubTaskOffcanvas(false)}
              style={{
                position: "absolute",
                inset: 0,
                background: "rgba(0,0,0,0.4)",
                backdropFilter: "blur(4px)"
              }}
            />
            {/* Sliding Panel */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              style={{
                position: "absolute",
                top: 0,
                right: 0,
                bottom: 0,
                width: "400px",
                background: "var(--card)",
                boxShadow: "-10px 0 30px rgba(0,0,0,0.15)",
                display: "flex",
                flexDirection: "column",
                borderLeft: "1px solid var(--border)"
              }}
            >
              {/* Offcanvas Header */}
              <div style={{ padding: "10px 24px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <h3 style={{ fontSize: "16px", fontWeight: "800", color: "var(--foreground)", margin: 0, letterSpacing: "0.2px" }}>Thiết lập công việc con</h3>
                  <p style={{ fontSize: "11px", color: "var(--primary)", marginTop: "2px", fontWeight: "700" }}>HẠNG MỤC: {activeTaskName}</p>
                </div>
                <button
                  onClick={() => setShowSubTaskOffcanvas(false)}
                  style={{ background: "var(--muted)", border: "none", width: "32px", height: "32px", borderRadius: "8px", color: "var(--foreground)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                >
                  <i className="bi bi-x-lg"></i>
                </button>
              </div>

              {/* Offcanvas Body */}
              <div className="custom-scrollbar" style={{
                flex: 1,
                overflowY: "auto",
                padding: "20px 32px",
                display: "flex",
                flexDirection: "column"
              }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "16px", flex: 1 }}>
                  <FormGroup label="Tên công việc">
                    <input
                      ref={subTaskInputRef}
                      value={subTaskName}
                      onChange={(e) => setSubTaskName(e.target.value)}
                      placeholder="VD: Thiết kế banner quảng cáo tuần 1"
                      style={sidebarInputStyle}
                    />
                  </FormGroup>

                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 4px" }}>
                    <span style={{ fontSize: "12px", fontWeight: "700", color: "var(--foreground)" }}>Có công việc con</span>
                    <div
                      onClick={() => setHasSubTasks(!hasSubTasks)}
                      style={{
                        width: "36px", height: "20px", borderRadius: "12px",
                        background: hasSubTasks ? "var(--primary)" : "var(--border)",
                        position: "relative", cursor: "pointer", transition: "all 0.3s"
                      }}
                    >
                      <div style={{
                        width: "16px", height: "16px", borderRadius: "50%", background: "#fff",
                        position: "absolute", top: "2px", left: hasSubTasks ? "18px" : "2px",
                        transition: "all 0.3s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)"
                      }} />
                    </div>
                  </div>

                  {!hasSubTasks ? (
                    <div style={{ padding: "16px", background: "var(--muted)", borderRadius: "12px", display: "flex", flexDirection: "column", gap: "16px" }}>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                        <FormGroup label="Ngày thực hiện">
                          <input
                            type="date"
                            value={subTaskStartDate}
                            onChange={(e) => setSubTaskStartDate(e.target.value)}
                            disabled={isByWeek}
                            style={{ ...sidebarInputStyle, opacity: isByWeek ? 0.5 : 1 }}
                          />
                        </FormGroup>
                        <FormGroup label="Hạn hoàn thành">
                          <input
                            type="date"
                            value={subTaskEndDate}
                            onChange={(e) => setSubTaskEndDate(e.target.value)}
                            disabled={isByWeek}
                            style={{ ...sidebarInputStyle, opacity: isByWeek ? 0.5 : 1 }}
                          />
                        </FormGroup>
                      </div>

                      <FormGroup label="Tiến độ hoàn thành (%)">
                        <input
                          type="number"
                          min="0" max="100"
                          value={subTaskProgress}
                          onChange={(e) => setSubTaskProgress(Number(e.target.value))}
                          placeholder="0 - 100"
                          style={sidebarInputStyle}
                        />
                      </FormGroup>

                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: "12px", borderTop: "1px solid var(--border)" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                          <div
                            onClick={() => setIsByWeek(!isByWeek)}
                            style={{
                              width: "36px", height: "20px", borderRadius: "12px",
                              background: isByWeek ? "var(--primary)" : "var(--border)",
                              position: "relative", cursor: "pointer", transition: "all 0.3s"
                            }}
                          >
                            <div style={{
                              width: "16px", height: "16px", borderRadius: "50%", background: "#fff",
                              position: "absolute", top: "2px", left: isByWeek ? "18px" : "2px",
                              transition: "all 0.3s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)"
                            }} />
                          </div>
                          <span style={{ fontSize: "12.5px", fontWeight: "700", color: isByWeek ? "var(--primary)" : "var(--foreground)" }}>Theo tuần</span>
                        </div>

                        <div style={{ flex: 1, marginLeft: "24px", position: "relative" }}>
                          <div
                            onClick={() => isByWeek && setShowWeekDropdown(!showWeekDropdown)}
                            style={{
                              ...sidebarInputStyle,
                              opacity: !isByWeek ? 0.4 : 1,
                              cursor: !isByWeek ? "not-allowed" : "pointer",
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              background: "var(--background)"
                            }}
                          >
                            <span style={{ fontSize: "12px", color: selectedSubWeeks.length ? "var(--primary)" : "var(--muted-foreground)", fontWeight: selectedSubWeeks.length ? "700" : "400" }}>
                              {selectedSubWeeks.length === 0 ? "Chọn tuần..." : `Đã chọn ${selectedSubWeeks.length} tuần`}
                            </span>
                            <i className={`bi bi-chevron-${showWeekDropdown ? "up" : "down"}`} style={{ fontSize: "12px" }}></i>
                          </div>

                          {showWeekDropdown && isByWeek && (
                            <>
                              <div
                                style={{ position: "fixed", inset: 0, zIndex: 10 }}
                                onClick={() => setShowWeekDropdown(false)}
                              />
                              <div style={{
                                position: "absolute",
                                top: "110%",
                                left: 0,
                                right: 0,
                                zIndex: 11,
                                maxHeight: "200px",
                                overflowY: "auto",
                                background: "var(--card)",
                                border: "1px solid var(--border)",
                                borderRadius: "8px",
                                boxShadow: "0 10px 25px rgba(0,0,0,0.2)",
                                padding: "6px"
                              }} className="custom-scrollbar">
                                {dynamicWeeks.map(w => (
                                  <div
                                    key={w.id}
                                    onClick={() => {
                                      setSelectedSubWeeks(prev =>
                                        prev.includes(w.id) ? prev.filter(id => id !== w.id) : [...prev, w.id]
                                      );
                                    }}
                                    style={{
                                      display: "flex", alignItems: "center", gap: "10px", padding: "8px 10px",
                                      borderRadius: "6px", cursor: "pointer", transition: "all 0.2s",
                                      background: selectedSubWeeks.includes(w.id) ? "rgba(99, 102, 241, 0.08)" : "transparent"
                                    }}
                                  >
                                    <div style={{
                                      width: "16px", height: "16px", borderRadius: "4px",
                                      border: `1.5px solid ${selectedSubWeeks.includes(w.id) ? "var(--primary)" : "var(--border)"}`,
                                      background: selectedSubWeeks.includes(w.id) ? "var(--primary)" : "transparent",
                                      display: "flex", alignItems: "center", justifyContent: "center", color: "white"
                                    }}>
                                      {selectedSubWeeks.includes(w.id) && <i className="bi bi-check" style={{ fontSize: "14px" }}></i>}
                                    </div>
                                    <span style={{
                                      fontSize: "12px",
                                      color: selectedSubWeeks.includes(w.id) ? "var(--foreground)" : "var(--muted-foreground)",
                                      fontWeight: selectedSubWeeks.includes(w.id) ? "600" : "400"
                                    }}>
                                      Tuần {w.weekNumber} ({w.range})
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div style={{ padding: "12px 16px", background: "rgba(99, 102, 241, 0.05)", borderRadius: "10px", border: "1px dashed var(--primary)" }}>
                      <p style={{ fontSize: "11px", color: "var(--primary)", margin: 0, fontStyle: "italic", lineHeight: "1.4" }}>
                        <i className="bi bi-info-circle me-1"></i>
                        Đang ở chế độ Hạng mục cha. Thời gian sẽ được quản lý bởi các công việc con bên dưới.
                      </p>
                    </div>
                  )}

                  <FormGroup label="Nhân sự thực hiện">
                    <select
                      value={subTaskPic}
                      onChange={(e) => setSubTaskPic(e.target.value)}
                      disabled={hasSubTasks}
                      style={{ ...sidebarInputStyle, opacity: hasSubTasks ? 0.5 : 1, cursor: hasSubTasks ? "not-allowed" : "pointer" }}
                    >
                      <option value="">Chọn thành viên team...</option>
                      {marketingEmployees.map(emp => (
                        <option key={emp.id} value={emp.id}>{emp.fullName} - {emp.position}</option>
                      ))}
                    </select>
                  </FormGroup>

                  <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
                    <FormGroup
                      label="Nội dung chi tiết"
                      style={{ flex: 1 }}
                    >
                      <textarea
                        value={subTaskContent}
                        onChange={(e) => setSubTaskContent(e.target.value)}
                        placeholder="Mô tả chi tiết nội dung cần thực hiện..."
                        style={{ ...sidebarInputStyle, height: "100%", flex: 1, minHeight: "200px", resize: "none" }}
                      />
                    </FormGroup>
                  </div>
                </div>
              </div>

              {/* Offcanvas Footer */}
              <div style={{ padding: "16px 24px", borderTop: "1px solid var(--border)", display: "flex", gap: "10px", background: "var(--muted)" }}>
                <button
                  onClick={handleSaveSubTask}
                  style={{
                    flex: 2, padding: "12px", borderRadius: "12px", border: "none",
                    background: isEditMode ? "#f59e0b" : "var(--primary)", color: "#fff", fontWeight: "700", cursor: "pointer", fontSize: "14px",
                    boxShadow: "0 4px 12px rgba(99, 102, 241, 0.2)"
                  }}
                >
                  {isEditMode ? "Cập nhật công việc" : "Lưu công việc"}
                </button>
                {isEditMode && (
                  <button
                    onClick={handleDeleteTask}
                    style={{
                      flex: 1, padding: "12px", borderRadius: "12px", border: "1px solid #fee2e2",
                      background: "#fef2f2", color: "#ef4444", fontWeight: "700", cursor: "pointer", fontSize: "13px",
                      whiteSpace: "nowrap"
                    }}
                  >
                    <i className="bi bi-trash3 me-1"></i>Xóa
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Event Content Offcanvas (Tab 1) */}
      <AnimatePresence>
        {showContentOffcanvas && (
          <div style={{ position: "fixed", inset: 0, zIndex: 20000, display: "flex", justifyContent: "flex-end" }}>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowContentOffcanvas(false)}
              style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(2px)" }}
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              style={{
                width: "400px", height: "100%", background: "var(--card)", zIndex: 20001,
                boxShadow: "-10px 0 30px rgba(0,0,0,0.15)", display: "flex", flexDirection: "column",
                borderLeft: "1px solid var(--border)"
              }}
            >
              {/* Header */}
              <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--background)" }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: "18px", fontWeight: "800", color: "var(--primary)" }}>
                    {editingContentIdx !== null ? "Sửa hạng mục" : (activeParentIdx !== null ? "Thêm hạng mục con" : "Thêm hạng mục mới")}
                  </h3>
                  <p style={{ margin: "4px 0 0", fontSize: "12px", color: "var(--muted-foreground)" }}>Nhập chi tiết thông tin và chi phí</p>
                </div>
                <button
                  onClick={() => setShowContentOffcanvas(false)}
                  style={{ width: "32px", height: "32px", borderRadius: "8px", border: "none", background: "rgba(0,0,0,0.05)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                >
                  <i className="bi bi-x-lg"></i>
                </button>
              </div>

              {/* Body */}
              <div className="custom-scrollbar" style={{ flex: 1, overflowY: "auto", padding: "24px" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                  <FormGroup label="Tên hạng mục">
                    <input
                      value={contentItem || ""}
                      onChange={(e) => setContentItem(e.target.value)}
                      placeholder="Nhập tên hạng mục..."
                      style={sidebarInputStyle}
                    />
                  </FormGroup>

                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 4px" }}>
                    <span style={{ fontSize: "12px", fontWeight: "700", color: "var(--foreground)" }}>Có hạng mục con</span>
                    <div
                      onClick={() => setContentHasChildren(!contentHasChildren)}
                      style={{
                        width: "36px", height: "20px", borderRadius: "12px",
                        background: contentHasChildren ? "var(--primary)" : "var(--border)",
                        position: "relative", cursor: "pointer", transition: "all 0.3s"
                      }}
                    >
                      <div style={{
                        width: "16px", height: "16px", borderRadius: "50%", background: "#fff",
                        position: "absolute", top: "2px", left: contentHasChildren ? "18px" : "2px",
                        transition: "all 0.3s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)"
                      }} />
                    </div>
                  </div>

                  {contentHasChildren ? (
                    <div style={{ padding: "12px 16px", background: "rgba(99, 102, 241, 0.05)", borderRadius: "10px", border: "1px dashed var(--primary)" }}>
                      <p style={{ fontSize: "11px", color: "var(--primary)", margin: 0, fontStyle: "italic", lineHeight: "1.4" }}>
                        <i className="bi bi-info-circle me-1"></i>
                        Đang ở chế độ Hạng mục cha. Chi phí sẽ được tổng hợp tự động từ các hạng mục con bên dưới.
                      </p>
                    </div>
                  ) : (
                    <>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                        <FormGroup label="Đơn giá (VNĐ)">
                          <input
                            type="text"
                            value={contentPrice === 0 ? "" : contentPrice.toLocaleString("vi-VN")}
                            onChange={(e) => {
                              const raw = e.target.value.replace(/\./g, "").replace(/,/g, "");
                              setContentPrice(Number(raw) || 0);
                            }}
                            placeholder="0"
                            style={{ ...sidebarInputStyle, textAlign: "right" }}
                          />
                        </FormGroup>
                        <FormGroup label="Số lượng">
                          <input
                            type="text"
                            value={contentQty === 0 ? "" : contentQty.toLocaleString("vi-VN")}
                            onChange={(e) => {
                              const raw = e.target.value.replace(/\./g, "").replace(/,/g, "");
                              setContentQty(Number(raw) || 0);
                            }}
                            placeholder="0"
                            style={{ ...sidebarInputStyle, textAlign: "center" }}
                          />
                        </FormGroup>
                      </div>

                      <FormGroup label="Đơn vị tính">
                        <input
                          value={contentUnit || ""}
                          onChange={(e) => setContentUnit(e.target.value)}
                          placeholder="gói, cái, buổi..."
                          style={sidebarInputStyle}
                        />
                      </FormGroup>
                    </>
                  )}

                  <FormGroup label="Diễn giải chi tiết">
                    <textarea
                      className="description-textarea"
                      value={contentDesc || ""}
                      onChange={(e) => {
                        let val = e.target.value;
                        if (val && !val.startsWith("• ")) val = "• " + val;
                        setContentDesc(val);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          const start = e.currentTarget.selectionStart;
                          const value = e.currentTarget.value;
                          const newValue = value.substring(0, start) + "\n• " + value.substring(e.currentTarget.selectionEnd);
                          setContentDesc(newValue);
                          const target = e.currentTarget;
                          setTimeout(() => {
                            if (target) {
                              target.selectionStart = target.selectionEnd = start + 3;
                            }
                          }, 0);
                        }
                      }}
                      placeholder="Mô tả chi tiết hạng mục..."
                      style={{ ...sidebarInputStyle, height: "150px", resize: "none" }}
                    />
                  </FormGroup>

                  <div style={{ padding: "16px", background: "rgba(99, 102, 241, 0.05)", borderRadius: "12px", border: "1px solid rgba(99, 102, 241, 0.1)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: "13px", fontWeight: "700", color: "var(--muted-foreground)" }}>THÀNH TIỀN</span>
                      <span style={{ fontSize: "18px", fontWeight: "800", color: "var(--primary)" }}>
                        {(contentPrice * contentQty).toLocaleString()} <small style={{ fontSize: "12px" }}>đ</small>
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div style={{ padding: "16px 24px", borderTop: "1px solid var(--border)", background: "var(--muted)", display: "flex", gap: "12px" }}>
                {editingContentIdx !== null && (
                  <button
                    onClick={() => {
                      if (eventContents.length > 1) {
                        setEventContents(eventContents.filter((_, i) => i !== editingContentIdx));
                        setShowContentOffcanvas(false);
                      }
                    }}
                    style={{
                      padding: "12px 20px", borderRadius: "12px", border: "1px solid #fee2e2",
                      background: "#fef2f2", color: "#ef4444", fontWeight: "700", cursor: "pointer", fontSize: "14px"
                    }}
                  >
                    Xóa
                  </button>
                )}
                <button
                  onClick={handleSaveContentItem}
                  style={{
                    flex: 1, padding: "12px", borderRadius: "12px", border: "none",
                    background: "var(--primary)", color: "#fff", fontWeight: "700", cursor: "pointer", fontSize: "14px",
                    boxShadow: "0 4px 12px rgba(99, 102, 241, 0.2)"
                  }}
                >
                  {editingContentIdx !== null ? "Cập nhật hạng mục" : "Thêm vào danh sách"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ConfirmDialog
        open={showContentDeleteConfirm}
        onCancel={() => setShowContentDeleteConfirm(false)}
        onConfirm={handleDeleteContentBranch}
        title="Xác nhận xóa hạng mục"
        message="Hạng mục này cùng tất cả các nội dung con bên dưới sẽ bị xóa vĩnh viễn. Bạn có chắc chắn muốn thực hiện?"
        variant="danger"
      />
      <ConfirmDialog
        open={showDeleteConfirm}
        variant="danger"
        title="Xóa sự kiện?"
        message={`Bạn có chắc chắn muốn xóa sự kiện "${formData.name}"? Thao tác này sẽ xóa vĩnh viễn toàn bộ thông tin và kế hoạch thực hiện liên quan.`}
        confirmLabel="Xóa vĩnh viễn"
        loading={isSaving}
        onConfirm={executeDelete}
        onCancel={() => setShowDeleteConfirm(false)}
      />

      <ConfirmDialog
        open={showTaskDeleteConfirm}
        variant="danger"
        title="Xóa công việc?"
        message={`Bạn có chắc chắn muốn xóa công việc "${editingTask?.name}"? Thao tác này không thể hoàn tác.`}
        confirmLabel="Xóa công việc"
        onConfirm={executeDeleteTask}
        onCancel={() => setShowTaskDeleteConfirm(false)}
      />
    </>
  );
}

// --- Helper Components ---

function Section({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <div style={{
      background: "var(--card)",
      border: "1px solid var(--border)",
      borderRadius: "16px",
      padding: "24px",
      display: "flex",
      flexDirection: "column",
      gap: "20px"
    }}>
      <SectionTitle title={title} style={{ color: "var(--primary)", fontSize: "12px" }} />
      {children}
    </div>
  );
}

const FormGroup = ({ label, children, style }: { label: string, children: React.ReactNode, style?: React.CSSProperties }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: "6px", ...style }}>
    <label style={{ fontSize: "11px", fontWeight: "700", color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.5px" }}>{label}</label>
    {children}
  </div>
);

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 14px",
  borderRadius: "10px",
  border: "1px solid var(--border)",
  background: "var(--background)",
  color: "var(--foreground)",
  fontSize: "14px",
  outline: "none",
  transition: "all 0.2s ease",
};

const sidebarInputStyle: React.CSSProperties = {
  ...inputStyle,
  padding: "7px 10px",
  fontSize: "13px",
  borderRadius: "8px",
};

// Utility: Convert number to Vietnamese words
const numberToVietnameseWords = (n: number): string => {
  if (n === 0) return "Không đồng";
  
  const units = ["", " nghìn", " triệu", " tỷ", " nghìn tỷ", " triệu tỷ"];
  const digits = ["không", "một", "hai", "ba", "bốn", "năm", "sáu", "bảy", "tám", "chín"];
  
  const readGroup = (group: number): string => {
    let s = "";
    const h = Math.floor(group / 100);
    const t = Math.floor((group % 100) / 10);
    const u = group % 10;
    
    if (h > 0) {
      s += digits[h] + " trăm";
      if (t === 0 && u > 0) s += " lẻ";
    }
    
    if (t > 0) {
      if (t === 1) s += " mười";
      else s += " " + digits[t] + " mươi";
    } else if (h > 0 && u > 0) {
      s += " lẻ";
    }
    
    if (u > 0) {
      if (t > 1 && u === 1) s += " mốt";
      else if (t > 0 && u === 5) s += " lăm";
      else if (t === 0 && h === 0 && u > 0 && s !== "") s += " " + digits[u];
      else s += " " + digits[u];
    }
    
    return s;
  };
  
  let res = "";
  let i = 0;
  let tempN = Math.abs(Math.floor(n));
  
  while (tempN > 0) {
    const group = tempN % 1000;
    if (group > 0) {
      const groupStr = readGroup(group).trim();
      res = groupStr + units[i] + (res ? " " + res : "");
    }
    tempN = Math.floor(tempN / 1000);
    i++;
  }
  
  res = res.trim().replace(/\s+/g, " ");
  return res.charAt(0).toUpperCase() + res.slice(1) + " đồng";
};
