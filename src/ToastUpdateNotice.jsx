// ToastUpdateNotice.jsx
import React from 'react';

const ToastUpdateNotice = ({ onClose, version }) => {
  return (
    <div
      style={{
        position: 'fixed',
        bottom: 20,
        left: '50%',
        transform: 'translateX(-50%)',
        background: '#35584A',
        color: '#fff',
        padding: '12px 20px',
        borderRadius: '8px',
        boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
        zIndex: 9999,
        fontSize: '0.95rem',
        cursor: 'pointer',
      }}
      onClick={onClose}
    >
      LearnLeaf was updated to version {version || 'latest'}. Tap to dismiss.
    </div>
  );
};

export default ToastUpdateNotice;