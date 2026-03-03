import React, { useState, useEffect, useCallback } from "react";
import { useUser } from "../UserState.jsx";
import { getAllFromStore } from "../db.js";
import { deleteTask, deleteSubject, deleteProject, reactivateSubject, reactivateProject, sortTasks, sortSubjects, sortProjects, formatDateDisplay } from "../LearnLeaf_Functions.jsx";
import TopBar from "../components/layout/TopBar.jsx";
import LoadingSpinner from "../components/ui/LoadingSpinner.jsx";
import ConfirmDialog from "../components/ui/ConfirmDialog.jsx";
import Toast from "../components/ui/Toast.jsx";

const SectionHeader = ({ title, count, open, onToggle, color }) => (
  <button onClick={onToggle} style={{ width:"100%",display:"flex",alignItems:"center",justifyContent:"space-between",padding:"16px 20px",background:"white",border:"none",cursor:"pointer",borderRadius:"12px",boxShadow:"0 1px 6px rgba(53,81,71,0.06)" }}>
    <div style={{ display:"flex",alignItems:"center",gap:"10px" }}>
      <span style={{ width:"10px",height:"10px",borderRadius:"50%",background:color,flexShrink:0 }}/>
      <span style={{ fontFamily:"Playfair Display,serif",fontWeight:700,fontSize:"1rem",color }}>{title}</span>
      <span style={{ fontSize:"0.78rem",background:"#f3f4f6",color:"#6b7280",borderRadius:"999px",padding:"2px 8px",fontWeight:500 }}>{count}</span>
    </div>
    <span style={{ color:"#9ca3af",fontSize:"1.2rem",transition:"transform 200ms",transform:open?"rotate(180deg)":"none" }}>⌄</span>
  </button>
);

