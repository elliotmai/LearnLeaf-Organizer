import React from "react";
export default function LoadingSpinner({ message = "Loading..." }) {
  return (
    <div style={{ display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:"200px",gap:"16px" }}>
      <div style={{ width:"40px",height:"40px",border:"3px solid #B6CDC8",borderTopColor:"#355147",borderRadius:"50%",animation:"spin 0.8s linear infinite" }}/>
      <p style={{ color:"#907474",fontSize:"0.875rem",fontWeight:500 }}>{message}</p>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
