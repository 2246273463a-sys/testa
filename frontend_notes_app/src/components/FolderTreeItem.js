import React, { useEffect, useMemo, useState } from 'react';
import { Box, Typography, IconButton, Collapse, Menu, MenuItem, Chip } from '@mui/material';
import { FolderOutlined, FolderOpenOutlined, MoreVert } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { createFolder, createNote, deleteFolder, moveNote, updateFolder } from '../api';
import NoteListItem from './NoteListItem';
import Interactive from './Interactive';

const FolderTreeItem = ({ item, loadFolders, active, openVersion }) => {
  const [open, setOpen] = useState(() => {
    try {
      return localStorage.getItem(`folder_open_${item.id}`) === 'true';
    } catch (e) {
      return false;
    }
  });
  const [contextMenu, setContextMenu] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    try {
      const v = localStorage.getItem(`folder_open_${item.id}`);
      if (v === 'true' || v === 'false') {
        setOpen(v === 'true');
      }
    } catch (e) {}
  }, [item.id, openVersion]);

  const counts = useMemo(() => {
    const foldersCount = Array.isArray(item.children) ? item.children.length : 0;
    const notesCount = Array.isArray(item.notes) ? item.notes.length : 0;
    return { foldersCount, notesCount, total: foldersCount + notesCount };
  }, [item.children, item.notes]);

  const handleToggle = () => {
    const next = !open;
    setOpen(next);
    try {
      localStorage.setItem(`folder_open_${item.id}`, next ? 'true' : 'false');
    } catch (e) {}
  };

  const handleMenuClick = (event) => {
    event.preventDefault();
    event.stopPropagation();
    setContextMenu(
      contextMenu === null
        ? { mouseX: event.clientX - 2, mouseY: event.clientY - 4 }
        : null
    );
  };

  const handleContextMenu = (event) => {
    event.preventDefault();
    event.stopPropagation();
    setContextMenu({ mouseX: event.clientX - 2, mouseY: event.clientY - 4 });
  };

  const handleMenuClose = () => {
    setContextMenu(null);
  };

  const handleCreateNote = async () => {
    handleMenuClose();
    try {
      const title = prompt('请输入新笔记标题：') || '新笔记';
      const newNote = await createNote(title, "", item.id);
      loadFolders();
      navigate(`/notes/${newNote.id}`);
    } catch (error) {
      console.error("Error creating note:", error);
      alert("创建笔记失败！");
    }
  };

  const handleCreateFolder = async () => {
    handleMenuClose();
    try {
      const name = prompt('请输入新文件夹名称：') || '新文件夹';
      await createFolder(name, item.id);
      loadFolders();
    } catch (error) {
      console.error("Error creating folder:", error);
      alert("创建文件夹失败！");
    }
  };

  const handleRename = async () => {
    handleMenuClose();
    const name = prompt('请输入新的文件夹名称：', item.name);
    if (!name || name === item.name) return;
    try {
      await updateFolder(item.id, { name });
      loadFolders();
    } catch (error) {
      console.error('Error renaming folder:', error);
      alert('重命名失败！');
    }
  };

  const handleDeleteItem = async () => {
    handleMenuClose();
    const confirmDelete = window.confirm(`确定要删除 ${item.name} 吗？`);
    if (!confirmDelete) return;

    try {
      await deleteFolder(item.id);
      loadFolders();
      navigate('/'); // 删除后导航回主页
    } catch (error) {
      console.error(`Error deleting folder:`, error);
      alert(`删除文件夹失败！`);
    }
  };

  const handleDragStart = (event) => {
    event.dataTransfer.setData('text/plain', `folder:${item.id}`);
    event.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    setDragOver(true);
  };

  const handleDragLeave = () => setDragOver(false);

  const handleDrop = async (event) => {
    event.preventDefault();
    setDragOver(false);
    const raw = event.dataTransfer.getData('text/plain');
    if (!raw) return;
    const [kind, id] = raw.split(':');
    const draggedId = Number(id);
    try {
      if (kind === 'folder') {
        if (!draggedId || draggedId === item.id) return;
        await updateFolder(draggedId, { parent_id: item.id });
      } else if (kind === 'note') {
        if (!draggedId) return;
        await moveNote(draggedId, item.id);
      } else {
        return;
      }
      loadFolders();
      setOpen(true);
      try {
        localStorage.setItem(`folder_open_${item.id}`, 'true');
      } catch (e) {}
    } catch (error) {
      console.error('Error moving item:', error);
      alert('移动失败！');
    }
  };

  const isActive = active?.activeFolderId === item.id;

  return (
    <Box sx={{ pl: 2 }}>
      <Interactive
        component="div"
        className="interactive-card"
        to={`/folders/${item.id}`}
        eventName="nav_sidebar_folder"
        eventProps={{ folder_id: item.id }}
        draggable
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onContextMenu={handleContextMenu}
        sx={{
          ml: '-16px',
          width: 'calc(100% + 16px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderRadius: '12px',
          pr: 0.75,
          pl: '22px',
          py: 0.5,
          border: '1px solid rgba(255,255,255,0.10)',
          boxShadow: '0 10px 26px rgba(0,0,0,0.10)',
          '&:hover': {
            borderColor: 'rgba(var(--accent-rgb) / 0.28)',
            boxShadow: '0 0 0 1px rgba(var(--accent-rgb) / 0.16), 0 16px 38px rgba(0,0,0,0.18)',
          },
          ...(isActive
            ? {
                backgroundImage:
                  'linear-gradient(90deg, rgba(24,144,255,0.16), rgba(255,255,255,0.00))',
              }
            : {}),
          ...(dragOver
            ? {
                outline: '2px dashed rgba(24,144,255,0.55)',
                outlineOffset: 3,
              }
            : {}),
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', minWidth: 0 }}>
          <IconButton
            size="small"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleToggle();
            }}
            aria-label={open ? 'collapse folder' : 'expand folder'}
            sx={{
              mr: 0.75,
              width: 32,
              height: 32,
              borderRadius: 2,
              border: '1px solid rgba(255,255,255,0.10)',
              backgroundImage:
                'linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))',
              boxShadow: '0 10px 24px rgba(var(--accent-rgb) / 0.08)',
              '&:hover': {
                borderColor: 'rgba(var(--accent-rgb) / 0.28)',
                boxShadow: '0 10px 28px rgba(var(--accent-rgb) / 0.16)',
              },
            }}
          >
            {open ? <FolderOpenOutlined fontSize="small" /> : <FolderOutlined fontSize="small" />}
          </IconButton>
          <Typography variant="body2" sx={{ fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {item.name}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          {counts.total > 0 ? <Chip size="small" label={String(counts.total)} sx={{ opacity: 0.75 }} /> : null}
          <IconButton
            size="small"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleMenuClick(e);
            }}
            aria-label="folder actions"
          >
            <MoreVert />
          </IconButton>
        </Box>
        <Menu
          open={contextMenu !== null}
          onClose={handleMenuClose}
          anchorReference="anchorPosition"
          anchorPosition={
            contextMenu !== null
              ? { top: contextMenu.mouseY, left: contextMenu.mouseX }
              : undefined
          }
        >
          <MenuItem onClick={handleCreateNote}>新建笔记</MenuItem>
          <MenuItem onClick={handleCreateFolder}>新建文件夹</MenuItem>
          <MenuItem onClick={handleRename}>重命名</MenuItem>
          <MenuItem onClick={handleDeleteItem} sx={{ color: 'error.main' }}>删除</MenuItem>
        </Menu>
      </Interactive>
      <Collapse in={open} timeout="auto" unmountOnExit>
        <Box sx={{ pl: 2 }}>
          {Array.isArray(item.notes) &&
            item.notes.map((note) => (
              <NoteListItem key={note.id} note={note} loadFolders={loadFolders} active={active} />
            ))}
          {Array.isArray(item.children) &&
            item.children.map((child) => (
              <FolderTreeItem key={child.id} item={child} loadFolders={loadFolders} active={active} openVersion={openVersion} />
            ))}
        </Box>
      </Collapse>
    </Box>
  );
};

export default FolderTreeItem;
