import React, { useCallback, useEffect, useRef, useState } from "react";
import { auth } from "../../firebase.js";

// Connected apps: lets the signed-in person mint and revoke API tokens so their
// other apps (e.g. Fridge Board) can read this one. Tokens are minted on the
// server (netlify/functions/connections.mjs); the browser only ever sees a new
// token once, right after minting, and never stores it.

const MAX_LABEL = 60;

async function callConnections(path = "", { method = "GET", body } = {}) {
  const user = auth.currentUser;
  if (!user) throw new Error("Sign in again to manage connected apps.");
  const idToken = await user.getIdToken();
  const res = await fetch(`/api/connections${path}`, {
    method,
    headers: { Authorization: `Bearer ${idToken}`, ...(body ? { "Content-Type": "application/json" } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try { data = await res.json(); } catch { /* not JSON */ }
  if (!res.ok) throw new Error(data?.error || "Something went wrong. Try again.");
  return data;
}

const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
function relativeTime(iso) {
  if (!iso) return "Never used";
  const diffSec = (new Date(iso).getTime() - Date.now()) / 1000;
  const steps = [[60, "second"], [60, "minute"], [24, "hour"], [7, "day"], [4.345, "week"], [12, "month"], [Infinity, "year"]];
  let value = diffSec;
  for (const [size, unit] of steps) {
    if (Math.abs(value) < size) {
      if (unit === "second") return "Just now";
      return `Last used ${rtf.format(Math.round(value), unit)}`;
    }
    value /= size;
  }
  return "Last used a while ago";
}
const formatDate = iso => (iso ? new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }) : "");

export default function ConnectedApps({ styles }) {
  const { section, sectionTitle, inp, lab } = styles;
  const [apps, setApps] = useState(null); // null = loading
  const [loadError, setLoadError] = useState("");
  const [mode, setMode] = useState("idle"); // idle | naming | minted
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState("");
  const [minted, setMinted] = useState(null); // { label, token }
  const [copied, setCopied] = useState(false);
  const [confirmId, setConfirmId] = useState(null);
  const [revokeError, setRevokeError] = useState("");
  const tokenRef = useRef(null);

  const load = useCallback(async () => {
    setLoadError("");
    try {
      const data = await callConnections();
      setApps(data.connections || []);
    } catch (e) {
      setApps([]);
      setLoadError(navigator.onLine ? e.message : "You're offline. Connected apps will load when you're back online.");
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const startConnect = () => { setMode("naming"); setName(""); setFormError(""); };
  const cancelConnect = () => { setMode("idle"); setName(""); setFormError(""); };

  const handleMint = async (e) => {
    e.preventDefault();
    const label = name.trim();
    if (!label) { setFormError("Give the app a name."); return; }
    setBusy(true); setFormError("");
    try {
      const created = await callConnections("", { method: "POST", body: { label } });
      setMinted({ label: created.label, token: created.token });
      setCopied(false);
      setMode("minted");
      setApps(list => [{ id: created.id, label: created.label, createdAt: created.createdAt, lastUsedAt: null }, ...(list || [])]);
    } catch (err) {
      setFormError(err.message);
    } finally { setBusy(false); }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(minted.token);
      setCopied(true);
    } catch {
      // Clipboard blocked: select the text so it can be copied by hand.
      tokenRef.current?.select();
    }
  };

  const handleDone = () => { setMinted(null); setCopied(false); setMode("idle"); };

  const handleRevoke = async (id) => {
    setBusy(true); setRevokeError("");
    try {
      await callConnections(`/${encodeURIComponent(id)}`, { method: "DELETE" });
      setApps(list => (list || []).filter(a => a.id !== id));
      setConfirmId(null);
    } catch (err) {
      setRevokeError(err.message);
    } finally { setBusy(false); }
  };

  const muted = { fontSize: "0.8rem", color: "#6b7280" };
  const row = { display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", padding: "12px 0", borderTop: "1px solid #f0f4f2", flexWrap: "wrap" };
  const errorText = { margin: "8px 0 0", fontSize: "0.8rem", color: "#F3161E" };
  const small = { padding: "0.45rem 0.85rem", fontSize: "0.8rem" };

  return (
    <div style={section}>
      <h2 style={{ ...sectionTitle, marginBottom: "8px" }}>Connected apps</h2>
      <p style={{ margin: "0 0 16px", fontSize: "0.875rem", color: "#6b7280", lineHeight: 1.5 }}>
        Let another of your apps read and update your tasks, subjects and projects. Each app gets its own key, and you can revoke it here at any time.
      </p>

      {apps === null && <p style={muted}>Loading…</p>}
      {loadError && <p style={errorText}>{loadError}</p>}

      {apps !== null && !loadError && apps.length === 0 && mode !== "minted" && (
        <p style={{ ...muted, margin: "0 0 16px" }}>No apps connected. Connect one to let another of your apps read this one.</p>
      )}

      {apps !== null && apps.length > 0 && (
        <div style={{ marginBottom: "16px" }}>
          {apps.map(app => (
            <div key={app.id} style={row}>
              {confirmId === app.id ? (
                <>
                  <span style={{ fontSize: "0.875rem", color: "#374151", flex: "1 1 200px" }}>
                    Revoke {app.label}? It stops working straight away.
                  </span>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button className="btn-secondary" style={small} onClick={() => { setConfirmId(null); setRevokeError(""); }} disabled={busy}>Cancel</button>
                    <button className="btn-danger" style={small} onClick={() => handleRevoke(app.id)} disabled={busy}>
                      {busy ? "Revoking…" : "Revoke"}
                    </button>
                  </div>
                  {revokeError && <p style={{ ...errorText, flexBasis: "100%" }}>{revokeError}</p>}
                </>
              ) : (
                <>
                  <div style={{ minWidth: 0, flex: "1 1 200px" }}>
                    <div style={{ fontSize: "0.9rem", fontWeight: 600, color: "#1a2e28", overflowWrap: "anywhere" }}>{app.label}</div>
                    <div style={muted}>Connected {formatDate(app.createdAt)} · {relativeTime(app.lastUsedAt)}</div>
                  </div>
                  <button className="btn-danger" style={small} onClick={() => { setConfirmId(app.id); setRevokeError(""); }}>Revoke</button>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {mode === "idle" && (
        <button className="btn-primary" onClick={startConnect} disabled={apps === null}>Connect an app</button>
      )}

      {mode === "naming" && (
        <form onSubmit={handleMint} style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <div>
            <label style={lab} htmlFor="connected-app-name">App name</label>
            <input id="connected-app-name" style={inp} value={name} maxLength={MAX_LABEL} autoFocus
              onChange={e => setName(e.target.value)} placeholder="Fridge Board" />
          </div>
          {formError && <p style={{ ...errorText, margin: 0 }}>{formError}</p>}
          <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
            <button type="button" className="btn-secondary" onClick={cancelConnect} disabled={busy}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={busy}>{busy ? "Connecting…" : "Connect"}</button>
          </div>
        </form>
      )}

      {mode === "minted" && minted && (
        <div style={{ borderRadius: "12px", background: "#f0f7f4", border: "1px solid #B6CDC8", padding: "16px" }}>
          <label style={lab} htmlFor="connected-app-token">Key for {minted.label}</label>
          <div style={{ display: "flex", gap: "8px" }}>
            <input id="connected-app-token" ref={tokenRef} readOnly value={minted.token} onFocus={e => e.target.select()}
              style={{ ...inp, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: "0.8rem" }} />
            <button type="button" className="btn-secondary" onClick={handleCopy}>{copied ? "Copied" : "Copy"}</button>
          </div>
          <p style={{ margin: "10px 0 12px", fontSize: "0.85rem", color: "#355147", fontWeight: 600 }}>Copy this now. You won't see it again.</p>
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button type="button" className="btn-primary" onClick={handleDone}>Done</button>
          </div>
        </div>
      )}
    </div>
  );
}
