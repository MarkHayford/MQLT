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
exports.AdminTokenGuard = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const jwt_1 = require("@nestjs/jwt");
const core_1 = require("@nestjs/core");
const prisma_service_1 = require("../prisma/prisma.service");
const admin_permissions_decorator_1 = require("./admin-permissions.decorator");
const admin_permissions_1 = require("./admin-permissions");
let AdminTokenGuard = class AdminTokenGuard {
    constructor(config, jwtService, prisma, reflector) {
        this.config = config;
        this.jwtService = jwtService;
        this.prisma = prisma;
        this.reflector = reflector;
    }
    async canActivate(context) {
        const request = context.switchToHttp().getRequest();
        const authorization = String(request.headers['authorization'] ?? '');
        const [type, token] = authorization.split(' ');
        if (type !== 'Bearer' || !token) {
            throw new common_1.UnauthorizedException('请先登录控制台');
        }
        let payload;
        try {
            payload = this.jwtService.verify(token);
        }
        catch {
            throw new common_1.UnauthorizedException('登录已失效，请重新登录');
        }
        if (!payload.sub) {
            throw new common_1.UnauthorizedException('登录凭证无效');
        }
        let access;
        if (payload.typ === 'console') {
            const P = admin_permissions_1.ADMIN_PERMISSIONS;
            if (payload.mpAccess) {
                const allow = new Set(admin_permissions_1.ALL_ADMIN_PERMISSIONS || Object.values(P));
                const raw = Array.isArray(payload.adminPermissions) ? payload.adminPermissions : [];
                let perms = [...new Set(raw.map((item) => String(item || '').trim()).filter((item) => allow.has(item)))];
                if (!perms.length) {
                    const role = (0, admin_permissions_1.normalizeAdminRole)(payload.mpRole || 'NONE');
                    perms = (0, admin_permissions_1.permissionsForRole)(role);
                }
                if (String(payload.mpRole || '') === 'SUPER_ADMIN')
                    perms = [...allow];
                access = {
                    isAdmin: perms.length > 0,
                    isSuperAdmin: String(payload.mpRole || '') === 'SUPER_ADMIN',
                    adminRole: payload.mpRole || 'NONE',
                    adminRoleLabel: payload.mpRoleName || '平台管理',
                    adminPermissions: perms,
                };
                if (!access.isAdmin) {
                    throw new common_1.UnauthorizedException('当前账号没有运维权限');
                }
                request.user = { ...payload, ...access };
            }
            else if (payload.merchantAccess) {
                if (!payload.enterpriseId) {
                    throw new common_1.UnauthorizedException('入驻企业账号未绑定企业');
                }
                const allow = new Set([
                    P.OVERVIEW_READ, P.STUDY_READ, P.STUDY_MANAGE,
                    P.MALL_READ, P.MALL_MANAGE, P.ORDERS_READ, P.ORDERS_MANAGE,
                    'staff.manage', 'logs.read',
                ]);
                const raw = Array.isArray(payload.merchantPermissions) ? payload.merchantPermissions : [];
                let perms = [...new Set(raw.map((item) => String(item || '').trim()).filter((item) => allow.has(item)))];
                if (!perms.length) {
                    perms = [...allow];
                }
                access = {
                    isAdmin: true,
                    isSuperAdmin: false,
                    adminRole: 'MERCHANT_ADMIN',
                    adminRoleLabel: payload.merchantRoleName || '入驻企业',
                    adminPermissions: perms,
                };
                request.user = { ...payload, ...access };
            }
            else {
                throw new common_1.UnauthorizedException('当前账号没有管理权限');
            }
        }
        else {
            const user = await this.prisma.user.findUnique({
                where: { id: payload.sub },
                select: { id: true, phone: true, isAdmin: true, adminRole: true, adminPermissions: true, status: true },
            });
            if (!user || user.status !== 'ACTIVE') {
                throw new common_1.UnauthorizedException('账号不可用');
            }
            const adminPhones = String(this.config.get('ADMIN_PHONES', ''))
                .split(',')
                .map((item) => item.trim())
                .filter(Boolean);
            access = (0, admin_permissions_1.buildAdminAccess)(user, adminPhones);
            if (!access.isAdmin) {
                throw new common_1.UnauthorizedException('当前账号没有控制台权限');
            }
            request.user = { ...payload, ...access };
        }
        const required = this.reflector.getAllAndOverride(admin_permissions_decorator_1.ADMIN_PERMISSIONS_KEY, [
            context.getHandler(),
            context.getClass(),
        ]) ?? [];
        if (required.length > 0 && !required.every((permission) => access.adminPermissions.includes(permission))) {
            throw new common_1.ForbiddenException('当前职位没有使用该功能的权限');
        }
        return true;
    }
};
exports.AdminTokenGuard = AdminTokenGuard;
exports.AdminTokenGuard = AdminTokenGuard = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService,
        jwt_1.JwtService,
        prisma_service_1.PrismaService,
        core_1.Reflector])
], AdminTokenGuard);
