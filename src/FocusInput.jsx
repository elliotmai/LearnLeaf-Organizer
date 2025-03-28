// FocusInput.jsx
import React, { useRef } from 'react';

const FocusInput = (props) => {
  const ref = useRef(null);

  return (
    <input
      {...props}
      ref={ref}
      onFocus={(e) => {
        // iOS sometimes ignores initial focus, delay and force it
        setTimeout(() => {
          try {
            ref.current?.focus();
            ref.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          } catch (err) {
            console.warn('Focus fail:', err);
          }
        }, 100);
      }}
      onTouchEnd={() => {
        setTimeout(() => {
          ref.current?.focus();
        }, 50);
      }}
    />
  );
};

export default FocusInput;
