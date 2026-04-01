import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Box,
  Dialog,
  DialogContent,
  Divider,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  TextField,
  Typography,
  InputAdornment,
  Chip,
} from '@mui/material';
import { SearchOutlined, FolderOutlined, NoteOutlined, KeyboardCommandKey, SettingsOutlined, ChecklistOutlined, HubOutlined } from '@mui/icons-material';
import { useModalFlag } from '../utils/modal';

const CommandPalette = ({ open, onClose, onSearch, onOpenResult, onCreateNote, onCreateFolder, onOpenSettings, onGoTodos, onGoMindmap }) => {
  useModalFlag(open);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    setQuery('');
    setItems([]);
    setActiveIndex(0);
    setTimeout(() => inputRef.current?.focus(), 0);
  }, [open]);

  useEffect(() => {
    const q = query.trim();
    if (!open) return;
    if (!q) {
      setItems([]);
      setActiveIndex(0);
      return;
    }
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const res = await onSearch(q);
        setItems(Array.isArray(res) ? res : []);
        setActiveIndex(0);
      } finally {
        setLoading(false);
      }
    }, 200);
    return () => clearTimeout(t);
  }, [open, query, onSearch]);

  const shortcuts = useMemo(
    () => [
      { label: '新建笔记', action: onCreateNote },
      { label: '新建文件夹', action: onCreateFolder },
      { label: '打开设置', action: onOpenSettings },
      { label: '打开代办', action: onGoTodos },
      { label: '打开导图', action: onGoMindmap },
    ],
    [onCreateFolder, onCreateNote, onGoMindmap, onGoTodos, onOpenSettings]
  );

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((v) => Math.min(v + 1, items.length - 1));
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((v) => Math.max(v - 1, 0));
      return;
    }
    if (e.key === 'Enter') {
      if (items[activeIndex]) {
        e.preventDefault();
        onOpenResult(items[activeIndex], query.trim());
        return;
      }
    }
  };

  const renderSnippet = (snippet) => {
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

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
      disableRestoreFocus
      disableScrollLock
      TransitionProps={{ timeout: 120 }}
      PaperProps={{
        sx: {
          overflow: 'hidden',
          borderRadius: 3,
          boxShadow: '0 26px 90px rgba(0,0,0,0.55)',
          position: 'relative',
          '&:before': {
            content: '""',
            position: 'absolute',
            inset: -2,
            background:
              'linear-gradient(135deg, rgba(124,77,255,0.35), rgba(34,197,94,0.22), rgba(56,189,248,0.18))',
            filter: 'blur(18px)',
            opacity: 0.55,
            pointerEvents: 'none',
          },
        },
      }}
    >
      <DialogContent sx={{ p: 0 }}>
        <Box sx={{ px: 2, pt: 2, pb: 1.5, position: 'relative' }}>
          <TextField
            inputRef={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="搜索目录 / 笔记，或输入命令…"
            fullWidth
            size="small"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchOutlined sx={{ color: 'text.secondary' }} />
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                  <Chip
                    size="small"
                    label={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <KeyboardCommandKey sx={{ fontSize: 16 }} />
                        <span>K</span>
                      </Box>
                    }
                    sx={{ opacity: 0.7 }}
                  />
                </InputAdornment>
              ),
            }}
          />
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
            上下键选择，回车打开，ESC 关闭
          </Typography>
        </Box>

        <Divider sx={{ opacity: 0.25 }} />

        <Box sx={{ p: 1.5 }}>
          {query.trim() ? (
            <>
              <Typography variant="overline" sx={{ color: 'text.secondary' }}>
                {loading ? '搜索中…' : `结果（${items.length}）`}
              </Typography>
              <List dense disablePadding>
                {items.map((item, idx) => (
                  <ListItemButton
                    key={`${item.type}-${item.id}`}
                    selected={idx === activeIndex}
                    onMouseEnter={() => setActiveIndex(idx)}
                    onClick={() => onOpenResult(item, query.trim())}
                    sx={{ mb: 0.5, borderRadius: 2 }}
                  >
                    <ListItemIcon sx={{ minWidth: 36 }}>
                      {item.type === 'folder' ? <FolderOutlined fontSize="small" /> : <NoteOutlined fontSize="small" />}
                    </ListItemIcon>
                    <ListItemText
                      primary={<Typography variant="body2" sx={{ fontWeight: 700 }}>{item.title}</Typography>}
                      secondary={
                        item.snippet ? (
                          <Typography variant="caption" color="text.secondary">
                            {renderSnippet(item.snippet)}
                          </Typography>
                        ) : null
                      }
                    />
                  </ListItemButton>
                ))}
                {!loading && items.length === 0 ? (
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    没有匹配结果
                  </Typography>
                ) : null}
              </List>
            </>
          ) : (
            <>
              <Typography variant="overline" sx={{ color: 'text.secondary' }}>
                常用操作
              </Typography>
              <List dense disablePadding>
                {shortcuts.map((s) => (
                  <ListItemButton key={s.label} onClick={s.action} sx={{ mb: 0.5, borderRadius: 2 }}>
                    <ListItemIcon sx={{ minWidth: 36 }}>
                      {s.label === '新建文件夹' ? <FolderOutlined fontSize="small" />
                        : s.label === '新建笔记' ? <NoteOutlined fontSize="small" />
                          : s.label === '打开设置' ? <SettingsOutlined fontSize="small" />
                            : s.label === '打开代办' ? <ChecklistOutlined fontSize="small" />
                              : <HubOutlined fontSize="small" />}
                    </ListItemIcon>
                    <ListItemText primary={<Typography variant="body2" sx={{ fontWeight: 700 }}>{s.label}</Typography>} />
                  </ListItemButton>
                ))}
              </List>
            </>
          )}
        </Box>
      </DialogContent>
    </Dialog>
  );
};

export default CommandPalette;
