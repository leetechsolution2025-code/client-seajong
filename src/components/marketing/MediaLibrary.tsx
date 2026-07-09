"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { useSession } from "next-auth/react";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { SearchInput } from "@/components/ui/SearchInput";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Folder {
  id: string; name: string; ownerId: string | null; ownerName: string | null;
  parentId: string | null; isPublic: boolean; ownerIsActive: boolean; createdAt: string;
  _count: { assets: number; children: number };
  ownerDeptName?: string | null;
  ownerPositionName?: string | null;
}
interface Asset {
  id: string; folderId: string; name: string; description: string | null;
  type: string; channel: string; fileUrl: string; fileSize: number; fileType: string;
  thumbnail: string | null; uploadedBy: string; downloads: number; createdAt: string;
  isPublic?: boolean;
}
interface MediaLibraryProps {
  mode?: "full" | "picker";
  onSelect?: (asset: Asset) => void;
  filterType?: string;
}

const FILE_TYPES = [
  { value: "", label: "Tất cả loại" }, { value: "catalogue", label: "Catalogue" },
  { value: "banner", label: "Banner" }, { value: "video", label: "Video" },
  { value: "slide", label: "Slide Sales" }, { value: "photo", label: "Ảnh sản phẩm" },
  { value: "template", label: "Template" }, { value: "cert", label: "Chứng chỉ" },
];
const CHANNELS = [
  { value: "", label: "Tất cả kênh" }, { value: "showroom", label: "Showroom" },
  { value: "digital", label: "Digital" }, { value: "print", label: "In ấn" },
  { value: "all", label: "Đa kênh" },
];
const TYPE_ICONS: Record<string, string> = {
  catalogue: "bi-book", banner: "bi-image", video: "bi-play-circle",
  slide: "bi-easel", photo: "bi-camera", template: "bi-file-earmark-text",
  cert: "bi-patch-check", other: "bi-file-earmark",
};
const TYPE_COLORS: Record<string, string> = {
  catalogue: "#6366f1", banner: "#ec4899", video: "#ef4444",
  slide: "#f59e0b", photo: "#10b981", template: "#3b82f6", cert: "#8b5cf6",
};
const TYPE_GRADIENTS: Record<string, string> = {
  catalogue: "linear-gradient(135deg, #818cf8, #4f46e5)",
  banner: "linear-gradient(135deg, #f472b6, #db2777)",
  video: "linear-gradient(135deg, #f87171, #dc2626)",
  slide: "linear-gradient(135deg, #fbbf24, #d97706)",
  photo: "linear-gradient(135deg, #34d399, #059669)",
  template: "linear-gradient(135deg, #60a5fa, #2563eb)",
  cert: "linear-gradient(135deg, #a78bfa, #7c3aed)",
  other: "linear-gradient(135deg, #9ca3af, #4b5563)",
};

