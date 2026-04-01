import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Autocomplete,
  Stack,
  Chip,
} from '@mui/material';
import { fetchFolders, fetchTags } from '../api';
import { useModalFlag } from '../utils/modal';

const flattenFolders = (nodes) => {
  const out = [];
  const walk = (arr, depth) => {
    for (const f of arr || []) {
      out.push({ id: f.id, name: f.name, depth });
      if (Array.isArray(f.children) && f.children.length) {
        walk(f.children, depth + 1);
      }
    }
  };
  walk(nodes, 0);
  return out;
};

const BulkActionDialog = ({ open, mode, selectedCount, onClose, onConfirm }) => {
  useModalFlag(open);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [folders, setFolders] = useState([]);
  const [tags, setTags] = useState([]);
  const [folder, setFolder] = useState(null);
  const [tagItems, setTagItems] = useState([]);

  useEffect(() => {
    if (!open) return;
    setError('');
    setFolder(null);
    setTagItems([]);
  }, [open, mode]);

  useEffect(() => {
    if (!open) return;
    let alive = true;
    const load = async () => {
      try {
        if (mode === 'move') {
          const data = await fetchFolders();
          if (!alive) return;
          setFolders(flattenFolders(Array.isArray(data) ? data : []));
          return;
        }
        const data = await fetchTags();
        if (!alive) return;
        setTags(Array.isArray(data) ? data : []);
      } catch (e) {
        if (!alive) return;
        setError(e?.message || '加载失败');
      }
    };
    load();
    return () => {
      alive = false;
    };
  }, [open, mode]);

  const title = useMemo(() => {
    if (mode === 'move') return `批量移动（已选 ${selectedCount}）`;
    return `批量设置标签（已选 ${selectedCount}）`;
  }, [mode, selectedCount]);

  const canSubmit = useMemo(() => {
    if (mode === 'move') return Boolean(folder?.id);
    return true;
  }, [folder, mode]);

  const submit = async () => {
    if (!canSubmit) return;
    setLoading(true);
    setError('');
    try {
      if (mode === 'move') {
        await onConfirm?.({ folder_id: folder.id });
      } else {
        await onConfirm?.({ tag_ids: Array.isArray(tagItems) ? tagItems.map((t) => t.id) : [] });
      }
      onClose?.();
    } catch (e) {
      setError(e?.message || '操作失败');
    } finally {
      setLoading(false);
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
      <DialogTitle>{title}</DialogTitle>
      <DialogContent sx={{ pt: 1 }}>
        {error ? <Alert severity="error" sx={{ mb: 1.5 }}>{error}</Alert> : null}
        {mode === 'move' ? (
          <Autocomplete
            size="small"
            options={folders}
            value={folder}
            onChange={(_, v) => setFolder(v)}
            getOptionLabel={(o) => `${' '.repeat((o?.depth || 0) * 2)}${o?.name || ''}`}
            renderInput={(params) => <TextField {...params} label="目标文件夹" placeholder="选择文件夹" />}
          />
        ) : (
          <Box>
            <Autocomplete
              multiple
              size="small"
              options={tags}
              value={tagItems}
              onChange={(_, v) => setTagItems(v || [])}
              getOptionLabel={(o) => o?.name || ''}
              renderTags={(value, getTagProps) =>
                value.map((option, index) => (
                  <Chip
                    {...getTagProps({ index })}
                    key={option.id}
                    label={option.name}
                    size="small"
                    sx={{ backgroundColor: 'rgba(255,255,255,0.05)', border: `1px solid ${option.color || 'rgba(255,255,255,0.10)'}` }}
                  />
                ))
              }
              renderInput={(params) => <TextField {...params} label="标签" placeholder="选择标签" />}
            />
            <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
              <Chip size="small" label="提示：批量设置会覆盖原标签" sx={{ opacity: 0.75 }} />
            </Stack>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>取消</Button>
        <Button variant="contained" onClick={submit} disabled={loading || !canSubmit}>
          确定
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default BulkActionDialog;

