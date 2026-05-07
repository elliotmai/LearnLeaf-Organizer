import React, { useState, useEffect } from "react";
import { useUser } from "../UserState.jsx";
import { useNavigate } from "react-router-dom";
import { logoutUser, updateUserDetails, deleteUser } from "../LearnLeaf_Functions.jsx";
import TopBar from "../components/layout/TopBar.jsx";
import Toast from "../components/ui/Toast.jsx";
import ConfirmDialog from "../components/ui/ConfirmDialog.jsx";

export default function UserProfilePage() {
  const { user, updateUser } = useUser();
  const navigate = useNavigate();
  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [timeFormat, setTimeFormat] = useState(user?.timeFormat || "12h");
  const [dateFormat, setDateFormat] = useState(user?.dateFormat || "MM/DD/YYYY");
  const [notifications, setNotifications] = useState(user?.notifications || false);
  const [notifFreq, setNotifFreq] = useState(user?.notificationsFrequency || [true, false, false, false]);
  const [toast, setToast] = useState(null);
  const [saving, setSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (user) { setName(user.name || ""); setEmail(user.email || ""); setTimeFormat(user.timeFormat || "12h"); setDateFormat(user.dateFormat || "MM/DD/YYYY"); setNotifications(user.notifications || false); setNotifFreq(user.notificationsFrequency || [true, false, false, false]); }
  }, [user]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const details = { id: user.id, name, email, timeFormat, dateFormat, notifications, notificationsFrequency: notifFreq };
      await updateUserDetails(user.id, details);
      await updateUser(details);
      setToast({ message: "Profile updated!", type: "success" });
    } catch (e) { setToast({ message: "Failed to update", type: "error" }); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    try { await deleteUser(user.id); updateUser(null); navigate("/"); }
    catch (e) { setToast({ message: `Failed: ${e.message}`, type: "error" }); }
    setShowDeleteConfirm(false);
  };

  const toggleFreq = (idx) => setNotifFreq(f => f.map((v, i) => i === idx ? !v : v));

  const inp = { width: "100%", borderRadius: "10px", border: "1px solid #e5e9e8", background: "white", padding: "0.6rem 0.85rem", fontSize: "0.875rem", color: "#1a2e28", outline: "none", boxSizing: "border-box" };
  const lab = { display: "block", fontSize: "0.75rem", fontWeight: 600, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "6px" };
  const section = { background: "white", borderRadius: "16px", border: "1px solid #f0f4f2", boxShadow: "0 2px 12px rgba(53,81,71,0.06)", padding: "24px", marginBottom: "16px" };
  const sectionTitle = { fontFamily: "Playfair Display,serif", fontSize: "1.05rem", fontWeight: 700, color: "#5B8E9F", margin: "0 0 20px" };

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <TopBar />
      <main style={{ flex: 1, maxWidth: "640px", margin: "0 auto", width: "100%", padding: "24px 24px 80px", boxSizing: "border-box" }}>
        <h1 style={{ fontFamily: "Playfair Display,serif", fontSize: "1.6rem", fontWeight: 700, color: "#907474", marginBottom: "24px" }}>Account & Preferences</h1>

        {/* Account info */}
        <div style={section}>
          <h2 style={sectionTitle}>Account Information</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            <div>
              <label style={lab}>Name</label>
              <input style={inp} value={name} onChange={e => setName(e.target.value)} placeholder="Your name" />
            </div>
            <div>
              <label style={lab}>Email</label>
              <input type="email" style={inp} value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" />
            </div>
          </div>
        </div>

        {/* Preferences */}
        <div style={section}>
          <h2 style={sectionTitle}>Preferences</h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
            <div>
              <label style={lab}>Time Format</label>
              <select className="ll-select" style={{ ...inp, paddingRight: "2.5rem", appearance: "none" }}
                value={timeFormat} onChange={e => setTimeFormat(e.target.value)}>
                <option value="12h">12-Hour (3:00 PM)</option>
                <option value="24h">24-Hour (15:00)</option>
              </select>
            </div>
            <div>
              <label style={lab}>Date Format</label>
              <select className="ll-select" style={{ ...inp, paddingRight: "2.5rem", appearance: "none" }}
                value={dateFormat} onChange={e => setDateFormat(e.target.value)}>
                <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                <option value="YYYY-MM-DD">YYYY-MM-DD</option>
              </select>
            </div>
          </div>
        </div>

        {/* Notifications */}
        <div style={section}>
          <h2 style={sectionTitle}>Notifications</h2>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
            <span style={{ fontSize: "0.9rem", fontWeight: 500, color: "#374151" }}>Enable notifications</span>
            <label style={{ position: "relative", display: "inline-block", width: "42px", height: "22px", cursor: "pointer" }}>
              <input type="checkbox" checked={notifications} onChange={e => setNotifications(e.target.checked)} style={{ opacity: 0, width: 0, height: 0 }} />
              <span style={{ position: "absolute", inset: 0, borderRadius: "11px", background: notifications ? "#355147" : "#e5e9e8", transition: "background 200ms" }}>
                <span style={{ position: "absolute", left: notifications ? "22px" : "2px", top: "2px", width: "18px", height: "18px", borderRadius: "50%", background: "white", transition: "left 200ms", boxShadow: "0 1px 3px rgba(0,0,0,0.15)" }} />
              </span>
            </label>
          </div>
          {notifications && (
            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
              {[["Weekly", 1], ["Daily", 2], ["Urgent (today)", 3]].map(([lbl, idx]) => (
                <label key={idx} style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", fontSize: "0.875rem", color: "#6b7280", fontWeight: 500 }}>
                  <input type="checkbox" checked={notifFreq[idx] || false} onChange={() => toggleFreq(idx)}
                    style={{ width: "16px", height: "16px", accentColor: "#355147", cursor: "pointer" }} />
                  {lbl}
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Save button */}
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "16px" }}>
          <button onClick={handleSave} disabled={saving}
            style={{ padding: "10px 24px", borderRadius: "12px", background: "#355147", color: "white", border: "none", cursor: "pointer", fontWeight: 600, fontSize: "0.9rem", opacity: saving ? 0.7 : 1, boxShadow: "0 2px 8px rgba(53,81,71,0.25)" }}>
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>

        {/* Danger zone */}
        <div style={{ ...section, border: "1px solid rgba(243,22,30,0.15)" }}>
          <h2 style={{ ...sectionTitle, color: "#F3161E" }}>Danger Zone</h2>
          <p style={{ margin: "0 0 16px", fontSize: "0.875rem", color: "#6b7280" }}>Once you delete your account, all data is permanently gone.</p>
          <button onClick={() => setShowDeleteConfirm(true)}
            style={{ padding: "8px 20px", borderRadius: "10px", background: "none", border: "2px solid #F3161E", color: "#F3161E", cursor: "pointer", fontWeight: 600, fontSize: "0.875rem", transition: "all 150ms" }}>
            Delete Account
          </button>
        </div>
      </main>

      <ConfirmDialog open={showDeleteConfirm} title="Delete Account"
        message="Are you absolutely sure? This cannot be undone and all your data will be lost forever."
        onConfirm={handleDelete} onCancel={() => setShowDeleteConfirm(false)}
        confirmLabel="Yes, Delete Everything" confirmDanger />
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
