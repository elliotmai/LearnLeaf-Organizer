import React from "react";
export default function ConfirmDialog({ open, title, message, onConfirm, onCancel, confirmLabel = "Confirm", confirmDanger = false }) {
  if (!open) return null;
  return (
    <>
      <div style={{ position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",backdropFilter:"blur(2px)",zIndex:60 }} onClick={onCancel} />
      <div style={{ position:"fixed",top:"50%",left:"50%",transform:"translate(-50%,-50%)",zIndex:70,background:"white",borderRadius:"16px",padding:"28px",maxWidth:"400px",width:"90%",boxShadow:"0 20px 60px rgba(0,0,0,0.2)" }}>
        <h3 style={{ margin:"0 0 8px",fontSize:"1rem",fontWeight:700,color:"#355147" }}>{title}</h3>
        <p style={{ margin:"0 0 24px",fontSize:"0.875rem",color:"#6b7280",lineHeight:1.5 }}>{message}</p>
        <div style={{ display:"flex",gap:"12px",justifyContent:"flex-end" }}>
          <button onClick={onCancel} className="btn-secondary">Cancel</button>
          <button onClick={onConfirm} className={confirmDanger ? "btn-danger" : "btn-primary"} style={{ fontWeight:600 }}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </>
  );
}
