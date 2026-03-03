import React, { useState } from "react";
import { formatDateDisplay, formatTimeDisplay } from "../../LearnLeaf_Functions.jsx";
import { useUser } from "../../UserState.jsx";

const STATUS_COLORS = { "Not Started":"#6b7280", "In Progress":"#3d6e7d", "Completed":"#355147" };
const STATUS_BG     = { "Not Started":"#f3f4f6", "In Progress":"rgba(91,142,159,0.12)", "Completed":"rgba(53,81,71,0.1)" };
const PRIORITY_COLORS = { High:"#c01018", Medium:"#7d5244", Low:"#355147" };
const PRIORITY_BG     = { High:"rgba(243,22,30,0.1)", Medium:"rgba(159,108,91,0.12)", Low:"rgba(182,205,200,0.3)" };

export default function TaskCard({ task, onEdit, onDelete, onStatusChange, onViewDetails }) {
  const { user } = useUser();
  const [statusChanging, setStatusChanging] = useState(false);

  const subject = task.taskSubject;
  const project = task.taskProject;
  const subjectColor = subject?.subjectColor || "#355147";

  const isOverdue = task.taskDueDate && task.taskStatus !== "Completed"
    && new Date(task.taskDueDate + "T23:59:59") < new Date();

  const handleStatusCycle = async (e) => {
    e.stopPropagation();
    if (statusChanging) return;
    const cycle = { "Not Started":"In Progress", "In Progress":"Completed", "Completed":"Not Started" };
    setStatusChanging(true);
    await onStatusChange(task.taskId, cycle[task.taskStatus] || "Not Started");
    setStatusChanging(false);
  };

  return (
    <div className="ll-card" style={{ padding:"16px",display:"flex",flexDirection:"column",gap:"10px",position:"relative" }}>
      {/* Subject color bar */}
      <div style={{ position:"absolute",top:0,left:0,bottom:0,width:"4px",borderRadius:"12px 0 0 12px",background:subjectColor }}/>

      <div style={{ paddingLeft:"8px" }}>
        {/* Header */}
        <div style={{ display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:"8px",marginBottom:"6px" }}>
          {/* Clickable task name */}
          <button onClick={() => onViewDetails && onViewDetails(task)}
            style={{ background:"none",border:"none",cursor:onViewDetails?"pointer":"default",textAlign:"left",padding:0,flex:1 }}>
            <h3
              style={{ margin:0,fontSize:"0.9rem",fontWeight:600,color:"#1a2e28",lineHeight:1.3,transition:"color 150ms" }}
              onMouseEnter={e => { if (onViewDetails) e.currentTarget.style.color = subjectColor; }}
              onMouseLeave={e => { e.currentTarget.style.color = "#1a2e28"; }}>
              {task.taskName}
            </h3>
          </button>
          <div style={{ display:"flex",gap:"4px",flexShrink:0 }}>
            <button onClick={(e) => { e.stopPropagation(); onEdit(task); }} title="Edit"
              style={{ width:"28px",height:"28px",borderRadius:"8px",border:"none",background:"transparent",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",color:"#9F6C5B",fontSize:"14px",transition:"all 150ms" }}
              onMouseEnter={e => e.currentTarget.style.background="#f3f4f6"}
              onMouseLeave={e => e.currentTarget.style.background="transparent"}>
              ✎
            </button>
            <button onClick={(e) => { e.stopPropagation(); onDelete(task.taskId); }} title="Delete"
              style={{ width:"28px",height:"28px",borderRadius:"8px",border:"none",background:"transparent",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",color:"#F3161E",fontSize:"14px",transition:"all 150ms" }}
              onMouseEnter={e => e.currentTarget.style.background="rgba(243,22,30,0.08)"}
              onMouseLeave={e => e.currentTarget.style.background="transparent"}>
              ✕
            </button>
          </div>
        </div>

        {/* Meta row */}
        <div style={{ display:"flex",flexWrap:"wrap",gap:"6px",alignItems:"center",marginBottom:"8px" }}>
          {/* Status chip (clickable) */}
          <button onClick={handleStatusCycle} title="Click to change status"
            style={{ display:"inline-flex",alignItems:"center",borderRadius:"999px",padding:"2px 8px",fontSize:"0.7rem",fontWeight:600,border:"none",cursor:"pointer",transition:"all 150ms",
              background:STATUS_BG[task.taskStatus]||"#f3f4f6",
              color:STATUS_COLORS[task.taskStatus]||"#6b7280" }}>
            {task.taskStatus}
          </button>

          {/* Priority */}
          <span style={{ display:"inline-flex",alignItems:"center",borderRadius:"999px",padding:"2px 8px",fontSize:"0.7rem",fontWeight:600,
            background:PRIORITY_BG[task.taskPriority]||"#f3f4f6",
            color:PRIORITY_COLORS[task.taskPriority]||"#6b7280" }}>
            {task.taskPriority}
          </span>

          {/* Due date */}
          {task.taskDueDate && (
            <span style={{ fontSize:"0.72rem",color:isOverdue?"#F3161E":"#6b7280",fontWeight:isOverdue?600:400,display:"flex",alignItems:"center",gap:"3px" }}>
              {isOverdue ? "⚠ " : ""}
              Due {formatDateDisplay(task.taskDueDate, user?.dateFormat)}
              {task.taskDueTime ? " " + formatTimeDisplay(task.taskDueTime, user?.timeFormat) : ""}
            </span>
          )}
        </div>

        {/* Subject & Project */}
        <div style={{ display:"flex",flexWrap:"wrap",gap:"6px" }}>
          {subject && subject.subjectName && (
            <span style={{ fontSize:"0.72rem",padding:"2px 8px",borderRadius:"999px",fontWeight:500,color:"white",background:subjectColor }}>
              {subject.subjectName}
            </span>
          )}
          {project && project.projectName && (
            <span style={{ fontSize:"0.72rem",padding:"2px 8px",borderRadius:"999px",fontWeight:500,color:"#8E5B9F",background:"rgba(142,91,159,0.1)" }}>
              {project.projectName}
            </span>
          )}
        </div>

        {/* Description preview */}
        {task.taskDescription && (
          <p style={{ margin:"6px 0 0",fontSize:"0.78rem",color:"#9ca3af",lineHeight:1.4,display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical",overflow:"hidden" }}>
            {task.taskDescription}
          </p>
        )}
      </div>
    </div>
  );
}
