// ToastUpdateNotice.jsx
import React from 'react';

const ToastUpdateNotice = ({ onReload }) => {
  return (
    <div style={{
      position: 'absolute',
      bottom: 20,
      left: '50%',
      transform: 'translateX(-50%)',
      background: '#35584A',
      color: '#fff',
      padding: '12px 20px',
      borderRadius: '8px',
      boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
      zIndex: 9999,
      cursor: 'pointer',
    }}
    onClick={onReload}
    >
      A new version is available. Tap to refresh.
    </div>
  );
};

export default ToastUpdateNotice;
