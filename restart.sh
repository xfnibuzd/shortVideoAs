#!/usr/bin/env bash
# 一键重启前后端开发服务
# 用法:
#   ./restart.sh          重启前后端
#   ./restart.sh server   仅重启后端
#   ./restart.sh web      仅重启前端
#   ./restart.sh stop     停止前后端

set -e
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_DIR="$ROOT/.logs"
mkdir -p "$LOG_DIR"

stop_server() {
  echo "停止后端…"
  pkill -f "node src/index.js" 2>/dev/null || true
}

stop_web() {
  echo "停止前端…"
  # 仅杀掉本项目 web 目录下的 vite 进程
  pkill -f "$ROOT/web/node_modules/.bin/vite" 2>/dev/null || true
  pkill -f "vite" 2>/dev/null || true
}

start_server() {
  echo "启动后端 (http://localhost:3000)…"
  (cd "$ROOT/server" && nohup node src/index.js > "$LOG_DIR/server.log" 2>&1 &)
  sleep 1
}

start_web() {
  echo "启动前端 (http://localhost:5173)…"
  (cd "$ROOT/web" && nohup npm run dev > "$LOG_DIR/web.log" 2>&1 &)
  sleep 1
}

case "${1:-all}" in
  server)
    stop_server; start_server ;;
  web)
    stop_web; start_web ;;
  stop)
    stop_server; stop_web; echo "已停止。" ;;
  all|"")
    stop_server; stop_web
    start_server; start_web ;;
  *)
    echo "未知参数: $1"; echo "用法: ./restart.sh [server|web|stop]"; exit 1 ;;
esac

if [ "${1:-all}" != "stop" ]; then
  echo "----------------------------------------"
  echo "后端: http://localhost:3000   日志: .logs/server.log"
  echo "前端: http://localhost:5173   日志: .logs/web.log"
  echo "查看日志: tail -f .logs/server.log  或  tail -f .logs/web.log"
fi
