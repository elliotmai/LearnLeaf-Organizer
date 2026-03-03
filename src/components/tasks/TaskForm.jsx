import React, { useState, useEffect } from "react";
import Sidebar from "../ui/Sidebar.jsx";
import { editTask, addTask, addSubject, addProject, sortSubjects, sortProjects } from "../../LearnLeaf_Functions.jsx";

const EMPTY = { taskId:"", taskName:"", taskDescription:"", taskPriority:"Medium", taskStatus:"Not Started", taskSubject:"None", taskProject:"None", taskDueDate:"", taskDueTime:"", taskStartDate:"" };

export default function TaskForm({ open, onClose, task, subjects, projects, onSave, defaultSubjectId, defaultProjectId }) {
  const isEdit = !!task?.taskId;
  const [form, setForm] = useState({ ...EMPTY });
  const [errors, setErrors] = useState({});
  const [isNewSubject, setIsNewSubject] = useState(false);
  const [isNewProject, setIsNewProject] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState("");
  const [newProjectName, setNewProjectName] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      if (isEdit) {
        setForm({
          ...EMPTY, ...task,
          taskSubject: task.taskSubject?.subjectId || task.taskSubject || "None",
          taskProject: task.taskProject?.projectId || task.taskProject || "None",
        });
      } else {
        setForm({ ...EMPTY, taskSubject: defaultSubjectId || "None", taskProject: defaultProjectId || "None" });
      }
      setErrors({});
      setIsNewSubject(false);
      setIsNewProject(false);
      setNewSubjectName("");
      setNewProjectName("");
    }
  }, [open, task, isEdit, defaultSubjectId, defaultProjectId]);

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const validate = () => {
    const e = {};
    if (!form.taskName.trim()) e.taskName = "Task name is required";
    if (form.taskDueTime && !form.taskDueDate) e.taskDueDate = "Due date required when due time is set";
    if (isNewSubject && !newSubjectName.trim()) e.newSubject = "Subject name required";
    if (isNewProject && !newProjectName.trim()) e.newProject = "Project name required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      let data = { ...form };
      if (isNewSubject && newSubjectName.trim()) {
        const s = await addSubject({ subjectName: newSubjectName.trim(), subjectColor:"#355147" });
        data.taskSubject = s.subjectId;
      }
      if (isNewProject && newProjectName.trim()) {
        const p = await addProject({ projectName: newProjectName.trim(), projectSubjects:[] });
        data.taskProject = p.projectId;
      }
      let result;
      if (isEdit) {
        result = await editTask(data);
      } else {
        result = await addTask({ ...data, dueDateInput: data.taskDueDate, dueTimeInput: data.taskDueTime, startDateInput: data.taskStartDate });
      }
      onSave(result);
      onClose();
    } catch(e) { console.error(e); }
    finally { setSaving(false); }
  };

  const inputStyle = (err) => ({
    width:"100%", borderRadius:"10px", border:`1px solid ${err?"#F3161E":"#e5e9e8"}`,
    background:"white", padding:"0.6rem 0.85rem", fontSize:"0.875rem", color:"#1a2e28",
    outline:"none", transition:"border 150ms", boxSizing:"border-box"
  });

  const labelStyle = { display:"block", fontSize:"0.7rem", fontWeight:600, color:"#6b7280", textTransform:"uppercase", letterSpacing:"0.05em", marginBottom:"4px" };
  const errStyle = { fontSize:"0.75rem", color:"#F3161E", marginTop:"4px" };
  const rowStyle = { display:"grid", gridTemplateColumns:"1fr 1fr", gap:"12px" };

  return (
    <Sidebar open={open} onClose={onClose} title={isEdit ? "Edit Task" : "New Task"}>
      <div style={{ display:"flex",flexDirection:"column",gap:"16px" }}>
        <div>
          <label style={labelStyle}>Task Name *</label>
          <input style={inputStyle(errors.taskName)} value={form.taskName}
            onChange={e => set("taskName", e.target.value)} placeholder="What needs to be done?" />
          {errors.taskName && <p style={errStyle}>{errors.taskName}</p>}
        </div>

        <div>
          <label style={labelStyle}>Description</label>
          <textarea style={{ ...inputStyle(false), minHeight:"80px", resize:"vertical", lineHeight:1.5 }}
            value={form.taskDescription} onChange={e => set("taskDescription", e.target.value)}
            placeholder="Optional details..." />
        </div>

        <div style={rowStyle}>
          <div>
            <label style={labelStyle}>Priority</label>
            <select className="ll-select" style={inputStyle(false)} value={form.taskPriority} onChange={e => set("taskPriority", e.target.value)}>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>
          <div>
            <label style={labelStyle}>Status</label>
            <select className="ll-select" style={inputStyle(false)} value={form.taskStatus} onChange={e => set("taskStatus", e.target.value)}>
              <option value="Not Started">Not Started</option>
              <option value="In Progress">In Progress</option>
              <option value="Completed">Completed</option>
            </select>
          </div>
        </div>

        <div style={rowStyle}>
          <div>
            <label style={labelStyle}>Start Date</label>
            <input type="date" style={inputStyle(false)} value={form.taskStartDate} onChange={e => set("taskStartDate", e.target.value)} />
          </div>
          <div>
            <label style={labelStyle}>Due Date</label>
            <input type="date" style={inputStyle(errors.taskDueDate)} value={form.taskDueDate} onChange={e => { set("taskDueDate", e.target.value); setErrors(er => ({...er,taskDueDate:""})); }} />
            {errors.taskDueDate && <p style={errStyle}>{errors.taskDueDate}</p>}
          </div>
        </div>

        <div>
          <label style={labelStyle}>Due Time</label>
          <input type="time" style={inputStyle(false)} value={form.taskDueTime} onChange={e => set("taskDueTime", e.target.value)} />
        </div>

        <div>
          <label style={labelStyle}>Subject</label>
          <select className="ll-select" style={inputStyle(false)} value={isNewSubject ? "newSubject" : form.taskSubject}
            onChange={e => { if (e.target.value === "newSubject") { setIsNewSubject(true); set("taskSubject","None"); } else { setIsNewSubject(false); set("taskSubject", e.target.value); } }}>
            <option value="None">No Subject</option>
            {subjects.filter(s => s.subjectStatus === "Active").map(s => <option key={s.subjectId} value={s.subjectId}>{s.subjectName}</option>)}
            <option value="newSubject">+ New Subject</option>
          </select>
          {isNewSubject && (
            <input style={{ ...inputStyle(errors.newSubject), marginTop:"8px" }} placeholder="New subject name"
              value={newSubjectName} onChange={e => setNewSubjectName(e.target.value)} />
          )}
          {errors.newSubject && <p style={errStyle}>{errors.newSubject}</p>}
        </div>

        <div>
          <label style={labelStyle}>Project</label>
          <select className="ll-select" style={inputStyle(false)} value={isNewProject ? "newProject" : form.taskProject}
            onChange={e => { if (e.target.value === "newProject") { setIsNewProject(true); set("taskProject","None"); } else { setIsNewProject(false); set("taskProject", e.target.value); } }}>
            <option value="None">No Project</option>
            {projects.filter(p => p.projectStatus === "Active").map(p => <option key={p.projectId} value={p.projectId}>{p.projectName}</option>)}
            <option value="newProject">+ New Project</option>
          </select>
          {isNewProject && (
            <input style={{ ...inputStyle(errors.newProject), marginTop:"8px" }} placeholder="New project name"
              value={newProjectName} onChange={e => setNewProjectName(e.target.value)} />
          )}
          {errors.newProject && <p style={errStyle}>{errors.newProject}</p>}
        </div>

        <div style={{ display:"flex",gap:"12px",paddingTop:"8px",borderTop:"1px solid #f0f4f2",marginTop:"4px" }}>
          <button onClick={handleSave} disabled={saving}
            style={{ flex:1,padding:"0.75rem",borderRadius:"10px",background:"#355147",color:"white",border:"none",cursor:"pointer",fontWeight:600,fontSize:"0.9rem",opacity:saving?0.7:1 }}>
            {saving ? "Saving..." : (isEdit ? "Save Changes" : "Add Task")}
          </button>
          <button onClick={onClose} className="btn-secondary" style={{ padding:"0.75rem 1rem" }}>Cancel</button>
        </div>
      </div>
    </Sidebar>
  );
}
