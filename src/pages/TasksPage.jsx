import React, { useState, useEffect, useCallback, useMemo } from "react";
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

function applyFilters(tasks, f) {
  return tasks.filter(t => {
    if (f.searchQuery && !`${t.taskName} ${t.taskDescription || ""} ${t.taskSubject?.subjectName || ""} ${t.taskProject?.projectName || ""}`.toLowerCase().includes(f.searchQuery.toLowerCase())) return false;
    if (f.taskStatus && t.taskStatus !== f.taskStatus) return false;
    if (f.taskPriority && t.taskPriority !== f.taskPriority) return false;
    if (f.taskSubject && (t.taskSubject?.subjectId || t.taskSubject) !== f.taskSubject) return false;
    if (f.taskProject && (t.taskProject?.projectId || t.taskProject) !== f.taskProject) return false;
    if (f.taskDueDate && f.taskDueDateComparison) {
      if (!t.taskDueDate) return false;
      const td = new Date(t.taskDueDate), fd = new Date(f.taskDueDate);
      if (f.taskDueDateComparison === "before" && !(td < fd)) return false;
      if (f.taskDueDateComparison === "before-equal" && !(td <= fd)) return false;
      if (f.taskDueDateComparison === "equal" && !(td.toDateString() === fd.toDateString())) return false;
      if (f.taskDueDateComparison === "after" && !(td > fd)) return false;
      if (f.taskDueDateComparison === "after-equal" && !(td >= fd)) return false;
    }
    return true;
  });
}

const EMPTY_FILTER = { searchQuery: "", taskStatus: "", taskPriority: "", taskSubject: "", taskProject: "", taskDueDate: "", taskDueDateComparison: "" };

