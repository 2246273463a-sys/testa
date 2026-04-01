import React, { useEffect, useMemo, useState } from 'react';
import { Box, Chip, Divider, List, ListItemButton, ListItemText, Stack, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { createNote, fetchNotes } from '../api';
import { trackNavigate, trackEvent } from '../utils/analytics';
import { parseWikiLinks } from '../utils/markdown';

const normalizeTitle = (s) => String(s || '').trim().toLowerCase();

const BacklinksPanel = ({ noteId, noteTitle, content }) => {
  const navigate = useNavigate();
  const [notes, setNotes] = useState([]);
  const [creating, setCreating] = useState('');

  useEffect(() => {
    let alive = true;
    const load = async () => {
      const data = await fetchNotes({ include_deleted: true });
      if (!alive) return;
      setNotes(Array.isArray(data) ? data : []);
    };
    load();
    const onChanged = () => load();
    window.addEventListener('notes:changed', onChanged);
    return () => {
      alive = false;
      window.removeEventListener('notes:changed', onChanged);
    };
  }, []);

  const titleToNote = useMemo(() => {
    const m = new Map();
    for (const n of notes) {
      if (Number(n.is_deleted)) continue;
      const key = normalizeTitle(n.title);
      if (!key) continue;
      if (!m.has(key)) m.set(key, n);
    }
    return m;
  }, [notes]);

  const outgoing = useMemo(() => {
    const links = parseWikiLinks(content || '');
    const unique = new Map();
    for (const l of links) {
      const key = normalizeTitle(l.target);
      if (!key) continue;
      if (!unique.has(key)) unique.set(key, l);
    }
    const out = Array.from(unique.values()).map((l) => {
      const n = titleToNote.get(normalizeTitle(l.target)) || null;
      return {
        target: l.target,
        alias: l.alias,
        note: n,
      };
    });
    return out;
  }, [content, titleToNote]);

  const createMissing = async (target) => {
    const title = String(target || '').trim();
    if (!title) return;
    if (creating) return;
    setCreating(title);
    try {
      trackEvent('backlinks_create_missing', { title });
      const created = await createNote(title, '', null);
      window.dispatchEvent(new CustomEvent('notes:changed'));
      trackNavigate('nav_backlinks_to_created_note', `/notes/${created.id}`, { note_id: created.id });
      navigate(`/notes/${created.id}`);
    } finally {
      setCreating('');
    }
  };

  const incoming = useMemo(() => {
    const myKey = normalizeTitle(noteTitle);
    if (!myKey) return [];
    const out = [];
    for (const n of notes) {
      if (Number(n.is_deleted)) continue;
      if (Number(n.id) === Number(noteId)) continue;
      const links = parseWikiLinks(n.content || '');
      if (links.some((l) => normalizeTitle(l.target) === myKey)) {
        out.push(n);
      }
    }
    out.sort((a, b) => (b.updated_at || b.created_at || '').localeCompare(a.updated_at || a.created_at || ''));
    return out.slice(0, 30);
  }, [noteId, noteTitle, notes]);

  return (
    <Box sx={{ p: 2 }}>
      <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
        <Typography variant="overline" sx={{ color: 'text.secondary' }}>链接</Typography>
        <Chip size="small" label={`出链 ${outgoing.length} / 反链 ${incoming.length}`} sx={{ opacity: 0.85 }} />
      </Stack>

      <Typography variant="caption" color="text.secondary">语法：[[笔记标题]] 或 [[笔记标题|显示别名]]</Typography>

      <Divider sx={{ my: 1.5, opacity: 0.25 }} />

      <Typography variant="overline" sx={{ color: 'text.secondary' }}>出链</Typography>
      {outgoing.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>暂无</Typography>
      ) : (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
          {outgoing.map((o) => (
            <Chip
              key={o.target}
              size="small"
              label={o.alias || o.target}
              variant={o.note ? 'filled' : 'outlined'}
              onClick={() => {
                if (o.note?.id) {
                  trackNavigate('nav_backlinks_outgoing', `/notes/${o.note.id}`, { note_id: o.note.id });
                  navigate(`/notes/${o.note.id}`);
                  return;
                }
                createMissing(o.target);
              }}
              sx={{ opacity: o.note ? 1 : 0.75 }}
            />
          ))}
        </Box>
      )}

      <Divider sx={{ my: 1.5, opacity: 0.25 }} />

      <Typography variant="overline" sx={{ color: 'text.secondary' }}>反向链接</Typography>
      {incoming.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>暂无</Typography>
      ) : (
        <List dense disablePadding sx={{ mt: 0.5 }}>
          {incoming.map((n) => (
            <ListItemButton
              key={n.id}
              onClick={() => {
                trackNavigate('nav_backlinks_incoming', `/notes/${n.id}`, { note_id: n.id });
                navigate(`/notes/${n.id}`);
              }}
              sx={{ borderRadius: 2, mb: 0.5 }}
            >
              <ListItemText
                primary={<Typography variant="body2" sx={{ fontWeight: 800 }}>{n.title || '未命名'}</Typography>}
                secondary={<Typography variant="caption" color="text.secondary">{(n.updated_at || n.created_at || '').replace('T', ' ').slice(0, 16)}</Typography>}
              />
            </ListItemButton>
          ))}
        </List>
      )}
    </Box>
  );
};

export default BacklinksPanel;
