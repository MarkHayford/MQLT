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
exports.CommunityService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const prisma_service_1 = require("../prisma/prisma.service");

function newId() {
    return "c" + Date.now().toString(36) + Math.random().toString(36).slice(2, 12);
}

function parseImages(raw) {
    if (Array.isArray(raw)) return raw.map((x) => String(x || "")).filter(Boolean);
    const s = String(raw || "").trim();
    if (!s) return [];
    try {
        const parsed = JSON.parse(s);
        if (Array.isArray(parsed)) return parsed.map((x) => String(x || "")).filter(Boolean);
    }
    catch (_e) {}
    return [];
}

function normalizeChannel(raw) {
    const c = String(raw || "").trim();
    if (c === "official" || c === "video" || c === "experience") return c;
    return "experience";
}

function typeOfChannel(channel) {
    if (channel === "official") return "官方资讯";
    if (channel === "video") return "宣传";
    return "文章";
}

function formatTime(d) {
    if (!d) return "";
    const dt = d instanceof Date ? d : new Date(d);
    if (Number.isNaN(dt.getTime())) return "";
    try {
        return dt.toLocaleDateString("en-CA", { timeZone: "Asia/Shanghai" });
    } catch (_e) {
        const ms = dt.getTime() + 8 * 3600000;
        const x = new Date(ms);
        return x.getUTCFullYear() + "-" + String(x.getUTCMonth() + 1).padStart(2, "0") + "-" + String(x.getUTCDate()).padStart(2, "0");
    }
}

function truthy(v) {
    return v === true || v === "true" || v === 1 || v === "1";
}

const POST_SELECT = `SELECT p.*, COALESCE(NULLIF(BTRIM(p.publisher), ''), NULLIF(BTRIM(u."realName"), ''), u.nickname) AS "authorName", COALESCE(u."avatarUrl", '') AS "authorAvatar",
            COALESCE(sp.title, '') AS "projectTitle"
            FROM "CommunityPost" p
            JOIN "User" u ON u.id = p."userId"
            LEFT JOIN "StudyProject" sp ON sp.id = p."projectId"`;

