import React, { useState, useEffect, useCallback } from "react";
import { Calendar, dateFnsLocalizer } from "react-big-calendar";
import { format, parse, startOfWeek, getDay } from "date-fns";
import { enUS } from "date-fns/locale";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { useUser } from "../UserState.jsx";
import { getAllFromStore } from "../db.js";
import { editTask, deleteTask, sortTasks } from "../LearnLeaf_Functions.jsx";
import TopBar from "../components/layout/TopBar.jsx";
import TaskForm from "../components/tasks/TaskForm.jsx";
import LoadingSpinner from "../components/ui/LoadingSpinner.jsx";
import ConfirmDialog from "../components/ui/ConfirmDialog.jsx";
import Toast from "../components/ui/Toast.jsx";

const localizer = dateFnsLocalizer({ format, parse, startOfWeek: () => startOfWeek(new Date(),{weekStartsOn:0}), getDay, locales:{en:enUS} });

export default function CalendarPage() {
  const { user } = useUser();
  const [events, setEvents]   = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [toast, setToast] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [allTasks, allSubjects, allProjects] = await Promise.all([getAllFromStore("tasks"),getAllFromStore("subjects"),getAllFromStore("projects")]);
    const active = allTasks.filter(t => t.taskStatus!=="Completed" && t.taskDueDate);
    const evts = active.map(t => {
      const subject = allSubjects.find(s => s.subjectId===t.taskSubject);
      const project = allProjects.find(p => p.projectId===t.taskProject);
      return {
        id: t.taskId,
        title: t.taskName,
        start: new Date(`${t.taskDueDate}T${t.taskDueTime||"23:59"}:00`),
        end:   new Date(`${t.taskDueDate}T${t.taskDueTime||"23:59"}:00`),
        allDay: !t.taskDueTime,
        task: { ...t, taskSubject:subject||null, taskProject:project||null },
        color: subject?.subjectColor || "#355147",
      };
    });
    setEvents(evts);
    setSubjects(allSubjects.filter(s => s.subjectStatus==="Active"));
    setProjects(allProjects.filter(p => p.projectStatus==="Active"));
    setLoading(false);
  }, []);

  useEffect(() => { if (user?.id) load(); }, [user, load]);

  const handleEventClick = ({ task }) => { setEditingTask(task); setSidebarOpen(true); };

  const eventStyle = (event) => ({
    style: { backgroundColor: event.color, borderRadius:"6px", border:"none", color:"white", fontSize:"0.75rem", padding:"2px 5px" }
  });

  const handleSave = async () => { await load(); setToast({ message:"Task updated!", type:"success" }); };

  const handleDeleteConfirm = async () => {
    await deleteTask(deleteTarget);
    setDeleteTarget(null);
    await load();
    setToast({ message:"Task deleted", type:"info" });
  };

  return (
    <div style={{ display:"flex",flexDirection:"column",minHeight:"100vh" }}>
      <TopBar />
      <main style={{ flex:1,maxWidth:"1280px",margin:"0 auto",width:"100%",padding:"24px 24px 80px",boxSizing:"border-box" }}>
        <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"20px",flexWrap:"wrap",gap:"12px" }}>
          <div>
            <h1 style={{ fontFamily:"Playfair Display,serif",fontSize:"1.6rem",fontWeight:700,color:"#907474",margin:"0 0 2px" }}>Calendar</h1>
            <p style={{ color:"#9ca3af",fontSize:"0.85rem",margin:0 }}>Click any task to edit it</p>
          </div>
          <button onClick={() => { setEditingTask(null); setSidebarOpen(true); }}
            style={{ padding:"10px 18px",borderRadius:"12px",background:"#355147",color:"white",border:"none",cursor:"pointer",fontWeight:600,fontSize:"0.875rem",boxShadow:"0 2px 8px rgba(53,81,71,0.25)" }}>
            + New Task
          </button>
        </div>

        {loading ? <LoadingSpinner /> : (
          <div className="ll-card" style={{ padding:"20px",height:"620px" }}>
            <Calendar
              localizer={localizer}
              events={events}
              startAccessor="start"
              endAccessor="end"
              style={{ height:"100%" }}
              eventPropGetter={eventStyle}
              onSelectEvent={handleEventClick}
              views={["month","week","agenda"]}
              defaultView="month"
              popup
            />
          </div>
        )}
      </main>
      <TaskForm open={sidebarOpen} onClose={() => setSidebarOpen(false)} task={editingTask} subjects={subjects} projects={projects} onSave={handleSave} />
      <ConfirmDialog open={!!deleteTarget} title="Delete Task" message="Permanently delete this task?"
        onConfirm={handleDeleteConfirm} onCancel={() => setDeleteTarget(null)} confirmLabel="Delete" confirmDanger />
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
