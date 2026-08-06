import React, { useEffect, useState } from "react";
import { WHATS_NEW } from "../../config/whatsNew.js";

const STORAGE_KEY = "learnleaf.whatsNewSeen";

// Compare versions like "2026.07.26" and "2026.07.26.2" segment-by-segment,
// numerically — so same-day increments (.1, .2, … .10) order correctly.
function cmpVersion(a, b) {
  const pa = String(a).split(".").map(Number);
  const pb = String(b).split(".").map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const x = pa[i] || 0;
    const y = pb[i] || 0;
    if (x !== y) return x - y;
  }
  return 0;
}

/**
 * Accumulating "What's New" popup. The next time a person opens the app after one
 * or more updates, it shows EVERY changelog entry newer than what this device has
 * already seen — combined into a single popup — then remembers the latest version
 * locally so nothing repeats until the next update.
 *
 * First visit on a device shows only the newest entry (not the whole history);
 * a returning device that missed several releases sees them all stacked together.
 */
export default function WhatsNew() {
  const latest = WHATS_NEW[0];
  const [entries, setEntries] = useState([]);

  useEffect(() => {
    if (!latest) return;
    let seen = null;
    try {
      seen = localStorage.getItem(STORAGE_KEY);
    } catch {
      seen = null;
    }
    // Versions are YYYY.MM.DD (or YYYY.MM.DD.N for same-day releases).
    const unseen = seen == null ? [latest] : WHATS_NEW.filter((e) => cmpVersion(e.version, seen) > 0);
    if (unseen.length) setEntries(unseen);
  }, [latest]);

  const dismiss = () => {
    try {
      localStorage.setItem(STORAGE_KEY, latest.version);
    } catch {
      /* ignore storage failures */
    }
    setEntries([]);
  };

  if (!entries.length || !latest) return null;

  const stacked = entries.length > 1;

  return (
    <>
      <div
        style={{ position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",backdropFilter:"blur(2px)",zIndex:80 }}
        onClick={dismiss}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="What's new"
        style={{ position:"fixed",top:"50%",left:"50%",transform:"translate(-50%,-50%)",zIndex:90,background:"white",borderRadius:"18px",padding:"28px",maxWidth:"420px",width:"90%",maxHeight:"80vh",display:"flex",flexDirection:"column",boxShadow:"0 20px 60px rgba(53,81,71,0.24)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ textAlign:"center",marginBottom:"18px" }}>
          <div style={{ fontSize:"2rem",lineHeight:1 }}>🌿</div>
          <h3 style={{ margin:"8px 0 0",fontFamily:"Playfair Display,serif",fontSize:"1.25rem",fontWeight:700,color:"#355147" }}>What&apos;s New</h3>
          {!stacked && latest.date && (
            <p style={{ margin:"4px 0 0",fontSize:"0.75rem",color:"#9ca3af" }}>{latest.date}</p>
          )}
        </div>

        <div style={{ overflowY:"auto",display:"flex",flexDirection:"column",gap:"16px" }}>
          {entries.map((entry) => (
            <div key={entry.version} style={{ display:"flex",flexDirection:"column",gap:"8px" }}>
              {stacked && entry.date && (
                <p style={{ margin:0,padding:"0 2px",fontSize:"0.72rem",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.05em",color:"#9ca3af" }}>{entry.date}</p>
              )}
              <ul style={{ listStyle:"none",margin:0,padding:0,display:"flex",flexDirection:"column",gap:"8px" }}>
                {entry.items.map((item, i) => (
                  <li key={i} style={{ borderRadius:"12px",border:"1px solid #f0f4f2",background:"#f8faf9",padding:"12px 14px",fontSize:"0.85rem",lineHeight:1.45,color:"#1a2e28" }}>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <button onClick={dismiss} className="btn-primary" style={{ marginTop:"20px",justifyContent:"center",width:"100%" }}>
          Got it
        </button>
      </div>
    </>
  );
}
