import React, { useState, useEffect, useCallback } from "react";
import { useParams } from "react-router-dom";
import { useUser } from "../UserState.jsx";
import { getAllFromStore } from "../db.js";
import { deleteTask, editTask, sortTasks } from "../LearnLeaf_Functions.jsx";
import TopBar from "../components/layout/TopBar.jsx";
import TaskCard from "../components/tasks/TaskCard.jsx";
import TaskForm from "../components/tasks/TaskForm.jsx";
import TaskDetailPanel from "../components/tasks/TaskDetailPanel.jsx";
import FilterBar from "../components/ui/FilterBar.jsx";
import LoadingSpinner from "../components/ui/LoadingSpinner.jsx";
import ConfirmDialog from "../components/ui/ConfirmDialog.jsx";
import Toast from "../components/ui/Toast.jsx";

const EMPTY_FILTER = { searchQuery:"", taskStatus:"", taskPriority:"", taskDueDate:"", taskDueDateComparison:"" };

export default function SubjectTasksPage() {
  const { subjectId } = useParams();
  const { user, dataVersion } = useUser();
  const [tasks, setTasks] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [projects, setProjects] = useState([]);
  const [subject, setSubject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ ...EMPTY_FILTER });
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [detailTask, setDetailTask] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [toast, setToast] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [allTasks, allSubjects, allProjects] = await Promise.all([getAllFromStore("tasks"),getAllFromStore("subjects"),getAllFromStore("projects")]);
    const subj = allSubjects.find(s => s.subjectId === subjectId);
    setSubject(subj||null);
    const active = allTasks.filter(t => t.taskStatus !== "Completed" && t.taskSubject === subjectId);
    const resolved = active.map(t => ({
      ...t,
      taskSubject: allSubjects.find(s => s.subjectId===t.taskSubject)||null,
      taskProject: allProjects.find(p => p.projectId===t.taskProject)||null,
    }));
    setTasks(sortTasks(resolved));
    setSubjects(allSubjects.filter(s => s.subjectStatus==="Active"));
    setProjects(allProjects.filter(p => p.projectStatus==="Active"));
    setLoading(false);
  }, [subjectId]);

  useEffect(() => { if (user?.id) load(); }, [user, load, dataVersion]);

  const filtered = tasks.filter(t => {
    if (filter.searchQuery && !t.taskName.toLowerCase().includes(filter.searchQuery.toLowerCase())) return false;
    if (filter.taskStatus && t.taskStatus !== filter.taskStatus) return false;
    if (filter.taskPriority && t.taskPriority !== filter.taskPriority) return false;
    return true;
  });

  const handleSave = async () => { await load(); setToast({ message: editingTask?"Task updated!":"Task added!", type:"success" }); };
  const handleStatusChange = async (taskId, newStatus) => {
    const task = tasks.find(t => t.taskId===taskId);
    if (!task) return;
    await editTask({ ...task, taskSubject:task.taskSubject?.subjectId||"None", taskProject:task.taskProject?.projectId||"None", taskStatus:newStatus });
    setTasks(prev => sortTasks(prev.filter(t => t.taskId!==taskId || newStatus!=="Completed").map(t => t.taskId===taskId ? {...t,taskStatus:newStatus} : t)));
  };
  const handleDeleteConfirm = async () => {
    await deleteTask(deleteTarget);
    setTasks(prev => prev.filter(t => t.taskId!==deleteTarget));
    setDeleteTarget(null);
  };

  return (
    <div style={{ display:"flex",flexDirection:"column",minHeight:"100vh" }}>
      <TopBar />
      <main style={{ flex:1,maxWidth:"1280px",margin:"0 auto",width:"100%",padding:"24px 24px 80px",boxSizing:"border-box" }}>
        <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"20px",flexWrap:"wrap",gap:"12px" }}>
          <div>
            {subject && <div style={{ width:"12px",height:"12px",borderRadius:"50%",background:subject.subjectColor||"#355147",display:"inline-block",marginRight:"8px" }}/>}
            <h1 style={{ fontFamily:"Playfair Display,serif",fontSize:"1.6rem",fontWeight:700,color:"#907474",margin:"0 0 2px",display:"inline" }}>
              {subject ? subject.subjectName : "Subject Tasks"}
            </h1>
            {subject?.subjectSemester && <span style={{ marginLeft:"8px",fontSize:"0.85rem",color:"#9F6C5B",fontWeight:500 }}>{subject.subjectSemester}</span>}
            <p style={{ color:"#9ca3af",fontSize:"0.85rem",margin:"4px 0 0" }}>{filtered.length} active task{filtered.length!==1?"s":""}</p>
          </div>
          <button onClick={() => { setEditingTask(null); setSidebarOpen(true); }}
            style={{ padding:"10px 18px",borderRadius:"12px",background:"#355147",color:"white",border:"none",cursor:"pointer",fontWeight:600,fontSize:"0.875rem",boxShadow:"0 2px 8px rgba(53,81,71,0.25)",whiteSpace:"nowrap" }}>
            + New Task
          </button>
        </div>

        <FilterBar filterCriteria={filter} onChange={u => setFilter(f => ({...f,...u}))} onClear={() => setFilter({ ...EMPTY_FILTER })} subjects={subjects} projects={projects} showProject />

        {loading ? <LoadingSpinner /> : filtered.length === 0 ? (
          <div style={{ textAlign:"center",padding:"60px",color:"#9ca3af" }}>
            <p>{tasks.length === 0 ? "No tasks for this subject yet." : "No tasks match your filters"}</p>
          </div>
        ) : (
          <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(min(100%,280px),1fr))",gap:"12px" }}>
            {filtered.map(task => (
              <TaskCard key={task.taskId} task={task}
                onEdit={t => { setEditingTask(t); setSidebarOpen(true); }}
                onDelete={id => setDeleteTarget(id)}
                onStatusChange={handleStatusChange}
                onViewDetails={t => { setDetailTask(t); setDetailOpen(true); }} />
            ))}
          </div>
        )}
      </main>
      <TaskForm open={sidebarOpen} onClose={() => setSidebarOpen(false)} task={editingTask} subjects={subjects} projects={projects} onSave={handleSave} defaultSubjectId={subjectId} />
      <TaskDetailPanel open={detailOpen} onClose={() => setDetailOpen(false)} task={detailTask}
        onEdit={t => { setDetailOpen(false); setTimeout(() => { setEditingTask(t); setSidebarOpen(true); }, 150); }}
        onDelete={id => { setDetailOpen(false); setTimeout(() => setDeleteTarget(id), 150); }} />
      <ConfirmDialog open={!!deleteTarget} title="Delete Task" message="Permanently delete this task?" onConfirm={handleDeleteConfirm} onCancel={() => setDeleteTarget(null)} confirmLabel="Delete" confirmDanger />
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
