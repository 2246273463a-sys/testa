# 笔记应用（FastAPI + React）

## 一键启动（推荐）

Windows：

- 直接双击运行 `dev.bat`（会自动打开浏览器）
- 或在仓库根目录执行 `python dev.py`

常用参数：

- 跳过安装依赖：`./dev.ps1 -NoInstall`
- 不自动打开浏览器：`./dev.ps1 -NoBrowser`
- 指定后端端口：`./dev.ps1 -BackendPort 8001`

Python 版本参数（同等效果）：

- 跳过安装依赖：`python dev.py --no-install`
- 不自动打开浏览器：`python dev.py --no-browser`
- 指定后端端口：`python dev.py --backend-port 8001`

## 目录结构

- [backend_notes_app](file:///d:/trae_python/python/backend_notes_app)：FastAPI 后端（SQLite + SQLAlchemy）
- [frontend_notes_app](file:///d:/trae_python/python/frontend_notes_app)：React 前端（CRA + MUI）

## 启动后端

```bash
python -m pip install -r backend_notes_app/requirements.txt
python -m uvicorn backend_notes_app.main:app --reload --port 8000
```

- API 文档：http://127.0.0.1:8000/docs
- 数据库文件：backend_notes_app/notes.db
- 搜索接口：GET /search?query=关键词（基于 SQLite FTS5）

## 启动前端

```bash
cd frontend_notes_app
npm install
npm start
```

- 前端地址：http://localhost:3000
- 默认后端地址：http://localhost:8000（见 [api.js](file:///d:/trae_python/python/frontend_notes_app/src/api.js)）
- 代码块使用说明：[CODE_BLOCKS.md](file:///d:/trae_python/python/frontend_notes_app/CODE_BLOCKS.md)
