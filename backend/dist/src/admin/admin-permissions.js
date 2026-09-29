"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ADMIN_PERMISSION_OPTIONS = exports.ADMIN_ROLE_OPTIONS = exports.ALL_ADMIN_PERMISSIONS = exports.ADMIN_PERMISSIONS = exports.COARSE_ADMIN_EXPAND = void 0;
exports.flattenPermissionOptions = flattenPermissionOptions;
exports.expandAdminPermissions = expandAdminPermissions;
exports.normalizeAdminRole = normalizeAdminRole;
exports.normalizeAdminPermissions = normalizeAdminPermissions;
exports.permissionsForRole = permissionsForRole;
exports.mergePermissions = mergePermissions;
exports.buildAdminAccess = buildAdminAccess;

/** Legacy coarse codes → child leaf set (migration on load/save). */
exports.COARSE_ADMIN_EXPAND = {
    "overview.read": ["overview.read", "logs.read"],
    "study.read": ["study.read", "study.enterprises"],
    "study.manage": ["study.read", "study.manage", "study.enterprises", "study.review"],
    "mall.read": ["mall.read"],
    "mall.manage": ["mall.read", "mall.manage"],
    "orders.read": ["orders.read", "finance.read"],
    "orders.manage": ["orders.read", "orders.manage", "finance.read", "finance.withdraw", "finance.commission"],
    "users.read": ["users.read"],
    "users.manage": ["users.read", "users.manage"],
    "feedback.read": ["feedback.read"],
    "feedback.manage": ["feedback.read", "feedback.manage"],
    "invoice.read": ["invoice.read"],
    "invoice.manage": ["invoice.read", "invoice.manage"],
    "access.manage": ["access.manage", "settings.manage"],
    "logs.read": ["logs.read"],
};

exports.ADMIN_PERMISSIONS = {
    OVERVIEW_READ: "overview.read",
    LOGS_READ: "logs.read",
    STUDY_READ: "study.read",
    STUDY_MANAGE: "study.manage",
    STUDY_ENTERPRISES: "study.enterprises",
    STUDY_REVIEW: "study.review",
    MALL_READ: "mall.read",
    MALL_MANAGE: "mall.manage",
    ORDERS_READ: "orders.read",
    ORDERS_MANAGE: "orders.manage",
    FINANCE_READ: "finance.read",
    FINANCE_WITHDRAW: "finance.withdraw",
    FINANCE_COMMISSION: "finance.commission",
    FLEET_DRIVERS: "fleet.drivers",
    FLEET_JOBS: "fleet.jobs",
    MEDIA_READ: "media.read",
    MEDIA_PUBLISH: "media.publish",
    MEDIA_REVIEW: "media.review",
    MEDIA_CATS: "media.cats",
    USERS_READ: "users.read",
    USERS_MANAGE: "users.manage",
    FEEDBACK_READ: "feedback.read",
    FEEDBACK_MANAGE: "feedback.manage",
    INVOICE_READ: "invoice.read",
    INVOICE_MANAGE: "invoice.manage",
    ACCESS_MANAGE: "access.manage",
    SETTINGS_MANAGE: "settings.manage",
};

