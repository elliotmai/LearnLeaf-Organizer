import React, { useState, useEffect } from "react";
import { Outlet } from "react-router-dom";
import { UserProvider } from "./UserState.jsx";
import Toast from "./components/ui/Toast.jsx";
import PullToRefresh from "./components/ui/PullToRefresh.jsx";
import WhatsNew from "./components/ui/WhatsNew.jsx";

function AppInner() {
  const [networkToast, setNetworkToast] = useState(null);

  useEffect(() => {
    const online  = () => setNetworkToast({ message:"Back online! Syncing data...", type:"success" });
    const offline = () => setNetworkToast({ message:"You are offline. Changes will be saved locally.", type:"offline" });
    window.addEventListener("online",  online);
    window.addEventListener("offline", offline);
    return () => { window.removeEventListener("online",online); window.removeEventListener("offline",offline); };
  }, []);

  return (
    <div style={{ minHeight:"100vh", display:"flex", flexDirection:"column" }}>
      <div style={{ flex:"1 0 auto" }}>
        <Outlet />
      </div>
      <footer className="page-mobile-pad" style={{ flexShrink:0, display:"flex", justifyContent:"center", padding:"10px 16px", borderTop:"1px solid #f0f4f2", background:"#f8faf9" }}>
        <a
          href="https://ticketbooth.netlify.app/"
          target="_blank"
          rel="noopener noreferrer"
          style={{ fontSize:"0.72rem", fontWeight:500, color:"#9ca3af", textDecoration:"none", transition:"color 150ms" }}
          onMouseEnter={(e) => { e.currentTarget.style.color = "#355147"; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = "#9ca3af"; }}
        >
          Report a bug or request a feature
        </a>
      </footer>
      <PullToRefresh />
      <WhatsNew />
      {networkToast && <Toast message={networkToast.message} type={networkToast.type} onClose={() => setNetworkToast(null)} />}
    </div>
  );
}

export default function App() {
  return <UserProvider><AppInner /></UserProvider>;
}
