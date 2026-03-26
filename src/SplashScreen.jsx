import React from "react";

export default function SplashScreen({ message = "Loading LearnLeaf..." }) {
  return (
    <div style={{
      position: "fixed", inset: 0, display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      background: "linear-gradient(135deg,#f0f7f5 0%,#e8f2ef 50%,#f5f0f8 100%)",
      zIndex: 9999,
    }}>
      <div style={{
        width: "60px", height: "60px", borderRadius: "16px", background: "#355147",
        display: "flex", alignItems: "center", justifyContent: "center",
        color: "white", fontFamily: "Playfair Display,serif", fontWeight: 700,
        fontSize: "22px", marginBottom: "24px",
        animation: "pulse 1.5s ease-in-out infinite",
      }}>
        LL
      </div>

      {/* Animated dots bar */}
      <div style={{ display: "flex", gap: "6px", marginBottom: "16px" }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{
            width: "8px", height: "8px", borderRadius: "50%", background: "#B6CDC8",
            animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite`,
          }} />
        ))}
      </div>

      <p style={{ color: "#907474", fontSize: "0.875rem", fontWeight: 500, margin: 0 }}>
        {message}
      </p>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%       { opacity: 0.8; transform: scale(0.96); }
        }
        @keyframes bounce {
          0%, 80%, 100% { transform: translateY(0);    opacity: 0.4; }
          40%           { transform: translateY(-8px); opacity: 1; }
        }
      `}</style>
    </div>
  );
}