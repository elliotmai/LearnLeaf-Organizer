import React, { useState, useEffect } from "react";
import { Outlet } from "react-router-dom";
import { UserProvider } from "./UserState.jsx";
import Toast from "./components/ui/Toast.jsx";

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
    <div style={{ minHeight:"100vh" }}>
      <Outlet />
      {networkToast && <Toast message={networkToast.message} type={networkToast.type} onClose={() => setNetworkToast(null)} />}
    </div>
  );
}

export default function App() {
  return <UserProvider><AppInner /></UserProvider>;
}