export default function ArchivePage() {
  const { user } = useUser();
  const [completedTasks, setCompletedTasks] = useState([]);
  const [archivedSubjects, setArchivedSubjects] = useState([]);
  const [archivedProjects, setArchivedProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openSections, setOpenSections] = useState({ tasks:true, subjects:false, projects:false });
  const [deleteInfo, setDeleteInfo] = useState(null);
  const [toast, setToast] = useState(null);
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const [allTasks, allSubjects, allProjects] = await Promise.all([getAllFromStore("tasks"),getAllFromStore("subjects"),getAllFromStore("projects")]);
    const completed = allTasks.filter(t => t.taskStatus==="Completed").map(t => ({
      ...t,
      taskSubject: allSubjects.find(s => s.subjectId===t.taskSubject)||null,
      taskProject: allProjects.find(p => p.projectId===t.taskProject)||null,
    }));
    setCompletedTasks(sortTasks(completed));
    setArchivedSubjects(sortSubjects(allSubjects.filter(s => s.subjectStatus==="Archived")));
    setArchivedProjects(sortProjects(allProjects.filter(p => p.projectStatus==="Archived")));
    setLoading(false);
  }, []);

  useEffect(() => { if (user?.id) load(); }, [user, load]);

  const toggle = (k) => setOpenSections(s => ({...s,[k]:!s[k]}));

  const filteredTasks    = completedTasks.filter(t => !search || t.taskName.toLowerCase().includes(search.toLowerCase()));
  const filteredSubjects = archivedSubjects.filter(s => !search || s.subjectName.toLowerCase().includes(search.toLowerCase()));
  const filteredProjects = archivedProjects.filter(p => !search || p.projectName.toLowerCase().includes(search.toLowerCase()));

  const handleConfirm = async () => {
    const { type, id } = deleteInfo;
    if (type==="task") await deleteTask(id);
    else if (type==="subject") await deleteSubject(id);
    else if (type==="project") await deleteProject(id);
    setDeleteInfo(null);
    await load();
    setToast({ message:"Deleted", type:"info" });
  };

  const handleReactivate = async (type, id) => {
    if (type==="subject") await reactivateSubject(id);
    else if (type==="project") await reactivateProject(id);
    await load();
    setToast({ message:"Reactivated!", type:"success" });
  };

  const cell = { padding:"10px 12px",fontSize:"0.82rem",color:"#374151",borderBottom:"1px solid #f0f4f2",verticalAlign:"middle" };
  const th   = { ...cell,fontWeight:600,color:"#6b7280",fontSize:"0.75rem",textTransform:"uppercase",letterSpacing:"0.04em",background:"#f8faf9" };

  return (
    <div style={{ display:"flex",flexDirection:"column",minHeight:"100vh" }}>
      <TopBar />
      <main style={{ flex:1,maxWidth:"1280px",margin:"0 auto",width:"100%",padding:"24px 24px 80px",boxSizing:"border-box" }}>
        <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"20px",flexWrap:"wrap",gap:"12px" }}>
          <h1 style={{ fontFamily:"Playfair Display,serif",fontSize:"1.6rem",fontWeight:700,color:"#907474",margin:0 }}>Archive</h1>
          <div style={{ position:"relative" }}>
            <input className="ll-input" placeholder="Search archive..." value={search} onChange={e => setSearch(e.target.value)}
              style={{ paddingLeft:"32px",width:"240px" }} />
            <svg style={{ position:"absolute",left:"9px",top:"50%",transform:"translateY(-50%)",width:"14px",height:"14px",color:"#9ca3af" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z"/>
            </svg>
          </div>
        </div>

        {loading ? <LoadingSpinner /> : (
          <div style={{ display:"flex",flexDirection:"column",gap:"12px" }}>
            {/* Completed Tasks */}
            <div>
              <SectionHeader title="Completed Tasks" count={filteredTasks.length} open={openSections.tasks} onToggle={() => toggle("tasks")} color="#355147" />
              {openSections.tasks && filteredTasks.length > 0 && (
                <div className="ll-card" style={{ marginTop:"8px",overflow:"hidden" }}>
                  <div style={{ overflowX:"auto" }}>
                    <table style={{ width:"100%",borderCollapse:"collapse" }}>
                      <thead>
                        <tr>
                          {["Task","Subject","Project","Priority","Due Date","Actions"].map(h => <th key={h} style={th}>{h}</th>)}
                        </tr>
                      </thead>
                      <tbody>
                        {filteredTasks.map(t => (
                          <tr key={t.taskId} style={{ transition:"background 150ms" }} onMouseEnter={e => e.currentTarget.style.background="#f8faf9"} onMouseLeave={e => e.currentTarget.style.background="white"}>
                            <td style={cell}><span style={{ fontWeight:500 }}>{t.taskName}</span></td>
                            <td style={cell}>{t.taskSubject?.subjectName||"—"}</td>
                            <td style={cell}>{t.taskProject?.projectName||"—"}</td>
                            <td style={cell}><span style={{ fontSize:"0.7rem",padding:"2px 7px",borderRadius:"999px",fontWeight:600,background:t.taskPriority==="High"?"rgba(243,22,30,0.1)":t.taskPriority==="Medium"?"rgba(159,108,91,0.1)":"rgba(182,205,200,0.3)",color:t.taskPriority==="High"?"#c01018":t.taskPriority==="Medium"?"#7d5244":"#355147" }}>{t.taskPriority}</span></td>
                            <td style={cell}>{t.taskDueDate ? formatDateDisplay(t.taskDueDate, user?.dateFormat) : "—"}</td>
                            <td style={cell}>
                              <button onClick={() => setDeleteInfo({ type:"task",id:t.taskId })}
                                style={{ padding:"4px 8px",borderRadius:"6px",border:"none",background:"rgba(243,22,30,0.08)",color:"#F3161E",cursor:"pointer",fontSize:"0.75rem",fontWeight:500 }}>
                                Delete
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              {openSections.tasks && filteredTasks.length === 0 && (
                <div style={{ padding:"24px",textAlign:"center",color:"#9ca3af",fontSize:"0.875rem" }}>No completed tasks</div>
              )}
            </div>

            {/* Archived Subjects */}
            <div>
              <SectionHeader title="Archived Subjects" count={filteredSubjects.length} open={openSections.subjects} onToggle={() => toggle("subjects")} color="#5B8E9F" />
              {openSections.subjects && (
                <div style={{ marginTop:"8px",display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))",gap:"10px" }}>
                  {filteredSubjects.map(s => (
                    <div key={s.subjectId} className="ll-card" style={{ padding:"14px",borderTop:`3px solid ${s.subjectColor||"#B6CDC8"}` }}>
                      <h3 style={{ margin:"0 0 4px",fontSize:"0.9rem",fontWeight:600,color:"#355147" }}>{s.subjectName}</h3>
                      {s.subjectSemester && <p style={{ margin:"0 0 10px",fontSize:"0.75rem",color:"#9F6C5B" }}>{s.subjectSemester}</p>}
                      <div style={{ display:"flex",gap:"6px" }}>
                        <button onClick={() => handleReactivate("subject",s.subjectId)}
                          style={{ flex:1,padding:"5px",borderRadius:"7px",border:"1px solid #B6CDC8",background:"rgba(182,205,200,0.15)",color:"#355147",cursor:"pointer",fontSize:"0.75rem",fontWeight:500 }}>
                          Reactivate
                        </button>
                        <button onClick={() => setDeleteInfo({ type:"subject",id:s.subjectId })}
                          style={{ padding:"5px 8px",borderRadius:"7px",border:"none",background:"rgba(243,22,30,0.08)",color:"#F3161E",cursor:"pointer",fontSize:"0.75rem",fontWeight:500 }}>
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                  {filteredSubjects.length === 0 && <div style={{ padding:"20px",color:"#9ca3af",fontSize:"0.875rem" }}>No archived subjects</div>}
                </div>
              )}
            </div>

            {/* Archived Projects */}
            <div>
              <SectionHeader title="Archived Projects" count={filteredProjects.length} open={openSections.projects} onToggle={() => toggle("projects")} color="#8E5B9F" />
              {openSections.projects && (
                <div style={{ marginTop:"8px",display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(240px,1fr))",gap:"10px" }}>
                  {filteredProjects.map(p => (
                    <div key={p.projectId} className="ll-card" style={{ padding:"14px" }}>
                      <h3 style={{ margin:"0 0 4px",fontSize:"0.9rem",fontWeight:600,color:"#355147" }}>{p.projectName}</h3>
                      {p.projectDescription && <p style={{ margin:"0 0 10px",fontSize:"0.78rem",color:"#6b7280",lineHeight:1.4,display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical",overflow:"hidden" }}>{p.projectDescription}</p>}
                      <div style={{ display:"flex",gap:"6px" }}>
                        <button onClick={() => handleReactivate("project",p.projectId)}
                          style={{ flex:1,padding:"5px",borderRadius:"7px",border:"1px solid #B6CDC8",background:"rgba(182,205,200,0.15)",color:"#355147",cursor:"pointer",fontSize:"0.75rem",fontWeight:500 }}>
                          Reactivate
                        </button>
                        <button onClick={() => setDeleteInfo({ type:"project",id:p.projectId })}
                          style={{ padding:"5px 8px",borderRadius:"7px",border:"none",background:"rgba(243,22,30,0.08)",color:"#F3161E",cursor:"pointer",fontSize:"0.75rem",fontWeight:500 }}>
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                  {filteredProjects.length === 0 && <div style={{ padding:"20px",color:"#9ca3af",fontSize:"0.875rem" }}>No archived projects</div>}
                </div>
              )}
            </div>
          </div>
        )}
      </main>
      <ConfirmDialog open={!!deleteInfo} title="Confirm Delete" message="Permanently delete this item? This cannot be undone."
        onConfirm={handleConfirm} onCancel={() => setDeleteInfo(null)} confirmLabel="Delete" confirmDanger />
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
