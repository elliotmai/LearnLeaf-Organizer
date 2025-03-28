// NetworkStatusToast.jsx
import React, { useEffect } from 'react';
import './NetworkStatusToast.css';

export default function NetworkStatusToast({ message, type, onClose }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className={`network-toast ${type}`}>
      {message}
    </div>
  );
}
