import React, { useEffect } from "react";

export default function Sidebar({ open, onClose, title, children, width = "480px" }) {
  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  if (!open) return null;

  return (
    <>
      <div className="sidebar-overlay" onClick={onClose} />
      <aside className="sidebar-panel" style={{ maxWidth: width }}>
        <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",padding:"20px 24px",borderBottom:"1px solid #f0f4f2",flexShrink:0 }}>
          <h2 style={{ fontSize:"1.125rem",fontWeight:700,color:"#355147",fontFamily:"Playfair Display,serif",margin:0 }}>{title}</h2>
          <button onClick={onClose}
            style={{ width:"32px",height:"32px",borderRadius:"8px",border:"none",background:"#f3f4f6",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",color:"#6b7280",fontSize:"16px",transition:"all 150ms" }}>
            ✕
          </button>
        </div>
        <div style={{ flex:1,overflowY:"auto",padding:"24px" }}>
          {children}
        </div>
      </aside>
    </>
  );
}
