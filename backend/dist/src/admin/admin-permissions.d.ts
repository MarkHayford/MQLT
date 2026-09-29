export declare const ADMIN_PERMISSIONS: {
    readonly OVERVIEW_READ: "overview.read";
    readonly STUDY_READ: "study.read";
    readonly STUDY_MANAGE: "study.manage";
    readonly MALL_READ: "mall.read";
    readonly MALL_MANAGE: "mall.manage";
    readonly ORDERS_READ: "orders.read";
    readonly ORDERS_MANAGE: "orders.manage";
    readonly USERS_READ: "users.read";
    readonly USERS_MANAGE: "users.manage";
    readonly FEEDBACK_READ: "feedback.read";
    readonly FEEDBACK_MANAGE: "feedback.manage";
    readonly ACCESS_MANAGE: "access.manage";
};
export type AdminPermission = (typeof ADMIN_PERMISSIONS)[keyof typeof ADMIN_PERMISSIONS];
export type AdminRole = (typeof ADMIN_ROLE_OPTIONS)[number]['value'];
export declare const ALL_ADMIN_PERMISSIONS: AdminPermission[];
export declare const ADMIN_ROLE_OPTIONS: readonly [{
    readonly value: "NONE";
    readonly label: "普通账号";
    readonly description: "不能进入控制台";
    readonly permissions: readonly [];
}, {
    readonly value: "SUPER_ADMIN";
    readonly label: "超级管理员";
    readonly description: "拥有全部控制台功能和职位权限管理能力";
    readonly permissions: AdminPermission[];
}, {
    readonly value: "OPERATIONS_DIRECTOR";
    readonly label: "运营总监";
    readonly description: "查看全局数据，并管理研学、商城、订单、用户和反馈";
    readonly permissions: readonly ["overview.read", "study.read", "study.manage", "mall.read", "mall.manage", "orders.read", "orders.manage", "users.read", "users.manage", "feedback.read", "feedback.manage"];
}, {
    readonly value: "STUDY_OPERATOR";
    readonly label: "研学运营";
    readonly description: "管理研学项目、路线、公告和预约视图";
    readonly permissions: readonly ["overview.read", "study.read", "study.manage", "orders.read", "users.read"];
}, {
    readonly value: "MALL_OPERATOR";
    readonly label: "商城运营";
    readonly description: "管理商城商品、库存和商品资料";
    readonly permissions: readonly ["overview.read", "mall.read", "mall.manage", "orders.read"];
}, {
    readonly value: "ORDER_OPERATOR";
    readonly label: "订单履约";
    readonly description: "处理商城订单和研学预约履约状态";
    readonly permissions: readonly ["overview.read", "orders.read", "orders.manage", "mall.read", "study.read"];
}, {
    readonly value: "USER_OPERATOR";
    readonly label: "用户运营";
    readonly description: "管理用户资料、实名信息和积分";
    readonly permissions: readonly ["overview.read", "users.read", "users.manage", "orders.read", "study.read"];
}, {
    readonly value: "SERVICE_AGENT";
    readonly label: "客服";
    readonly description: "处理用户反馈，并查看必要用户信息";
    readonly permissions: readonly ["overview.read", "feedback.read", "feedback.manage", "users.read", "orders.read"];
}, {
    readonly value: "OBSERVER";
    readonly label: "只读观察员";
    readonly description: "只能查看经营数据和业务资料，不能修改";
    readonly permissions: readonly ["overview.read", "study.read", "mall.read", "orders.read", "users.read", "feedback.read"];
}];
export declare const ADMIN_PERMISSION_OPTIONS: readonly [{
    readonly value: "overview.read";
    readonly label: "运营总览";
    readonly group: "总览";
}, {
    readonly value: "study.read";
    readonly label: "查看研学";
    readonly group: "研学";
}, {
    readonly value: "study.manage";
    readonly label: "管理研学";
    readonly group: "研学";
}, {
    readonly value: "mall.read";
    readonly label: "查看商城";
    readonly group: "商城";
}, {
    readonly value: "mall.manage";
    readonly label: "管理商城";
    readonly group: "商城";
}, {
    readonly value: "orders.read";
    readonly label: "查看订单";
    readonly group: "订单";
}, {
    readonly value: "orders.manage";
    readonly label: "处理订单";
    readonly group: "订单";
}, {
    readonly value: "users.read";
    readonly label: "查看用户";
    readonly group: "用户";
}, {
    readonly value: "users.manage";
    readonly label: "管理用户";
    readonly group: "用户";
}, {
    readonly value: "feedback.read";
    readonly label: "查看反馈";
    readonly group: "客服";
}, {
    readonly value: "feedback.manage";
    readonly label: "处理反馈";
    readonly group: "客服";
}, {
    readonly value: "access.manage";
    readonly label: "职位权限";
    readonly group: "权限";
}];
export declare function normalizeAdminRole(value: unknown): AdminRole;
export declare function normalizeAdminPermissions(value: unknown): AdminPermission[];
export declare function permissionsForRole(role: unknown): AdminPermission[];
export declare function mergePermissions(...groups: unknown[]): AdminPermission[];
export declare function buildAdminAccess(user: {
    phone?: string | null;
    isAdmin?: boolean | null;
    adminRole?: string | null;
    adminPermissions?: string[] | null;
}, adminPhones?: string[]): {
    isAdmin: boolean;
    isSuperAdmin: boolean;
    adminRole: "NONE" | "SUPER_ADMIN" | "OPERATIONS_DIRECTOR" | "STUDY_OPERATOR" | "MALL_OPERATOR" | "ORDER_OPERATOR" | "USER_OPERATOR" | "SERVICE_AGENT" | "OBSERVER";
    adminRoleLabel: "普通账号" | "超级管理员" | "运营总监" | "研学运营" | "商城运营" | "订单履约" | "用户运营" | "客服" | "只读观察员";
    adminPermissions: AdminPermission[];
};
