import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { loginUser, loginWithGoogle } from "../LearnLeaf_Functions.jsx";
import { useUser } from "../UserState.jsx";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { updateUser } = useUser();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const info = await loginUser(email, password);
      updateUser(info);
      navigate("/tasks");
    } catch(err) { alert(`Login failed: ${err.message}`); }
    finally { setLoading(false); }
  };

  const handleGoogle = async (e) => {
    e.preventDefault();
    try { await loginWithGoogle(updateUser, navigate); }
    catch(err) { alert(`Google login failed: ${err.message}`); }
  };

  return (
    <div style={{ minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",padding:"24px",background:"linear-gradient(135deg,#f0f7f5 0%,#e8f2ef 50%,#f5f0f8 100%)" }}>
      <div style={{ width:"100%",maxWidth:"420px" }}>
        {/* Logo */}
        <div style={{ textAlign:"center",marginBottom:"32px" }}>
          <div style={{ width:"56px",height:"56px",borderRadius:"16px",background:"#355147",display:"flex",alignItems:"center",justifyContent:"center",color:"white",fontFamily:"Playfair Display,serif",fontWeight:700,fontSize:"20px",margin:"0 auto 16px" }}>LL</div>
          <h1 style={{ fontFamily:"Playfair Display,serif",fontSize:"1.75rem",fontWeight:700,color:"#355147",margin:"0 0 6px" }}>LearnLeaf</h1>
          <p style={{ color:"#907474",fontSize:"0.9rem",margin:0 }}>Streamlining success, one task at a time</p>
        </div>

        {/* Card */}
        <div className="ll-card" style={{ padding:"32px" }}>
          <form onSubmit={handleSubmit} style={{ display:"flex",flexDirection:"column",gap:"16px" }}>
            <div>
              <label style={{ display:"block",fontSize:"0.78rem",fontWeight:600,color:"#6b7280",textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:"6px" }}>Email</label>
              <input type="email" className="ll-input" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} required />
            </div>
            <div>
              <label style={{ display:"block",fontSize:"0.78rem",fontWeight:600,color:"#6b7280",textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:"6px" }}>Password</label>
              <input type="password" className="ll-input" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required />
            </div>

            <button type="submit" disabled={loading}
              style={{ width:"100%",padding:"0.75rem",borderRadius:"10px",background:"#355147",color:"white",border:"none",cursor:"pointer",fontWeight:600,fontSize:"0.95rem",marginTop:"4px",opacity:loading?0.7:1,transition:"all 150ms" }}>
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          <div style={{ display:"flex",alignItems:"center",gap:"12px",margin:"20px 0" }}>
            <hr style={{ flex:1,border:"none",borderTop:"1px solid #e5e9e8" }}/>
            <span style={{ fontSize:"0.78rem",color:"#9ca3af" }}>or</span>
            <hr style={{ flex:1,border:"none",borderTop:"1px solid #e5e9e8" }}/>
          </div>

          <button onClick={handleGoogle}
            style={{ width:"100%",padding:"0.7rem",borderRadius:"10px",background:"white",color:"#374151",border:"1px solid #e5e9e8",cursor:"pointer",fontWeight:500,fontSize:"0.9rem",display:"flex",alignItems:"center",justifyContent:"center",gap:"10px",transition:"all 150ms" }}>
            <svg width="18" height="18" viewBox="0 0 18 18"><path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/><path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"/><path fill="#FBBC05" d="M3.964 10.71c-.18-.54-.282-1.117-.282-1.71s.102-1.17.282-1.71V4.958H.957C.347 6.173 0 7.548 0 9s.348 2.827.957 4.042l3.007-2.332z"/><path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/></svg>
            Continue with Google
          </button>

          <div style={{ marginTop:"24px",textAlign:"center",fontSize:"0.875rem",color:"#6b7280" }}>
            <Link to="/resetPassword" style={{ color:"#5B8E9F",textDecoration:"none",fontWeight:500 }}>Forgot password?</Link>
            <span style={{ margin:"0 8px" }}>·</span>
            <Link to="/register" style={{ color:"#355147",textDecoration:"none",fontWeight:500 }}>Create account</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
