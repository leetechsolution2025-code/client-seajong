"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { useSession } from "next-auth/react";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Folder {
  id: string; name: string; ownerId: string | null; ownerName: string | null;
  parentId: string | null; isPublic: boolean; ownerIsActive: boolean; createdAt: string;
  _count: { assets: number; children: number };
}
interface Asset {
  id: string; folderId: string; name: string; description: string | null;
  type: string; channel: string; fileUrl: string; fileSize: number; fileType: string;
  thumbnail: string | null; uploadedBy: string; downloads: number; createdAt: string;
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

// ─── Sidebar Tree Item ────────────────────────────────────────────────────────
function SidebarItem({ folder, allFolders, currentFolder, onNavigate, canOpen, depth = 0 }: {
  folder: Folder; allFolders: Folder[]; currentFolder: Folder | null;
  onNavigate: (f: Folder) => void; canOpen: (f: Folder) => boolean; depth?: number;
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
        <i className={`bi ${folder.isPublic?"bi-folder2-open":locked?"bi-lock":"bi-folder-person"}`}
          style={{fontSize:13,flexShrink:0,color:isActive?"white":folder.isPublic?"#f5a623":"#6366f1"}} />
        <span style={{fontSize:12.5,fontWeight:isActive?700:500,flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{folder.name}</span>
        {!folder.ownerIsActive && <span style={{fontSize:8,background:"#ef4444",color:"#fff",padding:"1px 4px",borderRadius:99,fontWeight:700}}>NGHỈ</span>}
        <span style={{fontSize:10,color:isActive?"rgba(255,255,255,0.55)":"var(--muted-foreground)"}}>{folder._count?.assets??0}</span>
      </div>
      {exp && children.map(c=>(
        <SidebarItem key={c.id} folder={c} allFolders={allFolders} currentFolder={currentFolder} onNavigate={onNavigate} canOpen={canOpen} depth={depth+1} />
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
  const [preview, setPreview] = useState<Asset|null>(null);
  const [uploadModal, setUploadModal] = useState(false);
  const [newFolderModal, setNewFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [uploadData, setUploadData] = useState({name:"",description:"",type:"catalogue",channel:"all"});
  const [uploadFile, setUploadFile] = useState<File|null>(null);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
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

  // ── Permissions ─────────────────────────────────────────────────────────────
  const u = session?.user as any;
  const userId = u?.id;
  const isAdmin = u?.role==="SUPERADMIN"||u?.role==="ADMIN";
  const MKT = ["marketing","MKT","mkt"];
  const MGR = ["manager","mid_manager","senior_manager"];
  const isMktManager = MKT.includes(u?.departmentCode) && MGR.includes(u?.level);
  const isMkt = MKT.includes(u?.departmentCode);

  function canOpen(f: Folder) {
    if (isAdmin) return true;
    if (f.isPublic) return true;
    if (f.ownerId===userId) return true;
    if (isMktManager && !f.ownerIsActive) return true;
    return false;
  }
  function canUploadTo(f: Folder|null) {
    if (!f) return false;
    if (isAdmin) return true;
    if (f.isPublic && isMktManager) return true;
    if (!f.isPublic && f.ownerId===userId) return true;
    return false;
  }
  function canDeleteAsset(_a: Asset) {
    if (isAdmin) return true;
    if (isMktManager && currentFolder?.isPublic) return true;
    if (currentFolder?.ownerId===userId) return true;
    return false;
  }
  function canCreateSubfolder() {
    if (!currentFolder||currentFolder.isPublic) return false;
    if (isAdmin) return true;
    return currentFolder.ownerId===userId;
  }
  function canDeleteFolder(f: Folder) {
    if (f.isPublic) return false; // không xóa thư mục chung
    if (isAdmin) return true;
    return f.ownerId===userId;
  }

  // ── Grouping ─────────────────────────────────────────────────────────────────
  const rootFolders = folders.filter(f=>f.parentId===null);
  const publicFolders = rootFolders.filter(f=>f.isPublic);
  const myFolders = rootFolders.filter(f=>!f.isPublic&&f.ownerId===userId&&f.ownerIsActive);
  const colleagueFolders = rootFolders.filter(f=>!f.isPublic&&f.ownerId!==userId&&f.ownerIsActive);
  const inactiveFolders = rootFolders.filter(f=>!f.isPublic&&!f.ownerIsActive);
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
    const res = await fetch("/api/media-library/assets",{method:"POST",body:fd});
    const result = await res.json().catch(()=>({}));
    if (res.ok) {
      loadAssets(currentFolder.id); loadFolders(true);
      setUploadModal(false); setUploadFile(null);
      setUploadData({name:"",description:"",type:"catalogue",channel:"all"});
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
  async function handleCreateSubfolder() {
    if (!newFolderName.trim()||!currentFolder||creatingFolder) return;
    setCreatingFolder(true);
    try {
      const res = await fetch("/api/media-library/folders",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({name:newFolderName.trim(),parentId:currentFolder.id})});
      if (!res.ok) { const d = await res.json().catch(()=>({})); alert(`Lỗi: ${d?.error||res.status}`); return; }
      await loadFolders(true);
      setNewFolderModal(false);
      setNewFolderName("");
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
  // ICON VIEW ITEMS (Finder style — no border, no background)
  // ─────────────────────────────────────────────────────────────────────────────
  function FolderIcon({ folder }: { folder: Folder }) {
    const locked = !canOpen(folder);
    const canDel = canDeleteFolder(folder);
    return (
      <div className="finder-icon folder-icon-wrap"
        style={{display:"flex",flexDirection:"column",alignItems:"center",gap:5,padding:"10px 4px",borderRadius:8,cursor:locked?"not-allowed":"pointer",width:96,opacity:locked?0.45:1,userSelect:"none",position:"relative"}}
        title={locked?`Thư mục cá nhân — ${folder.ownerName}`:folder.name}>
        <div onClick={()=>!locked&&navigateTo(folder)} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:5,width:"100%"}}>
          <div style={{position:"relative",height:60,display:"flex",alignItems:"center",justifyContent:"center"}}>
            <i className="bi bi-folder-fill" style={{fontSize:50,color:locked?"#9ca3af":"#f5a623",filter:locked?"none":"drop-shadow(0 3px 8px rgba(245,166,35,0.4))"}} />
            {locked && <i className="bi bi-lock-fill" style={{position:"absolute",bottom:0,right:-4,fontSize:13,color:"#6b7280"}} />}
          </div>
          <span style={{fontSize:11.5,fontWeight:500,color:"var(--foreground)",textAlign:"center",lineHeight:1.35,wordBreak:"break-word",maxWidth:"90%",display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical",overflow:"hidden"}}>
            {folder.name}
          </span>
        </div>
        {canDel && (
          <button onClick={e=>{e.stopPropagation();handleDeleteFolder(folder);}} className="folder-del-btn"
            style={{position:"absolute",top:4,right:4,background:"rgba(239,68,68,0.1)",border:"1px solid rgba(239,68,68,0.25)",borderRadius:4,width:20,height:20,display:"none",alignItems:"center",justifyContent:"center",cursor:"pointer",padding:0}}
            title="Xóa thư mục">
            <i className="bi bi-trash3" style={{fontSize:9,color:"#ef4444"}} />
          </button>
        )}
      </div>
    );
  }

  function FileIcon({ asset }: { asset: Asset }) {
    const color = TYPE_COLORS[asset.type]||"#6b7280";
    const icon = TYPE_ICONS[asset.type]||"bi-file-earmark";
    const hasThumb = asset.thumbnail||isImage(asset.fileType);
    return (
      <div onClick={()=>setPreview(asset)} className="finder-icon"
        style={{display:"flex",flexDirection:"column",alignItems:"center",gap:5,padding:"10px 4px",borderRadius:8,cursor:"pointer",width:96,userSelect:"none"}}>
        <div style={{width:52,height:60,borderRadius:6,overflow:"hidden",position:"relative",display:"flex",alignItems:"center",justifyContent:"center",background:`${color}12`,border:`1px solid ${color}20`}}>
          {hasThumb
            ? <img src={asset.thumbnail||asset.fileUrl} alt={asset.name} style={{width:"100%",height:"100%",objectFit:"cover"}} />
            : <i className={`bi ${icon}`} style={{fontSize:24,color}} />}
          {isVideo(asset.fileType) && (
            <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center"}}>
              <div style={{width:20,height:20,borderRadius:"50%",background:"rgba(0,0,0,0.55)",display:"flex",alignItems:"center",justifyContent:"center"}}>
                <i className="bi bi-play-fill" style={{color:"#fff",fontSize:8,marginLeft:1}} />
              </div>
            </div>
          )}
          <div style={{position:"absolute",bottom:1,right:1,background:color,color:"#fff",borderRadius:3,fontSize:7,fontWeight:800,padding:"1px 3px",textTransform:"uppercase"}}>
            {asset.fileType.slice(0,4)}
          </div>
        </div>
        <span style={{fontSize:11.5,fontWeight:500,color:"var(--foreground)",textAlign:"center",lineHeight:1.35,wordBreak:"break-word",maxWidth:"90%",display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical",overflow:"hidden"}}>
          {asset.name}
        </span>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // LIST VIEW
  // ─────────────────────────────────────────────────────────────────────────────
  const COL = "20px 1fr 150px 85px 110px 108px";

  function ListHeader() {
    return (
      <div style={{display:"grid",gridTemplateColumns:COL,alignItems:"center",padding:"8px 14px",borderBottom:"1px solid var(--border)",background:"var(--muted)"}}>
        {["","Tên","Ngày sửa đổi","Kích cỡ","Loại",""].map((h,i)=>(
          <span key={i} style={{fontSize:10.5,fontWeight:700,color:"var(--muted-foreground)",textTransform:"uppercase",letterSpacing:"0.05em"}}>{h}</span>
        ))}
      </div>
    );
  }

  function FolderRow({ folder }: { folder: Folder }) {
    const locked = !canOpen(folder);
    const canDel = canDeleteFolder(folder);
    return (
      <div className="list-row"
        style={{display:"grid",gridTemplateColumns:COL,alignItems:"center",padding:"7px 14px",borderBottom:"1px solid var(--border)",cursor:locked?"not-allowed":"pointer",opacity:locked?0.5:1}}>
        <i className="bi bi-folder-fill" onClick={()=>!locked&&navigateTo(folder)} style={{fontSize:14,color:locked?"#9ca3af":"#f5a623"}} />
        <span onClick={()=>!locked&&navigateTo(folder)} style={{fontSize:13,fontWeight:500,color:"var(--foreground)",display:"flex",alignItems:"center",gap:6,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
          {folder.name}{locked&&<i className="bi bi-lock-fill" style={{fontSize:10,color:"#9ca3af",flexShrink:0}} />}
        </span>
        <span onClick={()=>!locked&&navigateTo(folder)} style={{fontSize:12,color:"var(--muted-foreground)"}}>{fmtDate(folder.createdAt)}</span>
        <span onClick={()=>!locked&&navigateTo(folder)} style={{fontSize:12,color:"var(--muted-foreground)"}}>--</span>
        <span onClick={()=>!locked&&navigateTo(folder)} style={{fontSize:12,color:"var(--muted-foreground)"}}>Thư mục</span>
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
    const color = TYPE_COLORS[asset.type]||"#6b7280";
    const icon = TYPE_ICONS[asset.type]||"bi-file-earmark";
    return (
      <div className="list-row" style={{display:"grid",gridTemplateColumns:COL,alignItems:"center",padding:"7px 14px",borderBottom:"1px solid var(--border)"}}>
        <i className={`bi ${icon}`} style={{fontSize:14,color}} />
        <span style={{fontSize:13,fontWeight:500,color:"var(--foreground)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",paddingRight:12}}>{asset.name}</span>
        <span style={{fontSize:12,color:"var(--muted-foreground)"}}>{fmtDate(asset.createdAt)}</span>
        <span style={{fontSize:12,color:"var(--muted-foreground)"}}>{fmtBytes(asset.fileSize)}</span>
        <span style={{fontSize:12,color:"var(--muted-foreground)"}}>{FILE_TYPES.find(t=>t.value===asset.type)?.label||asset.fileType}</span>
        <div style={{display:"flex",gap:3,justifyContent:"flex-end"}}>
          <button onClick={()=>setPreview(asset)} style={{background:"var(--muted)",border:"none",borderRadius:5,padding:"3px 7px",fontSize:11,cursor:"pointer",color:"var(--foreground)"}}>
            <i className="bi bi-eye" />
          </button>
          <button onClick={()=>handleDownload(asset)} style={{background:"var(--primary)",color:"#fff",border:"none",borderRadius:5,padding:"3px 7px",fontSize:11,cursor:"pointer"}}>
            <i className="bi bi-download" />
          </button>
          {canDeleteAsset(asset) && (
            <button onClick={()=>handleDelete(asset.id)} style={{background:"rgba(239,68,68,0.08)",border:"1px solid rgba(239,68,68,0.18)",borderRadius:5,padding:"3px 7px",fontSize:11,cursor:"pointer",color:"#ef4444"}}>
              <i className="bi bi-trash" />
            </button>
          )}
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // MAIN RENDER
  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div style={{display:"flex",height:mode==="full"?"100%":"600px",background:"var(--background)",borderRadius:14,overflow:"hidden",border:"1px solid var(--border)"}}>

      {/* ── Sidebar ──────────────────────────────────────────────────────── */}
      <div style={{width:240,borderRight:"1px solid var(--border)",display:"flex",flexDirection:"column",background:"var(--card)",flexShrink:0}}>
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
              {(isMkt||isAdmin) && colleagueFolders.length>0 && (
                <div style={{marginBottom:4}}>
                  <div style={{fontSize:9,fontWeight:800,color:"var(--muted-foreground)",padding:"4px 14px",textTransform:"uppercase",letterSpacing:"0.06em"}}>Đồng nghiệp</div>
                  {colleagueFolders.map(f=><SidebarItem key={f.id} folder={f} allFolders={folders} currentFolder={currentFolder} onNavigate={navigateTo} canOpen={canOpen} />)}
                </div>
              )}
              {(isMktManager||isAdmin) && inactiveFolders.length>0 && (
                <div>
                  <div style={{fontSize:9,fontWeight:800,color:"#ef4444",padding:"4px 14px",textTransform:"uppercase",letterSpacing:"0.06em"}}>Đã nghỉ việc</div>
                  {inactiveFolders.map(f=><SidebarItem key={f.id} folder={f} allFolders={folders} currentFolder={currentFolder} onNavigate={navigateTo} canOpen={canOpen} />)}
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
        <div style={{padding:"9px 14px",borderBottom:"1px solid var(--border)",display:"flex",alignItems:"center",gap:8,background:"var(--background)",flexShrink:0}}>
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
          {/* Search */}
          <div style={{position:"relative",width:180,flexShrink:0}}>
            <i className="bi bi-search" style={{position:"absolute",left:9,top:"50%",transform:"translateY(-50%)",color:"var(--muted-foreground)",fontSize:11}} />
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Tìm..."
              style={{paddingLeft:28,paddingRight:8,height:30,borderRadius:7,border:"1px solid var(--border)",background:"var(--muted)",color:"var(--foreground)",fontSize:12,width:"100%"}} />
          </div>
          {/* Filter */}
          <select value={typeFilter} onChange={e=>setTypeFilter(e.target.value)}
            style={{height:30,borderRadius:7,border:"1px solid var(--border)",background:"var(--muted)",color:"var(--foreground)",fontSize:12,padding:"0 8px",flexShrink:0}}>
            {FILE_TYPES.map(t=><option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          <div style={{width:1,height:18,background:"var(--border)"}} />
          {/* View toggle */}
          <div style={{display:"flex",background:"var(--muted)",borderRadius:7,padding:2,flexShrink:0}}>
            {(["grid","list"] as const).map(v=>(
              <button key={v} onClick={()=>setViewMode(v)}
                style={{background:viewMode===v?"var(--background)":"transparent",border:"none",borderRadius:5,padding:"3px 9px",cursor:"pointer",color:"var(--foreground)",fontSize:12.5,boxShadow:viewMode===v?"0 1px 3px rgba(0,0,0,0.1)":"none",transition:"all 0.1s"}}>
                <i className={`bi bi-${v==="grid"?"grid-3x3-gap":"list-ul"}`} />
              </button>
            ))}
          </div>
          {/* Actions */}
          {currentFolder && canCreateSubfolder() && (
            <button onClick={()=>setNewFolderModal(true)}
              style={{height:30,padding:"0 10px",background:"var(--muted)",border:"1px solid var(--border)",borderRadius:7,fontSize:12,fontWeight:600,cursor:"pointer",color:"var(--foreground)",display:"flex",alignItems:"center",gap:4,flexShrink:0}}>
              <i className="bi bi-folder-plus" /> Tạo thư mục
            </button>
          )}
          {currentFolder && canUploadTo(currentFolder) && (
            <button onClick={()=>setUploadModal(true)}
              style={{height:30,padding:"0 12px",background:"var(--primary)",border:"none",borderRadius:7,fontSize:12,fontWeight:700,cursor:"pointer",color:"#fff",display:"flex",alignItems:"center",gap:4,boxShadow:"0 2px 8px rgba(99,102,241,0.25)",flexShrink:0}}>
              <i className="bi bi-cloud-upload" /> Upload
            </button>
          )}
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
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.78)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:24}}
          onClick={()=>setPreview(null)}>
          <div style={{background:"var(--background)",borderRadius:16,overflow:"hidden",width:"90%",maxWidth:860,maxHeight:"90vh",display:"flex",flexDirection:"column"}}
            onClick={e=>e.stopPropagation()}>
            <div style={{padding:"11px 16px",borderBottom:"1px solid var(--border)",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div>
                <div style={{fontWeight:700,color:"var(--foreground)",fontSize:14}}>{preview.name}</div>
                <div style={{fontSize:11,color:"var(--muted-foreground)"}}>{fmtBytes(preview.fileSize)} · {preview.fileType.toUpperCase()}</div>
              </div>
              <div style={{display:"flex",gap:8}}>
                <button onClick={()=>handleDownload(preview)} style={{background:"var(--primary)",color:"#fff",border:"none",borderRadius:8,padding:"7px 14px",fontSize:13,fontWeight:600,cursor:"pointer"}}><i className="bi bi-download" /> Tải về</button>
                {canDeleteAsset(preview) && <button onClick={()=>{handleDelete(preview.id);setPreview(null);}} style={{background:"rgba(239,68,68,0.1)",border:"1px solid rgba(239,68,68,0.2)",borderRadius:8,padding:"7px 12px",fontSize:13,cursor:"pointer",color:"#ef4444"}}><i className="bi bi-trash" /></button>}
                <button onClick={()=>setPreview(null)} style={{background:"var(--muted)",border:"none",borderRadius:8,padding:"7px 12px",fontSize:16,cursor:"pointer",color:"var(--foreground)"}}>✕</button>
              </div>
            </div>
            <div style={{flex:1,overflow:"hidden",minHeight:400,background:"var(--muted)",display:"flex",alignItems:"center",justifyContent:"center"}}>
              {isPdf(preview.fileType) && <iframe src={preview.fileUrl} style={{width:"100%",height:"100%",minHeight:480,border:"none"}} title={preview.name} />}
              {isImage(preview.fileType) && <img src={preview.fileUrl} alt={preview.name} style={{maxWidth:"100%",maxHeight:"70vh",borderRadius:6,objectFit:"contain"}} />}
              {isVideo(preview.fileType) && <video src={preview.fileUrl} controls style={{maxWidth:"100%",maxHeight:"70vh",borderRadius:6}} />}
              {!isPdf(preview.fileType) && !isImage(preview.fileType) && !isVideo(preview.fileType) && (
                <div style={{textAlign:"center",padding:40}}>
                  <i className={`bi ${TYPE_ICONS[preview.type]||"bi-file-earmark"}`} style={{fontSize:50,color:TYPE_COLORS[preview.type]||"#6b7280",marginBottom:14}} />
                  <p style={{color:"var(--muted-foreground)",fontSize:13,marginBottom:16}}>Không thể xem trước loại file này</p>
                  <button onClick={()=>handleDownload(preview)} style={{background:"var(--primary)",color:"#fff",border:"none",borderRadius:8,padding:"10px 20px",fontSize:14,fontWeight:600,cursor:"pointer"}}>
                    <i className="bi bi-download" /> Tải về để xem
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Upload Modal ──────────────────────────────────────────────────── */}
      {uploadModal && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.48)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:24}}
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
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.48)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center"}}
          onClick={()=>setNewFolderModal(false)}>
          <div style={{background:"var(--background)",borderRadius:14,width:320,padding:20}} onClick={e=>e.stopPropagation()}>
            <h3 style={{margin:"0 0 12px",color:"var(--foreground)",fontSize:14}}><i className="bi bi-folder-plus" style={{marginRight:8,color:"var(--primary)"}} />Tạo thư mục mới</h3>
            <input autoFocus value={newFolderName} onChange={e=>setNewFolderName(e.target.value)}
              onKeyDown={e=>e.key==="Enter"&&handleCreateSubfolder()} placeholder="Tên thư mục..."
              style={{width:"100%",height:36,padding:"0 10px",borderRadius:7,border:"1px solid var(--border)",background:"var(--muted)",color:"var(--foreground)",fontSize:13,boxSizing:"border-box"}} />
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
        .sidebar-item:hover { background: var(--muted) !important; }
        .finder-icon:hover { background: rgba(99,102,241,0.08) !important; }
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
