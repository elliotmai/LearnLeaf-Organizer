import React from "react";
import Sidebar from "../ui/Sidebar.jsx";
import { useNavigate } from "react-router-dom";

function DetailRow({ label, children }) {
  return (
    <div style={{ padding:"14px 0", borderBottom:"1px solid #f0f4f2" }}>
      <div style={{ fontSize:"0.68rem", fontWeight:700, color:"#b0b8b4", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:"6px" }}>
        {label}
      </div>
      <div style={{ fontSize:"0.9rem", color:"#1a2e28", lineHeight:1.5 }}>{children}</div>
    </div>
  );
}

export default function SubjectDetailPanel({ open, onClose, subject, onEdit, onArchive, onDelete }) {
  const navigate = useNavigate();
  if (!subject) return null;
  const color = subject.subjectColor || "#355147";

  return (
    <Sidebar open={open} onClose={onClose} title="Subject Details">
      {/* Color header */}
      <div style={{ margin:"-24px -24px 0", padding:"24px 24px 20px", background:`linear-gradient(135deg, ${color}18, ${color}08)`, borderTop:`4px solid ${color}`, marginBottom:"8px" }}>
        <div style={{ display:"flex", alignItems:"center", gap:"12px" }}>
          <div style={{ width:"44px", height:"44px", borderRadius:"12px", background:color, flexShrink:0 }} />
          <div>
            <h2 style={{ margin:"0 0 3px", fontSize:"1.15rem", fontWeight:700, color:"#1a2e28", lineHeight:1.3 }}>
              {subject.subjectName}
            </h2>
            {subject.subjectSemester && (
              <span style={{ fontSize:"0.78rem", color:"#9F6C5B", fontWeight:500 }}>{subject.subjectSemester}</span>
            )}
          </div>
        </div>
      </div>

      <div>
        <DetailRow label="Color">
          <div style={{ display:"flex", alignItems:"center", gap:"10px" }}>
            <div style={{ width:"28px", height:"28px", borderRadius:"8px", background:color, border:"1px solid rgba(0,0,0,0.08)" }} />
            <span style={{ fontFamily:"monospace", fontSize:"0.85rem", color:"#6b7280" }}>{color.toUpperCase()}</span>
          </div>
        </DetailRow>

        {subject.subjectSemester && (
          <DetailRow label="Semester">
            <span style={{ fontWeight:500 }}>{subject.subjectSemester}</span>
          </DetailRow>
        )}

        <DetailRow label="Description">
          {subject.subjectDescription
            ? <p style={{ margin:0, lineHeight:1.7, color:"#374151", whiteSpace:"pre-wrap", wordBreak:"break-word", fontSize:"0.88rem" }}>{subject.subjectDescription}</p>
            : <span style={{ color:"#d1d5db", fontStyle:"italic", fontSize:"0.85rem" }}>No description provided</span>
          }
        </DetailRow>

        <DetailRow label="Status">
          <span style={{ display:"inline-flex", padding:"3px 10px", borderRadius:"999px", fontSize:"0.8rem", fontWeight:600,
            background:"rgba(53,81,71,0.1)", color:"#355147" }}>
            {subject.subjectStatus || "Active"}
          </span>
        </DetailRow>
      </div>

      {/* Actions */}
      <div style={{ display:"flex", flexDirection:"column", gap:"8px", marginTop:"24px", paddingTop:"16px", borderTop:"1px solid #f0f4f2" }}>
        <button onClick={() => { onClose(); navigate(`/subjects/${subject.subjectId}`); }}
          style={{ width:"100%", padding:"0.65rem", borderRadius:"10px", background:color, color:"white", border:"none", cursor:"pointer", fontWeight:600, fontSize:"0.875rem" }}>
          View Tasks
        </button>
        <div style={{ display:"flex", gap:"8px" }}>
          <button onClick={() => { onClose(); setTimeout(() => onEdit(subject), 150); }}
            style={{ flex:1, padding:"0.65rem", borderRadius:"10px", background:"#f3f4f6", color:"#374151", border:"none", cursor:"pointer", fontWeight:600, fontSize:"0.875rem" }}>
            Edit
          </button>
          <button onClick={() => { onClose(); setTimeout(() => onArchive(subject.subjectId), 150); }}
            style={{ flex:1, padding:"0.65rem", borderRadius:"10px", background:"rgba(159,108,91,0.08)", color:"#9F6C5B", border:"1px solid rgba(159,108,91,0.2)", cursor:"pointer", fontWeight:600, fontSize:"0.875rem" }}>
            Archive
          </button>
          <button onClick={() => { onClose(); setTimeout(() => onDelete(subject), 150); }}
            style={{ padding:"0.65rem 0.85rem", borderRadius:"10px", background:"rgba(243,22,30,0.07)", color:"#F3161E", border:"1px solid rgba(243,22,30,0.15)", cursor:"pointer", fontWeight:600, fontSize:"0.875rem" }}>
            Delete
          </button>
        </div>
      </div>
    </Sidebar>
  );
}
