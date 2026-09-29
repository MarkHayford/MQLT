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
exports.AdminMallService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const client_1 = require("@prisma/client");
const crypto_1 = require("crypto");
const client_s3_1 = require("@aws-sdk/client-s3");
const prisma_service_1 = require("../prisma/prisma.service");
const ORDER_SELECT = {
    id: true,
    orderNo: true,
    userId: true,
    status: true,
    amount: true,
    goodsAmount: true,
    addressId: true,
    receiver: true,
    receiverPhone: true,
    province: true,
    city: true,
    district: true,
    addressDetail: true,
    remark: true,
    adminRemark: true,
    shippingCompany: true,
    trackingNo: true,
    shippedAt: true,
    paidAt: true,
    completedAt: true,
    cancelledAt: true,
    userDeletedAt: true,
    createdAt: true,
    updatedAt: true,
    user: {
        select: {
            id: true,
            nickname: true,
            phone: true,
            studyNo: true,
        },
    },
    items: {
        select: {
            id: true,
            quantity: true,
            price: true,
            product: {
                select: {
                    id: true,
                    name: true,
                    sku: true,
                },
            },
        },
    },
};
const REFUNDABLE_CANCEL_STATUSES = [client_1.OrderStatus.UNPAID, client_1.OrderStatus.PAID, client_1.OrderStatus.UNRECEIVED];
const ORDER_TRANSITIONS = {
    [client_1.OrderStatus.UNPAID]: [client_1.OrderStatus.PAID, client_1.OrderStatus.CANCELLED],
    [client_1.OrderStatus.PAID]: [client_1.OrderStatus.UNRECEIVED, client_1.OrderStatus.CANCELLED],
    [client_1.OrderStatus.UNRECEIVED]: [client_1.OrderStatus.COMPLETED, client_1.OrderStatus.CANCELLED],
    [client_1.OrderStatus.UNUSED]: [],
    [client_1.OrderStatus.COMPLETED]: [],
    [client_1.OrderStatus.CANCELLED]: [],
    [client_1.OrderStatus.REFUNDED]: [],
};
let AdminMallService = class AdminMallService {
    constructor(prisma, config) {
        this.prisma = prisma;
        this.config = config;
        this.s3 = null;
    }

    assertOpsCanCompleteMallOrder(actor) {
        if (!actor || !actor.mpAccess) {
            throw new common_1.ForbiddenException('仅平台运维可完成商城订单；入驻企业请等待用户在小程序确认收货');
        }
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
        if (q && actor && actor.mpAccess) {
            const ents = this.scopedEnterpriseIds(actor);
            if (ents && ents.indexOf(q) < 0)
                throw new common_1.ForbiddenException('当前职位不能管理该企业');
            return q;
        }
        return '';
    }
    async projectIdsOfEnterprise(eid) {
        if (!eid)
            return [];
        const rows = await this.prisma.studyProject.findMany({ where: { enterpriseId: eid }, select: { id: true } });
        return rows.map((row) => row.id);
    }
    scopedProjectIds(actor) {
        if (!actor)
            return null;
        if (actor.mpAccess) {
            const raw = Array.isArray(actor.mpProjectIds) ? actor.mpProjectIds : [];
            const out = [];
            for (let i = 0; i < raw.length; i++) {
                const id = String(raw[i] || '').trim();
                if (id && out.indexOf(id) < 0)
                    out.push(id);
            }
            return out.length ? out : null;
        }
        if (!actor.merchantAccess)
            return null;
        const raw = Array.isArray(actor.merchantProjectIds) ? actor.merchantProjectIds : [];
        const out = [];
        for (let i = 0; i < raw.length; i++) {
            const id = String(raw[i] || '').trim();
            if (id && out.indexOf(id) < 0)
                out.push(id);
        }
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
    async allowedProjectIdSet(actor, enterpriseId) {
        const eid = this.scopeEnterpriseId(actor, enterpriseId);
        const scoped = this.scopedProjectIds(actor);
        if (!eid) {
            if (scoped)
                return new Set(scoped);
            const ents = this.scopedEnterpriseIds(actor);
            if (ents) {
                const ids = [];
                for (let i = 0; i < ents.length; i++) {
                    const part = await this.projectIdsOfEnterprise(ents[i]);
                    for (let j = 0; j < part.length; j++)
                        ids.push(part[j]);
                }
                return new Set(ids);
            }
            return null;
        }
        let allowed = new Set(await this.projectIdsOfEnterprise(eid));
        if (scoped)
            allowed = new Set(scoped.filter((id) => allowed.has(id)));
        return allowed;
    }
    async products(keyword, category, status, actor, enterpriseId) {
        const filters = [];
        const search = this.trimText(keyword);
        const categoryText = this.trimText(category);
        const statusFilter = this.mapProductStatusFilter(status);
        if (search) {
            filters.push({
                OR: [
                    { name: { contains: search } },
                    { sku: { contains: search } },
                    { category: { contains: search } },
                ],
            });
        }
        if (categoryText && categoryText.toLowerCase() !== 'all') {
            filters.push({ category: categoryText });
        }
        if (statusFilter) {
            filters.push({ status: statusFilter });
        }
        const query = {
            orderBy: [{ status: 'asc' }, { sales: 'desc' }, { createdAt: 'desc' }],
        };
        if (filters.length > 0)
            query.where = { AND: filters };
        let products = await this.prisma.product.findMany(query);
        const bindings = await this.getProductBindings();
        const allowed = await this.allowedProjectIdSet(actor, enterpriseId);
        if (allowed) {
            products = products.filter((product) => allowed.has(bindings[product.id]));
        }
        return products.map((product) => this.serializeProduct(product, bindings[product.id] != null ? bindings[product.id] : ''));
    }
    async productCategories() {
        const categories = await this.prisma.product.findMany({
            distinct: ['category'],
            select: { category: true },
            orderBy: { category: 'asc' },
        });
        return categories.map((item) => item.category).filter((item) => item.length > 0);
    }
    async productDetail(id) {
        const product = await this.prisma.product.findUnique({
            where: { id },
            include: {
                _count: {
                    select: { cartItems: true, favorites: true, orderItems: true },
                },
            },
        });
        if (!product)
            throw new common_1.NotFoundException('Product not found');
        const bound = await this.getProductProjectId(id);
        return this.serializeProduct(product, bound);
    }
    async writeOpLog(actor, entry) {
        if (!actor || !entry)
            return;
        try {
            try {
                await this.prisma.$executeRawUnsafe(`ALTER TABLE "AdminOperationLog" ADD COLUMN IF NOT EXISTS "enterpriseId" TEXT`);
            }
            catch (_schemaErr) { }
            try {
                await this.prisma.$executeRawUnsafe(`ALTER TABLE "AdminOperationLog" ADD COLUMN IF NOT EXISTS "projectId" TEXT`);
            }
            catch (_schemaErr2) { }
            const detail = entry.detail || {};
            let enterpriseId = String(entry.enterpriseId || (actor && actor.enterpriseId) || detail.enterpriseId || '').trim() || null;
            let projectId = String(entry.projectId || detail.projectId || '').trim() || null;
            if (!projectId && String(entry.targetType || '') === 'Product' && entry.targetId) {
                try {
                    projectId = String(await this.getProductProjectId(String(entry.targetId)) || '').trim() || null;
                }
                catch (_pidErr) {
                    projectId = null;
                }
            }
            if (!enterpriseId && projectId) {
                try {
                    const rows = await this.prisma.$queryRawUnsafe(`SELECT "enterpriseId" FROM "StudyProject" WHERE id = $1`, projectId);
                    if (rows && rows[0] && rows[0].enterpriseId)
                        enterpriseId = String(rows[0].enterpriseId);
                }
                catch (_eidErr) { }
            }
            await this.prisma.$executeRawUnsafe(`INSERT INTO "AdminOperationLog"
              (id, "actorId", "actorName", "actorPhone", module, action, "targetType", "targetId", "targetLabel", summary, detail, ip, "enterpriseId", "projectId", "createdAt")
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb,$12,$13,$14,NOW())`, 'log_' + (0, crypto_1.randomUUID)(), actor.actorId || null, String(actor.actorName || ''), String(actor.actorPhone || ''), String(entry.module || ''), String(entry.action || ''), String(entry.targetType || ''), String(entry.targetId || ''), String(entry.targetLabel || ''), String(entry.summary || ''), JSON.stringify(entry.detail || {}), actor.ip || null, enterpriseId, projectId);
        }
        catch (_err) {
        }
    }
    async assertUniqueSku(sku, exceptId) {
        const value = this.trimText(sku);
        if (!value)
            return;
        const existed = await this.prisma.product.findFirst({
            where: exceptId ? { sku: value, NOT: { id: exceptId } } : { sku: value },
            select: { id: true },
        });
        if (existed)
            throw new common_1.BadRequestException('货号已被占用');
    }
    async createProduct(body, actor) {
        await this.assertUniqueSku(body.sku);
        const product = await this.prisma.product.create({
            data: {
                id: this.trimText(body.id) || `prod_${(0, crypto_1.randomUUID)()}`,
                sku: this.trimText(body.sku) || `MQ-${(0, crypto_1.randomUUID)()}`,
                name: this.mapProductName(body.name),
                intro: this.trimText(body.intro),
                description: this.trimText(body.description) || this.plainFromDetailBlocks(this.mapDetailBlocks(body.detailBlocks, body.description)),
                gallery: this.mapStringList(body.gallery),
                detailBlocks: this.mapDetailBlocks(body.detailBlocks, body.description),
                specs: this.mapSpecList(body.specs),
                services: this.mapStringList(body.services),
                category: this.trimText(body.category) || '文具礼品',
                price: this.mapNonNegativeDecimal(body.price ?? 0, 'Invalid product value'),
                icon: this.mapNullableText(body.icon),
                imageUrl: this.mapNullableText(body.imageUrl),
                imgStyle: this.mapNullableText(body.imgStyle),
                status: this.mapProductStatus(String(body.status ?? client_1.ProductStatus.ON_SALE)),
                stock: this.mapNonNegativeInteger(body.stock ?? 0, 'Invalid product value'),
                sales: this.mapNonNegativeInteger(body.sales ?? 0, 'Invalid product value'),
            },
        });
        await this.setProductProjectId(product.id, body.projectId);
        const bound = await this.getProductProjectId(product.id);
        const serialized = this.serializeProduct(product, bound);
        await this.writeOpLog(actor, {
            module: 'mall',
            action: 'create',
            targetType: 'Product',
            targetId: product.id,
            targetLabel: product.name,
            summary: '上架商品 ' + product.name,
            projectId: bound || undefined,
            detail: { sku: product.sku, price: this.decimalToString(product.price), stock: product.stock, projectId: bound || '' },
        });
        return serialized;
    }
    async updateProduct(id, body, actor) {
        const existed = await this.prisma.product.findUnique({ where: { id } });
        if (!existed)
            throw new common_1.NotFoundException('Product not found');
        if (body.sku != null)
            await this.assertUniqueSku(body.sku, id);
        const product = await this.prisma.product.update({
            where: { id },
            data: {
                sku: body.sku != null ? this.trimText(body.sku) || undefined : undefined,
                name: body.name != null ? this.mapProductName(body.name) : undefined,
                intro: body.intro != null ? this.trimText(body.intro) : undefined,
                description: body.detailBlocks != null ? this.plainFromDetailBlocks(this.mapDetailBlocks(body.detailBlocks, body.description)) : (body.description != null ? this.trimText(body.description) : undefined),
                gallery: body.gallery != null ? this.mapStringList(body.gallery) : undefined,
                detailBlocks: body.detailBlocks != null ? this.mapDetailBlocks(body.detailBlocks, body.description) : undefined,
                specs: body.specs != null ? this.mapSpecList(body.specs) : undefined,
                services: body.services != null ? this.mapStringList(body.services) : undefined,
                category: body.category != null ? this.trimText(body.category) || undefined : undefined,
                price: body.price != null ? this.mapNonNegativeDecimal(body.price, 'Invalid product value') : undefined,
                icon: body.icon != null ? this.mapNullableText(body.icon) : undefined,
                imageUrl: body.imageUrl != null ? this.mapNullableText(body.imageUrl) : undefined,
                imgStyle: body.imgStyle != null ? this.mapNullableText(body.imgStyle) : undefined,
                status: body.status != null ? this.mapProductStatus(String(body.status)) : undefined,
                stock: body.stock != null ? this.mapNonNegativeInteger(body.stock, 'Invalid product value') : undefined,
                sales: body.sales != null ? this.mapNonNegativeInteger(body.sales, 'Invalid product value') : undefined,
            },
        });
        if (body.projectId !== undefined)
            await this.setProductProjectId(id, body.projectId);
        const bound = await this.getProductProjectId(id);
        const serialized = this.serializeProduct(product, bound);
        await this.writeOpLog(actor, {
            module: 'mall',
            action: 'update',
            targetType: 'Product',
            targetId: id,
            targetLabel: product.name,
            summary: '修改商品 ' + product.name,
            projectId: bound || undefined,
            detail: { name: product.name, status: product.status, price: this.decimalToString(product.price), projectId: bound || '' },
        });
        return serialized;
    }
    async adjustStock(id, body, actor) {
        const delta = this.mapStockDelta(body.delta);
        const reason = this.trimText(body.reason);
        if (!reason)
            throw new common_1.BadRequestException('Invalid stock adjustment');
        return this.prisma.$transaction(async (tx) => {
            const before = await tx.product.findUnique({ where: { id } });
            if (!before)
                throw new common_1.NotFoundException('Product not found');
            const where = delta < 0 ? { id, stock: { gte: Math.abs(delta) } } : { id };
            const updated = await tx.product.updateMany({
                where,
                data: { stock: { increment: delta } },
            });
            if (updated.count !== 1) {
                if (delta < 0)
                    throw new common_1.BadRequestException('Stock cannot be negative');
                throw new common_1.NotFoundException('Product not found');
            }
            const after = await tx.product.findUnique({ where: { id } });
            if (!after)
                throw new common_1.NotFoundException('Product not found');
            const result = {
                ...this.serializeProduct(after),
                adjustment: {
                    delta,
                    reason,
                    stockBefore: before.stock,
                    stockAfter: after.stock,
                },
            };
            await this.writeOpLog(actor, {
                module: 'mall',
                action: 'stock',
                targetType: 'Product',
                targetId: id,
                targetLabel: after.name,
                summary: (delta > 0 ? '补货 +' : '减库存 ') + delta + ' · ' + after.name,
                detail: { delta, reason, stockBefore: before.stock, stockAfter: after.stock },
            });
            return result;
        });
    }
    async deleteProduct(id, actor) {
        try {
            return await this.prisma.$transaction(async (tx) => {
                const existed = await tx.product.findUnique({ where: { id } });
                if (!existed)
                    throw new common_1.NotFoundException('Product not found');
                const orderItems = await tx.orderItem.count({ where: { productId: id } });
                if (orderItems > 0) {
                    const product = await tx.product.update({
                        where: { id },
                        data: { status: client_1.ProductStatus.OFF_SALE },
                    });
                    return {
                        id,
                        deleted: false,
                        offSale: true,
                        product: this.serializeProduct(product),
                    };
                }
                await tx.cartItem.deleteMany({ where: { productId: id } });
                await tx.favorite.deleteMany({ where: { productId: id } });
                await tx.product.delete({ where: { id } });
                await this.writeOpLog(actor, {
                    module: 'mall',
                    action: 'delete',
                    targetType: 'Product',
                    targetId: id,
                    targetLabel: existed.name,
                    summary: '删除商品 ' + existed.name,
                    detail: { sku: existed.sku },
                });
                return { id, deleted: true, offSale: false };
            });
        }
        catch (error) {
            if (!this.isForeignKeyConstraintError(error))
                throw error;
            const product = await this.prisma.product.update({
                where: { id },
                data: { status: client_1.ProductStatus.OFF_SALE },
            });
            return {
                id,
                deleted: false,
                offSale: true,
                product: this.serializeProduct(product),
            };
        }
    }
    async orders(status, keyword, actor, enterpriseId) {
        const filters = [];
        const statusFilter = this.mapOrderStatusFilter(status);
        const search = this.trimText(keyword);
        if (statusFilter) {
            filters.push({ status: statusFilter });
        }
        if (search) {
            filters.push({
                OR: [
                    { orderNo: { contains: search } },
                    {
                        user: {
                            is: {
                                OR: [
                                    { phone: { contains: search } },
                                    { nickname: { contains: search } },
                                    { studyNo: { contains: search } },
                                ],
                            },
                        },
                    },
                ],
            });
        }
        const query = {
            select: ORDER_SELECT,
            orderBy: { createdAt: 'desc' },
            take: 200,
        };
        if (filters.length > 0)
            query.where = { AND: filters };
        let orders = await this.prisma.order.findMany(query);
        const allowed = await this.allowedProjectIdSet(actor, enterpriseId);
        if (allowed) {
            const bindings = await this.getProductBindings();
            orders = orders.filter((order) => {
                const items = order.items || [];
                for (let i = 0; i < items.length; i++) {
                    const pid = items[i].product && items[i].product.id;
                    if (pid && allowed.has(bindings[pid]))
                        return true;
                }
                return false;
            });
        }
        return orders.map((order) => this.serializeOrder(order));
    }
    async orderDetail(id) {
        const order = await this.prisma.order.findUnique({
            where: { id },
            select: ORDER_SELECT,
        });
        if (!order)
            throw new common_1.NotFoundException('Order not found');
        return this.serializeOrder(order);
    }
    async updateOrder(id, body, actor) {
        const existed = await this.prisma.order.findUnique({
            where: { id },
            select: ORDER_SELECT,
        });
        if (!existed)
            throw new common_1.NotFoundException('Order not found');
        const requestedStatus = this.trimText(body.status);
        const nextStatus = requestedStatus ? this.mapOrderStatus(requestedStatus) : existed.status;
        if (nextStatus === client_1.OrderStatus.COMPLETED && existed.status !== client_1.OrderStatus.COMPLETED) {
            this.assertOpsCanCompleteMallOrder(actor);
        }
        if (this.isTerminalOrderStatus(existed.status)) {
            return this.updateTerminalOrder(id, existed, nextStatus, body);
        }
        this.assertOrderTransition(existed.status, nextStatus);
        const order = await this.prisma.$transaction((tx) => this.persistOrderUpdate(tx, existed, nextStatus, body, new Date()));
        return this.serializeOrder(order);
    }
    async payOrder(id) {
        const order = await this.prisma.$transaction(async (tx) => {
            await this.claimOrderUpdate(tx, {
                where: { id, status: client_1.OrderStatus.UNPAID },
                data: { status: client_1.OrderStatus.PAID, paidAt: new Date() },
            });
            return this.findOrderForAdmin(tx, id);
        });
        return this.serializeOrder(order);
    }
    async shipOrder(id, body) {
        const shippingCompany = this.trimText(body.shippingCompany);
        const trackingNo = this.trimText(body.trackingNo);
        if (!shippingCompany || !trackingNo) {
            throw new common_1.BadRequestException('Shipping company and tracking number are required');
        }
        const order = await this.prisma.$transaction(async (tx) => {
            await this.claimOrderUpdate(tx, {
                where: { id, status: { in: [client_1.OrderStatus.PAID, client_1.OrderStatus.UNRECEIVED] } },
                data: {
                    status: client_1.OrderStatus.UNRECEIVED,
                    shippingCompany,
                    trackingNo,
                    shippedAt: new Date(),
                },
            });
            return this.findOrderForAdmin(tx, id);
        });
        return this.serializeOrder(order);
    }
    async completeOrder(id, actor) {
        this.assertOpsCanCompleteMallOrder(actor);
        const order = await this.prisma.$transaction(async (tx) => {
            await this.claimOrderUpdate(tx, {
                where: { id, status: client_1.OrderStatus.UNRECEIVED },
                data: { status: client_1.OrderStatus.COMPLETED, completedAt: new Date() },
            });
            return this.findOrderForAdmin(tx, id);
        });
        return this.serializeOrder(order);
    }
    async cancelOrder(id) {
        const now = new Date();
        const order = await this.prisma.$transaction((tx) => this.persistCancelledOrder(tx, id, now));
        return this.serializeOrder(order);
    }
    async deleteOrder(id) {
        const existed = await this.prisma.order.findUnique({
            where: { id },
            select: ORDER_SELECT,
        });
        if (!existed)
            throw new common_1.NotFoundException('Order not found');
        await this.prisma.$transaction(async (tx) => {
            await tx.orderItem.deleteMany({ where: { orderId: id } });
            await tx.order.delete({ where: { id } });
        });
        return { id, deleted: true };
    }
    async deleteOrders(ids) {
        const list = Array.isArray(ids) ? ids.map((id) => String(id || '').trim()).filter((id) => id.length > 0) : [];
        const uniq = [];
        for (let i = 0; i < list.length; i++) {
            if (uniq.indexOf(list[i]) < 0)
                uniq.push(list[i]);
        }
        let deleted = 0;
        for (let i = 0; i < uniq.length; i++) {
            try {
                await this.deleteOrder(uniq[i]);
                deleted += 1;
            }
            catch (_err) { }
        }
        return { deleted };
    }
    async persistOrderUpdate(tx, existed, nextStatus, body, now) {
        const statusChanged = existed.status !== nextStatus;
        const data = {
            status: nextStatus,
        };
        if (Object.prototype.hasOwnProperty.call(body, 'remark')) {
            data.remark = this.mapNullableText(body.remark);
        }
        if (Object.prototype.hasOwnProperty.call(body, 'adminRemark')) {
            data.adminRemark = this.mapNullableText(body.adminRemark);
        }
        if (statusChanged &&
            (nextStatus === client_1.OrderStatus.PAID || nextStatus === client_1.OrderStatus.UNRECEIVED || nextStatus === client_1.OrderStatus.COMPLETED) &&
            !existed.paidAt) {
            data.paidAt = now;
        }
        if (statusChanged && nextStatus === client_1.OrderStatus.COMPLETED && !existed.completedAt) {
            data.completedAt = now;
        }
        if (statusChanged && nextStatus === client_1.OrderStatus.CANCELLED) {
            delete data.status;
            return this.persistCancelledOrder(tx, existed.id, now, data);
        }
        await this.claimOrderUpdate(tx, {
            where: { id: existed.id, status: existed.status },
            data,
        });
        return this.findOrderForAdmin(tx, existed.id);
    }
    async updateTerminalOrder(id, existed, nextStatus, body) {
        if (this.hasOwn(body, 'status') || nextStatus !== existed.status || this.hasOwn(body, 'remark')) {
            throw new common_1.BadRequestException('Invalid order status transition');
        }
        const invalidKeys = Object.keys(body).filter((key) => key !== 'adminRemark');
        if (invalidKeys.length > 0) {
            throw new common_1.BadRequestException('Invalid order status transition');
        }
        if (!this.hasOwn(body, 'adminRemark')) {
            return this.serializeOrder(existed);
        }
        const order = await this.prisma.$transaction(async (tx) => {
            await this.claimOrderUpdate(tx, {
                where: { id, status: existed.status },
                data: { adminRemark: this.mapNullableText(body.adminRemark) },
            });
            return this.findOrderForAdmin(tx, id);
        });
        return this.serializeOrder(order);
    }
    async persistCancelledOrder(tx, id, now, extraData = {}) {
        await this.claimOrderUpdate(tx, {
            where: { id, status: { in: REFUNDABLE_CANCEL_STATUSES } },
            data: {
                status: client_1.OrderStatus.CANCELLED,
                cancelledAt: now,
                ...extraData,
            },
        });
        return this.findOrderForAdmin(tx, id);
    }
    async claimOrderUpdate(tx, args) {
        const updated = await tx.order.updateMany(args);
        if (updated.count !== 1) {
            const existed = await tx.order.findUnique({
                where: { id: args.where.id },
                select: { id: true },
            });
            if (!existed)
                throw new common_1.NotFoundException('Order not found');
            throw new common_1.BadRequestException('Invalid order status transition');
        }
    }
    async findOrderForAdmin(tx, id) {
        const order = await tx.order.findUnique({
            where: { id },
            select: ORDER_SELECT,
        });
        if (!order)
            throw new common_1.NotFoundException('Order not found');
        return order;
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
    async setProductProjectId(id, projectId) {
        if (projectId === undefined)
            return;
        const pid = projectId == null ? '' : String(projectId).trim();
        if (pid.length === 0) {
            await this.prisma.$executeRawUnsafe(`UPDATE "Product" SET "projectId" = NULL WHERE id = $1`, id);
            return;
        }
        await this.prisma.$executeRawUnsafe(`UPDATE "Product" SET "projectId" = $1 WHERE id = $2`, pid, id);
    }
    serializeProduct(product, projectId) {
        const { _count, canBePrize, ...rest } = product;
        const bound = projectId != null ? String(projectId) : '';
        const serialized = {
            ...rest,
            projectId: bound,
            intro: product.intro || '',
            description: product.description || '',
            gallery: this.mapStringList(product.gallery),
            detailBlocks: this.mapDetailBlocks(product.detailBlocks, product.description),
            specs: this.mapSpecList(product.specs),
            services: this.mapStringList(product.services),
            price: this.decimalToString(product.price),
        };
        if (_count) {
            serialized.references = {
                cartItems: _count.cartItems ?? 0,
                favorites: _count.favorites ?? 0,
                orderItems: _count.orderItems ?? 0,
            };
        }
        return serialized;
    }
    serializeOrder(order) {
        return {
            id: order.id,
            orderNo: order.orderNo,
            status: order.status,
            goodsAmount: this.decimalToString(order.goodsAmount ?? order.amount),
            amount: this.decimalToString(order.amount),
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
            userDeletedAt: order.userDeletedAt,
            createdAt: order.createdAt,
            updatedAt: order.updatedAt,
            user: order.user
                ? {
                    id: order.user.id,
                    nickname: order.user.nickname,
                    phone: order.user.phone,
                    studyNo: order.user.studyNo,
                }
                : null,
            items: (order.items ?? []).map((item) => ({
                id: item.id,
                quantity: item.quantity,
                price: this.decimalToString(item.price),
                product: {
                    id: item.product.id,
                    name: item.product.name,
                    sku: item.product.sku,
                },
            })),
        };
    }
    assertOrderTransition(current, next) {
        if (current === next)
            return;
        const allowed = ORDER_TRANSITIONS[current] ?? [];
        if (!allowed.includes(next)) {
            throw new common_1.BadRequestException('Invalid order status transition');
        }
    }
    isTerminalOrderStatus(status) {
        return status === client_1.OrderStatus.COMPLETED || status === client_1.OrderStatus.CANCELLED;
    }
    hasOwn(object, key) {
        return Object.prototype.hasOwnProperty.call(object, key);
    }
    mapProductStatusFilter(status) {
        const normalized = this.trimText(status)?.toUpperCase();
        if (!normalized || normalized === 'ALL')
            return undefined;
        return normalized === client_1.ProductStatus.OFF_SALE ? client_1.ProductStatus.OFF_SALE : client_1.ProductStatus.ON_SALE;
    }
    mapProductStatus(status) {
        const normalized = status.trim().toUpperCase();
        return normalized === client_1.ProductStatus.OFF_SALE ? client_1.ProductStatus.OFF_SALE : client_1.ProductStatus.ON_SALE;
    }
    mapOrderStatusFilter(status) {
        const normalized = this.trimText(status)?.toUpperCase();
        if (!normalized || normalized === 'ALL')
            return undefined;
        if (normalized in client_1.OrderStatus)
            return normalized;
        return undefined;
    }
    mapOrderStatus(status) {
        const normalized = status.trim().toUpperCase();
        if (normalized in client_1.OrderStatus)
            return normalized;
        throw new common_1.BadRequestException('Invalid order status transition');
    }
    mapProductName(value) {
        const name = this.trimText(value);
        if (!name)
            throw new common_1.BadRequestException('Product name is required');
        return name;
    }
    mapStockDelta(value) {
        const delta = Number(value);
        if (!Number.isInteger(delta) || delta === 0) {
            throw new common_1.BadRequestException('Invalid stock adjustment');
        }
        return delta;
    }
    mapNonNegativeInteger(value, message) {
        const number = Number(value);
        if (!Number.isInteger(number) || number < 0) {
            throw new common_1.BadRequestException(message);
        }
        return number;
    }
    mapNonNegativeDecimal(value, message) {
        const text = String(value ?? '').trim();
        if (!text)
            throw new common_1.BadRequestException(message);
        const number = Number(text);
        if (!Number.isFinite(number) || number < 0) {
            throw new common_1.BadRequestException(message);
        }
        return number.toFixed(2);
    }
    mapNullableDecimal(value, message) {
        if (value == null)
            return null;
        const text = String(value).trim();
        if (!text)
            return null;
        return this.mapNonNegativeDecimal(text, message);
    }
    mapNullableText(value) {
        const text = this.trimText(value);
        return text || null;
    }
    mapBoolean(value, defaultValue) {
        if (value == null || value === '')
            return defaultValue;
        if (typeof value === 'boolean')
            return value;
        const normalized = String(value).trim().toLowerCase();
        return normalized === 'true' || normalized === '1' || normalized === 'yes' || normalized === 'on';
    }
    trimText(value) {
        if (value == null)
            return '';
        return String(value).trim();
    }
    mapStringList(value) {
        if (!Array.isArray(value))
            return [];
        return value.map((item) => String(item || '').trim()).filter((item) => item.length > 0);
    }
    mapDetailBlocks(value, description, gallery) {
        const out = [];
        if (Array.isArray(value)) {
            for (const row of value) {
                const type = this.trimText(row && row.type);
                const id = this.trimText(row && row.id) || ('blk_' + (0, crypto_1.randomUUID)());
                if (type === 'text') {
                    const html = this.sanitizeStoryHtml(row && row.html);
                    if (html)
                        out.push({ id, type, html });
                }
                else if (type === 'image') {
                    const url = this.trimText(row && row.url);
                    if (!url)
                        continue;
                    let width = Number(row && row.width);
                    if (!Number.isFinite(width))
                        width = 100;
                    width = Math.min(100, Math.max(40, Math.round(width)));
                    out.push({ id, type, url, width });
                }
                else if (type === 'carousel' || type === 'stack') {
                    const urls = this.mapStringList(row && row.urls);
                    if (!urls.length)
                        continue;
                    out.push({ id, type, urls: urls.slice(0, 12) });
                }
                if (out.length >= 40)
                    break;
            }
        }
        if (out.length)
            return out;
        const legacy = [];
        const desc = this.trimText(description);
        if (desc)
            legacy.push({ id: 'blk_legacy_text', type: 'text', html: '<p>' + this.escapeStoryText(desc) + '</p>' });
        return legacy;
    }
    sanitizeStoryHtml(html) {
        let s = String(html || '');
        s = s.replace(/<script[\s\S]*?<\/script>/gi, '');
        s = s.replace(/on[a-z]+\s*=/gi, '');
        s = s.replace(/javascript:/gi, '');
        return s.trim().slice(0, 8000);
    }
    escapeStoryText(text) {
        return String(text || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }
    plainFromDetailBlocks(blocks) {
        const parts = [];
        for (const row of blocks || []) {
            if (row && row.type === 'text')
                parts.push(String(row.html || '').replace(/<[^>]+>/g, ' '));
        }
        return parts.join(' ').replace(/\s+/g, ' ').trim().slice(0, 800);
    }
    mapSpecList(value) {
        if (!Array.isArray(value))
            return [];
        const out = [];
        for (const row of value) {
            const label = this.trimText(row && row.label);
            const val = this.trimText(row && row.value);
            if (label || val)
                out.push({ label, value: val });
        }
        return out;
    }
    commentDateKey(value) {
        const dt = value instanceof Date ? value : new Date(value);
        if (Number.isNaN(dt.getTime()))
            return '';
        return dt.toLocaleDateString('en-CA', { timeZone: 'Asia/Shanghai' });
    }
    async listProductComments(productId, query = {}) {
        const product = await this.prisma.product.findUnique({ where: { id: productId }, select: { id: true } });
        if (!product)
            throw new common_1.NotFoundException('Product not found');
        const rows = await this.prisma.productComment.findMany({
            where: { productId },
            orderBy: { createdAt: 'asc' },
        });
        const ids = [];
        for (const row of rows) {
            if (row.userId)
                ids.push(row.userId);
        }
        const users = ids.length ? await this.prisma.user.findMany({ where: { id: { in: [...new Set(ids)] } }, select: { id: true, nickname: true, realName: true } }) : [];
        const names = {};
        for (const user of users)
            names[user.id] = user.realName || user.nickname || '学员';
        const packOne = (row, byId) => {
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
                userId: row.userId || '',
                authorName: row.official ? '官方' : (names[row.userId] || '学员'),
                replyToName: parent ? (parent.official ? '官方' : (names[parentUid] || '学员')) : '',
                replies: [],
            };
        };
        const keyword = this.trimText(query.keyword).toLowerCase();
        const date = this.trimText(query.date);
        const ratingFilter = query.rating != null && String(query.rating).trim() !== '' ? Number(query.rating) : 0;
        const statusFilter = this.trimText(query.status).toUpperCase();
        const matched = new Set();
        for (const row of rows) {
            const author = row.official ? '官方' : (names[row.userId] || '学员');
            if (statusFilter && String(row.status || '').toUpperCase() !== statusFilter)
                continue;
            if (date && this.commentDateKey(row.createdAt) !== date)
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
        const byId = {};
        for (const row of rows)
            byId[row.id] = row;
        const include = new Set();
        const childrenOf = {};
        for (const row of rows) {
            if (!row.parentId)
                continue;
            if (!childrenOf[row.parentId])
                childrenOf[row.parentId] = [];
            childrenOf[row.parentId].push(row.id);
        }
        const addAncestors = (id) => {
            let cur = id;
            while (cur && !include.has(cur)) {
                include.add(cur);
                cur = byId[cur] && byId[cur].parentId ? byId[cur].parentId : null;
            }
        };
        const addDescendants = (id) => {
            for (const kid of (childrenOf[id] || [])) {
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
        const packed = {};
        for (const row of kept)
            packed[row.id] = packOne(row, byId);
        const items = [];
        for (const row of kept) {
            const node = packed[row.id];
            if (row.parentId && packed[row.parentId])
                packed[row.parentId].replies.push(node);
            else
                items.push(node);
        }
        items.reverse();
        const page = Math.max(1, parseInt(String(query.page || '1'), 10) || 1);
        const pageSize = Math.min(50, Math.max(1, parseInt(String(query.pageSize || '20'), 10) || 20));
        const total = items.length;
        const slice = items.slice((page - 1) * pageSize, page * pageSize);
        const groups = [];
        const index = {};
        for (const item of slice) {
            const key = this.commentDateKey(item.createdAt);
            if (!index[key]) {
                index[key] = { date: key, items: [] };
                groups.push(index[key]);
            }
            index[key].items.push(item);
        }
        const targets = [];
        const collectTargets = (list) => {
            for (const row of list || []) {
                targets.push(row);
                collectTargets(row.replies);
            }
        };
        collectTargets(slice);
        let ratingAvg = 0;
        let ratingCount = 0;
        try {
            const agg = await this.prisma.$queryRawUnsafe(`SELECT COALESCE(AVG(rating), 0)::float AS avg, COUNT(rating)::int AS count
               FROM "ProductComment"
               WHERE "productId" = $1 AND "parentId" IS NULL AND rating IS NOT NULL`, productId);
            ratingAvg = agg && agg[0] ? Math.round(Number(agg[0].avg) * 10) / 10 : 0;
            ratingCount = agg && agg[0] ? Number(agg[0].count) : 0;
        }
        catch (_err) {
        }
        return { groups, items: slice, targets, total, page, pageSize, ratingAvg, ratingCount };
    }
    async replyProductComment(productId, body, actor) {
        const content = this.trimText(body.content);
        if (content.length < 1 || content.length > 200)
            throw new common_1.BadRequestException('请填写回复内容');
        const parentId = this.trimText(body.parentId);
        const parent = parentId ? await this.prisma.productComment.findFirst({ where: { id: parentId, productId } }) : null;
        if (parentId && !parent)
            throw new common_1.BadRequestException('评价不存在');
        const product = await this.prisma.product.findUnique({ where: { id: productId }, select: { id: true, name: true } });
        const row = await this.prisma.productComment.create({
            data: {
                id: 'cmt_' + (0, crypto_1.randomUUID)(),
                productId,
                userId: null,
                parentId: parentId || null,
                content,
                official: true,
                status: 'VISIBLE',
            },
        });
        await this.writeOpLog(actor, {
            module: 'comment',
            action: 'reply',
            targetType: 'ProductComment',
            targetId: row.id,
            targetLabel: (product && product.name) || productId,
            summary: (parentId ? '回复评价' : '发布官方评价') + ' · ' + ((product && product.name) || ''),
            detail: { productId, parentId: parentId || '', content },
        });
        return {
            id: row.id,
            parentId: row.parentId || '',
            content: row.content,
            rating: 0,
            official: true,
            status: row.status,
            createdAt: row.createdAt,
            userId: '',
            authorName: '官方',
            replyToName: parent ? (parent.official ? '官方' : '学员') : '',
            replies: [],
        };
    }
    async hideProductComment(productId, commentId, actor) {
        const row = await this.prisma.productComment.findFirst({ where: { id: commentId, productId } });
        if (!row)
            throw new common_1.NotFoundException('评价不存在');
        const next = row.status === 'HIDDEN' ? 'VISIBLE' : 'HIDDEN';
        await this.prisma.productComment.update({ where: { id: commentId }, data: { status: next } });
        const product = await this.prisma.product.findUnique({ where: { id: productId }, select: { name: true } });
        await this.writeOpLog(actor, {
            module: 'comment',
            action: next === 'HIDDEN' ? 'hide' : 'show',
            targetType: 'ProductComment',
            targetId: commentId,
            targetLabel: (product && product.name) || productId,
            summary: (next === 'HIDDEN' ? '隐藏评价' : '显示评价') + ' · ' + ((product && product.name) || ''),
            detail: { productId, content: row.content, status: next },
        });
        return { id: commentId, status: next };
    }
    async deleteProductComment(productId, commentId, actor) {
        const row = await this.prisma.productComment.findFirst({ where: { id: commentId, productId } });
        if (!row)
            throw new common_1.NotFoundException('评价不存在');
        await this.prisma.productComment.delete({ where: { id: commentId } });
        const product = await this.prisma.product.findUnique({ where: { id: productId }, select: { name: true } });
        await this.writeOpLog(actor, {
            module: 'comment',
            action: 'delete',
            targetType: 'ProductComment',
            targetId: commentId,
            targetLabel: (product && product.name) || productId,
            summary: '删除评价 · ' + ((product && product.name) || ''),
            detail: { productId, content: row.content, official: !!row.official },
        });
        return { id: commentId, deleted: true };
    }
    decimalToString(value) {
        if (value == null)
            return '0';
        return value.toString();
    }
    isForeignKeyConstraintError(error) {
        return Boolean(error && typeof error === 'object' && error.code === 'P2003');
    }
    s3Client() {
        if (this.s3)
            return this.s3;
        const endpoint = String(this.config.get('S3_ENDPOINT') || '').trim();
        const region = String(this.config.get('S3_REGION') || 'ap-northeast-1').trim();
        const accessKeyId = String(this.config.get('S3_ACCESS_KEY_ID') || '').trim();
        const secretAccessKey = String(this.config.get('S3_SECRET_ACCESS_KEY') || '').trim();
        if (!endpoint || !accessKeyId || !secretAccessKey)
            throw new common_1.ServiceUnavailableException('图片存储未配置');
        const forcePathStyle = String(this.config.get('S3_FORCE_PATH_STYLE') || '1') !== '0';
        this.s3 = new client_s3_1.S3Client({
            region,
            endpoint,
            forcePathStyle,
            credentials: { accessKeyId, secretAccessKey },
        });
        return this.s3;
    }
    productImagePublicUrl(key) {
        const prefix = String(this.config.get('S3_KEY_PREFIX') || 'public/mqlt/media').replace(/^\/+|\/+$/g, '');
        const media = String(this.config.get('MEDIA_BASE_URL') || '').trim().replace(/\/+$/, '');
        const cdn = String(this.config.get('CDN_BASE_URL') || 'http://127.0.0.1:8080').trim().replace(/\/+$/, '');
        const base = media || (cdn + '/media');
        const relative = key.startsWith(prefix + '/') ? key.slice(prefix.length + 1) : key.replace(/^public\/mqlt\/media\//, '');
        return base + '/' + relative;
    }

    s3PublicBase() {
        const media = String(this.config.get('MEDIA_BASE_URL') || '').trim().replace(/\/+$/, '');
        const cdn = String(this.config.get('CDN_BASE_URL') || 'http://127.0.0.1:8080').trim().replace(/\/+$/, '');
        return media || (cdn + '/media');
    }
    s3KeyPrefix() {
        return String(this.config.get('S3_KEY_PREFIX') || 'public/mqlt/media').replace(/^\/+|\/+$/g, '');
    }
    keyFromPublicUrl(url) {
        const u = String(url || '').trim();
        if (!u)
            return '';
        try {
            const parsed = new URL(u);
            const host = String(parsed.hostname || '').toLowerCase();
            if (host && host !== 'cdn.example.com' && host.indexOf('example.com') < 0 && host.indexOf('wasabisys.com') < 0)
                return '';
        }
        catch (_e) { return ''; }
        const prefix = this.s3KeyPrefix();
        const base = this.s3PublicBase().replace(/\/+$/, '');
        if (u.indexOf(base + '/') === 0)
            return prefix + '/' + u.slice(base.length + 1).split('?')[0];
        const marker = '/mqlt/media/';
        const at = u.indexOf(marker);
        if (at >= 0)
            return prefix + '/' + u.slice(at + marker.length).split('?')[0];
        return '';
    }
    async deleteManagedS3Key(key) {
        const k = String(key || '').trim();
        if (!k)
            return false;
        const bucket = String(this.config.get('S3_BUCKET') || '').trim();
        if (!bucket)
            return false;
        try {
            await this.s3Client().send(new client_s3_1.DeleteObjectCommand({ Bucket: bucket, Key: k }));
            return true;
        }
        catch (_e) {
            return false;
        }
    }
    async deleteManagedS3Url(url) {
        return this.deleteManagedS3Key(this.keyFromPublicUrl(url));
    }
    async purgeManagedS3Urls(urls) {
        const list = Array.isArray(urls) ? urls : [];
        let deleted = 0;
        for (let i = 0; i < list.length; i++) {
            if (await this.deleteManagedS3Url(list[i]))
                deleted += 1;
        }
        return { deleted, total: list.length };
    }
    async uploadProductImage(file, oldUrl) {
        if (!file)
            throw new common_1.BadRequestException('请选择要上传的图片');
        const type = String(file.mimetype || '').toLowerCase();
        const extMap = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'image/gif': '.gif' };
        const ext = extMap[type];
        if (!ext)
            throw new common_1.BadRequestException('仅支持 JPG、PNG、WEBP 或 GIF 图片');
        if (file.size > 8 * 1024 * 1024)
            throw new common_1.BadRequestException('图片不能超过 8MB');
        const bucket = String(this.config.get('S3_BUCKET') || '').trim();
        if (!bucket)
            throw new common_1.ServiceUnavailableException('图片存储未配置');
        const prefix = String(this.config.get('S3_KEY_PREFIX') || 'public/mqlt/media').replace(/^\/+|\/+$/g, '');
        const key = prefix + '/products/' + Date.now() + '_' + (0, crypto_1.randomUUID)().slice(0, 8) + ext;
        const body = file.buffer != null ? file.buffer : require('fs').readFileSync(file.path);
        try {
            await this.s3Client().send(new client_s3_1.PutObjectCommand({
                Bucket: bucket,
                Key: key,
                Body: body,
                ContentType: type,
            }));
            if (oldUrl)
                await this.deleteManagedS3Url(oldUrl);
            return { imageUrl: this.productImagePublicUrl(key), key };
        }
        finally {
            this.cleanupUploadFile(file);
        }
    }
    studyUploadLimit() {
        return 800 * 1024 * 1024;
    }
    cleanupUploadFile(file) {
        if (file && file.path) {
            try { require('fs').unlinkSync(file.path); } catch (_err) {}
        }
    }
    uploadFileBody(file) {
        if (file.buffer != null)
            return file.buffer;
        return require('fs').createReadStream(file.path);
    }
    detectStudyMediaKind(file) {
        const type = String((file && file.mimetype) || '').toLowerCase();
        const name = String((file && file.originalname) || '').toLowerCase();
        const hit = (exts) => exts.some((ext) => name.endsWith(ext));
        if (type === 'video/mp4' || hit(['.mp4', '.m4v']))
            return { kind: 'video', ext: '.mp4', contentType: 'video/mp4' };
        if (type === 'video/quicktime' || hit(['.mov']))
            return { kind: 'video', ext: '.mov', contentType: 'video/quicktime' };
        if (type === 'video/3gpp' || hit(['.3gp']))
            return { kind: 'video', ext: '.3gp', contentType: 'video/3gpp' };
        if (type === 'video/webm' || hit(['.webm']))
            return { kind: 'video', ext: '.webm', contentType: 'video/webm' };
        if (type.indexOf('video/') === 0)
            return { kind: 'video', ext: '.mp4', contentType: type };
        if (type === 'audio/mpeg' || hit(['.mp3']))
            return { kind: 'audio', ext: '.mp3', contentType: 'audio/mpeg' };
        if (type === 'audio/mp4' || type === 'audio/aac' || hit(['.m4a', '.aac']))
            return { kind: 'audio', ext: '.m4a', contentType: 'audio/mp4' };
        if (type === 'audio/wav' || type === 'audio/wave' || hit(['.wav']))
            return { kind: 'audio', ext: '.wav', contentType: 'audio/wav' };
        if (type.indexOf('audio/') === 0)
            return { kind: 'audio', ext: '.mp3', contentType: type };
        if (type === 'text/html' || type === 'application/xhtml+xml' || hit(['.html', '.htm']))
            return { kind: 'html', ext: '.html', contentType: 'text/html; charset=utf-8' };
        return null;
    }
    studyGamesPrefix() {
        const prefix = String(this.config.get('S3_KEY_PREFIX') || 'public/mqlt/media').replace(/^\/+|\/+$/g, '');
        return prefix + '/study-games/';
    }
    formatStudyGameTime(ts) {
        const d = new Date(ts);
        if (!Number.isFinite(d.getTime()))
            return '';
        const p = (n) => (n < 10 ? '0' : '') + n;
        try {
            return d.toLocaleString('sv-SE', { timeZone: 'Asia/Shanghai' }).slice(0, 16);
        } catch (_e) {
            const ms = d.getTime() + 8 * 3600000;
            const x = new Date(ms);
            return x.getUTCFullYear() + '-' + p(x.getUTCMonth() + 1) + '-' + p(x.getUTCDate()) + ' ' + p(x.getUTCHours()) + ':' + p(x.getUTCMinutes());
        }
    }
    formatStudyGameSize(bytes) {
        const n = Number(bytes || 0);
        if (n < 1024)
            return n + ' B';
        if (n < 1024 * 1024)
            return (Math.round(n / 102.4) / 10) + ' KB';
        return (Math.round(n / 104857.6) / 10) + ' MB';
    }
    formatStudyGameTitle(key) {
        const raw = String(key || '');
        const base = raw.split('/').pop() || raw;
        const noext = base.replace(/\.(html?|HTML?)$/g, '');
        if (noext === 'mqlt-demo-tap')
            return '点亮金印（测试）';
        const m = noext.match(/^(\d{10,13})[_-](.+)$/);
        if (m) {
            const rawTs = m[1];
            const ts = rawTs.length === 10 ? Number(rawTs) * 1000 : Number(rawTs);
            const rest = m[2];
            const when = Number.isFinite(ts) ? this.formatStudyGameTime(ts) : '';
            if (/^[a-f0-9]{8,}$/i.test(rest) && rest.length <= 12)
                return when ? ('上传 · ' + when) : '上传的小游戏';
            const nice = rest.replace(/[-_]+/g, ' ').trim();
            return when ? (nice + ' · ' + when) : nice;
        }
        return noext || 'H5 小游戏';
    }
    async listStudyGames() {
        const bucket = String(this.config.get('S3_BUCKET') || '').trim();
        if (!bucket)
            throw new common_1.ServiceUnavailableException('存储未配置');
        const prefix = this.studyGamesPrefix();
        const items = [];
        let token = undefined;
        for (let page = 0; page < 8; page++) {
            const out = await this.s3Client().send(new client_s3_1.ListObjectsV2Command({
                Bucket: bucket,
                Prefix: prefix,
                MaxKeys: 200,
                ContinuationToken: token,
            }));
            const contents = Array.isArray(out.Contents) ? out.Contents : [];
            for (let i = 0; i < contents.length; i++) {
                const obj = contents[i];
                const key = String((obj && obj.Key) || '');
                if (!key || key.endsWith('/'))
                    continue;
                const lower = key.toLowerCase();
                if (!(lower.endsWith('.html') || lower.endsWith('.htm')))
                    continue;
                const last = obj.LastModified ? new Date(obj.LastModified) : null;
                items.push({
                    key,
                    url: this.productImagePublicUrl(key),
                    title: this.formatStudyGameTitle(key),
                    size: Number((obj && obj.Size) || 0),
                    sizeLabel: this.formatStudyGameSize(obj && obj.Size),
                    updatedAt: last && Number.isFinite(last.getTime()) ? this.formatStudyGameTime(last.getTime()) : '',
                    lastModified: last ? last.toISOString() : '',
                });
            }
            if (!out.IsTruncated || !out.NextContinuationToken)
                break;
            token = out.NextContinuationToken;
        }
        items.sort((a, b) => String(b.lastModified || '').localeCompare(String(a.lastModified || '')));
        return { items, total: items.length };
    }
    async putStudyObject(file, folder, ext, contentType, slug, oldUrl) {
        const bucket = String(this.config.get('S3_BUCKET') || '').trim();
        if (!bucket)
            throw new common_1.ServiceUnavailableException('存储未配置');
        const prefix = String(this.config.get('S3_KEY_PREFIX') || 'public/mqlt/media').replace(/^\/+|\/+$/g, '');
        let namePart = (0, crypto_1.randomUUID)().slice(0, 8);
        const rawSlug = String(slug || '').replace(/\.(html?|htm)$/i, '');
        const safe = rawSlug.replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);
        if (safe)
            namePart = safe;
        const key = prefix + '/' + folder + '/' + Date.now() + '_' + namePart + ext;
        try {
            await this.s3Client().send(new client_s3_1.PutObjectCommand({
                Bucket: bucket,
                Key: key,
                Body: this.uploadFileBody(file),
                ContentType: contentType,
            }));
        }
        finally {
            this.cleanupUploadFile(file);
        }
        const url = this.productImagePublicUrl(key);
        if (oldUrl && String(oldUrl) !== url)
            await this.deleteManagedS3Url(oldUrl);
        return { url, key };
    }
    async uploadStudyVideo(file, oldUrl) {
        if (!file)
            throw new common_1.BadRequestException('请选择要上传的讲解文件');
        if (file.size > this.studyUploadLimit())
            throw new common_1.BadRequestException('上传不能超过 800MB（EdgeOne 上限），请先在控制台压缩');
        const kind = this.detectStudyMediaKind(file);
        if (!kind || (kind.kind !== 'video' && kind.kind !== 'audio'))
            throw new common_1.BadRequestException('请上传小程序可播放的视频或音频（MP4 / M4V / 3GP / MOV / WebM / MP3 / M4A / AAC / WAV）');
        const put = await this.putStudyObject(file, kind.kind === 'audio' ? 'study-audio' : 'study-videos', kind.ext, kind.contentType, '', oldUrl);
        return { videoUrl: put.url, imageUrl: put.url, kind: kind.kind, key: put.key };
    }
    async uploadStudyGame(file, oldUrl) {
        if (!file)
            throw new common_1.BadRequestException('请选择要上传的小游戏文件');
        if (file.size > this.studyUploadLimit())
            throw new common_1.BadRequestException('上传不能超过 800MB（EdgeOne 上限）');
        const kind = this.detectStudyMediaKind(file);
        const name = String(file.originalname || '').toLowerCase();
        const isHtml = kind && kind.kind === 'html';
        if (!isHtml)
            throw new common_1.BadRequestException('小游戏请上传 HTML 文件（CSS/JS 写在同一文件，或由控制台压成可播放格式）');
        if (file.size <= 5 * 1024 * 1024) {
            const fs = require('fs');
            const raw = file.buffer != null ? file.buffer : fs.readFileSync(file.path);
            let html = Buffer.isBuffer(raw) ? raw.toString('utf8') : String(raw);
            if (html.indexOf('MQLT.complete') < 0 && html.indexOf('mqlt-h5-sdk') < 0) {
                const inject = '<style>.mqlt-done{position:fixed;left:16px;right:16px;bottom:24px;z-index:99999;height:48px;border:0;border-radius:16px;background:#0F3F3A;color:#E8C56B;font-size:16px;font-weight:800}</style><script src="https://res.wx.qq.com/open/js/jweixin-1.6.0.js"></script><script>(function (root) {\n  var API_DEFAULT = \'http://127.0.0.1:3000/api/v1\';\n  function parseQuery() {\n    var out = {};\n    var loc = root.location;\n    var s = String((loc && loc.search) || \'\').replace(/^\\?/, \'\');\n    var parts = s.split(\'&\');\n    for (var i = 0; i < parts.length; i++) {\n      if (!parts[i]) continue;\n      var kv = parts[i].split(\'=\');\n      var k = decodeURIComponent(kv[0] || \'\');\n      var v = decodeURIComponent(kv.slice(1).join(\'=\') || \'\');\n      if (k) out[k] = v;\n    }\n    return out;\n  }\n  function unwrap(json) {\n    if (json && typeof json === \'object\' && json.data != null && (json.code === 200 || json.code === 0)) return json.data;\n    return json;\n  }\n  function postMini(data) {\n    try {\n      if (root.wx && wx.miniProgram && typeof wx.miniProgram.postMessage === \'function\') {\n        wx.miniProgram.postMessage({ data: data });\n      }\n    } catch (e) {}\n  }\n  function goBack() {\n    try {\n      if (root.wx && wx.miniProgram && typeof wx.miniProgram.navigateBack === \'function\') {\n        setTimeout(function () { wx.miniProgram.navigateBack(); }, 160);\n      }\n    } catch (e) {}\n  }\n  var qs = parseQuery();\n  var passRaw = qs.passScore;\n  var cfg = {\n    playToken: qs.playToken || qs.token || \'\',\n    apiBase: String(qs.apiBase || API_DEFAULT).replace(/\\/+$/, \'\'),\n    projectId: qs.projectId || \'\',\n    routePointId: qs.routePointId || \'\',\n    stepId: qs.stepId || \'\',\n    passScore: passRaw != null && passRaw !== \'\' && isFinite(Number(passRaw)) ? Number(passRaw) : null\n  };\n  function send(result, back) {\n    var body = {\n      token: cfg.playToken,\n      event: result.event || \'complete\',\n      score: result.score,\n      passed: result.passed,\n      durationMs: result.durationMs,\n      payload: result.payload || {}\n    };\n    postMini({\n      type: \'mqlt-game-complete\',\n      event: body.event,\n      complete: body.event === \'complete\' && body.passed !== false,\n      score: body.score,\n      passed: body.passed,\n      durationMs: body.durationMs,\n      payload: body.payload\n    });\n    var p = Promise.resolve(null);\n    if (cfg.playToken) {\n      p = fetch(cfg.apiBase + \'/study/h5/game-result\', {\n        method: \'POST\',\n        headers: {\n          \'Content-Type\': \'application/json\',\n          \'X-MQLT-Play-Token\': cfg.playToken\n        },\n        body: JSON.stringify(body)\n      }).then(function (r) { return r.json(); }).then(unwrap).catch(function () { return null; });\n    }\n    if (back) {\n      p.then(function () { goBack(); }, function () { goBack(); });\n    }\n    return p;\n  }\n  var MQLT = {\n    version: \'1\',\n    config: cfg,\n    report: function (x) { return send(x || {}, false); },\n    progress: function (x) { var d = x || {}; d.event = \'progress\'; return send(d, false); },\n    complete: function (x) {\n      var d = x || {};\n      if (d.passed == null) d.passed = true;\n      d.event = \'complete\';\n      return send(d, true);\n    },\n    fail: function (x) { var d = x || {}; d.passed = false; d.event = \'fail\'; return send(d, false); }\n  };\n  root.MQLT = MQLT;\n  root.mqltGameComplete = function (score, extra) {\n    var d = { event: \'complete\', passed: true };\n    if (score != null && typeof score === \'object\') d = score;\n    else if (score != null) {\n      d.score = score;\n      d.payload = extra || {};\n    }\n    return MQLT.complete(d);\n  };\n})(typeof window !== \'undefined\' ? window : this);</script><script>if(!document.querySelector(\'.mqlt-done\')){var b=document.createElement(\'button\');b.className=\'mqlt-done\';b.type=\'button\';b.textContent=\'完成游戏\';b.onclick=function(){if(window.MQLT){MQLT.complete({passed:true,payload:{source:\'fallback-button\'}});}else if(window.mqltGameComplete){mqltGameComplete();}};document.body.appendChild(b);}</script>';
                const closeAt = html.toLowerCase().lastIndexOf('</body>');
                if (closeAt >= 0)
                    html = html.slice(0, closeAt) + inject + html.slice(closeAt);
                else
                    html += inject;
            }
            file = { originalname: name || 'game.html', mimetype: 'text/html', buffer: Buffer.from(html, 'utf8'), size: Buffer.byteLength(html), path: file.path };
        }
        const put = await this.putStudyObject(file, 'study-games', '.html', 'text/html; charset=utf-8', name, oldUrl);
        return { gameUrl: put.url, imageUrl: put.url, key: put.key, title: this.formatStudyGameTitle(put.key) };
    }
    async ensureStudyResourceTable() {
        if (this._studyResourceTableReady)
            return;
        await this.prisma.$executeRawUnsafe(`
            CREATE TABLE IF NOT EXISTS "StudyProjectResource" (
                id TEXT PRIMARY KEY,
                "projectId" TEXT NOT NULL,
                type TEXT NOT NULL,
                title TEXT NOT NULL DEFAULT '',
                "videoUrl" TEXT,
                "videoKey" TEXT,
                "gameUrl" TEXT,
                "gameKey" TEXT,
                "taskBody" TEXT,
                questions JSONB NOT NULL DEFAULT '[]',
                "originalName" TEXT,
                size INTEGER NOT NULL DEFAULT 0,
                mime TEXT,
                "createdAt" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
                "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT NOW()
            )
        `);
        await this.prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "StudyProjectResource_project_type_idx" ON "StudyProjectResource" ("projectId", type, "createdAt")`);
        this._studyResourceTableReady = true;
    }
    parseResourceQuestions(raw) {
        let v = raw;
        if (typeof v === 'string') {
            try { v = JSON.parse(v); } catch (_e) { v = []; }
        }
        // Game config may be stored as object in questions JSONB — not quiz questions
        if (v && typeof v === 'object' && !Array.isArray(v))
            return [];
        if (!Array.isArray(v))
            return [];
        const out = [];
        for (let i = 0; i < v.length && out.length < 40; i++) {
            const q = v[i];
            if (!q || typeof q !== 'object')
                continue;
            if (q.__gameConfig)
                continue;
            const question = String(q.question || '').trim();
            const options = Array.isArray(q.options) ? q.options.map((x) => String(x || '').trim()).filter(Boolean) : [];
            if (!question || options.length < 2)
                continue;
            const multiSelect = q.multiSelect === true || q.multi === true;
            let answerIndexes = [];
            if (Array.isArray(q.answerIndexes)) {
                answerIndexes = q.answerIndexes.map((n) => Number(n)).filter((n) => Number.isInteger(n) && n >= 0 && n < options.length);
            }
            else {
                let answerIndex = Number(q.answerIndex ?? 0);
                if (!Number.isInteger(answerIndex) || answerIndex < 0 || answerIndex >= options.length)
                    answerIndex = 0;
                answerIndexes = [answerIndex];
            }
            if (!answerIndexes.length)
                answerIndexes = [0];
            // de-dupe preserve order
            const seen = {};
            answerIndexes = answerIndexes.filter((n) => {
                if (seen[n])
                    return false;
                seen[n] = true;
                return true;
            });
            if (!multiSelect)
                answerIndexes = [answerIndexes[0]];
            let partialMode = String(q.partialMode || q.partialScoreMode || 'none').trim();
            if (partialMode === 'half')
                partialMode = 'fixed';
            if (['none', 'ratio', 'fixed'].indexOf(partialMode) < 0)
                partialMode = 'none';
            let halfScore = q.halfScore != null ? Number(q.halfScore) : undefined;
            if (halfScore != null && (!Number.isFinite(halfScore) || halfScore < 0))
                halfScore = undefined;
            if (halfScore != null)
                halfScore = Math.min(999, Math.round(halfScore));
            let points = q.points != null ? Number(q.points) : undefined;
            if (points != null && (!Number.isFinite(points) || points < 0))
                points = undefined;
            if (points != null)
                points = Math.min(999, Math.round(points));
            const row = {
                question,
                options,
                multiSelect,
                answerIndexes,
                answerIndex: answerIndexes[0],
                partialMode,
            };
            if (q.id != null && String(q.id).trim())
                row.id = String(q.id).trim();
            if (halfScore != null)
                row.halfScore = halfScore;
            if (points != null)
                row.points = points;
            out.push(row);
        }
        return out;
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
    normalizeGameConfig(raw) {
        let v = raw;
        if (typeof v === 'string') {
            try { v = JSON.parse(v); } catch (_e) { v = null; }
        }
        // Stored as object in questions JSONB for game resources
        if (Array.isArray(v)) {
            const hit = v.find((x) => x && typeof x === 'object' && x.__gameConfig);
            v = hit || null;
        }
        if (!v || typeof v !== 'object')
            v = {};
        let maxRetries = v.maxRetries;
        if (maxRetries === '' || maxRetries === undefined)
            maxRetries = null;
        else if (maxRetries === null)
            maxRetries = null;
        else {
            maxRetries = Number(maxRetries);
            if (!Number.isFinite(maxRetries) || maxRetries < 0)
                maxRetries = null;
            else
                maxRetries = Math.min(99, Math.round(maxRetries));
            // 0 treated as unlimited
            if (maxRetries === 0)
                maxRetries = null;
        }
        const skippable = !(v.skippable === false || v.skippable === 0 || v.skippable === '0' || v.skippable === 'false');
        const scoreTiers = this.normalizeScoreTiers(v.scoreTiers || v.scorePointTiers);
        return { maxRetries, skippable, scoreTiers };
    }
    encodeGameConfigForStorage(cfg) {
        const c = this.normalizeGameConfig(cfg || {});
        return { __gameConfig: true, maxRetries: c.maxRetries, skippable: c.skippable, scoreTiers: c.scoreTiers };
    }
    serializeProjectResource(row, used) {
        if (!row)
            return null;
        const type = String(row.type || '');
        const questions = type === 'quiz' ? this.parseResourceQuestions(row.questions) : [];
        const gameCfg = type === 'game' ? this.normalizeGameConfig(row.questions) : { maxRetries: null, skippable: true, scoreTiers: [] };
        const uses = Array.isArray(used) ? used : [];
        const out = {
            id: String(row.id),
            projectId: String(row.projectId),
            type,
            title: String(row.title || ''),
            videoUrl: String(row.videoUrl || ''),
            gameUrl: String(row.gameUrl || ''),
            taskBody: String(row.taskBody || ''),
            questions,
            originalName: String(row.originalName || ''),
            size: Number(row.size || 0),
            sizeLabel: this.formatStudyGameSize(row.size),
            mime: String(row.mime || ''),
            createdAt: row.createdAt,
            updatedAt: row.updatedAt,
            usedCount: uses.length,
            usedBy: uses,
        };
        if (type === 'game') {
            out.maxRetries = gameCfg.maxRetries;
            out.skippable = gameCfg.skippable;
            out.scoreTiers = gameCfg.scoreTiers;
        }
        return out;
    }
    async resourceUsageMap(projectId) {
        const points = await this.prisma.studyRoutePoint.findMany({
            where: { projectId: String(projectId) },
            select: { id: true, title: true, knowledgeItems: true },
        });
        const map = {};
        for (let i = 0; i < points.length; i++) {
            const p = points[i];
            const raw = p.knowledgeItems;
            const pack = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
            const steps = Array.isArray(pack.stationSteps) ? pack.stationSteps : [];
            for (let j = 0; j < steps.length; j++) {
                const s = steps[j];
                const rid = String((s && s.resourceId) || '').trim();
                if (!rid)
                    continue;
                if (!map[rid])
                    map[rid] = [];
                map[rid].push({ pointId: p.id, pointTitle: p.title, stepId: String((s && s.id) || ''), stepTitle: String((s && s.title) || '') });
            }
        }
        return map;
    }
    async listProjectResources(projectId, type) {
        await this.ensureStudyResourceTable();
        const pid = String(projectId || '').trim();
        const t = String(type || '').trim();
        const rows = t
            ? await this.prisma.$queryRawUnsafe(`SELECT * FROM "StudyProjectResource" WHERE "projectId"=$1 AND type=$2 ORDER BY "updatedAt" DESC`, pid, t)
            : await this.prisma.$queryRawUnsafe(`SELECT * FROM "StudyProjectResource" WHERE "projectId"=$1 ORDER BY type ASC, "updatedAt" DESC`, pid);
        const usage = await this.resourceUsageMap(pid);
        const items = [];
        for (let i = 0; i < (rows || []).length; i++)
            items.push(this.serializeProjectResource(rows[i], usage[String(rows[i].id)]));
        return { items, total: items.length };
    }
    async getProjectResource(projectId, resourceId) {
        await this.ensureStudyResourceTable();
        const rows = await this.prisma.$queryRawUnsafe(`SELECT * FROM "StudyProjectResource" WHERE id=$1 AND "projectId"=$2`, String(resourceId), String(projectId));
        const row = rows && rows[0];
        if (!row)
            throw new common_1.NotFoundException('研学资源不存在');
        const usage = await this.resourceUsageMap(projectId);
        return this.serializeProjectResource(row, usage[String(row.id)]);
    }
    newResourceId() {
        return 'rs_' + Date.now().toString(36) + (0, crypto_1.randomUUID)().slice(0, 8);
    }
    async createProjectResource(projectId, body) {
        await this.ensureStudyResourceTable();
        const type = String((body && body.type) || '').trim();
        if (['video', 'quiz', 'game', 'task'].indexOf(type) < 0)
            throw new common_1.BadRequestException('资源类型无效');
        const title = String((body && body.title) || '').trim() || (type === 'video' ? '讲解视频' : (type === 'quiz' ? '题库' : (type === 'game' ? '研学小游戏' : '现场任务')));
        let questionsPayload;
        if (type === 'game') {
            questionsPayload = this.encodeGameConfigForStorage(body || {});
        } else {
            questionsPayload = this.parseResourceQuestions(body && body.questions);
        }
        const taskBody = String((body && (body.taskBody || body.body)) || '').trim();
        const id = this.newResourceId();
        await this.prisma.$executeRawUnsafe(
            `INSERT INTO "StudyProjectResource" (id,"projectId",type,title,"taskBody",questions,"createdAt","updatedAt") VALUES ($1,$2,$3,$4,$5,$6::jsonb,NOW(),NOW())`,
            id, String(projectId), type, title, taskBody, JSON.stringify(questionsPayload)
        );
        return this.getProjectResource(projectId, id);
    }
    async updateProjectResource(projectId, resourceId, body) {
        const cur = await this.getProjectResource(projectId, resourceId);
        const title = body && body.title != null ? String(body.title || '').trim() : cur.title;
        const taskBody = body && (body.taskBody != null || body.body != null) ? String(body.taskBody || body.body || '').trim() : cur.taskBody;
        let questionsPayload;
        if (cur.type === 'game') {
            const base = {
                maxRetries: body && body.maxRetries !== undefined ? body.maxRetries : cur.maxRetries,
                skippable: body && body.skippable !== undefined ? body.skippable : cur.skippable,
                scoreTiers: body && body.scoreTiers != null ? body.scoreTiers : (cur.scoreTiers || []),
            };
            questionsPayload = this.encodeGameConfigForStorage(base);
        } else if (body && body.questions != null) {
            questionsPayload = this.parseResourceQuestions(body.questions);
        } else {
            questionsPayload = cur.questions;
        }
        await this.prisma.$executeRawUnsafe(
            `UPDATE "StudyProjectResource" SET title=$1, "taskBody"=$2, questions=$3::jsonb, "updatedAt"=NOW() WHERE id=$4 AND "projectId"=$5`,
            title || cur.title, taskBody, JSON.stringify(questionsPayload), String(resourceId), String(projectId)
        );
        return this.getProjectResource(projectId, resourceId);
    }
    async uploadProjectResourceFile(projectId, file, body) {
        await this.ensureStudyResourceTable();
        const type = String((body && body.type) || '').trim();
        const resourceId = String((body && (body.resourceId || body.id)) || '').trim();
        if (type !== 'video' && type !== 'game')
            throw new common_1.BadRequestException('只有视频和小游戏需要上传文件');
        let existed = null;
        if (resourceId)
            existed = await this.getProjectResource(projectId, resourceId);
        const title = String((body && body.title) || (existed && existed.title) || (file && file.originalname) || '').trim() || (type === 'game' ? '研学小游戏' : '讲解视频');
        let put;
        if (type === 'video') {
            put = await this.uploadStudyVideo(file, existed && existed.videoUrl);
            const id = (existed && existed.id) || this.newResourceId();
            if (existed) {
                await this.prisma.$executeRawUnsafe(
                    `UPDATE "StudyProjectResource" SET title=$1, "videoUrl"=$2, "videoKey"=$3, "originalName"=$4, size=$5, mime=$6, "updatedAt"=NOW() WHERE id=$7 AND "projectId"=$8`,
                    title, put.videoUrl, put.key || '', String((file && file.originalname) || ''), Number((file && file.size) || 0), String((file && file.mimetype) || ''), id, String(projectId)
                );
            } else {
                await this.prisma.$executeRawUnsafe(
                    `INSERT INTO "StudyProjectResource" (id,"projectId",type,title,"videoUrl","videoKey","originalName",size,mime,questions,"createdAt","updatedAt") VALUES ($1,$2,'video',$3,$4,$5,$6,$7,$8,'[]'::jsonb,NOW(),NOW())`,
                    id, String(projectId), title, put.videoUrl, put.key || '', String((file && file.originalname) || ''), Number((file && file.size) || 0), String((file && file.mimetype) || '')
                );
            }
            return this.getProjectResource(projectId, id);
        }
        put = await this.uploadStudyGame(file, existed && existed.gameUrl);
        const id = (existed && existed.id) || this.newResourceId();
        const gameTitle = title || put.title;
        if (existed) {
            await this.prisma.$executeRawUnsafe(
                `UPDATE "StudyProjectResource" SET title=$1, "gameUrl"=$2, "gameKey"=$3, "originalName"=$4, size=$5, mime=$6, "updatedAt"=NOW() WHERE id=$7 AND "projectId"=$8`,
                gameTitle, put.gameUrl, put.key || '', String((file && file.originalname) || ''), Number((file && file.size) || 0), String((file && file.mimetype) || ''), id, String(projectId)
            );
        } else {
            await this.prisma.$executeRawUnsafe(
                `INSERT INTO "StudyProjectResource" (id,"projectId",type,title,"gameUrl","gameKey","originalName",size,mime,questions,"createdAt","updatedAt") VALUES ($1,$2,'game',$3,$4,$5,$6,$7,$8,'[]'::jsonb,NOW(),NOW())`,
                id, String(projectId), gameTitle, put.gameUrl, put.key || '', String((file && file.originalname) || ''), Number((file && file.size) || 0), String((file && file.mimetype) || '')
            );
        }
        return this.getProjectResource(projectId, id);
    }
    async deleteProjectResource(projectId, resourceId, force) {
        const cur = await this.getProjectResource(projectId, resourceId);
        if (cur.usedCount > 0 && !force)
            throw new common_1.BadRequestException('该资源已被 ' + cur.usedCount + ' 个站点步骤使用，请先在研学路径中取消选用');
        if (cur.videoUrl)
            await this.deleteManagedS3Url(cur.videoUrl);
        if (cur.gameUrl)
            await this.deleteManagedS3Url(cur.gameUrl);
        await this.prisma.$executeRawUnsafe(`DELETE FROM "StudyProjectResource" WHERE id=$1 AND "projectId"=$2`, String(resourceId), String(projectId));
        return { id: resourceId, deleted: true };
    }
    async batchDeleteProjectResources(projectId, ids) {
        const list = Array.isArray(ids) ? ids.map((x) => String(x || '').trim()).filter(Boolean) : [];
        const deleted = [];
        const skipped = [];
        for (let i = 0; i < list.length; i++) {
            try {
                await this.deleteProjectResource(projectId, list[i], false);
                deleted.push(list[i]);
            }
            catch (err) {
                skipped.push({ id: list[i], message: (err && err.message) || '无法删除' });
            }
        }
        return { deleted, skipped, deletedCount: deleted.length, skippedCount: skipped.length };
    }
    async loadProjectResourceMap(projectId) {
        await this.ensureStudyResourceTable();
        const rows = await this.prisma.$queryRawUnsafe(`SELECT * FROM "StudyProjectResource" WHERE "projectId"=$1`, String(projectId));
        const map = {};
        for (let i = 0; i < (rows || []).length; i++)
            map[String(rows[i].id)] = this.serializeProjectResource(rows[i], []);
        return map;
    }

};
exports.AdminMallService = AdminMallService;
exports.AdminMallService = AdminMallService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService, config_1.ConfigService])
], AdminMallService);
//# sourceMappingURL=admin-mall.service.js.map