import React, { useState, useEffect, useCallback } from "react";
import { useUser } from "../UserState.jsx";
import { getAllFromStore } from "../db.js";
import { sortSubjects, archiveSubject, deleteSubject, blockSubject } from "../LearnLeaf_Functions.jsx";
import { useNavigate } from "react-router-dom";
import TopBar from "../components/layout/TopBar.jsx";
import SubjectForm from "../components/subjects/SubjectForm.jsx";
import SubjectDetailPanel from "../components/subjects/SubjectDetailPanel.jsx";
import LoadingSpinner from "../components/ui/LoadingSpinner.jsx";
import ConfirmDialog from "../components/ui/ConfirmDialog.jsx";
import Toast from "../components/ui/Toast.jsx";

export default function SubjectsPage() {
  const { user, dataVersion } = useUser();
  const navigate = useNavigate();
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState(null);
  const [detailSubject, setDetailSubject] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [deleteInfo, setDeleteInfo] = useState(null);
  const [toast, setToast] = useState(null);
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const all = await getAllFromStore("subjects");
    setSubjects(sortSubjects(all.filter(s => s.subjectStatus === "Active")));
    setLoading(false);
  }, []);

  useEffect(() => { if (user?.id) load(); }, [user, load, dataVersion]);

  const filtered = subjects.filter(s =>
    s.subjectName.toLowerCase().includes(search.toLowerCase()) ||
    (s.subjectSemester || "").toLowerCase().includes(search.toLowerCase())
  );

  const handleEdit = (s) => { setEditingSubject(s); setSidebarOpen(true); };
  const handleAdd = () => { setEditingSubject(null); setSidebarOpen(true); };
  const handleViewDetails = (s) => { setDetailSubject(s); setDetailOpen(true); };
  const handleSave = async () => { await load(); setToast({ message: editingSubject ? "Subject updated!" : "Subject added!", type: "success" }); };

  const handleArchive = async (id) => {
    await archiveSubject(id);
    await load();
    setToast({ message: "Subject archived", type: "info" });
  };

  const handleDeleteConfirm = async () => {
    if (deleteInfo?.blocked) await blockSubject(deleteInfo.id);
    else await deleteSubject(deleteInfo.id);
    setDeleteInfo(null);
    await load();
    setToast({ message: "Subject deleted", type: "info" });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <TopBar />
      <main style={{ flex: 1, maxWidth: "1280px", margin: "0 auto", width: "100%", padding: "24px 24px 80px", boxSizing: "border-box" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px", gap: "12px", flexWrap: "wrap" }}>
          <div>
            <h1 style={{ fontFamily: "Playfair Display,serif", fontSize: "1.6rem", fontWeight: 700, color: "#907474", margin: "0 0 2px" }}>Subjects</h1>
            <p style={{ color: "#9ca3af", fontSize: "0.85rem", margin: 0 }}>{subjects.length} active subject{subjects.length !== 1 ? "s" : ""}</p>
          </div>
          <button onClick={handleAdd}
            style={{ padding: "10px 18px", borderRadius: "12px", background: "#355147", color: "white", border: "none", cursor: "pointer", fontWeight: 600, fontSize: "0.875rem", boxShadow: "0 2px 8px rgba(53,81,71,0.25)", whiteSpace: "nowrap" }}>
            + New Subject
          </button>
        </div>

        <div style={{ position: "relative", marginBottom: "20px", maxWidth: "340px" }}>
          <input className="ll-input" placeholder="Search subjects..." value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: "36px" }} />
          <svg style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", width: "16px", height: "16px", color: "#9ca3af" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
          </svg>
        </div>

        {loading ? <LoadingSpinner /> : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px", color: "#9ca3af" }}>
            <div style={{ fontSize: "48px", marginBottom: "12px" }}>📚</div>
            <p>{subjects.length === 0 ? "No subjects yet — add your first!" : "No subjects match your search"}</p>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(min(100%,260px),1fr))", gap: "16px" }}>
            {filtered.map(subject => (
              <div key={subject.subjectId} className="ll-card"
                style={{ padding: "20px", position: "relative", borderTop: `4px solid ${subject.subjectColor || "#355147"}`, cursor: "default" }}>
                {/* Clickable name */}
                <button onClick={() => handleViewDetails(subject)}
                  style={{ background: "none", border: "none", cursor: "pointer", textAlign: "left", padding: 0, display: "block", width: "100%" }}>
                  <h3 style={{
                    margin: "0 0 4px", fontSize: "1rem", fontWeight: 700, color: subject.subjectColor || "#355147", lineHeight: 1.3,
                    transition: "opacity 150ms"
                  }}
                    onMouseEnter={e => e.currentTarget.style.opacity = "0.75"}
                    onMouseLeave={e => e.currentTarget.style.opacity = "1"}>
                    {subject.subjectName}
                  </h3>
                </button>

                {subject.subjectSemester && (
                  <p style={{ margin: "0 0 8px", fontSize: "0.78rem", color: "#9F6C5B", fontWeight: 500 }}>{subject.subjectSemester}</p>
                )}
                {subject.subjectDescription && (
                  <p style={{
                    margin: "0 0 12px", fontSize: "0.8rem", color: "#6b7280", lineHeight: 1.4,
                    display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden"
                  }}>
                    {subject.subjectDescription}
                  </p>
                )}

                <div style={{ display: "flex", gap: "6px", marginTop: "auto", flexWrap: "wrap" }}>
                  <button onClick={() => navigate(`/subjects/${subject.subjectId}`)}
                    style={{ flex: 1, padding: "6px 10px", borderRadius: "8px", border: "1px solid #e5e9e8", background: "none", cursor: "pointer", fontSize: "0.75rem", fontWeight: 500, color: "#355147" }}>
                    View Tasks
                  </button>
                  <button onClick={() => handleViewDetails(subject)}
                    style={{ padding: "6px 10px", borderRadius: "8px", border: "1px solid #e5e9e8", background: "none", cursor: "pointer", fontSize: "0.75rem", fontWeight: 500, color: "#5B8E9F" }}>
                    Details
                  </button>
                  <button onClick={() => handleEdit(subject)}
                    style={{ padding: "6px 10px", borderRadius: "8px", border: "1px solid #e5e9e8", background: "none", cursor: "pointer", fontSize: "0.75rem", fontWeight: 500, color: "#6b7280" }}>
                    Edit
                  </button>
                  <button onClick={() => handleArchive(subject.subjectId)}
                    style={{ padding: "6px 10px", borderRadius: "8px", border: "1px solid #e5e9e8", background: "none", cursor: "pointer", fontSize: "0.75rem", fontWeight: 500, color: "#9F6C5B" }}>
                    Archive
                  </button>
                  <button onClick={() => setDeleteInfo({ id: subject.subjectId, blocked: false })}
                    style={{ padding: "6px 10px", borderRadius: "8px", border: "1px solid rgba(243,22,30,0.2)", background: "none", cursor: "pointer", fontSize: "0.75rem", fontWeight: 500, color: "#F3161E" }}>
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <SubjectForm open={sidebarOpen} onClose={() => setSidebarOpen(false)} subject={editingSubject} onSave={handleSave} />

      <SubjectDetailPanel
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        subject={detailSubject}
        onEdit={handleEdit}
        onArchive={handleArchive}
        onDelete={(s) => setDeleteInfo({ id: s.subjectId, blocked: false })} />

      <ConfirmDialog open={!!deleteInfo} title="Delete Subject" confirmDanger
        message="Delete this subject? Associated tasks will be unlinked."
        onConfirm={handleDeleteConfirm} onCancel={() => setDeleteInfo(null)} confirmLabel="Delete" />
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
