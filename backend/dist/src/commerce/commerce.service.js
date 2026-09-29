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
exports.CommerceService = void 0;
const common_1 = require("@nestjs/common");
const crypto_1 = require("crypto");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../prisma/prisma.service");
const admin_permissions_1 = require("../admin/admin-permissions");

let CommerceService = class CommerceService {
    constructor(prisma) {
        this.prisma = prisma;
    }

    // ---------- 入口：判断角色 ----------
    async getAccess(userId) {
        await this.ensureSeedForUser(userId);
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user) throw new common_1.NotFoundException('用户不存在');

        const memberships = await this.prisma.enterpriseMember.findMany({
            where: { userId, status: 'ACTIVE' },
            include: { enterprise: true },
            orderBy: { createdAt: 'asc' },
        });
        const driver = await this.prisma.driverProfile.findUnique({
            where: { userId },
            include: { enterprise: true },
        });
        const isPlatformAdmin = user.isAdmin === true && String(user.adminRole || 'NONE') !== 'NONE';
        const adminAccess = isPlatformAdmin
            ? (0, admin_permissions_1.buildAdminAccess)(user, [])
            : null;

        const roles = [];
        if (memberships.length > 0) {
            roles.push({
                type: 'enterprise',
                label: '入驻企业',
                panel: 'enterprise',
                path: '/pages/commerce/enterprise-home',
                primary: true,
                badge: memberships.length > 1 ? memberships.length.toString() + '家' : '',
            });
        }
        if (driver != null) {
            roles.push({
                type: 'driver',
                label: '雇佣司机',
                panel: 'driver',
                path: '/pages/commerce/driver-home',
                primary: memberships.length === 0,
                badge: driver.status === 'ONLINE' ? '出车中' : '',
            });
        }
        if (isPlatformAdmin) {
            roles.push({
                type: 'platform',
                label: '小程序管理',
                panel: 'platform',
                path: '/pages/commerce/platform-home',
                primary: memberships.length === 0 && driver == null,
                badge: String(user.adminRole || ''),
            });
        }

        // 默认入口：企业 > 司机 > 平台
        let defaultRole = null;
        for (let i = 0; i < roles.length; i++) {
            if (roles[i].primary) { defaultRole = roles[i]; break; }
        }
        if (defaultRole == null && roles.length > 0) defaultRole = roles[0];

        return {
            hasAccess: roles.length > 0,
            roles,
            defaultRole,
            entryTitle: '商管中心',
            entrySubtitle: roles.length === 0
                ? '当前账号暂无商管权限'
                : (roles.length === 1 ? roles[0].label + '控制台' : '请选择身份进入'),
            enterprise: memberships.map((m) => this.serializeMembership(m)),
            driver: driver != null ? this.serializeDriver(driver) : null,
            platform: isPlatformAdmin
                ? {
                    isAdmin: true,
                    adminRole: user.adminRole,
                    adminRoleLabel: adminAccess?.adminRoleLabel || adminAccess?.roleLabel || "超级管理员",
                    permissions: adminAccess?.permissions || user.adminPermissions || [],
                }
                : null,
        };
    }

    // ---------- 企业面板 ----------
    async getEnterpriseDashboard(userId, enterpriseId) {
        const membership = await this.requireEnterpriseMember(userId, enterpriseId);
        const enterprise = membership.enterprise;
        const projects = await this.prisma.studyProject.findMany({
            where: { enterpriseId: enterprise.id },
            orderBy: { updatedAt: 'desc' },
        });
        // 兼容：若尚未绑定 enterpriseId，把该成员管理的项目也纳入
        if (projects.length === 0) {
            const adminLinks = await this.prisma.studyProjectAdmin.findMany({
                where: { userId },
                include: { project: true },
            });
            for (let i = 0; i < adminLinks.length; i++) {
                if (adminLinks[i].project) projects.push(adminLinks[i].project);
            }
        }
        const projectIds = projects.map((p) => p.id);
        const now = new Date();
        // Shanghai calendar day → UTC instant bounds (host TZ stays UTC)
        const dayStart = (function () {
            try {
                const key = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
                return new Date(key + 'T00:00:00.000+08:00');
            } catch (_e) {
                const ms = now.getTime() + 8 * 3600000;
                const x = new Date(ms);
                const key = x.getUTCFullYear() + '-' + String(x.getUTCMonth() + 1).padStart(2, '0') + '-' + String(x.getUTCDate()).padStart(2, '0');
                return new Date(key + 'T00:00:00.000+08:00');
            }
        })();

        const [bookingAgg, todayBookings, checkInsToday, reviews, activities, openPoints] = await Promise.all([
            projectIds.length
                ? this.prisma.studyBooking.groupBy({
                    by: ['status'],
                    where: { projectId: { in: projectIds }, userDeletedAt: null },
                    _count: { _all: true },
                    _sum: { amount: true },
                })
                : Promise.resolve([]),
            projectIds.length
                ? this.prisma.studyBooking.count({
                    where: {
                        projectId: { in: projectIds },
                        userDeletedAt: null,
                        createdAt: { gte: dayStart },
                        status: { in: [client_1.BookingStatus.BOOKED, client_1.BookingStatus.COMPLETED, client_1.BookingStatus.UNPAID] },
                    },
                })
                : Promise.resolve(0),
            projectIds.length
                ? this.prisma.studyRoutePointCheckIn.count({
                    where: { projectId: { in: projectIds }, checkedInAt: { gte: dayStart } },
                })
                : Promise.resolve(0),
            this.prisma.enterpriseReview.findMany({
                where: { enterpriseId: enterprise.id, status: 'PUBLISHED' },
                orderBy: { createdAt: 'desc' },
                take: 20,
            }),
            this.prisma.enterpriseActivity.findMany({
                where: { enterpriseId: enterprise.id },
                orderBy: [{ sortOrder: 'asc' }, { updatedAt: 'desc' }],
            }),
            projectIds.length
                ? this.prisma.studyRoutePoint.findMany({
                    where: { projectId: { in: projectIds }, enabled: true },
                    orderBy: [{ sortOrder: 'asc' }],
                    take: 50,
                })
                : Promise.resolve([]),
        ]);

        let revenueTotal = 0;
        let booked = 0;
        let completed = 0;
        let unpaid = 0;
        for (let i = 0; i < bookingAgg.length; i++) {
            const row = bookingAgg[i];
            const cnt = row._count?._all || 0;
            const sum = Number(row._sum?.amount || 0);
            if (row.status === client_1.BookingStatus.BOOKED) { booked += cnt; revenueTotal += sum; }
            if (row.status === client_1.BookingStatus.COMPLETED) { completed += cnt; revenueTotal += sum; }
            if (row.status === client_1.BookingStatus.UNPAID) unpaid += cnt;
        }

        // 实时在场：今日有入口签到且订单 BOOKED/COMPLETED
        const liveParticipants = projectIds.length
            ? await this.prisma.studyBooking.count({
                where: {
                    projectId: { in: projectIds },
                    userDeletedAt: null,
                    status: { in: [client_1.BookingStatus.BOOKED, client_1.BookingStatus.COMPLETED] },
                    checkedInAt: { gte: dayStart },
                },
            })
            : 0;

        const ratingAvg = reviews.length
            ? Math.round((reviews.reduce((s, r) => s + r.rating, 0) / reviews.length) * 10) / 10
            : Number(enterprise.ratingAvg || 5);

        return {
            enterprise: this.serializeEnterprise(enterprise),
            membership: { role: membership.role, title: membership.title },
            kpis: {
                projectCount: projects.length,
                todayOrders: todayBookings,
                liveOnSite: liveParticipants,
                checkInsToday,
                revenueTotal: Math.round(revenueTotal * 100) / 100,
                revenueText: '¥' + (Math.round(revenueTotal * 100) / 100).toFixed(2),
                booked,
                completed,
                unpaid,
                ratingAvg,
                ratingCount: reviews.length || enterprise.ratingCount || 0,
                openZoneCount: openPoints.length,
                activityCount: activities.filter((a) => a.enabled).length,
            },
            projects: projects.map((p) => this.serializeProjectBrief(p)),
            zones: openPoints.map((z) => ({
                id: z.id,
                projectId: z.projectId,
                title: z.title,
                enabled: z.enabled,
                sortOrder: z.sortOrder,
                checkRadius: z.checkRadius,
                description: String(z.description || '').replace(/\[zoneId=[^\]]+\]\s*/, '').slice(0, 80),
            })),
            activities: activities.map((a) => this.serializeActivity(a)),
            reviews: reviews.map((r) => this.serializeReview(r)),
            modules: [
                { key: 'live', title: '实时状况', desc: '在场人员与打卡进度', path: 'live' },
                { key: 'people', title: '人员管理', desc: '预约学员与签到名单', path: 'people' },
                { key: 'zones', title: '研学区域', desc: '开放状态与点位配置', path: 'zones' },
                { key: 'activities', title: '趣味活动', desc: '新增 / 编辑 / 上下架', path: 'activities' },
                { key: 'reviews', title: '客户评价', desc: '评分回复与展示', path: 'reviews' },
                { key: 'revenue', title: '营收概况', desc: '订单与收入统计', path: 'revenue' },
            ],
        };
    }

    async listEnterprisePeople(userId, enterpriseId, query = {}) {
        const membership = await this.requireEnterpriseMember(userId, enterpriseId);
        const projects = await this.enterpriseProjects(membership.enterpriseId, userId);
        const projectIds = projects.map((p) => p.id);
        if (projectIds.length === 0) return { total: 0, items: [] };
        const status = String(query.status || '').trim().toUpperCase();
        const where = {
            projectId: { in: projectIds },
            userDeletedAt: null,
        };
        if (status && status !== 'ALL') {
            where.status = status;
        }
        const rows = await this.prisma.studyBooking.findMany({
            where,
            include: { user: true, project: true },
            orderBy: [{ checkedInAt: 'desc' }, { createdAt: 'desc' }],
            take: Math.min(Number(query.limit || 100), 200),
        });
        return {
            total: rows.length,
            items: rows.map((b) => ({
                bookingId: b.id,
                projectId: b.projectId,
                projectTitle: b.project?.title || '',
                name: b.participantName || b.user?.realName || b.user?.nickname || '学员',
                phone: this.maskPhone(b.participantPhone || b.user?.phone || ''),
                studyNo: b.user?.studyNo || '',
                status: String(b.status || '').toLowerCase(),
                checkedInAt: b.checkedInAt,
                entranceCheckedIn: b.checkedInAt != null,
                amount: Number(b.amount || 0),
                createdAt: b.createdAt,
            })),
        };
    }

    async listEnterpriseLive(userId, enterpriseId) {
        const membership = await this.requireEnterpriseMember(userId, enterpriseId);
        const projects = await this.enterpriseProjects(membership.enterpriseId, userId);
        const out = [];
        for (let i = 0; i < projects.length; i++) {
            const p = projects[i];
            const [booked, onSite, checkIns, points] = await Promise.all([
                this.prisma.studyBooking.count({
                    where: { projectId: p.id, userDeletedAt: null, status: { in: [client_1.BookingStatus.BOOKED, client_1.BookingStatus.COMPLETED] } },
                }),
                this.prisma.studyBooking.count({
                    where: { projectId: p.id, userDeletedAt: null, checkedInAt: { not: null }, status: { in: [client_1.BookingStatus.BOOKED, client_1.BookingStatus.COMPLETED] } },
                }),
                this.prisma.studyRoutePointCheckIn.count({ where: { projectId: p.id } }),
                this.prisma.studyRoutePoint.count({ where: { projectId: p.id, enabled: true } }),
            ]);
            out.push({
                projectId: p.id,
                title: p.title,
                status: p.status,
                liveStage: p.liveStage,
                enrolled: p.enrolled,
                maxCapacity: p.maxCapacity,
                booked,
                onSite,
                checkIns,
                openPoints: points,
                occupancyRate: p.maxCapacity > 0 ? Math.round((onSite / p.maxCapacity) * 100) : 0,
            });
        }
        return { items: out, updatedAt: new Date().toISOString() };
    }

    async setZoneEnabled(userId, enterpriseId, pointId, enabled) {
        await this.requireEnterpriseMember(userId, enterpriseId);
        const point = await this.prisma.studyRoutePoint.findUnique({ where: { id: pointId }, include: { project: true } });
        if (!point) throw new common_1.NotFoundException('区域不存在');
        // 校验归属
        const ok = await this.userCanManageProject(userId, enterpriseId, point.projectId);
        if (!ok) throw new common_1.ForbiddenException('无权管理该区域');
        const updated = await this.prisma.studyRoutePoint.update({
            where: { id: pointId },
            data: { enabled: enabled === true || enabled === 'true' || enabled === 1 },
        });
        return { id: updated.id, title: updated.title, enabled: updated.enabled };
    }

    async saveActivity(userId, enterpriseId, body = {}) {
        await this.requireEnterpriseMember(userId, enterpriseId);
        const id = String(body.id || '').trim();
        const data = {
            enterpriseId,
            projectId: body.projectId ? String(body.projectId) : null,
            zoneId: body.zoneId ? String(body.zoneId) : null,
            title: String(body.title || '').trim() || '未命名活动',
            summary: String(body.summary || '').trim(),
            body: String(body.body || '').trim(),
            activityType: String(body.activityType || 'FUN'),
            enabled: body.enabled !== false && body.enabled !== 'false',
            openWeekdays: String(body.openWeekdays || '1,2,3,4,5,6,7'),
            openTimeStart: String(body.openTimeStart || '09:00'),
            openTimeEnd: String(body.openTimeEnd || '17:00'),
            capacity: Math.max(0, Number(body.capacity || 0) || 0),
            sortOrder: Number(body.sortOrder || 0) || 0,
            coverIcon: body.coverIcon ? String(body.coverIcon) : null,
        };
        let row;
        if (id) {
            const existed = await this.prisma.enterpriseActivity.findFirst({ where: { id, enterpriseId } });
            if (!existed) throw new common_1.NotFoundException('活动不存在');
            row = await this.prisma.enterpriseActivity.update({ where: { id }, data });
        } else {
            row = await this.prisma.enterpriseActivity.create({ data });
        }
        return this.serializeActivity(row);
    }

    async deleteActivity(userId, enterpriseId, activityId) {
        await this.requireEnterpriseMember(userId, enterpriseId);
        const existed = await this.prisma.enterpriseActivity.findFirst({ where: { id: activityId, enterpriseId } });
        if (!existed) throw new common_1.NotFoundException('活动不存在');
        await this.prisma.enterpriseActivity.delete({ where: { id: activityId } });
        return { ok: true, id: activityId };
    }

    async replyReview(userId, enterpriseId, reviewId, body = {}) {
        await this.requireEnterpriseMember(userId, enterpriseId);
        const review = await this.prisma.enterpriseReview.findFirst({ where: { id: reviewId, enterpriseId } });
        if (!review) throw new common_1.NotFoundException('评价不存在');
        const reply = String(body.reply || '').trim();
        if (!reply) throw new common_1.BadRequestException('回复内容不能为空');
        const updated = await this.prisma.enterpriseReview.update({
            where: { id: reviewId },
            data: { reply, repliedAt: new Date() },
        });
        return this.serializeReview(updated);
    }

    async getEnterpriseRevenue(userId, enterpriseId) {
        await this.requireEnterpriseMember(userId, enterpriseId);
        const projects = await this.enterpriseProjects(enterpriseId, userId);
        const projectIds = projects.map((p) => p.id);
        if (projectIds.length === 0) {
            return { total: 0, totalText: '¥0.00', byProject: [], byDay: [] };
        }
        const bookings = await this.prisma.studyBooking.findMany({
            where: {
                projectId: { in: projectIds },
                userDeletedAt: null,
                status: { in: [client_1.BookingStatus.BOOKED, client_1.BookingStatus.COMPLETED] },
            },
            select: { projectId: true, amount: true, paidAt: true, createdAt: true, rentalFee: true },
        });
        const byProjectMap = {};
        const byDayMap = {};
        let total = 0;
        for (let i = 0; i < bookings.length; i++) {
            const b = bookings[i];
            const amt = Number(b.amount || 0) + Number(b.rentalFee || 0);
            total += amt;
            byProjectMap[b.projectId] = (byProjectMap[b.projectId] || 0) + amt;
            const d = (b.paidAt || b.createdAt);
            const key = d instanceof Date ? d.toISOString().slice(0, 10) : String(d).slice(0, 10);
            byDayMap[key] = (byDayMap[key] || 0) + amt;
        }
        const titleMap = {};
        for (let i = 0; i < projects.length; i++) titleMap[projects[i].id] = projects[i].title;
        const byProject = Object.keys(byProjectMap).map((pid) => ({
            projectId: pid,
            title: titleMap[pid] || pid,
            amount: Math.round(byProjectMap[pid] * 100) / 100,
            amountText: '¥' + (Math.round(byProjectMap[pid] * 100) / 100).toFixed(2),
        })).sort((a, b) => b.amount - a.amount);
        const byDay = Object.keys(byDayMap).sort().slice(-14).map((day) => ({
            day,
            amount: Math.round(byDayMap[day] * 100) / 100,
            amountText: '¥' + (Math.round(byDayMap[day] * 100) / 100).toFixed(2),
        }));
        return {
            total: Math.round(total * 100) / 100,
            totalText: '¥' + (Math.round(total * 100) / 100).toFixed(2),
            orderCount: bookings.length,
            byProject,
            byDay,
        };
    }

    // ---------- 司机面板 ----------
    async attachDriverExtras(driver) {
        if (!driver) return driver;
        try {
            const rows = await this.prisma.$queryRawUnsafe(
                `SELECT city, "availableBalance", "pendingAmount", "withdrawnAmount", "baseLatitude", "baseLongitude" FROM "DriverProfile" WHERE id=$1`,
                driver.id
            );
            if (rows && rows[0]) {
                driver.city = String(rows[0].city || '');
                driver.baseLatitude = rows[0].baseLatitude != null ? Number(rows[0].baseLatitude) : null;
                driver.baseLongitude = rows[0].baseLongitude != null ? Number(rows[0].baseLongitude) : null;
                driver.availableBalance = Number(rows[0].availableBalance || 0);
                driver.pendingAmount = Number(rows[0].pendingAmount || 0);
                driver.withdrawnAmount = Number(rows[0].withdrawnAmount || 0);
            }
        }
        catch (_e) {
            driver.city = driver.city || '';
            driver.availableBalance = Number(driver.totalIncome || 0);
            driver.pendingAmount = 0;
            driver.withdrawnAmount = 0;
        }
        return driver;
    }
    async creditDriverWallet(driverId, amount) {
        const n = Number(amount) || 0;
        if (!driverId || n <= 0) return;
        try {
            await this.prisma.$executeRawUnsafe(
                `UPDATE "DriverProfile" SET "availableBalance" = COALESCE("availableBalance",0) + $1, "updatedAt"=NOW() WHERE id=$2`,
                n, driverId
            );
        }
        catch (_e) { }
    }
    async ensureDriverWalletCreditedColumn() {
        if (this._drvWalletCreditedCol) return;
        try {
            await this.prisma.$executeRawUnsafe(`ALTER TABLE "DriverJob" ADD COLUMN IF NOT EXISTS "walletCreditedAt" TIMESTAMP`);
        }
        catch (_e) { }
        this._drvWalletCreditedCol = true;
    }
    async ensureDriverCommissionColumn() {
        if (this._drvCommissionCol) return;
        try {
            await this.prisma.$executeRawUnsafe(`ALTER TABLE "DriverProfile" ADD COLUMN IF NOT EXISTS "commissionRate" DECIMAL(5,2)`);
        }
        catch (_e) { }
        this._drvCommissionCol = true;
    }
    async platformDriverCommission() {
        try {
            const row = await this.prisma.platformSetting.findUnique({ where: { key: 'feature.driverCommission' } });
            if (!row) return 0;
            const v = row.value;
            const n = typeof v === 'object' && v != null ? Number(v.value != null ? v.value : v) : Number(v);
            return Math.min(100, Math.max(0, Number.isFinite(n) ? n : 0));
        }
        catch (_e) {
            return 0;
        }
    }
    async driverCommissionRateOf(driverId) {
        await this.ensureDriverCommissionColumn();
        try {
            const rows = await this.prisma.$queryRawUnsafe(`SELECT "commissionRate" FROM "DriverProfile" WHERE id=$1`, driverId);
            if (rows && rows[0] && rows[0].commissionRate != null)
                return Math.min(100, Math.max(0, Number(rows[0].commissionRate)));
        }
        catch (_e) { }
        return this.platformDriverCommission();
    }
    /**
     * P0-4 single completion credit path: credit driver NET after commissionRate.
     * Idempotent via DriverJob.walletCreditedAt (raw column).
     * Returns { gross, rate, net, credited }.
     */
    async creditDriverJobCompletion(driverId, job, tx) {
        const client = tx || this.prisma;
        const gross = Number(job && job.price != null ? job.price : 0) || 0;
        const rate = driverId ? await this.driverCommissionRateOf(driverId) : 0;
        const net = Math.round(gross * (100 - rate) * 100) / 10000;
        const netFixed = Math.round(net * 100) / 100;
        if (!driverId || !job || !job.id) {
            return { gross, rate, net: netFixed, credited: false };
        }
        await this.ensureDriverWalletCreditedColumn();
        try {
            const rows = await client.$queryRawUnsafe(
                `SELECT "walletCreditedAt" FROM "DriverJob" WHERE id=$1`,
                job.id
            );
            if (rows && rows[0] && rows[0].walletCreditedAt) {
                return { gross, rate, net: netFixed, credited: false };
            }
        }
        catch (_e) { }
        if (netFixed > 0) {
            try {
                await client.$executeRawUnsafe(
                    `UPDATE "DriverProfile" SET "availableBalance" = COALESCE("availableBalance",0) + $1, "updatedAt"=NOW() WHERE id=$2`,
                    netFixed, driverId
                );
            }
            catch (_e) { }
        }
        try {
            await client.$executeRawUnsafe(
                `UPDATE "DriverJob" SET "walletCreditedAt"=NOW() WHERE id=$1 AND "walletCreditedAt" IS NULL`,
                job.id
            );
        }
        catch (_e) { }
        return { gross, rate, net: netFixed, credited: true };
    }

    async getDriverHome(userId) {
        const driver = await this.prisma.driverProfile.findUnique({
            where: { userId },
            include: { enterprise: true },
        });
        if (!driver) throw new common_1.ForbiddenException('当前账号不是雇佣司机');
        await this.attachDriverExtras(driver);
        const mine = await this.prisma.driverJob.findMany({
            where: {
                OR: [
                    { driverUserId: userId },
                    { driverId: driver.id },
                ],
            },
            orderBy: { createdAt: 'desc' },
            take: 80,
        });
        // P0-1: 指定单 OFFERED = 待确认（主路径）；OPEN 抢单池降为次要
        const pendingConfirm = mine.filter((j) => j.status === 'OFFERED');
        const openGrab = mine.filter((j) => j.status === 'OPEN');
        const offered = pendingConfirm.concat(openGrab);
        const active = mine.filter((j) => ['ACCEPTED', 'EN_ROUTE', 'ARRIVED', 'IN_TRIP'].indexOf(j.status) >= 0);
        const history = mine.filter((j) => j.status === 'COMPLETED' || j.status === 'CANCELLED').slice(0, 20);
        const todayStart = (function () {
            const now = new Date();
            try {
                const key = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
                return new Date(key + 'T00:00:00.000+08:00');
            } catch (_e) {
                const ms = now.getTime() + 8 * 3600000;
                const x = new Date(ms);
                const key = x.getUTCFullYear() + '-' + String(x.getUTCMonth() + 1).padStart(2, '0') + '-' + String(x.getUTCDate()).padStart(2, '0');
                return new Date(key + 'T00:00:00.000+08:00');
            }
        })();
        const todayDone = mine.filter((j) => j.status === 'COMPLETED' && j.completedAt && new Date(j.completedAt) >= todayStart);
        let todayIncome = 0;
        for (let i = 0; i < todayDone.length; i++) todayIncome += Number(todayDone[i].price || 0);
        const available = Number(driver.availableBalance != null ? driver.availableBalance : driver.totalIncome || 0);

        // V2 Phase A: RentalOrder 派单池 + 本人协商中
        let rentalPool = [];
        let rentalMine = [];
        try {
            await this.ensureRentalOrderTable();
            const openRows = await this.prisma.$queryRawUnsafe(
                `SELECT * FROM "RentalOrder" WHERE status='OPEN' ORDER BY "createdAt" DESC LIMIT 50`
            );
            for (let i = 0; i < (openRows || []).length; i++) {
                const r = openRows[i];
                if (driver.seatCount && Number(r.passengerCount || 1) > Number(driver.seatCount)) continue;
                rentalPool.push(await this.serializeRentalOrderLite(r));
            }
            await this.sweepRentalTimeoutsLite();
            const mineRows = await this.prisma.$queryRawUnsafe(
                `SELECT * FROM "RentalOrder" WHERE "driverId"=$1 AND status IN ('NEGOTIATING','PRICE_CONFIRMED','PAID','EN_ROUTE','ARRIVED','IN_TRIP') ORDER BY COALESCE("claimedAt","updatedAt") DESC LIMIT 30`,
                driver.id
            );
            for (let j = 0; j < (mineRows || []).length; j++) {
                rentalMine.push(await this.serializeRentalOrderLite(mineRows[j]));
            }
        } catch (_e) { }

        return {
            driver: this.serializeDriver(driver),
            kpis: {
                status: driver.status,
                statusLabel: this.driverStatusLabel(driver.status),
                acceptOrders: driver.acceptOrders,
                todayJobs: todayDone.length,
                todayIncome: Math.round(todayIncome * 100) / 100,
                todayIncomeText: '¥' + (Math.round(todayIncome * 100) / 100).toFixed(2),
                totalIncome: Number(driver.totalIncome || 0),
                completedJobs: driver.completedJobs,
                ratingAvg: Number(driver.ratingAvg || 5),
                openCount: offered.length,
                activeCount: active.length,
            },
            wallet: {
                availableAmount: available,
                availableText: '¥' + available.toFixed(2),
                pendingAmount: Number(driver.pendingAmount || 0),
                pendingText: '¥' + Number(driver.pendingAmount || 0).toFixed(2),
                withdrawnAmount: Number(driver.withdrawnAmount || 0),
                withdrawnText: '¥' + Number(driver.withdrawnAmount || 0).toFixed(2),
                minAmount: 1,
            },
            openJobs: offered.map((j) => this.serializeJob(j, true)),
            pendingConfirmJobs: pendingConfirm.map((j) => this.serializeJob(j, true)),
            openGrabJobs: openGrab.map((j) => this.serializeJob(j, true)),
            activeJobs: active.map((j) => this.serializeJob(j, true)),
            history: history.map((j) => this.serializeJob(j, true)),
            rentalOpenPool: rentalPool,
            rentalNegotiating: rentalMine.filter((x) => ['NEGOTIATING','PRICE_CONFIRMED'].indexOf(x.status) >= 0),
            rentalActive: rentalMine.filter((x) => ['PAID','EN_ROUTE','ARRIVED','IN_TRIP'].indexOf(x.status) >= 0),
            rentalMineAll: rentalMine,
        };
    }

    async setDriverOnline(userId, body = {}) {
        const driver = await this.prisma.driverProfile.findUnique({ where: { userId } });
        if (!driver) throw new common_1.ForbiddenException('当前账号不是雇佣司机');
        const online = body.online === true || body.online === 'true' || body.online === 1;
        const acceptOrders = body.acceptOrders == null
            ? driver.acceptOrders
            : (body.acceptOrders === true || body.acceptOrders === 'true' || body.acceptOrders === 1);
        const lat = body.latitude != null ? Number(body.latitude) : null;
        const lng = body.longitude != null ? Number(body.longitude) : null;
        const data = {
            status: online ? (driver.status === 'BUSY' ? 'BUSY' : 'ONLINE') : 'OFFLINE',
            acceptOrders: online ? acceptOrders : false,
            lastOnlineAt: online ? new Date() : driver.lastOnlineAt,
        };
        if (lat != null && lng != null && Number.isFinite(lat) && Number.isFinite(lng)) {
            data.lastLatitude = lat;
            data.lastLongitude = lng;
        }
        if (body.status === 'LEAVE') {
            data.status = 'OFFLINE';
            data.acceptOrders = false;
        }
        const updated = await this.prisma.driverProfile.update({ where: { userId }, data, include: { enterprise: true } });
        return this.serializeDriver(updated);
    }

    normalizeCityName(name) {
        return String(name || '').trim().replace(/市$/, '');
    }

    async updateDriverCity(userId, body = {}) {
        const driver = await this.prisma.driverProfile.findUnique({ where: { userId }, include: { enterprise: true } });
        if (!driver) throw new common_1.ForbiddenException('当前账号不是雇佣司机');
        const city = this.normalizeCityName(body.city || body.cityName || '');
        if (!city) throw new common_1.BadRequestException('请选择常驻城市');
        const lat = body.latitude != null ? Number(body.latitude) : (body.baseLatitude != null ? Number(body.baseLatitude) : null);
        const lng = body.longitude != null ? Number(body.longitude) : (body.baseLongitude != null ? Number(body.baseLongitude) : null);
        const hasCoords = lat != null && lng != null && Number.isFinite(lat) && Number.isFinite(lng);
        try {
            if (hasCoords) {
                await this.prisma.$executeRawUnsafe(
                    `UPDATE "DriverProfile" SET city=$1, "baseLatitude"=$2, "baseLongitude"=$3, "lastLatitude"=$2, "lastLongitude"=$3, "updatedAt"=NOW() WHERE id=$4`,
                    city, lat, lng, driver.id
                );
                driver.baseLatitude = lat;
                driver.baseLongitude = lng;
                driver.lastLatitude = lat;
                driver.lastLongitude = lng;
            } else {
                await this.prisma.$executeRawUnsafe(
                    `UPDATE "DriverProfile" SET city=$1, "updatedAt"=NOW() WHERE id=$2`,
                    city, driver.id
                );
            }
        } catch (_e) {
            // prisma fallback if raw fails
            const data = { city };
            if (hasCoords) {
                data.baseLatitude = lat;
                data.baseLongitude = lng;
                data.lastLatitude = lat;
                data.lastLongitude = lng;
            }
            try {
                await this.prisma.driverProfile.update({ where: { id: driver.id }, data });
            } catch (_e2) {
                throw new common_1.BadRequestException('更新服务城市失败');
            }
        }
        driver.city = city;
        await this.attachDriverExtras(driver);
        return this.serializeDriver(driver);
    }

    async acceptJob(userId, jobId) {
        const driver = await this.prisma.driverProfile.findUnique({ where: { userId } });
        if (!driver) throw new common_1.ForbiddenException('当前账号不是雇佣司机');
        if (driver.status === 'OFFLINE' || driver.status === 'LEAVE') {
            throw new common_1.BadRequestException('请先出车接单');
        }
        const job = await this.prisma.driverJob.findUnique({ where: { id: jobId } });
        if (!job) throw new common_1.NotFoundException('订单不存在');
        if (job.status !== 'OPEN' && job.status !== 'OFFERED') {
            throw new common_1.BadRequestException('该单不可接');
        }
        // 指定单：已指派司机只能由本人确认接单
        if (job.driverId && job.driverId !== driver.id) {
            throw new common_1.ForbiddenException('该单已指派给其他司机');
        }
        if (job.status === 'OPEN' && job.vehicleType && job.vehicleType !== driver.vehicleType) {
            throw new common_1.BadRequestException('车型不匹配');
        }
        const updated = await this.prisma.$transaction(async (tx) => {
            const row = await tx.driverJob.update({
                where: { id: jobId },
                data: {
                    status: 'ACCEPTED',
                    driverId: driver.id,
                    driverUserId: userId,
                    acceptedAt: new Date(),
                    offeredAt: job.offeredAt || new Date(),
                },
            });
            await tx.driverProfile.update({
                where: { id: driver.id },
                data: { status: 'BUSY' },
            });
            // 回写研学预约租车信息（若关联）
            if (job.bookingId) {
                try {
                    await tx.studyBooking.update({
                        where: { id: job.bookingId },
                        data: {
                            rentalDriverId: driver.id,
                            rentalDriverName: driver.realName,
                            rentalDriverPhone: driver.phone,
                            rentalDriverWechat: driver.wechat,
                            rentalVehicleName: driver.vehicleName,
                            rentalPlateNo: driver.plateNo,
                            rentalOptionId: driver.vehicleType,
                            rentalFee: job.price,
                        },
                    });
                } catch (_e) { /* booking may lack fields on old client - ignore */ }
            }
            return row;
        });
        return this.serializeJob(updated);
    }

    async updateJobStatus(userId, jobId, body = {}) {
        const driver = await this.prisma.driverProfile.findUnique({ where: { userId } });
        if (!driver) throw new common_1.ForbiddenException('当前账号不是雇佣司机');
        const job = await this.prisma.driverJob.findUnique({ where: { id: jobId } });
        if (!job || job.driverUserId !== userId) throw new common_1.ForbiddenException('无权操作该订单');
        const next = String(body.status || '').toUpperCase();
        const allowed = ['EN_ROUTE', 'ARRIVED', 'IN_TRIP', 'COMPLETED', 'CANCELLED'];
        if (allowed.indexOf(next) < 0) throw new common_1.BadRequestException('非法状态');
        const data = { status: next };
        const now = new Date();
        if (next === 'EN_ROUTE' || next === 'IN_TRIP') data.startedAt = job.startedAt || now;
        if (next === 'COMPLETED') {
            data.completedAt = now;
        }
        if (next === 'CANCELLED') {
            data.cancelledAt = now;
            data.cancelReason = String(body.reason || '司机取消').slice(0, 200);
        }
        if (next === 'COMPLETED' && String(job.status) === 'COMPLETED') {
            return this.serializeJob(job);
        }
        const updated = await this.prisma.$transaction(async (tx) => {
            const row = await tx.driverJob.update({ where: { id: jobId }, data });
            if (next === 'COMPLETED') {
                const credit = await this.creditDriverJobCompletion(driver.id, job, tx);
                const profileData = { status: driver.acceptOrders ? 'ONLINE' : 'OFFLINE' };
                if (credit.credited) {
                    profileData.completedJobs = { increment: 1 };
                    if (credit.net > 0) {
                        profileData.todayIncome = { increment: credit.net };
                        profileData.totalIncome = { increment: credit.net };
                    }
                }
                await tx.driverProfile.update({ where: { id: driver.id }, data: profileData });
            } else if (next === 'CANCELLED') {
                await tx.driverProfile.update({
                    where: { id: driver.id },
                    data: { status: driver.acceptOrders ? 'ONLINE' : 'OFFLINE' },
                });
            }
            return row;
        });
        return this.serializeJob(updated);
    }

    // ---------- 平台管理面板 ----------
    async getPlatformHome(userId) {
        const user = await this.requirePlatformAdmin(userId);
        const [
            userCount, projectCount, bookingCount, enterpriseCount, driverCount, openJobs, feedbackOpen, productCount,
        ] = await Promise.all([
            this.prisma.user.count(),
            this.prisma.studyProject.count(),
            this.prisma.studyBooking.count({ where: { userDeletedAt: null } }),
            this.prisma.enterprise.count({ where: { status: 'ACTIVE' } }),
            this.prisma.driverProfile.count(),
            this.prisma.driverJob.count({ where: { status: 'OPEN' } }),
            this.prisma.feedback.count({ where: { status: { in: ['submitted', 'open', 'pending'] } } }).catch(() => 0),
            this.prisma.product.count().catch(() => 0),
        ]);
        const settings = await this.prisma.platformSetting.findMany({ orderBy: { groupName: 'asc' } });
        const settingMap = {};
        for (let i = 0; i < settings.length; i++) {
            settingMap[settings[i].key] = settings[i].value;
        }
        // defaults
        if (!settingMap['app.name']) settingMap['app.name'] = '蒙启研学';
        if (!settingMap['app.servicePhone']) settingMap['app.servicePhone'] = '';
        if (!settingMap['feature.freeExplore']) settingMap['feature.freeExplore'] = true;
        if (!settingMap['feature.rental']) settingMap['feature.rental'] = true;
        if (!settingMap['feature.aiPlan']) settingMap['feature.aiPlan'] = true;

        return {
            admin: {
                userId: user.id,
                nickname: user.nickname,
                adminRole: user.adminRole,
                permissions: user.adminPermissions || [],
            },
            kpis: {
                userCount,
                projectCount,
                bookingCount,
                enterpriseCount,
                driverCount,
                openJobs,
                feedbackOpen,
                productCount,
            },
            modules: [
                { key: 'overview', title: '运营总览', desc: '核心指标与动态' },
                { key: 'enterprises', title: '入驻企业', desc: '企业审核与项目管理' },
                { key: 'drivers', title: '司机运力', desc: '司机档案与出车状态' },
                { key: 'study', title: '研学项目', desc: '项目上下架与配置' },
                { key: 'users', title: '用户管理', desc: '账号与权限' },
                { key: 'settings', title: '小程序设置', desc: '功能开关与客服配置' },
                { key: 'feedback', title: '反馈处理', desc: '用户意见与回复' },
                { key: 'notices', title: '公告动态', desc: '首页动态与浮层' },
            ],
            settings: settingMap,
            settingsList: settings.map((s) => ({
                key: s.key,
                label: s.label,
                groupName: s.groupName,
                value: s.value,
                updatedAt: s.updatedAt,
            })),
        };
    }

    async listPlatformEnterprises(userId) {
        await this.requirePlatformAdmin(userId);
        const rows = await this.prisma.enterprise.findMany({
            include: {
                _count: { select: { members: true, projects: true, drivers: true, reviews: true } },
            },
            orderBy: { createdAt: 'desc' },
        });
        return {
            items: rows.map((e) => ({
                ...this.serializeEnterprise(e),
                memberCount: e._count.members,
                projectCount: e._count.projects,
                driverCount: e._count.drivers,
                reviewCount: e._count.reviews,
            })),
        };
    }

    async listPlatformDrivers(userId) {
        await this.requirePlatformAdmin(userId);
        const rows = await this.prisma.driverProfile.findMany({
            include: { enterprise: true, user: true },
            orderBy: { updatedAt: 'desc' },
            take: 200,
        });
        return {
            items: rows.map((d) => ({
                ...this.serializeDriver(d),
                userNickname: d.user?.nickname || '',
                studyNo: d.user?.studyNo || '',
            })),
        };
    }

    async savePlatformSetting(userId, body = {}) {
        await this.requirePlatformAdmin(userId);
        const key = String(body.key || '').trim();
        if (!key) throw new common_1.BadRequestException('缺少配置键');
        const label = String(body.label || key);
        const groupName = String(body.groupName || 'general');
        const value = body.value == null ? {} : body.value;
        const row = await this.prisma.platformSetting.upsert({
            where: { key },
            create: { key, label, groupName, value, updatedBy: userId },
            update: { label, groupName, value, updatedBy: userId },
        });
        return { key: row.key, label: row.label, groupName: row.groupName, value: row.value, updatedAt: row.updatedAt };
    }

    async listPlatformProjects(userId) {
        await this.requirePlatformAdmin(userId);
        const rows = await this.prisma.studyProject.findMany({
            orderBy: { updatedAt: 'desc' },
            take: 100,
            include: { enterprise: true },
        });
        return {
            items: rows.map((p) => ({
                ...this.serializeProjectBrief(p),
                enterpriseName: p.enterprise?.name || '',
                enterpriseId: p.enterpriseId || '',
            })),
        };
    }

    // ---------- helpers ----------
    async requirePlatformAdmin(userId) {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user || !user.isAdmin || String(user.adminRole || 'NONE') === 'NONE') {
            throw new common_1.ForbiddenException('需要小程序管理人员权限');
        }
        return user;
    }

    async requireEnterpriseMember(userId, enterpriseId) {
        if (!enterpriseId) throw new common_1.BadRequestException('缺少企业 ID');
        const m = await this.prisma.enterpriseMember.findFirst({
            where: { userId, enterpriseId, status: 'ACTIVE' },
            include: { enterprise: true },
        });
        if (!m) throw new common_1.ForbiddenException('无权访问该企业');
        return m;
    }

    async enterpriseProjects(enterpriseId, userId) {
        let projects = await this.prisma.studyProject.findMany({
            where: { enterpriseId },
            orderBy: { updatedAt: 'desc' },
        });
        if (projects.length === 0) {
            const adminLinks = await this.prisma.studyProjectAdmin.findMany({
                where: { userId },
                include: { project: true },
            });
            projects = adminLinks.map((x) => x.project).filter(Boolean);
        }
        return projects;
    }

    async userCanManageProject(userId, enterpriseId, projectId) {
        const p = await this.prisma.studyProject.findUnique({ where: { id: projectId } });
        if (!p) return false;
        if (p.enterpriseId && p.enterpriseId === enterpriseId) return true;
        const admin = await this.prisma.studyProjectAdmin.findUnique({
            where: { projectId_userId: { projectId, userId } },
        }).catch(() => null);
        return admin != null;
    }

    serializeEnterprise(e) {
        return {
            id: e.id,
            name: e.name,
            shortName: e.shortName || e.name,
            licenseNo: e.licenseNo || '',
            contactName: e.contactName || '',
            contactPhone: e.contactPhone || '',
            address: e.address || '',
            status: e.status,
            ratingAvg: Number(e.ratingAvg || 5),
            ratingCount: e.ratingCount || 0,
            logoUrl: e.logoUrl || '',
            intro: e.intro || '',
        };
    }

    serializeMembership(m) {
        return {
            enterpriseId: m.enterpriseId,
            role: m.role,
            title: m.title || '',
            enterprise: this.serializeEnterprise(m.enterprise),
        };
    }

    serializeDriver(d) {
        const available = Number(d.availableBalance != null ? d.availableBalance : d.totalIncome || 0);
        return {
            id: d.id,
            userId: d.userId,
            realName: d.realName,
            phone: d.phone,
            wechat: d.wechat || '',
            city: d.city || '',
            vehicleType: d.vehicleType,
            vehicleName: d.vehicleName,
            plateNo: d.plateNo,
            seatCount: d.seatCount,
            basePrice: Number(d.basePrice || 0),
            status: d.status,
            statusLabel: this.driverStatusLabel(d.status),
            acceptOrders: d.acceptOrders === true,
            ratingAvg: Number(d.ratingAvg || 5),
            ratingCount: d.ratingCount || 0,
            completedJobs: d.completedJobs || 0,
            todayIncome: Number(d.todayIncome || 0),
            totalIncome: Number(d.totalIncome || 0),
            availableBalance: available,
            pendingAmount: Number(d.pendingAmount || 0),
            withdrawnAmount: Number(d.withdrawnAmount || 0),
            enterpriseId: d.enterpriseId || '',
            enterpriseName: d.enterprise?.name || '',
            lastLatitude: d.lastLatitude != null ? Number(d.lastLatitude) : null,
            lastLongitude: d.lastLongitude != null ? Number(d.lastLongitude) : null,
            baseLatitude: d.baseLatitude != null ? Number(d.baseLatitude) : null,
            baseLongitude: d.baseLongitude != null ? Number(d.baseLongitude) : null,
        };
    }

    serializeJob(j, showPhone = false) {
        return {
            id: j.id,
            jobNo: j.jobNo,
            status: j.status,
            statusLabel: this.jobStatusLabel(j.status),
            vehicleType: j.vehicleType,
            price: Number(j.price || 0),
            priceText: '¥' + Number(j.price || 0).toFixed(0),
            passengerCount: j.passengerCount,
            passengerName: j.passengerName || '',
            passengerPhone: showPhone ? (j.passengerPhone || '') : this.maskPhone(j.passengerPhone || ''),
            pickupAddress: j.pickupAddress || '',
            pickupLatitude: j.pickupLatitude != null ? Number(j.pickupLatitude) : null,
            pickupLongitude: j.pickupLongitude != null ? Number(j.pickupLongitude) : null,
            dropoffAddress: j.dropoffAddress || '',
            note: j.note || '',
            projectId: j.projectId || '',
            bookingId: j.bookingId || '',
            acceptedAt: j.acceptedAt,
            completedAt: j.completedAt,
            createdAt: j.createdAt,
        };
    }

    serializeProjectBrief(p) {
        return {
            id: p.id,
            title: p.title,
            subtitle: p.subtitle,
            status: p.status,
            liveStage: p.liveStage,
            enrolled: p.enrolled,
            maxCapacity: p.maxCapacity,
            price: Number(p.price || 0),
            location: p.location || '',
            openDate: p.openDate || '',
            gradientStart: p.gradientStart || '#1C384A',
            gradientEnd: p.gradientEnd || '#3F6782',
        };
    }

    serializeActivity(a) {
        return {
            id: a.id,
            enterpriseId: a.enterpriseId,
            projectId: a.projectId || '',
            zoneId: a.zoneId || '',
            title: a.title,
            summary: a.summary || '',
            body: a.body || '',
            activityType: a.activityType,
            enabled: a.enabled === true,
            openWeekdays: a.openWeekdays,
            openTimeStart: a.openTimeStart,
            openTimeEnd: a.openTimeEnd,
            capacity: a.capacity,
            sortOrder: a.sortOrder,
            coverIcon: a.coverIcon || '',
            updatedAt: a.updatedAt,
        };
    }

    serializeReview(r) {
        return {
            id: r.id,
            rating: r.rating,
            content: r.content || '',
            tags: r.tags || [],
            authorName: r.authorName || '学员',
            reply: r.reply || '',
            repliedAt: r.repliedAt,
            status: r.status,
            createdAt: r.createdAt,
            projectId: r.projectId || '',
        };
    }

    driverStatusLabel(s) {
        if (s === 'ONLINE') return '出车中';
        if (s === 'BUSY') return '服务中';
        if (s === 'LEAVE') return '收车';
        return '收车';
    }

    jobStatusLabel(s) {
        const map = {
            OPEN: '待抢单',
            OFFERED: '待确认',
            ACCEPTED: '已接单',
            EN_ROUTE: '前往上车点',
            ARRIVED: '已到达',
            IN_TRIP: '行程中',
            COMPLETED: '已完成',
            CANCELLED: '已取消',
        };
        return map[s] || s;
    }

    maskPhone(phone) {
        const p = String(phone || '');
        if (p.length >= 11) return p.slice(0, 3) + '****' + p.slice(-4);
        return p;
    }


    // ========== 企业深度：点位 / 题目 / 奖品 / 人员操作 ==========

    async getEnterpriseZones(userId, enterpriseId) {
        await this.requireEnterpriseMember(userId, enterpriseId);
        const projects = await this.enterpriseProjects(enterpriseId, userId);
        const projectIds = projects.map((p) => p.id);
        const titleMap = {};
        for (let i = 0; i < projects.length; i++) titleMap[projects[i].id] = projects[i].title;
        if (projectIds.length === 0) return { items: [], prizeProducts: await this.listPrizeProducts() };
        const points = await this.prisma.studyRoutePoint.findMany({
            where: { projectId: { in: projectIds } },
            include: {
                autoPrizeProduct: true,
                knowledgePrizeProduct: true,
            },
            orderBy: [{ projectId: 'asc' }, { sortOrder: 'asc' }, { createdAt: 'asc' }],
        });
        const checkInCounts = await this.prisma.studyRoutePointCheckIn.groupBy({
            by: ['routePointId'],
            where: { projectId: { in: projectIds } },
            _count: { _all: true },
        });
        const countMap = {};
        for (let i = 0; i < checkInCounts.length; i++) {
            countMap[checkInCounts[i].routePointId] = checkInCounts[i]._count?._all || 0;
        }
        return {
            items: points.map((pt) => this.serializeEnterpriseZone(pt, titleMap[pt.projectId] || '', countMap[pt.id] || 0)),
            prizeProducts: await this.listPrizeProducts(),
        };
    }

    async getEnterpriseZoneDetail(userId, enterpriseId, pointId) {
        await this.requireEnterpriseMember(userId, enterpriseId);
        const point = await this.prisma.studyRoutePoint.findUnique({
            where: { id: pointId },
            include: { autoPrizeProduct: true, knowledgePrizeProduct: true, project: true },
        });
        if (!point) throw new common_1.NotFoundException('点位不存在');
        const ok = await this.userCanManageProject(userId, enterpriseId, point.projectId);
        if (!ok) throw new common_1.ForbiddenException('无权管理该点位');
        const checkInCount = await this.prisma.studyRoutePointCheckIn.count({ where: { routePointId: pointId } });
        const knowledgeDone = await this.prisma.studyKnowledgeTaskCompletion.count({ where: { routePointId: pointId } });
        const recentCheckIns = await this.prisma.studyRoutePointCheckIn.findMany({
            where: { routePointId: pointId },
            include: { user: true, booking: true },
            orderBy: { checkedInAt: 'desc' },
            take: 30,
        });
        return {
            zone: this.serializeEnterpriseZone(point, point.project?.title || '', checkInCount),
            stats: { checkInCount, knowledgeDone },
            recentCheckIns: recentCheckIns.map((c) => ({
                id: c.id,
                userId: c.userId,
                name: c.booking?.participantName || c.user?.nickname || '学员',
                studyNo: c.user?.studyNo || '',
                checkedInAt: c.checkedInAt,
            })),
            prizeProducts: await this.listPrizeProducts(),
        };
    }

    async saveEnterpriseZone(userId, enterpriseId, body = {}) {
        await this.requireEnterpriseMember(userId, enterpriseId);
        const pointId = String(body.id || body.pointId || '').trim();
        const projectId = String(body.projectId || '').trim();
        if (!projectId && !pointId) throw new common_1.BadRequestException('缺少项目或点位');

        if (pointId) {
            const existed = await this.prisma.studyRoutePoint.findUnique({ where: { id: pointId } });
            if (!existed) throw new common_1.NotFoundException('点位不存在');
            const ok = await this.userCanManageProject(userId, enterpriseId, existed.projectId);
            if (!ok) throw new common_1.ForbiddenException('无权管理该点位');
            const data = await this.buildZoneUpdateData(body, existed);
            // 知识任务开启时做基本校验
            this.assertZoneKnowledgeCandidate({ ...existed, ...data });
            const updated = await this.prisma.studyRoutePoint.update({
                where: { id: pointId },
                data,
                include: { autoPrizeProduct: true, knowledgePrizeProduct: true, project: true },
            });
            return this.serializeEnterpriseZone(updated, updated.project?.title || '', 0);
        }

        // create
        const ok = await this.userCanManageProject(userId, enterpriseId, projectId);
        if (!ok) throw new common_1.ForbiddenException('无权在该项目创建点位');
        const maxSort = await this.prisma.studyRoutePoint.aggregate({
            where: { projectId },
            _max: { sortOrder: true },
        });
        const sortOrder = (maxSort._max.sortOrder || 0) + 1;
        const title = String(body.title || '').trim() || '新研学点';
        const desc = String(body.description || body.desc || '').trim() || title;
        const lat = Number(body.latitude ?? 39.91);
        const lng = Number(body.longitude ?? 116.40);
        const created = await this.prisma.studyRoutePoint.create({
            data: {
                projectId,
                title,
                description: desc,
                latitude: Number.isFinite(lat) ? lat : 39.91,
                longitude: Number.isFinite(lng) ? lng : 116.40,
                checkRadius: Math.max(20, Math.min(500, Number(body.checkRadius || 80) || 80)),
                checkInMode: String(body.checkInMode || 'location') === 'scan' ? 'scan' : 'location',
                sortOrder,
                enabled: body.enabled !== false && body.enabled !== 'false',
                knowledgeEnabled: false,
                autoGrantPrize: false,
                autoGrantPoints: false,
            },
            include: { autoPrizeProduct: true, knowledgePrizeProduct: true, project: true },
        });
        return this.serializeEnterpriseZone(created, created.project?.title || '', 0);
    }

    async buildZoneUpdateData(body, existed) {
        const data = {};
        if (body.title != null) data.title = String(body.title).trim() || existed.title;
        if (body.description != null || body.desc != null) {
            data.description = String(body.description ?? body.desc ?? '').trim() || existed.description;
        }
        if (body.latitude != null && Number.isFinite(Number(body.latitude))) data.latitude = Number(body.latitude);
        if (body.longitude != null && Number.isFinite(Number(body.longitude))) data.longitude = Number(body.longitude);
        if (body.checkRadius != null) data.checkRadius = Math.max(20, Math.min(500, Number(body.checkRadius) || 80));
        if (body.checkInMode != null) data.checkInMode = String(body.checkInMode) === 'scan' ? 'scan' : 'location';
        if (body.enabled != null) data.enabled = body.enabled === true || body.enabled === 'true' || body.enabled === 1;
        if (body.sortOrder != null) data.sortOrder = Number(body.sortOrder) || existed.sortOrder;

        // 打卡自动奖品/积分
        if (body.autoGrantPrize != null) data.autoGrantPrize = body.autoGrantPrize === true || body.autoGrantPrize === 'true';
        if (body.autoPrizeProductId != null) {
            const pid = String(body.autoPrizeProductId).trim();
            if (!pid) data.autoPrizeProductId = null;
            else {
                const prod = await this.prisma.product.findUnique({ where: { id: pid } });
                if (!prod || prod.canBePrize !== true) throw new common_1.BadRequestException('打卡奖品无效');
                data.autoPrizeProductId = pid;
            }
        }
        if (body.autoPrizeQuantity != null) data.autoPrizeQuantity = Math.max(1, Math.min(20, Number(body.autoPrizeQuantity) || 1));
        if (body.autoGrantPoints != null) data.autoGrantPoints = body.autoGrantPoints === true || body.autoGrantPoints === 'true';
        if (body.autoPointsAmount != null) data.autoPointsAmount = Math.max(0, Math.min(10000, Number(body.autoPointsAmount) || 0));

        // 知识任务
        if (body.knowledgeEnabled != null) data.knowledgeEnabled = body.knowledgeEnabled === true || body.knowledgeEnabled === 'true';
        if (body.knowledgeVideoTitle != null) data.knowledgeVideoTitle = String(body.knowledgeVideoTitle).trim() || null;
        if (body.knowledgeVideoUrl != null) data.knowledgeVideoUrl = String(body.knowledgeVideoUrl).trim() || null;

        let questions = null;
        if (body.knowledgeQuestions != null || body.questions != null) {
            questions = this.normalizeKnowledgeQuestions(body.knowledgeQuestions ?? body.questions);
            data.knowledgeQuestions = questions;
            if (questions.length > 0) {
                data.knowledgeQuestion = questions[0].question;
                data.knowledgeOptions = questions[0].options;
                data.knowledgeAnswerIndex = questions[0].answerIndex;
            } else {
                data.knowledgeQuestion = null;
                data.knowledgeOptions = [];
                data.knowledgeAnswerIndex = null;
            }
            data.knowledgeItems = [{
                title: String(body.knowledgeVideoTitle ?? data.knowledgeVideoTitle ?? existed.knowledgeVideoTitle ?? '').trim(),
                videoTitle: String(body.knowledgeVideoTitle ?? data.knowledgeVideoTitle ?? existed.knowledgeVideoTitle ?? '').trim(),
                videoUrl: String(body.knowledgeVideoUrl ?? data.knowledgeVideoUrl ?? existed.knowledgeVideoUrl ?? '').trim(),
                questions,
            }];
        }

        if (body.knowledgeGrantPrize != null) data.knowledgeGrantPrize = body.knowledgeGrantPrize === true || body.knowledgeGrantPrize === 'true';
        if (body.knowledgePrizeProductId != null) {
            const pid = String(body.knowledgePrizeProductId).trim();
            if (!pid) data.knowledgePrizeProductId = null;
            else {
                const prod = await this.prisma.product.findUnique({ where: { id: pid } });
                if (!prod || prod.canBePrize !== true) throw new common_1.BadRequestException('知识任务奖品无效');
                data.knowledgePrizeProductId = pid;
            }
        }
        if (body.knowledgePrizeQuantity != null) data.knowledgePrizeQuantity = Math.max(1, Math.min(20, Number(body.knowledgePrizeQuantity) || 1));
        if (body.knowledgeGrantPoints != null) data.knowledgeGrantPoints = body.knowledgeGrantPoints === true || body.knowledgeGrantPoints === 'true';
        if (body.knowledgePointsAmount != null) data.knowledgePointsAmount = Math.max(0, Math.min(10000, Number(body.knowledgePointsAmount) || 0));

        return data;
    }

    normalizeKnowledgeQuestions(raw) {
        let list = raw;
        if (typeof raw === 'string') {
            try { list = JSON.parse(raw); } catch (_e) { list = []; }
        }
        if (!Array.isArray(list)) return [];
        const out = [];
        for (let i = 0; i < list.length; i++) {
            const q = list[i] || {};
            const question = String(q.question || q.title || '').trim();
            let options = q.options;
            if (typeof options === 'string') {
                try { options = JSON.parse(options); } catch (_e) { options = String(options).split('|'); }
            }
            if (!Array.isArray(options)) options = [];
            const opts = options.map((o) => String(o ?? '').trim()).filter((o) => o.length > 0).slice(0, 6);
            let answerIndex = Number(q.answerIndex ?? q.answer ?? 0);
            if (!Number.isFinite(answerIndex) || answerIndex < 0) answerIndex = 0;
            if (answerIndex >= opts.length) answerIndex = 0;
            if (question.length === 0 || opts.length < 2) continue;
            out.push({ question, options: opts, answerIndex });
        }
        return out.slice(0, 20);
    }

    assertZoneKnowledgeCandidate(c) {
        if (c.knowledgeEnabled !== true) return;
        let questions = c.knowledgeQuestions;
        if (typeof questions === 'string') {
            try { questions = JSON.parse(questions); } catch (_e) { questions = []; }
        }
        if (!Array.isArray(questions) || questions.length === 0) {
            throw new common_1.BadRequestException('开启知识任务需至少配置 1 道题目');
        }
        const grantPrize = c.knowledgeGrantPrize === true;
        const grantPoints = c.knowledgeGrantPoints === true;
        if (!grantPrize && !grantPoints) {
            throw new common_1.BadRequestException('知识任务需设置积分或奖品奖励');
        }
        if (grantPrize && !String(c.knowledgePrizeProductId || '').trim()) {
            throw new common_1.BadRequestException('请选择知识任务奖品');
        }
        if (grantPoints && Number(c.knowledgePointsAmount || 0) <= 0) {
            throw new common_1.BadRequestException('请填写知识任务积分');
        }
    }

    async deleteEnterpriseZone(userId, enterpriseId, pointId) {
        await this.requireEnterpriseMember(userId, enterpriseId);
        const point = await this.prisma.studyRoutePoint.findUnique({ where: { id: pointId } });
        if (!point) throw new common_1.NotFoundException('点位不存在');
        const ok = await this.userCanManageProject(userId, enterpriseId, point.projectId);
        if (!ok) throw new common_1.ForbiddenException('无权管理该点位');
        await this.prisma.studyRoutePoint.update({
            where: { id: pointId },
            data: { enabled: false },
        });
        return { ok: true, id: pointId };
    }

    serializeEnterpriseZone(pt, projectTitle, checkInCount) {
        let questions = pt.knowledgeQuestions;
        if (typeof questions === 'string') {
            try { questions = JSON.parse(questions); } catch (_e) { questions = []; }
        }
        if (!Array.isArray(questions)) questions = [];
        const isService = this.isServiceZoneTitle(pt.title, pt.id, pt.description);
        return {
            id: pt.id,
            projectId: pt.projectId,
            projectTitle: projectTitle || '',
            title: pt.title,
            description: String(pt.description || '').replace(/\[zoneId=[^\]]+\]\s*/g, ''),
            latitude: Number(pt.latitude),
            longitude: Number(pt.longitude),
            checkRadius: pt.checkRadius || 80,
            checkInMode: pt.checkInMode || 'location',
            sortOrder: pt.sortOrder || 0,
            enabled: pt.enabled === true,
            isService,
            checkInCount: checkInCount || 0,
            // 打卡奖励
            autoGrantPrize: pt.autoGrantPrize === true,
            autoPrizeProductId: pt.autoPrizeProductId || '',
            autoPrizeProductName: pt.autoPrizeProduct?.name || '',
            autoPrizeQuantity: pt.autoPrizeQuantity || 1,
            autoGrantPoints: pt.autoGrantPoints === true,
            autoPointsAmount: pt.autoPointsAmount || 0,
            // 知识任务
            knowledgeEnabled: pt.knowledgeEnabled === true,
            knowledgeVideoTitle: pt.knowledgeVideoTitle || '',
            knowledgeVideoUrl: pt.knowledgeVideoUrl || '',
            knowledgeQuestions: questions.map((q) => ({
                question: q.question || '',
                options: Array.isArray(q.options) ? q.options : [],
                answerIndex: Number(q.answerIndex ?? 0) || 0,
            })),
            knowledgeQuestionCount: questions.length,
            knowledgeGrantPrize: pt.knowledgeGrantPrize === true,
            knowledgePrizeProductId: pt.knowledgePrizeProductId || '',
            knowledgePrizeProductName: pt.knowledgePrizeProduct?.name || '',
            knowledgePrizeQuantity: pt.knowledgePrizeQuantity || 1,
            knowledgeGrantPoints: pt.knowledgeGrantPoints === true,
            knowledgePointsAmount: pt.knowledgePointsAmount || 0,
            updatedAt: pt.updatedAt,
        };
    }

    isServiceZoneTitle(title, id, desc) {
        const t = String(title || '');
        const i = String(id || '');
        const d = String(desc || '');
        if (t.indexOf('接待') >= 0 || t.indexOf('离场') >= 0 || t.indexOf('出口') >= 0) return true;
        if (i === 'study-route-6-1' || i === 'study-route-6-6' || i.indexOf('exit') >= 0) return true;
        if (d.indexOf('[service=') >= 0) return true;
        return false;
    }

    async listPrizeProducts() {
        const products = await this.prisma.product.findMany({
            where: { canBePrize: true },
            orderBy: [{ category: 'asc' }, { name: 'asc' }],
        });
        return products.map((p) => ({
            id: p.id,
            name: p.name,
            category: p.category,
            stock: p.stock,
            icon: p.icon || p.imageUrl || '/static/icon-package.svg',
            imageUrl: p.imageUrl || '',
            status: String(p.status || ''),
        }));
    }

    async getEnterprisePrizes(userId, enterpriseId) {
        await this.requireEnterpriseMember(userId, enterpriseId);
        const projects = await this.enterpriseProjects(enterpriseId, userId);
        const projectIds = projects.map((p) => p.id);
        const products = await this.listPrizeProducts();
        const grants = projectIds.length
            ? await this.prisma.studyPrizeGrant.findMany({
                where: { projectId: { in: projectIds } },
                include: { product: true, user: true, booking: true, grantedBy: true },
                orderBy: { grantedAt: 'desc' },
                take: 100,
            })
            : [];
        // 点位绑定了哪些奖品
        const bound = projectIds.length
            ? await this.prisma.studyRoutePoint.findMany({
                where: {
                    projectId: { in: projectIds },
                    OR: [
                        { autoPrizeProductId: { not: null } },
                        { knowledgePrizeProductId: { not: null } },
                    ],
                },
                select: {
                    id: true, title: true, projectId: true,
                    autoGrantPrize: true, autoPrizeProductId: true, autoPrizeQuantity: true,
                    knowledgeGrantPrize: true, knowledgePrizeProductId: true, knowledgePrizeQuantity: true,
                },
            })
            : [];
        return {
            products,
            grants: grants.map((g) => ({
                id: g.id,
                productId: g.productId,
                productName: g.product?.name || '奖品',
                quantity: g.quantity,
                note: g.note || '',
                userName: g.booking?.participantName || g.user?.nickname || '',
                studyNo: g.user?.studyNo || '',
                grantedByName: g.grantedBy?.nickname || '',
                grantedAt: g.grantedAt,
                projectId: g.projectId,
            })),
            bindings: bound.map((b) => ({
                pointId: b.id,
                title: b.title,
                projectId: b.projectId,
                autoGrantPrize: b.autoGrantPrize,
                autoPrizeProductId: b.autoPrizeProductId || '',
                autoPrizeQuantity: b.autoPrizeQuantity,
                knowledgeGrantPrize: b.knowledgeGrantPrize,
                knowledgePrizeProductId: b.knowledgePrizeProductId || '',
                knowledgePrizeQuantity: b.knowledgePrizeQuantity,
            })),
        };
    }

    async grantEnterprisePrize(userId, enterpriseId, body = {}) {
        await this.requireEnterpriseMember(userId, enterpriseId);
        const bookingId = String(body.bookingId || '').trim();
        const productId = String(body.productId || '').trim();
        const quantity = Math.max(1, Math.min(20, Number(body.quantity || 1) || 1));
        const note = String(body.note || '企业控制台发放').trim().slice(0, 200);
        if (!bookingId) throw new common_1.BadRequestException('请选择学员订单');
        if (!productId) throw new common_1.BadRequestException('请选择奖品');
        const booking = await this.prisma.studyBooking.findUnique({
            where: { id: bookingId },
            include: { project: true, user: true },
        });
        if (!booking || booking.userDeletedAt) throw new common_1.NotFoundException('订单不存在');
        const ok = await this.userCanManageProject(userId, enterpriseId, booking.projectId);
        if (!ok) throw new common_1.ForbiddenException('无权向该学员发放奖品');
        const product = await this.prisma.product.findUnique({ where: { id: productId } });
        if (!product || product.canBePrize !== true) throw new common_1.BadRequestException('奖品无效');
        const grant = await this.prisma.$transaction(async (tx) => {
            const g = await tx.studyPrizeGrant.create({
                data: {
                    projectId: booking.projectId,
                    bookingId: booking.id,
                    userId: booking.userId,
                    productId: product.id,
                    grantedById: userId,
                    quantity,
                    note,
                },
                include: { product: true, user: true, booking: true, grantedBy: true },
            });
            if (product.stock != null && product.stock >= quantity) {
                await tx.product.update({
                    where: { id: product.id },
                    data: { stock: { decrement: quantity } },
                });
            }
            return g;
        });
        return {
            id: grant.id,
            productName: grant.product?.name || '',
            quantity: grant.quantity,
            userName: grant.booking?.participantName || grant.user?.nickname || '',
            grantedAt: grant.grantedAt,
        };
    }

    async grantEnterprisePoints(userId, enterpriseId, body = {}) {
        await this.requireEnterpriseMember(userId, enterpriseId);
        const bookingId = String(body.bookingId || '').trim();
        const amount = Math.max(1, Math.min(10000, Number(body.amount || 0) || 0));
        const title = String(body.title || '企业研学积分奖励').trim().slice(0, 60);
        if (!bookingId) throw new common_1.BadRequestException('请选择学员订单');
        if (amount <= 0) throw new common_1.BadRequestException('积分须大于 0');
        const booking = await this.prisma.studyBooking.findUnique({ where: { id: bookingId } });
        if (!booking || booking.userDeletedAt) throw new common_1.NotFoundException('订单不存在');
        const ok = await this.userCanManageProject(userId, enterpriseId, booking.projectId);
        if (!ok) throw new common_1.ForbiddenException('无权操作');
        const result = await this.prisma.$transaction(async (tx) => {
            const rec = await tx.pointRecord.create({
                data: {
                    userId: booking.userId,
                    sourceType: 'enterprise_grant',
                    sourceId: booking.id,
                    title,
                    amount,
                },
            });
            await tx.user.update({
                where: { id: booking.userId },
                data: { points: { increment: amount } },
            });
            return rec;
        });
        return { id: result.id, amount: result.amount, title: result.title, createdAt: result.createdAt };
    }

    async checkInEnterprisePerson(userId, enterpriseId, bookingId, action = 'checkin') {
        await this.requireEnterpriseMember(userId, enterpriseId);
        const booking = await this.prisma.studyBooking.findUnique({ where: { id: bookingId } });
        if (!booking || booking.userDeletedAt) throw new common_1.NotFoundException('订单不存在');
        const ok = await this.userCanManageProject(userId, enterpriseId, booking.projectId);
        if (!ok) throw new common_1.ForbiddenException('无权操作');
        if (action === 'cancel') {
            const updated = await this.prisma.studyBooking.update({
                where: { id: bookingId },
                data: { checkedInAt: null, checkedInById: null },
            });
            return { bookingId, entranceCheckedIn: false, checkedInAt: null };
        }
        const updated = await this.prisma.studyBooking.update({
            where: { id: bookingId },
            data: {
                checkedInAt: booking.checkedInAt || new Date(),
                checkedInById: userId,
                status: booking.status === client_1.BookingStatus.BOOKED || booking.status === client_1.BookingStatus.COMPLETED
                    ? client_1.BookingStatus.COMPLETED
                    : booking.status,
                completedAt: booking.completedAt || new Date(),
            },
        });
        return { bookingId, entranceCheckedIn: true, checkedInAt: updated.checkedInAt };
    }

    async checkInEnterprisePersonPoint(userId, enterpriseId, bookingId, routePointId, action = 'checkin') {
        await this.requireEnterpriseMember(userId, enterpriseId);
        const booking = await this.prisma.studyBooking.findUnique({ where: { id: bookingId } });
        if (!booking || booking.userDeletedAt) throw new common_1.NotFoundException('订单不存在');
        const ok = await this.userCanManageProject(userId, enterpriseId, booking.projectId);
        if (!ok) throw new common_1.ForbiddenException('无权操作');
        const point = await this.prisma.studyRoutePoint.findFirst({
            where: { id: routePointId, projectId: booking.projectId },
        });
        if (!point) throw new common_1.NotFoundException('点位不存在');
        if (action === 'cancel') {
            await this.prisma.studyRoutePointCheckIn.deleteMany({
                where: { bookingId, routePointId },
            });
            return { bookingId, routePointId, checkedIn: false };
        }
        const existed = await this.prisma.studyRoutePointCheckIn.findUnique({
            where: { bookingId_routePointId: { bookingId, routePointId } },
        });
        if (existed) return { bookingId, routePointId, checkedIn: true, already: true };
        await this.prisma.studyRoutePointCheckIn.create({
            data: {
                bookingId,
                userId: booking.userId,
                projectId: booking.projectId,
                routePointId,
            },
        });
        return { bookingId, routePointId, checkedIn: true, already: false };
    }

    async getPersonDetail(userId, enterpriseId, bookingId) {
        await this.requireEnterpriseMember(userId, enterpriseId);
        const booking = await this.prisma.studyBooking.findUnique({
            where: { id: bookingId },
            include: {
                user: true,
                project: true,
                routePointCheckIns: { include: { routePoint: true } },
                prizeGrants: { include: { product: true }, orderBy: { grantedAt: 'desc' } },
            },
        });
        if (!booking || booking.userDeletedAt) throw new common_1.NotFoundException('订单不存在');
        const ok = await this.userCanManageProject(userId, enterpriseId, booking.projectId);
        if (!ok) throw new common_1.ForbiddenException('无权查看');
        const points = await this.prisma.studyRoutePoint.findMany({
            where: { projectId: booking.projectId, enabled: true },
            orderBy: { sortOrder: 'asc' },
        });
        const checked = new Set((booking.routePointCheckIns || []).map((c) => c.routePointId));
        return {
            booking: {
                id: booking.id,
                name: booking.participantName || booking.user?.realName || booking.user?.nickname || '',
                phone: this.maskPhone(booking.participantPhone || booking.user?.phone || ''),
                studyNo: booking.user?.studyNo || '',
                status: String(booking.status || '').toLowerCase(),
                amount: Number(booking.amount || 0),
                projectId: booking.projectId,
                projectTitle: booking.project?.title || '',
                entranceCheckedIn: booking.checkedInAt != null,
                checkedInAt: booking.checkedInAt,
                createdAt: booking.createdAt,
            },
            points: points.filter((p) => !this.isServiceZoneTitle(p.title, p.id, p.description)).map((p) => ({
                id: p.id,
                title: p.title,
                checkedIn: checked.has(p.id),
            })),
            prizes: (booking.prizeGrants || []).map((g) => ({
                id: g.id,
                name: g.product?.name || '奖品',
                quantity: g.quantity,
                grantedAt: g.grantedAt,
            })),
        };
    }

    async updateEnterpriseProfile(userId, enterpriseId, body = {}) {
        await this.requireEnterpriseMember(userId, enterpriseId);
        const data = {};
        if (body.name != null) data.name = String(body.name).trim().slice(0, 80);
        if (body.shortName != null) data.shortName = String(body.shortName).trim().slice(0, 40);
        if (body.contactName != null) data.contactName = String(body.contactName).trim().slice(0, 40);
        if (body.contactPhone != null) data.contactPhone = String(body.contactPhone).trim().slice(0, 30);
        if (body.contactWechat != null) data.contactWechat = String(body.contactWechat).trim().slice(0, 40);
        if (body.address != null) data.address = String(body.address).trim().slice(0, 200);
        if (body.intro != null) data.intro = String(body.intro).trim().slice(0, 1000);
        const ent = await this.prisma.enterprise.update({ where: { id: enterpriseId }, data });
        return this.serializeEnterprise(ent);
    }

    async updateEnterpriseProject(userId, enterpriseId, projectId, body = {}) {
        await this.requireEnterpriseMember(userId, enterpriseId);
        const ok = await this.userCanManageProject(userId, enterpriseId, projectId);
        if (!ok) throw new common_1.ForbiddenException('无权管理该项目');
        const data = {};
        if (body.status != null) data.status = String(body.status).trim();
        if (body.maxCapacity != null) data.maxCapacity = Math.max(1, Number(body.maxCapacity) || 1);
        if (body.contactPhone != null) data.contactPhone = String(body.contactPhone).trim();
        if (body.contactWechat != null) data.contactWechat = String(body.contactWechat).trim();
        if (body.subtitle != null) data.subtitle = String(body.subtitle).trim();
        if (body.openDate != null) data.openDate = String(body.openDate).trim();
        const p = await this.prisma.studyProject.update({ where: { id: projectId }, data });
        return this.serializeProjectBrief(p);
    }


    // ========== 平台深度管理 ==========
    async platformCreateDriver(userId, body = {}) {
        await this.requirePlatformAdmin(userId);
        const targetUserId = String(body.userId || '').trim();
        const phone = String(body.phone || '').trim();
        let user = null;
        if (targetUserId) user = await this.prisma.user.findUnique({ where: { id: targetUserId } });
        else if (phone) user = await this.prisma.user.findFirst({ where: { phone } });
        if (!user) throw new common_1.NotFoundException('请先让司机完成小程序登录，再用手机号绑定');
        const existed = await this.prisma.driverProfile.findUnique({ where: { userId: user.id } });
        if (existed) throw new common_1.BadRequestException('该用户已是司机');
        const entId = String(body.enterpriseId || '').trim() || null;
        const row = await this.prisma.driverProfile.create({
            data: {
                userId: user.id,
                enterpriseId: entId,
                realName: String(body.realName || user.realName || user.nickname || '司机').trim(),
                phone: phone || user.phone || '',
                wechat: String(body.wechat || '').trim() || null,
                vehicleType: String(body.vehicleType || 'van7'),
                vehicleName: String(body.vehicleName || '7座商务'),
                plateNo: String(body.plateNo || '待填写'),
                seatCount: Math.max(2, Number(body.seatCount || 7) || 7),
                basePrice: Number(body.basePrice || 0) || 0,
                status: 'OFFLINE',
                acceptOrders: true,
            },
            include: { enterprise: true, user: true },
        });
        const city = String(body.city || '').trim().replace(/市$/, '');
        if (city) {
            try { await this.prisma.$executeRawUnsafe(`UPDATE "DriverProfile" SET city=$1 WHERE id=$2`, city, row.id); } catch (_e) { }
            row.city = city;
        }
        return this.serializeDriver(row);
    }

    async platformUpdateDriver(userId, driverId, body = {}) {
        await this.requirePlatformAdmin(userId);
        const data = {};
        if (body.realName != null) data.realName = String(body.realName).trim();
        if (body.phone != null) data.phone = String(body.phone).trim();
        if (body.wechat != null) data.wechat = String(body.wechat).trim();
        if (body.vehicleType != null) data.vehicleType = String(body.vehicleType);
        if (body.vehicleName != null) data.vehicleName = String(body.vehicleName);
        if (body.plateNo != null) data.plateNo = String(body.plateNo);
        if (body.seatCount != null) data.seatCount = Number(body.seatCount) || 7;
        if (body.basePrice != null) data.basePrice = Number(body.basePrice) || 0;
        if (body.status != null) data.status = String(body.status);
        if (body.acceptOrders != null) data.acceptOrders = body.acceptOrders === true || body.acceptOrders === 'true';
        if (body.enterpriseId != null) data.enterpriseId = String(body.enterpriseId).trim() || null;
        const row = await this.prisma.driverProfile.update({
            where: { id: driverId },
            data,
            include: { enterprise: true, user: true },
        });
        if (body.city != null) {
            const city = String(body.city || '').trim().replace(/市$/, '');
            try { await this.prisma.$executeRawUnsafe(`UPDATE "DriverProfile" SET city=$1 WHERE id=$2`, city, row.id); } catch (_e) { }
            row.city = city;
        }
        await this.attachDriverExtras(row);
        return this.serializeDriver(row);
    }

    async platformUpdateEnterprise(userId, enterpriseId, body = {}) {
        await this.requirePlatformAdmin(userId);
        const data = {};
        if (body.name != null) data.name = String(body.name).trim();
        if (body.shortName != null) data.shortName = String(body.shortName).trim();
        if (body.status != null) data.status = String(body.status);
        if (body.contactName != null) data.contactName = String(body.contactName).trim();
        if (body.contactPhone != null) data.contactPhone = String(body.contactPhone).trim();
        if (body.address != null) data.address = String(body.address).trim();
        if (body.intro != null) data.intro = String(body.intro).trim();
        const ent = await this.prisma.enterprise.update({ where: { id: enterpriseId }, data });
        return this.serializeEnterprise(ent);
    }

    async platformUpdateProject(userId, projectId, body = {}) {
        await this.requirePlatformAdmin(userId);
        const data = {};
        if (body.status != null) data.status = String(body.status).trim();
        if (body.enterpriseId != null) data.enterpriseId = String(body.enterpriseId).trim() || null;
        if (body.maxCapacity != null) data.maxCapacity = Math.max(1, Number(body.maxCapacity) || 1);
        if (body.title != null) data.title = String(body.title).trim();
        if (body.subtitle != null) data.subtitle = String(body.subtitle).trim();
        const p = await this.prisma.studyProject.update({ where: { id: projectId }, data, include: { enterprise: true } });
        return { ...this.serializeProjectBrief(p), enterpriseName: p.enterprise?.name || '', enterpriseId: p.enterpriseId || '' };
    }

    async listPlatformUsers(userId, query = {}) {
        await this.requirePlatformAdmin(userId);
        const keyword = String(query.keyword || query.q || '').trim();
        const where = {};
        if (keyword) {
            where.OR = [
                { nickname: { contains: keyword } },
                { phone: { contains: keyword } },
                { studyNo: { contains: keyword } },
                { realName: { contains: keyword } },
            ];
        }
        const rows = await this.prisma.user.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            take: Math.min(Number(query.limit || 50), 100),
            select: {
                id: true, nickname: true, phone: true, studyNo: true, realName: true,
                points: true, isAdmin: true, adminRole: true, status: true, createdAt: true,
            },
        });
        return {
            items: rows.map((u) => ({
                id: u.id,
                nickname: u.nickname,
                phone: this.maskPhone(u.phone || ''),
                studyNo: u.studyNo,
                realName: u.realName || '',
                points: u.points,
                isAdmin: u.isAdmin === true,
                adminRole: u.adminRole || 'NONE',
                status: u.status,
                createdAt: u.createdAt,
            })),
        };
    }

    async platformUpdateUser(adminUserId, targetUserId, body = {}) {
        await this.requirePlatformAdmin(adminUserId);
        const data = {};
        if (body.isAdmin != null) data.isAdmin = body.isAdmin === true || body.isAdmin === 'true';
        if (body.adminRole != null) {
            data.adminRole = String(body.adminRole).trim() || 'NONE';
            if (data.adminRole !== 'NONE') data.isAdmin = true;
            if (data.adminRole === 'NONE') data.isAdmin = false;
        }
        if (body.status != null) data.status = String(body.status);
        const u = await this.prisma.user.update({
            where: { id: targetUserId },
            data,
            select: { id: true, nickname: true, isAdmin: true, adminRole: true, status: true },
        });
        return u;
    }

    async listPlatformFeedback(userId) {
        await this.requirePlatformAdmin(userId);
        const rows = await this.prisma.feedback.findMany({
            orderBy: { createdAt: 'desc' },
            take: 100,
            include: { user: true },
        });
        return {
            items: rows.map((f) => ({
                id: f.id,
                type: f.type,
                content: f.content,
                status: f.status,
                reply: f.reply || '',
                contactPhone: f.contactPhone || '',
                userName: f.user?.nickname || '匿名',
                createdAt: f.createdAt,
            })),
        };
    }

    async replyPlatformFeedback(userId, feedbackId, body = {}) {
        await this.requirePlatformAdmin(userId);
        const reply = String(body.reply || '').trim();
        if (!reply) throw new common_1.BadRequestException('回复不能为空');
        const f = await this.prisma.feedback.update({
            where: { id: feedbackId },
            data: { reply, status: 'replied', updatedAt: new Date() },
        });
        return { id: f.id, reply: f.reply, status: f.status };
    }

    async listPlatformNotices(userId) {
        await this.requirePlatformAdmin(userId);
        const rows = await this.prisma.studyNotice.findMany({
            orderBy: { publishedAt: 'desc' },
            take: 50,
        });
        return {
            items: rows.map((n) => ({
                id: n.id,
                title: n.title,
                content: n.content,
                type: n.type,
                publisher: n.publisher || '',
                projectId: n.projectId || '',
                publishedAt: n.publishedAt,
            })),
        };
    }

    async savePlatformNotice(userId, body = {}) {
        await this.requirePlatformAdmin(userId);
        const id = String(body.id || '').trim();
        const data = {
            title: String(body.title || '').trim() || '未命名公告',
            content: String(body.content || '').trim(),
            type: String(body.type || 'notice'),
            publisher: String(body.publisher || '平台运营').trim(),
            projectId: body.projectId ? String(body.projectId) : null,
            paragraphs: Array.isArray(body.paragraphs) ? body.paragraphs.map(String) : [],
        };
        if (id) {
            const n = await this.prisma.studyNotice.update({ where: { id }, data });
            return { id: n.id, title: n.title, content: n.content, type: n.type, publishedAt: n.publishedAt };
        }
        const n = await this.prisma.studyNotice.create({ data });
        return { id: n.id, title: n.title, content: n.content, type: n.type, publishedAt: n.publishedAt };
    }

    async deletePlatformNotice(userId, noticeId) {
        await this.requirePlatformAdmin(userId);
        await this.prisma.studyNotice.delete({ where: { id: noticeId } });
        return { ok: true, id: noticeId };
    }

    async ensureSeedForUser(userId) {
        // 已取消：不再在空库时自动创建演示企业/活动/评价/平台设置
        return;
    }

    async getDriverWallet(userId) {
        const driver = await this.prisma.driverProfile.findUnique({ where: { userId } });
        if (!driver) throw new common_1.ForbiddenException('当前账号不是雇佣司机');
        await this.attachDriverExtras(driver);
        const available = Number(driver.availableBalance != null ? driver.availableBalance : driver.totalIncome || 0);
        const pending = Number(driver.pendingAmount || 0);
        const withdrawn = Number(driver.withdrawnAmount || 0);
        return {
            availableAmount: available,
            availableText: '¥' + available.toFixed(2),
            pendingAmount: pending,
            pendingText: '¥' + pending.toFixed(2),
            withdrawnAmount: withdrawn,
            withdrawnText: '¥' + withdrawn.toFixed(2),
            minAmount: 1,
        };
    }

    async requestDriverWithdraw(userId, body = {}) {
        const driver = await this.prisma.driverProfile.findUnique({ where: { userId } });
        if (!driver) throw new common_1.ForbiddenException('当前账号不是雇佣司机');
        await this.attachDriverExtras(driver);
        const amount = Math.round(Number(body.amount || 0) * 100) / 100;
        if (!Number.isFinite(amount) || amount < 1) {
            throw new common_1.BadRequestException('最低提现 ¥1');
        }
        const available = Number(driver.availableBalance != null ? driver.availableBalance : 0);
        if (amount > available) throw new common_1.BadRequestException('可提现余额不足');
        const channel = String(body.channel || 'WECHAT').trim().toUpperCase() || 'WECHAT';
        const id = 'wd_' + (0, crypto_1.randomUUID)();
        await this.prisma.$executeRawUnsafe(
            `INSERT INTO "DriverWithdraw"
              (id, "driverId", "userId", amount, status, channel, "accountName", "bankName", "bankAccount", remark, "reviewNote", "createdAt", "updatedAt")
             VALUES ($1,$2,$3,$4,'PENDING',$5,$6,$7,$8,$9,'',NOW(),NOW())`,
            id, driver.id, userId, amount, channel,
            String(body.accountName || '').trim(),
            String(body.bankName || '').trim(),
            String(body.bankAccount || '').trim(),
            String(body.remark || '').trim()
        );
        await this.prisma.$executeRawUnsafe(
            `UPDATE "DriverProfile"
             SET "availableBalance" = COALESCE("availableBalance",0) - $1,
                 "pendingAmount" = COALESCE("pendingAmount",0) + $1,
                 "updatedAt"=NOW()
             WHERE id=$2`,
            amount, driver.id
        );
        return { id, amount, status: 'PENDING', statusLabel: '审核中' };
    }

    async listDriverWithdrawals(userId) {
        const driver = await this.prisma.driverProfile.findUnique({ where: { userId } });
        if (!driver) throw new common_1.ForbiddenException('当前账号不是雇佣司机');
        const rows = await this.prisma.$queryRawUnsafe(
            `SELECT * FROM "DriverWithdraw" WHERE "driverId"=$1 ORDER BY "createdAt" DESC LIMIT 50`,
            driver.id
        );
        const label = (status) => {
            const s = String(status || '').toUpperCase();
            if (s === 'PENDING') return '审核中';
            if (s === 'APPROVED') return '处理中';
            if (s === 'PAID' || s === 'SUCCESS') return '已到账';
            if (s === 'REJECTED') return '已拒绝';
            if (s === 'CANCELLED') return '已取消';
            return s || '处理中';
        };
        const channelLabel = (channel) => {
            const c = String(channel || '').toUpperCase();
            if (c === 'WECHAT') return '微信零钱';
            if (c === 'BANK') return '银行卡';
            if (c === 'ALIPAY') return '支付宝';
            return channel || '微信零钱';
        };
        return (rows || []).map((row) => ({
            id: row.id,
            amount: Number(row.amount || 0),
            amountText: '¥' + Number(row.amount || 0).toFixed(2),
            status: String(row.status || 'PENDING').toUpperCase(),
            statusLabel: label(row.status),
            channel: row.channel || 'WECHAT',
            channelLabel: channelLabel(row.channel),
            createdAt: row.createdAt,
            timeText: row.createdAt ? String(row.createdAt).slice(0, 16).replace('T', ' ') : '',
        }));
    }

    async ensureRentalOrderTable() {
        if (this._rentalOrderTableReady) return;
        try {
            await this.prisma.$executeRawUnsafe(`
                CREATE TABLE IF NOT EXISTS "RentalOrder" (
                  id TEXT PRIMARY KEY,
                  "orderNo" TEXT UNIQUE NOT NULL,
                  "userId" TEXT NOT NULL,
                  "projectId" TEXT NOT NULL,
                  "bookingId" TEXT,
                  "travelDate" TIMESTAMP,
                  "dateFrom" TIMESTAMP,
                  "dateTo" TIMESTAMP,
                  "passengerCount" INTEGER DEFAULT 1,
                  "vehicleRange" TEXT,
                  "pickupAddress" TEXT,
                  "pickupLatitude" DECIMAL(10,6),
                  "pickupLongitude" DECIMAL(10,6),
                  remark TEXT,
                  status TEXT DEFAULT 'OPEN',
                  "driverId" TEXT,
                  "driverUserId" TEXT,
                  "claimedAt" TIMESTAMP,
                  "refPrice" DECIMAL(10,2),
                  "offeredPrice" DECIMAL(10,2),
                  "agreedPrice" DECIMAL(10,2),
                  "paidAt" TIMESTAMP,
                  "cancelledAt" TIMESTAMP,
                  "cancelReason" TEXT,
                  "createdAt" TIMESTAMP DEFAULT NOW(),
                  "updatedAt" TIMESTAMP DEFAULT NOW()
                )`);
            await this.prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "RentalOrder_status_createdAt_idx" ON "RentalOrder" (status, "createdAt")`);
            await this.prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "RentalOrder_userId_createdAt_idx" ON "RentalOrder" ("userId", "createdAt")`);
            await this.prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "RentalOrder_driverId_status_idx" ON "RentalOrder" ("driverId", status)`);
            await this.prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "RentalOrder_projectId_idx" ON "RentalOrder" ("projectId")`);
            await this.prisma.$executeRawUnsafe(`ALTER TABLE "RentalOrder" ADD COLUMN IF NOT EXISTS "priceConfirmedAt" TIMESTAMP`);
            await this.prisma.$executeRawUnsafe(`
                CREATE TABLE IF NOT EXISTS "RentalChatMessage" (
                  id TEXT PRIMARY KEY,
                  "orderId" TEXT NOT NULL,
                  "senderType" TEXT NOT NULL,
                  "senderId" TEXT,
                  content TEXT NOT NULL,
                  "createdAt" TIMESTAMP DEFAULT NOW()
                )`);
            await this.prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "RentalChatMessage_orderId_createdAt_idx" ON "RentalChatMessage" ("orderId", "createdAt")`);
        } catch (_e) { }
        this._rentalOrderTableReady = true;
    }

    async appendRentalSystemMessage(orderId, content) {
        try {
            await this.ensureRentalOrderTable();
            const id = require('crypto').randomUUID().replace(/-/g, '');
            await this.prisma.$executeRawUnsafe(
                `INSERT INTO "RentalChatMessage" (id, "orderId", "senderType", "senderId", content, "createdAt") VALUES ($1,$2,'system',NULL,$3,NOW())`,
                id, orderId, String(content || '').slice(0, 500)
            );
        } catch (_e) { }
    }

    async sweepRentalTimeoutsLite() {
        try {
            await this.ensureRentalOrderTable();
            const now = Date.now();
            const neg = await this.prisma.$queryRawUnsafe(`SELECT id, "claimedAt" FROM "RentalOrder" WHERE status='NEGOTIATING' LIMIT 40`);
            for (let i = 0; i < (neg || []).length; i++) {
                const r = neg[i];
                if (!r.claimedAt) continue;
                if (now - new Date(r.claimedAt).getTime() > 60 * 60 * 1000) {
                    await this.prisma.$executeRawUnsafe(
                        `UPDATE "RentalOrder" SET status='OPEN', "driverId"=NULL, "driverUserId"=NULL, "claimedAt"=NULL, "offeredPrice"=NULL, "agreedPrice"=NULL, "priceConfirmedAt"=NULL, "updatedAt"=NOW() WHERE id=$1 AND status='NEGOTIATING'`,
                        r.id
                    );
                    await this.appendRentalSystemMessage(r.id, '协商超时，订单已退回派单池');
                }
            }
            const conf = await this.prisma.$queryRawUnsafe(`SELECT id, "priceConfirmedAt", "updatedAt" FROM "RentalOrder" WHERE status='PRICE_CONFIRMED' LIMIT 40`);
            for (let j = 0; j < (conf || []).length; j++) {
                const r = conf[j];
                const base = r.priceConfirmedAt || r.updatedAt;
                if (!base) continue;
                if (now - new Date(base).getTime() > 2 * 60 * 60 * 1000) {
                    await this.prisma.$executeRawUnsafe(
                        `UPDATE "RentalOrder" SET status='CANCELLED', "cancelledAt"=NOW(), "cancelReason"='确认价后超时未支付', "updatedAt"=NOW() WHERE id=$1 AND status='PRICE_CONFIRMED'`,
                        r.id
                    );
                    await this.appendRentalSystemMessage(r.id, '超时未支付，订单已取消');
                }
            }
        } catch (_e) { }
    }

    async serializeRentalOrderLite(row) {
        if (!row) return null;
        let projectTitle = '';
        try {
            if (row.projectId) {
                const p = await this.prisma.studyProject.findUnique({ where: { id: row.projectId }, select: { title: true } });
                if (p) projectTitle = p.title || '';
            }
        } catch (_e) { }
        const status = String(row.status || 'OPEN').toUpperCase();
        const labels = { OPEN: '派单中', NEGOTIATING: '协商中', PRICE_CONFIRMED: '待支付', PAID: '已支付', EN_ROUTE: '出车中', ARRIVED: '已到达', IN_TRIP: '行程中', CANCELLED: '已取消', COMPLETED: '已完成' };
        return {
            id: row.id,
            orderNo: row.orderNo,
            projectId: row.projectId,
            projectTitle,
            travelDateText: row.travelDate ? String(row.travelDate).slice(0, 10) : '',
            passengerCount: Number(row.passengerCount || 1),
            vehicleRange: row.vehicleRange || '',
            pickupAddress: row.pickupAddress || '',
            remark: row.remark || '',
            status,
            statusLabel: labels[status] || status,
            refPrice: row.refPrice != null ? Number(row.refPrice) : null,
            offeredPrice: row.offeredPrice != null ? Number(row.offeredPrice) : null,
            agreedPrice: row.agreedPrice != null ? Number(row.agreedPrice) : null,
            offeredPriceText: row.offeredPrice != null ? ('¥' + Number(row.offeredPrice).toFixed(2)) : '',
            agreedPriceText: row.agreedPrice != null ? ('¥' + Number(row.agreedPrice).toFixed(2)) : '',
            createdAt: row.createdAt,
            timeText: row.createdAt ? String(row.createdAt).slice(0, 16).replace('T', ' ') : '',
        };
    }

    async claimRentalOrder(userId, id) {
        await this.ensureRentalOrderTable();
        const driver = await this.prisma.driverProfile.findUnique({ where: { userId } });
        if (!driver) throw new common_1.ForbiddenException('当前账号不是雇佣司机');
        if (driver.status === 'OFFLINE' || driver.status === 'LEAVE') {
            throw new common_1.BadRequestException('请先出车再抢单');
        }
        const orderId = String(id || '').trim();
        const rows = await this.prisma.$queryRawUnsafe(`SELECT * FROM "RentalOrder" WHERE id=$1`, orderId);
        const row = rows && rows[0];
        if (!row) throw new common_1.NotFoundException('租车单不存在');
        if (String(row.status).toUpperCase() !== 'OPEN') {
            throw new common_1.BadRequestException('该单已被接走或不在派单池');
        }
        if (driver.seatCount && Number(row.passengerCount || 1) > Number(driver.seatCount)) {
            throw new common_1.BadRequestException('座位数不足');
        }
        const refPrice = driver.basePrice != null ? Number(driver.basePrice) : null;
        await this.prisma.$executeRawUnsafe(
            `UPDATE "RentalOrder" SET status='NEGOTIATING', "driverId"=$1, "driverUserId"=$2, "claimedAt"=NOW(), "refPrice"=COALESCE($3, "refPrice"), "updatedAt"=NOW() WHERE id=$4 AND status='OPEN'`,
            driver.id, userId, refPrice, orderId
        );
        const after = await this.prisma.$queryRawUnsafe(`SELECT * FROM "RentalOrder" WHERE id=$1`, orderId);
        const next = after && after[0];
        if (!next || String(next.status).toUpperCase() !== 'NEGOTIATING' || next.driverId !== driver.id) {
            throw new common_1.BadRequestException('抢单失败，请刷新重试');
        }
        await this.appendRentalSystemMessage(orderId, (driver.realName || '司机') + ' 已接单，进入协商');
        try { await this.notifyRentalSubscribe('claimed', next); } catch (_n) { }
        return this.serializeRentalOrderLite(next);
    }

    async releaseRentalOrder(userId, id) {
        await this.ensureRentalOrderTable();
        const driver = await this.prisma.driverProfile.findUnique({ where: { userId } });
        if (!driver) throw new common_1.ForbiddenException('当前账号不是雇佣司机');
        const orderId = String(id || '').trim();
        const rows = await this.prisma.$queryRawUnsafe(`SELECT * FROM "RentalOrder" WHERE id=$1`, orderId);
        const row = rows && rows[0];
        if (!row) throw new common_1.NotFoundException('租车单不存在');
        if (String(row.status).toUpperCase() !== 'NEGOTIATING') {
            throw new common_1.BadRequestException('仅协商中可释放回池');
        }
        if (row.driverId !== driver.id) throw new common_1.ForbiddenException('只能释放自己接的单');
        await this.prisma.$executeRawUnsafe(
            `UPDATE "RentalOrder" SET status='OPEN', "driverId"=NULL, "driverUserId"=NULL, "claimedAt"=NULL, "offeredPrice"=NULL, "agreedPrice"=NULL, "updatedAt"=NOW() WHERE id=$1 AND status='NEGOTIATING' AND "driverId"=$2`,
            orderId, driver.id
        );
        const after = await this.prisma.$queryRawUnsafe(`SELECT * FROM "RentalOrder" WHERE id=$1`, orderId);
        await this.appendRentalSystemMessage(orderId, '司机已结束协商，订单退回派单池');
        return this.serializeRentalOrderLite(after && after[0]);
    }

    async setRentalOfferedPrice(userId, id, body = {}) {
        await this.ensureRentalOrderTable();
        const driver = await this.prisma.driverProfile.findUnique({ where: { userId } });
        if (!driver) throw new common_1.ForbiddenException('当前账号不是雇佣司机');
        const orderId = String(id || '').trim();
        const rows = await this.prisma.$queryRawUnsafe(`SELECT * FROM "RentalOrder" WHERE id=$1`, orderId);
        const row = rows && rows[0];
        if (!row) throw new common_1.NotFoundException('租车单不存在');
        if (String(row.status).toUpperCase() !== 'NEGOTIATING') throw new common_1.BadRequestException('仅协商中可报价');
        if (row.driverId !== driver.id) throw new common_1.ForbiddenException('只能给自己接的单报价');
        const price = Number(body.price != null ? body.price : body.offeredPrice);
        if (!Number.isFinite(price) || price <= 0) throw new common_1.BadRequestException('请输入有效报价');
        const rounded = Math.round(price * 100) / 100;
        await this.prisma.$executeRawUnsafe(
            `UPDATE "RentalOrder" SET "offeredPrice"=$2, "agreedPrice"=NULL, "priceConfirmedAt"=NULL, "updatedAt"=NOW() WHERE id=$1 AND status='NEGOTIATING'`,
            orderId, rounded
        );
        await this.appendRentalSystemMessage(orderId, '司机报价 ¥' + rounded.toFixed(2) + '，等待学员确认');
        const after = await this.prisma.$queryRawUnsafe(`SELECT * FROM "RentalOrder" WHERE id=$1`, orderId);
        return this.serializeRentalOrderLite(after && after[0]);
    }


    async ensureRentalFulfillmentColumns() {
        await this.ensureRentalOrderTable();
        if (this._rentalFulfillColsReady) return;
        try {
            await this.prisma.$executeRawUnsafe(`ALTER TABLE "RentalOrder" ADD COLUMN IF NOT EXISTS "startedAt" TIMESTAMP`);
            await this.prisma.$executeRawUnsafe(`ALTER TABLE "RentalOrder" ADD COLUMN IF NOT EXISTS "completedAt" TIMESTAMP`);
            await this.prisma.$executeRawUnsafe(`ALTER TABLE "RentalOrder" ADD COLUMN IF NOT EXISTS "walletCreditedAt" TIMESTAMP`);
        } catch (_e) { }
        this._rentalFulfillColsReady = true;
    }

    async notifyRentalSubscribe(eventKey, order, _payload = {}) {
        // Mirror study stub — skip when template IDs absent (see WX_SUBSCRIBE_RENTAL_* env)
        const map = {
            claimed: process.env.WX_SUBSCRIBE_RENTAL_CLAIMED || '',
            offered: process.env.WX_SUBSCRIBE_RENTAL_OFFERED || '',
            price_confirmed: process.env.WX_SUBSCRIBE_RENTAL_PRICE_CONFIRMED || '',
            paid: process.env.WX_SUBSCRIBE_RENTAL_PAID || '',
            fulfillment: process.env.WX_SUBSCRIBE_RENTAL_FULFILLMENT || '',
        };
        const key = String(eventKey || '').trim();
        const templateId = map[key] || '';
        if (!templateId) return { skipped: true, reason: 'template_not_configured', eventKey: key };
        // TODO: WeChat subscribeMessage.send
        return { skipped: true, reason: 'send_not_implemented_yet', eventKey: key, templateId };
    }

    async creditRentalOrderCompletion(driverId, order) {
        await this.ensureRentalFulfillmentColumns();
        const gross = Number(order && order.agreedPrice != null ? order.agreedPrice : 0) || 0;
        const rate = driverId ? await this.driverCommissionRateOf(driverId) : 0;
        const net = Math.round(gross * (100 - rate) * 100) / 10000;
        const netFixed = Math.round(net * 100) / 100;
        if (!driverId || !order || !order.id) return { gross, rate, net: netFixed, credited: false };
        try {
            const rows = await this.prisma.$queryRawUnsafe(`SELECT "walletCreditedAt" FROM "RentalOrder" WHERE id=$1`, order.id);
            if (rows && rows[0] && rows[0].walletCreditedAt) return { gross, rate, net: netFixed, credited: false };
        } catch (_e) { }
        if (netFixed > 0) {
            try {
                await this.prisma.$executeRawUnsafe(
                    `UPDATE "DriverProfile" SET "availableBalance" = COALESCE("availableBalance",0) + $1, "updatedAt"=NOW() WHERE id=$2`,
                    netFixed, driverId
                );
            } catch (_e) { }
        }
        try {
            await this.prisma.$executeRawUnsafe(
                `UPDATE "RentalOrder" SET "walletCreditedAt"=NOW() WHERE id=$1 AND "walletCreditedAt" IS NULL`,
                order.id
            );
        } catch (_e) { }
        try {
            await this.prisma.$executeRawUnsafe(
                `UPDATE "DriverProfile" SET
                    "completedJobs" = COALESCE("completedJobs",0) + 1,
                    "todayIncome" = COALESCE("todayIncome",0) + $1,
                    "totalIncome" = COALESCE("totalIncome",0) + $1,
                    "updatedAt"=NOW()
                 WHERE id=$2`,
                netFixed > 0 ? netFixed : 0, driverId
            );
        } catch (_e) { }
        return { gross, rate, net: netFixed, credited: true };
    }

    rentalFulfillmentNextAllowed(current) {
        const cur = String(current || '').toUpperCase();
        const map = {
            PAID: ['EN_ROUTE', 'CANCELLED'],
            EN_ROUTE: ['ARRIVED', 'CANCELLED'],
            ARRIVED: ['IN_TRIP', 'CANCELLED'],
            IN_TRIP: ['COMPLETED', 'CANCELLED'],
        };
        return map[cur] || [];
    }

    async updateRentalOrderStatus(userId, id, body = {}) {
        await this.ensureRentalFulfillmentColumns();
        const orderId = String(id || '').trim();
        const next = String(body.status || '').toUpperCase();
        const allowedAll = ['EN_ROUTE', 'ARRIVED', 'IN_TRIP', 'COMPLETED', 'CANCELLED'];
        if (allowedAll.indexOf(next) < 0) throw new common_1.BadRequestException('非法履约状态');
        const driver = await this.prisma.driverProfile.findUnique({ where: { userId } });
        if (!driver) throw new common_1.ForbiddenException('当前账号不是雇佣司机');
        const rows = await this.prisma.$queryRawUnsafe(`SELECT * FROM "RentalOrder" WHERE id=$1`, orderId);
        let row = rows && rows[0];
        if (!row) throw new common_1.NotFoundException('租车单不存在');
        if (row.driverId !== driver.id && row.driverUserId !== userId) {
            throw new common_1.ForbiddenException('只能推进自己接的租车单');
        }
        const cur = String(row.status || '').toUpperCase();
        if (cur === 'COMPLETED' && next === 'COMPLETED') return this.serializeRentalOrderLite(row);
        const allowed = this.rentalFulfillmentNextAllowed(cur);
        if (allowed.indexOf(next) < 0) {
            throw new common_1.BadRequestException('当前状态不可变为 ' + next);
        }
        if (next === 'CANCELLED') {
            const reason = String(body.reason || '司机取消履约').slice(0, 200);
            await this.prisma.$executeRawUnsafe(
                `UPDATE "RentalOrder" SET status='CANCELLED', "cancelledAt"=NOW(), "cancelReason"=$2, "updatedAt"=NOW() WHERE id=$1`,
                orderId, reason
            );
            await this.appendRentalSystemMessage(orderId, '履约已取消：' + reason);
            try {
                await this.prisma.driverProfile.update({
                    where: { id: driver.id },
                    data: { status: driver.acceptOrders ? 'ONLINE' : 'OFFLINE' },
                });
            } catch (_e) { }
            const after = await this.prisma.$queryRawUnsafe(`SELECT * FROM "RentalOrder" WHERE id=$1`, orderId);
            return this.serializeRentalOrderLite(after && after[0]);
        }
        let setSql = `status=$2, "updatedAt"=NOW()`;
        if (next === 'EN_ROUTE' || next === 'IN_TRIP') setSql += `, "startedAt"=COALESCE("startedAt", NOW())`;
        if (next === 'COMPLETED') setSql += `, "completedAt"=NOW()`;
        await this.prisma.$executeRawUnsafe(`UPDATE "RentalOrder" SET ${setSql} WHERE id=$1`, orderId, next);
        const labels = { EN_ROUTE: '出车中', ARRIVED: '已到达', IN_TRIP: '行程中', COMPLETED: '已完成' };
        await this.appendRentalSystemMessage(orderId, '履约进度：' + (labels[next] || next));
        if (next === 'COMPLETED') {
            const afterRows = await this.prisma.$queryRawUnsafe(`SELECT * FROM "RentalOrder" WHERE id=$1`, orderId);
            const paidRow = afterRows && afterRows[0];
            const credit = await this.creditRentalOrderCompletion(driver.id, paidRow || row);
            try {
                await this.prisma.driverProfile.update({
                    where: { id: driver.id },
                    data: { status: driver.acceptOrders ? 'ONLINE' : 'OFFLINE' },
                });
            } catch (_e) { }
            if (credit && credit.credited) {
                await this.appendRentalSystemMessage(orderId, '行程完成，司机钱包入账净值 ¥' + Number(credit.net).toFixed(2));
            }
            await this.notifyRentalSubscribe('fulfillment', paidRow, { status: 'COMPLETED', credit });
            return this.serializeRentalOrderLite(paidRow);
        }
        try {
            if (next === 'EN_ROUTE' || next === 'ARRIVED' || next === 'IN_TRIP') {
                await this.prisma.driverProfile.update({ where: { id: driver.id }, data: { status: 'BUSY' } });
            }
        } catch (_e) { }
        const after = await this.prisma.$queryRawUnsafe(`SELECT * FROM "RentalOrder" WHERE id=$1`, orderId);
        await this.notifyRentalSubscribe('fulfillment', after && after[0], { status: next });
        return this.serializeRentalOrderLite(after && after[0]);
    }

};

exports.CommerceService = CommerceService;
exports.CommerceService = CommerceService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], CommerceService);
//# sourceMappingURL=commerce.service.js.map
