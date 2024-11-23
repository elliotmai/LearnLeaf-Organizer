import React, { useState, useEffect } from 'react';
import { CircularProgress } from '@mui/material'; // Material-UI spinner

export function PullToRefresh({ children }) {
  const [startY, setStartY] = useState(null);
  const [pulling, setPulling] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if the app is running in standalone mode
    const standalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
    setIsStandalone(standalone);
  }, []);

  const handleTouchStart = (e) => {
    if (!isStandalone) return; // Only handle if in standalone mode
    setStartY(e.touches[0].clientY);
  };

  const handleTouchMove = (e) => {
    if (!isStandalone || startY === null) return;

    const currentY = e.touches[0].clientY;
    const diff = currentY - startY;

    // If the user pulls down more than 150px
    if (diff > 150) {
      setPulling(true);
    }
  };

  const handleTouchEnd = () => {
    if (pulling) {
      setPulling(false);
      setStartY(null);
      // Trigger page reload
      window.location.reload();
    }
  };

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{
        position: 'relative',
        height: '100vh',
        overflow: 'hidden',
        touchAction: 'pan-y',
      }}
    >
      {/* Show a refresh icon or spinner when pulling */}
      {pulling && (
        <div
          style={{
            position: 'fixed', // Use fixed positioning for consistency
            top: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 1000, // Ensure it appears above all other content
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(255, 255, 255, 0.8)', // Optional: Add a background
            borderRadius: '50%',
            padding: '10px',
          }}
        >
          <CircularProgress size={24} />
        </div>
      )}
      {children}
    </div>
  );
}

export default PullToRefresh;