import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { logoutUser } from "../../LearnLeaf_Functions.jsx";
import { useUser } from "../../UserState.jsx";

const NAV = [
  { path:"/tasks",    label:"Tasks"    },
  { path:"/calendar", label:"Calendar" },
  { path:"/subjects", label:"Subjects" },
  { path:"/projects", label:"Projects" },
  { path:"/archives", label:"Archive"  },
];

export default function TopBar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, updateUser } = useUser();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = async () => {
    try { await logoutUser(); updateUser(null); navigate("/"); }
    catch(e) { console.error(e); }
  };

  const navBtn = (item) => {
    const active = location.pathname.startsWith(item.path);
    return (
      <button key={item.path} onClick={() => navigate(item.path)}
        style={{padding:"0.45rem 0.9rem",borderRadius:"10px",fontSize:"0.875rem",fontWeight:500,border:"none",cursor:"pointer",transition:"all 150ms",
          background: active ? "#355147" : "transparent",
          color: active ? "white" : "#355147"}}>{item.label}</button>
    );
  };

  return (
    <>
      <header style={{position:"sticky",top:0,zIndex:30,width:"100%",backgroundColor:"rgba(182,205,200,0.93)",backdropFilter:"blur(12px)",borderBottom:"1px solid rgba(182,205,200,0.6)",boxShadow:"0 1px 8px rgba(53,81,71,0.08)"}}>
        <div style={{maxWidth:"1280px",margin:"0 auto",padding:"0 1.5rem"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",height:"62px"}}>
            <button onClick={() => navigate("/tasks")} style={{display:"flex",alignItems:"center",gap:"8px",background:"none",border:"none",cursor:"pointer"}}>
              <div style={{width:"34px",height:"34px",borderRadius:"10px",background:"#355147",display:"flex",alignItems:"center",justifyContent:"center",color:"white",fontFamily:"Playfair Display,serif",fontWeight:700,fontSize:"13px",flexShrink:0}}>LL</div>
              <span style={{fontFamily:"Playfair Display,serif",fontWeight:600,color:"#355147",fontSize:"1.2rem",letterSpacing:"-0.02em"}} className="ll-hidden-sm">LearnLeaf Organizer</span>
            </button>

            <nav className="ll-desktop-nav" style={{display:"flex",alignItems:"center",gap:"2px"}}>
              {NAV.map(navBtn)}
            </nav>

            <div style={{display:"flex",alignItems:"center",gap:"6px"}}>
              {user && (
                <button onClick={() => navigate("/profile")} className="ll-desktop-only"
                  style={{display:"flex",alignItems:"center",gap:"8px",padding:"5px 10px",borderRadius:"10px",background:"none",border:"none",cursor:"pointer",color:"#355147",fontSize:"0.875rem",fontWeight:500}}>
                  <div style={{width:"28px",height:"28px",borderRadius:"50%",background:"#355147",color:"white",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"12px",fontWeight:700,flexShrink:0}}>
                    {(user.name?.[0] || "U").toUpperCase()}
                  </div>
                  <span className="ll-hidden-md">{user.name}</span>
                </button>
              )}
              <button onClick={handleLogout} className="ll-desktop-only"
                style={{padding:"5px 10px",borderRadius:"10px",background:"none",border:"none",cursor:"pointer",color:"#F3161E",fontSize:"0.875rem",fontWeight:500}}>
                Logout
              </button>
              <button className="ll-mobile-only" onClick={() => setMenuOpen(!menuOpen)}
                style={{padding:"8px",borderRadius:"10px",background:"none",border:"none",cursor:"pointer",color:"#355147"}}>
                <svg width="22" height="22" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {menuOpen
                    ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
                    : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16"/>}
                </svg>
              </button>
            </div>
          </div>
        </div>

        {menuOpen && (
          <div style={{borderTop:"1px solid rgba(182,205,200,0.6)",backgroundColor:"rgba(240,247,245,0.98)",padding:"12px 16px",display:"flex",flexDirection:"column",gap:"2px"}}>
            {NAV.map(item => {
              const active = location.pathname.startsWith(item.path);
              return (
                <button key={item.path} onClick={() => { navigate(item.path); setMenuOpen(false); }}
                  style={{width:"100%",display:"flex",alignItems:"center",gap:"12px",padding:"11px 14px",borderRadius:"10px",fontSize:"0.9rem",fontWeight:500,border:"none",cursor:"pointer",textAlign:"left",transition:"all 150ms",
                    background: active ? "#355147" : "transparent", color: active ? "white" : "#355147"}}>
                  {item.label}
                </button>
              );
            })}
            <hr style={{border:"none",borderTop:"1px solid #e5e9e8",margin:"4px 0"}}/>
            <button onClick={() => { navigate("/profile"); setMenuOpen(false); }}
              style={{width:"100%",display:"flex",padding:"11px 14px",borderRadius:"10px",fontSize:"0.9rem",fontWeight:500,border:"none",cursor:"pointer",color:"#355147",background:"transparent"}}>
              👤 {user?.name || "Profile"}
            </button>
            <button onClick={handleLogout}
              style={{width:"100%",display:"flex",padding:"11px 14px",borderRadius:"10px",fontSize:"0.9rem",fontWeight:500,border:"none",cursor:"pointer",color:"#F3161E",background:"transparent"}}>
              Sign Out
            </button>
          </div>
        )}
      </header>

      {/* Mobile bottom tabs */}
      <nav className="ll-mobile-bottom-nav" style={{position:"fixed",bottom:0,left:0,right:0,zIndex:30,background:"white",borderTop:"1px solid #f0f4f2",boxShadow:"0 -2px 12px rgba(53,81,71,0.08)",display:"none"}}>
        {NAV.slice(0,4).map(item => {
          const active = location.pathname.startsWith(item.path);
          return (
            <button key={item.path} onClick={() => navigate(item.path)}
              style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",padding:"8px 4px",fontSize:"11px",fontWeight:500,border:"none",background:"none",cursor:"pointer",color:active?"#355147":"#9ca3af",transition:"color 150ms"}}>
              {item.label}
            </button>
          );
        })}
        <button onClick={() => navigate("/profile")}
          style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",padding:"8px 4px",fontSize:"11px",fontWeight:500,border:"none",background:"none",cursor:"pointer",color:location.pathname==="/profile"?"#355147":"#9ca3af"}}>
          Profile
        </button>
      </nav>

      <style>{`
        @media (max-width:767px) {
          .ll-desktop-nav { display:none !important; }
          .ll-desktop-only { display:none !important; }
          .ll-hidden-sm { display:none; }
          .ll-mobile-only { display:flex !important; }
          .ll-mobile-bottom-nav { display:flex !important; }
          .page-mobile-pad { padding-bottom: 64px !important; }
        }
        @media (min-width:768px) {
          .ll-mobile-only { display:none !important; }
          .ll-mobile-bottom-nav { display:none !important; }
        }
        @media (max-width:1023px) { .ll-hidden-md { display:none; } }
      `}</style>
    </>
  );
}
