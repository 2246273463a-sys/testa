# 公网域名部署（推荐 Docker）

## 前提

- 一台云服务器（Ubuntu/Debian/CentOS 均可）
- 一个域名，并添加 A 记录指向服务器公网 IP
- 服务器已放通 80/443 端口
- 服务器已安装 Docker 与 Docker Compose

## 部署步骤

1) 上传代码到服务器

- 方式 A：git clone
- 方式 B：打包上传并解压

2) 在服务器项目根目录创建环境变量

创建文件 `.env`：

```
NOTES_APP_DOMAIN=your-domain.com
NOTES_APP_ALLOW_ORIGIN_REGEX=^https?://(your-domain\\.com)(:\\d+)?$
```

3) 启动

```
docker compose up -d --build
```

4) 访问

- 浏览器打开 `https://your-domain.com`

## 免费无域名部署（公网 IP + HTTP + 基础认证）

适合“自己用、想省事、不要域名/证书”的场景。注意：这是 HTTP（明文传输），请务必启用基础认证，并尽量不要在公共不可信网络里输入密码。

1) 服务器放通 80 端口（不需要 443）

2) 在服务器项目根目录创建 `.env`：

```
CADDYFILE_PATH=./Caddyfile.ip-basic-auth
NOTES_APP_DOMAIN=:80
NOTES_APP_USER=your-username
NOTES_APP_PASSWORD_HASH=your-bcrypt-hash
```

生成 `NOTES_APP_PASSWORD_HASH`（在服务器执行）：

```
docker run --rm caddy:2.8-alpine caddy hash-password --plaintext "your-password"
```

3) 启动

```
docker compose up -d --build
```

4) 访问

- 浏览器打开 `http://你的服务器公网IP/`
- 浏览器会弹窗要求输入用户名/密码

## 数据持久化

数据库默认保存在 Docker volume `notes_data` 中，不会因为容器重启/升级丢失。

## 结构说明

- Caddy：负责 HTTPS 与路由分发
  - `/api/*` 转发到后端（并自动去掉 `/api` 前缀）
  - 其它路径转发到前端静态站点
- 前端：Nginx 提供 React build 静态文件
- 后端：Uvicorn 提供 FastAPI

## 安全建议（强烈建议至少做一项）

目前后端未做登录鉴权，公网暴露存在风险。建议：

- 只开放给自己：在 Caddy 前面加基础认证，或限制 IP 白名单
- 正式使用：增加登录鉴权（例如 token/session）并对写接口做权限控制

## PythonAnywhere 部署（无需自备服务器）

适合“想要一个网址，手机/电脑/平板都能打开用”的场景。注意：PythonAnywhere 的 Web App 入口是 WSGI，本项目已提供 WSGI 适配文件 [wsgi.py](file:///d:/trae_python/python/backend_notes_app/wsgi.py)。

### 1) 准备代码与前端 build

PythonAnywhere 不提供 Node.js 环境，因此 React 前端需要在你本地先 build，然后把产物上传/同步到 PythonAnywhere。

在本地项目根目录执行：

- 前端打包：进入 `frontend_notes_app`，执行 `npm install` 和 `npm run build`
- 打包完成后会生成 `frontend_notes_app/build/` 目录

### 2) 在 PythonAnywhere 创建 Web App

在 PythonAnywhere 控制台：

- 创建 Web App，选择 “Manual configuration”
- 选择 Python 版本（建议 3.10+）
- 把项目代码放到你的 home 目录下（例如 `/home/youruser/python-notes-app`）

### 3) 安装后端依赖

在 PythonAnywhere 的 Bash console：

- 创建虚拟环境并激活
- 在项目根目录执行安装：

```
pip install -r backend_notes_app/requirements.txt
```

### 4) 配置 WSGI 入口

在 Web App 的 WSGI 配置文件中，确保能够 import 项目代码，并把 `application` 指向本项目提供的 WSGI 入口：

```
from backend_notes_app.wsgi import application
```

### 5) 配置环境变量（强烈建议）

在 Web App 的环境变量里设置：

- `NOTES_APP_DB_PATH=/home/youruser/notes.db`

如果你计划让前端和后端跨域部署（不推荐），还需要设置：

- `NOTES_APP_ALLOW_ORIGIN_REGEX=^https?://(你的前端域名)(:\\d+)?$`

### 6) 让站点能直接打开前端页面（推荐）

后端会自动尝试加载 `frontend_notes_app/build/` 作为静态站点目录，并在 404 时对前端路由做 SPA 回落（刷新子路由不 404）。如果你的 build 目录不在默认位置，可以在环境变量中设置：

- `NOTES_APP_FRONTEND_DIST=/home/youruser/path/to/build`

完成后 Reload Web App，然后访问：

- `https://youruser.pythonanywhere.com/`（前端）
- `https://youruser.pythonanywhere.com/api/docs`（后端接口文档）
