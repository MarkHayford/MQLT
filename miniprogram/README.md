<div align="center">

# 蒙企链探 — 微信小程序

**uni-app x · Vue 3 · UTS · 学生端**

![uni-app x](https://img.shields.io/badge/uni--app%20x-%E5%BE%AE%E4%BF%A1%E5%B0%8F%E7%A8%8B%E5%BA%8F-2B9939)
![Vue](https://img.shields.io/badge/Vue-3-4FC08D?logo=vuedotjs&logoColor=white)
![UTS](https://img.shields.io/badge/UTS-typed-3178C6)

</div>

> 蒙企链探（MQLT）的学生端微信小程序，位于本 monorepo 的 `miniprogram/` 目录。

## 功能

研学项目浏览与预约、文创商城、资讯、订单 / 发票 / 地址 / 反馈等个人中心能力。

## 目录

```
pages/
├── tabs/           主包 Tab：资讯 / 研学之路 / 我的
├── index/          分包 feed：动态、发帖、资讯详情
├── appointment/    分包 study：详情、预约、路径、结算
├── mine/           分包 user：订单、拼图、发票、地址、反馈
├── products/       分包 mall：文创商城、购物车、确认订单
└── commerce/       分包 driver：司机入口
components/         购物车角标、悬浮 TabBar
utils/              API 客户端与各业务数据服务（*.uts）
static/             图标与静态资源
```

## 运行

1. 用 HBuilderX 打开本目录。
2. 按环境调整 `utils/api-config.uts` 的 `API_BASE_URL`；如服务端公开路径变化，同步 `utils/api-endpoints.uts` 的 `API_PREFIX`。
3. 运行到微信开发者工具或目标平台。

当前接口：在 `utils/api-config.uts` 按环境设置 `API_BASE_URL`（本地示例 `http://127.0.0.1:3000`），`API_PREFIX = /api/v1`。
