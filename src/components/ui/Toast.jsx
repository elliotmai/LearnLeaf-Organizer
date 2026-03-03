import React, { useEffect } from "react";

export default function Toast({ message, type = "success", onClose, duration = 3500 }) {
  useEffect(() => {
    const t = setTimeout(onClose, duration);
    return () => clearTimeout(t);
  }, [onClose, duration]);

  const colors = {
    success: { border:"#355147", icon:"✓", bg:"#f0f7f4" },
    error:   { border:"#F3161E", icon:"✕", bg:"#fff5f5" },
    info:    { border:"#5B8E9F", icon:"ℹ", bg:"#f0f6f8" },
    offline: { border:"#907474", icon:"⚠", bg:"#f8f4f4" },
  };
  const c = colors[type] || colors.info;

  return (
    <div className="toast" style={{ borderLeftColor:c.border, backgroundColor:c.bg }}>
      <span style={{ fontSize:"16px",color:c.border }}>{c.icon}</span>
      <span style={{ fontSize:"0.875rem",color:"#374151",flex:1 }}>{message}</span>
      <button onClick={onClose} style={{ background:"none",border:"none",cursor:"pointer",color:"#9ca3af",fontSize:"14px",padding:"2px",lineHeight:1 }}>✕</button>
    </div>
  );
}