/** Tree catalog: parent module + children (stored values are children / legacy coarse leaves). */
exports.ADMIN_PERMISSION_OPTIONS = [
    {
        value: "overview",
        label: "总览",
        group: "总览",
        children: [
            { value: "overview.read", label: "运营总览" },
            { value: "logs.read", label: "操作日志" },
        ],
    },
    {
        value: "study",
        label: "研学",
        group: "研学",
        children: [
            { value: "study.read", label: "查看研学" },
            { value: "study.manage", label: "管理研学" },
            { value: "study.enterprises", label: "入驻企业" },
            { value: "study.review", label: "项目审批" },
        ],
    },
    {
        value: "mall",
        label: "商城",
        group: "商城",
        children: [
            { value: "mall.read", label: "查看商城" },
            { value: "mall.manage", label: "管理商城" },
        ],
    },
    {
        value: "orders",
        label: "订单财务",
        group: "财务",
        children: [
            { value: "orders.read", label: "查看订单" },
            { value: "orders.manage", label: "处理订单" },
            { value: "finance.read", label: "平台财务" },
            { value: "finance.withdraw", label: "提现审批" },
            { value: "finance.commission", label: "抽成设置" },
            { value: "invoice.read", label: "查看电子发票" },
            { value: "invoice.manage", label: "开具电子发票" },
        ],
    },
    {
        value: "fleet",
        label: "租车调度",
        group: "租车",
        children: [
            { value: "fleet.drivers", label: "司机档案" },
            { value: "fleet.jobs", label: "出车任务" },
        ],
    },
    {
        value: "media",
        label: "资讯文章",
        group: "资讯",
        children: [
            { value: "media.read", label: "资讯总览" },
            { value: "media.publish", label: "发布文章" },
            { value: "media.review", label: "文章审批" },
            { value: "media.cats", label: "文章分类" },
        ],
    },
    {
        value: "users",
        label: "用户",
        group: "用户",
        children: [
            { value: "users.read", label: "查看用户" },
            { value: "users.manage", label: "管理用户" },
        ],
    },
    {
        value: "feedback",
        label: "客服",
        group: "客服",
        children: [
            { value: "feedback.read", label: "查看反馈" },
            { value: "feedback.manage", label: "处理反馈" },
        ],
    },
    {
        value: "access",
        label: "设置权限",
        group: "设置",
        children: [
            { value: "access.manage", label: "职位与账号" },
            { value: "settings.manage", label: "系统设置" },
        ],
    },
];

function flattenPermissionOptions(options) {
    const out = [];
    const rows = Array.isArray(options) ? options : [];
    for (let i = 0; i < rows.length; i++) {
        const row = rows[i] || {};
        const kids = Array.isArray(row.children) ? row.children : [];
        if (kids.length) {
            for (let j = 0; j < kids.length; j++) {
                const c = kids[j] || {};
                out.push({
                    value: String(c.value || "").trim(),
                    label: String(c.label || c.value || "").trim(),
                    group: String(row.group || row.label || "其他"),
                    parent: String(row.value || ""),
                    parentLabel: String(row.label || row.value || ""),
                });
            }
        }
        else if (row.value) {
            out.push({
                value: String(row.value).trim(),
                label: String(row.label || row.value).trim(),
                group: String(row.group || "其他"),
                parent: "",
                parentLabel: "",
            });
        }
    }
    return out.filter((x) => x.value);
}

exports.ALL_ADMIN_PERMISSIONS = flattenPermissionOptions(exports.ADMIN_PERMISSION_OPTIONS).map((x) => x.value);

function uniq(list) {
    const out = [];
    for (let i = 0; i < list.length; i++) {
        const v = String(list[i] || "").trim();
        if (v && out.indexOf(v) < 0)
            out.push(v);
    }
    return out;
}

function expandAdminPermissions(value) {
    const allow = new Set(exports.ALL_ADMIN_PERMISSIONS);
    const raw = Array.isArray(value) ? value : [];
    const out = [];
    for (let i = 0; i < raw.length; i++) {
        const key = String(raw[i] || "").trim();
        if (!key)
            continue;
        const expanded = exports.COARSE_ADMIN_EXPAND[key];
        if (expanded && expanded.length) {
            for (let j = 0; j < expanded.length; j++) {
                const child = expanded[j];
                if (allow.has(child) && out.indexOf(child) < 0)
                    out.push(child);
            }
        }
        else if (allow.has(key) && out.indexOf(key) < 0) {
            out.push(key);
        }
        else {
            // Parent module key (e.g. "study") → all children
            const mod = exports.ADMIN_PERMISSION_OPTIONS.find((m) => m.value === key);
            if (mod && Array.isArray(mod.children)) {
                for (let j = 0; j < mod.children.length; j++) {
                    const child = String(mod.children[j].value || "").trim();
                    if (allow.has(child) && out.indexOf(child) < 0)
                        out.push(child);
                }
            }
        }
    }
    return out;
}

