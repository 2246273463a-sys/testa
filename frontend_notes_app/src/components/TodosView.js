import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Divider,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Stack,
  TextField,
  Typography,
  Autocomplete,
  IconButton,
  Tooltip,
} from '@mui/material';
import { AddOutlined, DeleteOutline } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { createTodo, deleteTodo, fetchNotes, fetchTodos, updateTodo } from '../api';
import { trackNavigate } from '../utils/analytics';
import LottiePlayer from './LottiePlayer';
import emptyAnim from '../assets/empty-state.lottie.json';

const TodosView = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notes, setNotes] = useState([]);
  const [todos, setTodos] = useState([]);
  const [q, setQ] = useState('');
  const [targetNoteId, setTargetNoteId] = useState(null);
  const [draftText, setDraftText] = useState('');
  const [draftPriority, setDraftPriority] = useState(2);
  const [draftDue, setDraftDue] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [noteData, todoData] = await Promise.all([fetchNotes({ include_deleted: true }), fetchTodos()]);
      setNotes(Array.isArray(noteData) ? noteData : []);
      setTodos(Array.isArray(todoData) ? todoData : []);
      if (Array.isArray(noteData) && noteData.length && targetNoteId == null) setTargetNoteId(noteData[0].id);
    } catch (e) {
      setError(e?.message || '加载失败');
    } finally {
      setLoading(false);
    }
  }, [targetNoteId]);

  useEffect(() => {
    load();
    const onChanged = () => load();
    window.addEventListener('notes:changed', onChanged);
    return () => window.removeEventListener('notes:changed', onChanged);
  }, [load]);

  const noteTitleMap = useMemo(() => {
    const m = new Map();
    for (const n of notes) {
      m.set(Number(n.id), n.title || '未命名');
    }
    return m;
  }, [notes]);

  const items = useMemo(() => {
    const query = q.trim().toLowerCase();
    const out = (Array.isArray(todos) ? todos : [])
      .map((t) => {
        const noteId = t.note_id == null ? null : Number(t.note_id);
        return {
          id: t.id,
          noteId,
          noteTitle: noteId != null ? noteTitleMap.get(noteId) || `笔记 #${noteId}` : '未绑定笔记',
          checked: Boolean(t.checked),
          text: t.text,
          priority: Number(t.priority || 2),
          dueAt: t.due_at || null,
        };
      })
      .filter((it) => {
        if (!query) return true;
        return `${it.noteTitle} ${it.text || ''}`.toLowerCase().includes(query);
      })
      .sort((a, b) => Number(a.checked) - Number(b.checked));
    return out;
  }, [noteTitleMap, q, todos]);

  const stats = useMemo(() => {
    const total = items.length;
    const done = items.filter((x) => x.checked).length;
    return { total, done, pending: total - done };
  }, [items]);

  const handleToggle = async (item) => {
    try {
      await updateTodo(item.id, { checked: !item.checked });
      await load();
    } catch (e) {
      setError(e?.message || '更新失败');
    }
  };

  const handleAdd = async () => {
    const text = draftText.trim();
    if (!text) return;
    try {
      const noteId = targetNoteId == null ? null : Number(targetNoteId);
      const due_at = draftDue ? new Date(`${draftDue}T00:00:00`).toISOString() : null;
      await createTodo({ text, note_id: noteId, priority: Number(draftPriority || 2), due_at });
      setDraftText('');
      setDraftDue('');
      await load();
    } catch (e) {
      setError(e?.message || '添加失败');
    }
  };

  const handleDelete = async (id) => {
    const ok = window.confirm('确定要删除这条代办吗？');
    if (!ok) return;
    try {
      await deleteTodo(id);
      await load();
    } catch (e) {
      setError(e?.message || '删除失败');
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', pt: 6 }}>
        <CircularProgress size={24} />
      </Box>
    );
  }

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ p: 2 }}>
        <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
          <Typography variant="overline" sx={{ color: 'text.secondary' }}>代办</Typography>
          <Stack direction="row" spacing={1} alignItems="center">
            <Chip size="small" label={`未完成 ${stats.pending}`} sx={{ opacity: 0.9 }} />
            <Chip size="small" label={`已完成 ${stats.done}`} sx={{ opacity: 0.75 }} />
          </Stack>
        </Stack>

        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} alignItems={{ xs: 'stretch', md: 'center' }} sx={{ mb: 1.25 }}>
          <Autocomplete
            size="small"
            options={notes}
            value={notes.find((n) => Number(n.id) === Number(targetNoteId)) || null}
            onChange={(_, v) => setTargetNoteId(v ? v.id : null)}
            getOptionLabel={(o) => o?.title || `笔记 #${o?.id}`}
            renderInput={(params) => <TextField {...params} label="添加到笔记" placeholder="选择笔记" />}
            sx={{ minWidth: { xs: '100%', md: 320 } }}
          />
          <TextField
            value={draftText}
            onChange={(e) => setDraftText(e.target.value)}
            size="small"
            fullWidth
            label="新增代办"
            placeholder="例如：- [ ] 明天 10 点开会"
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAdd();
            }}
          />
          <TextField
            value={draftDue}
            onChange={(e) => setDraftDue(e.target.value)}
            size="small"
            type="date"
            label="截止日期"
            InputLabelProps={{ shrink: true }}
            sx={{ width: { xs: '100%', md: 160 } }}
          />
          <Stack direction="row" spacing={1} alignItems="center" sx={{ width: { xs: '100%', md: 'auto' } }}>
            <Chip
              size="small"
              label="低"
              variant={Number(draftPriority) === 1 ? 'filled' : 'outlined'}
              onClick={() => setDraftPriority(1)}
            />
            <Chip
              size="small"
              label="中"
              variant={Number(draftPriority) === 2 ? 'filled' : 'outlined'}
              onClick={() => setDraftPriority(2)}
            />
            <Chip
              size="small"
              label="高"
              variant={Number(draftPriority) === 3 ? 'filled' : 'outlined'}
              onClick={() => setDraftPriority(3)}
            />
          </Stack>
          <Button variant="contained" startIcon={<AddOutlined />} onClick={handleAdd} disabled={!draftText.trim()}>
            添加
          </Button>
        </Stack>

        <TextField value={q} onChange={(e) => setQ(e.target.value)} size="small" fullWidth placeholder="筛选代办或笔记标题…" />
        {error ? <Alert severity="error" sx={{ mt: 1.5 }}>{error}</Alert> : null}
      </Box>

      <Divider sx={{ opacity: 0.25 }} />

      <Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
        {items.length === 0 ? (
          <Box sx={{ px: 2, py: 3 }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <LottiePlayer animationData={emptyAnim} style={{ width: 160, height: 160 }} />
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>没有代办项</Typography>
            </Box>
          </Box>
        ) : (
          <List disablePadding>
            {items.map((it) => (
              <Tooltip key={it.id} title={it.noteId != null ? '打开来源笔记' : '无关联笔记，暂不可跳转'}>
                <span style={{ display: 'block' }}>
                  <ListItemButton
                    sx={{ px: 2, py: 1.25 }}
                    disabled={it.noteId == null}
                    onClick={() => {
                      if (it.noteId == null) return;
                      trackNavigate('nav_todos_to_note', `/notes/${it.noteId}`, { todo_id: it.id, note_id: it.noteId });
                      navigate(`/notes/${it.noteId}`);
                    }}
                  >
                <ListItemIcon sx={{ minWidth: 44 }}>
                  <Checkbox
                    checked={it.checked}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleToggle(it);
                    }}
                  />
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: 700,
                        textDecoration: it.checked ? 'line-through' : 'none',
                        opacity: it.checked ? 0.65 : 1,
                      }}
                    >
                      {it.text || '（空）'}
                    </Typography>
                  }
                  secondary={
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ flexWrap: 'wrap', mt: 0.25 }}>
                      <Typography variant="caption" color="text.secondary">{it.noteTitle}</Typography>
                      <Chip
                        size="small"
                        label={it.priority === 3 ? '高' : it.priority === 1 ? '低' : '中'}
                        sx={{ opacity: 0.85 }}
                      />
                      {it.dueAt ? (
                        <Chip
                          size="small"
                          label={String(it.dueAt).replace('T', ' ').slice(0, 10)}
                          sx={{ opacity: 0.8 }}
                        />
                      ) : null}
                    </Stack>
                  }
                  secondaryTypographyProps={{ component: 'div' }}
                />
                <Tooltip title="删除">
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleDelete(it.id);
                    }}
                  >
                    <DeleteOutline fontSize="small" />
                  </IconButton>
                </Tooltip>
                  </ListItemButton>
                </span>
              </Tooltip>
            ))}
          </List>
        )}
      </Box>
    </Box>
  );
};

export default TodosView;
