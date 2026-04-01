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
  FormControlLabel,
  Slider,
  Stack,
  Switch,
  Tab,
  Tabs,
  Typography,
} from '@mui/material';
import { fetchFolders, fetchNotes, fetchTags, createFolder, createNote, createTag, deleteNote } from '../api';
import { useModalFlag } from '../utils/modal';

const readBool = (key, def) => {
  const v = localStorage.getItem(key);
  if (v == null) return def;
  return v === 'true';
};

const readNum = (key, def) => {
  const v = localStorage.getItem(key);
  const n = Number(v);
  return Number.isFinite(n) ? n : def;
};

const SettingsDialog = ({ open, onClose }) => {
  useModalFlag(open);
  const [tab, setTab] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(() => readBool('reduce_motion', false));
  const [spotlightEnabled, setSpotlightEnabled] = useState(() => readBool('spotlight_enabled', true));
  const [spotlightStrength, setSpotlightStrength] = useState(() => readNum('spotlight_strength', 70));
  const [autosaveEnabled, setAutosaveEnabled] = useState(() => readBool('autosave_enabled', true));
  const [lineWrapEnabled, setLineWrapEnabled] = useState(() => readBool('line_wrap_enabled', true));
  const [fontSize, setFontSize] = useState(() => readNum('editor_font_size', 14));
  const [exportError, setExportError] = useState('');
  const [importError, setImportError] = useState('');
  const [importOk, setImportOk] = useState('');

  useEffect(() => {
    localStorage.setItem('reduce_motion', String(reduceMotion));
    document.body.dataset.reduceMotion = reduceMotion ? '1' : '0';
  }, [reduceMotion]);

  useEffect(() => {
    localStorage.setItem('spotlight_enabled', String(spotlightEnabled));
    document.body.dataset.spotlight = spotlightEnabled ? '1' : '0';
  }, [spotlightEnabled]);

  useEffect(() => {
    const v = Math.max(0, Math.min(100, spotlightStrength));
    localStorage.setItem('spotlight_strength', String(v));
    document.documentElement.style.setProperty('--spotlight-strength', `${v}`);
  }, [spotlightStrength]);

  useEffect(() => {
    localStorage.setItem('autosave_enabled', String(autosaveEnabled));
  }, [autosaveEnabled]);

  useEffect(() => {
    localStorage.setItem('line_wrap_enabled', String(lineWrapEnabled));
  }, [lineWrapEnabled]);

  useEffect(() => {
    localStorage.setItem('editor_font_size', String(fontSize));
  }, [fontSize]);

  useEffect(() => {
    if (!open) return;
    setExportError('');
    setImportError('');
    setImportOk('');
  }, [open]);

  const exportData = async () => {
    setExportError('');
    try {
      const [folders, notes, tags] = await Promise.all([fetchFolders(), fetchNotes({ include_deleted: true }), fetchTags()]);
      const payload = {
        version: 1,
        exportedAt: Date.now(),
        folders,
        notes,
        tags,
      };
      const json = JSON.stringify(payload, null, 2);
      const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `notes-backup-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      setExportError(e?.message || '导出失败');
    }
  };

  const importData = async (file) => {
    setImportError('');
    setImportOk('');
    try {
      const text = await file.text();
      const payload = JSON.parse(text);
      const folders = Array.isArray(payload.folders) ? payload.folders : [];
      const notes = Array.isArray(payload.notes) ? payload.notes : [];
      const tags = Array.isArray(payload.tags) ? payload.tags : [];

      const importedRoot = await createFolder(`导入-${new Date().toLocaleString()}`, null);
      const folderMap = new Map();
      folderMap.set(null, importedRoot.id);

      const flatFolders = [];
      const walk = (arr, parentId) => {
        for (const f of arr || []) {
          flatFolders.push({ f, parentId });
          walk(f.children, f.id);
        }
      };
      walk(folders, null);

      const pending = [...flatFolders];
      while (pending.length) {
        let progressed = false;
        for (let i = pending.length - 1; i >= 0; i--) {
          const { f, parentId } = pending[i];
          if (!folderMap.has(parentId)) continue;
          const created = await createFolder(String(f.name || '未命名'), folderMap.get(parentId));
          folderMap.set(f.id, created.id);
          pending.splice(i, 1);
          progressed = true;
        }
        if (!progressed) {
          break;
        }
      }

      const existingTags = await fetchTags();
      const byName = new Map((Array.isArray(existingTags) ? existingTags : []).map((t) => [String(t.name || ''), t]));
      for (const t of tags) {
        const name = String(t.name || '').trim();
        if (!name) continue;
        if (byName.has(name)) continue;
        try {
          const created = await createTag(name, t.color || '#a78bfa');
          byName.set(name, created);
        } catch (e) {
        }
      }

      const tagIdMap = new Map();
      for (const [name, t] of byName.entries()) {
        tagIdMap.set(name, t.id);
      }

      const toTagIds = (note) => {
        const list = Array.isArray(note.tags) ? note.tags : [];
        const ids = [];
        for (const t of list) {
          const name = String(t.name || '').trim();
          if (!name) continue;
          const id = tagIdMap.get(name);
          if (id) ids.push(id);
        }
        return ids;
      };

      for (const n of notes) {
        const folderId = folderMap.get(n.folder_id) || importedRoot.id;
        const created = await createNote(String(n.title || '未命名'), String(n.content || ''), folderId, {
          tag_ids: toTagIds(n),
          is_favorite: Number(n.is_favorite) ? 1 : 0,
          is_pinned: Number(n.is_pinned) ? 1 : 0,
          is_deleted: Number(n.is_deleted) ? 1 : 0,
          is_template: Number(n.is_template) ? 1 : 0,
        });
        if (Number(n.is_deleted)) {
          await deleteNote(created.id);
        }
      }

      window.dispatchEvent(new CustomEvent('notes:changed'));
      setImportOk('导入完成');
    } catch (e) {
      setImportError(e?.message || '导入失败');
    }
  };

  const tabs = useMemo(
    () => [
      { label: '外观' },
      { label: '编辑器' },
      { label: '数据' },
    ],
    []
  );

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="md"
      disableRestoreFocus
      disableScrollLock
      TransitionProps={{ timeout: 120 }}
    >
      <DialogTitle>设置</DialogTitle>
      <DialogContent sx={{ pt: 1 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 1 }}>
          {tabs.map((t) => (
            <Tab key={t.label} label={t.label} />
          ))}
        </Tabs>
        <Divider sx={{ opacity: 0.25, mb: 2 }} />

        {tab === 0 ? (
          <Stack spacing={1.5}>
            <FormControlLabel
              control={<Switch checked={spotlightEnabled} onChange={(e) => setSpotlightEnabled(e.target.checked)} />}
              label="鼠标悬停光效"
            />

            <Box sx={{ px: 0.5 }}>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                光效强度
              </Typography>
              <Slider
                value={spotlightStrength}
                onChange={(_, v) => setSpotlightStrength(Number(v))}
                min={0}
                max={100}
              />
            </Box>

            <FormControlLabel
              control={<Switch checked={reduceMotion} onChange={(e) => setReduceMotion(e.target.checked)} />}
              label="减少动态效果（低抖动/低消耗）"
            />
          </Stack>
        ) : null}

        {tab === 1 ? (
          <Stack spacing={1.5}>
            <FormControlLabel
              control={<Switch checked={autosaveEnabled} onChange={(e) => setAutosaveEnabled(e.target.checked)} />}
              label="自动保存"
            />
            <FormControlLabel
              control={<Switch checked={lineWrapEnabled} onChange={(e) => setLineWrapEnabled(e.target.checked)} />}
              label="自动换行"
            />
            <Box sx={{ px: 0.5 }}>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                字号
              </Typography>
              <Slider value={fontSize} onChange={(_, v) => setFontSize(Number(v))} min={12} max={18} step={1} />
            </Box>
          </Stack>
        ) : null}

        {tab === 2 ? (
          <Stack spacing={1.5}>
            {exportError ? <Alert severity="error">{exportError}</Alert> : null}
            {importError ? <Alert severity="error">{importError}</Alert> : null}
            {importOk ? <Alert severity="success">{importOk}</Alert> : null}

            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 0.5 }}>
                导出
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                导出包含文件夹、笔记、标签（含回收站/模板/收藏等标记）。
              </Typography>
              <Button variant="contained" onClick={exportData}>
                导出备份 JSON
              </Button>
            </Box>

            <Divider sx={{ opacity: 0.25 }} />

            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 0.5 }}>
                导入
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                导入会创建一个“导入-时间”根文件夹，避免覆盖现有数据。
              </Typography>
              <Button variant="outlined" component="label">
                选择备份文件
                <input
                  type="file"
                  accept="application/json"
                  hidden
                  onChange={(e) => {
                    const f = e.target.files && e.target.files[0];
                    e.target.value = '';
                    if (!f) return;
                    importData(f);
                  }}
                />
              </Button>
            </Box>
          </Stack>
        ) : null}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>关闭</Button>
      </DialogActions>
    </Dialog>
  );
};

export default SettingsDialog;
