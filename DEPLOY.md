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
