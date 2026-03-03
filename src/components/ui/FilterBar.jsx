import React, { useState } from "react";

export default function FilterBar({ filterCriteria, onChange, onClear, subjects = [], projects = [], showProject = true }) {
  const [expanded, setExpanded] = useState(false);
  const hasFilters = Object.values(filterCriteria).some(v => v && v !== "");

  return (
    <div style={{ background:"white",borderRadius:"12px",border:"1px solid #f0f4f2",boxShadow:"0 2px 8px rgba(53,81,71,0.06)",marginBottom:"16px",overflow:"hidden" }}>
      <div style={{ padding:"12px 16px",display:"flex",alignItems:"center",gap:"12px",flexWrap:"wrap" }}>
        {/* Search */}
        <div style={{ flex:"1 1 200px",position:"relative" }}>
          <svg style={{ position:"absolute",left:"10px",top:"50%",transform:"translateY(-50%)",width:"16px",height:"16px",color:"#9ca3af" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z"/>
          </svg>
          <input
            className="ll-input"
            style={{ paddingLeft:"34px" }}
            placeholder="Search tasks..."
            value={filterCriteria.searchQuery || ""}
            onChange={e => onChange({ searchQuery: e.target.value })}
          />
        </div>

        {/* Quick filters */}
        <select className="ll-input ll-select" style={{ width:"auto",minWidth:"130px" }}
          value={filterCriteria.taskStatus || ""} onChange={e => onChange({ taskStatus: e.target.value })}>
          <option value="">All Status</option>
          <option value="Not Started">Not Started</option>
          <option value="In Progress">In Progress</option>
          <option value="Completed">Completed</option>
        </select>

        <select className="ll-input ll-select" style={{ width:"auto",minWidth:"120px" }}
          value={filterCriteria.taskPriority || ""} onChange={e => onChange({ taskPriority: e.target.value })}>
          <option value="">All Priority</option>
          <option value="High">High</option>
          <option value="Medium">Medium</option>
          <option value="Low">Low</option>
        </select>

        <button onClick={() => setExpanded(!expanded)}
          style={{ display:"flex",alignItems:"center",gap:"4px",padding:"8px 12px",borderRadius:"10px",border:"1px solid #e5e9e8",background:"none",cursor:"pointer",fontSize:"0.8rem",fontWeight:500,color:"#6b7280",whiteSpace:"nowrap" }}>
          <svg style={{ width:"14px",height:"14px" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h18M6 8h12M10 12h4"/>
          </svg>
          More {expanded ? "▲" : "▼"}
        </button>

        {hasFilters && (
          <button onClick={onClear}
            style={{ padding:"8px 12px",borderRadius:"10px",border:"none",background:"rgba(243,22,30,0.08)",color:"#F3161E",cursor:"pointer",fontSize:"0.8rem",fontWeight:500,whiteSpace:"nowrap" }}>
            Clear
          </button>
        )}
      </div>

      {expanded && (
        <div style={{ padding:"0 16px 16px",display:"flex",gap:"12px",flexWrap:"wrap",borderTop:"1px solid #f0f4f2",paddingTop:"12px" }}>
          {subjects.length > 0 && (
            <select className="ll-input ll-select" style={{ width:"auto",minWidth:"140px" }}
              value={filterCriteria.taskSubject || ""} onChange={e => onChange({ taskSubject: e.target.value })}>
              <option value="">All Subjects</option>
              {subjects.map(s => <option key={s.subjectId} value={s.subjectId}>{s.subjectName}</option>)}
            </select>
          )}
          {showProject && projects.length > 0 && (
            <select className="ll-input ll-select" style={{ width:"auto",minWidth:"140px" }}
              value={filterCriteria.taskProject || ""} onChange={e => onChange({ taskProject: e.target.value })}>
              <option value="">All Projects</option>
              {projects.map(p => <option key={p.projectId} value={p.projectId}>{p.projectName}</option>)}
            </select>
          )}
          <div style={{ display:"flex",alignItems:"center",gap:"8px" }}>
            <select className="ll-input ll-select" style={{ width:"auto" }}
              value={filterCriteria.taskDueDateComparison || ""} onChange={e => onChange({ taskDueDateComparison: e.target.value })}>
              <option value="">Due Date</option>
              <option value="before">Before</option>
              <option value="before-equal">On or Before</option>
              <option value="equal">On</option>
              <option value="after">After</option>
              <option value="after-equal">On or After</option>
            </select>
            <input type="date" className="ll-input" style={{ width:"auto" }}
              value={filterCriteria.taskDueDate || ""} onChange={e => onChange({ taskDueDate: e.target.value })} />
          </div>
        </div>
      )}
    </div>
  );
}
