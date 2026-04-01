const STORAGE_KEY = 'app_analytics_queue_v1';

const safeNow = () => Date.now();

const safeJsonParse = (raw) => {
  try {
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
};

const loadQueue = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const data = safeJsonParse(raw);
    return Array.isArray(data) ? data : [];
  } catch (e) {
    return [];
  }
};

const saveQueue = (q) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(q));
  } catch (e) {}
};

export const trackEvent = (name, props = {}) => {
  const evt = {
    name: String(name || '').trim() || 'unknown',
    ts: safeNow(),
    path: window.location?.pathname || '',
    search: window.location?.search || '',
    ref: document?.referrer || '',
    props: props && typeof props === 'object' ? props : {},
  };

  const next = loadQueue();
  next.push(evt);
  if (next.length > 500) next.splice(0, next.length - 500);
  saveQueue(next);

  try {
    window.dispatchEvent(new CustomEvent('analytics:event', { detail: evt }));
  } catch (e) {}

  if (process.env.NODE_ENV === 'development') {
    try {
      console.debug('[analytics]', evt.name, evt);
    } catch (e) {}
  }

  return evt;
};

export const trackNavigate = (name, to, props = {}) => {
  return trackEvent(name, { ...(props || {}), to: String(to || '') });
};

export const getAnalyticsQueue = () => loadQueue();
