import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { registerUser } from "../LearnLeaf_Functions.jsx";

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await registerUser(email, password, name);
      navigate("/");
    } catch(err) { alert(`Registration failed: ${err.message}`); }
  };

  return (
    <div style={{ minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",padding:"24px",background:"linear-gradient(135deg,#f0f7f5 0%,#e8f2ef 50%,#f5f0f8 100%)" }}>
      <div style={{ width:"100%",maxWidth:"420px" }}>
        <div style={{ textAlign:"center",marginBottom:"32px" }}>
          <div style={{ width:"56px",height:"56px",borderRadius:"16px",background:"#355147",display:"flex",alignItems:"center",justifyContent:"center",color:"white",fontFamily:"Playfair Display,serif",fontWeight:700,fontSize:"20px",margin:"0 auto 16px" }}>LL</div>
          <h1 style={{ fontFamily:"Playfair Display,serif",fontSize:"1.75rem",fontWeight:700,color:"#355147",margin:"0 0 6px" }}>Create Account</h1>
          <p style={{ color:"#907474",fontSize:"0.9rem",margin:0 }}>Join LearnLeaf to organize your studies</p>
        </div>
        <div className="ll-card" style={{ padding:"32px" }}>
          <form onSubmit={handleSubmit} style={{ display:"flex",flexDirection:"column",gap:"16px" }}>
            {[["Name","text",name,setName,"Your full name"],["Email","email",email,setEmail,"you@example.com"],["Password","password",password,setPassword,"At least 6 characters"]].map(([lbl,type,val,setter,ph]) => (
              <div key={lbl}>
                <label style={{ display:"block",fontSize:"0.78rem",fontWeight:600,color:"#6b7280",textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:"6px" }}>{lbl}</label>
                <input type={type} className="ll-input" placeholder={ph} value={val} onChange={e => setter(e.target.value)} required />
              </div>
            ))}
            <button type="submit"
              style={{ width:"100%",padding:"0.75rem",borderRadius:"10px",background:"#355147",color:"white",border:"none",cursor:"pointer",fontWeight:600,fontSize:"0.95rem",marginTop:"4px" }}>
              Create Account
            </button>
          </form>
          <div style={{ marginTop:"20px",textAlign:"center",fontSize:"0.875rem",color:"#6b7280" }}>
            Already have an account? <Link to="/" style={{ color:"#355147",textDecoration:"none",fontWeight:500 }}>Sign In</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
