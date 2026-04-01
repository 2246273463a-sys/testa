import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Box, Button, Divider, Stack, Tooltip, Typography } from '@mui/material';
import { RefreshOutlined } from '@mui/icons-material';
import { fetchNotes, fetchTodos } from '../api';
import Interactive from './Interactive';
import CountUpNumber from './CountUpNumber';
import { trackEvent } from '../utils/analytics';
import LottiePlayer from './LottiePlayer';
import emptyAnim from '../assets/empty-state.lottie.json';

const WorkbenchHome = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notes, setNotes] = useState([]);
  const [todos, setTodos] = useState([]);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [noteData, todoData] = await Promise.all([fetchNotes({ include_deleted: true }), fetchTodos()]);
      setNotes(Array.isArray(noteData) ? noteData : []);
      setTodos(Array.isArray(todoData) ? todoData : []);
    } catch (e) {
      setError('加载失败，请检查后端服务是否可用。');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const onChanged = () => load();
    window.addEventListener('notes:changed', onChanged);
    return () => window.removeEventListener('notes:changed', onChanged);
  }, []);

  const stats = useMemo(() => {
    const live = notes.filter((n) => !Number(n.is_deleted));
    const total = live.length;
    const favorites = live.filter((n) => Number(n.is_favorite)).length;
    const pinned = live.filter((n) => Number(n.is_pinned)).length;
    const todoTotal = todos.length;
    const todoDone = todos.filter((t) => Boolean(t.checked)).length;
    return { total, favorites, pinned, todoTotal, todoDone, todoPending: todoTotal - todoDone };
  }, [notes, todos]);

  const last = useMemo(() => {
    const live = notes
      .filter((n) => !Number(n.is_deleted))
      .sort((a, b) => (b.updated_at || b.created_at || '').localeCompare(a.updated_at || a.created_at || ''));
    return live.slice(0, 6);
  }, [notes]);

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ p: 2 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ gap: 1 }}>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="h6" sx={{ fontWeight: 950, letterSpacing: 0.2 }}>
              工作台
            </Typography>
            <Typography variant="caption" color="text.secondary">
              从左侧目录/标签选择，或从下方快速打开最近笔记
            </Typography>
          </Box>
          <Button
            size="small"
            variant="outlined"
            startIcon={<RefreshOutlined />}
            onClick={() => {
              trackEvent('workbench_refresh');
              load();
            }}
            disabled={loading}
          >
            刷新
          </Button>
        </Stack>
        {error ? <Alert severity="error" sx={{ mt: 1.5 }}>{error}</Alert> : null}
      </Box>

      <Divider sx={{ opacity: 0.25 }} />

      <Box sx={{ p: 2, flex: 1, minHeight: 0, overflowY: 'auto' }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 1.5 }}>
          <Interactive className="interactive-card" to="/notes" eventName="nav_workbench_stat_notes" sx={{ p: 2, borderRadius: '12px' }}>
            <Typography variant="overline" color="text.secondary">笔记</Typography>
            <Typography variant="h4" sx={{ fontWeight: 950, lineHeight: 1.1, mt: 0.5 }}>
              <CountUpNumber value={stats.total} />
            </Typography>
          </Interactive>
          <Interactive className="interactive-card" to="/notes" eventName="nav_workbench_stat_favorites" sx={{ p: 2, borderRadius: '12px' }}>
            <Typography variant="overline" color="text.secondary">收藏</Typography>
            <Typography variant="h4" sx={{ fontWeight: 950, lineHeight: 1.1, mt: 0.5 }}>
              <CountUpNumber value={stats.favorites} />
            </Typography>
          </Interactive>
          <Interactive className="interactive-card" to="/todos" eventName="nav_workbench_stat_todos" sx={{ p: 2, borderRadius: '12px' }}>
            <Typography variant="overline" color="text.secondary">代办</Typography>
            <Typography variant="h4" sx={{ fontWeight: 950, lineHeight: 1.1, mt: 0.5 }}>
              <CountUpNumber value={stats.todoPending} />
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
              已完成 <CountUpNumber value={stats.todoDone} /> / 总计 <CountUpNumber value={stats.todoTotal} />
            </Typography>
          </Interactive>
        </Box>

        <Box sx={{ mt: 2 }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Typography variant="overline" color="text.secondary">最近编辑</Typography>
            <Tooltip title="已在笔记工作台，无需跳转">
              <span>
                <Button size="small" variant="text" sx={{ opacity: 0.75 }} disabled>
                  查看全部
                </Button>
              </span>
            </Tooltip>
          </Stack>

          {loading ? (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              加载中…
            </Typography>
          ) : last.length === 0 ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mt: 1 }}>
              <LottiePlayer animationData={emptyAnim} style={{ width: 180, height: 180 }} />
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                暂无笔记，点击左上角“新建”开始记录
              </Typography>
            </Box>
          ) : (
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 1.25, mt: 1 }}>
              {last.map((n) => (
                <Interactive
                  key={n.id}
                  className="interactive-card"
                  to={`/notes/${n.id}`}
                  eventName="nav_workbench_recent_note"
                  eventProps={{ note_id: n.id }}
                  sx={{ p: 2, borderRadius: '12px' }}
                >
                  <Typography sx={{ fontWeight: 900, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {n.title || '未命名'}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                    {(n.updated_at || n.created_at || '').replace('T', ' ').slice(0, 16)}
                  </Typography>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{
                      mt: 1,
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}
                  >
                    {String(n.content || '').replace(/\s+/g, ' ').slice(0, 160)}
                  </Typography>
                </Interactive>
              ))}
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
};

export default WorkbenchHome;
