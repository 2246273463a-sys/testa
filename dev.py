import argparse
import os
import socket
import subprocess
import sys
import time
import webbrowser
import shutil


ROOT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.join(ROOT_DIR, "backend_notes_app")
FRONTEND_DIR = os.path.join(ROOT_DIR, "frontend_notes_app")


def wait_tcp_port(host: str, port: int, timeout_s: int) -> bool:
    deadline = time.time() + timeout_s
    while time.time() < deadline:
        try:
            with socket.create_connection((host, port), timeout=0.3):
                return True
        except OSError:
            time.sleep(0.3)
    return False


def run(cmd: list[str], cwd: str | None = None) -> None:
    subprocess.check_call(cmd, cwd=cwd)


def start_process(cmd: list[str], cwd: str | None = None, env: dict[str, str] | None = None) -> subprocess.Popen:
    return subprocess.Popen(cmd, cwd=cwd, env=env)


def resolve_npm() -> str:
    for name in ("npm", "npm.cmd", "npm.exe"):
        p = shutil.which(name)
        if p:
            return p
    raise SystemExit("未找到 npm：请先安装 Node.js，并确保 npm 在 PATH 中。")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--no-install", action="store_true", help="跳过依赖安装")
    parser.add_argument("--no-browser", action="store_true", help="不自动打开浏览器")
    parser.add_argument("--host", default="127.0.0.1", help="监听地址（外网/局域网访问用 0.0.0.0）")
    parser.add_argument("--backend-port", type=int, default=8000, help="后端端口")
    args = parser.parse_args()

    if not os.path.isdir(BACKEND_DIR):
        raise SystemExit(f"未找到后端目录：{BACKEND_DIR}")
    if not os.path.isdir(FRONTEND_DIR):
        raise SystemExit(f"未找到前端目录：{FRONTEND_DIR}")

    python_exe = sys.executable
    if not python_exe:
        raise SystemExit("未找到 Python：请确保 python 可用。")

    if not args.no_install:
        req = os.path.join(BACKEND_DIR, "requirements.txt")
        if os.path.isfile(req):
            run([python_exe, "-m", "pip", "install", "-r", req], cwd=ROOT_DIR)

        node_modules = os.path.join(FRONTEND_DIR, "node_modules")
        if not os.path.isdir(node_modules):
            npm_exe = resolve_npm()
            run([npm_exe, "install"], cwd=FRONTEND_DIR)

    print("正在启动后端（FastAPI）...")
    backend = start_process(
        [
            python_exe,
            "-m",
            "uvicorn",
            "backend_notes_app.main:app",
            "--reload",
            "--reload-dir",
            "backend_notes_app",
            "--host",
            str(args.host),
            "--port",
            str(args.backend_port),
        ],
        cwd=ROOT_DIR,
    )

    print("正在启动前端（React）...")
    npm_exe = resolve_npm()
    frontend_env = os.environ.copy()
    frontend_env["BROWSER"] = "none"
    frontend_env["HOST"] = str(args.host)
    try:
        frontend = start_process([npm_exe, "start"], cwd=FRONTEND_DIR, env=frontend_env)
    except FileNotFoundError:
        backend.terminate()
        raise SystemExit("未找到 npm：请先安装 Node.js，并确保 npm 在 PATH 中。")

    print(f"已启动。后端：http://localhost:{args.backend_port}  前端：http://localhost:3000")

    if not args.no_browser:
        if wait_tcp_port("127.0.0.1", 3000, timeout_s=60):
            try:
                webbrowser.open("http://localhost:3000", new=2)
            except Exception:
                pass

    try:
        while True:
            if backend.poll() is not None or frontend.poll() is not None:
                break
            time.sleep(0.5)
    except KeyboardInterrupt:
        pass
    finally:
        for proc in (frontend, backend):
            if proc.poll() is None:
                try:
                    proc.terminate()
                except Exception:
                    pass
        time.sleep(0.5)
        for proc in (frontend, backend):
            if proc.poll() is None:
                try:
                    proc.kill()
                except Exception:
                    pass

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
