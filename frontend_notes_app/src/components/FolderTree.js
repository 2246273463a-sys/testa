import React, { useMemo, useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import {
  Box,
  Typography,
  CircularProgress,
  Alert,
  TextField,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  Menu,
  MenuItem,
  InputAdornment,
  Chip,
  IconButton,
  Stack,
} from '@mui/material';
import { SearchOutlined, FolderOutlined, NoteOutlined, CreateNewFolderOutlined, NoteAddOutlined, UnfoldMoreOutlined, UnfoldLessOutlined, LocalOfferOutlined, SettingsOutlined } from '@mui/icons-material';
import { useLocation, useNavigate } from 'react-router-dom';
import FolderTreeItem from './FolderTreeItem';
import { fetchFolders, searchItems, createFolder, createNote, updateFolder, fetchTags } from '../api';
import TagManagerDialog from './TagManagerDialog';
import { trackEvent, trackNavigate } from '../utils/analytics';
import LottiePlayer from './LottiePlayer';
import emptyAnim from '../assets/empty-state.lottie.json';

const FolderTree = forwardRef((props, ref) => {
  const [folders, setFolders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [rootMenuAnchor, setRootMenuAnchor] = useState(null);
  const [rootDragOver, setRootDragOver] = useState(false);
  const [openVersion, setOpenVersion] = useState(0);
  const [tags, setTags] = useState([]);
  const [tagDialogOpen, setTagDialogOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const active = useMemo(() => {
    const p = location.pathname || '';
    const noteMatch = p.match(/^\/notes\/(\d+)/);
    const folderMatch = p.match(/^\/folders\/(\d+)/);
    const tagMatch = p.match(/^\/tags\/(\d+)/);
    return {
      activeNoteId: noteMatch ? Number(noteMatch[1]) : null,
      activeFolderId: folderMatch ? Number(folderMatch[1]) : null,
      activeTagId: tagMatch ? Number(tagMatch[1]) : null,
    };
  }, [location.pathname]);

  const loadFolders = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchFolders();
      setFolders(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFolders();
  }, []);

  useEffect(() => {
    const loadTags = async () => {
      const data = await fetchTags();
      setTags(Array.isArray(data) ? data : []);
    };
    loadTags();
    const onChanged = () => loadTags();
    window.addEventListener('tags:changed', onChanged);
    const onOpenManager = () => setTagDialogOpen(true);
    window.addEventListener('app:openTagManager', onOpenManager);
    return () => {
      window.removeEventListener('tags:changed', onChanged);
      window.removeEventListener('app:openTagManager', onOpenManager);
    };
  }, []);

  useEffect(() => {
    const q = searchQuery.trim();
    if (!q) {
      setSearchResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    const t = setTimeout(async () => {
      try {
        const data = await searchItems(q);
        setSearchResults(Array.isArray(data) ? data : []);
      } finally {
        setSearching(false);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [searchQuery]);

  useImperativeHandle(ref, () => ({
    loadFolders,
  }));

  const parseSnippet = (snippet) => {
    if (!snippet) return null;
    const parts = snippet.split(/(\[\[|\]\])/g).filter(Boolean);
    const nodes = [];
    let inMark = false;
    for (const part of parts) {
      if (part === '[[') {
        inMark = true;
        continue;
      }
      if (part === ']]') {
        inMark = false;
        continue;
      }
      nodes.push(inMark ? <mark key={nodes.length}>{part}</mark> : <span key={nodes.length}>{part}</span>);
    }
    return nodes;
  };

  const handleResultClick = (item) => {
    if (item.type === 'note') {
      const q = searchQuery.trim();
      trackNavigate('nav_sidebar_search_note', `/notes/${item.id}`, { q });
      navigate(`/notes/${item.id}${q ? `?q=${encodeURIComponent(q)}` : ''}`);
      setSearchQuery('');
      return;
    }
    if (item.type === 'folder') {
      trackNavigate('nav_sidebar_search_folder', `/folders/${item.id}`);
      navigate(`/folders/${item.id}`);
      setSearchQuery('');
    }
  };

  const handleRootContextMenu = (event) => {
    event.preventDefault();
    setRootMenuAnchor({ left: event.clientX - 2, top: event.clientY - 4 });
  };

  const closeRootMenu = () => setRootMenuAnchor(null);

  const handleCreateRootFolder = async () => {
    closeRootMenu();
    const name = prompt('请输入新文件夹名称：');
    if (!name) return;
    trackEvent('create_folder_root');
    await createFolder(name, null);
    loadFolders();
  };

  const handleCreateRootNote = async () => {
    closeRootMenu();
    const title = prompt('请输入新笔记标题：');
    if (!title) return;
    trackEvent('create_note_root');
    const note = await createNote(title, '', null);
    await loadFolders();
    navigate(`/notes/${note.id}`);
  };

  const handleDropToRoot = async (event) => {
    event.preventDefault();
    setRootDragOver(false);
    const raw = event.dataTransfer.getData('text/plain');
    if (!raw) return;
    const [kind, id] = raw.split(':');
    if (kind !== 'folder') return;
    await updateFolder(Number(id), { parent_id: null });
    loadFolders();
  };

  const handleDragOverRoot = (event) => {
    event.preventDefault();
    setRootDragOver(true);
  };

  const handleDragLeaveRoot = () => setRootDragOver(false);

  const flattenFolderIds = (nodes) => {
    const ids = [];
    const walk = (arr) => {
      for (const f of arr || []) {
        ids.push(f.id);
        if (Array.isArray(f.children) && f.children.length) walk(f.children);
      }
    };
    walk(nodes);
    return ids;
  };

  const setAllExpanded = (expanded) => {
    const ids = flattenFolderIds(folders);
    for (const id of ids) {
      localStorage.setItem(`folder_open_${id}`, expanded ? 'true' : 'false');
    }
    setOpenVersion((v) => v + 1);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ mt: 4 }}>
        <Alert severity="error">加载文件夹失败: {error}</Alert>
      </Box>
    );
  }

  return (
    <Box
      onContextMenu={handleRootContextMenu}
      onDrop={handleDropToRoot}
      onDragOver={handleDragOverRoot}
      onDragLeave={handleDragLeaveRoot}
      sx={
        rootDragOver
          ? {
              outline: '2px dashed rgba(var(--accent-rgb) / 0.55)',
              outlineOffset: 6,
              borderRadius: 3,
            }
          : undefined
      }
    >
      <TextField
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        placeholder="全局搜索（目录/笔记）"
        size="small"
        fullWidth
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchOutlined sx={{ color: 'text.secondary' }} />
            </InputAdornment>
          ),
        }}
        sx={{ mb: 1.5 }}
      />
      <Divider sx={{ mb: 1.5, opacity: 0.25 }} />

      {searchQuery.trim() ? (
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="overline" sx={{ color: 'text.secondary' }}>
              {searching ? '搜索中…' : '搜索结果'}
            </Typography>
            <Chip size="small" label={String(searchResults.length)} sx={{ opacity: 0.85 }} />
          </Box>
          <List dense disablePadding>
            {searchResults.map((item) => (
              <ListItemButton key={`${item.type}-${item.id}`} onClick={() => handleResultClick(item)} sx={{ borderRadius: 2, mb: 0.5 }}>
                <ListItemIcon sx={{ minWidth: 36 }}>
                  {item.type === 'folder' ? <FolderOutlined fontSize="small" /> : <NoteOutlined fontSize="small" />}
                </ListItemIcon>
                <ListItemText
                  primary={<Typography variant="body2" sx={{ fontWeight: 600 }}>{item.title}</Typography>}
                  secondary={
                    item.snippet ? (
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25 }}>
                        {parseSnippet(item.snippet)}
                      </Typography>
                    ) : null
                  }
                />
              </ListItemButton>
            ))}
            {!searching && searchResults.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                没有匹配结果
              </Typography>
            ) : null}
          </List>
        </Box>
      ) : (
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="overline" sx={{ color: 'text.secondary' }}>
              目录
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Chip size="small" icon={<UnfoldMoreOutlined />} label="展开" onClick={() => setAllExpanded(true)} sx={{ opacity: 0.9 }} />
              <Chip size="small" icon={<UnfoldLessOutlined />} label="收起" onClick={() => setAllExpanded(false)} sx={{ opacity: 0.9 }} />
            </Box>
          </Box>
          {folders.length === 0 ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 2 }}>
              <LottiePlayer animationData={emptyAnim} style={{ width: 140, height: 140 }} />
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>没有文件夹或笔记。</Typography>
            </Box>
          ) : (
            folders.map((item) => (
              <FolderTreeItem key={item.id} item={item} loadFolders={loadFolders} active={active} openVersion={openVersion} />
            ))
          )}

          <Divider sx={{ my: 1.5, opacity: 0.25 }} />

          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
            <Typography variant="overline" sx={{ color: 'text.secondary' }}>标签</Typography>
            <IconButton size="small" onClick={() => setTagDialogOpen(true)} aria-label="manage tags">
              <SettingsOutlined fontSize="small" />
            </IconButton>
          </Stack>

          {tags.length === 0 ? (
            <Typography variant="body2" color="text.secondary">暂无标签</Typography>
          ) : (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {tags.map((t) => (
                <Chip
                  key={t.id}
                  icon={<LocalOfferOutlined />}
                  label={t.name}
                  size="small"
                  onClick={() => {
                    trackNavigate('nav_sidebar_tag', `/tags/${t.id}`, { tag_id: t.id });
                    navigate(`/tags/${t.id}`);
                  }}
                  variant={Number(active.activeTagId) === Number(t.id) ? 'filled' : 'outlined'}
                  sx={{
                    borderColor: 'rgba(255,255,255,0.10)',
                    backgroundColor: Number(active.activeTagId) === Number(t.id) ? 'rgba(var(--accent-rgb) / 0.18)' : 'rgba(255,255,255,0.03)',
                    '& .MuiChip-icon': { color: t.color || 'rgba(255,255,255,0.7)' },
                  }}
                />
              ))}
            </Box>
          )}
        </Box>
      )}

      <Menu
        open={Boolean(rootMenuAnchor)}
        onClose={closeRootMenu}
        anchorReference="anchorPosition"
        anchorPosition={rootMenuAnchor || undefined}
      >
        <MenuItem onClick={handleCreateRootFolder}>
          <CreateNewFolderOutlined fontSize="small" style={{ marginRight: 8 }} />
          新建文件夹
        </MenuItem>
        <MenuItem onClick={handleCreateRootNote}>
          <NoteAddOutlined fontSize="small" style={{ marginRight: 8 }} />
          新建笔记
        </MenuItem>
      </Menu>

      <TagManagerDialog open={tagDialogOpen} onClose={() => setTagDialogOpen(false)} />
    </Box>
  );
});

export default FolderTree;
