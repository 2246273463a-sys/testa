import React, { useCallback, useEffect, useState } from 'react';
import { Box, Button, CircularProgress, Divider, Stack, Typography } from '@mui/material';
import { FolderOutlined, NoteOutlined } from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import { createFolder, createNote, fetchFolder } from '../api';

const FolderPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [folder, setFolder] = useState(null);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchFolder(id);
      setFolder(data);
    } catch (e) {
      setError(e?.message || '加载失败');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const handleCreateNote = async () => {
    const title = prompt('请输入新笔记标题：') || '新笔记';
    const note = await createNote(title, '', Number(id));
    navigate(`/notes/${note.id}`);
  };

  const handleCreateFolder = async () => {
    const name = prompt('请输入新文件夹名称：') || '新文件夹';
    await createFolder(name, Number(id));
    load();
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 900 }}>加载失败</Typography>
        <Typography color="text.secondary" sx={{ mt: 1 }}>{error}</Typography>
        <Button variant="contained" sx={{ mt: 2 }} onClick={load}>重试</Button>
      </Box>
    );
  }

  if (!folder) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 900 }}>文件夹不存在</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ p: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 900 }}>{folder.name}</Typography>
        <Typography variant="caption" color="text.secondary">
          子文件夹 {Array.isArray(folder.children) ? folder.children.length : 0} · 笔记 {Array.isArray(folder.notes) ? folder.notes.length : 0}
        </Typography>
        <Stack direction="row" spacing={1.25} sx={{ mt: 1.5 }}>
          <Button variant="contained" onClick={handleCreateNote}>新建笔记</Button>
          <Button variant="outlined" onClick={handleCreateFolder}>新建文件夹</Button>
        </Stack>
      </Box>

      <Divider sx={{ opacity: 0.25 }} />

      <Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto', p: 2 }}>
        {Array.isArray(folder.children) && folder.children.length > 0 ? (
          <Box>
            <Typography variant="overline" sx={{ color: 'text.secondary' }}>子文件夹</Typography>
            <Stack spacing={1} sx={{ mt: 1 }}>
              {folder.children.map((c) => (
                <Button
                  key={c.id}
                  variant="outlined"
                  startIcon={<FolderOutlined />}
                  sx={{
                    justifyContent: 'flex-start',
                    borderRadius: 3,
                    borderColor: 'rgba(255,255,255,0.10)',
                    backgroundColor: 'rgba(255,255,255,0.03)',
                    '&:hover': { backgroundColor: 'rgba(255,255,255,0.06)' },
                  }}
                  onClick={() => navigate(`/folders/${c.id}`)}
                >
                  {c.name}
                </Button>
              ))}
            </Stack>
          </Box>
        ) : null}

        {Array.isArray(folder.notes) && folder.notes.length > 0 ? (
          <Box sx={{ mt: 2 }}>
            <Typography variant="overline" sx={{ color: 'text.secondary' }}>笔记</Typography>
            <Stack spacing={1} sx={{ mt: 1 }}>
              {folder.notes.map((n) => (
                <Button
                  key={n.id}
                  variant="text"
                  startIcon={<NoteOutlined />}
                  sx={{
                    justifyContent: 'flex-start',
                    borderRadius: 3,
                    backgroundColor: 'rgba(255,255,255,0.02)',
                    '&:hover': { backgroundColor: 'rgba(255,255,255,0.05)' },
                  }}
                  onClick={() => navigate(`/notes/${n.id}`)}
                >
                  {n.title}
                </Button>
              ))}
            </Stack>
          </Box>
        ) : null}

        {(!folder.children || folder.children.length === 0) && (!folder.notes || folder.notes.length === 0) ? (
          <Box sx={{ py: 6, textAlign: 'center' }}>
            <Typography variant="h6" sx={{ fontWeight: 900, opacity: 0.9 }}>空文件夹</Typography>
            <Typography color="text.secondary" sx={{ mt: 1 }}>
              在这里创建子文件夹或新笔记
            </Typography>
            <Stack direction="row" spacing={1.25} sx={{ mt: 2, justifyContent: 'center' }}>
              <Button variant="contained" onClick={handleCreateNote}>新建笔记</Button>
              <Button variant="outlined" onClick={handleCreateFolder}>新建文件夹</Button>
            </Stack>
          </Box>
        ) : null}
      </Box>
    </Box>
  );
};

export default FolderPage;
