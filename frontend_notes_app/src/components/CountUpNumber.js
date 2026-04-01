import React, { useEffect, useMemo, useRef, useState } from 'react';

const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

const usePrefersReducedMotion = () => {
  return useMemo(() => {
    try {
      return document.body?.dataset?.reduceMotion === '1';
    } catch (e) {
      return false;
    }
  }, []);
};

const CountUpNumber = ({ value, duration = 800, format }) => {
  const target = Number(value) || 0;
  const reduceMotion = usePrefersReducedMotion();
  const [display, setDisplay] = useState(target);
  const displayRef = useRef(target);
  const rafRef = useRef(0);
  const startRef = useRef(0);
  const fromRef = useRef(target);
  const toRef = useRef(target);

  useEffect(() => {
    if (reduceMotion) {
      displayRef.current = target;
      setDisplay(target);
      return;
    }
    fromRef.current = Number(displayRef.current) || 0;
    toRef.current = target;
    startRef.current = 0;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);

    const tick = (ts) => {
      if (!startRef.current) startRef.current = ts;
      const elapsed = ts - startRef.current;
      const p = Math.min(1, elapsed / Math.max(1, duration));
      const v = fromRef.current + (toRef.current - fromRef.current) * easeOutCubic(p);
      displayRef.current = v;
      setDisplay(v);
      if (p < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [duration, reduceMotion, target]);

  const text = useMemo(() => {
    if (typeof format === 'function') return format(display, target);
    return String(Math.round(display));
  }, [display, format, target]);

  return <>{text}</>;
};

export default CountUpNumber;
