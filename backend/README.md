# Backend 快速启动

## 1. 安装依赖

```bash
pip3 install -r requirements.txt
```

## 2. 启动服务

```bash
python3 -m uvicorn app.main:app --reload --port 8000
```

## 2.1 前端页面（React）

在项目根目录另开终端启动前端：

```bash
cd ../frontend
npm install
npm run dev -- --host 127.0.0.1 --port 5500
```

浏览器打开 `http://127.0.0.1:5500`，默认请求后端 `http://127.0.0.1:8000`。

## 3. 可用接口（首版）

- `GET /healthz`
- `POST /api/v1/import/excel`
- `GET /api/v1/import/{import_id}/status`
- `POST /api/v1/companies/search`

## 4. 说明

- 默认数据库：`sqlite:///./app.db`（加急本地可跑）
- 生产切换 PostgreSQL：设置环境变量 `DATABASE_URL`
