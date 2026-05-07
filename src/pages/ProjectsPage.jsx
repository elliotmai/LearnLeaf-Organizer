import React, { useState, useEffect, useCallback } from "react";
import { useUser } from "../UserState.jsx";
import { getAllFromStore } from "../db.js";
import { sortProjects, archiveProject, deleteProject } from "../LearnLeaf_Functions.jsx";
import { useNavigate } from "react-router-dom";
import TopBar from "../components/layout/TopBar.jsx";
import ProjectForm from "../components/projects/ProjectForm.jsx";
import ProjectDetailPanel from "../components/projects/ProjectDetailPanel.jsx";
import LoadingSpinner from "../components/ui/LoadingSpinner.jsx";
import ConfirmDialog from "../components/ui/ConfirmDialog.jsx";
import Toast from "../components/ui/Toast.jsx";
import { formatDateDisplay } from "../LearnLeaf_Functions.jsx";

export default function ProjectsPage() {
  const { user, dataVersion } = useUser();
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [detailProject, setDetailProject] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [toast, setToast] = useState(null);
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const [allProjects, allSubjects, allTasks] = await Promise.all([
      getAllFromStore("projects"), getAllFromStore("subjects"), getAllFromStore("tasks")
    ]);
    const active = allProjects.filter(p => p.projectStatus === "Active").map(p => {
      const ptasks = allTasks.filter(t => t.taskProject === p.projectId);
      const counts = ptasks.reduce((a, t) => { const k = t.taskStatus.replace(/\s+/g, ""); a[k] = (a[k] || 0) + 1; return a; }, { NotStarted: 0, InProgress: 0, Completed: 0 });
      const next = ptasks.filter(t => t.taskStatus !== "Completed" && t.taskDueDate).sort((a, b) => a.taskDueDate.localeCompare(b.taskDueDate))[0];
      const subs = (p.projectSubjects || []).map(id => allSubjects.find(s => s.subjectId === id)).filter(Boolean);
      return { ...p, statusCounts: counts, nextTask: next, projectSubjects: subs, total: ptasks.length };
    });
    setProjects(sortProjects(active));
    setSubjects(allSubjects.filter(s => s.subjectStatus === "Active"));
    setLoading(false);
  }, []);

  useEffect(() => { if (user?.id) load(); }, [user, load, dataVersion]);

  const filtered = projects.filter(p => p.projectName.toLowerCase().includes(search.toLowerCase()));

  const handleSave = async () => { await load(); setToast({ message: editingProject ? "Project updated!" : "Project added!", type: "success" }); };
  const handleViewDetails = (p) => { setDetailProject(p); setDetailOpen(true); };

  const handleArchive = async (id) => {
    await archiveProject(id);
    await load();
    setToast({ message: "Project archived", type: "info" });
  };

  const handleDeleteConfirm = async () => {
    await deleteProject(deleteTarget);
    setDeleteTarget(null);
    await load();
    setToast({ message: "Project deleted", type: "info" });
  };

  const getCompletion = (p) => {
    const total = p.statusCounts.NotStarted + p.statusCounts.InProgress + p.statusCounts.Completed;
    if (!total) return 0;
    return Math.round((p.statusCounts.Completed / total) * 100);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <TopBar />
      <main style={{ flex: 1, maxWidth: "1280px", margin: "0 auto", width: "100%", padding: "24px 24px 80px", boxSizing: "border-box" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px", gap: "12px", flexWrap: "wrap" }}>
          <div>
            <h1 style={{ fontFamily: "Playfair Display,serif", fontSize: "1.6rem", fontWeight: 700, color: "#907474", margin: "0 0 2px" }}>Projects</h1>
            <p style={{ color: "#9ca3af", fontSize: "0.85rem", margin: 0 }}>{projects.length} active project{projects.length !== 1 ? "s" : ""}</p>
          </div>
          <button onClick={() => { setEditingProject(null); setSidebarOpen(true); }}
            style={{ padding: "10px 18px", borderRadius: "12px", background: "#355147", color: "white", border: "none", cursor: "pointer", fontWeight: 600, fontSize: "0.875rem", boxShadow: "0 2px 8px rgba(53,81,71,0.25)" }}>
            + New Project
          </button>
        </div>

        <div style={{ position: "relative", marginBottom: "20px", maxWidth: "340px" }}>
          <input className="ll-input" placeholder="Search projects..." value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: "36px" }} />
          <svg style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", width: "16px", height: "16px", color: "#9ca3af" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
          </svg>
        </div>

        {loading ? <LoadingSpinner /> : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px", color: "#9ca3af" }}>
            <div style={{ fontSize: "48px", marginBottom: "12px" }}>🗂</div>
            <p>{projects.length === 0 ? "No projects yet — create your first!" : "No projects match your search"}</p>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(min(100%,300px),1fr))", gap: "16px" }}>
            {filtered.map(project => {
              const pct = getCompletion(project);
              const hasTasks = project.total > 0;
              return (
                <div key={project.projectId} className="ll-card" style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "14px" }}>
                  {/* Header */}
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "8px" }}>
                    <button onClick={() => handleViewDetails(project)}
                      style={{ background: "none", border: "none", cursor: "pointer", textAlign: "left", padding: 0 }}>
                      <h3 style={{
                        margin: 0, fontSize: "1rem", fontWeight: 700, color: "#355147", lineHeight: 1.3,
                        transition: "opacity 150ms"
                      }}
                        onMouseEnter={e => e.currentTarget.style.opacity = "0.7"}
                        onMouseLeave={e => e.currentTarget.style.opacity = "1"}>
                        {project.projectName}
                      </h3>
                    </button>
                    {project.projectDueDate && (
                      <span style={{ fontSize: "0.72rem", color: "#9ca3af", whiteSpace: "nowrap" }}>
                        Due {formatDateDisplay(project.projectDueDate, user?.dateFormat)}
                      </span>
                    )}
                  </div>

                  {project.projectDescription && (
                    <p style={{
                      margin: 0, fontSize: "0.8rem", color: "#6b7280", lineHeight: 1.4,
                      display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden"
                    }}>
                      {project.projectDescription}
                    </p>
                  )}

                  {project.projectSubjects.length > 0 && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                      {project.projectSubjects.sort((a, b) => a.subjectName.localeCompare(b.subjectName)).map(s => (
                        <button key={s.subjectId} onClick={() => navigate(`/subjects/${s.subjectId}`)}
                          style={{ fontSize: "0.7rem", padding: "2px 8px", borderRadius: "999px", fontWeight: 500, color: "white", background: s.subjectColor || "#355147", border: "none", cursor: "pointer" }}>
                          {s.subjectName}
                        </button>
                      ))}
                    </div>
                  )}

                  {hasTasks && (
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                        <span style={{ fontSize: "0.75rem", color: "#6b7280" }}>{project.total} task{project.total !== 1 ? "s" : ""}</span>
                        <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "#355147" }}>{pct}% done</span>
                      </div>
                      <div style={{ height: "6px", background: "#f0f4f2", borderRadius: "3px", overflow: "hidden" }}>
                        <div style={{ height: "100%", borderRadius: "3px", background: "#355147", width: `${pct}%`, transition: "width 600ms ease" }} />
                      </div>
                      <div style={{ display: "flex", gap: "10px", marginTop: "6px", fontSize: "0.72rem", color: "#9ca3af" }}>
                        <span style={{ color: "#355147", fontWeight: 500 }}>✓ {project.statusCounts.Completed}</span>
                        <span style={{ color: "#5B8E9F", fontWeight: 500 }}>⟳ {project.statusCounts.InProgress}</span>
                        <span style={{ fontWeight: 500 }}>○ {project.statusCounts.NotStarted}</span>
                      </div>
                    </div>
                  )}

                  {project.nextTask && (
                    <div style={{ padding: "8px 10px", borderRadius: "8px", background: "rgba(159,108,91,0.08)", border: "1px solid rgba(159,108,91,0.15)" }}>
                      <p style={{ margin: 0, fontSize: "0.75rem", color: "#9F6C5B", fontWeight: 600 }}>Next up</p>
                      <p style={{ margin: "2px 0 0", fontSize: "0.8rem", color: "#7d5244" }}>
                        {project.nextTask.taskName}
                        {project.nextTask.taskDueDate && <span style={{ color: "#9ca3af", marginLeft: "6px" }}>· {formatDateDisplay(project.nextTask.taskDueDate, user?.dateFormat)}</span>}
                      </p>
                    </div>
                  )}

                  <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                    <button onClick={() => navigate(`/projects/${project.projectId}`)}
                      style={{ flex: 1, padding: "6px 8px", borderRadius: "8px", border: "1px solid #e5e9e8", background: "none", cursor: "pointer", fontSize: "0.75rem", fontWeight: 500, color: "#355147" }}>
                      View Tasks
                    </button>
                    <button onClick={() => handleViewDetails(project)}
                      style={{ padding: "6px 8px", borderRadius: "8px", border: "1px solid #e5e9e8", background: "none", cursor: "pointer", fontSize: "0.75rem", fontWeight: 500, color: "#5B8E9F" }}>
                      Details
                    </button>
                    <button onClick={() => { setEditingProject(project); setSidebarOpen(true); }}
                      style={{ padding: "6px 8px", borderRadius: "8px", border: "1px solid #e5e9e8", background: "none", cursor: "pointer", fontSize: "0.75rem", fontWeight: 500, color: "#6b7280" }}>
                      Edit
                    </button>
                    <button onClick={() => handleArchive(project.projectId)}
                      style={{ padding: "6px 8px", borderRadius: "8px", border: "1px solid #e5e9e8", background: "none", cursor: "pointer", fontSize: "0.75rem", fontWeight: 500, color: "#9F6C5B" }}>
                      Archive
                    </button>
                    <button onClick={() => setDeleteTarget(project.projectId)}
                      style={{ padding: "6px 8px", borderRadius: "8px", border: "1px solid rgba(243,22,30,0.2)", background: "none", cursor: "pointer", fontSize: "0.75rem", fontWeight: 500, color: "#F3161E" }}>
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      <ProjectForm open={sidebarOpen} onClose={() => setSidebarOpen(false)} project={editingProject} subjects={subjects} onSave={handleSave} />

      <ProjectDetailPanel
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        project={detailProject}
        onEdit={(p) => { setEditingProject(p); setSidebarOpen(true); }}
        onArchive={handleArchive}
        onDelete={id => setDeleteTarget(id)} />

      <ConfirmDialog open={!!deleteTarget} title="Delete Project" message="Delete this project? Associated tasks won't be grouped under it anymore."
        onConfirm={handleDeleteConfirm} onCancel={() => setDeleteTarget(null)} confirmLabel="Delete" confirmDanger />
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
