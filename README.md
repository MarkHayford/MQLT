# 蒙企链探 · MQLT

自托管的**企业研学**全栈开源项目：学生端微信小程序、运营控制台、NestJS API、介绍页与积分商城。

面向研学场景的预约、现场导览打卡、任务/积分、内容运营与权限管理，可在自有服务器上一键拉起。

[![NestJS](https://img.shields.io/badge/NestJS-E0234E?logo=nestjs&logoColor=white)](https://nestjs.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Redis](https://img.shields.io/badge/Redis-DC382D?logo=redis&logoColor=white)](https://redis.io/)
[![Vue 3](https://img.shields.io/badge/Vue_3-42b883?logo=vuedotjs&logoColor=white)](https://vuejs.org/)
[![Vite](https://img.shields.io/badge/Vite-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![uni-app x](https://img.shields.io/badge/uni--app_x-WeChat_MP-07C160)](https://uniapp.dcloud.net.cn/)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white)](https://docs.docker.com/compose/)
[![License](https://img.shields.io/badge/License-TBD-lightgrey)](#许可证)

---

## 目录

- [功能特性](#功能特性)
- [架构概览](#架构概览)
- [技术栈](#技术栈)
- [仓库结构](#仓库结构)
- [环境要求](#环境要求)
- [快速开始](#快速开始)
- [配置说明](#配置说明)
- [运行与运维](#运行与运维)
- [构建前端](#构建前端)
- [贡献指南](#贡献指南)
- [安全须知](#安全须知)
- [许可证](#许可证)

## 功能特性

| 模块 | 能力 |
| --- | --- |
| **学生端小程序** | 研学项目浏览与预约、现场导览 / 打卡、任务与积分、商城兑换、社区动态等 |
| **运营控制台** | 订单与预约、企业 / 项目 / 内容审核、商城与财务、角色权限、个人中心 |
| **HTTP API** | NestJS `/api/v1`，JWT 与控制台鉴权，Prisma → PostgreSQL，可选 Redis |
| **介绍页** | 静态站点 `web/`，可挂到本机 nginx 或任意对象存储 / CDN |
| **对象存储** | S3 兼容接口（上传预签名、媒体与控制台静态资源前缀可配置） |

## 架构概览

```text
                    ┌─────────────────┐
   微信小程序 ──────▶│                 │
   运营控制台 ──────▶│  NestJS API     │──── PostgreSQL
   介绍页 / H5 ─────▶│  (/api/v1)      │──── Redis（可选）
                    │                 │──── S3 兼容存储（媒体）
                    └────────┬────────┘
                             │
                    nginx（同源反代 API + 静态）
```

典型自托管拓扑：

1. **Docker Compose**：根目录 `compose.yaml` 启动 PostgreSQL、Redis、API（由 `Dockerfile` 构建）与 nginx。
2. **静态资源**：控制台 `console-web/dist/`、介绍页 `web/` 由 nginx 挂载提供，也可同步到 S3 / CDN（由 `CDN_BASE_URL`、`MEDIA_BASE_URL` 与 Vite `base` 决定）。
3. **API 代码**：业务逻辑已合并进 `backend/dist`（已内置于仓库，无需外部挂载覆盖）。

## 技术栈

| 层级 | 技术 |
| --- | --- |
| 小程序 | uni-app x（UTS）· 微信小程序 |
| 控制台 | Vue 3 · Vite · Element Plus · Leaflet |
| API | NestJS（已编译产物在 `backend/dist`）· Prisma |
| 数据 | PostgreSQL · Redis |
| 对象存储 | 任意 S3 兼容服务（endpoint / bucket / prefix 可配） |
| 编排 | Docker Compose · nginx |

## 仓库结构

```text
backend/            Nest API（package.json + 已编译 dist/）
console-web/        运营台源码（src/）+ 构建产物（dist/）
miniprogram/        学生端微信小程序（uni-app x）
web/                对外介绍页与静态资源
prisma/             Schema 与 migrations
lib/                业务共用库（模板、公告等）
sql/                Prisma 之外的 overlay SQL
docker/             API entrypoint 与 nginx 配置
ci/                 小程序编译 / 上传脚本（不含私钥）
Dockerfile          API 镜像（烘焙 backend/dist，业务已内置）
compose.yaml        PostgreSQL + Redis + API + nginx
.env.example        环境变量模板
```

> 本仓库面向自托管与二次开发，**不包含**真实密钥、生产 `.env` 或私钥。

## 环境要求

- Docker 20+ / Docker Compose v2
- （构建控制台）Node.js 18+
- （编译 / 上传小程序）HBuilderX 或等价 uni-app x 工具链
- （可选）S3 兼容对象存储账号
- （可选）微信小程序 AppID / AppSecret、地图等第三方密钥

## 快速开始

### 1. 获取源码

```bash
git clone https://github.com/MarkHayford/MQLT.git
cd MQLT
```

### 2. 准备环境变量

```bash
cp .env.example .env
```

至少修改：

- `POSTGRES_PASSWORD`
- `JWT_SECRET`
- `ADMIN_TOKEN`

其余项（数据库、Redis、S3、CORS、微信、地图等）按下一节与 `.env.example` 注释填写。

### 3. 启动

```bash
docker compose up -d
```

首次启动默认会跑 Prisma migrate，并可应用 `sql/*.sql` overlay（见 `.env` 中 `MQLT_RUN_MIGRATIONS` / `MQLT_RUN_SQL_OVERLAY`）。

### 4. 健康检查

默认将服务绑在本机 `8080`：

```bash
curl -fsS http://127.0.0.1:8080/api/v1/healthz
```

控制台与介绍页路径见 `docker/nginx.conf`：站点根路径与 `/console/`。

## 配置说明

以 `.env.example` 为准，常见变量：

| 变量 | 说明 |
| --- | --- |
| `HOST` / `PORT` | API 监听地址 |
| `PUBLIC_API_PREFIX` | 对外 API 前缀（默认 `/api/v1`） |
| `POSTGRES_*` / `DATABASE_URL` | PostgreSQL |
| Redis 相关 | 缓存 / 会话辅助 |
| `JWT_SECRET` / `JWT_EXPIRES_IN` | API / 控制台令牌 |
| `ADMIN_TOKEN` | 运维 / 引导用管理令牌 |
| `CORS_ORIGINS` | 允许的前端来源（逗号分隔，填你的站点域名） |
| `CDN_BASE_URL` / `MEDIA_BASE_URL` | 静态与媒体公网前缀（可指向本机或 CDN） |
| `S3_*` | S3 兼容 endpoint、region、bucket、密钥、`S3_KEY_PREFIX` |
| `WECHAT_APP_ID` / `WECHAT_APP_SECRET` | 小程序登录 |
| `AMAP_WEB_SERVICE_KEY` | 地图 Web 服务（若启用） |
| `DEEPSEEK_*` | 可选 AI 能力 |

**切勿**将真实 `.env`、`runtime/*.env`、私钥提交进 Git。

## 运行与运维

```bash
docker compose up -d      # 启动
docker compose logs -f    # 日志
docker compose down       # 停止（保留卷）
```

数据落在 Docker named volumes `pgdata` / `redisdata`。备份时请同时导出数据库与对象存储中的媒体前缀。

API 镜像由根目录 `Dockerfile` 构建；nginx 配置在 `docker/nginx.conf`。

## 构建前端

### 运营控制台

```bash
cd console-web
npm install
npm run build
```

构建前请按部署方式调整 `vite.config.js` 中的 `base`：

- 同源由 nginx 提供静态资源时，可用相对路径（如 `/console/`）
- 静态资源上 CDN / 对象存储时，设为你的公网前缀（末尾带 `/`）

产物在 `console-web/dist/`。入口 HTML 通常由站点 nginx 提供；带 hash 的 JS/CSS 可同步到对象存储。

### 学生端小程序

用 HBuilderX 打开 `miniprogram/`。按环境修改：

- `utils/api-config.uts`（API 根地址等）
- `utils/api-endpoints.uts`（路径常量）

上传用私钥放在 `ci/keys/`，**不要提交**。可参考 `ci/publish.sh`、`ci/upload.mjs`。

### 介绍页

直接部署 `web/` 目录，或按 nginx 示例挂载。无需单独构建步骤。

## 贡献指南

1. Fork 本仓库并创建特性分支
2. 保持密钥与本地 `.env` 在仓库之外
3. 控制台改动请在 `console-web/src` 修改并重新 `npm run build`
4. API 侧以 `backend/dist` 为准；改动请直接更新 dist（或提供可复现的源码构建说明）
5. 提交前自测：`healthz`、登录、关键预约 / 控制台页面
6. 通过 Pull Request 描述动机、测试步骤与截图（如有 UI）

Issue / PR 欢迎中英文。破坏性变更请在标题中标明。

## 安全须知

请勿提交或公开分发：

- `.env`、`runtime/*.env`、`dcloud.env`、`baked.env`
- `ci/keys/*`（私钥）
- S3 / JWT / 数据库 / 微信等生产凭证
- 含真实密钥的 Docker 镜像导出包

本仓库仅包含 `.env.example` 与 `ci/keys/README.md` 等占位说明。发现疑似泄露请立即轮换密钥并开 Issue（勿在公开讨论中粘贴密钥内容）。

## 许可证

许可证待定（TBD）。在正式 `LICENSE` 文件合并前，请联系维护者确认使用范围。

---

维护者：Mark Hayford · 问题反馈请开 [Issues](https://github.com/MarkHayford/MQLT/issues)。
