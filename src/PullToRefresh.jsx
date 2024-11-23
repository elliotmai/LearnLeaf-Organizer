import React, { useState } from 'react';
import { CircularProgress } from '@mui/material'; // Example: Material-UI spinner

export function PullToRefresh({ children }) {
  const [startY, setStartY] = useState(null);
  const [pulling, setPulling] = useState(false);

  const handleTouchStart = (e) => {
    setStartY(e.touches[0].clientY);
  };

  const handleTouchMove = (e) => {
    if (startY === null) return;

    const currentY = e.touches[0].clientY;
    const diff = currentY - startY;

    // If the user pulls down more than 50px
    if (diff > 50) {
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
      style={{ overflow: 'hidden', touchAction: 'pan-y', position: 'relative' }}
    >
      {/* Show a refresh icon or spinner when pulling */}
      {pulling && (
        <div
          style={{
            position: 'absolute',
            top: '10px',
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <CircularProgress size={24} />
          <span style={{ marginLeft: '10px' }}>Refresh...</span>
        </div>
      )}
      {children}
    </div>
  );
}

export default PullToRefresh;
