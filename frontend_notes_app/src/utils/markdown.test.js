import { appendTodo, getLineStartIndex, parseTodosFromMarkdown, parseWikiLinks, toggleTodoAtLine } from './markdown';

test('getLineStartIndex returns 0 for first line', () => {
  expect(getLineStartIndex('a\nb\nc', 0)).toBe(0);
});

test('getLineStartIndex returns correct index for later lines', () => {
  expect(getLineStartIndex('a\nb\nc', 1)).toBe(2);
  expect(getLineStartIndex('a\nb\nc', 2)).toBe(4);
});

test('parseTodosFromMarkdown finds task list items', () => {
  const md = ['- [ ] one', '- [x] two', 'not todo', '  - [X] three'].join('\n');
  const items = parseTodosFromMarkdown(md);
  expect(items).toEqual([
    { line: 0, checked: false, text: 'one' },
    { line: 1, checked: true, text: 'two' },
    { line: 3, checked: true, text: 'three' },
  ]);
});

test('toggleTodoAtLine updates checkbox at line', () => {
  const md = ['- [ ] one', '- [x] two'].join('\n');
  expect(toggleTodoAtLine(md, 0, true)).toBe(['- [x] one', '- [x] two'].join('\n'));
  expect(toggleTodoAtLine(md, 1, false)).toBe(['- [ ] one', '- [ ] two'].join('\n'));
});

test('appendTodo appends a new unchecked todo', () => {
  expect(appendTodo('', 'buy milk')).toBe('- [ ] buy milk');
  expect(appendTodo('a', 'b')).toBe('a\n- [ ] b');
  expect(appendTodo('a\n', 'b')).toBe('a\n- [ ] b');
});

test('parseWikiLinks finds [[title]] and [[title|alias]]', () => {
  const md = 'see [[Alpha]] and [[Beta|B]] and [[  Gamma  ]]';
  const links = parseWikiLinks(md);
  expect(links.map((x) => ({ target: x.target, alias: x.alias }))).toEqual([
    { target: 'Alpha', alias: null },
    { target: 'Beta', alias: 'B' },
    { target: 'Gamma', alias: null },
  ]);
});
