import React, { useState, useEffect } from "react";
import Sidebar from "../ui/Sidebar.jsx";
import { addSubject, editSubject } from "../../LearnLeaf_Functions.jsx";
import { HexColorPicker } from "react-colorful";

const PRESET_COLORS = ["#355147","#5B8E9F","#8E5B9F","#9F6C5B","#907474","#B6CDC8","#F3161E","#2e7d32","#1565c0","#e65100","#6a1b9a","#00838f"];

const EMPTY = { subjectName:"", subjectSemester:"", subjectDescription:"", subjectColor:"#355147", subjectStatus:"Active" };

export default function SubjectForm({ open, onClose, subject, onSave }) {
  const isEdit = !!subject?.subjectId;
  const [form, setForm] = useState({ ...EMPTY });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [showPicker, setShowPicker] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(isEdit ? { ...EMPTY, ...subject } : { ...EMPTY });
      setErrors({});
      setShowPicker(false);
    }
  }, [open, subject, isEdit]);

  const set = (k,v) => setForm(f => ({...f,[k]:v}));

  const handleSave = async () => {
    if (!form.subjectName.trim()) { setErrors({subjectName:"Subject name is required"}); return; }
    setSaving(true);
    try {
      if (isEdit) await editSubject(form);
      else await addSubject(form);
      onSave();
      onClose();
    } catch(e) { console.error(e); }
    finally { setSaving(false); }
  };

  const inp = (err) => ({ width:"100%",borderRadius:"10px",border:`1px solid ${err?"#F3161E":"#e5e9e8"}`,background:"white",padding:"0.6rem 0.85rem",fontSize:"0.875rem",color:"#1a2e28",outline:"none",transition:"border 150ms",boxSizing:"border-box" });
  const lab = { display:"block",fontSize:"0.7rem",fontWeight:600,color:"#6b7280",textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:"4px" };

  return (
    <Sidebar open={open} onClose={onClose} title={isEdit ? "Edit Subject" : "New Subject"}>
      <div style={{ display:"flex",flexDirection:"column",gap:"16px" }}>
        <div>
          <label style={lab}>Subject Name *</label>
          <input style={inp(errors.subjectName)} value={form.subjectName}
            onChange={e => set("subjectName", e.target.value)} placeholder="e.g. Calculus II" />
          {errors.subjectName && <p style={{ fontSize:"0.75rem",color:"#F3161E",marginTop:"4px" }}>{errors.subjectName}</p>}
        </div>

        <div>
          <label style={lab}>Semester</label>
          <input style={inp(false)} value={form.subjectSemester} onChange={e => set("subjectSemester", e.target.value)} placeholder="e.g. Spring 2025" />
        </div>

        <div>
          <label style={lab}>Description</label>
          <textarea style={{ ...inp(false),minHeight:"70px",resize:"vertical",lineHeight:1.5 }}
            value={form.subjectDescription} onChange={e => set("subjectDescription", e.target.value)} placeholder="Optional notes about this subject" />
        </div>

        <div>
          <label style={lab}>Color</label>
          {/* Preset swatches */}
          <div style={{ display:"flex",flexWrap:"wrap",gap:"8px",marginBottom:"10px" }}>
            {PRESET_COLORS.map(c => (
              <button key={c} onClick={() => set("subjectColor",c)}
                style={{ width:"28px",height:"28px",borderRadius:"50%",background:c,border:form.subjectColor===c?"3px solid #1a2e28":"2px solid transparent",cursor:"pointer",transition:"all 150ms",padding:0 }}/>
            ))}
          </div>
          <button onClick={() => setShowPicker(!showPicker)}
            style={{ display:"flex",alignItems:"center",gap:"8px",padding:"8px 12px",borderRadius:"10px",border:"1px solid #e5e9e8",background:"white",cursor:"pointer",fontSize:"0.8rem",color:"#6b7280" }}>
            <span style={{ width:"18px",height:"18px",borderRadius:"4px",background:form.subjectColor,display:"inline-block",border:"1px solid rgba(0,0,0,0.1)" }}/>
            {showPicker ? "Close color picker" : "Custom color"}
          </button>
          {showPicker && (
            <div style={{ marginTop:"10px",display:"flex",justifyContent:"center" }}>
              <HexColorPicker color={form.subjectColor} onChange={v => set("subjectColor",v)} />
            </div>
          )}
        </div>

        <div style={{ display:"flex",gap:"12px",paddingTop:"8px",borderTop:"1px solid #f0f4f2" }}>
          <button onClick={handleSave} disabled={saving}
            style={{ flex:1,padding:"0.75rem",borderRadius:"10px",background:"#355147",color:"white",border:"none",cursor:"pointer",fontWeight:600,fontSize:"0.9rem",opacity:saving?0.7:1 }}>
            {saving ? "Saving..." : (isEdit ? "Save Changes" : "Add Subject")}
          </button>
          <button onClick={onClose} className="btn-secondary" style={{ padding:"0.75rem 1rem" }}>Cancel</button>
        </div>
      </div>
    </Sidebar>
  );
}
