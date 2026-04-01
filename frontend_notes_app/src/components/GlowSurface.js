import React, { useRef } from 'react';

const GlowSurface = ({ className, style, onClick, children, ...rest }) => {
  const ref = useRef(null);

  const onMove = (e) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * 100;
    const y = ((e.clientY - r.top) / r.height) * 100;
    el.style.setProperty('--mx', `${Math.max(0, Math.min(100, x))}%`);
    el.style.setProperty('--my', `${Math.max(0, Math.min(100, y))}%`);
  };

  return (
    <div
      ref={ref}
      className={className}
      style={style}
      onMouseMove={onMove}
      onClick={onClick}
      {...rest}
    >
      {children}
    </div>
  );
};

export default GlowSurface;