export default function TasksPage() {
  const { user, dataVersion } = useUser();
  const [tasks, setTasks] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [projects, setProjects] = useState([]);
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
    const [allTasks, allSubjects, allProjects] = await Promise.all([
      getAllFromStore("tasks"), getAllFromStore("subjects"), getAllFromStore("projects")
    ]);
    const active = allTasks.filter(t => t.taskStatus !== "Completed");
    const resolved = active.map(t => ({
      ...t,
      taskSubject: allSubjects.find(s => s.subjectId === t.taskSubject) || (typeof t.taskSubject === "object" ? t.taskSubject : null),
      taskProject: allProjects.find(p => p.projectId === t.taskProject) || (typeof t.taskProject === "object" ? t.taskProject : null),
    }));
    setTasks(sortTasks(resolved));
    setSubjects(allSubjects.filter(s => s.subjectStatus === "Active"));
    setProjects(allProjects.filter(p => p.projectStatus === "Active"));
    setLoading(false);
  }, []);

  useEffect(() => { if (user?.id) load(); }, [user, load, dataVersion]);

  const filtered = useMemo(() => applyFilters(tasks, filter), [tasks, filter]);

  const handleFilterChange = (updates) => setFilter(f => ({ ...f, ...updates }));
  const clearFilters = () => setFilter({ ...EMPTY_FILTER });

  const handleEdit = (task) => { setEditingTask(task); setSidebarOpen(true); };
  const handleAdd = () => { setEditingTask(null); setSidebarOpen(true); };
  const handleViewDetails = (task) => { setDetailTask(task); setDetailOpen(true); };

  const handleSave = async () => {
    await load();
    setToast({ message: editingTask ? "Task updated!" : "Task added!", type: "success" });
  };

  const handleStatusChange = async (taskId, newStatus) => {
    const task = tasks.find(t => t.taskId === taskId);
    if (!task) return;
    await editTask({ ...task, taskSubject: task.taskSubject?.subjectId || task.taskSubject || "None", taskProject: task.taskProject?.projectId || task.taskProject || "None", taskStatus: newStatus });
    setTasks(prev => sortTasks(prev.filter(t => t.taskId !== taskId || newStatus !== "Completed").map(t => t.taskId === taskId ? { ...t, taskStatus: newStatus } : t)));
  };

  const handleDeleteConfirm = async () => {
    await deleteTask(deleteTarget);
    setTasks(prev => prev.filter(t => t.taskId !== deleteTarget));
    setDeleteTarget(null);
    setToast({ message: "Task deleted", type: "info" });
  };

  const today = new Date().toLocaleDateString("en-CA");
  const tomorrow = new Date(Date.now() + 86400000).toLocaleDateString("en-CA");
  const groups = [
    { label: "Overdue", tasks: filtered.filter(t => t.taskDueDate && t.taskDueDate < today), color: "#F3161E" },
    { label: "Today", tasks: filtered.filter(t => t.taskDueDate === today), color: "#355147" },
    { label: "Tomorrow", tasks: filtered.filter(t => t.taskDueDate === tomorrow), color: "#5B8E9F" },
    { label: "Upcoming", tasks: filtered.filter(t => t.taskDueDate && t.taskDueDate > tomorrow), color: "#8E5B9F" },
    { label: "No Due Date", tasks: filtered.filter(t => !t.taskDueDate), color: "#907474" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <TopBar />
      <main style={{ flex: 1, maxWidth: "1280px", margin: "0 auto", width: "100%", padding: "24px 24px 80px", boxSizing: "border-box" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px", gap: "12px", flexWrap: "wrap" }}>
          <div>
            <h1 style={{ fontFamily: "Playfair Display,serif", fontSize: "1.6rem", fontWeight: 700, color: "#907474", margin: "0 0 2px" }}>
              {user?.name ? `${user.name}'s Tasks` : "Tasks"}
            </h1>
            <p style={{ color: "#9ca3af", fontSize: "0.85rem", margin: 0 }}>
              {filtered.length} active task{filtered.length !== 1 ? "s" : ""}
            </p>
          </div>
          <button onClick={handleAdd}
            style={{ display: "flex", alignItems: "center", gap: "6px", padding: "10px 18px", borderRadius: "12px", background: "#355147", color: "white", border: "none", cursor: "pointer", fontWeight: 600, fontSize: "0.875rem", boxShadow: "0 2px 8px rgba(53,81,71,0.25)", whiteSpace: "nowrap" }}>
            + New Task
          </button>
        </div>

        <FilterBar filterCriteria={filter} onChange={handleFilterChange} onClear={clearFilters} subjects={subjects} projects={projects} />

        {loading ? <LoadingSpinner /> : (
          filtered.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px 20px", color: "#9ca3af" }}>
              <div style={{ fontSize: "48px", marginBottom: "12px" }}>✓</div>
              <p style={{ fontSize: "1rem", fontWeight: 500 }}>
                {tasks.length === 0 ? "No tasks yet — add one to get started!" : "No tasks match your filters"}
              </p>
            </div>
          ) : (
            <div>
              {groups.filter(g => g.tasks.length > 0).map(group => (
                <div key={group.label} style={{ marginBottom: "28px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
                    <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: group.color, flexShrink: 0 }} />
                    <h2 style={{ margin: 0, fontSize: "0.85rem", fontWeight: 700, color: group.color, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                      {group.label}
                    </h2>
                    <span style={{ fontSize: "0.75rem", color: "#9ca3af", fontWeight: 500 }}>({group.tasks.length})</span>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(min(100%,280px),1fr))", gap: "12px" }}>
                    {group.tasks.map(task => (
                      <TaskCard key={task.taskId} task={task}
                        onEdit={handleEdit}
                        onDelete={id => setDeleteTarget(id)}
                        onStatusChange={handleStatusChange}
                        onViewDetails={handleViewDetails} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </main>

      <TaskForm open={sidebarOpen} onClose={() => setSidebarOpen(false)}
        task={editingTask} subjects={subjects} projects={projects} onSave={handleSave} />

      <TaskDetailPanel open={detailOpen} onClose={() => setDetailOpen(false)}
        task={detailTask}
        onEdit={handleEdit}
        onDelete={id => setDeleteTarget(id)} />

      <ConfirmDialog open={!!deleteTarget} title="Delete Task"
        message="Are you sure you want to permanently delete this task?"
        onConfirm={handleDeleteConfirm} onCancel={() => setDeleteTarget(null)}
        confirmLabel="Delete" confirmDanger />

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