exports.ADMIN_ROLE_OPTIONS = [
    {
        value: "NONE",
        label: "普通账号",
        description: "不能进入控制台",
        permissions: [],
    },
    {
        value: "SUPER_ADMIN",
        label: "超级管理员",
        description: "拥有全部控制台功能和职位权限管理能力",
        permissions: exports.ALL_ADMIN_PERMISSIONS.slice(),
    },
    {
        value: "OPERATIONS_DIRECTOR",
        label: "运营总监",
        description: "查看全局数据，并管理研学、商城、订单、用户和反馈",
        permissions: expandAdminPermissions([
            "overview.read",
            "study.manage",
            "mall.manage",
            "orders.manage",
            "users.manage",
            "feedback.manage",
            "invoice.manage",
            "fleet.drivers",
            "fleet.jobs",
            "media.read",
            "media.publish",
            "media.review",
            "media.cats",
        ]),
    },
    {
        value: "STUDY_OPERATOR",
        label: "研学运营",
        description: "管理研学项目、路线、公告和预约视图",
        permissions: expandAdminPermissions([
            "overview.read",
            "study.manage",
            "orders.read",
            "users.read",
            "media.read",
            "media.publish",
        ]),
    },
    {
        value: "MALL_OPERATOR",
        label: "商城运营",
        description: "管理商城商品、库存和商品资料",
        permissions: expandAdminPermissions([
            "overview.read",
            "mall.manage",
            "orders.read",
        ]),
    },
    {
        value: "ORDER_OPERATOR",
        label: "订单履约",
        description: "处理商城订单和研学预约履约状态",
        permissions: expandAdminPermissions([
            "overview.read",
            "orders.manage",
            "mall.read",
            "study.read",
            "finance.read",
            "finance.withdraw",
            "invoice.manage",
        ]),
    },
    {
        value: "USER_OPERATOR",
        label: "用户运营",
        description: "管理用户资料、实名信息和积分",
        permissions: expandAdminPermissions([
            "overview.read",
            "users.manage",
            "orders.read",
            "study.read",
        ]),
    },
    {
        value: "SERVICE_AGENT",
        label: "客服",
        description: "处理用户反馈，并查看必要用户信息",
        permissions: expandAdminPermissions([
            "overview.read",
            "feedback.manage",
            "users.read",
            "orders.read",
        ]),
    },
    {
        value: "OBSERVER",
        label: "只读观察员",
        description: "只能查看经营数据和业务资料，不能修改",
        permissions: expandAdminPermissions([
            "overview.read",
            "study.read",
            "mall.read",
            "orders.read",
            "users.read",
            "feedback.read",
            "media.read",
            "fleet.drivers",
            "finance.read",
            "invoice.read",
        ]),
    },
];

const ROLE_MAP = new Map(exports.ADMIN_ROLE_OPTIONS.map((role) => [role.value, role]));
const PERMISSION_SET = new Set(exports.ALL_ADMIN_PERMISSIONS);

function normalizeAdminRole(value) {
    const role = String(value !== null && value !== void 0 ? value : "NONE").trim().toUpperCase();
    return (ROLE_MAP.has(role) ? role : "NONE");
}

function normalizeAdminPermissions(value) {
    return expandAdminPermissions(value).filter((item) => PERMISSION_SET.has(item));
}

function permissionsForRole(role) {
    return uniq((ROLE_MAP.get(normalizeAdminRole(role)) || {}).permissions || []);
}

function mergePermissions(...groups) {
    const merged = groups.flatMap((group) => normalizeAdminPermissions(group));
    return uniq(merged);
}

function buildAdminAccess(user, adminPhones = []) {
    const isSuperAdmin = Boolean(user.isAdmin) || Boolean(user.phone && adminPhones.includes(user.phone));
    const role = isSuperAdmin ? "SUPER_ADMIN" : normalizeAdminRole(user.adminRole);
    const permissions = isSuperAdmin
        ? exports.ALL_ADMIN_PERMISSIONS.slice()
        : mergePermissions(permissionsForRole(role), user.adminPermissions !== null && user.adminPermissions !== void 0 ? user.adminPermissions : []);
    const canUseConsole = permissions.length > 0;
    return {
        isAdmin: canUseConsole,
        isSuperAdmin,
        adminRole: role,
        adminRoleLabel: ((ROLE_MAP.get(role) || {}).label) || "普通账号",
        adminPermissions: permissions,
    };
}
