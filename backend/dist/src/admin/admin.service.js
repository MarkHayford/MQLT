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
exports.AdminService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const client_1 = require("@prisma/client");
const bcrypt = require("bcryptjs");
const crypto_1 = require("crypto");
const fs_1 = require("fs");
const path_1 = require("path");
const study_no_service_1 = require("../common/study-no.service");
const prisma_service_1 = require("../prisma/prisma.service");
const storage_service_1 = require("../storage/storage.service");
const study_check_in_code_1 = require("../study/study-check-in-code");
const admin_permissions_1 = require("./admin-permissions");
const audience_templates_1 = require("/opt/mqlt/lib/audience-templates");
const splash_announcement_1 = require("/opt/mqlt/lib/splash-announcement");
const STUDY_PROJECT_STATUSES = ['可预约', '预约满员', '正在进行中', '已结束', '暂未开放', '待审批', '已驳回'];
const STUDY_PROJECT_HIDDEN_STATUSES = ['待审批', '已驳回'];
const ROUTE_POINT_CHECK_IN_MODES = {
    LOCATION: 'location',
    SCAN: 'scan',
};
const STUDY_LIVE_STAGES = {
    NOT_STARTED: 'not_started',
    WAITING_ADMIN_START: 'waiting_admin_start',
    READY: 'ready',
    DEPARTING: 'departing',
    STUDY_ACTIVE: 'study_active',
    ENDED: 'ended',
};
const STUDY_DEPARTURE_MODES = {
    WALK: 'walk',
    VEHICLE: 'vehicle',
};
let AdminService = class AdminService {
    constructor(prisma, config, studyNo, storage) {
        this.prisma = prisma;
        this.config = config;
        this.studyNo = studyNo;
        this.storage = storage;
    }
    async ensureOpLogSchema() {
        if (this._opLogSchema)
            return;
        try {
            await this.prisma.$executeRawUnsafe(`ALTER TABLE "AdminOperationLog" ADD COLUMN IF NOT EXISTS "enterpriseId" TEXT`);
        }
        catch (_err) { }
        try {
            await this.prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "AdminOperationLog_enterpriseId_createdAt_idx" ON "AdminOperationLog" ("enterpriseId", "createdAt")`);
        }
        catch (_err2) { }
        try {
            await this.prisma.$executeRawUnsafe(`ALTER TABLE "AdminOperationLog" ADD COLUMN IF NOT EXISTS "projectId" TEXT`);
        }
        catch (_err3) { }
        try {
            await this.prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "AdminOperationLog_projectId_createdAt_idx" ON "AdminOperationLog" ("projectId", "createdAt")`);
        }
        catch (_err4) { }
        this._opLogSchema = true;
    }
    resolveOpLogEnterpriseId(actor, entry) {
        const detail = (entry && entry.detail) || {};
        const fromEntry = String((entry && entry.enterpriseId) || '').trim();
        if (fromEntry)
            return fromEntry;
        const fromActor = String((actor && actor.enterpriseId) || '').trim();
        if (fromActor)
            return fromActor;
        const fromDetail = String(detail.enterpriseId || '').trim();
        if (fromDetail)
            return fromDetail;
        if (String((entry && entry.targetType) || '') === 'Enterprise')
            return String((entry && entry.targetId) || '').trim() || null;
        return null;
    }
    resolveOpLogProjectId(actor, entry) {
        const detail = (entry && entry.detail) || {};
        const fromEntry = String((entry && entry.projectId) || '').trim();
        if (fromEntry)
            return fromEntry;
        const fromDetail = String(detail.projectId || '').trim();
        if (fromDetail)
            return fromDetail;
        const tt = String((entry && entry.targetType) || '');
        if (tt === 'StudyProject')
            return String((entry && entry.targetId) || '').trim() || null;
        return null;
    }
    async writeOpLog(actor, entry) {
        if (!actor || !entry)
            return;
        try {
            await this.ensureOpLogSchema();
            let enterpriseId = this.resolveOpLogEnterpriseId(actor, entry);
            let projectId = this.resolveOpLogProjectId(actor, entry);
            if ((!enterpriseId || !projectId) && entry) {
                const tt = String(entry.targetType || '');
                const tid = String(entry.targetId || '').trim();
                try {
                    if (!projectId && tt === 'Product' && tid) {
                        const rows = await this.prisma.$queryRawUnsafe(`SELECT "projectId" FROM "Product" WHERE id = $1`, tid);
                        if (rows && rows[0] && rows[0].projectId)
                            projectId = String(rows[0].projectId);
                    }
                    else if (tt === 'StudyNotice' && tid) {
                        const rows = await this.prisma.$queryRawUnsafe(`SELECT "projectId", "enterpriseId" FROM "StudyNotice" WHERE id = $1`, tid);
                        if (rows && rows[0]) {
                            if (!projectId && rows[0].projectId)
                                projectId = String(rows[0].projectId);
                            if (!enterpriseId && rows[0].enterpriseId)
                                enterpriseId = String(rows[0].enterpriseId);
                        }
                    }
                    else if (!projectId && tt === 'StudyBooking' && tid) {
                        const rows = await this.prisma.$queryRawUnsafe(`SELECT "projectId" FROM "StudyBooking" WHERE id = $1`, tid);
                        if (rows && rows[0] && rows[0].projectId)
                            projectId = String(rows[0].projectId);
                    }
                    else if (!projectId && tt === 'StudyRoutePoint' && tid) {
                        const rows = await this.prisma.$queryRawUnsafe(`SELECT "projectId" FROM "StudyRoutePoint" WHERE id = $1`, tid);
                        if (rows && rows[0] && rows[0].projectId)
                            projectId = String(rows[0].projectId);
                    }
                    if (!enterpriseId && projectId) {
                        const rows = await this.prisma.$queryRawUnsafe(`SELECT "enterpriseId" FROM "StudyProject" WHERE id = $1`, projectId);
                        if (rows && rows[0] && rows[0].enterpriseId)
                            enterpriseId = String(rows[0].enterpriseId);
                    }
                    else if (!enterpriseId && tt === 'StudyProject' && tid) {
                        const rows = await this.prisma.$queryRawUnsafe(`SELECT "enterpriseId" FROM "StudyProject" WHERE id = $1`, tid);
                        if (rows && rows[0] && rows[0].enterpriseId)
                            enterpriseId = String(rows[0].enterpriseId);
                    }
                }
                catch (_lookupErr) { }
            }
            await this.prisma.$executeRawUnsafe(`INSERT INTO "AdminOperationLog"
              (id, "actorId", "actorName", "actorPhone", module, action, "targetType", "targetId", "targetLabel", summary, detail, ip, "enterpriseId", "projectId", "createdAt")
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb,$12,$13,$14,NOW())`, 'log_' + (0, crypto_1.randomUUID)(), actor.actorId || null, String(actor.actorName || ''), String(actor.actorPhone || ''), String(entry.module || ''), String(entry.action || ''), String(entry.targetType || ''), String(entry.targetId || ''), String(entry.targetLabel || ''), String(entry.summary || ''), JSON.stringify(entry.detail || {}), actor.ip || null, enterpriseId, projectId);
        }
        catch (_err) {
        }
    }
    logWhere(query = {}) {
        const module = String(query.module || '').trim();
        const keyword = String(query.keyword || '').trim();
        const targetType = String(query.targetType || '').trim();
        const targetId = String(query.targetId || '').trim();
        const from = String(query.from || '').trim();
        const to = String(query.to || '').trim();
        const conds = ['TRUE'];
        const params = [];
        let i = 1;
        if (module) {
            conds.push(`module = $${i++}`);
            params.push(module);
        }
        if (targetType) {
            conds.push(`"targetType" = $${i++}`);
            params.push(targetType);
        }
        if (targetId) {
            conds.push(`"targetId" = $${i++}`);
            params.push(targetId);
        }
        if (keyword) {
            conds.push(`(summary ILIKE $${i} OR "actorName" ILIKE $${i} OR "targetLabel" ILIKE $${i} OR action ILIKE $${i})`);
            params.push('%' + keyword + '%');
            i += 1;
        }
        if (from) {
            conds.push(`"createdAt" >= $${i++}::date`);
            params.push(from);
        }
        if (to) {
            conds.push(`"createdAt" < ($${i++}::date + INTERVAL '1 day')`);
            params.push(to);
        }
        const productId = String(query.productId || '').trim();
        if (productId) {
            conds.push(`(("targetType" = 'Product' AND "targetId" = $${i}) OR (module = 'comment' AND detail->>'productId' = $${i}))`);
            params.push(productId);
            i += 1;
        }
        const enterpriseId = String(query.enterpriseId || '').trim();
        if (enterpriseId) {
            conds.push(`(
                COALESCE("enterpriseId", '') = $${i}
                OR ("targetType" = 'Enterprise' AND "targetId" = $${i})
                OR (detail->>'enterpriseId' = $${i})
                OR ("actorId" IN (SELECT id FROM "ConsoleAccount" WHERE "enterpriseId" = $${i}))
                OR ("targetType" = 'StudyProject' AND "targetId" IN (SELECT id FROM "StudyProject" WHERE "enterpriseId" = $${i}))
                OR ("targetType" = 'Product' AND "targetId" IN (
                    SELECT p.id FROM "Product" p
                    LEFT JOIN "StudyProject" sp ON sp.id = p."projectId"
                    WHERE sp."enterpriseId" = $${i}
                ))
                OR ("targetType" = 'StudyNotice' AND "targetId" IN (
                    SELECT n.id FROM "StudyNotice" n
                    LEFT JOIN "StudyProject" sp ON sp.id = n."projectId"
                    WHERE COALESCE(n."enterpriseId", sp."enterpriseId", '') = $${i}
                ))
                OR ("targetType" = 'StudyRoutePoint' AND detail->>'projectId' IN (SELECT id FROM "StudyProject" WHERE "enterpriseId" = $${i}))
                OR ("targetType" = 'StudyBooking' AND detail->>'projectId' IN (SELECT id FROM "StudyProject" WHERE "enterpriseId" = $${i}))
                OR ("targetType" = 'EnterpriseWithdraw' AND (
                    detail->>'enterpriseId' = $${i}
                    OR "targetId" IN (SELECT id FROM "EnterpriseWithdraw" WHERE "enterpriseId" = $${i})
                ))
                OR ("targetType" = 'ConsoleAccount' AND "targetId" IN (SELECT id FROM "ConsoleAccount" WHERE "enterpriseId" = $${i}))
                OR (COALESCE(detail->>'projectId', '') <> '' AND detail->>'projectId' IN (SELECT id FROM "StudyProject" WHERE "enterpriseId" = $${i}))
            )`);
            params.push(enterpriseId);
            i += 1;
        }
        const projectId = String(query.projectId || '').trim();
        if (projectId) {
            conds.push(`(
                COALESCE("projectId", '') = $${i}
                OR ("targetType" = 'StudyProject' AND "targetId" = $${i})
                OR (detail->>'projectId' = $${i})
                OR ("targetType" = 'Product' AND "targetId" IN (SELECT id FROM "Product" WHERE "projectId" = $${i}))
                OR ("targetType" = 'StudyNotice' AND "targetId" IN (SELECT id FROM "StudyNotice" WHERE "projectId" = $${i}))
                OR ("targetType" = 'StudyRoutePoint' AND (
                    detail->>'projectId' = $${i}
                    OR "targetId" IN (SELECT id FROM "StudyRoutePoint" WHERE "projectId" = $${i})
                ))
                OR ("targetType" = 'StudyBooking' AND (
                    detail->>'projectId' = $${i}
                    OR "targetId" IN (SELECT id FROM "StudyBooking" WHERE "projectId" = $${i})
                ))
                OR (module = 'comment' AND detail->>'productId' IN (SELECT id FROM "Product" WHERE "projectId" = $${i}))
                OR ("targetType" = 'ProductComment' AND detail->>'productId' IN (SELECT id FROM "Product" WHERE "projectId" = $${i}))
            )`);
            params.push(projectId);
            i += 1;
        }
        return { conds, params };
    }
    async listOperationLogs(query = {}, actor) {
        await this.ensureOpLogSchema();
        const scoped = Object.assign({}, query || {});
        const forced = this.enterpriseIdOf(actor);
        if (forced)
            scoped.enterpriseId = forced;
        else if (scoped.enterpriseId)
            scoped.enterpriseId = String(scoped.enterpriseId || '').trim();
        if (scoped.projectId)
            scoped.projectId = String(scoped.projectId || '').trim();
        const { conds, params } = this.logWhere(scoped);
        const page = Math.max(1, parseInt(String(scoped.page || '1'), 10) || 1);
        const pageSize = Math.min(50, Math.max(1, parseInt(String(scoped.pageSize || '20'), 10) || 20));
        const offset = (page - 1) * pageSize;
        const countSql = `SELECT COUNT(*)::int AS count FROM "AdminOperationLog" WHERE ${conds.join(' AND ')}`;
        const sql = `SELECT id, "actorId", "actorName", "actorPhone", module, action, "targetType", "targetId", "targetLabel", summary, detail, ip, "enterpriseId", "projectId", "createdAt"
                     FROM "AdminOperationLog"
                     WHERE ${conds.join(' AND ')}
                     ORDER BY "createdAt" DESC
                     LIMIT ${pageSize} OFFSET ${offset}`;
        try {
            const countRows = await this.prisma.$queryRawUnsafe(countSql, ...params);
            const total = countRows && countRows[0] ? Number(countRows[0].count) : 0;
            const items = await this.prisma.$queryRawUnsafe(sql, ...params);
            return { items, total, page, pageSize };
        }
        catch (_err) {
            return { items: [], total: 0, page, pageSize };
        }
    }
    async deleteOperationLog(id, actor) {
        const logId = String(id || '').trim();
        if (!logId)
            throw new common_1.BadRequestException('日志不存在');
        const rows = await this.prisma.$queryRawUnsafe(`SELECT id, summary FROM "AdminOperationLog" WHERE id = $1`, logId);
        if (!rows || !rows.length)
            throw new common_1.NotFoundException('日志不存在');
        await this.prisma.$executeRawUnsafe(`DELETE FROM "AdminOperationLog" WHERE id = $1`, logId);
        await this.writeOpLog(actor, {
            module: 'log',
            action: 'delete',
            targetType: 'AdminOperationLog',
            targetId: logId,
            targetLabel: rows[0].summary || '',
            summary: '删除一条操作日志',
            detail: { id: logId },
        });
        return { id: logId, deleted: true };
    }
    async clearOperationLogs(query, actor) {
        await this.ensureOpLogSchema();
        const scoped = Object.assign({}, query || {});
        const forced = this.enterpriseIdOf(actor);
        if (forced)
            scoped.enterpriseId = forced;
        const { conds, params } = this.logWhere(scoped);
        let deleted = 0;
        try {
            const countRows = await this.prisma.$queryRawUnsafe(`SELECT COUNT(*)::int AS count FROM "AdminOperationLog" WHERE ${conds.join(' AND ')}`, ...params);
            deleted = countRows && countRows[0] ? Number(countRows[0].count) : 0;
            if (deleted > 0)
                await this.prisma.$executeRawUnsafe(`DELETE FROM "AdminOperationLog" WHERE ${conds.join(' AND ')}`, ...params);
        }
        catch (_err) {
            deleted = 0;
        }
        await this.writeOpLog(actor, {
            module: 'log',
            action: 'clear',
            targetType: 'AdminOperationLog',
            targetId: String((query && query.targetId) || 'all'),
            targetLabel: '',
            summary: '清理操作日志 ' + deleted + ' 条',
            detail: query || {},
        });
        return { deleted };
    }
    async listProductOperationLogs(productId, query = {}) {
        const id = String(productId || '').trim();
        const page = Math.max(1, parseInt(String(query.page || '1'), 10) || 1);
        const pageSize = Math.min(50, Math.max(1, parseInt(String(query.pageSize || '20'), 10) || 20));
        const offset = (page - 1) * pageSize;
        if (!id)
            return { items: [], total: 0, page, pageSize };
        try {
            const countRows = await this.prisma.$queryRawUnsafe(`SELECT COUNT(*)::int AS count FROM "AdminOperationLog"
               WHERE ("targetType" = 'Product' AND "targetId" = $1)
                  OR (module = 'comment' AND detail->>'productId' = $1)`, id);
            const total = countRows && countRows[0] ? Number(countRows[0].count) : 0;
            const items = await this.prisma.$queryRawUnsafe(`SELECT id, "actorId", "actorName", "actorPhone", module, action, "targetType", "targetId", "targetLabel", summary, detail, ip, "createdAt"
               FROM "AdminOperationLog"
               WHERE ("targetType" = 'Product' AND "targetId" = $1)
                  OR (module = 'comment' AND detail->>'productId' = $1)
               ORDER BY "createdAt" DESC
               LIMIT ${pageSize} OFFSET ${offset}`, id);
            return { items, total, page, pageSize };
        }
        catch (_err) {
            return { items: [], total: 0, page, pageSize };
        }
    }
    userLogLabel(user) {
        return (user && (user.realName || user.nickname || user.studyNo || user.phone)) || '';
    }
    async overview() {
        const [users, products, studyProjects, orders, bookings, feedback, revenue, recentOrders, recentFeedback,] = await Promise.all([
            this.prisma.user.count(),
            this.prisma.product.count(),
            this.prisma.studyProject.count(),
            this.prisma.order.count(),
            this.prisma.studyBooking.count(),
            this.prisma.feedback.count({ where: { status: { not: 'withdrawn' } } }),
            this.prisma.order.aggregate({ _sum: { amount: true } }),
            this.prisma.order.findMany({
                include: { user: true, items: { include: { product: true } } },
                orderBy: { createdAt: 'desc' },
                take: 6,
            }),
            this.prisma.feedback.findMany({
                include: { user: true },
                orderBy: { createdAt: 'desc' },
                take: 6,
            }),
        ]);
        return {
            metrics: {
                users,
                products,
                studyProjects,
                orders,
                bookings,
                feedback,
                revenue: revenue._sum.amount?.toString() ?? '0',
            },
            recentOrders: recentOrders.map((order) => this.serializeOrder(order)),
            recentFeedback: recentFeedback.map((item) => this.serializeFeedback(item)),
        };
    }
    async studyProjectCheckInCode(id) {
        const project = await this.prisma.studyProject.findUnique({
            where: { id },
            select: { id: true, title: true, location: true, status: true },
        });
        if (!project)
            throw new common_1.NotFoundException('Study project not found');
        const payload = (0, study_check_in_code_1.createStudyProjectCheckInPayload)(project.id);
        const raw = JSON.stringify(payload);
        return {
            project,
            payload,
            raw,
            qrImageUrl: 'https://api.qrserver.com/v1/create-qr-code/?size=420x420&margin=8&data=' + encodeURIComponent(raw),
        };
    }
    userSearchWhere(keyword) {
        const search = String(keyword || '').trim();
        if (!search)
            return {};
        return {
            OR: [
                { phone: { contains: search } },
                { nickname: { contains: search } },
                { studyNo: { contains: search } },
                { school: { contains: search } },
                { realName: { contains: search } },
                { realNameIdCard: { contains: search } },
            ],
        };
    }
    async users(keyword, filter, page, pageSize) {
        const parsedPage = Math.max(1, parseInt(String(page || '1'), 10) || 1);
        const parsedSize = Math.min(50, Math.max(1, parseInt(String(pageSize || '20'), 10) || 20));
        const searchWhere = this.userSearchWhere(keyword);
        const where = { ...searchWhere };
        const f = String(filter || '').trim().toLowerCase();
        if (f === 'verified')
            where.realNameVerified = true;
        if (f === 'unverified')
            where.realNameVerified = false;
        if (f === 'disabled')
            where.status = 'DISABLED';
        const select = {
            id: true,
            phone: true,
            nickname: true,
            avatarUrl: true,
            avatarTheme: true,
            studyNo: true,
            realName: true,
            realNameIdCard: true,
            realNameVerified: true,
            realNameVerifiedAt: true,
            status: true,
            createdAt: true,
            updatedAt: true,
            _count: {
                select: {
                    bookings: true,
                    orders: true,
                    studyCertificates: true,
                    feedbacks: true,
                },
            },
        };
        const [total, allTotal, verified, disabled, users] = await Promise.all([
            this.prisma.user.count({ where }),
            this.prisma.user.count({ where: searchWhere }),
            this.prisma.user.count({ where: { ...searchWhere, realNameVerified: true } }),
            this.prisma.user.count({ where: { ...searchWhere, status: 'DISABLED' } }),
            this.prisma.user.findMany({
                where,
                select,
                orderBy: { createdAt: 'desc' },
                skip: (parsedPage - 1) * parsedSize,
                take: parsedSize,
            }),
        ]);
        return {
            items: users.map((user) => this.sanitizeConsoleUser(user)),
            total,
            page: parsedPage,
            pageSize: parsedSize,
            stats: { total: allTotal, verified, disabled },
        };
    }
    async userDetail(id) {
        const user = await this.prisma.user.findUnique({
            where: { id },
            include: {
                _count: {
                    select: {
                        bookings: true,
                        orders: true,
                        studyCertificates: true,
                        feedbacks: true,
                    },
                },
            },
        });
        if (!user)
            throw new common_1.NotFoundException('User not found');
        const [coupons, posts] = await Promise.all([
            this.loadUserCoupons(id),
            this.loadUserPosts(id),
        ]);
        const unusedCoupons = coupons.filter((item) => String(item.status || '').toLowerCase() === 'unused').length;
        const publishedPosts = posts.filter((item) => String(item.status || '').toLowerCase() === 'published').length;
        const pendingFeedbacks = await this.prisma.feedback.count({
            where: { userId: id, status: { in: ['PENDING', 'pending', 'OPEN', 'open'] } },
        }).catch(() => 0);
        return {
            ...this.sanitizeConsoleUser(user),
            bookings: [],
            orders: [],
            coupons: [],
            certificates: [],
            posts: [],
            feedbacks: [],
            summary: {
                bookings: user._count?.bookings ?? 0,
                orders: user._count?.orders ?? 0,
                coupons: coupons.length,
                unusedCoupons,
                certificates: user._count?.studyCertificates ?? 0,
                posts: posts.length,
                publishedPosts,
                pendingFeedbacks,
            },
        };
    }
    parsePage(query, fallbackSize = 20) {
        const page = Math.max(1, parseInt(String((query && query.page) || '1'), 10) || 1);
        const pageSize = Math.min(50, Math.max(1, parseInt(String((query && query.pageSize) || fallbackSize), 10) || fallbackSize));
        return { page, pageSize, skip: (page - 1) * pageSize };
    }
    async userRecords(id, kind, page, pageSize) {
        const user = await this.prisma.user.findUnique({ where: { id }, select: { id: true } });
        if (!user)
            throw new common_1.NotFoundException('User not found');
        const parsed = this.parsePage({ page, pageSize }, kind === 'bookings' ? 8 : 20);
        const type = String(kind || 'bookings').trim().toLowerCase();
        if (type === 'bookings') {
            const where = { userId: id };
            const [total, rows] = await Promise.all([
                this.prisma.studyBooking.count({ where }),
                this.prisma.studyBooking.findMany({
                    where,
                    include: { project: { include: { enterprise: true } }, user: true },
                    orderBy: { createdAt: 'desc' },
                    skip: parsed.skip,
                    take: parsed.pageSize,
                }),
            ]);
            const bookingGroups = await this.getBookingGroupsForAdmin(rows);
            const items = this.dedupeConsoleBookings(rows).map((booking) => this.serializeConsoleBooking(booking, bookingGroups[booking.bookingGroupId ?? booking.id] ?? [booking]));
            return { items, total, page: parsed.page, pageSize: parsed.pageSize };
        }
        if (type === 'orders') {
            const where = { userId: id };
            const [total, rows] = await Promise.all([
                this.prisma.order.count({ where }),
                this.prisma.order.findMany({
                    where,
                    include: { items: { include: { product: true } }, user: true },
                    orderBy: { createdAt: 'desc' },
                    skip: parsed.skip,
                    take: parsed.pageSize,
                }),
            ]);
            return { items: rows.map((order) => this.serializeOrder(order)), total, page: parsed.page, pageSize: parsed.pageSize };
        }
        if (type === 'certificates') {
            const where = { userId: id };
            const [total, rows] = await Promise.all([
                this.prisma.studyCertificate.count({ where }),
                this.prisma.studyCertificate.findMany({
                    where,
                    orderBy: { issuedAt: 'desc' },
                    skip: parsed.skip,
                    take: parsed.pageSize,
                }),
            ]);
            const items = rows.map((item) => ({
                id: item.id,
                certificateNo: item.certificateNo,
                projectId: item.projectId,
                bookingId: item.bookingId,
                holderName: item.holderName,
                projectTitle: item.projectTitle,
                summary: item.summary,
                issuedAt: item.issuedAt,
            }));
            return { items, total, page: parsed.page, pageSize: parsed.pageSize };
        }
        if (type === 'feedbacks') {
            const where = { userId: id };
            const [total, rows] = await Promise.all([
                this.prisma.feedback.count({ where }),
                this.prisma.feedback.findMany({
                    where,
                    include: { user: true },
                    orderBy: { createdAt: 'desc' },
                    skip: parsed.skip,
                    take: parsed.pageSize,
                }),
            ]);
            return { items: rows.map((item) => this.serializeFeedback(item)), total, page: parsed.page, pageSize: parsed.pageSize };
        }
        if (type === 'coupons') {
            const all = await this.loadUserCoupons(id);
            return { items: all.slice(parsed.skip, parsed.skip + parsed.pageSize), total: all.length, page: parsed.page, pageSize: parsed.pageSize };
        }
        if (type === 'posts') {
            const all = await this.loadUserPosts(id);
            return { items: all.slice(parsed.skip, parsed.skip + parsed.pageSize), total: all.length, page: parsed.page, pageSize: parsed.pageSize };
        }
        return { items: [], total: 0, page: parsed.page, pageSize: parsed.pageSize };
    }
    async assertUserRecord(userId, kind, id) {
        const type = String(kind || '').trim().toLowerCase();
        const recordId = String(id || '').trim();
        if (!userId || !recordId)
            throw new common_1.BadRequestException('记录不存在');
        if (type === 'bookings') {
            const row = await this.prisma.studyBooking.findFirst({ where: { id: recordId, userId } });
            if (!row)
                throw new common_1.NotFoundException('预约不存在');
            return row;
        }
        if (type === 'orders') {
            const row = await this.prisma.order.findFirst({ where: { id: recordId, userId } });
            if (!row)
                throw new common_1.NotFoundException('订单不存在');
            return row;
        }
        if (type === 'certificates') {
            const row = await this.prisma.studyCertificate.findFirst({ where: { id: recordId, userId } });
            if (!row)
                throw new common_1.NotFoundException('证书不存在');
            return row;
        }
        if (type === 'coupons') {
            const rows = await this.prisma.$queryRawUnsafe(`SELECT * FROM "UserCoupon" WHERE id = $1 AND "userId" = $2`, recordId, userId);
            if (!rows || !rows.length)
                throw new common_1.NotFoundException('卡券不存在');
            return rows[0];
        }
        if (type === 'posts') {
            const rows = await this.prisma.$queryRawUnsafe(`SELECT * FROM "CommunityPost" WHERE id = $1 AND "userId" = $2`, recordId, userId);
            if (!rows || !rows.length)
                throw new common_1.NotFoundException('文章不存在');
            return rows[0];
        }
        throw new common_1.BadRequestException('不支持的记录类型');
    }
    async updateUserRecord(userId, kind, id, body, actor) {
        const type = String(kind || '').trim().toLowerCase();
        const existed = await this.assertUserRecord(userId, type, id);
        if (type === 'bookings') {
            const result = await this.updateBooking(id, body || {});
            await this.writeOpLog(actor, { module: 'user', action: 'update', targetType: 'StudyBooking', targetId: id, targetLabel: userId, summary: '修改研学预约', detail: { userId, status: (body && body.status) || '' } });
            return result;
        }
        if (type === 'certificates') {
            const data = {};
            if (body && body.holderName != null)
                data.holderName = String(body.holderName).trim();
            if (body && body.projectTitle != null)
                data.projectTitle = String(body.projectTitle).trim();
            if (body && body.summary != null)
                data.summary = String(body.summary).trim();
            const row = await this.prisma.studyCertificate.update({ where: { id }, data });
            await this.writeOpLog(actor, { module: 'user', action: 'update', targetType: 'StudyCertificate', targetId: id, targetLabel: row.holderName || '', summary: '修改研学成果', detail: { userId } });
            return row;
        }
        if (type === 'coupons') {
            const title = body && body.title != null ? String(body.title).trim() : existed.title;
            let status = body && body.status != null ? String(body.status).trim() : existed.status;
            const resolved = this.resolveCouponExpiryUpdate(existed, body || {});
            if (resolved.reactivate && String(status).toLowerCase() === 'expired')
                status = 'unused';
            if (resolved.setExpire) {
                if (resolved.clearExpire) {
                    await this.prisma.$executeRawUnsafe(`UPDATE "UserCoupon" SET title = $1, status = $2, "expireAt" = NULL WHERE id = $3 AND "userId" = $4`, title, status, id, userId);
                }
                else {
                    await this.prisma.$executeRawUnsafe(`UPDATE "UserCoupon" SET title = $1, status = $2, "expireAt" = $3::timestamptz WHERE id = $4 AND "userId" = $5`, title, status, resolved.expireAtIso, id, userId);
                }
            }
            else {
                await this.prisma.$executeRawUnsafe(`UPDATE "UserCoupon" SET title = $1, status = $2 WHERE id = $3 AND "userId" = $4`, title, status, id, userId);
            }
            const rows = await this.prisma.$queryRawUnsafe(`SELECT id, title, subtitle, type, value, "minAmount", status, "expireAt", "usedAt", scope, "createdAt" FROM "UserCoupon" WHERE id = $1`, id);
            await this.writeOpLog(actor, { module: 'user', action: 'update', targetType: 'UserCoupon', targetId: id, targetLabel: title, summary: '修改卡券过期', detail: { userId, status, expireAt: resolved.expireAtIso || null, extendDays: resolved.extendDays || null } });
            return rows && rows[0] ? rows[0] : { id, title, status };
        }
        if (type === 'posts') {
            const title = body && body.title != null ? String(body.title).trim() : existed.title;
            const status = body && body.status != null ? String(body.status).trim() : existed.status;
            await this.prisma.$executeRawUnsafe(`UPDATE "CommunityPost" SET title = $1, status = $2 WHERE id = $3 AND "userId" = $4`, title, status, id, userId);
            await this.writeOpLog(actor, { module: 'user', action: 'update', targetType: 'CommunityPost', targetId: id, targetLabel: title, summary: '修改文章', detail: { userId, status } });
            return { id, title, status };
        }
        throw new common_1.BadRequestException('不支持的记录类型');
    }
    async cancelUserRecord(userId, kind, id, actor) {
        const type = String(kind || '').trim().toLowerCase();
        await this.assertUserRecord(userId, type, id);
        if (type === 'bookings') {
            const result = await this.updateBooking(id, { status: 'CANCELLED' });
            await this.writeOpLog(actor, { module: 'user', action: 'cancel', targetType: 'StudyBooking', targetId: id, targetLabel: userId, summary: '取消研学预约', detail: { userId } });
            return result;
        }
        if (type === 'coupons') {
            await this.prisma.$executeRawUnsafe(`UPDATE "UserCoupon" SET status = 'used', "usedAt" = NOW() WHERE id = $1 AND "userId" = $2`, id, userId);
            await this.writeOpLog(actor, { module: 'user', action: 'cancel', targetType: 'UserCoupon', targetId: id, targetLabel: '', summary: '作废卡券', detail: { userId } });
            return { id, status: 'used' };
        }
        if (type === 'posts') {
            await this.prisma.$executeRawUnsafe(`UPDATE "CommunityPost" SET status = 'HIDDEN' WHERE id = $1 AND "userId" = $2`, id, userId);
            await this.writeOpLog(actor, { module: 'user', action: 'cancel', targetType: 'CommunityPost', targetId: id, targetLabel: '', summary: '下架文章', detail: { userId } });
            return { id, status: 'HIDDEN' };
        }
        throw new common_1.BadRequestException('该记录不能取消');
    }
    async deleteUserRecord(userId, kind, id, actor) {
        const type = String(kind || '').trim().toLowerCase();
        await this.assertUserRecord(userId, type, id);
        if (type === 'bookings') {
            const result = await this.deleteBooking(id);
            await this.writeOpLog(actor, { module: 'user', action: 'delete', targetType: 'StudyBooking', targetId: id, targetLabel: userId, summary: '删除研学预约', detail: { userId } });
            return result;
        }
        if (type === 'certificates') {
            await this.prisma.studyCertificate.delete({ where: { id } });
            await this.writeOpLog(actor, { module: 'user', action: 'delete', targetType: 'StudyCertificate', targetId: id, targetLabel: '', summary: '删除研学成果', detail: { userId } });
            return { id, deleted: true };
        }
        if (type === 'coupons') {
            await this.prisma.$executeRawUnsafe(`DELETE FROM "UserCoupon" WHERE id = $1 AND "userId" = $2`, id, userId);
            await this.writeOpLog(actor, { module: 'user', action: 'delete', targetType: 'UserCoupon', targetId: id, targetLabel: '', summary: '删除卡券', detail: { userId } });
            return { id, deleted: true };
        }
        if (type === 'posts') {
            await this.prisma.$executeRawUnsafe(`DELETE FROM "CommunityPost" WHERE id = $1 AND "userId" = $2`, id, userId);
            await this.writeOpLog(actor, { module: 'user', action: 'delete', targetType: 'CommunityPost', targetId: id, targetLabel: '', summary: '删除文章', detail: { userId } });
            return { id, deleted: true };
        }
        throw new common_1.BadRequestException('该记录不能删除');
    }
    async createUser(body, canManageAccess = false, actor = null) {
        if (!canManageAccess && this.hasAdminAccessFields(body)) {
            throw new common_1.ForbiddenException('当前职位没有管理职位权限的能力');
        }
        const phone = String(body.phone ?? '').trim();
        const password = String(body.password ?? '').trim();
        const nickname = String(body.nickname ?? '').trim() || '研学学员';
        if (phone.length !== 11)
            throw new common_1.BadRequestException('Phone must be 11 digits');
        if (password.length < 6 || password.length > 64)
            throw new common_1.BadRequestException('Password length must be 6-64');
        const rawStudyNo = String(body.studyNo ?? '').trim();
        const studyNo = rawStudyNo.length > 0 ? this.studyNo.normalize(rawStudyNo) : await this.studyNo.issue();
        const realNameData = this.normalizeAdminRealNameInput(body);
        const existed = await this.prisma.user.findFirst({
            where: {
                OR: [
                    { phone },
                    { studyNo },
                ],
            },
        });
        if (existed)
            throw new common_1.BadRequestException('Phone or study number already exists');
        return this.prisma.user.create({
            data: {
                phone,
                passwordHash: await bcrypt.hash(password, 10),
                passwordPlain: password,
                nickname,
                studyNo,
                avatarUrl: this.mapNullableString(body.avatarUrl),
                avatarTheme: this.mapAvatarTheme(body.avatarTheme),
                gender: String(body.gender ?? '').trim() || null,
                region: String(body.region ?? '').trim() || null,
                school: String(body.school ?? '').trim() || null,
                realName: realNameData.realName,
                realNameIdCard: realNameData.idCard,
                realNameVerified: realNameData.verified,
                realNameVerifiedAt: realNameData.verified ? new Date() : undefined,
                status: body.status === 'DISABLED' ? 'DISABLED' : 'ACTIVE',
                isAdmin: (0, admin_permissions_1.normalizeAdminRole)(body.adminRole) === 'SUPER_ADMIN',
                adminRole: (0, admin_permissions_1.normalizeAdminRole)(body.adminRole),
                adminPermissions: (0, admin_permissions_1.normalizeAdminPermissions)(body.adminPermissions),
            },
            select: {
                id: true,
                phone: true,
                passwordPlain: true,
                nickname: true,
                avatarUrl: true,
                avatarTheme: true,
                gender: true,
                region: true,
                school: true,
                studyNo: true,
                realName: true,
                realNameIdCard: true,
                realNameVerified: true,
                realNameVerifiedAt: true,
                status: true,
                isAdmin: true,
                adminRole: true,
                adminPermissions: true,
                createdAt: true,
                updatedAt: true,
            },
        }).then(async (user) => {
            const packed = this.withAdminPassword(user);
            await this.writeOpLog(actor, {
                module: 'user',
                action: 'create',
                targetType: 'User',
                targetId: user.id,
                targetLabel: this.userLogLabel(user),
                summary: '创建用户 ' + this.userLogLabel(user),
                detail: { studyNo: user.studyNo, phone: user.phone },
            });
            return packed;
        });
    }
    async updateUser(id, body, canManageAccess = false, actor = null) {
        if (!canManageAccess && this.hasAdminAccessFields(body)) {
            throw new common_1.ForbiddenException('当前职位没有管理职位权限的能力');
        }
        const existed = await this.prisma.user.findUnique({ where: { id } });
        if (!existed)
            throw new common_1.NotFoundException('User not found');
        if (body.points != null) {
            throw new common_1.BadRequestException('积分功能已下线');
        }
        if (Object.prototype.hasOwnProperty.call(body, 'phone')) {
            const phoneRaw = body.phone == null ? '' : String(body.phone).trim();
            if (phoneRaw && !/^1[0-9]{10}$/.test(phoneRaw)) {
                throw new common_1.BadRequestException('手机号须为11位');
            }
            if (phoneRaw) {
                const phoneOwner = await this.prisma.user.findFirst({
                    where: { phone: phoneRaw, NOT: { id } },
                    select: { id: true },
                });
                if (phoneOwner) {
                    throw new common_1.BadRequestException('该手机号已被其他账号使用');
                }
            }
            body.phone = phoneRaw || null;
        }
        const nextStudyNo = body.studyNo != null ? this.studyNo.normalize(body.studyNo) : undefined;
        if (nextStudyNo != null && nextStudyNo !== existed.studyNo) {
            const studyNoOwner = await this.prisma.user.findUnique({
                where: { studyNo: nextStudyNo },
                select: { id: true },
            });
            if (studyNoOwner && studyNoOwner.id !== id) {
                throw new common_1.BadRequestException('Study number already exists');
            }
        }
        const password = body.password != null ? String(body.password).trim() : undefined;
        if (password != null && (password.length < 6 || password.length > 64)) {
            throw new common_1.BadRequestException('Password length must be 6-64');
        }
        const passwordHash = password ? await bcrypt.hash(password, 10) : undefined;
        const realNameData = this.normalizeAdminRealNameInput(body, existed);
        const nextNickname = realNameData.realName !== undefined
            ? (realNameData.realName || existed.realName || existed.nickname)
            : undefined;
        const result = await this.prisma.$transaction(async (tx) => {
            const user = await tx.user.update({
                where: { id },
                data: {
                    phone: Object.prototype.hasOwnProperty.call(body, 'phone') ? (body.phone === '' ? null : body.phone) : undefined,
                    passwordHash,
                    passwordPlain: password,
                    nickname: nextNickname,
                    avatarUrl: body.avatarUrl != null ? this.mapNullableString(body.avatarUrl) : undefined,
                    avatarTheme: this.mapAvatarTheme(body.avatarTheme),
                    gender: body.gender === '' ? null : body.gender,
                    region: body.region === '' ? null : body.region,
                    school: body.school === '' ? null : body.school,
                    studyNo: nextStudyNo,
                    realName: realNameData.realName,
                    realNameIdCard: realNameData.idCard,
                    realNameVerified: realNameData.verified,
                    realNameVerifiedAt: realNameData.verifiedAt,
                    status: body.status,
                    isAdmin: Object.prototype.hasOwnProperty.call(body, 'adminRole') ? (0, admin_permissions_1.normalizeAdminRole)(body.adminRole) === 'SUPER_ADMIN' : undefined,
                    adminRole: Object.prototype.hasOwnProperty.call(body, 'adminRole') ? (0, admin_permissions_1.normalizeAdminRole)(body.adminRole) : undefined,
                    adminPermissions: Object.prototype.hasOwnProperty.call(body, 'adminPermissions') ? (0, admin_permissions_1.normalizeAdminPermissions)(body.adminPermissions) : undefined,
                },
                select: {
                    id: true,
                    phone: true,
                    passwordPlain: true,
                    nickname: true,
                    avatarUrl: true,
                    avatarTheme: true,
                    gender: true,
                    region: true,
                    school: true,
                    studyNo: true,
                        realName: true,
                    realNameIdCard: true,
                    realNameVerified: true,
                    realNameVerifiedAt: true,
                    status: true,
                    isAdmin: true,
                    adminRole: true,
                    adminPermissions: true,
                    createdAt: true,
                    updatedAt: true,
                },
            });
            return this.sanitizeConsoleUser(user);
        });
        const changed = [];
        if (Object.prototype.hasOwnProperty.call(body, 'phone') && String(body.phone || '') !== String(existed.phone || ''))
            changed.push('手机号');
        if (realNameData.realName !== undefined && realNameData.realName !== existed.realName)
            changed.push('姓名');
        if (realNameData.idCard !== undefined && realNameData.idCard !== existed.realNameIdCard)
            changed.push('证件号');
        if (realNameData.verified !== undefined && realNameData.verified !== existed.realNameVerified)
            changed.push(realNameData.verified ? '实名核验' : '取消实名');
        if (body.status && body.status !== existed.status)
            changed.push(body.status === 'DISABLED' ? '停用账号' : '恢复账号');
        if (password)
            changed.push('密码');
        let action = 'update';
        let summary = '修改用户 ' + this.userLogLabel(result);
        if (body.status === 'DISABLED' && existed.status !== 'DISABLED') {
            action = 'disable';
            summary = '停用账号 ' + this.userLogLabel(result);
        }
        else if (body.status && body.status !== 'DISABLED' && existed.status === 'DISABLED') {
            action = 'enable';
            summary = '恢复账号 ' + this.userLogLabel(result);
        }
        else if (changed.length) {
            summary = '修改用户 ' + this.userLogLabel(result) + ' · ' + changed.join('、');
        }
        else {
            return result;
        }
        await this.writeOpLog(actor, {
            module: 'user',
            action,
            targetType: 'User',
            targetId: id,
            targetLabel: this.userLogLabel(result),
            summary,
            detail: {
                changed,
                before: {
                    phone: existed.phone,
                    realName: existed.realName,
                    realNameVerified: existed.realNameVerified,
                    status: existed.status,
                },
                after: {
                    phone: result.phone,
                    realName: result.realName,
                    realNameVerified: result.realNameVerified,
                    status: result.status,
                },
            },
        });
        return result;
    }

    async completeUserAvatarUpload(userId, body) {
        const existed = await this.prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
        if (!existed)
            throw new common_1.NotFoundException('User not found');
        const publicUrl = this.storage.assertManagedPublicUrl(body?.publicUrl ?? body?.avatarUrl);
        const filename = publicUrl.split('/').pop() || '';
        const user = await this.prisma.user.update({
            where: { id: userId },
            data: { avatarUrl: publicUrl },
            select: {
                id: true,
                phone: true,
                nickname: true,
                avatarUrl: true,
                avatarTheme: true,
                status: true,
                isAdmin: true,
                adminRole: true,
                adminPermissions: true,
                studyNo: true,
                gender: true,
                region: true,
                school: true,
                realName: true,
                realNameIdCard: true,
                realNameVerified: true,
                realNameVerifiedAt: true,
                createdAt: true,
                updatedAt: true,
            },
        });
        return { avatarUrl: publicUrl, user };
    }
    async uploadUserAvatar(userId, file) {
        const existed = await this.prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
        if (!existed)
            throw new common_1.NotFoundException('User not found');
        if (!file)
            throw new common_1.BadRequestException('请选择头像图片');
        if (!this.isSupportedAvatarImage(file)) {
            throw new common_1.BadRequestException('仅支持 JPG、PNG 或 WEBP 图片');
        }
        if (file.size > 2 * 1024 * 1024) {
            throw new common_1.BadRequestException('头像图片不能超过 2MB');
        }
        const extension = this.avatarExtension(file);
        const filename = `${userId}${extension}`;
        const dir = this.avatarDir();
        if (!(0, fs_1.existsSync)(dir))
            (0, fs_1.mkdirSync)(dir, { recursive: true });
        (0, fs_1.writeFileSync)((0, path_1.join)(dir, filename), file.buffer);
        const avatarUrl = this.avatarPublicPath(filename);
        const user = await this.prisma.user.update({
            where: { id: userId },
            data: { avatarUrl },
            select: {
                id: true,
                phone: true,
                nickname: true,
                avatarUrl: true,
                avatarTheme: true,
                gender: true,
                region: true,
                school: true,
                studyNo: true,
                status: true,
                createdAt: true,
                updatedAt: true,
            },
        });
        this.cleanupUserAvatarFiles(userId, filename);
        return { avatarUrl, user };
    }
    async grantUserPoints(userId, body) {
        throw new common_1.BadRequestException('积分功能已下线');
        const existed = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!existed)
            throw new common_1.NotFoundException('User not found');
        const amount = Math.floor(Number(body.amount ?? 0));
        if (!Number.isFinite(amount) || amount <= 0) {
            throw new common_1.BadRequestException('Point amount must be a positive integer');
        }
        const title = String(body.title ?? '').trim() || '后台发放积分';
        return this.prisma.$transaction(async (tx) => {
            const user = await tx.user.update({
                where: { id: userId },
                data: { points: { increment: amount } },
                select: {
                    id: true,
                    phone: true,
                    nickname: true,
                    studyNo: true,
                        status: true,
                    updatedAt: true,
                },
            });
            const record = await tx.pointRecord.create({
                data: {
                    userId,
                    title,
                    amount,
                },
            });
            return { user, record };
        });
    }
    async deductUserPoints(userId, body) {
        throw new common_1.BadRequestException('积分功能已下线');
        const existed = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!existed)
            throw new common_1.NotFoundException('User not found');
        const amount = Math.floor(Number(body.amount ?? 0));
        if (!Number.isFinite(amount) || amount <= 0) {
            throw new common_1.BadRequestException('Point amount must be a positive integer');
        }
        if (existed.points < amount) {
            throw new common_1.BadRequestException('用户积分余额不足，不能扣成负数');
        }
        const title = String(body.title ?? '').trim() || '后台扣除积分';
        return this.prisma.$transaction(async (tx) => {
            const claimed = await tx.user.updateMany({
                where: { id: userId, points: { gte: amount } },
                data: { points: { decrement: amount } },
            });
            if (claimed.count !== 1) {
                throw new common_1.BadRequestException('用户积分余额不足，不能扣成负数');
            }
            const user = await tx.user.findUnique({
                where: { id: userId },
                select: {
                    id: true,
                    phone: true,
                    nickname: true,
                    studyNo: true,
                        status: true,
                    updatedAt: true,
                },
            });
            const record = await tx.pointRecord.create({
                data: {
                    userId,
                    title,
                    amount: -amount,
                },
            });
            return { user, record };
        });
    }
    async deletePointRecord(id) {
        throw new common_1.BadRequestException('积分功能已下线');
        const existed = await this.prisma.pointRecord.findUnique({ where: { id } });
        if (!existed)
            throw new common_1.NotFoundException('Point record not found');
        await this.prisma.pointRecord.delete({ where: { id } });
        return { id, deleted: true };
    }
    async deleteUser(id, actor = null) {
        const existed = await this.prisma.user.findUnique({
            where: { id },
            include: {
                bookings: true,
                orders: { select: { id: true } },
            },
        });
        if (!existed)
            throw new common_1.NotFoundException('User not found');
        const groupIdsToDelete = [];
        const singleBookingIdsToDelete = [];
        for (const booking of existed.bookings) {
            const bookerId = booking.bookerId ?? booking.userId;
            const isGroupBooker = bookerId === id || booking.participantRole === 'BOOKER';
            if (isGroupBooker) {
                const groupId = booking.bookingGroupId ?? booking.id;
                if (!groupIdsToDelete.includes(groupId))
                    groupIdsToDelete.push(groupId);
            }
            else if (!singleBookingIdsToDelete.includes(booking.id)) {
                singleBookingIdsToDelete.push(booking.id);
            }
        }
        const groupedBookings = groupIdsToDelete.length > 0
            ? await this.prisma.studyBooking.findMany({
                where: {
                    OR: [
                        { bookingGroupId: { in: groupIdsToDelete } },
                        { id: { in: groupIdsToDelete } },
                    ],
                },
            })
            : [];
        const bookingsToDelete = [...groupedBookings];
        for (const booking of existed.bookings) {
            if (singleBookingIdsToDelete.includes(booking.id) && !bookingsToDelete.some((item) => item.id === booking.id)) {
                bookingsToDelete.push(booking);
            }
        }
        const bookingIdsToDelete = bookingsToDelete.map((booking) => booking.id);
        const activeCountByProject = {};
        for (const booking of bookingsToDelete) {
            if (!this.isActiveStudyBookingStatus(booking.status) || !this.isSeatStudyBooking(booking))
                continue;
            activeCountByProject[booking.projectId] = (activeCountByProject[booking.projectId] ?? 0) + 1;
        }
        await this.prisma.$transaction(async (tx) => {
            for (const [projectId, activeCount] of Object.entries(activeCountByProject)) {
                await tx.studyProject.updateMany({
                    where: { id: projectId, enrolled: { gte: activeCount } },
                    data: { enrolled: { decrement: activeCount } },
                });
            }
            const orderIds = existed.orders.map((order) => order.id);
            if (orderIds.length > 0) {
                await tx.orderItem.deleteMany({ where: { orderId: { in: orderIds } } });
            }
            if (bookingIdsToDelete.length > 0) {
                await tx.studyBooking.deleteMany({ where: { id: { in: bookingIdsToDelete } } });
            }
            await tx.cartItem.deleteMany({ where: { userId: id } });
            await tx.favorite.deleteMany({ where: { userId: id } });
            await tx.traveler.deleteMany({ where: { userId: id } });
            await tx.address.deleteMany({ where: { userId: id } });
            await tx.invoiceTitle.deleteMany({ where: { userId: id } });
            await tx.pointRecord.deleteMany({ where: { userId: id } });
            await tx.order.deleteMany({ where: { userId: id } });
            await tx.feedback.updateMany({ where: { userId: id }, data: { userId: null } });
            await tx.user.delete({ where: { id } });
        });
        await this.writeOpLog(actor, {
            module: 'user',
            action: 'delete',
            targetType: 'User',
            targetId: id,
            targetLabel: this.userLogLabel(existed),
            summary: '删除用户 ' + this.userLogLabel(existed),
            detail: { studyNo: existed.studyNo, phone: existed.phone },
        });
        return { id, deleted: true };
    }
    async deleteUsers(ids, actor) {
        const list = Array.isArray(ids) ? ids.map((x) => String(x || '').trim()).filter(Boolean) : [];
        let deleted = 0;
        for (let i = 0; i < list.length; i++) {
            try {
                await this.deleteUser(list[i], actor);
                deleted += 1;
            }
            catch (_err) { }
        }
        return { deleted };
    }
    mapNullableString(value) {
        const text = String(value ?? '').trim();
        return text.length > 0 ? text : null;
    }
    hasAdminAccessFields(body) {
        return Object.prototype.hasOwnProperty.call(body, 'adminRole') ||
            Object.prototype.hasOwnProperty.call(body, 'adminPermissions');
    }
    normalizeAdminRealNameInput(body, existed) {
        const hasRealName = Object.prototype.hasOwnProperty.call(body, 'realName');
        const hasIdCard = Object.prototype.hasOwnProperty.call(body, 'idCard') || Object.prototype.hasOwnProperty.call(body, 'realNameIdCard');
        const hasVerified = Object.prototype.hasOwnProperty.call(body, 'realNameVerified');
        const realName = hasRealName ? this.mapNullableRealName(body.realName) : undefined;
        const idCardSource = Object.prototype.hasOwnProperty.call(body, 'idCard') ? body.idCard : body.realNameIdCard;
        const idCard = hasIdCard ? this.mapNullableIdCard(idCardSource) : undefined;
        const nextRealName = hasRealName ? realName : existed?.realName ?? null;
        const nextIdCard = hasIdCard ? idCard : existed?.realNameIdCard ?? null;
        const verified = hasVerified
            ? this.mapBoolean(body.realNameVerified, false)
            : Boolean(nextRealName && nextIdCard);
        if (verified && (!nextRealName || !nextIdCard)) {
            throw new common_1.BadRequestException('实名信息需同时包含真实姓名和18位身份证号');
        }
        return {
            realName,
            idCard,
            verified: hasVerified || hasRealName || hasIdCard ? verified : undefined,
            verifiedAt: hasVerified || hasRealName || hasIdCard
                ? (verified ? (existed?.realNameVerifiedAt ?? new Date()) : null)
                : undefined,
        };
    }
    mapNullableRealName(value) {
        const text = this.mapNullableString(value);
        if (text == null)
            return null;
        if (text.length < 2 || text.length > 30)
            throw new common_1.BadRequestException('请输入正确的真实姓名');
        return text;
    }
    mapNullableIdCard(value) {
        const text = String(value ?? '').trim().toUpperCase();
        if (!text)
            return null;
        if (!/^\d{17}[\dX]$/.test(text))
            throw new common_1.BadRequestException('请输入正确的18位身份证号');
        return text;
    }
    sanitizeConsoleUser(user) {
        return {
            id: user.id,
            phone: user.phone,
            nickname: user.realName || user.nickname,
            avatarUrl: user.avatarUrl,
            avatarTheme: user.avatarTheme,
            studyNo: user.studyNo,
            realName: user.realName,
            realNameIdCard: user.realNameIdCard,
            realNameVerified: user.realNameVerified,
            realNameVerifiedAt: user.realNameVerifiedAt,
            status: user.status,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
            _count: user._count
                ? {
                    bookings: user._count.bookings ?? 0,
                    orders: user._count.orders ?? 0,
                    studyCertificates: user._count.studyCertificates ?? 0,
                    feedbacks: user._count.feedbacks ?? 0,
                }
                : undefined,
        };
    }
    isPendingFeedback(status) {
        const v = String(status || '').toLowerCase();
        return v === 'submitted' || v === 'pending' || v === 'open' || v === 'processing';
    }
    async loadUserCoupons(userId) {
        try {
            const rows = await this.prisma.$queryRaw `
                SELECT id, title, subtitle, type, value, "minAmount", status, "expireAt", "usedAt", scope, "createdAt"
                FROM "UserCoupon"
                WHERE "userId" = ${userId}
                ORDER BY "createdAt" DESC
                LIMIT 100`;
            return (Array.isArray(rows) ? rows : []).map((item) => ({
                id: item.id,
                title: item.title,
                subtitle: item.subtitle || '',
                type: item.type,
                value: item.value,
                minAmount: item.minAmount,
                status: item.status,
                expireAt: item.expireAt,
                usedAt: item.usedAt,
                scope: item.scope,
                createdAt: item.createdAt,
            }));
        }
        catch (_err) {
            return [];
        }
    }
    async loadUserPosts(userId) {
        try {
            const rows = await this.prisma.$queryRaw `
                SELECT id, title, channel, type, category, status, "likeCount", "commentCount", "createdAt"
                FROM "CommunityPost"
                WHERE "userId" = ${userId}
                ORDER BY "createdAt" DESC
                LIMIT 100`;
            return (Array.isArray(rows) ? rows : []).map((item) => ({
                id: item.id,
                title: item.title,
                channel: item.channel,
                type: item.type,
                category: item.category,
                status: item.status,
                likeCount: item.likeCount,
                commentCount: item.commentCount,
                createdAt: item.createdAt,
            }));
        }
        catch (_err) {
            return [];
        }
    }
    dedupeConsoleBookings(bookings) {
        const map = new Map();
        for (let i = 0; i < bookings.length; i++) {
            const booking = bookings[i];
            const key = booking.bookingGroupId ?? booking.id;
            const prev = map.get(key);
            if (!prev) {
                map.set(key, booking);
                continue;
            }
            const isBooker = (booking.bookerId ?? booking.userId) === booking.userId || booking.participantRole === 'BOOKER';
            if (isBooker)
                map.set(key, booking);
        }
        return Array.from(map.values());
    }
    studyRouteCatalog() {
        return [
            { id: 'test_spot_1', title: '测试地点 1' },
            { id: 'test_spot_2', title: '测试地点 2' },
            { id: 'test_spot_3', title: '测试地点 3' },
            { id: 'test_spot_4', title: '测试地点 4' },
        ];
    }
    spotTitleOf(id) {
        const catalog = this.studyRouteCatalog();
        for (let i = 0; i < catalog.length; i++) {
            if (catalog[i].id === id)
                return catalog[i].title;
        }
        return id;
    }
    buildAdminTripPlan(body, existedPlan) {
        const src = (body && body.tripPlan && typeof body.tripPlan === 'object') ? body.tripPlan : (body || {});
        let dayKeys = [];
        const rawKeys = Array.isArray(src.dayKeys) ? src.dayKeys : (Array.isArray(body && body.dayKeys) ? body.dayKeys : []);
        for (let i = 0; i < rawKeys.length; i++) {
            const key = String(rawKeys[i] || '').trim();
            if (key && !dayKeys.includes(key))
                dayKeys.push(key);
        }
        const byKey = {};
        const rawDays = Array.isArray(src.days) ? src.days : (Array.isArray(body && body.days) ? body.days : []);
        for (let i = 0; i < rawDays.length; i++) {
            const row = rawDays[i] || {};
            const key = String(row.dayKey || '').trim();
            if (!key)
                continue;
            const idsRaw = Array.isArray(row.spotIds) ? row.spotIds : (Array.isArray(row.routePointIds) ? row.routePointIds : []);
            const spotIds = [];
            for (let j = 0; j < idsRaw.length; j++) {
                const id = String(idsRaw[j] || '').trim();
                if (id && !spotIds.includes(id))
                    spotIds.push(id);
            }
            byKey[key] = spotIds;
            if (!dayKeys.includes(key))
                dayKeys.push(key);
        }
        dayKeys.sort();
        const days = dayKeys.map((dayKey) => ({ dayKey, spotIds: byKey[dayKey] || [] }));
        const prev = (existedPlan && existedPlan.checkIn && typeof existedPlan.checkIn === 'object') ? existedPlan.checkIn : {};
        return {
            dayKeys,
            days,
            note: String((src.note != null ? src.note : (existedPlan && existedPlan.note)) || '').trim(),
            checkIn: {
                tokens: prev.tokens && typeof prev.tokens === 'object' ? prev.tokens : {},
                redeemed: prev.redeemed && typeof prev.redeemed === 'object' ? prev.redeemed : {},
            },
        };
    }
    hasAdminTripInput(body) {
        if (!body || typeof body !== 'object')
            return false;
        return body.tripPlan != null || body.dayKeys != null || body.days != null;
    }
    consoleTripDays(plan) {
        if (!plan || typeof plan !== 'object')
            return [];
        const keys = [];
        const raw = Array.isArray(plan.dayKeys) ? plan.dayKeys : [];
        for (let i = 0; i < raw.length; i++) {
            const key = String(raw[i] || '').trim();
            if (key && !keys.includes(key))
                keys.push(key);
        }
        const byKey = {};
        if (Array.isArray(plan.days)) {
            for (let i = 0; i < plan.days.length; i++) {
                const row = plan.days[i] || {};
                const key = row.dayKey ? String(row.dayKey) : '';
                if (!key)
                    continue;
                if (!keys.includes(key))
                    keys.push(key);
                const idsRaw = Array.isArray(row.spotIds) ? row.spotIds : [];
                const titlesRaw = Array.isArray(row.titles) ? row.titles : [];
                const spots = [];
                for (let j = 0; j < idsRaw.length; j++) {
                    const id = String(idsRaw[j] || '').trim();
                    if (!id)
                        continue;
                    spots.push({ id, title: String(titlesRaw[j] || '').trim() || this.spotTitleOf(id) });
                }
                byKey[key] = spots;
            }
        }
        keys.sort();
        const redeemed = (plan.checkIn && plan.checkIn.redeemed) || {};
        return keys.map((dayKey) => {
            const mark = redeemed[dayKey];
            return {
                dayKey,
                redeemed: mark === true || (mark != null && mark !== '' && mark !== false),
                spots: byKey[dayKey] || [],
            };
        });
    }
    rideLabelOf(optionId) {
        const id = String(optionId || '').trim();
        if (!id || id === 'none')
            return '自行前往';
        if (id === 'range_s' || id === 'van7')
            return '1–7人 · 小车';
        if (id === 'range_m' || id === 'mpv9' || id === 'bus14')
            return '8–14人 · 中巴';
        if (id === 'range_l' || id === 'bus20')
            return '15人以上 · 大巴';
        return id;
    }
    rideOptionIdOf(optionId) {
        const id = String(optionId || '').trim();
        if (id === 'van7' || id === 'range_s')
            return 'range_s';
        if (id === 'mpv9' || id === 'bus14' || id === 'range_m')
            return 'range_m';
        if (id === 'bus20' || id === 'range_l')
            return 'range_l';
        return 'none';
    }
    hasAdminRentalInput(body) {
        if (!body || typeof body !== 'object')
            return false;
        return body.rental != null || body.rentalOptionId != null || body.optionId != null
            || body.rentalDriverName != null || body.driverName != null;
    }
    buildAdminRental(body) {
        const src = (body && body.rental && typeof body.rental === 'object') ? body.rental : (body || {});
        const optionId = String(src.rentalOptionId ?? src.optionId ?? src.vehicleType ?? 'none').trim() || 'none';
        const none = optionId === 'none';
        const text = (value) => {
            const s = String(value ?? '').trim();
            return s.length > 0 ? s : null;
        };
        const feeN = Number(src.rentalFee ?? src.fee ?? 0);
        return {
            rentalOptionId: none ? null : optionId,
            rentalDriverId: none ? null : text(src.rentalDriverId ?? src.driverId),
            rentalFee: none || !Number.isFinite(feeN) || feeN <= 0 ? null : String(feeN),
            rentalDriverName: none ? null : text(src.rentalDriverName ?? src.driverName),
            rentalDriverPhone: none ? null : text(src.rentalDriverPhone ?? src.driverPhone),
            rentalDriverWechat: none ? null : text(src.rentalDriverWechat ?? src.driverWechat),
            rentalVehicleName: none ? null : text(src.rentalVehicleName ?? src.vehicleName),
            rentalPlateNo: none ? null : text(src.rentalPlateNo ?? src.plateNo),
            pickupAddress: none ? null : text(src.pickupAddress),
        };
    }
    serializeConsoleRental(booking) {
        const optionId = booking.rentalOptionId || 'none';
        return {
            optionId: this.rideOptionIdOf(optionId),
            storedOptionId: optionId || 'none',
            optionLabel: this.rideLabelOf(optionId),
            driverId: booking.rentalDriverId || '',
            driverName: booking.rentalDriverName || '',
            driverPhone: booking.rentalDriverPhone || '',
            driverWechat: booking.rentalDriverWechat || '',
            vehicleName: booking.rentalVehicleName || '',
            plateNo: booking.rentalPlateNo || '',
            pickupAddress: booking.pickupAddress || '',
            fee: booking.rentalFee != null ? booking.rentalFee.toString() : '',
        };
    }
    serializeConsoleBooking(booking, group = [booking]) {
        const serialized = this.serializeBooking(booking, group);
        return {
            id: serialized.id,
            bookingGroupId: serialized.bookingGroupId,
            status: serialized.status,
            amount: serialized.groupAmount || serialized.amount,
            createdAt: serialized.createdAt,
            paidAt: serialized.paidAt,
            completedAt: serialized.completedAt,
            cancelledAt: serialized.cancelledAt,
            tripPlan: booking.tripPlan || null,
            days: this.consoleTripDays(booking.tripPlan),
            rental: this.serializeConsoleRental(booking),
            project: {
                id: booking.project.id,
                title: booking.project.title,
                status: booking.project.status,
                location: booking.project.location || '',
                enterpriseName: booking.project.enterprise
                    ? (booking.project.enterprise.shortName || booking.project.enterprise.name || '')
                    : '',
            },
        };
    }
    withAdminPassword(user) {
        const { passwordPlain, ...rest } = user;
        const password = passwordPlain ?? '';
        return {
            ...rest,
            password,
            passwordPlain: password,
        };
    }
    mapAvatarTheme(value) {
        if (value == null || value === '')
            return undefined;
        const theme = Math.floor(Number(value));
        if (!Number.isFinite(theme))
            return 0;
        return Math.max(0, Math.min(5, theme));
    }
    avatarDir() {
        return (0, path_1.join)(process.cwd(), 'uploads', 'avatars');
    }
    avatarPublicPath(filename) {
        return `http://127.0.0.1:8080/media/avatars/${filename}`;
    }
    cleanupUserAvatarFiles(userId, keepFilename) {
        const dir = this.avatarDir();
        if (!(0, fs_1.existsSync)(dir))
            return;
        const files = (0, fs_1.readdirSync)(dir);
        for (const filename of files) {
            if (filename === keepFilename || !this.isUserAvatarFilename(userId, filename))
                continue;
            try {
                (0, fs_1.unlinkSync)((0, path_1.join)(dir, filename));
            }
            catch {
            }
        }
    }
    isUserAvatarFilename(userId, filename) {
        if (!/^[a-zA-Z0-9_-]+\.(jpg|jpeg|png|webp)$/.test(filename))
            return false;
        return filename.startsWith(`${userId}.`) || filename.startsWith(`${userId}_`);
    }
    publicApiPrefix() {
        const configured = (this.config.get('PUBLIC_API_PREFIX') ?? '').trim();
        const prefix = configured || '/mqlt';
        if (!prefix)
            return '';
        return (prefix.startsWith('/') ? prefix : `/${prefix}`).replace(/\/$/, '');
    }
    avatarExtension(file) {
        const sourceExt = (0, path_1.extname)(String(file.originalname ?? '')).toLowerCase();
        if (['.jpg', '.jpeg', '.png', '.webp'].includes(sourceExt))
            return sourceExt;
        const buffer = file.buffer;
        if (buffer != null) {
            if (this.isPng(buffer))
                return '.png';
            if (this.isWebp(buffer))
                return '.webp';
            if (this.isJpeg(buffer))
                return '.jpg';
        }
        if (file.mimetype === 'image/png')
            return '.png';
        if (file.mimetype === 'image/webp')
            return '.webp';
        return '.jpg';
    }
    isSupportedAvatarImage(file) {
        if (['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) {
            return true;
        }
        const sourceExt = (0, path_1.extname)(String(file.originalname ?? '')).toLowerCase();
        if (['.jpg', '.jpeg', '.png', '.webp'].includes(sourceExt))
            return true;
        const buffer = file.buffer;
        return buffer != null && (this.isJpeg(buffer) || this.isPng(buffer) || this.isWebp(buffer));
    }
    isJpeg(buffer) {
        return buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8;
    }
    isPng(buffer) {
        return (buffer.length >= 8 &&
            buffer[0] === 0x89 &&
            buffer[1] === 0x50 &&
            buffer[2] === 0x4e &&
            buffer[3] === 0x47 &&
            buffer[4] === 0x0d &&
            buffer[5] === 0x0a &&
            buffer[6] === 0x1a &&
            buffer[7] === 0x0a);
    }
    isWebp(buffer) {
        return (buffer.length >= 12 &&
            buffer.toString('ascii', 0, 4) === 'RIFF' &&
            buffer.toString('ascii', 8, 12) === 'WEBP');
    }
    serializeConsoleProject(project) {
        const organizers = (project.organizers || []).map((item) => item.user || item);
        const admins = (project.admins || []).map((item) => item.user || item);
        return {
            id: project.id,
            enterpriseId: project.enterpriseId || '',
            enterpriseName: project.enterprise ? (project.enterprise.shortName || project.enterprise.name || '') : '',
            title: project.title,
            subtitle: project.subtitle || '',
            publisherDisplayName: project.publisherDisplayName || '',
            category: project.category || '',
            price: project.price != null ? project.price.toString() : '0',
            status: project.status,
            enrolled: project.enrolled || 0,
            maxCapacity: project.maxCapacity || 0,
            bookableDays: project.bookableDays != null ? Number(project.bookableDays) : 7,
            dayOps: (project.dayOps && typeof project.dayOps === 'object' && !Array.isArray(project.dayOps)) ? project.dayOps : {},
            tags: Array.isArray(project.tags) ? project.tags : [],
            mediaColors: Array.isArray(project.mediaColors) ? project.mediaColors : [],
            location: project.location || '',
            locationLatitude: project.departureLatitude != null ? Number(project.departureLatitude) : null,
            locationLongitude: project.departureLongitude != null ? Number(project.departureLongitude) : null,
            documents: project.documents || [],
            contactPhone: project.contactPhone || '',
            contactServiceTime: project.contactServiceTime || '',
            contactWechat: project.contactWechat || '',
            contacts: Array.isArray(project.contacts) ? project.contacts : (Array.isArray(project.projectContacts) ? project.projectContacts : []),
            projectContacts: Array.isArray(project.projectContacts) ? project.projectContacts : (Array.isArray(project.contacts) ? project.contacts : []),
            openDate: project.openDate || '',
            startTime: project.startTime,
            endTime: project.endTime,
            departureMode: project.departureMode || 'walk',
            departureTitle: project.departureTitle || '',
            departureLatitude: project.departureLatitude,
            departureLongitude: project.departureLongitude,
            dropoffTitle: project.dropoffTitle || '',
            dropoffLatitude: project.dropoffLatitude,
            dropoffLongitude: project.dropoffLongitude,
            vehiclePlateNo: project.vehiclePlateNo || '',
            driverName: project.driverName || '',
            driverPhone: project.driverPhone || '',
            organizers,
            admins,
            organizerCount: organizers.length,
            adminCount: admins.length,
            bookingCount: project._count ? project._count.bookings : 0,
            reviewNote: project.reviewNote || '',
            pendingRevision: project.pendingRevision || null,
            hasPendingRevision: false,
            reviewKind: '',
            createdAt: project.createdAt,
            updatedAt: project.updatedAt,
        };
    }
    studyProjectInclude() {
        return {
            enterprise: { select: { id: true, name: true, shortName: true } },
            organizers: { include: { user: { select: { id: true, nickname: true, phone: true, studyNo: true, realName: true } } }, orderBy: { createdAt: 'asc' } },
            admins: { include: { user: { select: { id: true, nickname: true, phone: true, studyNo: true, realName: true } } }, orderBy: { createdAt: 'asc' } },
            _count: { select: { bookings: true } },
        };
    }
    async studyProjects(keyword, status, page, pageSize, actor, enterpriseId, review) {
        const search = String(keyword || '').trim();
        const st = String(status || '').trim();
        const where = {};
        const eid = this.scopeEnterpriseId(actor, enterpriseId);
        if (eid)
            where.enterpriseId = eid;
        else
            this.applyActorEnterpriseFilter(where, actor);
        const scoped = this.scopedProjectIds(actor);
        if (scoped)
            where.id = { in: scoped };
        if (search) {
            where.OR = [
                { title: { contains: search } },
                { subtitle: { contains: search } },
                { location: { contains: search } },
                { category: { contains: search } },
            ];
        }
        const rv = String(review || '').trim();
        const revMode = (st === '已驳回') ? 'rejected' : ((st === '待审批' || st === 'revision') ? 'pending' : 'any');
        const pendingRevIds = rv === 'pending' ? await this.listRevisionProjectIds(actor, enterpriseId, revMode) : [];
        if (rv === 'pending') {
            if (st === 'revision') {
                where.id = { in: pendingRevIds.length ? pendingRevIds : ['__none__'] };
            }
            else {
                const statusClause = (st === '已驳回')
                    ? { status: '已驳回' }
                    : (st === '待审批')
                        ? { status: '待审批' }
                        : { status: { in: STUDY_PROJECT_HIDDEN_STATUSES } };
                if (pendingRevIds.length)
                    where.AND = [{ OR: [statusClause, { id: { in: pendingRevIds } }] }];
                else
                    Object.assign(where, statusClause);
            }
        }
        else if (st && st !== 'all')
            where.status = st;
        else
            where.status = { notIn: STUDY_PROJECT_HIDDEN_STATUSES };
        const paged = page != null && String(page).trim() !== '';
        const parsed = this.parsePage({ page: paged ? page : 1, pageSize: pageSize || 20 }, 20);
        const [total, projects] = await Promise.all([
            this.prisma.studyProject.count({ where }),
            this.prisma.studyProject.findMany({
                where,
                include: this.studyProjectInclude(),
                orderBy: { createdAt: 'desc' },
                ...(paged ? { skip: parsed.skip, take: parsed.pageSize } : {}),
            }),
        ]);
        const items = projects.map((project) => this.serializeConsoleProject(project));
        await this.attachRevisionMeta(items);
        await this.attachLiveBookingMeta(items);
        if (items.length) {
            await this.ensurePublisherDisplayColumns();
            try {
                const ids = items.map((row) => row.id);
                const ph = ids.map((_, i) => '$' + (i + 1)).join(',');
                const pubs = await this.prisma.$queryRawUnsafe(`SELECT id, "publisherDisplayName" FROM "StudyProject" WHERE id IN (${ph})`, ...ids);
                const pmap = {};
                for (let i = 0; i < (pubs || []).length; i++)
                    pmap[pubs[i].id] = pubs[i].publisherDisplayName || '';
                for (let i = 0; i < items.length; i++)
                    items[i].publisherDisplayName = pmap[items[i].id] || '';
            }
            catch (_err) { }
        }
        if (!paged)
            return items;
        const statsRows = await this.prisma.studyProject.groupBy({ by: ['status'], where, _count: { _all: true } });
        const stats = { total, open: 0, full: 0, live: 0, ended: 0, closed: 0, pending: 0, rejected: 0 };
        for (const row of statsRows) {
            const n = row._count._all;
            if (row.status === '可预约')
                stats.open = n;
            else if (row.status === '预约满员')
                stats.full = n;
            else if (row.status === '正在进行中')
                stats.live = n;
            else if (row.status === '已结束')
                stats.ended = n;
            else if (row.status === '暂未开放')
                stats.closed = n;
            else if (row.status === '待审批')
                stats.pending = n;
            else if (row.status === '已驳回')
                stats.rejected = n;
        }
        try {
            const extraPending = await this.listRevisionProjectIds(actor, enterpriseId, 'pending');
            const extraRejected = await this.listRevisionProjectIds(actor, enterpriseId, 'rejected');
            stats.pending += extraPending.length;
            stats.rejected += extraRejected.length;
        }
        catch (_err) { }
        return { items, total, page: parsed.page, pageSize: parsed.pageSize, stats };
    }
    async studyProjectDetail(id, actor) {
        const project = await this.prisma.studyProject.findUnique({
            where: { id: String(id) },
            include: this.studyProjectInclude(),
        });
        if (!project)
            throw new common_1.NotFoundException('Study project not found');
        this.assertEnterpriseScope(project, actor);
        const packed = this.serializeConsoleProject(project);
        await this.attachRevisionMeta([packed]);
        await this.attachLiveBookingMeta([packed]);
        return packed;
    }
    async createStudyProject(body, actor) {
        const title = String((body && body.title) || '').trim();
        if (title.length < 2)
            throw new common_1.BadRequestException('请填写项目名称');
        const id = String((body && body.id) || '').trim() || ('sp_' + (0, crypto_1.randomUUID)());
        const scoped = this.enterpriseIdOf(actor);
        const enterpriseId = scoped || String((body && body.enterpriseId) || '').trim() || null;
        if (scoped && !enterpriseId)
            throw new common_1.BadRequestException('入驻企业账号必须绑定企业');
        const merchant = !!(actor && actor.merchantAccess && !actor.mpAccess);
        const project = await this.prisma.studyProject.create({
            data: {
                id,
                enterpriseId,
                title,
                subtitle: String((body && body.subtitle) || '').trim(),
                category: merchant ? '' : (String((body && body.category) || '').trim() || '企业研学'),
                price: String((body && body.price) != null ? body.price : 0),
                status: merchant ? '待审批' : this.mapStudyProjectStatus(String((body && body.status) || '可预约')),
                enrolled: 0,
                maxCapacity: Math.max(1, Number((body && body.maxCapacity) || 30) || 30),
                tags: merchant ? [] : (Array.isArray(body && body.tags) ? body.tags.map((t) => String(t).trim()).filter(Boolean) : []),
                gradientStart: String((body && body.gradientStart) || '#0F3F3A'),
                gradientEnd: String((body && body.gradientEnd) || '#C9A227'),
                mediaColors: Array.isArray(body && body.mediaColors) ? body.mediaColors.map((t) => String(t).trim()).filter(Boolean) : [],
                location: String((body && body.location) || '').trim() || null,
                documents: body && body.documents != null ? this.normalizeStudyProjectDocuments(body.documents) : [],
                contactPhone: this.mapNullableText(body && body.contactPhone),
                openDate: String((body && body.openDate) || '').trim() || null,
                departureMode: this.mapDepartureMode((body && (body.departureMode || body.mode)) || 'walk'),
                departureTitle: this.mapNullableText(body && body.departureTitle),
                departureLatitude: this.mapNullableLatitude(body && (body.locationLatitude ?? body.departureLatitude)),
                departureLongitude: this.mapNullableLongitude(body && (body.locationLongitude ?? body.departureLongitude)),
                dropoffTitle: this.mapNullableText(body && body.dropoffTitle),
                vehiclePlateNo: this.mapNullableText(body && body.vehiclePlateNo),
                driverName: this.mapNullableText(body && body.driverName),
                driverPhone: this.mapNullableText(body && body.driverPhone),
            },
            include: this.studyProjectInclude(),
        });
        const packed = this.serializeConsoleProject(project);
        try { await this.writeLiveBookingFields(project.id, body || {}); } catch (_e) {}
        try {
            if (body && (body.contacts != null || body.projectContacts != null))
                await this.writeProjectContacts(project.id, body.contacts != null ? body.contacts : body.projectContacts);
        } catch (_e2) {}
        await this.attachLiveBookingMeta([packed]);
        await this.writeOpLog(actor, { module: 'study', action: 'create', targetType: 'StudyProject', targetId: project.id, targetLabel: project.title, summary: '创建研学项目 ' + project.title, projectId: project.id, enterpriseId: project.enterpriseId || undefined, detail: { status: project.status, projectId: project.id, enterpriseId: project.enterpriseId || '' } });
        return packed;
    }
    parsePendingRevision(raw) {
        if (raw == null)
            return null;
        try {
            const obj = typeof raw === 'string' ? JSON.parse(raw) : raw;
            if (!obj || typeof obj !== 'object' || Array.isArray(obj))
                return null;
            if (!Object.keys(obj).length)
                return null;
            return obj;
        }
        catch (_err) {
            return null;
        }
    }
    async ensureStudyRevisionColumn() {
        if (this._studyRevisionCol)
            return;
        await this.ensureStudyReviewColumn();
        try {
            await this.prisma.$executeRawUnsafe(`ALTER TABLE "StudyProject" ADD COLUMN IF NOT EXISTS "pendingRevision" JSONB`);
        }
        catch (_err) { }
        this._studyRevisionCol = true;
    }
    async attachRevisionMeta(items) {
        if (!items || !items.length)
            return items;
        await this.ensureStudyRevisionColumn();
        try {
            const ids = items.map((row) => row.id);
            const ph = ids.map((_, i) => '$' + (i + 1)).join(',');
            const rows = await this.prisma.$queryRawUnsafe(`SELECT id, "reviewNote", "pendingRevision" FROM "StudyProject" WHERE id IN (${ph})`, ...ids);
            const map = {};
            for (let i = 0; i < (rows || []).length; i++) {
                const rev = this.parsePendingRevision(rows[i].pendingRevision);
                map[rows[i].id] = { reviewNote: rows[i].reviewNote || '', pendingRevision: rev };
            }
            for (let i = 0; i < items.length; i++) {
                const extra = map[items[i].id] || {};
                const rev = extra.pendingRevision || null;
                items[i].reviewNote = extra.reviewNote || items[i].reviewNote || '';
                items[i].pendingRevision = rev;
                items[i].hasPendingRevision = !!rev;
                const hidden = STUDY_PROJECT_HIDDEN_STATUSES.indexOf(String(items[i].status || '')) >= 0;
                items[i].reviewKind = hidden ? 'create' : (rev ? 'update' : '');
            }
        }
        catch (_err) { }
        return items;
    }
    async listRevisionProjectIds(actor, enterpriseId, mode) {
        await this.ensureStudyRevisionColumn();
        try {
            const rows = await this.prisma.$queryRawUnsafe(`SELECT id, "enterpriseId", "status", "pendingRevision" FROM "StudyProject" WHERE "pendingRevision" IS NOT NULL`);
            const forced = this.enterpriseIdOf(actor);
            const eid = forced || String(enterpriseId || '').trim();
            const ents = this.scopedEnterpriseIds(actor);
            const scoped = this.scopedProjectIds(actor);
            const out = [];
            for (let i = 0; i < (rows || []).length; i++) {
                const row = rows[i];
                const rev = this.parsePendingRevision(row.pendingRevision);
                if (!rev)
                    continue;
                const hidden = STUDY_PROJECT_HIDDEN_STATUSES.indexOf(String(row.status || '')) >= 0;
                if (hidden)
                    continue;
                const rejected = !!rev.rejected;
                if (mode === 'pending' && rejected)
                    continue;
                if (mode === 'rejected' && !rejected)
                    continue;
                const rowEid = String(row.enterpriseId || '').trim();
                if (eid && rowEid !== eid)
                    continue;
                if (ents && rowEid && ents.indexOf(rowEid) < 0)
                    continue;
                if (scoped && scoped.indexOf(String(row.id)) < 0)
                    continue;
                out.push(row.id);
            }
            return out;
        }
        catch (_err) {
            return [];
        }
    }
    buildPendingRevision(body, current, actor) {
        const nextStatus = (body && body.status != null) ? this.mapStudyProjectStatus(String(body.status)) : current.status;
        const rev = {
            title: String((body && body.title) != null ? body.title : (current.title || '')).trim(),
            subtitle: String((body && body.subtitle) != null ? body.subtitle : (current.subtitle || '')).trim(),
            price: body && body.price != null ? String(body.price) : (current.price != null ? String(current.price) : '0'),
            status: STUDY_PROJECT_HIDDEN_STATUSES.indexOf(nextStatus) >= 0 ? current.status : nextStatus,
            maxCapacity: body && body.maxCapacity != null ? Number(body.maxCapacity) : Number(current.maxCapacity || 30),
            bookableDays: body && body.bookableDays != null ? Math.max(1, Math.min(365, Number(body.bookableDays) || 7)) : Number(current.bookableDays || 7),
            enrolled: body && body.enrolled != null ? Number(body.enrolled) : Number(current.enrolled || 0),
            location: body && body.location != null ? String(body.location).trim() : (current.location || ''),
            locationLatitude: (body && (body.locationLatitude !== undefined || body.departureLatitude != null))
                ? (body.locationLatitude ?? body.departureLatitude)
                : (current.departureLatitude != null ? Number(current.departureLatitude) : null),
            locationLongitude: (body && (body.locationLongitude !== undefined || body.departureLongitude != null))
                ? (body.locationLongitude ?? body.departureLongitude)
                : (current.departureLongitude != null ? Number(current.departureLongitude) : null),
            contactPhone: body && body.contactPhone != null ? this.mapNullableText(body.contactPhone) : (current.contactPhone || ''),
            mediaColors: Array.isArray(body && body.mediaColors)
                ? body.mediaColors.map((t) => String(t).trim()).filter(Boolean)
                : (Array.isArray(current.mediaColors) ? current.mediaColors : []),
            submittedAt: new Date().toISOString(),
            submittedBy: actor && actor.id ? String(actor.id) : '',
            rejected: false,
        };
        return rev;
    }
    revisionToUpdateData(rev) {
        if (!rev)
            return {};
        const data = {};
        if (rev.title != null)
            data.title = String(rev.title).trim();
        if (rev.subtitle != null)
            data.subtitle = String(rev.subtitle).trim();
        if (rev.price != null)
            data.price = String(rev.price);
        if (rev.status != null && STUDY_PROJECT_HIDDEN_STATUSES.indexOf(String(rev.status)) < 0)
            data.status = this.mapStudyProjectStatus(String(rev.status));
        if (rev.maxCapacity != null)
            data.maxCapacity = Number(rev.maxCapacity);
        // bookableDays written via writeLiveBookingFields (Prisma client may lack field)
        if (rev.enrolled != null)
            data.enrolled = Number(rev.enrolled);
        if (rev.location != null)
            data.location = String(rev.location).trim() || null;
        if (rev.contactPhone != null)
            data.contactPhone = this.mapNullableText(rev.contactPhone);
        if (Array.isArray(rev.mediaColors))
            data.mediaColors = rev.mediaColors.map((t) => String(t).trim()).filter(Boolean);
        if (rev.locationLatitude !== undefined)
            data.departureLatitude = this.mapNullableLatitude(rev.locationLatitude);
        if (rev.locationLongitude !== undefined)
            data.departureLongitude = this.mapNullableLongitude(rev.locationLongitude);
        return data;
    }
    async updateStudyProject(id, body, actor) {
        await this.assertProjectCapability(id, actor, 'project.edit');
        await this.ensureStudyProject(id);
        const data = {
            title: body.title,
            subtitle: body.subtitle,
            category: body.category,
            price: body.price != null ? String(body.price) : undefined,
            status: body.status != null ? this.mapStudyProjectStatus(String(body.status)) : undefined,
            enrolled: body.enrolled != null ? Number(body.enrolled) : undefined,
            maxCapacity: body.maxCapacity != null ? Number(body.maxCapacity) : undefined,
            tags: body.tags,
            gradientStart: body.gradientStart,
            gradientEnd: body.gradientEnd,
            mediaColors: body.mediaColors,
            location: body.location,
            documents: body.documents != null ? this.normalizeStudyProjectDocuments(body.documents) : undefined,
            contactPhone: body.contactPhone != null ? this.mapNullableText(body.contactPhone) : undefined,
            openDate: body.openDate,
            liveStage: body.liveStage != null ? this.mapStudyLiveStage(body.liveStage) : undefined,
            departureMode: body.departureMode != null || body.mode != null ? this.mapDepartureMode(body.departureMode ?? body.mode) : undefined,
            departureTitle: body.departureTitle != null ? this.mapNullableText(body.departureTitle) : undefined,
            departureLatitude: (body.locationLatitude !== undefined || body.departureLatitude != null)
                ? this.mapNullableLatitude(body.locationLatitude ?? body.departureLatitude)
                : undefined,
            departureLongitude: (body.locationLongitude !== undefined || body.departureLongitude != null)
                ? this.mapNullableLongitude(body.locationLongitude ?? body.departureLongitude)
                : undefined,
            dropoffTitle: body.dropoffTitle != null ? this.mapNullableText(body.dropoffTitle) : undefined,
            dropoffLatitude: body.dropoffLatitude != null ? this.mapNullableLatitude(body.dropoffLatitude) : undefined,
            dropoffLongitude: body.dropoffLongitude != null ? this.mapNullableLongitude(body.dropoffLongitude) : undefined,
            vehiclePlateNo: body.vehiclePlateNo != null ? this.mapNullableText(body.vehiclePlateNo) : undefined,
            driverName: body.driverName != null ? this.mapNullableText(body.driverName) : undefined,
            driverPhone: body.driverPhone != null ? this.mapNullableText(body.driverPhone) : undefined,
        };
        const scoped = this.enterpriseIdOf(actor);
        if (body.enterpriseId !== undefined && !scoped)
            data.enterpriseId = String(body.enterpriseId || '').trim() || null;
        const current = await this.prisma.studyProject.findUnique({ where: { id } });
        if (!current)
            throw new common_1.NotFoundException('Study project not found');
        this.assertEnterpriseScope(current, actor);
        const merchantOnly = !!(actor && actor.merchantAccess && !actor.mpAccess);
        const wantsReview = !!(body && (body.submitForReview === true || body.submitForReview === 'true' || body.submitForReview === 1));
        // Only first create / unpublished resubmit needs审批. After approved once, edits apply immediately.
        let clearPendingRevision = false;
        if (merchantOnly || wantsReview) {
            delete data.category;
            delete data.tags;
            const unpublished = current.status === '待审批' || current.status === '已驳回';
            if (unpublished) {
                data.status = '待审批';
            }
            else {
                if (data.status != null && STUDY_PROJECT_HIDDEN_STATUSES.indexOf(String(data.status)) >= 0)
                    delete data.status;
                clearPendingRevision = true;
            }
        }
        const project = await this.prisma.studyProject.update({
            where: { id },
            data,
            include: this.studyProjectInclude(),
        });
        try { await this.writeLiveBookingFields(id, body || {}); } catch (_e) {}
        try {
            if (body && (body.contacts != null || body.projectContacts != null))
                await this.writeProjectContacts(id, body.contacts != null ? body.contacts : body.projectContacts);
        } catch (_e2) {}
        if (clearPendingRevision) {
            try {
                await this.ensureStudyRevisionColumn();
                await this.prisma.$executeRawUnsafe(`UPDATE "StudyProject" SET "pendingRevision"=NULL, "reviewNote"=$1, "updatedAt"=NOW() WHERE id=$2`, '', String(id));
            }
            catch (_e3) { }
        }
        const packed = this.serializeConsoleProject(project);
        await this.attachRevisionMeta([packed]);
        await this.attachLiveBookingMeta([packed]);
        await this.writeOpLog(actor, { module: 'study', action: 'update', targetType: 'StudyProject', targetId: id, targetLabel: project.title, summary: '修改研学项目 ' + project.title, projectId: id, enterpriseId: project.enterpriseId || undefined, detail: { status: project.status, projectId: id, enterpriseId: project.enterpriseId || '', kind: clearPendingRevision ? 'direct-edit' : 'update' } });
        return packed;
    }
    async ensureStudyReviewColumn() {
        if (this._studyReviewCol)
            return;
        try {
            await this.prisma.$executeRawUnsafe(`ALTER TABLE "StudyProject" ADD COLUMN IF NOT EXISTS "reviewNote" TEXT`);
        }
        catch (_err) { }
        this._studyReviewCol = true;
    }
    async reviewStudyProject(id, body, actor) {
        this.assertPlatformEnterprise(actor);
        await this.ensureStudyRevisionColumn();
        const current = await this.prisma.studyProject.findUnique({ where: { id: String(id) } });
        if (!current)
            throw new common_1.NotFoundException('项目不存在');
        let pendingRev = null;
        try {
            const rows = await this.prisma.$queryRawUnsafe(`SELECT "pendingRevision", "reviewNote" FROM "StudyProject" WHERE id=$1`, current.id);
            if (rows && rows[0]) {
                pendingRev = this.parsePendingRevision(rows[0].pendingRevision);
                current.reviewNote = rows[0].reviewNote || '';
            }
        }
        catch (_err) { }
        const action = String((body && body.action) || '').trim();
        const unpublished = STUDY_PROJECT_HIDDEN_STATUSES.indexOf(String(current.status || '')) >= 0;
        if (action === 'reject') {
            const note = String((body && body.note) || '').trim();
            if (unpublished) {
                await this.prisma.studyProject.update({ where: { id: current.id }, data: { status: '已驳回' } });
                await this.prisma.$executeRawUnsafe(`UPDATE "StudyProject" SET "reviewNote"=$1, "updatedAt"=NOW() WHERE id=$2`, note, current.id);
            }
            else if (pendingRev) {
                pendingRev.rejected = true;
                await this.prisma.$executeRawUnsafe(`UPDATE "StudyProject" SET "pendingRevision"=$1::jsonb, "reviewNote"=$2, "updatedAt"=NOW() WHERE id=$3`, JSON.stringify(pendingRev), note, current.id);
            }
            else {
                throw new common_1.BadRequestException('没有待审内容');
            }
            await this.writeOpLog(actor, { module: 'study', action: 'update', targetType: 'StudyProject', targetId: current.id, targetLabel: current.title, summary: (unpublished ? '驳回研学项目 ' : '驳回研学项目修改 ') + current.title, detail: { note, kind: unpublished ? 'create' : 'update' } });
            return this.studyProjectDetail(current.id, actor);
        }
        if (action === 'approve') {
            const category = String((body && body.category) || current.category || '').trim();
            if (!category)
                throw new common_1.BadRequestException('请选择分类');
            const tags = Array.isArray(body && body.tags) ? body.tags.map((t) => String(t).trim()).filter(Boolean) : (Array.isArray(current.tags) ? current.tags : []);
            if (unpublished) {
                const nextStatus = this.mapStudyProjectStatus(String((body && body.status) || '暂未开放'));
                if (STUDY_PROJECT_HIDDEN_STATUSES.indexOf(nextStatus) >= 0)
                    throw new common_1.BadRequestException('通过后请选择上架状态');
                await this.prisma.studyProject.update({
                    where: { id: current.id },
                    data: { category, tags, status: nextStatus },
                });
            }
            else if (pendingRev) {
                const data = this.revisionToUpdateData(pendingRev);
                try { if (pendingRev && pendingRev.bookableDays != null) await this.writeLiveBookingFields(current.id, { bookableDays: pendingRev.bookableDays }); } catch (_e) {}
                data.category = category;
                data.tags = tags;
                if (body && body.status)
                    data.status = this.mapStudyProjectStatus(String(body.status));
                if (data.status && STUDY_PROJECT_HIDDEN_STATUSES.indexOf(String(data.status)) >= 0)
                    delete data.status;
                await this.prisma.studyProject.update({
                    where: { id: current.id },
                    data,
                });
            }
            else {
                throw new common_1.BadRequestException('没有待审内容');
            }
            await this.prisma.$executeRawUnsafe(`UPDATE "StudyProject" SET "reviewNote"=$1, "pendingRevision"=NULL, "updatedAt"=NOW() WHERE id=$2`, '', current.id);
            await this.writeOpLog(actor, { module: 'study', action: 'update', targetType: 'StudyProject', targetId: current.id, targetLabel: current.title, summary: (unpublished ? '通过研学项目 ' : '通过研学项目修改 ') + current.title, detail: { category, tags, kind: unpublished ? 'create' : 'update' } });
            return this.studyProjectDetail(current.id, actor);
        }
        throw new common_1.BadRequestException('无效操作');
    }
    enterpriseIdOf(actor) {
        if (!actor || actor.mpAccess)
            return '';
        return String(actor.enterpriseId || '').trim();
    }
    scopeEnterpriseId(actor, requested) {
        const forced = this.enterpriseIdOf(actor);
        if (forced)
            return forced;
        const q = String(requested || '').trim();
        const ents = this.scopedEnterpriseIds(actor);
        if (q && actor && actor.mpAccess) {
            if (ents && ents.indexOf(q) < 0)
                throw new common_1.ForbiddenException('当前职位不能管理该企业');
            return q;
        }
        return '';
    }
    applyActorEnterpriseFilter(where, actor) {
        const ents = this.scopedEnterpriseIds(actor);
        if (!ents)
            return where;
        if (where.enterpriseId != null) {
            const cur = where.enterpriseId;
            if (typeof cur === 'string') {
                if (ents.indexOf(cur) < 0)
                    where.enterpriseId = { in: [] };
            }
            return where;
        }
        where.enterpriseId = { in: ents };
        return where;
    }
    scopedProjectIds(actor) {
        if (!actor)
            return null;
        const out = [];
        const pushAll = (raw) => {
            const list = Array.isArray(raw) ? raw : [];
            for (let i = 0; i < list.length; i++) {
                const id = String(list[i] || '').trim();
                if (id && out.indexOf(id) < 0) out.push(id);
            }
        };
        if (actor.mpAccess) {
            pushAll(actor.mpProjectIds);
            pushAll(actor.projectAccessIds);
            return out.length ? out : null;
        }
        if (!actor.merchantAccess)
            return null;
        pushAll(actor.merchantProjectIds);
        // project-only contacts: JWT may carry projectAccessIds when merchantProjectIds empty
        if (!out.length) pushAll(actor.projectAccessIds);
        return out.length ? out : null;
    }
    scopedEnterpriseIds(actor) {
        if (!actor || !actor.mpAccess)
            return null;
        const raw = Array.isArray(actor.mpEnterpriseIds) ? actor.mpEnterpriseIds : [];
        const out = [];
        for (let i = 0; i < raw.length; i++) {
            const id = String(raw[i] || '').trim();
            if (id && out.indexOf(id) < 0)
                out.push(id);
        }
        return out.length ? out : null;
    }
    assertEnterpriseScope(row, actor) {
        const eid = this.enterpriseIdOf(actor);
        if (eid) {
            if (String((row && row.enterpriseId) || '') !== eid)
                throw new common_1.ForbiddenException('只能管理本企业数据');
        }
        else {
            const ents = this.scopedEnterpriseIds(actor);
            const rowEid = String((row && row.enterpriseId) || '').trim();
            if (ents && rowEid && ents.indexOf(rowEid) < 0)
                throw new common_1.ForbiddenException('当前职位不能管理该企业');
        }
        const scoped = this.scopedProjectIds(actor);
        const pid = String((row && (row.projectId || row.id)) || '');
        if (scoped && pid && scoped.indexOf(pid) < 0)
            throw new common_1.ForbiddenException('当前职位不能管理该项目');
    }
    assertPlatformEnterprise(actor) {
        if (this.enterpriseIdOf(actor))
            throw new common_1.ForbiddenException('入驻企业账号不能管理其他企业');
    }
    serializeEnterprise(row, extra) {
        return Object.assign({
            id: row.id,
            name: row.name || '',
            shortName: row.shortName || '',
            publisherDisplayName: row.publisherDisplayName || '',
            licenseNo: row.licenseNo || '',
            contactName: row.contactName || '',
            contactPhone: row.contactPhone || '',
            contactWechat: row.contactWechat || '',
            address: row.address || '',
            intro: row.intro || '',
            status: row.status || 'ACTIVE',
            logoUrl: row.logoUrl || '',
            studyCommission: extra && extra.studyCommission != null ? extra.studyCommission : 0,
            mallCommission: extra && extra.mallCommission != null ? extra.mallCommission : 0,
            projectCount: extra && extra.projectCount != null ? extra.projectCount : 0,
            operatorCount: extra && extra.operatorCount != null ? extra.operatorCount : 0,
            dicts: extra && extra.dicts ? extra.dicts : this.defaultEnterpriseDicts(),
            createdAt: row.createdAt,
            updatedAt: row.updatedAt,
        }, extra && extra.more ? extra.more : {});
    }
    defaultEnterpriseDicts() {
        return {
            noticeTypes: ['测试分类'],
            mallCategories: ['文具礼品', '生活用品'],
            routeZones: [{ key: 'test', label: '测试分类' }],
        };
    }
    async ensureEnterpriseDictsColumn() {
        if (this._entDictsCol)
            return;
        try {
            await this.prisma.$executeRawUnsafe(`ALTER TABLE "Enterprise" ADD COLUMN IF NOT EXISTS dicts JSONB`);
        }
        catch (_err) { }
        this._entDictsCol = true;
    }
    async readEnterpriseDicts(id) {
        await this.ensureEnterpriseDictsColumn();
        try {
            const rows = await this.prisma.$queryRawUnsafe(`SELECT dicts FROM "Enterprise" WHERE id=$1`, id);
            const raw = rows && rows[0] ? rows[0].dicts : null;
            const parsed = raw && typeof raw === 'string' ? JSON.parse(raw) : raw;
            return Object.assign({}, this.defaultEnterpriseDicts(), parsed && typeof parsed === 'object' ? parsed : {});
        }
        catch (_err) {
            return this.defaultEnterpriseDicts();
        }
    }
    async writeEnterpriseDicts(id, dicts, actor) {
        await this.ensureEnterpriseDictsColumn();
        const incoming = Object.assign({}, dicts || {});
        // 资讯分类 is platform-unified (posts-cats); enterprises cannot CRUD noticeTypes.
        delete incoming.noticeTypes;
        const prev = await this.readEnterpriseDicts(id);
        const next = Object.assign({}, this.defaultEnterpriseDicts(), prev, incoming);
        next.noticeTypes = Array.isArray(prev.noticeTypes) ? prev.noticeTypes : this.defaultEnterpriseDicts().noticeTypes;
        void actor;
        await this.prisma.$executeRawUnsafe(`UPDATE "Enterprise" SET dicts=$1::jsonb, "updatedAt"=NOW() WHERE id=$2`, JSON.stringify(next), id);
        return next;
    }
    toMoney(v) {
        const n = Number(v);
        if (!Number.isFinite(n))
            return 0;
        return Math.round(n * 100) / 100;
    }
    monthRange(month) {
        const now = new Date();
        let y;
        let m; // 0-based
        try {
            const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit' }).formatToParts(now);
            const get = (t) => Number((parts.find((p) => p.type === t) || {}).value);
            y = get('year');
            m = get('month') - 1;
        } catch (_e) {
            const ms = now.getTime() + 8 * 3600000;
            const x = new Date(ms);
            y = x.getUTCFullYear();
            m = x.getUTCMonth();
        }
        const hit = String(month || '').trim().match(/^(\d{4})-(\d{1,2})$/);
        if (hit) {
            y = Number(hit[1]);
            m = Number(hit[2]) - 1;
            if (m < 0 || m > 11) {
                try {
                    const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit' }).formatToParts(now);
                    m = Number((parts.find((p) => p.type === 'month') || {}).value) - 1;
                } catch (_e2) {
                    m = new Date(now.getTime() + 8 * 3600000).getUTCMonth();
                }
            }
        }
        const mm = String(m + 1).padStart(2, '0');
        const from = new Date(y + '-' + mm + '-01T00:00:00.000+08:00');
        const ny = m === 11 ? y + 1 : y;
        const nm = m === 11 ? 1 : m + 2;
        const to = new Date(ny + '-' + String(nm).padStart(2, '0') + '-01T00:00:00.000+08:00');
        return {
            from,
            to,
            month: y + '-' + mm,
        };
    }
    inMonth(value, from, to) {
        const t = value ? new Date(value) : null;
        if (!t || Number.isNaN(t.getTime()))
            return false;
        return t >= from && t < to;
    }
    async ensureEnterpriseFinanceColumns() {
        if (this._entFinanceCols)
            return;
        try {
            await this.prisma.$executeRawUnsafe(`ALTER TABLE "Enterprise" ADD COLUMN IF NOT EXISTS "studyCommission" DECIMAL(5,2) DEFAULT 0`);
            await this.prisma.$executeRawUnsafe(`ALTER TABLE "Enterprise" ADD COLUMN IF NOT EXISTS "mallCommission" DECIMAL(5,2) DEFAULT 0`);
        }
        catch (_err) { }
        this._entFinanceCols = true;
    }
    async enterpriseCommissionRates(id) {
        await this.ensureEnterpriseFinanceColumns();
        try {
            const rows = await this.prisma.$queryRawUnsafe(`SELECT "studyCommission", "mallCommission" FROM "Enterprise" WHERE id = $1`, id);
            const row = rows && rows[0] ? rows[0] : {};
            return {
                studyCommission: this.toMoney(row.studyCommission),
                mallCommission: this.toMoney(row.mallCommission),
            };
        }
        catch (_err) {
            return { studyCommission: 0, mallCommission: 0 };
        }
    }
    async resolveFinanceEnterpriseId(id, actor) {
        const requested = String(id || '').trim();
        const forced = this.enterpriseIdOf(actor);
        if (forced) {
            if (requested && requested !== forced)
                throw new common_1.ForbiddenException('只能查看本企业财务');
            return forced;
        }
        if (!requested)
            throw new common_1.BadRequestException('请选择企业');
        return requested;
    }
    async listEnterprises(keyword, actor) {
        try {
            const eid = this.enterpriseIdOf(actor);
            const search = String(keyword || '').trim();
            const where = {};
            if (eid)
                where.id = eid;
            else {
                const ents = this.scopedEnterpriseIds(actor);
                if (ents)
                    where.id = { in: ents };
            }
            if (search) {
                where.OR = [
                    { name: { contains: search } },
                    { shortName: { contains: search } },
                    { contactName: { contains: search } },
                    { contactPhone: { contains: search } },
                ];
            }
            const rows = await this.prisma.enterprise.findMany({
                where,
                include: { _count: { select: { projects: true } } },
                orderBy: { createdAt: 'desc' },
                take: 200,
            });
            let counts = {};
            try {
                const ops = await this.prisma.$queryRawUnsafe(`SELECT "enterpriseId" AS id, COUNT(*)::int AS n FROM "ConsoleAccount" WHERE "enterpriseId" IS NOT NULL GROUP BY "enterpriseId"`);
                for (let i = 0; ops && i < ops.length; i++)
                    counts[String(ops[i].id)] = Number(ops[i].n || 0);
            }
            catch (_err) { }
            const rates = {};
            try {
                await this.ensureEnterpriseFinanceColumns();
                const rateRows = await this.prisma.$queryRawUnsafe(`SELECT id, "studyCommission", "mallCommission" FROM "Enterprise"`);
                for (let i = 0; rateRows && i < rateRows.length; i++) {
                    rates[String(rateRows[i].id)] = {
                        studyCommission: this.toMoney(rateRows[i].studyCommission),
                        mallCommission: this.toMoney(rateRows[i].mallCommission),
                    };
                }
            }
            catch (_err) { }
            await this.ensurePublisherDisplayColumns();
            try {
                const ids = rows.map((row) => row.id);
                if (ids.length) {
                    const ph = ids.map((_, i) => '$' + (i + 1)).join(',');
                    const pubs = await this.prisma.$queryRawUnsafe(`SELECT id, "publisherDisplayName" FROM "Enterprise" WHERE id IN (${ph})`, ...ids);
                    const pmap = {};
                    for (let i = 0; i < (pubs || []).length; i++)
                        pmap[pubs[i].id] = pubs[i].publisherDisplayName || '';
                    for (let i = 0; i < rows.length; i++)
                        rows[i].publisherDisplayName = pmap[rows[i].id] || '';
                }
            }
            catch (_err) { }
            return rows.map((row) => this.serializeEnterprise(row, Object.assign({
                projectCount: row._count ? row._count.projects : 0,
                operatorCount: counts[row.id] || 0,
            }, rates[row.id] || {})));
        }
        catch (_err) {
            return [];
        }
    }
    async enterpriseDetail(id, actor) {
        const row = await this.prisma.enterprise.findUnique({ where: { id: String(id) } });
        if (!row)
            throw new common_1.NotFoundException('企业不存在');
        const eid = this.enterpriseIdOf(actor);
        if (eid && eid !== row.id)
            throw new common_1.ForbiddenException('只能查看本企业');
        const ents = this.scopedEnterpriseIds(actor);
        if (ents && ents.indexOf(row.id) < 0)
            throw new common_1.ForbiddenException('当前职位不能查看该企业');
        const projects = await this.prisma.studyProject.findMany({
            where: { enterpriseId: row.id },
            select: { id: true, title: true, status: true, enrolled: true, maxCapacity: true },
            orderBy: { createdAt: 'desc' },
            take: 50,
        });
        let operators = [];
        try {
            const ops = await this.prisma.$queryRawUnsafe(`SELECT id, phone, name, status, "mpAccess", "mpRole", "merchantAccess" FROM "ConsoleAccount" WHERE "enterpriseId" = $1 ORDER BY "createdAt" DESC`, row.id);
            operators = (ops || []).map((item) => this.serializeConsoleOperator(item));
        }
        catch (_err) { }
        const rates = await this.enterpriseCommissionRates(row.id);
        const dicts = await this.readEnterpriseDicts(row.id);
        await this.ensurePublisherDisplayColumns();
        try {
            const pubs = await this.prisma.$queryRawUnsafe(`SELECT "publisherDisplayName" FROM "Enterprise" WHERE id = $1 LIMIT 1`, row.id);
            if (pubs && pubs[0])
                row.publisherDisplayName = pubs[0].publisherDisplayName || '';
        }
        catch (_err) { }
        return this.serializeEnterprise(row, {
            projectCount: projects.length,
            operatorCount: operators.length,
            studyCommission: rates.studyCommission,
            mallCommission: rates.mallCommission,
            dicts,
            more: { projects, operators },
        });
    }
    async createEnterprise(body, actor) {
        this.assertPlatformEnterprise(actor);
        const name = String((body && body.name) || '').trim();
        if (name.length < 2)
            throw new common_1.BadRequestException('请填写企业名称');
        const row = await this.prisma.enterprise.create({
            data: {
                name,
                shortName: String((body && body.shortName) || '').trim() || null,
                licenseNo: String((body && body.licenseNo) || '').trim() || null,
                contactName: String((body && body.contactName) || '').trim() || null,
                contactPhone: String((body && body.contactPhone) || '').trim() || null,
                contactWechat: String((body && body.contactWechat) || '').trim() || null,
                address: String((body && body.address) || '').trim() || null,
                intro: String((body && body.intro) || '').trim() || null,
                status: String((body && body.status) || 'ACTIVE').trim() || 'ACTIVE',
            },
        });
        await this.writeOpLog(actor, { module: 'settings', action: 'create', targetType: 'Enterprise', targetId: row.id, targetLabel: row.name, summary: '新增入驻企业 ' + row.name, detail: {} });
        try {
            const map = await this.loadSettingMap();
            await this.ensureEnterpriseFinanceColumns();
            await this.prisma.$executeRawUnsafe(
                `UPDATE "Enterprise" SET "studyCommission"=$1, "mallCommission"=$2 WHERE id=$3`,
                this.toMoney(map['feature.studyCommission']), this.toMoney(map['feature.mallCommission']), row.id
            );
        }
        catch (_err) { }
        const rates = await this.enterpriseCommissionRates(row.id);
        return this.serializeEnterprise(row, rates);
    }
    async updateEnterprise(id, body, actor) {
        const existed = await this.prisma.enterprise.findUnique({ where: { id: String(id) } });
        if (!existed)
            throw new common_1.NotFoundException('企业不存在');
        const eid = this.enterpriseIdOf(actor);
        if (eid && eid !== existed.id)
            throw new common_1.ForbiddenException('只能管理本企业');
        const data = {};
        if (body.name != null) {
            const name = String(body.name).trim();
            if (name.length < 2)
                throw new common_1.BadRequestException('请填写企业名称');
            data.name = name;
        }
        if (body.shortName !== undefined)
            data.shortName = String(body.shortName || '').trim() || null;
        if (body.licenseNo !== undefined)
            data.licenseNo = String(body.licenseNo || '').trim() || null;
        if (body.contactName !== undefined)
            data.contactName = String(body.contactName || '').trim() || null;
        if (body.contactPhone !== undefined)
            data.contactPhone = String(body.contactPhone || '').trim() || null;
        if (body.contactWechat !== undefined)
            data.contactWechat = String(body.contactWechat || '').trim() || null;
        if (body.address !== undefined)
            data.address = String(body.address || '').trim() || null;
        if (body.intro !== undefined)
            data.intro = String(body.intro || '').trim() || null;
        if (body.status != null)
            data.status = String(body.status).trim() || existed.status;
        const row = await this.prisma.enterprise.update({ where: { id: existed.id }, data });
        if (!this.enterpriseIdOf(actor) && (body.studyCommission != null || body.mallCommission != null)) {
            await this.ensureEnterpriseFinanceColumns();
            const rates = await this.enterpriseCommissionRates(existed.id);
            const studyRate = body.studyCommission != null ? Math.min(100, Math.max(0, this.toMoney(body.studyCommission))) : rates.studyCommission;
            const mallRate = body.mallCommission != null ? Math.min(100, Math.max(0, this.toMoney(body.mallCommission))) : rates.mallCommission;
            await this.prisma.$executeRawUnsafe(`UPDATE "Enterprise" SET "studyCommission"=$1, "mallCommission"=$2 WHERE id=$3`, studyRate, mallRate, existed.id);
        }
        if (body.dicts)
            await this.writeEnterpriseDicts(existed.id, body.dicts, actor);
        await this.writeOpLog(actor, { module: 'settings', action: 'update', targetType: 'Enterprise', targetId: row.id, targetLabel: row.name, summary: '修改入驻企业 ' + row.name, detail: {} });
        const rates = await this.enterpriseCommissionRates(row.id);
        const dicts = await this.readEnterpriseDicts(row.id);
        return this.serializeEnterprise(row, Object.assign({}, rates, { dicts }));
    }
    async deleteEnterprise(id, actor) {
        this.assertPlatformEnterprise(actor);
        const existed = await this.prisma.enterprise.findUnique({
            where: { id: String(id) },
            include: { _count: { select: { projects: true } } },
        });
        if (!existed)
            throw new common_1.NotFoundException('企业不存在');
        const n = existed._count ? existed._count.projects : 0;
        if (n > 0)
            throw new common_1.BadRequestException('该企业还有 ' + n + ' 个研学项目，请先解绑或删除项目');
        await this.prisma.enterprise.delete({ where: { id: existed.id } });
        try {
            await this.prisma.$executeRawUnsafe(`UPDATE "ConsoleAccount" SET "enterpriseId" = NULL, "merchantAccess" = FALSE, "updatedAt"=NOW() WHERE "enterpriseId" = $1`, existed.id);
        }
        catch (_err) { }
        await this.writeOpLog(actor, { module: 'settings', action: 'delete', targetType: 'Enterprise', targetId: existed.id, targetLabel: existed.name, summary: '删除入驻企业 ' + existed.name, detail: {} });
        return { id: existed.id, deleted: true };
    }
    ledgerTime(row) {
        return row.paidAt || row.completedAt || row.createdAt;
    }
    projectCoverUrl(mediaColors) {
        const list = Array.isArray(mediaColors) ? mediaColors : [];
        for (let i = 0; i < list.length; i++) {
            const u = String(list[i] || '').trim();
            if (!u)
                continue;
            if (u.indexOf('http') === 0 || u.indexOf('/') === 0 || u.indexOf('public/') === 0)
                return u;
        }
        return '';
    }
    productCoverUrl(imageUrl, icon, gallery) {
        const direct = String(imageUrl || icon || '').trim();
        if (direct)
            return direct;
        let list = gallery;
        if (typeof list === 'string') {
            try {
                list = JSON.parse(list);
            }
            catch (_err) {
                list = [];
            }
        }
        if (!Array.isArray(list))
            return '';
        for (let i = 0; i < list.length; i++) {
            const raw = list[i];
            const u = String((raw && raw.url) || raw || '').trim();
            if (u)
                return u;
        }
        return '';
    }
    financeSplit(amount, rate) {
        const gross = this.toMoney(amount);
        const pct = Math.min(100, Math.max(0, this.toMoney(rate)));
        const platformCut = this.toMoney(gross * pct / 100);
        return {
            amount: gross,
            commissionRate: pct,
            platformCut,
            enterpriseNet: this.toMoney(gross - platformCut),
        };
    }
    async listPaidStudyBookings(eid, from, to) {
        const rows = await this.prisma.studyBooking.findMany({
            where: {
                status: { in: [client_1.BookingStatus.BOOKED, client_1.BookingStatus.COMPLETED] },
                project: { enterpriseId: eid },
            },
            include: { project: true, user: true },
            orderBy: { createdAt: 'desc' },
            take: 800,
        });
        if (!from || !to)
            return rows;
        return rows.filter((row) => this.inMonth(this.ledgerTime(row), from, to));
    }
    async listPaidMallOrdersForEnterprise(eid, from, to) {
        const projects = await this.prisma.studyProject.findMany({ where: { enterpriseId: eid }, select: { id: true } });
        const pids = projects.map((p) => String(p.id));
        if (!pids.length)
            return [];
        try {
            const hasRange = !!(from && to);
            const dateSql = hasRange
                ? `AND COALESCE(o."paidAt", o."createdAt") >= $1 AND COALESCE(o."paidAt", o."createdAt") < $2`
                : '';
            const off = hasRange ? 3 : 1;
            const placeholders = pids.map((_, i) => '$' + (i + off)).join(',');
            const args = hasRange ? [from, to, ...pids] : pids;
            const rows = await this.prisma.$queryRawUnsafe(
                `SELECT o.id, o."orderNo", o.amount, o.status, o."paidAt", o."createdAt", o."completedAt",
                        o.receiver, o."receiverPhone", o.province, o.city, o.district, o."addressDetail",
                        o."shippingCompany", o."trackingNo", o.remark,
                        COALESCE((SELECT p.name FROM "OrderItem" i JOIN "Product" p ON p.id = i."productId" WHERE i."orderId" = o.id LIMIT 1), '文创订单') AS title,
                        COALESCE((SELECT COALESCE(NULLIF(p."imageUrl", ''), NULLIF(p.icon, ''), CASE WHEN jsonb_typeof(p.gallery) = 'array' AND jsonb_array_length(p.gallery) > 0 THEN TRIM(BOTH '"' FROM (p.gallery->0)::text) ELSE '' END) FROM "OrderItem" i JOIN "Product" p ON p.id = i."productId" WHERE i."orderId" = o.id LIMIT 1), '') AS "coverUrl",
                        COALESCE((SELECT COUNT(*)::int FROM "OrderItem" i WHERE i."orderId" = o.id), 0) AS "itemCount",
                        COALESCE((SELECT p."projectId" FROM "OrderItem" i JOIN "Product" p ON p.id = i."productId" WHERE i."orderId" = o.id AND p."projectId" IS NOT NULL LIMIT 1), '') AS "projectId",
                        COALESCE((SELECT sp.title FROM "OrderItem" i JOIN "Product" p ON p.id = i."productId" JOIN "StudyProject" sp ON sp.id = p."projectId" WHERE i."orderId" = o.id LIMIT 1), '未分项目') AS "projectTitle",
                        COALESCE((SELECT sp."mediaColors"[1] FROM "OrderItem" i JOIN "Product" p ON p.id = i."productId" JOIN "StudyProject" sp ON sp.id = p."projectId" WHERE i."orderId" = o.id LIMIT 1), '') AS "projectCoverUrl",
                        COALESCE((SELECT COALESCE(NULLIF(u."realName", ''), NULLIF(u.nickname, ''), u.phone) FROM "User" u WHERE u.id = o."userId"), '') AS "userName",
                        COALESCE((SELECT u.phone FROM "User" u WHERE u.id = o."userId"), '') AS "userPhone",
                        COALESCE((SELECT u."studyNo" FROM "User" u WHERE u.id = o."userId"), '') AS "userStudyNo"
                 FROM "Order" o
                 WHERE o.status IN ('PAID','UNRECEIVED','COMPLETED')
                   ${dateSql}
                   AND EXISTS (
                     SELECT 1 FROM "OrderItem" i
                     JOIN "Product" p ON p.id = i."productId"
                     WHERE i."orderId" = o.id AND p."projectId" IN (${placeholders})
                   )
                 ORDER BY COALESCE(o."paidAt", o."createdAt") DESC
                 LIMIT 500`,
                ...args
            );
            return rows || [];
        }
        catch (_err) {
            return [];
        }
    }
    packStudyFinanceItems(rows, rates) {
        const rate = rates && rates.studyCommission != null ? rates.studyCommission : 0;
        return rows.map((row) => {
            const split = this.financeSplit(row.amount, rate);
            const coverUrl = this.projectCoverUrl(row.project && row.project.mediaColors);
            const userName = (row.user && (row.user.realName || row.user.nickname)) || row.participantName || '';
            const userPhone = (row.user && row.user.phone) || row.participantPhone || '';
            return {
                id: row.id,
                kind: 'study',
                kindLabel: '预约',
                entityType: 'booking',
                entityLabel: '研学预约',
                title: (row.project && row.project.title) || '研学预约',
                subtitle: userName ? (userName + (userPhone ? ' · ' + userPhone : '')) : (row.id || ''),
                refNo: row.id,
                amount: split.amount,
                commissionRate: split.commissionRate,
                platformCut: split.platformCut,
                enterpriseNet: split.enterpriseNet,
                status: row.status,
                statusLabel: row.status === 'COMPLETED' ? '已完成' : '待出行',
                paidAt: this.ledgerTime(row),
                userName,
                userPhone,
                userStudyNo: (row.user && row.user.studyNo) || '',
                coverUrl,
                projectId: String((row.project && row.project.id) || row.projectId || ''),
                projectTitle: (row.project && row.project.title) || '未分项目',
                projectCoverUrl: coverUrl,
                rentalFee: row.rentalFee != null ? this.toMoney(row.rentalFee) : 0,
                participantCount: 1,
            };
        });
    }
    packMallFinanceItems(rows, rates) {
        const rate = rates && rates.mallCommission != null ? rates.mallCommission : 0;
        return rows.map((row) => {
            const split = this.financeSplit(row.amount, rate);
            const coverUrl = String(row.coverUrl || row.projectCoverUrl || '').trim();
            return {
                id: row.id,
                kind: 'mall',
                kindLabel: '订单',
                entityType: 'order',
                entityLabel: '文创订单',
                title: row.title || '文创订单',
                subtitle: (row.orderNo || row.id) + (row.itemCount ? (' · ' + row.itemCount + ' 件') : ''),
                refNo: row.orderNo || row.id,
                amount: split.amount,
                commissionRate: split.commissionRate,
                platformCut: split.platformCut,
                enterpriseNet: split.enterpriseNet,
                status: row.status,
                statusLabel: row.status === 'COMPLETED' ? '已完成' : (row.status === 'UNRECEIVED' ? '待收货' : '已支付'),
                paidAt: row.paidAt || row.createdAt,
                userName: row.userName || '',
                userPhone: row.userPhone || '',
                userStudyNo: row.userStudyNo || '',
                coverUrl,
                projectId: String(row.projectId || ''),
                projectTitle: row.projectTitle || '未分项目',
                projectCoverUrl: String(row.projectCoverUrl || '').trim(),
                itemCount: Number(row.itemCount || 0),
            };
        });
    }
    async enterpriseFinance(id, query, actor) {
        const eid = await this.resolveFinanceEnterpriseId(id, actor);
        const range = this.monthRange(query && query.month);
        const kind = String((query && query.kind) || 'all').toLowerCase();
        const detailKind = String((query && query.detailKind) || (query && query.itemKind) || '').toLowerCase();
        const detailId = String((query && (query.detailId || query.itemId || query.id)) || '').trim();
        if (String(query && query.detail || '') === '1' && detailKind && detailId)
            return this.enterpriseFinanceDetail(eid, { kind: detailKind, itemId: detailId }, actor, true);
        const rates = await this.enterpriseCommissionRates(eid);
        const studyRows = kind === 'mall' ? [] : await this.listPaidStudyBookings(eid, range.from, range.to);
        const mallRows = kind === 'study' ? [] : await this.listPaidMallOrdersForEnterprise(eid, range.from, range.to);
        const studyGross = this.toMoney(studyRows.reduce((n, row) => n + this.toMoney(row.amount), 0));
        const mallGross = this.toMoney(mallRows.reduce((n, row) => n + this.toMoney(row.amount), 0));
        const studyCut = this.toMoney(studyGross * rates.studyCommission / 100);
        const mallCut = this.toMoney(mallGross * rates.mallCommission / 100);
        const items = this.packStudyFinanceItems(studyRows, rates).concat(this.packMallFinanceItems(mallRows, rates));
        items.sort((a, b) => new Date(b.paidAt || 0) - new Date(a.paidAt || 0));
        return {
            month: range.month,
            enterpriseId: eid,
            rates,
            summary: {
                studyGross,
                mallGross,
                studyCount: studyRows.length,
                mallCount: mallRows.length,
                studyCommission: studyCut,
                mallCommission: mallCut,
                platformTake: this.toMoney(studyCut + mallCut),
                enterpriseNet: this.toMoney(studyGross + mallGross - studyCut - mallCut),
            },
            items,
            wallet: await this.enterpriseWallet(eid),
        };
    }
    async enterpriseFinanceDetail(id, query, actor, resolved) {
        const eid = resolved ? String(id) : await this.resolveFinanceEnterpriseId(id, actor);
        const kind = String((query && query.kind) || '').toLowerCase();
        const itemId = String((query && (query.itemId || query.id)) || '').trim();
        if (!itemId)
            throw new common_1.BadRequestException('请指定流水条目');
        const rates = await this.enterpriseCommissionRates(eid);
        if (kind === 'study' || kind === 'booking') {
            const row = await this.prisma.studyBooking.findUnique({
                where: { id: itemId },
                include: { project: true, user: true },
            });
            if (!row || !row.project || String(row.project.enterpriseId || '') !== eid)
                throw new common_1.NotFoundException('研学流水不存在');
            const item = this.packStudyFinanceItems([row], rates)[0];
            const group = await this.prisma.studyBooking.findMany({
                where: { bookingGroupId: row.bookingGroupId || row.id },
                include: { user: true },
                orderBy: [{ participantIndex: 'asc' }, { createdAt: 'asc' }],
                take: 50,
            });
            const participants = (group.length ? group : [row]).map((p) => ({
                id: p.id,
                name: p.participantName || (p.user && (p.user.realName || p.user.nickname)) || '',
                phone: p.participantPhone || (p.user && p.user.phone) || '',
                role: p.participantRole || '',
                status: p.status,
                amount: this.toMoney(p.amount),
            }));
            return {
                enterpriseId: eid,
                rates,
                item,
                entity: {
                    type: 'booking',
                    label: '研学预约',
                    id: row.id,
                    bookingGroupId: row.bookingGroupId || row.id,
                    status: row.status,
                    statusLabel: item.statusLabel,
                    amount: item.amount,
                    paidAt: item.paidAt,
                    completedAt: row.completedAt,
                    cancelledAt: row.cancelledAt,
                    createdAt: row.createdAt,
                    tripPlan: row.tripPlan || null,
                    rental: {
                        optionId: row.rentalOptionId || '',
                        fee: row.rentalFee != null ? this.toMoney(row.rentalFee) : 0,
                        driverName: row.rentalDriverName || '',
                        driverPhone: row.rentalDriverPhone || '',
                        vehicleName: row.rentalVehicleName || '',
                        plateNo: row.rentalPlateNo || '',
                        pickupAddress: row.pickupAddress || '',
                    },
                    participant: {
                        name: item.userName,
                        phone: item.userPhone,
                        studyNo: item.userStudyNo,
                        idCard: row.participantIdCard || '',
                    },
                    participants,
                    project: {
                        id: row.project.id,
                        title: row.project.title,
                        status: row.project.status,
                        coverUrl: item.coverUrl,
                        category: row.project.category || '',
                        location: row.project.location || '',
                    },
                    user: row.user ? {
                        id: row.user.id,
                        nickname: row.user.nickname,
                        realName: row.user.realName || '',
                        phone: row.user.phone,
                        studyNo: row.user.studyNo || '',
                    } : null,
                    payChannel: '学员付款',
                    counterparty: item.userName || '学员',
                },
            };
        }
        if (kind === 'mall' || kind === 'order') {
            const order = await this.prisma.order.findUnique({
                where: { id: itemId },
                include: {
                    user: true,
                    items: { include: { product: true } },
                },
            });
            if (!order)
                throw new common_1.NotFoundException('文创流水不存在');
            const projects = await this.prisma.studyProject.findMany({ where: { enterpriseId: eid }, select: { id: true, title: true, mediaColors: true } });
            const pmap = {};
            for (let i = 0; i < projects.length; i++)
                pmap[String(projects[i].id)] = projects[i];
            const productIds = (order.items || []).map((it) => String((it.product && it.product.id) || '')).filter(Boolean);
            const productProjectMap = {};
            if (productIds.length) {
                try {
                    const ph = productIds.map((_, i) => '$' + (i + 1)).join(',');
                    const binds = await this.prisma.$queryRawUnsafe(`SELECT id, "projectId" FROM "Product" WHERE id IN (${ph})`, ...productIds);
                    for (let i = 0; binds && i < binds.length; i++)
                        productProjectMap[String(binds[i].id)] = binds[i].projectId != null ? String(binds[i].projectId) : '';
                }
                catch (_err) { }
            }
            const lines = (order.items || []).map((it) => {
                const product = it.product || {};
                const pid = String(productProjectMap[String(product.id || '')] || product.projectId || '');
                const proj = pmap[pid];
                return {
                    id: it.id,
                    quantity: it.quantity,
                    price: this.toMoney(it.price),
                    amount: this.toMoney(this.toMoney(it.price) * Number(it.quantity || 0)),
                    productId: product.id || '',
                    productName: product.name || '商品',
                    sku: product.sku || '',
                    coverUrl: this.productCoverUrl(product.imageUrl, product.icon, product.gallery),
                    projectId: pid,
                    projectTitle: (proj && proj.title) || '',
                };
            });
            const owned = lines.some((line) => line.projectId && pmap[line.projectId]);
            if (!owned)
                throw new common_1.NotFoundException('文创流水不存在或不属于本企业');
            const first = lines[0] || {};
            const proj = first.projectId ? pmap[first.projectId] : null;
            const packedRow = {
                id: order.id,
                orderNo: order.orderNo,
                amount: order.amount,
                status: order.status,
                paidAt: order.paidAt,
                createdAt: order.createdAt,
                title: first.productName || '文创订单',
                coverUrl: first.coverUrl || '',
                itemCount: lines.length,
                projectId: first.projectId || '',
                projectTitle: (proj && proj.title) || '未分项目',
                projectCoverUrl: this.projectCoverUrl(proj && proj.mediaColors),
                userName: (order.user && (order.user.realName || order.user.nickname)) || '',
                userPhone: (order.user && order.user.phone) || '',
                userStudyNo: (order.user && order.user.studyNo) || '',
            };
            const item = this.packMallFinanceItems([packedRow], rates)[0];
            return {
                enterpriseId: eid,
                rates,
                item,
                entity: {
                    type: 'order',
                    label: '文创订单',
                    id: order.id,
                    orderNo: order.orderNo,
                    status: order.status,
                    statusLabel: item.statusLabel,
                    amount: item.amount,
                    paidAt: item.paidAt,
                    completedAt: order.completedAt,
                    cancelledAt: order.cancelledAt,
                    shippedAt: order.shippedAt,
                    createdAt: order.createdAt,
                    remark: order.remark || '',
                    adminRemark: order.adminRemark || '',
                    shipping: {
                        company: order.shippingCompany || '',
                        trackingNo: order.trackingNo || '',
                    },
                    address: {
                        receiver: order.receiver || '',
                        phone: order.receiverPhone || '',
                        full: [order.province, order.city, order.district, order.addressDetail].filter(Boolean).join(' '),
                    },
                    lines,
                    project: proj ? {
                        id: proj.id,
                        title: proj.title,
                        coverUrl: this.projectCoverUrl(proj.mediaColors),
                    } : null,
                    user: order.user ? {
                        id: order.user.id,
                        nickname: order.user.nickname,
                        realName: order.user.realName || '',
                        phone: order.user.phone,
                        studyNo: order.user.studyNo || '',
                    } : null,
                    payChannel: '商城支付',
                    counterparty: item.userName || order.receiver || '买家',
                },
            };
        }
        throw new common_1.BadRequestException('不支持的流水类型');
    }

    async ensureEnterprisePayoutTables() {
        if (this._entPayoutTables)
            return;
        try {
            await this.prisma.$executeRawUnsafe(`
                CREATE TABLE IF NOT EXISTS "EnterprisePayoutAccount" (
                  id TEXT PRIMARY KEY,
                  "enterpriseId" TEXT NOT NULL,
                  label TEXT,
                  "bankName" TEXT NOT NULL,
                  "accountName" TEXT NOT NULL,
                  "accountNo" TEXT NOT NULL,
                  "isDefault" BOOLEAN DEFAULT FALSE,
                  "createdAt" TIMESTAMP DEFAULT NOW(),
                  "updatedAt" TIMESTAMP DEFAULT NOW()
                )`);
            await this.prisma.$executeRawUnsafe(`
                CREATE TABLE IF NOT EXISTS "EnterpriseWithdraw" (
                  id TEXT PRIMARY KEY,
                  "enterpriseId" TEXT NOT NULL,
                  "accountId" TEXT,
                  amount DECIMAL(12,2) NOT NULL,
                  status TEXT DEFAULT 'PENDING',
                  "bankName" TEXT,
                  "accountName" TEXT,
                  "accountNo" TEXT,
                  note TEXT,
                  "reviewNote" TEXT,
                  "reviewedAt" TIMESTAMP,
                  "createdAt" TIMESTAMP DEFAULT NOW(),
                  "updatedAt" TIMESTAMP DEFAULT NOW()
                )`);
        }
        catch (_err) { }
        this._entPayoutTables = true;
    }
    withdrawStatusLabel(s) {
        if (s === 'PAID')
            return '已打款';
        if (s === 'REJECTED')
            return '已拒绝';
        return '待审批';
    }
    async enterpriseWallet(eid) {
        await this.ensureEnterprisePayoutTables();
        const rates = await this.enterpriseCommissionRates(eid);
        const studyRows = await this.listPaidStudyBookings(eid, null, null);
        const mallRows = await this.listPaidMallOrdersForEnterprise(eid, null, null);
        const studyGross = this.toMoney(studyRows.reduce((n, row) => n + this.toMoney(row.amount), 0));
        const mallGross = this.toMoney(mallRows.reduce((n, row) => n + this.toMoney(row.amount), 0));
        const earned = this.toMoney(studyGross + mallGross - studyGross * rates.studyCommission / 100 - mallGross * rates.mallCommission / 100);
        let pending = 0;
        let withdrawn = 0;
        try {
            const rows = await this.prisma.$queryRawUnsafe(
                `SELECT status, COALESCE(SUM(amount),0) AS s FROM "EnterpriseWithdraw" WHERE "enterpriseId"=$1 GROUP BY status`,
                eid
            );
            for (let i = 0; rows && i < rows.length; i++) {
                const st = String(rows[i].status || '').toUpperCase();
                const n = this.toMoney(rows[i].s);
                if (st === 'PENDING')
                    pending = n;
                if (st === 'PAID')
                    withdrawn = n;
            }
        }
        catch (_err) { }
        return {
            earned,
            pending,
            withdrawn,
            available: this.toMoney(Math.max(0, earned - pending - withdrawn)),
        };
    }
    async listPayoutAccounts(enterpriseId, actor) {
        const eid = await this.resolveFinanceEnterpriseId(enterpriseId, actor);
        await this.ensureEnterprisePayoutTables();
        const rows = await this.prisma.$queryRawUnsafe(
            `SELECT * FROM "EnterprisePayoutAccount" WHERE "enterpriseId"=$1 ORDER BY "isDefault" DESC, "createdAt" DESC`,
            eid
        );
        return rows || [];
    }
    async savePayoutAccount(enterpriseId, body, actor) {
        const eid = await this.resolveFinanceEnterpriseId(enterpriseId, actor);
        await this.ensureEnterprisePayoutTables();
        const bankName = String((body && body.bankName) || '').trim();
        const accountName = String((body && body.accountName) || '').trim();
        const accountNo = String((body && body.accountNo) || '').trim();
        if (!bankName || !accountName || !accountNo)
            throw new common_1.BadRequestException('请填写银行、户名和账号');
        const label = String((body && body.label) || '').trim() || bankName;
        const isDefault = !!(body && body.isDefault);
        const id = String((body && body.id) || '').trim() || ('epa_' + (0, crypto_1.randomUUID)());
        if (isDefault)
            await this.prisma.$executeRawUnsafe(`UPDATE "EnterprisePayoutAccount" SET "isDefault"=FALSE WHERE "enterpriseId"=$1`, eid);
        const existed = await this.prisma.$queryRawUnsafe(`SELECT id FROM "EnterprisePayoutAccount" WHERE id=$1 AND "enterpriseId"=$2`, id, eid);
        if (existed && existed.length) {
            await this.prisma.$executeRawUnsafe(
                `UPDATE "EnterprisePayoutAccount" SET label=$1, "bankName"=$2, "accountName"=$3, "accountNo"=$4, "isDefault"=$5, "updatedAt"=NOW() WHERE id=$6`,
                label, bankName, accountName, accountNo, isDefault, id
            );
        }
        else {
            await this.prisma.$executeRawUnsafe(
                `INSERT INTO "EnterprisePayoutAccount" (id, "enterpriseId", label, "bankName", "accountName", "accountNo", "isDefault") VALUES ($1,$2,$3,$4,$5,$6,$7)`,
                id, eid, label, bankName, accountName, accountNo, isDefault
            );
        }
        return { id, enterpriseId: eid, label, bankName, accountName, accountNo, isDefault };
    }
    async deletePayoutAccount(enterpriseId, accountId, actor) {
        const eid = await this.resolveFinanceEnterpriseId(enterpriseId, actor);
        await this.ensureEnterprisePayoutTables();
        await this.prisma.$executeRawUnsafe(`DELETE FROM "EnterprisePayoutAccount" WHERE id=$1 AND "enterpriseId"=$2`, accountId, eid);
        return { id: accountId, deleted: true };
    }
    serializeEntWithdraw(row, extra) {
        return Object.assign({
            id: row.id,
            enterpriseId: row.enterpriseId,
            enterpriseName: extra && extra.enterpriseName || '',
            amount: this.toMoney(row.amount),
            status: row.status,
            statusLabel: this.withdrawStatusLabel(row.status),
            bankName: row.bankName || '',
            accountName: row.accountName || '',
            accountNo: row.accountNo || '',
            note: row.note || '',
            reviewNote: row.reviewNote || '',
            reviewedAt: row.reviewedAt,
            createdAt: row.createdAt,
        }, extra || {});
    }
    async listEnterpriseWithdrawals(enterpriseId, actor) {
        const eid = await this.resolveFinanceEnterpriseId(enterpriseId, actor);
        await this.ensureEnterprisePayoutTables();
        const rows = await this.prisma.$queryRawUnsafe(
            `SELECT * FROM "EnterpriseWithdraw" WHERE "enterpriseId"=$1 ORDER BY "createdAt" DESC`,
            eid
        );
        return { wallet: await this.enterpriseWallet(eid), items: (rows || []).map((row) => this.serializeEntWithdraw(row)) };
    }
    async applyEnterpriseWithdraw(enterpriseId, body, actor) {
        const eid = await this.resolveFinanceEnterpriseId(enterpriseId, actor);
        await this.ensureEnterprisePayoutTables();
        const amount = this.toMoney(body && body.amount);
        if (amount <= 0)
            throw new common_1.BadRequestException('请填写提现金额');
        const wallet = await this.enterpriseWallet(eid);
        if (amount > wallet.available)
            throw new common_1.BadRequestException('可提现金额不足，当前可提现 ¥' + wallet.available.toFixed(2));
        const accountId = String((body && body.accountId) || '').trim();
        const accounts = await this.prisma.$queryRawUnsafe(
            `SELECT * FROM "EnterprisePayoutAccount" WHERE "enterpriseId"=$1`,
            eid
        );
        const acc = (accounts || []).find((a) => a.id === accountId) || (accounts || []).find((a) => a.isDefault) || (accounts || [])[0];
        if (!acc)
            throw new common_1.BadRequestException('请先添加打款信息');
        const id = 'ewd_' + (0, crypto_1.randomUUID)();
        await this.prisma.$executeRawUnsafe(
            `INSERT INTO "EnterpriseWithdraw" (id, "enterpriseId", "accountId", amount, status, "bankName", "accountName", "accountNo", note)
             VALUES ($1,$2,$3,$4,'PENDING',$5,$6,$7,$8)`,
            id, eid, acc.id, amount, acc.bankName, acc.accountName, acc.accountNo, String((body && body.note) || '').trim()
        );
        await this.writeOpLog(actor, { module: 'finance', action: 'create', targetType: 'EnterpriseWithdraw', targetId: id, targetLabel: String(amount), summary: '申请企业提现 ¥' + amount.toFixed(2), detail: { enterpriseId: eid } });
        return this.serializeEntWithdraw({ id, enterpriseId: eid, amount, status: 'PENDING', bankName: acc.bankName, accountName: acc.accountName, accountNo: acc.accountNo, note: (body && body.note) || '', reviewNote: '', reviewedAt: null, createdAt: new Date() });
    }
    async listPlatformEnterpriseWithdrawals(status, actor) {
        this.assertPlatformEnterprise(actor);
        await this.ensureEnterprisePayoutTables();
        const st = String(status || '').toUpperCase();
        const rows = st && st !== 'ALL'
            ? await this.prisma.$queryRawUnsafe(
                `SELECT w.*, e.name AS "enterpriseName", e."shortName" AS "enterpriseShort"
                 FROM "EnterpriseWithdraw" w LEFT JOIN "Enterprise" e ON e.id = w."enterpriseId"
                 WHERE w.status=$1 ORDER BY w."createdAt" DESC LIMIT 200`,
                st
            )
            : await this.prisma.$queryRawUnsafe(
                `SELECT w.*, e.name AS "enterpriseName", e."shortName" AS "enterpriseShort"
                 FROM "EnterpriseWithdraw" w LEFT JOIN "Enterprise" e ON e.id = w."enterpriseId"
                 ORDER BY w."createdAt" DESC LIMIT 200`
            );
        const pendingRows = await this.prisma.$queryRawUnsafe(`SELECT COUNT(*)::int AS n FROM "EnterpriseWithdraw" WHERE status='PENDING'`);
        return {
            pending: pendingRows && pendingRows[0] ? Number(pendingRows[0].n || 0) : 0,
            items: (rows || []).map((row) => this.serializeEntWithdraw(row, { enterpriseName: row.enterpriseShort || row.enterpriseName || '' })),
        };
    }
    async reviewEnterpriseWithdraw(id, body, actor) {
        this.assertPlatformEnterprise(actor);
        await this.ensureEnterprisePayoutTables();
        const rows = await this.prisma.$queryRawUnsafe(`SELECT * FROM "EnterpriseWithdraw" WHERE id=$1 LIMIT 1`, id);
        if (!rows || !rows.length)
            throw new common_1.NotFoundException('提现申请不存在');
        const row = rows[0];
        if (String(row.status).toUpperCase() !== 'PENDING')
            throw new common_1.BadRequestException('该申请已处理');
        const action = String((body && body.action) || '').toLowerCase();
        const note = String((body && (body.note || body.reviewNote)) || '').trim();
        if (action === 'approve' || action === 'paid') {
            await this.prisma.$executeRawUnsafe(
                `UPDATE "EnterpriseWithdraw" SET status='PAID', "reviewNote"=$1, "reviewedAt"=NOW(), "updatedAt"=NOW() WHERE id=$2`,
                note, id
            );
            await this.writeOpLog(actor, { module: 'finance', action: 'update', targetType: 'EnterpriseWithdraw', targetId: id, targetLabel: String(row.amount), summary: '通过企业提现 ¥' + this.toMoney(row.amount).toFixed(2), detail: {} });
            return { id, status: 'PAID' };
        }
        if (action === 'reject') {
            await this.prisma.$executeRawUnsafe(
                `UPDATE "EnterpriseWithdraw" SET status='REJECTED', "reviewNote"=$1, "reviewedAt"=NOW(), "updatedAt"=NOW() WHERE id=$2`,
                note, id
            );
            await this.writeOpLog(actor, { module: 'finance', action: 'update', targetType: 'EnterpriseWithdraw', targetId: id, targetLabel: String(row.amount), summary: '拒绝企业提现 ¥' + this.toMoney(row.amount).toFixed(2), detail: { note } });
            return { id, status: 'REJECTED' };
        }
        throw new common_1.BadRequestException('请选择通过或拒绝');
    }
    async platformFinance(query, actor) {
        this.assertPlatformEnterprise(actor);
        const range = this.monthRange(query && query.month);
        const enterprises = await this.prisma.enterprise.findMany({
            select: { id: true, name: true, shortName: true },
            orderBy: { name: 'asc' },
            take: 200,
        });
        const breakdown = [];
        let studyGross = 0;
        let mallGross = 0;
        let studyCut = 0;
        let mallCut = 0;
        for (let i = 0; i < enterprises.length; i++) {
            const fin = await this.enterpriseFinance(enterprises[i].id, { month: range.month }, actor);
            const s = fin.summary || {};
            studyGross = this.toMoney(studyGross + Number(s.studyGross || 0));
            mallGross = this.toMoney(mallGross + Number(s.mallGross || 0));
            studyCut = this.toMoney(studyCut + Number(s.studyCommission || 0));
            mallCut = this.toMoney(mallCut + Number(s.mallCommission || 0));
            breakdown.push({
                id: enterprises[i].id,
                name: enterprises[i].shortName || enterprises[i].name,
                fullName: enterprises[i].name,
                studyGross: s.studyGross || 0,
                mallGross: s.mallGross || 0,
                platformTake: s.platformTake || 0,
                enterpriseNet: s.enterpriseNet || 0,
                studyCommission: s.studyCommission || 0,
                mallCommission: s.mallCommission || 0,
                rates: fin.rates,
            });
        }
        const rentalBookings = await this.prisma.studyBooking.findMany({
            where: { status: { in: [client_1.BookingStatus.BOOKED, client_1.BookingStatus.COMPLETED] } },
            include: { project: { include: { enterprise: true } }, user: true },
            orderBy: { createdAt: 'desc' },
            take: 800,
        });
        const rentalItems = [];
        for (let i = 0; i < rentalBookings.length; i++) {
            const row = rentalBookings[i];
            const fee = this.toMoney(row.rentalFee);
            if (fee <= 0 || !this.inMonth(this.ledgerTime(row), range.from, range.to))
                continue;
            rentalItems.push({
                id: row.id,
                kind: 'rental',
                kindLabel: '租车',
                title: (row.project && row.project.title) || '租车',
                refNo: row.id,
                amount: fee,
                status: row.status,
                statusLabel: row.status === 'COMPLETED' ? '已完成' : '待出行',
                paidAt: this.ledgerTime(row),
                userName: (row.user && (row.user.realName || row.user.nickname)) || row.participantName || '',
                enterpriseName: row.project && row.project.enterprise ? (row.project.enterprise.shortName || row.project.enterprise.name) : '',
            });
        }
        try {
            const jobs = await this.prisma.driverJob.findMany({
                where: { status: 'COMPLETED', bookingId: null },
                orderBy: { completedAt: 'desc' },
                take: 300,
            });
            for (let i = 0; i < jobs.length; i++) {
                const job = jobs[i];
                if (!this.inMonth(job.completedAt || job.createdAt, range.from, range.to))
                    continue;
                rentalItems.push({
                    id: job.id,
                    kind: 'rental',
                    kindLabel: '租车',
                    title: job.jobNo || '出车任务',
                    refNo: job.jobNo || job.id,
                    amount: this.toMoney(job.price),
                    status: 'COMPLETED',
                    statusLabel: '已完成',
                    paidAt: job.completedAt || job.createdAt,
                    userName: job.passengerName || '',
                    enterpriseName: '',
                });
            }
        }
        catch (_err) { }
        rentalItems.sort((a, b) => new Date(b.paidAt || 0) - new Date(a.paidAt || 0));
        // P0-4: rental GMV (代收车费) vs platform rental commission (平台抽成)
        const rentalGmv = this.toMoney(rentalItems.reduce((n, row) => n + this.toMoney(row.amount), 0));
        const defaultDriverRate = await this.platformDriverCommission();
        let rentalCommission = 0;
        for (let i = 0; i < rentalItems.length; i++) {
            const fee = this.toMoney(rentalItems[i].amount);
            // Approximate platform cut with default driver commission; per-driver rate refinement is P1
            rentalCommission = this.toMoney(rentalCommission + fee * defaultDriverRate / 100);
            rentalItems[i].gmv = fee;
            rentalItems[i].platformCut = this.toMoney(fee * defaultDriverRate / 100);
            rentalItems[i].driverNet = this.toMoney(fee - rentalItems[i].platformCut);
        }
        // Keep rentalIncome as alias of platform rental commission for backward-compatible tiles that still read it
        const rentalIncome = rentalCommission;
        return {
            month: range.month,
            summary: {
                studyGross,
                mallGross,
                studyCommission: studyCut,
                mallCommission: mallCut,
                commissionTotal: this.toMoney(studyCut + mallCut + rentalCommission),
                rentalGmv,
                rentalCommission,
                rentalIncome,
                platformTotal: this.toMoney(studyCut + mallCut + rentalCommission),
                enterprisePayable: this.toMoney(studyGross + mallGross - studyCut - mallCut),
            },
            enterprises: breakdown,
            rentalItems,
        };
    }
    async commissionBoard(actor) {
        this.assertPlatformEnterprise(actor);
        const map = await this.loadSettingMap();
        const defaults = {
            studyCommission: this.toMoney(map['feature.studyCommission']),
            mallCommission: this.toMoney(map['feature.mallCommission']),
            driverCommission: this.toMoney(map['feature.driverCommission']),
        };
        const enterprises = await this.listEnterprises('', actor);
        let drivers = [];
        try {
            const rows = await this.prisma.driverProfile.findMany({
                include: { user: true },
                orderBy: { updatedAt: 'desc' },
                take: 200,
            });
            await this.overlayDriverExtras(rows);
            await this.overlayDriverCommission(rows);
            drivers = rows.map((d) => this.serializeAdminDriver(d));
        }
        catch (_err) { }
        return { defaults, enterprises, drivers };
    }
    async saveCommissionDefaults(body, actor) {
        this.assertPlatformEnterprise(actor);
        const study = Math.min(100, Math.max(0, this.toMoney(body && body.studyCommission)));
        const mall = Math.min(100, Math.max(0, this.toMoney(body && body.mallCommission)));
        const driver = Math.min(100, Math.max(0, this.toMoney(body && body.driverCommission)));
        await this.upsertSetting('feature.studyCommission', study, '研学抽成', 'feature', actor);
        await this.upsertSetting('feature.mallCommission', mall, '文创抽成', 'feature', actor);
        await this.upsertSetting('feature.driverCommission', driver, '司机抽成', 'feature', actor);
        await this.writeOpLog(actor, { module: 'settings', action: 'update', targetType: 'Commission', targetId: 'defaults', targetLabel: '平台抽成', summary: '更新平台默认抽成', detail: { study, mall, driver } });
        return { studyCommission: study, mallCommission: mall, driverCommission: driver };
    }
    async studyProjectProducts(projectId) {
        await this.ensureStudyProject(projectId);
        try {
            const rows = await this.prisma.$queryRawUnsafe(`SELECT id, sku, name, status, stock, price, "imageUrl" FROM "Product" WHERE "projectId" = $1 ORDER BY "createdAt" DESC`, projectId);
            return (rows || []).map((row) => ({
                id: row.id,
                sku: row.sku,
                name: row.name,
                status: row.status,
                stock: row.stock,
                price: row.price != null ? String(row.price) : '0',
                imageUrl: row.imageUrl || '',
            }));
        }
        catch (_err) {
            return [];
        }
    }
    async setStudyProjectProducts(projectId, productIds, actor) {
        await this.ensureStudyProject(projectId, actor);
        const ids = (Array.isArray(productIds) ? productIds : []).map((id) => String(id || '').trim()).filter(Boolean);
        const current = await this.prisma.$queryRawUnsafe(`SELECT id FROM "Product" WHERE "projectId" = $1`, projectId);
        const currentIds = (current || []).map((row) => String(row.id));
        for (const id of currentIds) {
            if (!ids.includes(id))
                await this.prisma.$executeRawUnsafe(`UPDATE "Product" SET "projectId" = NULL WHERE id = $1`, id);
        }
        for (const id of ids) {
            await this.prisma.$executeRawUnsafe(`UPDATE "Product" SET "projectId" = $1 WHERE id = $2`, projectId, id);
        }
        await this.writeOpLog(actor, { module: 'study', action: 'update', targetType: 'StudyProject', targetId: projectId, targetLabel: '', summary: '绑定文创商品 ' + ids.length + ' 件', projectId, detail: { productIds: ids, projectId } });
        return this.studyProjectProducts(projectId);
    }
    async deleteStudyProject(id, actor) {
        const existed = await this.prisma.studyProject.findUnique({
            where: { id },
            include: { puzzle: true },
        });
        if (!existed)
            throw new common_1.NotFoundException('Study project not found');
        this.assertEnterpriseScope(existed, actor);
        await this.prisma.$transaction(async (tx) => {
            if (existed.puzzle) {
                await tx.puzzlePiece.deleteMany({ where: { puzzleProjectId: existed.puzzle.id } });
                await tx.puzzleProject.delete({ where: { id: existed.puzzle.id } });
            }
            await tx.studyBooking.deleteMany({ where: { projectId: id } });
            await tx.studyNotice.updateMany({ where: { projectId: id }, data: { projectId: null } });
            await tx.studyFloatingNotice.updateMany({ where: { projectId: id }, data: { projectId: null, enabled: false } });
            await tx.studyProject.delete({ where: { id } });
        });
        return { id, deleted: true };
    }
    async ensureStudyProject(id, actor) {
        const project = await this.prisma.studyProject.findUnique({ where: { id } });
        if (!project)
            throw new common_1.NotFoundException('Study project not found');
        this.assertEnterpriseScope(project, actor);
        return project;
    }
    async studyProjectBookings(projectId) {
        const bookings = await this.prisma.studyBooking.findMany({
            where: { projectId },
            include: { user: true, project: true },
            orderBy: { createdAt: 'desc' },
            take: 300,
        });
        const groups = await this.getBookingGroupsForAdmin(bookings);
        return bookings.map((booking) => this.serializeBooking(booking, groups[booking.bookingGroupId ?? booking.id] ?? [booking]));
    }
    async studyProjectRoutePoints(projectId) {
        await this.ensureStudyProject(projectId);
        const [points, zones] = await Promise.all([
            this.prisma.studyRoutePoint.findMany({
                where: { projectId },
                orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
            }),
            this.routeZoneDict(),
        ]);
        return points.map((point) => this.serializeRoutePoint(point, zones));
    }
    async studyProjectDepartureSettings(projectId) {
        const project = await this.ensureStudyProject(projectId);
        return this.serializeDepartureSettings(project);
    }
    async updateStudyProjectDepartureSettings(projectId, body) {
        await this.ensureStudyProject(projectId);
        const updated = await this.prisma.studyProject.update({
            where: { id: projectId },
            data: this.mapDepartureSettingsData(body),
        });
        return this.serializeDepartureSettings(updated);
    }
    checkInCodeSecret() {
        return process.env.STUDY_CHECKIN_SECRET || process.env.JWT_SECRET || process.env.ADMIN_TOKEN || '';
    }
    readRoutePointGateNonce(point) {
        const raw = point && point.knowledgeItems;
        let pack = {};
        if (raw && typeof raw === 'object' && !Array.isArray(raw))
            pack = raw;
        else if (Array.isArray(raw) && raw.length === 1 && raw[0] && typeof raw[0] === 'object' && !Array.isArray(raw[0]))
            pack = raw[0];
        return String(pack.checkInNonce || '').trim();
    }
    createRoutePointGatePayload(projectId, pointId, nonce) {
        const secret = this.checkInCodeSecret();
        if (!secret)
            throw new Error('STUDY_CHECKIN_SECRET or JWT_SECRET is required');
        const n = String(nonce || '').trim();
        const msg = n
            ? ('mqlt-study-checkin-route-point:v2:' + projectId + ':' + pointId + ':' + n)
            : ('mqlt-study-checkin-route-point:v1:' + projectId + ':' + pointId);
        const code = (0, crypto_1.createHmac)('sha256', secret).update(msg).digest('hex');
        const payload = {
            type: study_check_in_code_1.STUDY_ROUTE_POINT_CHECK_IN_TYPE,
            projectId,
            routePointId: pointId,
            code,
        };
        if (n)
            payload.nonce = n;
        return payload;
    }
    routePointGateSerial(payload) {
        const n = String((payload && payload.nonce) || '').trim();
        const code = String((payload && payload.code) || '').trim();
        const src = n || code;
        return src.slice(-6).toUpperCase();
    }
    serializeRoutePointGate(project, point) {
        const nonce = this.readRoutePointGateNonce(point);
        const payload = this.createRoutePointGatePayload(project.id || point.projectId, point.id, nonce);
        const raw = JSON.stringify(payload);
        return {
            project: project ? { id: project.id, title: project.title, location: project.location, status: project.status } : undefined,
            routePoint: this.serializeRoutePoint(point),
            payload,
            raw,
            serial: this.routePointGateSerial(payload),
            rotated: Boolean(nonce),
        };
    }
    async studyProjectRoutePointCheckInCode(projectId, pointId, actor) {
        if (actor) await this.assertProjectCapability(projectId, actor, 'project.live');
        const project = await this.ensureStudyProject(projectId, actor);
        const point = await this.prisma.studyRoutePoint.findFirst({ where: { id: pointId, projectId } });
        if (!point)
            throw new common_1.NotFoundException('Route point not found');
        return this.serializeRoutePointGate(project, point);
    }
    async rotateStudyProjectRoutePointCheckInCode(projectId, pointId, actor) {
        await this.assertProjectCapability(projectId, actor, 'project.live');
        await this.ensureStudyProject(projectId, actor);
        const point = await this.prisma.studyRoutePoint.findFirst({ where: { id: pointId, projectId } });
        if (!point)
            throw new common_1.NotFoundException('Route point not found');
        const nonce = (0, crypto_1.randomBytes)(8).toString('hex');
        const pack = this.buildRouteContentPack({}, point);
        pack.checkInNonce = nonce;
        pack.checkInNonceAt = new Date().toISOString();
        const updated = await this.prisma.studyRoutePoint.update({
            where: { id: pointId },
            data: { knowledgeItems: pack },
        });
        await this.writeOpLog(actor, {
            module: 'study',
            action: 'update',
            targetType: 'StudyRoutePoint',
            targetId: point.id,
            targetLabel: point.title,
            summary: '更换站点研学码 · ' + point.title,
            detail: { projectId, serial: nonce.slice(-6).toUpperCase() },
        });
        const project = await this.ensureStudyProject(projectId);
        const out = this.serializeRoutePointGate(project, updated);
        out.rotated = true;
        return out;
    }
    async createStudyProjectRoutePoint(projectId, body, actor) {
        await this.assertProjectCapability(projectId, actor, 'project.edit');
        await this.ensureStudyProject(projectId, actor);
        const last = await this.prisma.studyRoutePoint.findFirst({
            where: { projectId },
            orderBy: { sortOrder: 'desc' },
        });
        const data = this.mapRoutePointCreateData(projectId, body);
        if (body == null || body.sortOrder == null)
            data.sortOrder = last ? Number(last.sortOrder || 0) + 1 : 1;
        data.knowledgeItems = this.buildRouteContentPack(body || {}, null);
        this.applyStationTaskFields(data, body || {});
        const point = await this.prisma.studyRoutePoint.create({ data });
        await this.writeOpLog(actor, { module: 'study', action: 'create', targetType: 'StudyRoutePoint', targetId: point.id, targetLabel: point.title, summary: '新增研学路径 ' + point.title, detail: { projectId } });
        const zones = await this.routeZoneDict();
        return this.serializeRoutePoint(point, zones);
    }
    async updateStudyProjectRoutePoint(projectId, pointId, body, actor) {
        await this.assertProjectCapability(projectId, actor, 'project.edit');
        await this.ensureStudyProject(projectId, actor);
        const existed = await this.prisma.studyRoutePoint.findFirst({ where: { id: pointId, projectId } });
        if (!existed)
            throw new common_1.NotFoundException('Route point not found');
        const data = this.mapRoutePointUpdateData(body || {});
        data.knowledgeItems = this.buildRouteContentPack(body || {}, existed);
        this.applyStationTaskFields(data, body || {});
        const point = await this.prisma.studyRoutePoint.update({
            where: { id: pointId },
            data,
        });
        await this.writeOpLog(actor, { module: 'study', action: 'update', targetType: 'StudyRoutePoint', targetId: point.id, targetLabel: point.title, summary: '修改研学路径 ' + point.title, detail: { projectId } });
        const zones = await this.routeZoneDict();
        return this.serializeRoutePoint(point, zones);
    }
    async deleteStudyProjectRoutePoint(projectId, pointId, actor) {
        await this.assertProjectCapability(projectId, actor, 'project.edit');
        await this.ensureStudyProject(projectId, actor);
        const existed = await this.prisma.studyRoutePoint.findFirst({ where: { id: pointId, projectId } });
        if (!existed)
            throw new common_1.NotFoundException('Route point not found');
        await this.prisma.studyRoutePoint.delete({ where: { id: pointId } });
        await this.writeOpLog(actor, { module: 'study', action: 'delete', targetType: 'StudyRoutePoint', targetId: pointId, targetLabel: existed.title, summary: '删除研学路径 ' + existed.title, detail: { projectId } });
        return { id: pointId, deleted: true };
    }
    async studyProjectOrganizers(projectId) {
        await this.ensureStudyProject(projectId);
        const organizers = await this.prisma.studyProjectOrganizer.findMany({
            where: { projectId },
            include: {
                user: {
                    select: { id: true, nickname: true, phone: true, studyNo: true },
                },
            },
            orderBy: { createdAt: 'asc' },
        });
        return organizers.map((item) => ({
            id: item.id,
            projectId: item.projectId,
            userId: item.userId,
            createdAt: item.createdAt,
            user: item.user,
        }));
    }
    async addStudyProjectOrganizer(projectId, body) {
        const userId = String(body.userId ?? '').trim();
        if (!userId)
            throw new common_1.BadRequestException('Organizer user is required');
        const [project, user] = await Promise.all([
            this.prisma.studyProject.findUnique({ where: { id: projectId } }),
            this.prisma.user.findUnique({
                where: { id: userId },
                select: { id: true, nickname: true, phone: true, studyNo: true },
            }),
        ]);
        if (!project)
            throw new common_1.NotFoundException('Study project not found');
        if (!user)
            throw new common_1.NotFoundException('User not found');
        await this.prisma.studyProjectOrganizer.upsert({
            where: { projectId_userId: { projectId, userId } },
            update: {},
            create: { projectId, userId },
        });
        return this.studyProjectOrganizers(projectId);
    }
    async removeStudyProjectOrganizer(projectId, userId) {
        await this.ensureStudyProject(projectId);
        await this.prisma.studyProjectOrganizer.deleteMany({
            where: { projectId, userId },
        });
        return this.studyProjectOrganizers(projectId);
    }
    async studyProjectAdmins(projectId) {
        await this.ensureStudyProject(projectId);
        const admins = await this.prisma.studyProjectAdmin.findMany({
            where: { projectId },
            include: {
                user: {
                    select: { id: true, nickname: true, phone: true, studyNo: true },
                },
            },
            orderBy: { createdAt: 'asc' },
        });
        return admins.map((item) => ({
            id: item.id,
            projectId: item.projectId,
            userId: item.userId,
            createdAt: item.createdAt,
            user: item.user,
        }));
    }
    async addStudyProjectAdmin(projectId, body) {
        const userId = String(body.userId ?? '').trim();
        if (!userId)
            throw new common_1.BadRequestException('Project admin user is required');
        const [project, user] = await Promise.all([
            this.prisma.studyProject.findUnique({ where: { id: projectId } }),
            this.prisma.user.findUnique({
                where: { id: userId },
                select: { id: true, nickname: true, phone: true, studyNo: true },
            }),
        ]);
        if (!project)
            throw new common_1.NotFoundException('Study project not found');
        if (!user)
            throw new common_1.NotFoundException('User not found');
        await this.prisma.studyProjectAdmin.upsert({
            where: { projectId_userId: { projectId, userId } },
            update: {},
            create: { projectId, userId },
        });
        return this.studyProjectAdmins(projectId);
    }
    async removeStudyProjectAdmin(projectId, userId) {
        await this.ensureStudyProject(projectId);
        await this.prisma.studyProjectAdmin.deleteMany({
            where: { projectId, userId },
        });
        return this.studyProjectAdmins(projectId);
    }
    addStudyProjectUser(projectId, body) {
        return this.createOrRestoreStudyBooking(String(body.userId ?? ''), projectId, body);
    }
    addUserStudyProject(userId, body) {
        return this.createOrRestoreStudyBooking(userId, String(body.projectId ?? ''), body);
    }
    async createOrRestoreStudyBooking(userId, projectId, body) {
        if (!userId || !projectId)
            throw new common_1.BadRequestException('User and study project are required');
        const status = this.mapBookingStatus(String(body.status ?? 'BOOKED'));
        const [user, project] = await Promise.all([
            this.prisma.user.findUnique({ where: { id: userId } }),
            this.prisma.studyProject.findUnique({ where: { id: projectId } }),
        ]);
        if (!user)
            throw new common_1.NotFoundException('User not found');
        if (!project)
            throw new common_1.NotFoundException('Study project not found');
        const existed = await this.prisma.studyBooking.findFirst({
            where: { userId, projectId },
            include: { user: true, project: true },
            orderBy: { createdAt: 'desc' },
        });
        const amountText = String(body.amount ?? '').trim();
        const amount = amountText.length > 0 ? amountText : project.price.toString();
        const tripPlan = this.hasAdminTripInput(body) ? this.buildAdminTripPlan(body, existed && existed.tripPlan) : undefined;
        const rental = this.hasAdminRentalInput(body) ? this.buildAdminRental(body) : undefined;
        const booking = await this.prisma.$transaction(async (tx) => {
            if (existed) {
                const bookingGroupId = existed.bookingGroupId ?? existed.id;
                const updated = await tx.studyBooking.update({
                    where: { id: existed.id },
                    data: {
                        status,
                        amount,
                        bookingGroupId,
                        bookerId: existed.bookerId ?? userId,
                        participantName: existed.participantName ?? user.nickname,
                        participantPhone: existed.participantPhone ?? user.phone,
                        participantRole: existed.participantRole ?? 'BOOKER',
                        paidAt: this.resolveStudyBookingPaidAt(status, existed.paidAt),
                        cancelledAt: status === client_1.BookingStatus.CANCELLED ? new Date() : null,
                        completedAt: status === client_1.BookingStatus.COMPLETED ? (existed.completedAt ?? new Date()) : null,
                        userDeletedAt: null,
                        ...(tripPlan !== undefined ? { tripPlan } : {}),
                        ...(rental || {}),
                    },
                    include: { user: true, project: true },
                });
                const wasActive = this.isActiveStudyBookingStatus(existed.status);
                const isActive = this.isActiveStudyBookingStatus(status);
                if (this.isSeatStudyBooking(existed) && wasActive !== isActive) {
                    if (isActive) {
                        await this.incrementStudyProjectEnrollment(tx, project, 1);
                    }
                    else {
                        await tx.studyProject.updateMany({
                            where: { id: projectId, enrolled: { gte: 1 } },
                            data: { enrolled: { decrement: 1 } },
                        });
                    }
                }
                return updated;
            }
            const created = await tx.studyBooking.create({
                data: {
                    userId,
                    projectId,
                    bookingGroupId: (0, crypto_1.randomUUID)(),
                    bookerId: userId,
                    participantName: user.nickname,
                    participantPhone: user.phone,
                    participantRole: 'BOOKER',
                    status,
                    amount,
                    paidAt: this.resolveStudyBookingPaidAt(status),
                    cancelledAt: status === client_1.BookingStatus.CANCELLED ? new Date() : null,
                    completedAt: status === client_1.BookingStatus.COMPLETED ? new Date() : null,
                    ...(tripPlan !== undefined ? { tripPlan } : {}),
                    ...(rental || {}),
                },
                include: { user: true, project: true },
            });
            if (this.isActiveStudyBookingStatus(status)) {
                await this.incrementStudyProjectEnrollment(tx, project, 1);
            }
            return created;
        });
        try { await this.syncDriverJobForBooking(booking); } catch (_e) { }
        return this.serializeBooking(booking);
    }

    async ensureStudyNoticeColumns() {
        if (this._studyNoticeColsReady)
            return;
        try {
            await this.prisma.$executeRawUnsafe(`ALTER TABLE "StudyNotice" ADD COLUMN IF NOT EXISTS "enterpriseId" TEXT`);
            await this.prisma.$executeRawUnsafe(`ALTER TABLE "StudyNotice" ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'published'`);
            await this.prisma.$executeRawUnsafe(`ALTER TABLE "StudyNotice" ADD COLUMN IF NOT EXISTS "reviewNote" TEXT`);
            await this.prisma.$executeRawUnsafe(`ALTER TABLE "StudyNotice" ADD COLUMN IF NOT EXISTS "reviewedAt" TIMESTAMP`);
            await this.prisma.$executeRawUnsafe(`ALTER TABLE "StudyNotice" ADD COLUMN IF NOT EXISTS category TEXT`);
            await this.prisma.$executeRawUnsafe(`ALTER TABLE "StudyNotice" ADD COLUMN IF NOT EXISTS "publisherUnitType" TEXT`);
            await this.prisma.$executeRawUnsafe(`ALTER TABLE "StudyNotice" ADD COLUMN IF NOT EXISTS "publisherUnitId" TEXT`);
            await this.prisma.$executeRawUnsafe(`ALTER TABLE "StudyNotice" ADD COLUMN IF NOT EXISTS kind TEXT NOT NULL DEFAULT 'news'`);
            await this.prisma.$executeRawUnsafe(`UPDATE "StudyNotice" SET category = type WHERE (category IS NULL OR BTRIM(category) = '') AND type IS NOT NULL AND BTRIM(type) <> ''`);
            await this.prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "StudyNotice_enterpriseId_idx" ON "StudyNotice" ("enterpriseId")`);
            await this.prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "StudyNotice_projectId_idx" ON "StudyNotice" ("projectId")`);
            await this.prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "StudyNotice_status_idx" ON "StudyNotice" (status)`);
            await this.prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "StudyNotice_kind_idx" ON "StudyNotice" (kind)`);
            await this.prisma.$executeRawUnsafe(`
                UPDATE "StudyNotice" n
                SET "enterpriseId" = p."enterpriseId"
                FROM "StudyProject" p
                WHERE n."projectId" = p.id
                  AND (n."enterpriseId" IS NULL OR n."enterpriseId" = '')
                  AND p."enterpriseId" IS NOT NULL`);
            await this.prisma.$executeRawUnsafe(`UPDATE "StudyNotice" SET status = 'published' WHERE status IS NULL OR BTRIM(status) = ''`);
            this._studyNoticeColsReady = true;
        }
        catch (err) {
            console.warn('[admin] ensureStudyNoticeColumns', err && err.message);
        }
    }
    async ensureCommunityPostReviewColumns() {
        if (this._communityPostReviewColsReady)
            return;
        try {
            await this.prisma.$executeRawUnsafe(`ALTER TABLE "CommunityPost" ADD COLUMN IF NOT EXISTS "reviewNote" TEXT`);
            await this.prisma.$executeRawUnsafe(`ALTER TABLE "CommunityPost" ADD COLUMN IF NOT EXISTS "reviewedAt" TIMESTAMP`);
            await this.prisma.$executeRawUnsafe(`ALTER TABLE "CommunityPost" ADD COLUMN IF NOT EXISTS publisher TEXT`);
            await this.prisma.$executeRawUnsafe(`ALTER TABLE "CommunityPost" ADD COLUMN IF NOT EXISTS "publisherUnitType" TEXT`);
            await this.prisma.$executeRawUnsafe(`ALTER TABLE "CommunityPost" ADD COLUMN IF NOT EXISTS "publisherUnitId" TEXT`);
            await this.prisma.$executeRawUnsafe(`ALTER TABLE "CommunityPost" ADD COLUMN IF NOT EXISTS "enterpriseId" TEXT`);
            this._communityPostReviewColsReady = true;
        }
        catch (err) {
            console.warn('[admin] ensureCommunityPostReviewColumns', err && err.message);
        }
    }
    async ensurePublisherDisplayColumns() {
        if (this._publisherDisplayColsReady)
            return;
        try {
            await this.prisma.$executeRawUnsafe(`ALTER TABLE "Enterprise" ADD COLUMN IF NOT EXISTS "publisherDisplayName" TEXT`);
            await this.prisma.$executeRawUnsafe(`ALTER TABLE "StudyProject" ADD COLUMN IF NOT EXISTS "publisherDisplayName" TEXT`);
            await this.prisma.$executeRawUnsafe(`ALTER TABLE "Enterprise" ADD COLUMN IF NOT EXISTS "publisherAvatarUrl" TEXT`);
            await this.prisma.$executeRawUnsafe(`ALTER TABLE "StudyProject" ADD COLUMN IF NOT EXISTS "publisherAvatarUrl" TEXT`);
            this._publisherDisplayColsReady = true;
        }
        catch (err) {
            console.warn('[admin] ensurePublisherDisplayColumns', err && err.message);
        }
    }
    /** Resolve locked 发布单位 from target enterprise/project. Ignores client-supplied publisher. */
    async resolvePublisherUnit(opts) {
        await this.ensurePublisherDisplayColumns();
        const projectId = String((opts && opts.projectId) || '').trim();
        const enterpriseId = String((opts && opts.enterpriseId) || '').trim();
        if (projectId) {
            const rows = await this.prisma.$queryRawUnsafe(
                `SELECT p.id, p.title, p."enterpriseId", p."publisherDisplayName"
                 FROM "StudyProject" p WHERE p.id = $1 LIMIT 1`, projectId);
            if (!rows || !rows.length)
                throw new common_1.BadRequestException('研学项目不存在');
            const row = rows[0];
            const display = String(row.publisherDisplayName || '').trim()
                || String(row.title || '').trim()
                || '研学项目';
            return {
                type: 'project',
                id: String(row.id),
                enterpriseId: String(row.enterpriseId || enterpriseId || '').trim() || null,
                displayName: display,
            };
        }
        if (enterpriseId) {
            const rows = await this.prisma.$queryRawUnsafe(
                `SELECT id, name, "shortName", "publisherDisplayName" FROM "Enterprise" WHERE id = $1 LIMIT 1`, enterpriseId);
            if (!rows || !rows.length)
                throw new common_1.BadRequestException('企业不存在');
            const row = rows[0];
            const display = String(row.publisherDisplayName || '').trim()
                || String(row.shortName || '').trim()
                || String(row.name || '').trim()
                || '企业';
            return {
                type: 'enterprise',
                id: String(row.id),
                enterpriseId: String(row.id),
                displayName: display,
            };
        }
        return {
            type: 'platform',
            id: 'platform',
            enterpriseId: null,
            displayName: '蒙企链探运营中心',
        };
    }
    async listPublisherUnits(keyword, kind, page, pageSize, actor) {
        void actor;
        await this.ensurePublisherDisplayColumns();
        const search = String(keyword || '').trim();
        const k = String(kind || 'all').trim().toLowerCase() || 'all';
        const parsed = this.parsePage({ page: page || 1, pageSize: pageSize || 50 }, 50);
        const items = [];
        if (k === 'all' || k === 'enterprise') {
            const params = [];
            let where = 'WHERE 1=1';
            if (search) {
                params.push('%' + search + '%');
                where += ` AND (e.name ILIKE $${params.length} OR COALESCE(e."shortName",'') ILIKE $${params.length} OR COALESCE(e."publisherDisplayName",'') ILIKE $${params.length})`;
            }
            const rows = await this.prisma.$queryRawUnsafe(
                `SELECT e.id, e.name, e."shortName", e."publisherDisplayName", e."publisherAvatarUrl", e.status
                 FROM "Enterprise" e ${where}
                 ORDER BY e.name ASC LIMIT 500`, ...params);
            for (const row of rows || []) {
                const base = String(row.shortName || row.name || '').trim();
                const override = String(row.publisherDisplayName || '').trim();
                items.push({
                    kind: 'enterprise',
                    id: String(row.id),
                    name: String(row.name || ''),
                    shortName: String(row.shortName || ''),
                    baseName: base,
                    publisherDisplayName: override,
                    publisherAvatarUrl: String(row.publisherAvatarUrl || ''),
                    effectiveName: override || base || '企业',
                    status: String(row.status || 'ACTIVE'),
                    enterpriseId: String(row.id),
                    projectId: '',
                });
            }
        }
        if (k === 'all' || k === 'project') {
            const params = [];
            let where = 'WHERE 1=1';
            if (search) {
                params.push('%' + search + '%');
                where += ` AND (p.title ILIKE $${params.length} OR COALESCE(p."publisherDisplayName",'') ILIKE $${params.length} OR COALESCE(e.name,'') ILIKE $${params.length})`;
            }
            const rows = await this.prisma.$queryRawUnsafe(
                `SELECT p.id, p.title, p.status, p."enterpriseId", p."publisherDisplayName", p."publisherAvatarUrl",
                        e.name AS "enterpriseName", e."shortName" AS "enterpriseShort"
                 FROM "StudyProject" p
                 LEFT JOIN "Enterprise" e ON e.id = p."enterpriseId"
                 ${where}
                 ORDER BY p."updatedAt" DESC NULLS LAST LIMIT 500`, ...params);
            for (const row of rows || []) {
                const base = String(row.title || '').trim();
                const override = String(row.publisherDisplayName || '').trim();
                items.push({
                    kind: 'project',
                    id: String(row.id),
                    name: base,
                    shortName: '',
                    baseName: base,
                    publisherDisplayName: override,
                    publisherAvatarUrl: String(row.publisherAvatarUrl || ''),
                    effectiveName: override || base || '研学项目',
                    status: String(row.status || ''),
                    enterpriseId: String(row.enterpriseId || ''),
                    enterpriseName: String(row.enterpriseShort || row.enterpriseName || ''),
                    projectId: String(row.id),
                });
            }
        }
        const total = items.length;
        const slice = items.slice(parsed.skip, parsed.skip + parsed.pageSize);
        return { items: slice, total, page: parsed.page, pageSize: parsed.pageSize };
    }
    async updatePublisherUnit(kind, id, body, actor) {
        this.assertPlatformEnterprise(actor);
        await this.ensurePublisherDisplayColumns();
        const k = String(kind || '').trim().toLowerCase();
        const unitId = String(id || '').trim();
        if (!unitId)
            throw new common_1.BadRequestException('缺少发布单位 ID');
        const raw = body && body.publisherDisplayName != null ? String(body.publisherDisplayName) : '';
        const next = raw.trim() || null;
        const hasAvatar = !!(body && Object.prototype.hasOwnProperty.call(body, 'publisherAvatarUrl'));
        const avatar = hasAvatar ? (String(body.publisherAvatarUrl || '').trim() || null) : null;
        if (k === 'enterprise') {
            const existed = await this.prisma.enterprise.findUnique({ where: { id: unitId } });
            if (!existed)
                throw new common_1.NotFoundException('企业不存在');
            if (hasAvatar) {
                await this.prisma.$executeRawUnsafe(
                    `UPDATE "Enterprise" SET "publisherDisplayName" = $1, "publisherAvatarUrl" = $2, "updatedAt" = NOW() WHERE id = $3`, next, avatar, unitId);
            } else {
                await this.prisma.$executeRawUnsafe(
                    `UPDATE "Enterprise" SET "publisherDisplayName" = $1, "updatedAt" = NOW() WHERE id = $2`, next, unitId);
            }
            await this.writeOpLog(actor, {
                module: 'content', action: 'update', targetType: 'Enterprise', targetId: unitId, targetLabel: existed.name || '',
                summary: '修改企业发布单位显示名 ' + (next || existed.name || ''),
                enterpriseId: unitId,
                detail: { publisherDisplayName: next },
            });
            const unit = await this.resolvePublisherUnit({ enterpriseId: unitId });
            return {
                kind: 'enterprise', id: unitId, publisherDisplayName: next || '', publisherAvatarUrl: hasAvatar ? (avatar || '') : undefined,
                effectiveName: unit.displayName, baseName: String(existed.shortName || existed.name || ''),
            };
        }
        if (k === 'project') {
            const existed = await this.prisma.studyProject.findUnique({ where: { id: unitId } });
            if (!existed)
                throw new common_1.NotFoundException('项目不存在');
            if (hasAvatar) {
                await this.prisma.$executeRawUnsafe(
                    `UPDATE "StudyProject" SET "publisherDisplayName" = $1, "publisherAvatarUrl" = $2, "updatedAt" = NOW() WHERE id = $3`, next, avatar, unitId);
            } else {
                await this.prisma.$executeRawUnsafe(
                    `UPDATE "StudyProject" SET "publisherDisplayName" = $1, "updatedAt" = NOW() WHERE id = $2`, next, unitId);
            }
            await this.writeOpLog(actor, {
                module: 'content', action: 'update', targetType: 'StudyProject', targetId: unitId, targetLabel: existed.title || '',
                summary: '修改项目发布单位显示名 ' + (next || existed.title || ''),
                enterpriseId: existed.enterpriseId || undefined, projectId: unitId,
                detail: { publisherDisplayName: next },
            });
            const unit = await this.resolvePublisherUnit({ projectId: unitId });
            return {
                kind: 'project', id: unitId, publisherDisplayName: next || '', publisherAvatarUrl: hasAvatar ? (avatar || '') : undefined,
                effectiveName: unit.displayName, baseName: String(existed.title || ''),
                enterpriseId: String(existed.enterpriseId || ''),
            };
        }
        throw new common_1.BadRequestException('kind 须为 enterprise 或 project');
    }
    isPlatformReviewer(actor) {
        try {
            this.assertPlatformReviewer(actor);
            return true;
        } catch (_e) {
            return false;
        }
    }
    assertPlatformReviewer(actor) {
        if (!actor || !actor.mpAccess)
            throw new common_1.ForbiddenException('仅平台运营可审批资讯');
    }
    noticeSourceLabel(row) {
        const pid = String((row && (row.projectId || row.project_id)) || '').trim();
        if (pid)
            return '项目';
        const eid = String((row && (row.enterpriseId || row.resolvedEnterpriseId || row.project_enterpriseId)) || '').trim();
        if (eid)
            return '企业';
        return '企业';
    }
    assertNoticeScope(row, actor) {
        const eid = String((row && row.enterpriseId) || '').trim();
        const pid = String((row && row.projectId) || '').trim();
        const merchantEid = this.enterpriseIdOf(actor);
        if (merchantEid && eid && merchantEid !== eid)
            throw new common_1.ForbiddenException('只能管理本企业数据');
        if (merchantEid && !eid)
            throw new common_1.ForbiddenException('只能管理本企业数据');
        const ents = this.scopedEnterpriseIds(actor);
        if (ents && eid && ents.indexOf(eid) < 0)
            throw new common_1.ForbiddenException('当前职位不能管理该企业');
        const scoped = this.scopedProjectIds(actor);
        if (scoped && pid && scoped.indexOf(pid) < 0)
            throw new common_1.ForbiddenException('当前职位不能管理该项目');
        if (scoped && !pid)
            throw new common_1.ForbiddenException('当前职位仅可管理指定项目的资讯，不能发企业级资讯');
    }

    async notices(keyword, projectId, page, pageSize, actor, enterpriseId, kind) {
        await this.ensureStudyNoticeColumns();
        const search = String(keyword || '').trim();
        const pid = String(projectId || '').trim();
        const eid = this.scopeEnterpriseId(actor, enterpriseId);
        const ents = eid ? null : this.scopedEnterpriseIds(actor);
        const scoped = this.scopedProjectIds(actor);
        if (pid && scoped && scoped.indexOf(pid) < 0)
            throw new common_1.ForbiddenException('当前职位不能查看该项目');
        const where = [];
        const params = [];
        const push = (sql, val) => { params.push(val); where.push(sql.replace('?', `$${params.length}`)); };
        if (eid) {
            push(`(COALESCE(n."enterpriseId", sp."enterpriseId", '') = ?)`, eid);
        }
        else if (ents) {
            params.push(ents);
            where.push(`(COALESCE(n."enterpriseId", sp."enterpriseId", '') = ANY($${params.length}::text[]))`);
        }
        if (pid) {
            push(`n."projectId" = ?`, pid);
        }
        else if (scoped) {
            params.push(scoped);
            where.push(`n."projectId" = ANY($${params.length}::text[])`);
        }
        if (search) {
            params.push('%' + search + '%');
            where.push(`(n.title ILIKE $${params.length} OR n.content ILIKE $${params.length})`);
        }
        const kindFilter = String(kind || '').trim().toLowerCase();
        if (kindFilter === 'news' || kindFilter === 'dynamics') {
            push(`COALESCE(n.kind, 'news') = ?`, kindFilter);
        }
        const whereSql = where.length ? ('WHERE ' + where.join(' AND ')) : '';
        const paged = page != null && String(page).trim() !== '';
        const parsed = this.parsePage({ page: paged ? page : 1, pageSize: pageSize || 20 }, 20);
        const countRows = await this.prisma.$queryRawUnsafe(
            `SELECT COUNT(*)::int AS count FROM "StudyNotice" n LEFT JOIN "StudyProject" sp ON sp.id = n."projectId" ${whereSql}`,
            ...params);
        const total = (countRows && countRows[0] && countRows[0].count) || 0;
        let listSql = `SELECT n.id, n."projectId", n."enterpriseId", n.title, n.content, n.type, n.category, n.publisher, n.paragraphs, n."publishedAt",
            COALESCE(n.status, 'published') AS status, n."reviewNote", n."reviewedAt", COALESCE(n.kind, 'news') AS kind,
            sp.id AS "project_id", sp.title AS "project_title", sp.status AS "project_status", sp."enterpriseId" AS "project_enterpriseId",
            COALESCE(NULLIF(BTRIM(e."shortName"), ''), e.name, '') AS "enterprise_name"
            FROM "StudyNotice" n
            LEFT JOIN "StudyProject" sp ON sp.id = n."projectId"
            LEFT JOIN "Enterprise" e ON e.id = COALESCE(n."enterpriseId", sp."enterpriseId")
            ${whereSql}
            ORDER BY n."publishedAt" DESC`;
        if (paged)
            listSql += ` OFFSET ${parsed.skip} LIMIT ${parsed.pageSize}`;
        else
            listSql += ` LIMIT 200`;
        const rows = await this.prisma.$queryRawUnsafe(listSql, ...params);
        const items = (rows || []).map((row) => this.serializeNoticeRow(row));
        if (!paged)
            return items;
        return { items, total, page: parsed.page, pageSize: parsed.pageSize };
    }
    async createNotice(body, actor) {
        await this.ensureStudyNoticeColumns();
        const title = String(body.title ?? '').trim();
        const content = String(body.content ?? '').trim();
        const projectId = String(body.projectId ?? '').trim();
        let noticeKind = String(body.kind ?? '').trim().toLowerCase();
        if (noticeKind !== 'news' && noticeKind !== 'dynamics')
            noticeKind = projectId ? 'dynamics' : 'news';
        if (!title || !content)
            throw new common_1.BadRequestException('请填写标题和正文');
        if (noticeKind === 'dynamics' && !projectId)
            throw new common_1.BadRequestException('项目动态必须绑定研学项目');
        let enterpriseId = this.enterpriseIdOf(actor) || String(body.enterpriseId ?? '').trim();
        if (projectId) {
            const project = await this.ensureStudyProject(projectId, actor);
            enterpriseId = String((project && project.enterpriseId) || enterpriseId || '').trim();
        }
        else {
            if (!enterpriseId)
                throw new common_1.BadRequestException('企业资讯必须指定企业，或绑定研学项目');
            this.assertEnterpriseScope({ enterpriseId }, actor);
            const scoped = this.scopedProjectIds(actor);
            if (scoped)
                throw new common_1.ForbiddenException('当前职位仅可管理指定项目的资讯，不能发企业级资讯');
        }
        if (!enterpriseId && !projectId)
            throw new common_1.BadRequestException('请选择研学项目或企业');
        // Dynamics: enterprise/project may set category from platform NOTICE_TYPES.
        // News: category stays NULL until platform assigns on approve.
        // 发布单位 is locked from target enterprise/project — ignore client body.publisher.
        let type = '待分类';
        let category = null;
        if (noticeKind === 'dynamics') {
            const nextCat = String((body && (body.category || body.categoryId)) || '').trim();
            category = nextCat || '测试分类';
            type = category;
        }
        const unit = await this.resolvePublisherUnit({ projectId, enterpriseId });
        const publisher = unit.displayName;
        const paragraphs = Array.isArray(body.paragraphs) && body.paragraphs.length
            ? body.paragraphs.map((x) => String(x || '').trim()).filter(Boolean)
            : content.split(/\n+/).map((x) => x.trim()).filter(Boolean);
        const notice = await this.prisma.studyNotice.create({
            data: {
                projectId: projectId || null,
                title,
                content,
                type,
                publisher,
                paragraphs,
            },
        });
        const initStatus = noticeKind === 'dynamics' ? 'published' : 'pending';
        await this.prisma.$executeRawUnsafe(
            `UPDATE "StudyNotice" SET "enterpriseId" = $1, status = $7, category = $8, type = $9, "reviewNote" = NULL, "reviewedAt" = NULL,
             "publisherUnitType" = $3, "publisherUnitId" = $4, publisher = $5, kind = $6,
             "publishedAt" = CASE WHEN $7 = 'published' THEN NOW() ELSE "publishedAt" END
             WHERE id = $2`,
            enterpriseId || unit.enterpriseId || null, notice.id, unit.type, unit.id, publisher, noticeKind, initStatus, category, type);
        await this.writeOpLog(actor, {
            module: 'content', action: 'create', targetType: 'StudyNotice', targetId: notice.id, targetLabel: title,
            summary: (noticeKind === 'dynamics' ? '发布项目动态 ' : '提交企业资讯待审 ') + title,
            enterpriseId: enterpriseId || undefined, projectId: projectId || undefined,
            detail: { projectId: projectId || '', enterpriseId: enterpriseId || '', status: initStatus, kind: noticeKind },
        });
        return this.getNoticeById(notice.id);
    }
    async getNoticeById(id) {
        await this.ensureStudyNoticeColumns();
        const rows = await this.prisma.$queryRawUnsafe(
            `SELECT n.id, n."projectId", n."enterpriseId", n.title, n.content, n.type, n.category, n.publisher, n.paragraphs, n."publishedAt",
                COALESCE(n.status, 'published') AS status, n."reviewNote", n."reviewedAt", COALESCE(n.kind, 'news') AS kind,
                sp.id AS "project_id", sp.title AS "project_title", sp.status AS "project_status", sp."enterpriseId" AS "project_enterpriseId",
                COALESCE(NULLIF(BTRIM(e."shortName"), ''), e.name, '') AS "enterprise_name"
             FROM "StudyNotice" n
             LEFT JOIN "StudyProject" sp ON sp.id = n."projectId"
             LEFT JOIN "Enterprise" e ON e.id = COALESCE(n."enterpriseId", sp."enterpriseId")
             WHERE n.id = $1 LIMIT 1`, id);
        if (!rows || !rows.length)
            throw new common_1.NotFoundException('动态不存在');
        return this.serializeNoticeRow(rows[0]);
    }
    async updateNotice(id, body, actor) {
        await this.ensureStudyNoticeColumns();
        const rows = await this.prisma.$queryRawUnsafe(
            `SELECT n.*, COALESCE(n."enterpriseId", sp."enterpriseId") AS "resolvedEnterpriseId"
             FROM "StudyNotice" n LEFT JOIN "StudyProject" sp ON sp.id = n."projectId" WHERE n.id = $1 LIMIT 1`, id);
        if (!rows || !rows.length)
            throw new common_1.NotFoundException('动态不存在');
        const existed = rows[0];
        this.assertNoticeScope({
            enterpriseId: existed.resolvedEnterpriseId || existed.enterpriseId,
            projectId: existed.projectId,
        }, actor);
        let projectId = body.projectId != null ? String(body.projectId).trim() : String(existed.projectId || '');
        let enterpriseId = String(existed.resolvedEnterpriseId || existed.enterpriseId || '').trim();
        let noticeKind = body.kind != null ? String(body.kind).trim().toLowerCase() : String(existed.kind || '').trim().toLowerCase();
        if (noticeKind !== 'news' && noticeKind !== 'dynamics')
            noticeKind = projectId ? 'dynamics' : 'news';
        if (noticeKind === 'dynamics' && !projectId)
            throw new common_1.BadRequestException('项目动态必须绑定研学项目');
        if (body.projectId != null) {
            if (projectId) {
                const project = await this.ensureStudyProject(projectId, actor);
                enterpriseId = String((project && project.enterpriseId) || enterpriseId || '').trim();
            }
            else {
                enterpriseId = this.enterpriseIdOf(actor) || String(body.enterpriseId || enterpriseId || '').trim();
                if (!enterpriseId)
                    throw new common_1.BadRequestException('企业资讯必须指定企业');
                this.assertEnterpriseScope({ enterpriseId }, actor);
                const scoped = this.scopedProjectIds(actor);
                if (scoped)
                    throw new common_1.ForbiddenException('当前职位仅可管理指定项目的资讯，不能改为企业级资讯');
                projectId = '';
            }
        }
        const title = body.title != null ? String(body.title).trim() : String(existed.title || '');
        const content = body.content != null ? String(body.content).trim() : String(existed.content || '');
        if (!title || !content)
            throw new common_1.BadRequestException('请填写标题和正文');
        // 发布单位 always re-resolved from current scope — ignore client body.publisher.
        // Dynamics: any scoped actor may set/change category. News: ops-only category updates.
        const ops = this.isPlatformReviewer(actor);
        let category = String(existed.category || existed.type || '待分类');
        let type = String(existed.type || category || '待分类');
        if (body.category != null && (noticeKind === 'dynamics' || ops)) {
            const nextCat = String(body.category || body.categoryId || '').trim();
            if (nextCat) {
                category = nextCat;
                type = nextCat;
            }
        }
        const unit = await this.resolvePublisherUnit({ projectId, enterpriseId });
        const publisher = unit.displayName;
        const paragraphs = body.content != null
            ? (Array.isArray(body.paragraphs) && body.paragraphs.length
                ? body.paragraphs.map((x) => String(x || '').trim()).filter(Boolean)
                : content.split(/\n+/).map((x) => x.trim()).filter(Boolean))
            : (existed.paragraphs || []);
        await this.prisma.studyNotice.update({
            where: { id },
            data: {
                projectId: projectId || null,
                title,
                content,
                type,
                publisher: publisher || null,
                paragraphs,
            },
        });
        // dynamics: always published.
        // news: enterprise edits go pending; platform may keep published (e.g. change category after approve).
        const prevStatus = String(existed.status || 'pending');
        let nextStatus;
        if (noticeKind === 'dynamics') nextStatus = 'published';
        else if (ops && (prevStatus === 'published' || body.keepPublished === true)) nextStatus = 'published';
        else nextStatus = 'pending';
        await this.prisma.$executeRawUnsafe(
            `UPDATE "StudyNotice" SET "enterpriseId" = $1, status = $7, category = $8, type = $9, "reviewNote" = NULL, "reviewedAt" = NULL,
             "publisherUnitType" = $3, "publisherUnitId" = $4, publisher = $5, kind = $6,
             "publishedAt" = CASE WHEN $7 = 'published' THEN COALESCE("publishedAt", NOW()) ELSE "publishedAt" END
             WHERE id = $2`,
            enterpriseId || unit.enterpriseId || null, id, unit.type, unit.id, publisher, noticeKind, nextStatus, category, type);
        await this.writeOpLog(actor, {
            module: 'content', action: 'update', targetType: 'StudyNotice', targetId: id, targetLabel: title,
            summary: (noticeKind === 'dynamics'
                ? '更新项目动态 '
                : (nextStatus === 'published' && ops ? '更新资讯（平台） ' : '修改资讯并重新提交审核 ')) + title,
            enterpriseId: enterpriseId || undefined, projectId: projectId || undefined,
            detail: { projectId: projectId || '', enterpriseId: enterpriseId || '', status: nextStatus, kind: noticeKind, category },
        });
        return this.getNoticeById(id);
    }
    async deleteNotice(id, actor) {
        await this.ensureStudyNoticeColumns();
        const rows = await this.prisma.$queryRawUnsafe(
            `SELECT n.*, COALESCE(n."enterpriseId", sp."enterpriseId") AS "resolvedEnterpriseId"
             FROM "StudyNotice" n LEFT JOIN "StudyProject" sp ON sp.id = n."projectId" WHERE n.id = $1 LIMIT 1`, id);
        if (!rows || !rows.length)
            throw new common_1.NotFoundException('动态不存在');
        const existed = rows[0];
        this.assertNoticeScope({
            enterpriseId: existed.resolvedEnterpriseId || existed.enterpriseId,
            projectId: existed.projectId,
        }, actor);
        await this.prisma.$executeRawUnsafe(`DELETE FROM "StudyNotice" WHERE id = $1`, id);
        await this.writeOpLog(actor, {
            module: 'content', action: 'delete', targetType: 'StudyNotice', targetId: id, targetLabel: existed.title || '',
            summary: '删除资讯 ' + (existed.title || ''),
            enterpriseId: String(existed.resolvedEnterpriseId || existed.enterpriseId || '') || undefined,
            projectId: String(existed.projectId || '') || undefined,
            detail: { projectId: existed.projectId || '', enterpriseId: existed.resolvedEnterpriseId || existed.enterpriseId || '' },
        });
        return { id };
    }
    communityPostSelect() {
        return `SELECT p.*, COALESCE(NULLIF(BTRIM(u."realName"), ''), u.nickname, '') AS "authorName", COALESCE(u."avatarUrl", '') AS "authorAvatar", COALESCE(sp.title, '') AS "projectTitle"
            FROM "CommunityPost" p
            JOIN "User" u ON u.id = p."userId"
            LEFT JOIN "StudyProject" sp ON sp.id = p."projectId"`;
    }
    serializeCommunityPost(row) {
        let images = [];
        try {
            const parsed = JSON.parse(row.images || '[]');
            if (Array.isArray(parsed))
                images = parsed.map((x) => String(x || '')).filter(Boolean);
        }
        catch (_err) {
            images = [];
        }
        return {
            id: String(row.id),
            userId: String(row.userId || ''),
            title: String(row.title || ''),
            content: String(row.content || ''),
            coverUrl: String(row.coverUrl || ''),
            images,
            videoUrl: String(row.videoUrl || ''),
            channel: String(row.channel || 'experience'),
            type: String(row.type || ''),
            category: String(row.category || '测试分类'),
            projectId: String(row.projectId || ''),
            projectTitle: String(row.projectTitle || ''),
            authorName: String(row.publisher || row.authorName || ''),
            authorAvatar: String(row.authorAvatar || ''),
            publisher: String(row.publisher || row.authorName || ''),
            publisherUnitType: String(row.publisherUnitType || (row.projectId ? 'project' : (row.enterpriseId ? 'enterprise' : 'platform')) || 'platform'),
            publisherUnitId: String(row.publisherUnitId || row.projectId || row.enterpriseId || ''),
            enterpriseId: String(row.enterpriseId || ''),
            status: String(row.status || 'published'),
            reviewNote: row.reviewNote ? String(row.reviewNote) : '',
            reviewedAt: row.reviewedAt || null,
            likeCount: Number(row.likeCount || 0),
            commentCount: Number(row.commentCount || 0),
            createdAt: row.createdAt,
            updatedAt: row.updatedAt,
            isOfficial: String(row.channel || '') === 'official',
            kind: 'community',
            sourceLabel: '平台',
            tags: [],
            comments: [],
        };
    }
    async communityPosts(keyword, status, page, pageSize) {
        await this.ensureStudyNoticeColumns();
        const search = String(keyword || '').trim();
        const st = String(status || '').trim();
        const parsed = this.parsePage({ page: page || 1, pageSize: pageSize || 20 }, 20);
        const conds = ['1=1'];
        const params = [];
        if (st && st !== 'all') {
            params.push(st);
            conds.push(`p.status = $${params.length}`);
        }
        if (search) {
            params.push('%' + search + '%');
            conds.push(`(p.title ILIKE $${params.length} OR p.content ILIKE $${params.length} OR COALESCE(u.nickname,'') ILIKE $${params.length})`);
        }
        const where = conds.join(' AND ');
        const rows = await this.prisma.$queryRawUnsafe(
            `${this.communityPostSelect()} WHERE ${where} ORDER BY p."createdAt" DESC LIMIT 200`,
            ...params
        );
        const items = (rows || []).map((row) => this.serializeCommunityPost(row));
        // Merge enterprise StudyNotice (资讯) into 资讯总览 when viewing all/published/pending/rejected.
        const wantNotices = !st || st === 'all' || st === 'published' || st === 'pending' || st === 'rejected';
        if (wantNotices) {
            const nConds = ["COALESCE(n.kind, 'news') = 'news'"];
            const nParams = [];
            if (st && st !== 'all') {
                nParams.push(st);
                nConds.push(`COALESCE(n.status, 'published') = $${nParams.length}`);
            }
            if (search) {
                nParams.push('%' + search + '%');
                nConds.push(`(n.title ILIKE $${nParams.length} OR n.content ILIKE $${nParams.length} OR COALESCE(n.publisher,'') ILIKE $${nParams.length})`);
            }
            const noticeRows = await this.prisma.$queryRawUnsafe(
                `SELECT n.id, n."projectId", n."enterpriseId", n.title, n.content, n.type, n.category, n.publisher, n.paragraphs, n."publishedAt",
                    COALESCE(n.status, 'published') AS status, n."reviewNote", n."reviewedAt", COALESCE(n.kind, 'news') AS kind,
                    sp.id AS "project_id", sp.title AS "project_title", sp.status AS "project_status", sp."enterpriseId" AS "project_enterpriseId"
                 FROM "StudyNotice" n
                 LEFT JOIN "StudyProject" sp ON sp.id = n."projectId"
                 WHERE ${nConds.join(' AND ')}
                 ORDER BY n."publishedAt" DESC LIMIT 200`,
                ...nParams);
            for (const row of (noticeRows || [])) {
                const item = this.serializeNoticeRow(row);
                items.push({
                    ...item,
                    id: item.id,
                    kind: 'news',
                    contentType: 'notice',
                    channel: 'official',
                    authorName: item.publisher || '企业资讯',
                    createdAt: item.publishedAt,
                    reviewKey: 'notice:' + item.id,
                    sourceLabel: item.projectId ? '项目' : '企业',
                });
            }
        }
        items.sort((a, b) => {
            const ta = new Date(a.createdAt || a.publishedAt || 0).getTime();
            const tb = new Date(b.createdAt || b.publishedAt || 0).getTime();
            return tb - ta;
        });
        const total = items.length;
        const sliced = items.slice(parsed.skip, parsed.skip + parsed.pageSize);
        return { items: sliced, total, page: parsed.page, pageSize: parsed.pageSize };
    }
    async communityPostDetail(id) {
        const rows = await this.prisma.$queryRawUnsafe(`${this.communityPostSelect()} WHERE p.id = $1 LIMIT 1`, id);
        if (!rows || !rows.length)
            throw new common_1.NotFoundException('文章不存在');
        const item = this.serializeCommunityPost(rows[0]);
        const comments = await this.prisma.$queryRawUnsafe(
            `SELECT c.id, c.content, c."createdAt", COALESCE(NULLIF(BTRIM(u."realName"), ''), u.nickname, '') AS "authorName"
             FROM "CommunityComment" c JOIN "User" u ON u.id = c."userId"
             WHERE c."postId" = $1 ORDER BY c."createdAt" ASC LIMIT 50`,
            id
        );
        item.comments = (comments || []).map((c) => ({
            id: String(c.id),
            content: String(c.content || ''),
            authorName: String(c.authorName || '研学学员'),
            createdAt: c.createdAt,
        }));
        return item;
    }
    async resolvePostAuthorId(actor) {
        const actorId = String((actor && actor.actorId) || '').trim();
        if (actorId) {
            const user = await this.prisma.user.findUnique({ where: { id: actorId }, select: { id: true } });
            if (user)
                return user.id;
        }
        const admin = await this.prisma.user.findFirst({ where: { isAdmin: true }, select: { id: true } });
        if (admin)
            return admin.id;
        throw new common_1.BadRequestException('没有可用的发稿账号');
    }
    async createCommunityPost(body, actor) {
        const title = String((body && body.title) || '').trim();
        const content = String((body && body.content) || '').trim();
        if (!title)
            throw new common_1.BadRequestException('请填写标题');
        const userId = await this.resolvePostAuthorId(actor);
        const id = 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
        const channel = ['official', 'video', 'experience'].includes(String(body.channel || '')) ? String(body.channel) : 'official';
        let status = ['published', 'pending', 'draft', 'private', 'rejected'].includes(String(body.status || '')) ? String(body.status) : 'pending';
        // Console publish path cannot self-approve; draft stays draft, everything else waits for posts-review.
        if (status === 'published')
            status = 'pending';
        const type = String(body.type || (channel === 'official' ? '官方资讯' : '文章')).trim() || '官方资讯';
        // Category assigned by ops on approve only.
        const category = '待分类';
        let projectId = String(body.projectId || '').trim() || null;
        let enterpriseId = String(body.enterpriseId || '').trim() || null;
        if (projectId) {
            const project = await this.ensureStudyProject(projectId);
            enterpriseId = String((project && project.enterpriseId) || enterpriseId || '').trim() || null;
        }
        else if (enterpriseId) {
            this.assertEnterpriseScope({ enterpriseId }, actor);
        }
        // 发布单位 locked from selected target; ignore client publisher.
        const unit = await this.resolvePublisherUnit({ projectId: projectId || '', enterpriseId: enterpriseId || '' });
        const publisher = unit.displayName;
        if (unit.type === 'enterprise')
            enterpriseId = unit.enterpriseId;
        const coverUrl = String(body.coverUrl || '').trim();
        const images = Array.isArray(body.images) ? body.images.map((x) => String(x || '').trim()).filter(Boolean) : [];
        const videoUrl = String(body.videoUrl || '').trim();
        await this.ensureCommunityPostReviewColumns();
        await this.prisma.$executeRawUnsafe(
            `INSERT INTO "CommunityPost" (id, "userId", title, content, "coverUrl", images, "videoUrl", channel, type, "projectId", status, category, publisher, "publisherUnitType", "publisherUnitId", "enterpriseId", "createdAt", "updatedAt")
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,NOW(),NOW())`,
            id, userId, title, content, coverUrl, JSON.stringify(images), videoUrl, channel, type, projectId, status, category,
            publisher, unit.type, unit.id === 'platform' ? null : unit.id, enterpriseId
        );
        await this.writeOpLog(actor, { module: 'content', action: 'create', targetType: 'CommunityPost', targetId: id, targetLabel: title, summary: '发布资讯文章 ' + title, detail: { status, channel, publisher, publisherUnitType: unit.type, enterpriseId: enterpriseId || '', projectId: projectId || '' } });
        return this.communityPostDetail(id);
    }
    async updateCommunityPost(id, body, actor) {
        const rows = await this.prisma.$queryRawUnsafe(`SELECT * FROM "CommunityPost" WHERE id = $1 LIMIT 1`, id);
        if (!rows || !rows.length)
            throw new common_1.NotFoundException('文章不存在');
        const existed = rows[0];
        const title = body.title != null ? String(body.title).trim() : existed.title;
        if (!title)
            throw new common_1.BadRequestException('请填写标题');
        const content = body.content != null ? String(body.content) : existed.content;
        const channel = body.channel != null && ['official', 'video', 'experience'].includes(String(body.channel)) ? String(body.channel) : existed.channel;
        let status = body.status != null && ['published', 'pending', 'draft', 'private', 'rejected'].includes(String(body.status)) ? String(body.status) : existed.status;
        const reviewAction = !!(body && body._reviewAction);
        if (!reviewAction) {
            if (status === 'published')
                status = 'pending';
            else if (status === 'rejected')
                status = 'pending';
            else if (String(existed.status || '') === 'published' && status !== 'draft' && status !== 'private')
                status = 'pending';
        }
        const type = body.type != null ? String(body.type).trim() : existed.type;
        let category = existed.category;
        if (reviewAction && body.category != null) {
            const nextCat = String(body.category || body.categoryId || '').trim();
            if (nextCat)
                category = nextCat;
        }
        let projectId = existed.projectId || null;
        let enterpriseId = existed.enterpriseId || null;
        if (body.projectId !== undefined)
            projectId = String(body.projectId || '').trim() || null;
        if (body.enterpriseId !== undefined)
            enterpriseId = String(body.enterpriseId || '').trim() || null;
        if (projectId) {
            const project = await this.ensureStudyProject(projectId);
            enterpriseId = String((project && project.enterpriseId) || enterpriseId || '').trim() || null;
        }
        const unit = await this.resolvePublisherUnit({ projectId: projectId || '', enterpriseId: enterpriseId || '' });
        const publisher = unit.displayName;
        if (unit.type === 'enterprise')
            enterpriseId = unit.enterpriseId;
        const coverUrl = body.coverUrl != null ? String(body.coverUrl).trim() : existed.coverUrl;
        const images = Array.isArray(body.images) ? body.images.map((x) => String(x || '').trim()).filter(Boolean) : (existed.images || '[]');
        const imagesJson = Array.isArray(images) ? JSON.stringify(images) : String(images || '[]');
        const videoUrl = body.videoUrl != null ? String(body.videoUrl).trim() : existed.videoUrl;
        await this.ensureCommunityPostReviewColumns();
        await this.prisma.$executeRawUnsafe(
            `UPDATE "CommunityPost" SET title=$1, content=$2, channel=$3, status=$4, type=$5, category=$6, "projectId"=$7, "coverUrl"=$8, images=$9, "videoUrl"=$10,
             publisher=$11, "publisherUnitType"=$12, "publisherUnitId"=$13, "enterpriseId"=$14, "updatedAt"=NOW() WHERE id=$15`,
            title, content, channel, status, type, category, projectId, coverUrl, imagesJson, videoUrl,
            publisher, unit.type, unit.id === 'platform' ? null : unit.id, enterpriseId, id
        );
        if (!reviewAction && status === 'pending') {
            await this.prisma.$executeRawUnsafe(
                `UPDATE "CommunityPost" SET "reviewNote" = NULL, "reviewedAt" = NULL WHERE id = $1`, id);
        }
        await this.writeOpLog(actor, { module: 'content', action: 'update', targetType: 'CommunityPost', targetId: id, targetLabel: title, summary: '修改资讯文章 ' + title, detail: { status, channel } });
        return this.communityPostDetail(id);
    }
    async deleteCommunityPost(id, actor) {
        const rows = await this.prisma.$queryRawUnsafe(`SELECT id, title FROM "CommunityPost" WHERE id = $1 LIMIT 1`, id);
        if (!rows || !rows.length)
            throw new common_1.NotFoundException('文章不存在');
        await this.prisma.$executeRawUnsafe(`DELETE FROM "CommunityPost" WHERE id = $1`, id);
        await this.writeOpLog(actor, { module: 'content', action: 'delete', targetType: 'CommunityPost', targetId: id, targetLabel: rows[0].title || '', summary: '删除资讯文章 ' + (rows[0].title || ''), detail: {} });
        return { id };
    }
    async batchCommunityPosts(body, actor) {
        const list = this.normalizeIdList(body && body.ids);
        const action = String((body && body.action) || 'delete').toLowerCase();
        if (action === 'publish' || action === 'approve' || action === 'reject')
            this.assertPlatformReviewer(actor);
        await this.ensureCommunityPostReviewColumns();
        const note = String((body && (body.note || body.reviewNote)) || '').trim();
        const category = String((body && (body.category || body.categoryId)) || '').trim();
        if ((action === 'publish' || action === 'approve') && !category)
            throw new common_1.BadRequestException('审批通过时请选择分类');
        let updated = 0;
        for (let i = 0; i < list.length; i++) {
            try {
                if (action === 'publish' || action === 'approve') {
                    await this.updateCommunityPost(list[i], { status: 'published', category, _reviewAction: true }, actor);
                    await this.prisma.$executeRawUnsafe(
                        `UPDATE "CommunityPost" SET "reviewNote" = $1, "reviewedAt" = NOW() WHERE id = $2`, note, list[i]);
                }
                else if (action === 'reject') {
                    await this.updateCommunityPost(list[i], { status: 'rejected', _reviewAction: true }, actor);
                    await this.prisma.$executeRawUnsafe(
                        `UPDATE "CommunityPost" SET "reviewNote" = $1, "reviewedAt" = NOW() WHERE id = $2`, note, list[i]);
                }
                else if (action === 'hide')
                    await this.updateCommunityPost(list[i], { status: 'private', _reviewAction: true }, actor);
                else
                    await this.deleteCommunityPost(list[i], actor);
                updated += 1;
            }
            catch (_err) { }
        }
        return { updated, deleted: action === 'delete' ? updated : 0 };
    }
    async contentReview(keyword, status, page, pageSize, actor) {
        this.assertPlatformReviewer(actor);
        await this.ensureStudyNoticeColumns();
        await this.ensureCommunityPostReviewColumns();
        const search = String(keyword || '').trim();
        const st = String(status || 'pending').trim() || 'pending';
        const parsed = this.parsePage({ page: page || 1, pageSize: pageSize || 20 }, 20);
        const items = [];
        const postConds = ['1=1'];
        const postParams = [];
        if (st && st !== 'all') {
            postParams.push(st);
            postConds.push(`p.status = $${postParams.length}`);
        }
        if (search) {
            postParams.push('%' + search + '%');
            postConds.push(`(p.title ILIKE $${postParams.length} OR p.content ILIKE $${postParams.length} OR COALESCE(u.nickname,'') ILIKE $${postParams.length})`);
        }
        const postRows = await this.prisma.$queryRawUnsafe(
            `${this.communityPostSelect()} WHERE ${postConds.join(' AND ')} ORDER BY p."createdAt" DESC LIMIT 200`,
            ...postParams);
        for (const row of (postRows || [])) {
            const item = this.serializeCommunityPost(row);
            items.push({
                ...item,
                reviewKey: 'community:' + item.id,
                sortAt: item.createdAt || item.updatedAt,
            });
        }
        const noticeConds = ["COALESCE(n.kind, 'news') = 'news'"]; // 项目动态无需平台审批，不进审核队列
        const noticeParams = [];
        if (st && st !== 'all') {
            noticeParams.push(st);
            noticeConds.push(`COALESCE(n.status, 'published') = $${noticeParams.length}`);
        }
        if (search) {
            noticeParams.push('%' + search + '%');
            noticeConds.push(`(n.title ILIKE $${noticeParams.length} OR n.content ILIKE $${noticeParams.length} OR COALESCE(n.publisher,'') ILIKE $${noticeParams.length})`);
        }
        const noticeRows = await this.prisma.$queryRawUnsafe(
            `SELECT n.id, n."projectId", n."enterpriseId", n.title, n.content, n.type, n.category, n.publisher, n.paragraphs, n."publishedAt",
                COALESCE(n.status, 'published') AS status, n."reviewNote", n."reviewedAt", COALESCE(n.kind, 'news') AS kind,
                sp.id AS "project_id", sp.title AS "project_title", sp.status AS "project_status", sp."enterpriseId" AS "project_enterpriseId"
             FROM "StudyNotice" n
             LEFT JOIN "StudyProject" sp ON sp.id = n."projectId"
             WHERE ${noticeConds.join(' AND ')}
             ORDER BY n."publishedAt" DESC LIMIT 200`,
            ...noticeParams);
        for (const row of (noticeRows || [])) {
            const item = this.serializeNoticeRow(row);
            items.push({
                ...item,
                createdAt: item.publishedAt,
                reviewKey: 'notice:' + item.id,
                sortAt: item.publishedAt,
            });
        }
        items.sort((a, b) => {
            const ta = a.sortAt ? new Date(a.sortAt).getTime() : 0;
            const tb = b.sortAt ? new Date(b.sortAt).getTime() : 0;
            return tb - ta;
        });
        const total = items.length;
        const sliced = items.slice(parsed.skip, parsed.skip + parsed.pageSize);
        return { items: sliced, total, page: parsed.page, pageSize: parsed.pageSize };
    }
    async batchContentReview(body, actor) {
        this.assertPlatformReviewer(actor);
        await this.ensureStudyNoticeColumns();
        await this.ensureCommunityPostReviewColumns();
        const action = String((body && body.action) || '').toLowerCase();
        if (action !== 'approve' && action !== 'publish' && action !== 'reject')
            throw new common_1.BadRequestException('action 须为 approve 或 reject');
        const note = String((body && (body.note || body.reviewNote)) || '').trim();
        const category = String((body && (body.category || body.categoryId)) || '').trim();
        if ((action === 'approve' || action === 'publish') && !category)
            throw new common_1.BadRequestException('审批通过时请选择分类');
        const raw = Array.isArray(body && body.items) ? body.items : [];
        let list = raw.map((it) => {
            if (typeof it === 'string') {
                const s = String(it);
                if (s.indexOf('notice:') === 0)
                    return { kind: 'notice', id: s.slice(7) };
                if (s.indexOf('community:') === 0)
                    return { kind: 'community', id: s.slice(10) };
                return { kind: 'community', id: s };
            }
            const kind = String((it && it.kind) || 'community').toLowerCase();
            return { kind: kind === 'notice' ? 'notice' : 'community', id: String((it && it.id) || '').trim() };
        }).filter((it) => it.id);
        if (!list.length && Array.isArray(body && body.ids)) {
            list = this.normalizeIdList(body.ids).map((id) => ({ kind: 'community', id }));
        }
        let updated = 0;
        for (let i = 0; i < list.length; i++) {
            const it = list[i];
            try {
                if (it.kind === 'notice') {
                    const rows = await this.prisma.$queryRawUnsafe(
                        `SELECT n.id, n.title, n."projectId", COALESCE(n."enterpriseId", sp."enterpriseId") AS "enterpriseId"
                         FROM "StudyNotice" n LEFT JOIN "StudyProject" sp ON sp.id = n."projectId" WHERE n.id = $1 LIMIT 1`, it.id);
                    if (!rows || !rows.length)
                        continue;
                    const row = rows[0];
                    if (action === 'reject') {
                        await this.prisma.$executeRawUnsafe(
                            `UPDATE "StudyNotice" SET status = 'rejected', "reviewNote" = $1, "reviewedAt" = NOW() WHERE id = $2`,
                            note, it.id);
                        await this.writeOpLog(actor, {
                            module: 'content', action: 'update', targetType: 'StudyNotice', targetId: it.id, targetLabel: row.title || '',
                            summary: '驳回资讯 ' + (row.title || ''),
                            enterpriseId: row.enterpriseId || undefined, projectId: row.projectId || undefined,
                            detail: { status: 'rejected', note },
                        });
                    }
                    else {
                        await this.prisma.$executeRawUnsafe(
                            `UPDATE "StudyNotice" SET status = 'published', category = $1, type = $1, "reviewNote" = $2, "reviewedAt" = NOW(), "publishedAt" = NOW() WHERE id = $3`,
                            category, note, it.id);
                        await this.writeOpLog(actor, {
                            module: 'content', action: 'update', targetType: 'StudyNotice', targetId: it.id, targetLabel: row.title || '',
                            summary: '通过资讯 ' + (row.title || ''),
                            enterpriseId: row.enterpriseId || undefined, projectId: row.projectId || undefined,
                            detail: { status: 'published', note, category },
                        });
                    }
                    updated += 1;
                }
                else {
                    const sub = action === 'reject' ? 'reject' : 'approve';
                    const res = await this.batchCommunityPosts({ ids: [it.id], action: sub, note, category }, actor);
                    updated += Number((res && res.updated) || 0);
                }
            }
            catch (_err) { }
        }
        return { updated };
    }
    async deleteNotices(ids, actor) {
        const list = this.normalizeIdList(ids);
        let deleted = 0;
        for (let i = 0; i < list.length; i++) {
            try {
                await this.deleteNotice(list[i], actor);
                deleted += 1;
            }
            catch (_err) { }
        }
        return { deleted };
    }
    async floatingNotices() {
        const notices = await this.prisma.studyFloatingNotice.findMany({
            include: { project: true },
            orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
            take: 200,
        });
        return notices.map((notice) => this.serializeFloatingNotice(notice));
    }
    async createFloatingNotice(body) {
        const title = String(body.title ?? '').trim();
        const showSubtitle = this.mapBoolean(body.showSubtitle, true);
        const subtitle = showSubtitle ? String(body.subtitle ?? '').trim() : '';
        if (!title) {
            throw new common_1.BadRequestException('Floating notice title is required');
        }
        const projectId = String(body.projectId ?? '').trim();
        const hasButton = this.mapBoolean(body.hasButton, true);
        const hasImage = this.mapBoolean(body.hasImage, false);
        const actionType = hasButton ? this.mapFloatingNoticeActionType(body.actionType) : 'none';
        const notice = await this.prisma.studyFloatingNotice.create({
            data: {
                projectId: projectId.length > 0 ? projectId : null,
                title,
                subtitle,
                showSubtitle,
                tag: String(body.tag ?? '').trim() || '研学进行中',
                content: this.mapNullableText(body.content),
                imageUrl: hasImage ? this.mapNullableText(body.imageUrl) : null,
                actionText: hasButton ? String(body.actionText ?? '').trim() || '进入研学详情' : '',
                actionType,
                actionTarget: hasButton ? this.mapNullableText(body.actionTarget) : null,
                gradientStart: this.mapNullableText(body.gradientStart),
                gradientEnd: this.mapNullableText(body.gradientEnd),
                titleFontSize: this.mapNullableFontSize(body.titleFontSize),
                titleColor: this.mapNullableText(body.titleColor),
                contentFontSize: this.mapNullableFontSize(body.contentFontSize),
                contentColor: this.mapNullableText(body.contentColor),
                sortOrder: Number(body.sortOrder ?? 0),
                enabled: this.mapBoolean(body.enabled, true),
            },
            include: { project: true },
        });
        return this.serializeFloatingNotice(notice);
    }
    async updateFloatingNotice(id, body) {
        const existed = await this.prisma.studyFloatingNotice.findUnique({ where: { id } });
        if (!existed)
            throw new common_1.NotFoundException('Floating notice not found');
        const projectId = body.projectId != null ? String(body.projectId).trim() : undefined;
        const title = body.title != null ? String(body.title).trim() : undefined;
        const showSubtitle = body.showSubtitle != null ? this.mapBoolean(body.showSubtitle, true) : undefined;
        const subtitle = body.subtitle != null ? String(body.subtitle).trim() : undefined;
        const hasButton = body.hasButton != null ? this.mapBoolean(body.hasButton, true) : undefined;
        const hasImage = body.hasImage != null ? this.mapBoolean(body.hasImage, false) : undefined;
        if (title === '') {
            throw new common_1.BadRequestException('Floating notice title is required');
        }
        const notice = await this.prisma.studyFloatingNotice.update({
            where: { id },
            data: {
                projectId: projectId === undefined ? undefined : projectId.length > 0 ? projectId : null,
                title,
                subtitle: showSubtitle === false ? '' : subtitle,
                showSubtitle,
                tag: body.tag != null ? String(body.tag).trim() || '研学进行中' : undefined,
                content: body.content != null ? this.mapNullableText(body.content) : undefined,
                imageUrl: hasImage === undefined ? undefined : hasImage ? this.mapNullableText(body.imageUrl) : null,
                actionText: hasButton === false
                    ? ''
                    : body.actionText != null
                        ? String(body.actionText).trim() || '进入研学详情'
                        : undefined,
                actionType: hasButton === false
                    ? 'none'
                    : body.actionType != null
                        ? this.mapFloatingNoticeActionType(body.actionType)
                        : undefined,
                actionTarget: hasButton === false
                    ? null
                    : body.actionTarget != null
                        ? this.mapNullableText(body.actionTarget)
                        : undefined,
                gradientStart: body.gradientStart != null ? this.mapNullableText(body.gradientStart) : undefined,
                gradientEnd: body.gradientEnd != null ? this.mapNullableText(body.gradientEnd) : undefined,
                titleFontSize: body.titleFontSize != null ? this.mapNullableFontSize(body.titleFontSize) : undefined,
                titleColor: body.titleColor != null ? this.mapNullableText(body.titleColor) : undefined,
                contentFontSize: body.contentFontSize != null ? this.mapNullableFontSize(body.contentFontSize) : undefined,
                contentColor: body.contentColor != null ? this.mapNullableText(body.contentColor) : undefined,
                sortOrder: body.sortOrder != null ? Number(body.sortOrder) : undefined,
                enabled: body.enabled != null ? this.mapBoolean(body.enabled, true) : undefined,
            },
            include: { project: true },
        });
        return this.serializeFloatingNotice(notice);
    }
    async deleteFloatingNotice(id) {
        const existed = await this.prisma.studyFloatingNotice.findUnique({ where: { id } });
        if (!existed)
            throw new common_1.NotFoundException('Floating notice not found');
        await this.prisma.studyFloatingNotice.delete({ where: { id } });
        return { id, deleted: true };
    }
    todayDayKey() {
        return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Shanghai' });
    }
    bookingNeedsCheckInToday(booking) {
        if (String(booking.status) !== 'BOOKED')
            return false;
        const days = this.consoleTripDays(booking.tripPlan);
        if (!days.length)
            return true;
        const today = this.todayDayKey();
        return days.some((d) => d.dayKey === today && !d.redeemed);
    }
    async bookings(status, keyword, projectId, filter, page, pageSize, actor, enterpriseId, appointmentDate) {
        const search = String(keyword || '').trim();
        const pid = String(projectId || '').trim();
        const f = String(filter || status || 'all').trim().toLowerCase();
        const where = {};
        const eid = this.scopeEnterpriseId(actor, enterpriseId);
        if (eid)
            where.project = { enterpriseId: eid };
        else {
            const ents = this.scopedEnterpriseIds(actor);
            if (ents)
                where.project = { enterpriseId: { in: ents } };
        }
        const scoped = this.scopedProjectIds(actor);
        if (pid) {
            if (scoped && scoped.indexOf(pid) < 0)
                throw new common_1.ForbiddenException('当前职位不能查看该项目');
            where.projectId = pid;
        }
        else if (scoped)
            where.projectId = { in: scoped };
        if (search) {
            where.OR = [
                { participantName: { contains: search } },
                { participantPhone: { contains: search } },
                { user: { OR: [{ studyNo: { contains: search } }, { realName: { contains: search } }, { phone: { contains: search } }, { nickname: { contains: search } }] } },
                { project: { title: { contains: search } } },
            ];
        }
        if (f === 'unpaid' || f === 'pending')
            where.status = { in: [client_1.BookingStatus.UNPAID, client_1.BookingStatus.PENDING] };
        else if (f === 'booked' || f === 'today')
            where.status = client_1.BookingStatus.BOOKED;
        else if (f === 'completed')
            where.status = client_1.BookingStatus.COMPLETED;
        else if (f === 'cancelled' || f === 'canceled')
            where.status = client_1.BookingStatus.CANCELLED;
        else if (status && status !== 'all' && !filter)
            where.status = this.mapBookingStatus(status);
        const dayKey = String(appointmentDate || '').trim();
        const dateFilter = /^\d{4}-\d{2}-\d{2}$/.test(dayKey) ? dayKey : '';
        const paged = page != null && String(page).trim() !== '';
        const parsed = this.parsePage({ page: paged ? page : 1, pageSize: pageSize || 20 }, 20);
        const include = { user: true, project: { include: { enterprise: true } } };
        const needsScan = f === 'today' || !!dateFilter;
        let rows = await this.prisma.studyBooking.findMany({
            where,
            include,
            orderBy: { createdAt: 'desc' },
            ...(paged && !needsScan ? { skip: parsed.skip, take: parsed.pageSize } : { take: paged ? 500 : 200 }),
        });
        if (f === 'today')
            rows = rows.filter((row) => this.bookingNeedsCheckInToday(row));
        if (dateFilter)
            rows = rows.filter((row) => this.tripPlanHasDayKey(row.tripPlan, dateFilter));
        const total = needsScan ? rows.length : await this.prisma.studyBooking.count({ where });
        const slice = needsScan && paged ? rows.slice(parsed.skip, parsed.skip + parsed.pageSize) : (paged && !needsScan ? rows : rows);
        const groups = await this.getBookingGroupsForAdmin(slice);
        const items = slice.map((booking) => {
            const packed = this.serializeConsoleBooking(booking, groups[booking.bookingGroupId ?? booking.id] ?? [booking]);
            packed.user = {
                id: booking.user.id,
                nickname: booking.user.nickname,
                phone: booking.user.phone,
                studyNo: booking.user.studyNo,
                realName: booking.user.realName,
            };
            packed.project = {
                id: booking.project.id,
                title: booking.project.title,
                status: booking.project.status,
                location: booking.project.location || '',
                enterpriseName: booking.project.enterprise ? (booking.project.enterprise.shortName || booking.project.enterprise.name || '') : '',
            };
            packed.todayCheckIn = this.bookingNeedsCheckInToday(booking);
            packed.appointmentDayKey = this.appointmentDayKeyOf(booking);
            packed.participantName = booking.participantName || (booking.user && (booking.user.realName || booking.user.nickname)) || '';
            packed.participantPhone = booking.participantPhone || (booking.user && booking.user.phone) || '';
            packed.checkedInAt = booking.checkedInAt || null;
            return packed;
        });
        if (!paged)
            return items;
        const statsBase = eid ? { project: { enterpriseId: eid } } : {};
        const [unpaid, booked, completed, cancelled] = await Promise.all([
            this.prisma.studyBooking.count({ where: Object.assign({}, statsBase, { status: { in: [client_1.BookingStatus.UNPAID, client_1.BookingStatus.PENDING] } }) }),
            this.prisma.studyBooking.count({ where: Object.assign({}, statsBase, { status: client_1.BookingStatus.BOOKED }) }),
            this.prisma.studyBooking.count({ where: Object.assign({}, statsBase, { status: client_1.BookingStatus.COMPLETED }) }),
            this.prisma.studyBooking.count({ where: Object.assign({}, statsBase, { status: client_1.BookingStatus.CANCELLED }) }),
        ]);
        return { items, total, page: parsed.page, pageSize: parsed.pageSize, stats: { unpaid, booked, completed, cancelled } };
    }
    async updateBooking(id, body) {
        const existed = await this.prisma.studyBooking.findUnique({
            where: { id },
            include: { project: true },
        });
        if (!existed)
            throw new common_1.NotFoundException('Booking not found');
        const nextStatus = this.mapBookingStatus(String(body.status ?? existed.status));
        const rawGroup = existed.bookingGroupId
            ? await this.prisma.studyBooking.findMany({
                where: { bookingGroupId: existed.bookingGroupId },
                include: { project: true },
            })
            : [existed];
        const group = rawGroup.length > 0 ? rawGroup : [existed];
        const groupIds = group.map((item) => item.id);
        const activeBefore = group.filter((item) => this.isActiveStudyBookingStatus(item.status) && this.isSeatStudyBooking(item)).length;
        const activeAfter = this.isActiveStudyBookingStatus(nextStatus) ? this.countSeatStudyBookings(group) : 0;
        const enrollmentDelta = activeAfter - activeBefore;
        const tripPlan = this.hasAdminTripInput(body) ? this.buildAdminTripPlan(body, existed.tripPlan) : undefined;
        const rental = this.hasAdminRentalInput(body) ? this.buildAdminRental(body) : undefined;
        const updated = await this.prisma.$transaction(async (tx) => {
            await tx.studyBooking.updateMany({
                where: { id: { in: groupIds } },
                data: {
                    status: nextStatus,
                    paidAt: this.resolveStudyBookingPaidAt(nextStatus, existed.paidAt),
                    cancelledAt: nextStatus === client_1.BookingStatus.CANCELLED ? new Date() : null,
                    completedAt: nextStatus === client_1.BookingStatus.COMPLETED ? (existed.completedAt ?? new Date()) : null,
                    userDeletedAt: null,
                    ...(tripPlan !== undefined ? { tripPlan } : {}),
                    ...(rental || {}),
                },
            });
            if (enrollmentDelta !== 0) {
                if (enrollmentDelta > 0) {
                    await this.incrementStudyProjectEnrollment(tx, existed.project, enrollmentDelta);
                }
                else {
                    await tx.studyProject.updateMany({
                        where: { id: existed.projectId, enrolled: { gte: Math.abs(enrollmentDelta) } },
                        data: { enrolled: { decrement: Math.abs(enrollmentDelta) } },
                    });
                }
            }
            return tx.studyBooking.findUniqueOrThrow({ where: { id }, include: { user: true, project: true } });
        });
        const updatedGroup = updated.bookingGroupId
            ? await this.prisma.studyBooking.findMany({
                where: { bookingGroupId: updated.bookingGroupId },
                include: { user: true, project: true },
                orderBy: [{ participantIndex: 'asc' }, { createdAt: 'asc' }],
            })
            : [updated];
        try { await this.syncDriverJobForBooking(updated); } catch (_e) { }
        return this.serializeBooking(updated, updatedGroup);
    }
    async redeemBookingCheckIn(id, body, actor) {
        const undo = !!(body && (body.undo || body.unredeem));
        const existed = await this.prisma.studyBooking.findUnique({
            where: { id },
            include: { user: true, project: true },
        });
        if (!existed)
            throw new common_1.NotFoundException('预约不存在');
        if (existed.projectId) {
            await this.assertProjectCapability(existed.projectId, actor, 'project.checkin');
        }
        const st = String(existed.status);
        if (st === 'CANCELLED' || st === 'CANCELED')
            throw new common_1.BadRequestException('订单已取消');
        if (st === 'UNPAID' || st === 'PENDING')
            throw new common_1.BadRequestException('未支付订单不可核销');
        const group = existed.bookingGroupId
            ? await this.prisma.studyBooking.findMany({
                where: { bookingGroupId: existed.bookingGroupId },
                include: { user: true, project: true },
            })
            : [existed];
        const source = group.find((item) => item.tripPlan && typeof item.tripPlan === 'object' && Array.isArray(item.tripPlan.dayKeys) && item.tripPlan.dayKeys.length)
            || existed;
        const plan = (source.tripPlan && typeof source.tripPlan === 'object') ? JSON.parse(JSON.stringify(source.tripPlan)) : {};
        if (!Array.isArray(plan.dayKeys))
            plan.dayKeys = [];
        if (!plan.checkIn || typeof plan.checkIn !== 'object')
            plan.checkIn = { tokens: {}, redeemed: {} };
        if (!plan.checkIn.redeemed || typeof plan.checkIn.redeemed !== 'object')
            plan.checkIn.redeemed = {};
        if (!plan.checkIn.tokens || typeof plan.checkIn.tokens !== 'object')
            plan.checkIn.tokens = {};
        let dayKey = String((body && body.dayKey) || '').trim();
        if (!dayKey) {
            dayKey = plan.dayKeys.length === 1 ? String(plan.dayKeys[0]) : this.todayDayKey();
        }
        if (plan.dayKeys.length && plan.dayKeys.indexOf(dayKey) < 0)
            throw new common_1.BadRequestException('该日不在行程中');
        if (plan.dayKeys.indexOf(dayKey) < 0)
            plan.dayKeys.push(dayKey);
        if (!undo && existed.projectId) {
            try {
                const live = await this.readLiveBookingFields(existed.projectId);
                const ops = this.dayOpsEntry(live.dayOps, dayKey);
                if (ops.pauseCheckin) throw new common_1.BadRequestException(dayKey + ' 已暂停核销');
            } catch (e) {
                if (e instanceof common_1.BadRequestException) throw e;
            }
        }
        if (undo) {
            if (!plan.checkIn.redeemed[dayKey])
                throw new common_1.BadRequestException('该日尚未核销');
            delete plan.checkIn.redeemed[dayKey];
        }
        else {
            if (plan.checkIn.redeemed[dayKey])
                throw new common_1.BadRequestException('该日已核销');
            if (st !== 'BOOKED' && st !== 'COMPLETED')
                throw new common_1.BadRequestException('当前订单不可核销');
            plan.checkIn.redeemed[dayKey] = new Date().toISOString();
        }
        let anyRedeemed = false;
        for (let i = 0; i < plan.dayKeys.length; i++) {
            if (plan.checkIn.redeemed[plan.dayKeys[i]])
                anyRedeemed = true;
        }
        const now = new Date();
        if (!plan.tour || typeof plan.tour !== 'object')
            plan.tour = {};
        const tourFinished = plan.tour.earlyExit === true || plan.tour.status === 'completed' || plan.tour.status === 'early_exit';
        if (!undo) {
            // 日核销=入场闸机，保持 BOOKED，进入导览；不因日码齐全自动完结
            plan.tour.status = tourFinished ? plan.tour.status : 'entered';
            plan.tour.earlyExit = !!plan.tour.earlyExit;
            if (!plan.tour.enteredAt)
                plan.tour.enteredAt = now.toISOString();
        }
        else if (!anyRedeemed && !tourFinished) {
            plan.tour.status = '';
        }
        for (let i = 0; i < group.length; i++) {
            const data = { tripPlan: plan };
            if (!undo) {
                if (group[i].checkedInAt == null)
                    data.checkedInAt = now;
                if (String(group[i].status) === 'COMPLETED' && !tourFinished) {
                    data.status = client_1.BookingStatus.BOOKED;
                    data.completedAt = null;
                }
            }
            else if (!anyRedeemed && !tourFinished) {
                data.checkedInAt = null;
                if (String(group[i].status) === 'COMPLETED') {
                    data.status = client_1.BookingStatus.BOOKED;
                    data.completedAt = null;
                }
            }
            await this.prisma.studyBooking.update({ where: { id: group[i].id }, data });
        }
        await this.writeOpLog(actor, {
            module: 'booking',
            action: undo ? 'unredeem' : 'redeem',
            targetType: 'StudyBooking',
            targetId: id,
            targetLabel: (existed.project && existed.project.title) || '',
            summary: (undo ? '撤销核销 ' : '手动核销 ') + dayKey,
            projectId: existed.projectId || undefined,
            detail: { dayKey, undo, projectId: existed.projectId || '' },
        });
        const updated = await this.prisma.studyBooking.findUnique({
            where: { id },
            include: { user: true, project: true },
        });
        const updatedGroup = updated.bookingGroupId
            ? await this.prisma.studyBooking.findMany({
                where: { bookingGroupId: updated.bookingGroupId },
                include: { user: true, project: true },
                orderBy: [{ participantIndex: 'asc' }, { createdAt: 'asc' }],
            })
            : [updated];
        const packed = this.serializeConsoleBooking(updated, updatedGroup);
        packed.user = updated.user ? {
            id: updated.user.id,
            nickname: updated.user.nickname,
            phone: updated.user.phone,
            studyNo: updated.user.studyNo,
            realName: updated.user.realName,
        } : null;
        return packed;
    }
    async deleteBooking(id) {
        const existed = await this.prisma.studyBooking.findUnique({ where: { id } });
        if (!existed)
            throw new common_1.NotFoundException('Booking not found');
        const rawGroup = existed.bookingGroupId
            ? await this.prisma.studyBooking.findMany({ where: { bookingGroupId: existed.bookingGroupId } })
            : [existed];
        const group = rawGroup.length > 0 ? rawGroup : [existed];
        const isGroupBooker = (existed.bookerId ?? existed.userId) === existed.userId || existed.participantRole === 'BOOKER';
        const deletingGroup = isGroupBooker ? group : [existed];
        const bookingIds = deletingGroup.map((item) => item.id);
        const activeCount = deletingGroup.filter((item) => this.isActiveStudyBookingStatus(item.status) && this.isSeatStudyBooking(item)).length;
        await this.prisma.$transaction(async (tx) => {
            try {
                await tx.driverJob.deleteMany({ where: { bookingId: { in: bookingIds } } });
            }
            catch (_err) { }
            await tx.studyBooking.deleteMany({ where: { id: { in: bookingIds } } });
            if (activeCount > 0) {
                await tx.studyProject.updateMany({
                    where: { id: existed.projectId, enrolled: { gte: activeCount } },
                    data: { enrolled: { decrement: activeCount } },
                });
            }
        });
        return { id, deleted: true };
    }
    normalizeIdList(value) {
        const src = Array.isArray(value) ? value : [];
        const out = [];
        for (let i = 0; i < src.length; i++) {
            const id = String(src[i] || '').trim();
            if (id && out.indexOf(id) < 0)
                out.push(id);
        }
        return out;
    }
    async deleteBookings(ids, actor) {
        const list = this.normalizeIdList(ids);
        let deleted = 0;
        for (let i = 0; i < list.length; i++) {
            try {
                await this.deleteBooking(list[i]);
                deleted += 1;
            }
            catch (_err) { }
        }
        if (actor)
            await this.writeOpLog(actor, { module: 'study', action: 'delete', targetType: 'StudyBooking', targetId: '', targetLabel: '', summary: '批量删除预约 ' + deleted + ' 条', detail: { ids: list } });
        return { deleted };
    }
    async getBookingGroupsForAdmin(bookings) {
        const groupIds = [];
        for (let i = 0; i < bookings.length; i++) {
            const id = bookings[i].bookingGroupId ?? bookings[i].id;
            if (id && !groupIds.includes(id))
                groupIds.push(id);
        }
        if (groupIds.length === 0)
            return {};
        const rows = await this.prisma.studyBooking.findMany({
            where: { bookingGroupId: { in: groupIds } },
            include: { user: true, project: true },
            orderBy: [{ participantIndex: 'asc' }, { createdAt: 'asc' }],
        });
        const grouped = {};
        for (let i = 0; i < rows.length; i++) {
            const key = rows[i].bookingGroupId ?? rows[i].id;
            if (grouped[key] == null)
                grouped[key] = [];
            grouped[key].push(rows[i]);
        }
        return grouped;
    }
    serializeBooking(booking, group = [booking]) {
        const groupAmount = this.resolveBookingGroupAmount(booking, group);
        return {
            id: booking.id,
            bookingGroupId: booking.bookingGroupId ?? booking.id,
            bookerId: booking.bookerId ?? booking.userId,
            participantName: booking.participantName ?? booking.user.nickname,
            participantPhone: booking.participantPhone ?? booking.user.phone,
            participantIdCard: booking.participantIdCard,
            participantRole: booking.participantRole,
            participantIndex: booking.participantIndex,
            isBooker: (booking.bookerId ?? booking.userId) === booking.userId || booking.participantRole === 'BOOKER',
            participantCount: this.countSeatStudyBookings(group),
            status: booking.status,
            unlocksPuzzle: this.isActiveStudyBookingStatus(booking.status) && booking.project.status === '正在进行中',
            amount: booking.amount.toString(),
            groupAmount,
            paidAt: booking.paidAt,
            cancelledAt: booking.cancelledAt,
            completedAt: booking.completedAt,
            userDeletedAt: booking.userDeletedAt,
            createdAt: booking.createdAt,
            updatedAt: booking.updatedAt,
            tripPlan: booking.tripPlan || null,
            user: {
                id: booking.user.id,
                nickname: booking.user.nickname,
                phone: booking.user.phone,
                studyNo: booking.user.studyNo,
            },
            project: {
                id: booking.project.id,
                title: booking.project.title,
                status: booking.project.status,
            },
        };
    }
    resolveBookingGroupAmount(booking, group) {
        for (let i = 0; i < group.length; i++) {
            const item = group[i];
            const bookerId = item.bookerId ?? item.userId;
            if (bookerId === item.userId || item.participantRole === 'BOOKER')
                return item.amount.toString();
        }
        return booking.amount.toString();
    }
    async feedback(status) {
        const list = await this.prisma.feedback.findMany({
            where: status && status !== 'all' ? { status } : undefined,
            include: { user: true },
            orderBy: { createdAt: 'desc' },
            take: 200,
        });
        return list.map((item) => this.serializeFeedback(item));
    }
    async updateFeedback(id, body) {
        const existed = await this.prisma.feedback.findUnique({ where: { id } });
        if (!existed)
            throw new common_1.NotFoundException('Feedback not found');
        const updated = await this.prisma.feedback.update({
            where: { id },
            data: {
                status: body.status,
                reply: body.reply,
            },
            include: { user: true },
        });
        return this.serializeFeedback(updated);
    }
    async listInvoices(status, enterpriseId, scope, actor) {
        const where = {};
        if (status && status !== 'all')
            where.status = String(status).toUpperCase();
        const forced = this.enterpriseIdOf(actor);
        const qEid = forced || String(enterpriseId || '').trim();
        if (qEid) {
            where.issuerType = 'ENTERPRISE';
            where.enterpriseId = qEid;
        }
        else {
            // Platform ops: default PLATFORM (rental) only; scope=all for oversight
            const sc = String(scope || '').trim().toLowerCase();
            if (sc !== 'all')
                where.issuerType = 'PLATFORM';
        }
        const list = await this.prisma.invoiceRequest.findMany({
            where,
            include: {
                user: true,
                items: true,
            },
            orderBy: { createdAt: 'desc' },
            take: 200,
        });
        return list.map((item) => this.serializeInvoiceRequest(item));
    }
    async getInvoice(id, actor) {
        const item = await this.prisma.invoiceRequest.findUnique({
            where: { id },
            include: { user: true, items: true },
        });
        if (!item)
            throw new common_1.NotFoundException('发票申请不存在');
        this.assertInvoiceAccess(item, actor, false);
        return this.serializeInvoiceRequest(item);
    }
    assertInvoiceAccess(item, actor, forManage) {
        if (!actor)
            return;
        const forced = this.enterpriseIdOf(actor);
        const issuerType = String(item.issuerType || 'ENTERPRISE').toUpperCase();
        const eid = item.enterpriseId ? String(item.enterpriseId) : '';
        if (forced) {
            if (issuerType !== 'ENTERPRISE' || eid !== forced)
                throw new common_1.ForbiddenException('只能处理本企业的发票申请');
            return;
        }
        // platform actor
        if (forManage && issuerType !== 'PLATFORM')
            throw new common_1.ForbiddenException('平台账务仅可开具/驳回租车（平台）发票');
    }
    async updateInvoice(id, body, actor) {
        const existed = await this.prisma.invoiceRequest.findUnique({
            where: { id },
            include: { items: true, user: true },
        });
        if (!existed)
            throw new common_1.NotFoundException('发票申请不存在');
        this.assertInvoiceAccess(existed, actor, true);
        const status = String((body && body.status) || '').trim().toUpperCase();
        if (status !== 'ISSUED' && status !== 'REJECTED')
            throw new common_1.BadRequestException('状态仅支持 ISSUED 或 REJECTED');
        if (existed.status === 'ISSUED' && status === 'ISSUED')
            throw new common_1.BadRequestException('该申请已开具');
        const data = {
            status,
            adminRemark: body && body.adminRemark != null ? String(body.adminRemark) : existed.adminRemark,
        };
        let emailNotice = null;
        if (status === 'ISSUED') {
            const pdfUrl = body && body.pdfUrl != null ? String(body.pdfUrl).trim() : '';
            const invoiceNo = body && body.invoiceNo != null ? String(body.invoiceNo).trim() : '';
            if (!pdfUrl && !invoiceNo)
                throw new common_1.BadRequestException('开具时需填写 PDF 链接或发票号码');
            if (pdfUrl && !/^https?:\/\//i.test(pdfUrl))
                throw new common_1.BadRequestException('PDF 链接需以 http/https 开头');
            data.pdfUrl = pdfUrl || existed.pdfUrl || null;
            data.invoiceNo = invoiceNo || existed.invoiceNo || null;
            data.rejectReason = null;
            data.issuedAt = new Date();
            data.issuedById = actor && actor.actorId ? String(actor.actorId) : null;
            data.taxProvider = 'manual';
        }
        else {
            const reason = body && body.rejectReason != null ? String(body.rejectReason).trim() : '';
            if (!reason)
                throw new common_1.BadRequestException('驳回时需填写原因');
            data.rejectReason = reason;
            data.pdfUrl = null;
            data.invoiceNo = null;
            data.issuedAt = null;
            data.issuedById = null;
        }
        const updated = await this.prisma.invoiceRequest.update({
            where: { id },
            data,
            include: { user: true, items: true },
        });
        if (status === 'ISSUED') {
            try {
                const invoicesSvc = this.invoicesService;
                if (invoicesSvc && typeof invoicesSvc.notifyInvoiceEmail === 'function') {
                    emailNotice = await invoicesSvc.notifyInvoiceEmail(updated);
                }
                else {
                    // inline fallback if InvoicesService not injected
                    const smtpHost = process.env.SMTP_HOST || process.env.INVOICE_SMTP_HOST || '';
                    if (!smtpHost) {
                        await this.prisma.invoiceRequest.update({
                            where: { id },
                            data: { emailStatus: 'skipped' },
                        });
                        emailNotice = { status: 'skipped', message: '邮件：已跳过（未配置）' };
                    }
                    else {
                        await this.prisma.invoiceRequest.update({
                            where: { id },
                            data: { emailStatus: 'pending' },
                        });
                        emailNotice = { status: 'pending', message: '邮件：已排队' };
                    }
                }
            }
            catch (e) {
                console.log('[invoice-email] notify failed (non-blocking)', e && e.message);
                emailNotice = { status: 'skipped', message: '邮件：已跳过（未配置）' };
            }
        }
        if (actor) {
            await this.writeOpLog(actor, {
                module: 'finance',
                action: status === 'ISSUED' ? 'issue' : 'reject',
                targetType: 'InvoiceRequest',
                targetId: id,
                targetLabel: updated.titleName,
                summary: status === 'ISSUED' ? '开具电子发票' : '驳回电子发票',
                detail: { status, pdfUrl: updated.pdfUrl, invoiceNo: updated.invoiceNo, rejectReason: updated.rejectReason, emailNotice },
            });
        }
        const serialized = this.serializeInvoiceRequest(updated);
        if (emailNotice)
            serialized.emailNotice = emailNotice.message || emailNotice.status;
        return serialized;
    }
    async autoIssueInvoice(id, actor) {
        const existed = await this.prisma.invoiceRequest.findUnique({
            where: { id },
            include: { items: true, user: true },
        });
        if (!existed)
            throw new common_1.NotFoundException('发票申请不存在');
        this.assertInvoiceAccess(existed, actor, true);
        if (String(existed.status).toUpperCase() === 'ISSUED')
            throw new common_1.BadRequestException('该申请已开具');
        let result;
        try {
            if (this.invoicesService && typeof this.invoicesService.autoIssueViaProvider === 'function') {
                result = await this.invoicesService.autoIssueViaProvider(existed);
            }
            else {
                const { getTaxInvoiceProvider } = require('../invoices/tax-invoice.provider');
                result = await getTaxInvoiceProvider().issue(existed);
            }
        }
        catch (err) {
            const status = (err && err.status) || 501;
            throw new common_1.HttpException((err && err.message) || '自动开具失败', status);
        }
        if (result && result.code === 'MANUAL_ONLY') {
            throw new common_1.BadRequestException(result.message || '请使用人工开具');
        }
        return result;
    }
    serializeInvoiceRequest(item) {
        return {
            id: item.id,
            userId: item.userId,
            status: item.status,
            titleType: item.titleType,
            titleName: item.titleName,
            taxNo: item.taxNo,
            email: item.email,
            phone: item.phone,
            amount: item.amount != null ? item.amount.toString() : '0',
            pdfUrl: item.pdfUrl || null,
            invoiceNo: item.invoiceNo || null,
            rejectReason: item.rejectReason || null,
            adminRemark: item.adminRemark || null,
            issuedAt: item.issuedAt || null,
            issuedById: item.issuedById || null,
            issuerType: item.issuerType || 'ENTERPRISE',
            enterpriseId: item.enterpriseId || null,
            enterpriseName: item.enterpriseName || null,
            emailSentAt: item.emailSentAt || null,
            emailStatus: item.emailStatus || null,
            taxProvider: item.taxProvider || null,
            taxRemoteId: item.taxRemoteId || null,
            createdAt: item.createdAt,
            updatedAt: item.updatedAt,
            itemCount: Array.isArray(item.items) ? item.items.length : 0,
            items: Array.isArray(item.items)
                ? item.items.map((it) => ({
                    id: it.id,
                    sourceType: it.sourceType,
                    sourceId: it.sourceId,
                    sourceNo: it.sourceNo,
                    title: it.title,
                    amount: it.amount != null ? it.amount.toString() : '0',
                }))
                : [],
            user: item.user
                ? {
                    id: item.user.id,
                    nickname: item.user.nickname,
                    phone: item.user.phone,
                    studyNo: item.user.studyNo,
                }
                : null,
        };
    }
    serializeProduct(product) {
        return {
            ...product,
            price: product.price.toString(),
            pointsDeductible: product.pointsDeductible ?? true,
            maxPointsDiscount: product.maxPointsDiscount != null ? product.maxPointsDiscount.toString() : '',
        };
    }
    serializeOrder(order) {
        return {
            id: order.id,
            orderNo: order.orderNo,
            status: order.status,
            goodsAmount: (order.goodsAmount ?? order.amount).toString(),
            amount: order.amount.toString(),
            points: order.points,
            pointsUsed: order.pointsUsed ?? 0,
            pointsDiscount: (order.pointsDiscount ?? 0).toString(),
            address: {
                id: order.addressId ?? '',
                receiver: order.receiver ?? '',
                phone: order.receiverPhone ?? '',
                province: order.province ?? '',
                city: order.city ?? '',
                district: order.district ?? '',
                detail: order.addressDetail ?? '',
            },
            remark: order.remark ?? '',
            adminRemark: order.adminRemark ?? '',
            shippingCompany: order.shippingCompany ?? '',
            trackingNo: order.trackingNo ?? '',
            shippedAt: order.shippedAt,
            paidAt: order.paidAt,
            completedAt: order.completedAt,
            cancelledAt: order.cancelledAt,
            pointsRefundedAt: order.pointsRefundedAt,
            userDeletedAt: order.userDeletedAt,
            createdAt: order.createdAt,
            updatedAt: order.updatedAt,
            user: {
                id: order.user.id,
                nickname: order.user.nickname,
                phone: order.user.phone,
                studyNo: order.user.studyNo,
            },
            items: order.items.map((item) => ({
                id: item.id,
                quantity: item.quantity,
                price: item.price.toString(),
                product: {
                    id: item.product.id,
                    name: item.product.name,
                    sku: item.product.sku,
                },
            })),
        };
    }
    serializeNoticeRow(row) {
        const projectId = row.projectId ?? row.project_id ?? '';
        const projectTitle = row.project_title ?? (row.project && row.project.title) ?? '';
        const projectStatus = row.project_status ?? (row.project && row.project.status) ?? '';
        const enterpriseId = row.enterpriseId ?? row.resolvedEnterpriseId ?? row.project_enterpriseId ?? '';
        const status = String(row.status || 'published');
        const sourceLabel = projectId ? '项目' : '企业';
        return {
            id: row.id,
            projectId: projectId ? String(projectId) : '',
            enterpriseId: enterpriseId ? String(enterpriseId) : '',
            title: row.title,
            content: row.content,
            type: row.type,
            category: String((row.category != null && String(row.category).trim()) ? row.category : (row.type || '')),
            publisher: row.publisher,
            publisherUnitType: String(row.publisherUnitType || (projectId ? 'project' : (enterpriseId ? 'enterprise' : '')) || ''),
            publisherUnitId: String(row.publisherUnitId || projectId || enterpriseId || ''),
            paragraphs: row.paragraphs || [],
            publishedAt: row.publishedAt,
            status,
            reviewNote: row.reviewNote ? String(row.reviewNote) : '',
            reviewedAt: row.reviewedAt || null,
            kind: (String(row.kind || '').trim() === 'dynamics' ? 'dynamics' : 'news'),
            contentType: 'notice',
            sourceLabel,
            authorName: row.publisher ? String(row.publisher) : sourceLabel,
            project: projectId
                ? { id: String(row.project_id || projectId), title: String(projectTitle || ''), status: String(projectStatus || '') }
                : null,
            projectTitle: projectTitle ? String(projectTitle) : '',
            projectName: projectTitle ? String(projectTitle) : '',
            enterpriseName: String(row.enterprise_name || row.enterpriseName || ''),
            scope: projectId ? 'project' : 'enterprise',
        };
    }
    serializeNotice(notice) {
        if (notice && (notice.project_title != null || notice.project_id != null || notice.resolvedEnterpriseId != null))
            return this.serializeNoticeRow(notice);
        return {
            id: notice.id,
            projectId: notice.projectId ?? '',
            enterpriseId: notice.enterpriseId ?? (notice.project && notice.project.enterpriseId) ?? '',
            title: notice.title,
            content: notice.content,
            type: notice.type,
            publisher: notice.publisher,
            paragraphs: notice.paragraphs,
            publishedAt: notice.publishedAt,
            project: notice.project
                ? {
                    id: notice.project.id,
                    title: notice.project.title,
                    status: notice.project.status,
                }
                : null,
            projectTitle: notice.project?.title ?? '',
            scope: notice.projectId ? 'project' : 'enterprise',
            kind: (String(notice.kind || '').trim() === 'dynamics' ? 'dynamics' : (notice.projectId ? 'dynamics' : 'news')),
            contentType: 'notice',
        };
    }
    serializeFloatingNotice(notice) {
        return {
            id: notice.id,
            projectId: notice.projectId ?? '',
            title: notice.title,
            subtitle: notice.subtitle,
            showSubtitle: notice.showSubtitle ?? true,
            tag: notice.tag,
            content: notice.content ?? '',
            imageUrl: notice.imageUrl ?? '',
            actionText: notice.actionText,
            actionType: notice.actionType,
            actionTarget: notice.actionTarget ?? '',
            gradientStart: notice.gradientStart ?? '',
            gradientEnd: notice.gradientEnd ?? '',
            titleFontSize: notice.titleFontSize ?? '',
            titleColor: notice.titleColor ?? '',
            contentFontSize: notice.contentFontSize ?? '',
            contentColor: notice.contentColor ?? '',
            sortOrder: notice.sortOrder,
            enabled: notice.enabled,
            createdAt: notice.createdAt,
            updatedAt: notice.updatedAt,
            project: notice.project
                ? {
                    id: notice.project.id,
                    title: notice.project.title,
                    status: notice.project.status,
                    gradientStart: notice.project.gradientStart,
                    gradientEnd: notice.project.gradientEnd,
                }
                : null,
            projectTitle: notice.project?.title ?? '',
        };
    }
    durationTextOf(min) {
        const n = Math.max(1, Number(min) || 20);
        if (n < 60)
            return '约 ' + n + ' 分钟';
        const h = Math.floor(n / 60);
        const r = n - h * 60;
        if (r === 0)
            return '约 ' + h + ' 小时';
        return '约 ' + h + ' 小时 ' + r + ' 分';
    }
    parseRouteContentPack(point) {
        const raw = point && point.knowledgeItems;
        let pack = {};
        if (raw && typeof raw === 'object' && !Array.isArray(raw))
            pack = raw;
        else if (Array.isArray(raw) && raw.length === 1 && raw[0] && typeof raw[0] === 'object' && !Array.isArray(raw[0]))
            pack = raw[0];
        const lines = (value) => {
            if (Array.isArray(value))
                return value.map((item) => String(item ?? '').trim()).filter((item) => item.length > 0);
            if (typeof value === 'string')
                return value.split(/\r?\n/).map((item) => item.trim()).filter((item) => item.length > 0);
            return [];
        };
        const durationMin = Math.max(1, Number(pack.durationMin || 20) || 20);
        const coverUrl = String(pack.coverUrl || '').trim();
        const coverStyle = coverUrl
            ? ('background-image:url(' + coverUrl + ');background-size:cover;background-position:center;')
            : String(pack.coverStyle || 'background-image: linear-gradient(145deg, #0F3F3A 0%, #1F8A70 100%);');
        const intro = String(pack.intro || (point && point.description) || '').trim();
        const guideLines = lines(pack.guideLines);
        const gameLines = lines(pack.gameLines);
        const gifts = lines(pack.gifts);
        const audience = String(pack.audience || '').trim();
        return {
            zoneKey: String(pack.zoneKey || 'test').trim() || 'test',
            zoneLabel: String(pack.zoneLabel || '').trim(),
            durationMin,
            durationText: this.durationTextOf(durationMin),
            intro,
            guideLines,
            gameLines,
            gifts,
            audience,
            sections: this.normalizeRouteSections(pack, { intro, guideLines, gameLines, gifts, audience, description: point && point.description }),
            photoCaption: String(pack.photoCaption || (point && point.title) || '').trim(),
            coverIcon: String(pack.coverIcon || '/static/icon-building.svg').trim() || '/static/icon-building.svg',
            coverStyle,
            coverUrl,
            offlineTaskEnabled: pack.offlineTaskEnabled !== false,
            offlineTaskTitle: String(pack.offlineTaskTitle || '现场趣味任务').trim() || '现场趣味任务',
            offlineTaskBody: String(pack.offlineTaskBody || '按现场工作人员指引完成互动（观察、动手、合影或小游戏）。完成后请扫描本站研学码（点位码）确认本项任务完成。').trim(),
            knowledgeVideoUrl: String(pack.knowledgeVideoUrl || (point && point.knowledgeVideoUrl) || '').trim(),
            knowledgeVideoTitle: String(pack.knowledgeVideoTitle || (point && point.knowledgeVideoTitle) || '').trim(),
            checkInNonce: String(pack.checkInNonce || '').trim(),
            stationSteps: this.normalizeStationSteps(pack.stationSteps),
            stationReward: pack.stationReward && typeof pack.stationReward === 'object' ? pack.stationReward : { enabled: false, maxCoupons: 1, expireDays: 30, tiers: [] },
        };
    }
    escapeRouteHtml(s) {
        return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }
    isRouteHtml(s) {
        const t = String(s || '').trim();
        if (t.indexOf('<p') >= 0 || t.indexOf('<div') >= 0 || t.indexOf('<ul') >= 0) return true;
        if (t.indexOf('<img') >= 0 || t.indexOf('<strong') >= 0 || t.indexOf('<span') >= 0) return true;
        return false;
    }
    wrapRoutePlain(s) {
        const t = String(s || '').trim();
        if (!t) return '<p></p>';
        if (this.isRouteHtml(t)) return t;
        return '<p>' + this.escapeRouteHtml(t).replace(/\n/g, '<br>') + '</p>';
    }
    wrapRouteLines(lines) {
        const list = Array.isArray(lines) ? lines : [];
        if (!list.length) return '<p></p>';
        return '<ul>' + list.map((item) => '<li>' + this.escapeRouteHtml(item) + '</li>').join('') + '</ul>';
    }
    routeSectionDefs() {
        return [
            { key: 'intro', title: '区域介绍' },
            { key: 'guide', title: '讲解内容' },
            { key: 'game', title: '互动游戏' },
            { key: 'gift', title: '研学礼品' },
            { key: 'audience', title: '适合人群' },
        ];
    }
    headingStartInHtml(html, title) {
        const needle = '>' + title + '<';
        const i = html.indexOf(needle);
        if (i < 0) return -1;
        let start = i;
        while (start > 0 && html.charAt(start) !== '<') start--;
        if (start > 0) {
            let p = start - 1;
            while (p > 0 && html.charAt(p) !== '<') p--;
            if (html.slice(p, p + 2).toLowerCase() === '<p') start = p;
        }
        return start;
    }
    headingEndInHtml(html, start, title) {
        const i = html.indexOf(title, start);
        if (i < 0) return start;
        const from = i + title.length;
        const strongEnd = html.indexOf('</strong>', from);
        const bEnd = html.indexOf('</b>', from);
        let inner = from;
        if (strongEnd >= 0 && (bEnd < 0 || strongEnd <= bEnd)) inner = strongEnd + 9;
        else if (bEnd >= 0) inner = bEnd + 4;
        const pEnd = html.indexOf('</p>', inner);
        if (pEnd >= 0 && pEnd - inner <= 10) return pEnd + 4;
        return inner;
    }
    splitRouteHtml(html) {
        const t = String(html || '');
        const defs = this.routeSectionDefs();
        const found = [];
        for (let i = 0; i < defs.length; i++) {
            const s = this.headingStartInHtml(t, defs[i].title);
            if (s < 0) continue;
            found.push({ key: defs[i].key, title: defs[i].title, start: s, end: this.headingEndInHtml(t, s, defs[i].title) });
        }
        if (!found.length) return [];
        found.sort((a, b) => a.start - b.start);
        const out = [];
        if (found[0].start > 0) {
            const before = t.slice(0, found[0].start).trim();
            if (before && found[0].key !== 'intro') out.push({ key: 'intro', title: '区域介绍', html: before });
        }
        for (let i = 0; i < found.length; i++) {
            const bodyEnd = i + 1 < found.length ? found[i + 1].start : t.length;
            out.push({ key: found[i].key, title: found[i].title, html: t.slice(found[i].end, bodyEnd).trim() || '<p></p>' });
        }
        return out;
    }
    padRouteSections(list, pack, bits) {
        const defs = this.routeSectionDefs();
        const rows = Array.isArray(list) ? list : [];
        const has = rows.length > 0;
        const fallback = {
            intro: has ? '<p></p>' : this.wrapRoutePlain((bits && (bits.intro || bits.description)) || ''),
            guide: this.wrapRouteLines((bits && bits.guideLines) || []),
            game: this.wrapRouteLines((bits && bits.gameLines) || []),
            gift: this.wrapRouteLines((bits && bits.gifts) || []),
            audience: this.wrapRoutePlain((bits && bits.audience) || ''),
        };
        const byKey = {};
        const extras = [];
        for (let i = 0; i < rows.length; i++) {
            const item = rows[i];
            if (defs.some((d) => d.key === item.key)) byKey[item.key] = item;
            else extras.push(item);
        }
        return defs.map((d) => byKey[d.key] || {
            key: d.key,
            title: String((pack && pack[d.key + 'Title']) || d.title),
            html: fallback[d.key] || '<p></p>',
        }).concat(extras);
    }
    normalizeRouteSections(pack, bits) {
        const src = pack && Array.isArray(pack.sections) ? pack.sections : [];
        let list = src.map((item, i) => ({
            key: String((item && item.key) || ('sec' + i)),
            title: String((item && item.title) || '').trim() || ('段落' + (i + 1)),
            html: String((item && (item.html || item.body)) || '').trim() || '<p></p>',
        }));
        if (list.length <= 1) {
            const html = (list[0] && list[0].html) || (bits && (bits.intro || bits.description)) || '';
            const split = this.splitRouteHtml(html);
            if (split.length) list = split;
        }
        return this.padRouteSections(list, pack, bits);
    }
    normalizeRouteSectionsInput(value, fallback) {
        if (!Array.isArray(value))
            return fallback || [];
        return value.map((item, i) => ({
            key: String((item && item.key) || ('sec' + i)),
            title: String((item && item.title) || '').trim() || ('段落' + (i + 1)),
            html: String((item && (item.html || item.body)) || '').trim() || '<p></p>',
        }));
    }
    buildRouteContentPack(body, existed) {
        const prev = this.parseRouteContentPack(existed || {});
        const lines = (value, fallback) => {
            if (value == null)
                return fallback;
            if (Array.isArray(value))
                return value.map((item) => String(item ?? '').trim()).filter((item) => item.length > 0);
            return String(value).split(/\r?\n|,|，/).map((item) => item.trim()).filter((item) => item.length > 0);
        };
        const durationMin = body && body.durationMin != null ? Math.max(1, Number(body.durationMin) || prev.durationMin) : prev.durationMin;
        const coverUrl = body && body.coverUrl != null ? String(body.coverUrl || '').trim() : prev.coverUrl;
        const sections = this.normalizeRouteSectionsInput(body && body.sections, prev.sections);
        let intro = body && body.intro != null ? String(body.intro).trim() : prev.intro;
        if (body && Array.isArray(body.sections) && sections.length) {
            const introSec = sections.find((item) => item.key === 'intro') || sections[0];
            if (introSec) intro = introSec.html;
        }
        return {
            zoneKey: body && body.zoneKey != null ? (String(body.zoneKey).trim() || 'test') : prev.zoneKey,
            zoneLabel: body && body.zoneLabel != null ? String(body.zoneLabel).trim() : prev.zoneLabel,
            durationMin,
            intro,
            guideLines: lines(body && (body.guideLines != null ? body.guideLines : body.guideText), prev.guideLines),
            gameLines: lines(body && (body.gameLines != null ? body.gameLines : body.gameText), prev.gameLines),
            gifts: lines(body && (body.gifts != null ? body.gifts : body.giftText), prev.gifts),
            audience: body && body.audience != null ? String(body.audience).trim() : prev.audience,
            sections,
            photoCaption: body && body.photoCaption != null ? String(body.photoCaption).trim() : prev.photoCaption,
            coverIcon: body && body.coverIcon != null ? String(body.coverIcon).trim() : prev.coverIcon,
            coverStyle: body && body.coverStyle != null ? String(body.coverStyle).trim() : prev.coverStyle,
            coverUrl,
            offlineTaskEnabled: body && body.offlineTaskEnabled != null ? this.mapBoolean(body.offlineTaskEnabled, true) : (prev.offlineTaskEnabled !== false),
            offlineTaskTitle: body && body.offlineTaskTitle != null ? (String(body.offlineTaskTitle).trim() || '现场趣味任务') : (prev.offlineTaskTitle || '现场趣味任务'),
            offlineTaskBody: body && body.offlineTaskBody != null ? String(body.offlineTaskBody).trim() : (prev.offlineTaskBody || '按现场工作人员指引完成互动（观察、动手、合影或小游戏）。完成后请扫描本站研学码（点位码）确认本项任务完成。'),
            knowledgeVideoUrl: body && body.knowledgeVideoUrl != null ? String(body.knowledgeVideoUrl || '').trim() : (prev.knowledgeVideoUrl || ''),
            knowledgeVideoTitle: body && body.knowledgeVideoTitle != null ? String(body.knowledgeVideoTitle || '').trim() : (prev.knowledgeVideoTitle || ''),
            checkInNonce: body && body.checkInNonce != null ? String(body.checkInNonce || '').trim() : (prev.checkInNonce || ''),
            stationSteps: body && body.stationSteps != null ? this.normalizeStationSteps(body.stationSteps) : (prev.stationSteps || []),
            stationReward: body && body.stationReward != null ? body.stationReward : (prev.stationReward || { enabled: false, maxCoupons: 1, expireDays: 30, tiers: [] }),
        };
    }
    async routeZoneDict() {
        try {
            const row = await this.prisma.platformSetting.findUnique({ where: { key: 'platform.dicts' } });
            const zones = row && row.value && Array.isArray(row.value.routeZones) ? row.value.routeZones : [];
            const out = [];
            for (let i = 0; i < zones.length; i++) {
                const key = String(zones[i].key || '').trim();
                const label = String(zones[i].label || key).trim();
                if (!key)
                    continue;
                out.push({ key, label: label || key });
            }
            if (out.length)
                return out;
        }
        catch (_err) { }
        return [{ key: 'test', label: '测试分类' }];
    }
    zoneLabelOf(zoneKey, dict, snapshot) {
        if (snapshot)
            return snapshot;
        const key = String(zoneKey || '').trim();
        for (let i = 0; dict && i < dict.length; i++) {
            if (dict[i].key === key)
                return dict[i].label;
        }
        return key || '测试分类';
    }
    serializeRoutePoint(point, zoneDict) {
        const pack = this.parseRouteContentPack(point);
        const zoneKey = pack.zoneKey;
        const zoneLabel = this.zoneLabelOf(zoneKey, zoneDict, pack.zoneLabel);
        return {
            id: point.id,
            projectId: point.projectId,
            title: point.title,
            description: point.description,
            desc: point.description,
            latitude: Number(point.latitude),
            longitude: Number(point.longitude),
            checkRadius: point.checkRadius,
            checkInMode: this.mapRoutePointCheckInMode(point.checkInMode),
            sortOrder: point.sortOrder,
            enabled: point.enabled,
            zoneKey,
            zoneLabel,
            durationMin: pack.durationMin,
            durationText: pack.durationText,
            intro: pack.intro,
            guideLines: pack.guideLines,
            gameLines: pack.gameLines,
            gifts: pack.gifts,
            audience: pack.audience,
            sections: pack.sections || [],
            photoCaption: pack.photoCaption,
            coverIcon: pack.coverIcon,
            coverStyle: pack.coverStyle,
            coverUrl: pack.coverUrl,
            knowledgeEnabled: point.knowledgeEnabled === true,
            knowledgeVideoTitle: String(point.knowledgeVideoTitle || pack.knowledgeVideoTitle || '').trim(),
            knowledgeVideoUrl: String(point.knowledgeVideoUrl || pack.knowledgeVideoUrl || '').trim(),
            knowledgeQuestions: Array.isArray(point.knowledgeQuestions) ? point.knowledgeQuestions : [],
            stationSteps: pack.stationSteps || [],
            stationReward: pack.stationReward || { enabled: false, maxCoupons: 1, expireDays: 30, tiers: [] },
            offlineTaskEnabled: pack.offlineTaskEnabled !== false,
            offlineTaskTitle: pack.offlineTaskTitle || '现场趣味任务',
            offlineTaskBody: pack.offlineTaskBody || '按现场工作人员指引完成互动（观察、动手、合影或小游戏）。完成后请扫描本站研学码（点位码）确认本项任务完成。',
            createdAt: point.createdAt,
            updatedAt: point.updatedAt,
        };
    }
    serializeDepartureSettings(project) {
        const mode = this.mapDepartureMode(project.departureMode);
        return {
            mode,
            modeText: mode === STUDY_DEPARTURE_MODES.VEHICLE ? '车辆' : '步行',
            departurePoint: {
                title: project.departureTitle ?? '',
                latitude: project.departureLatitude != null ? Number(project.departureLatitude) : null,
                longitude: project.departureLongitude != null ? Number(project.departureLongitude) : null,
            },
            dropoffPoint: {
                title: project.dropoffTitle ?? '',
                latitude: project.dropoffLatitude != null ? Number(project.dropoffLatitude) : null,
                longitude: project.dropoffLongitude != null ? Number(project.dropoffLongitude) : null,
            },
            vehicle: {
                plateNo: project.vehiclePlateNo ?? '',
                driverName: project.driverName ?? '',
                driverPhone: project.driverPhone ?? '',
            },
        };
    }
    resolveProjectLiveStage(project) {
        if (project.status === '已结束')
            return STUDY_LIVE_STAGES.ENDED;
        const raw = String(project.liveStage ?? '').trim();
        if (raw === STUDY_LIVE_STAGES.READY ||
            raw === STUDY_LIVE_STAGES.DEPARTING ||
            raw === STUDY_LIVE_STAGES.STUDY_ACTIVE ||
            raw === STUDY_LIVE_STAGES.ENDED) {
            return raw;
        }
        if (project.status === '正在进行中')
            return STUDY_LIVE_STAGES.STUDY_ACTIVE;
        if (project.startTime instanceof Date && project.startTime.getTime() <= Date.now())
            return STUDY_LIVE_STAGES.WAITING_ADMIN_START;
        return STUDY_LIVE_STAGES.NOT_STARTED;
    }
    liveStageText(stage) {
        if (stage === STUDY_LIVE_STAGES.WAITING_ADMIN_START)
            return '等待管理员开始';
        if (stage === STUDY_LIVE_STAGES.READY)
            return '已准备开始';
        if (stage === STUDY_LIVE_STAGES.DEPARTING)
            return '前往研学基地中';
        if (stage === STUDY_LIVE_STAGES.STUDY_ACTIVE)
            return '研学进行中';
        if (stage === STUDY_LIVE_STAGES.ENDED)
            return '已结束';
        return '未开始';
    }
    normalizeStudyProjectDocumentSections(value) {
        if (!Array.isArray(value))
            return [];
        return value
            .map((section) => {
            const heading = String(section?.heading ?? '').trim();
            const paragraphs = Array.isArray(section?.paragraphs)
                ? section.paragraphs.map((item) => String(item ?? '').trim()).filter((item) => item.length > 0)
                : [];
            const bullets = Array.isArray(section?.bullets)
                ? section.bullets.map((item) => String(item ?? '').trim()).filter((item) => item.length > 0)
                : [];
            return { heading, paragraphs, bullets };
        })
            .filter((section) => section.heading.length > 0 || section.paragraphs.length > 0 || section.bullets.length > 0);
    }
    normalizeStudyProjectDocuments(value) {
        const rawItems = Array.isArray(value) ? value : this.parseStudyProjectDocumentLines(String(value ?? ''));
        const documents = [];
        for (let i = 0; i < rawItems.length; i++) {
            const raw = rawItems[i];
            const title = String(raw?.title ?? '').trim();
            const size = String(raw?.size ?? '').trim();
            const url = String(raw?.url ?? '').trim();
            const subtitle = String(raw?.subtitle ?? '').trim();
            const updatedAt = String(raw?.updatedAt ?? '').trim();
            const sections = this.normalizeStudyProjectDocumentSections(raw?.sections);
            if (!title && !size && !url && !subtitle && !updatedAt && sections.length === 0)
                continue;
            if (!title)
                throw new common_1.BadRequestException('Document title is required');
            documents.push({ title, size, url, subtitle, updatedAt, managed: true, sections });
        }
        return documents;
    }
    parseStudyProjectDocumentLines(text) {
        return text
            .split(/\r?\n/)
            .map((line) => line.trim())
            .filter(Boolean)
            .map((line) => {
            const parts = line.split('|').map((part) => part.trim());
            return {
                title: parts[0] ?? '',
                size: parts[1] ?? '',
                url: parts[2] ?? '',
            };
        });
    }
    serializeFeedback(item) {
        return {
            id: item.id,
            type: item.type,
            content: item.content,
            tags: item.tags,
            contactPhone: item.contactPhone,
            contactEmail: item.contactEmail,
            status: item.status,
            reply: item.reply,
            createdAt: item.createdAt,
            updatedAt: item.updatedAt,
            user: item.user
                ? {
                    id: item.user.id,
                    nickname: item.user.nickname,
                    phone: item.user.phone,
                    studyNo: item.user.studyNo,
                }
                : null,
        };
    }
    mapBoolean(value, defaultValue) {
        if (value == null || value === '')
            return defaultValue;
        if (typeof value === 'boolean')
            return value;
        const normalized = String(value).trim().toLowerCase();
        return normalized === 'true' || normalized === '1' || normalized === 'yes' || normalized === 'on';
    }
    readAdminKnowledgeQuestions(value) {
        if (value == null)
            return [];
        let raw = value;
        if (typeof raw === 'string') {
            const text = raw.trim();
            if (!text)
                return [];
            try {
                raw = JSON.parse(text);
            }
            catch (_err) {
                throw new common_1.BadRequestException('趣味答题题目格式不正确');
            }
        }
        if (!Array.isArray(raw))
            throw new common_1.BadRequestException('趣味答题题目格式不正确');
        if (raw.length > 20)
            throw new common_1.BadRequestException('趣味答题不能超过20道');
        const questions = [];
        for (let i = 0; i < raw.length; i++) {
            const item = raw[i];
            if (item == null || typeof item !== 'object')
                continue;
            const question = String(item.question ?? item.title ?? item.text ?? '').trim();
            const options = Array.isArray(item.options)
                ? item.options.map((opt) => String(opt ?? '').trim()).filter((opt) => opt.length > 0)
                : [];
            if (!question || options.length < 2)
                continue;
            if (question.length > 160)
                throw new common_1.BadRequestException('第' + (i + 1).toString() + '题题目不能超过160个字');
            const multiSelect = item.multiSelect === true || item.multi === true;
            let answerIndexes = [];
            if (Array.isArray(item.answerIndexes) && item.answerIndexes.length) {
                answerIndexes = item.answerIndexes.map((n) => Number(n)).filter((n) => Number.isInteger(n) && n >= 0 && n < options.length);
            } else {
                let answerIndex = Number(item.answerIndex ?? item.correctIndex ?? 0);
                if (!Number.isInteger(answerIndex) || answerIndex < 0 || answerIndex >= options.length)
                    answerIndex = 0;
                answerIndexes = [answerIndex];
            }
            if (!answerIndexes.length)
                answerIndexes = [0];
            if (!multiSelect)
                answerIndexes = [answerIndexes[0]];
            let partialMode = String(item.partialMode || item.partialScoreMode || 'none').trim();
            if (partialMode === 'half')
                partialMode = 'fixed';
            if (['none', 'ratio', 'fixed'].indexOf(partialMode) < 0)
                partialMode = 'none';
            const row = {
                question,
                options,
                multiSelect,
                answerIndexes,
                answerIndex: answerIndexes[0],
                partialMode,
            };
            if (item.id != null && String(item.id).trim())
                row.id = String(item.id).trim();
            if (item.halfScore != null && Number.isFinite(Number(item.halfScore)) && Number(item.halfScore) >= 0)
                row.halfScore = Math.min(999, Math.round(Number(item.halfScore)));
            if (item.points != null && Number.isFinite(Number(item.points)) && Number(item.points) >= 0)
                row.points = Math.min(999, Math.round(Number(item.points)));
            questions.push(row);
        }
        return questions;
    }
    readMaxRetries(value) {
        if (value == null || value === '')
            return null;
        const n = Number(value);
        if (!Number.isFinite(n) || n <= 0)
            return null;
        return Math.min(99, Math.round(n));
    }
    normalizeScoreTiers(raw) {
        const src = Array.isArray(raw) ? raw : [];
        const out = [];
        for (let i = 0; i < src.length && out.length < 12; i++) {
            const t = src[i];
            if (!t || typeof t !== 'object')
                continue;
            let minScore = Number(t.minScore);
            if (!Number.isFinite(minScore) || minScore < 0)
                minScore = 0;
            let points = Number(t.points);
            if (!Number.isFinite(points) || points < 0)
                points = 0;
            const title = String(t.title || '').trim();
            const row = { minScore: Math.round(minScore), points: Math.min(999, Math.round(points)) };
            if (title)
                row.title = title.slice(0, 40);
            out.push(row);
        }
        out.sort((a, b) => a.minScore - b.minScore);
        return out;
    }
    normalizeStationSteps(value) {
        const types = { video: true, quiz: true, task: true, game: true };
        let raw = value;
        if (typeof raw === 'string') {
            try { raw = JSON.parse(raw); } catch (_err) { raw = []; }
        }
        const out = [];
        if (!Array.isArray(raw))
            return out;
        for (let i = 0; i < raw.length && out.length < 20; i++) {
            const item = raw[i];
            if (item == null || typeof item !== 'object')
                continue;
            const type = String(item.type || '').trim();
            if (!types[type])
                continue;
            const titleDefault = type === 'video' ? '讲解视频' : (type === 'quiz' ? '趣味答题' : (type === 'game' ? '研学小游戏' : '现场任务'));
            const step = {
                id: String(item.id || ('s' + Date.now().toString(36) + i)).trim() || ('s' + i),
                type,
                title: String(item.title || '').trim() || titleDefault,
                resourceId: String(item.resourceId || '').trim(),
                videoUrl: '',
                questions: [],
                taskBody: '',
                gameUrl: '',
                gameName: '',
                passScore: null,
                skippable: item.skippable === false ? false : true,
                points: Number(item.points) > 0 ? Math.round(Number(item.points)) : 0,
                maxRetries: this.readMaxRetries(item.maxRetries),
                scoreTiers: this.normalizeScoreTiers(item.scoreTiers || item.scorePointTiers),
            };
            if (type === 'video')
                step.videoUrl = String(item.videoUrl || '').trim();
            if (type === 'quiz')
                step.questions = this.readAdminKnowledgeQuestions(item.questions);
            if (type === 'task')
                step.taskBody = String(item.taskBody || item.body || '').trim();
            if (type === 'game') {
                step.gameUrl = String(item.gameUrl || '').trim();
                step.gameName = String(item.gameName || step.title).trim();
                if (item.passScore == null || item.passScore === '')
                    step.passScore = null;
                else {
                    const passScore = Number(item.passScore);
                    step.passScore = Number.isFinite(passScore) ? passScore : null;
                }
            }
            step.skippable = item.skippable === false ? false : true;
            const pts = Number(item.points);
            step.points = Number.isFinite(pts) && pts > 0 ? Math.min(999, Math.round(pts)) : 0;
            out.push(step);
        }
        return out;
    }
    applyStationTaskFields(data, body) {
        if (body == null)
            return data;
        if (body.checkInMode != null)
            data.checkInMode = this.mapRoutePointCheckInMode(body.checkInMode);
        else if (data.checkInMode == null)
            data.checkInMode = ROUTE_POINT_CHECK_IN_MODES.SCAN;
        if (body.knowledgeVideoTitle != null)
            data.knowledgeVideoTitle = String(body.knowledgeVideoTitle || '').trim() || null;
        if (body.knowledgeVideoUrl != null) {
            const url = String(body.knowledgeVideoUrl || '').trim();
            if (url.length > 0 && url.indexOf('http://') !== 0 && url.indexOf('https://') !== 0)
                throw new common_1.BadRequestException('讲解视频地址必须是 http 或 https 链接');
            data.knowledgeVideoUrl = url || null;
        }
        if (body.stationSteps != null) {
            const steps = this.normalizeStationSteps(body.stationSteps);
            const questions = [];
            let videoUrl = '';
            let videoTitle = '';
            let taskTitle = '';
            let taskBody = '';
            for (let i = 0; i < steps.length; i++) {
                const step = steps[i];
                if (step.type === 'video' && !videoUrl && step.videoUrl) {
                    videoUrl = step.videoUrl;
                    videoTitle = step.title;
                }
                if (step.type === 'quiz' && Array.isArray(step.questions)) {
                    for (let j = 0; j < step.questions.length; j++) questions.push(step.questions[j]);
                }
                if (step.type === 'task' && !taskBody && step.taskBody) {
                    taskTitle = step.title;
                    taskBody = step.taskBody;
                }
            }
            data.knowledgeQuestions = questions;
            data.knowledgeEnabled = questions.length > 0;
            const first = questions.length > 0 ? questions[0] : null;
            data.knowledgeQuestion = first ? first.question : null;
            data.knowledgeOptions = first ? first.options : [];
            data.knowledgeAnswerIndex = first ? (first.answerIndex != null ? first.answerIndex : (Array.isArray(first.answerIndexes) ? first.answerIndexes[0] : null)) : null;
            if (videoUrl) {
                data.knowledgeVideoUrl = videoUrl;
                data.knowledgeVideoTitle = videoTitle || null;
            }
        } else if (body.knowledgeQuestions != null || body.knowledgeEnabled != null) {
            const questions = this.readAdminKnowledgeQuestions(body.knowledgeQuestions);
            data.knowledgeQuestions = questions;
            const enabled = body.knowledgeEnabled != null
                ? this.mapBoolean(body.knowledgeEnabled, questions.length > 0)
                : questions.length > 0;
            data.knowledgeEnabled = enabled && questions.length > 0;
            const first = questions.length > 0 ? questions[0] : null;
            data.knowledgeQuestion = first ? first.question : null;
            data.knowledgeOptions = first ? first.options : [];
            data.knowledgeAnswerIndex = first ? (first.answerIndex != null ? first.answerIndex : (Array.isArray(first.answerIndexes) ? first.answerIndexes[0] : null)) : null;
        }
        return data;
    }
    mapRoutePointCreateData(projectId, body) {
        const title = String(body.title ?? '').trim();
        const description = String(body.description ?? body.desc ?? body.intro ?? '').trim() || title || '研学点位';
        if (!title)
            throw new common_1.BadRequestException('请填写点位名称');
        const lat = body.latitude != null ? this.mapLatitude(body.latitude) : 40.509204;
        const lng = body.longitude != null ? this.mapLongitude(body.longitude) : 111.826493;
        return {
            projectId,
            title,
            description,
            latitude: lat,
            longitude: lng,
            checkRadius: this.mapCheckRadius(body.checkRadius),
            checkInMode: this.mapRoutePointCheckInMode(body.checkInMode != null ? body.checkInMode : ROUTE_POINT_CHECK_IN_MODES.SCAN),
            sortOrder: this.mapSortOrder(body.sortOrder),
            enabled: this.mapBoolean(body.enabled, true),
        };
    }
    mapRoutePointUpdateData(body) {
        const data = {};
        if (body.title != null) {
            const title = String(body.title).trim();
            if (!title)
                throw new common_1.BadRequestException('Route point title is required');
            data.title = title;
        }
        if (body.description != null || body.desc != null || body.intro != null) {
            const description = String(body.description ?? body.desc ?? body.intro ?? '').trim();
            data.description = description || (body.title != null ? String(body.title).trim() : '研学点位');
        }
        if (body.latitude != null)
            data.latitude = this.mapLatitude(body.latitude);
        if (body.longitude != null)
            data.longitude = this.mapLongitude(body.longitude);
        if (body.checkRadius != null)
            data.checkRadius = this.mapCheckRadius(body.checkRadius);
        if (body.checkInMode != null)
            data.checkInMode = this.mapRoutePointCheckInMode(body.checkInMode);
        if (body.sortOrder != null)
            data.sortOrder = this.mapSortOrder(body.sortOrder);
        if (body.enabled != null)
            data.enabled = this.mapBoolean(body.enabled, true);
        return data;
    }
    mapRoutePointCheckInMode(value) {
        const normalized = String(value ?? ROUTE_POINT_CHECK_IN_MODES.LOCATION).trim().toLowerCase();
        if (normalized === ROUTE_POINT_CHECK_IN_MODES.SCAN)
            return ROUTE_POINT_CHECK_IN_MODES.SCAN;
        return ROUTE_POINT_CHECK_IN_MODES.LOCATION;
    }
    mapDepartureMode(value) {
        const normalized = String(value ?? STUDY_DEPARTURE_MODES.WALK).trim().toLowerCase();
        if (normalized === STUDY_DEPARTURE_MODES.VEHICLE || normalized === 'car' || normalized === 'bus')
            return STUDY_DEPARTURE_MODES.VEHICLE;
        return STUDY_DEPARTURE_MODES.WALK;
    }
    mapStudyLiveStage(value) {
        const stage = String(value ?? '').trim();
        if (stage === STUDY_LIVE_STAGES.NOT_STARTED ||
            stage === STUDY_LIVE_STAGES.WAITING_ADMIN_START ||
            stage === STUDY_LIVE_STAGES.READY ||
            stage === STUDY_LIVE_STAGES.DEPARTING ||
            stage === STUDY_LIVE_STAGES.STUDY_ACTIVE ||
            stage === STUDY_LIVE_STAGES.ENDED) {
            return stage;
        }
        throw new common_1.BadRequestException('Invalid live stage');
    }
    mapNullableLatitude(value) {
        if (value == null || String(value).trim().length === 0)
            return null;
        return this.mapLatitude(value);
    }
    mapNullableLongitude(value) {
        if (value == null || String(value).trim().length === 0)
            return null;
        return this.mapLongitude(value);
    }
    mapDepartureSettingsData(body) {
        const mode = this.mapDepartureMode(body.mode ?? body.departureMode);
        const departureLatitude = this.mapNullableLatitude(body.departureLatitude ?? body.startLatitude);
        const departureLongitude = this.mapNullableLongitude(body.departureLongitude ?? body.startLongitude);
        const dropoffLatitude = this.mapNullableLatitude(body.dropoffLatitude);
        const dropoffLongitude = this.mapNullableLongitude(body.dropoffLongitude);
        if ((departureLatitude == null) !== (departureLongitude == null))
            throw new common_1.BadRequestException('初始出发点经纬度需要同时填写');
        if ((dropoffLatitude == null) !== (dropoffLongitude == null))
            throw new common_1.BadRequestException('下车点经纬度需要同时填写');
        const data = {
            departureMode: mode,
            departureTitle: this.mapNullableText(body.departureTitle ?? body.startTitle),
            departureLatitude,
            departureLongitude,
            dropoffTitle: this.mapNullableText(body.dropoffTitle),
            dropoffLatitude,
            dropoffLongitude,
            vehiclePlateNo: this.mapNullableText(body.vehiclePlateNo ?? body.plateNo),
            driverName: this.mapNullableText(body.driverName),
            driverPhone: this.mapNullableText(body.driverPhone),
        };
        if (mode === STUDY_DEPARTURE_MODES.VEHICLE) {
            if (!data.vehiclePlateNo)
                throw new common_1.BadRequestException('车牌号不能为空');
            if (!data.driverName)
                throw new common_1.BadRequestException('司机姓名不能为空');
            if (!data.driverPhone || !/^1\d{10}$/.test(String(data.driverPhone)))
                throw new common_1.BadRequestException('司机手机号格式不正确');
        }
        return data;
    }
    mapLatitude(value) {
        const num = Number(value);
        if (!Number.isFinite(num) || num < -90 || num > 90) {
            throw new common_1.BadRequestException('Latitude must be between -90 and 90');
        }
        return num.toFixed(6);
    }
    mapLongitude(value) {
        const num = Number(value);
        if (!Number.isFinite(num) || num < -180 || num > 180) {
            throw new common_1.BadRequestException('Longitude must be between -180 and 180');
        }
        return num.toFixed(6);
    }
    mapCheckRadius(value) {
        const radius = Math.floor(Number(value ?? 120));
        if (!Number.isFinite(radius) || radius < 10 || radius > 5000) {
            throw new common_1.BadRequestException('Check radius must be between 10 and 5000 meters');
        }
        return radius;
    }
    mapSortOrder(value) {
        const order = Math.floor(Number(value ?? 0));
        if (!Number.isFinite(order))
            return 0;
        return order;
    }
    mapNullableText(value) {
        if (value == null)
            return null;
        const text = String(value).trim();
        return text.length > 0 ? text : null;
    }
    mapNullableFontSize(value) {
        if (value == null)
            return null;
        const text = String(value).trim();
        if (!text)
            return null;
        const size = Math.floor(Number(text));
        if (!Number.isFinite(size) || size < 10 || size > 40) {
            throw new common_1.BadRequestException('Font size must be between 10 and 40');
        }
        return size;
    }
    mapFloatingNoticeActionType(value) {
        const text = String(value ?? '').trim();
        if (text === 'none')
            return text;
        if (text === 'notice' || text === 'page')
            return text;
        return 'project';
    }
    mapStudyProjectStatus(status) {
        if (STUDY_PROJECT_STATUSES.includes(status))
            return status;
        throw new common_1.BadRequestException('Invalid study project status');
    }
    mapBookingStatus(status) {
        const normalized = status.toUpperCase();
        if (normalized in client_1.BookingStatus)
            return normalized;
        return client_1.BookingStatus.BOOKED;
    }
    isActiveStudyBookingStatus(status) {
        return status === client_1.BookingStatus.BOOKED || status === client_1.BookingStatus.COMPLETED;
    }
    isSeatStudyBooking(booking) {
        return booking.participantRole !== 'ORGANIZER';
    }
    countSeatStudyBookings(group) {
        let count = 0;
        for (let i = 0; i < group.length; i++) {
            if (this.isSeatStudyBooking(group[i]))
                count++;
        }
        return count;
    }
    shouldMarkStudyBookingPaid(status) {
        return status === client_1.BookingStatus.BOOKED || status === client_1.BookingStatus.COMPLETED;
    }
    resolveStudyBookingPaidAt(status, current) {
        if (this.shouldMarkStudyBookingPaid(status))
            return current ?? new Date();
        if (status === client_1.BookingStatus.CANCELLED)
            return current ?? null;
        return null;
    }
    async incrementStudyProjectEnrollment(tx, project, seats = 1) {
        if (project.maxCapacity > 0) {
            const updated = await tx.studyProject.updateMany({
                where: { id: project.id, enrolled: { lte: project.maxCapacity - seats } },
                data: { enrolled: { increment: seats } },
            });
            if (updated.count === 0)
                throw new common_1.BadRequestException('Study project is full');
            return;
        }
        await tx.studyProject.update({
            where: { id: project.id },
            data: { enrolled: { increment: seats } },
        });
    }
    defaultContact() {
        return { name: '蒙企链探', phone: '19931708002', hours: '工作日 09:00–18:00', email: '203790885@qq.com' };
    }
    defaultDicts() {
        return {
            articleTags: ['感受', '宣传', '研学', '亲子', '攻略', '路线'],
            contentChannels: [{ key: 'all', label: '全部' }, { key: 'test', label: '测试分类' }],
            noticeTypes: ['测试分类'],
            studyCategories: ['企业研学'],
            studyTags: ['研学', '亲子'],
        };
    }
    defaultLegal(kind) {
        if (kind === 'privacy') {
            return {
                title: '隐私政策',
                updatedAt: '2026年9月10日',
                intro: '蒙企链探重视您的个人信息保护。本政策说明我们如何收集、使用、存储和保护您的信息。使用本小程序前，请仔细阅读。未满十四周岁用户请在监护人陪同下阅读并征得同意。',
                sections: [
                    { heading: '一、我们收集的信息', body: '1. 账号信息：微信昵称、头像、OpenID 等授权信息，以及您完善的手机号、真实姓名、证件号。\n2. 研学信息：预约订单、游客资料、结业证书。\n3. 位置信息：在选点租车时，经您同意后获取定位。\n4. 交易信息：订单、支付状态、卡券、地址、发票抬头。\n5. 内容信息：您发布的研学体验、评论、反馈与客服会话。\n6. 设备信息：用于保障运行安全的基本设备与日志信息。' },
                    { heading: '二、使用目的', body: '用于完成登录与身份核验、研学预约与现场服务、商城下单与配送、卡券与成果展示、客户服务与安全风控，以及在依法合规前提下改进产品体验。' },
                    { heading: '三、共享与披露', body: '我们不会出售您的个人信息。仅在获得同意、完成支付物流微信登录所必需、或法律法规要求时共享。' },
                    { heading: '四、存储与保护', body: '信息存储于中华人民共和国境内。我们采取合理的安全措施，并仅在实现目的所必需的期限内保留。' },
                    { heading: '五、您的权利', body: '您可查询、更正账号资料，管理常用游客与地址。如需注销账号，请通过客服热线或邮箱提出。' },
                    { heading: '六、联系我们', body: '客服热线：199-3170-8002（工作日 09:00–18:00）\n邮箱：203790885@qq.com' },
                ],
            };
        }
        return {
            title: '用户协议',
            updatedAt: '2026年9月10日',
            intro: '欢迎使用「蒙企链探」。本协议是您与蒙企链探之间就使用内蒙古食品产业研学及相关服务所订立的约定。您点击同意、登录或实际使用服务，即视为已阅读并接受本协议。',
            sections: [
                { heading: '一、服务内容', body: '本小程序向用户提供研学项目浏览与预约、文创商城、卡券与研学成果、资讯社区等功能。' },
                { heading: '二、账号与登录', body: '您可通过微信授权登录。请妥善保管微信账号。如发现盗用，请及时联系客服。' },
                { heading: '三、研学预约与出行', body: '预约时请如实填写游客姓名、证件及联系方式，并确认集合时间与地点。' },
                { heading: '四、支付、取消与改期', body: '订单费用以页面展示为准。出发前 7 天可免费取消；出发前 3–7 天取消收取订单金额 30% 手续费；出发前 3 天内一般不支持取消。' },
                { heading: '五、文创商城', body: '商品信息、价格与库存以下单页为准。发货与售后按订单页面及客服说明执行。' },
                { heading: '六、联系我们', body: '客服热线：199-3170-8002（工作日 09:00–18:00）\n邮箱：203790885@qq.com' },
            ],
        };
    }
    async loadSettingMap() {
        const rows = await this.prisma.platformSetting.findMany();
        const map = {};
        for (let i = 0; i < (rows || []).length; i++)
            map[rows[i].key] = rows[i].value;
        return map;
    }
    async upsertSetting(key, value, label, group, actor) {
        return this.prisma.platformSetting.upsert({
            where: { key },
            create: { key, value, label: label || key, groupName: group || 'general', updatedBy: actor && actor.actorId ? actor.actorId : null },
            update: { value, label: label || key, groupName: group || 'general', updatedBy: actor && actor.actorId ? actor.actorId : null },
        });
    }
    buildPublicSettings(map) {
        const fallback = this.defaultContact();
        const raw = map['platform.contact'] && typeof map['platform.contact'] === 'object' ? map['platform.contact'] : {};
        let name = String(raw.name || map['app.name'] || fallback.name);
        let phone = String(raw.phone || map['app.servicePhone'] || fallback.phone);
        if (name === '蒙启研学')
            name = fallback.name;
        if (phone === '400-000-0000' || phone === '4000000000')
            phone = fallback.phone;
        const contact = {
            name: name || fallback.name,
            phone: String(phone || fallback.phone).replace(/[-\s]/g, ''),
            hours: String(raw.hours || fallback.hours),
            email: String(raw.email || fallback.email),
        };
        const dicts = Object.assign({}, this.defaultDicts(), (map['platform.dicts'] && typeof map['platform.dicts'] === 'object') ? map['platform.dicts'] : {});
        const legal = {
            agreement: (map['legal.agreement'] && typeof map['legal.agreement'] === 'object') ? map['legal.agreement'] : this.defaultLegal('agreement'),
            privacy: (map['legal.privacy'] && typeof map['legal.privacy'] === 'object') ? map['legal.privacy'] : this.defaultLegal('privacy'),
        };
        const features = {
            rental: map['feature.rental'] !== false,
            aiPlan: map['feature.aiPlan'] !== false,
            driverCommission: this.toMoney(map['feature.driverCommission']),
            studyCommission: this.toMoney(map['feature.studyCommission']),
            mallCommission: this.toMoney(map['feature.mallCommission']),
        };
        const splash = splash_announcement_1.normalizeSplashAnnouncement(map['mp.splashAnnouncement']);
        return { contact, dicts, legal, features, splash };
    }
    async uploadSplashFile(file) {
        if (!this.storage || typeof this.storage.putPublicFile !== 'function')
            throw new common_1.ServiceUnavailableException('存储服务不可用');
        return this.storage.putPublicFile('splash', file);
    }
    async getPlatformSettings() {
        const map = await this.loadSettingMap();
        return this.buildPublicSettings(map);
    }
    async savePlatformSettings(body, actor) {
        const src = body || {};
        if (src.contact) {
            const cur = this.defaultContact();
            const contact = {
                name: String(src.contact.name || cur.name).trim() || cur.name,
                phone: String(src.contact.phone || cur.phone).replace(/[-\s]/g, '') || cur.phone,
                hours: String(src.contact.hours || cur.hours).trim() || cur.hours,
                email: String(src.contact.email || cur.email).trim() || cur.email,
            };
            await this.upsertSetting('platform.contact', contact, '平台对外信息', 'general', actor);
            await this.upsertSetting('app.name', contact.name, '小程序名称', 'general', actor);
            await this.upsertSetting('app.servicePhone', contact.phone, '客服电话', 'general', actor);
        }
        if (src.legal) {
            if (src.legal.agreement)
                await this.upsertSetting('legal.agreement', src.legal.agreement, '用户协议', 'legal', actor);
            if (src.legal.privacy)
                await this.upsertSetting('legal.privacy', src.legal.privacy, '隐私政策', 'legal', actor);
        }
        if (src.dicts) {
            if (!actor || !actor.mpAccess)
                throw new common_1.ForbiddenException('仅平台运营可管理资讯分类');
            await this.upsertSetting('platform.dicts', Object.assign({}, this.defaultDicts(), src.dicts), '分类字典', 'dict', actor);
        }
        if (src.splash) {
            if (!actor || !actor.mpAccess)
                throw new common_1.ForbiddenException('仅平台运营可管理开屏公告');
            const checked = splash_announcement_1.validateSplashAnnouncement(src.splash);
            if (!checked.ok)
                throw new common_1.BadRequestException((checked.errors[0] && checked.errors[0].message) || '开屏公告不完整');
            const map = await this.loadSettingMap();
            const cur = splash_announcement_1.normalizeSplashAnnouncement(map['mp.splashAnnouncement']);
            const next = Object.assign({}, checked.value, { version: (Number(cur.version) || 0) + 1 });
            await this.upsertSetting('mp.splashAnnouncement', next, '开屏公告', 'ops', actor);
        }
        if (src.features) {
            const f = src.features;
            if (f.rental != null)
                await this.upsertSetting('feature.rental', !!f.rental, '租车服务', 'feature', actor);
            if (f.aiPlan != null)
                await this.upsertSetting('feature.aiPlan', !!f.aiPlan, 'AI行程', 'feature', actor);
            if (f.driverCommission != null)
                await this.upsertSetting('feature.driverCommission', Math.min(100, Math.max(0, this.toMoney(f.driverCommission))), '司机抽成', 'feature', actor);
            if (f.studyCommission != null)
                await this.upsertSetting('feature.studyCommission', Math.min(100, Math.max(0, this.toMoney(f.studyCommission))), '研学抽成', 'feature', actor);
            if (f.mallCommission != null)
                await this.upsertSetting('feature.mallCommission', Math.min(100, Math.max(0, this.toMoney(f.mallCommission))), '文创抽成', 'feature', actor);
        }
        await this.writeOpLog(actor, { module: 'settings', action: 'update', targetType: 'PlatformSetting', targetId: 'platform', targetLabel: '系统设置', summary: '更新系统设置', detail: Object.keys(src) });
        return this.getPlatformSettings();
    }
    serializeConsoleOperator(row) {
        return {
            id: String(row.id),
            phone: String(row.phone || ''),
            name: String(row.name || ''),
            status: String(row.status || 'ACTIVE'),
            mpAccess: !!row.mpAccess,
            mpRole: String(row.mpRole || 'NONE'),
            merchantAccess: !!row.merchantAccess,
            enterpriseId: row.enterpriseId ? String(row.enterpriseId) : '',
            enterpriseName: String(row.enterpriseName || row.enterpriseShortName || ''),
            merchantRoleId: row.merchantRoleId ? String(row.merchantRoleId) : '',
            createdAt: row.createdAt,
            updatedAt: row.updatedAt,
        };
    }
    async listConsoleOperators() {
        const rows = await this.prisma.$queryRawUnsafe(`SELECT a.id, a.phone, a.name, a.status, a."mpAccess", a."mpRole", a."merchantAccess", a."enterpriseId", a."createdAt", a."updatedAt",
                    e.name AS "enterpriseName", e."shortName" AS "enterpriseShortName"
             FROM "ConsoleAccount" a
             LEFT JOIN "Enterprise" e ON e.id = a."enterpriseId"
             ORDER BY a."createdAt" DESC`);
        return {
            items: (rows || []).map((row) => this.serializeConsoleOperator(row)),
            roles: admin_permissions_1.ADMIN_ROLE_OPTIONS.filter((r) => r.value !== 'NONE'),
        };
    }
    platformPermissionOptions() {
        return (admin_permissions_1.ADMIN_PERMISSION_OPTIONS || []).slice();
    }
    allPlatformPermissions() {
        return (admin_permissions_1.ALL_ADMIN_PERMISSIONS || []).slice();
    }
    defaultPlatformRoles() {
        const all = this.allPlatformPermissions();
        const rows = admin_permissions_1.ADMIN_ROLE_OPTIONS || [];
        const out = [];
        for (let i = 0; i < rows.length; i++) {
            const r = rows[i];
            if (!r || r.value === 'NONE')
                continue;
            out.push({
                id: String(r.value),
                name: String(r.label || r.value),
                locked: r.value === 'SUPER_ADMIN',
                permissions: r.value === 'SUPER_ADMIN' ? all.slice() : (r.permissions || []).slice(),
                enterpriseIds: [],
                projectIds: [],
            });
        }
        if (!out.some((r) => r.id === 'SUPER_ADMIN'))
            out.unshift({ id: 'SUPER_ADMIN', name: '超级管理员', locked: true, permissions: all.slice(), enterpriseIds: [], projectIds: [] });
        return out;
    }
    normalizePlatformPermissions(value) {
        const out = (0, admin_permissions_1.expandAdminPermissions)(value);
        if (out.indexOf('overview.read') < 0)
            out.unshift('overview.read');
        return out;
    }
    parsePlatformRoles(raw) {
        let parsed = raw;
        if (typeof parsed === 'string') {
            try { parsed = JSON.parse(parsed); }
            catch (_err) { parsed = null; }
        }
        if (!Array.isArray(parsed) || !parsed.length)
            return this.defaultPlatformRoles();
        const out = [];
        const seen = {};
        for (let i = 0; i < parsed.length; i++) {
            const row = parsed[i] || {};
            const id = String(row.id || '').trim() || ('mpr' + Date.now().toString(36) + i);
            if (seen[id])
                continue;
            seen[id] = true;
            const locked = id === 'SUPER_ADMIN' || !!row.locked;
            out.push({
                id,
                name: String(row.name || '').trim() || '未命名职位',
                locked,
                permissions: locked ? this.allPlatformPermissions() : this.normalizePlatformPermissions(row.permissions),
                enterpriseIds: locked ? [] : this.normalizeEnterpriseIds(row.enterpriseIds),
                projectIds: locked ? [] : this.normalizeProjectIds(row.projectIds),
            });
        }
        if (!out.some((r) => r.id === 'SUPER_ADMIN'))
            out.unshift(this.defaultPlatformRoles()[0]);
        return out;
    }
    async readPlatformRoles() {
        const map = await this.loadSettingMap();
        const roles = this.parsePlatformRoles(map['platform.roles']);
        if (!map['platform.roles'])
            await this.writePlatformRoles(roles, null);
        return roles;
    }
    async writePlatformRoles(roles, actor) {
        const next = this.parsePlatformRoles(roles);
        await this.upsertSetting('platform.roles', next, '平台职位', 'access', actor);
        return next;
    }
    mpRolePermissions(roles, roleId) {
        const id = String(roleId || '').trim();
        const hit = (roles || []).find((r) => r.id === id);
        if (!hit)
            return (0, admin_permissions_1.permissionsForRole)(id);
        return this.normalizePlatformPermissions(hit.permissions);
    }
    async listMpStaff(actor) {
        if (!actor || !actor.mpAccess)
            throw new common_1.ForbiddenException('只有平台管理员可以管理职位');
        const roles = await this.readPlatformRoles();
        const rows = await this.prisma.$queryRawUnsafe(`SELECT a.id, a.phone, a.name, a.status, a."mpAccess", a."mpRole", a."merchantAccess", a."enterpriseId", a."createdAt", a."updatedAt",
                    e.name AS "enterpriseName"
             FROM "ConsoleAccount" a
             LEFT JOIN "Enterprise" e ON e.id = a."enterpriseId"
             WHERE a."mpAccess" = TRUE
             ORDER BY a."createdAt" DESC`);
        const items = (rows || []).map((row) => {
            const packed = this.serializeConsoleOperator(row);
            const role = roles.find((r) => r.id === packed.mpRole);
            packed.mpRoleName = role ? role.name : packed.mpRole;
            packed.adminPermissions = this.mpRolePermissions(roles, packed.mpRole);
            return packed;
        });
        return { roles, permissionOptions: this.platformPermissionOptions(), items };
    }
    async saveMpRoles(body, actor) {
        if (!actor || !actor.mpAccess)
            throw new common_1.ForbiddenException('只有平台管理员可以管理职位');
        const incoming = Array.isArray(body && body.roles) ? body.roles : [];
        if (!incoming.length)
            throw new common_1.BadRequestException('至少保留一个职位');
        const current = await this.readPlatformRoles();
        const used = await this.prisma.$queryRawUnsafe(`SELECT DISTINCT "mpRole" AS id FROM "ConsoleAccount" WHERE "mpAccess" = TRUE AND "mpRole" IS NOT NULL`);
        const usedIds = new Set((used || []).map((r) => String(r.id || '')));
        const next = this.parsePlatformRoles(incoming);
        for (let i = 0; i < current.length; i++) {
            if (usedIds.has(current[i].id) && !next.some((r) => r.id === current[i].id))
                throw new common_1.BadRequestException('职位「' + current[i].name + '」仍有账号在用，不能删除');
        }
        try {
            const ents = await this.prisma.enterprise.findMany({ select: { id: true } });
            const entSet = new Set((ents || []).map((r) => String(r.id)));
            const projs = await this.prisma.studyProject.findMany({ select: { id: true, enterpriseId: true } });
            const projEnt = {};
            for (let i = 0; projs && i < projs.length; i++)
                projEnt[String(projs[i].id)] = String(projs[i].enterpriseId || '');
            for (let i = 0; i < next.length; i++) {
                const role = next[i];
                if (role.locked) {
                    role.enterpriseIds = [];
                    role.projectIds = [];
                    continue;
                }
                role.enterpriseIds = this.normalizeEnterpriseIds(role.enterpriseIds).filter((id) => entSet.has(id));
                let pids = this.normalizeProjectIds(role.projectIds).filter((id) => Object.prototype.hasOwnProperty.call(projEnt, id));
                if (role.enterpriseIds.length) {
                    const allow = new Set(role.enterpriseIds);
                    pids = pids.filter((id) => allow.has(projEnt[id]));
                }
                role.projectIds = pids;
            }
        }
        catch (_err) { }
        const roles = await this.writePlatformRoles(next, actor);
        await this.writeOpLog(actor, { module: 'settings', action: 'update', targetType: 'PlatformRole', targetId: 'platform.roles', targetLabel: '平台职位', summary: '更新平台职位', detail: { count: roles.length } });
        return { roles, permissionOptions: this.platformPermissionOptions() };
    }
    async createMpStaff(body, actor) {
        if (!actor || !actor.mpAccess)
            throw new common_1.ForbiddenException('只有平台管理员可以管理职位');
        const phone = String((body && body.phone) || '').replace(/[^0-9]/g, '');
        const password = String((body && body.password) || '');
        const name = String((body && body.name) || '').trim();
        const roleId = String((body && body.roleId) || '').trim();
        if (!/^1\d{10}$/.test(phone))
            throw new common_1.BadRequestException('请输入11位手机号');
        if (password.length < 6)
            throw new common_1.BadRequestException('密码至少 6 位');
        const roles = await this.readPlatformRoles();
        if (!roles.some((r) => r.id === roleId))
            throw new common_1.BadRequestException('请选择职位');
        const existed = await this.prisma.$queryRawUnsafe(`SELECT id FROM "ConsoleAccount" WHERE phone = $1 LIMIT 1`, phone);
        if (existed && existed.length)
            throw new common_1.BadRequestException('该手机号已有控制台账号');
        const hash = await bcrypt.hash(password, 10);
        const accId = 'cns' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
        await this.prisma.$executeRawUnsafe(
            `INSERT INTO "ConsoleAccount" (id, phone, "passwordHash", name, status, "mpAccess", "mpRole", "merchantAccess", "enterpriseId", "createdAt", "updatedAt")
             VALUES ($1,$2,$3,$4,'ACTIVE',TRUE,$5,FALSE,NULL,NOW(),NOW())`,
            accId, phone, hash, name || phone, roleId
        );
        await this.writeOpLog(actor, { module: 'settings', action: 'create', targetType: 'ConsoleAccount', targetId: accId, targetLabel: name || phone, summary: '新增平台管理员 ' + (name || phone), detail: { phone, mpRole: roleId } });
        const board = await this.listMpStaff(actor);
        return board.items.find((x) => x.id === accId) || board;
    }
    async updateMpStaff(accountId, body, actor) {
        if (!actor || !actor.mpAccess)
            throw new common_1.ForbiddenException('只有平台管理员可以管理职位');
        const rows = await this.prisma.$queryRawUnsafe(`SELECT * FROM "ConsoleAccount" WHERE id=$1 LIMIT 1`, accountId);
        if (!rows || !rows.length)
            throw new common_1.NotFoundException('账号不存在');
        const existed = rows[0];
        if (!existed.mpAccess)
            throw new common_1.ForbiddenException('该账号不是平台管理员');
        const name = body.name != null ? String(body.name).trim() : existed.name;
        const status = body.status != null ? String(body.status).trim() : existed.status;
        let roleId = body.roleId != null ? String(body.roleId).trim() : String(existed.mpRole || 'OBSERVER');
        const roles = await this.readPlatformRoles();
        if (!roles.some((r) => r.id === roleId))
            throw new common_1.BadRequestException('请选择职位');
        if (String(existed.mpRole) === 'SUPER_ADMIN' && roleId !== 'SUPER_ADMIN') {
            const supers = await this.prisma.$queryRawUnsafe(`SELECT COUNT(*)::int AS count FROM "ConsoleAccount" WHERE "mpRole" = 'SUPER_ADMIN' AND "mpAccess" = TRUE AND status = 'ACTIVE' AND id <> $1`, accountId);
            if (!(supers && supers[0] && Number(supers[0].count) > 0))
                throw new common_1.BadRequestException('至少保留一个超级管理员');
        }
        let hash = existed.passwordHash;
        if (body.password != null && String(body.password).length > 0) {
            if (String(body.password).length < 6)
                throw new common_1.BadRequestException('密码至少 6 位');
            hash = await bcrypt.hash(String(body.password), 10);
        }
        await this.prisma.$executeRawUnsafe(
            `UPDATE "ConsoleAccount" SET name=$1, status=$2, "mpRole"=$3, "passwordHash"=$4, "updatedAt"=NOW() WHERE id=$5`,
            name, status, roleId, hash, accountId
        );
        await this.writeOpLog(actor, { module: 'settings', action: 'update', targetType: 'ConsoleAccount', targetId: accountId, targetLabel: name, summary: '修改平台管理员 ' + name, detail: { mpRole: roleId, status } });
        const board = await this.listMpStaff(actor);
        return board.items.find((x) => x.id === accountId) || board;
    }
    async deleteMpStaff(accountId, actor) {
        if (!actor || !actor.mpAccess)
            throw new common_1.ForbiddenException('只有平台管理员可以管理职位');
        const rows = await this.prisma.$queryRawUnsafe(`SELECT * FROM "ConsoleAccount" WHERE id=$1 LIMIT 1`, accountId);
        if (!rows || !rows.length)
            throw new common_1.NotFoundException('账号不存在');
        const existed = rows[0];
        if (!existed.mpAccess)
            throw new common_1.ForbiddenException('该账号不是平台管理员');
        if (String(actor.actorId || '') === String(accountId))
            throw new common_1.BadRequestException('不能删除当前登录账号');
        if (String(existed.mpRole) === 'SUPER_ADMIN') {
            const supers = await this.prisma.$queryRawUnsafe(`SELECT COUNT(*)::int AS count FROM "ConsoleAccount" WHERE "mpRole" = 'SUPER_ADMIN' AND "mpAccess" = TRUE AND status = 'ACTIVE' AND id <> $1`, accountId);
            if (!(supers && supers[0] && Number(supers[0].count) > 0))
                throw new common_1.BadRequestException('至少保留一个超级管理员');
        }
        await this.prisma.$executeRawUnsafe(`DELETE FROM "ConsoleAccount" WHERE id=$1`, accountId);
        await this.writeOpLog(actor, { module: 'settings', action: 'delete', targetType: 'ConsoleAccount', targetId: accountId, targetLabel: existed.name || existed.phone, summary: '删除平台管理员 ' + (existed.name || existed.phone) });
        return { id: accountId, deleted: true };
    }
    async deleteMpStaffs(ids, actor) {
        const list = Array.isArray(ids) ? ids.map((x) => String(x || '').trim()).filter(Boolean) : [];
        let deleted = 0;
        for (let i = 0; i < list.length; i++) {
            try {
                await this.deleteMpStaff(list[i], actor);
                deleted += 1;
            }
            catch (_err) { }
        }
        return { deleted };
    }
    async createConsoleOperator(body, actor) {
        const phone = String((body && body.phone) || '').replace(/[^0-9]/g, '');
        const password = String((body && body.password) || '');
        const name = String((body && body.name) || '').trim();
        if (!/^1\d{10}$/.test(phone))
            throw new common_1.BadRequestException('请输入11位手机号');
        if (password.length < 6)
            throw new common_1.BadRequestException('密码至少 6 位');
        const existed = await this.prisma.$queryRawUnsafe(`SELECT id FROM "ConsoleAccount" WHERE phone = $1 LIMIT 1`, phone);
        if (existed && existed.length)
            throw new common_1.BadRequestException('该手机号已有控制台账号');
        const role = (0, admin_permissions_1.normalizeAdminRole)((body && body.mpRole) || 'OBSERVER');
        const hash = await bcrypt.hash(password, 10);
        const id = 'cns' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
        const mpAccess = body && body.mpAccess === false ? false : true;
        const merchantAccess = !!(body && body.merchantAccess);
        const enterpriseId = String((body && body.enterpriseId) || '').trim() || null;
        if (!mpAccess && !merchantAccess)
            throw new common_1.BadRequestException('至少开通运维或入驻企业入口');
        if (merchantAccess && !enterpriseId)
            throw new common_1.BadRequestException('入驻企业账号必须绑定企业');
        await this.ensureStaffSchema();
        const merchantRoleId = merchantAccess ? (String((body && body.merchantRoleId) || 'owner').trim() || 'owner') : null;
        if (merchantAccess && enterpriseId)
            await this.readStaffRoles(enterpriseId);
        await this.prisma.$executeRawUnsafe(
            `INSERT INTO "ConsoleAccount" (id, phone, "passwordHash", name, status, "mpAccess", "mpRole", "merchantAccess", "enterpriseId", "merchantRoleId", "createdAt", "updatedAt")
             VALUES ($1,$2,$3,$4,'ACTIVE',$5,$6,$7,$8,$9,NOW(),NOW())`,
            id, phone, hash, name || phone, mpAccess, role, merchantAccess, enterpriseId, merchantRoleId
        );
        await this.writeOpLog(actor, { module: 'settings', action: 'create', targetType: 'ConsoleAccount', targetId: id, targetLabel: name || phone, summary: '新增控制台账号 ' + (name || phone), detail: { phone, mpRole: role } });
        const rows = await this.prisma.$queryRawUnsafe(`SELECT a.*, e.name AS "enterpriseName" FROM "ConsoleAccount" a LEFT JOIN "Enterprise" e ON e.id = a."enterpriseId" WHERE a.id = $1`, id);
        return this.serializeConsoleOperator(rows[0]);
    }
    async updateConsoleOperator(id, body, actor) {
        const rows = await this.prisma.$queryRawUnsafe(`SELECT * FROM "ConsoleAccount" WHERE id = $1 LIMIT 1`, id);
        if (!rows || !rows.length)
            throw new common_1.NotFoundException('控制台账号不存在');
        const existed = rows[0];
        const name = body.name != null ? String(body.name).trim() : existed.name;
        const status = body.status != null ? String(body.status).trim() : existed.status;
        const role = body.mpRole != null ? (0, admin_permissions_1.normalizeAdminRole)(body.mpRole) : existed.mpRole;
        if (String(existed.mpRole) === 'SUPER_ADMIN' && role !== 'SUPER_ADMIN') {
            const supers = await this.prisma.$queryRawUnsafe(`SELECT COUNT(*)::int AS count FROM "ConsoleAccount" WHERE "mpRole" = 'SUPER_ADMIN' AND status = 'ACTIVE' AND id <> $1`, id);
            const n = supers && supers[0] ? Number(supers[0].count) : 0;
            if (n < 1)
                throw new common_1.BadRequestException('至少保留一个超级管理员');
        }
        const mpAccess = body.mpAccess != null ? !!body.mpAccess : existed.mpAccess;
        const merchantAccess = body.merchantAccess != null ? !!body.merchantAccess : existed.merchantAccess;
        const enterpriseId = body.enterpriseId !== undefined ? (String(body.enterpriseId || '').trim() || null) : existed.enterpriseId;
        if (!mpAccess && !merchantAccess)
            throw new common_1.BadRequestException('至少开通运维或入驻企业入口');
        if (merchantAccess && !enterpriseId)
            throw new common_1.BadRequestException('入驻企业账号必须绑定企业');
        await this.ensureStaffSchema();
        const merchantRoleId = body.merchantRoleId !== undefined
            ? (String(body.merchantRoleId || '').trim() || (merchantAccess ? 'owner' : null))
            : (existed.merchantRoleId || (merchantAccess ? 'owner' : null));
        let hash = existed.passwordHash;
        if (body.password != null && String(body.password).length > 0) {
            if (String(body.password).length < 6)
                throw new common_1.BadRequestException('密码至少 6 位');
            hash = await bcrypt.hash(String(body.password), 10);
        }
        await this.prisma.$executeRawUnsafe(
            `UPDATE "ConsoleAccount" SET name=$1, status=$2, "mpRole"=$3, "mpAccess"=$4, "merchantAccess"=$5, "enterpriseId"=$6, "passwordHash"=$7, "merchantRoleId"=$8, "updatedAt"=NOW() WHERE id=$9`,
            name, status, role, mpAccess, merchantAccess, enterpriseId, hash, merchantRoleId, id
        );
        await this.writeOpLog(actor, { module: 'settings', action: 'update', targetType: 'ConsoleAccount', targetId: id, targetLabel: name, summary: '修改控制台账号 ' + name, detail: { mpRole: role, status } });
        const next = await this.prisma.$queryRawUnsafe(`SELECT a.*, e.name AS "enterpriseName" FROM "ConsoleAccount" a LEFT JOIN "Enterprise" e ON e.id = a."enterpriseId" WHERE a.id = $1`, id);
        return this.serializeConsoleOperator(next[0]);
    }

    merchantPermissionOptions() {
        return [
            {
                value: 'overview', label: '总览', group: '总览',
                children: [
                    { value: 'overview.read', label: '首页' },
                    { value: 'logs.read', label: '操作日志' },
                ],
            },
            {
                value: 'study', label: '研学项目', group: '研学',
                children: [
                    { value: 'study.read', label: '查看研学' },
                    { value: 'study.manage', label: '管理研学' },
                    { value: 'study.projects', label: '项目列表' },
                    { value: 'study.submit', label: '上架项目' },
                    { value: 'study.notices', label: '资讯' },
                ],
            },
            {
                value: 'mall', label: '文创商城', group: '文创',
                children: [
                    { value: 'mall.read', label: '查看商品' },
                    { value: 'mall.manage', label: '管理商品' },
                    { value: 'mall.orders', label: '项目订单' },
                ],
            },
            {
                value: 'orders', label: '履约财务', group: '履约',
                children: [
                    { value: 'orders.read', label: '查看订单与财务' },
                    { value: 'orders.manage', label: '处理订单与提现' },
                    { value: 'orders.bookings', label: '预约' },
                    { value: 'finance.read', label: '企业流水' },
                    { value: 'finance.withdraw', label: '提现申请' },
                ],
            },
            {
                value: 'staff', label: '权限', group: '权限',
                children: [
                    { value: 'staff.manage', label: '职位与管理账号' },
                ],
            },
            {
                value: 'project', label: '项目事务', group: '项目',
                children: [
                    { value: 'project.live', label: '研学 Live' },
                    { value: 'project.live.read', label: 'Live 只读' },
                    { value: 'project.live.write', label: 'Live 写入' },
                    { value: 'project.bookings', label: '项目预约' },
                    { value: 'project.checkin', label: '核销打卡' },
                    { value: 'project.cert', label: '结业证书' },
                    { value: 'project.mall', label: '项目商城' },
                    { value: 'project.resources', label: '研学资源' },
                    { value: 'project.edit', label: '项目编辑' },
                    { value: 'project.owners', label: '项目负责人' },
                ],
            },
        ];
    }
    merchantCoarseExpand() {
        return {
            'overview.read': ['overview.read', 'logs.read'],
            'logs.read': ['logs.read'],
            'study.read': ['study.read', 'study.projects', 'study.notices'],
            'study.manage': ['study.read', 'study.manage', 'study.projects', 'study.submit', 'study.notices'],
            'mall.read': ['mall.read'],
            'mall.manage': ['mall.read', 'mall.manage'],
            'orders.read': ['orders.read', 'orders.bookings', 'finance.read', 'mall.orders'],
            'orders.manage': ['orders.read', 'orders.manage', 'orders.bookings', 'finance.read', 'finance.withdraw', 'mall.orders'],
            'staff.manage': ['staff.manage'],
            'project.live': ['project.live', 'project.live.read', 'project.live.write'],
            'project.live.read': ['project.live.read'],
            'project.live.write': ['project.live.write', 'project.live.read'],
            'project.bookings': ['project.bookings'],
            'project.checkin': ['project.checkin'],
            'project.cert': ['project.cert'],
            'project.mall': ['project.mall'],
            'project.resources': ['project.resources'],
            'project.edit': ['project.edit'],
            'project.owners': ['project.owners'],
        };
    }
    flattenMerchantPermissionOptions() {
        const opts = this.merchantPermissionOptions();
        const out = [];
        for (let i = 0; i < opts.length; i++) {
            const row = opts[i] || {};
            const kids = Array.isArray(row.children) ? row.children : [];
            if (kids.length) {
                for (let j = 0; j < kids.length; j++) {
                    const c = kids[j] || {};
                    out.push({
                        value: String(c.value || '').trim(),
                        label: String(c.label || c.value || '').trim(),
                        group: String(row.group || row.label || '其他'),
                        parent: String(row.value || ''),
                        parentLabel: String(row.label || row.value || ''),
                    });
                }
            }
            else if (row.value) {
                out.push({
                    value: String(row.value).trim(),
                    label: String(row.label || row.value).trim(),
                    group: String(row.group || '其他'),
                    parent: '',
                    parentLabel: '',
                });
            }
        }
        return out.filter((x) => x.value);
    }
    allMerchantPermissions() {
        return this.flattenMerchantPermissionOptions().map((item) => item.value);
    }
    expandMerchantPermissions(value) {
        const allow = new Set(this.allMerchantPermissions());
        const expand = this.merchantCoarseExpand();
        const opts = this.merchantPermissionOptions();
        const raw = Array.isArray(value) ? value : [];
        const out = [];
        for (let i = 0; i < raw.length; i++) {
            const key = String(raw[i] || '').trim();
            if (!key) continue;
            if (expand[key]) {
                const kids = expand[key];
                for (let j = 0; j < kids.length; j++) {
                    if (allow.has(kids[j]) && out.indexOf(kids[j]) < 0) out.push(kids[j]);
                }
                continue;
            }
            if (allow.has(key) && out.indexOf(key) < 0) {
                out.push(key);
                continue;
            }
            const mod = opts.find((m) => m.value === key);
            if (mod && Array.isArray(mod.children)) {
                for (let j = 0; j < mod.children.length; j++) {
                    const child = String(mod.children[j].value || '').trim();
                    if (allow.has(child) && out.indexOf(child) < 0) out.push(child);
                }
            }
        }
        return out;
    }
    normalizeMerchantPermissions(value) {
        const out = this.expandMerchantPermissions(value);
        if (out.indexOf('overview.read') < 0)
            out.unshift('overview.read');
        return out;
    }
    normalizeProjectIds(value) {
        const raw = Array.isArray(value) ? value : [];
        const out = [];
        for (let i = 0; i < raw.length; i++) {
            const id = String(raw[i] || '').trim();
            if (id && out.indexOf(id) < 0)
                out.push(id);
        }
        return out;
    }
    normalizeEnterpriseIds(value) {
        const raw = Array.isArray(value) ? value : [];
        const out = [];
        for (let i = 0; i < raw.length; i++) {
            const id = String(raw[i] || '').trim();
            if (id && out.indexOf(id) < 0)
                out.push(id);
        }
        return out;
    }
    roleProjectIdsOf(roles, roleId) {
        const id = String(roleId || '').trim();
        if (!id)
            return [];
        const hit = (roles || []).find((r) => r.id === id);
        if (!hit || hit.locked)
            return [];
        return this.normalizeProjectIds(hit.projectIds);
    }
    defaultStaffRoles() {
        const all = this.allMerchantPermissions();
        return [
            { id: 'owner', name: '企业管理员', locked: true, permissions: all, projectIds: [] },
            { id: 'study', name: '研学运营', locked: false, permissions: this.normalizeMerchantPermissions(['overview.read', 'study.manage', 'orders.read']), projectIds: [] },
            { id: 'mall', name: '文创运营', locked: false, permissions: this.normalizeMerchantPermissions(['overview.read', 'mall.manage', 'orders.read']), projectIds: [] },
            { id: 'finance', name: '财务', locked: false, permissions: this.normalizeMerchantPermissions(['overview.read', 'orders.manage']), projectIds: [] },
            { id: 'viewer', name: '只读', locked: false, permissions: this.normalizeMerchantPermissions(['overview.read', 'study.read', 'mall.read', 'orders.read']), projectIds: [] },
        ];
    }
    async ensureStaffSchema() {
        if (this._staffSchema)
            return;
        try {
            await this.prisma.$executeRawUnsafe(`ALTER TABLE "Enterprise" ADD COLUMN IF NOT EXISTS "staffRoles" JSONB`);
        }
        catch (_err) { }
        try {
            await this.prisma.$executeRawUnsafe(`ALTER TABLE "ConsoleAccount" ADD COLUMN IF NOT EXISTS "merchantRoleId" TEXT`);
        }
        catch (_err2) { }
        this._staffSchema = true;
    }
    parseStaffRoles(raw) {
        let parsed = raw;
        if (typeof parsed === 'string') {
            try {
                parsed = JSON.parse(parsed);
            }
            catch (_err) {
                parsed = null;
            }
        }
        if (!Array.isArray(parsed) || !parsed.length)
            return this.defaultStaffRoles();
        const out = [];
        const seen = {};
        for (let i = 0; i < parsed.length; i++) {
            const row = parsed[i] || {};
            const id = String(row.id || '').trim() || ('role' + Date.now().toString(36) + i);
            if (seen[id])
                continue;
            seen[id] = true;
            const locked = id === 'owner' || !!row.locked;
            const projectIds = locked ? [] : this.normalizeProjectIds(row.projectIds);
            out.push({
                id,
                name: String(row.name || '').trim() || '未命名职位',
                locked,
                permissions: locked ? this.allMerchantPermissions() : this.normalizeMerchantPermissions(row.permissions),
                projectIds,
            });
        }
        if (!out.some((r) => r.id === 'owner'))
            out.unshift(this.defaultStaffRoles()[0]);
        return out;
    }
    async readStaffRoles(enterpriseId) {
        await this.ensureStaffSchema();
        const rows = await this.prisma.$queryRawUnsafe(`SELECT "staffRoles" FROM "Enterprise" WHERE id=$1`, enterpriseId);
        const raw = rows && rows[0] ? rows[0].staffRoles : null;
        const roles = this.parseStaffRoles(raw);
        if (!raw)
            await this.writeStaffRoles(enterpriseId, roles);
        return roles;
    }
    async writeStaffRoles(enterpriseId, roles) {
        await this.ensureStaffSchema();
        const next = this.parseStaffRoles(roles);
        await this.prisma.$executeRawUnsafe(`UPDATE "Enterprise" SET "staffRoles"=$1::jsonb, "updatedAt"=NOW() WHERE id=$2`, JSON.stringify(next), enterpriseId);
        return next;
    }
    rolePermissionsOf(roles, roleId) {
        const id = String(roleId || '').trim();
        if (!id)
            return this.allMerchantPermissions();
        const hit = (roles || []).find((r) => r.id === id);
        if (!hit)
            return this.allMerchantPermissions();
        return this.normalizeMerchantPermissions(hit.permissions);
    }
    assertCanManageStaff(actor, enterpriseId) {
        const id = String(enterpriseId || '').trim();
        if (!id)
            throw new common_1.BadRequestException('缺少企业');
        if (actor && actor.mpAccess)
            return id;
        if (actor && actor.merchantAccess) {
            if (String(actor.enterpriseId || '') !== id)
                throw new common_1.ForbiddenException('只能管理本企业账号');
            const perms = actor.adminPermissions || [];
            if (perms.indexOf('staff.manage') < 0)
                throw new common_1.ForbiddenException('当前职位不能管理职位和账号');
            return id;
        }
        throw new common_1.ForbiddenException('没有权限');
    }
    async listEnterpriseStaff(enterpriseId, actor) {
        const id = this.assertCanManageStaff(actor, enterpriseId);
        await this.ensureStaffSchema();
        const existed = await this.prisma.$queryRawUnsafe(`SELECT id, name FROM "Enterprise" WHERE id=$1`, id);
        if (!existed || !existed.length)
            throw new common_1.NotFoundException('企业不存在');
        const roles = await this.readStaffRoles(id);
        const rows = await this.prisma.$queryRawUnsafe(`SELECT id, phone, name, status, "mpAccess", "mpRole", "merchantAccess", "enterpriseId", "merchantRoleId", "createdAt", "updatedAt"
             FROM "ConsoleAccount" WHERE "enterpriseId"=$1 ORDER BY "createdAt" DESC`, id);
        const items = (rows || []).map((row) => {
            const packed = this.serializeConsoleOperator(row);
            const roleId = String(row.merchantRoleId || '') || (packed.mpAccess ? '' : 'owner');
            const role = roles.find((r) => r.id === roleId);
            packed.merchantRoleId = roleId;
            packed.merchantRoleName = role ? role.name : (roleId ? roleId : '—');
            packed.merchantPermissions = this.rolePermissionsOf(roles, roleId);
            packed.merchantProjectIds = this.roleProjectIdsOf(roles, roleId);
            return packed;
        });
        return { roles, permissionOptions: this.merchantPermissionOptions(), items };
    }
    async saveEnterpriseRoles(enterpriseId, body, actor) {
        const id = this.assertCanManageStaff(actor, enterpriseId);
        const incoming = Array.isArray(body && body.roles) ? body.roles : [];
        if (!incoming.length)
            throw new common_1.BadRequestException('至少保留一个职位');
        const current = await this.readStaffRoles(id);
        const used = await this.prisma.$queryRawUnsafe(`SELECT DISTINCT "merchantRoleId" AS id FROM "ConsoleAccount" WHERE "enterpriseId"=$1 AND "merchantRoleId" IS NOT NULL`, id);
        const usedIds = new Set((used || []).map((r) => String(r.id || '')));
        const next = this.parseStaffRoles(incoming);
        for (let i = 0; i < current.length; i++) {
            if (usedIds.has(current[i].id) && !next.some((r) => r.id === current[i].id))
                throw new common_1.BadRequestException('职位「' + current[i].name + '」仍有账号在用，不能删除');
        }
        const roles = await this.writeStaffRoles(id, next);
        await this.writeOpLog(actor, { module: 'settings', action: 'update', targetType: 'Enterprise', targetId: id, targetLabel: '企业职位', summary: '更新企业职位', detail: { count: roles.length } });
        return { roles, permissionOptions: this.merchantPermissionOptions() };
    }
    async createEnterpriseStaff(enterpriseId, body, actor) {
        const id = this.assertCanManageStaff(actor, enterpriseId);
        await this.ensureStaffSchema();
        const phone = String((body && body.phone) || '').replace(/[^0-9]/g, '');
        const password = String((body && body.password) || '');
        const name = String((body && body.name) || '').trim();
        const roleId = String((body && body.roleId) || '').trim();
        if (!/^1\d{10}$/.test(phone))
            throw new common_1.BadRequestException('请输入11位手机号');
        if (password.length < 6)
            throw new common_1.BadRequestException('密码至少 6 位');
        const roles = await this.readStaffRoles(id);
        if (!roles.some((r) => r.id === roleId))
            throw new common_1.BadRequestException('请选择职位');
        const existed = await this.prisma.$queryRawUnsafe(`SELECT id FROM "ConsoleAccount" WHERE phone = $1 LIMIT 1`, phone);
        if (existed && existed.length)
            throw new common_1.BadRequestException('该手机号已有控制台账号');
        const hash = await bcrypt.hash(password, 10);
        const accId = 'cns' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
        await this.prisma.$executeRawUnsafe(
            `INSERT INTO "ConsoleAccount" (id, phone, "passwordHash", name, status, "mpAccess", "mpRole", "merchantAccess", "enterpriseId", "merchantRoleId", "createdAt", "updatedAt")
             VALUES ($1,$2,$3,$4,'ACTIVE',FALSE,'NONE',TRUE,$5,$6,NOW(),NOW())`,
            accId, phone, hash, name || phone, id, roleId
        );
        await this.writeOpLog(actor, { module: 'settings', action: 'create', targetType: 'ConsoleAccount', targetId: accId, targetLabel: name || phone, summary: '新增企业管理员 ' + (name || phone), detail: { phone, roleId } });
        const board = await this.listEnterpriseStaff(id, actor);
        return board.items.find((x) => x.id === accId) || board;
    }
    async updateEnterpriseStaff(enterpriseId, accountId, body, actor) {
        const id = this.assertCanManageStaff(actor, enterpriseId);
        await this.ensureStaffSchema();
        const rows = await this.prisma.$queryRawUnsafe(`SELECT * FROM "ConsoleAccount" WHERE id=$1 LIMIT 1`, accountId);
        if (!rows || !rows.length)
            throw new common_1.NotFoundException('账号不存在');
        const existed = rows[0];
        if (String(existed.enterpriseId || '') !== id)
            throw new common_1.ForbiddenException('只能管理本企业账号');
        if (existed.mpAccess && actor && actor.merchantAccess)
            throw new common_1.ForbiddenException('平台运维账号请在系统设置里改');
        const name = body.name != null ? String(body.name).trim() : existed.name;
        const status = body.status != null ? String(body.status).trim() : existed.status;
        let roleId = body.roleId != null ? String(body.roleId).trim() : String(existed.merchantRoleId || 'owner');
        const roles = await this.readStaffRoles(id);
        if (!roles.some((r) => r.id === roleId))
            throw new common_1.BadRequestException('请选择职位');
        if (status !== 'ACTIVE' || this.rolePermissionsOf(roles, roleId).indexOf('staff.manage') < 0) {
            const others = await this.prisma.$queryRawUnsafe(`SELECT id, "merchantRoleId", status FROM "ConsoleAccount" WHERE "enterpriseId"=$1 AND id<>$2 AND status='ACTIVE'`, id, accountId);
            const keep = (others || []).some((row) => this.rolePermissionsOf(roles, row.merchantRoleId).indexOf('staff.manage') >= 0);
            if (!keep)
                throw new common_1.BadRequestException('至少保留一个能管理职位的企业管理员');
        }
        let hash = existed.passwordHash;
        if (body.password != null && String(body.password).length > 0) {
            if (String(body.password).length < 6)
                throw new common_1.BadRequestException('密码至少 6 位');
            hash = await bcrypt.hash(String(body.password), 10);
        }
        await this.prisma.$executeRawUnsafe(
            `UPDATE "ConsoleAccount" SET name=$1, status=$2, "merchantRoleId"=$3, "passwordHash"=$4, "updatedAt"=NOW() WHERE id=$5`,
            name, status, roleId, hash, accountId
        );
        await this.writeOpLog(actor, { module: 'settings', action: 'update', targetType: 'ConsoleAccount', targetId: accountId, targetLabel: name, summary: '修改企业管理员 ' + name, detail: { roleId, status } });
        const board = await this.listEnterpriseStaff(id, actor);
        return board.items.find((x) => x.id === accountId) || board;
    }
    async deleteEnterpriseStaff(enterpriseId, accountId, actor) {
        const id = this.assertCanManageStaff(actor, enterpriseId);
        await this.ensureStaffSchema();
        const rows = await this.prisma.$queryRawUnsafe(`SELECT * FROM "ConsoleAccount" WHERE id=$1 LIMIT 1`, accountId);
        if (!rows || !rows.length)
            throw new common_1.NotFoundException('账号不存在');
        const existed = rows[0];
        if (String(existed.enterpriseId || '') !== id)
            throw new common_1.ForbiddenException('只能管理本企业账号');
        if (existed.mpAccess && actor && actor.merchantAccess)
            throw new common_1.ForbiddenException('平台运维账号请在系统设置里改');
        if (String(actor && actor.actorId || '') === String(accountId))
            throw new common_1.BadRequestException('不能删除当前登录账号');
        const roles = await this.readStaffRoles(id);
        const others = await this.prisma.$queryRawUnsafe(`SELECT id, "merchantRoleId", status FROM "ConsoleAccount" WHERE "enterpriseId"=$1 AND id<>$2 AND status='ACTIVE'`, id, accountId);
        const keep = (others || []).some((row) => this.rolePermissionsOf(roles, row.merchantRoleId).indexOf('staff.manage') >= 0);
        if (!keep && this.rolePermissionsOf(roles, existed.merchantRoleId).indexOf('staff.manage') >= 0)
            throw new common_1.BadRequestException('至少保留一个能管理职位的企业管理员');
        await this.prisma.$executeRawUnsafe(`DELETE FROM "ConsoleAccount" WHERE id=$1`, accountId);
        await this.writeOpLog(actor, { module: 'settings', action: 'delete', targetType: 'ConsoleAccount', targetId: accountId, targetLabel: existed.name || existed.phone, summary: '删除企业管理员 ' + (existed.name || existed.phone) });
        return { id: accountId, deleted: true };
    }
    async deleteEnterpriseStaffs(enterpriseId, ids, actor) {
        const list = Array.isArray(ids) ? ids.map((x) => String(x || '').trim()).filter(Boolean) : [];
        let deleted = 0;
        for (let i = 0; i < list.length; i++) {
            try {
                await this.deleteEnterpriseStaff(enterpriseId, list[i], actor);
                deleted += 1;
            }
            catch (_err) { }
        }
        return { deleted };
    }

    vehicleTypeOfSeats(seats) {
        const n = Number(seats) || 7;
        if (n <= 7) return 'van7';
        if (n <= 9) return 'mpv9';
        if (n <= 14) return 'bus14';
        return 'bus20';
    }
    vehicleNameOfType(type) {
        if (type === 'mpv9') return '9座轻客';
        if (type === 'bus14') return '14座中巴';
        if (type === 'bus20') return '20座大巴';
        return '7座商务';
    }
    normalizeCityName(name) {
        return String(name || '').trim().replace(/市$/, '');
    }
    driverStatusLabel(s) {
        if (s === 'ONLINE') return '出车中';
        if (s === 'BUSY') return '服务中';
        return '收车';
    }
    jobStatusLabel(s) {
        const map = {
            OPEN: '待抢单', OFFERED: '待司机确认', ACCEPTED: '已接单',
            EN_ROUTE: '前往上车点', ARRIVED: '已到达', IN_TRIP: '行程中',
            COMPLETED: '已完成', CANCELLED: '已取消',
        };
        return map[s] || s;
    }
    async ensureDriverCommissionColumn() {
        if (this._drvCommissionCol)
            return;
        try {
            await this.prisma.$executeRawUnsafe(`ALTER TABLE "DriverProfile" ADD COLUMN IF NOT EXISTS "commissionRate" DECIMAL(5,2)`);
        }
        catch (_err) { }
        this._drvCommissionCol = true;
    }
    async overlayDriverCommission(rows) {
        const list = rows || [];
        if (!list.length)
            return list;
        await this.ensureDriverCommissionColumn();
        try {
            const extra = await this.prisma.$queryRawUnsafe(`SELECT id, "commissionRate" FROM "DriverProfile"`);
            const map = {};
            for (let i = 0; extra && i < extra.length; i++)
                map[String(extra[i].id)] = extra[i];
            for (let i = 0; i < list.length; i++) {
                const hit = map[String(list[i].id)];
                list[i].commissionRate = hit && hit.commissionRate != null ? this.toMoney(hit.commissionRate) : null;
            }
        }
        catch (_err) { }
        return list;
    }
    async saveDriverCommissionRate(id, value) {
        await this.ensureDriverCommissionColumn();
        if (value === null || value === undefined || value === '') {
            await this.prisma.$executeRawUnsafe(`UPDATE "DriverProfile" SET "commissionRate" = NULL WHERE id=$1`, id);
            return;
        }
        const n = Math.min(100, Math.max(0, this.toMoney(value)));
        await this.prisma.$executeRawUnsafe(`UPDATE "DriverProfile" SET "commissionRate"=$1 WHERE id=$2`, n, id);
    }
    async platformDriverCommission() {
        try {
            const map = await this.loadSettingMap();
            return Math.min(100, Math.max(0, this.toMoney(map['feature.driverCommission'])));
        }
        catch (_err) {
            return 0;
        }
    }
    async driverCommissionRateOf(driverId) {
        await this.ensureDriverCommissionColumn();
        try {
            const rows = await this.prisma.$queryRawUnsafe(`SELECT "commissionRate" FROM "DriverProfile" WHERE id=$1`, driverId);
            if (rows && rows[0] && rows[0].commissionRate != null)
                return this.toMoney(rows[0].commissionRate);
        }
        catch (_err) { }
        return this.platformDriverCommission();
    }
    async ensureDriverWalletCreditedColumn() {
        if (this._drvWalletCreditedCol)
            return;
        try {
            await this.prisma.$executeRawUnsafe(`ALTER TABLE "DriverJob" ADD COLUMN IF NOT EXISTS "walletCreditedAt" TIMESTAMP`);
        }
        catch (_err) { }
        this._drvWalletCreditedCol = true;
    }
    /** P0-4: single completion credit — net after commission; idempotent via walletCreditedAt */
    async creditDriverJobCompletion(driverId, job) {
        const gross = this.toMoney(job && job.price);
        const rate = driverId ? await this.driverCommissionRateOf(driverId) : 0;
        const net = this.toMoney(gross * (100 - rate) / 100);
        if (!driverId || !job || !job.id)
            return { gross, rate, net, credited: false };
        await this.ensureDriverWalletCreditedColumn();
        try {
            const rows = await this.prisma.$queryRawUnsafe(`SELECT "walletCreditedAt" FROM "DriverJob" WHERE id=$1`, job.id);
            if (rows && rows[0] && rows[0].walletCreditedAt)
                return { gross, rate, net, credited: false };
        }
        catch (_err) { }
        if (net > 0) {
            try {
                await this.prisma.$executeRawUnsafe(
                    `UPDATE "DriverProfile" SET "availableBalance" = COALESCE("availableBalance",0) + $1, "updatedAt"=NOW() WHERE id=$2`,
                    net, driverId
                );
            }
            catch (_err) { }
        }
        try {
            await this.prisma.$executeRawUnsafe(
                `UPDATE "DriverJob" SET "walletCreditedAt"=NOW() WHERE id=$1 AND "walletCreditedAt" IS NULL`,
                job.id
            );
        }
        catch (_err) { }
        return { gross, rate, net, credited: true };
    }
    async overlayDriverExtras(rows) {
        const list = rows || [];
        if (!list.length) return list;
        try {
            const extra = await this.prisma.$queryRawUnsafe(`SELECT id, city, "availableBalance", "pendingAmount", "withdrawnAmount", "baseLatitude", "baseLongitude" FROM "DriverProfile"`);
            const map = {};
            for (let i = 0; extra && i < extra.length; i++) map[extra[i].id] = extra[i];
            for (let i = 0; i < list.length; i++) {
                const hit = map[list[i].id];
                if (!hit) continue;
                list[i].city = String(hit.city || '');
                list[i].availableBalance = Number(hit.availableBalance || 0);
                list[i].pendingAmount = Number(hit.pendingAmount || 0);
                list[i].withdrawnAmount = Number(hit.withdrawnAmount || 0);
                list[i].baseLatitude = hit.baseLatitude != null ? Number(hit.baseLatitude) : null;
                list[i].baseLongitude = hit.baseLongitude != null ? Number(hit.baseLongitude) : null;
            }
        }
        catch (_e) { }
        return list;
    }
    serializeAdminDriver(d) {
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
            baseLatitude: d.baseLatitude != null ? Number(d.baseLatitude) : null,
            baseLongitude: d.baseLongitude != null ? Number(d.baseLongitude) : null,
            commissionRate: d.commissionRate != null && d.commissionRate !== '' ? this.toMoney(d.commissionRate) : null,
            status: d.status === 'LEAVE' ? 'OFFLINE' : d.status,
            statusLabel: this.driverStatusLabel(d.status === 'LEAVE' ? 'OFFLINE' : d.status),
            acceptOrders: d.acceptOrders === true,
            ratingAvg: Number(d.ratingAvg || 5),
            completedJobs: d.completedJobs || 0,
            todayIncome: Number(d.todayIncome || 0),
            totalIncome: Number(d.totalIncome || 0),
            availableBalance: Number(d.availableBalance != null ? d.availableBalance : d.totalIncome || 0),
            pendingAmount: Number(d.pendingAmount || 0),
            withdrawnAmount: Number(d.withdrawnAmount || 0),
            userNickname: (d.user && d.user.nickname) || '',
            studyNo: (d.user && d.user.studyNo) || '',
            createdAt: d.createdAt,
            updatedAt: d.updatedAt,
        };
    }
    serializeAdminJob(j) {
        return {
            id: j.id,
            jobNo: j.jobNo,
            status: j.status,
            statusLabel: this.jobStatusLabel(j.status),
            vehicleType: j.vehicleType,
            price: Number(j.price || 0),
            passengerCount: j.passengerCount,
            passengerName: j.passengerName || '',
            passengerPhone: j.passengerPhone || '',
            pickupAddress: j.pickupAddress || '',
            dropoffAddress: j.dropoffAddress || '',
            note: j.note || '',
            projectId: j.projectId || '',
            bookingId: j.bookingId || '',
            driverId: j.driverId || '',
            driverName: (j.driver && j.driver.realName) || '',
            driverPhone: (j.driver && j.driver.phone) || '',
            plateNo: (j.driver && j.driver.plateNo) || '',
            createdAt: j.createdAt,
            acceptedAt: j.acceptedAt,
            completedAt: j.completedAt,
            cancelledAt: j.cancelledAt,
        };
    }
    async listDrivers(keyword, status, city, page, pageSize) {
        const parsed = this.parsePage({ page, pageSize }, 20);
        const search = String(keyword || '').trim();
        const st = String(status || '').trim().toUpperCase();
        const cityName = String(city || '').trim().replace(/市$/, '');
        const where = {};
        if (st && st !== 'ALL') where.status = st;
        if (search) {
            where.OR = [
                { realName: { contains: search } },
                { phone: { contains: search } },
                { plateNo: { contains: search } },
            ];
        }
        try {
            await this.prisma.driverProfile.updateMany({ where: { status: 'LEAVE' }, data: { status: 'OFFLINE' } });
        }
        catch (_err) { }
        if (st === 'LEAVE')
            where.status = 'OFFLINE';
        const [rows, total, online, busy, offline] = await Promise.all([
            this.prisma.driverProfile.findMany({
                where,
                include: { user: true },
                orderBy: { updatedAt: 'desc' },
                skip: parsed.skip,
                take: parsed.pageSize,
            }),
            this.prisma.driverProfile.count({ where }),
            this.prisma.driverProfile.count({ where: { status: 'ONLINE' } }),
            this.prisma.driverProfile.count({ where: { status: 'BUSY' } }),
            this.prisma.driverProfile.count({ where: { status: { in: ['OFFLINE', 'LEAVE'] } } }),
        ]);
        await this.overlayDriverExtras(rows);
        await this.overlayDriverCommission(rows);
        let items = rows.map((d) => this.serializeAdminDriver(d));
        if (cityName) items = items.filter((d) => String(d.city || '').replace(/市$/, '') === cityName);
        return {
            items,
            total: cityName ? items.length : total,
            page: parsed.page,
            pageSize: parsed.pageSize,
            stats: { total, online, busy, offline },
        };
    }
    async createDriver(body, actor) {
        const phone = String((body && body.phone) || '').replace(/[^0-9]/g, '');
        if (!/^1\d{10}$/.test(phone)) throw new common_1.BadRequestException('请输入司机绑定的11位手机号');
        const user = await this.prisma.user.findFirst({ where: { phone } });
        if (!user) throw new common_1.NotFoundException('请先让司机用该手机号登录小程序');
        const existed = await this.prisma.driverProfile.findUnique({ where: { userId: user.id } });
        if (existed) throw new common_1.BadRequestException('该账号已是司机');
        const seatCount = Math.max(2, Number(body.seatCount || 7) || 7);
        const vehicleType = String(body.vehicleType || this.vehicleTypeOfSeats(seatCount) || 'van7').trim() || 'van7';
        const providedName = String((body && body.vehicleName) || '').trim();
        const vehicleName = providedName || this.vehicleNameOfType(vehicleType);
        const row = await this.prisma.driverProfile.create({
            data: {
                userId: user.id,
                realName: String(body.realName || user.realName || user.nickname || '司机').trim(),
                phone,
                wechat: String(body.wechat || '').trim() || null,
                vehicleType,
                vehicleName,
                plateNo: String(body.plateNo || '').trim() || '待填写',
                seatCount,
                basePrice: body.basePrice == null || body.basePrice === '' ? 0 : (Number(body.basePrice) || 0),
                status: String(body.status || 'OFFLINE').toUpperCase() === 'ONLINE' ? 'ONLINE' : 'OFFLINE',
                acceptOrders: body.acceptOrders !== false,
            },
            include: { user: true },
        });
        const city = this.normalizeCityName(body && body.city);
        const lat = body && body.baseLatitude != null ? Number(body.baseLatitude) : null;
        const lng = body && body.baseLongitude != null ? Number(body.baseLongitude) : null;
        if (city || (lat != null && Number.isFinite(lat) && lng != null && Number.isFinite(lng))) {
            try {
                if (city && lat != null && Number.isFinite(lat) && lng != null && Number.isFinite(lng)) {
                    await this.prisma.$executeRawUnsafe(
                        `UPDATE "DriverProfile" SET city=$1, "baseLatitude"=$2, "baseLongitude"=$3, "lastLatitude"=$2, "lastLongitude"=$3 WHERE id=$4`,
                        city, lat, lng, row.id
                    );
                    row.baseLatitude = lat;
                    row.baseLongitude = lng;
                } else if (city) {
                    await this.prisma.$executeRawUnsafe(`UPDATE "DriverProfile" SET city=$1 WHERE id=$2`, city, row.id);
                } else {
                    await this.prisma.$executeRawUnsafe(
                        `UPDATE "DriverProfile" SET "baseLatitude"=$1, "baseLongitude"=$2, "lastLatitude"=$1, "lastLongitude"=$2 WHERE id=$3`,
                        lat, lng, row.id
                    );
                    row.baseLatitude = lat;
                    row.baseLongitude = lng;
                }
            } catch (_e) { }
            if (city) row.city = city;
        }
        await this.saveDriverCommissionRate(row.id, body && body.commissionRate);
        await this.overlayDriverCommission([row]);
        await this.writeOpLog(actor, { module: 'rental', action: 'create', targetType: 'DriverProfile', targetId: row.id, targetLabel: row.realName, summary: '新增司机 ' + row.realName, detail: { phone, plateNo: row.plateNo } });
        return this.serializeAdminDriver(row);
    }
    async updateDriver(id, body, actor) {
        const existed = await this.prisma.driverProfile.findUnique({ where: { id }, include: { user: true } });
        if (!existed) throw new common_1.NotFoundException('司机不存在');
        const data = {};
        if (body.realName != null) data.realName = String(body.realName).trim();
        if (body.phone != null) data.phone = String(body.phone).trim();
        if (body.wechat != null) data.wechat = String(body.wechat).trim();
        if (body.seatCount != null) data.seatCount = Math.max(2, Number(body.seatCount) || existed.seatCount);
        // Prefer explicit vehicleName model string; do not overwrite with category label
        if (body.vehicleName != null) {
            const vn = String(body.vehicleName).trim();
            if (vn) data.vehicleName = vn;
        }
        if (body.vehicleType != null && String(body.vehicleType).trim()) {
            data.vehicleType = String(body.vehicleType).trim();
        } else if (body.seatCount != null) {
            data.vehicleType = this.vehicleTypeOfSeats(data.seatCount != null ? data.seatCount : existed.seatCount);
        }
        if (body.plateNo != null) data.plateNo = String(body.plateNo).trim();
        if (body.basePrice != null) data.basePrice = Number(body.basePrice) || 0;
        else if (Object.prototype.hasOwnProperty.call(body || {}, 'basePrice')) data.basePrice = 0;
        if (body.status != null) {
            const st = String(body.status).toUpperCase();
            if (['OFFLINE', 'ONLINE', 'BUSY'].indexOf(st) >= 0) data.status = st;
            else if (st === 'LEAVE') data.status = 'OFFLINE';
        }
        if (body.acceptOrders != null) data.acceptOrders = body.acceptOrders === true || body.acceptOrders === 'true';
        const row = await this.prisma.driverProfile.update({ where: { id }, data, include: { user: true } });
        if (body.city != null || body.baseLatitude != null || body.baseLongitude != null) {
            const city = body.city != null ? this.normalizeCityName(body.city) : null;
            const lat = body.baseLatitude != null ? Number(body.baseLatitude) : null;
            const lng = body.baseLongitude != null ? Number(body.baseLongitude) : null;
            try {
                if (city != null && lat != null && Number.isFinite(lat) && lng != null && Number.isFinite(lng)) {
                    await this.prisma.$executeRawUnsafe(
                        `UPDATE "DriverProfile" SET city=$1, "baseLatitude"=$2, "baseLongitude"=$3, "lastLatitude"=$2, "lastLongitude"=$3 WHERE id=$4`,
                        city, lat, lng, id
                    );
                    row.city = city;
                    row.baseLatitude = lat;
                    row.baseLongitude = lng;
                } else if (city != null) {
                    await this.prisma.$executeRawUnsafe(`UPDATE "DriverProfile" SET city=$1 WHERE id=$2`, city, id);
                    row.city = city;
                } else if (lat != null && Number.isFinite(lat) && lng != null && Number.isFinite(lng)) {
                    await this.prisma.$executeRawUnsafe(
                        `UPDATE "DriverProfile" SET "baseLatitude"=$1, "baseLongitude"=$2, "lastLatitude"=$1, "lastLongitude"=$2 WHERE id=$3`,
                        lat, lng, id
                    );
                    row.baseLatitude = lat;
                    row.baseLongitude = lng;
                }
            } catch (_e) { }
        }
        if (Object.prototype.hasOwnProperty.call(body || {}, 'commissionRate'))
            await this.saveDriverCommissionRate(id, body.commissionRate);
        await this.overlayDriverExtras([row]);
        await this.overlayDriverCommission([row]);
        await this.writeOpLog(actor, { module: 'rental', action: 'update', targetType: 'DriverProfile', targetId: id, targetLabel: row.realName, summary: '修改司机 ' + row.realName, detail: { status: row.status } });
        return this.serializeAdminDriver(row);
    }
    async deleteDriver(id, actor) {
        const existed = await this.prisma.driverProfile.findUnique({ where: { id } });
        if (!existed) throw new common_1.NotFoundException('司机不存在');
        const active = await this.prisma.driverJob.count({
            where: { driverId: id, status: { in: ['OFFERED', 'ACCEPTED', 'EN_ROUTE', 'ARRIVED', 'IN_TRIP'] } },
        });
        if (active > 0) throw new common_1.BadRequestException('该司机还有进行中的出车任务');
        await this.prisma.driverProfile.delete({ where: { id } });
        await this.writeOpLog(actor, { module: 'rental', action: 'delete', targetType: 'DriverProfile', targetId: id, targetLabel: existed.realName, summary: '删除司机 ' + existed.realName, detail: {} });
        return { ok: true, id };
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

    rentalOrderStatusLabel(s) {
        const map = { OPEN: '派单中', NEGOTIATING: '协商中', PRICE_CONFIRMED: '待支付', PAID: '已支付', EN_ROUTE: '出车中', ARRIVED: '已到达', IN_TRIP: '行程中', CANCELLED: '已取消', COMPLETED: '已完成' };
        return map[String(s || '').toUpperCase()] || s || '—';
    }

    async listRentalOrders(status, keyword, page, pageSize) {
        await this.ensureRentalOrderTable();
        const parsed = this.parsePage({ page, pageSize }, 20);
        const st = String(status || '').trim().toUpperCase();
        const search = String(keyword || '').trim();
        let whereSql = 'WHERE 1=1';
        const params = [];
        if (st && st !== 'ALL') {
            params.push(st);
            whereSql += ` AND status=$${params.length}`;
        }
        if (search) {
            params.push('%' + search + '%');
            const p = params.length;
            whereSql += ` AND ("orderNo" ILIKE $${p} OR "pickupAddress" ILIKE $${p} OR remark ILIKE $${p})`;
        }
        const countRows = await this.prisma.$queryRawUnsafe(
            `SELECT COUNT(*)::int AS c FROM "RentalOrder" ${whereSql}`, ...params
        );
        const total = (countRows && countRows[0] && countRows[0].c) || 0;
        params.push(parsed.pageSize);
        params.push(parsed.skip);
        const rows = await this.prisma.$queryRawUnsafe(
            `SELECT * FROM "RentalOrder" ${whereSql} ORDER BY "createdAt" DESC LIMIT $${params.length - 1} OFFSET $${params.length}`,
            ...params
        );
        const openC = await this.prisma.$queryRawUnsafe(`SELECT COUNT(*)::int AS c FROM "RentalOrder" WHERE status='OPEN'`);
        const negC = await this.prisma.$queryRawUnsafe(`SELECT COUNT(*)::int AS c FROM "RentalOrder" WHERE status='NEGOTIATING'`);
        const confC = await this.prisma.$queryRawUnsafe(`SELECT COUNT(*)::int AS c FROM "RentalOrder" WHERE status='PRICE_CONFIRMED'`);
        const paidC = await this.prisma.$queryRawUnsafe(`SELECT COUNT(*)::int AS c FROM "RentalOrder" WHERE status='PAID'`);
        const fulfillC = await this.prisma.$queryRawUnsafe(`SELECT COUNT(*)::int AS c FROM "RentalOrder" WHERE status IN ('EN_ROUTE','ARRIVED','IN_TRIP')`);
        const doneC = await this.prisma.$queryRawUnsafe(`SELECT COUNT(*)::int AS c FROM "RentalOrder" WHERE status='COMPLETED'`);
        const items = [];
        for (let i = 0; i < (rows || []).length; i++) {
            const r = rows[i];
            let projectTitle = '';
            let driverName = '';
            try {
                if (r.projectId) {
                    const p = await this.prisma.studyProject.findUnique({ where: { id: r.projectId }, select: { title: true } });
                    if (p) projectTitle = p.title || '';
                }
            } catch (_e) { }
            try {
                if (r.driverId) {
                    const d = await this.prisma.driverProfile.findUnique({ where: { id: r.driverId } });
                    if (d) driverName = d.realName || '';
                }
            } catch (_e) { }
            items.push({
                id: r.id,
                orderNo: r.orderNo,
                projectId: r.projectId,
                projectTitle,
                userId: r.userId,
                travelDateText: r.travelDate ? String(r.travelDate).slice(0, 10) : '',
                passengerCount: Number(r.passengerCount || 1),
                pickupAddress: r.pickupAddress || '',
                remark: r.remark || '',
                status: String(r.status || '').toUpperCase(),
                statusLabel: this.rentalOrderStatusLabel(r.status),
                driverId: r.driverId || null,
                driverName,
                refPrice: r.refPrice != null ? Number(r.refPrice) : null,
                offeredPrice: r.offeredPrice != null ? Number(r.offeredPrice) : null,
                agreedPrice: r.agreedPrice != null ? Number(r.agreedPrice) : null,
                priceConfirmedAt: r.priceConfirmedAt || null,
                paidAt: r.paidAt || null,
                claimedAt: r.claimedAt,
                createdAt: r.createdAt,
            });
        }
        return {
            items,
            total,
            page: parsed.page,
            pageSize: parsed.pageSize,
            stats: {
                open: (openC && openC[0] && openC[0].c) || 0,
                negotiating: (negC && negC[0] && negC[0].c) || 0,
                priceConfirmed: (confC && confC[0] && confC[0].c) || 0,
                paid: (paidC && paidC[0] && paidC[0].c) || 0,
                fulfilling: (fulfillC && fulfillC[0] && fulfillC[0].c) || 0,
                completed: (doneC && doneC[0] && doneC[0].c) || 0,
            },
        };
    }

    async listRentalOrderMessages(orderId) {
        await this.ensureRentalOrderTable();
        const id = String(orderId || '').trim();
        if (!id) throw new common_1.BadRequestException('缺少订单 id');
        const orders = await this.prisma.$queryRawUnsafe(`SELECT * FROM "RentalOrder" WHERE id=$1`, id);
        if (!orders || !orders[0]) throw new common_1.NotFoundException('租车单不存在');
        const rows = await this.prisma.$queryRawUnsafe(
            `SELECT * FROM "RentalChatMessage" WHERE "orderId"=$1 ORDER BY "createdAt" ASC LIMIT 300`, id
        );
        const labels = { user: '学员', driver: '司机', system: '系统' };
        return {
            order: {
                id: orders[0].id,
                orderNo: orders[0].orderNo,
                status: String(orders[0].status || '').toUpperCase(),
                statusLabel: this.rentalOrderStatusLabel(orders[0].status),
                offeredPrice: orders[0].offeredPrice != null ? Number(orders[0].offeredPrice) : null,
                agreedPrice: orders[0].agreedPrice != null ? Number(orders[0].agreedPrice) : null,
            },
            items: (rows || []).map((m) => ({
                id: m.id,
                senderType: m.senderType,
                senderTypeLabel: labels[m.senderType] || m.senderType,
                content: m.content || '',
                createdAt: m.createdAt,
                timeText: m.createdAt ? String(m.createdAt).slice(0, 16).replace('T', ' ') : '',
            })),
        };
    }

    async listDriverJobs(status, keyword, driverId, page, pageSize) {
        const parsed = this.parsePage({ page, pageSize }, 20);
        const st = String(status || '').trim().toUpperCase();
        const search = String(keyword || '').trim();
        const did = String(driverId || '').trim();
        const where = {};
        if (st && st !== 'ALL') {
            if (st === 'ACTIVE') where.status = { in: ['OFFERED', 'ACCEPTED', 'EN_ROUTE', 'ARRIVED', 'IN_TRIP'] };
            else if (st === 'TODAY') {
                const start = new Date();
                start.setHours(0, 0, 0, 0);
                where.createdAt = { gte: start };
            }
            else where.status = st;
        }
        if (did) where.driverId = did;
        if (search) {
            where.OR = [
                { jobNo: { contains: search } },
                { passengerName: { contains: search } },
                { passengerPhone: { contains: search } },
                { pickupAddress: { contains: search } },
            ];
        }
        const [rows, total, offered, active, completed, cancelled] = await Promise.all([
            this.prisma.driverJob.findMany({
                where,
                include: { driver: true },
                orderBy: { createdAt: 'desc' },
                skip: parsed.skip,
                take: parsed.pageSize,
            }),
            this.prisma.driverJob.count({ where }),
            this.prisma.driverJob.count({ where: { status: { in: ['OPEN', 'OFFERED'] } } }),
            this.prisma.driverJob.count({ where: { status: { in: ['ACCEPTED', 'EN_ROUTE', 'ARRIVED', 'IN_TRIP'] } } }),
            this.prisma.driverJob.count({ where: { status: 'COMPLETED' } }),
            this.prisma.driverJob.count({ where: { status: 'CANCELLED' } }),
        ]);
        return {
            items: rows.map((j) => this.serializeAdminJob(j)),
            total,
            page: parsed.page,
            pageSize: parsed.pageSize,
            stats: { offered, active, completed, cancelled },
        };
    }
    async updateDriverJob(id, body, actor) {
        const job = await this.prisma.driverJob.findUnique({ where: { id }, include: { driver: true } });
        if (!job) throw new common_1.NotFoundException('出车任务不存在');
        const data = {};
        const nextStatus = body.status != null ? String(body.status).toUpperCase() : '';
        if (nextStatus) {
            const allowed = ['OFFERED', 'ACCEPTED', 'EN_ROUTE', 'ARRIVED', 'IN_TRIP', 'COMPLETED', 'CANCELLED'];
            if (allowed.indexOf(nextStatus) < 0) throw new common_1.BadRequestException('非法状态');
            data.status = nextStatus;
            if (nextStatus === 'COMPLETED') data.completedAt = new Date();
            if (nextStatus === 'CANCELLED') {
                data.cancelledAt = new Date();
                data.cancelReason = String(body.reason || body.cancelReason || '管理员取消').slice(0, 200);
            }
            if (nextStatus === 'ACCEPTED' || nextStatus === 'EN_ROUTE') data.acceptedAt = job.acceptedAt || new Date();
        }
        if (body.price != null) data.price = Number(body.price) || 0;
        if (body.pickupAddress != null) data.pickupAddress = String(body.pickupAddress).trim();
        if (body.note != null) data.note = String(body.note).trim();
        if (body.driverId != null && String(body.driverId).trim()) {
            const driver = await this.prisma.driverProfile.findUnique({ where: { id: String(body.driverId).trim() } });
            if (!driver) throw new common_1.NotFoundException('司机不存在');
            data.driverId = driver.id;
            data.driverUserId = driver.userId;
            data.vehicleType = driver.vehicleType;
            if (!nextStatus) data.status = 'ACCEPTED';
            data.acceptedAt = new Date();
            if (job.bookingId) {
                try {
                    await this.prisma.studyBooking.update({
                        where: { id: job.bookingId },
                        data: {
                            rentalDriverId: driver.id,
                            rentalDriverName: driver.realName,
                            rentalDriverPhone: driver.phone,
                            rentalDriverWechat: driver.wechat,
                            rentalVehicleName: driver.vehicleName,
                            rentalPlateNo: driver.plateNo,
                            rentalOptionId: driver.vehicleType,
                            rentalFee: data.price != null ? data.price : job.price,
                        },
                    });
                }
                catch (_e) { }
            }
        }
        const wasCompleted = String(job.status || '') === 'COMPLETED';
        const updated = await this.prisma.driverJob.update({ where: { id }, data, include: { driver: true } });
        if (data.status === 'COMPLETED' && job.driverId && !wasCompleted) {
            try {
                const credit = await this.creditDriverJobCompletion(job.driverId, job);
                const profileData = { status: 'ONLINE' };
                if (credit.credited) {
                    profileData.completedJobs = { increment: 1 };
                    if (credit.net > 0) profileData.totalIncome = { increment: credit.net };
                }
                await this.prisma.driverProfile.update({ where: { id: job.driverId }, data: profileData });
            }
            catch (_e) { }
        }
        if (data.status === 'CANCELLED' && job.driverId) {
            try {
                await this.prisma.driverProfile.update({
                    where: { id: job.driverId },
                    data: { status: 'ONLINE' },
                });
            }
            catch (_e) { }
        }
        await this.writeOpLog(actor, { module: 'rental', action: 'update', targetType: 'DriverJob', targetId: id, targetLabel: job.jobNo, summary: '修改出车任务 ' + job.jobNo, detail: { status: updated.status } });
        return this.serializeAdminJob(updated);
    }
    async deleteDriverJob(id, actor) {
        const job = await this.prisma.driverJob.findUnique({ where: { id } });
        if (!job)
            throw new common_1.NotFoundException('出车任务不存在');
        const active = ['OPEN', 'OFFERED', 'ACCEPTED', 'EN_ROUTE', 'ARRIVED', 'IN_TRIP'].indexOf(String(job.status || '')) >= 0;
        await this.prisma.driverJob.delete({ where: { id } });
        if (active && job.driverId) {
            try {
                await this.prisma.driverProfile.update({ where: { id: job.driverId }, data: { status: 'ONLINE' } });
            }
            catch (_err) { }
        }
        if (actor)
            await this.writeOpLog(actor, { module: 'rental', action: 'delete', targetType: 'DriverJob', targetId: id, targetLabel: job.jobNo, summary: '删除出车任务 ' + job.jobNo, detail: {} });
        return { id, deleted: true };
    }
    async deleteDriverJobs(ids, actor) {
        const list = this.normalizeIdList(ids);
        let deleted = 0;
        for (let i = 0; i < list.length; i++) {
            try {
                await this.deleteDriverJob(list[i], null);
                deleted += 1;
            }
            catch (_err) { }
        }
        if (actor)
            await this.writeOpLog(actor, { module: 'rental', action: 'delete', targetType: 'DriverJob', targetId: '', targetLabel: '', summary: '批量删除出车任务 ' + deleted + ' 条', detail: { ids: list } });
        return { deleted };
    }
    async listDriverWithdrawals(status, page, pageSize) {
        const parsed = this.parsePage({ page, pageSize }, 20);
        const st = String(status || '').trim().toUpperCase();
        const whereSql = st && st !== 'ALL' ? `WHERE status = $1` : '';
        const params = st && st !== 'ALL' ? [st] : [];
        const rows = await this.prisma.$queryRawUnsafe(
            `SELECT w.*, d."realName" AS "driverName", d.phone AS "driverPhone", d."plateNo"
             FROM "DriverWithdraw" w
             LEFT JOIN "DriverProfile" d ON d.id = w."driverId"
             ${whereSql}
             ORDER BY w."createdAt" DESC
             LIMIT ${parsed.pageSize} OFFSET ${parsed.skip}`,
            ...params
        );
        const countRows = await this.prisma.$queryRawUnsafe(
            `SELECT COUNT(*)::int AS count FROM "DriverWithdraw" ${whereSql}`,
            ...params
        );
        const pendingRows = await this.prisma.$queryRawUnsafe(`SELECT COUNT(*)::int AS count FROM "DriverWithdraw" WHERE status='PENDING'`);
        const label = (s) => {
            const v = String(s || '').toUpperCase();
            if (v === 'PENDING') return '审核中';
            if (v === 'APPROVED' || v === 'PAID') return v === 'PAID' ? '已到账' : '处理中';
            if (v === 'REJECTED') return '已拒绝';
            return v;
        };
        return {
            items: (rows || []).map((row) => ({
                id: row.id,
                driverId: row.driverId,
                driverName: row.driverName || '',
                driverPhone: row.driverPhone || '',
                plateNo: row.plateNo || '',
                amount: Number(row.amount || 0),
                amountText: '¥' + Number(row.amount || 0).toFixed(2),
                status: String(row.status || 'PENDING').toUpperCase(),
                statusLabel: label(row.status),
                channel: row.channel || 'WECHAT',
                accountName: row.accountName || '',
                bankName: row.bankName || '',
                bankAccount: row.bankAccount || '',
                remark: row.remark || '',
                reviewNote: row.reviewNote || '',
                createdAt: row.createdAt,
            })),
            total: countRows && countRows[0] ? Number(countRows[0].count) : 0,
            page: parsed.page,
            pageSize: parsed.pageSize,
            stats: { pending: pendingRows && pendingRows[0] ? Number(pendingRows[0].count) : 0 },
        };
    }
    async reviewDriverWithdraw(id, body, actor) {
        const rows = await this.prisma.$queryRawUnsafe(`SELECT * FROM "DriverWithdraw" WHERE id=$1 LIMIT 1`, id);
        if (!rows || !rows.length) throw new common_1.NotFoundException('提现申请不存在');
        const row = rows[0];
        if (String(row.status).toUpperCase() !== 'PENDING') throw new common_1.BadRequestException('该申请已处理');
        const action = String((body && (body.action || body.status)) || '').toLowerCase();
        const note = String((body && (body.reviewNote || body.note)) || '').trim();
        const amount = Number(row.amount || 0);
        if (action === 'approve' || action === 'paid' || action === 'approved') {
            await this.prisma.$executeRawUnsafe(
                `UPDATE "DriverWithdraw" SET status='PAID', "reviewNote"=$1, "reviewedAt"=NOW(), "updatedAt"=NOW() WHERE id=$2`,
                note, id
            );
            await this.prisma.$executeRawUnsafe(
                `UPDATE "DriverProfile"
                 SET "pendingAmount" = GREATEST(COALESCE("pendingAmount",0) - $1, 0),
                     "withdrawnAmount" = COALESCE("withdrawnAmount",0) + $1,
                     "updatedAt"=NOW()
                 WHERE id=$2`,
                amount, row.driverId
            );
            await this.writeOpLog(actor, { module: 'rental', action: 'update', targetType: 'DriverWithdraw', targetId: id, targetLabel: String(amount), summary: '通过司机提现 ¥' + amount.toFixed(2), detail: {} });
            return { id, status: 'PAID', statusLabel: '已到账' };
        }
        if (action === 'reject' || action === 'rejected') {
            await this.prisma.$executeRawUnsafe(
                `UPDATE "DriverWithdraw" SET status='REJECTED', "reviewNote"=$1, "reviewedAt"=NOW(), "updatedAt"=NOW() WHERE id=$2`,
                note, id
            );
            await this.prisma.$executeRawUnsafe(
                `UPDATE "DriverProfile"
                 SET "pendingAmount" = GREATEST(COALESCE("pendingAmount",0) - $1, 0),
                     "availableBalance" = COALESCE("availableBalance",0) + $1,
                     "updatedAt"=NOW()
                 WHERE id=$2`,
                amount, row.driverId
            );
            await this.writeOpLog(actor, { module: 'rental', action: 'update', targetType: 'DriverWithdraw', targetId: id, targetLabel: String(amount), summary: '拒绝司机提现 ¥' + amount.toFixed(2), detail: { note } });
            return { id, status: 'REJECTED', statusLabel: '已拒绝' };
        }
        throw new common_1.BadRequestException('请选择通过或拒绝');
    }
    async reviewDriverWithdraws(ids, body, actor) {
        const list = this.normalizeIdList(ids);
        let updated = 0;
        for (let i = 0; i < list.length; i++) {
            try {
                await this.reviewDriverWithdraw(list[i], body || {}, actor);
                updated += 1;
            }
            catch (_err) { }
        }
        return { updated };
    }
    async deleteDriverWithdraw(id, actor) {
        const rows = await this.prisma.$queryRawUnsafe(`SELECT * FROM "DriverWithdraw" WHERE id=$1 LIMIT 1`, id);
        if (!rows || !rows.length)
            throw new common_1.NotFoundException('提现申请不存在');
        const row = rows[0];
        const st = String(row.status || '').toUpperCase();
        const amount = Number(row.amount || 0);
        if (st === 'PENDING') {
            await this.prisma.$executeRawUnsafe(
                `UPDATE "DriverProfile"
                 SET "pendingAmount" = GREATEST(COALESCE("pendingAmount",0) - $1, 0),
                     "availableBalance" = COALESCE("availableBalance",0) + $1,
                     "updatedAt"=NOW()
                 WHERE id=$2`,
                amount, row.driverId
            );
        }
        await this.prisma.$executeRawUnsafe(`DELETE FROM "DriverWithdraw" WHERE id=$1`, id);
        if (actor)
            await this.writeOpLog(actor, { module: 'rental', action: 'delete', targetType: 'DriverWithdraw', targetId: id, targetLabel: String(amount), summary: '删除提现申请 ¥' + amount.toFixed(2), detail: { status: st } });
        return { id, deleted: true };
    }
    async deleteDriverWithdraws(ids, actor) {
        const list = this.normalizeIdList(ids);
        let deleted = 0;
        for (let i = 0; i < list.length; i++) {
            try {
                await this.deleteDriverWithdraw(list[i], null);
                deleted += 1;
            }
            catch (_err) { }
        }
        if (actor)
            await this.writeOpLog(actor, { module: 'rental', action: 'delete', targetType: 'DriverWithdraw', targetId: '', targetLabel: '', summary: '批量删除提现 ' + deleted + ' 条', detail: { ids: list } });
        return { deleted };
    }
    async syncDriverJobForBooking(booking) {
        if (!booking) return;
        const optionId = String(booking.rentalOptionId || '').trim();
        const driverId = String(booking.rentalDriverId || '').trim();
        const st = String(booking.status || '');
        if (st === 'CANCELLED' || st === 'CANCELED' || !optionId || optionId === 'none' || !driverId) {
            if (booking.id) {
                await this.prisma.driverJob.updateMany({
                    where: { bookingId: booking.id, status: { in: ['OPEN', 'OFFERED', 'ACCEPTED', 'EN_ROUTE', 'ARRIVED', 'IN_TRIP'] } },
                    data: { status: 'CANCELLED', cancelledAt: new Date(), cancelReason: '预约已取消或改为自行前往' },
                });
            }
            return;
        }
        if (st !== 'BOOKED' && st !== 'COMPLETED') return;
        const driver = await this.prisma.driverProfile.findUnique({ where: { id: driverId } });
        if (!driver) return;
        const existed = await this.prisma.driverJob.findFirst({
            where: { bookingId: booking.id, status: { not: 'CANCELLED' } },
        });
        const payload = {
            driverId: driver.id,
            driverUserId: driver.userId,
            projectId: booking.projectId,
            bookingId: booking.id,
            bookerUserId: booking.bookerId || booking.userId,
            vehicleType: driver.vehicleType || optionId,
            status: st === 'COMPLETED' ? 'COMPLETED' : 'OFFERED',
            price: booking.rentalFee != null ? Number(booking.rentalFee) : Number(driver.basePrice || 0),
            passengerName: booking.participantName || '',
            passengerPhone: booking.participantPhone || '',
            pickupAddress: booking.pickupAddress || '',
            pickupLatitude: booking.pickupLatitude,
            pickupLongitude: booking.pickupLongitude,
            dropoffAddress: (booking.project && booking.project.location) || '',
            note: '研学预约租车·指定单待确认',
            offeredAt: new Date(),
            acceptedAt: st === 'COMPLETED' ? (existed && existed.acceptedAt) || new Date() : null,
        };
        if (existed) {
            const cur = String(existed.status || '');
            if (['ACCEPTED', 'EN_ROUTE', 'ARRIVED', 'IN_TRIP', 'COMPLETED'].indexOf(cur) >= 0 && st !== 'COMPLETED') {
                payload.status = existed.status;
                payload.acceptedAt = existed.acceptedAt;
                payload.offeredAt = existed.offeredAt || payload.offeredAt;
            }
            await this.prisma.driverJob.update({ where: { id: existed.id }, data: payload });
        }
        else {
            await this.prisma.driverJob.create({
                data: {
                    jobNo: 'DJ' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 6).toUpperCase(),
                    ...payload,
                },
            });
        }
    }

    // ===== Live booking window + dayOps =====
    async ensureLiveBookingSchema() {
        if (this._liveBookingSchemaReady) return;
        try {
            await this.prisma.$executeRawUnsafe(`ALTER TABLE "StudyProject" ADD COLUMN IF NOT EXISTS "bookableDays" INTEGER NOT NULL DEFAULT 7`);
            await this.prisma.$executeRawUnsafe(`ALTER TABLE "StudyProject" ADD COLUMN IF NOT EXISTS "dayOps" JSONB NOT NULL DEFAULT '{}'::jsonb`);
        } catch (_e) {}
        this._liveBookingSchemaReady = true;
    }
    clampBookableDays(v, fallback = 7) {
        const n = Math.floor(Number(v));
        if (!Number.isFinite(n)) return fallback;
        return Math.max(1, Math.min(365, n));
    }
    parseDayOps(raw) {
        let obj = raw;
        if (typeof raw === 'string') {
            try { obj = JSON.parse(raw); } catch (_e) { return {}; }
        }
        if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return {};
        return obj;
    }
    async readLiveBookingFields(projectId) {
        await this.ensureLiveBookingSchema();
        try {
            const rows = await this.prisma.$queryRawUnsafe(
                `SELECT "bookableDays", "dayOps" FROM "StudyProject" WHERE id=$1`,
                String(projectId)
            );
            const row = rows && rows[0] ? rows[0] : null;
            return {
                bookableDays: this.clampBookableDays(row ? row.bookableDays : 7, 7),
                dayOps: this.parseDayOps(row ? row.dayOps : {}),
            };
        } catch (_e) {
            return { bookableDays: 7, dayOps: {} };
        }
    }

    // ===== Project contacts + project-affair RBAC scaffold =====
    contactRoleOptions() {
        return [
            { value: '总负责人', label: '总负责人' },
            { value: '现场负责人', label: '现场负责人' },
            { value: '讲解带队', label: '讲解带队' },
            { value: '企业对接人', label: '企业对接人' },
        ];
    }
    allProjectAffairCaps() {
        return [
            'project.live',
            'project.bookings',
            'project.checkin',
            'project.cert',
            'project.mall',
            'project.resources',
            'project.edit',
            'project.owners',
        ];
    }
    contactRoleDefaultCaps(role) {
        const r = String(role || '').trim();
        if (r === '总负责人') return this.allProjectAffairCaps().slice();
        if (r === '现场负责人') return ['project.live', 'project.live.read', 'project.live.write', 'project.bookings', 'project.checkin'];
        if (r === '讲解带队') return ['project.live', 'project.live.read', 'project.checkin'];
        if (r === '企业对接人') return [];
        return [];
    }
    newContactId() {
        return 'pc_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    }
    async ensureProjectContactsColumn() {
        if (this._projectContactsColReady) return;
        try {
            await this.prisma.$executeRawUnsafe(`ALTER TABLE "StudyProject" ADD COLUMN IF NOT EXISTS "projectContacts" JSONB NOT NULL DEFAULT '[]'::jsonb`);
        } catch (_e) {}
        this._projectContactsColReady = true;
    }
    normalizeProjectContacts(raw) {
        let list = raw;
        if (typeof raw === 'string') {
            try { list = JSON.parse(raw); } catch (_e) { list = []; }
        }
        if (!Array.isArray(list)) list = [];
        const roles = this.contactRoleOptions().map((x) => x.value);
        const out = [];
        const seen = {};
        for (let i = 0; i < list.length; i++) {
            const row = list[i] || {};
            const role = String(row.role || '').trim() || '现场负责人';
            if (roles.indexOf(role) < 0 && role !== '总负责人') {
                // allow known roles only; fallback
            }
            const name = String(row.name || '').trim();
            const phone = String(row.phone || '').replace(/[^\d+]/g, '').trim();
            const wechat = String(row.wechat || '').trim();
            const userId = String(row.userId || '').trim();
            if (!name && !phone && !userId) continue;
            let id = String(row.id || '').trim() || this.newContactId();
            if (seen[id]) id = this.newContactId();
            seen[id] = true;
            let caps = Array.isArray(row.capabilities)
                ? row.capabilities.map((c) => String(c || '').trim()).filter(Boolean)
                : [];
            if (!caps.length) caps = this.contactRoleDefaultCaps(role);
            const allowed = this.allProjectAffairCaps();
            caps = caps.filter((c) => allowed.indexOf(c) >= 0);
            out.push({
                id,
                userId: userId || '',
                name: name || phone || '未命名',
                phone,
                wechat,
                role: roles.indexOf(role) >= 0 ? role : '现场负责人',
                visibleToStudents: row.visibleToStudents === false || row.visibleToStudents === 'false' || row.visibleToStudents === 0 ? false : true,
                sort: Number.isFinite(Number(row.sort)) ? Number(row.sort) : i,
                capabilities: caps,
            });
        }
        out.sort((a, b) => (a.sort - b.sort) || String(a.id).localeCompare(String(b.id)));
        return out;
    }
    publicProjectContacts(list) {
        const rows = this.normalizeProjectContacts(list);
        return rows.filter((r) => r.visibleToStudents).map((r) => ({
            id: r.id,
            name: r.name,
            phone: r.phone,
            wechat: r.wechat,
            role: r.role,
            sort: r.sort,
        }));
    }
    async readProjectContacts(projectId) {
        await this.ensureProjectContactsColumn();
        try {
            const rows = await this.prisma.$queryRawUnsafe(
                `SELECT "projectContacts" FROM "StudyProject" WHERE id=$1`,
                String(projectId)
            );
            return this.normalizeProjectContacts(rows && rows[0] ? rows[0].projectContacts : []);
        } catch (_e) {
            return [];
        }
    }
    async writeProjectContacts(projectId, contacts) {
        await this.ensureProjectContactsColumn();
        const next = this.normalizeProjectContacts(contacts);
        await this.prisma.$executeRawUnsafe(
            `UPDATE "StudyProject" SET "projectContacts"=$1::jsonb, "updatedAt"=NOW() WHERE id=$2`,
            JSON.stringify(next),
            String(projectId)
        );
        return next;
    }
    async attachProjectContactsMeta(items) {
        const list = Array.isArray(items) ? items : (items ? [items] : []);
        for (let i = 0; i < list.length; i++) {
            const row = list[i];
            if (!row || !row.id) continue;
            const contacts = await this.readProjectContacts(row.id);
            row.contacts = contacts;
            row.projectContacts = contacts;
        }
        return items;
    }
    async getStudyProjectContacts(projectId, actor) {
        const project = await this.ensureStudyProject(projectId, actor);
        const caps = await this.resolveActorProjectCaps(project.id, actor);
        if (caps != null) {
            const ok = caps.indexOf('project.owners') >= 0 || caps.indexOf('project.edit') >= 0 || caps.indexOf('project.live') >= 0;
            if (!ok) throw new common_1.ForbiddenException('缺少项目权限：project.owners');
        }
        const contacts = await this.readProjectContacts(project.id);
        return {
            projectId: project.id,
            contactPhone: project.contactPhone || '',
            contactWechat: project.contactWechat || '',
            contactServiceTime: project.contactServiceTime || '',
            roles: this.contactRoleOptions(),
            capabilityOptions: this.allProjectAffairCaps().map((v) => ({ value: v, label: v })),
            roleDefaults: {
                '总负责人': this.contactRoleDefaultCaps('总负责人'),
                '现场负责人': this.contactRoleDefaultCaps('现场负责人'),
                '讲解带队': this.contactRoleDefaultCaps('讲解带队'),
                '企业对接人': this.contactRoleDefaultCaps('企业对接人'),
            },
            contacts,
        };
    }
    async saveStudyProjectContacts(projectId, body, actor) {
        const project = await this.assertProjectCapability(projectId, actor, 'project.owners');
        this.assertEnterpriseScope(project, actor);
        const contacts = await this.writeProjectContacts(projectId, (body && body.contacts) != null ? body.contacts : []);
        if (body && (body.contactPhone !== undefined || body.contactWechat !== undefined || body.contactServiceTime !== undefined)) {
            const data = {};
            if (body.contactPhone !== undefined) data.contactPhone = this.mapNullableText(body.contactPhone);
            if (body.contactWechat !== undefined) data.contactWechat = this.mapNullableText(body.contactWechat);
            if (body.contactServiceTime !== undefined) data.contactServiceTime = this.mapNullableText(body.contactServiceTime);
            if (Object.keys(data).length) {
                await this.prisma.studyProject.update({ where: { id: String(projectId) }, data });
            }
        }
        try {
            await this.writeOpLog(actor, {
                module: 'study',
                action: 'update',
                targetType: 'StudyProject',
                targetId: String(projectId),
                targetLabel: project.title,
                summary: '更新项目负责人',
                projectId: String(projectId),
                enterpriseId: project.enterpriseId || undefined,
                detail: { count: contacts.length },
            });
        } catch (_e) {}
        return this.getStudyProjectContacts(projectId, actor);
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
                    `SELECT id, title, "projectContacts" FROM "StudyProject" WHERE "projectContacts" IS NOT NULL AND "projectContacts"::text <> '[]'`
                );
            }
            const out = [];
            for (let i = 0; i < (rows || []).length; i++) {
                const row = rows[i];
                const contacts = this.normalizeProjectContacts(row.projectContacts);
                for (let j = 0; j < contacts.length; j++) {
                    if (String(contacts[j].userId || '') === aid) {
                        out.push({
                            projectId: String(row.id),
                            projectTitle: row.title || '',
                            role: contacts[j].role,
                            capabilities: contacts[j].capabilities || this.contactRoleDefaultCaps(contacts[j].role),
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

    async writeLiveBookingFields(projectId, body) {
        await this.ensureLiveBookingSchema();
        const cur = await this.readLiveBookingFields(projectId);
        const nextDays = body && body.bookableDays != null ? this.clampBookableDays(body.bookableDays, cur.bookableDays) : cur.bookableDays;
        let nextOps = cur.dayOps;
        if (body && body.dayOps != null) nextOps = this.parseDayOps(body.dayOps);
        await this.prisma.$executeRawUnsafe(
            `UPDATE "StudyProject" SET "bookableDays"=$1, "dayOps"=$2::jsonb, "updatedAt"=NOW() WHERE id=$3`,
            nextDays, JSON.stringify(nextOps || {}), String(projectId)
        );
        return { bookableDays: nextDays, dayOps: nextOps };
    }
    async attachLiveBookingMeta(items) {
        const list = Array.isArray(items) ? items : (items ? [items] : []);
        for (let i = 0; i < list.length; i++) {
            const row = list[i];
            if (!row || !row.id) continue;
            const live = await this.readLiveBookingFields(row.id);
            row.bookableDays = live.bookableDays;
            row.dayOps = live.dayOps;
        }
        return items;
    }
    appointmentDayKeyOf(booking) {
        const days = this.consoleTripDays(booking && booking.tripPlan);
        const keys = [];
        for (let i = 0; i < days.length; i++) {
            const k = String(days[i].dayKey || '').trim();
            if (/^\d{4}-\d{2}-\d{2}$/.test(k)) keys.push(k);
        }
        keys.sort();
        return keys.length ? keys[0] : '';
    }
    dayOpsEntry(dayOps, date) {
        const map = this.parseDayOps(dayOps);
        const key = String(date || '').trim();
        const raw = map[key];
        return this.live18MergeDayOpsRaw(raw);
    }
    tripPlanHasDayKey(plan, dayKey) {
        const days = this.consoleTripDays(plan);
        for (let i = 0; i < days.length; i++) {
            if (String(days[i].dayKey || '') === String(dayKey)) return true;
        }
        return false;
    }
    isSeatStudyBooking(booking) {
        return booking && booking.participantRole !== 'ORGANIZER';
    }
    async studyProjectLiveSummary(projectId, date, actor) {
        await this.ensureLiveBookingSchema();
        await this.ensureStudyScheduleSchema(); /* schedule-live-enrich */
        await this.live18AssertLiveRead(projectId, actor);
        const project = await this.prisma.studyProject.findUnique({ where: { id: String(projectId) } });
        if (!project) throw new common_1.NotFoundException('Study project not found');
        this.assertEnterpriseScope(project, actor);
        const day = String(date || this.todayDayKey()).trim();
        if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) throw new common_1.BadRequestException('date 须为 YYYY-MM-DD');
        const live = await this.readLiveBookingFields(project.id);
        const ops = this.dayOpsEntry(live.dayOps, day);
        const capacity = ops.capacity != null ? ops.capacity : (Number(project.maxCapacity) || 0);
        const contacts = await this.readProjectContacts(project.id);
        let dutyContact = null;
        if (ops.duty) {
            dutyContact = contacts.find((c) => String(c.id) === String(ops.duty)) || null;
        }
        if (!dutyContact) {
            dutyContact = contacts.find((c) => c.role === '现场负责人') || contacts.find((c) => c.role === '讲解带队') || null;
        }
        const rows = await this.prisma.studyBooking.findMany({
            where: { projectId: String(projectId), status: { in: [client_1.BookingStatus.BOOKED, client_1.BookingStatus.COMPLETED, client_1.BookingStatus.CANCELLED] } },
            include: { user: true, project: true },
            orderBy: { createdAt: 'desc' },
            take: 3000,
        });
        const attendees = [];
        const groupSeen = {};
        let seats = 0;
        let checkedInSeats = 0;
        let cancelledSeats = 0;
        let inTourSeats = 0;
        let graduatedSeats = 0;
        let pendingBookings = 0;
        for (let i = 0; i < rows.length; i++) {
            const b = rows[i];
            if (!this.tripPlanHasDayKey(b.tripPlan, day)) continue;
            if (!this.isSeatStudyBooking(b)) continue;
            const st = String(b.status || '');
            if (st === 'CANCELLED' || st === 'CANCELED') {
                cancelledSeats += 1;
                continue;
            }
            seats += 1;
            const days = this.consoleTripDays(b.tripPlan);
            const dayRow = days.find((d) => d.dayKey === day);
            const dayRedeemed = !!(dayRow && dayRow.redeemed);
            if (dayRedeemed || b.checkedInAt) checkedInSeats += 1;
            const plan = (b.tripPlan && typeof b.tripPlan === 'object') ? b.tripPlan : {};
            const tour = (plan.tour && typeof plan.tour === 'object') ? plan.tour : {};
            const tourStatus = String(tour.status || '');
            const graduated = tourStatus === 'completed' || tour.graduated === true || plan.graduated === true || !!b.certificateId;
            if (graduated) graduatedSeats += 1;
            else if (dayRedeemed || tourStatus === 'entered' || tourStatus === 'in_progress' || tourStatus === 'touring') inTourSeats += 1;
            const sp = (plan.stationProgress && typeof plan.stationProgress === 'object') ? plan.stationProgress : null;
            let exploreStage = '';
            let exploreSpot = '';
            if (sp) {
                const keys = Object.keys(sp);
                let best = null;
                for (let k = 0; k < keys.length; k++) {
                    const rowSp = sp[keys[k]];
                    if (!rowSp || typeof rowSp !== 'object') continue;
                    if (!best || String(rowSp.updatedAt || rowSp.at || '') > String(best.updatedAt || best.at || '')) best = Object.assign({ _id: keys[k] }, rowSp);
                }
                if (best) {
                    exploreSpot = String(best.title || best.spotTitle || best.name || best._id || '').trim();
                    exploreStage = String(best.stage || best.step || best.status || best.phase || '').trim();
                }
            }
            const gid = b.bookingGroupId || b.id;
            if (!groupSeen[gid]) groupSeen[gid] = true;
            attendees.push({
                bookingId: b.id,
                bookingGroupId: gid,
                participantName: b.participantName || (b.user && (b.user.realName || b.user.nickname)) || '',
                phone: b.participantPhone || (b.user && b.user.phone) || '',
                studyNo: (b.user && b.user.studyNo) || '',
                status: b.status,
                dayRedeemed,
                checkedInAt: b.checkedInAt || null,
                spotCount: dayRow && Array.isArray(dayRow.spots) ? dayRow.spots.length : 0,
                exploreStage,
                exploreSpot,
                tourStatus,
                graduated,
                createdAt: b.createdAt,
            });
        }
        // unpaid soft-hold best-effort
        try {
            const unpaid = await this.prisma.studyBooking.findMany({
                where: { projectId: String(projectId), status: client_1.BookingStatus.UNPAID },
                take: 500,
            });
            for (let i = 0; i < unpaid.length; i++) {
                if (this.tripPlanHasDayKey(unpaid[i].tripPlan, day) && this.isSeatStudyBooking(unpaid[i])) pendingBookings += 1;
            }
        } catch (_e) {}
        const remaining = capacity > 0 ? Math.max(0, capacity - seats) : null;
        let routePoints = [];
        try {
            const pts = await this.prisma.studyRoutePoint.findMany({
                where: { projectId: String(projectId) },
                orderBy: { sortOrder: 'asc' },
                take: 200,
            });
            routePoints = (pts || []).map((p) => {
                const pack = this.parseRouteContentPack(p) || {};
                const steps = (pack.stationSteps || []).map((s) => ({
                    id: s.id,
                    title: s.title || '',
                    type: s.type || '',
                }));
                const lat = p.latitude != null ? Number(p.latitude) : null;
                const lng = p.longitude != null ? Number(p.longitude) : null;
                return {
                    id: p.id,
                    title: p.title || '',
                    sortOrder: Number(p.sortOrder || 0),
                    enabled: p.enabled !== false,
                    zoneId: p.zoneId || pack.zoneKey || '',
                    latitude: Number.isFinite(lat) ? lat : null,
                    longitude: Number.isFinite(lng) ? lng : null,
                    steps,
                };
            });
        } catch (_e) { routePoints = []; }
        let tourMall = { enabled: false, title: '导览积分商城' };
        try {
            await this.ensureStudyOverhaulSchema();
            const tmRows = await this.prisma.$queryRawUnsafe(`SELECT "tourMall" FROM "StudyProject" WHERE id=$1`, String(projectId));
            const cfg = this.normalizeTourMallConfig(tmRows && tmRows[0] ? tmRows[0].tourMall : {});
            tourMall = { enabled: !!cfg.enabled, title: cfg.title || '导览积分商城', openOnApptDay24h: !!cfg.openOnApptDay24h };
        } catch (_e) {}
        const alerts = [];
        if (ops.paused) alerts.push({ level: 'warn', code: 'paused', message: '当日预约已暂停' });
        if (ops.pauseCheckin) alerts.push({ level: 'warn', code: 'pauseCheckin', message: '当日核销已暂停' });
        if (capacity > 0 && remaining === 0) alerts.push({ level: 'warn', code: 'full', message: '当日名额已满' });
        if (ops.tourMallOpen === false) alerts.push({ level: 'info', code: 'mallClosed', message: '今日积分商城已关闭' });
        const __live18Summary = {
            projectId: project.id,
            date: day,
            bookableDays: live.bookableDays,
            dayOps: {
                paused: ops.paused,
                pauseCheckin: ops.pauseCheckin,
                capacity,
                note: ops.note,
                duty: ops.duty || (dutyContact ? dutyContact.id : ''),
                tourMallOpen: ops.tourMallOpen,
                tourPaused: !!ops.tourPaused,
                broadcast: ops.broadcast || null,
                closedSpots: ops.closedSpots || [],
                spotStepOverrides: ops.spotStepOverrides || {},
            },
            dutyContact: dutyContact ? {
                id: dutyContact.id,
                name: dutyContact.name,
                phone: dutyContact.phone,
                wechat: dutyContact.wechat,
                role: dutyContact.role,
            } : null,
            contacts: contacts.map((c) => ({
                id: c.id, name: c.name, phone: c.phone, wechat: c.wechat, role: c.role, visibleToStudents: c.visibleToStudents,
            })),
            counts: {
                bookings: Object.keys(groupSeen).length,
                bookedGroups: Object.keys(groupSeen).length,
                seats,
                checkedIn: checkedInSeats,
                checkedInSeats,
                pending: Math.max(0, seats - checkedInSeats),
                pendingCheckInSeats: Math.max(0, seats - checkedInSeats),
                cancelled: cancelledSeats,
                inTour: inTourSeats,
                graduated: graduatedSeats,
                pendingBookings,
                capacity,
                remaining,
            },
            attendees,
            routePoints,
            tourMall,
            alerts,
            serverTime: new Date().toISOString(),
        };
        try { return await this.live18EnrichSummary(__live18Summary, projectId, day); } catch (_e) { return __live18Summary; }
    }
    async patchStudyProjectDayOps(projectId, body, actor) {
        await this.ensureLiveBookingSchema();
        const project = await this.live18AssertLiveWrite(projectId, actor);
        const day = String((body && (body.date || body.dayKey)) || '').trim();
        if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) throw new common_1.BadRequestException('date 须为 YYYY-MM-DD');
        const live = await this.readLiveBookingFields(projectId);
        const map = Object.assign({}, live.dayOps);
        const cur = this.dayOpsEntry(map, day);
        let duty = cur.duty;
        if (body && body.duty !== undefined) {
            if (body.duty == null || body.duty === '') duty = '';
            else if (typeof body.duty === 'object') duty = String(body.duty.id || body.duty.contactId || '').trim();
            else duty = String(body.duty || '').trim();
        }
        /* live18-dayops-ext */
        const merged = this.live18MergeDayOpsRaw(cur);
        const next = Object.assign({}, merged, {
            paused: body && body.paused != null ? !!body.paused : merged.paused,
            pauseCheckin: body && body.pauseCheckin != null ? !!body.pauseCheckin : merged.pauseCheckin,
            capacity: body && body.capacity !== undefined
                ? (body.capacity == null || body.capacity === '' ? null : Math.max(0, Math.floor(Number(body.capacity) || 0)))
                : merged.capacity,
            note: body && body.note != null ? String(body.note || '').trim() : merged.note,
            duty,
            tourMallOpen: body && body.tourMallOpen !== undefined
                ? (body.tourMallOpen == null || body.tourMallOpen === '' ? null : !!body.tourMallOpen)
                : merged.tourMallOpen,
        });
        if (body && body.tourPaused != null) next.tourPaused = !!body.tourPaused;
        if (body && body.broadcast !== undefined) {
            if (!body.broadcast) next.broadcast = null;
            else if (typeof body.broadcast === 'string') next.broadcast = { text: body.broadcast.trim(), level: 'warn', at: new Date().toISOString(), id: 'bc_' + Date.now().toString(36) };
            else next.broadcast = { text: String(body.broadcast.text || body.broadcast.message || '').trim(), level: String(body.broadcast.level || 'warn'), at: new Date().toISOString(), id: String(body.broadcast.id || ('bc_' + Date.now().toString(36))) };
        }
        if (body && body.closedSpots !== undefined) next.closedSpots = this.live18NormalizeList(body.closedSpots).map((x) => String(x).trim()).filter(Boolean);
        if (body && body.spotStepOverrides !== undefined && typeof body.spotStepOverrides === 'object') next.spotStepOverrides = body.spotStepOverrides;
        if (body && Array.isArray(body.waitlist)) next.waitlist = body.waitlist;
        const entry = this.live18SerializeDayOpsEntry(next);
        if (this.live18IsEmptyDayOps(next)) delete map[day];
        else map[day] = entry;
        await this.prisma.$executeRawUnsafe(
            `UPDATE "StudyProject" SET "dayOps"=$1::jsonb, "updatedAt"=NOW() WHERE id=$2`,
            JSON.stringify(map), String(projectId)
        );
        if (actor) {
            try {
                await this.writeOpLog(actor, {
                    module: 'study', action: 'update', targetType: 'StudyProject', targetId: String(projectId),
                    targetLabel: project.title || '研学项目', summary: '更新当日运营 ' + day,
                    projectId: String(projectId), enterpriseId: project.enterpriseId || undefined,
                    detail: { day, paused: next.paused, pauseCheckin: next.pauseCheckin, capacity: next.capacity, duty: next.duty, tourMallOpen: next.tourMallOpen },
                });
            } catch (_e) {}
        }
        /* schedule-writeback */
        try {
            await this.upsertScheduleDay(projectId, {
                date: day,
                open: !next.paused,
                capacity: next.capacity,
                note: next.note || "",
            }, actor);
        } catch (_e) {}
        return this.studyProjectLiveSummary(projectId, day, actor);
    }

    // ===== Phase34: cert templates + tour mall + puzzle source =====
    async ensureStudyOverhaulSchema() {
        if (this._studyOverhaulSchemaReady) return;
        try {
            await this.prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "StudyCertificateTemplate" (
              "id" TEXT PRIMARY KEY,
              "projectId" TEXT NOT NULL,
              "name" TEXT NOT NULL DEFAULT '',
              "title" TEXT NOT NULL DEFAULT '结业证书',
              "bodyHtml" TEXT NOT NULL DEFAULT '',
              "bgUrl" TEXT,
              "sealUrl" TEXT,
              "fieldsJson" JSONB NOT NULL DEFAULT '[]'::jsonb,
              "enabled" BOOLEAN NOT NULL DEFAULT true,
              "sortOrder" INTEGER NOT NULL DEFAULT 0,
              "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
              "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )`);
            await this.prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "StudyCertificateTemplate_projectId_idx" ON "StudyCertificateTemplate" ("projectId", "sortOrder")`);
            await this.prisma.$executeRawUnsafe(`ALTER TABLE "StudyProject" ADD COLUMN IF NOT EXISTS "tourMall" JSONB NOT NULL DEFAULT '{}'::jsonb`);
            await this.prisma.$executeRawUnsafe(`ALTER TABLE "StudyProject" ADD COLUMN IF NOT EXISTS "audienceTemplates" JSONB NOT NULL DEFAULT '[]'::jsonb`);
            await this.prisma.$executeRawUnsafe(`ALTER TABLE "StudyProject" ADD COLUMN IF NOT EXISTS "certTemplateId" TEXT`);
            await this.prisma.$executeRawUnsafe(`ALTER TABLE "PuzzleProject" ADD COLUMN IF NOT EXISTS "sourceImageUrl" TEXT`);
            await this.prisma.$executeRawUnsafe(`ALTER TABLE "PuzzleProject" ADD COLUMN IF NOT EXISTS "sourceImageKey" TEXT`);
            await this.prisma.$executeRawUnsafe(`ALTER TABLE "StudyCertificate" ADD COLUMN IF NOT EXISTS "templateId" TEXT`);
            await this.prisma.$executeRawUnsafe(`ALTER TABLE "StudyCertificate" ADD COLUMN IF NOT EXISTS "bodyHtml" TEXT`);
            await this.prisma.$executeRawUnsafe(`ALTER TABLE "StudyCertificate" ADD COLUMN IF NOT EXISTS "bgUrl" TEXT`);
            await this.prisma.$executeRawUnsafe(`ALTER TABLE "StudyCertificate" ADD COLUMN IF NOT EXISTS "sealUrl" TEXT`);
            this._studyOverhaulSchemaReady = true;
        } catch (_e) {
            this._studyOverhaulSchemaReady = true;
        }
    }
    newOverhaulId(prefix) {
        return String(prefix || 'id') + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    }
    defaultCertBodyHtml() {
        return '<p style="line-height:1.8;font-size:16px;color:#1C384A">兹证明 <b>{{holderName}}</b> 同学已完成「{{projectTitle}}」研学项目全部点位打卡与研学任务，特发此证。</p><p style="margin-top:18px;color:#64748B;font-size:13px">证书编号：{{certificateNo}}<br/>颁发日期：{{issuedAt}}</p>';
    }
    serializeCertTemplate(row) {
        if (!row) return null;
        let fields = row.fieldsJson;
        if (typeof fields === 'string') {
            try { fields = JSON.parse(fields); } catch (_e) { fields = []; }
        }
        if (!Array.isArray(fields)) fields = [];
        return {
            id: row.id,
            projectId: row.projectId,
            name: row.name || '',
            title: row.title || '结业证书',
            bodyHtml: row.bodyHtml || '',
            bgUrl: row.bgUrl || '',
            sealUrl: row.sealUrl || '',
            fieldsJson: fields,
            enabled: row.enabled !== false && row.enabled !== 'f' && row.enabled !== 0,
            sortOrder: Number(row.sortOrder || 0),
            createdAt: row.createdAt,
            updatedAt: row.updatedAt,
        };
    }
    isPlatformFullAdmin(actor) {
        if (!actor || !actor.mpAccess) return false;
        if (actor.isSuperAdmin || String(actor.mpRole || '') === 'SUPER_ADMIN') return true;
        const perms = Array.isArray(actor.adminPermissions) ? actor.adminPermissions : [];
        return perms.indexOf('study.manage') >= 0 || perms.indexOf('access.manage') >= 0;
    }
    isEnterpriseFullAdmin(actor) {
        if (!actor || !actor.merchantAccess) return false;
        const perms = Array.isArray(actor.merchantPermissions) ? actor.merchantPermissions
            : (Array.isArray(actor.adminPermissions) ? actor.adminPermissions : []);
        if (perms.indexOf('study.manage') < 0) return false;
        const scoped = Array.isArray(actor.merchantProjectIds) ? actor.merchantProjectIds.filter((x) => String(x || '').trim()) : [];
        // empty merchantProjectIds = all projects in enterprise
        return scoped.length === 0;
    }
    merchantPermsToProjectCaps(perms) {
        const list = Array.isArray(perms) ? perms : [];
        const map = {
            'study.manage': this.allProjectAffairCaps(),
            'orders.bookings': ['project.bookings', 'project.checkin'],
            'orders.manage': ['project.bookings', 'project.checkin', 'project.live'],
            'orders.read': ['project.bookings', 'project.live'],
            'mall.manage': ['project.mall'],
            'mall.read': ['project.mall'],
            'study.projects': ['project.edit'],
            'study.read': ['project.live'],
        };
        const out = [];
        for (let i = 0; i < list.length; i++) {
            const add = map[String(list[i] || '')] || [];
            for (let j = 0; j < add.length; j++) {
                if (out.indexOf(add[j]) < 0) out.push(add[j]);
            }
        }
        return out;
    }
    async resolveActorProjectCaps(projectId, actor) {
        // null => unrestricted (full admin / no project-affair binding)
        if (!actor) return null;
        if (this.isPlatformFullAdmin(actor) || this.isEnterpriseFullAdmin(actor)) return null;
        const aid = String(actor.sub || actor.id || '').trim();
        let access = [];
        try {
            access = await this.listProjectAccessForAccount(aid, actor.enterpriseId || '');
        } catch (_e) { access = []; }
        const hit = (access || []).find((x) => String(x.projectId) === String(projectId));
        const scoped = this.scopedProjectIds(actor);
        const hasBinding = !!hit || (scoped && scoped.length > 0);
        if (!hasBinding) return null; // legacy enterprise staff: do not tighten
        const caps = [];
        if (hit && Array.isArray(hit.capabilities)) {
            for (let i = 0; i < hit.capabilities.length; i++) {
                const c = String(hit.capabilities[i] || '').trim();
                if (c && caps.indexOf(c) < 0) caps.push(c);
            }
        }
        const perms = Array.isArray(actor.merchantPermissions) ? actor.merchantPermissions
            : (Array.isArray(actor.adminPermissions) ? actor.adminPermissions : []);
        const mapped = this.merchantPermsToProjectCaps(perms);
        for (let i = 0; i < mapped.length; i++) {
            if (caps.indexOf(mapped[i]) < 0) caps.push(mapped[i]);
        }
        return caps;
    }
    async assertProjectCapability(projectId, actor, capability) {
        const id = String(projectId || '').trim();
        if (!id) throw new common_1.BadRequestException('项目无效');
        const project = await this.prisma.studyProject.findUnique({ where: { id } });
        if (!project) throw new common_1.NotFoundException('项目不存在');
        this.assertEnterpriseScope(project, actor);
        const need = String(capability || '').trim();
        if (!need) return project;
        const caps = await this.resolveActorProjectCaps(id, actor);
        if (caps == null) return project; // full admin or unbound
        if (caps.indexOf(need) < 0) {
            throw new common_1.ForbiddenException('缺少项目权限：' + need);
        }
        return project;
    }
    async assertProjectManage(projectId, actor, capability) {
        // default write gate = project.edit; callers may pass a specific project.* cap
        return this.assertProjectCapability(projectId, actor, capability || 'project.edit');
    }
    async listCertTemplates(projectId, actor) {
        await this.ensureStudyOverhaulSchema();
        await this.assertProjectManage(projectId, actor, 'project.cert');
        const rows = await this.prisma.$queryRawUnsafe(
            `SELECT id, "projectId", name, title, "bodyHtml", "bgUrl", "sealUrl", "fieldsJson", enabled, "sortOrder", "createdAt", "updatedAt"
             FROM "StudyCertificateTemplate" WHERE "projectId"=$1 ORDER BY "sortOrder" ASC, "createdAt" ASC`,
            String(projectId)
        );
        const activeRows = await this.prisma.$queryRawUnsafe(`SELECT "certTemplateId" FROM "StudyProject" WHERE id=$1`, String(projectId));
        const activeId = (activeRows && activeRows[0] && activeRows[0].certTemplateId) ? String(activeRows[0].certTemplateId) : '';
        const items = (rows || []).map((r) => this.serializeCertTemplate(r));
        return { items, activeTemplateId: activeId, placeholders: ['holderName', 'projectTitle', 'certificateNo', 'issuedAt', 'summary'] };
    }
    async createCertTemplate(projectId, body, actor) {
        await this.ensureStudyOverhaulSchema();
        await this.assertProjectManage(projectId, actor, 'project.cert');
        const id = this.newOverhaulId('cert');
        const name = String((body && body.name) || '默认模板').trim() || '默认模板';
        const title = String((body && body.title) || '结业证书').trim() || '结业证书';
        const bodyHtml = String((body && (body.bodyHtml || body.html)) || this.defaultCertBodyHtml());
        const bgUrl = String((body && body.bgUrl) || '').trim() || null;
        const sealUrl = String((body && body.sealUrl) || '').trim() || null;
        const fieldsJson = JSON.stringify(Array.isArray(body && body.fieldsJson) ? body.fieldsJson : []);
        const enabled = body && body.enabled === false ? false : true;
        const sortOrder = Number(body && body.sortOrder != null ? body.sortOrder : 0) || 0;
        await this.prisma.$executeRawUnsafe(
            `INSERT INTO "StudyCertificateTemplate"
             (id, "projectId", name, title, "bodyHtml", "bgUrl", "sealUrl", "fieldsJson", enabled, "sortOrder", "createdAt", "updatedAt")
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9,$10,NOW(),NOW())`,
            id, String(projectId), name, title, bodyHtml, bgUrl, sealUrl, fieldsJson, enabled, sortOrder
        );
        if (body && (body.setActive === true || body.active === true)) {
            await this.prisma.$executeRawUnsafe(`UPDATE "StudyProject" SET "certTemplateId"=$1, "updatedAt"=NOW() WHERE id=$2`, id, String(projectId));
        } else {
            const cur = await this.prisma.$queryRawUnsafe(`SELECT "certTemplateId" FROM "StudyProject" WHERE id=$1`, String(projectId));
            if (!cur || !cur[0] || !cur[0].certTemplateId) {
                await this.prisma.$executeRawUnsafe(`UPDATE "StudyProject" SET "certTemplateId"=$1, "updatedAt"=NOW() WHERE id=$2`, id, String(projectId));
            }
        }
        if (actor) {
            try { await this.writeOpLog(actor, { module: 'study', action: 'create', targetType: 'StudyCertificateTemplate', targetId: id, targetLabel: name, summary: '新建结业证书模板', detail: { projectId } }); } catch (_e) {}
        }
        return this.listCertTemplates(projectId, actor);
    }
    async updateCertTemplate(projectId, tid, body, actor) {
        await this.ensureStudyOverhaulSchema();
        await this.assertProjectManage(projectId, actor, 'project.cert');
        const id = String(tid || '').trim();
        const rows = await this.prisma.$queryRawUnsafe(`SELECT id FROM "StudyCertificateTemplate" WHERE id=$1 AND "projectId"=$2`, id, String(projectId));
        if (!rows || !rows[0]) throw new common_1.NotFoundException('证书模板不存在');
        const name = body && body.name != null ? String(body.name).trim() : null;
        const title = body && body.title != null ? String(body.title).trim() : null;
        const bodyHtml = body && (body.bodyHtml != null || body.html != null) ? String(body.bodyHtml != null ? body.bodyHtml : body.html) : null;
        const bgUrl = body && body.bgUrl !== undefined ? (String(body.bgUrl || '').trim() || null) : undefined;
        const sealUrl = body && body.sealUrl !== undefined ? (String(body.sealUrl || '').trim() || null) : undefined;
        const fieldsJson = body && body.fieldsJson != null ? JSON.stringify(Array.isArray(body.fieldsJson) ? body.fieldsJson : []) : null;
        const enabled = body && body.enabled !== undefined ? (body.enabled !== false) : null;
        const sortOrder = body && body.sortOrder != null ? Number(body.sortOrder) || 0 : null;
        await this.prisma.$executeRawUnsafe(
            `UPDATE "StudyCertificateTemplate" SET
               name = COALESCE($3, name),
               title = COALESCE($4, title),
               "bodyHtml" = COALESCE($5, "bodyHtml"),
               "bgUrl" = CASE WHEN $6::text = '__KEEP__' THEN "bgUrl" ELSE $7 END,
               "sealUrl" = CASE WHEN $8::text = '__KEEP__' THEN "sealUrl" ELSE $9 END,
               "fieldsJson" = COALESCE($10::jsonb, "fieldsJson"),
               enabled = COALESCE($11, enabled),
               "sortOrder" = COALESCE($12, "sortOrder"),
               "updatedAt" = NOW()
             WHERE id=$1 AND "projectId"=$2`,
            id, String(projectId),
            name, title, bodyHtml,
            bgUrl === undefined ? '__KEEP__' : 'SET', bgUrl === undefined ? null : bgUrl,
            sealUrl === undefined ? '__KEEP__' : 'SET', sealUrl === undefined ? null : sealUrl,
            fieldsJson, enabled, sortOrder
        );
        if (body && (body.setActive === true || body.active === true)) {
            await this.prisma.$executeRawUnsafe(`UPDATE "StudyProject" SET "certTemplateId"=$1, "updatedAt"=NOW() WHERE id=$2`, id, String(projectId));
        }
        if (actor) {
            try { await this.writeOpLog(actor, { module: 'study', action: 'update', targetType: 'StudyCertificateTemplate', targetId: id, targetLabel: name || id, summary: '更新结业证书模板', detail: { projectId } }); } catch (_e) {}
        }
        return this.listCertTemplates(projectId, actor);
    }
    async deleteCertTemplate(projectId, tid, actor) {
        await this.ensureStudyOverhaulSchema();
        await this.assertProjectManage(projectId, actor, 'project.cert');
        const id = String(tid || '').trim();
        await this.prisma.$executeRawUnsafe(`DELETE FROM "StudyCertificateTemplate" WHERE id=$1 AND "projectId"=$2`, id, String(projectId));
        const active = await this.prisma.$queryRawUnsafe(`SELECT "certTemplateId" FROM "StudyProject" WHERE id=$1`, String(projectId));
        if (active && active[0] && String(active[0].certTemplateId || '') === id) {
            const rest = await this.prisma.$queryRawUnsafe(`SELECT id FROM "StudyCertificateTemplate" WHERE "projectId"=$1 ORDER BY "sortOrder" ASC, "createdAt" ASC LIMIT 1`, String(projectId));
            const nextId = rest && rest[0] ? rest[0].id : null;
            await this.prisma.$executeRawUnsafe(`UPDATE "StudyProject" SET "certTemplateId"=$1, "updatedAt"=NOW() WHERE id=$2`, nextId, String(projectId));
        }
        if (actor) {
            try { await this.writeOpLog(actor, { module: 'study', action: 'delete', targetType: 'StudyCertificateTemplate', targetId: id, targetLabel: '', summary: '删除结业证书模板', detail: { projectId } }); } catch (_e) {}
        }
        return this.listCertTemplates(projectId, actor);
    }
    normalizeTourMallConfig(raw) {
        let obj = raw;
        if (typeof raw === 'string') {
            try { obj = JSON.parse(raw); } catch (_e) { obj = {}; }
        }
        if (!obj || typeof obj !== 'object') obj = {};
        const skusIn = Array.isArray(obj.skus) ? obj.skus : (Array.isArray(obj.items) ? obj.items : []);
        const skus = [];
        for (let i = 0; i < skusIn.length; i++) {
            const s = skusIn[i] || {};
            const id = String(s.id || '').trim() || this.newOverhaulId('sku');
            const name = String(s.name || s.title || '').trim();
            if (!name) continue;
            skus.push({
                id,
                productId: String(s.productId || '').trim(),
                name,
                imageUrl: String(s.imageUrl || s.icon || '').trim(),
                points: Math.max(0, Number(s.points) || 0),
                stock: s.stock == null || s.stock === '' ? -1 : Number(s.stock),
                enabled: s.enabled !== false,
                sortOrder: Number(s.sortOrder != null ? s.sortOrder : i) || 0,
                note: String(s.note || '').trim(),
            });
        }
        skus.sort((a, b) => a.sortOrder - b.sortOrder);
        return {
            enabled: obj.enabled !== false,
            enterBeforeGrad: obj.enterBeforeGrad !== false,
            redeemAfterGrad: obj.redeemAfterGrad !== false,
            openOnApptDay24h: obj.openOnApptDay24h !== false,
            title: String(obj.title || '导览积分商城').trim() || '导览积分商城',
            hint: String(obj.hint || '结业前可浏览，集齐拼图结业后可用总积分兑换').trim(),
            skus,
        };
    }
    async getTourMallSettings(projectId, actor) {
        await this.ensureStudyOverhaulSchema();
        await this.assertProjectManage(projectId, actor, 'project.mall');
        const rows = await this.prisma.$queryRawUnsafe(`SELECT "tourMall" FROM "StudyProject" WHERE id=$1`, String(projectId));
        const cfg = this.normalizeTourMallConfig(rows && rows[0] ? rows[0].tourMall : {});
        return { projectId: String(projectId), ...cfg };
    }
    async saveTourMallSettings(projectId, body, actor) {
        await this.ensureStudyOverhaulSchema();
        await this.assertProjectManage(projectId, actor, 'project.mall');
        const cfg = this.normalizeTourMallConfig(body || {});
        await this.prisma.$executeRawUnsafe(
            `UPDATE "StudyProject" SET "tourMall"=$1::jsonb, "updatedAt"=NOW() WHERE id=$2`,
            JSON.stringify(cfg), String(projectId)
        );
        if (actor) {
            try { await this.writeOpLog(actor, { module: 'study', action: 'update', targetType: 'StudyProject', targetId: String(projectId), targetLabel: '导览积分商城', summary: '保存导览积分商城配置', detail: { skuCount: cfg.skus.length } }); } catch (_e) {}
        }
        return this.getTourMallSettings(projectId, actor);
    }
    normalizeAudienceTemplates(raw) {
        return audience_templates_1.normalizeAudienceTemplates(raw);
    }
        async getAudienceTemplates(projectId, actor) {
        await this.ensureStudyOverhaulSchema();
        await this.assertProjectManage(projectId, actor, 'project.edit');
        const rows = await this.prisma.$queryRawUnsafe(`SELECT "audienceTemplates" FROM "StudyProject" WHERE id=$1`, String(projectId));
        const items = this.normalizeAudienceTemplates(rows && rows[0] ? rows[0].audienceTemplates : []);
        let points = [];
        try {
            points = await this.prisma.studyRoutePoint.findMany({
                where: { projectId: String(projectId), enabled: true },
                orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
                select: { id: true, title: true },
            });
        } catch (_e) { points = []; }
        return { projectId: String(projectId), items, routePoints: points };
    }
    async saveAudienceTemplates(projectId, body, actor) {
        await this.ensureStudyOverhaulSchema();
        await this.assertProjectManage(projectId, actor, 'project.edit');
        const checked = audience_templates_1.validateAudienceTemplates(body && body.items != null ? body.items : body);
        if (!checked.ok) {
            throw new common_1.BadRequestException((checked.errors[0] && checked.errors[0].message) || '人群模板不完整');
        }
        const items = checked.items;
        await this.prisma.$executeRawUnsafe(
            `UPDATE "StudyProject" SET "audienceTemplates"=$1::jsonb, "updatedAt"=NOW() WHERE id=$2`,
            JSON.stringify(items), String(projectId)
        );
        if (actor) {
            try { await this.writeOpLog(actor, { module: 'study', action: 'update', targetType: 'StudyProject', targetId: String(projectId), targetLabel: '人群点位模板', summary: '保存分层人群点位模板', detail: { count: items.length } }); } catch (_e) {}
        }
        return this.getAudienceTemplates(projectId, actor);
    }
    async getPuzzleSource(projectId, actor) {
        await this.ensureStudyOverhaulSchema();
        await this.assertProjectManage(projectId, actor, 'project.cert');
        const puzzle = await this.prisma.puzzleProject.findUnique({
            where: { projectId: String(projectId) },
            include: { pieces: { orderBy: { pieceNo: 'asc' } } },
        });
        const rows = await this.prisma.$queryRawUnsafe(
            `SELECT id, title, subtitle, "gridCols", "gridRows", "sourceImageUrl", "sourceImageKey" FROM "PuzzleProject" WHERE "projectId"=$1`,
            String(projectId)
        );
        const row = rows && rows[0] ? rows[0] : null;
        const spotCount = await this.prisma.studyRoutePoint.count({ where: { projectId: String(projectId), enabled: true } });
        return {
            projectId: String(projectId),
            puzzleProjectId: row ? row.id : (puzzle ? puzzle.id : ''),
            title: row ? row.title : '',
            subtitle: row ? row.subtitle : '',
            gridCols: row ? Number(row.gridCols || 0) : 0,
            gridRows: row ? Number(row.gridRows || 0) : 0,
            sourceImageUrl: row ? (row.sourceImageUrl || '') : '',
            sourceImageKey: row ? (row.sourceImageKey || '') : '',
            pieceCount: puzzle && puzzle.pieces ? puzzle.pieces.length : 0,
            enabledSpotCount: spotCount,
            splitHint: '学员拼图块数 = 预约所选点位数量；源图按块数动态切分（无图处理时返回矩形百分比供前端裁切）',
        };
    }
    async savePuzzleSource(projectId, body, actor) {
        await this.ensureStudyOverhaulSchema();
        const project = await this.assertProjectManage(projectId, actor, 'project.cert');
        const url = String((body && (body.sourceImageUrl || body.imageUrl || body.url)) || '').trim();
        const key = String((body && (body.sourceImageKey || body.imageKey || body.key)) || '').trim();
        const title = String((body && body.title) || project.title || '研学拼图').trim();
        const subtitle = String((body && body.subtitle) || '集齐拼图完成研学').trim();
        let puzzle = await this.prisma.puzzleProject.findUnique({ where: { projectId: String(projectId) } });
        if (!puzzle) {
            puzzle = await this.prisma.puzzleProject.create({
                data: {
                    projectId: String(projectId),
                    title,
                    subtitle,
                    gridCols: 2,
                    gridRows: 2,
                },
            });
        }
        await this.prisma.$executeRawUnsafe(
            `UPDATE "PuzzleProject" SET title=$1, subtitle=$2, "sourceImageUrl"=$3, "sourceImageKey"=$4 WHERE id=$5`,
            title, subtitle, url || null, key || null, puzzle.id
        );
        if (actor) {
            try { await this.writeOpLog(actor, { module: 'study', action: 'update', targetType: 'PuzzleProject', targetId: puzzle.id, targetLabel: title, summary: '更新拼图源图', detail: { projectId, hasImage: !!url } }); } catch (_e) {}
        }
        return this.getPuzzleSource(projectId, actor);
    }

/* ===== Live-18 deep features (injected into AdminService) ===== */
    live18NormalizeList(v) {
        if (Array.isArray(v)) return v.slice();
        if (v == null || v === '') return [];
        return [v];
    }
    live18DayOpsDefaults() {
        return {
            paused: false, pauseCheckin: false, capacity: null, note: '', duty: '', tourMallOpen: null,
            tourPaused: false,
            broadcast: null,
            closedSpots: [],
            spotStepOverrides: {},
            waitlist: [],
            noshowReminders: [],
            anomalies: [],
            timeline: [],
        };
    }
    live18MergeDayOpsRaw(raw) {
        const base = this.live18DayOpsDefaults();
        if (!raw || typeof raw !== 'object') return base;
        let duty = '';
        if (raw.duty != null) {
            if (typeof raw.duty === 'object') duty = String(raw.duty.id || raw.duty.contactId || '').trim();
            else duty = String(raw.duty || '').trim();
        }
        let broadcast = null;
        if (raw.broadcast != null && typeof raw.broadcast === 'object') {
            const text = String(raw.broadcast.text || raw.broadcast.message || '').trim();
            if (text) {
                broadcast = {
                    text,
                    level: String(raw.broadcast.level || 'warn').trim() || 'warn',
                    at: String(raw.broadcast.at || raw.broadcast.updatedAt || '').trim() || new Date().toISOString(),
                    id: String(raw.broadcast.id || ('bc_' + Date.now().toString(36))).trim(),
                };
            }
        } else if (typeof raw.broadcast === 'string' && raw.broadcast.trim()) {
            broadcast = { text: raw.broadcast.trim(), level: 'warn', at: new Date().toISOString(), id: 'bc_' + Date.now().toString(36) };
        }
        const closedSpots = this.live18NormalizeList(raw.closedSpots).map((x) => String(x || '').trim()).filter(Boolean);
        const spotStepOverrides = (raw.spotStepOverrides && typeof raw.spotStepOverrides === 'object' && !Array.isArray(raw.spotStepOverrides))
            ? raw.spotStepOverrides : {};
        const waitlist = Array.isArray(raw.waitlist) ? raw.waitlist : [];
        const noshowReminders = Array.isArray(raw.noshowReminders) ? raw.noshowReminders : [];
        const anomalies = Array.isArray(raw.anomalies) ? raw.anomalies : [];
        const timeline = Array.isArray(raw.timeline) ? raw.timeline : [];
        return {
            paused: !!raw.paused,
            pauseCheckin: !!raw.pauseCheckin,
            capacity: raw.capacity != null && Number.isFinite(Number(raw.capacity)) ? Math.max(0, Math.floor(Number(raw.capacity))) : null,
            note: String(raw.note || '').trim(),
            duty,
            tourMallOpen: raw.tourMallOpen == null ? null : !!raw.tourMallOpen,
            tourPaused: !!raw.tourPaused,
            broadcast,
            closedSpots,
            spotStepOverrides,
            waitlist,
            noshowReminders,
            anomalies,
            timeline,
        };
    }
    live18SerializeDayOpsEntry(entry) {
        const e = entry || this.live18DayOpsDefaults();
        const out = {};
        if (e.paused) out.paused = true;
        if (e.pauseCheckin) out.pauseCheckin = true;
        if (e.capacity != null) out.capacity = e.capacity;
        if (e.note) out.note = e.note;
        if (e.duty) out.duty = e.duty;
        if (e.tourMallOpen != null) out.tourMallOpen = e.tourMallOpen;
        if (e.tourPaused) out.tourPaused = true;
        if (e.broadcast) out.broadcast = e.broadcast;
        if (e.closedSpots && e.closedSpots.length) out.closedSpots = e.closedSpots.slice();
        if (e.spotStepOverrides && Object.keys(e.spotStepOverrides).length) out.spotStepOverrides = e.spotStepOverrides;
        if (e.waitlist && e.waitlist.length) out.waitlist = e.waitlist;
        if (e.noshowReminders && e.noshowReminders.length) out.noshowReminders = e.noshowReminders;
        if (e.anomalies && e.anomalies.length) out.anomalies = e.anomalies.slice(-200);
        if (e.timeline && e.timeline.length) out.timeline = e.timeline.slice(-300);
        return out;
    }
    live18IsEmptyDayOps(entry) {
        const s = this.live18SerializeDayOpsEntry(entry);
        return Object.keys(s).length === 0;
    }
    async live18WriteDayOpsMap(projectId, map) {
        await this.prisma.$executeRawUnsafe(
            `UPDATE "StudyProject" SET "dayOps"=$1::jsonb, "updatedAt"=NOW() WHERE id=$2`,
            JSON.stringify(map), String(projectId)
        );
    }
    async live18LoadDayOps(projectId, day) {
        await this.ensureLiveBookingSchema();
        const live = await this.readLiveBookingFields(projectId);
        const map = Object.assign({}, live.dayOps);
        const cur = this.live18MergeDayOpsRaw(map[day]);
        return { live, map, cur, day };
    }
    async live18PushTimeline(projectId, day, event) {
        try {
            const { map, cur } = await this.live18LoadDayOps(projectId, day);
            const row = Object.assign({
                id: 'tl_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
                at: new Date().toISOString(),
            }, event || {});
            cur.timeline = (cur.timeline || []).concat([row]).slice(-300);
            map[day] = this.live18SerializeDayOpsEntry(cur);
            await this.live18WriteDayOpsMap(projectId, map);
            return row;
        } catch (_e) { return null; }
    }
    async live18AssertLiveWrite(projectId, actor) {
        try {
            return await this.assertProjectCapability(projectId, actor, 'project.live.write');
        } catch (e1) {
            try {
                return await this.assertProjectCapability(projectId, actor, 'project.live');
            } catch (e2) {
                throw e1;
            }
        }
    }
    async live18AssertLiveRead(projectId, actor) {
        try {
            return await this.assertProjectCapability(projectId, actor, 'project.live.read');
        } catch (_e) {
            try {
                return await this.assertProjectCapability(projectId, actor, 'project.live');
            } catch (_e2) {
                return await this.assertProjectCapability(projectId, actor, 'project.live.write');
            }
        }
    }
    async live18EnrichSummary(summary, projectId, day) {
        const ops = this.live18MergeDayOpsRaw(summary && summary.dayOps);
        // Prefer full dayOps from DB for arrays
        try {
            const { cur } = await this.live18LoadDayOps(projectId, day);
            Object.assign(ops, cur);
        } catch (_e) {}
        const attendees = Array.isArray(summary.attendees) ? summary.attendees : [];
        const routePoints = Array.isArray(summary.routePoints) ? summary.routePoints : [];
        const heatmap = routePoints.map((rp) => {
            let atSpot = 0, cleared = 0, stuck = 0, stepsDone = 0, stepsTotal = 0;
            for (let i = 0; i < attendees.length; i++) {
                const a = attendees[i];
                if (String(a.exploreSpotId || '') === String(rp.id)) {
                    atSpot += 1;
                    if (a.stationCleared) cleared += 1;
                    else stuck += 1;
                    stepsDone += Number(a.stepsDone || 0) || 0;
                    stepsTotal += Number(a.stepsTotal || 0) || 0;
                }
            }
            const completionRate = atSpot ? Math.round((cleared / atSpot) * 100) : 0;
            return {
                routePointId: rp.id,
                title: rp.title || rp.id,
                atSpot, cleared, stuck, completionRate,
                completionRate: completionRate,
                stepsDone, stepsTotal,
                closed: (ops.closedSpots || []).indexOf(String(rp.id)) >= 0,
                stepOverride: ops.spotStepOverrides && ops.spotStepOverrides[rp.id] ? ops.spotStepOverrides[rp.id] : null,
            };
        });
        const noshow = attendees.filter((a) => !a.dayRedeemed && !a.checkedInAt).map((a) => {
            const rem = (ops.noshowReminders || []).filter((r) => String(r.bookingId) === String(a.bookingId));
            const last = rem.length ? rem[rem.length - 1] : null;
            return Object.assign({}, a, {
                reminded: !!last,
                remindedAt: last ? last.at : null,
                remindChannel: last ? last.channel : null,
            });
        });
        summary.dayOps = Object.assign({}, summary.dayOps || {}, {
            tourPaused: !!ops.tourPaused,
            broadcast: ops.broadcast,
            closedSpots: ops.closedSpots || [],
            spotStepOverrides: ops.spotStepOverrides || {},
            waitlist: ops.waitlist || [],
            noshowReminders: ops.noshowReminders || [],
            anomalies: ops.anomalies || [],
            timeline: ops.timeline || [],
        });
        if (ops.tourPaused) {
            (summary.alerts || (summary.alerts = [])).push({ level: 'danger', code: 'tourPaused', message: '全场导览已暂停（学员只读）' });
        }
        if (ops.broadcast && ops.broadcast.text) {
            (summary.alerts || (summary.alerts = [])).push({ level: ops.broadcast.level || 'warn', code: 'broadcast', message: '广播：' + ops.broadcast.text });
        }
        if ((ops.closedSpots || []).length) {
            (summary.alerts || (summary.alerts = [])).push({ level: 'warn', code: 'closedSpots', message: '临时关闭点位 ' + ops.closedSpots.length + ' 个' });
        }
        summary.heatmap = heatmap;
        summary.noshowQueue = noshow;
        summary.waitlist = ops.waitlist || [];
        summary.anomalies = ops.anomalies || [];
        summary.timeline = ops.timeline || [];
        summary.liveCaps = { read: true, write: true };
        summary.smsProvider = null;
        summary.smsLimitation = '无短信通道：缺勤提醒仅控制台队列 + 标记已提醒 + 可选微信订阅占位，可导出名单。';
        return summary;
    }
    async live18ProxyBooking(projectId, body, actor) {
        await this.live18AssertLiveWrite(projectId, actor);
        const userId = String((body && (body.userId || body.uid)) || '').trim();
        if (!userId) throw new common_1.BadRequestException('userId 必填');
        const day = String((body && (body.date || body.dayKey)) || this.todayDayKey()).trim();
        const payload = Object.assign({}, body || {}, {
            status: (body && body.status) || 'BOOKED',
            dayKeys: (body && body.dayKeys) || [day],
            days: (body && body.days) || [{ dayKey: day, spotIds: (body && body.spotIds) || [] }],
        });
        if (body && body.participantName) payload.participantName = body.participantName;
        const result = await this.createOrRestoreStudyBooking(userId, projectId, payload);
        // optional extra seats (companions) as waitlist or sibling note in tripPlan
        const seats = Math.max(1, Math.floor(Number(body && body.seats) || 1));
        try {
            const bid = result && (result.id || result.bookingId);
            if (bid && seats > 1) {
                const booking = await this.prisma.studyBooking.findUnique({ where: { id: String(bid) } });
                if (booking) {
                    const plan = (booking.tripPlan && typeof booking.tripPlan === 'object') ? JSON.parse(JSON.stringify(booking.tripPlan)) : {};
                    plan.proxyMeta = Object.assign({}, plan.proxyMeta || {}, { seats, byAdmin: true, at: new Date().toISOString() });
                    await this.prisma.studyBooking.update({ where: { id: booking.id }, data: { tripPlan: plan } });
                }
            }
        } catch (_e) {}
        await this.live18PushTimeline(projectId, day, { type: 'proxy_booking', bookingId: result && (result.id || result.bookingId), userId, seats, summary: '代客预约' });
        if (actor) {
            try {
                await this.writeOpLog(actor, {
                    module: 'study', action: 'create', targetType: 'StudyBooking',
                    targetId: String(result && (result.id || result.bookingId) || ''), targetLabel: '代客预约',
                    summary: 'Live 代客预约', detail: { projectId, userId, day, seats }, projectId: String(projectId),
                });
            } catch (_e) {}
        }
        return result;
    }
    async live18RescheduleBooking(projectId, body, actor) {
        await this.live18AssertLiveWrite(projectId, actor);
        const bookingId = String((body && (body.bookingId || body.id)) || '').trim();
        if (!bookingId) throw new common_1.BadRequestException('bookingId 必填');
        const booking = await this.prisma.studyBooking.findFirst({ where: { id: bookingId, projectId: String(projectId) } });
        if (!booking) throw new common_1.NotFoundException('预约不存在');
        const newDay = String((body && (body.date || body.dayKey || body.toDate)) || '').trim();
        if (!/^\d{4}-\d{2}-\d{2}$/.test(newDay)) throw new common_1.BadRequestException('date 须为 YYYY-MM-DD');
        const plan = (booking.tripPlan && typeof booking.tripPlan === 'object') ? JSON.parse(JSON.stringify(booking.tripPlan)) : {};
        const oldDays = Array.isArray(plan.dayKeys) ? plan.dayKeys.slice() : [];
        const fromDay = String((body && body.fromDate) || (oldDays[0] || '')).trim();
        plan.dayKeys = [newDay];
        if (Array.isArray(plan.days) && plan.days.length) {
            plan.days = plan.days.map((d, i) => Object.assign({}, d, { dayKey: i === 0 ? newDay : (d.dayKey === fromDay ? newDay : d.dayKey) }));
        } else {
            plan.days = [{ dayKey: newDay, spotIds: (body && body.spotIds) || [] }];
        }
        plan.rescheduleLog = (plan.rescheduleLog || []).concat([{ from: fromDay, to: newDay, at: new Date().toISOString(), by: 'live' }]);
        await this.prisma.studyBooking.update({ where: { id: bookingId }, data: { tripPlan: plan } });
        await this.live18PushTimeline(projectId, newDay, { type: 'reschedule', bookingId, from: fromDay, to: newDay, summary: '改期 ' + fromDay + ' → ' + newDay });
        return { ok: true, bookingId, from: fromDay, to: newDay };
    }
    async live18AdjustSeats(projectId, body, actor) {
        await this.live18AssertLiveWrite(projectId, actor);
        const bookingId = String((body && body.bookingId) || '').trim();
        const action = String((body && body.action) || 'set').trim(); // set|add|remove
        const delta = Math.floor(Number(body && body.delta != null ? body.delta : body.seats) || 0);
        const booking = await this.prisma.studyBooking.findFirst({ where: { id: bookingId, projectId: String(projectId) } });
        if (!booking) throw new common_1.NotFoundException('预约不存在');
        const plan = (booking.tripPlan && typeof booking.tripPlan === 'object') ? JSON.parse(JSON.stringify(booking.tripPlan)) : {};
        const meta = Object.assign({}, plan.proxyMeta || {});
        let seats = Math.max(1, Math.floor(Number(meta.seats) || 1));
        if (action === 'add') seats += Math.max(1, delta || 1);
        else if (action === 'remove') seats = Math.max(1, seats - Math.max(1, delta || 1));
        else seats = Math.max(1, delta || seats);
        meta.seats = seats;
        meta.updatedAt = new Date().toISOString();
        plan.proxyMeta = meta;
        await this.prisma.studyBooking.update({ where: { id: bookingId }, data: { tripPlan: plan } });
        const day = String((body && body.date) || this.todayDayKey());
        await this.live18PushTimeline(projectId, day, { type: 'seats', bookingId, seats, action, summary: '调整席位 → ' + seats });
        return { ok: true, bookingId, seats };
    }
    async live18Waitlist(projectId, body, actor) {
        const day = String((body && (body.date || body.dayKey)) || this.todayDayKey()).trim();
        if (body && body.action === 'list') {
            await this.live18AssertLiveRead(projectId, actor);
            const { cur } = await this.live18LoadDayOps(projectId, day);
            return { date: day, items: cur.waitlist || [] };
        }
        await this.live18AssertLiveWrite(projectId, actor);
        const { map, cur } = await this.live18LoadDayOps(projectId, day);
        const action = String((body && body.action) || 'add').trim();
        let items = Array.isArray(cur.waitlist) ? cur.waitlist.slice() : [];
        if (action === 'add') {
            const row = {
                id: 'wl_' + Date.now().toString(36),
                name: String((body && body.name) || '').trim(),
                phone: String((body && body.phone) || '').trim(),
                userId: String((body && body.userId) || '').trim(),
                note: String((body && body.note) || '').trim(),
                at: new Date().toISOString(),
            };
            items.push(row);
        } else if (action === 'remove') {
            const id = String((body && (body.id || body.waitlistId)) || '').trim();
            items = items.filter((x) => String(x.id) !== id);
        } else if (action === 'clear') {
            items = [];
        }
        cur.waitlist = items;
        map[day] = this.live18SerializeDayOpsEntry(cur);
        await this.live18WriteDayOpsMap(projectId, map);
        return { date: day, items };
    }
    async live18ForceCheckIn(projectId, body, actor) {
        await this.live18AssertLiveWrite(projectId, actor);
        const bookingId = String((body && body.bookingId) || '').trim();
        const note = String((body && (body.note || body.auditNote || body.redeemNote)) || '').trim();
        if (!bookingId) throw new common_1.BadRequestException('bookingId 必填');
        if (!note) throw new common_1.BadRequestException('强制核销须填写审计备注');
        const day = String((body && (body.date || body.dayKey)) || this.todayDayKey()).trim();
        // bypass pauseCheckin by temporarily clearing — do force via direct redeem path with note in tripPlan
        const booking = await this.prisma.studyBooking.findFirst({
            where: { id: bookingId, projectId: String(projectId) },
            include: { user: true, project: true },
        });
        if (!booking) throw new common_1.NotFoundException('预约不存在');
        const st = String(booking.status);
        if (st === 'CANCELLED' || st === 'CANCELED') throw new common_1.BadRequestException('订单已取消');
        const plan = (booking.tripPlan && typeof booking.tripPlan === 'object') ? JSON.parse(JSON.stringify(booking.tripPlan)) : {};
        if (!Array.isArray(plan.dayKeys)) plan.dayKeys = [];
        if (plan.dayKeys.indexOf(day) < 0) plan.dayKeys.push(day);
        if (!plan.checkIn || typeof plan.checkIn !== 'object') plan.checkIn = { tokens: {}, redeemed: {} };
        if (!plan.checkIn.redeemed || typeof plan.checkIn.redeemed !== 'object') plan.checkIn.redeemed = {};
        plan.checkIn.redeemed[day] = {
            at: new Date().toISOString(),
            force: true,
            note,
            by: actor && (actor.id || actor.userId || actor.username) || 'admin',
        };
        plan.forceCheckInLog = (plan.forceCheckInLog || []).concat([{ day, note, at: new Date().toISOString() }]);
        const data = { tripPlan: plan };
        if (!booking.checkedInAt) data.checkedInAt = new Date();
        await this.prisma.studyBooking.update({ where: { id: bookingId }, data });
        await this.live18PushTimeline(projectId, day, { type: 'force_checkin', bookingId, note, summary: '强制核销：' + note });
        if (actor) {
            try {
                await this.writeOpLog(actor, {
                    module: 'study', action: 'update', targetType: 'StudyBooking', targetId: bookingId,
                    targetLabel: booking.participantName || bookingId, summary: '强制核销', detail: { projectId, day, note }, projectId: String(projectId),
                });
            } catch (_e) {}
        }
        return { ok: true, bookingId, day, note, forced: true };
    }
    async live18NoshowRemind(projectId, body, actor) {
        await this.live18AssertLiveWrite(projectId, actor);
        const day = String((body && (body.date || body.dayKey)) || this.todayDayKey()).trim();
        const bookingIds = this.live18NormalizeList(body && (body.bookingIds || body.ids || body.bookingId)).map((x) => String(x).trim()).filter(Boolean);
        const channel = String((body && body.channel) || 'console').trim(); // console | wechat_stub | export
        const { map, cur } = await this.live18LoadDayOps(projectId, day);
        const rem = Array.isArray(cur.noshowReminders) ? cur.noshowReminders.slice() : [];
        const now = new Date().toISOString();
        const added = [];
        for (let i = 0; i < bookingIds.length; i++) {
            const row = { bookingId: bookingIds[i], at: now, channel, by: actor && (actor.id || actor.username) || 'admin', wechatStub: channel === 'wechat_stub' };
            rem.push(row);
            added.push(row);
        }
        cur.noshowReminders = rem.slice(-500);
        map[day] = this.live18SerializeDayOpsEntry(cur);
        await this.live18WriteDayOpsMap(projectId, map);
        await this.live18PushTimeline(projectId, day, { type: 'noshow_remind', count: added.length, channel, summary: '缺勤提醒 ×' + added.length + '（' + channel + '）' });
        return {
            ok: true,
            reminded: added,
            smsProvider: null,
            limitation: '无短信通道：仅控制台标记/队列；wechat_stub 为订阅消息占位，未真实下发。',
        };
    }
    async live18SetTourFlags(projectId, body, actor) {
        await this.live18AssertLiveWrite(projectId, actor);
        const day = String((body && (body.date || body.dayKey)) || this.todayDayKey()).trim();
        const { map, cur } = await this.live18LoadDayOps(projectId, day);
        if (body && body.tourPaused != null) cur.tourPaused = !!body.tourPaused;
        if (body && body.broadcast !== undefined) {
            if (body.broadcast == null || body.broadcast === '' || (typeof body.broadcast === 'object' && !body.broadcast.text && !body.broadcast.message)) {
                cur.broadcast = null;
            } else if (typeof body.broadcast === 'string') {
                cur.broadcast = { text: body.broadcast.trim(), level: String(body.level || 'warn'), at: new Date().toISOString(), id: 'bc_' + Date.now().toString(36) };
            } else {
                cur.broadcast = {
                    text: String(body.broadcast.text || body.broadcast.message || '').trim(),
                    level: String(body.broadcast.level || body.level || 'warn'),
                    at: new Date().toISOString(),
                    id: String(body.broadcast.id || ('bc_' + Date.now().toString(36))),
                };
            }
        }
        if (body && body.closedSpots !== undefined) {
            cur.closedSpots = this.live18NormalizeList(body.closedSpots).map((x) => String(x).trim()).filter(Boolean);
        }
        if (body && body.closeSpot) {
            const id = String(body.closeSpot).trim();
            if (id && cur.closedSpots.indexOf(id) < 0) cur.closedSpots.push(id);
        }
        if (body && body.openSpot) {
            const id = String(body.openSpot).trim();
            cur.closedSpots = (cur.closedSpots || []).filter((x) => x !== id);
        }
        if (body && body.spotStepOverrides !== undefined && typeof body.spotStepOverrides === 'object') {
            cur.spotStepOverrides = body.spotStepOverrides;
        }
        if (body && body.spotId && (body.requiredStepIds || body.skipStepIds || body.clearOverride)) {
            const sid = String(body.spotId).trim();
            if (body.clearOverride) {
                const next = Object.assign({}, cur.spotStepOverrides || {});
                delete next[sid];
                cur.spotStepOverrides = next;
            } else {
                cur.spotStepOverrides = Object.assign({}, cur.spotStepOverrides || {}, {
                    [sid]: {
                        requiredStepIds: this.live18NormalizeList(body.requiredStepIds).map(String),
                        skipStepIds: this.live18NormalizeList(body.skipStepIds).map(String),
                        note: String(body.note || '').trim(),
                        at: new Date().toISOString(),
                    },
                });
            }
        }
        map[day] = this.live18SerializeDayOpsEntry(cur);
        if (this.live18IsEmptyDayOps(cur)) delete map[day];
        await this.live18WriteDayOpsMap(projectId, map);
        await this.live18PushTimeline(projectId, day, {
            type: 'tour_flags',
            summary: '更新导览旗标',
            tourPaused: cur.tourPaused,
            broadcast: cur.broadcast && cur.broadcast.text,
            closedSpots: cur.closedSpots,
        });
        return this.studyProjectLiveSummary(projectId, day, actor);
    }
    async live18Anomaly(projectId, body, actor) {
        const day = String((body && (body.date || body.dayKey)) || this.todayDayKey()).trim();
        const action = String((body && body.action) || 'list').trim();
        if (action === 'list') {
            await this.live18AssertLiveRead(projectId, actor);
            const { cur } = await this.live18LoadDayOps(projectId, day);
            return { date: day, items: cur.anomalies || [] };
        }
        await this.live18AssertLiveWrite(projectId, actor);
        const { map, cur } = await this.live18LoadDayOps(projectId, day);
        let items = Array.isArray(cur.anomalies) ? cur.anomalies.slice() : [];
        if (action === 'add' || action === 'report') {
            items.push({
                id: 'an_' + Date.now().toString(36),
                type: String((body && body.type) || 'generic'),
                message: String((body && (body.message || body.text)) || '').trim(),
                bookingId: String((body && body.bookingId) || '').trim(),
                routePointId: String((body && body.routePointId) || '').trim(),
                at: new Date().toISOString(),
                status: 'open',
            });
        } else if (action === 'ack' || action === 'resolve') {
            const id = String((body && body.id) || '').trim();
            items = items.map((x) => String(x.id) === id ? Object.assign({}, x, { status: action === 'ack' ? 'acked' : 'resolved', resolvedAt: new Date().toISOString() }) : x);
        } else if (action === 'clear') {
            items = [];
        }
        cur.anomalies = items.slice(-200);
        map[day] = this.live18SerializeDayOpsEntry(cur);
        await this.live18WriteDayOpsMap(projectId, map);
        return { date: day, items: cur.anomalies };
    }
    async live18PointsLedger(projectId, query, actor) {
        await this.live18AssertLiveRead(projectId, actor);
        const bookingId = String((query && query.bookingId) || '').trim();
        if (!bookingId) throw new common_1.BadRequestException('bookingId 必填');
        const booking = await this.prisma.studyBooking.findFirst({ where: { id: bookingId, projectId: String(projectId) } });
        if (!booking) throw new common_1.NotFoundException('预约不存在');
        const plan = (booking.tripPlan && typeof booking.tripPlan === 'object') ? booking.tripPlan : {};
        const sp = (plan.stationProgress && typeof plan.stationProgress === 'object') ? plan.stationProgress : {};
        const tour = (plan.tour && typeof plan.tour === 'object') ? plan.tour : {};
        const ledger = [];
        Object.keys(sp).forEach((sid) => {
            const row = sp[sid] || {};
            const pts = Number(row.pointsEarned || 0) || 0;
            if (pts) ledger.push({ type: 'station', routePointId: sid, points: pts, at: row.updatedAt || row.at || null, title: row.title || sid });
        });
        const adjs = Array.isArray(tour.pointsAdjustments) ? tour.pointsAdjustments : [];
        for (let i = 0; i < adjs.length; i++) {
            ledger.push(Object.assign({ type: 'manual' }, adjs[i]));
        }
        const spent = Number(tour.tourPointsSpent || 0) || 0;
        if (spent) ledger.push({ type: 'spent', points: -spent, title: '商城已兑' });
        let total = 0;
        ledger.forEach((r) => { total += Number(r.points || 0) || 0; });
        return {
            bookingId,
            participantName: booking.participantName || '',
            ledger,
            adjustments: adjs,
            totalPoints: total,
            spentPoints: spent,
            availablePoints: Math.max(0, total),
        };
    }
    async live18AdjustPoints(projectId, body, actor) {
        await this.live18AssertLiveWrite(projectId, actor);
        const bookingId = String((body && body.bookingId) || '').trim();
        const delta = Math.floor(Number(body && body.delta != null ? body.delta : body.points) || 0);
        const note = String((body && body.note) || '').trim() || '手动调分';
        if (!bookingId) throw new common_1.BadRequestException('bookingId 必填');
        if (!delta) throw new common_1.BadRequestException('delta 不能为 0');
        const booking = await this.prisma.studyBooking.findFirst({ where: { id: bookingId, projectId: String(projectId) } });
        if (!booking) throw new common_1.NotFoundException('预约不存在');
        const plan = (booking.tripPlan && typeof booking.tripPlan === 'object') ? JSON.parse(JSON.stringify(booking.tripPlan)) : {};
        if (!plan.tour || typeof plan.tour !== 'object') plan.tour = {};
        if (!plan.stationProgress || typeof plan.stationProgress !== 'object') plan.stationProgress = {};
        // store manual bucket under __manual__
        const key = '__manual__';
        const cur = Object.assign({ pointsEarned: 0, done: [], skipped: [] }, plan.stationProgress[key] || {});
        cur.pointsEarned = Math.max(0, (Number(cur.pointsEarned || 0) || 0) + delta);
        cur.updatedAt = new Date().toISOString();
        cur.title = '手动调分';
        plan.stationProgress[key] = cur;
        const adj = { points: delta, note, at: new Date().toISOString(), by: actor && (actor.id || actor.username) || 'admin' };
        plan.tour.pointsAdjustments = (plan.tour.pointsAdjustments || []).concat([adj]);
        await this.prisma.studyBooking.update({ where: { id: bookingId }, data: { tripPlan: plan } });
        const day = String((body && body.date) || this.todayDayKey());
        await this.live18PushTimeline(projectId, day, { type: 'points_adjust', bookingId, delta, note, summary: '调分 ' + (delta > 0 ? '+' : '') + delta });
        return { ok: true, bookingId, delta, note, pointsEarnedManual: cur.pointsEarned };
    }
    async live18CouponsInspect(projectId, query, actor) {
        await this.live18AssertLiveRead(projectId, actor);
        const bookingId = String((query && query.bookingId) || '').trim();
        const userId = String((query && query.userId) || '').trim();
        let uid = userId;
        if (!uid && bookingId) {
            const b = await this.prisma.studyBooking.findFirst({ where: { id: bookingId, projectId: String(projectId) } });
            if (!b) throw new common_1.NotFoundException('预约不存在');
            uid = b.userId;
        }
        if (!uid) throw new common_1.BadRequestException('bookingId 或 userId 必填');
        try {
            await this.prisma.$executeRawUnsafe(`SELECT 1 FROM "UserCoupon" LIMIT 1`);
        } catch (_e) {
            return { userId: uid, items: [], note: 'UserCoupon 表不可用' };
        }
        const rows = await this.prisma.$queryRawUnsafe(
            `SELECT * FROM "UserCoupon" WHERE "userId"=$1 AND ("projectId"=$2 OR "projectId" IS NULL OR "projectId"='') ORDER BY "createdAt" DESC LIMIT 200`,
            uid, String(projectId)
        );
        return { userId: uid, items: rows || [] };
    }
    async live18BatchIssueCoupons(projectId, body, actor) {
        await this.live18AssertLiveWrite(projectId, actor);
        const bookingIds = this.live18NormalizeList(body && (body.bookingIds || body.ids)).map(String).filter(Boolean);
        const routePointId = String((body && body.routePointId) || '').trim();
        const title = String((body && body.title) || '站点卡券').trim();
        const productId = String((body && body.productId) || '').trim() || null;
        if (!bookingIds.length) throw new common_1.BadRequestException('bookingIds 必填');
        const issued = [];
        for (let i = 0; i < bookingIds.length; i++) {
            const b = await this.prisma.studyBooking.findFirst({ where: { id: bookingIds[i], projectId: String(projectId) } });
            if (!b) continue;
            const id = 'uc_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8) + i;
            try {
                let expireAt = null;
                const ed = body && body.expireDays != null ? Number(body.expireDays) : NaN;
                if (Number.isFinite(ed) && ed > 0) {
                    const n = Math.min(3650, Math.round(ed));
                    let issueKey;
                    try {
                        issueKey = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
                    } catch (_e) {
                        const ms = Date.now() + 8 * 3600000;
                        const x = new Date(ms);
                        issueKey = x.getUTCFullYear() + '-' + String(x.getUTCMonth() + 1).padStart(2, '0') + '-' + String(x.getUTCDate()).padStart(2, '0');
                    }
                    const parts = String(issueKey).split('-').map((x) => parseInt(x, 10));
                    const dt = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
                    dt.setUTCDate(dt.getUTCDate() + n);
                    const endKey = dt.getUTCFullYear() + '-' + String(dt.getUTCMonth() + 1).padStart(2, '0') + '-' + String(dt.getUTCDate()).padStart(2, '0');
                    expireAt = new Date(endKey + 'T23:59:59.999+08:00');
                }
                else if (body && body.expireAt != null && String(body.expireAt).trim()) {
                    const d = new Date(String(body.expireAt).trim());
                    if (!isNaN(d.getTime())) expireAt = d;
                }
                await this.prisma.$executeRawUnsafe(
                    `INSERT INTO "UserCoupon" (id,"userId",title,subtitle,type,value,"minAmount",status,"expireAt",scope,source,"productId","projectId","routePointId","bookingId",grade,"createdAt")
                     VALUES ($1,$2,$3,$4,'gift','0','0','unused',$5,$6,'live_batch',$7,$8,$9,$10,$11,NOW())`,
                    id, b.userId, title, String((body && body.subtitle) || 'Live 批量发放'), expireAt, title, productId, String(projectId), routePointId || null, b.id, String((body && body.grade) || 'live')
                );
                issued.push({ couponId: id, bookingId: b.id, userId: b.userId });
            } catch (e) {
                issued.push({ bookingId: b.id, error: String(e && e.message || e) });
            }
        }
        const day = String((body && body.date) || this.todayDayKey());
        await this.live18PushTimeline(projectId, day, { type: 'coupon_batch', count: issued.length, title, summary: '批量发卡 ×' + issued.length });
        return { ok: true, issued };
    }
    resolveCouponExpiryUpdate(existed, body) {
        const out = { setExpire: false, clearExpire: false, expireAtIso: null, extendDays: null, reactivate: false };
        const extendRaw = body && body.extendDays != null ? Number(body.extendDays) : NaN;
        if (Number.isFinite(extendRaw) && extendRaw !== 0) {
            const days = Math.min(3650, Math.max(-3650, Math.round(extendRaw)));
            out.extendDays = days;
            const now = Date.now();
            let anchor;
            if (existed && existed.expireAt) {
                const cur = new Date(existed.expireAt);
                anchor = (!isNaN(cur.getTime()) && cur.getTime() > now) ? cur : new Date(now);
            }
            else {
                anchor = new Date(now);
            }
            const next = new Date(anchor.getTime() + days * 86400000);
            out.setExpire = true;
            out.expireAtIso = next.toISOString();
            out.reactivate = next.getTime() > now;
            return out;
        }
        if (body && Object.prototype.hasOwnProperty.call(body, 'expireAt')) {
            out.setExpire = true;
            const raw = body.expireAt;
            if (raw == null || String(raw).trim() === '') {
                out.clearExpire = true;
                out.expireAtIso = null;
                out.reactivate = true;
                return out;
            }
            let s = String(raw).trim();
            // date-only → end of that calendar day in +08:00 (学员本地常见)
            if (/^\d{4}-\d{2}-\d{2}$/.test(s))
                s = s + 'T23:59:59+08:00';
            const d = new Date(s);
            if (isNaN(d.getTime()))
                throw new common_1.BadRequestException('过期时间无效');
            out.expireAtIso = d.toISOString();
            out.reactivate = d.getTime() > Date.now();
            return out;
        }
        return out;
    }
    async live18UpdateCouponExpiry(projectId, couponId, body, actor) {
        await this.live18AssertLiveWrite(projectId, actor);
        const id = String(couponId || '').trim();
        if (!id)
            throw new common_1.BadRequestException('couponId 必填');
        let rows;
        try {
            rows = await this.prisma.$queryRawUnsafe(`SELECT * FROM "UserCoupon" WHERE id=$1 LIMIT 1`, id);
        }
        catch (_e) {
            throw new common_1.BadRequestException('UserCoupon 表不可用');
        }
        const coupon = rows && rows[0];
        if (!coupon)
            throw new common_1.NotFoundException('卡券不存在');
        const cpid = String(coupon.projectId || '').trim();
        if (cpid && cpid !== String(projectId))
            throw new common_1.BadRequestException('卡券不属于本项目');
        const curStatus = String(coupon.status || '').toLowerCase();
        if (curStatus === 'used')
            throw new common_1.BadRequestException('已核销卡券不可改过期时间');
        const resolved = this.resolveCouponExpiryUpdate(coupon, body || {});
        if (!resolved.setExpire)
            throw new common_1.BadRequestException('请提供 expireAt 或 extendDays');
        let nextStatus = curStatus || 'unused';
        if (resolved.reactivate && nextStatus === 'expired')
            nextStatus = 'unused';
        if (!resolved.clearExpire && resolved.expireAtIso && new Date(resolved.expireAtIso).getTime() <= Date.now() && nextStatus === 'unused')
            nextStatus = 'expired';
        if (resolved.clearExpire) {
            await this.prisma.$executeRawUnsafe(`UPDATE "UserCoupon" SET "expireAt"=NULL, status=$1 WHERE id=$2`, nextStatus === 'expired' ? 'unused' : nextStatus, id);
            nextStatus = nextStatus === 'expired' ? 'unused' : nextStatus;
        }
        else {
            await this.prisma.$executeRawUnsafe(`UPDATE "UserCoupon" SET "expireAt"=$1::timestamptz, status=$2 WHERE id=$3`, resolved.expireAtIso, nextStatus, id);
        }
        const day = String((body && body.date) || this.todayDayKey());
        try {
            await this.live18PushTimeline(projectId, day, {
                type: 'coupon_expiry',
                couponId: id,
                userId: coupon.userId,
                expireAt: resolved.clearExpire ? null : resolved.expireAtIso,
                extendDays: resolved.extendDays,
                summary: resolved.clearExpire ? '卡券改为长期有效' : (resolved.extendDays ? ('延长卡券 ' + (resolved.extendDays > 0 ? '+' : '') + resolved.extendDays + ' 天') : '修改卡券过期时间'),
            });
        }
        catch (_e) {}
        await this.writeOpLog(actor, {
            module: 'live',
            action: 'update',
            targetType: 'UserCoupon',
            targetId: id,
            targetLabel: coupon.title || '',
            summary: '修改已发奖品卡券过期时间',
            detail: { projectId: String(projectId), userId: coupon.userId, expireAt: resolved.expireAtIso, extendDays: resolved.extendDays, status: nextStatus },
        });
        const out = await this.prisma.$queryRawUnsafe(
            `SELECT id, title, subtitle, type, value, status, "expireAt", "usedAt", scope, source, "productId", "projectId", "routePointId", "bookingId", grade, "createdAt" FROM "UserCoupon" WHERE id=$1`,
            id
        );
        return { ok: true, coupon: out && out[0] ? out[0] : { id, status: nextStatus, expireAt: resolved.expireAtIso } };
    }
    async live18CertAction(projectId, body, actor) {

        await this.live18AssertLiveWrite(projectId, actor);
        const action = String((body && body.action) || '').trim(); // void | reissue
        const bookingId = String((body && body.bookingId) || '').trim();
        const certId = String((body && (body.certificateId || body.certId)) || '').trim();
        if (!bookingId && !certId) throw new common_1.BadRequestException('bookingId 或 certificateId 必填');
        const booking = bookingId
            ? await this.prisma.studyBooking.findFirst({ where: { id: bookingId, projectId: String(projectId) }, include: { user: true, project: true } })
            : null;
        let cert = null;
        if (certId) {
            try { cert = await this.prisma.studyCertificate.findUnique({ where: { id: certId } }); } catch (_e) { cert = null; }
        }
        if (!cert && booking && booking.certificateId) {
            try { cert = await this.prisma.studyCertificate.findUnique({ where: { id: booking.certificateId } }); } catch (_e) {}
        }
        if (!cert && booking) {
            try {
                cert = await this.prisma.studyCertificate.findFirst({ where: { bookingId: booking.id } });
            } catch (_e) {}
        }
        const day = String((body && body.date) || this.todayDayKey());
        if (action === 'void') {
            if (!cert) throw new common_1.NotFoundException('证书不存在');
            try {
                await this.prisma.$executeRawUnsafe(
                    `UPDATE "StudyCertificate" SET status='void', "updatedAt"=NOW() WHERE id=$1`,
                    cert.id
                );
            } catch (_e) {
                // fallback: mark in meta via bodyHtml prefix
                try {
                    await this.prisma.studyCertificate.update({ where: { id: cert.id }, data: { holderName: '[作废] ' + (cert.holderName || '') } });
                } catch (_e2) {}
            }
            if (booking) {
                const plan = (booking.tripPlan && typeof booking.tripPlan === 'object') ? JSON.parse(JSON.stringify(booking.tripPlan)) : {};
                if (!plan.tour) plan.tour = {};
                plan.tour.certificateVoided = true;
                plan.tour.certificateVoidedAt = new Date().toISOString();
                await this.prisma.studyBooking.update({ where: { id: booking.id }, data: { tripPlan: plan, certificateId: null } });
            }
            await this.live18PushTimeline(projectId, day, { type: 'cert_void', bookingId: bookingId || null, certId: cert.id, summary: '作废证书' });
            return { ok: true, action: 'void', certificateId: cert.id };
        }
        if (action === 'reissue') {
            if (!booking) throw new common_1.BadRequestException('reissue 需要 bookingId');
            // clear void flag and mint new cert row best-effort
            const newId = 'sc_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
            const holder = booking.participantName || (booking.user && (booking.user.realName || booking.user.nickname)) || '学员';
            const certNo = 'RJ' + Date.now().toString().slice(-10);
            try {
                await this.prisma.studyCertificate.create({
                    data: {
                        id: newId,
                        userId: booking.userId,
                        projectId: String(projectId),
                        bookingId: booking.id,
                        holderName: holder,
                        certificateNo: certNo,
                        title: (booking.project && booking.project.title) || '结业证书',
                        issuedAt: new Date(),
                    },
                });
            } catch (_e) {
                try {
                    await this.prisma.$executeRawUnsafe(
                        `INSERT INTO "StudyCertificate" (id,"userId","projectId","bookingId","holderName","certificateNo",title,"issuedAt","createdAt")
                         VALUES ($1,$2,$3,$4,$5,$6,$7,NOW(),NOW())`,
                        newId, booking.userId, String(projectId), booking.id, holder, certNo, (booking.project && booking.project.title) || '结业证书'
                    );
                } catch (e2) {
                    throw new common_1.BadRequestException('补发证书失败：' + String(e2 && e2.message || e2));
                }
            }
            const plan = (booking.tripPlan && typeof booking.tripPlan === 'object') ? JSON.parse(JSON.stringify(booking.tripPlan)) : {};
            if (!plan.tour) plan.tour = {};
            plan.tour.graduated = true;
            plan.tour.mallRedeemUnlocked = true;
            plan.tour.certificateVoided = false;
            plan.tour.certificateReissuedAt = new Date().toISOString();
            await this.prisma.studyBooking.update({ where: { id: booking.id }, data: { tripPlan: plan, certificateId: newId } });
            await this.live18PushTimeline(projectId, day, { type: 'cert_reissue', bookingId: booking.id, certId: newId, summary: '补发证书' });
            return { ok: true, action: 'reissue', certificateId: newId, certificateNo: certNo };
        }
        throw new common_1.BadRequestException('action 须为 void 或 reissue');
    }
    async live18PuzzlePiece(projectId, body, actor) {
        await this.live18AssertLiveWrite(projectId, actor);
        const bookingId = String((body && body.bookingId) || '').trim();
        const routePointId = String((body && body.routePointId) || '').trim();
        const action = String((body && body.action) || 'grant').trim(); // grant|revoke
        if (!bookingId || !routePointId) throw new common_1.BadRequestException('bookingId 与 routePointId 必填');
        const booking = await this.prisma.studyBooking.findFirst({ where: { id: bookingId, projectId: String(projectId) } });
        if (!booking) throw new common_1.NotFoundException('预约不存在');
        const plan = (booking.tripPlan && typeof booking.tripPlan === 'object') ? JSON.parse(JSON.stringify(booking.tripPlan)) : {};
        if (!plan.puzzle || typeof plan.puzzle !== 'object') plan.puzzle = { pieces: {} };
        if (!plan.puzzle.pieces || typeof plan.puzzle.pieces !== 'object') plan.puzzle.pieces = {};
        if (action === 'revoke') {
            delete plan.puzzle.pieces[routePointId];
        } else {
            plan.puzzle.pieces[routePointId] = { collected: true, at: new Date().toISOString(), byAdmin: true };
        }
        // also mirror into stationProgress cleared for grant
        if (!plan.stationProgress) plan.stationProgress = {};
        if (action === 'grant') {
            const cur = Object.assign({ done: [], skipped: [], pointsEarned: 0 }, plan.stationProgress[routePointId] || {});
            cur.puzzleGranted = true;
            cur.updatedAt = new Date().toISOString();
            plan.stationProgress[routePointId] = cur;
        }
        await this.prisma.studyBooking.update({ where: { id: bookingId }, data: { tripPlan: plan } });
        const day = String((body && body.date) || this.todayDayKey());
        await this.live18PushTimeline(projectId, day, { type: 'puzzle_' + action, bookingId, routePointId, summary: (action === 'grant' ? '发放' : '收回') + '拼图块' });
        return { ok: true, action, bookingId, routePointId, pieces: plan.puzzle.pieces };
    }
    async live18ScanLookup(projectId, body, actor) {
        await this.live18AssertLiveRead(projectId, actor);
        const raw = String((body && (body.code || body.raw || body.payload || body.q)) || '').trim();
        if (!raw) throw new common_1.BadRequestException('扫码内容为空');
        let bookingId = '';
        let dayKey = '';
        let studyNo = '';
        let phone = '';
        try {
            const obj = JSON.parse(raw);
            bookingId = String(obj.bookingId || obj.bid || obj.id || '').trim();
            dayKey = String(obj.dayKey || obj.date || '').trim();
            studyNo = String(obj.studyNo || '').trim();
            phone = String(obj.phone || '').trim();
        } catch (_e) {
            // plain id / studyNo
            if (/^sb_|^[0-9a-f-]{16,}$/i.test(raw)) bookingId = raw;
            else studyNo = raw;
        }
        let booking = null;
        if (bookingId) {
            booking = await this.prisma.studyBooking.findFirst({
                where: { id: bookingId, projectId: String(projectId) },
                include: { user: true },
            });
        }
        if (!booking && studyNo) {
            const user = await this.prisma.user.findFirst({ where: { studyNo: String(studyNo) } });
            if (user) {
                booking = await this.prisma.studyBooking.findFirst({
                    where: { projectId: String(projectId), userId: user.id, status: { in: [client_1.BookingStatus.BOOKED, client_1.BookingStatus.COMPLETED] } },
                    include: { user: true },
                    orderBy: { createdAt: 'desc' },
                });
            }
        }
        if (!booking && phone) {
            booking = await this.prisma.studyBooking.findFirst({
                where: { projectId: String(projectId), OR: [{ participantPhone: phone }, { user: { phone } }], status: { in: [client_1.BookingStatus.BOOKED, client_1.BookingStatus.COMPLETED] } },
                include: { user: true },
                orderBy: { createdAt: 'desc' },
            });
        }
        if (!booking) throw new common_1.NotFoundException('未找到对应预约');
        return {
            bookingId: booking.id,
            participantName: booking.participantName || (booking.user && (booking.user.realName || booking.user.nickname)) || '',
            phone: booking.participantPhone || (booking.user && booking.user.phone) || '',
            studyNo: (booking.user && booking.user.studyNo) || studyNo || '',
            status: booking.status,
            dayKey: dayKey || this.todayDayKey(),
            checkedInAt: booking.checkedInAt,
        };
    }


    // ===== Study schedule (可约日程 / 内容版本 / 日志) =====
    scheduleNewId(prefix) {
        return String(prefix || 'ss') + '_' + (0, crypto_1.randomBytes)(10).toString('hex');
    }
    async ensureStudyScheduleSchema() {
        if (this._studyScheduleSchemaReady) return;
        try {
            await this.prisma.$executeRawUnsafe(`
CREATE TABLE IF NOT EXISTS "StudyContentVersion" (
  "id" TEXT PRIMARY KEY,
  "projectId" TEXT NOT NULL REFERENCES "StudyProject"("id") ON DELETE CASCADE,
  "routePointId" TEXT NULL,
  "name" TEXT NOT NULL,
  "note" TEXT NOT NULL DEFAULT '',
  "stepsJson" JSONB NOT NULL DEFAULT '[]'::jsonb,
  "resourceIds" JSONB NOT NULL DEFAULT '[]'::jsonb,
  "isDefault" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
)`);
            await this.prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "StudyContentVersion_projectId_idx" ON "StudyContentVersion"("projectId")`);
            await this.prisma.$executeRawUnsafe(`
CREATE TABLE IF NOT EXISTS "StudyScheduleDay" (
  "id" TEXT PRIMARY KEY,
  "projectId" TEXT NOT NULL REFERENCES "StudyProject"("id") ON DELETE CASCADE,
  "date" DATE NOT NULL,
  "open" BOOLEAN NOT NULL DEFAULT true,
  "capacity" INTEGER NULL,
  "note" TEXT NOT NULL DEFAULT '',
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE ("projectId", "date")
)`);
            await this.prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "StudyScheduleDay_projectId_date_idx" ON "StudyScheduleDay"("projectId", "date")`);
            await this.prisma.$executeRawUnsafe(`
CREATE TABLE IF NOT EXISTS "StudyScheduleSpot" (
  "id" TEXT PRIMARY KEY,
  "dayId" TEXT NOT NULL REFERENCES "StudyScheduleDay"("id") ON DELETE CASCADE,
  "routePointId" TEXT NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "contentVersionId" TEXT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE ("dayId", "routePointId")
)`);
            await this.prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "StudyScheduleSpot_dayId_idx" ON "StudyScheduleSpot"("dayId")`);
            await this.prisma.$executeRawUnsafe(`
CREATE TABLE IF NOT EXISTS "StudyScheduleLog" (
  "id" TEXT PRIMARY KEY,
  "projectId" TEXT NOT NULL REFERENCES "StudyProject"("id") ON DELETE CASCADE,
  "actorId" TEXT NULL,
  "actorName" TEXT NOT NULL DEFAULT '',
  "action" TEXT NOT NULL,
  "payload" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
)`);
            await this.prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "StudyScheduleLog_projectId_createdAt_idx" ON "StudyScheduleLog"("projectId", "createdAt" DESC)`);
        } catch (_e) {}
        this._studyScheduleSchemaReady = true;
    }
    scheduleDateKey(v) {
        const s = String(v || '').trim().slice(0, 10);
        if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return '';
        return s;
    }
    async writeScheduleLog(projectId, actor, action, payload) {
        await this.ensureStudyScheduleSchema();
        const id = this.scheduleNewId('ssl');
        const actorId = actor && (actor.userId || actor.id || actor.adminId) ? String(actor.userId || actor.id || actor.adminId) : null;
        const actorName = String((actor && (actor.name || actor.displayName || actor.username || actor.realName)) || '').trim();
        try {
            await this.prisma.$executeRawUnsafe(
                `INSERT INTO "StudyScheduleLog" ("id","projectId","actorId","actorName","action","payload","createdAt")
                 VALUES ($1,$2,$3,$4,$5,$6::jsonb,NOW())`,
                id, String(projectId), actorId, actorName, String(action || 'update'), JSON.stringify(payload || {})
            );
        } catch (_e) {}
    }
    serializeScheduleSpot(row) {
        return {
            id: row.id,
            dayId: row.dayId,
            routePointId: row.routePointId,
            enabled: row.enabled !== false,
            contentVersionId: row.contentVersionId || null,
            contentVersionName: row.contentVersionName || null,
        };
    }
    serializeScheduleDay(row, spots) {
        return {
            id: row.id,
            projectId: row.projectId,
            date: this.scheduleDateKey(row.date instanceof Date ? row.date.toISOString().slice(0, 10) : row.date),
            open: row.open !== false && row.open !== 'f',
            capacity: row.capacity == null ? null : Number(row.capacity),
            note: row.note || '',
            spots: Array.isArray(spots) ? spots : [],
            updatedAt: row.updatedAt || null,
        };
    }
    serializeContentVersion(row) {
        let steps = row.stepsJson;
        if (typeof steps === 'string') {
            try { steps = JSON.parse(steps); } catch (_e) { steps = []; }
        }
        if (!Array.isArray(steps)) steps = [];
        let resourceIds = row.resourceIds;
        if (typeof resourceIds === 'string') {
            try { resourceIds = JSON.parse(resourceIds); } catch (_e) { resourceIds = []; }
        }
        if (!Array.isArray(resourceIds)) resourceIds = [];
        return {
            id: row.id,
            projectId: row.projectId,
            routePointId: row.routePointId || null,
            name: row.name || '',
            note: row.note || '',
            stepsJson: steps,
            resourceIds: resourceIds.map((x) => String(x)),
            isDefault: !!row.isDefault,
            createdAt: row.createdAt || null,
            updatedAt: row.updatedAt || null,
        };
    }
    async listScheduleDays(projectId, query, actor) {
        await this.ensureStudyScheduleSchema();
        await this.assertProjectCapability(projectId, actor, 'project.edit');
        const from = this.scheduleDateKey(query && query.from);
        const to = this.scheduleDateKey(query && query.to);
        let sql = `SELECT d.* FROM "StudyScheduleDay" d WHERE d."projectId"=$1`;
        const params = [String(projectId)];
        if (from) { params.push(from); sql += ` AND d."date" >= $${params.length}::date`; }
        if (to) { params.push(to); sql += ` AND d."date" <= $${params.length}::date`; }
        sql += ` ORDER BY d."date" ASC`;
        const days = await this.prisma.$queryRawUnsafe(sql, ...params);
        const dayIds = (days || []).map((d) => d.id);
        let spotsByDay = {};
        if (dayIds.length) {
            const spots = await this.prisma.$queryRawUnsafe(
                `SELECT s.*, v.name AS "contentVersionName"
                 FROM "StudyScheduleSpot" s
                 LEFT JOIN "StudyContentVersion" v ON v.id = s."contentVersionId"
                 WHERE s."dayId" = ANY($1::text[])
                 ORDER BY s."routePointId"`,
                dayIds
            );
            for (let i = 0; i < (spots || []).length; i++) {
                const s = spots[i];
                if (!spotsByDay[s.dayId]) spotsByDay[s.dayId] = [];
                spotsByDay[s.dayId].push(this.serializeScheduleSpot(s));
            }
        }
        return {
            projectId: String(projectId),
            days: (days || []).map((d) => this.serializeScheduleDay(d, spotsByDay[d.id] || [])),
        };
    }
    async getScheduleDay(projectId, date, actor) {
        await this.ensureStudyScheduleSchema();
        await this.assertProjectCapability(projectId, actor, 'project.edit');
        const dayKey = this.scheduleDateKey(date);
        if (!dayKey) throw new common_1.BadRequestException('日期无效');
        const rows = await this.prisma.$queryRawUnsafe(
            `SELECT * FROM "StudyScheduleDay" WHERE "projectId"=$1 AND "date"=$2::date LIMIT 1`,
            String(projectId), dayKey
        );
        const routePoints = await this.prisma.studyRoutePoint.findMany({
            where: { projectId: String(projectId) },
            orderBy: { sortOrder: 'asc' },
        });
        const versions = await this.listContentVersions(projectId, {}, actor).catch(() => ({ items: [] }));
        if (!rows || !rows[0]) {
            return {
                projectId: String(projectId),
                date: dayKey,
                exists: false,
                day: {
                    id: null,
                    projectId: String(projectId),
                    date: dayKey,
                    open: true,
                    capacity: null,
                    note: '',
                    spots: routePoints.map((rp) => ({
                        id: null,
                        dayId: null,
                        routePointId: rp.id,
                        enabled: rp.enabled !== false,
                        contentVersionId: null,
                        contentVersionName: null,
                        title: rp.title,
                        sortOrder: rp.sortOrder,
                    })),
                },
                routePoints: routePoints.map((rp) => ({ id: rp.id, title: rp.title, sortOrder: rp.sortOrder, enabled: rp.enabled !== false })),
                contentVersions: versions.items || [],
            };
        }
        const day = rows[0];
        const spots = await this.prisma.$queryRawUnsafe(
            `SELECT s.*, v.name AS "contentVersionName"
             FROM "StudyScheduleSpot" s
             LEFT JOIN "StudyContentVersion" v ON v.id = s."contentVersionId"
             WHERE s."dayId"=$1`,
            day.id
        );
        const spotMap = {};
        for (let i = 0; i < (spots || []).length; i++) spotMap[spots[i].routePointId] = spots[i];
        const mergedSpots = routePoints.map((rp) => {
            const s = spotMap[rp.id];
            if (s) {
                const ser = this.serializeScheduleSpot(s);
                ser.title = rp.title;
                ser.sortOrder = rp.sortOrder;
                return ser;
            }
            return {
                id: null,
                dayId: day.id,
                routePointId: rp.id,
                enabled: true,
                contentVersionId: null,
                contentVersionName: null,
                title: rp.title,
                sortOrder: rp.sortOrder,
            };
        });
        return {
            projectId: String(projectId),
            date: dayKey,
            exists: true,
            day: this.serializeScheduleDay(day, mergedSpots),
            routePoints: routePoints.map((rp) => ({ id: rp.id, title: rp.title, sortOrder: rp.sortOrder, enabled: rp.enabled !== false })),
            contentVersions: versions.items || [],
        };
    }
    async upsertScheduleDay(projectId, body, actor) {
        await this.ensureStudyScheduleSchema();
        await this.assertProjectCapability(projectId, actor, 'project.edit');
        const dayKey = this.scheduleDateKey(body && (body.date || body.dayKey));
        if (!dayKey) throw new common_1.BadRequestException('日期无效');
        const open = body && body.open === false ? false : true;
        let capacity = null;
        if (body && body.capacity != null && body.capacity !== '') {
            capacity = Math.max(0, Math.floor(Number(body.capacity) || 0));
        }
        const note = body && body.note != null ? String(body.note) : '';
        const existing = await this.prisma.$queryRawUnsafe(
            `SELECT id FROM "StudyScheduleDay" WHERE "projectId"=$1 AND "date"=$2::date LIMIT 1`,
            String(projectId), dayKey
        );
        let dayId;
        if (existing && existing[0]) {
            dayId = existing[0].id;
            await this.prisma.$executeRawUnsafe(
                `UPDATE "StudyScheduleDay" SET "open"=$1, "capacity"=$2, "note"=$3, "updatedAt"=NOW() WHERE id=$4`,
                open, capacity, note, dayId
            );
        } else {
            dayId = this.scheduleNewId('ssd');
            await this.prisma.$executeRawUnsafe(
                `INSERT INTO "StudyScheduleDay" ("id","projectId","date","open","capacity","note","createdAt","updatedAt")
                 VALUES ($1,$2,$3::date,$4,$5,$6,NOW(),NOW())`,
                dayId, String(projectId), dayKey, open, capacity, note
            );
        }
        const spotInputs = Array.isArray(body && body.spots) ? body.spots : null;
        if (spotInputs) {
            const routePoints = await this.prisma.studyRoutePoint.findMany({ where: { projectId: String(projectId) } });
            const validIds = {};
            for (let i = 0; i < routePoints.length; i++) validIds[routePoints[i].id] = true;
            for (let i = 0; i < spotInputs.length; i++) {
                const sp = spotInputs[i] || {};
                const rpId = String(sp.routePointId || '').trim();
                if (!rpId || !validIds[rpId]) continue;
                const enabled = sp.enabled === false ? false : true;
                const cvId = sp.contentVersionId ? String(sp.contentVersionId) : null;
                const found = await this.prisma.$queryRawUnsafe(
                    `SELECT id FROM "StudyScheduleSpot" WHERE "dayId"=$1 AND "routePointId"=$2 LIMIT 1`,
                    dayId, rpId
                );
                if (found && found[0]) {
                    await this.prisma.$executeRawUnsafe(
                        `UPDATE "StudyScheduleSpot" SET "enabled"=$1, "contentVersionId"=$2, "updatedAt"=NOW() WHERE id=$3`,
                        enabled, cvId, found[0].id
                    );
                } else {
                    await this.prisma.$executeRawUnsafe(
                        `INSERT INTO "StudyScheduleSpot" ("id","dayId","routePointId","enabled","contentVersionId","createdAt","updatedAt")
                         VALUES ($1,$2,$3,$4,$5,NOW(),NOW())`,
                        this.scheduleNewId('sss'), dayId, rpId, enabled, cvId
                    );
                }
            }
        } else {
            // ensure all route points have spot rows when creating day
            const routePoints = await this.prisma.studyRoutePoint.findMany({ where: { projectId: String(projectId) } });
            for (let i = 0; i < routePoints.length; i++) {
                const rp = routePoints[i];
                const found = await this.prisma.$queryRawUnsafe(
                    `SELECT id FROM "StudyScheduleSpot" WHERE "dayId"=$1 AND "routePointId"=$2 LIMIT 1`,
                    dayId, rp.id
                );
                if (!found || !found[0]) {
                    await this.prisma.$executeRawUnsafe(
                        `INSERT INTO "StudyScheduleSpot" ("id","dayId","routePointId","enabled","contentVersionId","createdAt","updatedAt")
                         VALUES ($1,$2,$3,true,NULL,NOW(),NOW())`,
                        this.scheduleNewId('sss'), dayId, rp.id
                    );
                }
            }
        }
        // Keep dayOps in sync for Live compatibility (open inverse of paused; capacity)
        try {
            const live = await this.readLiveBookingFields(projectId);
            const map = Object.assign({}, live.dayOps || {});
            const cur = this.live18MergeDayOpsRaw(map[dayKey] || {});
            cur.paused = !open;
            if (capacity != null) cur.capacity = capacity;
            if (note) cur.note = note;
            map[dayKey] = cur;
            await this.prisma.$executeRawUnsafe(
                `UPDATE "StudyProject" SET "dayOps"=$1::jsonb, "updatedAt"=NOW() WHERE id=$2`,
                JSON.stringify(map), String(projectId)
            );
        } catch (_e) {}
        await this.writeScheduleLog(projectId, actor, existing && existing[0] ? 'day.update' : 'day.create', {
            date: dayKey, open, capacity, note, spots: spotInputs || 'default-all-enabled',
        });
        return this.getScheduleDay(projectId, dayKey, actor);
    }
    async batchSetScheduleDays(projectId, body, actor) {
        await this.ensureStudyScheduleSchema();
        await this.assertProjectCapability(projectId, actor, 'project.edit');
        const dates = Array.isArray(body && body.dates) ? body.dates.map((d) => this.scheduleDateKey(d)).filter(Boolean) : [];
        const weekdays = Array.isArray(body && body.weekdays) ? body.weekdays.map((n) => Number(n)).filter((n) => n >= 0 && n <= 6) : null;
        const from = this.scheduleDateKey(body && body.from);
        const to = this.scheduleDateKey(body && body.to);
        let targetDates = dates.slice();
        if (!targetDates.length && from && to && from <= to) {
            let cur = from;
            let guard = 0;
            while (cur <= to && guard < 400) {
                const dt = new Date(cur + 'T12:00:00+08:00');
                const wd = dt.getDay(); // 0 Sun
                if (!weekdays || weekdays.indexOf(wd) >= 0) targetDates.push(cur);
                const next = new Date(dt.getTime() + 86400000);
                cur = next.toLocaleDateString('en-CA', { timeZone: 'Asia/Shanghai' });
                guard++;
            }
        }
        if (!targetDates.length) throw new common_1.BadRequestException('未指定日期');
        const open = body && body.open === false ? false : true;
        let capacity = null;
        if (body && body.capacity != null && body.capacity !== '') capacity = Math.max(0, Math.floor(Number(body.capacity) || 0));
        const note = body && body.note != null ? String(body.note) : undefined;
        const results = [];
        for (let i = 0; i < targetDates.length; i++) {
            const payload = { date: targetDates[i], open };
            if (capacity != null) payload.capacity = capacity;
            if (note != null) payload.note = note;
            if (body && body.spots) payload.spots = body.spots;
            // eslint-disable-next-line no-await-in-loop
            results.push(await this.upsertScheduleDay(projectId, payload, actor));
        }
        await this.writeScheduleLog(projectId, actor, 'day.batch', { dates: targetDates, open, capacity, note });
        return { projectId: String(projectId), count: results.length, dates: targetDates };
    }
    async copySchedule(projectId, body, actor) {
        await this.ensureStudyScheduleSchema();
        await this.assertProjectCapability(projectId, actor, 'project.edit');
        const mode = String((body && body.mode) || 'day').trim(); // day | week
        if (mode === 'week') {
            const fromWeekStart = this.scheduleDateKey(body && body.fromWeekStart);
            const toWeekStart = this.scheduleDateKey(body && body.toWeekStart);
            if (!fromWeekStart || !toWeekStart) throw new common_1.BadRequestException('请指定源周与目标周起始日');
            const copied = [];
            for (let i = 0; i < 7; i++) {
                const srcDt = new Date(fromWeekStart + 'T12:00:00+08:00');
                srcDt.setDate(srcDt.getDate() + i);
                const srcKey = srcDt.toLocaleDateString('en-CA', { timeZone: 'Asia/Shanghai' });
                const dstDt = new Date(toWeekStart + 'T12:00:00+08:00');
                dstDt.setDate(dstDt.getDate() + i);
                const dstKey = dstDt.toLocaleDateString('en-CA', { timeZone: 'Asia/Shanghai' });
                // eslint-disable-next-line no-await-in-loop
                const src = await this.getScheduleDay(projectId, srcKey, actor);
                if (!src.exists) continue;
                // eslint-disable-next-line no-await-in-loop
                await this.upsertScheduleDay(projectId, {
                    date: dstKey,
                    open: src.day.open,
                    capacity: src.day.capacity,
                    note: src.day.note,
                    spots: (src.day.spots || []).map((s) => ({
                        routePointId: s.routePointId,
                        enabled: s.enabled,
                        contentVersionId: s.contentVersionId,
                    })),
                }, actor);
                copied.push({ from: srcKey, to: dstKey });
            }
            await this.writeScheduleLog(projectId, actor, 'copy.week', { fromWeekStart, toWeekStart, copied });
            return { mode: 'week', copied };
        }
        const sourceDate = this.scheduleDateKey(body && body.sourceDate);
        const targetDates = Array.isArray(body && body.targetDates)
            ? body.targetDates.map((d) => this.scheduleDateKey(d)).filter(Boolean)
            : [];
        const targetFrom = this.scheduleDateKey(body && body.targetFrom);
        const targetTo = this.scheduleDateKey(body && body.targetTo);
        let targets = targetDates.slice();
        if (!targets.length && targetFrom && targetTo && targetFrom <= targetTo) {
            let cur = targetFrom;
            let guard = 0;
            while (cur <= targetTo && guard < 400) {
                targets.push(cur);
                const dt = new Date(cur + 'T12:00:00+08:00');
                const next = new Date(dt.getTime() + 86400000);
                cur = next.toLocaleDateString('en-CA', { timeZone: 'Asia/Shanghai' });
                guard++;
            }
        }
        if (!sourceDate || !targets.length) throw new common_1.BadRequestException('请指定源日期与目标范围');
        const src = await this.getScheduleDay(projectId, sourceDate, actor);
        if (!src.exists) throw new common_1.BadRequestException('源日期尚无场次配置');
        const copied = [];
        for (let i = 0; i < targets.length; i++) {
            if (targets[i] === sourceDate) continue;
            // eslint-disable-next-line no-await-in-loop
            await this.upsertScheduleDay(projectId, {
                date: targets[i],
                open: src.day.open,
                capacity: src.day.capacity,
                note: src.day.note,
                spots: (src.day.spots || []).map((s) => ({
                    routePointId: s.routePointId,
                    enabled: s.enabled,
                    contentVersionId: s.contentVersionId,
                })),
            }, actor);
            copied.push(targets[i]);
        }
        await this.writeScheduleLog(projectId, actor, 'copy.day', { sourceDate, copied });
        return { mode: 'day', sourceDate, copied };
    }
    async listScheduleLogs(projectId, query, actor) {
        await this.ensureStudyScheduleSchema();
        await this.assertProjectCapability(projectId, actor, 'project.edit');
        const limit = Math.min(200, Math.max(1, Math.floor(Number((query && query.limit) || 50) || 50)));
        const rows = await this.prisma.$queryRawUnsafe(
            `SELECT * FROM "StudyScheduleLog" WHERE "projectId"=$1 ORDER BY "createdAt" DESC LIMIT $2`,
            String(projectId), limit
        );
        return {
            projectId: String(projectId),
            items: (rows || []).map((r) => ({
                id: r.id,
                actorId: r.actorId,
                actorName: r.actorName || '',
                action: r.action,
                payload: typeof r.payload === 'string' ? (() => { try { return JSON.parse(r.payload); } catch (_e) { return {}; } })() : (r.payload || {}),
                createdAt: r.createdAt,
            })),
        };
    }
    async listContentVersions(projectId, query, actor) {
        await this.ensureStudyScheduleSchema();
        await this.assertProjectCapability(projectId, actor, 'project.edit');
        const rpId = query && query.routePointId ? String(query.routePointId) : '';
        let rows;
        if (rpId) {
            rows = await this.prisma.$queryRawUnsafe(
                `SELECT * FROM "StudyContentVersion" WHERE "projectId"=$1 AND ("routePointId"=$2 OR "routePointId" IS NULL) ORDER BY "updatedAt" DESC`,
                String(projectId), rpId
            );
        } else {
            rows = await this.prisma.$queryRawUnsafe(
                `SELECT * FROM "StudyContentVersion" WHERE "projectId"=$1 ORDER BY "updatedAt" DESC`,
                String(projectId)
            );
        }
        return { projectId: String(projectId), items: (rows || []).map((r) => this.serializeContentVersion(r)) };
    }
    async createContentVersion(projectId, body, actor) {
        await this.ensureStudyScheduleSchema();
        await this.assertProjectCapability(projectId, actor, 'project.edit');
        const name = String((body && body.name) || '').trim();
        if (!name) throw new common_1.BadRequestException('请填写内容版本名称');
        const id = this.scheduleNewId('scv');
        const routePointId = body && body.routePointId ? String(body.routePointId) : null;
        const note = body && body.note != null ? String(body.note) : '';
        const stepsJson = Array.isArray(body && body.stepsJson) ? body.stepsJson : (Array.isArray(body && body.steps) ? body.steps : []);
        const resourceIds = Array.isArray(body && body.resourceIds) ? body.resourceIds.map(String) : [];
        const isDefault = !!(body && body.isDefault);
        if (isDefault && routePointId) {
            await this.prisma.$executeRawUnsafe(
                `UPDATE "StudyContentVersion" SET "isDefault"=false WHERE "projectId"=$1 AND "routePointId"=$2`,
                String(projectId), routePointId
            );
        }
        await this.prisma.$executeRawUnsafe(
            `INSERT INTO "StudyContentVersion" ("id","projectId","routePointId","name","note","stepsJson","resourceIds","isDefault","createdAt","updatedAt")
             VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7::jsonb,$8,NOW(),NOW())`,
            id, String(projectId), routePointId, name, note, JSON.stringify(stepsJson), JSON.stringify(resourceIds), isDefault
        );
        await this.writeScheduleLog(projectId, actor, 'content.create', { id, name, routePointId });
        const rows = await this.prisma.$queryRawUnsafe(`SELECT * FROM "StudyContentVersion" WHERE id=$1`, id);
        return this.serializeContentVersion(rows[0]);
    }
    async updateContentVersion(projectId, versionId, body, actor) {
        await this.ensureStudyScheduleSchema();
        await this.assertProjectCapability(projectId, actor, 'project.edit');
        const rows = await this.prisma.$queryRawUnsafe(
            `SELECT * FROM "StudyContentVersion" WHERE id=$1 AND "projectId"=$2 LIMIT 1`,
            String(versionId), String(projectId)
        );
        if (!rows || !rows[0]) throw new common_1.NotFoundException('内容版本不存在');
        const cur = rows[0];
        const name = body && body.name != null ? String(body.name).trim() : cur.name;
        if (!name) throw new common_1.BadRequestException('名称不能为空');
        const note = body && body.note != null ? String(body.note) : (cur.note || '');
        const routePointId = body && body.routePointId !== undefined
            ? (body.routePointId ? String(body.routePointId) : null)
            : cur.routePointId;
        let stepsJson = cur.stepsJson;
        if (body && (body.stepsJson != null || body.steps != null)) {
            stepsJson = Array.isArray(body.stepsJson) ? body.stepsJson : (Array.isArray(body.steps) ? body.steps : []);
        }
        let resourceIds = cur.resourceIds;
        if (body && body.resourceIds != null) resourceIds = Array.isArray(body.resourceIds) ? body.resourceIds.map(String) : [];
        const isDefault = body && body.isDefault != null ? !!body.isDefault : !!cur.isDefault;
        if (isDefault && routePointId) {
            await this.prisma.$executeRawUnsafe(
                `UPDATE "StudyContentVersion" SET "isDefault"=false WHERE "projectId"=$1 AND "routePointId"=$2 AND id<>$3`,
                String(projectId), routePointId, String(versionId)
            );
        }
        await this.prisma.$executeRawUnsafe(
            `UPDATE "StudyContentVersion" SET "name"=$1, "note"=$2, "routePointId"=$3, "stepsJson"=$4::jsonb, "resourceIds"=$5::jsonb, "isDefault"=$6, "updatedAt"=NOW() WHERE id=$7`,
            name, note, routePointId, JSON.stringify(stepsJson), JSON.stringify(resourceIds), isDefault, String(versionId)
        );
        await this.writeScheduleLog(projectId, actor, 'content.update', { id: versionId, name });
        const updated = await this.prisma.$queryRawUnsafe(`SELECT * FROM "StudyContentVersion" WHERE id=$1`, String(versionId));
        return this.serializeContentVersion(updated[0]);
    }
    async deleteContentVersion(projectId, versionId, actor) {
        await this.ensureStudyScheduleSchema();
        await this.assertProjectCapability(projectId, actor, 'project.edit');
        await this.prisma.$executeRawUnsafe(
            `UPDATE "StudyScheduleSpot" SET "contentVersionId"=NULL WHERE "contentVersionId"=$1`,
            String(versionId)
        );
        await this.prisma.$executeRawUnsafe(
            `DELETE FROM "StudyContentVersion" WHERE id=$1 AND "projectId"=$2`,
            String(versionId), String(projectId)
        );
        await this.writeScheduleLog(projectId, actor, 'content.delete', { id: versionId });
        return { ok: true };
    }
    async snapshotDefaultContentVersions(projectId, actor) {
        await this.ensureStudyScheduleSchema();
        await this.assertProjectCapability(projectId, actor, 'project.edit');
        const routePoints = await this.prisma.studyRoutePoint.findMany({
            where: { projectId: String(projectId) },
            orderBy: { sortOrder: 'asc' },
        });
        const created = [];
        for (let i = 0; i < routePoints.length; i++) {
            const rp = routePoints[i];
            const pack = (rp.knowledgeItems && typeof rp.knowledgeItems === 'object' && !Array.isArray(rp.knowledgeItems))
                ? rp.knowledgeItems : {};
            const steps = Array.isArray(pack.stationSteps) ? pack.stationSteps : [];
            const name = (rp.title || '点位') + ' · 默认版';
            const existing = await this.prisma.$queryRawUnsafe(
                `SELECT id FROM "StudyContentVersion" WHERE "projectId"=$1 AND "routePointId"=$2 AND "isDefault"=true LIMIT 1`,
                String(projectId), rp.id
            );
            if (existing && existing[0]) {
                // eslint-disable-next-line no-await-in-loop
                await this.updateContentVersion(projectId, existing[0].id, { name, stepsJson: steps, isDefault: true }, actor);
                created.push(existing[0].id);
            } else {
                // eslint-disable-next-line no-await-in-loop
                const row = await this.createContentVersion(projectId, {
                    name, routePointId: rp.id, stepsJson: steps, isDefault: true, note: '由当前点位关卡快照生成',
                }, actor);
                created.push(row.id);
            }
        }
        return { projectId: String(projectId), versionIds: created };
    }
    async seedScheduleHorizon(projectId, actor, opts) {
        await this.ensureStudyScheduleSchema();
        await this.assertProjectCapability(projectId, actor, 'project.edit');
        const live = await this.readLiveBookingFields(projectId);
        const days = Math.max(1, Math.min(365, Number((opts && opts.days) || live.bookableDays || 7)));
        const today = this.todayDayKey ? this.todayDayKey() : new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Shanghai' });
        const routePoints = await this.prisma.studyRoutePoint.findMany({
            where: { projectId: String(projectId), enabled: true },
            orderBy: { sortOrder: 'asc' },
        });
        // ensure default content versions
        const snap = await this.snapshotDefaultContentVersions(projectId, actor);
        const versions = await this.listContentVersions(projectId, {}, actor);
        const defaultBySpot = {};
        for (let i = 0; i < (versions.items || []).length; i++) {
            const v = versions.items[i];
            if (v.isDefault && v.routePointId) defaultBySpot[v.routePointId] = v.id;
        }
        const project = await this.prisma.studyProject.findUnique({ where: { id: String(projectId) } });
        const capacity = Number(project && project.maxCapacity) || null;
        const seeded = [];
        for (let i = 0; i < days; i++) {
            const dt = new Date(today + 'T12:00:00+08:00');
            dt.setDate(dt.getDate() + i);
            const key = dt.toLocaleDateString('en-CA', { timeZone: 'Asia/Shanghai' });
            const ops = (live.dayOps && live.dayOps[key]) || {};
            const open = ops.paused ? false : true;
            const cap = ops.capacity != null ? Number(ops.capacity) : capacity;
            // eslint-disable-next-line no-await-in-loop
            await this.upsertScheduleDay(projectId, {
                date: key,
                open,
                capacity: cap,
                note: ops.note || '',
                spots: routePoints.map((rp) => ({
                    routePointId: rp.id,
                    enabled: true,
                    contentVersionId: defaultBySpot[rp.id] || null,
                })),
            }, actor);
            seeded.push(key);
        }
        await this.writeScheduleLog(projectId, actor, 'seed.horizon', { days, seeded, versionIds: snap.versionIds });
        return { projectId: String(projectId), seeded, versionIds: snap.versionIds };
    }
    /** Effective schedule for a day — used by Live + runtime helpers */
    async resolveEffectiveScheduleDay(projectId, date) {
        await this.ensureStudyScheduleSchema();
        const dayKey = this.scheduleDateKey(date);
        const live = await this.readLiveBookingFields(projectId);
        const ops = this.live18MergeDayOpsRaw((live.dayOps && live.dayOps[dayKey]) || {});
        const rows = await this.prisma.$queryRawUnsafe(
            `SELECT * FROM "StudyScheduleDay" WHERE "projectId"=$1 AND "date"=$2::date LIMIT 1`,
            String(projectId), dayKey
        );
        const today = this.todayDayKey ? this.todayDayKey() : new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Shanghai' });
        const endExclusive = (() => {
            const dt = new Date(today + 'T12:00:00+08:00');
            dt.setDate(dt.getDate() + Number(live.bookableDays || 7));
            return dt.toLocaleDateString('en-CA', { timeZone: 'Asia/Shanghai' });
        })();
        let scheduleOpen = null;
        let scheduleCapacity = null;
        let scheduleNote = '';
        let spots = [];
        let hasRow = false;
        if (rows && rows[0]) {
            hasRow = true;
            scheduleOpen = rows[0].open !== false && rows[0].open !== 'f';
            scheduleCapacity = rows[0].capacity == null ? null : Number(rows[0].capacity);
            scheduleNote = rows[0].note || '';
            const spotRows = await this.prisma.$queryRawUnsafe(
                `SELECT * FROM "StudyScheduleSpot" WHERE "dayId"=$1`,
                rows[0].id
            );
            spots = (spotRows || []).map((s) => this.serializeScheduleSpot(s));
        }
        // Fallback: within bookableDays AND not dayOps.paused
        let open;
        if (ops.paused) open = false;
        else if (hasRow) open = !!scheduleOpen;
        else open = (dayKey >= today && dayKey < endExclusive);
        let capacity = ops.capacity != null ? Number(ops.capacity)
            : (scheduleCapacity != null ? scheduleCapacity : null);
        const closedFromSchedule = spots.filter((s) => !s.enabled).map((s) => s.routePointId);
        const closedFromLive = Array.isArray(ops.closedSpots) ? ops.closedSpots.map(String) : [];
        const closedSpots = Array.from(new Set(closedFromSchedule.concat(closedFromLive)));
        return {
            date: dayKey,
            hasScheduleRow: hasRow,
            open,
            capacity,
            note: ops.note || scheduleNote || '',
            spots,
            closedSpots,
            liveOps: ops,
            bookableDays: live.bookableDays,
            priority: 'live_temp > schedule_day > project_default',
        };
    }

};
exports.AdminService = AdminService;
exports.AdminService = AdminService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        config_1.ConfigService,
        study_no_service_1.StudyNoService, storage_service_1.StorageService])
], AdminService);
//# sourceMappingURL=admin.service.js.map