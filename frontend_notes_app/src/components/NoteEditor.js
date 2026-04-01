import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Box,
  TextField,
  Button,
  CircularProgress,
  Alert,
  Stack,
  Divider,
  Typography,
  IconButton,
  Tooltip,
  ToggleButton,
  ToggleButtonGroup,
  Menu,
  MenuItem,
  Switch,
  FormControlLabel,
  Chip,
  Autocomplete,
} from '@mui/material';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { fetchNote, updateNote, deleteNote, fetchTags, restoreNote, hardDeleteNote } from '../api';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/github-dark.css';
import {
  ContentCopyOutlined,
  CodeOutlined,
  SettingsOutlined,
  Star,
  StarBorder,
  PushPinOutlined,
  DeleteOutline,
  RestoreFromTrash,
  DeleteForever,
  ViewQuiltOutlined,
  FormatBold,
  FormatItalic,
  StrikethroughS,
  LinkOutlined,
  TableChartOutlined,
  FormatListBulleted,
  FormatListNumbered,
  CheckBoxOutlined,
  ArrowBackOutlined,
} from '@mui/icons-material';
import { getLineStartIndex } from '../utils/markdown';
import BacklinksPanel from './BacklinksPanel';

const NoteEditor = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isNewNote, setIsNewNote] = useState(false);
  const [localQuery, setLocalQuery] = useState('');
  const contentInputRef = useRef(null);
  const [viewMode, setViewMode] = useState(() => localStorage.getItem('note_view_mode') || 'split');
  const [autosaveEnabled, setAutosaveEnabled] = useState(() => (localStorage.getItem('autosave_enabled') ?? 'true') === 'true');
  const [lineWrapEnabled, setLineWrapEnabled] = useState(() => (localStorage.getItem('line_wrap_enabled') ?? 'true') === 'true');
  const [fontSize, setFontSize] = useState(() => Number(localStorage.getItem('editor_font_size') || 14));
  const [saveStatus, setSaveStatus] = useState('');
  const [settingsAnchor, setSettingsAnchor] = useState(null);
  const lastSavedRef = useRef({ title: '', content: '', tagsKey: '' });
  const autosaveTimerRef = useRef(null);
  const jumpAppliedRef = useRef('');
  const [tags, setTags] = useState([]);
  const [noteTagIds, setNoteTagIds] = useState([]);
  const [noteFlags, setNoteFlags] = useState({ is_favorite: 0, is_pinned: 0, is_deleted: 0, is_template: 0 });

  useEffect(() => {
    const loadNote = async () => {
      setLoading(true);
      setError(null);
      if (id === 'new') { // 检查是否是新建笔记的路由
        setNoteTitle('新笔记');
        setNoteContent('');
        setIsNewNote(true);
        setLoading(false);
        return;
      }

      try {
        const data = await fetchNote(id);
        if (data) {
          setNoteTitle(data.title);
          setNoteContent(data.content);
          setNoteTagIds(Array.isArray(data.tags) ? data.tags.map((t) => t.id) : []);
          setNoteFlags({
            is_favorite: Number(data.is_favorite) ? 1 : 0,
            is_pinned: Number(data.is_pinned) ? 1 : 0,
            is_deleted: Number(data.is_deleted) ? 1 : 0,
            is_template: Number(data.is_template) ? 1 : 0,
          });
          setIsNewNote(false);
          const tagsKey = Array.isArray(data.tags) ? data.tags.map((t) => t.id).sort((a, b) => a - b).join(',') : '';
          lastSavedRef.current = { title: data.title, content: data.content, tagsKey };
          setSaveStatus('已同步');
        } else {
          setError("笔记未找到");
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadNote();
  }, [id]);

  useEffect(() => {
    const load = async () => {
      const data = await fetchTags();
      setTags(Array.isArray(data) ? data : []);
    };
    load();
    const onChanged = () => load();
    window.addEventListener('tags:changed', onChanged);
    return () => window.removeEventListener('tags:changed', onChanged);
  }, []);

  const navParams = useMemo(() => new URLSearchParams(location.search || ''), [location.search]);
  const navQ = navParams.get('q') || '';
  const navLineRaw = navParams.get('line');
  const navLine = navLineRaw == null ? null : Number(navLineRaw);

  useEffect(() => {
    if (!id || id === 'new') return;
    if (loading) return;
    const key = `${id}|${navQ}|${String(navLineRaw || '')}`;
    if (jumpAppliedRef.current === key) return;
    jumpAppliedRef.current = key;

    if (navQ) {
      setLocalQuery(navQ);
    }

    const textarea = contentInputRef.current;
    if (!textarea || !textarea.setSelectionRange) return;
    const text = noteContent || '';

    if (Number.isFinite(navLine) && navLine >= 0) {
      const idx = getLineStartIndex(text, navLine);
      textarea.focus();
      textarea.setSelectionRange(idx, idx);
      return;
    }

    if (navQ) {
      const idx = text.indexOf(navQ);
      if (idx !== -1) {
        textarea.focus();
        textarea.setSelectionRange(idx, idx + navQ.length);
      }
    }
  }, [id, loading, navLine, navLineRaw, navQ, noteContent]);

  useEffect(() => {
    localStorage.setItem('note_view_mode', viewMode);
  }, [viewMode]);

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
    if (isNewNote) return;
    if (!autosaveEnabled) return;
    if (!id) return;

    const tagsKey = [...(noteTagIds || [])].sort((a, b) => a - b).join(',');
    const changed =
      noteTitle !== lastSavedRef.current.title || noteContent !== lastSavedRef.current.content || tagsKey !== lastSavedRef.current.tagsKey;
    if (!changed) return;

    setSaveStatus('自动保存中…');
    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
    }
    autosaveTimerRef.current = setTimeout(async () => {
      try {
        await updateNote(id, noteTitle, noteContent, { tag_ids: noteTagIds });
        lastSavedRef.current = { title: noteTitle, content: noteContent, tagsKey };
        setSaveStatus('已自动保存');
        window.dispatchEvent(new CustomEvent('notes:changed'));
      } catch (e) {
        console.error('Auto save failed:', e);
        setSaveStatus('自动保存失败');
      }
    }, 800);

    return () => {
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current);
      }
    };
  }, [autosaveEnabled, id, isNewNote, noteContent, noteTitle, noteTagIds]);

  const handleSave = async () => {
    if (isNewNote) {
      // 新建笔记的保存逻辑将由 FolderTreeItem 或 App.js 中的按钮处理
      // 这里可以添加一个提示或者直接禁用保存按钮
      alert("请在左侧目录中选择或创建笔记，然后编辑");
      return;
    }

    try {
      const tagsKey = [...(noteTagIds || [])].sort((a, b) => a - b).join(',');
      await updateNote(id, noteTitle, noteContent, { tag_ids: noteTagIds });
      lastSavedRef.current = { title: noteTitle, content: noteContent, tagsKey };
      setSaveStatus('已手动保存');
      window.dispatchEvent(new CustomEvent('notes:changed'));
    } catch (err) {
      console.error("Error saving note:", err);
      alert("笔记保存失败！");
    }
  };

  const handleFindNext = () => {
    const q = localQuery;
    if (!q) return;
    const text = noteContent || '';
    const textarea = contentInputRef.current;
    const startFrom = textarea?.selectionEnd ?? 0;
    const idx = text.indexOf(q, startFrom);
    const nextIdx = idx !== -1 ? idx : text.indexOf(q, 0);
    if (nextIdx === -1) {
      alert('未找到匹配内容');
      return;
    }
    if (textarea && textarea.setSelectionRange) {
      textarea.focus();
      textarea.setSelectionRange(nextIdx, nextIdx + q.length);
    }
  };

  const handleFindPrev = () => {
    const q = localQuery;
    if (!q) return;
    const text = noteContent || '';
    const textarea = contentInputRef.current;
    const startFrom = (textarea?.selectionStart ?? 0) - 1;
    const idx = text.lastIndexOf(q, Math.max(0, startFrom));
    const prevIdx = idx !== -1 ? idx : text.lastIndexOf(q);
    if (prevIdx === -1) {
      alert('未找到匹配内容');
      return;
    }
    if (textarea && textarea.setSelectionRange) {
      textarea.focus();
      textarea.setSelectionRange(prevIdx, prevIdx + q.length);
    }
  };

  const insertCodeBlock = () => {
    const language = prompt('请输入代码语言（如 js / ts / python / json / bash）：', 'javascript') || '';
    const textarea = contentInputRef.current;
    const start = textarea?.selectionStart ?? 0;
    const end = textarea?.selectionEnd ?? 0;
    const selected = (noteContent || '').slice(start, end);
    const fence = `\n\`\`\`${language.trim()}\n${selected || '在这里输入代码…'}\n\`\`\`\n`;
    const next = (noteContent || '').slice(0, start) + fence + (noteContent || '').slice(end);
    setNoteContent(next);
    setTimeout(() => {
      if (textarea && textarea.setSelectionRange) {
        const cursor = start + fence.length;
        textarea.focus();
        textarea.setSelectionRange(cursor, cursor);
      }
    }, 0);
  };

  const updateSelection = (next, cursorStart, cursorEnd) => {
    const textarea = contentInputRef.current;
    setNoteContent(next);
    setTimeout(() => {
      if (textarea && textarea.setSelectionRange) {
        textarea.focus();
        textarea.setSelectionRange(cursorStart, cursorEnd);
      }
    }, 0);
  };

  const wrapSelection = (prefix, suffix, placeholder) => {
    const textarea = contentInputRef.current;
    const start = textarea?.selectionStart ?? 0;
    const end = textarea?.selectionEnd ?? 0;
    const selected = (noteContent || '').slice(start, end) || placeholder || '';
    const insert = `${prefix}${selected}${suffix}`;
    const next = (noteContent || '').slice(0, start) + insert + (noteContent || '').slice(end);
    updateSelection(next, start + prefix.length, start + prefix.length + selected.length);
  };

  const insertLinePrefix = (prefix) => {
    const textarea = contentInputRef.current;
    const start = textarea?.selectionStart ?? 0;
    const end = textarea?.selectionEnd ?? 0;
    const text = noteContent || '';
    const before = text.slice(0, start);
    const sel = text.slice(start, end);
    const after = text.slice(end);
    const lines = (sel || '').split(/\r?\n/);
    const prefixed = lines.map((l) => (l ? `${prefix}${l}` : prefix.trimEnd())).join('\n');
    const insert = sel ? prefixed : `${prefix}在这里输入…`;
    const next = before + insert + after;
    updateSelection(next, start, start + insert.length);
  };

  const insertTable = () => {
    const textarea = contentInputRef.current;
    const start = textarea?.selectionStart ?? 0;
    const end = textarea?.selectionEnd ?? 0;
    const table = `\n| 列1 | 列2 | 列3 |\n| --- | --- | --- |\n| 内容 | 内容 | 内容 |\n`;
    const next = (noteContent || '').slice(0, start) + table + (noteContent || '').slice(end);
    updateSelection(next, start + 3, start + table.length - 1);
  };

  const insertLink = () => {
    wrapSelection('[', '](https://)', '链接文本');
  };

  const insertTask = () => insertLinePrefix('- [ ] ');
  const insertUl = () => insertLinePrefix('- ');
  const insertOl = () => insertLinePrefix('1. ');

  const matchCount = useMemo(() => {
    const q = String(localQuery || '').trim();
    if (!q) return 0;
    const text = noteContent || '';
    let count = 0;
    let idx = 0;
    while (idx < text.length) {
      const next = text.indexOf(q, idx);
      if (next === -1) break;
      count += 1;
      idx = next + Math.max(1, q.length);
      if (count > 999) break;
    }
    return count;
  }, [localQuery, noteContent]);

  const markdownComponents = useMemo(
    () => {
      const q = String(localQuery || '').trim();
      const highlight = (children) => {
        if (!q) return children;
        return React.Children.map(children, (child) => {
          if (typeof child === 'string') {
            const parts = child.split(q);
            if (parts.length === 1) return child;
            const out = [];
            for (let i = 0; i < parts.length; i += 1) {
              if (parts[i]) out.push(parts[i]);
              if (i !== parts.length - 1) out.push(<mark key={`m_${i}`}>{q}</mark>);
            }
            return <>{out}</>;
          }
          if (React.isValidElement(child) && child.props?.children) {
            return React.cloneElement(child, { ...child.props, children: highlight(child.props.children) });
          }
          return child;
        });
      };

      return {
        code: ({ inline, className, children, ...props }) => {
        const codeText = String(children ?? '');
        const lang = (className || '').replace('language-', '').trim();
        if (inline) {
          return (
            <Box component="code" sx={{ px: 0.5, py: 0.1, borderRadius: 1, bgcolor: 'rgba(255,255,255,0.06)' }} {...props}>
              {children}
            </Box>
          );
        }
        const onCopy = async () => {
          const raw = codeText.replace(/\n$/, '');
          try {
            await navigator.clipboard.writeText(raw);
          } catch (e) {
            console.error('Copy failed:', e);
          }
        };
        return (
          <Box sx={{ position: 'relative', my: 1.5 }}>
            <Box
              sx={{
                position: 'absolute',
                top: 10,
                right: 10,
                display: 'flex',
                gap: 1,
                alignItems: 'center',
                zIndex: 1,
              }}
            >
              {lang ? <Chip size="small" label={lang} sx={{ opacity: 0.85 }} /> : null}
              <Tooltip title="复制代码">
                <IconButton size="small" onClick={onCopy}>
                  <ContentCopyOutlined fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
            <Box
              component="pre"
              sx={{
                m: 0,
                p: 2,
                borderRadius: 2,
                overflow: 'auto',
                border: '1px solid rgba(255,255,255,0.08)',
                backgroundColor: 'rgba(0,0,0,0.35)',
              }}
            >
              <Box component="code" className={className} {...props}>
                {children}
              </Box>
            </Box>
          </Box>
        );
      },
        p: ({ children }) => (
          <Typography variant="body2" sx={{ lineHeight: 1.7, mb: 1 }}>
            {highlight(children)}
          </Typography>
        ),
        li: ({ children }) => <li>{highlight(children)}</li>,
        td: ({ children }) => <td>{highlight(children)}</td>,
        th: ({ children }) => <th>{highlight(children)}</th>,
      };
    },
    [localQuery]
  );

  const handleDelete = async () => {
    if (isNewNote) {
      alert("无法删除未保存的新笔记。");
      return;
    }
    try {
      await deleteNote(id);
      alert("已移入回收站");
      window.dispatchEvent(new CustomEvent('notes:changed'));
      navigate('/'); // 删除后导航回主页
    } catch (err) {
      console.error("Error deleting note:", err);
      alert("操作失败！");
    }
  };

  const handleRestore = async () => {
    if (isNewNote) return;
    try {
      const next = await restoreNote(id);
      setNoteFlags((p) => ({ ...p, is_deleted: 0 }));
      setNoteTitle(next.title);
      setNoteContent(next.content);
      window.dispatchEvent(new CustomEvent('notes:changed'));
    } catch (e) {
      alert('恢复失败');
    }
  };

  const handleHardDelete = async () => {
    if (isNewNote) return;
    const ok = window.confirm('确定要永久删除吗？此操作不可恢复。');
    if (!ok) return;
    try {
      await hardDeleteNote(id);
      window.dispatchEvent(new CustomEvent('notes:changed'));
      navigate('/');
    } catch (e) {
      alert('永久删除失败');
    }
  };

  const toggleFlag = async (key) => {
    if (isNewNote) return;
    const next = Number(noteFlags[key]) ? 0 : 1;
    try {
      await updateNote(id, noteTitle, noteContent, { [key]: next, tag_ids: noteTagIds });
      setNoteFlags((p) => ({ ...p, [key]: next }));
      window.dispatchEvent(new CustomEvent('notes:changed'));
    } catch (e) {
      alert('操作失败');
    }
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
        <Alert severity="error">加载笔记失败: {error}</Alert>
      </Box>
    );
  }

  const handleOpenSettings = (e) => setSettingsAnchor(e.currentTarget);
  const handleCloseSettings = () => setSettingsAnchor(null);

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Stack
        direction="row"
        spacing={1.5}
        alignItems="center"
        sx={{
          p: 2,
          position: 'sticky',
          top: 0,
          zIndex: 2,
          background: 'linear-gradient(180deg, rgba(15,23,51,0.88), rgba(15,23,51,0.62))',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <IconButton
          sx={{ display: { xs: 'inline-flex', md: 'none' }, color: 'text.primary', mr: -1 }}
          onClick={() => navigate('/notes')}
        >
          <ArrowBackOutlined />
        </IconButton>
        <TextField
          label="标题"
          variant="outlined"
          value={noteTitle}
          onChange={(e) => setNoteTitle(e.target.value)}
          fullWidth
          size="small"
        />

        <Autocomplete
          multiple
          size="small"
          options={tags}
          value={tags.filter((t) => (noteTagIds || []).includes(t.id))}
          disableCloseOnSelect
          getOptionLabel={(o) => o?.name || ''}
          onChange={(_, v) => {
            const ids = Array.isArray(v) ? v.map((x) => x.id) : [];
            setNoteTagIds(ids);
          }}
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
          sx={{ width: 320, display: { xs: 'none', md: 'flex' } }}
        />
        <Button variant="contained" onClick={handleSave} disabled={isNewNote || Boolean(noteFlags.is_deleted)}>
          保存
        </Button>
        {Number(noteFlags.is_deleted) ? (
          <>
            <Tooltip title="恢复">
              <IconButton onClick={handleRestore} disabled={isNewNote}>
                <RestoreFromTrash />
              </IconButton>
            </Tooltip>
            <Tooltip title="永久删除">
              <IconButton onClick={handleHardDelete} disabled={isNewNote}>
                <DeleteForever />
              </IconButton>
            </Tooltip>
          </>
        ) : (
          <Tooltip title="移入回收站">
            <IconButton onClick={handleDelete} disabled={isNewNote}>
              <DeleteOutline />
            </IconButton>
          </Tooltip>
        )}
        <Tooltip title={Number(noteFlags.is_favorite) ? '取消收藏' : '收藏'}>
          <IconButton onClick={() => toggleFlag('is_favorite')} disabled={isNewNote || Boolean(noteFlags.is_deleted)}>
            {Number(noteFlags.is_favorite) ? <Star /> : <StarBorder />}
          </IconButton>
        </Tooltip>
        <Tooltip title={Number(noteFlags.is_pinned) ? '取消置顶' : '置顶'}>
          <IconButton onClick={() => toggleFlag('is_pinned')} disabled={isNewNote || Boolean(noteFlags.is_deleted)}>
            <PushPinOutlined />
          </IconButton>
        </Tooltip>
        <Tooltip title={Number(noteFlags.is_template) ? '取消模板' : '设为模板'}>
          <IconButton onClick={() => toggleFlag('is_template')} disabled={isNewNote || Boolean(noteFlags.is_deleted)}>
            <ViewQuiltOutlined />
          </IconButton>
        </Tooltip>
        <Tooltip title="插入代码块">
          <IconButton onClick={insertCodeBlock} disabled={isNewNote || Boolean(noteFlags.is_deleted)}>
            <CodeOutlined />
          </IconButton>
        </Tooltip>
        <Tooltip title="编辑器设置">
          <IconButton onClick={handleOpenSettings}>
            <SettingsOutlined />
          </IconButton>
        </Tooltip>
      </Stack>

      <Divider sx={{ opacity: 0.25 }} />

      <Stack
        direction="row"
        spacing={1.5}
        alignItems="center"
        sx={{
          px: 2,
          py: 1.5,
          background: 'linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02))',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <ToggleButtonGroup
          value={viewMode}
          exclusive
          onChange={(_, v) => v && setViewMode(v)}
          size="small"
          sx={{ mr: 0.5 }}
        >
          <ToggleButton value="edit">编辑</ToggleButton>
          <ToggleButton value="split">分屏</ToggleButton>
          <ToggleButton value="preview">预览</ToggleButton>
        </ToggleButtonGroup>
        <TextField
          value={localQuery}
          onChange={(e) => setLocalQuery(e.target.value)}
          size="small"
          placeholder="本文件搜索"
          sx={{ width: 260 }}
        />
        <Chip size="small" label={localQuery ? `命中 ${matchCount}` : '未搜索'} sx={{ opacity: 0.85 }} />
        <Button variant="outlined" size="small" onClick={handleFindNext} disabled={!localQuery}>
          查找下一个
        </Button>
        <Button variant="outlined" size="small" onClick={handleFindPrev} disabled={!localQuery}>
          查找上一个
        </Button>
        <Divider orientation="vertical" flexItem sx={{ mx: 1, opacity: 0.18 }} />
        <Tooltip title="加粗">
          <IconButton size="small" onClick={() => wrapSelection('**', '**', '加粗文本')} disabled={isNewNote || Boolean(noteFlags.is_deleted)}>
            <FormatBold fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="斜体">
          <IconButton size="small" onClick={() => wrapSelection('*', '*', '斜体文本')} disabled={isNewNote || Boolean(noteFlags.is_deleted)}>
            <FormatItalic fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="删除线">
          <IconButton size="small" onClick={() => wrapSelection('~~', '~~', '删除线文本')} disabled={isNewNote || Boolean(noteFlags.is_deleted)}>
            <StrikethroughS fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="插入链接">
          <IconButton size="small" onClick={insertLink} disabled={isNewNote || Boolean(noteFlags.is_deleted)}>
            <LinkOutlined fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="插入表格">
          <IconButton size="small" onClick={insertTable} disabled={isNewNote || Boolean(noteFlags.is_deleted)}>
            <TableChartOutlined fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="无序列表">
          <IconButton size="small" onClick={insertUl} disabled={isNewNote || Boolean(noteFlags.is_deleted)}>
            <FormatListBulleted fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="有序列表">
          <IconButton size="small" onClick={insertOl} disabled={isNewNote || Boolean(noteFlags.is_deleted)}>
            <FormatListNumbered fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="任务列表">
          <IconButton size="small" onClick={insertTask} disabled={isNewNote || Boolean(noteFlags.is_deleted)}>
            <CheckBoxOutlined fontSize="small" />
          </IconButton>
        </Tooltip>
        <Typography variant="caption" color="text.secondary" sx={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {saveStatus ? `状态：${saveStatus}` : '支持 Markdown（代码块 / 表格 / 任务列表）'}
        </Typography>
      </Stack>

      <Divider sx={{ opacity: 0.25 }} />

      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          display: 'grid',
          gridTemplateColumns: viewMode === 'split' ? '1fr 1fr' : '1fr',
        }}
      >
        {viewMode !== 'preview' ? (
          <Box sx={{ p: 2, borderRight: viewMode === 'split' ? '1px solid rgba(255,255,255,0.08)' : 'none', minHeight: 0 }}>
            <TextField
              inputRef={contentInputRef}
              fullWidth
              multiline
              minRows={20}
              label="Markdown"
              variant="outlined"
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
              disabled={isNewNote || Boolean(noteFlags.is_deleted)}
              InputProps={{
                sx: {
                  fontSize,
                  fontFamily:
                    'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
                  whiteSpace: lineWrapEnabled ? 'pre-wrap' : 'pre',
                },
              }}
              sx={{
                height: '100%',
                '& .MuiOutlinedInput-root': {
                  height: '100%',
                  alignItems: 'flex-start',
                  backgroundImage:
                    'linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02))',
                  borderRadius: 2,
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'rgba(var(--accent-rgb) / 0.32)',
                    boxShadow: '0 0 0 3px rgba(var(--accent-rgb) / 0.10)',
                  },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'rgba(var(--accent-rgb) / 0.55)',
                    boxShadow: '0 0 0 4px rgba(var(--accent-rgb) / 0.14)',
                  },
                },
              }}
            />
          </Box>
        ) : null}
        {viewMode !== 'edit' ? (
          <Box
            sx={{
              p: 2,
              overflowY: 'auto',
              minHeight: 0,
              '& h1, & h2, & h3': { letterSpacing: 0.2 },
              '& a': { color: 'rgba(56,189,248,0.95)' },
              '& blockquote': {
                margin: 0,
                padding: '10px 14px',
                borderLeft: '3px solid rgba(124,77,255,0.55)',
                backgroundColor: 'rgba(255,255,255,0.04)',
                borderRadius: 12,
              },
              '& table': {
                width: '100%',
                borderCollapse: 'separate',
                borderSpacing: 0,
                overflow: 'hidden',
                borderRadius: 12,
                border: '1px solid rgba(255,255,255,0.08)',
              },
              '& th, & td': {
                padding: '8px 10px',
                borderBottom: '1px solid rgba(255,255,255,0.06)',
              },
              '& tr:last-child td': { borderBottom: 'none' },
            }}
          >
            <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]} components={markdownComponents}>
              {noteContent || ''}
            </ReactMarkdown>

            <Divider sx={{ my: 2, opacity: 0.25 }} />
            <BacklinksPanel noteId={id} noteTitle={noteTitle} content={noteContent} />
          </Box>
        ) : null}
      </Box>

      <Menu anchorEl={settingsAnchor} open={Boolean(settingsAnchor)} onClose={handleCloseSettings}>
        <MenuItem disableRipple>
          <FormControlLabel
            control={<Switch checked={autosaveEnabled} onChange={(e) => setAutosaveEnabled(e.target.checked)} />}
            label="自动保存"
          />
        </MenuItem>
        <MenuItem disableRipple>
          <FormControlLabel
            control={<Switch checked={lineWrapEnabled} onChange={(e) => setLineWrapEnabled(e.target.checked)} />}
            label="自动换行"
          />
        </MenuItem>
        <MenuItem onClick={() => setFontSize(13)}>字体：小</MenuItem>
        <MenuItem onClick={() => setFontSize(14)}>字体：中</MenuItem>
        <MenuItem onClick={() => setFontSize(16)}>字体：大</MenuItem>
      </Menu>
    </Box>
  );
};

export default NoteEditor;
