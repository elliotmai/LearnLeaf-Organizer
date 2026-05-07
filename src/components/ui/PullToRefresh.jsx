import React, { useEffect, useRef, useState } from "react";
import { useUser } from "../../UserState.jsx";

const THRESHOLD = 70;
const MAX_PULL  = 120;
const RESISTANCE = 0.5;

export default function PullToRefresh() {
  const { user, refreshData, refreshing } = useUser();
  const [pullDistance, setPullDistance] = useState(0);
  const startY  = useRef(0);
  const pulling = useRef(false);

  useEffect(() => {
    if (!user?.id) return;

    const isScrollableAncestor = (el) => {
      while (el && el !== document.body) {
        const style = window.getComputedStyle(el);
        const oy = style.overflowY;
        if ((oy === 'auto' || oy === 'scroll') && el.scrollTop > 0) return true;
        el = el.parentElement;
      }
      return false;
    };

    const onTouchStart = (e) => {
      if (refreshing) return;
      if (window.scrollY > 0) return;
      if (isScrollableAncestor(e.target)) return;
      startY.current = e.touches[0].clientY;
      pulling.current = true;
    };

    const onTouchMove = (e) => {
      if (!pulling.current || refreshing) return;
      const delta = e.touches[0].clientY - startY.current;
      if (delta <= 0) {
        pulling.current = false;
        setPullDistance(0);
        return;
      }
      if (window.scrollY > 0) {
        pulling.current = false;
        setPullDistance(0);
        return;
      }
      const damped = Math.min(MAX_PULL, delta * RESISTANCE);
      setPullDistance(damped);
      if (delta > 5 && e.cancelable) e.preventDefault();
    };

    const onTouchEnd = async () => {
      if (!pulling.current) return;
      pulling.current = false;
      const shouldRefresh = pullDistance >= THRESHOLD;
      if (shouldRefresh) {
        setPullDistance(60);
        try { await refreshData(); } catch {}
        setPullDistance(0);
      } else {
        setPullDistance(0);
      }
    };

    document.addEventListener('touchstart', onTouchStart, { passive: true });
    document.addEventListener('touchmove',  onTouchMove,  { passive: false });
    document.addEventListener('touchend',   onTouchEnd);
    document.addEventListener('touchcancel', onTouchEnd);
    return () => {
      document.removeEventListener('touchstart', onTouchStart);
      document.removeEventListener('touchmove',  onTouchMove);
      document.removeEventListener('touchend',   onTouchEnd);
      document.removeEventListener('touchcancel', onTouchEnd);
    };
  }, [user, refreshing, refreshData, pullDistance]);

  if (pullDistance === 0 && !refreshing) return null;

  const visualOffset = refreshing ? 60 : pullDistance;
  const progress = Math.min(1, pullDistance / THRESHOLD);
  const ready = pullDistance >= THRESHOLD;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0, left: 0, right: 0,
        display: 'flex',
        justifyContent: 'center',
        pointerEvents: 'none',
        zIndex: 9999,
        transform: `translateY(${Math.max(0, visualOffset - 40)}px)`,
        transition: refreshing || pullDistance === 0 ? 'transform 200ms ease' : 'none',
      }}
    >
      <div
        style={{
          background: 'white',
          padding: '8px 16px',
          borderRadius: '999px',
          boxShadow: '0 2px 12px rgba(0,0,0,0.12)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          opacity: refreshing ? 1 : progress,
        }}
      >
        <div
          style={{
            width: 18, height: 18, borderRadius: '50%',
            border: '2px solid #B6CDC8',
            borderTopColor: '#355147',
            animation: refreshing ? 'll-ptr-spin 0.8s linear infinite' : 'none',
            transform: refreshing ? 'none' : `rotate(${progress * 270}deg)`,
            transition: refreshing ? 'none' : 'transform 60ms linear',
          }}
        />
        <span style={{ fontSize: '0.8rem', color: '#355147', fontWeight: 500 }}>
          {refreshing ? 'Refreshing...' : ready ? 'Release to refresh' : 'Pull to refresh'}
        </span>
      </div>
      <style>{`@keyframes ll-ptr-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
