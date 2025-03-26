import React, { useState, useEffect } from 'react';
import { CircularProgress } from '@mui/material';

export function PullToRefresh({ children }) {
  const [startY, setStartY] = useState(null);
  const [diff, setDiff] = useState(0);
  const [pulling, setPulling] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    const standalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
    setIsStandalone(standalone);
  }, []);

  const handleTouchStart = (e) => {
    if (!isStandalone) return;
    const touchY = e.touches[0].clientY;
    const screenHeight = window.innerHeight;
    const scrollTop = e.currentTarget.scrollTop;

    // Only activate if user starts touching in top 10% of screen and is at scrollTop 0
    if (scrollTop > 0 || touchY > screenHeight * 0.1) return;

    setStartY(touchY);
  };

  const handleTouchMove = (e) => {
    if (!isStandalone || startY === null) return;

    const currentY = e.touches[0].clientY;
    const newDiff = currentY - startY;

    if (newDiff <= 0) return; // Ignore upward swipes

    const screenHeight = window.innerHeight;
    const maxPull = screenHeight * 0.4;

    // if (newDiff >= maxPull) {
    //   // Treat as end of gesture
    //   setDiff(maxPull);
    //   setPulling(true);
    //   handleTouchEnd(); // Immediately handle as a full pull
    // } else {
      setDiff(newDiff);
      setPulling(newDiff > 30); // Show spinner after small threshold
    // }
  };

  const handleTouchEnd = () => {
    const screenHeight = window.innerHeight;
    const maxPull = screenHeight * 0.4;

    if (pulling && diff >= maxPull) {
      window.location.reload(); // Trigger refresh
    }

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
        width: '100vw',
        overflowY: 'auto',
        WebkitOverflowScrolling: 'touch',
        touchAction: 'pan-y',
        boxSizing: 'border-box',
      }}
    >
      {pulling && (
        <div
          style={{
            position: 'absolute',
            top: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none',
            borderRadius: '50%',
            padding: '10px',
          }}
        >
          <CircularProgress size={24} />
        </div>
      )}
      <div
        style={{
          transform: `translateY(${diff}px)`,
          transition: pulling ? 'none' : 'transform 0.2s ease',
        }}
      >
        {children}
      </div>
    </div>
  );
}

export default PullToRefresh;