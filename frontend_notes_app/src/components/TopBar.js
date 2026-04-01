import React, { useContext } from 'react';
import { Box, Stack, Typography, Button, ToggleButton, ToggleButtonGroup, IconButton } from '@mui/material';
import {
  SearchOutlined,
  AddOutlined,
  LightModeOutlined,
  DarkModeOutlined,
  ContrastOutlined,
  NoteOutlined,
  ChecklistOutlined,
  HubOutlined,
  SettingsOutlined,
  MenuOutlined
} from '@mui/icons-material';
import { useLocation, useNavigate } from 'react-router-dom';
import { ThemeNameContext } from '../index';
import { trackEvent, trackNavigate } from '../utils/analytics';

const pillButtonSx = {
  height: 38,
  borderRadius: '16px',
  px: 1.5,
  minWidth: 0,
  whiteSpace: 'nowrap',
};

const TopBar = ({ onOpenPalette, onCreateNote, onOpenSettings, onOpenDrawer }) => {
  const { themeName, setThemeName } = useContext(ThemeNameContext);
  const navigate = useNavigate();
  const location = useLocation();

  const view = location.pathname.startsWith('/todos')
    ? 'todos'
    : location.pathname.startsWith('/mindmap')
      ? 'mindmap'
      : location.pathname.startsWith('/notes') || location.pathname.startsWith('/folders') || location.pathname.startsWith('/tags')
        ? 'notes'
        : 'dashboard';

  return (
    <Box
      sx={{
        height: 56,
        px: 2,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderRadius: '16px',
        bgcolor: 'background.paper',
        border: '1px solid rgba(255,255,255,0.08)',
        boxShadow: '0 18px 60px rgba(0,0,0,0.35)',
        position: 'relative',
        overflow: 'hidden',
        '&:before': {
          content: '""',
          position: 'absolute',
          inset: -2,
          background:
            'linear-gradient(135deg, rgba(124,77,255,0.38), rgba(34,197,94,0.22), rgba(56,189,248,0.18))',
          filter: 'blur(18px)',
          opacity: 0.55,
          pointerEvents: 'none',
        },
        '&:after': {
          content: '""',
          position: 'absolute',
          top: -40,
          left: -120,
          width: 220,
          height: 140,
          background: 'radial-gradient(circle at 30% 40%, rgba(255,255,255,0.18), transparent 60%)',
          transform: 'rotate(12deg)',
          opacity: 0.45,
          pointerEvents: 'none',
        },
      }}
    >
      <Stack direction="row" spacing={1.25} alignItems="center" sx={{ position: 'relative', zIndex: 1 }}>
        <IconButton
          sx={{ display: { xs: 'inline-flex', md: 'none' }, color: 'text.primary' }}
          onClick={onOpenDrawer}
        >
          <MenuOutlined />
        </IconButton>
        <Box
          sx={{
            width: 10,
            height: 10,
            display: { xs: 'none', md: 'block' },
            borderRadius: 10,
            backgroundImage: 'linear-gradient(135deg, rgb(var(--accent-rgb)) 0%, rgba(34,197,94,0.95) 120%)',
            boxShadow: '0 10px 30px rgba(var(--accent-rgb) / 0.30)',
          }}
        />
        <Box sx={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1 }}>
          <Typography
            variant="subtitle1"
            sx={{
              fontWeight: 950,
              letterSpacing: 0.2,
              backgroundImage:
                'linear-gradient(90deg, rgba(56,189,248,0.95), rgba(var(--accent-rgb) / 0.95), rgba(34,197,94,0.95))',
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              color: 'transparent',
            }}
          >
            Notes Dashboard
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary', letterSpacing: 0.9, opacity: 0.85 }}>
            UI DESIGN
          </Typography>
        </Box>
        <Typography variant="caption" sx={{ color: 'text.secondary', display: { xs: 'none', sm: 'block' } }}>
          Ctrl + K 快速搜索与命令
        </Typography>
      </Stack>

      <Stack direction="row" spacing={1} alignItems="center" sx={{ position: 'relative', zIndex: 1 }}>
        <ToggleButtonGroup
          value={view}
          exclusive
          size="small"
          onChange={(_, v) => {
            if (!v) return;
            if (v === 'dashboard') {
              trackNavigate('nav_topbar_dashboard', '/');
              navigate('/');
            }
            if (v === 'notes') {
              trackNavigate('nav_topbar_notes', '/notes');
              navigate('/notes');
            }
            if (v === 'todos') {
              trackNavigate('nav_topbar_todos', '/todos');
              navigate('/todos');
            }
            if (v === 'mindmap') {
              trackNavigate('nav_topbar_mindmap', '/mindmap');
              navigate('/mindmap');
            }
          }}
          sx={{
            display: { xs: 'none', md: 'inline-flex' },
            borderRadius: '16px',
            bgcolor: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.10)',
            overflow: 'hidden',
            '& .MuiToggleButton-root': {
              border: 'none',
              borderRadius: 0,
              px: 1.25,
              height: 38,
              gap: 0.75,
              fontWeight: 800,
            },
          }}
        >
          <ToggleButton value="dashboard" aria-label="dashboard">
            <Box
              sx={{
                width: 10,
                height: 10,
                borderRadius: 10,
                backgroundImage: 'linear-gradient(135deg, rgba(56,189,248,0.95), rgba(var(--accent-rgb) / 0.95))',
                boxShadow: '0 10px 24px rgba(var(--accent-rgb) / 0.22)',
              }}
            />
            <span>仪表盘</span>
          </ToggleButton>
          <ToggleButton value="notes" aria-label="notes">
            <NoteOutlined fontSize="small" />
            <span>笔记</span>
          </ToggleButton>
          <ToggleButton value="todos" aria-label="todos">
            <ChecklistOutlined fontSize="small" />
            <span>代办</span>
          </ToggleButton>
          <ToggleButton value="mindmap" aria-label="mindmap">
            <HubOutlined fontSize="small" />
            <span>导图</span>
          </ToggleButton>
        </ToggleButtonGroup>

        <ToggleButtonGroup
          value={themeName}
          exclusive
          size="small"
          onChange={(_, v) => {
            if (!v) return;
            trackEvent('theme_switch', { to: v });
            setThemeName(v);
          }}
          sx={{
            display: { xs: 'none', md: 'inline-flex' },
            borderRadius: '16px',
            bgcolor: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.10)',
            overflow: 'hidden',
            '& .MuiToggleButton-root': {
              border: 'none',
              borderRadius: 0,
              px: 1,
              height: 38,
            },
          }}
        >
          <ToggleButton value="midnight" aria-label="midnight">
            <DarkModeOutlined fontSize="small" />
          </ToggleButton>
          <ToggleButton value="graphite" aria-label="graphite">
            <ContrastOutlined fontSize="small" />
          </ToggleButton>
          <ToggleButton value="daylight" aria-label="daylight">
            <LightModeOutlined fontSize="small" />
          </ToggleButton>
        </ToggleButtonGroup>

        <Button
          variant="outlined"
          startIcon={<SearchOutlined />}
          onClick={() => {
            trackEvent('open_palette');
            onOpenPalette();
          }}
          sx={{ ...pillButtonSx, minWidth: { xs: 38, md: 0 }, px: { xs: 0, md: 1.5 }, '& .MuiButton-startIcon': { margin: { xs: 0, md: 'inherit' } } }}
        >
          <Box component="span" sx={{ display: { xs: 'none', md: 'inline' } }}>搜索</Box>
        </Button>
        <Button
          variant="outlined"
          startIcon={<SettingsOutlined />}
          onClick={() => {
            trackEvent('open_settings');
            onOpenSettings();
          }}
          sx={{ ...pillButtonSx, minWidth: { xs: 38, md: 0 }, px: { xs: 0, md: 1.5 }, '& .MuiButton-startIcon': { margin: { xs: 0, md: 'inherit' } } }}
        >
          <Box component="span" sx={{ display: { xs: 'none', md: 'inline' } }}>设置</Box>
        </Button>
        <Button
          variant="contained"
          startIcon={<AddOutlined />}
          onClick={() => {
            trackEvent('create_note_topbar');
            onCreateNote();
          }}
          sx={{ ...pillButtonSx, height: 40, minWidth: { xs: 40, md: 0 }, px: { xs: 0, md: 2 }, '& .MuiButton-startIcon': { margin: { xs: 0, md: 'inherit' } } }}
        >
          <Box component="span" sx={{ display: { xs: 'none', md: 'inline' } }}>新建</Box>
        </Button>
      </Stack>
    </Box>
  );
};

export default TopBar;
