import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Switch,
  TextField,
  Typography,
  Autocomplete,
} from '@mui/material';
import { createFolder, createNote, fetchNotes } from '../api';
import { useModalFlag } from '../utils/modal';

const CreateItemDialog = ({ open, mode, onClose, onCreated }) => {
  useModalFlag(open);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [useTemplate, setUseTemplate] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [template, setTemplate] = useState(null);

  const title = useMemo(() => {
    if (mode === 'folder') return '新建文件夹';
    return '新建笔记';
  }, [mode]);

  useEffect(() => {
    if (!open) return;
    setName(mode === 'folder' ? '' : '');
    setError('');
    setUseTemplate(false);
    setTemplate(null);
  }, [open, mode]);

  useEffect(() => {
    if (!open) return;
    if (mode !== 'note') return;
    let alive = true;
    const load = async () => {
      try {
        const data = await fetchNotes({ only_templates: true });
        if (!alive) return;
        setTemplates(Array.isArray(data) ? data : []);
      } catch (e) {
        if (!alive) return;
        setTemplates([]);
      }
    };
    load();
    return () => {
      alive = false;
    };
  }, [open, mode]);

  const handleSubmit = async () => {
    const v = name.trim();
    if (!v) return;
    setLoading(true);
    setError('');
    try {
      if (mode === 'folder') {
        const folder = await createFolder(v, null);
        onCreated?.({ type: 'folder', data: folder });
        onClose?.();
        return;
      }
      const content = useTemplate && template ? String(template.content || '') : '';
      const note = await createNote(v, content, null);
      onCreated?.({ type: 'note', data: note });
      onClose?.();
    } catch (e) {
      setError(e?.message || '创建失败');
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
        {error ? (
          <Alert severity="error" sx={{ mb: 1.5 }}>
            {error}
          </Alert>
        ) : null}

        <TextField
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
          fullWidth
          size="small"
          label={mode === 'folder' ? '文件夹名称' : '笔记标题'}
          placeholder={mode === 'folder' ? '例如：项目/学习/随手记' : '例如：会议纪要 / 需求记录'}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSubmit();
          }}
        />

        {mode === 'note' ? (
          <Box sx={{ mt: 1.5 }}>
            <FormControlLabel
              control={<Switch checked={useTemplate} onChange={(e) => setUseTemplate(e.target.checked)} />}
              label="使用模板"
            />
            {useTemplate ? (
              <Box sx={{ mt: 1 }}>
                <Autocomplete
                  options={templates}
                  value={template}
                  onChange={(_, v) => setTemplate(v)}
                  size="small"
                  getOptionLabel={(o) => o?.title || ''}
                  renderInput={(params) => <TextField {...params} label="选择模板" placeholder="选择一个模板笔记" />}
                />
                {template ? (
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.75 }}>
                    将复制模板正文到新笔记。
                  </Typography>
                ) : null}
              </Box>
            ) : null}
          </Box>
        ) : null}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>取消</Button>
        <Button variant="contained" onClick={handleSubmit} disabled={loading || !name.trim()}>
          创建
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CreateItemDialog;
