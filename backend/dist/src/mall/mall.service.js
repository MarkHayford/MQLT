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
exports.MallService = void 0;
const common_1 = require("@nestjs/common");
const crypto_1 = require("crypto");
const fs_1 = require("fs");
const path_1 = require("path");
const prisma_service_1 = require("../prisma/prisma.service");
let MallService = class MallService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getProducts(projectId) {
        const pid = projectId != null ? String(projectId).trim() : '';
        const products = await this.prisma.product.findMany({
            where: { status: 'ON_SALE' },
            orderBy: [{ sales: 'desc' }, { createdAt: 'desc' }],
        });
        const bindings = await this.getProductBindings();
        const out = [];
        for (const item of products) {
            if (item.category === '奖品')
                continue;
            const bound = bindings[item.id] != null ? bindings[item.id] : '';
            if (pid.length > 0 && bound !== pid)
                continue;
            out.push(this.serializeProduct(item, bound));
        }
        return out;
    }
    async getProductDetail(id) {
        const product = await this.prisma.product.findUnique({ where: { id } });
        if (!product)
            throw new common_1.NotFoundException('Product not found');
        const bound = await this.getProductProjectId(id);
        const rating = await this.productRating(id);
        return { ...this.serializeProduct(product, bound), ...rating };
    }
    sendProductImage(filename, res) {
        if (!/^[a-zA-Z0-9_-]+\.(jpg|jpeg|png|webp)$/.test(filename)) {
            throw new common_1.BadRequestException('Invalid product image filename');
        }
        const dir = this.productImageDir();
        const filePath = (0, path_1.normalize)((0, path_1.join)(dir, filename));
        if (!filePath.startsWith(dir) || !(0, fs_1.existsSync)(filePath)) {
            throw new common_1.NotFoundException('Product image not found');
        }
        res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
        return res.sendFile(filePath);
    }
    async getCart(userId) {
        const items = await this.prisma.cartItem.findMany({
            where: { userId },
            include: { product: true },
            orderBy: { createdAt: 'desc' },
        });
        const bindings = await this.getProductBindings();
        return items.map((item) => ({
            id: item.id,
            productId: item.productId,
            quantity: item.quantity,
            selected: item.selected,
            product: this.serializeProduct(item.product, bindings[item.productId] != null ? bindings[item.productId] : ''),
        }));
    }
    async addCart(userId, body) {
        const productId = (body.productId ?? body.id);
        const quantity = Number(body.quantity ?? 1);
        if (!productId || quantity < 1)
            throw new common_1.BadRequestException('Invalid cart item');
        const product = await this.prisma.product.findUnique({ where: { id: productId } });
        if (!product)
            throw new common_1.NotFoundException('Product not found');
        const item = await this.prisma.cartItem.upsert({
            where: { userId_productId: { userId, productId } },
            update: { quantity: { increment: quantity }, selected: true },
            create: { userId, productId, quantity, selected: true },
            include: { product: true },
        });
        const bound = await this.getProductProjectId(item.productId);
        return {
            id: item.id,
            productId: item.productId,
            quantity: item.quantity,
            selected: item.selected,
            product: this.serializeProduct(item.product, bound),
        };
    }
    async updateCart(userId, itemId, body) {
        const existed = await this.prisma.cartItem.findUnique({ where: { id: itemId } });
        if (!existed || existed.userId !== userId)
            throw new common_1.NotFoundException('Cart item not found');
        const quantity = body.quantity != null ? Number(body.quantity) : undefined;
        if (quantity != null && quantity < 1)
            throw new common_1.BadRequestException('Invalid quantity');
        const item = await this.prisma.cartItem.update({
            where: { id: itemId },
            data: {
                quantity,
                selected: body.selected != null ? Boolean(body.selected) : undefined,
            },
            include: { product: true },
        });
        const bound = await this.getProductProjectId(item.productId);
        return {
            id: item.id,
            productId: item.productId,
            quantity: item.quantity,
            selected: item.selected,
            product: this.serializeProduct(item.product, bound),
        };
    }
    async removeCart(userId, itemId) {
        const item = await this.prisma.cartItem.findUnique({ where: { id: itemId } });
        if (!item || item.userId !== userId)
            throw new common_1.NotFoundException('Cart item not found');
        await this.prisma.cartItem.delete({ where: { id: itemId } });
        return { id: itemId, deleted: true };
    }
    async getFavorites(userId) {
        const items = await this.prisma.favorite.findMany({
            where: { userId },
            include: { product: true },
            orderBy: { createdAt: 'desc' },
        });
        const bindings = await this.getProductBindings();
        return items.map((item) => this.serializeProduct(item.product, bindings[item.productId] != null ? bindings[item.productId] : ''));
    }
    async addFavorite(userId, body) {
        const productId = (body.productId ?? body.id);
        const item = await this.prisma.favorite.upsert({
            where: { userId_productId: { userId, productId } },
            update: {},
            create: { userId, productId },
            include: { product: true },
        });
        const bound = await this.getProductProjectId(item.productId);
        return this.serializeProduct(item.product, bound);
    }
    async removeFavorite(userId, productId) {
        const favorite = await this.prisma.favorite.findUnique({
            where: { userId_productId: { userId, productId } },
        });
        if (!favorite)
            return { productId, deleted: true };
        await this.prisma.favorite.delete({
            where: { userId_productId: { userId, productId } },
        });
        return { productId, deleted: true };
    }
    productImageDir() {
        return (0, path_1.join)(process.cwd(), 'uploads', 'products');
    }
    async getProductBindings() {
        const rows = await this.prisma.$queryRawUnsafe(`SELECT id, "projectId" FROM "Product"`);
        const map = {};
        for (const row of rows) {
            map[String(row.id)] = row.projectId != null ? String(row.projectId) : '';
        }
        return map;
    }
    async getProductProjectId(id) {
        const rows = await this.prisma.$queryRawUnsafe(`SELECT "projectId" FROM "Product" WHERE id = $1`, id);
        if (!rows.length || rows[0].projectId == null)
            return '';
        return String(rows[0].projectId);
    }
    serializeProduct(product, projectId) {
        const bound = projectId != null ? String(projectId) : '';
        return {
            id: product.id,
            sku: product.sku,
            name: product.name,
            intro: product.intro || '',
            description: product.description || '',
            gallery: this.asStringList(product.gallery, product.imageUrl),
            detailBlocks: this.asDetailBlocks(product.detailBlocks, product.description),
            specs: this.asSpecList(product.specs),
            services: this.asStringList(product.services, ''),
            category: product.category,
            price: product.price.toString(),
            icon: product.icon,
            imageUrl: product.imageUrl,
            imgStyle: product.imgStyle,
            status: product.status === 'ON_SALE' ? 'on_sale' : 'off_sale',
            stock: product.stock,
            sales: product.sales,
            ratingAvg: 0,
            ratingCount: 0,
            createdAt: product.createdAt,
            updatedAt: product.updatedAt,
            projectId: bound,
        };
    }
    asStringList(value, fallback) {
        if (Array.isArray(value))
            return value.map((item) => String(item || '').trim()).filter((item) => item.length > 0);
        const text = String(fallback || '').trim();
        return text ? [text] : [];
    }
    asDetailBlocks(value, description) {
        const out = [];
        if (Array.isArray(value)) {
            for (const row of value) {
                const type = String((row && row.type) || '').trim();
                const id = String((row && row.id) || '').trim() || ('blk_' + out.length);
                if (type === 'text') {
                    const html = String((row && row.html) || '').trim();
                    if (html)
                        out.push({ id, type, html, url: '', width: 100, urls: [] });
                }
                else if (type === 'image') {
                    const url = String((row && row.url) || '').trim();
                    if (!url)
                        continue;
                    let width = Number(row && row.width);
                    if (!Number.isFinite(width))
                        width = 100;
                    width = Math.min(100, Math.max(40, Math.round(width)));
                    out.push({ id, type, url, width, html: '', urls: [] });
                }
                else if (type === 'carousel' || type === 'stack') {
                    const urls = Array.isArray(row && row.urls) ? row.urls.map((u) => String(u || '').trim()).filter((u) => u.length > 0) : [];
                    if (!urls.length)
                        continue;
                    out.push({ id, type, urls, html: '', url: '', width: 100 });
                }
            }
        }
        if (out.length)
            return out;
        const desc = String(description || '').trim();
        if (!desc)
            return [];
        return [{ id: 'blk_legacy_text', type: 'text', html: '<p>' + desc.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</p>', url: '', width: 100, urls: [] }];
    }
    asSpecList(value) {
        if (!Array.isArray(value))
            return [];
        const out = [];
        for (const row of value) {
            const label = String((row && row.label) || '').trim();
            const val = String((row && row.value) || '').trim();
            if (label || val)
                out.push({ label, value: val });
        }
        return out;
    }
    dateKey(value) {
        const dt = value instanceof Date ? value : new Date(value);
        if (Number.isNaN(dt.getTime()))
            return '';
        return dt.toLocaleDateString('en-CA', { timeZone: 'Asia/Shanghai' });
    }
    async productRating(productId) {
        try {
            const rows = await this.prisma.$queryRawUnsafe(`SELECT COALESCE(AVG(rating), 0)::float AS avg, COUNT(rating)::int AS count
               FROM "ProductComment"
               WHERE "productId" = $1 AND "parentId" IS NULL AND status = 'VISIBLE' AND rating IS NOT NULL`, productId);
            const avg = rows && rows[0] ? Number(rows[0].avg) : 0;
            const count = rows && rows[0] ? Number(rows[0].count) : 0;
            return { ratingAvg: Math.round(avg * 10) / 10, ratingCount: count };
        }
        catch (_err) {
            return { ratingAvg: 0, ratingCount: 0 };
        }
    }
    serializeComment(row, names, byId) {
        const uid = row.userId ? String(row.userId) : '';
        const parent = row.parentId && byId ? byId[row.parentId] : null;
        const parentUid = parent && parent.userId ? String(parent.userId) : '';
        return {
            id: row.id,
            parentId: row.parentId || '',
            content: row.content,
            rating: row.rating != null ? Number(row.rating) : 0,
            official: !!row.official,
            status: row.status,
            createdAt: row.createdAt,
            userId: uid,
            authorName: row.official ? '官方' : (names[uid] || '学员'),
            replyToName: parent ? (parent.official ? '官方' : (names[parentUid] || '学员')) : '',
            replies: Array.isArray(row.replies) ? row.replies.map((item) => this.serializeComment(item, names, byId)) : [],
        };
    }
    async commentAuthorNames(rows) {
        const ids = [];
        for (const row of rows || []) {
            if (row.userId)
                ids.push(String(row.userId));
        }
        const unique = [...new Set(ids)];
        if (!unique.length)
            return {};
        const users = await this.prisma.user.findMany({ where: { id: { in: unique } }, select: { id: true, nickname: true, realName: true } });
        const names = {};
        for (const user of users)
            names[user.id] = user.realName || user.nickname || '学员';
        return names;
    }
    buildCommentTree(rows, names) {
        const byId = {};
        for (const row of rows)
            byId[row.id] = row;
        const packed = {};
        for (const row of rows)
            packed[row.id] = this.serializeComment({ ...row, replies: [] }, names, byId);
        const roots = [];
        for (const row of rows) {
            const node = packed[row.id];
            if (row.parentId && packed[row.parentId])
                packed[row.parentId].replies.push(node);
            else
                roots.push(node);
        }
        return roots;
    }
    groupCommentsByDate(items) {
        const groups = [];
        const index = {};
        for (const item of items) {
            const date = this.dateKey(item.createdAt);
            if (!index[date]) {
                index[date] = { date, items: [] };
                groups.push(index[date]);
            }
            index[date].items.push(item);
        }
        return groups;
    }
    async listProductComments(productId, all = false, query = {}) {
        const product = await this.prisma.product.findUnique({ where: { id: productId }, select: { id: true } });
        if (!product)
            throw new common_1.NotFoundException('Product not found');
        const where = { productId };
        if (!all)
            where.status = 'VISIBLE';
        const rows = await this.prisma.productComment.findMany({
            where,
            orderBy: { createdAt: 'asc' },
        });
        const names = await this.commentAuthorNames(rows);
        const keyword = String((query && query.keyword) || '').trim().toLowerCase();
        const date = String((query && query.date) || '').trim();
        const ratingFilter = query && query.rating != null && String(query.rating).trim() !== '' ? Number(query.rating) : 0;
        const statusFilter = String((query && query.status) || '').trim().toUpperCase();
        const matched = new Set();
        for (const row of rows) {
            const uid = row.userId ? String(row.userId) : '';
            const author = row.official ? '官方' : (names[uid] || '学员');
            if (statusFilter && String(row.status || '').toUpperCase() !== statusFilter)
                continue;
            if (date && this.dateKey(row.createdAt) !== date)
                continue;
            if (ratingFilter >= 1 && ratingFilter <= 5) {
                if (row.parentId)
                    continue;
                if (Number(row.rating || 0) !== ratingFilter)
                    continue;
            }
            if (keyword) {
                const hay = `${row.content} ${author}`.toLowerCase();
                if (!hay.includes(keyword))
                    continue;
            }
            matched.add(row.id);
        }
        const include = new Set();
        const byId = {};
        for (const row of rows)
            byId[row.id] = row;
        const addAncestors = (id) => {
            let cur = id;
            while (cur && !include.has(cur)) {
                include.add(cur);
                cur = byId[cur] && byId[cur].parentId ? byId[cur].parentId : null;
            }
        };
        const childrenOf = {};
        for (const row of rows) {
            if (!row.parentId)
                continue;
            if (!childrenOf[row.parentId])
                childrenOf[row.parentId] = [];
            childrenOf[row.parentId].push(row.id);
        }
        const addDescendants = (id) => {
            const kids = childrenOf[id] || [];
            for (const kid of kids) {
                if (include.has(kid))
                    continue;
                include.add(kid);
                addDescendants(kid);
            }
        };
        const filtering = !!(keyword || date || (ratingFilter >= 1 && ratingFilter <= 5) || statusFilter);
        for (const row of rows) {
            if (filtering && !matched.has(row.id))
                continue;
            addAncestors(row.id);
            addDescendants(row.id);
        }
        const kept = filtering ? rows.filter((row) => include.has(row.id)) : rows;
        const items = this.buildCommentTree(kept, names).reverse();
        const targets = kept.map((row) => {
            const uid = row.userId ? String(row.userId) : '';
            return {
                id: row.id,
                parentId: row.parentId || '',
                content: row.content,
                rating: row.rating != null ? Number(row.rating) : 0,
                official: !!row.official,
                status: row.status,
                createdAt: row.createdAt,
                authorName: row.official ? '官方' : (names[uid] || '学员'),
            };
        });
        const rating = await this.productRating(productId);
        const page = Math.max(1, parseInt(String((query && query.page) || '1'), 10) || 1);
        const pageSize = Math.min(50, Math.max(1, parseInt(String((query && query.pageSize) || '10'), 10) || 10));
        const total = items.length;
        const slice = items.slice((page - 1) * pageSize, page * pageSize);
        return {
            groups: this.groupCommentsByDate(slice),
            items: slice,
            targets,
            total,
            page,
            pageSize,
            ...rating,
        };
    }
    async hasCompletedPurchase(userId, productId) {
        if (!userId)
            return false;
        const order = await this.prisma.order.findFirst({
            where: {
                userId,
                status: 'COMPLETED',
                items: { some: { productId } },
            },
            select: { id: true },
        });
        return !!order;
    }
    async getReviewAccess(userId, productId) {
        const product = await this.prisma.product.findUnique({ where: { id: productId }, select: { id: true } });
        if (!product)
            throw new common_1.NotFoundException('Product not found');
        return { canComment: await this.hasCompletedPurchase(userId, productId) };
    }
    async createProductComment(userId, productId, body) {
        const content = String(body.content || '').trim();
        if (content.length < 1 || content.length > 200)
            throw new common_1.BadRequestException('请填写1到200字评价');
        const product = await this.prisma.product.findUnique({ where: { id: productId }, select: { id: true } });
        if (!product)
            throw new common_1.NotFoundException('Product not found');
        const bought = await this.hasCompletedPurchase(userId, productId);
        if (!bought)
            throw new common_1.ForbiddenException('完成购买后才可以评价');
        const parentId = String(body.parentId || '').trim() || null;
        let rating = null;
        if (parentId) {
            const parent = await this.prisma.productComment.findFirst({ where: { id: parentId, productId } });
            if (!parent)
                throw new common_1.BadRequestException('回复的评价不存在');
        }
        else {
            const value = Number(body.rating);
            if (!Number.isInteger(value) || value < 1 || value > 5)
                throw new common_1.BadRequestException('请选择1到5星评分');
            rating = value;
        }
        const row = await this.prisma.productComment.create({
            data: {
                id: 'cmt_' + (0, crypto_1.randomUUID)(),
                productId,
                userId,
                parentId,
                content,
                rating,
                official: false,
                status: 'VISIBLE',
            },
        });
        const names = await this.commentAuthorNames([row]);
        return this.serializeComment(row, names, { [row.id]: row });
    }
};
exports.MallService = MallService;
exports.MallService = MallService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], MallService);
//# sourceMappingURL=mall.service.js.map
