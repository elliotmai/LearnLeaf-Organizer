import React from "react";
import Sidebar from "../ui/Sidebar.jsx";
import { formatDateDisplay, formatTimeDisplay } from "../../LearnLeaf_Functions.jsx";
import { useUser } from "../../UserState.jsx";

const STATUS_COLORS = { "Not Started":"#6b7280", "In Progress":"#3d6e7d", "Completed":"#355147" };
const STATUS_BG     = { "Not Started":"#f3f4f6", "In Progress":"rgba(91,142,159,0.12)", "Completed":"rgba(53,81,71,0.1)" };
const PRIORITY_COLORS = { High:"#c01018", Medium:"#7d5244", Low:"#355147" };
const PRIORITY_BG     = { High:"rgba(243,22,30,0.1)", Medium:"rgba(159,108,91,0.12)", Low:"rgba(182,205,200,0.3)" };

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

export default function TaskDetailPanel({ open, onClose, task, onEdit, onDelete }) {
  const { user } = useUser();
  if (!task) return null;

  const subject = task.taskSubject;
  const project = task.taskProject;
  const subjectColor = subject?.subjectColor || "#355147";
  const isOverdue = task.taskDueDate && task.taskStatus !== "Completed"
    && new Date(task.taskDueDate + "T23:59:59") < new Date();

  return (
    <Sidebar open={open} onClose={onClose} title="Task Details">
      <div style={{ margin:"-24px -24px 0", padding:"20px 24px 20px", borderLeft:`5px solid ${subjectColor}`, background:"#fafbfa", marginBottom:"8px" }}>
        <h2 style={{ margin:"0 0 8px", fontSize:"1.1rem", fontWeight:700, color:"#1a2e28", lineHeight:1.4 }}>
          {task.taskName}
        </h2>
        <div style={{ display:"flex", flexWrap:"wrap", gap:"6px" }}>
          <span style={{ display:"inline-flex", alignItems:"center", borderRadius:"999px", padding:"3px 10px", fontSize:"0.75rem", fontWeight:600,
            background:STATUS_BG[task.taskStatus]||"#f3f4f6", color:STATUS_COLORS[task.taskStatus]||"#6b7280" }}>
            {task.taskStatus}
          </span>
          <span style={{ display:"inline-flex", alignItems:"center", borderRadius:"999px", padding:"3px 10px", fontSize:"0.75rem", fontWeight:600,
            background:PRIORITY_BG[task.taskPriority]||"#f3f4f6", color:PRIORITY_COLORS[task.taskPriority]||"#6b7280" }}>
            {task.taskPriority} Priority
          </span>
        </div>
      </div>

      <div>
        {subject?.subjectName && (
          <DetailRow label="Subject">
            <span style={{ display:"inline-flex", padding:"3px 10px", borderRadius:"999px", fontSize:"0.82rem", fontWeight:600, color:"white", background:subjectColor }}>
              {subject.subjectName}
            </span>
          </DetailRow>
        )}

        {project?.projectName && (
          <DetailRow label="Project">
            <span style={{ display:"inline-flex", padding:"3px 10px", borderRadius:"999px", fontSize:"0.82rem", fontWeight:500, color:"#8E5B9F", background:"rgba(142,91,159,0.1)" }}>
              {project.projectName}
            </span>
          </DetailRow>
        )}

        {(task.taskStartDate || task.taskDueDate) && (
          <DetailRow label="Dates">
            <div style={{ display:"flex", flexDirection:"column", gap:"5px" }}>
              {task.taskStartDate && (
                <div style={{ display:"flex", gap:"8px", alignItems:"center" }}>
                  <span style={{ fontSize:"0.75rem", color:"#9ca3af", width:"38px" }}>Start</span>
                  <span style={{ fontWeight:500, color:"#374151" }}>{formatDateDisplay(task.taskStartDate, user?.dateFormat)}</span>
                </div>
              )}
              {task.taskDueDate && (
                <div style={{ display:"flex", gap:"8px", alignItems:"center" }}>
                  <span style={{ fontSize:"0.75rem", color:"#9ca3af", width:"38px" }}>Due</span>
                  <span style={{ fontWeight:600, color:isOverdue?"#F3161E":"#374151" }}>
                    {isOverdue ? "⚠ " : ""}{formatDateDisplay(task.taskDueDate, user?.dateFormat)}
                    {task.taskDueTime ? " at " + formatTimeDisplay(task.taskDueTime, user?.timeFormat) : ""}
                  </span>
                </div>
              )}
            </div>
          </DetailRow>
        )}

        <DetailRow label="Description">
          {task.taskDescription
            ? <p style={{ margin:0, lineHeight:1.7, color:"#374151", whiteSpace:"pre-wrap", wordBreak:"break-word", fontSize:"0.88rem" }}>{task.taskDescription}</p>
            : <span style={{ color:"#d1d5db", fontStyle:"italic", fontSize:"0.85rem" }}>No description provided</span>
          }
        </DetailRow>
      </div>

      <div style={{ display:"flex", gap:"10px", marginTop:"24px", paddingTop:"16px", borderTop:"1px solid #f0f4f2" }}>
        <button onClick={() => { onClose(); setTimeout(() => onEdit(task), 150); }}
          style={{ flex:1, padding:"0.65rem", borderRadius:"10px", background:"#355147", color:"white", border:"none", cursor:"pointer", fontWeight:600, fontSize:"0.875rem" }}>
          Edit Task
        </button>
        <button onClick={() => { onClose(); setTimeout(() => onDelete(task.taskId), 150); }}
          style={{ padding:"0.65rem 1rem", borderRadius:"10px", background:"rgba(243,22,30,0.07)", color:"#F3161E", border:"1px solid rgba(243,22,30,0.15)", cursor:"pointer", fontWeight:600, fontSize:"0.875rem" }}>
          Delete
        </button>
      </div>
    </Sidebar>
  );
}