function fmtBytes(b: number) {
  if (!b) return "0 B";
  const k = 1024, s = ["B","KB","MB","GB"], i = Math.floor(Math.log(b)/Math.log(k));
  return `${parseFloat((b/Math.pow(k,i)).toFixed(1))} ${s[i]}`;
}
function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("vi-VN", { day:"2-digit", month:"2-digit", year:"numeric", hour:"2-digit", minute:"2-digit" });
}
function isImage(e: string) { return ["jpg","jpeg","png","gif","webp","svg"].includes(e); }
function isVideo(e: string) { return ["mp4","webm","mov","avi"].includes(e); }
function isPdf(e: string) { return e === "pdf"; }
function getFileIcon(ext: string, type: string) {
  const e = ext.toLowerCase();
  if (["pdf"].includes(e)) return "bi-file-earmark-pdf";
  if (["doc", "docx"].includes(e)) return "bi-file-earmark-word";
  if (["xls", "xlsx", "csv"].includes(e)) return "bi-file-earmark-excel";
  if (["ppt", "pptx"].includes(e)) return "bi-file-earmark-ppt";
  if (["zip", "rar", "tar", "gz"].includes(e)) return "bi-file-earmark-zip";
  if (["txt", "md"].includes(e)) return "bi-file-earmark-text";
  if (["js", "ts", "json", "html", "css"].includes(e)) return "bi-file-earmark-code";
  if (["mp3", "wav", "ogg", "m4a"].includes(e)) return "bi-file-earmark-music";
  if (["mp4", "webm", "mov", "avi"].includes(e)) return "bi-file-earmark-play";
  if (["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(e)) return "bi-file-earmark-image";
  return TYPE_ICONS[type] || "bi-file-earmark";
}

// ─── Custom Premium SVG Icons ─────────────────────────────────────────────────
function FolderSvg({ isPublic, locked, size = 48 }: { isPublic: boolean; locked: boolean; size?: number }) {
  const gradientId = `folder-grad-${isPublic}-${locked}-${Math.random().toString(36).substr(2, 4)}`;
  let startColor = "#fbbf24"; // Amber 400
  let endColor = "#d97706"; // Amber 600
  let tabColor = "#f59e0b"; // Amber 500

  if (locked) {
    startColor = "#9ca3af"; // Gray 400
    endColor = "#4b5563"; // Gray 600
    tabColor = "#6b7280"; // Gray 500
  } else if (!isPublic) {
    startColor = "#818cf8"; // Indigo 400
    endColor = "#4f46e5"; // Indigo 600
    tabColor = "#6366f1"; // Indigo 500
  }

  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.08))", flexShrink: 0 }}>
      <defs>
        <linearGradient id={`${gradientId}-back`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={tabColor} />
          <stop offset="100%" stopColor={startColor} />
        </linearGradient>
        <linearGradient id={`${gradientId}-front`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={startColor} />
          <stop offset="100%" stopColor={endColor} />
        </linearGradient>
      </defs>
      {/* Back panel & Tab */}
      <path d="M4 14C4 11.7909 5.79086 10 8 10H20C21.3 10 22.5 10.5 23.4 11.4L28 16H56C58.2091 16 60 17.7909 60 20V48C60 50.2091 58.2091 52 56 52H8C5.79086 52 4 50.2091 4 48V14Z" fill={`url(#${gradientId}-back)`} />
      {/* Paper sheet inside folder */}
      <path d="M10 18H54V40H10V18Z" fill="#ffffff" opacity="0.4" style={{ transform: "translateY(-2px)" }} />
      {/* Front flap */}
      <path d="M4 21C4 18.7909 5.79086 17 8 17H56C58.2091 17 60 18.7909 60 21V48C60 50.2091 58.2091 52 56 52H8C5.79086 52 4 50.2091 4 48V21Z" fill={`url(#${gradientId}-front)`} />
      
      {/* Icon on Front Flap */}
      {locked ? (
        <path d="M32 24C29.2 24 27 26.2 27 29V32H25V42H39V32H37V29C37 26.2 34.8 24 32 24ZM29 29C29 27.3 30.3 26 32 26C33.7 26 35 27.3 35 29V32H29V29ZM32 35C32.8 35 33.5 35.7 33.5 36.5C33.5 37.3 32.8 38 32 38C31.2 38 30.5 37.3 30.5 36.5C30.5 35.7 31.2 35 32 35Z" fill="#ffffff" opacity="0.85" />
      ) : isPublic ? (
        <g opacity="0.8" stroke="#ffffff" strokeWidth="2.5" fill="none">
          <circle cx="32" cy="35" r="7" />
          <path d="M25 35H39" />
          <path d="M32 28C33.8 30 33.8 40 32 42C30.2 40 30.2 30 32 28Z" />
        </g>
      ) : (
        <path d="M32 33C34.2091 33 36 31.2091 36 29C36 26.7909 34.2091 25 32 25C29.7909 25 28 26.7909 28 29C28 31.2091 29.7909 33 32 33ZM25 39C25 36.5 28.5 35.5 32 35.5C35.5 35.5 39 36.5 39 39V40H25V39Z" fill="#ffffff" opacity="0.85" />
      )}
    </svg>
  );
}

function FileSvg({ ext, size = 42 }: { ext: string; size?: number }) {
  const e = ext.toLowerCase();
  const gradientId = `file-grad-${e}-${Math.random().toString(36).substr(2, 4)}`;
  
  let startColor = "#9ca3af";
  let endColor = "#4b5563";
  let label = e.toUpperCase().slice(0, 4);
  
  if (["pdf"].includes(e)) {
    startColor = "#ef4444";
    endColor = "#b91c1c";
  } else if (["doc", "docx"].includes(e)) {
    startColor = "#3b82f6";
    endColor = "#1d4ed8";
  } else if (["xls", "xlsx", "csv"].includes(e)) {
    startColor = "#10b981";
    endColor = "#047857";
  } else if (["ppt", "pptx"].includes(e)) {
    startColor = "#f97316";
    endColor = "#c2410c";
  } else if (["zip", "rar", "tar", "gz"].includes(e)) {
    startColor = "#fbbf24";
    endColor = "#d97706";
  } else if (["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(e)) {
    startColor = "#ec4899";
    endColor = "#be185d";
  } else if (["mp4", "webm", "mov", "avi"].includes(e)) {
    startColor = "#f43f5e";
    endColor = "#e11d48";
  } else if (["mp3", "wav", "ogg", "m4a"].includes(e)) {
    startColor = "#06b6d4";
    endColor = "#0891b2";
  } else if (["js", "ts", "json", "html", "css"].includes(e)) {
    startColor = "#64748b";
    endColor = "#475569";
  }
  
  let innerIcon = null;
  if (e === "pdf") {
    innerIcon = (
      <path d="M22 22H38V24.5H22V22ZM22 27H38V29.5H22V27ZM22 32H32V34.5H22V32Z" fill="rgba(255,255,255,0.75)" />
    );
  } else if (["doc", "docx"].includes(e)) {
    innerIcon = (
      <path d="M21 21L25 35H29L31 27L33 35H37L41 21H37L34 31L32 21H30L28 31L25 21H21Z" fill="rgba(255,255,255,0.75)" />
    );
  } else if (["xls", "xlsx", "csv"].includes(e)) {
    innerIcon = (
      <path d="M21 21H39V23H21V21ZM21 25H39V27H21V25ZM21 29H39V31H21V29ZM21 33H39V35H21V33ZM30 21V35H32V21H30Z" fill="rgba(255,255,255,0.7)" />
    );
  } else if (["ppt", "pptx"].includes(e)) {
    innerIcon = (
      <path d="M21 21H39V31H21V21ZM19 19H41V21H19V19ZM25 35L30 31L35 35H25Z" fill="rgba(255,255,255,0.75)" />
    );
  } else if (["zip", "rar", "tar", "gz"].includes(e)) {
    innerIcon = (
      <path d="M28 19H32V21H30V23H32V25H30V27H32V29H30V31H32V35H28V19Z" fill="rgba(255,255,255,0.75)" />
    );
  } else if (["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(e)) {
    innerIcon = (
      <path d="M21 21H39V33H21V21ZM23 31L28 26L32 30L36 24L37 31H23Z" fill="rgba(255,255,255,0.75)" />
    );
  } else if (["mp4", "webm", "mov", "avi"].includes(e)) {
    innerIcon = (
      <path d="M26 22L36 27L26 32V22Z" fill="rgba(255,255,255,0.85)" />
    );
  } else if (["mp3", "wav", "ogg", "m4a"].includes(e)) {
    innerIcon = (
      <path d="M33 19V29C32.2 28.2 30.5 28.2 29.5 29C27.8 30 27.8 31.8 28.8 32.8C29.8 33.8 31.8 33.8 32.8 32.8C34.5 31.8 34.5 30 34.5 28V22H38V19H33Z" fill="rgba(255,255,255,0.75)" />
    );
  } else if (["js", "ts", "json", "html", "css"].includes(e)) {
    innerIcon = (
      <path d="M24 24L19 28L24 32L25.5 30.5L22 28L25.5 25.5L24 24ZM32 24L30.5 25.5L34 28L30.5 30.5L32 32L37 28L32 24Z" fill="rgba(255,255,255,0.75)" />
    );
  } else {
    innerIcon = (
      <path d="M22 22H38V24H22V22ZM22 27H38V29H22V27ZM22 32H34V34H22V32Z" fill="rgba(255,255,255,0.55)" />
    );
  }

  return (
    <svg width={size} height={size * 1.1} viewBox="0 0 48 52" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.08))", flexShrink: 0 }}>
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={startColor} />
          <stop offset="100%" stopColor={endColor} />
        </linearGradient>
      </defs>
      <path d="M6 4C6 1.79086 7.79086 0 10 0H34L44 10V48C44 50.2091 42.2091 52 40 52H10C7.79086 52 6 50.2091 6 48V4Z" fill={`url(#${gradientId})`} />
      <path d="M34 0L44 10H37C35.3431 10 34 8.65685 34 7V0Z" fill="rgba(255, 255, 255, 0.35)" />
      {innerIcon}
      <g style={{ transform: "translate(10px, 39px)" }}>
        <rect x="0" y="0" width="28" height="9" rx="2.5" fill="rgba(255, 255, 255, 0.22)" />
        <text x="14" y="7" fill="#ffffff" fontSize="7" fontWeight="bold" textAnchor="middle" letterSpacing="0.05em" fontFamily="Inter, system-ui, sans-serif">
          {label}
        </text>
      </g>
    </svg>
  );
}

// ─── Sidebar Tree Item ────────────────────────────────────────────────────────
function SidebarItem({ folder, allFolders, currentFolder, onNavigate, canOpen, depth = 0, showInfo = false }: {
  folder: Folder; allFolders: Folder[]; currentFolder: Folder | null;
  onNavigate: (f: Folder) => void; canOpen: (f: Folder) => boolean; depth?: number; showInfo?: boolean;
}) {
  const [exp, setExp] = useState(false);
  const children = allFolders.filter(f => f.parentId === folder.id);
  const isActive = currentFolder?.id === folder.id;
  const locked = !canOpen(folder);

  return (
    <div>
      <div onClick={() => { if (!locked) onNavigate(folder); }}
        className={!locked && !isActive ? "sidebar-item" : ""}
        style={{ display:"flex", alignItems:"center", gap:6, padding:`7px ${10+depth*14}px 7px 8px`, borderRadius:8, cursor:locked?"not-allowed":"pointer", background:isActive?"var(--primary)":"transparent", color:isActive?"white":"var(--foreground)", opacity:locked?0.5:1, margin:"1px 6px", userSelect:"none", transition:"background 0.12s" }}>
        <span onClick={e=>{e.stopPropagation();if(children.length)setExp(p=>!p);}} style={{width:14,flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center"}}>
          {children.length>0 && <i className={`bi bi-chevron-${exp?"down":"right"}`} style={{fontSize:9,color:isActive?"rgba(255,255,255,0.6)":"var(--muted-foreground)"}} />}
        </span>
        <FolderSvg isPublic={folder.isPublic} locked={locked} size={16} />
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <span style={{fontSize:12.5,fontWeight:isActive?700:500,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{folder.name}</span>
          {showInfo && (folder.ownerDeptName || folder.ownerPositionName) && (
            <span style={{fontSize:10,color:isActive?"rgba(255,255,255,0.7)":"var(--muted-foreground)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",marginTop:1}}>
              {[folder.ownerPositionName, folder.ownerDeptName].filter(Boolean).join(" · ")}
            </span>
          )}
        </div>
        {!folder.ownerIsActive && <span style={{fontSize:8,background:"#ef4444",color:"#fff",padding:"1px 4px",borderRadius:99,fontWeight:700}}>NGHỈ</span>}
        <span style={{fontSize:10,color:isActive?"rgba(255,255,255,0.55)":"var(--muted-foreground)"}}>{folder._count?.assets??0}</span>
      </div>
      {exp && children.map(c=>(
        <SidebarItem key={c.id} folder={c} allFolders={allFolders} currentFolder={currentFolder} onNavigate={onNavigate} canOpen={canOpen} depth={depth+1} showInfo={showInfo} />
      ))}
    </div>
  );
}

// ─── PDF Scroll Preview Component ─────────────────────────────────────────────
function PdfScrollPreview({ fileUrl }: { fileUrl: string }) {
  const [pages, setPages] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const scriptId = "pdfjs-cdn-script";
    let checkLoaded: any = null;

    const loadPdf = async () => {
      try {
        const pdfjs = (window as any).pdfjsLib;
        if (!pdfjs) {
          throw new Error("PDF.js library not loaded");
        }
        
        pdfjs.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js";
        
        const loadingTask = pdfjs.getDocument(fileUrl);
        const pdf = await loadingTask.promise;
        
        if (!active) return;
        
        const numPages = pdf.numPages;
        const pageArr = Array.from({ length: numPages }, (_, i) => i + 1);
        setPages(pageArr);
        setLoading(false);
        
        // Render each page sequentially onto its canvas
        for (let pageNum of pageArr) {
          if (!active) break;
          const page = await pdf.getPage(pageNum);
          const canvas = document.createElement("canvas");
          canvas.style.width = "100%";
          canvas.style.maxWidth = "800px";
          canvas.style.height = "auto";
          canvas.style.marginBottom = "16px";
          canvas.style.borderRadius = "8px";
          canvas.style.boxShadow = "0 4px 12px rgba(0,0,0,0.15)";
          canvas.style.background = "#fff";
          
          const context = canvas.getContext("2d");
          if (!context) continue;
          
          const viewport = page.getViewport({ scale: 1.5 });
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          
          const container = document.getElementById(`pdf-page-container-${pageNum}`);
          if (container) {
            container.innerHTML = "";
            container.appendChild(canvas);
          }
          
          await page.render({
            canvasContext: context,
            viewport: viewport
          }).promise;
        }
      } catch (err: any) {
        console.error("PDF preview error:", err);
        if (active) {
          setError(err.message || "Không thể tải tài liệu PDF");
          setLoading(false);
        }
      }
    };

    const init = () => {
      if ((window as any).pdfjsLib) {
        loadPdf();
      } else {
        let script = document.getElementById(scriptId) as HTMLScriptElement;
        if (!script) {
          script = document.createElement("script");
          script.id = scriptId;
          script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.min.js";
          document.head.appendChild(script);
        }
        
        checkLoaded = setInterval(() => {
          if ((window as any).pdfjsLib) {
            clearInterval(checkLoaded);
            loadPdf();
          }
        }, 100);
        
        setTimeout(() => {
          if (checkLoaded) clearInterval(checkLoaded);
          if (active && !(window as any).pdfjsLib) {
            setError("Không thể tải thư viện xem PDF");
            setLoading(false);
          }
        }, 12000);
      }
    };

    init();
    
    return () => {
      active = false;
      if (checkLoaded) clearInterval(checkLoaded);
    };
  }, [fileUrl]);

  if (error) {
    return (
      <iframe src={fileUrl} style={{width:"100%",height:"100%",border:"none",borderRadius:8,background:"#fff",boxShadow:"0 12px 36px rgba(0,0,0,0.5)"}} title="PDF Preview Fallback" />
    );
  }

  return (
    <div style={{ width: "100%", height: "100%", overflowY: "auto", display: "flex", flexDirection: "column", alignItems: "center", padding: "16px", WebkitOverflowScrolling: "touch" }}>
      {loading && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", minHeight: 300 }}>
          <i className="bi bi-arrow-repeat" style={{ fontSize: 32, animation: "spin 1s linear infinite", color: "var(--primary)" }} />
          <span style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", marginTop: 12 }}>Đang tải tài liệu PDF...</span>
        </div>
      )}
      {pages.map(pageNum => (
        <div key={pageNum} id={`pdf-page-container-${pageNum}`} style={{ width: "100%", maxWidth: "800px", display: "flex", justifyContent: "center", pointerEvents: "auto" }} onClick={e => e.stopPropagation()}>
          <div style={{ width: "100%", height: 600, background: "#fff", borderRadius: 8, marginBottom: 16, display: "flex", alignItems: "center", justifyContent: "center", color: "#333", boxShadow: "0 4px 12px rgba(0,0,0,0.15)", fontSize: 13, fontWeight: 500 }}>
            Đang tải trang {pageNum}...
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function MediaLibrary({ mode="full", onSelect, filterType="" }: MediaLibraryProps) {
  const { data: session } = useSession();
  const [folders, setFolders] = useState<Folder[]>([]);
  const [folderPath, setFolderPath] = useState<Folder[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState(filterType);
  const [channelFilter, setChannelFilter] = useState("");
  const [viewMode, setViewMode] = useState<"grid"|"list">("grid");
  const [loading, setLoading] = useState(false);
  const [folderLoading, setFolderLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [isPhone, setIsPhone] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 1024);
      setIsPhone(window.innerWidth < 768);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);
  const [preview, setPreview] = useState<Asset|null>(null);
  const [uploadModal, setUploadModal] = useState(false);
  const [newFolderModal, setNewFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [newFolderIsPublic, setNewFolderIsPublic] = useState(false);
  const [uploadData, setUploadData] = useState({name:"",description:"",type:"catalogue",channel:"all"});
  const [uploadFile, setUploadFile] = useState<File|null>(null);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [uploadIsPublic, setUploadIsPublic] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const initCalledRef = useRef(false);
  // ── Confirm dialogs ──────────────────────────────────────────────────────────
  const [confirmDeleteAsset, setConfirmDeleteAsset] = useState(false);
  const [pendingDeleteAssetId, setPendingDeleteAssetId] = useState<string|null>(null);
  const [deletingAsset, setDeletingAsset] = useState(false);
  const [confirmDeleteFolder, setConfirmDeleteFolder] = useState(false);
  const [pendingDeleteFolder, setPendingDeleteFolder] = useState<Folder|null>(null);
  const [deletingFolder, setDeletingFolder] = useState(false);

  const currentFolder = folderPath[folderPath.length-1]??null;

  const u = session?.user as any;
  const userId = u?.id;
  const isAdmin = u?.role==="SUPERADMIN"||u?.role==="ADMIN";
  const MKT = ["marketing","MKT","mkt"];
  const MGR = ["manager","mid_manager","senior_manager"];
  const isMktManager = MKT.includes(u?.departmentCode) && MGR.includes(u?.level);
  const isMkt = MKT.includes(u?.departmentCode);

  const isManager = isAdmin || 
    ["manager", "mid_manager", "senior_manager"].includes(u?.level) ||
    u?.positionName?.toLowerCase().includes("trưởng phòng");

  // Listen for Escape key to close preview modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPreview(null);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  function canOpen(f: Folder) {
    if (isAdmin) return true;
    if (!f.ownerIsActive) return (isMktManager || isAdmin);
    // Vô hiệu hóa/khoá các thư mục cá nhân của người khác nếu họ không có tài liệu nào hiển thị cho bạn
    const hasAssets = (f._count?.assets ?? 0) > 0;
    const isOwner = f.ownerId === userId;
    if (!f.isPublic && !isOwner && !hasAssets) {
      return false;
    }
    return true; // Tất cả các thư mục hoạt động khác đều xem được
  }
  function canUploadTo(f: Folder|null) {
    if (!f) return false;
    const rootFolder = folderPath[0];
    if (rootFolder && !rootFolder.isPublic && rootFolder.ownerId !== userId) {
      return false;
    }
    if (isAdmin) return true;
    if (f.isPublic && isManager) return true;
    if (!f.isPublic && f.ownerId===userId) return true;
    return false;
  }
  function canDeleteAsset(a: Asset) {
    if (isAdmin) return true;
    if (currentFolder?.isPublic) {
      if (isManager) {
        const uploaderDept = (a as any).uploaderDeptCode;
        const currentUserDept = u?.departmentCode;
        return !!(uploaderDept && currentUserDept && uploaderDept.toLowerCase() === currentUserDept.toLowerCase());
      }
      return false;
    }
    if (currentFolder?.ownerId===userId) return true;
    return false;
  }
  function canEditAsset(a: Asset) {
    if (isAdmin) return true;
    if (a.uploadedBy === userId) return true;
    if (currentFolder?.ownerId === userId) return true;
    return false;
  }
  function canCreateSubfolder() {
    if (!currentFolder) return false;
    const rootFolder = folderPath[0];
    if (rootFolder && !rootFolder.isPublic && rootFolder.ownerId !== userId) {
      return false;
    }
    if (isAdmin) return true;
    if (currentFolder.isPublic && isManager) return true;
    return currentFolder.ownerId===userId;
  }
  function canDeleteFolder(f: Folder) {
    if (f.isPublic && f.parentId === null) return false; // không xóa thư mục chung gốc
    if (isAdmin) return true;
    if (f.isPublic) {
      if (isManager) {
        const ownerDept = (f as any).ownerDeptCode;
        const currentUserDept = u?.departmentCode;
        return !!(ownerDept && currentUserDept && ownerDept.toLowerCase() === currentUserDept.toLowerCase());
      }
      return false;
    }
    return f.ownerId===userId;
  }

  // ── Grouping ─────────────────────────────────────────────────────────────────
  const rootFolders = folders.filter(f=>f.parentId===null);
  const publicFolders = rootFolders.filter(f=>f.isPublic);
  const myFolders = rootFolders.filter(f=>!f.isPublic&&f.ownerId===userId&&f.ownerIsActive);
  const colleagueFolders = rootFolders
    .filter(f=>!f.isPublic&&f.ownerId!==userId&&f.ownerIsActive)
    .sort((a, b) => {
      const aCount = a._count?.assets || 0;
      const bCount = b._count?.assets || 0;
      if (aCount !== bCount) return bCount - aCount;
      return (a.name || "").localeCompare(b.name || "", "vi");
    });
  const inactiveFolders = rootFolders
    .filter(f=>!f.isPublic&&!f.ownerIsActive)
    .sort((a, b) => {
      const aCount = a._count?.assets || 0;
      const bCount = b._count?.assets || 0;
      if (aCount !== bCount) return bCount - aCount;
      return (a.name || "").localeCompare(b.name || "", "vi");
    });
  const childFolders = folders.filter(f=>f.parentId===currentFolder?.id);

  // ── Navigation ───────────────────────────────────────────────────────────────
  function navigateTo(folder: Folder) {
    if (!canOpen(folder)) return;
    setFolderPath(prev => {
      const idx = prev.findIndex(f=>f.id===folder.id);
      if (idx>=0) return prev.slice(0,idx+1);
      if (folder.parentId===null) return [folder];
      return [...prev, folder];
    });
    if (isMobile) {
      setShowSidebar(false);
    }
  }
  function navigateUp() { setFolderPath(prev=>prev.slice(0,-1)); }
  function navigateToBreadcrumb(idx: number) { setFolderPath(prev=>prev.slice(0,idx+1)); }

  // ── Data loading ─────────────────────────────────────────────────────────────
  useEffect(() => { if (session) loadFolders(); }, [session]); // eslint-disable-line

  async function loadFolders(skipInit=false) {
    setFolderLoading(true);
    try {
      const r = await fetch("/api/media-library/folders");
      if (!r.ok) return;
      const d = await r.json();
      const data: Folder[] = d.data||[];
      setFolders(data);
      if (folderPath.length===0) {
        const pub = data.find(f=>f.isPublic&&f.parentId===null);
        if (pub) setFolderPath([pub]);
      } else {
        const refreshed = data.find(f=>f.id===currentFolder?.id);
        if (refreshed) setFolderPath(prev=>[...prev.slice(0,-1),refreshed]);
      }
      const uu = session?.user as any;
      if (!skipInit && !initCalledRef.current && uu?.id && uu?.name) {
        const hasOwn = data.some(f=>f.ownerId===uu.id&&f.parentId===null);
        if (!hasOwn) {
          initCalledRef.current = true;
          await fetch("/api/media-library/init-folder",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"create",userId:uu.id,userName:uu.name,departmentCode:uu.departmentCode||"ALL"})}).catch(()=>{});
          await loadFolders(true);
        } else { initCalledRef.current=true; }
      }
    } finally { setFolderLoading(false); }
  }

  const loadAssets = useCallback(async (folderId: string) => {
    setLoading(true);
    const p = new URLSearchParams({folderId});
    if (search) p.set("search",search);
    if (typeFilter) p.set("type",typeFilter);
    if (channelFilter) p.set("channel",channelFilter);
    const r = await fetch(`/api/media-library/assets?${p}`);
    const d = await r.json().catch(()=>({}));
    setAssets(d.data||[]);
    setLoading(false);
  }, [search,typeFilter,channelFilter]);

  useEffect(() => {
    if (currentFolder&&canOpen(currentFolder)) loadAssets(currentFolder.id);
    else setAssets([]);
  }, [currentFolder,search,typeFilter,channelFilter]); // eslint-disable-line

  // ── Actions ──────────────────────────────────────────────────────────────────
  async function handleUpload() {
    if (!uploadFile||!currentFolder) return;
    setUploading(true);
    const fd = new FormData();
    fd.append("file",uploadFile); fd.append("folderId",currentFolder.id);
    fd.append("name",uploadData.name||uploadFile.name); fd.append("description",uploadData.description);
    fd.append("type",uploadData.type); fd.append("channel",uploadData.channel);
    fd.append("isPublic", uploadIsPublic ? "true" : "false");
    const res = await fetch("/api/media-library/assets",{method:"POST",body:fd});
    const result = await res.json().catch(()=>({}));
    if (res.ok) {
      loadAssets(currentFolder.id); loadFolders(true);
      setUploadModal(false); setUploadFile(null);
      setUploadData({name:"",description:"",type:"catalogue",channel:"all"});
      setUploadIsPublic(true);
    } else alert(`Upload thất bại: ${result?.error||res.status}`);
    setUploading(false);
  }
  async function handleDownload(asset: Asset) {
    await fetch(`/api/media-library/assets/${asset.id}`,{method:"POST"}).catch(()=>{});
    const a = document.createElement("a"); a.href=asset.fileUrl; a.download=asset.name; a.click();
  }
  function handleDelete(assetId: string) {
    setPendingDeleteAssetId(assetId);
    setConfirmDeleteAsset(true);
  }
  async function doDeleteAsset() {
    if (!pendingDeleteAssetId) return;
    setDeletingAsset(true);
    try {
      await fetch(`/api/media-library/assets/${pendingDeleteAssetId}`,{method:"DELETE"});
      if (currentFolder) loadAssets(currentFolder.id);
      if (preview?.id===pendingDeleteAssetId) setPreview(null);
    } finally {
      setDeletingAsset(false);
      setConfirmDeleteAsset(false);
      setPendingDeleteAssetId(null);
    }
  }
  async function toggleAssetVisibility(asset: Asset) {
    const newIsPublic = !asset.isPublic;
    try {
      const res = await fetch(`/api/media-library/assets/${asset.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPublic: newIsPublic })
      });
      if (res.ok) {
        setAssets(prev => prev.map(a => a.id === asset.id ? { ...a, isPublic: newIsPublic } : a));
        setPreview(prev => prev && prev.id === asset.id ? { ...prev, isPublic: newIsPublic } : prev);
        loadFolders(true);
      } else {
        const d = await res.json().catch(()=>({}));
        alert(`Cập nhật thất bại: ${d?.error||res.status}`);
      }
    } catch (err: any) {
      alert(`Lỗi kết nối: ${err?.message}`);
    }
  }
  async function handleCreateSubfolder() {
    if (!newFolderName.trim()||!currentFolder||creatingFolder) return;
    setCreatingFolder(true);
    try {
      const res = await fetch("/api/media-library/folders",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({
          name:newFolderName.trim(),
          parentId:currentFolder.id,
          isPublic: newFolderIsPublic
        })
      });
      if (!res.ok) { const d = await res.json().catch(()=>({})); alert(`Lỗi: ${d?.error||res.status}`); return; }
      await loadFolders(true);
      setNewFolderModal(false);
      setNewFolderName("");
      setNewFolderIsPublic(false);
    } finally { setCreatingFolder(false); }
  }
  function handleDeleteFolder(folder: Folder) {
    if (!canDeleteFolder(folder)) return;
    setPendingDeleteFolder(folder);
    setConfirmDeleteFolder(true);
  }
  async function doDeleteFolder() {
    if (!pendingDeleteFolder) return;
    setDeletingFolder(true);
    try {
      const res = await fetch(`/api/media-library/folders/${pendingDeleteFolder.id}`,{method:"DELETE"});
      if (!res.ok) { const d = await res.json().catch(()=>({})); alert(`Lỗi xóa: ${d?.error||res.status}`); return; }
      if (currentFolder?.id===pendingDeleteFolder.id) navigateUp();
      await loadFolders(true);
    } finally {
      setDeletingFolder(false);
      setConfirmDeleteFolder(false);
      setPendingDeleteFolder(null);
    }
  }

  function handleDrag(e: React.DragEvent) { e.preventDefault(); setDragActive(e.type!=="dragleave"); }
  function handleDrop(e: React.DragEvent) {
    e.preventDefault(); setDragActive(false);
    if (e.dataTransfer.files[0]) { setUploadFile(e.dataTransfer.files[0]); setUploadModal(true); }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // ICON VIEW ITEMS
  // ─────────────────────────────────────────────────────────────────────────────
  function FolderIcon({ folder }: { folder: Folder }) {
    const locked = !canOpen(folder);
    const canDel = canDeleteFolder(folder);
    return (
      <div className="finder-icon folder-icon-wrap"
        style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"space-between",padding:"14px 8px 10px",borderRadius:12,cursor:locked?"not-allowed":"pointer",width:105,height:120,opacity:locked?0.45:1,userSelect:"none",position:"relative",background:"var(--card)",border:"1px solid var(--border)",boxShadow:"0 1px 3px rgba(0,0,0,0.03)"}}
        title={locked?`Thư mục cá nhân — ${folder.ownerName}`:folder.name}>
        <div onClick={()=>!locked&&navigateTo(folder)} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:8,width:"100%",height:"100%",justifyContent:"space-between"}}>
          <div style={{position:"relative",height:52,display:"flex",alignItems:"center",justifyContent:"center"}}>
            <FolderSvg isPublic={folder.isPublic} locked={locked} size={48} />
            <span style={{position:"absolute",top:-3,right:-8,fontSize:8,background:"var(--primary)",color:"#fff",padding:"1px 4.5px",borderRadius:99,fontWeight:800,boxShadow:"0 2px 4px rgba(99,102,241,0.2)"}}>
              {folder._count?.assets??0}
            </span>
          </div>
          <span style={{fontSize:11,fontWeight:600,color:"var(--foreground)",textAlign:"center",lineHeight:1.3,wordBreak:"break-word",maxWidth:"95%",display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical",overflow:"hidden"}}>
            {folder.name}
          </span>
        </div>
        {canDel && (
          <button onClick={e=>{e.stopPropagation();handleDeleteFolder(folder);}} className="folder-del-btn"
            style={{position:"absolute",top:4,right:4,background:"rgba(239,68,68,0.1)",border:"1px solid rgba(239,68,68,0.25)",borderRadius:4,width:18,height:18,display:"none",alignItems:"center",justifyContent:"center",cursor:"pointer",padding:0}}
            title="Xóa thư mục">
            <i className="bi bi-trash3" style={{fontSize:8,color:"#ef4444"}} />
          </button>
        )}
      </div>
    );
  }

  function FileIcon({ asset }: { asset: Asset }) {
    const hasThumb = asset.thumbnail||isImage(asset.fileType);
    
    return (
      <div onClick={()=>setPreview(asset)} className="finder-icon"
        style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"space-between",padding:"14px 8px 10px",borderRadius:12,cursor:"pointer",width:105,height:120,userSelect:"none",background:"var(--card)",border:"1px solid var(--border)",boxShadow:"0 1px 3px rgba(0,0,0,0.03)",position:"relative"}}>
        <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:8,width:"100%",height:"100%",justifyContent:"space-between"}}>
          <div style={{position:"relative",height:52,display:"flex",alignItems:"center",justifyContent:"center"}}>
            {hasThumb ? (
              <div style={{width:72,height:48,borderRadius:6,overflow:"hidden",border:"1px solid var(--border)",boxShadow:"0 1px 3px rgba(0,0,0,0.05)",position:"relative",display:"flex",alignItems:"center",justifyContent:"center",background:"var(--muted)"}}>
                <img src={asset.thumbnail||asset.fileUrl} alt={asset.name} style={{width:"100%",height:"100%",objectFit:"cover"}} />
                {isVideo(asset.fileType) && (
                  <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(0,0,0,0.15)"}}>
                    <div style={{width:16,height:16,borderRadius:"50%",background:"rgba(255,255,255,0.9)",display:"flex",alignItems:"center",justifyContent:"center"}}>
                      <i className="bi bi-play-fill" style={{color:"#000",fontSize:8,marginLeft:0.5}} />
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <FileSvg ext={asset.fileType} size={42} />
            )}
            
            {asset.isPublic === false && (
              <div style={{position:"absolute",top:-6,left:-8,background:"rgba(239,68,68,0.1)",border:"1px solid rgba(239,68,68,0.25)",color:"#ef4444",borderRadius:99,width:16,height:16,display:"flex",alignItems:"center",justifyContent:"center",zIndex:2,boxShadow:"0 2px 4px rgba(0,0,0,0.05)"}} title="Tài liệu riêng tư">
                <i className="bi bi-lock-fill" style={{fontSize:9}} />
              </div>
            )}
            {mode === "picker" && onSelect && (
              <div onClick={(e) => { e.stopPropagation(); onSelect(asset); }} style={{position:"absolute",top:-6,right:-8,background:"#10b981",color:"#fff",borderRadius:99,width:20,height:20,display:"flex",alignItems:"center",justifyContent:"center",zIndex:5,boxShadow:"0 2px 4px rgba(0,0,0,0.15)",cursor:"pointer"}} title="Chọn tài liệu này">
                <i className="bi bi-check" style={{fontSize:14,fontWeight:"bold"}} />
              </div>
            )}
          </div>
          
          <span style={{fontSize:11.5,fontWeight:600,color:"var(--foreground)",textAlign:"center",lineHeight:1.3,wordBreak:"break-word",maxWidth:"90%",display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical",overflow:"hidden"}}>
            {asset.name}
          </span>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // LIST VIEW
  // ─────────────────────────────────────────────────────────────────────────────
  const COL = isMobile ? "20px 1fr 60px" : "20px 1fr 150px 85px 110px 108px";

  function ListHeader() {
    return (
      <div style={{display:"grid",gridTemplateColumns:COL,alignItems:"center",padding:"8px 14px",borderBottom:"1px solid var(--border)",background:"var(--muted)"}}>
        {isMobile ? (
          <>
            <span style={{fontSize:10.5,fontWeight:700,color:"var(--muted-foreground)",textTransform:"uppercase",letterSpacing:"0.05em"}}></span>
            <span style={{fontSize:10.5,fontWeight:700,color:"var(--muted-foreground)",textTransform:"uppercase",letterSpacing:"0.05em"}}>Tên</span>
            <span style={{fontSize:10.5,fontWeight:700,color:"var(--muted-foreground)",textTransform:"uppercase",letterSpacing:"0.05em",textAlign:"right"}}></span>
          </>
        ) : (
          ["","Tên","Ngày sửa đổi","Kích cỡ","Loại",""].map((h,i)=>(
            <span key={i} style={{fontSize:10.5,fontWeight:700,color:"var(--muted-foreground)",textTransform:"uppercase",letterSpacing:"0.05em"}}>{h}</span>
          ))
        )}
      </div>
    );
  }

  function FolderRow({ folder }: { folder: Folder }) {
    const locked = !canOpen(folder);
    const canDel = canDeleteFolder(folder);
    return (
      <div className="list-row"
        style={{display:"grid",gridTemplateColumns:COL,alignItems:"center",padding:"7px 14px",borderBottom:"1px solid var(--border)",cursor:locked?"not-allowed":"pointer",opacity:locked?0.5:1}}>
        <div onClick={()=>!locked&&navigateTo(folder)} style={{display:"flex",alignItems:"center",justifyContent:"flex-start",width:20,height:20}}>
          <FolderSvg isPublic={folder.isPublic} locked={locked} size={16} />
        </div>
        <span onClick={()=>!locked&&navigateTo(folder)} style={{fontSize:13,fontWeight:500,color:"var(--foreground)",display:"flex",alignItems:"center",gap:6,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
          {folder.name}{locked&&<i className="bi bi-lock-fill" style={{fontSize:10,color:"#9ca3af",flexShrink:0}} />}
        </span>
        {!isMobile && (
          <>
            <span onClick={()=>!locked&&navigateTo(folder)} style={{fontSize:12,color:"var(--muted-foreground)"}}>{fmtDate(folder.createdAt)}</span>
            <span onClick={()=>!locked&&navigateTo(folder)} style={{fontSize:12,color:"var(--muted-foreground)"}}>--</span>
            <span onClick={()=>!locked&&navigateTo(folder)} style={{fontSize:12,color:"var(--muted-foreground)"}}>Thư mục</span>
          </>
        )}
        <div style={{display:"flex",gap:3,justifyContent:"flex-end"}}>
          {canDel && (
            <button onClick={e=>{e.stopPropagation();handleDeleteFolder(folder);}}
              style={{background:"rgba(239,68,68,0.08)",border:"1px solid rgba(239,68,68,0.18)",borderRadius:5,padding:"3px 7px",fontSize:11,cursor:"pointer",color:"#ef4444"}}
              title="Xóa thư mục">
              <i className="bi bi-trash" />
            </button>
          )}
        </div>
      </div>
    );
  }

  function AssetRow({ asset }: { asset: Asset }) {
    return (
      <div className="list-row" style={{display:"grid",gridTemplateColumns:COL,alignItems:"center",padding:"7px 14px",borderBottom:"1px solid var(--border)"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"flex-start",width:20,height:20}}>
          {isImage(asset.fileType) && asset.thumbnail ? (
            <img src={asset.thumbnail||asset.fileUrl} alt={asset.name} style={{width:16,height:16,objectFit:"cover",borderRadius:3}} />
          ) : (
            <FileSvg ext={asset.fileType} size={16} />
          )}
        </div>
        <span style={{fontSize:13,fontWeight:500,color:"var(--foreground)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",paddingRight:12,display:"flex",alignItems:"center",gap:6}}>
          {asset.name}
          {asset.isPublic === false && <span style={{fontSize:9,background:"rgba(239,68,68,0.1)",color:"#ef4444",padding:"1px 4px",borderRadius:4,fontWeight:600}}><i className="bi bi-lock-fill" style={{fontSize:8,marginRight:2}} />Riêng tư</span>}
        </span>
        {!isMobile && (
          <>
            <span style={{fontSize:12,color:"var(--muted-foreground)"}}>{fmtDate(asset.createdAt)}</span>
            <span style={{fontSize:12,color:"var(--muted-foreground)"}}>{fmtBytes(asset.fileSize)}</span>
            <span style={{fontSize:12,color:"var(--muted-foreground)"}}>{FILE_TYPES.find(t=>t.value===asset.type)?.label||asset.fileType}</span>
          </>
        )}
        <div style={{display:"flex",gap:3,justifyContent:"flex-end"}}>
          <button onClick={()=>setPreview(asset)} style={{background:"var(--muted)",border:"none",borderRadius:5,padding:"3px 7px",fontSize:11,cursor:"pointer",color:"var(--foreground)"}}>
            <i className="bi bi-eye" />
          </button>
          {mode === "picker" && onSelect && (
            <button onClick={() => onSelect(asset)} style={{background:"rgba(16,185,129,0.15)",border:"1px solid rgba(16,185,129,0.3)",borderRadius:5,padding:"3px 7px",fontSize:11,cursor:"pointer",color:"#10b981"}} title="Chọn tài liệu này">
              <i className="bi bi-check-lg" />
            </button>
          )}
          {!isMobile && (
            <button onClick={()=>handleDownload(asset)} style={{background:"var(--primary)",color:"#fff",border:"none",borderRadius:5,padding:"3px 7px",fontSize:11,cursor:"pointer"}}>
              <i className="bi bi-download" />
            </button>
          )}
          {canDeleteAsset(asset) && (
            <button onClick={()=>handleDelete(asset.id)} style={{background:"rgba(239,68,68,0.08)",border:"1px solid rgba(239,68,68,0.18)",borderRadius:5,padding:"3px 7px",fontSize:11,cursor:"pointer",color:"#ef4444"}}>
              <i className="bi bi-trash" />
            </button>
          )}
        </div>
      </div>
    );
  }

  // ─── MAIN RENDER ─────────────────────────────────────────────────────────────
  return (
    <div style={{display:"flex",height:mode==="full"?"100%":"600px",background:"var(--background)",borderRadius:14,overflow:"hidden",border:"1px solid var(--border)",position:"relative"}}>

      {/* Mobile Sidebar backdrop */}
      {isMobile && showSidebar && (
        <div 
          onClick={() => setShowSidebar(false)}
          style={{
            position: "absolute", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 90
          }}
        />
      )}

      {/* ── Sidebar ──────────────────────────────────────────────────────── */}
      <div style={{
        width:240,borderRight:"1px solid var(--border)",display:"flex",flexDirection:"column",background:"var(--card)",flexShrink:0,
        position: isMobile ? "absolute" : "relative",
        top: 0, bottom: 0, left: 0, zIndex: isMobile ? 100 : 1,
        transform: isMobile ? (showSidebar ? "translateX(0)" : "translateX(-100%)") : "none",
        transition: "transform 0.3s ease",
        boxShadow: isMobile && showSidebar ? "4px 0 16px rgba(0,0,0,0.15)" : "none"
      }}>
        <div style={{padding:"12px 14px 8px",borderBottom:"1px solid var(--border)"}}>
          <span style={{fontSize:10.5,fontWeight:800,color:"var(--muted-foreground)",textTransform:"uppercase",letterSpacing:"0.06em"}}>
            <i className="bi bi-folder2" style={{marginRight:6,color:"var(--primary)"}} />Thư mục
          </span>
        </div>
        <div style={{flex:1,overflowY:"auto",padding:"6px 0"}}>
          {folderLoading ? (
            <div style={{padding:16,textAlign:"center",color:"var(--muted-foreground)",fontSize:12}}>
              <i className="bi bi-hourglass-split" /> Đang tải...
            </div>
          ) : (
            <>
              {publicFolders.length>0 && (
                <div style={{marginBottom:4}}>
                  <div style={{fontSize:9,fontWeight:800,color:"var(--muted-foreground)",padding:"4px 14px",textTransform:"uppercase",letterSpacing:"0.06em"}}>Tài liệu chung</div>
                  {publicFolders.map(f=><SidebarItem key={f.id} folder={f} allFolders={folders} currentFolder={currentFolder} onNavigate={navigateTo} canOpen={canOpen} />)}
                </div>
              )}
              {myFolders.length>0 && (
                <div style={{marginBottom:4}}>
                  <div style={{fontSize:9,fontWeight:800,color:"var(--muted-foreground)",padding:"4px 14px",textTransform:"uppercase",letterSpacing:"0.06em"}}>Của tôi</div>
                  {myFolders.map(f=><SidebarItem key={f.id} folder={f} allFolders={folders} currentFolder={currentFolder} onNavigate={navigateTo} canOpen={canOpen} />)}
                </div>
              )}
              {colleagueFolders.length>0 && (
                <div style={{marginBottom:4}}>
                  <div style={{fontSize:9,fontWeight:800,color:"var(--muted-foreground)",padding:"4px 14px",textTransform:"uppercase",letterSpacing:"0.06em"}}>Của người khác</div>
                  {colleagueFolders.map(f=><SidebarItem key={f.id} folder={f} allFolders={folders} currentFolder={currentFolder} onNavigate={navigateTo} canOpen={canOpen} showInfo />)}
                </div>
              )}
              {(isMktManager||isAdmin) && inactiveFolders.length>0 && (
                <div>
                  <div style={{fontSize:9,fontWeight:800,color:"#ef4444",padding:"4px 14px",textTransform:"uppercase",letterSpacing:"0.06em"}}>Đã nghỉ việc</div>
                  {inactiveFolders.map(f=><SidebarItem key={f.id} folder={f} allFolders={folders} currentFolder={currentFolder} onNavigate={navigateTo} canOpen={canOpen} showInfo />)}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── Main content ─────────────────────────────────────────────────── */}
      <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden",position:"relative"}}
        onDragEnter={handleDrag} onDragOver={handleDrag} onDragLeave={()=>setDragActive(false)} onDrop={handleDrop}>

        {dragActive && canUploadTo(currentFolder) && (
          <div style={{position:"absolute",inset:0,background:"rgba(99,102,241,0.07)",border:"2px dashed var(--primary)",borderRadius:14,zIndex:50,display:"flex",alignItems:"center",justifyContent:"center",pointerEvents:"none"}}>
            <div style={{textAlign:"center"}}>
              <i className="bi bi-cloud-upload" style={{fontSize:40,color:"var(--primary)"}} />
              <div style={{fontSize:15,fontWeight:700,color:"var(--primary)",marginTop:8}}>Thả file để upload</div>
            </div>
          </div>
        )}

        {/* Toolbar */}
        <div style={{
          padding:"9px 14px",
          borderBottom:"1px solid var(--border)",
          display:"flex",
          flexDirection: isMobile ? "column" : "row",
          alignItems: isMobile ? "stretch" : "center",
          gap: 10,
          background:"var(--background)",
          flexShrink:0
        }}>
          {/* Row 1: Left toggle, Back, Breadcrumb, and view mode (if mobile) */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, width: "100%" }}>
            {isMobile && (
              <button onClick={() => setShowSidebar(prev => !prev)}
                style={{height:30,width:30,borderRadius:7,border:"1px solid var(--border)",background:showSidebar ? "var(--primary)" : "var(--muted)",cursor:"pointer",color:showSidebar ? "#fff" : "var(--foreground)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                <i className="bi bi-folder2" style={{fontSize:14}} />
              </button>
            )}
            {/* Back */}
            <button onClick={navigateUp} disabled={folderPath.length<=1}
              style={{height:30,width:30,borderRadius:7,border:"1px solid var(--border)",background:"var(--muted)",cursor:folderPath.length>1?"pointer":"not-allowed",color:folderPath.length>1?"var(--foreground)":"var(--muted-foreground)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
              <i className="bi bi-chevron-left" style={{fontSize:12}} />
            </button>
            {/* Breadcrumb */}
            <div style={{display:"flex",alignItems:"center",gap:3,flex:1,overflow:"hidden",minWidth:0}}>
              {folderPath.map((f,i)=>(
                <span key={f.id} style={{display:"flex",alignItems:"center",gap:3,flexShrink:i<folderPath.length-1?0:1,overflow:"hidden"}}>
                  {i>0 && <i className="bi bi-chevron-right" style={{fontSize:9,color:"var(--muted-foreground)",flexShrink:0}} />}
                  <button onClick={()=>navigateToBreadcrumb(i)}
                    style={{background:"none",border:"none",padding:"2px 5px",borderRadius:5,fontSize:12.5,fontWeight:i===folderPath.length-1?700:500,color:i===folderPath.length-1?"var(--foreground)":"var(--muted-foreground)",cursor:"pointer",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                    {f.name}
                  </button>
                </span>
              ))}
              {folderPath.length===0 && <span style={{fontSize:13,color:"var(--muted-foreground)"}}>Chọn thư mục</span>}
            </div>
            {/* View toggle (On mobile, we put it on Row 1 to save space) */}
            {isMobile && (
              <div style={{display:"flex",background:"var(--muted)",borderRadius:7,padding:2,flexShrink:0}}>
                {(["grid","list"] as const).map(v=>(
                  <button key={v} onClick={()=>setViewMode(v)}
                    style={{background:viewMode===v?"var(--background)":"transparent",border:"none",borderRadius:5,padding:"3px 7px",cursor:"pointer",color:viewMode===v?"var(--foreground)":"var(--muted-foreground)",fontSize:11.5,boxShadow:viewMode===v?"0 1px 3px rgba(0,0,0,0.1)":"none",transition:"all 0.1s"}}>
                    <i className={`bi bi-${v==="grid"?"grid-3x3-gap":"list-ul"}`} />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Row 2: Search, Filter, Actions */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", width: "100%" }}>
            {/* Search */}
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Tìm..."
              style={{ flex: isMobile ? 1 : "none", width: isMobile ? "auto" : 180, minWidth: 100, order: isPhone ? 4 : 1 }}
            />
            {/* Filter */}
            <select value={typeFilter} onChange={e=>setTypeFilter(e.target.value)}
              style={{height:30,borderRadius:7,border:"1px solid var(--border)",background:"var(--muted)",color:"var(--foreground)",fontSize:12,padding:"0 8px",flex: isPhone ? 1 : "none", order: 2}}>
              {FILE_TYPES.map(t=><option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
            
            {!isMobile && <div style={{width:1,height:18,background:"var(--border)", order: 2.5}} />}
            
            {/* View toggle (Desktop only) */}
            {!isMobile && (
              <div style={{display:"flex",background:"var(--muted)",borderRadius:7,padding:2,flexShrink:0}}>
                {(["grid","list"] as const).map(v=>(
                  <button key={v} onClick={()=>setViewMode(v)}
                    style={{background:viewMode===v?"var(--background)":"transparent",border:"none",borderRadius:5,padding:"3px 9px",cursor:"pointer",color:"var(--foreground)",fontSize:12.5,boxShadow:viewMode===v?"0 1px 3px rgba(0,0,0,0.1)":"none",transition:"all 0.1s"}}>
                    <i className={`bi bi-${v==="grid"?"grid-3x3-gap":"list-ul"}`} />
                  </button>
                ))}
              </div>
            )}
            
            {/* Actions */}
            {currentFolder && canCreateSubfolder() && (
              <button onClick={()=>setNewFolderModal(true)}
                style={{height:30,padding:"0 10px",background:"var(--muted)",border:"1px solid var(--border)",borderRadius:7,fontSize:12,fontWeight:600,cursor:"pointer",color:"var(--foreground)",display:"flex",alignItems:"center",gap:4,flex: isPhone ? 1 : "none", justifyContent: "center", order: 3}}>
                <i className="bi bi-folder-plus" /> <span style={{ whiteSpace: "nowrap" }}>Tạo thư mục</span>
              </button>
            )}
            {currentFolder && canUploadTo(currentFolder) && (
              <button onClick={()=>setUploadModal(true)}
                style={{height:30,padding:"0 12px",background:"var(--primary)",border:"none",borderRadius:7,fontSize:12,fontWeight:700,cursor:"pointer",color:"#fff",display:"flex",alignItems:"center",gap:4,boxShadow:"0 2px 8px rgba(99,102,241,0.25)",flex: isPhone ? 1 : "none", justifyContent: "center", order: isPhone ? 1 : 4}}>
                <i className="bi bi-cloud-upload" /> <span style={{ whiteSpace: "nowrap" }}>Upload</span>
              </button>
            )}
          </div>
        </div>

        {/* Content area */}
        <div style={{flex:1,overflowY:"auto",padding:viewMode==="list"?0:14}}>
          {!currentFolder ? (
            <div style={{textAlign:"center",padding:60,color:"var(--muted-foreground)"}}>
              <i className="bi bi-folder2" style={{fontSize:42,marginBottom:12}} /><p>Chọn thư mục để xem</p>
            </div>
          ) : !canOpen(currentFolder) ? (
            <div style={{textAlign:"center",padding:60}}>
              <i className="bi bi-lock" style={{fontSize:40,color:"var(--muted-foreground)",marginBottom:14}} />
              <h3 style={{color:"var(--foreground)",marginBottom:6}}>Thư mục được bảo vệ</h3>
              <p style={{color:"var(--muted-foreground)",fontSize:13}}>Đây là thư mục cá nhân của <strong>{currentFolder.ownerName}</strong>.<br />Chỉ chủ sở hữu mới có quyền truy cập.</p>
            </div>
          ) : viewMode==="grid" ? (
            /* ── GRID / ICON VIEW ── */
            <div style={{display:"flex",flexWrap:"wrap",gap:2,alignItems:"flex-start"}}>
              {childFolders.map(f=><FolderIcon key={f.id} folder={f} />)}
              {loading
                ? <div style={{width:"100%",textAlign:"center",padding:40,color:"var(--muted-foreground)"}}><i className="bi bi-arrow-repeat" style={{fontSize:22,animation:"spin 1s linear infinite"}} /></div>
                : assets.map(a=><FileIcon key={a.id} asset={a} />)
              }
              {!loading && assets.length===0 && childFolders.length===0 && (
                <div style={{width:"100%",textAlign:"center",padding:50}}>
                  <i className="bi bi-inbox" style={{fontSize:34,color:"var(--muted-foreground)"}} />
                  <p style={{color:"var(--muted-foreground)",fontSize:13,marginTop:10}}>
                    {canUploadTo(currentFolder)?'Kéo thả file hoặc nhấn "Upload"':"Thư mục trống"}
                  </p>
                </div>
              )}
            </div>
          ) : (
            /* ── LIST VIEW ── */
            <div style={{background:"var(--card)",borderRadius:0,overflow:"hidden"}}>
              <ListHeader />
              {childFolders.map(f=><FolderRow key={f.id} folder={f} />)}
              {loading ? (
                <div style={{textAlign:"center",padding:24,color:"var(--muted-foreground)",fontSize:13}}>
                  <i className="bi bi-arrow-repeat" style={{animation:"spin 1s linear infinite"}} /> Đang tải...
                </div>
              ) : assets.map(a=><AssetRow key={a.id} asset={a} />)}
              {!loading && assets.length===0 && childFolders.length===0 && (
                <div style={{textAlign:"center",padding:32,color:"var(--muted-foreground)",fontSize:13}}>
                  <i className="bi bi-inbox" style={{marginRight:8}} />
                  {canUploadTo(currentFolder)?'Kéo thả file hoặc nhấn "Upload"':"Thư mục trống"}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Preview Modal ─────────────────────────────────────────────────── */}
      {preview && (
        <div style={{position:"fixed",inset:0,background:"rgba(15, 23, 42, 0.96)",backdropFilter:"blur(12px)",zIndex:10000,color:"#fff"}}
          onClick={()=>setPreview(null)}>
          <div style={{position:"absolute",top:0,left:0,right:0,height:60,padding:"0 24px",borderBottom:"1px solid rgba(255,255,255,0.08)",display:"flex",justifyContent:"space-between",alignItems:"center",background:"rgba(15, 23, 42, 0.8)",backdropFilter:"blur(20px)",zIndex:10}}
            onClick={e=>e.stopPropagation()}>
            <div>
              <div style={{fontWeight:700,fontSize:15,color:"#fff"}}>{preview.name}</div>
              <div style={{fontSize:11.5,color:"rgba(255,255,255,0.5)",marginTop:2}}>{fmtBytes(preview.fileSize)} · {preview.fileType.toUpperCase()}</div>
            </div>
            <div style={{display:"flex",gap:8,alignItems:"center"}}>
              {canEditAsset(preview) && (
                <button onClick={() => toggleAssetVisibility(preview)} 
                  style={{
                    background: preview.isPublic ? "rgba(99,102,241,0.2)" : "rgba(245,158,11,0.2)",
                    border: preview.isPublic ? "1px solid rgba(99,102,241,0.3)" : "1px solid rgba(245,158,11,0.3)",
                    color: preview.isPublic ? "#818cf8" : "#fbbf24",
                    borderRadius: 8,
                    padding: isMobile ? "8px" : "8px 16px",
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    transition: "all 0.15s"
                  }}
                  title={preview.isPublic ? "Click để chuyển thành riêng tư" : "Click để chuyển thành công khai"}>
                  <i className={`bi bi-${preview.isPublic ? 'unlock-fill' : 'lock-fill'}`} />
                  {!isMobile && <span>{preview.isPublic ? "Công khai" : "Riêng tư"}</span>}
                </button>
              )}
              <button onClick={()=>handleDownload(preview)} style={{background:"var(--primary)",color:"#fff",border:"none",borderRadius:8,padding: isMobile ? "8px" : "8px 16px",fontSize:13,fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",gap:4}} title="Tải về">
                <i className="bi bi-download" /> {!isMobile && <span>Tải về</span>}
              </button>
              {mode === "picker" && onSelect && (
                <button onClick={() => { onSelect(preview); setPreview(null); }} style={{background:"#10b981",color:"#fff",border:"none",borderRadius:8,padding: isMobile ? "8px" : "8px 16px",fontSize:13,fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",gap:4}} title="Chọn tài liệu">
                  <i className="bi bi-check-circle" /> {!isMobile && <span>Chọn tài liệu</span>}
                </button>
              )}
              {canDeleteAsset(preview) && (
                <button onClick={()=>{handleDelete(preview.id);setPreview(null);}} style={{background:"rgba(239,68,68,0.2)",border:"1px solid rgba(239,68,68,0.3)",borderRadius:8,padding: isMobile ? "8px" : "8px 14px",fontSize:13,cursor:"pointer",color:"#f87171",display:"flex",alignItems:"center",justifyContent:"center"}} title="Xóa tài liệu">
                  <i className="bi bi-trash" />
                </button>
              )}
              <div style={{width:1,height:20,background:"rgba(255,255,255,0.15)",margin:"0 4px"}} />
              <button onClick={()=>setPreview(null)} style={{background:"rgba(255,255,255,0.08)",border:"none",borderRadius:8,width:32,height:32,fontSize:14,cursor:"pointer",color:"#fff",display:"flex",alignItems:"center",justifyContent:"center"}}>
                ✕
              </button>
            </div>
          </div>
          <div style={{position:"absolute",top:60,left:0,right:0,bottom:0,padding:24,display:"flex",alignItems:"center",justifyContent:"center",overflow:"hidden"}}
            onClick={e=>e.stopPropagation()}>
            {isPdf(preview.fileType) && (
              <PdfScrollPreview fileUrl={preview.fileUrl} />
            )}
            {isImage(preview.fileType) && (
              <img src={preview.fileUrl} alt={preview.name} style={{maxWidth:"100%",maxHeight:"85vh",borderRadius:8,objectFit:"contain",boxShadow:"0 12px 36px rgba(0,0,0,0.5)"}} />
            )}
            {isVideo(preview.fileType) && (
              <video src={preview.fileUrl} controls autoPlay style={{maxWidth:"100%",maxHeight:"85vh",borderRadius:8,boxShadow:"0 12px 36px rgba(0,0,0,0.5)"}} />
            )}
            {!isPdf(preview.fileType) && !isImage(preview.fileType) && !isVideo(preview.fileType) && (
              <div style={{textAlign:"center",background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:16,padding:"48px 64px",boxShadow:"0 12px 36px rgba(0,0,0,0.3)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
                <FileSvg ext={preview.fileType} size={84} />
                <p style={{color:"rgba(255,255,255,0.6)",fontSize:14,marginTop:20,marginBottom:20}}>Không thể xem trực tiếp loại file này trên trình duyệt</p>
                <button onClick={()=>handleDownload(preview)} style={{background:"var(--primary)",color:"#fff",border:"none",borderRadius:8,padding:"10px 24px",fontSize:14,fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",gap:6}}>
                  <i className="bi bi-download" /> Tải về để xem chi tiết
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Upload Modal ──────────────────────────────────────────────────── */}
      {uploadModal && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.48)",zIndex:10000,display:"flex",alignItems:"center",justifyContent:"center",padding:24}}
          onClick={()=>setUploadModal(false)}>
          <div style={{background:"var(--background)",borderRadius:16,width:"100%",maxWidth:440,overflow:"hidden"}} onClick={e=>e.stopPropagation()}>
            <div style={{padding:"13px 16px",borderBottom:"1px solid var(--border)",display:"flex",justifyContent:"space-between"}}>
              <h3 style={{margin:0,fontSize:14,fontWeight:700,color:"var(--foreground)"}}><i className="bi bi-cloud-upload" style={{marginRight:8,color:"var(--primary)"}} />Upload tài liệu</h3>
              <button onClick={()=>setUploadModal(false)} style={{background:"none",border:"none",fontSize:18,cursor:"pointer",color:"var(--muted-foreground)"}}>✕</button>
            </div>
            <div style={{padding:16,display:"flex",flexDirection:"column",gap:10}}>
              <div onClick={()=>fileInputRef.current?.click()}
                style={{border:`2px dashed ${uploadFile?"var(--primary)":"var(--border)"}`,borderRadius:10,padding:18,textAlign:"center",cursor:"pointer",background:uploadFile?"rgba(99,102,241,0.04)":"var(--muted)"}}>
                <input ref={fileInputRef} type="file" style={{display:"none"}} onChange={e=>setUploadFile(e.target.files?.[0]||null)} />
                {uploadFile
                  ? <><i className="bi bi-check-circle-fill" style={{fontSize:24,color:"var(--primary)",marginBottom:6}} /><div style={{fontWeight:600,color:"var(--foreground)",fontSize:13}}>{uploadFile.name}</div><div style={{fontSize:11,color:"var(--muted-foreground)"}}>{fmtBytes(uploadFile.size)}</div></>
                  : <><i className="bi bi-cloud-arrow-up" style={{fontSize:24,color:"var(--muted-foreground)",marginBottom:6}} /><div style={{color:"var(--muted-foreground)",fontSize:13}}>Nhấn để chọn file</div></>}
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:6}}>
                <input value={uploadData.name} onChange={e=>setUploadData(p=>({...p,name:e.target.value}))} placeholder="Tên tài liệu (tuỳ chọn)"
                  style={{height:34,borderRadius:7,border:"1px solid var(--border)",background:"var(--muted)",color:"var(--foreground)",padding:"0 10px",fontSize:13}} />
                <textarea value={uploadData.description} onChange={e=>setUploadData(p=>({...p,description:e.target.value}))} placeholder="Mô tả" rows={2}
                  style={{borderRadius:7,border:"1px solid var(--border)",background:"var(--muted)",color:"var(--foreground)",padding:"8px 10px",fontSize:13,resize:"none"}} />
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                  <select value={uploadData.type} onChange={e=>setUploadData(p=>({...p,type:e.target.value}))}
                    style={{height:34,borderRadius:7,border:"1px solid var(--border)",background:"var(--muted)",color:"var(--foreground)",padding:"0 9px",fontSize:13}}>
                    {FILE_TYPES.filter(t=>t.value).map(t=><option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                  <select value={uploadData.channel} onChange={e=>setUploadData(p=>({...p,channel:e.target.value}))}
                    style={{height:34,borderRadius:7,border:"1px solid var(--border)",background:"var(--muted)",color:"var(--foreground)",padding:"0 9px",fontSize:13}}>
                    {CHANNELS.filter(c=>c.value).map(c=><option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </div>
                {currentFolder && !currentFolder.isPublic && (
                  <label style={{display:"flex",alignItems:"center",gap:8,marginTop:4,cursor:"pointer",userSelect:"none"}}>
                    <input type="checkbox" checked={uploadIsPublic} onChange={e=>setUploadIsPublic(e.target.checked)}
                      style={{width:15,height:15,cursor:"pointer"}} />
                    <span style={{fontSize:12.5,color:"var(--foreground)",fontWeight:500}}>Công khai tài liệu (cho người khác xem)</span>
                  </label>
                )}
              </div>
              <button onClick={handleUpload} disabled={!uploadFile||uploading}
                style={{background:"var(--primary)",color:"#fff",border:"none",borderRadius:9,padding:"10px 0",fontSize:14,fontWeight:700,cursor:uploadFile?"pointer":"not-allowed",opacity:uploadFile?1:0.5}}>
                {uploading?<><i className="bi bi-arrow-repeat" style={{animation:"spin 1s linear infinite"}} /> Đang upload...</>:<><i className="bi bi-cloud-upload" /> Upload tài liệu</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── New Subfolder Modal ───────────────────────────────────────────── */}
      {newFolderModal && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.48)",zIndex:10000,display:"flex",alignItems:"center",justifyContent:"center"}}
          onClick={()=>setNewFolderModal(false)}>
          <div style={{background:"var(--background)",borderRadius:14,width:320,padding:20}} onClick={e=>e.stopPropagation()}>
            <h3 style={{margin:"0 0 12px",color:"var(--foreground)",fontSize:14}}><i className="bi bi-folder-plus" style={{marginRight:8,color:"var(--primary)"}} />Tạo thư mục mới</h3>
            <input autoFocus value={newFolderName} onChange={e=>setNewFolderName(e.target.value)}
              onKeyDown={e=>e.key==="Enter"&&handleCreateSubfolder()} placeholder="Tên thư mục..."
              style={{width:"100%",height:36,padding:"0 10px",borderRadius:7,border:"1px solid var(--border)",background:"var(--muted)",color:"var(--foreground)",fontSize:13,boxSizing:"border-box"}} />
            {currentFolder && !currentFolder.isPublic && (
              <label style={{display:"flex",alignItems:"center",gap:8,marginTop:12,cursor:"pointer",userSelect:"none"}}>
                <input type="checkbox" checked={newFolderIsPublic} onChange={e=>setNewFolderIsPublic(e.target.checked)}
                  style={{width:15,height:15,cursor:"pointer"}} />
                <span style={{fontSize:12.5,color:"var(--foreground)"}}>Công khai cho mọi người xem</span>
              </label>
            )}
            <div style={{display:"flex",gap:8,marginTop:12}}>
              <button onClick={()=>setNewFolderModal(false)} style={{flex:1,padding:"8px 0",background:"var(--muted)",border:"1px solid var(--border)",borderRadius:7,cursor:"pointer",color:"var(--foreground)",fontSize:13}}>Hủy</button>
              <button onClick={handleCreateSubfolder} disabled={!newFolderName.trim()||creatingFolder} style={{flex:1,padding:"8px 0",background:"var(--primary)",border:"none",borderRadius:7,cursor:creatingFolder||!newFolderName.trim()?"not-allowed":"pointer",color:"#fff",fontSize:13,fontWeight:600,opacity:creatingFolder?0.7:1}}>
                {creatingFolder?<><i className="bi bi-arrow-repeat" style={{animation:"spin 1s linear infinite"}} /> Đang tạo...</>:"Tạo"}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .sidebar-item { transition: all 0.15s ease-in-out; }
        .sidebar-item:hover { background: var(--muted) !important; transform: translateX(2px); }
        .finder-icon {
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .finder-icon:hover {
          background: var(--card) !important;
          border-color: rgba(99, 102, 241, 0.35) !important;
          transform: translateY(-3px);
          box-shadow: 0 8px 16px rgba(0, 0, 0, 0.05), 0 2px 4px rgba(99, 102, 241, 0.04) !important;
        }
        .list-row { transition: background 0.15s ease-in-out; }
        .list-row:hover { background: var(--muted) !important; }
        .folder-icon-wrap:hover .folder-del-btn { display: flex !important; }
        @keyframes spin { from { transform:rotate(0deg); } to { transform:rotate(360deg); } }
      `}</style>

      {/* ── Confirm xóa tài liệu ─────────────────────────────────────────── */}
      <ConfirmDialog
        open={confirmDeleteAsset}
        variant="danger"
        title="Xóa tài liệu?"
        message="Tài liệu này sẽ bị xóa vĩnh viễn và không thể khôi phục."
        confirmLabel="Xóa tài liệu"
        loading={deletingAsset}
        isStatic
        onConfirm={doDeleteAsset}
        onCancel={()=>{ if (!deletingAsset) { setConfirmDeleteAsset(false); setPendingDeleteAssetId(null); } }}
      />

      {/* ── Confirm xóa thư mục ──────────────────────────────────────────── */}
      <ConfirmDialog
        open={confirmDeleteFolder}
        variant="danger"
        title={`Xóa thư mục "${pendingDeleteFolder?.name}"?`}
        message={
          pendingDeleteFolder && (pendingDeleteFolder._count?.assets > 0 || pendingDeleteFolder._count?.children > 0)
            ? <>
                Thư mục này chứa{" "}
                {pendingDeleteFolder._count.assets > 0 && <strong>{pendingDeleteFolder._count.assets} tài liệu</strong>}
                {pendingDeleteFolder._count.assets > 0 && pendingDeleteFolder._count.children > 0 && " và "}
                {pendingDeleteFolder._count.children > 0 && <strong>{pendingDeleteFolder._count.children} thư mục con</strong>}.
                {" "}Tất cả dữ liệu bên trong sẽ bị <strong>xóa vĩnh viễn</strong>.
              </>
            : "Thư mục sẽ bị xóa vĩnh viễn và không thể khôi phục."
        }
        confirmLabel="Xóa thư mục"
        loading={deletingFolder}
        isStatic
        onConfirm={doDeleteFolder}
        onCancel={()=>{ if (!deletingFolder) { setConfirmDeleteFolder(false); setPendingDeleteFolder(null); } }}
      />
    </div>
  );
}
