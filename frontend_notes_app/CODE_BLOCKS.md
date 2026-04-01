# 代码块使用说明（Markdown）

本项目的笔记内容支持 Markdown，并对代码块提供语法高亮与一键复制。

## 1）最常用：围栏代码块

格式如下（三个反引号）：

```
```语言
你的代码
```
```

示例：

```markdown
```python
def hello(name: str) -> str:
    return f"hello {name}"
```
```

你也可以不写语言：

```markdown
```
echo "hello"
```
```

## 2）语言标识怎么写

常见可用写法（示例，不限于这些）：

- `javascript` / `js`
- `typescript` / `ts`
- `python` / `py`
- `json`
- `bash` / `sh`
- `sql`
- `html`
- `css`
- `yaml`

说明：
- 代码块高亮由 highlight.js 自动识别或按语言标识渲染。
- 如果语言没被识别，也不会报错，只是显示为普通代码样式。

## 3）编辑器里快速插入代码块

在笔记编辑页右上方工具栏点击：

- “插入代码块”按钮

它会提示你输入语言（例如 `python`），然后自动插入标准围栏代码块模板。

## 4）代码块复制

预览区每个代码块右上角有：

- 语言标签（如果你写了语言）
- “复制代码”按钮

点击即可复制代码内容到剪贴板。

## 5）行内代码

单行少量代码，用反引号包起来：

```markdown
使用 `pip install -r requirements.txt` 安装依赖
```

## 6）常见 Markdown 语法（顺手好用）

任务列表：

```markdown
- [ ] TODO
- [x] Done
```

表格：

```markdown
| 字段 | 说明 |
| --- | --- |
| title | 标题 |
| content | 内容 |
```