let CommunityService = class CommunityService {
    constructor(prisma, jwtService) {
        this.prisma = prisma;
        this.jwtService = jwtService;
    }

    userIdFromAuth(authorization) {
        const [type, token] = String(authorization ?? "").split(" ");
        if (type !== "Bearer" || !token) return null;
        try {
            const payload = this.jwtService.verify(token);
            return payload.sub ? String(payload.sub) : null;
        }
        catch (_e) {
            return null;
        }
    }

    serializePost(row, liked, viewerId) {
        const images = parseImages(row.images);
        const coverUrl = String(row.coverUrl || row.coverurl || "").trim() || (images[0] || "");
        const createdAt = row.createdAt || row.createdat;
        const authorId = String(row.userId || row.userid || "");
        return {
            id: String(row.id),
            title: String(row.title || ""),
            content: String(row.content || ""),
            coverUrl,
            images,
            videoUrl: String(row.videoUrl || row.videourl || ""),
            channel: String(row.channel || "experience"),
            type: String(row.type || typeOfChannel(row.channel)),
            status: String(row.status || "published"),
            projectId: String(row.projectId || row.projectid || ""),
            projectTitle: String(row.projectTitle || row.projecttitle || ""),
            authorId,
            authorName: String(row.publisher || row.authorName || row.authorname || "研学学员"),
            authorAvatar: String(row.authorAvatar || row.authoravatar || ""),
            publisher: String(row.publisher || row.authorName || row.authorname || "研学学员"),
            publisherUnitType: String(row.publisherUnitType || row.publisherunittype || (row.projectId || row.projectid ? "project" : (row.enterpriseId || row.enterpriseid ? "enterprise" : "platform"))),
            publisherUnitId: String(row.publisherUnitId || row.publisherunitid || row.projectId || row.projectid || row.enterpriseId || row.enterpriseid || ""),
            enterpriseId: String(row.enterpriseId || row.enterpriseid || ""),
            likeCount: Number(row.likeCount || row.likecount || 0),
            commentCount: Number(row.commentCount || row.commentcount || 0),
            liked: !!liked,
            isOfficial: String(row.channel) === "official" || String(row.id).indexOf("n_") === 0,
            isOwner: viewerId != null && viewerId.length > 0 && viewerId === authorId,
            time: formatTime(createdAt),
            timestamp: createdAt ? Math.floor(new Date(createdAt).getTime() / 1000) : 0,
        };
    }

    serializeNotice(notice) {
        const publishedAt = notice.publishedAt;
        const cat = String(notice.category || notice.type || "").trim();
        return {
            id: "n_" + notice.id,
            title: notice.title,
            content: notice.content || "",
            coverUrl: "",
            images: [],
            videoUrl: "",
            channel: "official",
            type: cat || "官方资讯",
            category: cat || "官方资讯",
            status: "published",
            projectId: notice.projectId || "",
            projectTitle: (notice.project && notice.project.title) || "",
            authorId: "",
            authorName: notice.publisher || "蒙企链探运营中心",
            authorAvatar: "",
            publisher: notice.publisher || "蒙企链探运营中心",
            likeCount: 0,
            commentCount: 0,
            liked: false,
            isOfficial: true,
            isOwner: false,
            time: formatTime(publishedAt),
            timestamp: publishedAt ? Math.floor(new Date(publishedAt).getTime() / 1000) : 0,
            kind: "news",
            contentType: "notice",
        };
    }

    async loadPublishedEnterpriseNotices(keyword) {
        try {
            const params = [];
            let sql = `SELECT n.id, n.title, n.content, n.type, n.category, n.publisher, n.paragraphs, n."publishedAt",
                              n."projectId", n."enterpriseId", COALESCE(n.status, 'published') AS status, COALESCE(n.kind, 'news') AS kind,
                              sp.title AS "projectTitle"
                       FROM "StudyNotice" n
                       LEFT JOIN "StudyProject" sp ON sp.id = n."projectId"
                       WHERE COALESCE(n.status, 'published') = 'published'
                         AND COALESCE(n.kind, 'news') = 'news'`;
            if (keyword) {
                params.push("%" + keyword + "%");
                sql += ` AND (n.title ILIKE $1 OR n.content ILIKE $1 OR COALESCE(n.publisher,'') ILIKE $1)`;
            }
            sql += ` ORDER BY n."publishedAt" DESC LIMIT 80`;
            const rows = await this.prisma.$queryRawUnsafe(sql, ...params);
            return (rows || []).map((row) => this.serializeNotice({
                id: row.id,
                title: row.title,
                content: row.content,
                type: row.type,
                category: row.category,
                publisher: row.publisher,
                paragraphs: row.paragraphs || [],
                publishedAt: row.publishedAt,
                projectId: row.projectId,
                enterpriseId: row.enterpriseId,
                project: row.projectTitle ? { title: row.projectTitle } : null,
            }));
        } catch (_e) {
            return [];
        }
    }

    async likedSet(userId, postIds) {
        const set = new Set();
        if (!userId || !postIds.length) return set;
        const rows = await this.prisma.$queryRawUnsafe(
            `SELECT "postId" FROM "CommunityLike" WHERE "userId" = $1`,
            userId
        );
        for (const row of rows || []) {
            const pid = String(row.postId || row.postid || "");
            if (postIds.indexOf(pid) >= 0) set.add(pid);
        }
        return set;
    }

    async loadPostRow(id) {
        const rows = await this.prisma.$queryRawUnsafe(
            `${POST_SELECT} WHERE p.id = $1 LIMIT 1`,
            id
        );
        if (!rows || !rows.length) return null;
        return rows[0];
    }

    async requireOwnPost(userId, id) {
        const row = await this.loadPostRow(id);
        if (!row) throw new common_1.NotFoundException("内容不存在");
        const owner = String(row.userId || row.userid || "");
        if (owner !== userId) throw new common_1.ForbiddenException("只能操作自己的文章");
        return row;
    }

    async isAdminUser(userId) {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        return !!(user && user.isAdmin);
    }

    resolvePublishStatus(asDraft, isAdmin, prevStatus) {
        if (asDraft) return "draft";
        // Platform + student publishes all require ops console approval (posts-review).
        void isAdmin;
        void prevStatus;
        return "pending";
    }

    async list(authorization, query) {
        const userId = this.userIdFromAuth(authorization);
        const channel = normalizeChannel(query?.channel === "all" ? "" : query?.channel);
        const wantAll = !query?.channel || String(query.channel) === "all";
        const keyword = String(query?.keyword || "").trim();

        let sql = `${POST_SELECT} WHERE p.status = 'published'`;
        const params = [];
        if (!wantAll) {
            params.push(channel);
            sql += ` AND p.channel = $${params.length}`;
        }
        if (keyword) {
            params.push("%" + keyword + "%");
            sql += ` AND (p.title ILIKE $${params.length} OR p.content ILIKE $${params.length})`;
        }
        sql += ` ORDER BY p."createdAt" DESC LIMIT 80`;
        const rows = await this.prisma.$queryRawUnsafe(sql, ...params);
        const postIds = (rows || []).map((r) => String(r.id));
        const liked = await this.likedSet(userId, postIds);
        const posts = (rows || []).map((r) => this.serializePost(r, liked.has(String(r.id)), userId));
        // Enterprise StudyNotice (kind=news) appear in 资讯 feed as official items.
        if (wantAll || channel === "official") {
            const notices = await this.loadPublishedEnterpriseNotices(keyword);
            for (let i = 0; i < notices.length; i++) posts.push(notices[i]);
        }
        posts.sort((a, b) => b.timestamp - a.timestamp);
        return posts;
    }

    async listMine(userId, query) {
        const tab = String(query?.tab || query?.scope || "mine").trim();
        let sql = `${POST_SELECT} WHERE p."userId" = $1`;
        if (tab === "draft" || tab === "drafts") {
            sql += ` AND p.status = 'draft'`;
        } else {
            sql += ` AND p.status IN ('published','pending','private')`;
        }
        sql += ` ORDER BY p."updatedAt" DESC LIMIT 80`;
        const rows = await this.prisma.$queryRawUnsafe(sql, userId);
        const postIds = (rows || []).map((r) => String(r.id));
        const liked = await this.likedSet(userId, postIds);
        return (rows || []).map((r) => this.serializePost(r, liked.has(String(r.id)), userId));
    }

    async detail(authorization, id) {
        const rawId = String(id || "");
        const userId = this.userIdFromAuth(authorization);
        if (rawId.indexOf("n_") === 0) {
            const nid = rawId.slice(2);
            const rows = await this.prisma.$queryRawUnsafe(
                `SELECT n.*, sp.title AS "projectTitle"
                 FROM "StudyNotice" n
                 LEFT JOIN "StudyProject" sp ON sp.id = n."projectId"
                 WHERE n.id = $1 LIMIT 1`, nid);
            if (!rows || !rows.length) throw new common_1.NotFoundException("内容不存在");
            const row = rows[0];
            if (String(row.status || "published") !== "published") throw new common_1.NotFoundException("内容不存在");
            if (String(row.kind || "news") === "dynamics") throw new common_1.NotFoundException("内容不存在");
            const item = this.serializeNotice({
                id: row.id,
                title: row.title,
                content: row.content,
                type: row.type,
                category: row.category,
                publisher: row.publisher,
                paragraphs: row.paragraphs || [],
                publishedAt: row.publishedAt,
                projectId: row.projectId,
                enterpriseId: row.enterpriseId,
                project: row.projectTitle ? { title: row.projectTitle } : null,
            });
            const content = String(item.content || "").trim();
            let paras = [];
            if (Array.isArray(row.paragraphs) && row.paragraphs.length) {
                paras = row.paragraphs.map((x) => String(x || "").trim()).filter(Boolean);
            } else {
                paras = content.split(/\n+/).map((s) => s.trim()).filter(Boolean);
            }
            item.paragraphs = paras.length ? paras : [content];
            item.comments = [];
            return item;
        }
        const row = await this.loadPostRow(rawId);
        if (!row) throw new common_1.NotFoundException("内容不存在");
        const status = String(row.status || "published");
        const owner = String(row.userId || row.userid || "");
        const isOwner = userId != null && userId === owner;
        if (status !== "published" && !isOwner) throw new common_1.NotFoundException("内容不存在");
        const liked = await this.likedSet(userId, [rawId]);
        const item = this.serializePost(row, liked.has(rawId), userId);
        const paras = String(item.content || "").split(/\n+/).map((s) => s.trim()).filter(Boolean);
        item.paragraphs = paras.length ? paras : [item.content];
        item.comments = status === "published" ? await this.listComments(rawId) : [];
        return item;
    }

    buildPostFields(body, channelFallback) {
        const title = String(body?.title || "").trim();
        const content = String(body?.content || "").trim();
        let channel = normalizeChannel(body?.channel || channelFallback);
        const videoUrl = String(body?.videoUrl || body?.linkUrl || "").trim();
        const images = parseImages(body?.images);
        const coverUrl = String(body?.coverUrl || "").trim() || (images[0] || "");
        const projectId = String(body?.projectId || "").trim() || null;
        const type = String(body?.type || "").trim() || typeOfChannel(channel);
        return { title, content, channel, videoUrl, images, coverUrl, projectId, type };
    }

    async create(userId, body) {
        const asDraft = truthy(body?.asDraft) || String(body?.status || "") === "draft";
        const fields = this.buildPostFields(body, "experience");
        if (!asDraft && fields.title.length < 2) throw new common_1.BadRequestException("请填写标题");
        if (!asDraft && fields.content.length < 4) throw new common_1.BadRequestException("请再写一点正文");
        if (asDraft && fields.title.length < 1) fields.title = "未命名草稿";
        if (fields.channel === "official") {
            const admin = await this.isAdminUser(userId);
            if (!admin) throw new common_1.ForbiddenException("官方资讯仅运营可发");
        }
        const isAdmin = await this.isAdminUser(userId);
        const status = this.resolvePublishStatus(asDraft, isAdmin, "");
        const id = newId();
        await this.prisma.$executeRawUnsafe(
            `INSERT INTO "CommunityPost"
            (id, "userId", title, content, "coverUrl", images, "videoUrl", channel, type, "projectId", status, "createdAt", "updatedAt")
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11, NOW(), NOW())`,
            id, userId, fields.title, fields.content, fields.coverUrl, JSON.stringify(fields.images), fields.videoUrl, fields.channel, fields.type, fields.projectId, status
        );
        const row = await this.loadPostRow(id);
        return this.serializePost(row, false, userId);
    }

    async update(userId, id, body) {
        const prev = await this.requireOwnPost(userId, id);
        const asDraft = truthy(body?.asDraft) || String(body?.status || "") === "draft";
        const fields = this.buildPostFields(body, prev.channel);
        if (!asDraft && fields.title.length < 2) throw new common_1.BadRequestException("请填写标题");
        if (!asDraft && fields.content.length < 4) throw new common_1.BadRequestException("请再写一点正文");
        if (asDraft && fields.title.length < 1) fields.title = String(prev.title || "未命名草稿");
        if (fields.channel === "official") {
            const admin = await this.isAdminUser(userId);
            if (!admin) throw new common_1.ForbiddenException("官方资讯仅运营可发");
        }
        const isAdmin = await this.isAdminUser(userId);
        const prevStatus = String(prev.status || "published");
        const status = this.resolvePublishStatus(asDraft, isAdmin, prevStatus);
        await this.prisma.$executeRawUnsafe(
            `UPDATE "CommunityPost" SET title=$1, content=$2, "coverUrl"=$3, images=$4, "videoUrl"=$5,
             channel=$6, type=$7, "projectId"=$8, status=$9, "updatedAt"=NOW()
             WHERE id=$10 AND "userId"=$11`,
            fields.title, fields.content, fields.coverUrl, JSON.stringify(fields.images), fields.videoUrl,
            fields.channel, fields.type, fields.projectId, status, id, userId
        );
        const row = await this.loadPostRow(id);
        return this.serializePost(row, false, userId);
    }

    async remove(userId, id) {
        await this.requireOwnPost(userId, id);
        await this.prisma.$executeRawUnsafe(`DELETE FROM "CommunityPost" WHERE id = $1 AND "userId" = $2`, id, userId);
        return { ok: true };
    }

    async setPrivate(userId, id) {
        await this.requireOwnPost(userId, id);
        await this.prisma.$executeRawUnsafe(
            `UPDATE "CommunityPost" SET status = 'private', "updatedAt" = NOW() WHERE id = $1 AND "userId" = $2`,
            id, userId
        );
        const row = await this.loadPostRow(id);
        return this.serializePost(row, false, userId);
    }

    async submit(userId, id) {
        const prev = await this.requireOwnPost(userId, id);
        const prevStatus = String(prev.status || "");
        if (prevStatus !== "draft" && prevStatus !== "private" && prevStatus !== "pending") {
            throw new common_1.BadRequestException("当前状态不能提交审核");
        }
        await this.prisma.$executeRawUnsafe(
            `UPDATE "CommunityPost" SET status = 'pending', "updatedAt" = NOW() WHERE id = $1 AND "userId" = $2`,
            id, userId
        );
        const row = await this.loadPostRow(id);
        return this.serializePost(row, false, userId);
    }

    async toggleLike(userId, postId) {
        const found = await this.prisma.$queryRawUnsafe(
            `SELECT id FROM "CommunityPost" WHERE id = $1 AND status = 'published' LIMIT 1`,
            postId
        );
        if (!found || !found.length) throw new common_1.NotFoundException("内容不存在");
        const exists = await this.prisma.$queryRawUnsafe(
            `SELECT id FROM "CommunityLike" WHERE "userId" = $1 AND "postId" = $2 LIMIT 1`,
            userId, postId
        );
        if (exists && exists.length) {
            await this.prisma.$executeRawUnsafe(
                `DELETE FROM "CommunityLike" WHERE "userId" = $1 AND "postId" = $2`,
                userId, postId
            );
            await this.prisma.$executeRawUnsafe(
                `UPDATE "CommunityPost" SET "likeCount" = GREATEST("likeCount" - 1, 0), "updatedAt" = NOW() WHERE id = $1`,
                postId
            );
            const rows = await this.prisma.$queryRawUnsafe(`SELECT "likeCount" FROM "CommunityPost" WHERE id = $1`, postId);
            return { liked: false, likeCount: Number(rows?.[0]?.likeCount || rows?.[0]?.likecount || 0) };
        }
        await this.prisma.$executeRawUnsafe(
            `INSERT INTO "CommunityLike" (id, "userId", "postId", "createdAt") VALUES ($1,$2,$3,NOW())`,
            newId(), userId, postId
        );
        await this.prisma.$executeRawUnsafe(
            `UPDATE "CommunityPost" SET "likeCount" = "likeCount" + 1, "updatedAt" = NOW() WHERE id = $1`,
            postId
        );
        const rows = await this.prisma.$queryRawUnsafe(`SELECT "likeCount" FROM "CommunityPost" WHERE id = $1`, postId);
        return { liked: true, likeCount: Number(rows?.[0]?.likeCount || rows?.[0]?.likecount || 0) };
    }

    async listComments(postId) {
        const rows = await this.prisma.$queryRawUnsafe(
            `SELECT c.id, c.content, c."createdAt", COALESCE(NULLIF(BTRIM(u."realName"), ''), u.nickname) AS "authorName", COALESCE(u."avatarUrl",'') AS "authorAvatar"
             FROM "CommunityComment" c JOIN "User" u ON u.id = c."userId"
             WHERE c."postId" = $1 ORDER BY c."createdAt" DESC LIMIT 80`,
            postId
        );
        return (rows || []).map((r) => ({
            id: String(r.id),
            content: String(r.content || ""),
            authorName: String(r.authorName || r.authorname || "研学学员"),
            authorAvatar: String(r.authorAvatar || r.authoravatar || ""),
            time: formatTime(r.createdAt || r.createdat),
        }));
    }

    async addComment(userId, postId, body) {
        const content = String(body?.content || "").trim();
        if (content.length < 1) throw new common_1.BadRequestException("请输入评论");
        if (content.length > 300) throw new common_1.BadRequestException("评论过长");
        const found = await this.prisma.$queryRawUnsafe(`SELECT id FROM "CommunityPost" WHERE id = $1 AND status = 'published'`, postId);
        if (!found || !found.length) throw new common_1.NotFoundException("内容不存在");
        await this.prisma.$executeRawUnsafe(
            `INSERT INTO "CommunityComment" (id, "userId", "postId", content, "createdAt") VALUES ($1,$2,$3,$4,NOW())`,
            newId(), userId, postId, content
        );
        await this.prisma.$executeRawUnsafe(
            `UPDATE "CommunityPost" SET "commentCount" = "commentCount" + 1, "updatedAt" = NOW() WHERE id = $1`,
            postId
        );
        return this.listComments(postId);
    }
};
exports.CommunityService = CommunityService;
exports.CommunityService = CommunityService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService, jwt_1.JwtService])
], CommunityService);
//# sourceMappingURL=community.service.js.map
