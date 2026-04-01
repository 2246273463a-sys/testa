import React, { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  Stack,
  Typography,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { fetchNotes, fetchTodos } from '../api';
import { AddOutlined, Star, PushPinOutlined, ChecklistOutlined } from '@mui/icons-material';
import Interactive from './Interactive';
import CountUpNumber from './CountUpNumber';

const StatCard = ({ title, value, subtitle, tone = 'accent', to, eventName }) => {
  const bg =
    tone === 'success'
      ? 'linear-gradient(135deg, rgba(34,197,94,0.32), rgba(0,0,0,0.00))'
      : tone === 'info'
        ? 'linear-gradient(135deg, rgba(56,189,248,0.28), rgba(0,0,0,0.00))'
        : 'linear-gradient(135deg, rgba(var(--accent-rgb) / 0.30), rgba(0,0,0,0.00))';

  return (
    <Interactive
      className="interactive-card"
      to={to}
      eventName={eventName}
      sx={{
        borderRadius: 2,
        p: 2,
        minHeight: 92,
        background: bg,
      }}
    >
      <Typography variant="overline" sx={{ color: 'text.secondary' }}>
        {title}
      </Typography>
      <Typography variant="h5" sx={{ fontWeight: 950, lineHeight: 1.1, mt: 0.5 }}>
        <CountUpNumber value={value} />
      </Typography>
      {subtitle ? (
        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.5 }}>
          {subtitle}
        </Typography>
      ) : null}
    </Interactive>
  );
};

const DashboardHome = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState([]);
  const [todos, setTodos] = useState([]);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      setLoading(true);
      try {
        const [noteData, todoData] = await Promise.all([
          fetchNotes({ include_deleted: true }),
          fetchTodos(),
        ]);
        if (!alive) return;
        setNotes(Array.isArray(noteData) ? noteData : []);
        setTodos(Array.isArray(todoData) ? todoData : []);
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    };
    load();
    const onChanged = () => load();
    window.addEventListener('notes:changed', onChanged);
    return () => {
      alive = false;
      window.removeEventListener('notes:changed', onChanged);
    };
  }, []);

  const stats = useMemo(() => {
    const total = notes.filter((n) => !Number(n.is_deleted)).length;
    const favorites = notes.filter((n) => !Number(n.is_deleted) && Number(n.is_favorite)).length;
    const pinned = notes.filter((n) => !Number(n.is_deleted) && Number(n.is_pinned)).length;
    const templates = notes.filter((n) => !Number(n.is_deleted) && Number(n.is_template)).length;
    const todoTotal = todos.length;
    const todoDone = todos.filter((t) => Boolean(t.checked)).length;
    const todoPending = todoTotal - todoDone;
    return { total, favorites, pinned, templates, todoTotal, todoDone, todoPending };
  }, [notes, todos]);

  const recent = useMemo(() => {
    const list = notes
      .filter((n) => !Number(n.is_deleted))
      .sort((a, b) => (b.updated_at || b.created_at || '').localeCompare(a.updated_at || a.created_at || ''))
      .slice(0, 6);
    return list;
  }, [notes]);

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
        <Typography
          variant="h4"
          sx={{
            fontWeight: 950,
            letterSpacing: 0.2,
            backgroundImage:
              'linear-gradient(90deg, rgba(56,189,248,0.95), rgba(var(--accent-rgb) / 0.95), rgba(34,197,94,0.95))',
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
            color: 'transparent',
          }}
        >
          My Dashboard
        </Typography>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1 }}>
          <Chip size="small" label={`笔记 ${stats.total}`} />
          <Chip size="small" icon={<Star />} label={`收藏 ${stats.favorites}`} />
          <Chip size="small" icon={<PushPinOutlined />} label={`置顶 ${stats.pinned}`} />
          <Chip size="small" icon={<ChecklistOutlined />} label={`代办 ${stats.todoPending}/${stats.todoTotal}`} />
          <Box sx={{ flex: 1 }} />
          <Button variant="contained" size="small" startIcon={<AddOutlined />} onClick={() => navigate('/notes')}>
            去工作台
          </Button>
        </Stack>
      </Box>

      <Divider sx={{ opacity: 0.25 }} />

      <Box sx={{ p: 2, flex: 1, minHeight: 0, overflowY: 'auto' }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 1.5 }}>
          <StatCard title="Total balance" value={stats.total} subtitle="可用笔记数" tone="success" to="/notes" eventName="nav_dashboard_stat_total" />
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
            <StatCard title="Income" value={stats.favorites} subtitle="收藏" tone="info" to="/notes" eventName="nav_dashboard_stat_favorites" />
            <StatCard title="Expenses" value={stats.todoPending} subtitle="未完成代办" tone="accent" to="/todos" eventName="nav_dashboard_stat_todo_pending" />
          </Box>
        </Box>

        <Box sx={{ mt: 2 }}>
          <Typography variant="overline" sx={{ color: 'text.secondary' }}>
            最近编辑
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 1.25, mt: 1 }}>
            {recent.map((n) => (
              <Interactive
                key={n.id}
                className="interactive-card"
                to={`/notes/${n.id}`}
                eventName="nav_dashboard_recent_note"
                eventProps={{ note_id: n.id }}
                sx={{ borderRadius: 2, p: 2 }}
              >
                <Typography sx={{ fontWeight: 900, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {n.title || '未命名'}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                  {(n.updated_at || n.created_at || '').replace('T', ' ').slice(0, 16)}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {String(n.content || '').replace(/\s+/g, ' ').slice(0, 160)}
                </Typography>
              </Interactive>
            ))}
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default DashboardHome;
