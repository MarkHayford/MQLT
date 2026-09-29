    export const flattenMenus = (list) => {
      const out = []
      const rows = list || []
      for (let i = 0; i < rows.length; i++) {
        if (rows[i].children && rows[i].children.length) {
          for (let j = 0; j < rows[i].children.length; j++) out.push(rows[i].children[j])
        } else out.push(rows[i])
      }
      return out
    }
    export const MP_MENUS = [
      { key: "overview", label: "平台总览" },
{ key: "users", label: "用户管理" },
{ key: "enterprises", label: "入驻企业" },
{ key: "project-review", label: "项目审批" },
{ key: "money", label: "平台账务", children: [
        { key: "finance", label: "平台财务" },
        { key: "invoices", label: "电子发票" },
        { key: "withdraw-review", label: "提现审批" },
        { key: "commission", label: "平台抽成" }
      ]},
{ key: "logs", label: "平台操作日志" },
{ key: "fleet", label: "租车调度", children: [
        { key: "rental-orders", label: "租车订单" },
        { key: "drivers", label: "司机档案" },
      ]},
{ key: "media", label: "资讯文章", children: [
        { key: "posts-overview", label: "资讯总览" },
        { key: "posts-dynamics", label: "项目动态" },
        { key: "posts-publish", label: "资讯发布" },
        { key: "posts-review", label: "资讯审批" },
        { key: "posts-cats", label: "资讯分类" },
        { key: "posts-units", label: "发布单位" }
      ]},
{ key: "mp-staff", label: "平台职位", children: [
        { key: "mp-roles", label: "自定义职位" },
        { key: "mp-users", label: "用户创建" }
      ]},
{ key: "feedback", label: "反馈与建议" },
{ key: "splash-announce", label: "开屏公告" },
{ key: "settings", label: "系统设置" },
{ key: "personal", label: "个人中心" }
    ]
    export const ENT_MENUS = [
      { key: "home", label: "企业总览" },
{ key: "study-group", label: "企业项目", children: [
        { key: "projects", label: "项目列表" },
        { key: "project-submit", label: "上架项目" }
      ]},
{ key: "notices", label: "企业资讯" },
{ key: "staff", label: "企业职位", children: [
        { key: "staff-roles", label: "自定义职位" },
        { key: "staff-users", label: "用户创建" }
      ]},
{ key: "ent-money", label: "企业财务", children: [
        { key: "finance", label: "企业流水" },
        { key: "invoices", label: "电子发票" },
        { key: "finance-withdraw", label: "提现申请" }
      ]},
{ key: "logs", label: "企业操作日志" },
{ key: "ent-archive", label: "企业档案", opsOnly: true },
{ key: "personal", label: "个人中心" }
    ]
    export const PROJ_MENUS = [
      { key: "proj-home", label: "项目总览" },
      { key: "proj-live", label: "研学 Live" },
      { key: "proj-edit", label: "项目编辑" },
      { key: "notices", label: "项目资讯" },
      { key: "dynamics", label: "项目动态" },
      { key: "bookings", label: "项目预约" },
      { key: "mall", label: "项目商品" },
      { key: "mall-orders", label: "项目订单" },
      { key: "logs", label: "项目操作日志" },
      { key: "personal", label: "个人中心" }
    ]
    export const MERCHANT_MENUS = ENT_MENUS.filter((m) => !m.opsOnly)
    export const ENT_PAGE_KEYS = ["home", "proj-home", "proj-live", "proj-edit", "projects", "project-submit", "notices", "dynamics", "bookings", "mall", "mall-orders", "finance", "invoices", "finance-withdraw", "staff", "staff-roles", "staff-users", "logs"]
    export const ENT_PAGE_PERMS = {
      home: ["overview.read"],
      "proj-home": ["overview.read", "study.read", "study.projects", "project.live", "project.edit"],
      "proj-live": ["project.live", "project.live.read", "project.live.write", "orders.bookings", "orders.read", "orders.manage", "study.read", "overview.read"],
      "proj-edit": ["project.edit", "study.manage", "study.projects", "study.read"],
      projects: ["study.projects", "study.read", "study.manage"],
      "project-submit": ["study.submit", "study.manage"],
      notices: ["study.notices", "study.read", "study.manage"],
      dynamics: ["study.notices", "study.read", "study.manage"],
      bookings: ["project.bookings", "orders.bookings", "orders.read", "orders.manage"],
      mall: ["project.mall", "mall.read", "mall.manage"],
      "mall-orders": ["project.mall", "mall.orders", "orders.read", "orders.manage"],
      finance: ["finance.read", "orders.read", "orders.manage"],
      invoices: ["invoice.read", "invoice.manage", "finance.read"],
      "finance-withdraw": ["finance.withdraw", "orders.manage"],
      staff: ["staff.manage"],
      "staff-roles": ["staff.manage"],
      "staff-users": ["staff.manage"],
      logs: ["logs.read", "overview.read"],
      personal: ["overview.read"]
    }
    export const PROJ_AFFAIR_PAGE_CAPS = {
      "proj-live": ["project.live", "project.live.read", "project.live.write"],
      bookings: ["project.bookings"],
      mall: ["project.mall"],
      "mall-orders": ["project.mall"],
      "proj-edit": ["project.edit"],
      "proj-home": ["project.live", "project.edit", "project.bookings", "overview.read", "study.read"]
    }
    export const CONTACT_ROLE_OPTIONS = [
      { value: "总负责人", label: "总负责人" },
      { value: "现场负责人", label: "现场负责人" },
      { value: "讲解带队", label: "讲解带队" },
      { value: "企业对接人", label: "企业对接人" }
    ]
    export const CONTACT_ROLE_DEFAULT_CAPS = {
      "总负责人": ["project.live","project.live.read","project.live.write","project.bookings","project.checkin","project.cert","project.mall","project.resources","project.edit","project.owners"],
      "现场负责人": ["project.live","project.live.read","project.live.write","project.bookings","project.checkin"],
      "讲解带队": ["project.live","project.live.read","project.checkin"],
      "企业对接人": []
    }
    export const MP_PAGE_PERMS = {
      overview: ["overview.read"],
      users: ["users.read", "users.manage"],
      enterprises: ["study.enterprises", "study.read", "study.manage"],
      "project-review": ["study.review", "study.manage"],
      finance: ["finance.read", "orders.read", "orders.manage"],
      invoices: ["invoice.read", "invoice.manage", "finance.read"],
      "withdraw-review": ["finance.withdraw", "orders.manage"],
      commission: ["finance.commission", "orders.manage"],
      drivers: ["fleet.drivers"],
      "rental-orders": ["fleet.drivers", "fleet.jobs"],
      "posts-overview": ["media.read", "media.publish", "media.review"],
      "posts-dynamics": ["media.read", "media.publish", "media.review"],
      "posts-publish": ["media.publish", "media.read"],
      "posts-review": ["media.review", "media.read"],
      "posts-cats": ["media.cats", "media.read"],
      "posts-units": ["media.cats", "media.read", "media.publish"],
      "mp-roles": ["access.manage"],
      "mp-users": ["access.manage"],
      "mp-staff": ["access.manage"],
      logs: ["logs.read", "overview.read"],
      feedback: ["feedback.read", "feedback.manage"],
      "splash-announce": ["settings.manage", "access.manage"],
      settings: ["settings.manage", "access.manage"],
      personal: ["overview.read"]
    }
    export const SIDE_ICONS = {
      overview: '<svg viewBox="0 0 24 24" fill="none"><rect x="3.5" y="3.5" width="7.5" height="7.5" rx="1.6" stroke="currentColor" stroke-width="1.7"/><rect x="13" y="3.5" width="7.5" height="7.5" rx="1.6" stroke="currentColor" stroke-width="1.7"/><rect x="3.5" y="13" width="7.5" height="7.5" rx="1.6" stroke="currentColor" stroke-width="1.7"/><rect x="13" y="13" width="7.5" height="7.5" rx="1.6" stroke="currentColor" stroke-width="1.7"/></svg>',
      home: '<svg viewBox="0 0 24 24" fill="none"><path d="M4 11.2 12 4.5l8 6.7V20a1 1 0 0 1-1 1h-5.2v-6.2H10.2V21H5a1 1 0 0 1-1-1v-8.8Z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/></svg>',
      enterprises: '<svg viewBox="0 0 24 24" fill="none"><path d="M5 20.5V6.8L12 3.6l7 3.2v13.7" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="M9.2 20.5v-5.6h5.6v5.6M9.5 9.2h.02M12 9.2h.02M14.5 9.2h.02M9.5 12.2h.02M14.5 12.2h.02" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
      profile: '<svg viewBox="0 0 24 24" fill="none"><path d="M5 20.5V6.8L12 3.6l7 3.2v13.7" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="M9.2 20.5v-5.6h5.6v5.6M9.5 9.2h.02M12 9.2h.02M14.5 9.2h.02M9.5 12.2h.02M14.5 12.2h.02" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
      "ent-archive": '<svg viewBox="0 0 24 24" fill="none"><path d="M5 20.5V6.8L12 3.6l7 3.2v13.7" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="M9.2 20.5v-5.6h5.6v5.6M9.5 9.2h.02M12 9.2h.02M14.5 9.2h.02M9.5 12.2h.02M14.5 12.2h.02" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
      personal: '<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="8" r="3.2" stroke="currentColor" stroke-width="1.7"/><path d="M5.2 18.5c.8-3 3.4-4.7 6.8-4.7s6 1.7 6.8 4.7" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/><circle cx="12" cy="12" r="9.2" stroke="currentColor" stroke-width="1.7"/></svg>',
      users: '<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="8" r="3.2" stroke="currentColor" stroke-width="1.7"/><path d="M5.2 18.5c.8-3 3.4-4.7 6.8-4.7s6 1.7 6.8 4.7" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>',
      logs: '<svg viewBox="0 0 24 24" fill="none"><rect x="5" y="3.5" width="14" height="17" rx="2" stroke="currentColor" stroke-width="1.7"/><path d="M8.5 8h7M8.5 12h7M8.5 16h4.5" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>',
      projects: '<svg viewBox="0 0 24 24" fill="none"><rect x="3.5" y="6" width="17" height="12.5" rx="2" stroke="currentColor" stroke-width="1.7"/><path d="M3.5 10h17" stroke="currentColor" stroke-width="1.7"/><circle cx="8" cy="10" r="1" fill="currentColor"/><circle cx="16" cy="10" r="1" fill="currentColor"/><path d="M8 14.5h5" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>',
      bookings: '<svg viewBox="0 0 24 24" fill="none"><rect x="4" y="5" width="16" height="15" rx="2" stroke="currentColor" stroke-width="1.7"/><path d="M4 9.5h16M8 3.5v3M16 3.5v3" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/><path d="M8.5 13.5l2.2 2.2 4.8-5" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>',
      drivers: '<svg viewBox="0 0 24 24" fill="none"><path d="M4.5 16.5h15l.8-4.2c.1-.6-.3-1.3-1-1.3H4.7c-.7 0-1.1.7-1 1.3l.8 4.2Z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="M6.2 11 8 7.2A1.5 1.5 0 0 1 9.3 6.4h5.4A1.5 1.5 0 0 1 16 7.2l1.8 3.8" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><circle cx="7.5" cy="16.5" r="1.6" stroke="currentColor" stroke-width="1.7"/><circle cx="16.5" cy="16.5" r="1.6" stroke="currentColor" stroke-width="1.7"/></svg>',
      "rental-orders": '<svg viewBox="0 0 24 24" fill="none"><path d="M4.5 16.5h15l.8-4.2c.1-.6-.3-1.3-1-1.3H4.7c-.7 0-1.1.7-1 1.3l.8 4.2Z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="M6.2 11 8 7.2A1.5 1.5 0 0 1 9.3 6.4h5.4A1.5 1.5 0 0 1 16 7.2l1.8 3.8" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><circle cx="7.5" cy="16.5" r="1.6" stroke="currentColor" stroke-width="1.7"/><circle cx="16.5" cy="16.5" r="1.6" stroke="currentColor" stroke-width="1.7"/></svg>',
      mall: '<svg viewBox="0 0 24 24" fill="none"><path d="M7 8.5h10l.8 10.2a1.6 1.6 0 0 1-1.6 1.8H7.8a1.6 1.6 0 0 1-1.6-1.8L7 8.5Z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="M9 8.5V7.2A3 3 0 0 1 12 4.2 3 3 0 0 1 15 7.2v1.3" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>',
      "mall-orders": '<svg viewBox="0 0 24 24" fill="none"><path d="M7 7.5h10l1.2 12.2A1.6 1.6 0 0 1 16.6 21H7.4a1.6 1.6 0 0 1-1.6-1.3L7 7.5Z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="M9 7.5V6.2A3 3 0 0 1 12 3.2 3 3 0 0 1 15 6.2v1.3M9.5 12.5h5M9.5 16h3.5" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>',
      content: '<svg viewBox="0 0 24 24" fill="none"><path d="M7 4.5h7.2L19.5 9v10.5A1.5 1.5 0 0 1 18 21H7a1.5 1.5 0 0 1-1.5-1.5v-14A1.5 1.5 0 0 1 7 4.5Z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="M14 4.5V9h5" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="M8.5 13h7M8.5 16.5h5" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>',
      notices: '<svg viewBox="0 0 24 24" fill="none"><path d="M7 4.5h7.2L19.5 9v10.5A1.5 1.5 0 0 1 18 21H7a1.5 1.5 0 0 1-1.5-1.5v-14A1.5 1.5 0 0 1 7 4.5Z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="M14 4.5V9h5" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="M8.5 13h7M8.5 16.5h5" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>',
      dynamics: '<svg viewBox="0 0 24 24" fill="none"><path d="M7 4.5h7.2L19.5 9v10.5A1.5 1.5 0 0 1 18 21H7a1.5 1.5 0 0 1-1.5-1.5v-14A1.5 1.5 0 0 1 7 4.5Z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="M14 4.5V9h5" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="M8.5 13h7M8.5 16.5h5" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>',
      "posts-dynamics": '<svg viewBox="0 0 24 24" fill="none"><path d="M7 4.5h7.2L19.5 9v10.5A1.5 1.5 0 0 1 18 21H7a1.5 1.5 0 0 1-1.5-1.5v-14A1.5 1.5 0 0 1 7 4.5Z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="M14 4.5V9h5" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="M8.5 13h7M8.5 16.5h5" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>',
      posts: '<svg viewBox="0 0 24 24" fill="none"><path d="M7 4.5h7.2L19.5 9v10.5A1.5 1.5 0 0 1 18 21H7a1.5 1.5 0 0 1-1.5-1.5v-14A1.5 1.5 0 0 1 7 4.5Z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="M14 4.5V9h5" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="M8.5 13h7M8.5 16.5h5" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>',
      media: '<svg viewBox="0 0 24 24" fill="none"><path d="M7 4.5h7.2L19.5 9v10.5A1.5 1.5 0 0 1 18 21H7a1.5 1.5 0 0 1-1.5-1.5v-14A1.5 1.5 0 0 1 7 4.5Z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="M14 4.5V9h5" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="M8.5 13h7M8.5 16.5h5" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>',
      "splash-announce": '<svg viewBox="0 0 24 24" fill="none"><path d="M5 10v4h2.2L12 18V6L7.2 10H5Z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="M15 9.2a3.2 3.2 0 0 1 0 5.6M17.2 7.4a5.6 5.6 0 0 1 0 9.2" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>',
      settings: '<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="1.7"/><path d="M12 4.2v1.8M12 18v1.8M4.2 12h1.8M18 12h1.8M6.4 6.4l1.3 1.3M16.3 16.3l1.3 1.3M17.6 6.4l-1.3 1.3M7.7 16.3l-1.3 1.3" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>',
      finance: '<svg viewBox="0 0 24 24" fill="none"><path d="M5 7.5h14v11.2A1.8 1.8 0 0 1 17.2 20.5H6.8A1.8 1.8 0 0 1 5 18.7V7.5Z" stroke="currentColor" stroke-width="1.7"/><path d="M8 7.5V5.8A4 4 0 0 1 12 3.5 4 4 0 0 1 16 5.8V7.5M12 11.5v5M9.8 13.2h4.4" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>',
      money: '<svg viewBox="0 0 24 24" fill="none"><path d="M5 7.5h14v11.2A1.8 1.8 0 0 1 17.2 20.5H6.8A1.8 1.8 0 0 1 5 18.7V7.5Z" stroke="currentColor" stroke-width="1.7"/><path d="M8 7.5V5.8A4 4 0 0 1 12 3.5 4 4 0 0 1 16 5.8V7.5M12 11.5v5M9.8 13.2h4.4" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>',
      fleet: '<svg viewBox="0 0 24 24" fill="none"><path d="M4.5 16.5h15l.8-4.2c.1-.6-.3-1.3-1-1.3H4.7c-.7 0-1.1.7-1 1.3l.8 4.2Z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="M6.2 11 8 7.2A1.5 1.5 0 0 1 9.3 6.4h5.4A1.5 1.5 0 0 1 16 7.2l1.8 3.8" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><circle cx="7.5" cy="16.5" r="1.6" stroke="currentColor" stroke-width="1.7"/><circle cx="16.5" cy="16.5" r="1.6" stroke="currentColor" stroke-width="1.7"/></svg>',
      commission: '<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="8.2" stroke="currentColor" stroke-width="1.7"/><path d="M12 7.2v9.6M9.4 9.2h3.4c1.3 0 2.2.7 2.2 1.8s-.9 1.8-2.2 1.8H9.8h3.2c1.4 0 2.4.7 2.4 1.9s-1 1.9-2.4 1.9H9.4" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>',
      home: '<svg viewBox="0 0 24 24" fill="none"><path d="M4.5 10.2 12 4.2l7.5 6V19a1.5 1.5 0 0 1-1.5 1.5h-4.2v-5.2h-3.6V20.5H6A1.5 1.5 0 0 1 4.5 19v-8.8Z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/></svg>',
      shop: '<svg viewBox="0 0 24 24" fill="none"><path d="M5 10.5V20h14v-9.5" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="M4 7.5 6.2 4h11.6L20 7.5c0 2-1.8 3.4-4 3.4S12 9.5 12 7.5c0 2-1.8 3.4-4 3.4S4 9.5 4 7.5Z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="M10 20v-5h4v5" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/></svg>',
      study: '<svg viewBox="0 0 24 24" fill="none"><rect x="3.5" y="6" width="17" height="12.5" rx="2" stroke="currentColor" stroke-width="1.7"/><path d="M3.5 10h17" stroke="currentColor" stroke-width="1.7"/><circle cx="8" cy="10" r="1" fill="currentColor"/><circle cx="16" cy="10" r="1" fill="currentColor"/><path d="M8 14.5h5" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>',
      staff: '<svg viewBox="0 0 24 24" fill="none"><circle cx="9" cy="8" r="3" stroke="currentColor" stroke-width="1.7"/><path d="M3.8 18.5c.7-2.6 3-4.2 5.2-4.2s4.5 1.6 5.2 4.2" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/><circle cx="17" cy="9" r="2.2" stroke="currentColor" stroke-width="1.7"/><path d="M16.2 14.2c1.8.3 3.3 1.5 3.9 3.3" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>',
      "withdraw-review": '<svg viewBox="0 0 24 24" fill="none"><rect x="5" y="3.5" width="14" height="17" rx="2" stroke="currentColor" stroke-width="1.7"/><path d="M8.5 9.5l2.2 2.2 4.8-5" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/><path d="M8.5 16h7" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>',
      feedback: '<svg viewBox="0 0 24 24" fill="none"><path d="M5.5 6.5h13A1.5 1.5 0 0 1 20 8v7.5a1.5 1.5 0 0 1-1.5 1.5H12l-3.8 3.2V17H5.5A1.5 1.5 0 0 1 4 15.5V8A1.5 1.5 0 0 1 5.5 6.5Z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="M8 10.2h8M8 13.2h5.5" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>',
      invoices: '<svg viewBox="0 0 24 24" fill="none"><rect x="5" y="3.5" width="14" height="17" rx="2" stroke="currentColor" stroke-width="1.7"/><path d="M8.5 8h7M8.5 12h7M8.5 16h4.5" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/><path d="M15.2 15.2l1.3 1.3 2.5-2.8" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>'
    }
