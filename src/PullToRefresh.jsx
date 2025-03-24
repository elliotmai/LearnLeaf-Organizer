import React, { useState, useEffect } from 'react';
import { CircularProgress } from '@mui/material'; // Material-UI spinner

export function PullToRefresh({ children }) {
  const [startY, setStartY] = useState(null);
  const [diff, setDiff] = useState(0); // Track the current pull distance
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
    const newDiff = currentY - startY;

    if (newDiff > 0) {
      setDiff(newDiff);

      // If the user pulls down more than 150px, show the spinner
      if (newDiff > 150) {
        setPulling(true);
      } else {
        setPulling(false);
      }
    }
  };

  const handleTouchEnd = () => {
    if (pulling && diff > 150) {
      // Only reload if the pull distance was sufficient
      window.location.reload();
    }
    // Reset state after touch ends
    setPulling(false);
    setStartY(null);
    setDiff(0);
  };

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{
        position: 'relative',
        height: '100%',
        maxHeight: '-webkit-fill-available', 
        width: '100vw', // Explicitly set width to 100vw to prevent adjustments
        overflowY: 'auto',
        WebkitOverflowScrolling: 'touch',
        touchAction: 'pan-y',
        boxSizing: 'border-box', // Ensure padding and borders don’t affect width
      }}
    >
      {/* Show a refresh icon or spinner when pulling */}
      {pulling && (
        <div
          style={{
            position: 'absolute', // Use fixed positioning for consistency
            top: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 1000, // Ensure it appears above all other content
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none', // Ensure the spinner doesn't interfere with user interactions
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
