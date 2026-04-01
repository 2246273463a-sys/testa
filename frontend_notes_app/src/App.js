import React, { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import { Box, Typography, Stack, Button, IconButton, Menu, MenuItem, CircularProgress, useMediaQuery, useTheme, Divider, List, ListItemButton, ListItemIcon, ListItemText } from '@mui/material';
import { CreateNewFolderOutlined, NoteAddOutlined, AddOutlined, DashboardOutlined, NoteOutlined, ChecklistOutlined, HubOutlined } from '@mui/icons-material';
import { useLocation, useNavigate } from 'react-router-dom';

// 导入 ErrorBoundary
import ErrorBoundary from './ErrorBoundary';

// 导入新创建的组件和 API
import FolderTree from './components/FolderTree';
import NoteListPanel from './components/NoteListPanel';
import CommandPalette from './components/CommandPalette';
import TopBar from './components/TopBar';
import { searchItems } from './api';
import CreateItemDialog from './components/CreateItemDialog';
import SettingsDialog from './components/SettingsDialog';
import { trackEvent, trackNavigate } from './utils/analytics';
import UIOverlayCompare from './components/UIOverlayCompare';

const DashboardHome = lazy(() => import('./components/DashboardHome'));
const WorkbenchHome = lazy(() => import('./components/WorkbenchHome'));
const NoteEditor = lazy(() => import('./components/NoteEditor'));
const FolderPage = lazy(() => import('./components/FolderPage'));
const TagPage = lazy(() => import('./components/TagPage'));
const TodosView = lazy(() => import('./components/TodosView'));
const MindmapView = lazy(() => import('./components/MindmapView'));

function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const folderTreeRef = useRef(); // 用于调用 FolderTree 的刷新方法
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [createDialog, setCreateDialog] = useState({ open: false, mode: 'note' });
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [createMenuAnchor, setCreateMenuAnchor] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const handleCreateFolder = () => setCreateDialog({ open: true, mode: 'folder' });
  const handleCreateNote = () => setCreateDialog({ open: true, mode: 'note' });

  useEffect(() => {
    const reduceMotion = (localStorage.getItem('reduce_motion') ?? 'false') === 'true';
    const spotlightEnabled = (localStorage.getItem('spotlight_enabled') ?? 'true') === 'true';
    const strength = Number(localStorage.getItem('spotlight_strength') || 70);
    document.body.dataset.reduceMotion = reduceMotion ? '1' : '0';
    document.body.dataset.spotlight = spotlightEnabled ? '1' : '0';
    document.documentElement.style.setProperty('--spotlight-strength', `${Number.isFinite(strength) ? strength : 70}`);

    const onKeyDown = (e) => {
      const isMac = navigator.platform.toLowerCase().includes('mac');
      const mod = isMac ? e.metaKey : e.ctrlKey;
      if (mod && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        setPaletteOpen(true);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    const onCreateNote = () => handleCreateNote();
    window.addEventListener('app:createNote', onCreateNote);
    const onOpenSettings = () => setSettingsOpen(true);
    window.addEventListener('app:openSettings', onOpenSettings);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('app:createNote', onCreateNote);
      window.removeEventListener('app:openSettings', onOpenSettings);
    };
  }, []);

  useEffect(() => {
    // 关闭抽屉当路由变化时（在移动端）
    setDrawerOpen(false);
  }, [location.pathname]);

  const handleOpenResult = (item, query) => {
    if (!item) return;
    setPaletteOpen(false);
    if (item.type === 'note') {
      const q = String(query || '').trim();
      trackNavigate('nav_palette_result_note', `/notes/${item.id}`, { q, note_id: item.id });
      navigate(`/notes/${item.id}${q ? `?q=${encodeURIComponent(q)}` : ''}`);
      return;
    }
    if (item.type === 'folder') {
      trackNavigate('nav_palette_result_folder', `/folders/${item.id}`, { folder_id: item.id });
      navigate(`/folders/${item.id}`);
    }
  };

  const openNoteFromList = useMemo(() => {
    if ((location.pathname || '').startsWith('/mindmap')) {
      return (id) => {
        trackNavigate('nav_note_list_to_mindmap', `/mindmap?note=${encodeURIComponent(String(id))}`, { note_id: id });
        navigate(`/mindmap?note=${encodeURIComponent(String(id))}`);
      };
    }
    return undefined;
  }, [location.pathname, navigate]);

  const showListOnMobile = location.pathname === '/notes' || location.pathname.startsWith('/folders') || location.pathname.startsWith('/tags');
  const showContentOnMobile = !showListOnMobile;

  return (
    <ErrorBoundary>
      <Box sx={{ height: '100%', color: 'text.primary', p: { xs: 1, md: 2 }, display: 'flex', flexDirection: 'column', gap: { xs: 1, md: 2 }, overflow: 'hidden' }}>
        <UIOverlayCompare />
        <TopBar onOpenPalette={() => setPaletteOpen(true)} onCreateNote={handleCreateNote} onOpenSettings={() => setSettingsOpen(true)} onOpenDrawer={() => setDrawerOpen(true)} />

        <Box
          sx={{
            flex: 1,
            minHeight: 0,
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: '260px 360px 1fr' },
            gap: { xs: 0, md: 1.5 },
            p: { xs: 0.5, md: 1.5 },
            borderRadius: { xs: '12px', md: '18px' },
            bgcolor: 'var(--glass-bg)',
            border: '1px solid var(--glass-border-weak)',
            boxShadow: 'var(--shadow-panel-soft)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            overflow: 'hidden',
            position: 'relative',
            '&:before': {
              content: '""',
              position: 'absolute',
              inset: -1,
              background:
                'linear-gradient(135deg, rgba(var(--accent-rgb) / 0.12), rgba(56,189,248,0.08), rgba(34,197,94,0.06))',
              opacity: 0.55,
              pointerEvents: 'none',
            },
            '&:after': {
              content: '""',
              position: 'absolute',
              top: 8,
              bottom: 8,
              left: 260 + 12,
              width: 1,
              background: 'linear-gradient(180deg, transparent, rgba(255,255,255,0.07), transparent)',
              opacity: 0.55,
              pointerEvents: 'none',
            },
          }}
          className="app-shell"
        >
          {/* 移动端侧边栏遮罩 */}
          <Box
            sx={{
              display: { xs: 'block', md: 'none' },
              position: 'absolute',
              inset: 0,
              bgcolor: 'rgba(0,0,0,0.4)',
              zIndex: 1100,
              backdropFilter: 'blur(4px)',
              WebkitBackdropFilter: 'blur(4px)',
              opacity: drawerOpen ? 1 : 0,
              pointerEvents: drawerOpen ? 'auto' : 'none',
              transition: 'opacity 0.3s ease',
            }}
            onClick={() => setDrawerOpen(false)}
          />

          <Box
            sx={{
              display: 'block',
              position: { xs: 'absolute', md: 'relative' },
              top: { xs: 0, md: 'auto' },
              left: { xs: 0, md: 'auto' },
              bottom: { xs: 0, md: 'auto' },
              width: { xs: '280px', md: 'auto' },
              zIndex: { xs: 1200, md: 1 },
              transform: { xs: drawerOpen ? 'translateX(0)' : 'translateX(-100%)', md: 'none' },
              transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              p: 2,
              borderRadius: { xs: '0 16px 16px 0', md: '16px' },
              bgcolor: 'background.paper',
              border: '1px solid',
              borderColor: 'var(--glass-border-weak)',
              boxShadow: { xs: drawerOpen ? '4px 0 24px rgba(0,0,0,0.5)' : 'none', md: 'var(--shadow-panel-soft)' },
              overflowY: 'auto',
              overflowX: 'hidden',
              minHeight: 0,
              '&:before': {
                content: '""',
                position: 'absolute',
                inset: -1,
                background:
                  'linear-gradient(135deg, rgba(var(--accent-rgb) / 0.22), rgba(34,197,94,0.10), rgba(56,189,248,0.08))',
                opacity: 0.45,
                pointerEvents: 'none',
              },
            }}
            className="glass-panel"
          >
            <Stack direction="column" sx={{ height: '100%', position: 'relative' }}>
              {isMobile && (
                <Box mb={2}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 800, letterSpacing: 0.2, px: 1 }}>Notes Dashboard</Typography>
                  </Box>
                  <Typography variant="h6" sx={{ fontWeight: 800, letterSpacing: 0.2, px: 1, mb: 1, fontSize: 14, color: 'text.secondary' }}>导航</Typography>
                  <List disablePadding>
                    <ListItemButton onClick={() => { navigate('/'); setDrawerOpen(false); }} sx={{ borderRadius: 2, mb: 0.5 }}>
                      <ListItemIcon sx={{ minWidth: 36 }}><DashboardOutlined fontSize="small" /></ListItemIcon>
                      <ListItemText primary="仪表盘" primaryTypographyProps={{ fontSize: 14, fontWeight: 600 }} />
                    </ListItemButton>
                    <ListItemButton onClick={() => { navigate('/notes'); setDrawerOpen(false); }} sx={{ borderRadius: 2, mb: 0.5 }}>
                      <ListItemIcon sx={{ minWidth: 36 }}><NoteOutlined fontSize="small" /></ListItemIcon>
                      <ListItemText primary="笔记" primaryTypographyProps={{ fontSize: 14, fontWeight: 600 }} />
                    </ListItemButton>
                    <ListItemButton onClick={() => { navigate('/todos'); setDrawerOpen(false); }} sx={{ borderRadius: 2, mb: 0.5 }}>
                      <ListItemIcon sx={{ minWidth: 36 }}><ChecklistOutlined fontSize="small" /></ListItemIcon>
                      <ListItemText primary="代办" primaryTypographyProps={{ fontSize: 14, fontWeight: 600 }} />
                    </ListItemButton>
                    <ListItemButton onClick={() => { navigate('/mindmap'); setDrawerOpen(false); }} sx={{ borderRadius: 2, mb: 0.5 }}>
                      <ListItemIcon sx={{ minWidth: 36 }}><HubOutlined fontSize="small" /></ListItemIcon>
                      <ListItemText primary="导图" primaryTypographyProps={{ fontSize: 14, fontWeight: 600 }} />
                    </ListItemButton>
                  </List>
                  <Divider sx={{ my: 1, borderColor: 'var(--glass-border-weak)' }} />
                </Box>
              )}
              <Box mb={2}>
                <Typography variant="h6" sx={{ fontWeight: 800, letterSpacing: 0.2 }}>笔记</Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  拖拽移动目录 / 右键更多
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 1.25 }}>
                  <Button
                    variant="contained"
                    size="small"
                    startIcon={<AddOutlined />}
                    onClick={(e) => setCreateMenuAnchor(e.currentTarget)}
                  >
                    新建
                  </Button>
                  <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
                    <IconButton size="small" onClick={handleCreateFolder} aria-label="create folder">
                      <CreateNewFolderOutlined fontSize="small" />
                    </IconButton>
                    <IconButton size="small" onClick={handleCreateNote} aria-label="create note">
                      <NoteAddOutlined fontSize="small" />
                    </IconButton>
                  </Box>
                </Box>
              </Box>
              {/* 文件夹和笔记列表将在这里 */}
              <Box sx={{ flexGrow: 1, overflowY: 'auto', pr: 0.5 }}>
                <FolderTree ref={folderTreeRef} /> {/* 渲染文件夹树 */}
              </Box>
            </Stack>
          </Box>

          <Menu anchorEl={createMenuAnchor} open={Boolean(createMenuAnchor)} onClose={() => setCreateMenuAnchor(null)}>
            <MenuItem
              onClick={() => {
                setCreateMenuAnchor(null);
                trackEvent('create_note_menu');
                handleCreateNote();
              }}
            >
              <NoteAddOutlined fontSize="small" style={{ marginRight: 8 }} />
              新建笔记
            </MenuItem>
            <MenuItem
              onClick={() => {
                setCreateMenuAnchor(null);
                trackEvent('create_folder_menu');
                handleCreateFolder();
              }}
            >
              <CreateNewFolderOutlined fontSize="small" style={{ marginRight: 8 }} />
              新建文件夹
            </MenuItem>
          </Menu>

          <Box
            sx={{
              display: { xs: showListOnMobile ? 'block' : 'none', md: 'block' },
              p: 0,
              borderRadius: { xs: '12px', md: '16px' },
              bgcolor: 'background.paper',
              border: '1px solid',
              borderColor: 'var(--glass-border-weak)',
              boxShadow: 'var(--shadow-panel-soft)',
              overflow: 'hidden',
              minWidth: 0,
              position: 'relative',
            }}
            className="glass-panel"
          >
            <NoteListPanel openNote={openNoteFromList} />
          </Box>

          <Box
            sx={{
              display: { xs: showContentOnMobile ? 'block' : 'none', md: 'block' },
              p: 0,
              borderRadius: { xs: '12px', md: '16px' },
              bgcolor: 'background.paper',
              border: '1px solid',
              borderColor: 'var(--glass-border-weak)',
              boxShadow: 'var(--shadow-panel-soft)',
              overflow: 'hidden',
              flex: 1,
              minWidth: 0,
              position: 'relative',
              '&:before': {
                content: '""',
                position: 'absolute',
                inset: -1,
                background:
                  'linear-gradient(135deg, rgba(var(--accent-rgb) / 0.18), rgba(34,197,94,0.08), rgba(56,189,248,0.10))',
                opacity: 0.40,
                pointerEvents: 'none',
              },
            }}
            className="glass-panel"
          >
            <Box sx={{ position: 'relative', height: '100%' }}>
              <Suspense
                fallback={
                  <Box sx={{ display: 'flex', justifyContent: 'center', pt: 6 }}>
                    <CircularProgress size={24} />
                  </Box>
                }
              >
                <Routes>
                  <Route path="/" element={<DashboardHome />} />
                  <Route path="/notes" element={<WorkbenchHome />} />
                  <Route path="/notes/:id" element={<NoteEditor />} />
                  <Route path="/folders/:id" element={<FolderPage />} />
                  <Route path="/tags/:id" element={<TagPage />} />
                  <Route path="/todos" element={<TodosView />} />
                  <Route path="/mindmap" element={<MindmapView />} />
                  <Route path="*" element={<Typography sx={{ p: 2 }}>404 - 页面未找到</Typography>} />
                </Routes>
              </Suspense>
            </Box>
          </Box>
        </Box>

        <CommandPalette
          open={paletteOpen}
          onClose={() => setPaletteOpen(false)}
          onSearch={searchItems}
          onOpenResult={handleOpenResult}
          onCreateFolder={handleCreateFolder}
          onCreateNote={handleCreateNote}
          onOpenSettings={() => {
            setPaletteOpen(false);
            setSettingsOpen(true);
          }}
          onGoTodos={() => {
            setPaletteOpen(false);
            navigate('/todos');
          }}
          onGoMindmap={() => {
            setPaletteOpen(false);
            navigate('/mindmap');
          }}
        />

        <CreateItemDialog
          open={createDialog.open}
          mode={createDialog.mode}
          onClose={() => setCreateDialog((p) => ({ ...p, open: false }))}
          onCreated={({ type, data }) => {
            try {
              folderTreeRef.current?.loadFolders?.();
            } catch (e) {
            }
            window.dispatchEvent(new CustomEvent('notes:changed'));
            if (type === 'note' && data?.id) {
              navigate(`/notes/${data.id}`);
            }
          }}
        />

        <SettingsDialog open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      </Box>
    </ErrorBoundary>
  );
}

export default App;
