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
exports.StudyService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const jwt_1 = require("@nestjs/jwt");
const client_1 = require("@prisma/client");
const crypto_1 = require("crypto");
const fs_1 = require("fs");
const path_1 = require("path");
const study_no_service_1 = require("../common/study-no.service");
const prisma_service_1 = require("../prisma/prisma.service");
const study_check_in_code_1 = require("./study-check-in-code");
const audience_templates_1 = require("/opt/mqlt/lib/audience-templates");
const splash_announcement_1 = require("/opt/mqlt/lib/splash-announcement");
const LIVE_ADMIN_CAPABILITIES = {
    PARTICIPANT_CHECK_IN: 'participant.check_in',
    ROUTE_POINT_MANAGE: 'route_point.manage',
    PRIZE_GRANT: 'prize.grant',
    POINTS_GRANT: 'points.grant',
    DEPARTURE_MANAGE: 'departure.manage',
    LIFECYCLE_MANAGE: 'project.lifecycle',
};
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
const ROUTE_POINT_REWARD_TYPES = {
    PRIZE: 'prize',
    POINTS: 'points',
};
const ROUTE_POINT_REWARD_SOURCE_TYPE = 'study_route_point_reward';
const STUDY_KNOWLEDGE_TASK_SOURCE_TYPE = 'study_knowledge_task';
const STUDY_MANUAL_POINTS_SOURCE_TYPE = 'study_manual_points';
const AMAP_ROUTE_CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const AMAP_ROUTE_ENDPOINTS = {
    WALKING: 'https://restapi.amap.com/v3/direction/walking',
    DRIVING: 'https://restapi.amap.com/v3/direction/driving',
};
let StudyService = class StudyService {
    constructor(prisma, jwtService, studyNo, config) {
        this.prisma = prisma;
        this.jwtService = jwtService;
        this.studyNo = studyNo;
        this.config = config;
        this.amapRouteCache = new Map();
    }
    async getProjects(query) {
        const keyword = query.keyword?.trim();
        const projects = await this.prisma.studyProject.findMany({
            where: {
                status: { notIn: ['待审批', '已驳回'] },
                category: query.category && query.category !== '全部' ? query.category : undefined,
                OR: keyword
                    ? [{ title: { contains: keyword } }, { subtitle: { contains: keyword } }]
                    : undefined,
            },
            include: { enterprise: { select: { id: true, name: true, shortName: true } } },
            orderBy: [{ createdAt: 'desc' }],
        });
        try {
            await this.ensureLiveBookingSchema();
            const ids = projects.map((x) => x.id);
            if (ids.length) {
                const rows = await this.prisma.$queryRawUnsafe(
                    `SELECT id, "bookableDays", "dayOps" FROM "StudyProject" WHERE id = ANY($1::text[])`,
                    ids
                );
                const map = {};
                for (let i = 0; i < (rows || []).length; i++) map[rows[i].id] = rows[i];
                for (let i = 0; i < projects.length; i++) {
                    const row = map[projects[i].id];
                    projects[i].bookableDays = this.clampBookableDays(row ? row.bookableDays : 7, 7);
                    projects[i].dayOps = this.parseDayOpsMap(row ? row.dayOps : {});
                }
            }
        } catch (_e) {}
        for (let i = 0; i < projects.length; i++) {
            try {
                const rawContacts = await this.readProjectContactsRaw(projects[i].id);
                projects[i]._publicContacts = this.publicProjectContacts(rawContacts);
            } catch (_e) { projects[i]._publicContacts = []; }
        }
        return projects.map((project) => this.serializeProject(project));
    }
    async getProjectDetail(id) {
        const [project, zones] = await Promise.all([
            this.prisma.studyProject.findUnique({
                where: { id },
                include: {
                    enterprise: { select: { id: true, name: true, shortName: true } },
                    routePoints: { orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] },
                },
            }),
            this.routeZoneDict(),
        ]);
        if (!project)
            throw new common_1.NotFoundException('Study project not found');
        if (project.status === '待审批' || project.status === '已驳回')
            throw new common_1.NotFoundException('Study project not found');
        try {
            const live = await this.readProjectLiveBooking(project.id);
            project.bookableDays = live.bookableDays;
            project.dayOps = live.dayOps;
            /* schedule-project-attach */
            try {
                const sched = await this.listPublicScheduleDays(project.id);
                project.scheduleDays = sched.days;
                project.scheduleMeta = { fallbackRule: sched.fallbackRule, from: sched.from, to: sched.to };
            } catch (_e) {
                project.scheduleDays = [];
            }
        } catch (_e) {
            project.bookableDays = 7;
            project.dayOps = {};
        }
        try {
            const rawContacts = await this.readProjectContactsRaw(project.id);
            project._publicContacts = this.publicProjectContacts(rawContacts);
            project.projectContacts = rawContacts;
        } catch (_e) { project._publicContacts = []; }
        try {
            project.audienceTemplates = await this.readAudienceTemplates(project.id);
        } catch (_e) { project.audienceTemplates = []; }
        return this.serializeProject(project, zones);
    }
    async getProjectRoutePoints(id) {
        const project = await this.prisma.studyProject.findUnique({ where: { id }, select: { id: true } });
        if (!project)
            throw new common_1.NotFoundException('Study project not found');
        const [points, zones] = await Promise.all([
            this.prisma.studyRoutePoint.findMany({
                where: { projectId: id, enabled: true },
                orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
            }),
            this.routeZoneDict(),
        ]);
        return {
            projectId: id,
            zones,
            items: points.map((point) => this.serializeCatalogSpot(point, zones)),
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
    serializeCatalogSpot(point, zoneDict) {
        const raw = point && point.knowledgeItems;
        let pack = {};
        if (raw && typeof raw === 'object' && !Array.isArray(raw))
            pack = raw;
        else if (Array.isArray(raw) && raw.length === 1 && raw[0] && typeof raw[0] === 'object')
            pack = raw[0];
        const lines = (value) => {
            if (Array.isArray(value))
                return value.map((item) => String(item ?? '').trim()).filter((item) => item.length > 0);
            if (typeof value === 'string')
                return value.split(/\r?\n/).map((item) => item.trim()).filter((item) => item.length > 0);
            return [];
        };
        const durationMin = Math.max(1, Number(pack.durationMin || 20) || 20);
        const zoneKey = String(pack.zoneKey || 'test').trim() || 'test';
        let zoneLabel = String(pack.zoneLabel || '').trim();
        if (!zoneLabel && Array.isArray(zoneDict)) {
            for (let i = 0; i < zoneDict.length; i++) {
                if (zoneDict[i].key === zoneKey) {
                    zoneLabel = zoneDict[i].label;
                    break;
                }
            }
        }
        const coverUrl = String(pack.coverUrl || '').trim();
        const coverStyle = coverUrl
            ? ('background-image:url(' + coverUrl + ');background-size:cover;background-position:center;')
            : String(pack.coverStyle || 'background-image: linear-gradient(145deg, #0F3F3A 0%, #1F8A70 100%);');
        const intro = String(pack.intro || point.description || '').trim();
        const guideLines = lines(pack.guideLines);
        const gameLines = lines(pack.gameLines);
        const gifts = lines(pack.gifts);
        const audience = String(pack.audience || '').trim();
        return {
            id: point.id,
            title: point.title,
            desc: point.description || '',
            latitude: Number(point.latitude),
            longitude: Number(point.longitude),
            sortOrder: point.sortOrder || 0,
            zoneKey,
            zoneLabel: zoneLabel || zoneKey,
            durationMin,
            durationText: this.durationTextOf(durationMin),
            intro,
            guideLines,
            gameLines,
            gifts,
            audience,
            sections: this.normalizeRouteSections(pack, { intro, guideLines, gameLines, gifts, audience, description: point.description }),
            photoCaption: String(pack.photoCaption || point.title || '').trim(),
            coverIcon: String(pack.coverIcon || '/static/icon-building.svg').trim() || '/static/icon-building.svg',
            coverStyle,
            coverUrl,
            offlineTaskEnabled: pack.offlineTaskEnabled !== false,
            offlineTaskTitle: String(pack.offlineTaskTitle || '现场趣味任务').trim() || '现场趣味任务',
            offlineTaskBody: String(pack.offlineTaskBody || '按现场工作人员指引完成互动（观察、动手、合影或小游戏）。完成后请扫描本站研学码（点位码）确认本项任务完成。').trim(),
            knowledgeVideoUrl: String(pack.knowledgeVideoUrl || point.knowledgeVideoUrl || '').trim(),
            knowledgeVideoTitle: String(pack.knowledgeVideoTitle || point.knowledgeVideoTitle || '').trim(),
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
    wrapRouteLines(list) {
        const rows = Array.isArray(list) ? list : [];
        if (!rows.length) return '<p></p>';
        return '<ul>' + rows.map((item) => '<li>' + this.escapeRouteHtml(item) + '</li>').join('') + '</ul>';
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
    async getProjectDocumentDetail(id, docIndex) {
        const project = await this.prisma.studyProject.findUnique({ where: { id } });
        if (!project)
            throw new common_1.NotFoundException('Study project not found');
        const index = Number(docIndex);
        if (!Number.isInteger(index) || index < 0) {
            throw new common_1.BadRequestException('Invalid document index');
        }
        const documents = this.getProjectDocuments(project);
        if (index >= documents.length)
            throw new common_1.NotFoundException('Project document not found');
        return this.createProjectDocumentDetail(project, index, documents[index]);
    }
    async getProjectAdminAccess(userId, projectId) {
        const [project, projectAdmin, projectOrganizer] = await Promise.all([
            this.prisma.studyProject.findUnique({ where: { id: projectId }, select: { id: true } }),
            this.prisma.studyProjectAdmin.findUnique({
                where: { projectId_userId: { projectId, userId } },
            }),
            this.prisma.studyProjectOrganizer.findUnique({
                where: { projectId_userId: { projectId, userId } },
            }),
        ]);
        if (!project)
            throw new common_1.NotFoundException('Study project not found');
        const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { isAdmin: true } });
        const isProjectAdmin = projectAdmin != null || !!(user && user.isAdmin);
        const isProjectOrganizer = projectOrganizer != null;
        return {
            projectId,
            isProjectAdmin,
            isProjectOrganizer,
        };
    }
    adminReadyProject(userId, projectId) {
        return this.updateProjectLiveStage(userId, projectId, 'ready');
    }
    adminStartProjectDeparture(userId, projectId) {
        return this.updateProjectLiveStage(userId, projectId, 'departing');
    }
    adminStartProjectStudy(userId, projectId) {
        return this.updateProjectLiveStage(userId, projectId, 'study_active');
    }
    adminEndProject(userId, projectId) {
        return this.updateProjectLiveStage(userId, projectId, 'ended');
    }
    adminReopenProject(userId, projectId) {
        return this.updateProjectLiveStage(userId, projectId, 'reopen');
    }
    async issueStudyCertificatesForProject(tx, project, issuedAt) {
        const bookings = await tx.studyBooking.findMany({
            where: {
                projectId: project.id,
                userDeletedAt: null,
                status: { in: [client_1.BookingStatus.BOOKED, client_1.BookingStatus.COMPLETED] },
            },
            include: { user: true },
            orderBy: [{ participantIndex: 'asc' }, { createdAt: 'asc' }],
        });
        const rows = bookings.map((booking) => {
            const holderName = this.resolveCertificateHolderName(booking);
            return {
                certificateNo: this.buildStudyCertificateNo(project.id, booking.id),
                projectId: project.id,
                bookingId: booking.id,
                userId: booking.userId,
                holderName,
                projectTitle: project.title,
                summary: `${holderName} 已完成「${project.title}」研学项目，完成现场研学、项目结算与成果归档，特发此证。`,
                issuedAt,
                createdAt: issuedAt,
                updatedAt: issuedAt,
            };
        });
        if (rows.length === 0)
            return 0;
        const result = await tx.studyCertificate.createMany({ data: rows, skipDuplicates: true });
        return typeof result.count === 'number' ? result.count : 0;
    }
    resolveCertificateHolderName(booking) {
        const name = String(booking.participantName ?? booking.user?.realName ?? booking.user?.nickname ?? '').trim();
        return name.length > 0 ? name : '研学学员';
    }
    buildStudyCertificateNo(projectId, bookingId) {
        const projectToken = this.certificateNoToken(projectId).slice(0, 10) || 'PROJECT';
        const bookingToken = this.certificateNoToken(bookingId).slice(-10) || (0, crypto_1.randomUUID)().replace(/-/g, '').slice(0, 10).toUpperCase();
        return `MQYX-${projectToken}-${bookingToken}`;
    }
    certificateNoToken(value) {
        return String(value ?? '').replace(/[^0-9a-zA-Z]/g, '').toUpperCase();
    }
    sendProjectImage(filename, res) {
        if (!/^[a-zA-Z0-9_-]+\.(jpg|jpeg|png|webp)$/.test(filename)) {
            throw new common_1.BadRequestException('Invalid study project image filename');
        }
        const dir = this.projectImageDir();
        const filePath = (0, path_1.normalize)((0, path_1.join)(dir, filename));
        if (!filePath.startsWith(dir) || !(0, fs_1.existsSync)(filePath)) {
            throw new common_1.NotFoundException('Study project image not found');
        }
        res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
        return res.sendFile(filePath);
    }
    async createBooking(userId, body) {
        const projectId = String(body.projectId ?? body.id ?? '');
        const [project, booker] = await Promise.all([
            this.prisma.studyProject.findUnique({ where: { id: projectId } }),
            this.prisma.user.findUnique({ where: { id: userId } }),
        ]);
        if (!project)
            throw new common_1.NotFoundException('Study project not found');
        if (project.status === '待审批' || project.status === '已驳回')
            throw new common_1.BadRequestException('项目尚未上架');
        if (!booker)
            throw new common_1.NotFoundException('User not found');
        if (!booker.realNameVerified || !booker.realName || !booker.realNameIdCard) {
            throw new common_1.BadRequestException('请先完成实名认证后再预约研学项目');
        }
        // Prefer non-deleted bookings. Soft-deleted truly-finished COMPLETED must NOT be
        // restored (that looked like「一预约就结算」); allow a fresh BOOKED create instead.
        const existed = await this.prisma.studyBooking.findFirst({
            where: { userId, projectId, userDeletedAt: null },
            include: { project: true, user: true },
            orderBy: { createdAt: 'desc' },
        });
        if (!existed || existed.status === client_1.BookingStatus.CANCELLED) {
            const softDeleted = await this.prisma.studyBooking.findFirst({
                where: {
                    userId,
                    projectId,
                    userDeletedAt: { not: null },
                    status: { not: client_1.BookingStatus.CANCELLED },
                },
                include: { project: true, user: true },
                orderBy: { createdAt: 'desc' },
            });
            if (softDeleted) {
                const softDone = String(softDeleted.status) === 'COMPLETED' && this.isTourReallyFinished(softDeleted);
                if (!softDone) {
                    let restored = await this.prisma.studyBooking.update({
                        where: { id: softDeleted.id },
                        data: { userDeletedAt: null },
                        include: { project: true, user: true },
                    });
                    if (String(restored.status) === 'COMPLETED' && !this.isTourReallyFinished(restored)) {
                        restored = await this.reopenPrematurelyCompletedTour(restored);
                    }
                    const restoredRawGroup = await this.getBookingGroupBookings(restored.bookingGroupId ?? restored.id);
                    const restoredGroup = restoredRawGroup.length > 0 ? restoredRawGroup : [restored];
                    return this.serializeBooking(restored, restoredGroup, userId);
                }
                // Soft-deleted + really finished → fall through to create a new booking
            }
        }
        if (existed && existed.status !== client_1.BookingStatus.CANCELLED) {
            // 已有有效订单但行程/租车为空时，用本次提交补写（避免复用空单导致拼图全目录）
            const patchTrip = this.normalizeTripPlan(body.tripPlan ?? body.routePlan ?? body.itinerary);
            if ((!patchTrip.days || patchTrip.days.length === 0) && Array.isArray(body.routePointIds)) {
                const ids = body.routePointIds.map((x) => String(x ?? '').trim()).filter((x) => x.length > 0);
                if (ids.length > 0) {
                    patchTrip.days = [{ dayKey: String(body.dayKey ?? body.date ?? '').trim() || 'day1', spotIds: ids }];
                    patchTrip.dayKeys = [patchTrip.days[0].dayKey];
                }
            }
            // V2 Phase A: 不再补写租车到 StudyBooking
            const curPlan = this.normalizeTripPlan(existed.tripPlan);
            const needTrip = (curPlan.days || []).length === 0 && (patchTrip.days || []).length > 0;
            const needRental = false;
            if ((needTrip || needRental) && this.isBookingGroupBooker(existed)) {
                const data = {};
                if (needTrip) data.tripPlan = patchTrip;
                if (false) { /* rental patch disabled */ }
                const patched = await this.prisma.studyBooking.update({
                    where: { id: existed.id },
                    data,
                    include: { project: true, user: true },
                });
                const rawG = await this.getBookingGroupBookings(patched.bookingGroupId ?? patched.id);
                return this.serializeBooking(patched, rawG.length > 0 ? rawG : [patched], userId);
            }
            // Premature COMPLETED (no real tour finish) → reopen to BOOKED before returning
            if (String(existed.status) === 'COMPLETED' && !this.isTourReallyFinished(existed)) {
                const reopened = await this.reopenPrematurelyCompletedTour(existed);
                const rawG2 = await this.getBookingGroupBookings(reopened.bookingGroupId ?? reopened.id);
                return this.serializeBooking(reopened, rawG2.length > 0 ? rawG2 : [reopened], userId);
            }
            const existedRawGroup = await this.getBookingGroupBookings(existed.bookingGroupId ?? existed.id);
            const existedGroup = existedRawGroup.length > 0 ? existedRawGroup : [existed];
            return this.serializeBooking(existed, existedGroup, userId);
        }
        this.assertProjectBookable(project);
        // Ordinary users may book for others (real-name claim later).
        const participants = await this.resolveBookingParticipants(userId, body, booker);
        const bookerParticipates = participants.some((item) => item.userId === userId);
        const seatCount = participants.length;
        if (seatCount <= 0) {
            throw new common_1.BadRequestException('请至少选择一位游客');
        }
        const bookingRows = bookerParticipates ? participants : [
            this.createOrganizerParticipant(userId, booker),
            ...participants,
        ];
        this.assertProjectBookable(project, seatCount);
        // Multi-person / proxy booking allowed for all logged-in users.
        await this.assertParticipantsNotBooked(projectId, participants.map((item) => item.userId));
        // V2 Phase A: 预约不再写入租车字段；租车走独立 RentalOrder
        const tripPlan = this.ensureCheckInTokens(this.normalizeTripPlan(body.tripPlan ?? body.routePlan ?? body.itinerary)).plan;
        const rentalMeta = {
            rentalOptionId: null,
            rentalDriverId: null,
            rentalFee: null,
            rentalDriverName: null,
            rentalDriverPhone: null,
            rentalDriverWechat: null,
            rentalVehicleName: null,
            rentalPlateNo: null,
            pickupAddress: null,
            pickupLatitude: null,
            pickupLongitude: null,
        };
        const rentalFee = 0;
        // 若只传了扁平 routePointIds，写入默认单日行程
        if ((!tripPlan.days || tripPlan.days.length === 0) && Array.isArray(body.routePointIds)) {
            const ids = body.routePointIds.map((x) => String(x ?? '').trim()).filter((x) => x.length > 0);
            if (ids.length > 0) {
                tripPlan.days = [{ dayKey: String(body.dayKey ?? body.date ?? '').trim() || 'day1', spotIds: ids }];
                tripPlan.dayKeys = [tripPlan.days[0].dayKey];
            }
        }
        await this.assertTripWithinBookableWindow(project, tripPlan, seatCount);
        const totalAmount = (Number(project.price) * seatCount + rentalFee).toFixed(2);
        // Simplified flow: organizer can pay immediately; invitees claim by real-name match later.
        const nextStatus = Number(totalAmount) <= 0
            ? client_1.BookingStatus.BOOKED
            : client_1.BookingStatus.UNPAID;
        const now = new Date();
        const bookingGroupId = (0, crypto_1.randomUUID)();
        const booking = await this.prisma.$transaction(async (tx) => {
            if (nextStatus === client_1.BookingStatus.BOOKED) {
                await this.incrementStudyProjectEnrollment(tx, project, seatCount);
            }
            let bookerBooking = null;
            for (let i = 0; i < bookingRows.length; i++) {
                const participant = bookingRows[i];
                const created = await tx.studyBooking.create({
                    data: {
                        userId: participant.userId,
                        projectId,
                        bookingGroupId,
                        bookerId: userId,
                        participantName: participant.name,
                        participantPhone: participant.phone,
                        participantIdCard: participant.idCard,
                        participantRole: participant.role,
                        participantIndex: i,
                        status: nextStatus,
                        amount: participant.userId === userId ? totalAmount : '0.00',
                        paidAt: nextStatus === client_1.BookingStatus.BOOKED ? now : null,
                        // 行程/租车写在发起人订单上；同组参与人共享序列化时从 booker 行读取
                        tripPlan: participant.userId === userId ? tripPlan : {},
                        rentalOptionId: participant.userId === userId ? rentalMeta.rentalOptionId : null,
                        rentalDriverId: participant.userId === userId ? rentalMeta.rentalDriverId : null,
                        rentalFee: participant.userId === userId ? rentalMeta.rentalFee : null,
                        rentalDriverName: participant.userId === userId ? rentalMeta.rentalDriverName : null,
                        rentalDriverPhone: participant.userId === userId ? rentalMeta.rentalDriverPhone : null,
                        rentalDriverWechat: participant.userId === userId ? rentalMeta.rentalDriverWechat : null,
                        rentalVehicleName: participant.userId === userId ? rentalMeta.rentalVehicleName : null,
                        rentalPlateNo: participant.userId === userId ? rentalMeta.rentalPlateNo : null,
                        pickupAddress: participant.userId === userId ? rentalMeta.pickupAddress : null,
                        pickupLatitude: participant.userId === userId ? rentalMeta.pickupLatitude : null,
                        pickupLongitude: participant.userId === userId ? rentalMeta.pickupLongitude : null,
                    },
                    include: { project: true, user: true },
                });
                if (participant.userId === userId)
                    bookerBooking = created;
            }
            return bookerBooking;
        });
        const rawGroup = await this.getBookingGroupBookings(booking.bookingGroupId ?? booking.id);
        const group = rawGroup.length > 0 ? rawGroup : [booking];
        if (nextStatus === client_1.BookingStatus.BOOKED) {
            await this.ensureDriverJobForBooking(booking, group);
        }
        return this.serializeBooking(booking, group, userId);
    }
    async payBooking(userId, id) {
        const existed = await this.prisma.studyBooking.findFirst({
            where: { id, userId },
            include: { project: true },
        });
        if (!existed)
            throw new common_1.NotFoundException('Study booking not found');
        if (existed.status !== client_1.BookingStatus.UNPAID) {
            throw new common_1.BadRequestException('Only unpaid study bookings can be paid');
        }
        if (!this.isBookingGroupBooker(existed)) {
            throw new common_1.BadRequestException('Only the booking creator can pay this study booking');
        }
        const rawGroup = await this.getBookingGroupBookings(existed.bookingGroupId ?? existed.id);
        const group = rawGroup.length > 0 ? rawGroup : [existed];
        const payableGroup = group.filter((booking) => booking.status === client_1.BookingStatus.UNPAID);
        const participantCount = this.countSeatBookings(payableGroup.length > 0 ? payableGroup : group);
        if (participantCount <= 0) {
            throw new common_1.BadRequestException('Study booking has no participants');
        }
        this.assertProjectBookable(existed.project, participantCount);
        await this.assertTripWithinBookableWindow(existed.project, existed.tripPlan, participantCount, existed.bookingGroupId || existed.id);
        const now = new Date();
        const booking = await this.prisma.$transaction(async (tx) => {
            await this.incrementStudyProjectEnrollment(tx, existed.project, participantCount);
            await tx.studyBooking.updateMany({
                where: { id: { in: payableGroup.map((item) => item.id) } },
                data: {
                    status: client_1.BookingStatus.BOOKED,
                    paidAt: now,
                    cancelledAt: null,
                    completedAt: null,
                    userDeletedAt: null,
                },
            });
            return tx.studyBooking.findUniqueOrThrow({ where: { id }, include: { project: true } });
        });
        const updatedRawGroup = await this.getBookingGroupBookings(booking.bookingGroupId ?? booking.id);
        const updatedGroup = updatedRawGroup.length > 0 ? updatedRawGroup : [booking];
        await this.ensureDriverJobForBooking(booking, updatedGroup);
        return this.serializeBooking(booking, updatedGroup, userId);
    }
    async getBookingDetail(userId, id) {
        await this.claimBookingsByRealName(userId);
        const key = String(id || '').trim();
        if (!key) throw new common_1.NotFoundException('订单不存在');
        let booking = await this.prisma.studyBooking.findUnique({
            where: { id: key },
            include: { project: true, user: true },
        });
        // 兼容误传 bookingGroupId：先找未软删，再回退含软删（id 与 groupId 都能打开）
        if (!booking) {
            booking = await this.prisma.studyBooking.findFirst({
                where: { bookingGroupId: key, userDeletedAt: null },
                include: { project: true, user: true },
                orderBy: { createdAt: 'desc' },
            });
        }
        if (!booking) {
            booking = await this.prisma.studyBooking.findFirst({
                where: { bookingGroupId: key },
                include: { project: true, user: true },
                orderBy: { createdAt: 'desc' },
            });
        }
        if (!booking)
            throw new common_1.NotFoundException('订单不存在');
        const rawGroup = await this.getBookingGroupBookings(booking.bookingGroupId ?? booking.id);
        const group0 = rawGroup.length > 0 ? rawGroup : [booking];
        if (!this.canAccessBookingGroup(userId, group0) && !(await this.canAccessByRealName(userId, group0))) {
            throw new common_1.NotFoundException('订单不存在');
        }
        // 已完成订单不再跑 reopen，避免结业态被改写导致详情异常
        for (let i = 0; i < group0.length; i++) {
            const st = String(group0[i].status || '');
            if (st === 'COMPLETED' || st === 'CANCELLED') continue;
            await this.reopenPrematurelyCompletedTour(group0[i]);
        }
        const groupRaw = await this.getBookingGroupBookings(booking.bookingGroupId ?? booking.id);
        const group = groupRaw.length > 0 ? groupRaw : [booking];
        const viewerBooking = group.find((item) => item.userId === userId)
            ?? group.find((item) => item.id === booking.id || item.id === key)
            ?? booking;
        if (viewerBooking && viewerBooking.project) await this.hydrateProjectContacts(viewerBooking.project);
        return this.serializeBooking(viewerBooking, group, userId);
    }
    async canAccessByRealName(userId, group) {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user || !user.realNameVerified || !user.realName || !user.realNameIdCard)
            return false;
        for (let i = 0; i < group.length; i++) {
            if (this.matchRealName(user.realName, user.realNameIdCard, group[i].participantName, group[i].participantIdCard)) {
                return true;
            }
        }
        return false;
    }
    async verifyBookingParticipant(userId, id) {
        const booking = await this.prisma.studyBooking.findFirst({
            where: { id, userId },
            include: { project: true, user: true },
        });
        if (!booking)
            throw new common_1.NotFoundException('Study booking not found');
        if (booking.status !== client_1.BookingStatus.PENDING) {
            throw new common_1.BadRequestException('Only pending study bookings can be verified');
        }
        const verification = this.resolveParticipantVerification(booking);
        const updated = await this.prisma.studyBooking.update({
            where: { id: booking.id },
            data: {
                participantVerifiedAt: verification.status === 'verified' ? new Date() : null,
                participantVerifyMessage: verification.message,
            },
            include: { project: true, user: true },
        });
        const rawGroup = await this.getBookingGroupBookings(updated.bookingGroupId ?? updated.id);
        const group = rawGroup.length > 0 ? rawGroup : [updated];
        return this.serializeBooking(updated, group, userId);
    }
    async confirmBooking(userId, id) {
        const existed = await this.prisma.studyBooking.findFirst({
            where: { id, userId },
            include: { project: true, user: true },
        });
        if (!existed)
            throw new common_1.NotFoundException('Study booking not found');
        if (!this.isBookingGroupBooker(existed)) {
            throw new common_1.BadRequestException('Only the booking creator can confirm this study booking');
        }
        if (existed.status !== client_1.BookingStatus.PENDING) {
            throw new common_1.BadRequestException('Only pending study bookings can be confirmed');
        }
        const rawGroup = await this.getBookingGroupBookings(existed.bookingGroupId ?? existed.id);
        const group = rawGroup.length > 0 ? rawGroup : [existed];
        for (let i = 0; i < group.length; i++) {
            if (group[i].status !== client_1.BookingStatus.PENDING) {
                throw new common_1.BadRequestException('Only pending study bookings can be confirmed');
            }
        }
        // Legacy PENDING orders: skip invitee verification gate.
        const totalAmount = Number(this.resolveGroupAmount(existed, group));
        const nextStatus = totalAmount <= 0 ? client_1.BookingStatus.BOOKED : client_1.BookingStatus.UNPAID;
        const now = new Date();
        const groupIds = group.map((item) => item.id);
        const seatCount = this.countSeatBookings(group);
        if (seatCount <= 0) {
            throw new common_1.BadRequestException('Study booking has no participants');
        }
        const updated = await this.prisma.$transaction(async (tx) => {
            if (nextStatus === client_1.BookingStatus.BOOKED) {
                await this.incrementStudyProjectEnrollment(tx, existed.project, seatCount);
            }
            await tx.studyBooking.updateMany({
                where: { id: { in: groupIds } },
                data: {
                    status: nextStatus,
                    paidAt: nextStatus === client_1.BookingStatus.BOOKED ? now : null,
                    participantVerifiedAt: now,
                    participantVerifyMessage: '验证成功',
                    cancelledAt: null,
                    completedAt: null,
                    userDeletedAt: null,
                },
            });
            return tx.studyBooking.findUniqueOrThrow({ where: { id }, include: { project: true, user: true } });
        });
        const updatedRawGroup = await this.getBookingGroupBookings(updated.bookingGroupId ?? updated.id);
        const updatedGroup = updatedRawGroup.length > 0 ? updatedRawGroup : [updated];
        return this.serializeBooking(updated, updatedGroup, userId);
    }
    async addBookingParticipants(userId, id, body) {
        const existed = await this.prisma.studyBooking.findFirst({
            where: { id, userId },
            include: { project: true, user: true },
        });
        if (!existed)
            throw new common_1.NotFoundException('Study booking not found');
        if (!this.isBookingGroupBooker(existed)) {
            throw new common_1.BadRequestException('Only the booking creator can update participants');
        }
        if (existed.status === client_1.BookingStatus.CANCELLED || existed.status === client_1.BookingStatus.COMPLETED) {
            throw new common_1.BadRequestException('当前订单状态不可再添加游客');
        }
        // Adding travelers on existing order: any group booker can do it.
        const rawGroup = await this.getBookingGroupBookings(existed.bookingGroupId ?? existed.id);
        const group = rawGroup.length > 0 ? rawGroup : [existed];
        const participants = await this.resolveAdditionalParticipants(userId, body);
        const currentUserIds = group.map((item) => item.userId);
        const nextParticipants = participants.filter((participant) => !currentUserIds.includes(participant.userId));
        if (nextParticipants.length === 0) {
            throw new common_1.BadRequestException('所选游客已在该订单中');
        }
        const currentSeatCount = this.countSeatBookings(group);
        this.assertProjectBookable(existed.project, currentSeatCount + nextParticipants.length);
        await this.assertParticipantsNotBooked(existed.projectId, nextParticipants.map((item) => item.userId));
        let nextIndex = 0;
        for (let i = 0; i < group.length; i++) {
            if (group[i].participantIndex >= nextIndex)
                nextIndex = group[i].participantIndex + 1;
        }
        const nextAmount = (Number(existed.project.price) * (currentSeatCount + nextParticipants.length)).toFixed(2);
        const groupId = existed.bookingGroupId ?? existed.id;
        const bookerBooking = group.find((item) => this.isBookingGroupBooker(item)) ?? existed;
        const updated = await this.prisma.$transaction(async (tx) => {
            for (let i = 0; i < nextParticipants.length; i++) {
                const participant = nextParticipants[i];
                await tx.studyBooking.create({
                    data: {
                        userId: participant.userId,
                        projectId: existed.projectId,
                        bookingGroupId: groupId,
                        bookerId: userId,
                        participantName: participant.name,
                        participantPhone: participant.phone,
                        participantIdCard: participant.idCard,
                        participantRole: 'TRAVELER',
                        participantIndex: nextIndex + i,
                        status: existed.status === client_1.BookingStatus.BOOKED || existed.status === client_1.BookingStatus.COMPLETED
                            ? existed.status
                            : (existed.status === client_1.BookingStatus.UNPAID ? client_1.BookingStatus.UNPAID : client_1.BookingStatus.UNPAID),
                        amount: '0.00',
                    },
                });
            }
            await tx.studyBooking.update({
                where: { id: bookerBooking.id },
                data: { amount: nextAmount },
            });
            return tx.studyBooking.findUniqueOrThrow({ where: { id }, include: { project: true, user: true } });
        });
        const updatedRawGroup = await this.getBookingGroupBookings(updated.bookingGroupId ?? updated.id);
        const updatedGroup = updatedRawGroup.length > 0 ? updatedRawGroup : [updated];
        return this.serializeBooking(updated, updatedGroup, userId);
    }
    async removeBookingParticipant(userId, id, participantBookingId) {
        const existed = await this.prisma.studyBooking.findFirst({
            where: { id, userId },
            include: { project: true, user: true },
        });
        if (!existed)
            throw new common_1.NotFoundException('Study booking not found');
        if (!this.isBookingGroupBooker(existed)) {
            throw new common_1.BadRequestException('Only the booking creator can update participants');
        }
        if (existed.status === client_1.BookingStatus.CANCELLED || existed.status === client_1.BookingStatus.COMPLETED) {
            throw new common_1.BadRequestException('当前订单状态不可修改游客');
        }
        const rawGroup = await this.getBookingGroupBookings(existed.bookingGroupId ?? existed.id);
        const group = rawGroup.length > 0 ? rawGroup : [existed];
        const participant = group.find((item) => item.id === participantBookingId);
        if (!participant)
            throw new common_1.NotFoundException('Study booking participant not found');
        if (this.isBookingGroupBooker(participant)) {
            throw new common_1.BadRequestException('预约发起人不可从订单中移除');
        }
        const currentSeatCount = this.countSeatBookings(group);
        if (currentSeatCount <= 1) {
            throw new common_1.BadRequestException('订单至少保留一位参与人');
        }
        const nextAmount = (Number(existed.project.price) * (currentSeatCount - 1)).toFixed(2);
        const bookerBooking = group.find((item) => this.isBookingGroupBooker(item)) ?? existed;
        const updated = await this.prisma.$transaction(async (tx) => {
            await tx.studyBooking.delete({ where: { id: participant.id } });
            await tx.studyBooking.update({
                where: { id: bookerBooking.id },
                data: { amount: nextAmount },
            });
            return tx.studyBooking.findUniqueOrThrow({ where: { id }, include: { project: true, user: true } });
        });
        await this.deleteEmptyPlaceholderUsers([participant], [participant.id]);
        const updatedRawGroup = await this.getBookingGroupBookings(updated.bookingGroupId ?? updated.id);
        const updatedGroup = updatedRawGroup.length > 0 ? updatedRawGroup : [updated];
        return this.serializeBooking(updated, updatedGroup, userId);
    }
    async cancelBooking(userId, id) {
        const existed = await this.prisma.studyBooking.findFirst({
            where: { id, userId },
            include: { project: true },
        });
        if (!existed)
            throw new common_1.NotFoundException('Study booking not found');
        if (existed.status === client_1.BookingStatus.CANCELLED) {
            throw new common_1.BadRequestException('Study booking is already cancelled');
        }
        if (existed.status === client_1.BookingStatus.COMPLETED) {
            throw new common_1.BadRequestException('Completed study bookings cannot be cancelled');
        }
        if (existed.checkedInAt != null) {
            throw new common_1.BadRequestException('已核销的研学订单无法取消');
        }
        if (!this.isBookingGroupBooker(existed)) {
            throw new common_1.BadRequestException('Only the booking creator can cancel this study booking');
        }
        const now = new Date();
        const rawGroup = await this.getBookingGroupBookings(existed.bookingGroupId ?? existed.id);
        const group = rawGroup.length > 0 ? rawGroup : [existed];
        const groupIds = group.length > 0 ? group.map((item) => item.id) : [id];
        const activeCount = group.filter((booking) => this.isActiveBookingStatus(booking.status) && this.isSeatBooking(booking)).length;
        const booking = await this.prisma.$transaction(async (tx) => {
            await tx.studyBooking.updateMany({
                where: { id: { in: groupIds } },
                data: {
                    status: client_1.BookingStatus.CANCELLED,
                    cancelledAt: now,
                },
            });
            if (activeCount > 0) {
                await tx.studyProject.updateMany({
                    where: { id: existed.projectId, enrolled: { gte: activeCount } },
                    data: { enrolled: { decrement: activeCount } },
                });
            }
            return tx.studyBooking.findUniqueOrThrow({ where: { id }, include: { project: true } });
        });
        await this.deleteEmptyPlaceholderUsers(group, groupIds);
        await this.cancelDriverJobsForBookings(groupIds);
        const updatedRawGroup = await this.getBookingGroupBookings(booking.bookingGroupId ?? booking.id);
        const updatedGroup = updatedRawGroup.length > 0 ? updatedRawGroup : [booking];
        return this.serializeBooking(booking, updatedGroup, userId);
    }
    async deleteBooking(userId, id) {
        const booking = await this.prisma.studyBooking.findFirst({
            where: { id, userId },
            select: { id: true, status: true },
        });
        if (!booking)
            throw new common_1.NotFoundException('Study booking not found');
        if (booking.status !== client_1.BookingStatus.COMPLETED && booking.status !== client_1.BookingStatus.CANCELLED) {
            throw new common_1.BadRequestException('Only completed or cancelled study bookings can be deleted');
        }
        await this.prisma.studyBooking.update({
            where: { id },
            data: { userDeletedAt: new Date() },
        });
        return { id, deleted: true };
    }
    async getBookings(userId) {
        await this.claimBookingsByRealName(userId);
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        const orClause = [{ userId }];
        if (user && user.realNameVerified && user.realName && user.realNameIdCard) {
            orClause.push({
                participantName: String(user.realName).trim(),
                participantIdCard: String(user.realNameIdCard).trim().toUpperCase(),
            });
        }
        const bookings = await this.prisma.studyBooking.findMany({
            where: {
                userDeletedAt: null,
                OR: orClause,
            },
            include: { project: true, user: true },
            orderBy: { createdAt: 'desc' },
        });
        // De-dupe by id
        const seen = {};
        const unique = [];
        for (let i = 0; i < bookings.length; i++) {
            if (seen[bookings[i].id]) continue;
            seen[bookings[i].id] = true;
            unique.push(bookings[i]);
        }
        const groups = await this.getGroupsForBookings(unique);
        return unique.map((booking) => this.serializeBooking(booking, groups[booking.bookingGroupId ?? booking.id] ?? [booking], userId));
    }
    /**
     * When invitee finishes real-name auth, attach seat bookings whose
     * participantName + participantIdCard match — phone is not required.
     */
    async claimBookingsByRealName(userId) {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user || !user.realNameVerified || !user.realName || !user.realNameIdCard)
            return 0;
        const name = String(user.realName).trim();
        const idCard = String(user.realNameIdCard).trim().toUpperCase();
        if (name.length < 2 || idCard.length !== 18)
            return 0;
        const candidates = await this.prisma.studyBooking.findMany({
            where: {
                participantName: name,
                participantIdCard: idCard,
                status: { not: client_1.BookingStatus.CANCELLED },
                userDeletedAt: null,
            },
            include: { user: true },
        });
        let claimed = 0;
        for (let i = 0; i < candidates.length; i++) {
            const row = candidates[i];
            if (row.userId === userId)
                continue;
            // Only take over placeholder / unmatched seats (no wechat openId), or already same identity
            const holder = row.user;
            const holderRegistered = holder != null && String(holder.openId ?? '').trim().length > 0;
            if (holderRegistered && holder.id !== userId) {
                // Another real account already owns this seat — skip
                continue;
            }
            await this.prisma.studyBooking.update({
                where: { id: row.id },
                data: {
                    userId,
                    participantVerifiedAt: new Date(),
                    participantVerifyMessage: '实名匹配，自动关联',
                    userDeletedAt: null,
                },
            });
            claimed += 1;
        }
        return claimed;
    }
    async getFloatingNotices(token) {
        const userId = this.getUserIdFromToken(token);
        const bookings = userId
            ? await this.prisma.studyBooking.findMany({
                where: {
                    userId,
                    userDeletedAt: null,
                    status: { in: [client_1.BookingStatus.BOOKED, client_1.BookingStatus.COMPLETED] },
                },
                include: { project: true },
                orderBy: { createdAt: 'desc' },
            })
            : [];
        const projectIds = [];
        for (let i = 0; i < bookings.length; i++) {
            const id = bookings[i].projectId;
            if (!projectIds.includes(id))
                projectIds.push(id);
        }
        const fallbackProject = bookings.length > 0 ? bookings[0].project : null;
        const notices = await this.prisma.studyFloatingNotice.findMany({
            where: {
                enabled: true,
                OR: projectIds.length > 0 ? [{ projectId: null }, { projectId: { in: projectIds } }] : [{ projectId: null }],
            },
            include: { project: true },
            orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
            take: 50,
        });
        return notices.map((notice) => this.serializeFloatingNotice(notice, fallbackProject));
    }
    getUserIdFromToken(token) {
        if (!token)
            return null;
        try {
            const payload = this.jwtService.verify(token);
            return payload.sub ?? null;
        }
        catch {
            return null;
        }
    }
    async ensureNoticeStatusColumn() {
        try {
            await this.prisma.$executeRawUnsafe(`ALTER TABLE "StudyNotice" ADD COLUMN IF NOT EXISTS "enterpriseId" TEXT`);
            await this.prisma.$executeRawUnsafe(`ALTER TABLE "StudyNotice" ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'published'`);
            await this.prisma.$executeRawUnsafe(`ALTER TABLE "StudyNotice" ADD COLUMN IF NOT EXISTS "reviewNote" TEXT`);
            await this.prisma.$executeRawUnsafe(`ALTER TABLE "StudyNotice" ADD COLUMN IF NOT EXISTS "reviewedAt" TIMESTAMP`);
            await this.prisma.$executeRawUnsafe(`ALTER TABLE "StudyNotice" ADD COLUMN IF NOT EXISTS "publisherUnitType" TEXT`);
            await this.prisma.$executeRawUnsafe(`ALTER TABLE "StudyNotice" ADD COLUMN IF NOT EXISTS "publisherUnitId" TEXT`);
            await this.prisma.$executeRawUnsafe(`ALTER TABLE "StudyNotice" ADD COLUMN IF NOT EXISTS kind TEXT NOT NULL DEFAULT 'news'`);
            await this.prisma.$executeRawUnsafe(`ALTER TABLE "Enterprise" ADD COLUMN IF NOT EXISTS "publisherDisplayName" TEXT`);
            await this.prisma.$executeRawUnsafe(`ALTER TABLE "StudyProject" ADD COLUMN IF NOT EXISTS "publisherDisplayName" TEXT`);
            await this.prisma.$executeRawUnsafe(`UPDATE "StudyNotice" SET status = 'published' WHERE status IS NULL OR status = ''`);
        } catch (_e) {}
    }
    async getNotices(projectId) {
        await this.ensureNoticeStatusColumn();
        const pid = projectId != null ? String(projectId).trim() : '';
        if (!pid) {
            // No projectId: return published enterprise news only (not project dynamics).
            const rows = await this.prisma.$queryRawUnsafe(
                `SELECT n.*, sp.id AS "_projectId", sp.title AS "_projectTitle", sp.status AS "_projectStatus"
                 FROM "StudyNotice" n
                 LEFT JOIN "StudyProject" sp ON sp.id = n."projectId"
                 WHERE COALESCE(n.status, 'published') = 'published'
                   AND COALESCE(n.kind, 'news') = 'news'
                 ORDER BY n."publishedAt" DESC`);
            return (rows || []).map((row) => this.serializeNotice({
                id: row.id,
                title: row.title,
                content: row.content,
                type: row.type,
                publisher: row.publisher,
                publisherUnitType: row.publisherUnitType,
                publisherUnitId: row.publisherUnitId,
                paragraphs: row.paragraphs || [],
                publishedAt: row.publishedAt,
                projectId: row.projectId,
                enterpriseId: row.enterpriseId,
                status: row.status,
                kind: row.kind,
                project: row._projectId ? { id: row._projectId, title: row._projectTitle, status: row._projectStatus } : null,
            }));
        }
        // Project feed「相关动态」: only kind=dynamics for this project (do NOT mix enterprise-wide news).
        const rows = await this.prisma.$queryRawUnsafe(
            `SELECT n.*, sp.id AS "_projectId", sp.title AS "_projectTitle", sp.status AS "_projectStatus"
             FROM "StudyNotice" n
             LEFT JOIN "StudyProject" sp ON sp.id = n."projectId"
             WHERE COALESCE(n.status, 'published') = 'published'
               AND COALESCE(n.kind, 'news') = 'dynamics'
               AND n."projectId" = $1
             ORDER BY n."publishedAt" DESC`,
            pid);
        return (rows || []).map((row) => {
            const notice = {
                id: row.id,
                title: row.title,
                content: row.content,
                type: row.type,
                publisher: row.publisher,
                publisherUnitType: row.publisherUnitType,
                publisherUnitId: row.publisherUnitId,
                paragraphs: row.paragraphs || [],
                publishedAt: row.publishedAt,
                projectId: row.projectId,
                enterpriseId: row.enterpriseId,
                status: row.status,
                kind: row.kind,
                project: row._projectId ? { id: row._projectId, title: row._projectTitle, status: row._projectStatus } : null,
            };
            return this.serializeNotice(notice);
        });
    }
    async getNoticeDetail(id) {
        await this.ensureNoticeStatusColumn();
        const rows = await this.prisma.$queryRawUnsafe(
            `SELECT n.*, sp.id AS "project_id", sp.title AS "project_title", sp.status AS "project_status"
             FROM "StudyNotice" n
             LEFT JOIN "StudyProject" sp ON sp.id = n."projectId"
             WHERE n.id = $1 LIMIT 1`, id);
        if (!rows || !rows.length)
            throw new common_1.NotFoundException('Notice not found');
        const row = rows[0];
        if (String(row.status || 'published') !== 'published')
            throw new common_1.NotFoundException('Notice not found');
        const notice = {
            id: row.id,
            title: row.title,
            content: row.content,
            type: row.type,
            publisher: row.publisher,
            publisherUnitType: row.publisherUnitType,
            publisherUnitId: row.publisherUnitId,
            paragraphs: row.paragraphs || [],
            publishedAt: row.publishedAt,
            projectId: row.projectId,
            enterpriseId: row.enterpriseId,
            status: row.status,
            project: row.project_id ? { id: row.project_id, title: row.project_title, status: row.project_status } : null,
        };
        const content = String(notice.content ?? '').trim();
        const isHtml = content.indexOf('<') >= 0 || content.indexOf('[[') >= 0;
        const paragraphs = Array.isArray(notice.paragraphs) && notice.paragraphs.length ? [...notice.paragraphs] : [];
        if (!isHtml && content.length > 0 && !paragraphs.some((item) => item.trim() === content)) {
            paragraphs.unshift(content);
        }
        return {
            ...this.serializeNotice(notice),
            publisher: notice.publisher ?? '蒙企链探运营中心',
            paragraphs: paragraphs.length > 0 ? paragraphs : (isHtml ? [] : [notice.content]),
        };
    }

    rentalSeatRange(optionId) {
        const id = String(optionId || '').trim();
        if (id === 'range_s' || id === 'van7') return { id: 'range_s', min: 1, max: 7 };
        if (id === 'range_m' || id === 'mpv9' || id === 'bus14') return { id: 'range_m', min: 8, max: 14 };
        if (id === 'range_l' || id === 'bus20') return { id: 'range_l', min: 15, max: 99 };
        return { id: 'none', min: 0, max: 0 };
    }
    rentalOptionLabel(optionId) {
        const id = String(optionId || '').trim();
        if (!id || id === 'none') return '自行前往';
        if (id === 'range_s' || id === 'van7') return '1–7人 · 小车';
        if (id === 'range_m' || id === 'mpv9' || id === 'bus14') return '8–14人 · 中巴';
        if (id === 'range_l' || id === 'bus20') return '15人以上 · 大巴';
        return id;
    }
    normalizeCityName(value) {
        return String(value || '').trim().replace(/市$/, '');
    }
    cityFromCoord(lat, lng) {
        if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) < 0.01) return '';
        if (lat >= 40.30 && lat <= 41.40 && lng >= 110.55 && lng <= 112.65) return '呼和浩特';
        if (lat >= 40.40 && lat <= 41.05 && lng >= 109.50 && lng <= 111.25) return '包头';
        if (lat >= 39.40 && lat <= 40.35 && lng >= 115.70 && lng <= 117.55) return '北京';
        return '';
    }
    haversineKm(lat1, lng1, lat2, lng2) {
        const toRad = (d) => d * Math.PI / 180;
        const R = 6371;
        const dLat = toRad(lat2 - lat1);
        const dLng = toRad(lng2 - lng1);
        const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
        return 2 * R * Math.asin(Math.sqrt(a));
    }
    activeDriverJobStatuses() {
        // Incomplete jobs that can occupy a calendar day (指定单待确认/已接单/履约中)
        return ['OFFERED', 'ACCEPTED', 'EN_ROUTE', 'ARRIVED', 'IN_TRIP'];
    }
    fulfillingDriverJobStatuses() {
        // BUSY only while actively on the road / in trip
        return ['EN_ROUTE', 'ARRIVED', 'IN_TRIP'];
    }
    makeDriverJobNo() {
        return 'DJ' + Date.now().toString(36).toUpperCase() + (0, crypto_1.randomBytes)(2).toString('hex').toUpperCase();
    }
    async rentalFeatureOn() {
        try {
            const row = await this.prisma.platformSetting.findUnique({ where: { key: 'feature.rental' } });
            if (!row) return true;
            const v = row.value;
            if (v === false || v === 'false' || v === 0) return false;
            if (v && typeof v === 'object' && (v.value === false || v.enabled === false)) return false;
            return true;
        }
        catch (_e) {
            return true;
        }
    }
    normalizeDateKey(value) {
        const s = String(value || '').trim();
        if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
        const m = s.match(/^(\d{4})[\/.](\d{1,2})[\/.](\d{1,2})/);
        if (m) return m[1] + '-' + String(m[2]).padStart(2, '0') + '-' + String(m[3]).padStart(2, '0');
        const d = new Date(s);
        if (!Number.isNaN(d.getTime())) {
            return this.shanghaiDateKeyFromInstant(d);
        }
        return '';
    }
    collectBookingDateKeys(booking, fallbackDate) {
        const keys = new Set();
        const fb = this.normalizeDateKey(fallbackDate);
        if (fb) keys.add(fb);
        if (!booking) return Array.from(keys);
        try {
            const plan = this.normalizeTripPlan(booking.tripPlan);
            const days = (plan && plan.days) || [];
            for (let i = 0; i < days.length; i++) {
                const dk = this.normalizeDateKey(days[i].dayKey);
                if (dk) keys.add(dk);
            }
            const dks = (plan && plan.dayKeys) || [];
            for (let i = 0; i < dks.length; i++) {
                const dk = this.normalizeDateKey(dks[i]);
                if (dk) keys.add(dk);
            }
        }
        catch (_e) { }
        return Array.from(keys);
    }
    jobOccupiesDate(job, booking, dateKey) {
        if (!dateKey) return false;
        const st = String(job.status || '');
        // Actively fulfilling always blocks any queried day (driver is on the road now)
        if (this.fulfillingDriverJobStatuses().indexOf(st) >= 0) return true;
        const dates = this.collectBookingDateKeys(booking, null);
        if (dates.length > 0) return dates.indexOf(dateKey) >= 0;
        // No trip dates on booking: fall back to job offer/accept/create calendar day
        const stamps = [job.offeredAt, job.acceptedAt, job.startedAt, job.createdAt];
        for (let i = 0; i < stamps.length; i++) {
            if (!stamps[i]) continue;
            if (this.normalizeDateKey(stamps[i]) === dateKey) return true;
        }
        return false;
    }
    async findConflictingDriverIds(dateKey) {
        const busy = new Set();
        if (!dateKey) {
            // Without a date, only exclude drivers currently fulfilling (EN_ROUTE/ARRIVED/IN_TRIP)
            const rows = await this.prisma.driverJob.findMany({
                where: { status: { in: this.fulfillingDriverJobStatuses() }, driverId: { not: null } },
                select: { driverId: true },
            });
            for (let i = 0; i < rows.length; i++) if (rows[i].driverId) busy.add(rows[i].driverId);
            return busy;
        }
        const jobs = await this.prisma.driverJob.findMany({
            where: {
                status: { in: this.activeDriverJobStatuses() },
                driverId: { not: null },
            },
            select: {
                id: true, driverId: true, status: true, bookingId: true,
                offeredAt: true, acceptedAt: true, startedAt: true, createdAt: true,
            },
        });
        const bookingIds = [];
        for (let i = 0; i < jobs.length; i++) {
            if (jobs[i].bookingId) bookingIds.push(jobs[i].bookingId);
        }
        const bookingMap = {};
        if (bookingIds.length) {
            const bookings = await this.prisma.studyBooking.findMany({
                where: { id: { in: bookingIds } },
                select: { id: true, tripPlan: true },
            });
            for (let i = 0; i < bookings.length; i++) bookingMap[bookings[i].id] = bookings[i];
        }
        for (let i = 0; i < jobs.length; i++) {
            const job = jobs[i];
            const booking = job.bookingId ? bookingMap[job.bookingId] : null;
            if (this.jobOccupiesDate(job, booking, dateKey)) busy.add(job.driverId);
        }
        return busy;
    }
    async lockRentalQuote(body, rentalOptionId, rentalDriverId, dateHint) {
        const optionId = String(rentalOptionId || 'none').trim() || 'none';
        const driverId = String(rentalDriverId || '').trim();
        if (!optionId || optionId === 'none') {
            return this.normalizeRentalMeta(body, 'none', '', 0);
        }
        if (!driverId) {
            throw new common_1.BadRequestException('请选择租车司机');
        }
        const driver = await this.prisma.driverProfile.findUnique({ where: { id: driverId } });
        if (!driver) {
            throw new common_1.BadRequestException('所选司机不存在或已下架');
        }
        if (driver.acceptOrders !== true) {
            throw new common_1.BadRequestException('该司机当前不可预约');
        }
        if (String(driver.status || '') === 'LEAVE') {
            throw new common_1.BadRequestException('该司机请假中，请另选');
        }
        const dateKey = this.normalizeDateKey(dateHint)
            || this.normalizeDateKey(body && (body.date || body.dayKey || body.rentalDate))
            || '';
        // Also pull dates from tripPlan in body
        let tripDates = [];
        try {
            const plan = this.normalizeTripPlan(body && (body.tripPlan || body.routePlan || body.itinerary));
            tripDates = this.collectBookingDateKeys({ tripPlan: plan }, dateKey);
        }
        catch (_e) {
            tripDates = dateKey ? [dateKey] : [];
        }
        const checkDates = tripDates.length ? tripDates : (dateKey ? [dateKey] : []);
        for (let i = 0; i < checkDates.length; i++) {
            const busy = await this.findConflictingDriverIds(checkDates[i]);
            if (busy.has(driver.id)) {
                throw new common_1.BadRequestException('该司机在所选日期已有安排，请另选');
            }
        }
        // Server-locked price from DriverProfile.basePrice (ignore client rentalFee)
        let fee = Number(driver.basePrice || 0);
        if (!Number.isFinite(fee) || fee < 0) fee = 0;
        fee = Math.min(fee, 20000);
        const metaBody = Object.assign({}, body || {}, {
            rentalDriverName: driver.realName,
            rentalDriverPhone: driver.phone,
            rentalDriverWechat: driver.wechat || '',
            rentalVehicleName: driver.vehicleName,
            rentalPlateNo: driver.plateNo,
            driverName: driver.realName,
            driverPhone: driver.phone,
            driverWechat: driver.wechat || '',
            vehicleName: driver.vehicleName,
            plateNo: driver.plateNo,
        });
        return this.normalizeRentalMeta(metaBody, optionId, driver.id, fee);
    }
    async maybeFreeDriver(driverId) {
        if (!driverId) return;
        try {
            const active = await this.prisma.driverJob.count({
                where: {
                    driverId,
                    status: { in: this.fulfillingDriverJobStatuses().concat(['ACCEPTED']) },
                },
            });
            if (active > 0) return;
            const driver = await this.prisma.driverProfile.findUnique({ where: { id: driverId } });
            if (!driver) return;
            if (String(driver.status) !== 'BUSY') return;
            await this.prisma.driverProfile.update({
                where: { id: driverId },
                data: { status: driver.acceptOrders ? 'ONLINE' : 'OFFLINE' },
            });
        }
        catch (_e) { }
    }
    async cancelDriverJobsForBookings(bookingIds) {
        const ids = (bookingIds || []).map((x) => String(x || '')).filter((x) => x.length > 0);
        if (!ids.length) return;
        const jobs = await this.prisma.driverJob.findMany({
            where: {
                bookingId: { in: ids },
                status: { in: ['OPEN', 'OFFERED', 'ACCEPTED', 'EN_ROUTE', 'ARRIVED', 'IN_TRIP'] },
            },
            select: { id: true, driverId: true },
        });
        await this.prisma.driverJob.updateMany({
            where: {
                bookingId: { in: ids },
                status: { in: ['OPEN', 'OFFERED', 'ACCEPTED', 'EN_ROUTE', 'ARRIVED', 'IN_TRIP'] },
            },
            data: { status: 'CANCELLED', cancelledAt: new Date(), cancelReason: '预约已取消' },
        });
        const freed = new Set();
        for (let i = 0; i < jobs.length; i++) {
            if (jobs[i].driverId && !freed.has(jobs[i].driverId)) {
                freed.add(jobs[i].driverId);
                await this.maybeFreeDriver(jobs[i].driverId);
            }
        }
    }
    async ensureDriverJobForBooking(booking, group = []) {
        // V2 Phase A: 新预约不再挂租车；仅历史单（已有 rentalDriverId）仍走旧 DriverJob
        if (!booking) return null;
        const optionId = String(booking.rentalOptionId || '').trim();
        const driverId = String(booking.rentalDriverId || '').trim();
        if (!driverId) return null;
        if (!optionId || optionId === 'none') return null;
        const driver = await this.prisma.driverProfile.findUnique({ where: { id: driverId } });
        if (!driver) return null;
        const seats = Array.isArray(group) && group.length
            ? this.countSeatBookings(group)
            : 1;
        const price = booking.rentalFee != null ? Number(booking.rentalFee) : Number(driver.basePrice || 0);
        const payload = {
            driverId: driver.id,
            driverUserId: driver.userId,
            enterpriseId: booking.project && booking.project.enterpriseId ? booking.project.enterpriseId : driver.enterpriseId,
            projectId: booking.projectId,
            bookingId: booking.id,
            bookerUserId: booking.bookerId || booking.userId,
            vehicleType: driver.vehicleType || optionId,
            status: 'OFFERED',
            price: Number.isFinite(price) ? price : 0,
            passengerCount: Math.max(1, seats),
            passengerName: booking.participantName || (booking.user && booking.user.realName) || (booking.user && booking.user.nickname) || '',
            passengerPhone: booking.participantPhone || (booking.user && booking.user.phone) || '',
            pickupAddress: booking.pickupAddress || '',
            pickupLatitude: booking.pickupLatitude,
            pickupLongitude: booking.pickupLongitude,
            dropoffAddress: (booking.project && (booking.project.location || booking.project.title)) || '',
            note: '研学预约租车·指定单待确认',
            offeredAt: new Date(),
            acceptedAt: null,
            cancelledAt: null,
            cancelReason: null,
        };
        const existed = await this.prisma.driverJob.findFirst({
            where: { bookingId: booking.id, status: { not: 'CANCELLED' } },
            orderBy: { createdAt: 'desc' },
        });
        let job;
        if (existed) {
            // Do not downgrade an already-accepted / in-progress job back to OFFERED
            const st = String(existed.status || '');
            if (['ACCEPTED', 'EN_ROUTE', 'ARRIVED', 'IN_TRIP', 'COMPLETED'].indexOf(st) >= 0) {
                const keep = Object.assign({}, payload);
                keep.status = existed.status;
                keep.acceptedAt = existed.acceptedAt;
                keep.offeredAt = existed.offeredAt || payload.offeredAt;
                delete keep.note;
                job = await this.prisma.driverJob.update({ where: { id: existed.id }, data: keep });
            }
            else {
                job = await this.prisma.driverJob.update({ where: { id: existed.id }, data: payload });
            }
        }
        else {
            job = await this.prisma.driverJob.create({
                data: { jobNo: this.makeDriverJobNo(), ...payload },
            });
        }
        // P0-1: do NOT set driver BUSY until acceptJob
        return job;
    }

    async listRentalDrivers(userId, query = {}) {
        void userId;
        const enabled = await this.rentalFeatureOn();
        const vehicleType = String(query.vehicleType ?? query.rentalOptionId ?? 'range_s').trim() || 'range_s';
        const pickupLat = Number(query.pickupLat ?? query.lat ?? 0);
        const pickupLng = Number(query.pickupLng ?? query.lng ?? 0);
        const projectId = String(query.projectId ?? '').trim();
        const date = String(query.date ?? '').trim();
        const city = this.normalizeCityName(query.city) || this.cityFromCoord(pickupLat, pickupLng);
        const range = this.rentalSeatRange(vehicleType);
        let enterpriseLat = null;
        let enterpriseLng = null;
        let enterpriseName = '';
        if (projectId) {
            const project = await this.prisma.studyProject.findUnique({ where: { id: projectId } });
            if (project) {
                enterpriseName = project.location ?? project.title ?? '';
                if (project.departureLatitude != null && project.departureLongitude != null) {
                    enterpriseLat = Number(project.departureLatitude);
                    enterpriseLng = Number(project.departureLongitude);
                }
            }
        }
        const hasPickup = Number.isFinite(pickupLat) && Number.isFinite(pickupLng) && Math.abs(pickupLat) > 0.01 && Math.abs(pickupLng) > 0.01;
        if (!enabled || range.id === 'none') {
            return {
                vehicleType,
                date: date || null,
                city: city || null,
                pickup: hasPickup ? { latitude: pickupLat, longitude: pickupLng } : null,
                enterprise: { projectId: projectId || null, name: enterpriseName, latitude: enterpriseLat, longitude: enterpriseLng },
                radiusKm: 0,
                matching: { byCity: true, city: city || null, excludeRented: true, excludeLeave: true, byDate: true, date: this.normalizeDateKey(date) || null, implemented: 'driver-profile-date' },
                drivers: [],
                total: 0,
                availableCount: 0,
            };
        }
        const pool = await this.prisma.driverProfile.findMany({
            where: {
                acceptOrders: true,
                status: { in: ['ONLINE', 'BUSY'] },
                seatCount: { gte: range.min, lte: range.max },
            },
        });
        // P0-2: conflict by reservation date (and trip dayKeys), not "any incomplete job forever"
        const dateKey = this.normalizeDateKey(date);
        const busyIds = await this.findConflictingDriverIds(dateKey);
        let cityMap = {};
        try {
            const extra = await this.prisma.$queryRawUnsafe(`SELECT id, city FROM "DriverProfile"`);
            for (let i = 0; extra && i < extra.length; i++) {
                cityMap[extra[i].id] = this.normalizeCityName(extra[i].city);
            }
        }
        catch (_e) { }
        const drivers = [];
        for (let i = 0; i < pool.length; i++) {
            const d = pool[i];
            if (busyIds.has(d.id)) continue;
            const driverCity = cityMap[d.id] || this.cityFromCoord(Number(d.baseLatitude || d.lastLatitude || 0), Number(d.baseLongitude || d.lastLongitude || 0));
            if (city && driverCity && driverCity !== city) continue;
            if (city && !driverCity) continue;
            let distanceKm = null;
            const baseLat = Number(d.lastLatitude != null ? d.lastLatitude : d.baseLatitude);
            const baseLng = Number(d.lastLongitude != null ? d.lastLongitude : d.baseLongitude);
            if (hasPickup && Number.isFinite(baseLat) && Number.isFinite(baseLng) && Math.abs(baseLat) > 0.01) {
                distanceKm = Math.round(this.haversineKm(pickupLat, pickupLng, baseLat, baseLng) * 10) / 10;
            }
            const price = Number(d.basePrice || 0);
            drivers.push({
                id: d.id,
                name: d.realName,
                vehicleType: d.vehicleType,
                vehicleName: d.vehicleName,
                seats: Number(d.seatCount || 0),
                plateNo: d.plateNo,
                phone: d.phone,
                wechat: d.wechat || '',
                city: driverCity,
                price,
                priceText: String(price),
                status: 'available',
                statusLabel: '可预约',
                available: true,
                distanceKm,
                leave: false,
                rented: false,
                note: '',
            });
        }
        drivers.sort((a, b) => {
            const da = a.distanceKm == null ? 9999 : a.distanceKm;
            const db = b.distanceKm == null ? 9999 : b.distanceKm;
            if (da !== db) return da - db;
            return a.price - b.price;
        });
        return {
            vehicleType,
            date: date || null,
            city: city || null,
            pickup: hasPickup ? { latitude: pickupLat, longitude: pickupLng } : null,
            enterprise: {
                projectId: projectId || null,
                name: enterpriseName,
                latitude: enterpriseLat,
                longitude: enterpriseLng,
            },
            radiusKm: 0,
            matching: {
                byCity: true,
                city: city || null,
                excludeRented: true,
                excludeLeave: true,
                byDate: true,
                date: dateKey || null,
                implemented: 'driver-profile-date',
            },
            drivers,
            total: drivers.length,
            availableCount: drivers.length,
        };
    }

    async planTripWithAi(userId, body = {}) {
        void userId;
        const message = String(body.message ?? '').trim();
        if (!message) {
            throw new common_1.BadRequestException('请输入你的需求');
        }
        const dayKeys = Array.isArray(body.dayKeys)
            ? body.dayKeys.map((x) => String(x ?? '').trim()).filter((x) => x.length > 0)
            : [];
        const people = Math.max(0, Math.min(200, Number(body.people ?? 0) || 0));
        const spotsIn = Array.isArray(body.spots) ? body.spots : [];
        const spotCatalog = [];
        const spotIdSet = new Set();
        for (let i = 0; i < spotsIn.length && i < 40; i++) {
            const s = spotsIn[i] || {};
            const id = String(s.id ?? '').trim();
            if (!id || spotIdSet.has(id)) continue;
            spotIdSet.add(id);
            spotCatalog.push({
                id,
                title: String(s.title ?? id).trim(),
                zoneKey: String(s.zoneKey ?? 'all').trim() || 'all',
                zoneLabel: String(s.zoneLabel ?? '').trim(),
                durationMin: Number(s.durationMin ?? 40) || 40,
                desc: String(s.desc ?? '').trim(),
            });
        }
        const historyIn = Array.isArray(body.history) ? body.history : [];
        const history = [];
        for (let i = 0; i < historyIn.length && i < 12; i++) {
            const h = historyIn[i] || {};
            const role = String(h.role ?? '').trim() === 'assistant' || String(h.role ?? '').trim() === 'bot'
                ? 'assistant'
                : 'user';
            const content = String(h.content ?? h.text ?? '').trim();
            if (content.length === 0) continue;
            history.push({ role, content: content.slice(0, 2000) });
        }
        const prefs = body.prefs && typeof body.prefs === 'object' ? body.prefs : {};
        const projectId = String(body.projectId ?? '').trim();
        let templateNote = '';
        try {
            if (projectId) {
                const tpls = this.publicAudienceTemplates(await this.readAudienceTemplates(projectId));
                const wanted = String(prefs.templateId || '').trim();
                let picked = null;
                for (let i = 0; i < tpls.length; i++) {
                    if (wanted && tpls[i].id === wanted) { picked = tpls[i]; break; }
                }
                if (!picked && wanted) {
                    for (let i = 0; i < tpls.length; i++) {
                        if (tpls[i].audience === wanted || tpls[i].name === wanted) { picked = tpls[i]; break; }
                    }
                }
                const catalog = tpls.map((t) => ({ id: t.id, name: t.name, audience: t.audience, description: t.description, pace: t.pace, spotIds: t.spotIds })).slice(0, 12);
                templateNote = [
                    '',
                    '【人群点位模板】企业为该项目配置的分层模板（学员可一键选用后再让你改）：',
                    JSON.stringify(catalog),
                    picked ? ('当前学员选用的模板：' + JSON.stringify({ id: picked.id, name: picked.name, audience: picked.audience, description: picked.description, pace: picked.pace, spotIds: picked.spotIds })) : '当前未绑定模板。',
                    '若学员已选模板：在该模板 spotIds 基础上按新要求增删，不要无故丢掉模板方向，除非学员明确要换人群。模板不包含租车；租车是预约外的独立叫车发单，不要因为模板去规划或写入租车。',
                    'isPlan=true 时 days[].spotIds 仍必须来自「可选点位」catalog。',
                ].join('\n');
            }
        } catch (_e) { templateNote = ''; }

        const baseUrl = String(this.config.get('DEEPSEEK_BASE_URL') ?? this.config.get('GROK2API_BASE_URL') ?? 'https://api.deepseek.com').trim().replace(/\/$/, '');
        const apiKey = String(this.config.get('DEEPSEEK_API_KEY') ?? this.config.get('GROK2API_API_KEY') ?? this.config.get('GROK_API_KEY') ?? '').trim();
        const model = String(this.config.get('DEEPSEEK_MODEL') ?? this.config.get('GROK2API_MODEL') ?? 'deepseek-flash').trim() || 'deepseek-flash';
        if (!apiKey) {
            throw new common_1.ServiceUnavailableException('AI 服务未配置，请联系管理员');
        }

        const systemPrompt = [
            '你是「蒙企链探」研学行程小助手，服务正大企业研学预约。',
            '',
            '【产品知识——务必遵守】',
            '1) 预约：按日点选研学点位（集合、无先后顺序）。学员到场后日核销入场；导览可任意前往已选且未完成的点位，不存在强制「第1站/第2站」或固定排程。',
            '2) 点位：spotIds 只能选自下方「可选点位」catalog 的 id；每天建议 2–5 个；多日尽量少重复。reply 禁止出现「第1站」「按顺序打卡」「排好路线」等强制路径用语；可说「点位集合」「可自选前往顺序」。',
            '3) 租车不在预约里选车型/人数区间/司机。用户通过页面浮动「叫车」入口发租车需求单，司机接单后议价。assistant 可建议是否叫车与大致人数（用于把握点位节奏），但不要输出要写入预约的 rentalId 套餐（range_s/range_m/range_l 等），也不要引导用户在预约页选车。',
            '4) 用车流程：提交预约后（或随时）点浮动叫车 → 填写项目/日期/人数/上车点 → 发单 → 司机接单议价。勿编造固定套餐价；勿推荐 van7/mpv9/bus14/bus20 作为预约写入项。',
            '5) 拼图/任务：完成已选点位相关打卡与知识任务即可，顺序自选。',
            '6) 不要主动谈发票/支付细节，除非用户问到。',
            '',
            '你必须只输出一个 JSON 对象（不要 markdown 代码块，不要其它说明文字），字段如下：',
            '{',
            '  "reply": "给用户看的中文回复，可含换行",',
            '  "isPlan": true或false,',
            '  "zonePref": "family|college|business|mixed|all",',
            '  "pace": "light|balanced|full",',
            '  "needCar": "auto|yes|no",',
            '  "rentalId": "none",',
            '  "days": [ { "dayKey": "YYYY-MM-DD", "spotIds": ["点位id", ...] } ]',
            '}',
            '规则：',
            '1) 若用户只是闲聊/信息不足且尚未要求出方案，isPlan=false，days 可为空数组，reply 追问关键信息（人数、偏好、要不要叫车、已选日期）。',
            '2) 若用户要求规划/出方案/推荐点位，或信息已足够，isPlan=true，必须为每一个 dayKeys 生成一天的点位集合（spotIds 为无序集合，强调可自选前往）。',
            '3) spotIds 只能从下方「可选点位」的 id 中选择，每天 2–5 个点位为宜，多日尽量少重复；勿要求学员按数组下标顺序打卡。',
            '4) 按 zonePref 优先选对应分区；mixed 时多日轮换主分区。',
            '5) rentalId 一律输出 none（服务端也会强制 none）。needCar 按用户意图填 auto|yes|no；若 needCar=yes，reply 说明「提交预约后可用页面叫车发单，司机接单后议价」。',
            '6) reply 要用口语简洁说明每日推荐点位集合（强调可自选前往）；可提人数用于节奏，不要写车型区间套餐、不要写「排路线」「按站顺序」。',
            '',
            '当前上下文：',
            '已选日期 dayKeys=' + JSON.stringify(dayKeys),
            '游客人数 people=' + String(people),
            '已知偏好 prefs=' + JSON.stringify(prefs),
            '可选点位=' + JSON.stringify(spotCatalog),
            templateNote,
        ].join('\n');

        const messages = [{ role: 'system', content: systemPrompt }];
        for (let i = 0; i < history.length; i++) messages.push(history[i]);
        messages.push({ role: 'user', content: message.slice(0, 2000) });

        let rawContent = '';
        try {
            const resp = await fetch(baseUrl + '/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: 'Bearer ' + apiKey,
                },
                body: JSON.stringify({
                    model,
                    messages,
                    temperature: 0.4,
                    max_tokens: 1800,
                    thinking: { type: 'disabled' },
                }),
            });
            const text = await resp.text();
            let data = null;
            try {
                data = JSON.parse(text);
            } catch (_e) {
                data = null;
            }
            if (!resp.ok) {
                const errMsg = data?.error?.message || data?.message || text.slice(0, 200) || ('HTTP ' + resp.status);
                throw new common_1.BadGatewayException('AI 调用失败：' + String(errMsg));
            }
            rawContent = String(data?.choices?.[0]?.message?.content ?? '').trim();
        } catch (err) {
            if (err instanceof common_1.HttpException) throw err;
            const msg = err != null && err.message != null ? String(err.message) : '网络错误';
            throw new common_1.BadGatewayException('AI 服务不可用：' + msg);
        }
        if (!rawContent) {
            throw new common_1.BadGatewayException('AI 未返回内容');
        }

        const parsed = this.parseAiPlanJson(rawContent);
        const zonePref = this.normalizeAiZone(parsed.zonePref || prefs.zonePref || 'all');
        const pace = this.normalizeAiPace(parsed.pace || prefs.pace || 'balanced');
        const needCar = this.normalizeAiNeedCar(parsed.needCar || prefs.needCar || 'auto');
        // 产品：租车不写入预约；rentalId 恒为 none（needCar 仅 advisory）
        const rentalId = 'none';
        const rentalNameMap = {
            none: '不写入预约·用浮动叫车',
        };
        const daysOut = [];
        const daysIn = Array.isArray(parsed.days) ? parsed.days : [];
        const dayKeySet = new Set(dayKeys);
        // ensure every selected day appears
        const byKey = new Map();
        for (let i = 0; i < daysIn.length; i++) {
            const d = daysIn[i] || {};
            const dk = String(d.dayKey ?? '').trim();
            if (!dk) continue;
            if (dayKeys.length > 0 && !dayKeySet.has(dk)) continue;
            const idsRaw = Array.isArray(d.spotIds) ? d.spotIds : [];
            const ids = [];
            for (let j = 0; j < idsRaw.length; j++) {
                const id = String(idsRaw[j] ?? '').trim();
                if (id && spotIdSet.has(id) && ids.indexOf(id) < 0) ids.push(id);
            }
            byKey.set(dk, ids);
        }
        const keysOrder = dayKeys.length > 0 ? dayKeys : Array.from(byKey.keys());
        for (let i = 0; i < keysOrder.length; i++) {
            const dk = keysOrder[i];
            let ids = byKey.get(dk) || [];
            if (ids.length === 0 && spotCatalog.length > 0 && parsed.isPlan) {
                // fallback fill from zone
                ids = this.pickSpotsFallback(spotCatalog, zonePref, pace, i, keysOrder.length);
            }
            const titles = [];
            for (let j = 0; j < ids.length; j++) {
                const hit = spotCatalog.find((s) => s.id === ids[j]);
                titles.push(hit ? hit.title : ids[j]);
            }
            daysOut.push({ dayKey: dk, spotIds: ids, titles });
        }

        let isPlan = parsed.isPlan === true && daysOut.some((d) => d.spotIds.length > 0);
        if (dayKeys.length === 0) isPlan = false;

        let reply = String(parsed.reply || '').trim();
        if (!reply) {
            reply = isPlan
                ? '已为你搭配好多日点位集合，可点「应用点位方案」写入已选点位；到场后可自选前往顺序。'
                : '告诉我亲子/高校/商务偏好、要轻松还是紧凑、人数与要不要叫车，我来推荐点位集合。';
        }
        if (needCar === 'yes' && reply.indexOf('叫车') < 0 && reply.indexOf('租车') < 0) {
            reply = reply + '\n\n提交预约后可用页面叫车发单，司机接单后议价。';
        }

        return {
            reply,
            isPlan,
            model,
            zonePref,
            pace,
            needCar,
            rentalId,
            rentalName: rentalNameMap[rentalId] || '不写入预约·用浮动叫车',
            days: daysOut,
            source: 'deepseek',
        };
    }

    parseAiPlanJson(raw) {
        let text = String(raw || '').trim();
        // strip ```json fences if model wraps
        if (text.startsWith('```')) {
            text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
        }
        const first = text.indexOf('{');
        const last = text.lastIndexOf('}');
        if (first >= 0 && last > first) {
            text = text.slice(first, last + 1);
        }
        try {
            const obj = JSON.parse(text);
            if (obj && typeof obj === 'object') return obj;
        } catch (_e) {}
        return {
            reply: String(raw || '').trim().slice(0, 1500),
            isPlan: false,
            days: [],
        };
    }

    normalizeAiZone(v) {
        const s = String(v || '').trim();
        if (s === 'family' || s === 'college' || s === 'business' || s === 'mixed' || s === 'all') return s;
        return 'all';
    }

    normalizeAiPace(v) {
        const s = String(v || '').trim();
        if (s === 'light' || s === 'balanced' || s === 'full') return s;
        return 'balanced';
    }

    normalizeAiNeedCar(v) {
        const s = String(v || '').trim();
        if (s === 'yes' || s === 'no' || s === 'auto') return s;
        return 'auto';
    }

    recommendRentalIdLocal(people, needCar, kids, team) {
        if (needCar === 'no') return 'none';
        const n = Math.max(0, Number(people) || 0);
        if (needCar === 'yes' || n >= 3 || kids || team) {
            if (n <= 7) return 'range_s';
            if (n <= 14) return 'range_m';
            return 'range_l';
        }
        if (n <= 2) return 'none';
        if (n <= 7) return 'range_s';
        if (n <= 14) return 'range_m';
        return 'range_l';
    }

    pickSpotsFallback(catalog, zonePref, pace, dayIndex, dayCount) {
        let pool = catalog.slice();
        if (zonePref === 'family' || zonePref === 'college' || zonePref === 'business') {
            const filtered = catalog.filter((s) => s.zoneKey === zonePref);
            if (filtered.length > 0) pool = filtered;
        } else if (zonePref === 'mixed' && dayCount > 1) {
            const keys = ['family', 'college', 'business'];
            const primary = keys[dayIndex % keys.length];
            const filtered = catalog.filter((s) => s.zoneKey === primary);
            if (filtered.length > 0) pool = filtered;
        }
        let take = 3;
        if (pace === 'light') take = 2;
        if (pace === 'full') take = 4;
        const ids = [];
        for (let i = 0; i < pool.length && ids.length < take; i++) ids.push(pool[i].id);
        return ids;
    }



    async hydrateProjectContacts(project) {
        if (!project || !project.id) return project;
        try {
            const raw = await this.readProjectContactsRaw(project.id);
            project.projectContacts = raw;
            project._publicContacts = this.publicProjectContacts(raw);
        } catch (_e) {
            project._publicContacts = project._publicContacts || [];
        }
        return project;
    }

    async serializeProjectWithContacts(project, zoneDict) {
        if (!project) return this.serializeProject(project, zoneDict);
        try {
            const raw = await this.readProjectContactsRaw(project.id);
            project._publicContacts = this.publicProjectContacts(raw);
            project.projectContacts = raw;
        } catch (_e) {
            project._publicContacts = project._publicContacts || [];
        }
        return this.serializeProject(project, zoneDict);
    }


    resolveDutyContactForPublic(project) {
        try {
            const dayOps = (project && project.dayOps && typeof project.dayOps === 'object' && !Array.isArray(project.dayOps)) ? project.dayOps : {};
            let today = '';
            today = this.chinaDateKey();
            const ops = dayOps[today] && typeof dayOps[today] === 'object' ? dayOps[today] : {};
            const all = Array.isArray(project && project.projectContacts) ? project.projectContacts
                : (Array.isArray(project && project._publicContacts) ? project._publicContacts : this.publicProjectContacts(project && (project.projectContacts || project.contacts) || []));
            let dutyId = '';
            if (ops.duty != null) {
                dutyId = typeof ops.duty === 'object' ? String(ops.duty.id || ops.duty.contactId || '').trim() : String(ops.duty || '').trim();
            }
            let hit = null;
            if (dutyId) hit = all.find((c) => String(c.id) === dutyId) || null;
            if (!hit) hit = all.find((c) => String(c.role || '') === '现场负责人') || null;
            if (!hit) return null;
            // only expose if visible to students OR explicitly assigned as today's duty
            const visible = hit.visibleToStudents !== false || !!dutyId;
            if (!visible) return null;
            return {
                id: String(hit.id || ''),
                name: String(hit.name || ''),
                phone: String(hit.phone || ''),
                wechat: String(hit.wechat || ''),
                role: String(hit.role || '现场负责人'),
                label: '今日现场负责人',
            };
        } catch (_e) {
            return null;
        }
    }

    normalizeAudienceTemplates(raw) {
        return audience_templates_1.normalizeAudienceTemplates(raw);
    }
    publicAudienceTemplates(raw) {
        return audience_templates_1.publicAudienceTemplates(raw);
    }
        async ensureAudienceTemplatesColumn() {
        if (this._audienceTemplatesReady) return;
        try {
            await this.prisma.$executeRawUnsafe(`ALTER TABLE "StudyProject" ADD COLUMN IF NOT EXISTS "audienceTemplates" JSONB NOT NULL DEFAULT '[]'::jsonb`);
            this._audienceTemplatesReady = true;
        } catch (_e) {}
    }
    async readAudienceTemplates(projectId) {
        await this.ensureAudienceTemplatesColumn();
        try {
            const rows = await this.prisma.$queryRawUnsafe(`SELECT "audienceTemplates" FROM "StudyProject" WHERE id=$1`, String(projectId));
            return this.normalizeAudienceTemplates(rows && rows[0] ? rows[0].audienceTemplates : []);
        } catch (_e) {
            return [];
        }
    }
    serializeProject(project, zoneDict) {
        const startTimestamp = project.startTime ? Math.floor(project.startTime.getTime() / 1000) : null;
        const endTimestamp = project.endTime ? Math.floor(project.endTime.getTime() / 1000) : null;
        const liveStage = this.resolveProjectLiveStage(project);
        const points = Array.isArray(project.routePoints) ? project.routePoints : [];
        const enabledPoints = points.filter((point) => point.enabled !== false);
        const routePoints = enabledPoints.map((point) => this.serializeCatalogSpot(point, zoneDict));
        const zoneSeen = {};
        const routeZones = [];
        if (Array.isArray(zoneDict)) {
            for (let i = 0; i < zoneDict.length; i++) {
                zoneSeen[zoneDict[i].key] = true;
                routeZones.push(zoneDict[i]);
            }
        }
        for (let i = 0; i < routePoints.length; i++) {
            const key = routePoints[i].zoneKey;
            if (key && !zoneSeen[key]) {
                zoneSeen[key] = true;
                routeZones.push({ key, label: routePoints[i].zoneLabel || key });
            }
        }
        return {
            id: project.id,
            title: project.title,
            subtitle: project.subtitle,
            price: project.price.toString(),
            status: project.status,
            liveStage,
            liveStageText: this.liveStageText(liveStage),
            canStudentsEnterLive: this.canStudentsEnterLiveStage(liveStage),
            canCheckInRoutePoints: this.canCheckInRoutePointStage(liveStage),
            liveStartedAt: project.liveStartedAt,
            departureStartedAt: project.departureStartedAt,
            studyStartedAt: project.studyStartedAt,
            liveEndedAt: project.liveEndedAt,
            currentRoutePointId: project.currentRoutePointId ?? '',
            enrolled: project.enrolled,
            maxCapacity: project.maxCapacity,
            bookableDays: project.bookableDays != null ? Number(project.bookableDays) : 7,
            dayOps: (project.dayOps && typeof project.dayOps === 'object' && !Array.isArray(project.dayOps)) ? project.dayOps : {},
            scheduleDays: Array.isArray(project.scheduleDays) ? project.scheduleDays : [],
            scheduleMeta: project.scheduleMeta || null,
            audienceTemplates: this.publicAudienceTemplates(project.audienceTemplates),
            tags: project.tags,
            gradientStart: project.gradientStart,
            gradientEnd: project.gradientEnd,
            category: project.category,
            date: project.openDate ?? '',
            location: project.location ?? '',
            locationLatitude: project.departureLatitude != null ? Number(project.departureLatitude) : null,
            locationLongitude: project.departureLongitude != null ? Number(project.departureLongitude) : null,
            documents: this.getProjectDocumentSummaries(project),
            contactPhone: project.contactPhone ?? '',
            contactServiceTime: project.contactServiceTime ?? '',
            contactWechat: project.contactWechat ?? '',
            contacts: Array.isArray(project._publicContacts) ? project._publicContacts : this.publicProjectContacts(project.projectContacts || project.contacts || this.projectContactsCacheGet(project && project.id) || []),
            dutyContact: this.resolveDutyContactForPublic(project),
            liveDayOps: this.readTodayDayOps(project),
            mediaColors: project.mediaColors,
            openDate: project.openDate ?? '',
            startTime: startTimestamp,
            endTime: endTimestamp,
            departure: this.serializeDepartureSettings(project),
            enterpriseId: project.enterpriseId != null ? String(project.enterpriseId) : '',
            enterpriseName: this.enterpriseDisplayName(project.enterprise),
            routePoints,
            routeZones,
            createdAt: project.createdAt,
            updatedAt: project.updatedAt,
        };
    }
    enterpriseDisplayName(enterprise) {
        if (enterprise == null)
            return '';
        const shortName = enterprise.shortName != null ? String(enterprise.shortName).trim() : '';
        if (shortName.length > 0)
            return shortName;
        return enterprise.name != null ? String(enterprise.name).trim() : '';
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
    resolveCurrentRoutePointId(project, points) {
        const currentRoutePointId = String(project.currentRoutePointId ?? '').trim();
        if (currentRoutePointId.length === 0)
            return '';
        for (let i = 0; i < points.length; i++) {
            if (points[i].routePointId === currentRoutePointId || points[i].id === currentRoutePointId)
                return currentRoutePointId;
        }
        return '';
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
        if (project.startTime instanceof Date && project.startTime.getTime() <= Date.now()) {
            return STUDY_LIVE_STAGES.WAITING_ADMIN_START;
        }
        return STUDY_LIVE_STAGES.NOT_STARTED;
    }
    liveStageText(stage) {
        if (stage === STUDY_LIVE_STAGES.WAITING_ADMIN_START)
            return '等待项目管理员开始';
        if (stage === STUDY_LIVE_STAGES.READY)
            return '已准备开始';
        if (stage === STUDY_LIVE_STAGES.DEPARTING)
            return '正在前往研学基地中';
        if (stage === STUDY_LIVE_STAGES.STUDY_ACTIVE)
            return '研学进行中';
        if (stage === STUDY_LIVE_STAGES.ENDED)
            return '已结束';
        return '未开始';
    }
    canStudentsEnterLiveStage(stage) {
        // 自由探索：未结束即可进入
        return stage !== STUDY_LIVE_STAGES.ENDED;
    }
    canCheckInRoutePointStage(stage) {
        // 自由探索：未结束即可到点打卡/趣味任务
        return stage !== STUDY_LIVE_STAGES.ENDED;
    }
    parseAmapRouteResponse(data, mode) {
        const route = data?.route ?? null;
        const paths = Array.isArray(route?.paths) ? route.paths : [];
        const path = paths.length > 0 ? paths[0] : null;
        const steps = Array.isArray(path?.steps) ? path.steps : [];
        const points = [];
        for (let i = 0; i < steps.length; i++) {
            this.appendAmapPolyline(points, steps[i]?.polyline);
        }
        return {
            mode,
            source: data?.status === '1' && points.length >= 2 ? 'amap' : 'none',
            status: data?.status === '1' && points.length >= 2 ? 'ok' : 'failed',
            distance: this.readAmapMetric(path?.distance ?? route?.distance),
            duration: this.readAmapMetric(path?.duration ?? route?.duration),
            points,
        };
    }
    appendAmapPolyline(points, value) {
        const text = String(value ?? '').trim();
        if (text.length === 0)
            return;
        const items = text.split(';');
        for (let i = 0; i < items.length; i++) {
            const pair = items[i].split(',');
            if (pair.length < 2)
                continue;
            const longitude = Number(pair[0]);
            const latitude = Number(pair[1]);
            if (!Number.isFinite(latitude) || !Number.isFinite(longitude))
                continue;
            if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180)
                continue;
            const last = points.length > 0 ? points[points.length - 1] : null;
            if (last != null && Math.abs(last.latitude - latitude) < 0.000001 && Math.abs(last.longitude - longitude) < 0.000001)
                continue;
            points.push({ latitude, longitude });
        }
    }
    createUnavailableRouteSegment(origin, destination, mode) {
        return {
            mode,
            source: 'none',
            status: 'unavailable',
            distance: Math.round(this.getDistanceMeters(origin.latitude, origin.longitude, destination.latitude, destination.longitude)),
            duration: null,
            points: [],
        };
    }
    getAmapWebServiceKey() {
        return String(this.config.get('AMAP_WEB_SERVICE_KEY') ?? this.config.get('GAODE_WEB_SERVICE_KEY') ?? '').trim();
    }
    mapAmapRouteMode(value) {
        const raw = String(value ?? '').trim();
        if (raw === 'vehicle' || raw === 'driving' || raw === 'car')
            return 'vehicle';
        return 'walk';
    }
    formatRouteCoordinate(value) {
        return value.toFixed(6);
    }
    readAmapMetric(value) {
        const num = Number(value);
        if (!Number.isFinite(num))
            return null;
        return Math.round(num);
    }
    assertProjectLiveOpenForStudent(project) {
        const stage = this.resolveProjectLiveStage(project);
        if (stage === STUDY_LIVE_STAGES.ENDED)
            throw new common_1.BadRequestException('项目已结束，请查看研学结算');
    }
    assertProjectStudyTasksActive(project) {
        const stage = this.resolveProjectLiveStage(project);
        if (stage === STUDY_LIVE_STAGES.ENDED)
            throw new common_1.BadRequestException('项目已结束，不能继续探索');
    }
    assertRoutePointOpenForCurrentStage(project, point) {
        // 自由探索：任意已启用点位可到点触发，不再要求管理员切换当前点
        void project;
        void point;
    }
    normalizeProjectDocumentSections(value) {
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
    normalizeProjectDocuments(value) {
        if (!Array.isArray(value))
            return [];
        return value
            .map((item, index) => {
            const title = String(item?.title ?? '').trim();
            const url = String(item?.url ?? '').trim();
            return {
                title,
                size: String(item?.size ?? '').trim(),
                url,
                subtitle: String(item?.subtitle ?? '').trim(),
                updatedAt: String(item?.updatedAt ?? '').trim(),
                managed: item?.managed === true,
                sections: this.normalizeProjectDocumentSections(item?.sections),
                onlineUrl: url.length > 0 ? url : 'online://study-projects/{projectId}/documents/' + index.toString(),
            };
        })
            .filter((item) => item.title.length > 0);
    }
    getProjectDocuments(project) {
        const documents = this.normalizeProjectDocuments(project.documents).map((doc, index) => ({
            ...doc,
            url: doc.url.replace('{projectId}', project.id),
            onlineUrl: doc.onlineUrl.replace('{projectId}', project.id),
        }));
        const hasManagedDocuments = documents.some((doc) => doc.managed || doc.sections.length > 0);
        if (documents.length > 0 && (project.id !== '6' || hasManagedDocuments))
            return documents;
        if (project.id === '6')
            return this.getDefaultZhengdaProjectDocuments(project);
        return [];
    }
    getProjectDocumentSummaries(project) {
        return this.getProjectDocuments(project).map((doc) => ({
            title: doc.title,
            size: doc.size,
            url: doc.url,
        }));
    }
    getDefaultZhengdaProjectDocuments(project) {
        const docs = [
            { title: '正大企业研学预约与行程手册', size: '在线预览', url: 'online://study-projects/6/documents/0' },
            { title: '园区安全须知与应急指引', size: '在线预览', url: 'online://study-projects/6/documents/1' },
            { title: '路线分区·AI规划·租车说明', size: '在线预览', url: 'online://study-projects/6/documents/2' },
        ];
        return docs.map((doc, index) => {
            const detail = this.createZhengdaProjectDocument(project, index, doc);
            return {
                ...doc,
                subtitle: detail.subtitle,
                updatedAt: detail.updatedAt,
                sections: detail.sections,
                onlineUrl: doc.url,
            };
        });
    }
    createProjectDocumentDetail(project, index, doc) {
        const sections = this.normalizeProjectDocumentSections(doc.sections);
        if (sections.length > 0) {
            return {
                projectId: project.id,
                projectTitle: project.title,
                title: doc.title,
                subtitle: String(doc.subtitle ?? '').trim() || project.subtitle,
                updatedAt: String(doc.updatedAt ?? '').trim() || new Date().toISOString().slice(0, 10),
                sections,
            };
        }
        if (project.id === '6')
            return this.createZhengdaProjectDocument(project, index, doc);
        return {
            projectId: project.id,
            projectTitle: project.title,
            title: doc.title,
            subtitle: project.subtitle,
            updatedAt: new Date().toISOString().slice(0, 10),
            sections: [
                {
                    heading: '文档说明',
                    paragraphs: ['该文档由项目运营方维护，具体安排以现场通知为准。'],
                    bullets: doc.url.length > 0 ? ['线上链接：' + doc.url] : [],
                },
            ],
        };
    }
    createZhengdaProjectDocument(project, index, doc) {
        const base = {
            projectId: project.id,
            projectTitle: project.title,
            title: doc.title,
            subtitle: project.subtitle,
            updatedAt: '2026-08-16',
        };
        if (index === 1) {
            return {
                ...base,
                sections: [
                    {
                        heading: '入园与通行',
                        paragraphs: [
                            '研学在内蒙古正大鸿业食品有限公司园区内开展。现场按「家庭亲子 / 高校研学 / 企业商务」三区分区接待，请服从带队老师、讲解员与安全员安排。',
                        ],
                        bullets: [
                            '请按预约开放日与开放时段到指定集合点签到，勿提前进入产线或仓储限制区。',
                            '分区通道内请保持队列，不奔跑、不逆行、不触碰设备与展陈道具。',
                            '大件行李、易燃易爆及强刺激气味物品请勿带入互动与观摩区域。',
                        ],
                    },
                    {
                        heading: '分区安全要点',
                        paragraphs: [
                            '不同分区体验强度不同：亲子区偏互动、高校区偏实验室与对谈、商务区偏展陈与产线观摩。请按当日已选路线行动。',
                        ],
                        bullets: [
                            '家庭亲子区：儿童须由家长陪同；实验与工坊操作听从现场指引。',
                            '高校研学区：进入实验室/对谈空间时遵守安全规范与提问秩序。',
                            '企业商务区：观摩廊与会晤厅禁止擅自拍摄受限区域，听从讲解节奏。',
                            '如身体不适，立即告知带队老师并到集合点休息。',
                        ],
                    },
                    {
                        heading: '租车与上车安全',
                        paragraphs: [
                            '需要用车请通过页面浮动叫车发单，司机接单议价后，按约定上车点核对车牌。未叫车学员按园区接驳或自行前往集合点。',
                        ],
                        bullets: [
                            '上车系好安全带，儿童使用合适座椅（如自备）。',
                            '勿在行驶中随意更换座位或将头手伸出车外。',
                            '到达后在司机指引的落客点下车，再步行至集合点。',
                            '行程中变更上车点，请提前联系司机并在小程序更新备注（如有）。',
                        ],
                    },
                    {
                        heading: '应急与联系',
                        paragraphs: [
                            '集合点同时作为应急联络点。异常情况优先保证人员安全，再联系现场管理员。',
                        ],
                        bullets: [
                            '走散：原地等待或回到最近路线区域入口，由管理员通过预约名单联系。',
                            '突发疏散：听从园区安全员，按指示到指定空旷集合点。',
                            '咨询与协调：以项目详情页联系方式为准；紧急情况优先找现场带队老师。',
                            '服务时间：工作日 09:00–18:00（现场研学日以当日开放时段为准）。',
                        ],
                    },
                ],
            };
        }
        if (index === 2) {
            return {
                ...base,
                sections: [
                    {
                        heading: '三区路线怎么选',
                        paragraphs: [
                            '预约时可按天配置不同路线。目录覆盖家庭亲子、高校研学、企业商务三类区域，每天在开放–截止时段内完成所选站点。',
                        ],
                        bullets: [
                            '家庭亲子：童趣工坊、小小牧场、奇妙科学角等，适合亲子轻松体验。',
                            '高校研学：职业启航舱、创新实验室、学长对谈等，适合学生与教师团队。',
                            '企业商务：品牌展陈、智慧产线观摩廊、商务会晤品鉴等，适合接待与专业参访。',
                            '可多日连续预约；每天路线可不同，已满员日期不可选。',
                        ],
                    },
                    {
                        heading: 'AI 智能规划',
                        paragraphs: [
                            '填写预约页可点击「AI 智能规划」，与行程小助手对话说明人数、偏好与要不要叫车。助手会为全部已选日期推荐点位集合（无强制先后）；用车请走浮动叫车发单，司机接单议价。到场后可自选前往已选点位。',
                        ],
                        bullets: [
                            '可直接说「亲子轻松」「高校紧凑」「商务接待」「不要叫车」等。',
                            '生成方案后点「应用点位方案」写入各日已选点位，仍可手动微调；不会写入车型到预约。',
                            '「再改一版」会更换点位搭配，便于对比。',
                            '用车请点浮动叫车发单，司机接单后议价；AI 不编造固定套餐价，也不把车型写入预约。',
                            'AI 为辅助建议，最终以你在预约页确认并提交的内容为准。',
                        ],
                    },
                    {
                        heading: '叫车说明',
                        paragraphs: [
                            '用车为可选项：通过页面浮动叫车发单，司机接单后议价。费用以司机报价为准，无固定套餐价目录；预约页不再选车型或司机。',
                        ],
                        bullets: [
                            '自行前往：不叫车，园区内可按导航自选前往已选点位。',
                            '需要用车：点浮动叫车，填写项目/日期/人数/上车点后发单。',
                            '司机接单后可议价并核对车牌；人数便于司机评估运力。',
                            '勿在预约流程里挑选车型区间或指定司机写入预约单。',
                        ],
                    },
                    {
                        heading: '现场打卡与成果',
                        paragraphs: [
                            '进入研学项目后，完成已选点位相关打卡与知识任务即可（顺序自选）。完成点位可收集拼图与研学成果，具体以现场管理员设置为准。',
                        ],
                        bullets: [
                            '支持定位或扫码等方式签到（以点位配置为准）。',
                            '定位失败时可请管理员核验后代签。',
                            '奖品与积分发放以现场库存及核验结果为准。',
                            '可在「研学背包 / 我的成果」查看进度。',
                        ],
                    },
                ],
            };
        }
        return {
            ...base,
            sections: [
                {
                    heading: '项目概览',
                    paragraphs: [
                        '正大集团企业研学研习在内蒙古正大鸿业食品有限公司园区开展。学员可通过小程序完成多日预约、分区选路、AI 辅助规划，需要用车时通过浮动叫车发单，再到现场按开放时段参与讲解、互动与观摩。',
                    ],
                    bullets: [
                        '地点：内蒙古正大鸿业食品有限公司食品加工厂园区。',
                        '主题：食品安全、智能制造、职业认知、亲子科普与商务参访。',
                        '对象：已预约并完成支付（或按通知确认）的游客 / 学员 / 团组。',
                        '开放日：以小程序日历为准（示例档期如 9/12、9/13，须连续多选）。',
                    ],
                },
                {
                    heading: '预约怎么走',
                    paragraphs: [
                        '请在「申请预约」页按步骤完成：选择游客 → 选择研学日期与每日路线 → 提交并支付；需要用车请另走浮动叫车发单。',
                    ],
                    bullets: [
                        '游客：可多选常用游客；请保证实名信息准确。',
                        '日期：仅显示开放日；已满员日期不可选；多天须连续。',
                        '路线：每天可筛选家庭亲子 / 高校研学 / 企业商务分区，或使用 AI 一次规划多日。',
                        '叫车：浮动入口发单，司机接单议价；不叫车可自行前往。',
                        '提交后可在「我的订单」查看待支付 / 已预约状态。',
                    ],
                },
                {
                    heading: '研学当日建议流程',
                    paragraphs: [
                        '具体集合时刻与动线以当日开放时段及现场组织为准。以下为通用建议。',
                    ],
                    bullets: [
                        '出发前：确认预约日、叫车约定（如有）与手机电量，打开小程序。',
                        '抵达：在集合点完成核验，听从分区指引进入当日路线。',
                        '体验中：按站点讲解与互动节奏行进，完成必要打卡。',
                        '结束：在指定地点集合，已叫车学员与司机汇合返程。',
                    ],
                },
                {
                    heading: '携带与着装',
                    paragraphs: [
                        '建议轻装出行，贵重物品自行保管。',
                    ],
                    bullets: [
                        '手机需能正常打开小程序（预约码 / 导航 / 打卡）。',
                        '舒适防滑鞋服；亲子请为儿童准备防晒或薄外套。',
                        '个人饮用水与常用药；园区内按标识使用餐饮区域。',
                    ],
                },
                {
                    heading: '成果与售后',
                    paragraphs: [
                        '完成现场任务后，可在小程序查看研学背包、拼图与相关奖品记录。咨询、改期与退订规则以平台订单页及现场通知为准。',
                    ],
                    bullets: [
                        '问题优先通过订单详情或项目联系方式反馈。',
                        '天气或园区临时管制导致的调整，以官方动态通知为准。',
                    ],
                },
            ],
        };
    }

    normalizeTripPlan(raw) {
        const empty = { dayKeys: [], days: [] };
        if (raw == null) return empty;
        let obj = raw;
        if (typeof raw === 'string') {
            try { obj = JSON.parse(raw); } catch (_e) { return empty; }
        }
        if (typeof obj !== 'object') return empty;
        const daysIn = Array.isArray(obj.days) ? obj.days : [];
        const days = [];
        const dayKeys = [];
        for (let i = 0; i < daysIn.length; i++) {
            const d = daysIn[i] || {};
            const dayKey = String(d.dayKey ?? d.date ?? '').trim();
            const idsRaw = Array.isArray(d.spotIds) ? d.spotIds : (Array.isArray(d.routePointIds) ? d.routePointIds : []);
            const spotIds = [];
            for (let j = 0; j < idsRaw.length; j++) {
                const id = String(idsRaw[j] ?? '').trim();
                if (id && spotIds.indexOf(id) < 0) spotIds.push(id);
            }
            if (!dayKey && spotIds.length === 0) continue;
            const key = dayKey || ('day' + (days.length + 1).toString());
            days.push({
                dayKey: key,
                spotIds,
                titles: Array.isArray(d.titles) ? d.titles.map((x) => String(x ?? '').trim()).filter((x) => x.length > 0) : [],
            });
            dayKeys.push(key);
        }
        if (days.length === 0 && Array.isArray(obj.dayKeys) && Array.isArray(obj.spotIdsByDay)) {
            // alternate shape
        }
        const checkIn = (obj.checkIn && typeof obj.checkIn === 'object') ? obj.checkIn : { tokens: {}, redeemed: {} };
        const tour = (obj.tour && typeof obj.tour === 'object') ? obj.tour : undefined;
        const stationProgress = (obj.stationProgress && typeof obj.stationProgress === 'object') ? obj.stationProgress : undefined;
        const result = { dayKeys, days, note: String(obj.note ?? '').trim(), checkIn };
        if (tour) result.tour = tour;
        if (stationProgress) result.stationProgress = stationProgress;
        return result;
    }

    // App calendar/display: Asia/Shanghai only (infra TZ stays UTC; never use process-local day)
    shanghaiDateKeyFromInstant(value) {
        const d = value instanceof Date ? value : new Date(value);
        if (Number.isNaN(d.getTime())) return '';
        try {
            return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
        } catch (_e) {
            const ms = d.getTime() + 8 * 3600000;
            const x = new Date(ms);
            return x.getUTCFullYear() + '-' + String(x.getUTCMonth() + 1).padStart(2, '0') + '-' + String(x.getUTCDate()).padStart(2, '0');
        }
    }
    shanghaiEodFromDayKey(dayKey) {
        const k = String(dayKey || '').trim();
        if (!/^\d{4}-\d{2}-\d{2}$/.test(k)) return null;
        const d = new Date(k + 'T23:59:59.999+08:00');
        return Number.isNaN(d.getTime()) ? null : d;
    }
    shanghaiExpireAtAfterDays(expireDays, fromInstant) {
        const n = Math.min(3650, Math.max(0, Math.round(Number(expireDays) || 0)));
        if (n <= 0) return null;
        const issueKey = this.shanghaiDateKeyFromInstant(fromInstant != null ? fromInstant : new Date());
        if (!issueKey) return null;
        const endKey = this.addShanghaiDays(issueKey, n);
        return this.shanghaiEodFromDayKey(endKey);
    }
    shanghaiDayBounds(fromInstant) {
        const key = this.shanghaiDateKeyFromInstant(fromInstant != null ? fromInstant : new Date());
        if (!key) return { key: '', from: null, to: null };
        const from = new Date(key + 'T00:00:00.000+08:00');
        const next = this.addShanghaiDays(key, 1);
        const to = next ? new Date(next + 'T00:00:00.000+08:00') : null;
        return { key, from, to };
    }

    chinaDateKey() {
        return this.shanghaiDateKeyFromInstant(new Date());
    }
    formatDayKeyLabel(key) {
        const p = String(key).split('-');
        if (p.length < 3)
            return String(key);
        return String(parseInt(p[1], 10)) + '月' + String(parseInt(p[2], 10)) + '日';
    }
    ensureCheckInTokens(plan) {
        const crypto = require('crypto');
        const src = (plan && plan.checkIn && typeof plan.checkIn === 'object') ? plan.checkIn : {};
        const tokens = (src.tokens && typeof src.tokens === 'object') ? Object.assign({}, src.tokens) : {};
        const redeemed = (src.redeemed && typeof src.redeemed === 'object') ? Object.assign({}, src.redeemed) : {};
        let changed = false;
        const keys = Array.isArray(plan.dayKeys) ? plan.dayKeys : [];
        for (let i = 0; i < keys.length; i++) {
            const k = String(keys[i] ?? '').trim();
            if (!k)
                continue;
            if (!tokens[k] || String(tokens[k]).length < 8) {
                tokens[k] = crypto.randomBytes(16).toString('hex');
                changed = true;
            }
        }
        plan.checkIn = { tokens, redeemed };
        return { plan, changed };
    }
    checkInPayload(groupId, dayKey, token) {
        return 'MQLTCK|' + String(groupId) + '|' + String(dayKey) + '|' + String(token);
    }
    parseBookingDayCheckInPayload(raw) {
        const text = String(raw ?? '').trim();
        const parts = text.split('|');
        if (parts.length !== 4 || parts[0] !== 'MQLTCK')
            return null;
        return { groupId: parts[1], dayKey: parts[2], token: parts[3] };
    }
    async getBookingCheckInTicket(userId, id) {
        const booking = await this.prisma.studyBooking.findUnique({
            where: { id },
            include: { project: true, user: true },
        });
        if (!booking)
            throw new common_1.NotFoundException('Study booking not found');
        const group = await this.getBookingGroupBookings(booking.bookingGroupId ?? booking.id);
        if (!this.canAccessBookingGroup(userId, group) && !(await this.canAccessByRealName(userId, group)))
            throw new common_1.NotFoundException('Study booking not found');
        const source = this.pickTripSourceBooking(booking, group);
        let plan = this.normalizeTripPlan(source.tripPlan);
        const ensured = this.ensureCheckInTokens(plan);
        plan = ensured.plan;
        if (ensured.changed) {
            await this.prisma.studyBooking.update({ where: { id: source.id }, data: { tripPlan: plan } });
        }
        const today = this.chinaDateKey();
        const status = String(booking.status);
        const days = [];
        const keys = plan.dayKeys || [];
        for (let i = 0; i < keys.length; i++) {
            const dayKey = String(keys[i]);
            const token = (plan.checkIn && plan.checkIn.tokens) ? (plan.checkIn.tokens[dayKey] || '') : '';
            const redeemedAt = (plan.checkIn && plan.checkIn.redeemed) ? plan.checkIn.redeemed[dayKey] : null;
            let state = 'locked';
            let stateLabel = '未到日期';
            let hint = '将于 ' + this.formatDayKeyLabel(dayKey) + ' 当天开放';
            let payload = '';
            if (redeemedAt) {
                state = 'redeemed';
                stateLabel = '已核销';
                hint = '本场次已核销';
            }
            else if (status === 'COMPLETED') {
                state = 'redeemed';
                stateLabel = '已完成';
                hint = '';
            }
            else if (dayKey === today && status === 'BOOKED') {
                state = 'open';
                stateLabel = '今日可核销';
                hint = '请向现场工作人员出示此码';
                payload = this.checkInPayload(booking.bookingGroupId ?? booking.id, dayKey, token);
            }
            else if (dayKey < today) {
                state = 'expired';
                stateLabel = '已过期';
                hint = '预约日已过，未核销';
            }
            days.push({ dayKey, label: this.formatDayKeyLabel(dayKey), state, stateLabel, hint, payload });
        }
        return { bookingId: booking.id, today, days };
    }
    async redeemBookingCheckIn(userId, body) {
        const b = body || {};
        const rawText = (typeof b === 'string') ? b : String(b.raw ?? b.code ?? b.payload ?? b.checkInCode ?? '');
        const parsed = this.parseBookingDayCheckInPayload(rawText) || (
            (b.groupId && b.dayKey && b.token)
                ? { groupId: String(b.groupId), dayKey: String(b.dayKey), token: String(b.token) }
                : null
        );
        if (!parsed)
            throw new common_1.BadRequestException('核销码无效');
        const group = await this.getBookingGroupBookings(parsed.groupId);
        if (!group.length)
            throw new common_1.NotFoundException('订单不存在');
        const booking = group[0];
        await this.assertCanRedeemCheckIn(userId, booking.projectId);
        const today = this.chinaDateKey();
        if (parsed.dayKey !== today)
            throw new common_1.BadRequestException('该核销码仅限 ' + this.formatDayKeyLabel(parsed.dayKey) + ' 使用');
        const source = this.pickTripSourceBooking(booking, group);
        let plan = this.normalizeTripPlan(source.tripPlan);
        const ensured = this.ensureCheckInTokens(plan);
        plan = ensured.plan;
        const token = plan.checkIn.tokens[parsed.dayKey];
        if (!token || token !== parsed.token)
            throw new common_1.BadRequestException('核销码不正确');
        if (plan.checkIn.redeemed[parsed.dayKey])
            throw new common_1.BadRequestException('该日已核销');
        const st = String(booking.status);
        if (st === 'CANCELLED')
            throw new common_1.BadRequestException('订单已取消');
        if (st !== 'BOOKED')
            throw new common_1.BadRequestException('当前订单不可核销');
        try {
            const live = await this.readProjectLiveBooking(booking.projectId || (booking.project && booking.project.id));
            const ops = live && live.dayOps ? live.dayOps[parsed.dayKey] : null;
            if (ops && ops.pauseCheckin) throw new common_1.BadRequestException(parsed.dayKey + ' 已暂停核销');
        } catch (e) {
            if (e instanceof common_1.BadRequestException) throw e;
        }
        plan.checkIn.redeemed[parsed.dayKey] = new Date().toISOString();
        // 日核销=入场闸机：只写 checkedInAt，保持 BOOKED；不因日码齐全自动 COMPLETED
        const now = new Date();
        plan = this.mergeTripTour(plan, {
            status: 'entered',
            enteredAt: now.toISOString(),
            earlyExit: false,
        });
        for (let i = 0; i < group.length; i++) {
            const data = { tripPlan: plan };
            if (group[i].checkedInAt == null)
                data.checkedInAt = now;
            // NEVER auto COMPLETED on day-only redeem
            await this.prisma.studyBooking.update({ where: { id: group[i].id }, data });
        }
        const updated = await this.prisma.studyBooking.findUnique({
            where: { id: booking.id },
            include: { project: true, user: true },
        });
        const updatedGroup = await this.getBookingGroupBookings(parsed.groupId);
        return this.serializeBooking(updated, updatedGroup, userId);
    }
    async assertCanRedeemCheckIn(userId, projectId) {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (user && user.isAdmin)
            return;
        const admin = await this.prisma.studyProjectAdmin.findFirst({ where: { userId, projectId } });
        if (admin)
            return;
        const org = await this.prisma.studyProjectOrganizer.findFirst({ where: { userId, projectId } });
        if (org)
            return;
        throw new common_1.ForbiddenException('仅项目管理员可核销');

    }

    normalizeRentalMeta(body, rentalOptionId, rentalDriverId, rentalFee) {
        const b = body || {};
        const lat = b.pickupLatitude ?? b.pickupLat ?? b.lat;
        const lng = b.pickupLongitude ?? b.pickupLng ?? b.lng;
        let pickupLatitude = null;
        let pickupLongitude = null;
        const nLat = Number(lat);
        const nLng = Number(lng);
        if (Number.isFinite(nLat) && Number.isFinite(nLng) && Math.abs(nLat) > 0.01) {
            pickupLatitude = nLat;
            pickupLongitude = nLng;
        }
        return {
            rentalOptionId: rentalOptionId === 'none' ? null : rentalOptionId,
            rentalDriverId: rentalDriverId || null,
            rentalFee: rentalOptionId === 'none' ? null : rentalFee,
            rentalDriverName: String(b.rentalDriverName ?? b.driverName ?? '').trim() || null,
            rentalDriverPhone: String(b.rentalDriverPhone ?? b.driverPhone ?? '').trim() || null,
            rentalDriverWechat: String(b.rentalDriverWechat ?? b.driverWechat ?? '').trim() || null,
            rentalVehicleName: String(b.rentalVehicleName ?? b.vehicleName ?? '').trim() || null,
            rentalPlateNo: String(b.rentalPlateNo ?? b.plateNo ?? '').trim() || null,
            pickupAddress: String(b.pickupAddress ?? b.address ?? '').trim() || null,
            pickupLatitude,
            pickupLongitude,
        };
    }

    pickTripSourceBooking(booking, group) {
        // Prefer booker row that holds tripPlan
        for (let i = 0; i < group.length; i++) {
            const g = group[i];
            if ((g.bookerId ?? g.userId) === g.userId && g.tripPlan != null) {
                const plan = g.tripPlan;
                if (plan && typeof plan === 'object' && Array.isArray(plan.days) && plan.days.length > 0) return g;
            }
        }
        for (let i = 0; i < group.length; i++) {
            if (group[i].rentalOptionId || group[i].rentalDriverId) return group[i];
        }
        return booking;
    }

    serializeTripFromBooking(b) {
        const tripPlan = this.normalizeTripPlan(b.tripPlan);
        const routePointIds = [];
        for (let i = 0; i < tripPlan.days.length; i++) {
            const ids = tripPlan.days[i].spotIds || [];
            for (let j = 0; j < ids.length; j++) {
                if (routePointIds.indexOf(ids[j]) < 0) routePointIds.push(ids[j]);
            }
        }
        const rentalOptionId = b.rentalOptionId != null ? String(b.rentalOptionId) : 'none';
        const rental = {
            optionId: rentalOptionId || 'none',
            optionLabel: this.rentalOptionLabel(rentalOptionId),
            driverId: b.rentalDriverId != null ? String(b.rentalDriverId) : '',
            fee: b.rentalFee != null ? Number(b.rentalFee) : 0,
            feeText: b.rentalFee != null ? String(b.rentalFee) : '0',
            driverName: b.rentalDriverName != null ? String(b.rentalDriverName) : '',
            driverPhone: b.rentalDriverPhone != null ? String(b.rentalDriverPhone) : '',
            driverWechat: b.rentalDriverWechat != null ? String(b.rentalDriverWechat) : '',
            vehicleName: b.rentalVehicleName != null ? String(b.rentalVehicleName) : '',
            plateNo: b.rentalPlateNo != null ? String(b.rentalPlateNo) : '',
        };
        const pickup = {
            address: b.pickupAddress != null ? String(b.pickupAddress) : '',
            latitude: b.pickupLatitude != null ? Number(b.pickupLatitude) : null,
            longitude: b.pickupLongitude != null ? Number(b.pickupLongitude) : null,
        };
        return { tripPlan, rental, pickup, routePointIds };
    }


    isServiceRoutePointRow(p) {
        if (p == null) return true;
        const title = String(p.title ?? '');
        const desc = String(p.description ?? '');
        const id = String(p.id ?? '');
        const blob = (title + ' ' + desc + ' ' + id).toLowerCase();
        if (title.indexOf('接待') >= 0 || title.indexOf('离场') >= 0 || title.indexOf('出口') >= 0)
            return true;
        if (title.indexOf('入口') >= 0) return true;
        if (blob.indexOf('[service=') >= 0) return true;
        if (id === 'study-route-6-1' || id === 'study-route-6-6') return true;
        if (id.indexOf('entrance') >= 0 || id.indexOf('exit') >= 0 || id.indexOf('lobby') >= 0) return true;
        return false;
    }

    filterStudyExplorePoints(points) {
        const out = [];
        for (let i = 0; i < points.length; i++) {
            if (!this.isServiceRoutePointRow(points[i])) out.push(points[i]);
        }
        return out;
    }




    evaluateBookingDayWindow(booking) {
        const today = this.chinaDateKey();
        const dayKeys = this.collectBookingDateKeys(booking, null).slice().sort();
        if (dayKeys.length === 0) {
            if (booking && booking.checkedInAt) {
                const inDay = this.normalizeDateKey(booking.checkedInAt);
                if (inDay) {
                    if (today === inDay) return { open: true, today, dayKeys: [inDay], reason: 'checkin_day', message: '' };
                    if (today > inDay) return { open: false, today, dayKeys: [inDay], reason: 'expired', message: '预约日已结束，导览已关闭' };
                    return { open: false, today, dayKeys: [inDay], reason: 'before', message: '未到预约日' };
                }
            }
            return { open: true, today, dayKeys, reason: 'no_day_keys', message: '' };
        }
        if (dayKeys.indexOf(today) >= 0) return { open: true, today, dayKeys, reason: 'in_window', message: '' };
        if (today < dayKeys[0]) {
            return { open: false, today, dayKeys, reason: 'before', message: '未到预约日，请于 ' + this.formatDayKeyLabel(dayKeys[0]) + ' 当天进入导览' };
        }
        const last = dayKeys[dayKeys.length - 1];
        if (today > last) return { open: false, today, dayKeys, reason: 'expired', message: '预约日已结束，导览已关闭' };
        return { open: false, today, dayKeys, reason: 'not_today', message: '今日非预约日，仅可在预约日进入导览' };
    }

    async forceCompleteTourAsExpired(booking) {
        if (booking == null) return booking;
        if (this.isTourReallyFinished(booking)) return booking;
        const now = new Date();
        const plan0 = this.normalizeTripPlan(booking.tripPlan);
        const tour0 = (plan0.tour && typeof plan0.tour === 'object') ? plan0.tour : {};
        const entered = booking.checkedInAt != null || !!(tour0.enteredAt) || tour0.status === 'entered' || tour0.status === 'touring';
        // Never-started booking: close day window only — do NOT mark COMPLETED / 结算
        if (!entered) {
            const plan = this.mergeTripTour(plan0, {
                dayExpiredClosed: true,
                dayExpiredClosedAt: now.toISOString(),
            });
            return this.prisma.studyBooking.update({
                where: { id: booking.id },
                data: { tripPlan: plan },
                include: { project: true, user: true },
            });
        }
        const plan = this.mergeTripTour(plan0, {
            status: 'early_exit',
            earlyExit: true,
            earlyExitAt: now.toISOString(),
            expiredDayEnd: true,
            enteredAt: plan0.tour && plan0.tour.enteredAt
                ? plan0.tour.enteredAt
                : (booking.checkedInAt ? new Date(booking.checkedInAt).toISOString() : now.toISOString()),
        });
        return this.prisma.studyBooking.update({
            where: { id: booking.id },
            data: {
                status: client_1.BookingStatus.COMPLETED,
                completedAt: now,
                tripPlan: plan,
            },
            include: { project: true, user: true },
        });
    }

    isTourReallyFinished(booking) {
        if (booking == null)
            return false;
        const plan = this.normalizeTripPlan(booking.tripPlan);
        const tour = (plan.tour && typeof plan.tour === 'object') ? plan.tour : {};
        if (tour.earlyExit === true)
            return true;
        const st = String(tour.status || '');
        return st === 'completed' || st === 'early_exit';
    }

    async reopenPrematurelyCompletedTour(booking) {
        if (booking == null)
            return booking;
        if (String(booking.status) !== 'COMPLETED')
            return booking;
        if (this.isTourReallyFinished(booking))
            return booking;
        try {
            const cert = await this.prisma.studyCertificate.findUnique({ where: { bookingId: booking.id } });
            if (cert)
                return booking;
        }
        catch (_e) { }
        const entered = booking.checkedInAt != null;
        const nowIso = new Date().toISOString();
        const plan = this.mergeTripTour(this.normalizeTripPlan(booking.tripPlan), {
            status: entered ? 'entered' : '',
            enteredAt: entered ? new Date(booking.checkedInAt).toISOString() : undefined,
            earlyExit: false,
        });
        return this.prisma.studyBooking.update({
            where: { id: booking.id },
            data: {
                status: client_1.BookingStatus.BOOKED,
                completedAt: null,
                tripPlan: plan,
            },
            include: { project: true, user: true },
        });
    }

    /**
     * 日核销=入场闸机：只写 checkedInAt + tripPlan.tour.entered，不因日码齐全而 COMPLETED
     */
    mergeTripTour(plan, patch) {
        const base = plan && typeof plan === 'object' ? plan : { dayKeys: [], days: [] };
        const tour = Object.assign({}, (base.tour && typeof base.tour === 'object') ? base.tour : {}, patch || {});
        return Object.assign({}, base, { tour });
    }

    async resolveBookedStudyTargets(booking, projectId) {
        const tripIds = this.serializeTripFromBooking(booking).routePointIds || [];
        const allPts = await this.prisma.studyRoutePoint.findMany({
            where: { projectId, enabled: true },
            include: { autoPrizeProduct: true, knowledgePrizeProduct: true },
        });
        const studyPts = allPts.filter((rp) => !this.isServiceRoutePointRow(rp));
        let targets = [];
        if (tripIds.length > 0) {
            for (let i = 0; i < tripIds.length; i++) {
                const hit = studyPts.find((rp) => rp.id === tripIds[i] || String(rp.description || '').indexOf('[zoneId=' + tripIds[i] + ']') >= 0);
                if (hit) targets.push(hit);
            }
        }
        return { targets, studyPts, tripIds };
    }

    isPointClearedForTour(point, checkedSet, knowledgeDoneSet) {
        const items = this.getKnowledgeItems(point);
        const flat = this.flattenKnowledgeItems(items);
        const needKnowledge = point.knowledgeEnabled === true && flat.length > 0;
        const checked = checkedSet.has(point.id);
        if (!checked) return false;
        if (needKnowledge && !knowledgeDoneSet.has(point.id)) return false;
        return true;
    }

    async maybeCompleteTourBooking(booking, project, operatorUserId) {
        if (booking == null || project == null) return null;
        if (String(booking.status) === 'COMPLETED') {
            const cert = await this.prisma.studyCertificate.findUnique({ where: { bookingId: booking.id } });
            return {
                allStudyDone: true,
                alreadyCompleted: true,
                certificateNo: cert != null ? cert.certificateNo : '',
                message: '研学已完成',
            };
        }
        const plan0 = this.normalizeTripPlan(booking.tripPlan);
        if (plan0.tour && plan0.tour.earlyExit === true) {
            return { allStudyDone: false, earlyExit: true, message: '已提前结束' };
        }
        // Tour completion requires entrance核销 first — never graduate a never-started booking
        if (booking.checkedInAt == null) return null;
        const { targets } = await this.resolveBookedStudyTargets(booking, project.id);
        if (targets.length === 0) return null;
        const [rows, krows] = await Promise.all([
            this.prisma.studyRoutePointCheckIn.findMany({ where: { bookingId: booking.id, projectId: project.id } }),
            this.prisma.studyKnowledgeTaskCompletion.findMany({ where: { bookingId: booking.id, projectId: project.id } }),
        ]);
        const checkedSet = new Set(rows.map((r) => r.routePointId));
        const knowledgeDoneSet = new Set(krows.map((r) => r.routePointId));
        const allCleared = targets.every((t) => this.isPointClearedForTour(t, checkedSet, knowledgeDoneSet));
        if (!allCleared) return null;

        const now = new Date();
        const cert = await this.issueCertificateForBookingIfNeeded(booking, project);
        let finalPrize = null;
        const finalPrizeProductId = (plan0.tour && plan0.tour.finalPrizeProductId)
            ? String(plan0.tour.finalPrizeProductId)
            : (project.finalPrizeProductId ? String(project.finalPrizeProductId) : '');
        if (finalPrizeProductId) {
            try {
                finalPrize = await this.issueFinalTourPrize(booking, project, finalPrizeProductId, operatorUserId || booking.userId);
            } catch (_e) { finalPrize = null; }
        }
        const plan = this.mergeTripTour(plan0, {
            status: 'completed',
            completedAt: now.toISOString(),
            earlyExit: false,
            graduated: true,
            mallRedeemUnlocked: true,
            certificateNo: cert != null ? cert.certificateNo : '',
            finalPrizeGrantId: finalPrize != null ? finalPrize.id : null,
        });
        await this.prisma.studyBooking.update({
            where: { id: booking.id },
            data: {
                status: client_1.BookingStatus.COMPLETED,
                completedAt: now,
                tripPlan: plan,
                checkedInAt: booking.checkedInAt != null ? booking.checkedInAt : now,
            },
        });
        let totalPoints = 0;
        try { totalPoints = this.sumBookingTourPoints(Object.assign({}, booking, { tripPlan: plan })).totalPoints; } catch (_e) { totalPoints = 0; }
        return {
            allStudyDone: true,
            graduated: true,
            mallRedeemUnlocked: true,
            puzzleComplete: true,
            totalPoints,
            certificateNo: cert != null ? cert.certificateNo : '',
            certificate: cert == null ? null : {
                id: cert.id,
                certificateNo: cert.certificateNo,
                holderName: cert.holderName,
                projectTitle: cert.projectTitle,
                summary: cert.summary,
                bodyHtml: cert.bodyHtml || '',
                bgUrl: cert.bgUrl || '',
                sealUrl: cert.sealUrl || '',
                issuedAt: cert.issuedAt,
            },
            finalPrize: finalPrize != null ? this.serializeStudyPrizeGrant(finalPrize) : null,
            finalPrizeConfigured: !!finalPrizeProductId,
            message: finalPrizeProductId
                ? (finalPrize != null ? '拼图集齐，证书与最终奖励已发放，积分商城已解锁兑换' : '拼图集齐，证书已生成（最终奖品模板缺失或不可用），积分商城已解锁')
                : '拼图集齐，证书已生成，积分商城已解锁兑换',
        };
    }

    async issueFinalTourPrize(booking, project, productId, operatorUserId) {
        const existed = await this.prisma.studyPrizeGrant.findFirst({
            where: {
                bookingId: booking.id,
                productId,
                note: { contains: '最终奖励' },
            },
            include: { product: true, grantedBy: true },
        });
        if (existed) return existed;
        const product = await this.prisma.product.findUnique({ where: { id: productId } });
        if (!product || product.canBePrize !== true) return null;
        const createdGrant = await this.prisma.studyPrizeGrant.create({
            data: {
                projectId: project.id,
                bookingId: booking.id,
                userId: booking.userId,
                productId: product.id,
                grantedById: operatorUserId || booking.userId,
                quantity: 1,
                note: '研学最终奖励：拼图集齐',
            },
            include: { product: true, grantedBy: true },
        });
        await this.prisma.order.create({
            data: {
                orderNo: this.generatePrizeOrderNo(),
                userId: booking.userId,
                status: client_1.OrderStatus.UNPAID,
                amount: 0,
                goodsAmount: 0,
                points: 0,
                pointsUsed: 0,
                pointsDiscount: 0,
                remark: this.createPrizeOrderRemark(createdGrant),
                adminRemark: '研学最终奖励记录：' + createdGrant.id,
                items: {
                    create: [{ productId: product.id, quantity: 1, price: 0 }],
                },
            },
        });
        return createdGrant;
    }

    async earlyExitTour(userId, bookingId) {
        const booking = await this.prisma.studyBooking.findFirst({
            where: { id: bookingId, userId, userDeletedAt: null },
            include: { project: true },
        });
        if (!booking) throw new common_1.NotFoundException('订单不存在');
        if (String(booking.status) === 'CANCELLED')
            throw new common_1.BadRequestException('订单已取消');
        if (String(booking.status) === 'COMPLETED') {
            const planDone = this.normalizeTripPlan(booking.tripPlan);
            if (planDone.tour && planDone.tour.earlyExit === true) {
                return this.serializeBooking(booking, await this.getBookingGroupBookings(booking.bookingGroupId ?? booking.id), userId);
            }
            throw new common_1.BadRequestException('研学已完成，无需提前结束');
        }
        if (String(booking.status) !== 'BOOKED')
            throw new common_1.BadRequestException('当前订单不可提前结束');
        if (booking.checkedInAt == null)
            throw new common_1.BadRequestException('请先完成入场核销后再结束研学');
        const now = new Date();
        const plan0 = this.normalizeTripPlan(booking.tripPlan);
        const plan = this.mergeTripTour(plan0, {
            status: 'early_exit',
            earlyExit: true,
            earlyExitAt: now.toISOString(),
            enteredAt: plan0.tour && plan0.tour.enteredAt ? plan0.tour.enteredAt : (booking.checkedInAt ? new Date(booking.checkedInAt).toISOString() : now.toISOString()),
        });
        const updated = await this.prisma.studyBooking.update({
            where: { id: booking.id },
            data: {
                status: client_1.BookingStatus.COMPLETED,
                completedAt: now,
                tripPlan: plan,
            },
            include: { project: true, user: true },
        });
        const group = await this.getBookingGroupBookings(booking.bookingGroupId ?? booking.id);
        return Object.assign(this.serializeBooking(updated, group, userId), {
            earlyExit: true,
            message: '已提前结束，过程奖励已保留，无结业证书与最终奖券',
        });
    }



    async pauseTour(userId, bookingId) {
        const booking = await this.prisma.studyBooking.findFirst({
            where: { id: bookingId, userId, userDeletedAt: null },
            include: { project: true, user: true },
        });
        if (!booking) throw new common_1.NotFoundException('订单不存在');
        if (String(booking.status) === 'CANCELLED')
            throw new common_1.BadRequestException('订单已取消');
        if (String(booking.status) === 'COMPLETED')
            throw new common_1.BadRequestException('研学已结束，无法临时退出');
        if (String(booking.status) !== 'BOOKED')
            throw new common_1.BadRequestException('当前订单不可临时退出');
        if (booking.checkedInAt == null)
            throw new common_1.BadRequestException('请先完成入场核销');
        const plan0 = this.normalizeTripPlan(booking.tripPlan);
        if (plan0.tour && plan0.tour.earlyExit === true)
            throw new common_1.BadRequestException('已提前结束，无法临时退出');
        const nowIso = new Date().toISOString();
        const cur = plan0.tour && plan0.tour.status ? String(plan0.tour.status) : '';
        if (cur === 'paused') {
            const group = await this.getBookingGroupBookings(booking.bookingGroupId ?? booking.id);
            return Object.assign(this.serializeBooking(booking, group, userId), {
                tourPaused: true,
                message: '已临时退出',
            });
        }
        const plan = this.mergeTripTour(plan0, {
            status: 'paused',
            pausedAt: nowIso,
            enteredAt: plan0.tour && plan0.tour.enteredAt
                ? plan0.tour.enteredAt
                : (booking.checkedInAt ? new Date(booking.checkedInAt).toISOString() : nowIso),
            earlyExit: false,
        });
        const updated = await this.prisma.studyBooking.update({
            where: { id: booking.id },
            data: { tripPlan: plan },
            include: { project: true, user: true },
        });
        const group = await this.getBookingGroupBookings(booking.bookingGroupId ?? booking.id);
        return Object.assign(this.serializeBooking(updated, group, userId), {
            tourPaused: true,
            message: '已临时退出，可稍后继续研学',
        });
    }

    async resumeTour(userId, bookingId) {
        const booking = await this.prisma.studyBooking.findFirst({
            where: { id: bookingId, userId, userDeletedAt: null },
            include: { project: true, user: true },
        });
        if (!booking) throw new common_1.NotFoundException('订单不存在');
        if (String(booking.status) === 'CANCELLED')
            throw new common_1.BadRequestException('订单已取消');
        if (String(booking.status) === 'COMPLETED')
            throw new common_1.BadRequestException('研学已结束');
        if (String(booking.status) !== 'BOOKED')
            throw new common_1.BadRequestException('当前订单不可继续研学');
        if (booking.checkedInAt == null)
            throw new common_1.BadRequestException('请先完成入场核销');
        const plan0 = this.normalizeTripPlan(booking.tripPlan);
        if (plan0.tour && plan0.tour.earlyExit === true)
            throw new common_1.BadRequestException('已提前结束，无法继续');
        const nowIso = new Date().toISOString();
        const cur = plan0.tour && plan0.tour.status ? String(plan0.tour.status) : '';
        if (cur === 'touring' || cur === 'entered') {
            const group = await this.getBookingGroupBookings(booking.bookingGroupId ?? booking.id);
            return Object.assign(this.serializeBooking(booking, group, userId), {
                tourResumed: true,
                message: '继续研学',
            });
        }
        const plan = this.mergeTripTour(plan0, {
            status: 'touring',
            resumedAt: nowIso,
            enteredAt: plan0.tour && plan0.tour.enteredAt
                ? plan0.tour.enteredAt
                : (booking.checkedInAt ? new Date(booking.checkedInAt).toISOString() : nowIso),
            earlyExit: false,
        });
        const updated = await this.prisma.studyBooking.update({
            where: { id: booking.id },
            data: { tripPlan: plan },
            include: { project: true, user: true },
        });
        const group = await this.getBookingGroupBookings(booking.bookingGroupId ?? booking.id);
        return Object.assign(this.serializeBooking(updated, group, userId), {
            tourResumed: true,
            message: '继续研学',
        });
    }

    async getProjectLiveStageRecord(projectId) {
        const project = await this.prisma.studyProject.findUnique({ where: { id: projectId } });
        if (!project)
            throw new common_1.NotFoundException('Study project not found');
        return project;
    }


    stationAllStepsFinished(booking, point, liveSteps) {
        if (!liveSteps || liveSteps.length === 0)
            return true;
        const prog = this.readStationProgress(booking, point.id);
        for (let i = 0; i < liveSteps.length; i++) {
            if (!this.stationStepFinished(prog, liveSteps[i].id))
                return false;
        }
        return true;
    }

    async buildStationSettlePayload(userId, project, booking, point, checkIn, alreadyCheckedIn, distance) {
        let stationReward = null;
        try {
            const fresh = await this.prisma.studyBooking.findUnique({ where: { id: booking.id } });
            stationReward = await this.issueStationRewardCoupons(fresh || booking, point, userId);
        }
        catch (_rw) { }
        let completion = null;
        try {
            completion = await this.maybeCompleteTourBooking(booking, project, userId);
        } catch (_e) { /* ignore completion side effects */ }
        let puzzlePiece = null;
        let tourPoints = null;
        try {
            const freshBooking = await this.prisma.studyBooking.findUnique({ where: { id: booking.id } }) || booking;
            const pts = this.sumBookingTourPoints(freshBooking);
            const stPts = this.readStationProgress(freshBooking, point.id).pointsEarned;
            tourPoints = { totalPoints: pts.totalPoints, spentPoints: pts.spentPoints, availablePoints: pts.availablePoints, stationPoints: stPts };
        } catch (_e) { tourPoints = null; }
        puzzlePiece = { routePointId: point.id, title: point.title, collected: true };
        const couponToast = stationReward && stationReward.issued ? {
            title: stationReward.title || '本站奖品卡券',
            productName: stationReward.productName || '',
            count: stationReward.count || 0,
            message: '已发放到「我的卡券」',
        } : null;
        const base = checkIn ? this.serializeRoutePointCheckIn(checkIn) : {
            bookingId: booking.id,
            routePointId: point.id,
            projectId: point.projectId || (project && project.id) || '',
            checkedInAt: null,
        };
        return {
            ...base,
            alreadyCheckedIn: !!alreadyCheckedIn,
            distance: distance == null ? null : Math.round(distance),
            completion,
            stationReward,
            puzzlePiece,
            tourPoints,
            couponToast,
            stationSettled: true,
        };
    }

    async settleStationIfAllStepsDone(userId, project, booking, point, opts) {
        const options = opts && typeof opts === 'object' ? opts : {};
        const latitude = options.latitude != null ? options.latitude : null;
        const longitude = options.longitude != null ? options.longitude : null;
        const accuracy = options.accuracy != null ? options.accuracy : null;
        let pointForSteps = point;
        try {
            const dayKey = this.primaryBookingDayKey(booking) || this.chinaDateKey();
            pointForSteps = await this.applyDayContentToPoint(point.projectId || (project && project.id) || '', point, dayKey);
        } catch (_e) {}
        /* schedule-apply-settle */
        const pack = (pointForSteps.knowledgeItems && typeof pointForSteps.knowledgeItems === 'object' && !Array.isArray(pointForSteps.knowledgeItems)) ? pointForSteps.knowledgeItems : {};
        const stationSteps = this.normalizeStationSteps(pack.stationSteps, pointForSteps, pack);
        this.applyResourceMapToSteps(stationSteps, await this.loadResourceMap(point.projectId || (project && project.id) || ''));
        const liveSteps = this.serializeStationStepsPublic(stationSteps);
        let freshBooking = await this.prisma.studyBooking.findUnique({ where: { id: booking.id } }) || booking;
        if (liveSteps.length > 0) {
            if (!this.stationAllStepsFinished(freshBooking, point, liveSteps))
                return null;
        } else if (this.isKnowledgeTaskConfigured(point)) {
            const knowledgeDone = await this.prisma.studyKnowledgeTaskCompletion.findUnique({
                where: { bookingId_routePointId: { bookingId: booking.id, routePointId: point.id } },
            });
            if (knowledgeDone == null)
                return null;
        } else {
            // Empty station content: never auto-settle on enter/step pipeline.
            // Only explicit check-in after entrance核销 may settle (allowEmptyContentSettle).
            const entered = freshBooking.checkedInAt != null;
            if (!entered || options.allowEmptyContentSettle !== true)
                return null;
        }
        const existed = await this.prisma.studyRoutePointCheckIn.findUnique({
            where: { bookingId_routePointId: { bookingId: booking.id, routePointId: point.id } },
            include: { routePoint: true },
        });
        if (existed) {
            return this.buildStationSettlePayload(userId, project, freshBooking, point, existed, true, null);
        }
        let distance = null;
        if (latitude != null && longitude != null) {
            distance = this.getDistanceMeters(latitude, longitude, Number(point.latitude), Number(point.longitude));
        }
        const checkIn = await this.prisma.$transaction(async (tx) => {
            const created = await tx.studyRoutePointCheckIn.create({
                data: {
                    bookingId: booking.id,
                    userId,
                    projectId: String(point.projectId || (project && project.id) || ''),
                    routePointId: point.id,
                    latitude,
                    longitude,
                    accuracy,
                },
                include: { routePoint: true },
            });
            await this.issueRoutePointAutoRewardsTx(tx, booking, point, userId);
            return created;
        });
        return this.buildStationSettlePayload(userId, project, freshBooking, point, checkIn, false, distance);
    }

    assertTaskStepGateQr(projectId, point, body) {
        const payload = this.extractRoutePointCheckInPayload(body || {});
        if (payload.projectId !== projectId || payload.routePointId !== point.id) {
            throw new common_1.BadRequestException('二维码不属于当前打卡点');
        }
        if (!this.verifyRoutePointGateCode(projectId, point, payload)) {
            throw new common_1.BadRequestException('研学码无效或已更换，请扫描控制台最新研学码');
        }
        return payload;
    }

    async checkInRoutePoint(userId, projectId, routePointId, body) {
        /* live18-spot-guard */
        try {
            let proj = await this.prisma.studyProject.findUnique({ where: { id: String(projectId) } });
            if (proj) {
                try {
                    const rows = await this.prisma.$queryRawUnsafe(`SELECT "dayOps" FROM "StudyProject" WHERE id=$1`, String(projectId));
                    if (rows && rows[0] && rows[0].dayOps) proj.dayOps = typeof rows[0].dayOps === 'object' ? rows[0].dayOps : JSON.parse(String(rows[0].dayOps || '{}'));
                } catch (_e) {}
                this.assertSpotNotClosed(proj, routePointId);
            }
        } catch (e) { if (e instanceof common_1.BadRequestException) throw e; }

        const project = await this.getProjectLiveStageRecord(projectId);
        this.assertProjectStudyTasksActive(project);
        const [booking, point] = await Promise.all([
            this.getUserActiveSeatBooking(projectId, userId),
            this.prisma.studyRoutePoint.findFirst({
                where: {
                    id: routePointId,
                    projectId,
                    enabled: true,
                },
            }),
        ]);
        if (!point)
            throw new common_1.NotFoundException('打卡点不存在或已停用');
        this.assertRoutePointOpenForCurrentStage(project, point);
        const latitude = this.readOptionalNumber(body.latitude);
        const longitude = this.readOptionalNumber(body.longitude);
        const accuracy = this.readOptionalNumber(body.accuracy);
        if (booking.checkedInAt == null) {
            throw new common_1.BadRequestException('请先完成入口核销，再进行站点研学');
        }
        const stationSteps = this.normalizeStationSteps(null, point, (point && point.knowledgeItems && typeof point.knowledgeItems === 'object' && !Array.isArray(point.knowledgeItems)) ? point.knowledgeItems : {});
        this.applyResourceMapToSteps(stationSteps, await this.loadResourceMap(projectId));
        const liveSteps = this.serializeStationStepsPublic(stationSteps);
        if (liveSteps.length > 0) {
            const prog = this.readStationProgress(booking, point.id);
            for (let i = 0; i < liveSteps.length; i++) {
                if (!this.stationStepFinished(prog, liveSteps[i].id)) {
                    throw new common_1.BadRequestException('请先完成本站「' + liveSteps[i].title + '」（可完成或跳过）');
                }
            }
        } else if (this.isKnowledgeTaskConfigured(point)) {
            const knowledgeDone = await this.prisma.studyKnowledgeTaskCompletion.findUnique({
                where: {
                    bookingId_routePointId: {
                        bookingId: booking.id,
                        routePointId: point.id,
                    },
                },
            });
            if (knowledgeDone == null) {
                throw new common_1.BadRequestException('请先完成本站趣味答题，完成后将自动结算本站');
            }
        }
        // 点位码不再作为整站通关闸门：关卡全部完成后自动结算。
        // 若客户端仍附带研学码（兼容旧版），则校验归属；缺码也可通关结算。
        const rawOpt = String((body && (body.raw ?? body.qr ?? body.data)) || '').trim();
        if (rawOpt.length > 0) {
            const payload = this.extractRoutePointCheckInPayload(body);
            if (payload.projectId !== projectId || payload.routePointId !== point.id) {
                throw new common_1.BadRequestException('二维码不属于当前打卡点');
            }
            if (!this.verifyRoutePointGateCode(projectId, point, payload)) {
                throw new common_1.BadRequestException('研学码无效或已更换，请扫描控制台最新研学码');
            }
        }
        const settled = await this.settleStationIfAllStepsDone(userId, project, booking, point, {
            latitude, longitude, accuracy,
            allowEmptyContentSettle: true,
        });
        if (!settled) {
            throw new common_1.BadRequestException('请先完成本站全部内容（可完成或跳过），完成后将自动结算');
        }
        return settled;
    }


    async completeStationStep(userId, projectId, routePointId, stepId, body) {
        /* live18-spot-guard */
        try {
            let proj = await this.prisma.studyProject.findUnique({ where: { id: String(projectId) } });
            if (proj) {
                try {
                    const rows = await this.prisma.$queryRawUnsafe(`SELECT "dayOps" FROM "StudyProject" WHERE id=$1`, String(projectId));
                    if (rows && rows[0] && rows[0].dayOps) proj.dayOps = typeof rows[0].dayOps === 'object' ? rows[0].dayOps : JSON.parse(String(rows[0].dayOps || '{}'));
                } catch (_e) {}
                this.assertSpotNotClosed(proj, routePointId);
            }
        } catch (e) { if (e instanceof common_1.BadRequestException) throw e; }

        const project = await this.getProjectLiveStageRecord(projectId);
        this.assertProjectStudyTasksActive(project);
        const [booking, point] = await Promise.all([
            this.getUserActiveSeatBooking(projectId, userId),
            this.prisma.studyRoutePoint.findFirst({ where: { id: routePointId, projectId, enabled: true } }),
        ]);
        if (!point)
            throw new common_1.NotFoundException('打卡点不存在或已停用');
        if (booking.checkedInAt == null)
            throw new common_1.BadRequestException('请先完成入口核销，再进行站点研学');
        const pack = (point.knowledgeItems && typeof point.knowledgeItems === 'object' && !Array.isArray(point.knowledgeItems)) ? point.knowledgeItems : {};
        const steps = this.normalizeStationSteps(pack.stationSteps, point, pack);
        this.applyResourceMapToSteps(steps, await this.loadResourceMap(projectId));
        const step = steps.find((s) => s.id === String(stepId));
        if (!step)
            throw new common_1.BadRequestException('本站没有这项内容');
        if (body && (body.skip === true || body.skipped === true)) {
            const skippedRes = await this.skipStationStepRecord(booking, point, step);
            const settleSkip = await this.settleStationIfAllStepsDone(userId, project, booking, point, {});
            if (settleSkip)
                return Object.assign({}, skippedRes, settleSkip, { stepCompleted: true });
            return skippedRes;
        }
        if (step.type === 'quiz') {
            const questions = (step.questions || []).map((q) => this.normalizeQuizQuestion(q));
            const answerIndexes = this.readStationQuizAnswers(body, questions);
            const grade = this.gradeStationQuiz(questions, answerIndexes, step);
            if (!grade.completed) {
                const prog = this.readStationProgress(booking, point.id);
                return {
                    correct: false,
                    completed: false,
                    stepId: step.id,
                    doneIds: prog.done,
                    skippedIds: prog.skipped,
                    exhaustedIds: prog.exhausted || [],
                    pointsEarned: prog.pointsEarned,
                    quizScore: grade.earned,
                    quizMax: grade.maxPossible,
                    perQuestion: grade.perQuestion,
                    message: grade.message || '答案不正确，请再试一次',
                };
            }
            const planQ = this.normalizeTripPlan(booking.tripPlan);
            const allProgQ = Object.assign({}, planQ.stationProgress && typeof planQ.stationProgress === 'object' ? planQ.stationProgress : {});
            const curQ = this.mutateStationProgress(allProgQ[point.id]);
            const alreadyQ = curQ.done.indexOf(step.id) >= 0;
            if (curQ.done.indexOf(step.id) < 0)
                curQ.done = curQ.done.concat([step.id]);
            if (!alreadyQ)
                curQ.pointsEarned = Number(curQ.pointsEarned || 0) + Number(grade.awardPoints || 0);
            curQ.quiz[step.id] = answerIndexes;
            allProgQ[point.id] = curQ;
            planQ.stationProgress = allProgQ;
            await this.prisma.studyBooking.update({ where: { id: booking.id }, data: { tripPlan: planQ } });
            const quizSteps = steps.filter((s) => s.type === 'quiz' && s.questions && s.questions.length > 0);
            const quizAllDone = quizSteps.length > 0 && quizSteps.every((s) => curQ.done.indexOf(s.id) >= 0);
            if (quizAllDone && this.isKnowledgeTaskConfigured(point)) {
                const existed = await this.prisma.studyKnowledgeTaskCompletion.findUnique({
                    where: { bookingId_routePointId: { bookingId: booking.id, routePointId: point.id } },
                });
                if (existed == null) {
                    const flat = [];
                    for (let i = 0; i < quizSteps.length; i++) {
                        const ans = Array.isArray(curQ.quiz[quizSteps[i].id]) ? curQ.quiz[quizSteps[i].id] : [];
                        for (let j = 0; j < ans.length; j++) {
                            if (Array.isArray(ans[j])) {
                                for (let k = 0; k < ans[j].length; k++) flat.push(Number(ans[j][k] || 0));
                            } else {
                                flat.push(Number(ans[j] || 0));
                            }
                        }
                    }
                    await this.prisma.$transaction(async (tx) => {
                        const created = await tx.studyKnowledgeTaskCompletion.create({
                            data: {
                                bookingId: booking.id,
                                userId,
                                projectId,
                                routePointId: point.id,
                                answerIndex: flat[0] ?? 0,
                                answerIndexes: flat,
                            },
                        });
                        await this.issueKnowledgeTaskRewardsTx(tx, booking, point, userId, created.id);
                        return created;
                    });
                }
            }
            const quizOut = {
                correct: grade.allExact,
                completed: true,
                stepId: step.id,
                doneIds: curQ.done,
                skippedIds: curQ.skipped,
                exhaustedIds: curQ.exhausted || [],
                pointsEarned: curQ.pointsEarned,
                quizScore: grade.earned,
                quizMax: grade.maxPossible,
                perQuestion: grade.perQuestion,
                message: grade.allExact ? '答题完成' : '已提交，按部分得分计入本站积分',
            };
            const settleQuiz = await this.settleStationIfAllStepsDone(userId, project, booking, point, {});
            if (settleQuiz)
                return Object.assign({}, quizOut, settleQuiz, { stepCompleted: true });
            return quizOut;
        }
        if (step.type === 'game') {
            const result = this.readGameResultBody((body && typeof body === 'object' && Object.keys(body).length) ? body : { event: 'complete', passed: true });
            const gameOut = await this.persistStationGameResult(booking, point, step, result);
            if (gameOut && gameOut.completed) {
                const settleGame = await this.settleStationIfAllStepsDone(userId, project, booking, point, {});
                if (settleGame)
                    return Object.assign({}, gameOut, settleGame, { stepCompleted: true });
            }
            return gameOut;
        }
        // 现场任务：必须扫本站研学码（点位码）确认完成；视频等其它类型无需扫码
        if (step.type === 'task') {
            this.assertTaskStepGateQr(projectId, point, body);
        }
        const plan0 = this.normalizeTripPlan(booking.tripPlan);
        const allProg = Object.assign({}, plan0.stationProgress && typeof plan0.stationProgress === 'object' ? plan0.stationProgress : {});
        const cur = this.mutateStationProgress(allProg[point.id]);
        const already = cur.done.indexOf(step.id) >= 0;
        if (cur.done.indexOf(step.id) < 0)
            cur.done = cur.done.concat([step.id]);
        if (!already)
            this.addStationPoints(cur, step);
        allProg[point.id] = cur;
        plan0.stationProgress = allProg;
        await this.prisma.studyBooking.update({ where: { id: booking.id }, data: { tripPlan: plan0 } });
        const stepOut = { correct: true, completed: true, stepId: step.id, doneIds: cur.done, skippedIds: cur.skipped, exhaustedIds: cur.exhausted || [], pointsEarned: cur.pointsEarned, message: step.type === 'task' ? '现场任务已确认完成' : '本项已完成' };
        const settleStep = await this.settleStationIfAllStepsDone(userId, project, booking, point, {});
        if (settleStep)
            return Object.assign({}, stepOut, settleStep, { stepCompleted: true });
        return stepOut;
    }

    h5PublicApiBase() {
        return String(process.env.PUBLIC_API_BASE || 'http://127.0.0.1:3000/api/v1').replace(/\/+$/, '');
    }
    readPassScore(value) {
        if (value == null || value === '')
            return null;
        const n = Number(value);
        if (!Number.isFinite(n))
            return null;
        return n;
    }
    toBase64Url(buf) {
        return Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
    }
    fromBase64Url(text) {
        const s = String(text || '').replace(/-/g, '+').replace(/_/g, '/');
        const pad = s.length % 4 === 2 ? '==' : (s.length % 4 === 3 ? '=' : '');
        return Buffer.from(s + pad, 'base64');
    }
    createH5GamePlayToken(claims) {
        const payload = {
            v: 1,
            uid: String(claims.uid || ''),
            bid: String(claims.bookingId || ''),
            pid: String(claims.projectId || ''),
            rid: String(claims.routePointId || ''),
            sid: String(claims.stepId || ''),
            exp: Math.floor(Date.now() / 1000) + 4 * 3600,
            n: (0, crypto_1.randomBytes)(8).toString('hex'),
        };
        const body = this.toBase64Url(JSON.stringify(payload));
        const sig = this.toBase64Url((0, crypto_1.createHmac)('sha256', this.checkInCodeSecret()).update('mqlt-h5-game-play:v1:' + body).digest());
        return body + '.' + sig;
    }
    verifyH5GamePlayToken(token) {
        const raw = String(token || '').trim();
        const i = raw.lastIndexOf('.');
        if (i < 8)
            throw new common_1.BadRequestException('小游戏会话无效，请从小程序重新进入');
        const body = raw.slice(0, i);
        const sig = raw.slice(i + 1);
        const expected = this.toBase64Url((0, crypto_1.createHmac)('sha256', this.checkInCodeSecret()).update('mqlt-h5-game-play:v1:' + body).digest());
        const left = Buffer.from(sig);
        const right = Buffer.from(expected);
        if (left.length !== right.length || !(0, crypto_1.timingSafeEqual)(left, right))
            throw new common_1.BadRequestException('小游戏会话无效，请从小程序重新进入');
        let payload;
        try {
            payload = JSON.parse(this.fromBase64Url(body).toString('utf8'));
        }
        catch (_e) {
            throw new common_1.BadRequestException('小游戏会话无效');
        }
        if (!payload || payload.v !== 1)
            throw new common_1.BadRequestException('小游戏会话无效');
        if (Number(payload.exp || 0) < Math.floor(Date.now() / 1000))
            throw new common_1.BadRequestException('小游戏会话已过期，请返回后重新进入');
        return payload;
    }
    appendH5PlayQuery(gameUrl, params) {
        const base = String(gameUrl || '').trim();
        if (!base)
            return '';
        const hashAt = base.indexOf('#');
        const pathAndQuery = hashAt >= 0 ? base.slice(0, hashAt) : base;
        const hash = hashAt >= 0 ? base.slice(hashAt + 1) : '';
        const qAt = pathAndQuery.indexOf('?');
        const path = qAt >= 0 ? pathAndQuery.slice(0, qAt) : pathAndQuery;
        const old = qAt >= 0 ? pathAndQuery.slice(qAt + 1) : '';
        const map = {};
        if (old) {
            const parts = old.split('&');
            for (let i = 0; i < parts.length; i++) {
                if (!parts[i])
                    continue;
                const kv = parts[i].split('=');
                const k = decodeURIComponent(kv[0] || '');
                if (!k)
                    continue;
                map[k] = decodeURIComponent(kv.slice(1).join('=') || '');
            }
        }
        const keys = Object.keys(params || {});
        for (let i = 0; i < keys.length; i++) {
            const k = keys[i];
            const v = params[k];
            if (v == null || v === '')
                continue;
            map[k] = String(v);
        }
        map.mqlt = '1';
        const outKeys = Object.keys(map);
        const q = outKeys.map((k) => encodeURIComponent(k) + '=' + encodeURIComponent(map[k])).join('&');
        return path + '?' + q + (hash ? ('#' + hash) : '');
    }
    readGameResultBody(body) {
        const src = body && typeof body === 'object' ? body : {};
        let event = String(src.event || src.type || 'complete').trim().toLowerCase();
        if (event === 'mqlt-game-complete' || event === 'win' || event === 'success')
            event = 'complete';
        if (event !== 'fail' && event !== 'progress')
            event = 'complete';
        let score = src.score != null ? Number(src.score) : null;
        if (score != null && !Number.isFinite(score))
            score = null;
        if (score != null)
            score = Math.max(-10000000, Math.min(10000000, Math.round(score * 100) / 100));
        let passed = src.passed;
        if (passed === 'true' || passed === 1 || passed === '1')
            passed = true;
        if (passed === 'false' || passed === 0 || passed === '0')
            passed = false;
        if (typeof passed !== 'boolean')
            passed = null;
        let durationMs = src.durationMs != null ? Number(src.durationMs) : (src.duration != null ? Number(src.duration) : null);
        if (durationMs != null && !Number.isFinite(durationMs))
            durationMs = null;
        if (durationMs != null)
            durationMs = Math.max(0, Math.min(86400000, Math.round(durationMs)));
        let payload = src.payload;
        if (payload != null && typeof payload !== 'object')
            payload = { value: String(payload).slice(0, 200) };
        if (payload && Array.isArray(payload))
            payload = { items: payload.slice(0, 20) };
        const json = JSON.stringify(payload || {});
        if (json.length > 8000)
            payload = { truncated: true };
        return { event, score, passed, durationMs, payload: payload && typeof payload === 'object' ? payload : {} };
    }
    gameStepQualifies(step, result) {
        if (!result || result.event !== 'complete')
            return false;
        if (result.passed === false)
            return false;
        const passScore = step && step.passScore;
        if (passScore != null && Number.isFinite(Number(passScore))) {
            if (result.score == null || Number(result.score) < Number(passScore))
                return false;
        }
        return true;
    }
    writeStationGameProgress(cur, step, result) {
        if (!cur.games || typeof cur.games !== 'object')
            cur.games = {};
        const prev = (cur.games[step.id] && typeof cur.games[step.id] === 'object') ? cur.games[step.id] : {};
        const qualified = this.gameStepQualifies(step, result);
        const maxRetries = this.readMaxRetries(step && step.maxRetries);
        const alreadyExhausted = prev.exhausted === true || (Array.isArray(cur.exhausted) && cur.exhausted.indexOf(step.id) >= 0);
        const scoreLocked = alreadyExhausted === true;
        let best = prev.bestScore;
        if (result.score != null && !scoreLocked) {
            if (best == null || Number(result.score) > Number(best))
                best = result.score;
        }
        const attempts = Number(prev.attempts || 0) + (result.event === 'progress' ? 0 : 1);
        let exhausted = alreadyExhausted;
        if (!qualified && !exhausted && maxRetries != null && attempts >= maxRetries)
            exhausted = true;
        const record = {
            score: result.score != null ? result.score : (prev.score != null ? prev.score : null),
            bestScore: best != null && Number.isFinite(Number(best)) ? Number(best) : null,
            passed: qualified || prev.passed === true,
            reportedPassed: result.passed,
            durationMs: result.durationMs != null ? result.durationMs : (prev.durationMs != null ? prev.durationMs : null),
            payload: result.payload || prev.payload || {},
            event: result.event,
            attempts,
            exhausted: exhausted === true,
            scoreLocked: scoreLocked === true,
            maxRetries,
            at: new Date().toISOString(),
        };
        cur.games[step.id] = record;
        if (exhausted && Array.isArray(cur.exhausted) && cur.exhausted.indexOf(step.id) < 0)
            cur.exhausted = cur.exhausted.concat([step.id]);
        let message = '';
        if (qualified) {
            message = '';
        } else if (exhausted && scoreLocked) {
            message = '次数已用完，可继续浏览，成绩不再升高';
        } else if (exhausted) {
            message = '次数已用完，已按当前最高分结算，可继续浏览或扫码';
        } else if (result.event === 'fail') {
            message = maxRetries != null ? ('未通关，还可再试 ' + Math.max(0, maxRetries - attempts) + ' 次') : '未通关，请再试一次';
        } else if (result.event === 'progress') {
            message = '进度已记录';
        } else if (step.passScore != null && (result.score == null || result.score < step.passScore)) {
            message = '未达到及格分 ' + step.passScore;
        } else {
            message = '未达到通关条件';
        }
        return { qualified, record, message, exhausted, scoreLocked, newlyExhausted: exhausted && !alreadyExhausted };
    }
    async loadLiveStationStep(projectId, routePointId, stepId) {
        const point = await this.prisma.studyRoutePoint.findFirst({ where: { id: routePointId, projectId, enabled: true } });
        if (!point)
            throw new common_1.NotFoundException('打卡点不存在或已停用');
        const pack = (point.knowledgeItems && typeof point.knowledgeItems === 'object' && !Array.isArray(point.knowledgeItems)) ? point.knowledgeItems : {};
        const steps = this.normalizeStationSteps(pack.stationSteps, point, pack);
        this.applyResourceMapToSteps(steps, await this.loadResourceMap(projectId));
        const live = this.serializeStationStepsPublic(steps);
        const step = live.find((s) => s.id === String(stepId)) || steps.find((s) => s.id === String(stepId));
        if (!step || step.type !== 'game')
            throw new common_1.BadRequestException('本站没有这项小游戏');
        const full = steps.find((s) => s.id === String(stepId)) || step;
        return { point, pack, steps, live, step: Object.assign({}, step, {
            passScore: this.readPassScore(full.passScore),
            gameUrl: full.gameUrl || step.gameUrl,
            maxRetries: this.readMaxRetries(full.maxRetries != null ? full.maxRetries : step.maxRetries),
            skippable: this.readStepSkippable(full.skippable != null ? full.skippable : step.skippable),
            scoreTiers: Array.isArray(full.scoreTiers) ? full.scoreTiers : (Array.isArray(step.scoreTiers) ? step.scoreTiers : []),
            points: this.readStepPoints(full.points != null ? full.points : step.points),
        }) };
    }
    async startStationGamePlay(userId, projectId, routePointId, stepId) {
        /* live18-spot-guard */
        try {
            let proj = await this.prisma.studyProject.findUnique({ where: { id: String(projectId) } });
            if (proj) {
                try {
                    const rows = await this.prisma.$queryRawUnsafe(`SELECT "dayOps" FROM "StudyProject" WHERE id=$1`, String(projectId));
                    if (rows && rows[0] && rows[0].dayOps) proj.dayOps = typeof rows[0].dayOps === 'object' ? rows[0].dayOps : JSON.parse(String(rows[0].dayOps || '{}'));
                } catch (_e) {}
                this.assertSpotNotClosed(proj, routePointId);
            }
        } catch (e) { if (e instanceof common_1.BadRequestException) throw e; }

        const project = await this.getProjectLiveStageRecord(projectId);
        this.assertProjectStudyTasksActive(project);
        const [booking, loaded] = await Promise.all([
            this.getUserActiveSeatBooking(projectId, userId),
            this.loadLiveStationStep(projectId, routePointId, stepId),
        ]);
        if (booking.checkedInAt == null)
            throw new common_1.BadRequestException('请先完成入口核销，再进行站点研学');
        const prog = this.readStationProgress(booking, loaded.point.id);
        for (let i = 0; i < loaded.live.length; i++) {
            if (loaded.live[i].id === loaded.step.id)
                break;
            if (!this.stationStepFinished(prog, loaded.live[i].id))
                throw new common_1.BadRequestException('请先完成本站「' + loaded.live[i].title + '」（可完成、跳过或次数用尽）');
        }
        if (!loaded.step.gameUrl)
            throw new common_1.BadRequestException('小游戏未配置');
        const fullStep = loaded.step;
        const gameRec = (prog.games && prog.games[fullStep.id] && typeof prog.games[fullStep.id] === 'object') ? prog.games[fullStep.id] : {};
        const exhausted = prog.exhausted.indexOf(fullStep.id) >= 0 || gameRec.exhausted === true;
        const maxRetries = this.readMaxRetries(fullStep.maxRetries);
        const playToken = this.createH5GamePlayToken({
            uid: userId,
            bookingId: booking.id,
            projectId,
            routePointId: loaded.point.id,
            stepId: loaded.step.id,
        });
        const apiBase = this.h5PublicApiBase();
        const playUrl = this.appendH5PlayQuery(loaded.step.gameUrl, {
            playToken,
            apiBase,
            projectId,
            routePointId: loaded.point.id,
            stepId: loaded.step.id,
            passScore: loaded.step.passScore == null ? '' : String(loaded.step.passScore),
        });
        return {
            playToken,
            playUrl,
            apiBase,
            sdkUrl: apiBase + '/study/h5/sdk.js',
            templateUrl: apiBase + '/study/h5/template.html',
            resultUrl: apiBase + '/study/h5/game-result',
            passScore: loaded.step.passScore,
            maxRetries,
            skippable: this.readStepSkippable(fullStep.skippable),
            scoreTiers: Array.isArray(fullStep.scoreTiers) ? fullStep.scoreTiers : [],
            attempts: Number(gameRec.attempts || 0),
            bestScore: gameRec.bestScore != null ? Number(gameRec.bestScore) : null,
            exhausted,
            scoreLocked: exhausted === true,
            browseOnly: exhausted === true && gameRec.passed !== true,
            stepId: loaded.step.id,
            title: loaded.step.title,
            expiresInSec: 4 * 3600,
        };
    }
    async getH5GamePlay(query) {
        const token = String((query && (query.token || query.playToken)) || '').trim();
        const claims = this.verifyH5GamePlayToken(token);
        const loaded = await this.loadLiveStationStep(claims.pid, claims.rid, claims.sid);
        return {
            title: loaded.step.title,
            passScore: loaded.step.passScore,
            stepId: loaded.step.id,
            projectId: claims.pid,
            routePointId: claims.rid,
            apiBase: this.h5PublicApiBase(),
        };
    }
    async submitH5GameResult(body) {
        const src = body && typeof body === 'object' ? body : {};
        const token = String(src.token || src.playToken || '').trim();
        const claims = this.verifyH5GamePlayToken(token);
        const project = await this.getProjectLiveStageRecord(claims.pid);
        this.assertProjectStudyTasksActive(project);
        const booking = await this.prisma.studyBooking.findFirst({
            where: { id: String(claims.bid), userId: String(claims.uid), projectId: String(claims.pid), userDeletedAt: null },
        });
        if (!booking)
            throw new common_1.BadRequestException('研学预约无效');
        if (booking.checkedInAt == null)
            throw new common_1.BadRequestException('请先完成入口核销，再进行站点研学');
        const loaded = await this.loadLiveStationStep(claims.pid, claims.rid, claims.sid);
        return this.persistStationGameResult(booking, loaded.point, loaded.step, this.readGameResultBody(src));
    }
    async persistStationGameResult(booking, point, step, result) {
        const plan0 = this.normalizeTripPlan(booking.tripPlan);
        const allProg = Object.assign({}, plan0.stationProgress && typeof plan0.stationProgress === 'object' ? plan0.stationProgress : {});
        const cur = this.mutateStationProgress(allProg[point.id]);
        const already = cur.done.indexOf(step.id) >= 0;
        const alreadyExhausted = cur.exhausted.indexOf(step.id) >= 0;
        const pointsBefore = Number(cur.pointsEarned || 0);
        const applied = this.writeStationGameProgress(cur, step, result);
        if (applied.qualified && cur.done.indexOf(step.id) < 0)
            cur.done = cur.done.concat([step.id]);
        const shouldAward = (applied.qualified && !already) || (applied.newlyExhausted && !already && !alreadyExhausted);
        if (shouldAward) {
            const tierPts = this.pointsFromScoreTiers(step.scoreTiers, applied.record.bestScore);
            if (tierPts != null)
                cur.pointsEarned = pointsBefore + tierPts;
            else if (applied.qualified)
                this.addStationPoints(cur, step);
        }
        allProg[point.id] = cur;
        plan0.stationProgress = allProg;
        await this.prisma.studyBooking.update({ where: { id: booking.id }, data: { tripPlan: plan0 } });
        const finished = applied.qualified || applied.record.exhausted === true || cur.skipped.indexOf(step.id) >= 0;
        const maxRetries = this.readMaxRetries(step.maxRetries);
        const retryable = !applied.qualified && !applied.record.exhausted && (maxRetries == null || Number(applied.record.attempts || 0) < maxRetries);
        return {
            correct: applied.qualified,
            completed: finished,
            passed: applied.qualified,
            exhausted: applied.record.exhausted === true,
            scoreLocked: applied.record.scoreLocked === true || applied.record.exhausted === true,
            browseOnly: applied.record.exhausted === true && !applied.qualified,
            retryable,
            attempts: applied.record.attempts,
            maxRetries,
            stepId: step.id,
            score: applied.record.score,
            bestScore: applied.record.bestScore,
            passScore: step.passScore,
            scoreTiers: Array.isArray(step.scoreTiers) ? step.scoreTiers : [],
            doneIds: cur.done,
            skippedIds: cur.skipped || [],
            exhaustedIds: cur.exhausted || [],
            pointsEarned: cur.pointsEarned || 0,
            game: applied.record,
            message: applied.qualified
                ? '已完成本项小游戏'
                : (applied.message || '未通关，请再试一次'),
        };
    }

    readMaxRetries(value) {
        if (value == null || value === '' || value === undefined)
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
    pointsFromScoreTiers(tiers, bestScore) {
        const list = this.normalizeScoreTiers(tiers);
        if (!list.length)
            return null;
        if (bestScore == null || !Number.isFinite(Number(bestScore)))
            return 0;
        const score = Number(bestScore);
        let hit = null;
        for (let i = 0; i < list.length; i++) {
            if (score >= Number(list[i].minScore))
                hit = list[i];
        }
        return hit ? Number(hit.points) : 0;
    }
    normalizeQuizQuestion(q) {
        if (!q || typeof q !== 'object')
            return { question: '', options: [], multiSelect: false, answerIndexes: [0], answerIndex: 0, partialMode: 'none' };
        const question = String(q.question || '').trim();
        const options = Array.isArray(q.options) ? q.options.map((x) => String(x || '').trim()).filter(Boolean) : [];
        const multiSelect = q.multiSelect === true || q.multi === true;
        let answerIndexes = [];
        if (Array.isArray(q.answerIndexes) && q.answerIndexes.length) {
            answerIndexes = q.answerIndexes.map((n) => Number(n)).filter((n) => Number.isInteger(n) && n >= 0 && n < Math.max(options.length, 1));
        }
        else if (q.answerIndex != null) {
            const ai = Number(q.answerIndex);
            if (Number.isInteger(ai) && ai >= 0)
                answerIndexes = [ai];
        }
        if (!answerIndexes.length)
            answerIndexes = [0];
        if (!multiSelect)
            answerIndexes = [answerIndexes[0]];
        let partialMode = String(q.partialMode || q.partialScoreMode || 'none').trim();
        if (partialMode === 'half')
            partialMode = 'fixed';
        if (['none', 'ratio', 'fixed'].indexOf(partialMode) < 0)
            partialMode = 'none';
        let halfScore = q.halfScore != null ? Number(q.halfScore) : undefined;
        if (halfScore != null && Number.isFinite(halfScore) && halfScore >= 0)
            halfScore = Math.min(999, Math.round(halfScore));
        else
            halfScore = undefined;
        let points = q.points != null ? Number(q.points) : undefined;
        if (points != null && Number.isFinite(points) && points >= 0)
            points = Math.min(999, Math.round(points));
        else
            points = undefined;
        const out = { question, options, multiSelect, answerIndexes, answerIndex: answerIndexes[0], partialMode };
        if (q.id != null && String(q.id).trim())
            out.id = String(q.id).trim();
        if (halfScore != null)
            out.halfScore = halfScore;
        if (points != null)
            out.points = points;
        return out;
    }
    readStationQuizAnswers(body, questions) {
        const n = questions.length;
        const src = body && typeof body === 'object' ? body : {};
        if (Array.isArray(src.answers) && src.answers.length && typeof src.answers[0] === 'object') {
            const out = [];
            for (let i = 0; i < n; i++) {
                const item = src.answers[i] || {};
                if (Array.isArray(item.answerIndexes))
                    out.push(item.answerIndexes.map((x) => Number(x)).filter((x) => Number.isInteger(x)));
                else if (Array.isArray(item.answers))
                    out.push(item.answers.map((x) => Number(x)).filter((x) => Number.isInteger(x)));
                else if (item.answerIndex != null || item.answer != null || item.optionIndex != null)
                    out.push([this.readKnowledgeAnswerIndex(item.answerIndex ?? item.answer ?? item.optionIndex)]);
                else
                    out.push([]);
            }
            return out;
        }
        const value = src.answerIndexes ?? src.answers ?? src.optionIndexes;
        if (Array.isArray(value)) {
            if (value.length && Array.isArray(value[0])) {
                return value.slice(0, n).map((arr) => (Array.isArray(arr) ? arr.map((x) => Number(x)).filter((x) => Number.isInteger(x)) : []));
            }
            const flat = value.map((item) => {
                if (item != null && typeof item === 'object')
                    return this.readKnowledgeAnswerIndex(item.answerIndex ?? item.answer ?? item.optionIndex);
                return this.readKnowledgeAnswerIndex(item);
            });
            return flat.slice(0, n).map((x) => [x]);
        }
        if (src.answerIndex != null || src.answer != null || src.optionIndex != null) {
            return [[this.readKnowledgeAnswerIndex(src.answerIndex ?? src.answer ?? src.optionIndex)]];
        }
        throw new common_1.BadRequestException('请选择有效的题目答案');
    }
    gradeOneQuizQuestion(q, userIndexes) {
        const correct = Array.isArray(q.answerIndexes) ? q.answerIndexes.slice() : [Number(q.answerIndex || 0)];
        const user = Array.isArray(userIndexes) ? userIndexes.map((x) => Number(x)).filter((x) => Number.isInteger(x)) : [];
        const correctSet = {};
        for (let i = 0; i < correct.length; i++) correctSet[correct[i]] = true;
        const userSet = {};
        for (let i = 0; i < user.length; i++) userSet[user[i]] = true;
        let matched = 0;
        for (let i = 0; i < correct.length; i++) {
            if (userSet[correct[i]])
                matched++;
        }
        let extras = 0;
        for (let i = 0; i < user.length; i++) {
            if (!correctSet[user[i]])
                extras++;
        }
        const exact = matched === correct.length && extras === 0 && (q.multiSelect ? user.length === correct.length : user.length === 1);
        const qPoints = q.points != null ? Number(q.points) : null;
        return { exact, matched, extras, correctCount: correct.length, qPoints };
    }
    gradeStationQuiz(questions, answerLists, step) {
        const qs = questions || [];
        const stepPts = this.readStepPoints(step && step.points);
        const hasQPoints = qs.some((q) => q.points != null);
        const share = (!hasQPoints && qs.length) ? (stepPts / qs.length) : 0;
        const perQuestion = [];
        let earned = 0;
        let maxPossible = 0;
        let allExact = qs.length > 0;
        let hasPartialMode = false;
        for (let i = 0; i < qs.length; i++) {
            const q = qs[i];
            if (q.partialMode === 'ratio' || q.partialMode === 'fixed')
                hasPartialMode = true;
            const qMax = q.points != null ? Number(q.points) : share;
            maxPossible += qMax;
            const g = this.gradeOneQuizQuestion(q, answerLists[i] || []);
            if (!g.exact)
                allExact = false;
            let got = 0;
            if (g.exact) {
                got = qMax;
            } else if (q.partialMode === 'ratio' && g.correctCount > 0) {
                got = (g.matched / g.correctCount) * qMax;
                if (g.extras > 0)
                    got = 0;
            } else if (q.partialMode === 'fixed') {
                const half = q.halfScore != null ? Number(q.halfScore) : (qMax / 2);
                if (g.matched > 0 || g.extras > 0)
                    got = Math.max(0, half);
            }
            got = Math.round(got * 100) / 100;
            earned += got;
            perQuestion.push({ index: i, exact: g.exact, earned: got, max: qMax, partialMode: q.partialMode });
        }
        earned = Math.round(earned * 100) / 100;
        maxPossible = Math.round(maxPossible * 100) / 100;
        // Full attempt always completes the step: points = sum of per-question awards (partial modes respected).
        // Do not force restart when not allExact — FE shows review instead.
        const completed = qs.length > 0;
        let awardPoints = 0;
        if (completed) {
            if (hasQPoints || hasPartialMode)
                awardPoints = Math.min(999, Math.round(earned));
            else if (allExact)
                awardPoints = stepPts;
            else
                awardPoints = Math.min(999, Math.round(earned));
        }
        return {
            completed,
            allExact,
            earned,
            maxPossible,
            awardPoints,
            perQuestion,
            message: allExact ? '全部答对' : ('答对部分题目，得分 ' + String(awardPoints)),
        };
    }
    readStepPoints(value) {
        const n = Number(value);
        if (!Number.isFinite(n) || n <= 0)
            return 0;
        return Math.min(999, Math.round(n));
    }
    readStepSkippable(value) {
        if (value === false || value === 0 || value === '0' || value === 'false')
            return false;
        return true;
    }
    parseStationReward(pack) {
        const raw = pack && pack.stationReward && typeof pack.stationReward === 'object' ? pack.stationReward : {};
        const enabled = raw.enabled === true;
        let maxCoupons = Number(raw.maxCoupons);
        if (!Number.isFinite(maxCoupons) || maxCoupons < 1)
            maxCoupons = 1;
        maxCoupons = Math.min(5, Math.round(maxCoupons));
        let expireDays = Number(raw.expireDays);
        if (!Number.isFinite(expireDays) || expireDays < 0)
            expireDays = 30;
        expireDays = Math.min(3650, Math.round(expireDays));
        const tiers = [];
        const src = Array.isArray(raw.tiers) ? raw.tiers : [];
        for (let i = 0; i < src.length && tiers.length < 6; i++) {
            const t = src[i];
            if (!t || typeof t !== 'object')
                continue;
            const productId = String(t.productId || '').trim();
            if (!productId)
                continue;
            let minPoints = Number(t.minPoints);
            if (!Number.isFinite(minPoints) || minPoints < 0)
                minPoints = 0;
            const title = String(t.title || '').trim() || (i === 0 ? '纪念券' : (i === 1 ? '精选券' : '臻选券'));
            const grade = String(t.grade || '').trim() || (minPoints >= 60 ? 'gold' : (minPoints >= 30 ? 'silver' : 'bronze'));
            tiers.push({ minPoints: Math.round(minPoints), productId, title, grade });
        }
        tiers.sort((a, b) => a.minPoints - b.minPoints);
        return { enabled, maxCoupons, expireDays, tiers };
    }
    async ensureUserCouponTable() {
        if (this._userCouponTableReady)
            return;
        await this.prisma.$executeRawUnsafe(`
            CREATE TABLE IF NOT EXISTS "UserCoupon" (
                id TEXT PRIMARY KEY,
                "userId" TEXT NOT NULL,
                title TEXT NOT NULL,
                subtitle TEXT,
                type TEXT NOT NULL DEFAULT 'gift',
                value TEXT DEFAULT '0',
                "minAmount" TEXT DEFAULT '0',
                status TEXT NOT NULL DEFAULT 'unused',
                "expireAt" TIMESTAMPTZ,
                "usedAt" TIMESTAMPTZ,
                scope TEXT,
                source TEXT,
                "productId" TEXT,
                "projectId" TEXT,
                "routePointId" TEXT,
                "bookingId" TEXT,
                grade TEXT,
                "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
        `);
        const cols = [
            ['productId', 'TEXT'],
            ['projectId', 'TEXT'],
            ['routePointId', 'TEXT'],
            ['bookingId', 'TEXT'],
            ['grade', 'TEXT'],
            ['source', 'TEXT'],
        ];
        for (let i = 0; i < cols.length; i++) {
            try {
                await this.prisma.$executeRawUnsafe('ALTER TABLE "UserCoupon" ADD COLUMN IF NOT EXISTS "' + cols[i][0] + '" ' + cols[i][1]);
            }
            catch (_e) {}
        }
        this._userCouponTableReady = true;
    }
    emptyStationProgress() {
        return { done: [], quiz: {}, games: {}, skipped: [], exhausted: [], pointsEarned: 0, reward: null };
    }
    mutateStationProgress(cur) {
        const next = Object.assign(this.emptyStationProgress(), cur || {});
        next.done = Array.isArray(next.done) ? next.done.map((x) => String(x)) : [];
        next.skipped = Array.isArray(next.skipped) ? next.skipped.map((x) => String(x)) : [];
        next.exhausted = Array.isArray(next.exhausted) ? next.exhausted.map((x) => String(x)) : [];
        next.quiz = (next.quiz && typeof next.quiz === 'object') ? next.quiz : {};
        next.games = (next.games && typeof next.games === 'object') ? next.games : {};
        next.pointsEarned = Number(next.pointsEarned) || 0;
        return next;
    }
    stationStepFinished(prog, stepId) {
        const id = String(stepId);
        return prog.done.indexOf(id) >= 0 || prog.skipped.indexOf(id) >= 0 || (Array.isArray(prog.exhausted) && prog.exhausted.indexOf(id) >= 0);
    }
    addStationPoints(cur, step) {
        const pts = this.readStepPoints(step && step.points);
        if (pts > 0)
            cur.pointsEarned = Number(cur.pointsEarned || 0) + pts;
        return cur;
    }
    async skipStationStepRecord(booking, point, step) {
        if (this.readStepSkippable(step.skippable) === false)
            throw new common_1.BadRequestException('本关不能跳过');
        const plan0 = this.normalizeTripPlan(booking.tripPlan);
        const allProg = Object.assign({}, plan0.stationProgress && typeof plan0.stationProgress === 'object' ? plan0.stationProgress : {});
        const cur = this.mutateStationProgress(allProg[point.id]);
        if (cur.done.indexOf(step.id) >= 0)
            return { skipped: false, completed: true, stepId: step.id, doneIds: cur.done, skippedIds: cur.skipped, pointsEarned: cur.pointsEarned, message: '本关已完成' };
        if (cur.skipped.indexOf(step.id) < 0)
            cur.skipped = cur.skipped.concat([step.id]);
        allProg[point.id] = cur;
        plan0.stationProgress = allProg;
        await this.prisma.studyBooking.update({ where: { id: booking.id }, data: { tripPlan: plan0 } });
        return { skipped: true, completed: true, stepId: step.id, doneIds: cur.done, skippedIds: cur.skipped, pointsEarned: cur.pointsEarned, message: '已跳过，本关没有积分' };
    }
    pickRewardTier(reward, points) {
        if (!reward || !reward.enabled || !reward.tiers || !reward.tiers.length)
            return null;
        let hit = null;
        for (let i = 0; i < reward.tiers.length; i++) {
            if (Number(points) >= Number(reward.tiers[i].minPoints))
                hit = reward.tiers[i];
        }
        return hit;
    }
    serializeCouponRow(row) {
        if (!row)
            return null;
        return {
            id: String(row.id),
            title: String(row.title || '研学奖品券'),
            subtitle: String(row.subtitle || ''),
            type: String(row.type || 'gift'),
            value: String(row.value || '0'),
            minAmount: String(row.minAmount || '0'),
            status: String(row.status || 'unused'),
            expireAt: row.expireAt || null,
            usedAt: row.usedAt || null,
            scope: String(row.scope || '文创商城'),
            source: String(row.source || 'study'),
            productId: String(row.productId || ''),
            projectId: String(row.projectId || ''),
            routePointId: String(row.routePointId || ''),
            bookingId: String(row.bookingId || ''),
            grade: String(row.grade || ''),
            createdAt: row.createdAt,
        };
    }
    async listUserCoupons(userId) {
        await this.ensureUserCouponTable();
        const rows = await this.prisma.$queryRawUnsafe(
            `SELECT * FROM "UserCoupon" WHERE "userId"=$1 ORDER BY "createdAt" DESC LIMIT 200`,
            String(userId)
        );
        const now = Date.now();
        const out = [];
        for (let i = 0; i < (rows || []).length; i++) {
            const row = rows[i];
            let status = String(row.status || 'unused');
            if (status === 'unused' && row.expireAt && new Date(row.expireAt).getTime() < now) {
                status = 'expired';
                try {
                    await this.prisma.$executeRawUnsafe(`UPDATE "UserCoupon" SET status='expired' WHERE id=$1 AND status='unused'`, row.id);
                }
                catch (_e) {}
            }
            out.push(this.serializeCouponRow(Object.assign({}, row, { status })));
        }
        return out;
    }
    async issueStationRewardCoupons(booking, point, userId) {
        const pack = (point.knowledgeItems && typeof point.knowledgeItems === 'object' && !Array.isArray(point.knowledgeItems)) ? point.knowledgeItems : {};
        const reward = this.parseStationReward(pack);
        const plan0 = this.normalizeTripPlan(booking.tripPlan);
        const allProg = Object.assign({}, plan0.stationProgress && typeof plan0.stationProgress === 'object' ? plan0.stationProgress : {});
        const cur = this.mutateStationProgress(allProg[point.id]);
        if (cur.reward && cur.reward.id)
            return cur.reward;
        if (!reward.enabled) {
            cur.reward = { skipped: true, reason: '本站未开启奖品卡券' };
            allProg[point.id] = cur;
            plan0.stationProgress = allProg;
            await this.prisma.studyBooking.update({ where: { id: booking.id }, data: { tripPlan: plan0 } });
            return cur.reward;
        }
        const tier = this.pickRewardTier(reward, cur.pointsEarned);
        if (!tier) {
            cur.reward = { skipped: true, reason: '积分不足，未达到发卡门槛', pointsEarned: cur.pointsEarned };
            allProg[point.id] = cur;
            plan0.stationProgress = allProg;
            await this.prisma.studyBooking.update({ where: { id: booking.id }, data: { tripPlan: plan0 } });
            return cur.reward;
        }
        const product = await this.prisma.product.findUnique({ where: { id: tier.productId } });
        if (!product) {
            cur.reward = { skipped: true, reason: '奖品商品已下架' };
            allProg[point.id] = cur;
            plan0.stationProgress = allProg;
            await this.prisma.studyBooking.update({ where: { id: booking.id }, data: { tripPlan: plan0 } });
            return cur.reward;
        }
        await this.ensureUserCouponTable();
        const qty = reward.maxCoupons;
        const expireAt = reward.expireDays > 0 ? this.shanghaiExpireAtAfterDays(reward.expireDays, new Date()) : null;
        const coupons = [];
        for (let i = 0; i < qty; i++) {
            const id = 'uc_' + Date.now().toString(36) + (0, crypto_1.randomUUID)().slice(0, 8) + i;
            const title = tier.title + ' · ' + product.name;
            const subtitle = '本站研学积分 ' + cur.pointsEarned + ' · 可免费兑换「' + product.name + '」';
            await this.prisma.$executeRawUnsafe(
                `INSERT INTO "UserCoupon" (id,"userId",title,subtitle,type,value,"minAmount",status,"expireAt",scope,source,"productId","projectId","routePointId","bookingId",grade,"createdAt")
                 VALUES ($1,$2,$3,$4,'gift',$5,'0','unused',$6,$7,'study',$8,$9,$10,$11,$12,NOW())`,
                id, booking.userId, title, subtitle, String(product.price || 0), expireAt, product.name, product.id, point.projectId, point.id, booking.id, tier.grade
            );
            coupons.push({ id, title, productId: product.id, productName: product.name, grade: tier.grade, expireAt });
        }
        cur.reward = {
            issued: true,
            grade: tier.grade,
            title: tier.title,
            productId: product.id,
            productName: product.name,
            pointsEarned: cur.pointsEarned,
            count: coupons.length,
            expireAt,
            coupons,
        };
        allProg[point.id] = cur;
        plan0.stationProgress = allProg;
        await this.prisma.studyBooking.update({ where: { id: booking.id }, data: { tripPlan: plan0 } });
        return cur.reward;
    }

    async getRoutePointCheckInCode(userId, projectId, routePointId) {
        await this.assertStudyProjectRoutePointAdmin(projectId, userId);
        const point = await this.prisma.studyRoutePoint.findFirst({ where: { id: routePointId, projectId } });
        if (!point)
            throw new common_1.NotFoundException('Route point not found');
        const nonce = this.readRoutePointGateNonce(point);
        const payload = this.createRoutePointGatePayload(projectId, point.id, nonce);
        const raw = JSON.stringify(payload);
        return {
            routePoint: this.serializeRoutePoint(point, Math.max(0, point.sortOrder - 1)),
            payload,
            raw,
            serial: String(nonce || payload.code).slice(-6).toUpperCase(),
        };
    }

    async getRoutePointKnowledgeTask(userId, projectId, routePointId) {
        await this.assertStudyProjectLiveRouteAccess(projectId, userId);
        /* live18-closed-knowledge */
        try {
            const proj = await this.prisma.studyProject.findUnique({ where: { id: projectId } });
            if (proj) {
                try {
                    const rows = await this.prisma.$queryRawUnsafe(`SELECT "dayOps" FROM "StudyProject" WHERE id=$1`, String(projectId));
                    if (rows && rows[0] && rows[0].dayOps) proj.dayOps = typeof rows[0].dayOps === 'object' ? rows[0].dayOps : JSON.parse(rows[0].dayOps || '{}');
                } catch (_e) {}
                this.assertSpotNotClosed(proj, routePointId);
            }
        } catch (e) { if (e instanceof common_1.BadRequestException) throw e; }

        const [point, booking] = await Promise.all([
            this.prisma.studyRoutePoint.findFirst({ where: { id: routePointId, projectId, enabled: true } }),
            this.prisma.studyBooking.findFirst({
                where: {
                    projectId,
                    userId,
                    userDeletedAt: null,
                    status: { in: [client_1.BookingStatus.BOOKED, client_1.BookingStatus.COMPLETED] },
                },
                orderBy: { createdAt: 'desc' },
            }),
        ]);
        if (!point)
            throw new common_1.NotFoundException('打卡点不存在或已停用');
        const completion = booking != null && this.isSeatBooking(booking)
            ? await this.prisma.studyKnowledgeTaskCompletion.findUnique({
                where: {
                    bookingId_routePointId: {
                        bookingId: booking.id,
                        routePointId: point.id,
                    },
                },
            })
            : null;
        return this.serializeRoutePointKnowledgeTask(point, completion);
    }

    async completeRoutePointKnowledgeTask(userId, projectId, routePointId, body) {
        /* live18-spot-guard */
        try {
            let proj = await this.prisma.studyProject.findUnique({ where: { id: String(projectId) } });
            if (proj) {
                try {
                    const rows = await this.prisma.$queryRawUnsafe(`SELECT "dayOps" FROM "StudyProject" WHERE id=$1`, String(projectId));
                    if (rows && rows[0] && rows[0].dayOps) proj.dayOps = typeof rows[0].dayOps === 'object' ? rows[0].dayOps : JSON.parse(String(rows[0].dayOps || '{}'));
                } catch (_e) {}
                this.assertSpotNotClosed(proj, routePointId);
            }
        } catch (e) { if (e instanceof common_1.BadRequestException) throw e; }

        const project = await this.getProjectLiveStageRecord(projectId);
        this.assertProjectStudyTasksActive(project);
        const [booking, point] = await Promise.all([
            this.getUserActiveSeatBooking(projectId, userId),
            this.prisma.studyRoutePoint.findFirst({
                where: {
                    id: routePointId,
                    projectId,
                    enabled: true,
                },
            }),
        ]);
        if (!point)
            throw new common_1.NotFoundException('打卡点不存在或已停用');
        this.assertRoutePointOpenForCurrentStage(project, point);
        this.assertKnowledgeTaskConfigured(point);
        if (booking.checkedInAt == null) {
            throw new common_1.BadRequestException('请先完成入口核销，再进行站点任务');
        }
        const questions = this.flattenKnowledgeItems(this.getKnowledgeItems(point));
        const answerIndexes = this.readKnowledgeAnswerIndexes(body, questions.length);
        const correct = questions.length > 0 && answerIndexes.length === questions.length && questions.every((question, index) => answerIndexes[index] === question.answerIndex);
        if (!correct) {
            return {
                ...this.serializeRoutePointKnowledgeTask(point, null),
                correct: false,
                completed: false,
                alreadyCompleted: false,
                message: '答案不正确，请重新观看讲解后再作答',
                rewards: this.emptyKnowledgeRewards(),
            };
        }
        const existed = await this.prisma.studyKnowledgeTaskCompletion.findUnique({
            where: {
                bookingId_routePointId: {
                    bookingId: booking.id,
                    routePointId: point.id,
                },
            },
            include: {
                prizeGrant: { include: { product: true, grantedBy: true } },
                pointRecord: true,
            },
        });
        if (existed) {
            return {
                ...this.serializeRoutePointKnowledgeTask(point, existed),
                correct: true,
                completed: true,
                alreadyCompleted: true,
                message: '该知识任务已完成',
                rewards: this.serializeKnowledgeCompletionRewards(existed),
            };
        }
        const completion = await this.prisma.$transaction(async (tx) => {
            const created = await tx.studyKnowledgeTaskCompletion.create({
                data: {
                    bookingId: booking.id,
                    userId,
                    projectId,
                    routePointId: point.id,
                    answerIndex: answerIndexes[0] ?? 0,
                    answerIndexes,
                },
            });
            await this.issueKnowledgeTaskRewardsTx(tx, booking, point, userId, created.id);
            return tx.studyKnowledgeTaskCompletion.findUniqueOrThrow({
                where: { id: created.id },
                include: {
                    prizeGrant: { include: { product: true, grantedBy: true } },
                    pointRecord: true,
                },
            });
        });
        let tourCompletion = null;
        try {
            tourCompletion = await this.maybeCompleteTourBooking(booking, project, userId);
        } catch (_e) {}
        return {
            ...this.serializeRoutePointKnowledgeTask(point, completion),
            correct: true,
            completed: true,
            alreadyCompleted: false,
            message: '知识任务已完成',
            rewards: this.serializeKnowledgeCompletionRewards(completion),
            tourCompletion,
        };
    }

    async getExploreSession(userId, projectId, query = {}) {
        const project = await this.prisma.studyProject.findUnique({
            where: { id: projectId },
            include: { routePoints: { where: { enabled: true }, orderBy: { sortOrder: 'asc' } } },
        });
        if (!project) throw new common_1.NotFoundException('Study project not found');
        // hydrate dayOps for live flags
        try {
            const rows = await this.prisma.$queryRawUnsafe(`SELECT "dayOps" FROM "StudyProject" WHERE id=$1`, String(projectId));
            if (rows && rows[0] && rows[0].dayOps != null) {
                const raw = rows[0].dayOps;
                project.dayOps = (typeof raw === 'object') ? raw : JSON.parse(String(raw || '{}'));
            } else {
                project.dayOps = project.dayOps || {};
            }
        } catch (_e) { project.dayOps = project.dayOps || {}; }
        const liveDayOps = this.readTodayDayOps(project);

        const preferBookingId = String((query && (query.bookingId || query.booking_id || query.id)) || '').trim();
        let booking = null;
        if (preferBookingId) {
            booking = await this.prisma.studyBooking.findFirst({
                where: {
                    id: preferBookingId,
                    projectId,
                    userId,
                    status: { in: [client_1.BookingStatus.BOOKED, client_1.BookingStatus.COMPLETED] },
                },
                include: { project: true, user: true },
            });
        }
        if (!booking) {
            booking = await this.prisma.studyBooking.findFirst({
                where: {
                    projectId,
                    userId,
                    status: { in: [client_1.BookingStatus.BOOKED, client_1.BookingStatus.COMPLETED] },
                },
                include: { project: true, user: true },
                orderBy: { createdAt: 'desc' },
            });
        }
        if (booking)
            booking = await this.reopenPrematurelyCompletedTour(booking);
        let dayWindow = { open: false, today: this.chinaDateKey(), dayKeys: [], reason: 'no_booking', message: '无有效订单' };
        if (booking) {
            dayWindow = this.evaluateBookingDayWindow(booking);
            if (dayWindow.reason === 'expired' && !this.isTourReallyFinished(booking)) {
                booking = await this.forceCompleteTourAsExpired(booking);
                dayWindow = this.evaluateBookingDayWindow(booking);
            }
        }

        const group = booking != null
            ? await this.getBookingGroupBookings(booking.bookingGroupId ?? booking.id)
            : [];
        const bookingView = booking != null
            ? this.serializeBooking(booking, group.length > 0 ? group : [booking], userId)
            : null;

        const lat = Number(query.lat ?? query.latitude ?? 0);
        const lng = Number(query.lng ?? query.longitude ?? 0);
        const hasLoc = Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) > 0.01;

        const catalog = this.getExploreZoneCatalog();
        const catById = new Map(catalog.map((c) => [c.id, c]));

        // checked-in + knowledge done sets first
        const checked = [];
        const knowledgeDoneIds = [];
        if (booking != null) {
            const [rows, krows] = await Promise.all([
                this.prisma.studyRoutePointCheckIn.findMany({ where: { bookingId: booking.id, projectId } }),
                this.prisma.studyKnowledgeTaskCompletion.findMany({ where: { bookingId: booking.id, projectId } }),
            ]);
            for (let i = 0; i < rows.length; i++) checked.push(rows[i].routePointId);
            for (let i = 0; i < krows.length; i++) knowledgeDoneIds.push(krows[i].routePointId);
        }
        const checkedSet = new Set(checked);
        const knowledgeDoneSet = new Set(knowledgeDoneIds);

        // 带奖品名称
        const routePoints = await this.prisma.studyRoutePoint.findMany({
            where: { projectId, enabled: true },
            include: { autoPrizeProduct: true, knowledgePrizeProduct: true },
            orderBy: { sortOrder: 'asc' },
        });
        const points = [];
        const resourceMap = await this.loadResourceMap(projectId);
        for (let i = 0; i < routePoints.length; i++) {
            const p = routePoints[i];
            const tag = String(p.description ?? '').match(/\[zoneId=([^\]]+)\]/);
            const zoneId = tag ? tag[1] : p.id;
            const c = catById.get(zoneId) || null;
            const payload = this.buildExplorePointPayload(p, c, hasLoc, lat, lng, checkedSet, knowledgeDoneSet, resourceMap);
            if (booking != null) {
                const prog = this.readStationProgress(booking, p.id);
                payload.stationDoneIds = prog.done;
                payload.stationSkippedIds = prog.skipped;
                payload.stationPoints = prog.pointsEarned;
                payload.stationReward = prog.reward;
                payload.stationGames = prog.games;
            }
            try {
                payload.closedToday = (liveDayOps.closedSpots || []).indexOf(String(p.id)) >= 0;
                payload.tourPaused = !!liveDayOps.tourPaused;
                if (liveDayOps.spotStepOverrides && liveDayOps.spotStepOverrides[p.id]) {
                    payload.stepOverride = liveDayOps.spotStepOverrides[p.id];
                }
            } catch (_e) { payload.closedToday = false; }
            points.push(payload);
        }

        // campus geofence: center of points + radius
        let centerLat = 39.91;
        let centerLng = 116.40;
        if (points.length > 0) {
            let sLat = 0, sLng = 0;
            for (let i = 0; i < points.length; i++) { sLat += points[i].latitude; sLng += points[i].longitude; }
            centerLat = sLat / points.length;
            centerLng = sLng / points.length;
        }
        const campusRadiusM = 600;
        let onCampus = false;
        let campusDistanceM = null;
        if (hasLoc) {
            campusDistanceM = Math.round(this.getDistanceMeters(lat, lng, centerLat, centerLng));
            onCampus = campusDistanceM <= campusRadiusM;
        }

        // nearest in-range point for auto popup
        let nearbyPoint = null;
        if (hasLoc) {
            let best = null;
            for (let i = 0; i < points.length; i++) {
                const pt = points[i];
                if (pt.distanceM == null) continue;
                if (pt.distanceM <= pt.checkRadius) {
                    if (best == null || pt.distanceM < best.distanceM) best = pt;
                }
            }
            nearbyPoint = best;
        }

        // 探索列表只含研学点，不含接待/离场
        const studyPoints = this.filterStudyExplorePoints(points);
        const trip = bookingView != null ? bookingView.tripPlan : { dayKeys: [], days: [] };
        const mySpotIds = bookingView != null ? bookingView.routePointIds : [];
        const myPoints = [];
        for (let i = 0; i < mySpotIds.length; i++) {
            const hit = studyPoints.find((p) => p.id === mySpotIds[i] || p.zoneId === mySpotIds[i]);
            if (hit) myPoints.push(hit);
        }
        // 有订单且行程点非空：用行程点；行程点为空时回退全园区研学点（否则导览地图无标记）
        const routePointsForUser = bookingView != null
            ? (myPoints.length > 0 ? myPoints : studyPoints)
            : studyPoints;
        const studyIdSet = new Set(routePointsForUser.map((p) => p.id));
        const checkedStudy = checked.filter((id) => studyIdSet.has(id));
        const totalStudy = routePointsForUser.length;
        let clearedStudy = 0;
        const clearedIds = [];
        for (let i = 0; i < routePointsForUser.length; i++) {
            const pt = routePointsForUser[i];
            const needKnowledge = pt.knowledgeEnabled === true && (pt.knowledgeQuestions || []).length > 0;
            const cleared = pt.checkedIn === true && (!needKnowledge || pt.knowledgeDone === true);
            if (cleared) { clearedStudy++; clearedIds.push(pt.id); }
        }
        const doneStudy = clearedStudy;
        const allStudyDone = totalStudy > 0 && doneStudy >= totalStudy;

        let certificate = null;
        let exitGuide = null;
        if (allStudyDone && booking != null) {
            certificate = await this.issueCertificateForBookingIfNeeded(booking, project);
            exitGuide = {
                id: '',
                title: '研学完成',
                latitude: null,
                longitude: null,
                distanceM: null,
                message: '所选研学点已全部完成，证书已生成',
            };
        }

        // nearby 只在用户路线研学点里找
        let nearbyStudy = null;
        if (hasLoc) {
            let best = null;
            for (let i = 0; i < routePointsForUser.length; i++) {
                const pt = routePointsForUser[i];
                if (pt.distanceM == null) continue;
                if (checkedStudy.indexOf(pt.id) >= 0) continue;
                if (pt.distanceM <= pt.checkRadius) {
                    if (best == null || pt.distanceM < best.distanceM) best = pt;
                }
            }
            nearbyStudy = best;
        }

        // 手动场景 / 自动场景
        const manualPointId = String(query.activePointId ?? query.sceneId ?? query.pointId ?? '').trim();
        let activeScene = null;
        if (manualPointId) {
            activeScene = routePointsForUser.find((p) => p.id === manualPointId || p.zoneId === manualPointId) || null;
        }
        if (activeScene == null && nearbyStudy != null) activeScene = nearbyStudy;
        if (activeScene == null && routePointsForUser.length > 0) {
            // 优先未完成点
            activeScene = routePointsForUser.find((p) => !p.checkedIn) || routePointsForUser[0];
        }
        const selectableScenes = routePointsForUser.map((p) => ({
            id: p.id,
            zoneId: p.zoneId,
            title: p.title,
            zoneLabel: p.zoneLabel,
            zoneKey: p.zoneKey,
            checkedIn: p.checkedIn === true,
            knowledgeDone: p.knowledgeDone === true,
            inRange: p.inRange === true,
            distanceM: p.distanceM,
            theme: p.theme,
            coverIcon: p.coverIcon,
            funTitle: p.funTitle,
        }));

        const entranceCheckedIn = booking != null && booking.checkedInAt != null;
        // 流程：核销门禁 → 导览探索 → 结算/提前结束；支持临时退出(paused)
        const tourMeta = (booking != null && booking.tripPlan && typeof booking.tripPlan === 'object')
            ? (booking.tripPlan.tour || {})
            : {};
        const tourStatus = tourMeta && tourMeta.status != null ? String(tourMeta.status) : '';
        const earlyExit = tourMeta.earlyExit === true || tourStatus === 'early_exit';
        const paused = tourStatus === 'paused';
        let mode = 'en_route';
        let modeText = '前往中';
        if (!entranceCheckedIn) {
            mode = 'need_entrance';
            modeText = '请先入口核销';
        } else if (earlyExit) {
            mode = 'early_exit';
            modeText = '已提前结束';
        } else if (allStudyDone) {
            mode = 'completed';
            modeText = '研学完成';
        } else if (paused) {
            mode = 'paused';
            modeText = '已临时退出';
        } else {
            mode = 'exploring';
            modeText = '研学导览中';
        }

        const liveStage = this.resolveProjectLiveStage(project);
        
        if (!earlyExit && !allStudyDone && dayWindow && dayWindow.open === false) {
            mode = dayWindow.reason === 'expired' ? 'day_expired' : 'day_closed';
            modeText = dayWindow.message || '非预约日';
        }

        const canExplore = entranceCheckedIn && liveStage !== STUDY_LIVE_STAGES.ENDED && bookingView != null && !allStudyDone && !earlyExit && !paused && dayWindow.open === true;
        const canResume = entranceCheckedIn && !earlyExit && !allStudyDone && (paused || tourStatus === 'entered' || tourStatus === 'touring' || tourStatus === '');
        const entranceOk = entranceCheckedIn;
        return {
            projectId,
            project: await this.serializeProjectWithContacts(project),
            booking: bookingView,
            liveDayOps,
            mode,
            modeText,
            dayWindow,
            onCampus,
            entranceCheckedIn,
            entranceOk,
            canResume,
            tourStatus,
            campus: {
                latitude: centerLat,
                longitude: centerLng,
                radiusM: campusRadiusM,
                distanceM: campusDistanceM,
            },
            userLocation: hasLoc ? { latitude: lat, longitude: lng } : null,
            tripPlan: trip,
            rental: bookingView != null ? bookingView.rental : null,
            pickup: bookingView != null ? bookingView.pickup : null,
            points: studyPoints,
            myPoints: routePointsForUser,
            checkedInRoutePointIds: checkedStudy,
            nearbyPoint: canExplore ? nearbyStudy : null,
            activeScene: canExplore || entranceCheckedIn ? activeScene : null,
            selectableScenes: entranceCheckedIn ? selectableScenes : [],
            sceneMode: manualPointId ? 'manual' : (nearbyStudy != null ? 'auto' : 'idle'),
            progress: {
                total: totalStudy,
                completed: doneStudy,
                checkedIn: checkedStudy.length,
                allDone: allStudyDone,
                knowledgeDone: routePointsForUser.filter((p) => p.knowledgeDone).length,
                puzzleTotal: totalStudy,
                puzzleCollected: doneStudy,
                clearedRoutePointIds: clearedIds,
            },
            puzzle: this.decorateExplorePuzzle({
                total: totalStudy,
                collected: doneStudy,
                ratio: totalStudy > 0 ? doneStudy / totalStudy : 0,
                pieces: routePointsForUser.map((p, idx) => ({
                    index: idx,
                    routePointId: p.id,
                    title: p.title,
                    collected: clearedIds.indexOf(p.id) >= 0,
                })),
            }, routePointsForUser, clearedIds, await this.loadPuzzleSourceMeta(projectId)),
            tour: tourMeta,
            recommendedNext: (() => {
                const incomplete = routePointsForUser.filter((p) => clearedIds.indexOf(p.id) < 0);
                if (incomplete.length === 0) return null;
                let best = incomplete[0];
                // 有定位时推荐最近未完成点；否则任意未完成（不按站序强制）
                for (let i = 0; i < incomplete.length; i++) {
                    const pt = incomplete[i];
                    if (pt.distanceM == null) continue;
                    if (best.distanceM == null || pt.distanceM < best.distanceM) best = pt;
                }
                return { id: best.id, title: best.title, zoneId: best.zoneId, distanceM: best.distanceM };
            })(),
            certificate: certificate == null ? null : {
                id: certificate.id,
                certificateNo: certificate.certificateNo,
                holderName: certificate.holderName,
                projectTitle: certificate.projectTitle,
                summary: certificate.summary,
                bodyHtml: certificate.bodyHtml || '',
                bgUrl: certificate.bgUrl || '',
                sealUrl: certificate.sealUrl || '',
                issuedAt: certificate.issuedAt,
            },
            exitGuide,
            liveStage,
            liveStageText: this.liveStageText(liveStage),
            freeExplore: canExplore || (entranceCheckedIn && allStudyDone),
            canCheckIn: canExplore,
            gates: {
                needAdminStart: false,
                needAdminCurrentPoint: false,
                needEntranceCheckIn: !entranceCheckedIn,
                needExitGuide: allStudyDone,
                canResume: canResume,
                paused: paused,
            },
            tourPoints: (() => {
                if (booking == null) return { totalPoints: 0, spentPoints: 0, availablePoints: 0 };
                try {
                    const s = this.sumBookingTourPoints(booking);
                    return { totalPoints: s.totalPoints, spentPoints: s.spentPoints, availablePoints: s.availablePoints };
                } catch (_e) { return { totalPoints: 0, spentPoints: 0, availablePoints: 0 }; }
            })(),
            tourMall: await (async () => {
                if (booking == null) return null;
                try {
                    const cfg = await this.loadTourMallConfig(projectId);
                    const graduated = allStudyDone || String(booking.status) === 'COMPLETED' || !!(tourMeta && (tourMeta.graduated || tourMeta.mallRedeemUnlocked));
                    return await this.buildTourMallGatePayload(booking, project, cfg, graduated);
                } catch (_e) { return null; }
            })(),
        };
    }

    async issueRoutePointAutoRewardsTx(tx, booking, point, operatorUserId) {
        if (point.autoGrantPrize === true && point.autoPrizeProductId != null && String(point.autoPrizeProductId).length > 0) {
            await this.issueRoutePointAutoPrizeTx(tx, booking, point, operatorUserId);
        }
        if (point.autoGrantPoints === true && point.autoPointsAmount > 0) {
            await this.issueRoutePointAutoPointsTx(tx, booking, point, operatorUserId);
        }
    }

    async issueRoutePointAutoPrizeTx(tx, booking, point, operatorUserId) {
        const rewardType = ROUTE_POINT_REWARD_TYPES.PRIZE;
        const quantity = point.autoPrizeQuantity >= 1 && point.autoPrizeQuantity <= 99 ? point.autoPrizeQuantity : 1;
        const product = await tx.product.findUnique({ where: { id: point.autoPrizeProductId } });
        if (!product || product.canBePrize !== true)
            return;
        const claim = await tx.studyRoutePointRewardIssue.createMany({
            data: [{
                    bookingId: booking.id,
                    userId: booking.userId,
                    projectId: point.projectId,
                    routePointId: point.id,
                    rewardType,
                    productId: point.autoPrizeProductId,
                    quantity,
                    operatorUserId,
                }],
            skipDuplicates: true,
        });
        if (claim.count !== 1)
            return;
        const createdGrant = await tx.studyPrizeGrant.create({
            data: {
                projectId: point.projectId,
                bookingId: booking.id,
                userId: booking.userId,
                productId: product.id,
                grantedById: operatorUserId,
                quantity,
                note: '打卡点自动发放：' + point.title,
            },
            include: {
                product: true,
                grantedBy: true,
            },
        });
        await tx.order.create({
            data: {
                orderNo: this.generatePrizeOrderNo(),
                userId: booking.userId,
                status: client_1.OrderStatus.UNPAID,
                amount: 0,
                goodsAmount: 0,
                points: 0,
                pointsUsed: 0,
                pointsDiscount: 0,
                remark: this.createPrizeOrderRemark(createdGrant),
                adminRemark: '研学打卡点自动奖品记录：' + createdGrant.id,
                items: {
                    create: [{
                            productId: product.id,
                            quantity,
                            price: 0,
                        }],
                },
            },
        });
        await tx.studyRoutePointRewardIssue.updateMany({
            where: {
                bookingId: booking.id,
                routePointId: point.id,
                rewardType,
            },
            data: {
                prizeGrantId: createdGrant.id,
                quantity,
            },
        });
    }

    async issueKnowledgeTaskRewardsTx(tx, booking, point, operatorUserId, completionId) {
        let prizeGrantId = null;
        let pointRecordId = null;
        if (point.knowledgeGrantPrize === true && point.knowledgePrizeProductId != null && String(point.knowledgePrizeProductId).length > 0) {
            prizeGrantId = await this.issueKnowledgeTaskPrizeTx(tx, booking, point, operatorUserId);
        }
        if (point.knowledgeGrantPoints === true && point.knowledgePointsAmount > 0) {
            pointRecordId = await this.issueKnowledgeTaskPointsTx(tx, booking, point);
        }
        if (prizeGrantId != null || pointRecordId != null) {
            await tx.studyKnowledgeTaskCompletion.update({
                where: { id: completionId },
                data: {
                    prizeGrantId,
                    pointRecordId,
                },
            });
        }
    }

    async issueKnowledgeTaskPrizeTx(tx, booking, point, operatorUserId) {
        const quantity = point.knowledgePrizeQuantity >= 1 && point.knowledgePrizeQuantity <= 99 ? point.knowledgePrizeQuantity : 1;
        const product = await tx.product.findUnique({ where: { id: point.knowledgePrizeProductId } });
        if (!product || product.canBePrize !== true)
            return null;
        const createdGrant = await tx.studyPrizeGrant.create({
            data: {
                projectId: point.projectId,
                bookingId: booking.id,
                userId: booking.userId,
                productId: product.id,
                grantedById: operatorUserId,
                quantity,
                note: '知识小助手答题奖励：' + point.title,
            },
            include: {
                product: true,
                grantedBy: true,
            },
        });
        await tx.order.create({
            data: {
                orderNo: this.generatePrizeOrderNo(),
                userId: booking.userId,
                status: client_1.OrderStatus.UNPAID,
                amount: 0,
                goodsAmount: 0,
                points: 0,
                pointsUsed: 0,
                pointsDiscount: 0,
                remark: this.createPrizeOrderRemark(createdGrant),
                adminRemark: '研学知识小助手奖品记录：' + createdGrant.id,
                items: {
                    create: [{
                            productId: product.id,
                            quantity,
                            price: 0,
                        }],
                },
            },
        });
        return createdGrant.id;
    }

    async issueKnowledgeTaskPointsTx(tx, booking, point) {
        const amount = this.readRoutePointAutoPointsAmount(point.knowledgePointsAmount);
        if (amount <= 0)
            return null;
        await tx.user.update({
            where: { id: booking.userId },
            data: { points: { increment: amount } },
        });
        const record = await tx.pointRecord.create({
            data: {
                userId: booking.userId,
                sourceType: STUDY_KNOWLEDGE_TASK_SOURCE_TYPE,
                sourceId: this.createKnowledgeTaskSourceId(booking.id, point.id),
                title: '知识小助手积分：' + point.title,
                amount,
            },
        });
        return record.id;
    }

    async issueRoutePointAutoPointsTx(tx, booking, point, operatorUserId) {
        const rewardType = ROUTE_POINT_REWARD_TYPES.POINTS;
        const amount = this.readRoutePointAutoPointsAmount(point.autoPointsAmount);
        if (amount <= 0)
            return;
        const sourceId = this.createRoutePointRewardSourceId(booking.id, point.id, rewardType);
        const claim = await tx.studyRoutePointRewardIssue.createMany({
            data: [{
                    bookingId: booking.id,
                    userId: booking.userId,
                    projectId: point.projectId,
                    routePointId: point.id,
                    rewardType,
                    amount,
                    operatorUserId,
                }],
            skipDuplicates: true,
        });
        if (claim.count !== 1)
            return;
        await tx.user.update({
            where: { id: booking.userId },
            data: { points: { increment: amount } },
        });
        const record = await tx.pointRecord.create({
            data: {
                userId: booking.userId,
                sourceType: ROUTE_POINT_REWARD_SOURCE_TYPE,
                sourceId,
                title: '打卡点自动积分：' + point.title,
                amount,
            },
        });
        await tx.studyRoutePointRewardIssue.updateMany({
            where: {
                bookingId: booking.id,
                routePointId: point.id,
                rewardType,
            },
            data: {
                pointRecordId: record.id,
                amount,
            },
        });
    }

    async assertStudyProjectLiveRouteAccess(projectId, userId) {
        const [project, projectAdmin, projectOrganizer, booking] = await Promise.all([
            this.prisma.studyProject.findUnique({ where: { id: projectId }, select: { id: true } }),
            this.prisma.studyProjectAdmin.findUnique({
                where: { projectId_userId: { projectId, userId } },
            }),
            this.prisma.studyProjectOrganizer.findUnique({
                where: { projectId_userId: { projectId, userId } },
            }),
            this.prisma.studyBooking.findFirst({
                where: {
                    projectId,
                    userId,
                    userDeletedAt: null,
                    status: { in: [client_1.BookingStatus.BOOKED, client_1.BookingStatus.COMPLETED] },
                },
                select: { id: true },
            }),
        ]);
        if (!project)
            throw new common_1.NotFoundException('Study project not found');
        if (projectAdmin != null || projectOrganizer != null || booking != null)
            return;
        throw new common_1.BadRequestException('请先预约或使用项目管理员身份进入实时导航');
    }

    async assertStudyProjectCheckInOperator(projectId, userId) {
        const projectAdmin = await this.prisma.studyProjectAdmin.findUnique({
            where: { projectId_userId: { projectId, userId } },
        });
        if (!projectAdmin) {
            throw new common_1.BadRequestException('仅项目管理员可为成员签到');
        }
    }

    async assertStudyProjectRoutePointAdmin(projectId, userId) {
        const projectAdmin = await this.prisma.studyProjectAdmin.findUnique({
            where: { projectId_userId: { projectId, userId } },
        });
        if (!projectAdmin) {
            throw new common_1.BadRequestException('仅项目管理员可管理打卡点设置');
        }
    }

    async issueCertificateForBookingIfNeeded(booking, project) {
        if (booking == null || project == null) return null;
        const existed = await this.prisma.studyCertificate.findUnique({ where: { bookingId: booking.id } });
        if (existed) return existed;
        const now = new Date();
        const holderName = this.resolveCertificateHolderName(booking);
        const certificateNo = this.buildStudyCertificateNo(project.id, booking.id);
        const summary = holderName + ' 已完成「' + project.title + '」所选研学点位打卡，特发此证。';
        const issuedAtLabel = (() => {
            try {
                return new Intl.DateTimeFormat('zh-CN', { timeZone: 'Asia/Shanghai', year: 'numeric', month: 'long', day: 'numeric' }).format(now);
            } catch (_e) {
                return now.toISOString().slice(0, 10);
            }
        })();
        let tpl = null;
        try { tpl = await this.loadActiveCertTemplate(project.id); } catch (_e) { tpl = null; }
        const bodyHtml = this.renderCertTemplateHtml(tpl, {
            holderName,
            projectTitle: project.title,
            certificateNo,
            issuedAt: issuedAtLabel,
            summary,
        });
        const bgUrl = tpl && tpl.bgUrl ? String(tpl.bgUrl) : '';
        const sealUrl = tpl && tpl.sealUrl ? String(tpl.sealUrl) : '';
        const templateId = tpl && tpl.id ? String(tpl.id) : '';
        const titleFromTpl = tpl && tpl.title ? String(tpl.title) : '';
        try {
            const created = await this.prisma.studyCertificate.create({
                data: {
                    certificateNo,
                    projectId: project.id,
                    bookingId: booking.id,
                    userId: booking.userId,
                    holderName,
                    projectTitle: titleFromTpl ? (project.title + ' · ' + titleFromTpl) : project.title,
                    summary,
                    issuedAt: now,
                },
            });
            try {
                await this.ensureStudyOverhaulSchema();
                await this.prisma.$executeRawUnsafe(
                    `UPDATE "StudyCertificate" SET "templateId"=$1, "bodyHtml"=$2, "bgUrl"=$3, "sealUrl"=$4 WHERE id=$5`,
                    templateId || null, bodyHtml, bgUrl || null, sealUrl || null, created.id
                );
            } catch (_e2) {}
            return Object.assign({}, created, { templateId, bodyHtml, bgUrl, sealUrl });
        } catch (_e) {
            return await this.prisma.studyCertificate.findUnique({ where: { bookingId: booking.id } });
        }
    }

    getExploreZoneCatalog() {
        // 已取消自动演示站点目录；站点仅来自项目配置的 StudyRoutePoint
        return [];
    }

    getExploreSceneTheme(zoneKey, catalogItem) {
        if (catalogItem != null && catalogItem.themePrimary) {
            return {
                primary: catalogItem.themePrimary,
                secondary: catalogItem.themeSecondary,
                accent: catalogItem.themeAccent,
                surface: catalogItem.themeSurface,
                text: catalogItem.themeText,
                coverIcon: catalogItem.coverIcon || '/static/icon-puzzle.svg',
                giftHint: catalogItem.giftHint || '',
            };
        }
        if (zoneKey === 'family') return { primary: '#16A34A', secondary: '#4ADE80', accent: '#F0FDF4', surface: '#DCFCE7', text: '#14532D', coverIcon: '/static/icon-cow.svg', giftHint: '' };
        if (zoneKey === 'college') return { primary: '#1D4ED8', secondary: '#60A5FA', accent: '#EFF6FF', surface: '#DBEAFE', text: '#1E3A8A', coverIcon: '/static/icon-cap.svg', giftHint: '' };
        if (zoneKey === 'business') return { primary: '#1C384A', secondary: '#3F6782', accent: '#F1F5F9', surface: '#E2E8F0', text: '#0F172A', coverIcon: '/static/icon-building.svg', giftHint: '' };
        return { primary: '#1C384A', secondary: '#3F6782', accent: '#F8FAFC', surface: '#E2E8F0', text: '#0F172A', coverIcon: '/static/icon-puzzle.svg', giftHint: '' };
    }

    buildExplorePointPayload(p, catalogItem, hasLoc, lat, lng, checkedSet, knowledgeDoneSet, resourceMap) {
        const tag = String(p.description ?? '').match(/\[zoneId=([^\]]+)\]/);
        const zoneId = tag ? tag[1] : p.id;
        const c = catalogItem || null;
        const rawPack = p && p.knowledgeItems;
        let pack = {};
        if (rawPack && typeof rawPack === 'object' && !Array.isArray(rawPack))
            pack = rawPack;
        else if (Array.isArray(rawPack) && rawPack.length === 1 && rawPack[0] && typeof rawPack[0] === 'object' && !Array.isArray(rawPack[0]))
            pack = rawPack[0];
        const zoneKey = c ? c.zoneKey : 'all';
        const theme = this.getExploreSceneTheme(zoneKey, c);
        let distance = null;
        let inRange = false;
        if (hasLoc) {
            distance = Math.round(this.getDistanceMeters(lat, lng, Number(p.latitude), Number(p.longitude)));
            inRange = distance <= (p.checkRadius || 80);
        }
        // 知识题目（不对用户暴露答案）
        let questions = [];
        try {
            const items = this.getKnowledgeItems(p);
            const flat = this.flattenKnowledgeItems(items);
            questions = flat.map((q) => ({
                question: q.question || '',
                options: Array.isArray(q.options) ? q.options : [],
            }));
        } catch (_e) {
            questions = [];
        }
        const knowledgeEnabled = p.knowledgeEnabled === true && questions.length > 0;
        const knowledgeDone = knowledgeDoneSet != null && knowledgeDoneSet.has(p.id);
        const checkedIn = checkedSet != null && checkedSet.has(p.id);
        const funTitle = c ? c.funTitle : (p.knowledgeVideoTitle || '趣味打卡');
        const funBodyMatch = String(p.description || '').match(/趣味：([^—\n]+)—?\s*(.*)$/);
        const funBody = c ? c.funBody : (funBodyMatch ? (funBodyMatch[2] || funBodyMatch[1] || '到达本站完成趣味互动') : '到达本站完成趣味互动');
        return {
            id: p.id,
            zoneId,
            title: p.title,
            desc: c ? c.desc : String(p.description || '').replace(/\[zoneId=[^\]]+\]\s*/, '').replace(/｜趣味：.*/, ''),
            zoneKey,
            zoneLabel: c ? c.zoneLabel : '研学',
            durationMin: c ? c.durationMin : 40,
            latitude: Number(p.latitude),
            longitude: Number(p.longitude),
            checkRadius: p.checkRadius || 80,
            sortOrder: p.sortOrder,
            funTitle,
            funBody,
            distanceM: distance,
            inRange,
            checkedIn,
            // 场景主题
            theme,
            coverIcon: theme.coverIcon,
            // 任务状态
            tasks: {
                checkIn: { required: true, done: checkedIn, title: '到站打卡', rewardPoints: 0 },
                knowledge: {
                    required: knowledgeEnabled,
                    done: knowledgeDone,
                    enabled: knowledgeEnabled,
                    title: funTitle + '问答',
                    questionCount: questions.length,
                },
                fun: { required: true, done: checkedIn, title: funTitle, body: funBody },
            },
            // 奖励预览
            rewards: {
                checkInPoints: 0,
                checkInPrize: p.autoGrantPrize === true,
                checkInPrizeProductId: p.autoPrizeProductId || '',
                checkInPrizeName: p.autoPrizeProduct?.name || '',
                knowledgePoints: 0,
                knowledgePrize: p.knowledgeGrantPrize === true,
                knowledgePrizeProductId: p.knowledgePrizeProductId || '',
                knowledgePrizeName: p.knowledgePrizeProduct?.name || '',
                giftHint: theme.giftHint || '',
            },
            knowledgeEnabled,
            knowledgeDone,
            knowledgeQuestions: questions,
            knowledgeVideoTitle: p.knowledgeVideoTitle || pack.knowledgeVideoTitle || (funTitle + '讲解'),
            knowledgeVideoUrl: p.knowledgeVideoUrl || pack.knowledgeVideoUrl || '',
            stationSteps: this.serializeStationStepsPublic(this.applyResourceMapToSteps(this.normalizeStationSteps(pack.stationSteps, p, pack), resourceMap)),
            stationDoneIds: [],
            stationSkippedIds: [],
            stationPoints: 0,
            stationReward: null,
            stationRewardConfig: this.parseStationReward(pack),
            stationGames: {},
            offlineTaskEnabled: pack.offlineTaskEnabled !== false,
            offlineTaskTitle: String(pack.offlineTaskTitle || '现场趣味任务').trim() || '现场趣味任务',
            offlineTaskBody: String(pack.offlineTaskBody || '按现场工作人员指引完成互动（观察、动手、合影或小游戏）。完成后请扫描本站研学码（点位码）确认本项任务完成。').trim(),
        };
    }


    /**
     * 自由探索会话：我的行程 + 园区点位 + 打卡进度 + 租车 + 是否在园区
     */

    projectImageDir() {
        return (0, path_1.join)(process.cwd(), 'uploads', 'study-projects');
    }
    serializeNotice(notice) {
        const publishedAt = notice.publishedAt instanceof Date ? notice.publishedAt : new Date(notice.publishedAt);
        const time = publishedAt.toISOString().slice(0, 10);
        const projectId = notice.projectId ?? '';
        const enterpriseId = notice.enterpriseId ?? '';
        return {
            id: notice.id,
            title: notice.title,
            content: notice.content,
            time,
            timestamp: Math.floor(publishedAt.getTime() / 1000),
            type: notice.type,
            publisher: notice.publisher ?? '蒙企链探运营中心',
            publisherUnitType: notice.publisherUnitType || (projectId ? 'project' : (enterpriseId ? 'enterprise' : '')),
            publisherUnitId: notice.publisherUnitId || projectId || enterpriseId || '',
            projectId: projectId || '',
            enterpriseId: enterpriseId || '',
            projectTitle: notice.project?.title ?? '',
            scope: projectId ? 'project' : 'enterprise',
            kind: (String(notice.kind || '').trim() === 'dynamics' ? 'dynamics' : 'news'),
        };
    }
    serializeFloatingNotice(notice, fallbackProject) {
        const project = notice.project ?? fallbackProject;
        const actionType = notice.actionType || 'project';
        return {
            id: notice.id,
            projectId: notice.projectId ?? '',
            fallbackProjectId: fallbackProject?.id ?? '',
            title: notice.title,
            subtitle: notice.subtitle,
            showSubtitle: notice.showSubtitle ?? true,
            content: notice.content ?? '',
            imageUrl: notice.imageUrl ?? '',
            actionText: notice.actionText,
            actionType,
            actionTarget: notice.actionTarget ?? (actionType === 'project' ? notice.projectId ?? fallbackProject?.id ?? '' : ''),
            gradientStart: notice.gradientStart ?? project?.gradientStart ?? '#1C384A',
            gradientEnd: notice.gradientEnd ?? project?.gradientEnd ?? '#3F6782',
            titleFontSize: notice.titleFontSize ?? 22,
            titleColor: notice.titleColor ?? '#FFFFFF',
            contentFontSize: notice.contentFontSize ?? 13,
            contentColor: notice.contentColor ?? 'rgba(255, 255, 255, 0.92)',
            sortOrder: notice.sortOrder,
            updatedAt: notice.updatedAt,
            projectTitle: project?.title ?? '',
        };
    }
    serializeRoutePoint(point, index) {
        const knowledgeItems = this.getKnowledgeItems(point);
        const questions = this.flattenKnowledgeItems(knowledgeItems);
        const firstQuestion = questions.length > 0 ? questions[0] : null;
        const firstItem = knowledgeItems.length > 0 ? knowledgeItems[0] : null;
        return {
            id: index + 1,
            routePointId: point.id,
            title: point.title,
            desc: point.description,
            latitude: Number(point.latitude),
            longitude: Number(point.longitude),
            checkRadius: point.checkRadius,
            checkInMode: this.mapRoutePointCheckInMode(point.checkInMode),
            sortOrder: point.sortOrder,
            autoGrantPrize: point.autoGrantPrize ?? false,
            autoPrizeProductId: point.autoPrizeProductId ?? '',
            autoPrizeQuantity: point.autoPrizeQuantity ?? 1,
            knowledgeEnabled: point.knowledgeEnabled ?? false,
            knowledgeVideoTitle: firstItem?.videoTitle ?? point.knowledgeVideoTitle ?? '',
            knowledgeVideoUrl: firstItem?.videoUrl ?? point.knowledgeVideoUrl ?? '',
            knowledgeQuestion: firstQuestion?.question ?? '',
            knowledgeOptions: firstQuestion?.options ?? [],
            knowledgeQuestions: this.serializeKnowledgeQuestionsPublic(questions),
            knowledgeItems: this.serializeKnowledgeItemsPublic(knowledgeItems),
            knowledgeGrantPrize: point.knowledgeGrantPrize ?? false,
            knowledgePrizeProductId: point.knowledgePrizeProductId ?? '',
            knowledgePrizeQuantity: point.knowledgePrizeQuantity ?? 1,
        };
    }
    serializeRoutePointAdminSettings(point, index) {
        const knowledgeItems = this.getKnowledgeItems(point);
        const questions = this.flattenKnowledgeItems(knowledgeItems);
        const firstQuestion = questions.length > 0 ? questions[0] : null;
        return {
            ...this.serializeRoutePoint(point, index),
            knowledgeQuestions: this.serializeKnowledgeQuestionsAdmin(questions),
            knowledgeItems: this.serializeKnowledgeItemsAdmin(knowledgeItems),
            knowledgeAnswerIndex: firstQuestion?.answerIndex ?? -1,
        };
    }
    serializeRoutePointKnowledgeTask(point, completion) {
        const enabled = this.isKnowledgeTaskConfigured(point);
        const knowledgeItems = enabled ? this.getKnowledgeItems(point) : [];
        const questions = this.flattenKnowledgeItems(knowledgeItems);
        const firstQuestion = questions.length > 0 ? questions[0] : null;
        const firstItem = knowledgeItems.length > 0 ? knowledgeItems[0] : null;
        return {
            projectId: point.projectId,
            routePointId: point.id,
            routePointTitle: point.title,
            enabled,
            videoTitle: (firstItem?.videoTitle ?? String(point.knowledgeVideoTitle ?? '').trim()) || point.title + '讲解视频',
            videoUrl: enabled ? (firstItem?.videoUrl ?? String(point.knowledgeVideoUrl ?? '').trim()) : '',
            question: firstQuestion?.question ?? '',
            options: firstQuestion?.options ?? [],
            questions: this.serializeKnowledgeQuestionsPublic(questions),
            items: this.serializeKnowledgeItemsPublic(knowledgeItems),
            completed: completion != null,
            completedAt: completion?.completedAt ?? null,
            rewardsPreview: this.serializeKnowledgeRewardsPreview(point),
            rewards: completion != null ? this.serializeKnowledgeCompletionRewards(completion) : this.emptyKnowledgeRewards(),
        };
    }
    serializeKnowledgeRewardsPreview(point) {
        return {
            grantPrize: point.knowledgeGrantPrize === true && point.knowledgePrizeProductId != null && String(point.knowledgePrizeProductId).length > 0,
            prizeProductId: point.knowledgePrizeProductId ?? '',
            prizeQuantity: point.knowledgePrizeQuantity ?? 1,
            grantPoints: false,
            pointsAmount: 0,
        };
    }
    emptyKnowledgeRewards() {
        return {
            prize: null,
            points: null,
        };
    }
    serializeKnowledgeCompletionRewards(completion) {
        return {
            prize: completion.prizeGrant != null ? this.serializeStudyPrizeGrant(completion.prizeGrant) : null,
            points: null,
        };
    }
    serializeRoutePointCheckIn(checkIn) {
        return {
            id: checkIn.id,
            bookingId: checkIn.bookingId,
            projectId: checkIn.projectId,
            routePointId: checkIn.routePointId,
            routePointTitle: checkIn.routePoint?.title ?? '',
            checkedInAt: checkIn.checkedInAt,
            latitude: checkIn.latitude != null ? Number(checkIn.latitude) : null,
            longitude: checkIn.longitude != null ? Number(checkIn.longitude) : null,
            accuracy: checkIn.accuracy != null ? Number(checkIn.accuracy) : null,
        };
    }
    serializeLiveLocation(location) {
        if (location == null)
            return null;
        return {
            id: location.id,
            projectId: location.projectId,
            bookingId: location.bookingId ?? '',
            userId: location.userId,
            latitude: Number(location.latitude),
            longitude: Number(location.longitude),
            accuracy: location.accuracy != null ? Number(location.accuracy) : null,
            speed: location.speed != null ? Number(location.speed) : null,
            updatedAt: location.updatedAt,
        };
    }
    serializeLiveParticipant(booking, routePoints, location) {
        const checkIns = booking.routePointCheckIns ?? [];
        const checkInByRoutePointId = {};
        for (let i = 0; i < checkIns.length; i++) {
            checkInByRoutePointId[checkIns[i].routePointId] = checkIns[i];
        }
        const routePointCheckIns = [];
        let routePointCheckedCount = 0;
        for (let i = 0; i < routePoints.length; i++) {
            const point = routePoints[i];
            const checkIn = checkInByRoutePointId[point.id] ?? null;
            if (checkIn != null)
                routePointCheckedCount++;
            routePointCheckIns.push({
                id: checkIn?.id ?? '',
                routePointId: point.id,
                routePointTitle: point.title,
                routePointDesc: point.description,
                sortOrder: point.sortOrder,
                checkInMode: this.mapRoutePointCheckInMode(point.checkInMode),
                checkedIn: checkIn != null,
                checkedInAt: checkIn?.checkedInAt ?? null,
                latitude: checkIn?.latitude != null ? Number(checkIn.latitude) : null,
                longitude: checkIn?.longitude != null ? Number(checkIn.longitude) : null,
                accuracy: checkIn?.accuracy != null ? Number(checkIn.accuracy) : null,
            });
        }
        return {
            bookingId: booking.id,
            userId: booking.userId,
            name: booking.participantName ?? booking.user?.nickname ?? '',
            phone: booking.participantPhone ?? booking.user?.phone ?? '',
            studyNo: booking.user?.studyNo ?? '',
            role: booking.participantRole ?? 'BOOKER',
            status: String(booking.status ?? '').toLowerCase(),
            projectCheckedIn: booking.checkedInAt != null,
            checkedInAt: booking.checkedInAt,
            checkedInById: booking.checkedInById ?? '',
            routePointCheckedCount,
            routePointTotalCount: routePoints.length,
            location: this.serializeLiveLocation(location),
            routePointCheckIns,
        };
    }
    serializePrizeProduct(product) {
        return {
            id: product.id,
            sku: product.sku,
            name: product.name,
            category: product.category,
            price: product.price.toString(),
            icon: product.icon ?? '',
            imageUrl: product.imageUrl ?? '',
            imgStyle: product.imgStyle ?? '',
            status: product.status === 'ON_SALE' ? 'on_sale' : 'off_sale',
            canBePrize: product.canBePrize ?? true,
            stock: product.stock,
            sales: product.sales,
        };
    }
    serializeStudyPrizeGrant(grant) {
        const product = grant.product ?? {};
        const grantedBy = grant.grantedBy ?? {};
        return {
            id: grant.id,
            projectId: grant.projectId,
            bookingId: grant.bookingId,
            userId: grant.userId,
            productId: grant.productId,
            product: this.serializePrizeProduct(product),
            quantity: grant.quantity,
            note: grant.note ?? '',
            grantedAt: grant.grantedAt,
            grantedBy: {
                id: grant.grantedById,
                nickname: grantedBy.nickname ?? '',
                phone: grantedBy.phone ?? '',
                studyNo: grantedBy.studyNo ?? '',
            },
        };
    }
    generatePrizeOrderNo() {
        return `JL${Date.now()}${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
    }
    createPrizeOrderRemark(grant) {
        const productName = grant.product?.name ?? '研学奖品';
        return '研学奖品发放：' + productName;
    }
    createRoutePointRewardSourceId(bookingId, routePointId, rewardType) {
        return bookingId + ':' + routePointId + ':' + rewardType;
    }
    createKnowledgeTaskSourceId(bookingId, routePointId) {
        return bookingId + ':' + routePointId + ':knowledge';
    }
    // ===== Phase34: cert from template + tour mall gates + puzzle rects =====


    projectContactsCacheGet(projectId) {
        if (!this._projectContactsMem) this._projectContactsMem = {};
        const id = String(projectId || '');
        if (!id) return null;
        const hit = this._projectContactsMem[id];
        if (!hit) return null;
        if (Date.now() - hit.ts > 60000) return null;
        return hit.list;
    }
    projectContactsCacheSet(projectId, list) {
        if (!this._projectContactsMem) this._projectContactsMem = {};
        this._projectContactsMem[String(projectId)] = { ts: Date.now(), list: list || [] };
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
        const out = [];
        for (let i = 0; i < list.length; i++) {
            const row = list[i] || {};
            const name = String(row.name || '').trim();
            const phone = String(row.phone || '').trim();
            const wechat = String(row.wechat || '').trim();
            const role = String(row.role || '').trim() || '现场负责人';
            if (!name && !phone) continue;
            out.push({
                id: String(row.id || ('pc' + i)),
                name: name || phone,
                phone,
                wechat,
                role,
                visibleToStudents: row.visibleToStudents === false ? false : true,
                sort: Number.isFinite(Number(row.sort)) ? Number(row.sort) : i,
            });
        }
        out.sort((a, b) => (a.sort - b.sort) || String(a.id).localeCompare(String(b.id)));
        return out;
    }
    publicProjectContacts(raw) {
        return this.normalizeProjectContacts(raw).filter((r) => r.visibleToStudents).map((r) => ({
            id: r.id,
            name: r.name,
            phone: r.phone,
            wechat: r.wechat,
            role: r.role,
            sort: r.sort,
        }));
    }
    async readProjectContactsRaw(projectId) {
        await this.ensureProjectContactsColumn();
        try {
            const rows = await this.prisma.$queryRawUnsafe(
                `SELECT "projectContacts" FROM "StudyProject" WHERE id=$1`,
                String(projectId)
            );
            const raw = rows && rows[0] ? rows[0].projectContacts : [];
            this.projectContactsCacheSet(projectId, raw);
            return raw;
        } catch (_e) {
            return [];
        }
    }

    async ensureStudyOverhaulSchema() {
        if (this._studyOverhaulSchemaReady) return;
        try {
            await this.prisma.$executeRawUnsafe(`ALTER TABLE "StudyProject" ADD COLUMN IF NOT EXISTS "tourMall" JSONB NOT NULL DEFAULT '{}'::jsonb`);
            await this.prisma.$executeRawUnsafe(`ALTER TABLE "StudyProject" ADD COLUMN IF NOT EXISTS "certTemplateId" TEXT`);
            await this.prisma.$executeRawUnsafe(`ALTER TABLE "PuzzleProject" ADD COLUMN IF NOT EXISTS "sourceImageUrl" TEXT`);
            await this.prisma.$executeRawUnsafe(`ALTER TABLE "PuzzleProject" ADD COLUMN IF NOT EXISTS "sourceImageKey" TEXT`);
            await this.prisma.$executeRawUnsafe(`ALTER TABLE "StudyCertificate" ADD COLUMN IF NOT EXISTS "templateId" TEXT`);
            await this.prisma.$executeRawUnsafe(`ALTER TABLE "StudyCertificate" ADD COLUMN IF NOT EXISTS "bodyHtml" TEXT`);
            await this.prisma.$executeRawUnsafe(`ALTER TABLE "StudyCertificate" ADD COLUMN IF NOT EXISTS "bgUrl" TEXT`);
            await this.prisma.$executeRawUnsafe(`ALTER TABLE "StudyCertificate" ADD COLUMN IF NOT EXISTS "sealUrl" TEXT`);
            this._studyOverhaulSchemaReady = true;
        } catch (_e) { this._studyOverhaulSchemaReady = true; }
    }
    defaultCertBodyHtml() {
        return '<p style="line-height:1.8;font-size:16px;color:#1C384A">兹证明 <b>{{holderName}}</b> 同学已完成「{{projectTitle}}」研学项目全部点位打卡与研学任务，特发此证。</p><p style="margin-top:18px;color:#64748B;font-size:13px">证书编号：{{certificateNo}}<br/>颁发日期：{{issuedAt}}</p>';
    }
    renderCertTemplateHtml(tpl, vars) {
        let html = String((tpl && tpl.bodyHtml) || this.defaultCertBodyHtml());
        const map = vars || {};
        Object.keys(map).forEach((k) => {
            html = html.split('{{' + k + '}}').join(String(map[k] == null ? '' : map[k]));
        });
        return html;
    }
    async loadActiveCertTemplate(projectId) {
        await this.ensureStudyOverhaulSchema();
        const rows = await this.prisma.$queryRawUnsafe(`SELECT "certTemplateId" FROM "StudyProject" WHERE id=$1`, String(projectId));
        let tid = rows && rows[0] ? String(rows[0].certTemplateId || '') : '';
        let tplRows = null;
        if (tid) {
            tplRows = await this.prisma.$queryRawUnsafe(
                `SELECT id, name, title, "bodyHtml", "bgUrl", "sealUrl", enabled FROM "StudyCertificateTemplate" WHERE id=$1 AND "projectId"=$2 LIMIT 1`,
                tid, String(projectId)
            );
        }
        if (!tplRows || !tplRows[0]) {
            tplRows = await this.prisma.$queryRawUnsafe(
                `SELECT id, name, title, "bodyHtml", "bgUrl", "sealUrl", enabled FROM "StudyCertificateTemplate" WHERE "projectId"=$1 AND enabled=true ORDER BY "sortOrder" ASC, "createdAt" ASC LIMIT 1`,
                String(projectId)
            );
        }
        return tplRows && tplRows[0] ? tplRows[0] : null;
    }
    normalizeTourMallConfig(raw) {
        let obj = raw;
        if (typeof raw === 'string') {
            try { obj = JSON.parse(raw); } catch (_e) { obj = {}; }
        }
        if (!obj || typeof obj !== 'object') obj = {};
        const skusIn = Array.isArray(obj.skus) ? obj.skus : [];
        const skus = [];
        for (let i = 0; i < skusIn.length; i++) {
            const s = skusIn[i] || {};
            const name = String(s.name || s.title || '').trim();
            if (!name) continue;
            if (s.enabled === false) continue;
            skus.push({
                id: String(s.id || ('sku_' + i)),
                productId: String(s.productId || '').trim(),
                name,
                imageUrl: String(s.imageUrl || s.icon || '').trim(),
                points: Math.max(0, Number(s.points) || 0),
                stock: s.stock == null || s.stock === '' ? -1 : Number(s.stock),
                note: String(s.note || '').trim(),
            });
        }
        return {
            enabled: obj.enabled !== false,
            enterBeforeGrad: obj.enterBeforeGrad !== false,
            redeemAfterGrad: obj.redeemAfterGrad !== false,
            openOnApptDay24h: obj.openOnApptDay24h !== false,
            title: String(obj.title || '导览积分商城'),
            hint: String(obj.hint || ''),
            skus,
        };
    }
    async loadTourMallConfig(projectId) {
        await this.ensureStudyOverhaulSchema();
        const rows = await this.prisma.$queryRawUnsafe(`SELECT "tourMall" FROM "StudyProject" WHERE id=$1`, String(projectId));
        return this.normalizeTourMallConfig(rows && rows[0] ? rows[0].tourMall : {});
    }
    sumBookingTourPoints(booking) {
        const plan = this.normalizeTripPlan(booking && booking.tripPlan);
        const sp = plan.stationProgress && typeof plan.stationProgress === 'object' ? plan.stationProgress : {};
        let total = 0;
        Object.keys(sp).forEach((k) => {
            const row = sp[k] || {};
            total += Number(row.pointsEarned || 0) || 0;
        });
        const tour = plan.tour && typeof plan.tour === 'object' ? plan.tour : {};
        const spent = Number(tour.tourPointsSpent || 0) || 0;
        return { totalPoints: total, spentPoints: spent, availablePoints: Math.max(0, total - spent), stationProgress: sp, tour, plan };
    }
    isTourMallWindowOpen(booking, mallCfg) {
        if (!mallCfg || mallCfg.openOnApptDay24h === false) {
            // if rule disabled, allow whenever touring/completed
            return true;
        }
        const plan = this.normalizeTripPlan(booking && booking.tripPlan);
        const dayKeys = Array.isArray(plan.dayKeys) ? plan.dayKeys : [];
        const today = this.chinaDateKey();
        if (dayKeys.length === 0) {
            // fallback: entrance day or today
            if (booking && booking.checkedInAt) {
                try {
                    const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit' });
                    return fmt.format(new Date(booking.checkedInAt)) === today;
                } catch (_e) { return true; }
            }
            return true;
        }
        return dayKeys.indexOf(today) >= 0;
    }
    buildPuzzlePieceRects(n) {
        const count = Math.max(0, Number(n) || 0);
        if (count <= 0) return { cols: 0, rows: 0, rects: [] };
        const cols = Math.ceil(Math.sqrt(count));
        const rows = Math.ceil(count / cols);
        const rects = [];
        for (let i = 0; i < count; i++) {
            const r = Math.floor(i / cols);
            const c = i % cols;
            rects.push({
                index: i,
                row: r,
                col: c,
                rows,
                cols,
                xPct: (c / cols) * 100,
                yPct: (r / rows) * 100,
                wPct: (1 / cols) * 100,
                hPct: (1 / rows) * 100,
            });
        }
        return { cols, rows, rects };
    }
    async loadPuzzleSourceMeta(projectId) {
        await this.ensureStudyOverhaulSchema();
        try {
            const rows = await this.prisma.$queryRawUnsafe(
                `SELECT id, title, subtitle, "sourceImageUrl", "sourceImageKey", "gridCols", "gridRows" FROM "PuzzleProject" WHERE "projectId"=$1 LIMIT 1`,
                String(projectId)
            );
            return rows && rows[0] ? rows[0] : null;
        } catch (_e) { return null; }
    }
    decorateExplorePuzzle(puzzlePayload, routePointsForUser, clearedIds, sourceMeta) {
        const pieces = Array.isArray(puzzlePayload && puzzlePayload.pieces) ? puzzlePayload.pieces : [];
        const layout = this.buildPuzzlePieceRects(pieces.length);
        const sourceImageUrl = sourceMeta && sourceMeta.sourceImageUrl ? String(sourceMeta.sourceImageUrl) : '';
        const nextPieces = pieces.map((p, idx) => {
            const rect = layout.rects[idx] || null;
            return Object.assign({}, p, {
                rect,
                imageUrl: sourceImageUrl,
                backgroundStyle: sourceImageUrl && rect ? {
                    backgroundImage: 'url(' + sourceImageUrl + ')',
                    backgroundSize: (rect.cols * 100) + '% ' + (rect.rows * 100) + '%',
                    backgroundPosition: (-rect.col * 100) + '% ' + (-rect.row * 100) + '%',
                } : null,
            });
        });
        return Object.assign({}, puzzlePayload || {}, {
            sourceImageUrl,
            gridCols: layout.cols,
            gridRows: layout.rows,
            splitMode: sourceImageUrl ? 'source_image_rects' : 'spot_titles',
            pieces: nextPieces,
        });
    }
    async buildTourMallGatePayload(booking, project, mallCfg, graduated) {
        const cfg = mallCfg || await this.loadTourMallConfig(project.id);
        const pts = this.sumBookingTourPoints(booking);
        const windowOpen = this.isTourMallWindowOpen(booking, cfg);
        const canEnter = cfg.enabled !== false && windowOpen && (graduated || cfg.enterBeforeGrad !== false);
        const canRedeem = cfg.enabled !== false && windowOpen && (!!graduated) && (cfg.redeemAfterGrad !== false);
        return {
            enabled: cfg.enabled !== false,
            title: cfg.title,
            hint: cfg.hint,
            windowOpen,
            graduated: !!graduated,
            mallRedeemUnlocked: !!graduated,
            canEnter,
            canRedeem,
            enterBeforeGrad: cfg.enterBeforeGrad !== false,
            redeemAfterGrad: cfg.redeemAfterGrad !== false,
            openOnApptDay24h: cfg.openOnApptDay24h !== false,
            totalPoints: pts.totalPoints,
            spentPoints: pts.spentPoints,
            availablePoints: pts.availablePoints,
            skuCount: (cfg.skus || []).length,
        };
    }
    async getTourMallForUser(userId, projectId) {
        const project = await this.prisma.studyProject.findUnique({ where: { id: projectId } });
        if (!project) throw new common_1.NotFoundException('Study project not found');
        let booking = await this.prisma.studyBooking.findFirst({
            where: { projectId, userId, status: { in: [client_1.BookingStatus.BOOKED, client_1.BookingStatus.COMPLETED] } },
            orderBy: { createdAt: 'desc' },
        });
        if (!booking) throw new common_1.BadRequestException('请先预约本研学项目');
        const cfg = await this.loadTourMallConfig(projectId);
        const graduated = String(booking.status) === 'COMPLETED' || !!(booking.tripPlan && booking.tripPlan.tour && booking.tripPlan.tour.graduated);
        const gates = await this.buildTourMallGatePayload(booking, project, cfg, graduated);
        if (!gates.canEnter) {
            return {
                ...gates,
                items: [],
                message: !cfg.enabled ? '导览积分商城未开启' : (!gates.windowOpen ? '仅预约当日 24 小时内可进入积分商城' : '暂不可进入积分商城'),
            };
        }
        const items = (cfg.skus || []).map((s) => ({
            ...s,
            canAfford: gates.availablePoints >= s.points,
            redeemBlockedReason: !gates.canRedeem
                ? (graduated ? (!gates.windowOpen ? '不在预约日兑换窗口' : '当前不可兑换') : '结业后才可兑换')
                : (gates.availablePoints < s.points ? '积分不足' : ''),
        }));
        return { ...gates, items, message: gates.canRedeem ? '可兑换' : '可浏览，结业后解锁兑换' };
    }
    async redeemTourMallItem(userId, projectId, body) {
        const skuId = String((body && (body.skuId || body.id || body.productId)) || '').trim();
        if (!skuId) throw new common_1.BadRequestException('请选择兑换商品');
        const project = await this.prisma.studyProject.findUnique({ where: { id: projectId } });
        if (!project) throw new common_1.NotFoundException('Study project not found');
        let booking = await this.prisma.studyBooking.findFirst({
            where: { projectId, userId, status: { in: [client_1.BookingStatus.BOOKED, client_1.BookingStatus.COMPLETED] } },
            orderBy: { createdAt: 'desc' },
        });
        if (!booking) throw new common_1.BadRequestException('请先预约本研学项目');
        const cfg = await this.loadTourMallConfig(projectId);
        const graduated = String(booking.status) === 'COMPLETED' || !!(booking.tripPlan && booking.tripPlan.tour && (booking.tripPlan.tour.graduated || booking.tripPlan.tour.mallRedeemUnlocked));
        const gates = await this.buildTourMallGatePayload(booking, project, cfg, graduated);
        if (!gates.canEnter) throw new common_1.BadRequestException(gates.windowOpen ? '暂不可进入积分商城' : '仅预约当日可进入积分商城');
        if (!gates.canRedeem) throw new common_1.BadRequestException('结业（集齐拼图）后才可兑换');
        const sku = (cfg.skus || []).find((s) => s.id === skuId || s.productId === skuId);
        if (!sku) throw new common_1.NotFoundException('兑换商品不存在或已下架');
        if (gates.availablePoints < sku.points) throw new common_1.BadRequestException('积分不足');
        // stock check against config snapshot (best-effort)
        if (sku.stock >= 0) {
            const plan0 = this.normalizeTripPlan(booking.tripPlan);
            const tour0 = plan0.tour && typeof plan0.tour === 'object' ? plan0.tour : {};
            const redeems = Array.isArray(tour0.mallRedeems) ? tour0.mallRedeems : [];
            const used = redeems.filter((r) => r && (r.skuId === sku.id)).length;
            // global stock not tracked per-booking accurately without table; allow if local not overstocked weirdly
            if (used >= sku.stock && sku.stock === 0) throw new common_1.BadRequestException('库存不足');
        }
        const now = new Date();
        const plan0 = this.normalizeTripPlan(booking.tripPlan);
        const tour0 = Object.assign({}, plan0.tour && typeof plan0.tour === 'object' ? plan0.tour : {});
        const spent = Number(tour0.tourPointsSpent || 0) || 0;
        tour0.tourPointsSpent = spent + sku.points;
        tour0.mallRedeems = Array.isArray(tour0.mallRedeems) ? tour0.mallRedeems.slice() : [];
        const redeemId = 'rdm_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
        tour0.mallRedeems.push({
            id: redeemId,
            skuId: sku.id,
            productId: sku.productId || '',
            name: sku.name,
            points: sku.points,
            redeemedAt: now.toISOString(),
        });
        const plan = Object.assign({}, plan0, { tour: tour0 });
        await this.prisma.studyBooking.update({ where: { id: booking.id }, data: { tripPlan: plan } });
        let coupon = null;
        if (sku.productId) {
            try {
                const product = await this.prisma.product.findUnique({ where: { id: sku.productId } });
                if (product) {
                    await this.ensureUserCouponTable();
                    const cid = 'uc_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
                    const title = '积分兑换 · ' + product.name;
                    const subtitle = '导览总积分兑换 · 花费 ' + sku.points + ' 分';
                    await this.prisma.$executeRawUnsafe(
                        `INSERT INTO "UserCoupon" (id,"userId",title,subtitle,type,value,"minAmount",status,"expireAt",scope,source,"productId","projectId","routePointId","bookingId",grade,"createdAt")
                         VALUES ($1,$2,$3,$4,'gift',$5,'0','unused',NULL,$6,'tour_mall',$7,$8,NULL,$9,'mall',NOW())`,
                        cid, userId, title, subtitle, String(product.price || 0), product.name, product.id, projectId, booking.id
                    );
                    coupon = { id: cid, title, productId: product.id, productName: product.name };
                }
            } catch (_e) { coupon = null; }
        }
        const pts = this.sumBookingTourPoints(Object.assign({}, booking, { tripPlan: plan }));
        return {
            ok: true,
            redeemId,
            sku,
            coupon,
            totalPoints: pts.totalPoints,
            spentPoints: pts.spentPoints,
            availablePoints: pts.availablePoints,
            message: coupon ? ('兑换成功，已放入卡券：' + (coupon.title || sku.name)) : ('兑换成功：' + sku.name),
        };
    }

    serializeLiveParticipantBackpack(puzzleProject, booking, routePoints, checkIns, prizeGrants) {
        const routePointByIndex = {};
        for (let i = 0; i < routePoints.length; i++)
            routePointByIndex[i] = routePoints[i];
        const checkInByRoutePointId = {};
        for (let i = 0; i < checkIns.length; i++)
            checkInByRoutePointId[checkIns[i].routePointId] = checkIns[i];
        const pieces = puzzleProject.pieces.map((piece, index) => {
            const routePoint = routePointByIndex[index] ?? null;
            const checkIn = routePoint != null ? checkInByRoutePointId[routePoint.id] ?? null : null;
            return {
                id: piece.pieceNo.toString(),
                name: piece.name,
                icon: piece.icon,
                collected: checkIn != null,
                collectedAt: checkIn != null ? checkIn.checkedInAt.toISOString() : null,
                routePointId: routePoint != null ? routePoint.id : '',
                routePointTitle: routePoint != null ? routePoint.title : '',
            };
        });
        const collectedCount = pieces.filter((piece) => piece.collected).length;
        const totalCount = pieces.length;
        return {
            projectId: puzzleProject.projectId,
            projectTitle: puzzleProject.project.title,
            subtitle: puzzleProject.subtitle,
            gradientStart: puzzleProject.project.gradientStart,
            gradientEnd: puzzleProject.project.gradientEnd,
            gridCols: puzzleProject.gridCols,
            gridRows: puzzleProject.gridRows,
            collectedCount,
            totalCount,
            completed: totalCount > 0 && collectedCount >= totalCount,
            participant: {
                bookingId: booking.id,
                userId: booking.userId,
                name: booking.participantName ?? booking.user?.nickname ?? '',
                phone: booking.participantPhone ?? booking.user?.phone ?? '',
                studyNo: booking.user?.studyNo ?? '',
            },
            pieces,
            prizes: prizeGrants.map((grant) => this.serializeBackpackPrize(grant)),
        };
    }
    serializeBackpackPrize(grant) {
        const product = grant.product ?? {};
        const grantedAt = grant.grantedAt instanceof Date ? grant.grantedAt.toISOString().slice(0, 10) : '';
        const quantityText = grant.quantity > 1 ? ` x${grant.quantity}` : '';
        const note = String(grant.note ?? '').trim();
        return {
            id: grant.id,
            productId: grant.productId,
            name: `${product.name ?? '研学奖品'}${quantityText}`,
            desc: note.length > 0 ? note : `管理员于 ${grantedAt} 发放`,
            icon: product.imageUrl || product.icon || '/static/icon-package.svg',
            imageUrl: product.imageUrl ?? '',
            quantity: grant.quantity,
            acquired: true,
            acquiredText: '已获得',
            grantedAt: grant.grantedAt,
            grantedByName: grant.grantedBy?.nickname ?? '',
        };
    }
    async getActiveSeatBookingById(projectId, bookingId) {
        const booking = await this.prisma.studyBooking.findFirst({
            where: {
                id: bookingId,
                projectId,
                userDeletedAt: null,
                status: { in: [client_1.BookingStatus.BOOKED, client_1.BookingStatus.COMPLETED] },
            },
            include: { user: true },
        });
        if (!booking)
            throw new common_1.NotFoundException('研学成员不存在或不在当前项目中');
        if (!this.isSeatBooking(booking))
            throw new common_1.BadRequestException('组织者身份不需要签到');
        return booking;
    }
    async getUserActiveSeatBooking(projectId, userId) {
        const project = await this.prisma.studyProject.findUnique({ where: { id: projectId }, select: { id: true } });
        if (!project)
            throw new common_1.NotFoundException('Study project not found');
        const booking = await this.prisma.studyBooking.findFirst({
            where: {
                projectId,
                userId,
                userDeletedAt: null,
                status: { in: [client_1.BookingStatus.BOOKED, client_1.BookingStatus.COMPLETED] },
            },
            orderBy: { createdAt: 'desc' },
        });
        if (!booking)
            throw new common_1.BadRequestException('请先预约并进入当前研学项目');
        if (!this.isSeatBooking(booking))
            throw new common_1.BadRequestException('组织者身份不需要打卡点签到');
        return booking;
    }
    readOptionalNumber(value) {
        if (value == null)
            return null;
        const num = typeof value === 'number' ? value : Number(String(value).trim());
        if (!Number.isFinite(num))
            return null;
        return num;
    }
    readRequiredLatitude(value) {
        const latitude = this.readOptionalNumber(value);
        if (latitude == null || latitude < -90 || latitude > 90) {
            throw new common_1.BadRequestException('纬度格式不正确');
        }
        return latitude;
    }
    readRequiredLongitude(value) {
        const longitude = this.readOptionalNumber(value);
        if (longitude == null || longitude < -180 || longitude > 180) {
            throw new common_1.BadRequestException('经度格式不正确');
        }
        return longitude;
    }
    readRoutePointTitle(value) {
        const title = String(value ?? '').trim();
        if (title.length === 0)
            throw new common_1.BadRequestException('打卡点名称不能为空');
        if (title.length > 40)
            throw new common_1.BadRequestException('打卡点名称不能超过40个字');
        return title;
    }
    readRoutePointDescription(value) {
        const description = String(value ?? '').trim();
        if (description.length > 120)
            throw new common_1.BadRequestException('打卡点说明不能超过120个字');
        return description;
    }
    readRoutePointCheckRadius(value) {
        const radius = this.readOptionalNumber(value);
        if (radius == null || radius < 10 || radius > 1000) {
            throw new common_1.BadRequestException('签到范围需在10-1000米之间');
        }
        return Math.round(radius);
    }
    readRoutePointIdList(value) {
        if (!Array.isArray(value))
            throw new common_1.BadRequestException('排序列表格式不正确');
        const ids = [];
        for (let i = 0; i < value.length; i++) {
            const id = String(value[i] ?? '').trim();
            if (id.length === 0 || ids.includes(id))
                throw new common_1.BadRequestException('排序列表格式不正确');
            ids.push(id);
        }
        return ids;
    }
    readPrizeQuantity(value) {
        const quantity = value == null ? 1 : Number(String(value).trim());
        if (!Number.isInteger(quantity) || quantity < 1 || quantity > 99) {
            throw new common_1.BadRequestException('奖品数量需在1-99之间');
        }
        return quantity;
    }
    readPrizeNote(value) {
        const note = String(value ?? '').trim();
        if (note.length > 120)
            throw new common_1.BadRequestException('奖品备注不能超过120个字');
        return note.length > 0 ? note : null;
    }
    readManualPointsAmount(value) {
        const amount = Number(String(value ?? '').trim());
        if (!Number.isFinite(amount) || !Number.isInteger(amount) || amount < 1 || amount > 100000) {
            throw new common_1.BadRequestException('积分需在1-100000之间');
        }
        return amount;
    }
    readPointsNote(value) {
        const note = String(value ?? '').trim();
        if (note.length > 120)
            throw new common_1.BadRequestException('积分备注不能超过120个字');
        return note.length > 0 ? note : null;
    }
    readAdminOperatorUserId(value) {
        const userId = String(value ?? '').trim();
        if (userId.length === 0)
            throw new common_1.BadRequestException('控制台操作人无效，请重新登录');
        return userId;
    }
    normalizeLiveStageAction(value) {
        const action = String(value ?? '').trim().toLowerCase();
        if (action === 'ready' || action === 'departing' || action === 'study_active' || action === 'end' || action === 'ended' || action === 'reopen') {
            return action === 'end' ? 'ended' : action;
        }
        throw new common_1.BadRequestException('未知项目流程动作');
    }
    readBoolean(value, defaultValue) {
        if (value == null)
            return defaultValue;
        if (typeof value === 'boolean')
            return value;
        if (typeof value === 'number')
            return value !== 0;
        const normalized = String(value).trim().toLowerCase();
        if (['true', '1', 'yes', 'on', 'y'].includes(normalized))
            return true;
        if (['false', '0', 'no', 'off', 'n'].includes(normalized))
            return false;
        return defaultValue;
    }
    readRoutePointAutoPointsAmount(value) {
        const amount = Math.floor(Number(value ?? 0));
        if (!Number.isFinite(amount) || amount < 0 || amount > 100000) {
            throw new common_1.BadRequestException('自动发放积分需在0-100000之间');
        }
        return amount;
    }
    readKnowledgeAnswerIndex(value) {
        if (typeof value === 'string') {
            const normalized = value.trim().toUpperCase().replace(/[.。:：]/g, '');
            if (/^[A-H]$/.test(normalized))
                return normalized.charCodeAt(0) - 65;
        }
        const index = Math.floor(Number(value));
        if (!Number.isFinite(index) || index < 0 || index > 20) {
            throw new common_1.BadRequestException('请选择有效的题目答案');
        }
        return index;
    }
    readKnowledgeOptions(value) {
        if (!Array.isArray(value))
            return [];
        const options = [];
        for (let i = 0; i < value.length; i++) {
            const text = String(value[i] ?? '').trim();
            if (text.length === 0)
                continue;
            if (text.length > 80)
                throw new common_1.BadRequestException('题目选项不能超过80个字');
            options.push(text);
        }
        if (options.length > 12)
            throw new common_1.BadRequestException('题目选项不能超过12个');
        return options;
    }
    readKnowledgeAnswerIndexes(body, questionCount) {
        const value = body.answerIndexes ?? body.answers ?? body.optionIndexes;
        if (Array.isArray(value)) {
            if (value.length > 20)
                throw new common_1.BadRequestException('题目答案数量不能超过20个');
            return value.map((item) => {
                if (item != null && typeof item === 'object') {
                    return this.readKnowledgeAnswerIndex(item.answerIndex ?? item.answer ?? item.optionIndex);
                }
                return this.readKnowledgeAnswerIndex(item);
            });
        }
        if (value != null && questionCount === 1)
            return [this.readKnowledgeAnswerIndex(value)];
        if (body.answerIndex != null || body.answer != null || body.optionIndex != null) {
            return [this.readKnowledgeAnswerIndex(body.answerIndex ?? body.answer ?? body.optionIndex)];
        }
        throw new common_1.BadRequestException('请选择有效的题目答案');
    }
    getKnowledgeQuestions(point) {
        const configuredQuestions = this.readKnowledgeQuestions(point?.knowledgeQuestions, false);
        if (configuredQuestions.length > 0)
            return configuredQuestions;
        const question = String(point?.knowledgeQuestion ?? '').trim();
        const options = Array.isArray(point?.knowledgeOptions)
            ? point.knowledgeOptions.map((item) => String(item ?? '').trim()).filter((item) => item.length > 0)
            : [];
        const answerIndex = point?.knowledgeAnswerIndex == null ? -1 : Number(point.knowledgeAnswerIndex);
        if (question.length === 0 || question.length > 160)
            return [];
        if (options.length < 2 || options.length > 8)
            return [];
        if (!Number.isInteger(answerIndex) || answerIndex < 0 || answerIndex >= options.length)
            return [];
        return [{ question, options, answerIndex }];
    }
    getKnowledgeItems(point) {
        const configuredItems = this.readKnowledgeItems(point?.knowledgeItems, false);
        if (configuredItems.length > 0)
            return configuredItems;
        const questions = this.getKnowledgeQuestions(point);
        if (questions.length === 0)
            return [];
        const videoTitle = String(point?.knowledgeVideoTitle ?? '').trim();
        const videoUrl = String(point?.knowledgeVideoUrl ?? '').trim();
        return [{
                title: videoTitle,
                videoTitle,
                videoUrl,
                questions,
            }];
    }
    flattenKnowledgeItems(items) {
        const questions = [];
        for (let i = 0; i < items.length; i++) {
            for (let j = 0; j < items[i].questions.length; j++) {
                questions.push(items[i].questions[j]);
            }
        }
        return questions;
    }
    readKnowledgeQuestions(value, strict = true) {
        let raw = value;
        if (typeof raw === 'string') {
            const text = raw.trim();
            if (text.length === 0)
                return [];
            try {
                raw = JSON.parse(text);
            }
            catch (_err) {
                if (strict)
                    throw new common_1.BadRequestException('知识小助手题目配置格式不正确');
                return [];
            }
        }
        if (raw == null)
            return [];
        if (!Array.isArray(raw)) {
            if (strict)
                throw new common_1.BadRequestException('知识小助手题目配置格式不正确');
            return [];
        }
        if (raw.length > 20)
            throw new common_1.BadRequestException('知识小助手题目不能超过20道');
        const questions = [];
        for (let i = 0; i < raw.length; i++) {
            const item = raw[i];
            if (item == null || typeof item !== 'object') {
                if (strict)
                    throw new common_1.BadRequestException('第' + (i + 1).toString() + '道知识题目格式不正确');
                continue;
            }
            const question = String(item.question ?? item.title ?? item.text ?? '').trim();
            const options = this.readKnowledgeOptions(item.options);
            let answerIndexes = [];
            if (Array.isArray(item.answerIndexes) && item.answerIndexes.length) {
                answerIndexes = item.answerIndexes.map((n) => Number(n)).filter((n) => Number.isInteger(n) && n >= 0 && n < options.length);
            }
            else {
                let answerIndex = -1;
                try {
                    answerIndex = this.readKnowledgeAnswerIndex(item.answerIndex ?? item.correctIndex ?? item.answer ?? item.correctAnswer);
                }
                catch (error) {
                    if (strict)
                        throw error;
                    continue;
                }
                if (answerIndex >= 0 && answerIndex < options.length)
                    answerIndexes = [answerIndex];
            }
            if (question.length === 0) {
                if (strict)
                    throw new common_1.BadRequestException('请填写第' + (i + 1).toString() + '道知识小助手题目');
                continue;
            }
            if (question.length > 160) {
                if (strict)
                    throw new common_1.BadRequestException('第' + (i + 1).toString() + '道知识题目不能超过160个字');
                continue;
            }
            if (options.length < 2) {
                if (strict)
                    throw new common_1.BadRequestException('第' + (i + 1).toString() + '道知识题目至少需要2个选项');
                continue;
            }
            if (!answerIndexes.length) {
                if (strict)
                    throw new common_1.BadRequestException('请选择第' + (i + 1).toString() + '道知识题目的正确答案');
                continue;
            }
            const multiSelect = item.multiSelect === true || item.multi === true;
            if (!multiSelect)
                answerIndexes = [answerIndexes[0]];
            let partialMode = String(item.partialMode || item.partialScoreMode || 'none').trim();
            if (partialMode === 'half')
                partialMode = 'fixed';
            if (['none', 'ratio', 'fixed'].indexOf(partialMode) < 0)
                partialMode = 'none';
            const row = this.normalizeQuizQuestion({
                id: item.id,
                question,
                options,
                multiSelect,
                answerIndexes,
                answerIndex: answerIndexes[0],
                partialMode,
                halfScore: item.halfScore,
                points: item.points,
            });
            questions.push(row);
        }
        return questions;
    }
    readKnowledgeItems(value, strict = true) {
        let raw = value;
        if (typeof raw === 'string') {
            const text = raw.trim();
            if (text.length === 0)
                return [];
            try {
                raw = JSON.parse(text);
            }
            catch (_err) {
                if (strict)
                    throw new common_1.BadRequestException('知识小助手内容配置格式不正确');
                return [];
            }
        }
        if (raw == null)
            return [];
        if (!Array.isArray(raw)) {
            if (strict)
                throw new common_1.BadRequestException('知识小助手内容配置格式不正确');
            return [];
        }
        if (raw.length > 10)
            throw new common_1.BadRequestException('知识小助手内容不能超过10个');
        const items = [];
        let totalQuestions = 0;
        for (let i = 0; i < raw.length; i++) {
            const item = raw[i];
            if (item == null || typeof item !== 'object') {
                if (strict)
                    throw new common_1.BadRequestException('第' + (i + 1).toString() + '个知识内容格式不正确');
                continue;
            }
            const title = String(item.title ?? item.name ?? item.videoTitle ?? '').trim();
            const videoTitle = String(item.videoTitle ?? item.title ?? item.name ?? '').trim();
            const videoUrl = String(item.videoUrl ?? item.video ?? item.url ?? '').trim();
            if (title.length > 60 || videoTitle.length > 60) {
                if (strict)
                    throw new common_1.BadRequestException('第' + (i + 1).toString() + '个知识内容标题不能超过60个字');
                continue;
            }
            if (videoUrl.length > 500) {
                if (strict)
                    throw new common_1.BadRequestException('第' + (i + 1).toString() + '个知识内容视频地址不能超过500个字符');
                continue;
            }
            if (videoUrl.length > 0 && !/^https?:\/\//.test(videoUrl)) {
                if (strict)
                    throw new common_1.BadRequestException('第' + (i + 1).toString() + '个知识内容视频地址必须是 http 或 https 链接');
                continue;
            }
            const questionSource = Array.isArray(item.questions) || typeof item.questions === 'string'
                ? item.questions
                : Array.isArray(item.knowledgeQuestions) || typeof item.knowledgeQuestions === 'string'
                    ? item.knowledgeQuestions
                    : item.question != null || item.options != null
                        ? [item]
                        : [];
            const questions = this.readKnowledgeQuestions(questionSource, strict);
            if (questions.length === 0) {
                if (strict)
                    throw new common_1.BadRequestException('请为第' + (i + 1).toString() + '个知识内容至少配置1道题目');
                continue;
            }
            totalQuestions += questions.length;
            if (totalQuestions > 20)
                throw new common_1.BadRequestException('知识小助手题目不能超过20道');
            items.push({
                title: title || videoTitle || '知识内容' + (i + 1).toString(),
                videoTitle: videoTitle || title || '知识内容' + (i + 1).toString(),
                videoUrl,
                questions,
            });
        }
        return items;
    }
    serializeKnowledgeQuestionsPublic(questions) {
        return questions.map((item) => ({
            question: item.question,
            options: item.options,
        }));
    }
    serializeKnowledgeQuestionsAdmin(questions) {
        return questions.map((item) => ({
            question: item.question,
            options: item.options,
            answerIndex: item.answerIndex,
        }));
    }
    serializeKnowledgeItemsPublic(items) {
        return items.map((item) => ({
            title: item.title,
            videoTitle: item.videoTitle,
            videoUrl: item.videoUrl,
            questions: this.serializeKnowledgeQuestionsPublic(item.questions),
        }));
    }
    serializeKnowledgeItemsAdmin(items) {
        return items.map((item) => ({
            title: item.title,
            videoTitle: item.videoTitle,
            videoUrl: item.videoUrl,
            questions: this.serializeKnowledgeQuestionsAdmin(item.questions),
        }));
    }
    applyKnowledgeQuestionMirror(data, questions) {
        const first = questions.length > 0 ? questions[0] : null;
        data.knowledgeQuestion = first?.question ?? null;
        data.knowledgeOptions = first?.options ?? [];
        data.knowledgeAnswerIndex = first?.answerIndex ?? null;
    }
    applyKnowledgeItemMirror(data, items) {
        const firstItem = items.length > 0 ? items[0] : null;
        const questions = this.flattenKnowledgeItems(items);
        data.knowledgeItems = items;
        data.knowledgeVideoTitle = firstItem?.videoTitle ?? null;
        data.knowledgeVideoUrl = firstItem?.videoUrl ?? null;
        data.knowledgeQuestions = questions;
        this.applyKnowledgeQuestionMirror(data, questions);
    }
    isKnowledgeTaskConfigured(point) {
        const questions = this.flattenKnowledgeItems(this.getKnowledgeItems(point));
        return point.knowledgeEnabled === true && questions.length > 0;
    }
    assertKnowledgeTaskConfigured(point) {
        if (!this.isKnowledgeTaskConfigured(point)) {
            throw new common_1.BadRequestException('该打卡点还没有配置完整的知识任务');
        }
    }
    assertKnowledgeTaskSettingsCandidate(candidate) {
        if (candidate.knowledgeEnabled !== true)
            return;
        const items = this.getKnowledgeItems(candidate);
        const questions = this.flattenKnowledgeItems(items);
        if (questions.length === 0)
            throw new common_1.BadRequestException('请至少配置1道知识小助手题目');
        for (let i = 0; i < items.length; i++) {
            const videoUrl = String(items[i].videoUrl ?? '').trim();
            if (videoUrl.length > 0 && !/^https?:\/\//.test(videoUrl)) {
                throw new common_1.BadRequestException('第' + (i + 1).toString() + '个知识内容视频地址必须是 http 或 https 链接');
            }
        }
        if (candidate.knowledgeGrantPrize !== true) {
            throw new common_1.BadRequestException('知识小助手任务需要设置积分或奖品奖励');
        }
        if (candidate.knowledgeGrantPrize === true && String(candidate.knowledgePrizeProductId ?? '').trim().length === 0) {
            throw new common_1.BadRequestException('请选择知识小助手奖励奖品');
        }
        if (false) {
            throw new common_1.BadRequestException('请填写知识小助手奖励积分');
        }
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
    readOptionalText(value, maxLength) {
        if (value == null)
            return null;
        const text = String(value).trim();
        if (text.length > maxLength)
            throw new common_1.BadRequestException('内容不能超过' + maxLength.toString() + '个字');
        return text.length > 0 ? text : null;
    }
    readRequiredText(value, label, maxLength) {
        const text = String(value ?? '').trim();
        if (text.length === 0)
            throw new common_1.BadRequestException(label + '不能为空');
        if (text.length > maxLength)
            throw new common_1.BadRequestException(label + '不能超过' + maxLength.toString() + '个字');
        return text;
    }
    readOptionalLatitude(value) {
        if (value == null || String(value).trim().length === 0)
            return null;
        return this.readRequiredLatitude(value);
    }
    readOptionalLongitude(value) {
        if (value == null || String(value).trim().length === 0)
            return null;
        return this.readRequiredLongitude(value);
    }
    mapDepartureSettingsData(body) {
        const mode = this.mapDepartureMode(body.mode ?? body.departureMode);
        const departureLatitude = this.readOptionalLatitude(body.departureLatitude ?? body.startLatitude);
        const departureLongitude = this.readOptionalLongitude(body.departureLongitude ?? body.startLongitude);
        const dropoffLatitude = this.readOptionalLatitude(body.dropoffLatitude);
        const dropoffLongitude = this.readOptionalLongitude(body.dropoffLongitude);
        if ((departureLatitude == null) !== (departureLongitude == null)) {
            throw new common_1.BadRequestException('初始出发点经纬度需要同时填写');
        }
        if ((dropoffLatitude == null) !== (dropoffLongitude == null)) {
            throw new common_1.BadRequestException('下车点经纬度需要同时填写');
        }
        const data = {
            departureMode: mode,
            departureTitle: this.readOptionalText(body.departureTitle ?? body.startTitle, 40),
            departureLatitude,
            departureLongitude,
            dropoffTitle: this.readOptionalText(body.dropoffTitle, 40),
            dropoffLatitude,
            dropoffLongitude,
        };
        if (mode === STUDY_DEPARTURE_MODES.VEHICLE) {
            data.vehiclePlateNo = this.readRequiredText(body.vehiclePlateNo ?? body.plateNo, '车牌号', 20);
            data.driverName = this.readRequiredText(body.driverName, '司机姓名', 20);
            const phone = this.readRequiredText(body.driverPhone, '司机手机号', 20);
            if (!/^1\d{10}$/.test(phone))
                throw new common_1.BadRequestException('司机手机号格式不正确');
            data.driverPhone = phone;
        }
        else {
            data.vehiclePlateNo = this.readOptionalText(body.vehiclePlateNo ?? body.plateNo, 20);
            data.driverName = this.readOptionalText(body.driverName, 20);
            data.driverPhone = this.readOptionalText(body.driverPhone, 20);
        }
        return data;
    }
    getDistanceMeters(lat1, lon1, lat2, lon2) {
        const earthRadius = 6371000;
        const dLat = this.toRadians(lat2 - lat1);
        const dLon = this.toRadians(lon2 - lon1);
        const rLat1 = this.toRadians(lat1);
        const rLat2 = this.toRadians(lat2);
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(rLat1) * Math.cos(rLat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return earthRadius * c;
    }
    toRadians(value) {
        return value * Math.PI / 180;
    }
    serializeCheckInResult(booking, group, viewerUserId, alreadyCheckedIn) {
        return {
            booking: this.serializeBooking(booking, group, viewerUserId),
            checkedInAt: booking.checkedInAt,
            alreadyCheckedIn,
            participantName: booking.participantName ?? booking.user?.nickname ?? '',
            studyNo: booking.user?.studyNo ?? '',
            projectId: booking.projectId,
            projectTitle: booking.project?.title ?? '',
        };
    }
    extractProjectCheckInPayload(body) {
        const raw = String(body.raw ?? body.qr ?? body.data ?? '').trim();
        if (raw.length === 0)
            throw new common_1.BadRequestException('未识别到项目签到码');
        const parsed = this.parseCheckInPayload(raw);
        if (parsed.type !== study_check_in_code_1.STUDY_PROJECT_CHECK_IN_TYPE) {
            throw new common_1.BadRequestException('请扫描管理端生成的项目签到码');
        }
        if (parsed.projectId.length === 0 || parsed.code.length === 0) {
            throw new common_1.BadRequestException('项目签到码格式不完整');
        }
        return { projectId: parsed.projectId, code: parsed.code };
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
    verifyRoutePointGateCode(projectId, point, payload) {
        const stored = this.readRoutePointGateNonce(point);
        const gotNonce = String((payload && payload.nonce) || '').trim();
        const gotCode = String((payload && payload.code) || '').trim();
        if (!gotCode)
            return false;
        if (stored) {
            if (gotNonce !== stored)
                return false;
            const expected = this.createRoutePointGatePayload(projectId, point.id, stored);
            const left = Buffer.from(expected.code);
            const right = Buffer.from(gotCode);
            return left.length === right.length && (0, crypto_1.timingSafeEqual)(left, right);
        }
        return (0, study_check_in_code_1.verifyStudyRoutePointCheckInCode)(projectId, point.id, gotCode);
    }
    async loadResourceMap(projectId) {
        try {
            await this.prisma.$executeRawUnsafe(`SELECT 1 FROM "StudyProjectResource" LIMIT 1`);
        }
        catch (_e) {
            return {};
        }
        const rows = await this.prisma.$queryRawUnsafe(`SELECT * FROM "StudyProjectResource" WHERE "projectId"=$1`, String(projectId || ''));
        const map = {};
        for (let i = 0; i < (rows || []).length; i++) {
            const r = rows[i];
            map[String(r.id)] = r;
        }
        return map;
    }
    applyResourceMapToSteps(steps, map) {
        if (!map || !steps)
            return steps;
        for (let i = 0; i < steps.length; i++) {
            const s = steps[i];
            const r = s && s.resourceId ? map[String(s.resourceId)] : null;
            if (!r)
                continue;
            if (s.type === 'video' && r.videoUrl)
                s.videoUrl = String(r.videoUrl || '');
            if (s.type === 'game' && r.gameUrl) {
                s.gameUrl = String(r.gameUrl || '');
                if (!s.gameName)
                    s.gameName = String(r.title || s.title || '');
                let cfgRaw = r.questions;
                if (typeof cfgRaw === 'string') {
                    try { cfgRaw = JSON.parse(cfgRaw); } catch (_err) { cfgRaw = null; }
                }
                if (cfgRaw && typeof cfgRaw === 'object' && !Array.isArray(cfgRaw)) {
                    if (s.maxRetries == null && cfgRaw.maxRetries != null)
                        s.maxRetries = this.readMaxRetries(cfgRaw.maxRetries);
                    if (cfgRaw.skippable != null)
                        s.skippable = this.readStepSkippable(cfgRaw.skippable);
                    if ((!s.scoreTiers || !s.scoreTiers.length) && (cfgRaw.scoreTiers || cfgRaw.scorePointTiers))
                        s.scoreTiers = this.normalizeScoreTiers(cfgRaw.scoreTiers || cfgRaw.scorePointTiers);
                }
            }
            if (s.type === 'task' && r.taskBody)
                s.taskBody = String(r.taskBody || '');
            if (s.type === 'quiz' && r.questions) {
                let qs = r.questions;
                if (typeof qs === 'string') {
                    try { qs = JSON.parse(qs); } catch (_err) { qs = []; }
                }
                if (Array.isArray(qs) && qs.length)
                    s.questions = qs.map((q) => this.normalizeQuizQuestion(q));
            }
        }
        return steps;
    }
    normalizeStationSteps(value, point, pack) {
        const types = { video: true, quiz: true, task: true, game: true };
        let raw = value;
        if (raw == null && pack)
            raw = pack.stationSteps;
        if (typeof raw === 'string') {
            try { raw = JSON.parse(raw); } catch (_err) { raw = []; }
        }
        const out = [];
        if (Array.isArray(raw)) {
            for (let i = 0; i < raw.length && out.length < 20; i++) {
                const item = raw[i];
                if (item == null || typeof item !== 'object')
                    continue;
                const type = String(item.type || '').trim();
                if (!types[type])
                    continue;
                const titleDefault = type === 'video' ? '讲解视频' : (type === 'quiz' ? '趣味答题' : (type === 'game' ? '研学小游戏' : '现场任务'));
                const step = {
                    id: String(item.id || ('s' + i)).trim() || ('s' + i),
                    type,
                    title: String(item.title || '').trim() || titleDefault,
                    resourceId: String(item.resourceId || '').trim(),
                    videoUrl: String(item.videoUrl || '').trim(),
                    questions: [],
                    taskBody: String(item.taskBody || item.body || '').trim(),
                    gameUrl: String(item.gameUrl || '').trim(),
                    gameName: String(item.gameName || '').trim(),
                    passScore: this.readPassScore(item.passScore),
                    skippable: this.readStepSkippable(item.skippable),
                    points: this.readStepPoints(item.points),
                    maxRetries: this.readMaxRetries(item.maxRetries),
                    scoreTiers: this.normalizeScoreTiers(item.scoreTiers || item.scorePointTiers),
                };
                if (type === 'quiz') {
                    try { step.questions = this.readKnowledgeQuestions(item.questions, false); }
                    catch (_e) { step.questions = []; }
                }
                out.push(step);
            }
        }
        if (out.length > 0)
            return out;
        const steps = [];
        const videoUrl = String((point && point.knowledgeVideoUrl) || (pack && pack.knowledgeVideoUrl) || '').trim();
        if (videoUrl) {
            steps.push({
                id: 'legacy_video',
                type: 'video',
                title: String((point && point.knowledgeVideoTitle) || '本站讲解').trim() || '本站讲解',
                videoUrl,
                questions: [],
                taskBody: '',
                gameUrl: '',
                gameName: '',
                passScore: null,
            });
        }
        let questions = [];
        try { questions = this.flattenKnowledgeItems(this.getKnowledgeItems(point)); } catch (_e) { questions = []; }
        if (questions.length > 0) {
            steps.push({
                id: 'legacy_quiz',
                type: 'quiz',
                title: '趣味答题',
                videoUrl: '',
                questions,
                taskBody: '',
                gameUrl: '',
                gameName: '',
                passScore: null,
            });
        }
        const taskBody = String((pack && pack.offlineTaskBody) || '').trim();
        if (taskBody) {
            steps.push({
                id: 'legacy_task',
                type: 'task',
                title: String((pack && pack.offlineTaskTitle) || '现场趣味任务').trim() || '现场趣味任务',
                videoUrl: '',
                questions: [],
                taskBody,
                gameUrl: '',
                gameName: '',
                passScore: null,
            });
        }
        return steps;
    }
    serializeStationStepsPublic(steps) {
        const out = [];
        for (let i = 0; i < (steps || []).length; i++) {
            const s = steps[i];
            if (s.type === 'video' && !s.videoUrl)
                continue;
            if (s.type === 'quiz' && (!s.questions || s.questions.length === 0))
                continue;
            if (s.type === 'task' && !s.taskBody)
                continue;
            if (s.type === 'game' && !s.gameUrl)
                continue;
            const row = {
                id: s.id, type: s.type, title: s.title, videoUrl: '', questions: [], taskBody: '', gameUrl: '', gameName: '',
                passScore: null, skippable: this.readStepSkippable(s.skippable), points: this.readStepPoints(s.points),
                maxRetries: this.readMaxRetries(s.maxRetries), scoreTiers: this.normalizeScoreTiers(s.scoreTiers),
            };
            if (s.type === 'video')
                row.videoUrl = s.videoUrl;
            if (s.type === 'quiz') {
                row.questions = (s.questions || []).map((q) => {
                    const nq = this.normalizeQuizQuestion(q);
                    return {
                        id: nq.id,
                        question: nq.question || '',
                        options: Array.isArray(nq.options) ? nq.options : [],
                        multiSelect: nq.multiSelect === true,
                        partialMode: nq.partialMode || 'none',
                    };
                });
            }
            if (s.type === 'task')
                row.taskBody = s.taskBody;
            if (s.type === 'game') {
                row.gameUrl = s.gameUrl;
                row.gameName = s.gameName || s.title;
                row.passScore = this.readPassScore(s.passScore);
            }
            out.push(row);
        }
        return out;
    }
    readStationProgress(booking, pointId) {
        const plan = this.normalizeTripPlan(booking && booking.tripPlan);
        const sp = (plan.stationProgress && typeof plan.stationProgress === 'object') ? plan.stationProgress : {};
        const cur = sp[pointId] || {};
        return this.mutateStationProgress(cur);
    }

    extractRoutePointCheckInPayload(body) {
        const raw = String(body.raw ?? body.qr ?? body.data ?? '').trim();
        if (raw.length === 0)
            throw new common_1.BadRequestException('请扫描打卡点二维码');
        const parsed = this.parseCheckInPayload(raw);
        if (parsed.type !== study_check_in_code_1.STUDY_ROUTE_POINT_CHECK_IN_TYPE) {
            throw new common_1.BadRequestException('请扫描管理端生成的打卡点二维码');
        }
        if (parsed.projectId.length === 0 || parsed.routePointId.length === 0 || parsed.code.length === 0) {
            throw new common_1.BadRequestException('打卡点二维码格式不完整');
        }
        return { projectId: parsed.projectId, routePointId: parsed.routePointId, code: parsed.code, nonce: parsed.nonce };
    }
    extractCheckInUserPayload(body) {
        const raw = String(body.raw ?? body.qr ?? body.code ?? body.data ?? body.studyNo ?? body.userId ?? '').trim();
        if (raw.length === 0)
            return { target: '', payloadProjectId: '' };
        const parsed = this.parseCheckInPayload(raw);
        if (parsed.userId.length > 0)
            return { target: parsed.userId, payloadProjectId: parsed.projectId };
        if (parsed.studyNo.length > 0)
            return { target: parsed.studyNo, payloadProjectId: parsed.projectId };
        const studyNo = String(body.studyNo ?? '').trim();
        if (studyNo.length > 0)
            return { target: studyNo, payloadProjectId: parsed.projectId };
        const userId = String(body.userId ?? '').trim();
        if (userId.length > 0)
            return { target: userId, payloadProjectId: parsed.projectId };
        return { target: raw, payloadProjectId: parsed.projectId };
    }
    parseCheckInPayload(raw) {
        const text = String(raw ?? '').trim();
        const result = { type: '', projectId: '', routePointId: '', userId: '', studyNo: '', code: '', nonce: '' };
        if (text.length === 0)
            return result;
        try {
            const parsed = JSON.parse(text);
            result.type = String(parsed.type ?? '').trim();
            result.projectId = String(parsed.projectId ?? parsed.pid ?? '').trim();
            result.routePointId = String(parsed.routePointId ?? parsed.pointId ?? parsed.rpid ?? '').trim();
            result.userId = String(parsed.userId ?? parsed.uid ?? '').trim();
            result.studyNo = String(parsed.studyNo ?? parsed.study_no ?? '').trim();
            result.code = String(parsed.code ?? parsed.checkInCode ?? parsed.check_in_code ?? '').trim();
            result.nonce = String(parsed.nonce ?? parsed.n ?? '').trim();
            return result;
        }
        catch {
        }
        const pairs = text.split('|');
        for (let i = 0; i < pairs.length; i++) {
            const pair = pairs[i];
            const separator = pair.indexOf('=');
            if (separator <= 0)
                continue;
            const key = pair.substring(0, separator).trim();
            const value = pair.substring(separator + 1).trim();
            if (key === 'type')
                result.type = value;
            if (key === 'projectId' || key === 'pid')
                result.projectId = value;
            if (key === 'routePointId' || key === 'pointId' || key === 'rpid')
                result.routePointId = value;
            if (key === 'userId' || key === 'uid')
                result.userId = value;
            if (key === 'studyNo' || key === 'study_no')
                result.studyNo = value;
            if (key === 'code' || key === 'checkInCode' || key === 'check_in_code')
                result.code = value;
        }
        if (result.projectId.length === 0 && result.userId.length === 0 && result.studyNo.length === 0) {
            result.studyNo = text;
        }
        return result;
    }
    async selectedTravelersContainExternalUser(userId, body) {
        const travelerIds = this.extractStringList(body.travelerIds);
        if (travelerIds.length === 0)
            return false;
        const travelers = await this.prisma.traveler.findMany({
            where: { userId, id: { in: travelerIds } },
            select: { id: true, isSelf: true },
        });
        if (travelers.length !== travelerIds.length) {
            throw new common_1.BadRequestException('Some travelers are invalid');
        }
        for (let i = 0; i < travelers.length; i++) {
            if (!travelers[i].isSelf)
                return true;
        }
        return false;
    }
    createOrganizerParticipant(userId, booker) {
        return {
            userId,
            name: String(booker.realName ?? booker.nickname ?? '组织者').trim(),
            phone: String(booker.phone ?? '').trim(),
            idCard: String(booker.realNameIdCard ?? '').trim(),
            role: 'ORGANIZER',
        };
    }
    async resolveBookingParticipants(userId, body, booker) {
        const travelerIds = this.extractStringList(body.travelerIds);
        if (travelerIds.length === 0) {
            throw new common_1.BadRequestException('请至少选择一位游客');
        }
        const travelers = await this.prisma.traveler.findMany({
            where: { userId, id: { in: travelerIds } },
            orderBy: [{ isSelf: 'desc' }, { createdAt: 'desc' }],
        });
        if (travelers.length !== travelerIds.length) {
            throw new common_1.BadRequestException('Some travelers are invalid');
        }
        const orderedTravelers = [];
        for (let i = 0; i < travelerIds.length; i++) {
            for (let j = 0; j < travelers.length; j++) {
                if (travelers[j].id === travelerIds[i]) {
                    orderedTravelers.push(travelers[j]);
                    break;
                }
            }
        }
        const participants = [];
        const seenUserIds = [];
        for (let i = 0; i < orderedTravelers.length; i++) {
            const traveler = orderedTravelers[i];
            const phone = String(traveler.phone ?? '').trim();
            if (!/^1\d{10}$/.test(phone)) {
                throw new common_1.BadRequestException('Traveler phone is invalid');
            }
            let participantUser = null;
            if (traveler.isSelf) {
                if (!this.matchRealName(booker.realName, booker.realNameIdCard, traveler.name, traveler.idCard)) {
                    throw new common_1.BadRequestException('本人游客信息与实名认证信息不一致，请刷新游客列表后重试');
                }
                participantUser = booker;
            }
            else {
                participantUser = await this.findOrCreateParticipantUser(phone, String(traveler.name ?? '').trim());
            }
            if (seenUserIds.includes(participantUser.id)) {
                continue;
            }
            seenUserIds.push(participantUser.id);
            participants.push({
                userId: participantUser.id,
                name: String(traveler.name ?? '').trim(),
                phone,
                idCard: String(traveler.idCard ?? '').trim(),
                role: participantUser.id === userId ? 'BOOKER' : 'TRAVELER',
            });
        }
        return participants;
    }
    async findOrCreateParticipantUser(phone, name) {
        const existed = await this.prisma.user.findUnique({ where: { phone } });
        if (existed)
            return existed;
        try {
            return await this.prisma.user.create({
                data: {
                    phone,
                    nickname: name || '研学学员',
                    studyNo: await this.studyNo.issue(),
                },
            });
        }
        catch (error) {
            if (this.isUniqueConstraintError(error)) {
                const latest = await this.prisma.user.findUnique({ where: { phone } });
                if (latest)
                    return latest;
            }
            throw error;
        }
    }
    async resolveAdditionalParticipants(userId, body) {
        const travelerIds = this.extractStringList(body.travelerIds);
        const singleTravelerId = String(body.travelerId ?? '').trim();
        if (singleTravelerId.length > 0 && !travelerIds.includes(singleTravelerId))
            travelerIds.push(singleTravelerId);
        if (travelerIds.length > 0) {
            const travelers = await this.prisma.traveler.findMany({
                where: { userId, id: { in: travelerIds } },
            });
            if (travelers.length !== travelerIds.length) {
                throw new common_1.BadRequestException('Some travelers are invalid');
            }
            const orderedTravelers = [];
            for (let i = 0; i < travelerIds.length; i++) {
                for (let j = 0; j < travelers.length; j++) {
                    if (travelers[j].id === travelerIds[i]) {
                        orderedTravelers.push(travelers[j]);
                        break;
                    }
                }
            }
            const participants = [];
            for (let i = 0; i < orderedTravelers.length; i++) {
                const traveler = orderedTravelers[i];
                if (traveler.isSelf) {
                    throw new common_1.BadRequestException('本人已在订单中，无需重复添加');
                }
                const phone = String(traveler.phone ?? '').trim();
                if (!/^1\d{10}$/.test(phone)) {
                    throw new common_1.BadRequestException('Traveler phone is invalid');
                }
                const participantUser = await this.findOrCreateParticipantUser(phone, String(traveler.name ?? '').trim());
                participants.push({
                    userId: participantUser.id,
                    name: String(traveler.name ?? '').trim(),
                    phone,
                    idCard: String(traveler.idCard ?? '').trim(),
                    role: 'TRAVELER',
                });
            }
            return participants;
        }
        const name = String(body.name ?? body.participantName ?? '').trim();
        const phone = String(body.phone ?? body.participantPhone ?? '').trim();
        const idCard = String(body.idCard ?? body.participantIdCard ?? '').trim().toUpperCase();
        if (name.length < 2 || name.length > 30) {
            throw new common_1.BadRequestException('请输入正确的游客姓名');
        }
        if (!/^1\d{10}$/.test(phone)) {
            throw new common_1.BadRequestException('请输入正确的游客手机号');
        }
        if (!/^\d{17}[\dX]$/.test(idCard)) {
            throw new common_1.BadRequestException('请输入正确的游客身份证号');
        }
        const participantUser = await this.findOrCreateParticipantUser(phone, name);
        if (participantUser.id === userId) {
            throw new common_1.BadRequestException('本人已在订单中，无需重复添加');
        }
        return [{
                userId: participantUser.id,
                name,
                phone,
                idCard,
                role: 'TRAVELER',
            }];
    }
    async assertStudyProjectOrganizer(projectId, userId) {
        const organizer = await this.prisma.studyProjectOrganizer.findUnique({
            where: { projectId_userId: { projectId, userId } },
        });
        if (!organizer) {
            throw new common_1.BadRequestException('仅项目组织者可添加其他游客');
        }
    }
    async assertStudyProjectExists(projectId) {
        const project = await this.prisma.studyProject.findUnique({
            where: { id: projectId },
            select: { id: true },
        });
        if (!project)
            throw new common_1.NotFoundException('Study project not found');
    }
    isUniqueConstraintError(error) {
        return typeof error === 'object' && error != null && error.code === 'P2002';
    }
    extractStringList(value) {
        if (!Array.isArray(value))
            return [];
        const list = [];
        for (let i = 0; i < value.length; i++) {
            const text = String(value[i] ?? '').trim();
            if (text.length > 0 && !list.includes(text))
                list.push(text);
        }
        return list;
    }
    async assertParticipantsNotBooked(projectId, userIds) {
        const existed = await this.prisma.studyBooking.findMany({
            where: {
                projectId,
                userId: { in: userIds },
                userDeletedAt: null,
                status: { not: client_1.BookingStatus.CANCELLED },
            },
            include: { user: true },
            take: 1,
        });
        if (existed.length > 0) {
            const name = existed[0].participantName || existed[0].user.nickname || existed[0].participantPhone || '所选游客';
            throw new common_1.BadRequestException(`${name} 已预约过该项目`);
        }
    }
    async getBookingGroupBookings(groupId) {
        return this.prisma.studyBooking.findMany({
            where: { bookingGroupId: groupId },
            include: { project: true, user: true },
            orderBy: [{ participantIndex: 'asc' }, { createdAt: 'asc' }],
        });
    }
    async getGroupsForBookings(bookings) {
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
            include: { project: true, user: true },
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
    serializeBooking(booking, group = [booking], viewerUserId) {
        const isGroupBooker = this.isBookingGroupBooker(booking);
        const visibleGroup = isGroupBooker || viewerUserId == null
            ? group
            : group.filter((item) => item.userId === viewerUserId);
        const participants = this.serializeParticipants(visibleGroup.length > 0 ? visibleGroup : [booking], viewerUserId);
        const groupAmount = this.resolveGroupAmount(booking, group);
        const pendingReady = booking.status === client_1.BookingStatus.PENDING && this.isBookingGroupReady(group);
        const tripSource = this.pickTripSourceBooking(booking, group);
        const trip = this.serializeTripFromBooking(tripSource);
        return {
            id: booking.id,
            projectId: booking.projectId,
            bookingGroupId: booking.bookingGroupId ?? booking.id,
            bookerId: booking.bookerId ?? booking.userId,
            isBooker: isGroupBooker,
            participantCount: this.countSeatBookings(group),
            participants,
            status: booking.status.toLowerCase(),
            amount: groupAmount,
            personalAmount: booking.amount.toString(),
            paidAt: booking.paidAt,
            cancelledAt: booking.cancelledAt,
            completedAt: booking.completedAt,
            checkedInAt: booking.checkedInAt,
            checkedInById: booking.checkedInById,
            userDeletedAt: booking.userDeletedAt,
            pendingReady: true,
            payable: isGroupBooker && booking.status === client_1.BookingStatus.UNPAID,
            confirmable: false,
            cancellable: isGroupBooker && booking.checkedInAt == null && (booking.status === client_1.BookingStatus.PENDING || booking.status === client_1.BookingStatus.UNPAID || booking.status === client_1.BookingStatus.BOOKED),
            createdAt: booking.createdAt,
            updatedAt: booking.updatedAt,
            project: this.serializeProject(booking.project),
            tripPlan: trip.tripPlan,
            rental: trip.rental,
            pickup: trip.pickup,
            routePointIds: trip.routePointIds,
            entranceCheckedIn: booking.checkedInAt != null,
            checkedInAt: booking.checkedInAt,
        };
    }
    serializeParticipants(group, viewerUserId) {
        const list = [];
        for (let i = 0; i < group.length; i++) {
            const item = group[i];
            const verification = this.resolveParticipantVerification(item);
            list.push({
                bookingId: item.id,
                userId: item.userId,
                name: item.participantName ?? item.user?.nickname ?? '',
                phone: item.participantPhone ?? item.user?.phone ?? '',
                idCard: item.participantIdCard ?? '',
                role: item.participantRole ?? 'BOOKER',
                status: item.status.toLowerCase(),
                isBooker: this.isBookingGroupBooker(item),
                isCurrentUser: viewerUserId != null && item.userId === viewerUserId,
                verificationStatus: verification.status,
                verificationLabel: verification.label,
                verificationMessage: verification.message,
                registered: verification.registered,
                realNameVerified: verification.realNameVerified,
                verified: verification.status === 'verified',
                canVerify: false,
                checkedInAt: item.checkedInAt,
                checkedInById: item.checkedInById ?? '',
            });
        }
        return list;
    }
    isBookingGroupReady(group) {
        if (group.length === 0)
            return false;
        for (let i = 0; i < group.length; i++) {
            if (this.resolveParticipantVerification(group[i]).status !== 'verified')
                return false;
        }
        return true;
    }
    resolveParticipantVerification(booking) {
        if (this.isBookingGroupBooker(booking)) {
            return {
                status: 'verified',
                label: '发起人',
                message: '预约发起人',
                registered: true,
                realNameVerified: true,
                matches: true,
            };
        }
        const user = booking.user;
        // Invitee visibility is by real-name match only (see claimBookingsByRealName / getBookings).
        if (user && this.isRegisteredUser(user) && user.realNameVerified && user.realName && user.realNameIdCard
            && this.matchRealName(user.realName, user.realNameIdCard, booking.participantName, booking.participantIdCard)) {
            return {
                status: 'verified',
                label: '已关联',
                message: '实名信息已匹配，自动获得该预约',
                registered: true,
                realNameVerified: true,
                matches: true,
            };
        }
        if (user && this.isRegisteredUser(user) && user.realNameVerified
            && !this.matchRealName(user.realName, user.realNameIdCard, booking.participantName, booking.participantIdCard)) {
            return {
                status: 'mismatch',
                label: '未匹配',
                message: '该参与人实名与订单填写不一致，不会出现在对方「我的研学」中',
                registered: true,
                realNameVerified: true,
                matches: false,
            };
        }
        return {
            status: 'pending_realname',
            label: '待对方实名',
            message: '对方完成实名且姓名、身份证与订单一致后，将自动出现在其「我的研学」',
            registered: !!(user && this.isRegisteredUser(user)),
            realNameVerified: !!(user && user.realNameVerified),
            matches: false,
        };
    }
    isRegisteredUser(user) {
        if (!user)
            return false;
        return String(user.openId ?? '').trim().length > 0 || String(user.passwordHash ?? '').trim().length > 0;
    }
    matchRealName(realName, idCard, expectedName, expectedIdCard) {
        const name = String(realName ?? '').trim();
        const expected = String(expectedName ?? '').trim();
        const card = String(idCard ?? '').trim().toUpperCase();
        const expectedCard = String(expectedIdCard ?? '').trim().toUpperCase();
        return name.length > 0 && expected.length > 0 && card.length > 0 && expectedCard.length > 0 && name === expected && card === expectedCard;
    }
    canAccessBookingGroup(userId, group) {
        for (let i = 0; i < group.length; i++) {
            if (group[i].userId === userId)
                return true;
        }
        return false;
    }
    async deleteEmptyPlaceholderUsers(group, currentBookingIds) {
        const candidateIds = [];
        for (let i = 0; i < group.length; i++) {
            const item = group[i];
            if (this.isBookingGroupBooker(item))
                continue;
            if (this.isRegisteredUser(item.user))
                continue;
            if (!candidateIds.includes(item.userId))
                candidateIds.push(item.userId);
        }
        if (candidateIds.length === 0)
            return;
        const users = await this.prisma.user.findMany({
            where: { id: { in: candidateIds } },
            include: {
                _count: {
                    select: {
                        travelers: true,
                        addresses: true,
                        invoiceTitles: true,
                        cartItems: true,
                        favorites: true,
                        orders: true,
                        feedbacks: true,
                    },
                },
            },
        });
        for (let i = 0; i < users.length; i++) {
            const user = users[i];
            if (this.isRegisteredUser(user))
                continue;
            if (user._count.travelers > 0 ||
                user._count.addresses > 0 ||
                user._count.invoiceTitles > 0 ||
                user._count.cartItems > 0 ||
                user._count.favorites > 0 ||
                user._count.orders > 0 ||
                user._count.feedbacks > 0 ||
                false) {
                continue;
            }
            const outsideBookingCount = await this.prisma.studyBooking.count({
                where: {
                    userId: user.id,
                    id: { notIn: currentBookingIds },
                },
            });
            if (outsideBookingCount > 0)
                continue;
            await this.prisma.user.delete({ where: { id: user.id } });
        }
    }
    resolveGroupAmount(booking, group) {
        for (let i = 0; i < group.length; i++) {
            if (this.isBookingGroupBooker(group[i]))
                return group[i].amount.toString();
        }
        return booking.amount.toString();
    }
    isBookingGroupBooker(booking) {
        const bookerId = booking.bookerId ?? booking.userId;
        return bookerId === booking.userId || booking.participantRole === 'BOOKER';
    }
    isSeatBooking(booking) {
        return booking.participantRole !== 'ORGANIZER';
    }
    countSeatBookings(group) {
        let count = 0;
        for (let i = 0; i < group.length; i++) {
            if (this.isSeatBooking(group[i]))
                count++;
        }
        return count;
    }

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
    parseDayOpsMap(raw) {
        let obj = raw;
        if (typeof raw === 'string') {
            try { obj = JSON.parse(raw); } catch (_e) { return {}; }
        }
        if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return {};
        return obj;
    }
    async readProjectLiveBooking(projectId) {
        await this.ensureLiveBookingSchema();
        try {
            const rows = await this.prisma.$queryRawUnsafe(
                `SELECT "bookableDays", "dayOps", "maxCapacity" FROM "StudyProject" WHERE id=$1`,
                String(projectId)
            );
            const row = rows && rows[0] ? rows[0] : null;
            return {
                bookableDays: this.clampBookableDays(row ? row.bookableDays : 7, 7),
                dayOps: this.parseDayOpsMap(row ? row.dayOps : {}),
                maxCapacity: row && row.maxCapacity != null ? Number(row.maxCapacity) : 0,
            };
        } catch (_e) {
            return { bookableDays: 7, dayOps: {}, maxCapacity: 0 };
        }
    }
    addShanghaiDays(dayKey, days) {
        const parts = String(dayKey).split('-').map((x) => parseInt(x, 10));
        if (parts.length < 3 || parts.some((n) => !Number.isFinite(n))) return '';
        const dt = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
        dt.setUTCDate(dt.getUTCDate() + Number(days || 0));
        const y = dt.getUTCFullYear();
        const m = String(dt.getUTCMonth() + 1).padStart(2, '0');
        const d = String(dt.getUTCDate()).padStart(2, '0');
        return y + '-' + m + '-' + d;
    }
    async countBookedSeatsForDay(projectId, dayKey, excludeGroupId) {
        const rows = await this.prisma.studyBooking.findMany({
            where: { projectId: String(projectId), status: client_1.BookingStatus.BOOKED },
            select: { id: true, bookingGroupId: true, participantRole: true, tripPlan: true },
            take: 3000,
        });
        let seats = 0;
        for (let i = 0; i < rows.length; i++) {
            const b = rows[i];
            const gid = b.bookingGroupId || b.id;
            if (excludeGroupId && String(gid) === String(excludeGroupId)) continue;
            if (b.participantRole === 'ORGANIZER') continue;
            const plan = this.normalizeTripPlan(b.tripPlan);
            const keys = Array.isArray(plan.dayKeys) ? plan.dayKeys : [];
            let hit = false;
            for (let k = 0; k < keys.length; k++) {
                if (String(keys[k]) === String(dayKey)) { hit = true; break; }
            }
            if (!hit && Array.isArray(plan.days)) {
                for (let d = 0; d < plan.days.length; d++) {
                    if (String(plan.days[d].dayKey || '') === String(dayKey)) { hit = true; break; }
                }
            }
            if (hit) seats += 1;
        }
        return seats;
    }
    // ===== Schedule-aware booking / content resolution =====
    async ensureStudyScheduleSchemaRuntime() {
        if (this._studyScheduleSchemaReady) return;
        try {
            await this.prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "StudyScheduleDay" (
              "id" TEXT PRIMARY KEY, "projectId" TEXT NOT NULL, "date" DATE NOT NULL,
              "open" BOOLEAN NOT NULL DEFAULT true, "capacity" INTEGER NULL, "note" TEXT NOT NULL DEFAULT '',
              "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(), "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
              UNIQUE ("projectId", "date"))`);
            await this.prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "StudyScheduleSpot" (
              "id" TEXT PRIMARY KEY, "dayId" TEXT NOT NULL, "routePointId" TEXT NOT NULL,
              "enabled" BOOLEAN NOT NULL DEFAULT true, "contentVersionId" TEXT NULL,
              "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(), "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
              UNIQUE ("dayId", "routePointId"))`);
            await this.prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "StudyContentVersion" (
              "id" TEXT PRIMARY KEY, "projectId" TEXT NOT NULL, "routePointId" TEXT NULL,
              "name" TEXT NOT NULL, "note" TEXT NOT NULL DEFAULT '',
              "stepsJson" JSONB NOT NULL DEFAULT '[]'::jsonb, "resourceIds" JSONB NOT NULL DEFAULT '[]'::jsonb,
              "isDefault" BOOLEAN NOT NULL DEFAULT false,
              "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(), "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
        } catch (_e) {}
        this._studyScheduleSchemaReady = true;
    }
    scheduleDateKeyRuntime(v) {
        const s = String(v || '').trim().slice(0, 10);
        return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : '';
    }
    async resolveScheduleForDay(projectId, dayKey) {
        await this.ensureStudyScheduleSchemaRuntime();
        const key = this.scheduleDateKeyRuntime(dayKey);
        const live = await this.readProjectLiveBooking(projectId);
        const ops = (live.dayOps && live.dayOps[key] && typeof live.dayOps[key] === 'object') ? live.dayOps[key] : {};
        const today = this.chinaDateKey();
        const endExclusive = this.addShanghaiDays(today, live.bookableDays);
        let hasRow = false;
        let scheduleOpen = true;
        let scheduleCapacity = null;
        let spots = [];
        try {
            const rows = await this.prisma.$queryRawUnsafe(
                `SELECT * FROM "StudyScheduleDay" WHERE "projectId"=$1 AND "date"=$2::date LIMIT 1`,
                String(projectId), key
            );
            if (rows && rows[0]) {
                hasRow = true;
                scheduleOpen = rows[0].open !== false && rows[0].open !== 'f';
                scheduleCapacity = rows[0].capacity == null ? null : Number(rows[0].capacity);
                const spotRows = await this.prisma.$queryRawUnsafe(
                    `SELECT * FROM "StudyScheduleSpot" WHERE "dayId"=$1`, rows[0].id
                );
                spots = (spotRows || []).map((s) => ({
                    routePointId: s.routePointId,
                    enabled: s.enabled !== false && s.enabled !== 'f',
                    contentVersionId: s.contentVersionId || null,
                }));
            }
        } catch (_e) {}
        // Priority: Live temp > schedule day > project default
        let open;
        if (ops.paused) open = false;
        else if (hasRow) open = !!scheduleOpen;
        else open = (key >= today && key < endExclusive); // fallback
        const capacity = (ops.capacity != null && Number.isFinite(Number(ops.capacity)))
            ? Math.max(0, Math.floor(Number(ops.capacity)))
            : (scheduleCapacity != null ? scheduleCapacity
                : (Number(live.maxCapacity) || 0));
        const closedFromSchedule = spots.filter((s) => !s.enabled).map((s) => s.routePointId);
        const closedFromLive = Array.isArray(ops.closedSpots) ? ops.closedSpots.map(String) : [];
        const closedSpots = Array.from(new Set(closedFromSchedule.concat(closedFromLive)));
        return {
            date: key,
            hasScheduleRow: hasRow,
            open,
            capacity,
            spots,
            closedSpots,
            ops,
            bookableDays: live.bookableDays,
            maxCapacity: live.maxCapacity,
            live,
        };
    }
    async listPublicScheduleDays(projectId, from, to) {
        await this.ensureStudyScheduleSchemaRuntime();
        const live = await this.readProjectLiveBooking(projectId);
        const today = this.chinaDateKey();
        const fromKey = this.scheduleDateKeyRuntime(from) || today;
        const toKey = this.scheduleDateKeyRuntime(to) || this.addShanghaiDays(today, live.bookableDays - 1);
        const days = [];
        let cur = fromKey;
        let guard = 0;
        while (cur <= toKey && guard < 400) {
            // eslint-disable-next-line no-await-in-loop
            const eff = await this.resolveScheduleForDay(projectId, cur);
            days.push({
                date: cur,
                open: !!eff.open,
                capacity: eff.capacity,
                hasScheduleRow: eff.hasScheduleRow,
                enabledSpotIds: (eff.spots || []).filter((s) => s.enabled).map((s) => s.routePointId),
                closedSpotIds: eff.closedSpots || [],
                // if no spot rows, all project spots considered enabled unless in closedSpots
                spotsConfigured: (eff.spots || []).length > 0,
            });
            cur = this.addShanghaiDays(cur, 1);
            guard++;
        }
        return {
            projectId: String(projectId),
            bookableDays: live.bookableDays,
            from: fromKey,
            to: toKey,
            days,
            fallbackRule: '若某日无 StudyScheduleDay 行：开放 = 落在 [today, today+bookableDays) 且 dayOps.paused 不为 true',
        };
    }
    async loadContentVersionSteps(contentVersionId) {
        if (!contentVersionId) return null;
        try {
            const rows = await this.prisma.$queryRawUnsafe(
                `SELECT "stepsJson" FROM "StudyContentVersion" WHERE id=$1 LIMIT 1`,
                String(contentVersionId)
            );
            if (!rows || !rows[0]) return null;
            let steps = rows[0].stepsJson;
            if (typeof steps === 'string') {
                try { steps = JSON.parse(steps); } catch (_e) { steps = []; }
            }
            return Array.isArray(steps) ? steps : null;
        } catch (_e) {
            return null;
        }
    }
    async resolveStationStepsForDay(projectId, point, dayKey) {
        const pack = (point.knowledgeItems && typeof point.knowledgeItems === 'object' && !Array.isArray(point.knowledgeItems))
            ? point.knowledgeItems : {};
        let steps = pack.stationSteps;
        // Live temp step override
        try {
            const live = await this.readProjectLiveBooking(projectId);
            const ops = live.dayOps && live.dayOps[dayKey] ? live.dayOps[dayKey] : null;
            if (ops && ops.stepOverrides && ops.stepOverrides[point.id] && Array.isArray(ops.stepOverrides[point.id].steps)) {
                steps = ops.stepOverrides[point.id].steps;
                return { steps, source: 'live_override', contentVersionId: null };
            }
        } catch (_e) {}
        // Schedule content version
        if (dayKey) {
            try {
                const eff = await this.resolveScheduleForDay(projectId, dayKey);
                const spot = (eff.spots || []).find((s) => s.routePointId === point.id);
                if (spot && spot.contentVersionId) {
                    const cvSteps = await this.loadContentVersionSteps(spot.contentVersionId);
                    if (cvSteps) return { steps: cvSteps, source: 'content_version', contentVersionId: spot.contentVersionId };
                }
            } catch (_e) {}
        }
        return { steps, source: 'project_default', contentVersionId: null };
    }


    async applyDayContentToPoint(projectId, point, dayKey) {
        /* schedule-steps-resolve */
        if (!point) return point;
        const resolved = await this.resolveStationStepsForDay(projectId, point, dayKey);
        if (resolved && resolved.steps != null) {
            const pack = (point.knowledgeItems && typeof point.knowledgeItems === 'object' && !Array.isArray(point.knowledgeItems))
                ? Object.assign({}, point.knowledgeItems) : {};
            pack.stationSteps = resolved.steps;
            pack._contentSource = resolved.source;
            pack._contentVersionId = resolved.contentVersionId;
            point = Object.assign({}, point, { knowledgeItems: pack });
        }
        return point;
    }


    primaryBookingDayKey(booking) {
        try {
            const plan = this.normalizeTripPlan(booking && booking.tripPlan);
            if (Array.isArray(plan.dayKeys) && plan.dayKeys.length) return String(plan.dayKeys[0]);
            if (Array.isArray(plan.days) && plan.days.length) return String(plan.days[0].dayKey || '');
        } catch (_e) {}
        return '';
    }

    async assertTripWithinBookableWindow(project, tripPlan, seatCount = 1, excludeGroupId = null) {
        /* schedule-assert */
        const live = await this.readProjectLiveBooking(project.id);
        const today = this.chinaDateKey();
        const endExclusive = this.addShanghaiDays(today, live.bookableDays);
        const keys = [];
        const plan = this.normalizeTripPlan(tripPlan);
        const raw = Array.isArray(plan.dayKeys) ? plan.dayKeys : [];
        for (let i = 0; i < raw.length; i++) {
            const k = String(raw[i] || '').trim();
            if (k && keys.indexOf(k) < 0) keys.push(k);
        }
        if (!keys.length && Array.isArray(plan.days)) {
            for (let i = 0; i < plan.days.length; i++) {
                const k = String(plan.days[i].dayKey || '').trim();
                if (k && keys.indexOf(k) < 0) keys.push(k);
            }
        }
        if (!keys.length) return live;
        for (let i = 0; i < keys.length; i++) {
            const dayKey = keys[i];
            if (!/^\d{4}-\d{2}-\d{2}$/.test(dayKey)) {
                throw new common_1.BadRequestException('行程日期格式无效：' + dayKey);
            }
            if (dayKey < today || dayKey >= endExclusive) {
                throw new common_1.BadRequestException('该日期不在可预约范围内（今天起 ' + live.bookableDays + ' 天）');
            }
            const eff = await this.resolveScheduleForDay(project.id, dayKey);
            if (!eff.open) {
                throw new common_1.BadRequestException(dayKey + (eff.hasScheduleRow ? ' 场次未开放' : ' 已暂停预约'));
            }
            const capacity = eff.capacity > 0 ? eff.capacity : (Number(live.maxCapacity) || Number(project.maxCapacity) || 0);
            if (capacity > 0) {
                const used = await this.countBookedSeatsForDay(project.id, dayKey, excludeGroupId);
                if (used + seatCount > capacity) {
                    throw new common_1.BadRequestException(dayKey + ' 当日名额已满');
                }
            }
        }
        return live;
    }

    assertProjectBookable(project, requestedSeats = 1) {
        if (project.status === '暂未开放') {
            throw new common_1.BadRequestException('Study project is not open for booking');
        }
        if (project.status === '正在进行中') {
            throw new common_1.BadRequestException('Study project is already in progress');
        }
        if (project.status === '已结束') {
            throw new common_1.BadRequestException('Study project has ended');
        }
        if (project.status === '预约满员') {
            throw new common_1.BadRequestException('Study project is full');
        }
        if (project.maxCapacity > 0 && project.enrolled + requestedSeats > project.maxCapacity) {
            throw new common_1.BadRequestException('Study project is full');
        }
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
    isActiveBookingStatus(status) {
        return status === client_1.BookingStatus.BOOKED || status === client_1.BookingStatus.COMPLETED;
    }
    async publicPlatformSettings() {
        const rows = await this.prisma.platformSetting.findMany();
        const map = {};
        for (let i = 0; i < (rows || []).length; i++)
            map[rows[i].key] = rows[i].value;
        const contactRaw = map['platform.contact'] && typeof map['platform.contact'] === 'object' ? map['platform.contact'] : {};
        let name = String(contactRaw.name || map['app.name'] || '蒙企链探');
        let phone = String(contactRaw.phone || map['app.servicePhone'] || '19931708002');
        if (name === '蒙启研学')
            name = '蒙企链探';
        if (phone === '400-000-0000' || phone === '4000000000')
            phone = '19931708002';
        const digits = phone.replace(/[-\s]/g, '');
        const contact = {
            name: name || '蒙企链探',
            phone: digits || '19931708002',
            hours: String(contactRaw.hours || '工作日 09:00–18:00'),
            email: String(contactRaw.email || '203790885@qq.com'),
        };
        const dicts = Object.assign({
            noticeTypes: ['测试分类'],
            articleTags: ['感受', '宣传', '研学', '亲子', '攻略', '路线'],
            mallCategories: ['文具礼品', '生活用品'],
            contentChannels: [{ key: 'all', label: '全部' }, { key: 'test', label: '测试分类' }],
            routeZones: [{ key: 'test', label: '测试分类' }],
        }, (map['platform.dicts'] && typeof map['platform.dicts'] === 'object') ? map['platform.dicts'] : {});
        return {
            contact,
            dicts,
            legal: {
                agreement: (map['legal.agreement'] && typeof map['legal.agreement'] === 'object') ? map['legal.agreement'] : null,
                privacy: (map['legal.privacy'] && typeof map['legal.privacy'] === 'object') ? map['legal.privacy'] : null,
            },
            features: {
                rental: map['feature.rental'] !== false,
                aiPlan: map['feature.aiPlan'] !== false,
            },
            splash: splash_announcement_1.publicSplashAnnouncement(map['mp.splashAnnouncement']),
        };
    }
    // ========== RentalOrder V2 Phase A+B+C ==========
    // TTL: negotiate 60min → OPEN; unpaid after PRICE_CONFIRMED 2h → CANCELLED
    // Checked on read/list/mutate (cron-less). Documented in rental-v2-phase-b-done.md
    RENTAL_NEGOTIATE_TTL_MS() { return 60 * 60 * 1000; }
    RENTAL_UNPAID_TTL_MS() { return 2 * 60 * 60 * 1000; }

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
                  "priceConfirmedAt" TIMESTAMP,
                  "paidAt" TIMESTAMP,
                  "cancelledAt" TIMESTAMP,
                  "cancelReason" TEXT,
                  "createdAt" TIMESTAMP DEFAULT NOW(),
                  "updatedAt" TIMESTAMP DEFAULT NOW()
                )`);
            await this.prisma.$executeRawUnsafe(`ALTER TABLE "RentalOrder" ADD COLUMN IF NOT EXISTS "priceConfirmedAt" TIMESTAMP`);
            await this.prisma.$executeRawUnsafe(`ALTER TABLE "RentalOrder" ADD COLUMN IF NOT EXISTS "startedAt" TIMESTAMP`);
            await this.prisma.$executeRawUnsafe(`ALTER TABLE "RentalOrder" ADD COLUMN IF NOT EXISTS "completedAt" TIMESTAMP`);
            await this.prisma.$executeRawUnsafe(`ALTER TABLE "RentalOrder" ADD COLUMN IF NOT EXISTS "walletCreditedAt" TIMESTAMP`);
            await this.prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "RentalOrder_status_createdAt_idx" ON "RentalOrder" (status, "createdAt")`);
            await this.prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "RentalOrder_userId_createdAt_idx" ON "RentalOrder" ("userId", "createdAt")`);
            await this.prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "RentalOrder_driverId_status_idx" ON "RentalOrder" ("driverId", status)`);
            await this.prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "RentalOrder_projectId_idx" ON "RentalOrder" ("projectId")`);
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

    makeRentalOrderNo() {
        const d = new Date();
        const pad = (n) => String(n).padStart(2, '0');
        const stamp = String(d.getFullYear()).slice(2) + pad(d.getMonth() + 1) + pad(d.getDate()) + pad(d.getHours()) + pad(d.getMinutes());
        const rand = (0, crypto_1.randomUUID)().replace(/-/g, '').slice(0, 6).toUpperCase();
        return 'RO' + stamp + rand;
    }

    rentalStatusLabel(status) {
        const s = String(status || '').toUpperCase();
        const map = {
            OPEN: '派单中',
            NEGOTIATING: '协商中',
            PRICE_CONFIRMED: '待支付',
            PAID: '已支付',
            EN_ROUTE: '出车中',
            ARRIVED: '已到达',
            IN_TRIP: '行程中',
            COMPLETED: '已完成',
            CANCELLED: '已取消',
        };
        return map[s] || s || '未知';
    }

    serializeRentalOrder(row, extras = {}) {
        if (!row) return null;
        const status = String(row.status || 'OPEN').toUpperCase();
        const ref = row.refPrice != null ? Number(row.refPrice) : null;
        const offered = row.offeredPrice != null ? Number(row.offeredPrice) : null;
        const agreed = row.agreedPrice != null ? Number(row.agreedPrice) : null;
        const payableAmount = agreed != null ? agreed : offered;
        return {
            id: row.id,
            orderNo: row.orderNo,
            userId: row.userId,
            projectId: row.projectId,
            projectTitle: extras.projectTitle || '',
            bookingId: row.bookingId || null,
            travelDate: row.travelDate || null,
            dateFrom: row.dateFrom || null,
            dateTo: row.dateTo || null,
            travelDateText: row.travelDate ? String(row.travelDate).slice(0, 10) : (row.dateFrom ? String(row.dateFrom).slice(0, 10) : ''),
            passengerCount: Number(row.passengerCount || 1),
            vehicleRange: row.vehicleRange || '',
            pickupAddress: row.pickupAddress || '',
            pickupLatitude: row.pickupLatitude != null ? Number(row.pickupLatitude) : null,
            pickupLongitude: row.pickupLongitude != null ? Number(row.pickupLongitude) : null,
            remark: row.remark || '',
            status,
            statusLabel: this.rentalStatusLabel(status),
            driverId: row.driverId || null,
            driverUserId: row.driverUserId || null,
            driverName: extras.driverName || '',
            driverPhone: extras.driverPhone || '',
            claimedAt: row.claimedAt || null,
            priceConfirmedAt: row.priceConfirmedAt || null,
            refPrice: ref,
            offeredPrice: offered,
            agreedPrice: agreed,
            payableAmount: payableAmount != null ? payableAmount : null,
            refPriceText: ref != null ? ('¥' + ref.toFixed(2)) : '',
            offeredPriceText: offered != null ? ('¥' + offered.toFixed(2)) : '',
            agreedPriceText: agreed != null ? ('¥' + agreed.toFixed(2)) : '',
            payableAmountText: payableAmount != null ? ('¥' + Number(payableAmount).toFixed(2)) : '',
            paidAt: row.paidAt || null,
            startedAt: row.startedAt || null,
            completedAt: row.completedAt || null,
            walletCreditedAt: row.walletCreditedAt || null,
            cancelledAt: row.cancelledAt || null,
            cancelReason: row.cancelReason || '',
            createdAt: row.createdAt,
            updatedAt: row.updatedAt,
            timeText: row.createdAt ? String(row.createdAt).slice(0, 16).replace('T', ' ') : '',
            orderType: 'rental',
            typeTag: '租车',
        };
    }

    async enrichRentalOrder(row) {
        if (!row) return null;
        let projectTitle = '';
        let driverName = '';
        let driverPhone = '';
        try {
            if (row.projectId) {
                const p = await this.prisma.studyProject.findUnique({ where: { id: row.projectId }, select: { title: true } });
                if (p) projectTitle = p.title || '';
            }
        } catch (_e) { }
        try {
            if (row.driverId) {
                const d = await this.prisma.driverProfile.findUnique({ where: { id: row.driverId } });
                if (d) {
                    driverName = d.realName || '';
                    driverPhone = d.phone || '';
                }
            }
        } catch (_e) { }
        return this.serializeRentalOrder(row, { projectTitle, driverName, driverPhone });
    }

    async appendRentalSystemMessage(orderId, content) {
        try {
            await this.ensureRentalOrderTable();
            const id = (0, crypto_1.randomUUID)().replace(/-/g, '');
            await this.prisma.$executeRawUnsafe(
                `INSERT INTO "RentalChatMessage" (id, "orderId", "senderType", "senderId", content, "createdAt")
                 VALUES ($1,$2,'system',NULL,$3,NOW())`,
                id, orderId, String(content || '').slice(0, 500)
            );
        } catch (_e) { }
    }

    async expireRentalTimeoutsForRow(row) {
        if (!row) return row;
        const status = String(row.status || '').toUpperCase();
        const now = Date.now();
        if (status === 'NEGOTIATING' && row.claimedAt) {
            const claimedMs = new Date(row.claimedAt).getTime();
            if (Number.isFinite(claimedMs) && now - claimedMs > this.RENTAL_NEGOTIATE_TTL_MS()) {
                await this.prisma.$executeRawUnsafe(
                    `UPDATE "RentalOrder" SET
                        status='OPEN', "driverId"=NULL, "driverUserId"=NULL, "claimedAt"=NULL,
                        "offeredPrice"=NULL, "agreedPrice"=NULL, "priceConfirmedAt"=NULL, "updatedAt"=NOW()
                     WHERE id=$1 AND status='NEGOTIATING'`,
                    row.id
                );
                await this.appendRentalSystemMessage(row.id, '协商超时，订单已退回派单池');
                const after = await this.prisma.$queryRawUnsafe(`SELECT * FROM "RentalOrder" WHERE id=$1`, row.id);
                return (after && after[0]) || row;
            }
        }
        if (status === 'PRICE_CONFIRMED') {
            const base = row.priceConfirmedAt || row.updatedAt;
            if (base) {
                const baseMs = new Date(base).getTime();
                if (Number.isFinite(baseMs) && now - baseMs > this.RENTAL_UNPAID_TTL_MS()) {
                    await this.prisma.$executeRawUnsafe(
                        `UPDATE "RentalOrder" SET
                            status='CANCELLED', "cancelledAt"=NOW(), "cancelReason"=$2, "updatedAt"=NOW()
                         WHERE id=$1 AND status='PRICE_CONFIRMED'`,
                        row.id, '确认价后超时未支付'
                    );
                    await this.appendRentalSystemMessage(row.id, '超时未支付，订单已取消');
                    const after = await this.prisma.$queryRawUnsafe(`SELECT * FROM "RentalOrder" WHERE id=$1`, row.id);
                    return (after && after[0]) || row;
                }
            }
        }
        return row;
    }

    async sweepRentalTimeouts(limit = 40) {
        await this.ensureRentalOrderTable();
        try {
            const rows = await this.prisma.$queryRawUnsafe(
                `SELECT * FROM "RentalOrder" WHERE status IN ('NEGOTIATING','PRICE_CONFIRMED') ORDER BY "updatedAt" ASC LIMIT $1`,
                Math.max(1, Math.min(100, Number(limit) || 40))
            );
            for (let i = 0; i < (rows || []).length; i++) {
                await this.expireRentalTimeoutsForRow(rows[i]);
            }
        } catch (_e) { }
    }

    async createRentalOrder(userId, body = {}) {
        await this.ensureRentalOrderTable();
        const projectId = String(body.projectId || '').trim();
        if (!projectId) throw new common_1.BadRequestException('请选择研学项目');
        const project = await this.prisma.studyProject.findUnique({ where: { id: projectId } });
        if (!project) throw new common_1.NotFoundException('研学项目不存在');
        const passengerCount = Math.max(1, Math.min(99, Number(body.passengerCount || body.seats || 1) || 1));
        const travelRaw = String(body.travelDate || body.date || body.dateFrom || '').trim();
        let travelDate = null;
        let dateFrom = null;
        let dateTo = null;
        if (travelRaw) {
            const d = new Date(travelRaw);
            if (!Number.isNaN(d.getTime())) {
                travelDate = d;
                dateFrom = d;
            }
        }
        const toRaw = String(body.dateTo || '').trim();
        if (toRaw) {
            const d2 = new Date(toRaw);
            if (!Number.isNaN(d2.getTime())) dateTo = d2;
        }
        if (!travelDate) throw new common_1.BadRequestException('请选择出行日期');
        const bookingId = String(body.bookingId || '').trim() || null;
        if (bookingId) {
            const bk = await this.prisma.studyBooking.findFirst({ where: { id: bookingId, userId } });
            if (!bk) throw new common_1.BadRequestException('关联预约不存在或不属于当前用户');
        }
        const vehicleRange = String(body.vehicleRange || body.rentalOptionId || body.vehicleType || '').trim() || null;
        const pickupAddress = String(body.pickupAddress || body.pickup || '').trim();
        if (!pickupAddress) throw new common_1.BadRequestException('请填写上车点');
        const pickupLatitude = body.pickupLatitude != null ? Number(body.pickupLatitude) : (body.pickupLat != null ? Number(body.pickupLat) : null);
        const pickupLongitude = body.pickupLongitude != null ? Number(body.pickupLongitude) : (body.pickupLng != null ? Number(body.pickupLng) : null);
        const remark = String(body.remark || body.note || '').trim().slice(0, 500);
        const id = (0, crypto_1.randomUUID)().replace(/-/g, '');
        const orderNo = this.makeRentalOrderNo();
        await this.prisma.$executeRawUnsafe(
            `INSERT INTO "RentalOrder" (
                id, "orderNo", "userId", "projectId", "bookingId",
                "travelDate", "dateFrom", "dateTo", "passengerCount", "vehicleRange",
                "pickupAddress", "pickupLatitude", "pickupLongitude", remark, status,
                "createdAt", "updatedAt"
            ) VALUES (
                $1,$2,$3,$4,$5,
                $6,$7,$8,$9,$10,
                $11,$12,$13,$14,'OPEN',
                NOW(), NOW()
            )`,
            id, orderNo, userId, projectId, bookingId,
            travelDate, dateFrom, dateTo, passengerCount, vehicleRange,
            pickupAddress,
            (pickupLatitude != null && Number.isFinite(pickupLatitude) ? pickupLatitude : null),
            (pickupLongitude != null && Number.isFinite(pickupLongitude) ? pickupLongitude : null),
            remark || null
        );
        await this.appendRentalSystemMessage(id, '租车需求已进入派单池，等待司机接单');
        const rows = await this.prisma.$queryRawUnsafe(`SELECT * FROM "RentalOrder" WHERE id=$1`, id);
        return this.enrichRentalOrder(rows && rows[0]);
    }

    async listMyRentalOrders(userId, query = {}) {
        await this.ensureRentalOrderTable();
        await this.sweepRentalTimeouts(30);
        const status = String(query.status || '').trim().toUpperCase();
        let rows;
        if (status && status !== 'ALL') {
            rows = await this.prisma.$queryRawUnsafe(
                `SELECT * FROM "RentalOrder" WHERE "userId"=$1 AND status=$2 ORDER BY "createdAt" DESC LIMIT 100`,
                userId, status
            );
        } else {
            rows = await this.prisma.$queryRawUnsafe(
                `SELECT * FROM "RentalOrder" WHERE "userId"=$1 ORDER BY "createdAt" DESC LIMIT 100`,
                userId
            );
        }
        const items = [];
        for (let i = 0; i < (rows || []).length; i++) {
            const expired = await this.expireRentalTimeoutsForRow(rows[i]);
            items.push(await this.enrichRentalOrder(expired));
        }
        return { items, total: items.length };
    }

    async getRentalOrderDetail(userId, id) {
        await this.ensureRentalOrderTable();
        const orderId = String(id || '').trim();
        if (!orderId) throw new common_1.BadRequestException('缺少订单 id');
        let rows = await this.prisma.$queryRawUnsafe(`SELECT * FROM "RentalOrder" WHERE id=$1`, orderId);
        let row = rows && rows[0];
        if (!row) throw new common_1.NotFoundException('租车单不存在');
        row = await this.expireRentalTimeoutsForRow(row);
        const driver = await this.prisma.driverProfile.findUnique({ where: { userId } }).catch(() => null);
        const isOwner = row.userId === userId;
        const isClaimedDriver = driver && row.driverId && row.driverId === driver.id;
        if (!isOwner && !isClaimedDriver) {
            if (driver && String(row.status).toUpperCase() === 'OPEN') {
                return this.enrichRentalOrder(row);
            }
            throw new common_1.NotFoundException('租车单不存在');
        }
        return this.enrichRentalOrder(row);
    }

    async listOpenRentalPool(userId, query = {}) {
        await this.ensureRentalOrderTable();
        await this.sweepRentalTimeouts(40);
        const driver = await this.prisma.driverProfile.findUnique({ where: { userId } });
        if (!driver) throw new common_1.ForbiddenException('当前账号不是雇佣司机');
        const seatNeed = Number(query.minSeats || 0) || 0;
        const dateHint = String(query.date || '').trim();
        let sql = `SELECT * FROM "RentalOrder" WHERE status='OPEN'`;
        const params = [];
        if (seatNeed > 0) {
            params.push(seatNeed);
            sql += ` AND "passengerCount" <= $${params.length}`;
        }
        if (dateHint) {
            params.push(dateHint.slice(0, 10));
            sql += ` AND ("travelDate" IS NULL OR "travelDate"::date = $${params.length}::date OR "dateFrom"::date = $${params.length}::date)`;
        }
        sql += ` ORDER BY "createdAt" DESC LIMIT 80`;
        const rows = await this.prisma.$queryRawUnsafe(sql, ...params);
        const items = [];
        for (let i = 0; i < (rows || []).length; i++) {
            const r = rows[i];
            if (driver.seatCount && Number(r.passengerCount || 1) > Number(driver.seatCount)) continue;
            items.push(await this.enrichRentalOrder(r));
        }
        return { items, total: items.length, driverId: driver.id };
    }

    async claimRentalOrder(userId, id) {
        await this.ensureRentalOrderTable();
        await this.sweepRentalTimeouts(20);
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
            `UPDATE "RentalOrder" SET
                status='NEGOTIATING',
                "driverId"=$1,
                "driverUserId"=$2,
                "claimedAt"=NOW(),
                "refPrice"=COALESCE($3, "refPrice"),
                "updatedAt"=NOW()
             WHERE id=$4 AND status='OPEN'`,
            driver.id, userId, refPrice, orderId
        );
        const after = await this.prisma.$queryRawUnsafe(`SELECT * FROM "RentalOrder" WHERE id=$1`, orderId);
        const next = after && after[0];
        if (!next || String(next.status).toUpperCase() !== 'NEGOTIATING' || next.driverId !== driver.id) {
            throw new common_1.BadRequestException('抢单失败，请刷新重试');
        }
        const name = driver.realName || '司机';
        await this.appendRentalSystemMessage(orderId, name + ' 已接单，进入协商');
        try { await this.notifyRentalSubscribe('claimed', next || row); } catch (_n) { }
        return this.enrichRentalOrder(next);
    }

    async releaseRentalOrder(userId, id, body = {}) {
        await this.ensureRentalOrderTable();
        const orderId = String(id || '').trim();
        const rows = await this.prisma.$queryRawUnsafe(`SELECT * FROM "RentalOrder" WHERE id=$1`, orderId);
        let row = rows && rows[0];
        if (!row) throw new common_1.NotFoundException('租车单不存在');
        row = await this.expireRentalTimeoutsForRow(row);
        const status = String(row.status || '').toUpperCase();
        if (status !== 'NEGOTIATING') {
            throw new common_1.BadRequestException('仅协商中可释放回池');
        }
        const driver = await this.prisma.driverProfile.findUnique({ where: { userId } }).catch(() => null);
        const isDriver = driver && row.driverId === driver.id;
        const isOwner = row.userId === userId;
        if (!isDriver && !isOwner) {
            throw new common_1.ForbiddenException('无权释放该单');
        }
        await this.prisma.$executeRawUnsafe(
            `UPDATE "RentalOrder" SET
                status='OPEN',
                "driverId"=NULL,
                "driverUserId"=NULL,
                "claimedAt"=NULL,
                "offeredPrice"=NULL,
                "agreedPrice"=NULL,
                "priceConfirmedAt"=NULL,
                "updatedAt"=NOW()
             WHERE id=$1 AND status='NEGOTIATING'`,
            orderId
        );
        const who = isDriver ? '司机' : '学员';
        await this.appendRentalSystemMessage(orderId, who + '已结束协商，订单退回派单池');
        const after = await this.prisma.$queryRawUnsafe(`SELECT * FROM "RentalOrder" WHERE id=$1`, orderId);
        return this.enrichRentalOrder(after && after[0]);
    }

    async cancelRentalOrder(userId, id, body = {}) {
        await this.ensureRentalOrderTable();
        const orderId = String(id || '').trim();
        const rows = await this.prisma.$queryRawUnsafe(`SELECT * FROM "RentalOrder" WHERE id=$1`, orderId);
        let row = rows && rows[0];
        if (!row) throw new common_1.NotFoundException('租车单不存在');
        row = await this.expireRentalTimeoutsForRow(row);
        if (row.userId !== userId) throw new common_1.ForbiddenException('只能取消自己的租车单');
        const status = String(row.status || '').toUpperCase();
        if (['COMPLETED', 'CANCELLED', 'PAID', 'EN_ROUTE', 'ARRIVED', 'IN_TRIP'].indexOf(status) >= 0) {
            throw new common_1.BadRequestException('当前状态不可取消');
        }
        const reason = String(body.reason || body.cancelReason || '用户取消').slice(0, 200);
        await this.prisma.$executeRawUnsafe(
            `UPDATE "RentalOrder" SET
                status='CANCELLED',
                "cancelledAt"=NOW(),
                "cancelReason"=$2,
                "driverId"=NULL,
                "driverUserId"=NULL,
                "updatedAt"=NOW()
             WHERE id=$1`,
            orderId, reason
        );
        await this.appendRentalSystemMessage(orderId, '学员已取消订单：' + reason);
        const after = await this.prisma.$queryRawUnsafe(`SELECT * FROM "RentalOrder" WHERE id=$1`, orderId);
        return this.enrichRentalOrder(after && after[0]);
    }

    async assertRentalChatAccess(userId, orderId) {
        const rows = await this.prisma.$queryRawUnsafe(`SELECT * FROM "RentalOrder" WHERE id=$1`, orderId);
        let row = rows && rows[0];
        if (!row) throw new common_1.NotFoundException('租车单不存在');
        row = await this.expireRentalTimeoutsForRow(row);
        const driver = await this.prisma.driverProfile.findUnique({ where: { userId } }).catch(() => null);
        const isOwner = row.userId === userId;
        const isClaimedDriver = driver && row.driverId && row.driverId === driver.id;
        if (!isOwner && !isClaimedDriver) {
            throw new common_1.ForbiddenException('无权查看该协商');
        }
        return { row, driver, isOwner, isClaimedDriver };
    }

    serializeRentalChatMessage(m) {
        if (!m) return null;
        const senderType = String(m.senderType || 'system');
        const labels = { user: '学员', driver: '司机', system: '系统' };
        return {
            id: m.id,
            orderId: m.orderId,
            senderType,
            senderTypeLabel: labels[senderType] || senderType,
            senderId: m.senderId || null,
            content: m.content || '',
            createdAt: m.createdAt,
            timeText: m.createdAt ? String(m.createdAt).slice(0, 16).replace('T', ' ') : '',
            isSystem: senderType === 'system',
        };
    }

    async listRentalMessages(userId, id, query = {}) {
        await this.ensureRentalOrderTable();
        const orderId = String(id || '').trim();
        if (!orderId) throw new common_1.BadRequestException('缺少订单 id');
        await this.assertRentalChatAccess(userId, orderId);
        const afterId = String(query.afterId || query.after || '').trim();
        let rows;
        if (afterId) {
            rows = await this.prisma.$queryRawUnsafe(
                `SELECT * FROM "RentalChatMessage" WHERE "orderId"=$1 AND "createdAt" > COALESCE((SELECT "createdAt" FROM "RentalChatMessage" WHERE id=$2), '1970-01-01') ORDER BY "createdAt" ASC LIMIT 200`,
                orderId, afterId
            );
        } else {
            rows = await this.prisma.$queryRawUnsafe(
                `SELECT * FROM "RentalChatMessage" WHERE "orderId"=$1 ORDER BY "createdAt" ASC LIMIT 200`,
                orderId
            );
        }
        return { items: (rows || []).map((m) => this.serializeRentalChatMessage(m)), total: (rows || []).length };
    }

    async postRentalMessage(userId, id, body = {}) {
        await this.ensureRentalOrderTable();
        const orderId = String(id || '').trim();
        if (!orderId) throw new common_1.BadRequestException('缺少订单 id');
        const content = String(body.content || body.text || body.message || '').trim().slice(0, 500);
        if (!content) throw new common_1.BadRequestException('消息不能为空');
        const { row, isOwner, isClaimedDriver } = await this.assertRentalChatAccess(userId, orderId);
        const status = String(row.status || '').toUpperCase();
        if (['CANCELLED', 'COMPLETED'].indexOf(status) >= 0) {
            throw new common_1.BadRequestException('当前状态不可发送消息');
        }
        if (!isOwner && !isClaimedDriver) throw new common_1.ForbiddenException('无权发送');
        if (status === 'OPEN') throw new common_1.BadRequestException('尚未进入协商');
        const senderType = isClaimedDriver ? 'driver' : 'user';
        const mid = (0, crypto_1.randomUUID)().replace(/-/g, '');
        await this.prisma.$executeRawUnsafe(
            `INSERT INTO "RentalChatMessage" (id, "orderId", "senderType", "senderId", content, "createdAt")
             VALUES ($1,$2,$3,$4,$5,NOW())`,
            mid, orderId, senderType, userId, content
        );
        const msgs = await this.prisma.$queryRawUnsafe(`SELECT * FROM "RentalChatMessage" WHERE id=$1`, mid);
        return this.serializeRentalChatMessage(msgs && msgs[0]);
    }

    async setRentalOfferedPrice(userId, id, body = {}) {
        await this.ensureRentalOrderTable();
        const orderId = String(id || '').trim();
        const driver = await this.prisma.driverProfile.findUnique({ where: { userId } });
        if (!driver) throw new common_1.ForbiddenException('当前账号不是雇佣司机');
        const rows = await this.prisma.$queryRawUnsafe(`SELECT * FROM "RentalOrder" WHERE id=$1`, orderId);
        let row = rows && rows[0];
        if (!row) throw new common_1.NotFoundException('租车单不存在');
        row = await this.expireRentalTimeoutsForRow(row);
        if (String(row.status).toUpperCase() !== 'NEGOTIATING') {
            throw new common_1.BadRequestException('仅协商中可报价');
        }
        if (row.driverId !== driver.id) throw new common_1.ForbiddenException('只能给自己接的单报价');
        const price = Number(body.price != null ? body.price : body.offeredPrice);
        if (!Number.isFinite(price) || price <= 0) throw new common_1.BadRequestException('请输入有效报价');
        if (price > 999999) throw new common_1.BadRequestException('报价过高');
        const rounded = Math.round(price * 100) / 100;
        await this.prisma.$executeRawUnsafe(
            `UPDATE "RentalOrder" SET "offeredPrice"=$2, "agreedPrice"=NULL, "priceConfirmedAt"=NULL, "updatedAt"=NOW() WHERE id=$1 AND status='NEGOTIATING'`,
            orderId, rounded
        );
        await this.appendRentalSystemMessage(orderId, '司机报价 ¥' + rounded.toFixed(2) + '，等待学员确认');
        const after = await this.prisma.$queryRawUnsafe(`SELECT * FROM "RentalOrder" WHERE id=$1`, orderId);
        try { await this.notifyRentalSubscribe('offered', after && after[0] ? after[0] : row, { price: rounded }); } catch (_n) { }
        return this.enrichRentalOrder(after && after[0]);
    }

    async acceptRentalPrice(userId, id) {
        await this.ensureRentalOrderTable();
        const orderId = String(id || '').trim();
        const rows = await this.prisma.$queryRawUnsafe(`SELECT * FROM "RentalOrder" WHERE id=$1`, orderId);
        let row = rows && rows[0];
        if (!row) throw new common_1.NotFoundException('租车单不存在');
        row = await this.expireRentalTimeoutsForRow(row);
        if (row.userId !== userId) throw new common_1.ForbiddenException('只能由发单学员确认价格');
        if (String(row.status).toUpperCase() !== 'NEGOTIATING') {
            throw new common_1.BadRequestException('当前状态不可确认价格');
        }
        if (row.offeredPrice == null) throw new common_1.BadRequestException('司机尚未报价');
        const agreed = Number(row.offeredPrice);
        await this.prisma.$executeRawUnsafe(
            `UPDATE "RentalOrder" SET
                status='PRICE_CONFIRMED',
                "agreedPrice"=$2,
                "priceConfirmedAt"=NOW(),
                "updatedAt"=NOW()
             WHERE id=$1 AND status='NEGOTIATING'`,
            orderId, agreed
        );
        await this.appendRentalSystemMessage(orderId, '学员已确认价格 ¥' + agreed.toFixed(2) + '，请尽快支付（2小时内）');
        const after = await this.prisma.$queryRawUnsafe(`SELECT * FROM "RentalOrder" WHERE id=$1`, orderId);
        try { await this.notifyRentalSubscribe('price_confirmed', after && after[0] ? after[0] : row, { agreed }); } catch (_n) { }
        return this.enrichRentalOrder(after && after[0]);
    }

    async rejectRentalPrice(userId, id, body = {}) {
        await this.ensureRentalOrderTable();
        const orderId = String(id || '').trim();
        const rows = await this.prisma.$queryRawUnsafe(`SELECT * FROM "RentalOrder" WHERE id=$1`, orderId);
        let row = rows && rows[0];
        if (!row) throw new common_1.NotFoundException('租车单不存在');
        row = await this.expireRentalTimeoutsForRow(row);
        if (row.userId !== userId) throw new common_1.ForbiddenException('只能由发单学员拒绝报价');
        if (String(row.status).toUpperCase() !== 'NEGOTIATING') {
            throw new common_1.BadRequestException('当前状态不可拒绝报价');
        }
        // Locked rule: reject price → back to OPEN pool (clear driver & prices)
        await this.prisma.$executeRawUnsafe(
            `UPDATE "RentalOrder" SET
                status='OPEN',
                "driverId"=NULL,
                "driverUserId"=NULL,
                "claimedAt"=NULL,
                "offeredPrice"=NULL,
                "agreedPrice"=NULL,
                "priceConfirmedAt"=NULL,
                "updatedAt"=NOW()
             WHERE id=$1 AND status='NEGOTIATING'`,
            orderId
        );
        const note = String(body.reason || '').trim().slice(0, 100);
        await this.appendRentalSystemMessage(orderId, '学员拒绝报价，订单退回派单池' + (note ? ('：' + note) : ''));
        const after = await this.prisma.$queryRawUnsafe(`SELECT * FROM "RentalOrder" WHERE id=$1`, orderId);
        return this.enrichRentalOrder(after && after[0]);
    }

    async payRentalOrder(userId, id) {
        await this.ensureRentalOrderTable();
        const orderId = String(id || '').trim();
        const rows = await this.prisma.$queryRawUnsafe(`SELECT * FROM "RentalOrder" WHERE id=$1`, orderId);
        let row = rows && rows[0];
        if (!row) throw new common_1.NotFoundException('租车单不存在');
        row = await this.expireRentalTimeoutsForRow(row);
        if (row.userId !== userId) throw new common_1.ForbiddenException('只能支付自己的租车单');
        if (String(row.status).toUpperCase() !== 'PRICE_CONFIRMED') {
            throw new common_1.BadRequestException('仅待支付租车单可支付');
        }
        if (row.agreedPrice == null || Number(row.agreedPrice) <= 0) {
            throw new common_1.BadRequestException('成交价无效');
        }
        // Reuse mall/booking pattern: simulated mark-paid (no separate WeChat JSAPI in study path)
        await this.prisma.$executeRawUnsafe(
            `UPDATE "RentalOrder" SET status='PAID', "paidAt"=NOW(), "updatedAt"=NOW() WHERE id=$1 AND status='PRICE_CONFIRMED'`,
            orderId
        );
        await this.appendRentalSystemMessage(orderId, '支付成功，金额 ¥' + Number(row.agreedPrice).toFixed(2));
        try { await this.notifyRentalSubscribe('paid', row); } catch (_n) { }
        const after = await this.prisma.$queryRawUnsafe(`SELECT * FROM "RentalOrder" WHERE id=$1`, orderId);
        return this.enrichRentalOrder(after && after[0]);
    }

    // ========== RentalOrder V2 Phase C — 履约 + 订阅消息 stubs ==========
    // Fulfillment: PAID → EN_ROUTE → ARRIVED → IN_TRIP → COMPLETED
    // On COMPLETED: credit driver wallet NET of commission (idempotent via walletCreditedAt)

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

    /**
     * WeChat subscribe-message hook (Phase C).
     * If template IDs are NOT in env, skip send — do not block business flow.
     * Plug template IDs later:
     *   WX_SUBSCRIBE_RENTAL_CLAIMED
     *   WX_SUBSCRIBE_RENTAL_OFFERED
     *   WX_SUBSCRIBE_RENTAL_PRICE_CONFIRMED
     *   WX_SUBSCRIBE_RENTAL_PAID
     *   WX_SUBSCRIBE_RENTAL_FULFILLMENT
     * TODO: resolve user/driver openid + call subscribeMessage.send
     */
    async notifyRentalSubscribe(eventKey, order, _payload = {}) {
        const map = {
            claimed: process.env.WX_SUBSCRIBE_RENTAL_CLAIMED || process.env.WX_TMPL_RENTAL_CLAIMED || '',
            offered: process.env.WX_SUBSCRIBE_RENTAL_OFFERED || process.env.WX_TMPL_RENTAL_OFFERED || '',
            price_confirmed: process.env.WX_SUBSCRIBE_RENTAL_PRICE_CONFIRMED || process.env.WX_TMPL_RENTAL_PRICE_CONFIRMED || '',
            paid: process.env.WX_SUBSCRIBE_RENTAL_PAID || process.env.WX_TMPL_RENTAL_PAID || '',
            fulfillment: process.env.WX_SUBSCRIBE_RENTAL_FULFILLMENT || process.env.WX_TMPL_RENTAL_FULFILLMENT || '',
        };
        const key = String(eventKey || '').trim();
        const templateId = map[key] || '';
        if (!templateId) {
            // Templates not configured — intentional no-op (documented stub)
            return { skipped: true, reason: 'template_not_configured', eventKey: key, orderId: order && order.id };
        }
        // TODO(Phase C+): WeChat subscribeMessage.send({ touser, template_id: templateId, page, data })
        // leave hook so ops can wire IDs without code change beyond env
        return { skipped: true, reason: 'send_not_implemented_yet', eventKey: key, templateId, orderId: order && order.id };
    }

    async platformDriverCommissionRate() {
        try {
            const row = await this.prisma.platformSetting.findUnique({ where: { key: 'feature.driverCommission' } });
            if (!row) return 0;
            const v = row.value;
            const n = typeof v === 'object' && v != null ? Number(v.value != null ? v.value : v) : Number(v);
            return Math.min(100, Math.max(0, Number.isFinite(n) ? n : 0));
        } catch (_e) {
            return 0;
        }
    }

    async driverCommissionRateOf(driverId) {
        try {
            await this.prisma.$executeRawUnsafe(`ALTER TABLE "DriverProfile" ADD COLUMN IF NOT EXISTS "commissionRate" DECIMAL(5,2)`);
        } catch (_e) { }
        try {
            const rows = await this.prisma.$queryRawUnsafe(`SELECT "commissionRate" FROM "DriverProfile" WHERE id=$1`, driverId);
            if (rows && rows[0] && rows[0].commissionRate != null)
                return Math.min(100, Math.max(0, Number(rows[0].commissionRate)));
        } catch (_e) { }
        return this.platformDriverCommissionRate();
    }

    /**
     * P0 credit helper adapted for RentalOrder: net after commissionRate.
     * Idempotent via RentalOrder.walletCreditedAt.
     */
    async creditRentalOrderCompletion(driverId, order) {
        await this.ensureRentalFulfillmentColumns();
        const gross = Number(order && order.agreedPrice != null ? order.agreedPrice : 0) || 0;
        const rate = driverId ? await this.driverCommissionRateOf(driverId) : 0;
        const net = Math.round(gross * (100 - rate) * 100) / 10000;
        const netFixed = Math.round(net * 100) / 100;
        if (!driverId || !order || !order.id) {
            return { gross, rate, net: netFixed, credited: false };
        }
        try {
            const rows = await this.prisma.$queryRawUnsafe(
                `SELECT "walletCreditedAt" FROM "RentalOrder" WHERE id=$1`,
                order.id
            );
            if (rows && rows[0] && rows[0].walletCreditedAt) {
                return { gross, rate, net: netFixed, credited: false };
            }
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
            const profileDataParts = [];
            // bump counters via raw SQL to avoid Prisma shape issues
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

    /**
     * Driver advances fulfillment on a paid RentalOrder.
     * body.status: EN_ROUTE | ARRIVED | IN_TRIP | COMPLETED | CANCELLED
     */
    async advanceRentalOrderStatus(userId, id, body = {}) {
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
        if (cur === 'COMPLETED' && next === 'COMPLETED') {
            return this.enrichRentalOrder(row);
        }
        const allowed = this.rentalFulfillmentNextAllowed(cur);
        if (allowed.indexOf(next) < 0) {
            throw new common_1.BadRequestException('当前状态 ' + this.rentalStatusLabel(cur) + ' 不可变为 ' + this.rentalStatusLabel(next));
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
            await this.notifyRentalSubscribe('fulfillment', after && after[0], { status: 'CANCELLED' });
            return this.enrichRentalOrder(after && after[0]);
        }

        let setSql = `status=$2, "updatedAt"=NOW()`;
        const params = [orderId, next];
        if (next === 'EN_ROUTE' || next === 'IN_TRIP') {
            setSql += `, "startedAt"=COALESCE("startedAt", NOW())`;
        }
        if (next === 'COMPLETED') {
            setSql += `, "completedAt"=NOW()`;
        }
        await this.prisma.$executeRawUnsafe(
            `UPDATE "RentalOrder" SET ${setSql} WHERE id=$1`,
            ...params
        );

        const label = this.rentalStatusLabel(next);
        await this.appendRentalSystemMessage(orderId, '履约进度：' + label);

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
            const netText = credit && credit.net != null ? ('¥' + Number(credit.net).toFixed(2)) : '';
            if (credit && credit.credited) {
                await this.appendRentalSystemMessage(orderId, '行程完成，司机钱包入账净值 ' + netText + (credit.rate ? ('（抽成 ' + credit.rate + '%）') : ''));
            } else {
                await this.appendRentalSystemMessage(orderId, '行程完成' + (netText ? ('（钱包已入账或净值为0：' + netText + '）') : ''));
            }
            await this.notifyRentalSubscribe('fulfillment', paidRow, { status: 'COMPLETED', credit });
            return this.enrichRentalOrder(paidRow);
        }

        try {
            if (next === 'EN_ROUTE' || next === 'ARRIVED' || next === 'IN_TRIP') {
                await this.prisma.driverProfile.update({ where: { id: driver.id }, data: { status: 'BUSY' } });
            }
        } catch (_e) { }

        const after = await this.prisma.$queryRawUnsafe(`SELECT * FROM "RentalOrder" WHERE id=$1`, orderId);
        await this.notifyRentalSubscribe('fulfillment', after && after[0], { status: next });
        return this.enrichRentalOrder(after && after[0]);
    }

    /** Admin Live: resolve booking belonging to project (seat student). */
    async adminLoadProjectBooking(projectId, bookingId, userId) {
        const where = { id: String(bookingId || ''), projectId: String(projectId || ''), userDeletedAt: null };
        const booking = await this.prisma.studyBooking.findFirst({
            where,
            include: { project: true, user: true },
        });
        if (!booking) throw new common_1.NotFoundException('预约不存在或不属于本项目');
        if (userId && String(booking.userId) !== String(userId))
            throw new common_1.BadRequestException('学员与预约不匹配');
        if (booking.participantRole === 'ORGANIZER')
            throw new common_1.BadRequestException('组织者座位不可操作现场进度');
        return booking;
    }

    listStationStepMeta(point, resourceMap) {
        const pack = (point && point.knowledgeItems && typeof point.knowledgeItems === 'object' && !Array.isArray(point.knowledgeItems))
            ? point.knowledgeItems : {};
        const steps = this.normalizeStationSteps(pack.stationSteps, point, pack);
        if (resourceMap) this.applyResourceMapToSteps(steps, resourceMap);
        return this.serializeStationStepsPublic(steps).map((s) => ({
            id: String(s.id),
            title: String(s.title || s.id),
            type: String(s.type || ''),
            skippable: s.skippable !== false,
        }));
    }

    async adminSkipOrCompleteStationStep(projectId, body) {
        const bookingId = String((body && body.bookingId) || '').trim();
        const routePointId = String((body && (body.routePointId || body.spotId || body.pointId)) || '').trim();
        const stepId = String((body && (body.stepId || body.stationStepId)) || '').trim();
        const userId = String((body && body.userId) || '').trim();
        const mode = String((body && (body.mode || body.action)) || 'skip').toLowerCase();
        const force = body && body.force !== false;
        if (!bookingId || !routePointId || !stepId)
            throw new common_1.BadRequestException('bookingId、routePointId、stepId 必填');
        const booking = await this.adminLoadProjectBooking(projectId, bookingId, userId || null);
        if (String(booking.status) === 'CANCELLED' || String(booking.status) === 'CANCELED')
            throw new common_1.BadRequestException('预约已取消');
        const point = await this.prisma.studyRoutePoint.findFirst({
            where: { id: routePointId, projectId: String(projectId), enabled: true },
        });
        if (!point) throw new common_1.NotFoundException('点位不存在或已停用');
        const resourceMap = await this.loadResourceMap(projectId);
        const stepsMeta = this.listStationStepMeta(point, resourceMap);
        const stepMeta = stepsMeta.find((s) => s.id === stepId);
        if (!stepMeta) throw new common_1.BadRequestException('本站没有这项内容');
        const pack = (point.knowledgeItems && typeof point.knowledgeItems === 'object' && !Array.isArray(point.knowledgeItems)) ? point.knowledgeItems : {};
        const steps = this.normalizeStationSteps(pack.stationSteps, point, pack);
        this.applyResourceMapToSteps(steps, resourceMap);
        const step = steps.find((s) => s.id === stepId);
        if (!step) throw new common_1.BadRequestException('本站没有这项内容');

        if (mode === 'complete' || mode === 'force_complete' || mode === 'done') {
            const plan0 = this.normalizeTripPlan(booking.tripPlan);
            const allProg = Object.assign({}, plan0.stationProgress && typeof plan0.stationProgress === 'object' ? plan0.stationProgress : {});
            const cur = this.mutateStationProgress(allProg[point.id]);
            const already = cur.done.indexOf(step.id) >= 0;
            if (cur.done.indexOf(step.id) < 0) cur.done = cur.done.concat([step.id]);
            // remove from skipped if present
            cur.skipped = cur.skipped.filter((x) => x !== step.id);
            if (!already) this.addStationPoints(cur, step);
            cur.updatedAt = new Date().toISOString();
            cur.title = point.title || cur.title || '';
            allProg[point.id] = cur;
            plan0.stationProgress = allProg;
            await this.prisma.studyBooking.update({ where: { id: booking.id }, data: { tripPlan: plan0 } });
            return {
                ok: true,
                mode: 'complete',
                bookingId: booking.id,
                userId: booking.userId,
                routePointId: point.id,
                routePointTitle: point.title || '',
                stepId: step.id,
                stepTitle: stepMeta.title,
                doneIds: cur.done,
                skippedIds: cur.skipped,
                pointsEarned: cur.pointsEarned,
                message: already ? '本关已完成' : '已远程强制完成本关',
            };
        }

        // skip (admin can force even if not skippable)
        if (!force && this.readStepSkippable(step.skippable) === false)
            throw new common_1.BadRequestException('本关不能跳过');
        if (force && this.readStepSkippable(step.skippable) === false) {
            // force path: mark skipped without points
            const plan0 = this.normalizeTripPlan(booking.tripPlan);
            const allProg = Object.assign({}, plan0.stationProgress && typeof plan0.stationProgress === 'object' ? plan0.stationProgress : {});
            const cur = this.mutateStationProgress(allProg[point.id]);
            if (cur.done.indexOf(step.id) >= 0) {
                return {
                    ok: true, mode: 'skip', bookingId: booking.id, userId: booking.userId,
                    routePointId: point.id, routePointTitle: point.title || '',
                    stepId: step.id, stepTitle: stepMeta.title,
                    doneIds: cur.done, skippedIds: cur.skipped, pointsEarned: cur.pointsEarned,
                    message: '本关已完成',
                };
            }
            if (cur.skipped.indexOf(step.id) < 0) cur.skipped = cur.skipped.concat([step.id]);
            cur.updatedAt = new Date().toISOString();
            cur.title = point.title || cur.title || '';
            allProg[point.id] = cur;
            plan0.stationProgress = allProg;
            await this.prisma.studyBooking.update({ where: { id: booking.id }, data: { tripPlan: plan0 } });
            return {
                ok: true, mode: 'skip', forced: true, bookingId: booking.id, userId: booking.userId,
                routePointId: point.id, routePointTitle: point.title || '',
                stepId: step.id, stepTitle: stepMeta.title,
                doneIds: cur.done, skippedIds: cur.skipped, pointsEarned: cur.pointsEarned,
                message: '已强制跳过（本关不可跳过，由现场远程处理）',
            };
        }
        const skipped = await this.skipStationStepRecord(booking, point, step);
        // stamp title/updatedAt
        try {
            const fresh = await this.prisma.studyBooking.findUnique({ where: { id: booking.id } });
            const plan0 = this.normalizeTripPlan(fresh && fresh.tripPlan);
            const allProg = Object.assign({}, plan0.stationProgress && typeof plan0.stationProgress === 'object' ? plan0.stationProgress : {});
            const cur = this.mutateStationProgress(allProg[point.id]);
            cur.updatedAt = new Date().toISOString();
            cur.title = point.title || cur.title || '';
            allProg[point.id] = cur;
            plan0.stationProgress = allProg;
            await this.prisma.studyBooking.update({ where: { id: booking.id }, data: { tripPlan: plan0 } });
        } catch (_e) {}
        return Object.assign({ ok: true, mode: 'skip', bookingId: booking.id, userId: booking.userId, routePointId: point.id, routePointTitle: point.title || '', stepTitle: stepMeta.title }, skipped);
    }

    async adminForceEndStation(projectId, body) {
        const bookingId = String((body && body.bookingId) || '').trim();
        const routePointId = String((body && (body.routePointId || body.spotId || body.pointId)) || '').trim();
        const userId = String((body && body.userId) || '').trim();
        if (!bookingId || !routePointId)
            throw new common_1.BadRequestException('bookingId、routePointId 必填');
        let booking = await this.adminLoadProjectBooking(projectId, bookingId, userId || null);
        if (String(booking.status) === 'CANCELLED' || String(booking.status) === 'CANCELED')
            throw new common_1.BadRequestException('预约已取消');
        if (booking.checkedInAt == null)
            throw new common_1.BadRequestException('学员尚未入口核销，无法结束站点');
        const project = booking.project || await this.getProjectLiveStageRecord(projectId);
        const point = await this.prisma.studyRoutePoint.findFirst({
            where: { id: routePointId, projectId: String(projectId), enabled: true },
        });
        if (!point) throw new common_1.NotFoundException('点位不存在或已停用');

        // 1) skip/finish all unfinished steps (no points for force-skip)
        const resourceMap = await this.loadResourceMap(projectId);
        const stepsMeta = this.listStationStepMeta(point, resourceMap);
        const plan0 = this.normalizeTripPlan(booking.tripPlan);
        const allProg = Object.assign({}, plan0.stationProgress && typeof plan0.stationProgress === 'object' ? plan0.stationProgress : {});
        const cur = this.mutateStationProgress(allProg[point.id]);
        const forcedSkipped = [];
        for (let i = 0; i < stepsMeta.length; i++) {
            const sid = stepsMeta[i].id;
            if (this.stationStepFinished(cur, sid)) continue;
            cur.skipped = cur.skipped.concat([sid]);
            forcedSkipped.push(sid);
        }
        cur.updatedAt = new Date().toISOString();
        cur.title = point.title || cur.title || '';
        cur.adminForceEndedAt = cur.updatedAt;
        allProg[point.id] = cur;
        plan0.stationProgress = allProg;
        await this.prisma.studyBooking.update({ where: { id: booking.id }, data: { tripPlan: plan0 } });
        booking = await this.prisma.studyBooking.findUnique({ where: { id: booking.id }, include: { project: true, user: true } }) || booking;

        // 2) create route-point check-in if missing (settle-like, no QR)
        let alreadyCheckedIn = false;
        let checkIn = await this.prisma.studyRoutePointCheckIn.findUnique({
            where: { bookingId_routePointId: { bookingId: booking.id, routePointId: point.id } },
            include: { routePoint: true },
        });
        if (checkIn) {
            alreadyCheckedIn = true;
        } else {
            checkIn = await this.prisma.$transaction(async (tx) => {
                const created = await tx.studyRoutePointCheckIn.create({
                    data: {
                        bookingId: booking.id,
                        userId: booking.userId,
                        projectId: String(projectId),
                        routePointId: point.id,
                        latitude: null,
                        longitude: null,
                        accuracy: null,
                    },
                    include: { routePoint: true },
                });
                try { await this.issueRoutePointAutoRewardsTx(tx, booking, point, booking.userId); } catch (_e) {}
                return created;
            });
        }

        // 3) station reward coupons (best-effort)
        let stationReward = null;
        try {
            const fresh = await this.prisma.studyBooking.findUnique({ where: { id: booking.id } });
            stationReward = await this.issueStationRewardCoupons(fresh || booking, point, booking.userId);
        } catch (_e) {}

        // 4) maybe complete tour
        let completion = null;
        try {
            completion = await this.maybeCompleteTourBooking(booking, project, booking.userId);
        } catch (_e) {}

        let tourPoints = null;
        try {
            const freshBooking = await this.prisma.studyBooking.findUnique({ where: { id: booking.id } }) || booking;
            const pts = this.sumBookingTourPoints(freshBooking);
            const stPts = this.readStationProgress(freshBooking, point.id).pointsEarned;
            tourPoints = { totalPoints: pts.totalPoints, spentPoints: pts.spentPoints, availablePoints: pts.availablePoints, stationPoints: stPts };
        } catch (_e) {}

        return {
            ok: true,
            bookingId: booking.id,
            userId: booking.userId,
            routePointId: point.id,
            routePointTitle: point.title || '',
            alreadyCheckedIn,
            forcedSkipped,
            stepsTotal: stepsMeta.length,
            stationReward,
            completion,
            tourPoints,
            puzzlePiece: { routePointId: point.id, title: point.title, collected: true },
            message: alreadyCheckedIn
                ? ('站点已通关；远程补齐 ' + forcedSkipped.length + ' 关')
                : ('已远程结束站点「' + (point.title || point.id) + '」'),
        };
    }

    async adminSetGraduationUnlock(projectId, body) {
        const bookingId = String((body && body.bookingId) || '').trim();
        const userId = String((body && body.userId) || '').trim();
        if (!bookingId) throw new common_1.BadRequestException('bookingId 必填');
        const unlocked = !(body && (body.unlocked === false || body.lock === true || body.action === 'lock'));
        const booking = await this.adminLoadProjectBooking(projectId, bookingId, userId || null);
        if (String(booking.status) === 'CANCELLED' || String(booking.status) === 'CANCELED')
            throw new common_1.BadRequestException('预约已取消');
        const plan0 = this.normalizeTripPlan(booking.tripPlan);
        const plan = this.mergeTripTour(plan0, {
            graduated: unlocked,
            mallRedeemUnlocked: unlocked,
            adminGraduationAt: unlocked ? new Date().toISOString() : (plan0.tour && plan0.tour.adminGraduationAt) || null,
            adminGraduationLockedAt: unlocked ? null : new Date().toISOString(),
        });
        // also mirror top-level for older readers
        if (unlocked) plan.graduated = true;
        else delete plan.graduated;
        const updated = await this.prisma.studyBooking.update({
            where: { id: booking.id },
            data: { tripPlan: plan },
            include: { user: true, project: true },
        });
        return {
            ok: true,
            bookingId: updated.id,
            userId: updated.userId,
            participantName: updated.participantName || (updated.user && (updated.user.realName || updated.user.nickname)) || '',
            graduated: unlocked,
            mallRedeemUnlocked: unlocked,
            message: unlocked ? '已手动解锁结业与积分商城兑换' : '已锁定结业兑换（商城不可兑）',
        };
    }

    /** Enrich Live summary attendees with station progress + unlock flags. */
    async enrichLiveAttendeesProgress(summary) {
        if (!summary || !Array.isArray(summary.attendees) || !summary.projectId) return summary;
        const projectId = String(summary.projectId);
        const attendees = summary.attendees;
        if (!attendees.length) return summary;
        const bookingIds = attendees.map((a) => a.bookingId).filter(Boolean);
        let points = Array.isArray(summary.routePoints) ? summary.routePoints.slice() : [];
        let fullPoints = [];
        try {
            fullPoints = await this.prisma.studyRoutePoint.findMany({
                where: { projectId, enabled: true },
                orderBy: { sortOrder: 'asc' },
                take: 200,
            });
        } catch (_e) { fullPoints = []; }
        const titleById = {};
        for (let i = 0; i < fullPoints.length; i++) titleById[fullPoints[i].id] = fullPoints[i].title || fullPoints[i].id;
        for (let i = 0; i < points.length; i++) {
            if (!titleById[points[i].id]) titleById[points[i].id] = points[i].title || points[i].id;
        }
        let checkIns = [];
        try {
            checkIns = await this.prisma.studyRoutePointCheckIn.findMany({
                where: { projectId, bookingId: { in: bookingIds } },
            });
        } catch (_e) { checkIns = []; }
        const cleared = {};
        for (let i = 0; i < checkIns.length; i++) {
            const k = checkIns[i].bookingId + '::' + checkIns[i].routePointId;
            cleared[k] = true;
        }
        let resourceMap = null;
        try { resourceMap = await this.loadResourceMap(projectId); } catch (_e) { resourceMap = null; }
        const stepsByPoint = {};
        for (let i = 0; i < fullPoints.length; i++) {
            try { stepsByPoint[fullPoints[i].id] = this.listStationStepMeta(fullPoints[i], resourceMap); }
            catch (_e) { stepsByPoint[fullPoints[i].id] = []; }
        }
        const bookings = await this.prisma.studyBooking.findMany({
            where: { id: { in: bookingIds } },
            select: { id: true, userId: true, tripPlan: true, status: true },
        });
        const byId = {};
        for (let i = 0; i < bookings.length; i++) byId[bookings[i].id] = bookings[i];

        for (let i = 0; i < attendees.length; i++) {
            const a = attendees[i];
            const b = byId[a.bookingId];
            if (!b) continue;
            a.userId = b.userId;
            const plan = this.normalizeTripPlan(b.tripPlan);
            const tour = (plan.tour && typeof plan.tour === 'object') ? plan.tour : {};
            const graduated = a.graduated === true || tour.graduated === true || tour.status === 'completed' || plan.graduated === true;
            const mallRedeemUnlocked = tour.mallRedeemUnlocked === true || graduated;
            a.graduated = !!graduated;
            a.mallRedeemUnlocked = !!mallRedeemUnlocked;
            a.tourStatus = a.tourStatus || String(tour.status || '');
            const sp = (plan.stationProgress && typeof plan.stationProgress === 'object') ? plan.stationProgress : {};
            // pick current spot: first study point not cleared, else latest progressed
            let currentId = '';
            let currentTitle = '';
            let pendingStep = null;
            let stepsDone = 0;
            let stepsTotal = 0;
            let exploreStage = a.exploreStage || '';
            for (let p = 0; p < fullPoints.length; p++) {
                const pt = fullPoints[p];
                // skip obvious service points if helper exists
                try { if (this.isServiceRoutePointRow && this.isServiceRoutePointRow(pt)) continue; } catch (_e) {}
                const steps = stepsByPoint[pt.id] || [];
                const prog = this.mutateStationProgress(sp[pt.id]);
                const isCleared = !!cleared[a.bookingId + '::' + pt.id];
                if (!currentId && !isCleared) {
                    currentId = pt.id;
                    currentTitle = pt.title || titleById[pt.id] || pt.id;
                    stepsTotal = steps.length;
                    stepsDone = steps.filter((s) => this.stationStepFinished(prog, s.id)).length;
                    for (let s = 0; s < steps.length; s++) {
                        if (!this.stationStepFinished(prog, steps[s].id)) {
                            pendingStep = steps[s];
                            break;
                        }
                    }
                    if (steps.length)
                        exploreStage = stepsDone + '/' + stepsTotal + (pendingStep ? (' · ' + pendingStep.title) : ' · 待扫码通关');
                    else
                        exploreStage = isCleared ? '已通关' : '待通关';
                    break;
                }
            }
            if (!currentId) {
                // all cleared — show last
                const keys = Object.keys(sp);
                let best = null;
                for (let k = 0; k < keys.length; k++) {
                    const rowSp = sp[keys[k]];
                    if (!rowSp || typeof rowSp !== 'object') continue;
                    if (!best || String(rowSp.updatedAt || rowSp.at || '') > String(best.updatedAt || best.at || ''))
                        best = Object.assign({ _id: keys[k] }, rowSp);
                }
                if (best) {
                    currentId = best._id;
                    currentTitle = best.title || titleById[best._id] || best._id;
                    const steps = stepsByPoint[currentId] || [];
                    const prog = this.mutateStationProgress(best);
                    stepsTotal = steps.length;
                    stepsDone = steps.filter((s) => this.stationStepFinished(prog, s.id)).length;
                    exploreStage = graduated ? '结业' : (stepsTotal ? (stepsDone + '/' + stepsTotal + ' · 已通关') : '已通关');
                } else if (graduated) {
                    exploreStage = '结业';
                }
            }
            a.exploreSpot = currentTitle || a.exploreSpot || '';
            a.exploreSpotId = currentId || a.exploreSpotId || '';
            a.exploreStage = exploreStage || a.exploreStage || '';
            a.pendingStepId = pendingStep ? pendingStep.id : '';
            a.pendingStepTitle = pendingStep ? pendingStep.title : '';
            a.stepsDone = stepsDone;
            a.stepsTotal = stepsTotal;
            a.stationCleared = currentId ? !!cleared[a.bookingId + '::' + currentId] : false;
            // attach compact stationSteps for current spot (UI skip picker)
            a.currentSteps = currentId ? (stepsByPoint[currentId] || []).map((s) => {
                const prog = this.mutateStationProgress(sp[currentId]);
                return Object.assign({}, s, { finished: this.stationStepFinished(prog, s.id) });
            }) : [];
        }
        // attach steps catalog on routePoints for UI
        summary.routePoints = (points.length ? points : fullPoints.map((p) => ({
            id: p.id, title: p.title || '', sortOrder: Number(p.sortOrder || 0), enabled: p.enabled !== false,
        }))).map((rp) => Object.assign({}, rp, {
            steps: (stepsByPoint[rp.id] || []).map((s) => ({ id: s.id, title: s.title, type: s.type })),
        }));
        return summary;
    }



    chinaDateKeyLive18() {
        return this.chinaDateKey();
    }
    readTodayDayOps(project) {
        const dayOps = (project && project.dayOps && typeof project.dayOps === 'object' && !Array.isArray(project.dayOps)) ? project.dayOps : {};
        const today = this.chinaDateKeyLive18();
        const ops = dayOps[today] && typeof dayOps[today] === 'object' ? dayOps[today] : {};
        const closedSpots = Array.isArray(ops.closedSpots) ? ops.closedSpots.map(String) : [];
        const spotStepOverrides = (ops.spotStepOverrides && typeof ops.spotStepOverrides === 'object') ? ops.spotStepOverrides : {};
        let broadcast = null;
        if (ops.broadcast && typeof ops.broadcast === 'object' && String(ops.broadcast.text || '').trim()) {
            broadcast = {
                text: String(ops.broadcast.text || '').trim(),
                level: String(ops.broadcast.level || 'warn'),
                at: String(ops.broadcast.at || ''),
                id: String(ops.broadcast.id || ''),
            };
        }
        return {
            date: today,
            tourPaused: !!ops.tourPaused,
            pauseCheckin: !!ops.pauseCheckin,
            paused: !!ops.paused,
            broadcast,
            closedSpots,
            spotStepOverrides,
            note: String(ops.note || '').trim(),
        };
    }
    assertSpotNotClosed(project, routePointId) {
        const ops = this.readTodayDayOps(project);
        if (ops.tourPaused) throw new common_1.BadRequestException('全场导览已暂停，当前为只读');
        if (ops.closedSpots.indexOf(String(routePointId)) >= 0) {
            throw new common_1.BadRequestException('该点位今日临时关闭，无法进入关卡或扫码');
        }
        return ops;
    }
    applySpotStepOverrides(steps, project, routePointId) {
        const ops = this.readTodayDayOps(project);
        const ov = ops.spotStepOverrides && ops.spotStepOverrides[String(routePointId)];
        if (!ov || typeof ov !== 'object') return steps;
        let list = Array.isArray(steps) ? steps.slice() : [];
        const skip = Array.isArray(ov.skipStepIds) ? ov.skipStepIds.map(String) : [];
        const req = Array.isArray(ov.requiredStepIds) ? ov.requiredStepIds.map(String) : [];
        if (skip.length) list = list.filter((s) => skip.indexOf(String(s.id)) < 0);
        if (req.length) {
            // mark required; keep only required if provided non-empty as "today required set"
            list = list.filter((s) => req.indexOf(String(s.id)) >= 0);
        }
        return list.map((s) => Object.assign({}, s, { liveOverride: true }));
    }


};
exports.StudyService = StudyService;
exports.StudyService = StudyService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        jwt_1.JwtService,
        study_no_service_1.StudyNoService,
        config_1.ConfigService])
], StudyService);
//# sourceMappingURL=study.service.js.map