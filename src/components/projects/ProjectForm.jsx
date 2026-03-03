import React, { useState, useEffect } from "react";
import Sidebar from "../ui/Sidebar.jsx";
import { addProject, editProject } from "../../LearnLeaf_Functions.jsx";

const EMPTY = { projectName:"", projectDescription:"", projectSubjects:[], projectDueDate:"", projectDueTime:"", projectStatus:"Active" };

export default function ProjectForm({ open, onClose, project, subjects, onSave }) {
  const isEdit = !!project?.projectId;
  const [form, setForm] = useState({ ...EMPTY });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      if (isEdit) {
        const subs = (project.projectSubjects||[]).map(s => typeof s==="string" ? s : s?.subjectId).filter(Boolean);
        setForm({ ...EMPTY, ...project, projectSubjects: subs });
      } else { setForm({ ...EMPTY }); }
      setErrors({});
    }
  }, [open, project, isEdit]);

  const set = (k,v) => setForm(f => ({...f,[k]:v}));

  const toggleSubject = (id) => {
    setForm(f => ({
      ...f,
      projectSubjects: f.projectSubjects.includes(id)
        ? f.projectSubjects.filter(s => s!==id)
        : [...f.projectSubjects, id]
    }));
  };

  const handleSave = async () => {
    if (!form.projectName.trim()) { setErrors({projectName:"Project name is required"}); return; }
    setSaving(true);
    try {
      if (isEdit) await editProject(form);
      else await addProject({ ...form, projectDueDateInput: form.projectDueDate, projectDueTimeInput: form.projectDueTime });
      onSave();
      onClose();
    } catch(e) { console.error(e); }
    finally { setSaving(false); }
  };

  const inp = (err) => ({ width:"100%",borderRadius:"10px",border:`1px solid ${err?"#F3161E":"#e5e9e8"}`,background:"white",padding:"0.6rem 0.85rem",fontSize:"0.875rem",color:"#1a2e28",outline:"none",boxSizing:"border-box" });
  const lab = { display:"block",fontSize:"0.7rem",fontWeight:600,color:"#6b7280",textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:"4px" };

  const activeSubjects = subjects.filter(s => s.subjectStatus==="Active").sort((a, b) => a.subjectName.localeCompare(b.subjectName));

  return (
    <Sidebar open={open} onClose={onClose} title={isEdit ? "Edit Project" : "New Project"}>
      <div style={{ display:"flex",flexDirection:"column",gap:"16px" }}>
        <div>
          <label style={lab}>Project Name *</label>
          <input style={inp(errors.projectName)} value={form.projectName} onChange={e => set("projectName",e.target.value)} placeholder="e.g. Research Paper" />
          {errors.projectName && <p style={{ fontSize:"0.75rem",color:"#F3161E",marginTop:"4px" }}>{errors.projectName}</p>}
        </div>

        <div>
          <label style={lab}>Description</label>
          <textarea style={{ ...inp(false),minHeight:"80px",resize:"vertical",lineHeight:1.5 }}
            value={form.projectDescription} onChange={e => set("projectDescription",e.target.value)} placeholder="Project goals, scope, notes..." />
        </div>

        <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:"12px" }}>
          <div>
            <label style={lab}>Due Date</label>
            <input type="date" style={inp(false)} value={form.projectDueDate} onChange={e => set("projectDueDate",e.target.value)} />
          </div>
          <div>
            <label style={lab}>Due Time</label>
            <input type="time" style={inp(false)} value={form.projectDueTime} onChange={e => set("projectDueTime",e.target.value)} />
          </div>
        </div>

        {activeSubjects.length > 0 && (
          <div>
            <label style={lab}>Linked Subjects</label>
            <div style={{ display:"flex",flexWrap:"wrap",gap:"8px" }}>
              {activeSubjects.map(s => {
                const selected = form.projectSubjects.includes(s.subjectId);
                return (
                  <button key={s.subjectId} onClick={() => toggleSubject(s.subjectId)}
                    style={{ padding:"5px 12px",borderRadius:"999px",fontSize:"0.78rem",fontWeight:500,border:"2px solid",cursor:"pointer",transition:"all 150ms",
                      borderColor: selected ? s.subjectColor||"#355147" : "#e5e9e8",
                      background: selected ? (s.subjectColor||"#355147") : "white",
                      color: selected ? "white" : "#6b7280" }}>
                    {s.subjectName}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div style={{ display:"flex",gap:"12px",paddingTop:"8px",borderTop:"1px solid #f0f4f2" }}>
          <button onClick={handleSave} disabled={saving}
            style={{ flex:1,padding:"0.75rem",borderRadius:"10px",background:"#355147",color:"white",border:"none",cursor:"pointer",fontWeight:600,fontSize:"0.9rem",opacity:saving?0.7:1 }}>
            {saving ? "Saving..." : (isEdit ? "Save Changes" : "Add Project")}
          </button>
          <button onClick={onClose} className="btn-secondary" style={{ padding:"0.75rem 1rem" }}>Cancel</button>
        </div>
      </div>
    </Sidebar>
  );
}
