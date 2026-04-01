import React, { useEffect, useMemo, useState } from 'react';
import { Box, Button, Slider, Stack, Typography } from '@mui/material';
import { useLocation } from 'react-router-dom';
import { trackEvent } from '../utils/analytics';

const LS_KEY = 'ui_compare_ref_v1';
const LS_STATE = 'ui_compare_state_v1';

const readJson = (k, fallback) => {
  try {
    const raw = localStorage.getItem(k);
    if (!raw) return fallback;
    const v = JSON.parse(raw);
    return v ?? fallback;
  } catch (e) {
    return fallback;
  }
};

const writeJson = (k, v) => {
  try {
    localStorage.setItem(k, JSON.stringify(v));
  } catch (e) {}
};

const UIOverlayCompare = () => {
  const location = useLocation();
  const enabled = useMemo(() => {
    const s = new URLSearchParams(location.search || '');
    return s.get('compare') === '1';
  }, [location.search]);

  const [ref, setRef] = useState(() => {
    try {
      return localStorage.getItem(LS_KEY) || '';
    } catch (e) {
      return '';
    }
  });
  const [state, setState] = useState(() => readJson(LS_STATE, { opacity: 0.5, x: 0, y: 0, visible: true }));

  useEffect(() => {
    if (!enabled) return;
    try {
      document.body.dataset.modalOpen = '1';
      return () => {
        delete document.body.dataset.modalOpen;
      };
    } catch (e) {
      return undefined;
    }
  }, [enabled]);

  useEffect(() => {
    writeJson(LS_STATE, state);
  }, [state]);

  if (!enabled) return null;

  const onPick = async (file) => {
    if (!file) return;
    trackEvent('ui_compare_pick_ref', { name: file.name, size: file.size });
    const reader = new FileReader();
    const dataUrl = await new Promise((resolve, reject) => {
      reader.onerror = () => reject(new Error('read failed'));
      reader.onload = () => resolve(String(reader.result || ''));
      reader.readAsDataURL(file);
    });
    try {
      localStorage.setItem(LS_KEY, dataUrl);
    } catch (e) {}
    setRef(dataUrl);
  };

  return (
    <>
      {ref && state.visible ? (
        <Box
          sx={{
            position: 'fixed',
            inset: 0,
            zIndex: 2000,
            pointerEvents: 'none',
            opacity: Math.max(0, Math.min(1, Number(state.opacity) || 0.5)),
            transform: `translate3d(${Number(state.x) || 0}px, ${Number(state.y) || 0}px, 0)`,
            backgroundImage: `url(${ref})`,
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'top left',
            backgroundSize: 'contain',
          }}
        />
      ) : null}

      <Box
        sx={{
          position: 'fixed',
          right: 16,
          bottom: 16,
          zIndex: 2100,
          width: 320,
          borderRadius: '16px',
          bgcolor: 'rgba(255,255,255,0.92)',
          border: '1px solid rgba(2,6,23,0.10)',
          backdropFilter: 'blur(16px)',
          boxShadow: '0 18px 60px rgba(0,0,0,0.18)',
          p: 2,
        }}
      >
        <Stack spacing={1.25}>
          <Typography variant="subtitle2" sx={{ fontWeight: 900 }}>
            叠加对比（compare=1）
          </Typography>
          <Typography variant="caption" color="text.secondary">
            上传参照图后，可调节透明度与偏移；用于逐像素对齐（误差>1px 需修正）
          </Typography>

          <Button variant="outlined" component="label">
            上传参照图
            <input
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onPick(f);
                e.target.value = '';
              }}
            />
          </Button>

          <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
            <Typography variant="caption" color="text.secondary">显示</Typography>
            <Button
              size="small"
              variant={state.visible ? 'contained' : 'outlined'}
              onClick={() => {
                trackEvent('ui_compare_toggle', { visible: !state.visible });
                setState((p) => ({ ...p, visible: !p.visible }));
              }}
            >
              {state.visible ? '开' : '关'}
            </Button>
          </Stack>

          <Box>
            <Typography variant="caption" color="text.secondary">透明度</Typography>
            <Slider
              size="small"
              min={0}
              max={1}
              step={0.01}
              value={Number(state.opacity) || 0}
              onChange={(_, v) => setState((p) => ({ ...p, opacity: Array.isArray(v) ? v[0] : v }))}
            />
          </Box>

          <Stack direction="row" spacing={1} alignItems="center">
            <Box sx={{ flex: 1 }}>
              <Typography variant="caption" color="text.secondary">X 偏移</Typography>
              <Slider
                size="small"
                min={-200}
                max={200}
                step={1}
                value={Number(state.x) || 0}
                onChange={(_, v) => setState((p) => ({ ...p, x: Array.isArray(v) ? v[0] : v }))}
              />
            </Box>
            <Box sx={{ flex: 1 }}>
              <Typography variant="caption" color="text.secondary">Y 偏移</Typography>
              <Slider
                size="small"
                min={-200}
                max={200}
                step={1}
                value={Number(state.y) || 0}
                onChange={(_, v) => setState((p) => ({ ...p, y: Array.isArray(v) ? v[0] : v }))}
              />
            </Box>
          </Stack>

          <Button
            size="small"
            variant="text"
            onClick={() => {
              trackEvent('ui_compare_reset');
              setState({ opacity: 0.5, x: 0, y: 0, visible: true });
            }}
          >
            重置
          </Button>
        </Stack>
      </Box>
    </>
  );
};

export default UIOverlayCompare;

