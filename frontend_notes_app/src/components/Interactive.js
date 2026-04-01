import React from 'react';
import { ButtonBase, Tooltip } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { trackEvent, trackNavigate } from '../utils/analytics';

const elasticMs = 200;

const triggerElastic = (el) => {
  if (!el) return;
  try {
    el.dataset.elastic = '1';
    window.setTimeout(() => {
      try {
        delete el.dataset.elastic;
      } catch (e) {
        el.removeAttribute('data-elastic');
      }
    }, elasticMs + 30);
  } catch (e) {}
};

const updateMouseVars = (el, e) => {
  if (!el) return;
  const r = el.getBoundingClientRect();
  const x = ((e.clientX - r.left) / Math.max(1, r.width)) * 100;
  const y = ((e.clientY - r.top) / Math.max(1, r.height)) * 100;
  el.style.setProperty('--mx', `${Math.max(0, Math.min(100, x))}%`);
  el.style.setProperty('--my', `${Math.max(0, Math.min(100, y))}%`);
};

const baseSx = {
  position: 'relative',
  display: 'block',
  width: '100%',
  textAlign: 'left',
  borderRadius: 2,
  overflow: 'hidden',
  WebkitTapHighlightColor: 'transparent',
  transitionProperty: 'transform, opacity, background-color',
  transitionDuration: '300ms',
  transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
  transform: 'translateZ(0)',
  '&:before': {
    content: '""',
    position: 'absolute',
    inset: -2,
    background:
      'radial-gradient(260px 140px at var(--mx, 35%) var(--my, 35%), rgba(var(--accent-rgb) / 0.22), transparent 60%)',
    opacity: 0,
    transition: 'opacity 180ms ease',
    pointerEvents: 'none',
  },
  '&[data-elastic="1"]': {
    animation: 'elastic-click 200ms ease-out 1',
  },
  '&:hover': {
    backgroundColor: 'rgba(255,255,255,0.06)',
    '&:before': { opacity: 1 },
  },
  '&:active': {
    transform: 'scale(0.98)',
  },
  '&.interactive-card': {
    backgroundColor: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.10)',
  },
  '&.interactive-card:after': {
    content: '""',
    position: 'absolute',
    inset: 0,
    borderRadius: 'inherit',
    pointerEvents: 'none',
    opacity: 0,
    transition: 'opacity 300ms cubic-bezier(0.4, 0, 0.2, 1)',
    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
  },
  '&.interactive-card:hover': {
    transform: 'translateY(-1px)',
  },
  '&.interactive-card:hover:after': {
    opacity: 1,
  },
  '&.interactive-disabled': {
    opacity: 0.45,
    pointerEvents: 'none',
  },
};

const Interactive = ({
  children,
  to,
  onClick,
  eventName,
  eventProps,
  disabled = false,
  disabledReason,
  className,
  sx,
  ...rest
}) => {
  const navigate = useNavigate();
  const isDisabled = Boolean(disabled);
  const hasTooltip = Boolean(disabledReason);

  const handleClick = (e) => {
    triggerElastic(e.currentTarget);
    if (eventName) {
      if (to) trackNavigate(eventName, to, eventProps);
      else trackEvent(eventName, eventProps);
    }
    if (typeof onClick === 'function') onClick(e);
    if (to) navigate(to);
  };

  const btn = (
    <ButtonBase
      onClick={handleClick}
      onMouseMove={(e) => {
        updateMouseVars(e.currentTarget, e);
        if (typeof rest.onMouseMove === 'function') rest.onMouseMove(e);
      }}
      className={[
        className,
        isDisabled ? 'interactive-disabled' : null,
      ]
        .filter(Boolean)
        .join(' ')}
      sx={{ ...baseSx, ...(sx || {}) }}
      focusRipple
      disabled={isDisabled}
      {...rest}
    >
      {children}
    </ButtonBase>
  );

  if (!hasTooltip) return btn;

  return (
    <Tooltip title={disabledReason}>
      <span style={{ display: 'block', borderRadius: 8 }}>
        {btn}
      </span>
    </Tooltip>
  );
};

export default Interactive;
