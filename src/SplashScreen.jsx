import React from "react";
export default function SplashScreen({ message = "Loading LearnLeaf..." }) {
  return (
    <div style={{ position:"fixed",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",background:"linear-gradient(135deg,#f0f7f5 0%,#e8f2ef 50%,#f5f0f8 100%)",zIndex:9999 }}>
      <div style={{ width:"60px",height:"60px",borderRadius:"16px",background:"#355147",display:"flex",alignItems:"center",justifyContent:"center",color:"white",fontFamily:"Playfair Display,serif",fontWeight:700,fontSize:"22px",marginBottom:"20px",animation:"pulse 1.5s ease-in-out infinite" }}>
        LL
      </div>
      <p style={{ color:"#907474",fontSize:"0.9rem",fontWeight:500 }}>{message}</p>
      <style>{`@keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.8;transform:scale(0.96)} }`}</style>
    </div>
  );
}
