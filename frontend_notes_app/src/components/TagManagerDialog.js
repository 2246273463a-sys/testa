import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { AddOutlined, DeleteOutline } from '@mui/icons-material';
import { createTag, deleteTag, fetchTags, updateTag } from '../api';
import { useModalFlag } from '../utils/modal';

const normalizeHex = (v) => {
  const s = String(v || '').trim();
  if (!s) return '#a78bfa';
  if (s.startsWith('#') && (s.length === 7 || s.length === 4)) return s;
  return '#a78bfa';
};

const TagManagerDialog = ({ open, onClose }) => {
  useModalFlag(open);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [items, setItems] = useState([]);
  const [draftName, setDraftName] = useState('');
  const [draftColor, setDraftColor] = useState('#a78bfa');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchTags();
      setItems(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e?.message || '加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    setDraftName('');
    setDraftColor('#a78bfa');
    load();
  }, [open]);

  const sorted = useMemo(() => {
    return [...items].sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));
  }, [items]);

  const emitChanged = () => {
    window.dispatchEvent(new CustomEvent('tags:changed'));
  };

  const handleCreate = async () => {
    const name = draftName.trim();
    if (!name) return;
    try {
      setLoading(true);
      setError('');
      await createTag(name, normalizeHex(draftColor));
      setDraftName('');
      emitChanged();
      await load();
    } catch (e) {
      setError(e?.message || '创建失败');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (id, next) => {
    try {
      setError('');
      await updateTag(id, next);
      emitChanged();
      await load();
    } catch (e) {
      setError(e?.message || '更新失败');
    }
  };

  const handleDelete = async (id, name) => {
    const ok = window.confirm(`确定要删除标签 "${name}" 吗？`);
    if (!ok) return;
    try {
      setError('');
      await deleteTag(id);
      emitChanged();
      await load();
    } catch (e) {
      setError(e?.message || '删除失败');
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
      disableRestoreFocus
      disableScrollLock
      TransitionProps={{ timeout: 120 }}
    >
      <DialogTitle>标签管理</DialogTitle>
      <DialogContent sx={{ pt: 1 }}>
        {error ? <Alert severity="error" sx={{ mb: 1.5 }}>{error}</Alert> : null}

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ xs: 'stretch', sm: 'center' }} sx={{ mb: 1.5 }}>
          <TextField
            value={draftName}
            onChange={(e) => setDraftName(e.target.value)}
            size="small"
            fullWidth
            placeholder="新增标签名称"
          />
          <TextField
            value={draftColor}
            onChange={(e) => setDraftColor(e.target.value)}
            size="small"
            type="color"
            sx={{ width: { xs: '100%', sm: 120 } }}
          />
          <Button variant="contained" startIcon={<AddOutlined />} onClick={handleCreate} disabled={loading || !draftName.trim()}>
            添加
          </Button>
        </Stack>

        <Divider sx={{ opacity: 0.25, mb: 1.5 }} />

        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 120px 44px', gap: 1, alignItems: 'center' }}>
          <Typography variant="overline" sx={{ color: 'text.secondary' }}>名称</Typography>
          <Typography variant="overline" sx={{ color: 'text.secondary' }}>颜色</Typography>
          <span />

          {sorted.map((t) => (
            <React.Fragment key={t.id}>
              <TextField
                defaultValue={t.name || ''}
                size="small"
                onBlur={(e) => {
                  const nextName = e.target.value.trim();
                  if (!nextName || nextName === t.name) return;
                  handleUpdate(t.id, { name: nextName });
                }}
              />
              <TextField
                defaultValue={normalizeHex(t.color)}
                size="small"
                type="color"
                onBlur={(e) => {
                  const nextColor = normalizeHex(e.target.value);
                  if (nextColor === normalizeHex(t.color)) return;
                  handleUpdate(t.id, { color: nextColor });
                }}
              />
              <IconButton size="small" onClick={() => handleDelete(t.id, t.name)} aria-label="delete tag">
                <DeleteOutline fontSize="small" />
              </IconButton>
            </React.Fragment>
          ))}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>关闭</Button>
      </DialogActions>
    </Dialog>
  );
};

export default TagManagerDialog;
