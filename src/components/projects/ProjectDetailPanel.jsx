import React from "react";
import Sidebar from "../ui/Sidebar.jsx";
import { formatDateDisplay } from "../../LearnLeaf_Functions.jsx";
import { useUser } from "../../UserState.jsx";
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

export default function ProjectDetailPanel({ open, onClose, project, onEdit, onArchive, onDelete }) {
  const { user } = useUser();
  const navigate = useNavigate();
  if (!project) return null;

  const total = (project.statusCounts?.NotStarted||0) + (project.statusCounts?.InProgress||0) + (project.statusCounts?.Completed||0);
  const pct = total ? Math.round(((project.statusCounts?.Completed||0) / total) * 100) : 0;

  const isDue = project.projectDueDate && new Date(project.projectDueDate + "T23:59:59") < new Date();

  return (
    <Sidebar open={open} onClose={onClose} title="Project Details">
      {/* Header */}
      <div style={{ margin:"-24px -24px 0", padding:"20px 24px 20px", background:"linear-gradient(135deg,rgba(144,116,116,0.08),rgba(144,116,116,0.03))", borderTop:"4px solid #907474", marginBottom:"8px" }}>
        <h2 style={{ margin:"0 0 6px", fontSize:"1.1rem", fontWeight:700, color:"#1a2e28", lineHeight:1.4 }}>
          {project.projectName}
        </h2>
        {project.projectDueDate && (
          <span style={{ fontSize:"0.8rem", color:isDue?"#F3161E":"#9ca3af", fontWeight:isDue?600:400 }}>
            {isDue ? "⚠ Overdue · " : "Due "}
            {formatDateDisplay(project.projectDueDate, user?.dateFormat)}
          </span>
        )}
      </div>

      <div>
        {/* Progress */}
        {total > 0 && (
          <DetailRow label="Progress">
            <div>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:"8px" }}>
                <span style={{ fontSize:"0.85rem", color:"#6b7280" }}>{total} task{total!==1?"s":""} total</span>
                <span style={{ fontSize:"0.85rem", fontWeight:700, color:"#355147" }}>{pct}% complete</span>
              </div>
              <div style={{ height:"8px", background:"#f0f4f2", borderRadius:"4px", overflow:"hidden", marginBottom:"8px" }}>
                <div style={{ height:"100%", borderRadius:"4px", background:"#355147", width:`${pct}%`, transition:"width 600ms ease" }}/>
              </div>
              <div style={{ display:"flex", gap:"14px", fontSize:"0.8rem" }}>
                <span style={{ color:"#355147", fontWeight:600 }}>✓ {project.statusCounts?.Completed||0} done</span>
                <span style={{ color:"#5B8E9F", fontWeight:600 }}>⟳ {project.statusCounts?.InProgress||0} in progress</span>
                <span style={{ color:"#9ca3af", fontWeight:500 }}>○ {project.statusCounts?.NotStarted||0} not started</span>
              </div>
            </div>
          </DetailRow>
        )}

        {/* Subjects */}
        {project.projectSubjects?.length > 0 && (
          <DetailRow label="Linked Subjects">
            <div style={{ display:"flex", flexWrap:"wrap", gap:"6px" }}>
              {project.projectSubjects.map(s => (
                <button key={s.subjectId} onClick={() => { onClose(); navigate(`/subjects/${s.subjectId}`); }}
                  style={{ fontSize:"0.78rem", padding:"4px 10px", borderRadius:"999px", fontWeight:600, color:"white", background:s.subjectColor||"#355147", border:"none", cursor:"pointer" }}>
                  {s.subjectName}
                </button>
              ))}
            </div>
          </DetailRow>
        )}

        {/* Next task */}
        {project.nextTask && (
          <DetailRow label="Next Up">
            <div style={{ padding:"10px 12px", borderRadius:"8px", background:"rgba(159,108,91,0.08)", border:"1px solid rgba(159,108,91,0.15)" }}>
              <p style={{ margin:"0 0 3px", fontSize:"0.85rem", fontWeight:600, color:"#7d5244" }}>{project.nextTask.taskName}</p>
              {project.nextTask.taskDueDate && (
                <span style={{ fontSize:"0.78rem", color:"#9ca3af" }}>Due {formatDateDisplay(project.nextTask.taskDueDate, user?.dateFormat)}</span>
              )}
            </div>
          </DetailRow>
        )}

        <DetailRow label="Description">
          {project.projectDescription
            ? <p style={{ margin:0, lineHeight:1.7, color:"#374151", whiteSpace:"pre-wrap", wordBreak:"break-word", fontSize:"0.88rem" }}>{project.projectDescription}</p>
            : <span style={{ color:"#d1d5db", fontStyle:"italic", fontSize:"0.85rem" }}>No description provided</span>
          }
        </DetailRow>
      </div>

      {/* Actions */}
      <div style={{ display:"flex", flexDirection:"column", gap:"8px", marginTop:"24px", paddingTop:"16px", borderTop:"1px solid #f0f4f2" }}>
        <button onClick={() => { onClose(); navigate(`/projects/${project.projectId}`); }}
          style={{ width:"100%", padding:"0.65rem", borderRadius:"10px", background:"#355147", color:"white", border:"none", cursor:"pointer", fontWeight:600, fontSize:"0.875rem" }}>
          View All Tasks
        </button>
        <div style={{ display:"flex", gap:"8px" }}>
          <button onClick={() => { onClose(); setTimeout(() => onEdit(project), 150); }}
            style={{ flex:1, padding:"0.65rem", borderRadius:"10px", background:"#f3f4f6", color:"#374151", border:"none", cursor:"pointer", fontWeight:600, fontSize:"0.875rem" }}>
            Edit
          </button>
          <button onClick={() => { onClose(); setTimeout(() => onArchive(project.projectId), 150); }}
            style={{ flex:1, padding:"0.65rem", borderRadius:"10px", background:"rgba(159,108,91,0.08)", color:"#9F6C5B", border:"1px solid rgba(159,108,91,0.2)", cursor:"pointer", fontWeight:600, fontSize:"0.875rem" }}>
            Archive
          </button>
          <button onClick={() => { onClose(); setTimeout(() => onDelete(project.projectId), 150); }}
            style={{ padding:"0.65rem 0.85rem", borderRadius:"10px", background:"rgba(243,22,30,0.07)", color:"#F3161E", border:"1px solid rgba(243,22,30,0.15)", cursor:"pointer", fontWeight:600, fontSize:"0.875rem" }}>
            Delete
          </button>
        </div>
      </div>
    </Sidebar>
  );
}
