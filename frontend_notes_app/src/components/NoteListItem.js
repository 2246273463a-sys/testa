import React, { useState } from 'react';
import { Box, Typography, IconButton, Menu, MenuItem } from '@mui/material';
import { NoteOutlined, DeleteOutline } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { deleteNote, updateNote } from '../api';
import Interactive from './Interactive';

const NoteListItem = ({ note, loadFolders, active }) => {
  const navigate = useNavigate();
  const [contextMenu, setContextMenu] = useState(null);
  const isActive = active?.activeNoteId === note.id;

  const handleDelete = async (event) => {
    event.preventDefault();
    event.stopPropagation();
    const confirmDelete = window.confirm(`确定要删除笔记 "${note.title}" 吗？`);
    if (!confirmDelete) return;
    try {
      await deleteNote(note.id);
      if (typeof loadFolders === 'function') {
        loadFolders();
      }
      navigate('/');
    } catch (error) {
      console.error('Error deleting note:', error);
      alert('删除笔记失败！');
    }
  };

  const handleContextMenu = (event) => {
    event.preventDefault();
    event.stopPropagation();
    setContextMenu({ mouseX: event.clientX - 2, mouseY: event.clientY - 4 });
  };

  const handleMenuClose = () => setContextMenu(null);

  const handleRename = async () => {
    handleMenuClose();
    const title = prompt('请输入新的笔记标题：', note.title);
    if (!title || title === note.title) return;
    try {
      await updateNote(note.id, title, note.content ?? '');
      if (typeof loadFolders === 'function') {
        loadFolders();
      }
    } catch (error) {
      console.error('Error renaming note:', error);
      alert('重命名失败！');
    }
  };

  const handleDragStart = (event) => {
    event.dataTransfer.setData('text/plain', `note:${note.id}`);
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <Interactive
      component="div"
      to={`/notes/${note.id}`}
      eventName="nav_sidebar_note"
      eventProps={{ note_id: note.id }}
      onContextMenu={handleContextMenu}
      draggable
      onDragStart={handleDragStart}
      className="interactive-card"
      sx={{
        pl: 2,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderRadius: '12px',
        px: 0.75,
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
                'linear-gradient(90deg, rgba(56,189,248,0.14), rgba(24,144,255,0.08), rgba(255,255,255,0))',
            }
          : {}),
        '& .note-actions': {
          opacity: 0,
          transform: 'translateX(4px)',
          transition: 'opacity 140ms ease, transform 140ms ease',
        },
        '&:hover .note-actions': {
          opacity: 1,
          transform: 'translateX(0px)',
        },
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', minWidth: 0 }}>
        <Box
          sx={{
            width: 28,
            height: 28,
            borderRadius: 2,
            display: 'grid',
            placeItems: 'center',
            mr: 1,
            border: '1px solid rgba(255,255,255,0.10)',
            backgroundImage: 'linear-gradient(135deg, rgba(var(--accent-rgb) / 0.18), rgba(56,189,248,0.10))',
            boxShadow: '0 10px 22px rgba(var(--accent-rgb) / 0.10)',
          }}
        >
          <NoteOutlined fontSize="small" />
        </Box>
        <Typography
          variant="body2"
          sx={{ fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
        >
          {note.title}
        </Typography>
      </Box>
      <IconButton className="note-actions" size="small" onClick={handleDelete} aria-label="delete note">
        <DeleteOutline fontSize="small" />
      </IconButton>
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
        <MenuItem onClick={handleRename}>重命名</MenuItem>
        <MenuItem onClick={handleDelete} sx={{ color: 'error.main' }}>删除</MenuItem>
      </Menu>
    </Interactive>
  );
};

export default NoteListItem;
