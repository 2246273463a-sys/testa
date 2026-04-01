import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Box, Button, CircularProgress, Divider, IconButton, Stack, Typography } from '@mui/material';
import { ArrowBackOutlined } from '@mui/icons-material';
import { useLocation, useNavigate } from 'react-router-dom';
import ReactFlow, { Background, Controls } from 'reactflow';
import 'reactflow/dist/style.css';
import { fetchNote } from '../api';
import { trackNavigate } from '../utils/analytics';

const parseHeadings = (text) => {
  const s = String(text || '');
  const lines = s.split(/\r?\n/);
  const headings = [];
  for (let i = 0; i < lines.length; i += 1) {
    const m = lines[i].match(/^(#{1,6})\s+(.*)$/);
    if (!m) continue;
    const depth = m[1].length;
    const title = String(m[2] || '').trim();
    if (!title) continue;
    headings.push({ line: i, depth, title });
  }
  return headings;
};

const buildTree = (headings) => {
  const root = { id: 'root', depth: 0, title: 'Root', line: 0, children: [] };
  const stack = [root];
  for (let i = 0; i < headings.length; i += 1) {
    const h = headings[i];
    const node = { id: `h_${i}`, depth: h.depth, title: h.title, line: h.line, children: [] };
    while (stack.length && stack[stack.length - 1].depth >= node.depth) {
      stack.pop();
    }
    stack[stack.length - 1].children.push(node);
    stack.push(node);
  }
  return root;
};

const layoutTree = (root, noteTitle) => {
  const nodes = [];
  const edges = [];
  const yByDepth = new Map();

  const pushNode = (id, label, depth, line) => {
    const y = yByDepth.get(depth) ?? 0;
    yByDepth.set(depth, y + 1);
    nodes.push({
      id,
      data: { label, line },
      position: { x: depth * 260, y: y * 90 },
      style: {
        borderRadius: 14,
        border: '1px solid rgba(255,255,255,0.10)',
        background: 'rgba(255,255,255,0.05)',
        color: 'rgba(255,255,255,0.92)',
        padding: 10,
        minWidth: 160,
      },
    });
  };

  pushNode('note', noteTitle || '当前笔记', 0, 0);

  const walk = (node, parentId, parentDepth) => {
    for (const c of node.children || []) {
      const id = `${parentId}_${c.id}`;
      pushNode(id, c.title, parentDepth + 1, c.line);
      edges.push({
        id: `${parentId}->${id}`,
        source: parentId,
        target: id,
        style: { stroke: 'rgba(124,77,255,0.45)' },
      });
      walk(c, id, parentDepth + 1);
    }
  };

  walk(root, 'note', 0);
  return { nodes, edges };
};

const MindmapView = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useMemo(() => new URLSearchParams(location.search || ''), [location.search]);
  const noteId = params.get('note');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [note, setNote] = useState(null);

  useEffect(() => {
    const id = noteId ? Number(noteId) : null;
    if (!id) {
      setNote(null);
      setError('');
      setLoading(false);
      return;
    }
    let alive = true;
    setLoading(true);
    setError('');
    fetchNote(id)
      .then((n) => {
        if (!alive) return;
        setNote(n);
      })
      .catch((e) => {
        if (!alive) return;
        setError(e?.message || '加载失败');
      })
      .finally(() => {
        if (!alive) return;
        setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [noteId]);

  const flow = useMemo(() => {
    const content = note?.content || '';
    const headings = parseHeadings(content);
    const tree = buildTree(headings);
    return layoutTree(tree, note?.title || '当前笔记');
  }, [note?.content, note?.title]);

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ p: 2 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Stack direction="row" alignItems="center" spacing={1}>
            <IconButton sx={{ display: { xs: 'inline-flex', md: 'none' }, color: 'text.primary', ml: -1 }} onClick={() => navigate('/notes')} size="small">
              <ArrowBackOutlined />
            </IconButton>
            <Typography variant="overline" sx={{ color: 'text.secondary' }}>思维导图</Typography>
          </Stack>
          <Typography variant="caption" color="text.secondary">在中间列表选择笔记后自动生成</Typography>
        </Stack>
        {error ? <Alert severity="error" sx={{ mt: 1.5 }}>{error}</Alert> : null}
      </Box>
      <Divider sx={{ opacity: 0.25 }} />

      <Box sx={{ flex: 1, minHeight: 0 }}>
        {!noteId ? (
          <Box sx={{ px: 2, py: 3, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <Typography variant="body2" color="text.secondary">请从中间列表选择一条笔记</Typography>
            <Button variant="outlined" onClick={() => navigate('/notes')} sx={{ mt: 2, display: { xs: 'inline-flex', md: 'none' } }}>
              返回列表选择
            </Button>
          </Box>
        ) : null}

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', pt: 6 }}>
            <CircularProgress size={24} />
          </Box>
        ) : null}

        {!loading && noteId ? (
          <ReactFlow
            nodes={flow.nodes}
            edges={flow.edges}
            fitView
            onNodeClick={(_, n) => {
              const line = n?.data?.line;
              const id = Number(noteId);
              if (!Number.isFinite(id)) return;
              if (n.id === 'note') {
                trackNavigate('nav_mindmap_to_note', `/notes/${id}`, { note_id: id, from: 'root' });
                navigate(`/notes/${id}`);
                return;
              }
              if (Number.isFinite(Number(line))) {
                trackNavigate('nav_mindmap_to_note_line', `/notes/${id}?line=${encodeURIComponent(String(line))}`, { note_id: id, line });
                navigate(`/notes/${id}?line=${encodeURIComponent(String(line))}`);
              } else {
                trackNavigate('nav_mindmap_to_note', `/notes/${id}`, { note_id: id, from: 'node' });
                navigate(`/notes/${id}`);
              }
            }}
          >
            <Background color="rgba(255,255,255,0.06)" gap={18} />
            <Controls />
          </ReactFlow>
        ) : null}
      </Box>
    </Box>
  );
};

export default MindmapView;
