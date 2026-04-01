import React, { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Chip,
  CircularProgress,
  Divider,
  Stack,
  TextField,
  Typography,
  IconButton,
  Tooltip,
  Checkbox,
  Menu,
  MenuItem,
  Button,
} from '@mui/material';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  bulkNotes,
  emptyTrash,
  fetchNotes,
  hardDeleteNote,
  deleteNote,
  restoreNote,
  updateNote,
  createNote,
} from '../api';
import Interactive from './Interactive';
import {
  DeleteOutline,
  MoreVert,
  PushPinOutlined,
  StarBorder,
  Star,
  RestoreFromTrash,
  DeleteForever,
  ViewQuiltOutlined,
  SelectAll,
  Close,
} from '@mui/icons-material';
import BulkActionDialog from './BulkActionDialog';
import { trackEvent, trackNavigate } from '../utils/analytics';
import LottiePlayer from './LottiePlayer';
import emptyAnim from '../assets/empty-state.lottie.json';

const NoteListPanel = ({ openNote }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState([]);
  const [q, setQ] = useState('');
  const [scope, setScope] = useState('all');
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [rowMenu, setRowMenu] = useState(null);
  const [bulkDialog, setBulkDialog] = useState({ open: false, mode: 'move' });

  const goNote = (id) => {
    if (typeof openNote === 'function') {
      trackNavigate('nav_note_list_open_note', `/mindmap?note=${encodeURIComponent(String(id))}`, { note_id: id, via: 'openNote' });
      openNote(id);
      return;
    }
    trackNavigate('nav_note_list_open_note', `/notes/${id}`, { note_id: id });
    navigate(`/notes/${id}`);
  };

  useEffect(() => {
    let alive = true;
    const load = async () => {
      setLoading(true);
      const filters = {};
      if (scope === 'favorites') filters.only_favorite = true;
      if (scope === 'pinned') filters.only_pinned = true;
      if (scope === 'trash') filters.only_deleted = true;
      if (scope === 'templates') filters.only_templates = true;
      const data = await fetchNotes(filters);
      if (!alive) return;
      setNotes(Array.isArray(data) ? data : []);
      setLoading(false);
    };
    load();
    const onChanged = () => load();
    window.addEventListener('notes:changed', onChanged);
    return () => {
      alive = false;
      window.removeEventListener('notes:changed', onChanged);
    };
  }, [scope]);

  const folderId = useMemo(() => {
    const m = (location.pathname || '').match(/^\/folders\/(\d+)/);
    return m ? Number(m[1]) : null;
  }, [location.pathname]);

  const tagId = useMemo(() => {
    const m = (location.pathname || '').match(/^\/tags\/(\d+)/);
    return m ? Number(m[1]) : null;
  }, [location.pathname]);

  const activeNoteId = useMemo(() => {
    const m = (location.pathname || '').match(/^\/notes\/(\d+)/);
    return m ? Number(m[1]) : null;
  }, [location.pathname]);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return notes
      .filter((n) => (folderId ? Number(n.folder_id) === folderId : true))
      .filter((n) => (tagId ? Array.isArray(n.tags) && n.tags.some((t) => Number(t.id) === tagId) : true))
      .filter((n) => (query ? String(n.title || '').toLowerCase().includes(query) : true))
      .sort((a, b) => {
        const ap = Number(a.is_pinned) ? 1 : 0;
        const bp = Number(b.is_pinned) ? 1 : 0;
        if (ap !== bp) return bp - ap;
        return (b.updated_at || b.created_at || '').localeCompare(a.updated_at || a.created_at || '');
      });
  }, [folderId, notes, q, tagId]);

  const selectedCount = selectedIds.size;

  const toggleSelect = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const clearSelection = () => setSelectedIds(new Set());

  const selectAllVisible = () => {
    setSelectedIds(new Set(filtered.map((n) => n.id)));
  };

  const runBulk = async (action) => {
    const ids = Array.from(selectedIds);
    if (!ids.length) return;
    await bulkNotes({ ids, action });
    clearSelection();
    window.dispatchEvent(new CustomEvent('notes:changed'));
  };

  const runBulkPayload = async (action, extra) => {
    const ids = Array.from(selectedIds);
    if (!ids.length) return;
    await bulkNotes({ ids, action, ...(extra || {}) });
    clearSelection();
    window.dispatchEvent(new CustomEvent('notes:changed'));
  };

  const onRowMenu = (e, n) => {
    e.preventDefault();
    e.stopPropagation();
    setRowMenu({ anchorEl: e.currentTarget, note: n });
  };

  const closeRowMenu = () => setRowMenu(null);

  const doRowAction = async (action) => {
    const n = rowMenu?.note;
    if (!n) return;
    closeRowMenu();

    if (action === 'favorite') {
      await updateNote(n.id, n.title, n.content, { is_favorite: Number(n.is_favorite) ? 0 : 1 });
    } else if (action === 'pin') {
      await updateNote(n.id, n.title, n.content, { is_pinned: Number(n.is_pinned) ? 0 : 1 });
    } else if (action === 'trash') {
      await deleteNote(n.id);
    } else if (action === 'restore') {
      await restoreNote(n.id);
    } else if (action === 'hard_delete') {
      await hardDeleteNote(n.id);
    } else if (action === 'template') {
      await updateNote(n.id, n.title, n.content, { is_template: Number(n.is_template) ? 0 : 1 });
    } else if (action === 'from_template') {
      const nextTitle = `${n.title || '模板'}（新建）`;
      const created = await createNote(nextTitle, n.content || '', null);
      window.dispatchEvent(new CustomEvent('notes:changed'));
      goNote(created.id);
      return;
    }
    window.dispatchEvent(new CustomEvent('notes:changed'));
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ p: 2 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
          <Typography variant="overline" sx={{ color: 'text.secondary' }}>
            {folderId ? `文件夹 #${folderId}` : tagId ? `标签 #${tagId}` : '全部笔记'}
          </Typography>
          <Chip size="small" label={String(filtered.length)} sx={{ opacity: 0.85 }} />
        </Stack>

        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1, flexWrap: 'wrap', rowGap: 1 }}>
          <Chip size="small" label="全部" variant={scope === 'all' ? 'filled' : 'outlined'} onClick={() => setScope('all')} sx={{ whiteSpace: 'nowrap' }} />
          <Chip size="small" label="收藏" variant={scope === 'favorites' ? 'filled' : 'outlined'} onClick={() => setScope('favorites')} sx={{ whiteSpace: 'nowrap' }} />
          <Chip size="small" label="置顶" variant={scope === 'pinned' ? 'filled' : 'outlined'} onClick={() => setScope('pinned')} sx={{ whiteSpace: 'nowrap' }} />
          <Chip size="small" label="回收站" variant={scope === 'trash' ? 'filled' : 'outlined'} onClick={() => setScope('trash')} sx={{ whiteSpace: 'nowrap' }} />
          <Chip size="small" label="模板" variant={scope === 'templates' ? 'filled' : 'outlined'} onClick={() => setScope('templates')} sx={{ whiteSpace: 'nowrap' }} />
          <Box sx={{ flex: 1 }} />
          {scope === 'trash' ? (
            <Button
              size="small"
              variant="outlined"
              color="error"
              startIcon={<DeleteForever />}
              onClick={async () => {
                const ok = window.confirm('确定要清空回收站吗？此操作不可恢复。');
                if (!ok) return;
                await emptyTrash();
                window.dispatchEvent(new CustomEvent('notes:changed'));
              }}
            >
              清空
            </Button>
          ) : null}
          <Tooltip title={selectMode ? '退出多选' : '多选'}>
            <IconButton size="small" onClick={() => {
              setSelectMode((v) => !v);
              clearSelection();
            }}>
              {selectMode ? <Close fontSize="small" /> : <SelectAll fontSize="small" />}
            </IconButton>
          </Tooltip>
        </Stack>

        {selectMode ? (
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
            <Chip size="small" label={`已选 ${selectedCount}`} />
            <Button size="small" variant="outlined" onClick={selectAllVisible} disabled={!filtered.length}>
              全选
            </Button>
            <Button size="small" variant="outlined" onClick={clearSelection} disabled={!selectedCount}>
              清空
            </Button>
            <Box sx={{ flex: 1 }} />
            {scope === 'trash' ? (
              <>
                <Button size="small" variant="contained" onClick={() => runBulk('restore')} disabled={!selectedCount} startIcon={<RestoreFromTrash />}>
                  恢复
                </Button>
                <Button size="small" variant="outlined" color="error" onClick={() => runBulk('hard_delete')} disabled={!selectedCount} startIcon={<DeleteForever />}>
                  永久删除
                </Button>
              </>
            ) : (
              <>
                <Button size="small" variant="outlined" onClick={() => runBulk('favorite_on')} disabled={!selectedCount} startIcon={<Star />}>
                  收藏
                </Button>
                <Button size="small" variant="outlined" onClick={() => runBulk('favorite_off')} disabled={!selectedCount} startIcon={<StarBorder />}>
                  取消收藏
                </Button>
                <Button size="small" variant="outlined" onClick={() => runBulk('pin_on')} disabled={!selectedCount} startIcon={<PushPinOutlined />}>
                  置顶
                </Button>
                <Button size="small" variant="outlined" onClick={() => runBulk('pin_off')} disabled={!selectedCount} startIcon={<PushPinOutlined />}>
                  取消置顶
                </Button>
                <Button size="small" variant="outlined" color="error" onClick={() => runBulk('trash')} disabled={!selectedCount} startIcon={<DeleteOutline />}>
                  回收站
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => setBulkDialog({ open: true, mode: 'move' })}
                  disabled={!selectedCount}
                >
                  移动…
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => setBulkDialog({ open: true, mode: 'tags' })}
                  disabled={!selectedCount}
                >
                  标签…
                </Button>
              </>
            )}
          </Stack>
        ) : null}

        <TextField
          value={q}
          onChange={(e) => setQ(e.target.value)}
          size="small"
          fullWidth
          placeholder="筛选标题…"
        />
      </Box>

      <Divider sx={{ opacity: 0.25 }} />

      <Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto', p: 1.5 }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', pt: 4 }}>
            <CircularProgress size={22} />
          </Box>
        ) : null}

        {!loading && filtered.length === 0 ? (
          <Box sx={{ px: 1, py: 2 }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 2 }}>
              <LottiePlayer animationData={emptyAnim} style={{ width: 160, height: 160 }} />
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                没有匹配的笔记
              </Typography>
            </Box>
          </Box>
        ) : null}

        {filtered.map((n) => (
          <Interactive
            key={n.id}
            component="div"
            className="interactive-card"
            sx={{
              borderRadius: '12px',
              mb: 1.25,
              p: 1.5,
              background:
                Number(n.id) === activeNoteId
                  ? 'linear-gradient(90deg, rgba(24,144,255,0.16), rgba(255,255,255,0.00))'
                  : 'rgba(255,255,255,0.03)',
            }}
            onClick={() => {
              if (selectMode) {
                trackEvent('note_list_select_toggle', { note_id: n.id });
                toggleSelect(n.id);
                return;
              }
              goNote(n.id);
            }}
          >
            <Stack direction="row" alignItems="center" spacing={1} sx={{ minWidth: 0 }}>
              {selectMode ? (
                <Checkbox
                  size="small"
                  checked={selectedIds.has(n.id)}
                  onChange={() => toggleSelect(n.id)}
                  onClick={(e) => e.stopPropagation()}
                />
              ) : null}
              <Typography variant="subtitle2" sx={{ fontWeight: 800, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, minWidth: 0 }}>
                {n.title || '未命名'}
              </Typography>
              {Number(n.is_template) ? (
                <Tooltip title="模板">
                  <ViewQuiltOutlined fontSize="small" style={{ opacity: 0.8 }} />
                </Tooltip>
              ) : null}
              {Number(n.is_pinned) ? (
                <Tooltip title="置顶">
                  <PushPinOutlined fontSize="small" style={{ opacity: 0.8 }} />
                </Tooltip>
              ) : null}
              {Number(n.is_favorite) ? (
                <Tooltip title="已收藏">
                  <Star fontSize="small" style={{ opacity: 0.85 }} />
                </Tooltip>
              ) : null}
              <IconButton size="small" onClick={(e) => onRowMenu(e, n)}>
                <MoreVert fontSize="small" />
              </IconButton>
            </Stack>
            <Typography
              variant="caption"
              sx={{
                color: 'text.secondary',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                mt: 0.5,
              }}
            >
              {String(n.content || '').replace(/\s+/g, ' ').slice(0, 140)}
            </Typography>
            {Array.isArray(n.tags) && n.tags.length ? (
              <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', mt: 1 }}>
                {n.tags.slice(0, 3).map((t) => (
                  <Box
                    key={t.id}
                    sx={{
                      width: 8,
                      height: 8,
                      borderRadius: 999,
                      backgroundColor: t.color || 'rgba(255,255,255,0.35)',
                      boxShadow: '0 0 0 2px rgba(255,255,255,0.06)',
                    }}
                  />
                ))}
                {n.tags.length > 3 ? (
                  <Typography variant="caption" color="text.secondary">+{n.tags.length - 3}</Typography>
                ) : null}
              </Box>
            ) : null}
          </Interactive>
        ))}
      </Box>

      <Menu
        anchorEl={rowMenu?.anchorEl || null}
        open={Boolean(rowMenu)}
        onClose={closeRowMenu}
      >
        {scope === 'trash' ? (
          <>
            <MenuItem onClick={() => doRowAction('restore')}>
              <RestoreFromTrash fontSize="small" style={{ marginRight: 8 }} />
              恢复
            </MenuItem>
            <MenuItem onClick={() => doRowAction('hard_delete')}>
              <DeleteForever fontSize="small" style={{ marginRight: 8 }} />
              永久删除
            </MenuItem>
          </>
        ) : (
          <>
            {Number(rowMenu?.note?.is_template) ? (
              <MenuItem onClick={() => doRowAction('from_template')}>
                <ViewQuiltOutlined fontSize="small" style={{ marginRight: 8 }} />
                用此模板新建
              </MenuItem>
            ) : null}
            <MenuItem onClick={() => doRowAction('favorite')}>
              {(Number(rowMenu?.note?.is_favorite) ? <Star fontSize="small" /> : <StarBorder fontSize="small" />)}
              <span style={{ marginLeft: 8 }}>{Number(rowMenu?.note?.is_favorite) ? '取消收藏' : '收藏'}</span>
            </MenuItem>
            <MenuItem onClick={() => doRowAction('pin')}>
              <PushPinOutlined fontSize="small" style={{ marginRight: 8 }} />
              {Number(rowMenu?.note?.is_pinned) ? '取消置顶' : '置顶'}
            </MenuItem>
            <MenuItem onClick={() => doRowAction('template')}>
              <ViewQuiltOutlined fontSize="small" style={{ marginRight: 8 }} />
              {Number(rowMenu?.note?.is_template) ? '取消模板' : '设为模板'}
            </MenuItem>
            <MenuItem onClick={() => doRowAction('trash')}>
              <DeleteOutline fontSize="small" style={{ marginRight: 8 }} />
              移入回收站
            </MenuItem>
          </>
        )}
      </Menu>

      <BulkActionDialog
        open={bulkDialog.open}
        mode={bulkDialog.mode}
        selectedCount={selectedCount}
        onClose={() => setBulkDialog((p) => ({ ...p, open: false }))}
        onConfirm={async (extra) => {
          if (bulkDialog.mode === 'move') {
            await runBulkPayload('move_folder', extra);
            return;
          }
          await runBulkPayload('set_tags', extra);
        }}
      />
    </Box>
  );
};

export default NoteListPanel;
