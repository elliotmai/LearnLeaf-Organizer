// FocusInput.jsx
import React, { useRef } from 'react';

const FocusInput = (props) => {
  const inputRef = useRef(null);

  return (
    <input
      {...props}
      ref={inputRef}
      onTouchStart={() => {
        setTimeout(() => {
          inputRef.current?.focus();
        }, 50);
      }}
    />
  );
};

export default FocusInput;
