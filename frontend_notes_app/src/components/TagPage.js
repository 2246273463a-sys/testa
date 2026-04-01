import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Box, Button, Divider, Stack, Typography } from '@mui/material';
import { useParams } from 'react-router-dom';
import { fetchTags } from '../api';
import { trackEvent } from '../utils/analytics';

const TagPage = () => {
  const params = useParams();
  const tagId = Number(params.id);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tags, setTags] = useState([]);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const data = await fetchTags();
        if (!alive) return;
        setTags(Array.isArray(data) ? data : []);
      } catch (e) {
        if (!alive) return;
        setError('加载标签信息失败。');
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    };
    load();
    const onChanged = () => load();
    window.addEventListener('tags:changed', onChanged);
    return () => {
      alive = false;
      window.removeEventListener('tags:changed', onChanged);
    };
  }, [tagId]);

  const tag = useMemo(() => tags.find((t) => Number(t.id) === tagId) || null, [tagId, tags]);

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ p: 2 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ gap: 1 }}>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="h6" sx={{ fontWeight: 950 }}>
              {tag ? `标签：${tag.name}` : `标签 #${Number.isFinite(tagId) ? tagId : '-'}`}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              中间列表已按此标签筛选
            </Typography>
          </Box>
          <Button
            size="small"
            variant="outlined"
            onClick={() => {
              trackEvent('open_tag_manager_from_tag_page');
              window.dispatchEvent(new CustomEvent('app:openTagManager'));
            }}
          >
            管理标签
          </Button>
        </Stack>
        {error ? <Alert severity="error" sx={{ mt: 1.5 }}>{error}</Alert> : null}
      </Box>

      <Divider sx={{ opacity: 0.25 }} />

      <Box sx={{ p: 2, flex: 1, minHeight: 0, overflowY: 'auto' }}>
        {loading ? (
          <Typography variant="body2" color="text.secondary">
            加载中…
          </Typography>
        ) : tag ? (
          <Stack spacing={1.25}>
            <Typography variant="body2" color="text.secondary">
              颜色：{tag.color || '未设置'}
            </Typography>
            <Box
              sx={{
                width: 36,
                height: 36,
                borderRadius: '12px',
                background: tag.color || 'rgba(255,255,255,0.10)',
                border: '1px solid rgba(255,255,255,0.10)',
              }}
            />
          </Stack>
        ) : (
          <Typography variant="body2" color="text.secondary">
            未找到标签信息
          </Typography>
        )}
      </Box>
    </Box>
  );
};

export default TagPage;
