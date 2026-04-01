export function getLineStartIndex(text, lineNumber) {
  const s = String(text || '');
  const n = Math.max(0, Number(lineNumber || 0));
  if (n === 0) return 0;
  let line = 0;
  for (let i = 0; i < s.length; i += 1) {
    if (s[i] === '\n') {
      line += 1;
      if (line === n) return i + 1;
    }
  }
  return s.length;
}

export function parseTodosFromMarkdown(text) {
  const s = String(text || '');
  const lines = s.split(/\r?\n/);
  const items = [];
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const m = line.match(/^\s*[-*]\s+\[( |x|X)\]\s+(.*)$/);
    if (!m) continue;
    items.push({
      line: i,
      checked: String(m[1] || '').toLowerCase() === 'x',
      text: String(m[2] || '').trim(),
    });
  }
  return items;
}

export function toggleTodoAtLine(text, lineNumber, nextChecked) {
  const s = String(text || '');
  const lines = s.split(/\r?\n/);
  const i = Number(lineNumber);
  if (!Number.isFinite(i) || i < 0 || i >= lines.length) return s;
  const raw = lines[i];
  const m = raw.match(/^(\s*[-*]\s+\[)( |x|X)(\]\s+.*)$/);
  if (!m) return s;
  const mark = nextChecked ? 'x' : ' ';
  lines[i] = `${m[1]}${mark}${m[3]}`;
  return lines.join('\n');
}

export function appendTodo(text, todoText) {
  const s = String(text || '');
  const t = String(todoText || '').trim();
  if (!t) return s;
  const line = `- [ ] ${t}`;
  if (!s) return line;
  if (s.endsWith('\n')) return `${s}${line}`;
  return `${s}\n${line}`;
}

export function parseWikiLinks(text) {
  const s = String(text || '');
  const out = [];
  const re = /\[\[([^\]]+?)\]\]/g;
  let m;
  while ((m = re.exec(s))) {
    const raw = String(m[1] || '').trim();
    if (!raw) continue;
    const parts = raw.split('|').map((x) => x.trim()).filter(Boolean);
    const target = parts[0] || '';
    const alias = parts[1] || null;
    if (!target) continue;
    out.push({ target, alias, index: m.index });
  }
  return out;
}
