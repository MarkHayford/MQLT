"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConsoleAuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const bcrypt = require("bcryptjs");
const crypto_1 = require("crypto");
const client_s3_1 = require("@aws-sdk/client-s3");
const config_1 = require("@nestjs/config");
const prisma_service_1 = require("../prisma/prisma.service");
let ConsoleAuthService = class ConsoleAuthService {
    constructor(prisma, jwtService, config) {
        this.prisma = prisma;
        this.jwtService = jwtService;
        this.config = config;
    }
    async login(body) {
        const phone = String((body && body.phone) || "").trim();
        const password = String((body && body.password) || "");
        if (!/^1\d{10}$/.test(phone) || password.length < 6)
            throw new common_1.UnauthorizedException("账号或密码错误");
        const row = await this.findByPhone(phone);
        if (!row)
            throw new common_1.UnauthorizedException("账号或密码错误");
        const matched = await bcrypt.compare(password, row.passwordHash);
        if (!matched)
            throw new common_1.UnauthorizedException("账号或密码错误");
        if (String(row.status) !== "ACTIVE")
            throw new common_1.UnauthorizedException("账号不可用");
        await this.ensureStaffColumns();
        const account = await this.serializeAsync(row);
        if (!account.mpAccess && !account.merchantAccess)
            throw new common_1.UnauthorizedException("当前账号没有管理权限");
        const projectAccessIds = Array.isArray(account.projectAccess)
            ? account.projectAccess.map((x) => String((x && x.projectId) || '').trim()).filter(Boolean)
            : [];
        const accessToken = this.jwtService.sign({
            typ: "console",
            sub: account.id,
            phone: account.phone,
            name: account.name,
            mpAccess: account.mpAccess,
            mpRole: account.mpRole,
            merchantAccess: account.merchantAccess,
            enterpriseId: account.enterpriseId,
            merchantRoleId: account.merchantRoleId,
            merchantRoleName: account.merchantRoleName,
            merchantPermissions: account.merchantPermissions,
            merchantProjectIds: account.merchantProjectIds,
            projectAccessIds,
            mpEnterpriseIds: account.mpEnterpriseIds,
            mpProjectIds: account.mpProjectIds,
            adminPermissions: account.adminPermissions,
            mpRoleName: account.mpRoleName,
        });
        return { accessToken, account };
    }
    async me(user) {
        if (!user || !user.sub)
            throw new common_1.UnauthorizedException("请先登录控制台");
        const row = await this.findById(user.sub);
        if (!row || String(row.status) !== "ACTIVE")
            throw new common_1.UnauthorizedException("账号不可用");
        return this.serializeAsync(row);
    }
    async updateProfile(user, body) {
        if (!user || !user.sub)
            throw new common_1.UnauthorizedException("请先登录控制台");
        await this.ensureStaffColumns();
        const row = await this.findById(user.sub);
        if (!row || String(row.status) !== "ACTIVE")
            throw new common_1.UnauthorizedException("账号不可用");
        const src = body || {};
        let name = row.name != null ? String(row.name) : "";
        if (src.name != null) {
            name = String(src.name).trim();
            if (!name)
                throw new common_1.BadRequestException("姓名不能为空");
            if (name.length > 40)
                throw new common_1.BadRequestException("姓名最多 40 字");
        }
        let email = row.email != null ? String(row.email) : "";
        if (src.email != null) {
            email = String(src.email).trim();
            if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
                throw new common_1.BadRequestException("邮箱格式不正确");
            if (email.length > 120)
                throw new common_1.BadRequestException("邮箱过长");
        }
        let avatarUrl = row.avatarUrl != null ? String(row.avatarUrl) : "";
        if (src.avatarUrl != null) {
            avatarUrl = String(src.avatarUrl).trim();
            if (avatarUrl.length > 500)
                throw new common_1.BadRequestException("头像地址过长");
            if (avatarUrl && !/^https?:\/\//i.test(avatarUrl) && !avatarUrl.startsWith("/"))
                throw new common_1.BadRequestException("头像地址无效");
        }
        await this.prisma.$executeRawUnsafe(
            `UPDATE "ConsoleAccount" SET name=$1, email=$2, "avatarUrl"=$3, "updatedAt"=NOW() WHERE id=$4`,
            name, email || null, avatarUrl || null, String(row.id)
        );
        const next = await this.findById(String(row.id));
        return this.serialize(next);
    }
    async changePassword(user, body) {
        if (!user || !user.sub)
            throw new common_1.UnauthorizedException("请先登录控制台");
        const row = await this.findById(user.sub);
        if (!row || String(row.status) !== "ACTIVE")
            throw new common_1.UnauthorizedException("账号不可用");
        const currentPassword = String((body && (body.currentPassword || body.oldPassword)) || "");
        const newPassword = String((body && (body.newPassword || body.password)) || "");
        if (currentPassword.length < 6)
            throw new common_1.BadRequestException("请输入当前密码");
        if (newPassword.length < 6 || newPassword.length > 64)
            throw new common_1.BadRequestException("新密码需要 6–64 位");
        if (currentPassword === newPassword)
            throw new common_1.BadRequestException("新密码不能与当前密码相同");
        const matched = await bcrypt.compare(currentPassword, row.passwordHash);
        if (!matched)
            throw new common_1.BadRequestException("当前密码不正确");
        const hash = await bcrypt.hash(newPassword, 10);
        await this.prisma.$executeRawUnsafe(
            `UPDATE "ConsoleAccount" SET "passwordHash"=$1, "updatedAt"=NOW() WHERE id=$2`,
            hash, String(row.id)
        );
        return { ok: true };
    }
    async uploadAvatar(user, file) {
        if (!user || !user.sub)
            throw new common_1.UnauthorizedException("请先登录控制台");
        await this.ensureStaffColumns();
        const row = await this.findById(user.sub);
        if (!row || String(row.status) !== "ACTIVE")
            throw new common_1.UnauthorizedException("账号不可用");
        if (!file)
            throw new common_1.BadRequestException("请选择头像图片");
        const type = String(file.mimetype || "").toLowerCase();
        const extMap = { "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp", "image/gif": ".gif" };
        let ext = extMap[type];
        if (!ext)
            ext = this.avatarExtension(file);
        const size = file.size != null ? Number(file.size) : (file.buffer ? file.buffer.length : 0);
        if (size > 5 * 1024 * 1024)
            throw new common_1.BadRequestException("头像不能超过 5MB");
        const body = file.buffer != null ? file.buffer : null;
        if (!body || !body.length)
            throw new common_1.BadRequestException("请选择头像图片");
        const bucket = String(this.config.get("S3_BUCKET") || "").trim();
        if (!bucket)
            throw new common_1.ServiceUnavailableException("图片存储未配置");
        const prefix = String(this.config.get("S3_KEY_PREFIX") || "public/mqlt/media").replace(/^\/+|\/+$/g, "");
        const key = prefix + "/avatars/console_" + String(row.id) + "_" + Date.now() + "_" + (0, crypto_1.randomUUID)().slice(0, 8) + ext;
        await this.s3Client().send(new client_s3_1.PutObjectCommand({
            Bucket: bucket,
            Key: key,
            Body: body,
            ContentType: type || ("image/" + ext.replace(".", "")),
        }));
        const avatarUrl = this.avatarPublicUrl(key);
        await this.prisma.$executeRawUnsafe(
            `UPDATE "ConsoleAccount" SET "avatarUrl"=$1, "updatedAt"=NOW() WHERE id=$2`,
            avatarUrl, String(row.id)
        );
        const next = await this.findById(String(row.id));
        return { avatarUrl, account: this.serialize(next) };
    }
    async ensureStaffColumns() {
        if (this._staffCols)
            return;
        try {
            await this.prisma.$executeRawUnsafe(`ALTER TABLE "Enterprise" ADD COLUMN IF NOT EXISTS "staffRoles" JSONB`);
        }
        catch (_err) { }
        try {
            await this.prisma.$executeRawUnsafe(`ALTER TABLE "ConsoleAccount" ADD COLUMN IF NOT EXISTS "merchantRoleId" TEXT`);
        }
        catch (_err2) { }
        try {
            await this.prisma.$executeRawUnsafe(`ALTER TABLE "ConsoleAccount" ADD COLUMN IF NOT EXISTS email TEXT`);
        }
        catch (_err3) { }
        try {
            await this.prisma.$executeRawUnsafe(`ALTER TABLE "ConsoleAccount" ADD COLUMN IF NOT EXISTS "avatarUrl" TEXT`);
        }
        catch (_err4) { }
        this._staffCols = true;
    }
    merchantPerms() {
        return [
            "overview.read", "logs.read",
            "study.read", "study.manage", "study.projects", "study.submit", "study.notices",
            "mall.read", "mall.manage", "mall.orders",
            "orders.read", "orders.manage", "orders.bookings", "finance.read", "finance.withdraw",
            "invoice.read", "invoice.manage",
            "staff.manage",
        ];
    }
    merchantCoarseExpand() {
        return {
            "overview.read": ["overview.read", "logs.read"],
            "logs.read": ["logs.read"],
            "study.read": ["study.read", "study.projects", "study.notices"],
            "study.manage": ["study.read", "study.manage", "study.projects", "study.submit", "study.notices"],
            "mall.read": ["mall.read"],
            "mall.manage": ["mall.read", "mall.manage"],
            "orders.read": ["orders.read", "orders.bookings", "finance.read", "invoice.read", "mall.orders"],
            "orders.manage": ["orders.read", "orders.manage", "orders.bookings", "finance.read", "finance.withdraw", "invoice.read", "invoice.manage", "mall.orders"],
            "finance.read": ["finance.read", "invoice.read"],
            "invoice.read": ["invoice.read"],
            "invoice.manage": ["invoice.read", "invoice.manage"],
            "staff.manage": ["staff.manage"],
        };
    }
    expandMerchantPerms(raw) {
        const allow = new Set(this.merchantPerms());
        const expand = this.merchantCoarseExpand();
        const src = Array.isArray(raw) ? raw : [];
        const out = [];
        for (let i = 0; i < src.length; i++) {
            const key = String(src[i] || "").trim();
            if (!key) continue;
            if (expand[key]) {
                const kids = expand[key];
                for (let j = 0; j < kids.length; j++) {
                    if (allow.has(kids[j]) && out.indexOf(kids[j]) < 0) out.push(kids[j]);
                }
            }
            else if (allow.has(key) && out.indexOf(key) < 0) {
                out.push(key);
            }
        }
        return out;
    }
    permissionsOf(row) {
        if (!row || !row.merchantAccess)
            return [];
        const roleId = String(row.merchantRoleId || "").trim();
        let roles = row.staffRoles;
        if (typeof roles === "string") {
            try { roles = JSON.parse(roles); } catch (_err) { roles = null; }
        }
        const hit = Array.isArray(roles) ? roles.find((r) => String(r.id) === roleId) : null;
        if (hit && hit.locked)
            return this.merchantPerms().slice();
        const raw = hit && Array.isArray(hit.permissions) ? hit.permissions : (roleId ? [] : this.merchantPerms());
        const out = this.expandMerchantPerms(raw.length ? raw : this.merchantPerms());
        if (!out.length)
            return this.merchantPerms().slice();
        return out;
    }
    projectIdsOf(row) {
        if (!row || !row.merchantAccess)
            return [];
        const roleId = String(row.merchantRoleId || "").trim();
        let roles = row.staffRoles;
        if (typeof roles === "string") {
            try { roles = JSON.parse(roles); } catch (_err) { roles = null; }
        }
        const hit = Array.isArray(roles) ? roles.find((r) => String(r.id) === roleId) : null;
        if (!hit || hit.locked)
            return [];
        const raw = Array.isArray(hit.projectIds) ? hit.projectIds : [];
        const out = [];
        for (let i = 0; i < raw.length; i++) {
            const id = String(raw[i] || "").trim();
            if (id && out.indexOf(id) < 0)
                out.push(id);
        }
        return out;
    }
    roleNameOf(row) {
        const roleId = String(row && row.merchantRoleId || "").trim();
        let roles = row && row.staffRoles;
        if (typeof roles === "string") {
            try { roles = JSON.parse(roles); } catch (_err) { roles = null; }
        }
        const hit = Array.isArray(roles) ? roles.find((r) => String(r.id) === roleId) : null;
        if (hit && hit.name)
            return String(hit.name);
        if (!roleId)
            return "企业管理员";
        return roleId;
    }
    accountSelectSql() {
        return `SELECT a.id, a.phone, a."passwordHash", a.name, a.status,
                    a."mpAccess", a."mpRole", a."merchantAccess", a."enterpriseId", a."merchantRoleId",
                    a.email, a."avatarUrl",
                    e.name AS "enterpriseName", e."shortName" AS "enterpriseShortName", e."staffRoles" AS "staffRoles",
                    s.value AS "platformRoles"
             FROM "ConsoleAccount" a
             LEFT JOIN "Enterprise" e ON e.id = a."enterpriseId"
             LEFT JOIN "PlatformSetting" s ON s.key = 'platform.roles'`;
    }
    async findByPhone(phone) {
        await this.ensureStaffColumns();
        const rows = await this.prisma.$queryRawUnsafe(`${this.accountSelectSql()}
             WHERE a.phone = $1
             LIMIT 1`, phone);
        return rows && rows.length ? rows[0] : null;
    }
    async findById(id) {
        await this.ensureStaffColumns();
        const rows = await this.prisma.$queryRawUnsafe(`${this.accountSelectSql()}
             WHERE a.id = $1
             LIMIT 1`, id);
        return rows && rows.length ? rows[0] : null;
    }

    async ensureProjectContactsColumn() {
        if (this._projectContactsColReady) return;
        try {
            await this.prisma.$executeRawUnsafe(`ALTER TABLE "StudyProject" ADD COLUMN IF NOT EXISTS "projectContacts" JSONB NOT NULL DEFAULT '[]'::jsonb`);
        } catch (_e) {}
        this._projectContactsColReady = true;
    }
    contactRoleDefaultCaps(role) {
        const r = String(role || '').trim();
        if (r === '总负责人') return ['project.live','project.bookings','project.checkin','project.cert','project.mall','project.resources','project.edit','project.owners'];
        if (r === '现场负责人') return ['project.live','project.bookings','project.checkin'];
        if (r === '讲解带队') return ['project.live','project.checkin'];
        return [];
    }
    normalizeProjectContacts(raw) {
        let list = raw;
        if (typeof raw === 'string') {
            try { list = JSON.parse(raw); } catch (_e) { list = []; }
        }
        if (!Array.isArray(list)) list = [];
        const out = [];
        for (let i = 0; i < list.length; i++) {
            const row = list[i] || {};
            const userId = String(row.userId || '').trim();
            const role = String(row.role || '').trim() || '现场负责人';
            let caps = Array.isArray(row.capabilities) ? row.capabilities.map((c) => String(c || '').trim()).filter(Boolean) : [];
            if (!caps.length) caps = this.contactRoleDefaultCaps(role);
            out.push({ userId, role, capabilities: caps, id: String(row.id || ''), name: String(row.name || '') });
        }
        return out;
    }
    async listProjectAccessForAccount(accountId, enterpriseId) {
        await this.ensureProjectContactsColumn();
        const aid = String(accountId || '').trim();
        if (!aid) return [];
        try {
            let rows;
            if (enterpriseId) {
                rows = await this.prisma.$queryRawUnsafe(
                    `SELECT id, title, "projectContacts" FROM "StudyProject" WHERE "enterpriseId"=$1`,
                    String(enterpriseId)
                );
            } else {
                rows = await this.prisma.$queryRawUnsafe(
                    `SELECT id, title, "projectContacts" FROM "StudyProject" WHERE "projectContacts" IS NOT NULL AND jsonb_array_length(COALESCE("projectContacts", '[]'::jsonb)) > 0`
                );
            }
            const out = [];
            for (let i = 0; i < (rows || []).length; i++) {
                const row = rows[i];
                const contacts = this.normalizeProjectContacts(row.projectContacts);
                for (let j = 0; j < contacts.length; j++) {
                    if (contacts[j].userId === aid) {
                        out.push({
                            projectId: String(row.id),
                            projectTitle: row.title || '',
                            role: contacts[j].role,
                            capabilities: contacts[j].capabilities || [],
                            contactId: contacts[j].id,
                        });
                        break;
                    }
                }
            }
            return out;
        } catch (_e) {
            return [];
        }
    }
    computeDefaultLanding(account, projectAccess) {
        if (!account || !account.merchantAccess) return null;
        const scoped = Array.isArray(account.merchantProjectIds) ? account.merchantProjectIds.map(String) : [];
        if (scoped.length === 1) {
            return { area: 'merchant', projectId: scoped[0], page: 'proj-home' };
        }
        const access = Array.isArray(projectAccess) ? projectAccess : [];
        if (!scoped.length && access.length === 1) {
            return { area: 'merchant', projectId: access[0].projectId, page: 'proj-home' };
        }
        return null;
    }

    serialize(row) {
        const shortName = row.enterpriseShortName != null ? String(row.enterpriseShortName).trim() : "";
        const fullName = row.enterpriseName != null ? String(row.enterpriseName).trim() : "";
        const merchantPermissions = this.permissionsOf(row);
        const adminPermissions = this.mpPermissionsOf(row);
        const mpRoleName = this.mpRoleNameOf(row);
        const merchantRoleName = this.roleNameOf(row);
        const capabilities = this.capabilitiesOf(row, adminPermissions, merchantPermissions);
        return {
            id: String(row.id),
            phone: String(row.phone),
            name: row.name != null ? String(row.name) : "",
            email: row.email != null ? String(row.email) : "",
            avatarUrl: row.avatarUrl != null ? String(row.avatarUrl) : "",
            status: String(row.status),
            mpAccess: Boolean(row.mpAccess),
            mpRole: row.mpRole != null ? String(row.mpRole) : "NONE",
            merchantAccess: Boolean(row.merchantAccess),
            enterpriseId: row.enterpriseId != null ? String(row.enterpriseId) : "",
            enterpriseName: shortName.length > 0 ? shortName : fullName,
            enterpriseFullName: fullName,
            merchantRoleId: row.merchantRoleId != null ? String(row.merchantRoleId) : "",
            merchantRoleName,
            merchantPermissions,
            merchantProjectIds: this.projectIdsOf(row),
            mpEnterpriseIds: this.mpEnterpriseIdsOf(row),
            mpProjectIds: this.mpProjectIdsOf(row),
            adminPermissions,
            mpRoleName,
            roleNames: this.roleNamesOf(row, mpRoleName, merchantRoleName),
            capabilities,
        };
    }

    async serializeAsync(row) {
        const base = this.serialize(row);
        let projectAccess = [];
        try {
            projectAccess = await this.listProjectAccessForAccount(base.id, base.enterpriseId || '');
        } catch (_e) {
            projectAccess = [];
        }
        base.projectAccess = projectAccess;
        base.defaultLanding = this.computeDefaultLanding(base, projectAccess);
        return base;
    }

    roleNamesOf(row, mpRoleName, merchantRoleName) {
        const out = [];
        if (row && row.mpAccess)
            out.push(mpRoleName || "平台管理");
        if (row && row.merchantAccess)
            out.push(merchantRoleName || "企业管理");
        return out;
    }
    capabilitiesOf(row, adminPermissions, merchantPermissions) {
        const out = [];
        const seen = {};
        if (row && row.mpAccess) {
            const labels = this.mpCapabilityLabels();
            for (let i = 0; i < adminPermissions.length; i++) {
                const value = String(adminPermissions[i] || "").trim();
                if (!value || seen["mp:" + value])
                    continue;
                seen["mp:" + value] = true;
                const hit = labels[value] || { label: value, group: "平台" };
                out.push({ scope: "mp", value, label: hit.label, group: hit.group, parent: hit.parent || "", parentLabel: hit.parentLabel || "" });
            }
        }
        if (row && row.merchantAccess) {
            const labels = this.merchantCapabilityLabels();
            for (let i = 0; i < merchantPermissions.length; i++) {
                const value = String(merchantPermissions[i] || "").trim();
                if (!value || seen["ent:" + value])
                    continue;
                seen["ent:" + value] = true;
                const hit = labels[value] || { label: value, group: "企业" };
                out.push({ scope: "merchant", value, label: hit.label, group: hit.group, parent: hit.parent || "", parentLabel: hit.parentLabel || "" });
            }
        }
        return out;
    }
    mpCapabilityLabels() {
        return {
            "overview.read": { label: "运营总览", group: "总览", parent: "overview", parentLabel: "总览" },
            "logs.read": { label: "操作日志", group: "总览", parent: "overview", parentLabel: "总览" },
            "study.read": { label: "查看研学", group: "研学", parent: "study", parentLabel: "研学" },
            "study.manage": { label: "管理研学", group: "研学", parent: "study", parentLabel: "研学" },
            "study.enterprises": { label: "入驻企业", group: "研学", parent: "study", parentLabel: "研学" },
            "study.review": { label: "项目审批", group: "研学", parent: "study", parentLabel: "研学" },
            "mall.read": { label: "查看商城", group: "商城", parent: "mall", parentLabel: "商城" },
            "mall.manage": { label: "管理商城", group: "商城", parent: "mall", parentLabel: "商城" },
            "orders.read": { label: "查看订单", group: "财务", parent: "orders", parentLabel: "订单财务" },
            "orders.manage": { label: "处理订单", group: "财务", parent: "orders", parentLabel: "订单财务" },
            "finance.read": { label: "平台财务", group: "财务", parent: "orders", parentLabel: "订单财务" },
            "finance.withdraw": { label: "提现审批", group: "财务", parent: "orders", parentLabel: "订单财务" },
            "finance.commission": { label: "抽成设置", group: "财务", parent: "orders", parentLabel: "订单财务" },
            "fleet.drivers": { label: "司机档案", group: "租车", parent: "fleet", parentLabel: "租车调度" },
            "fleet.jobs": { label: "出车任务", group: "租车", parent: "fleet", parentLabel: "租车调度" },
            "media.read": { label: "资讯总览", group: "资讯", parent: "media", parentLabel: "资讯文章" },
            "media.publish": { label: "发布文章", group: "资讯", parent: "media", parentLabel: "资讯文章" },
            "media.review": { label: "文章审批", group: "资讯", parent: "media", parentLabel: "资讯文章" },
            "media.cats": { label: "文章分类", group: "资讯", parent: "media", parentLabel: "资讯文章" },
            "users.read": { label: "查看用户", group: "用户", parent: "users", parentLabel: "用户" },
            "users.manage": { label: "管理用户", group: "用户", parent: "users", parentLabel: "用户" },
            "feedback.read": { label: "查看反馈", group: "客服", parent: "feedback", parentLabel: "客服" },
            "feedback.manage": { label: "处理反馈", group: "客服", parent: "feedback", parentLabel: "客服" },
            "access.manage": { label: "职位与账号", group: "设置", parent: "access", parentLabel: "设置权限" },
            "settings.manage": { label: "系统设置", group: "设置", parent: "access", parentLabel: "设置权限" },
        };
    }
    merchantCapabilityLabels() {
        return {
            "overview.read": { label: "首页", group: "总览", parent: "overview", parentLabel: "总览" },
            "logs.read": { label: "操作日志", group: "总览", parent: "overview", parentLabel: "总览" },
            "study.read": { label: "查看研学", group: "研学", parent: "study", parentLabel: "研学项目" },
            "study.manage": { label: "管理研学", group: "研学", parent: "study", parentLabel: "研学项目" },
            "study.projects": { label: "项目列表", group: "研学", parent: "study", parentLabel: "研学项目" },
            "study.submit": { label: "上架项目", group: "研学", parent: "study", parentLabel: "研学项目" },
            "study.notices": { label: "资讯", group: "研学", parent: "study", parentLabel: "研学项目" },
            "mall.read": { label: "查看商品", group: "文创", parent: "mall", parentLabel: "文创商城" },
            "mall.manage": { label: "管理商品", group: "文创", parent: "mall", parentLabel: "文创商城" },
            "mall.orders": { label: "项目订单", group: "文创", parent: "mall", parentLabel: "文创商城" },
            "orders.read": { label: "查看订单与财务", group: "履约", parent: "orders", parentLabel: "履约财务" },
            "orders.manage": { label: "处理订单与提现", group: "履约", parent: "orders", parentLabel: "履约财务" },
            "orders.bookings": { label: "预约", group: "履约", parent: "orders", parentLabel: "履约财务" },
            "finance.read": { label: "企业流水", group: "履约", parent: "orders", parentLabel: "履约财务" },
            "finance.withdraw": { label: "提现申请", group: "履约", parent: "orders", parentLabel: "履约财务" },
            "invoice.read": { label: "查看电子发票", group: "履约", parent: "orders", parentLabel: "履约财务" },
            "invoice.manage": { label: "开具电子发票", group: "履约", parent: "orders", parentLabel: "履约财务" },
            "staff.manage": { label: "职位与管理账号", group: "权限", parent: "staff", parentLabel: "权限" },
            "project.live": { label: "研学 Live", group: "项目", parent: "project", parentLabel: "项目事务" },
            "project.bookings": { label: "项目预约", group: "项目", parent: "project", parentLabel: "项目事务" },
            "project.checkin": { label: "核销打卡", group: "项目", parent: "project", parentLabel: "项目事务" },
            "project.cert": { label: "结业证书", group: "项目", parent: "project", parentLabel: "项目事务" },
            "project.mall": { label: "项目商城", group: "项目", parent: "project", parentLabel: "项目事务" },
            "project.resources": { label: "研学资源", group: "项目", parent: "project", parentLabel: "项目事务" },
            "project.edit": { label: "项目编辑", group: "项目", parent: "project", parentLabel: "项目事务" },
            "project.owners": { label: "项目负责人", group: "项目", parent: "project", parentLabel: "项目事务" },
        };
    }
    mpRoleHit(row) {
        if (!row || !row.mpAccess)
            return null;
        const roleId = String(row.mpRole || "").trim();
        let roles = row.platformRoles;
        if (typeof roles === "string") {
            try { roles = JSON.parse(roles); } catch (_err) { roles = null; }
        }
        return Array.isArray(roles) ? (roles.find((r) => String(r.id) === roleId) || null) : null;
    }
    mpEnterpriseIdsOf(row) {
        const hit = this.mpRoleHit(row);
        if (!hit || hit.locked)
            return [];
        const raw = Array.isArray(hit.enterpriseIds) ? hit.enterpriseIds : [];
        const out = [];
        for (let i = 0; i < raw.length; i++) {
            const id = String(raw[i] || "").trim();
            if (id && out.indexOf(id) < 0)
                out.push(id);
        }
        return out;
    }
    mpProjectIdsOf(row) {
        const hit = this.mpRoleHit(row);
        if (!hit || hit.locked)
            return [];
        const raw = Array.isArray(hit.projectIds) ? hit.projectIds : [];
        const out = [];
        for (let i = 0; i < raw.length; i++) {
            const id = String(raw[i] || "").trim();
            if (id && out.indexOf(id) < 0)
                out.push(id);
        }
        return out;
    }
    mpAllPerms() {
        return ["overview.read", "logs.read", "study.read", "study.manage", "study.enterprises", "study.review", "mall.read", "mall.manage", "orders.read", "orders.manage", "finance.read", "finance.withdraw", "finance.commission", "fleet.drivers", "fleet.jobs", "media.read", "media.publish", "media.review", "media.cats", "users.read", "users.manage", "feedback.read", "feedback.manage", "access.manage", "settings.manage"];
    }
    mpCoarseExpand() {
        return {
            "overview.read": ["overview.read", "logs.read"],
            "logs.read": ["logs.read"],
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
            "access.manage": ["access.manage", "settings.manage"],
        };
    }
    expandMpPerms(raw) {
        const allow = new Set(this.mpAllPerms());
        const expand = this.mpCoarseExpand();
        const src = Array.isArray(raw) ? raw : [];
        const out = [];
        for (let i = 0; i < src.length; i++) {
            const key = String(src[i] || "").trim();
            if (!key) continue;
            if (expand[key]) {
                const kids = expand[key];
                for (let j = 0; j < kids.length; j++) {
                    if (allow.has(kids[j]) && out.indexOf(kids[j]) < 0) out.push(kids[j]);
                }
            }
            else if (allow.has(key) && out.indexOf(key) < 0) {
                out.push(key);
            }
        }
        return out;
    }
    mpPermissionsOf(row) {
        if (!row || !row.mpAccess)
            return [];
        const roleId = String(row.mpRole || "").trim();
        let roles = row.platformRoles;
        if (typeof roles === "string") {
            try { roles = JSON.parse(roles); } catch (_err) { roles = null; }
        }
        const hit = Array.isArray(roles) ? roles.find((r) => String(r.id) === roleId) : null;
        if (hit && hit.locked)
            return this.mpAllPerms().slice();
        if (hit && Array.isArray(hit.permissions) && hit.permissions.length)
            return this.expandMpPerms(hit.permissions);
        if (roleId === "SUPER_ADMIN")
            return this.mpAllPerms().slice();
        return [];
    }
    mpRoleNameOf(row) {
        const roleId = String(row && row.mpRole || "").trim();
        let roles = row && row.platformRoles;
        if (typeof roles === "string") {
            try { roles = JSON.parse(roles); } catch (_err) { roles = null; }
        }
        const hit = Array.isArray(roles) ? roles.find((r) => String(r.id) === roleId) : null;
        if (hit && hit.name)
            return String(hit.name);
        return roleId || "平台管理";
    }
    s3Client() {
        if (this.s3)
            return this.s3;
        const endpoint = String(this.config.get("S3_ENDPOINT") || "").trim();
        const region = String(this.config.get("S3_REGION") || "ap-northeast-1").trim();
        const accessKeyId = String(this.config.get("S3_ACCESS_KEY_ID") || "").trim();
        const secretAccessKey = String(this.config.get("S3_SECRET_ACCESS_KEY") || "").trim();
        if (!endpoint || !accessKeyId || !secretAccessKey)
            throw new common_1.ServiceUnavailableException("图片存储未配置");
        const forcePathStyle = String(this.config.get("S3_FORCE_PATH_STYLE") || "1") !== "0";
        this.s3 = new client_s3_1.S3Client({
            region,
            endpoint,
            forcePathStyle,
            credentials: { accessKeyId, secretAccessKey },
        });
        return this.s3;
    }
    avatarPublicUrl(key) {
        const prefix = String(this.config.get("S3_KEY_PREFIX") || "public/mqlt/media").replace(/^\/+|\/+$/g, "");
        const media = String(this.config.get("MEDIA_BASE_URL") || "").trim().replace(/\/+$/, "");
        const cdn = String(this.config.get("CDN_BASE_URL") || "http://127.0.0.1:8080").trim().replace(/\/+$/, "");
        const base = media || (cdn + "/media");
        const relative = key.startsWith(prefix + "/") ? key.slice(prefix.length + 1) : key.replace(/^public\/mqlt\/media\//, "");
        return base + "/" + relative;
    }
    avatarExtension(file) {
        const name = String((file && file.originalname) || "");
        const sourceExt = name.includes(".") ? ("." + name.split(".").pop().toLowerCase()) : "";
        if ([".jpg", ".jpeg", ".png", ".webp", ".gif"].indexOf(sourceExt) >= 0)
            return sourceExt === ".jpeg" ? ".jpg" : sourceExt;
        const buffer = file && file.buffer;
        if (buffer && buffer.length >= 8) {
            if (buffer[0] === 0x89 && buffer[1] === 0x50)
                return ".png";
            if (buffer[0] === 0xff && buffer[1] === 0xd8)
                return ".jpg";
            if (buffer[0] === 0x52 && buffer[1] === 0x49)
                return ".webp";
            if (buffer[0] === 0x47 && buffer[1] === 0x49)
                return ".gif";
        }
        throw new common_1.BadRequestException("仅支持 jpg/png/webp/gif 头像");
    }
};
exports.ConsoleAuthService = ConsoleAuthService;
exports.ConsoleAuthService = ConsoleAuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService, jwt_1.JwtService, config_1.ConfigService])
], ConsoleAuthService);
