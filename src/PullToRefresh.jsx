import React, { useState } from 'react';

function PullToRefresh({ children }) {
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
      style={{ overflow: 'hidden', touchAction: 'pan-y' }}
    >
      {/* Optional: Show a visual indicator */}
      {pulling && <div style={{ textAlign: 'center' }}>Refreshing...</div>}
      {children}
    </div>
  );
}

export default PullToRefresh;