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
exports.OrdersService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../prisma/prisma.service");
let OrdersService = class OrdersService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getOrders(userId, status) {
        const orders = await this.prisma.order.findMany({
            where: {
                userId,
                userDeletedAt: null,
                status: status && status !== 'all' ? this.mapOrderStatus(status) : undefined,
            },
            include: { items: { include: { product: true } } },
            orderBy: { createdAt: 'desc' },
        });
        return orders.map((order) => this.serializeOrder(order));
    }
    async getOrderDetail(userId, id) {
        const order = await this.prisma.order.findFirst({
            where: { id, userId, userDeletedAt: null },
            include: { items: { include: { product: true } } },
        });
        if (!order)
            throw new common_1.NotFoundException('Order not found');
        return this.serializeOrder(order);
    }
    async createOrder(userId, body) {
        const items = (body.items ?? []);
        if (items.length === 0)
            throw new common_1.BadRequestException('Order items are required');
        const addressId = String(body.addressId ?? '').trim();
        if (!addressId)
            throw new common_1.BadRequestException('Address is required');
        const address = await this.prisma.address.findUnique({ where: { id_userId: { id: addressId, userId } } });
        if (!address)
            throw new common_1.NotFoundException('Address not found');
        const products = await this.prisma.product.findMany({
            where: { id: { in: items.map((item) => item.productId) } },
        });
        let goodsAmount = 0;
        const orderItems = items.map((item) => {
            const product = products.find((p) => p.id === item.productId);
            const quantity = Number(item.quantity ?? 1);
            if (!product)
                throw new common_1.NotFoundException(`Product not found: ${item.productId}`);
            if (quantity < 1)
                throw new common_1.BadRequestException('Invalid quantity');
            const lineAmount = Number(product.price) * quantity;
            goodsAmount += lineAmount;
            return {
                productId: product.id,
                quantity,
                price: product.price,
            };
        });
        let amount = Math.max(0, Math.round(goodsAmount * 100) / 100);
        const couponId = String(body.couponId || body.coupon || '').trim();
        let couponDiscount = 0;
        let couponTitle = '';
        if (couponId) {
            try {
                const rows = await this.prisma.$queryRawUnsafe(`SELECT * FROM "UserCoupon" WHERE id=$1 AND "userId"=$2 LIMIT 1`, couponId, userId);
                const coupon = rows && rows[0];
                if (!coupon || String(coupon.status) !== 'unused')
                    throw new common_1.BadRequestException('卡券不可用');
                if (coupon.expireAt && new Date(coupon.expireAt).getTime() < Date.now())
                    throw new common_1.BadRequestException('卡券已过期');
                const productId = String(coupon.productId || '').trim();
                const ctype = String(coupon.type || 'cash');
                if (productId || ctype === 'gift' || ctype === 'study_prize') {
                    const hit = orderItems.find((it) => !productId || it.productId === productId);
                    if (!hit)
                        throw new common_1.BadRequestException('本单没有卡券对应的文创商品');
                    couponDiscount = Number(hit.price) * Number(hit.quantity);
                    couponTitle = String(coupon.title || '研学奖品券');
                }
                else {
                    const min = Number(coupon.minAmount || 0);
                    if (min > 0 && goodsAmount + 0.0001 < min)
                        throw new common_1.BadRequestException('未满卡券使用门槛');
                    if (ctype === 'discount') {
                        let rate = Number(coupon.value);
                        if (rate > 10) rate = rate / 10;
                        if (rate > 0 && rate < 10)
                            couponDiscount = goodsAmount - goodsAmount * (rate / 10);
                    }
                    else {
                        couponDiscount = Number(coupon.value || 0);
                    }
                    couponTitle = String(coupon.title || '优惠券');
                }
                couponDiscount = Math.max(0, Math.min(goodsAmount, Math.round(couponDiscount * 100) / 100));
            }
            catch (err) {
                if (err instanceof common_1.BadRequestException)
                    throw err;
                throw new common_1.BadRequestException('卡券不可用');
            }
        }
        amount = Math.max(0, Math.round((goodsAmount - couponDiscount) * 100) / 100);
        const order = await this.prisma.$transaction(async (tx) => {
            if (couponId && couponDiscount > 0) {
                const used = await tx.$executeRawUnsafe(`UPDATE "UserCoupon" SET status='used', "usedAt"=NOW() WHERE id=$1 AND "userId"=$2 AND status='unused'`, couponId, userId);
                if (!used)
                    throw new common_1.BadRequestException('卡券已被使用');
            }
            return tx.order.create({
                data: {
                    orderNo: `DD${Date.now()}`,
                    userId,
                    status: amount === 0 ? client_1.OrderStatus.PAID : client_1.OrderStatus.UNPAID,
                    amount,
                    goodsAmount,
                    paidAt: amount === 0 ? new Date() : null,
                    addressId: address.id,
                    receiver: address.receiver,
                    receiverPhone: address.phone,
                    province: address.province,
                    city: address.city,
                    district: address.district,
                    addressDetail: address.detail,
                    remark: String(body.remark ?? '').trim() || (couponTitle ? ('使用卡券：' + couponTitle) : null),
                    items: { create: orderItems },
                },
                include: { items: { include: { product: true } } },
            });
        });
        return this.serializeOrder(order);
    }
    async deleteOrder(userId, id) {
        const order = await this.prisma.order.findFirst({
            where: { id, userId },
            select: { id: true, status: true },
        });
        if (!order)
            throw new common_1.NotFoundException('Order not found');
        if (order.status !== client_1.OrderStatus.COMPLETED && order.status !== client_1.OrderStatus.CANCELLED) {
            throw new common_1.BadRequestException('Only completed or cancelled orders can be deleted');
        }
        await this.prisma.order.update({
            where: { id },
            data: { userDeletedAt: new Date() },
        });
        return { id, deleted: true };
    }
    async cancelOrder(userId, id) {
        const now = new Date();
        const order = await this.prisma.$transaction(async (tx) => {
            const existed = await tx.order.findFirst({
                where: { id, userId },
                select: { id: true, status: true, remark: true },
            });
            if (!existed)
                throw new common_1.NotFoundException('Order not found');
            if (this.isPrizeOrder(existed)) {
                throw new common_1.BadRequestException('研学奖品订单不能取消');
            }
            const statusClaim = await tx.order.updateMany({
                where: { id, userId, status: client_1.OrderStatus.UNPAID },
                data: { status: client_1.OrderStatus.CANCELLED, cancelledAt: now },
            });
            if (statusClaim.count !== 1) {
                throw new common_1.BadRequestException('Only unpaid orders can be cancelled');
            }
            const cancelled = await tx.order.findFirst({
                where: { id, userId },
                include: { items: { include: { product: true } } },
            });
            if (!cancelled)
                throw new common_1.NotFoundException('Order not found');
            const updated = await tx.order.findFirst({
                where: { id, userId },
                include: { items: { include: { product: true } } },
            });
            if (!updated)
                throw new common_1.NotFoundException('Order not found');
            return updated;
        });
        return this.serializeOrder(order);
    }
    async payOrder(userId, id, body = {}) {
        const addressId = String(body.addressId ?? '').trim();
        const now = new Date();
        const order = await this.prisma.$transaction(async (tx) => {
            const existed = await tx.order.findFirst({
                where: { id, userId },
                select: {
                    id: true,
                    status: true,
                    addressId: true,
                    receiver: true,
                    receiverPhone: true,
                    addressDetail: true,
                },
            });
            if (!existed)
                throw new common_1.NotFoundException('Order not found');
            if (existed.status !== client_1.OrderStatus.UNPAID) {
                throw new common_1.BadRequestException('Only unpaid orders can be paid');
            }
            let addressData = {};
            if (addressId.length > 0) {
                const address = await tx.address.findUnique({ where: { id_userId: { id: addressId, userId } } });
                if (!address)
                    throw new common_1.NotFoundException('Address not found');
                addressData = {
                    addressId: address.id,
                    receiver: address.receiver,
                    receiverPhone: address.phone,
                    province: address.province,
                    city: address.city,
                    district: address.district,
                    addressDetail: address.detail,
                };
            }
            else if (!existed.addressId || !existed.receiver || !existed.receiverPhone || !existed.addressDetail) {
                throw new common_1.BadRequestException('请选择收货地址');
            }
            const statusClaim = await tx.order.updateMany({
                where: { id, userId, status: client_1.OrderStatus.UNPAID },
                data: { status: client_1.OrderStatus.PAID, paidAt: now, ...addressData },
            });
            if (statusClaim.count !== 1) {
                const current = await tx.order.findFirst({
                    where: { id, userId },
                    select: { id: true, status: true },
                });
                if (!current)
                    throw new common_1.NotFoundException('Order not found');
                throw new common_1.BadRequestException('Only unpaid orders can be paid');
            }
            const paid = await tx.order.findFirst({
                where: { id, userId },
                include: { items: { include: { product: true } } },
            });
            if (!paid)
                throw new common_1.NotFoundException('Order not found');
            return paid;
        });
        return this.serializeOrder(order);
    }
    async completeOrder(userId, id) {
        const existed = await this.prisma.order.findFirst({
            where: { id, userId },
            include: { items: { include: { product: true } } },
        });
        if (!existed)
            throw new common_1.NotFoundException('Order not found');
        if (existed.status !== client_1.OrderStatus.UNRECEIVED) {
            throw new common_1.BadRequestException('Only shipped orders can be completed');
        }
        const order = await this.prisma.order.update({
            where: { id },
            data: { status: client_1.OrderStatus.COMPLETED, completedAt: new Date() },
            include: { items: { include: { product: true } } },
        });
        return this.serializeOrder(order);
    }
    serializeOrder(order) {
        return {
            id: order.id,
            orderNo: order.orderNo,
            goodsAmount: (order.goodsAmount ?? order.amount).toString(),
            amount: order.amount.toString(),
            status: order.status.toLowerCase(),
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
            shippingCompany: order.shippingCompany ?? '',
            trackingNo: order.trackingNo ?? '',
            shippedAt: order.shippedAt,
            paidAt: order.paidAt,
            completedAt: order.completedAt,
            cancelledAt: order.cancelledAt,
            userDeletedAt: order.userDeletedAt,
            createdAt: order.createdAt,
            updatedAt: order.updatedAt,
            items: order.items.map((item) => ({
                id: item.id,
                quantity: item.quantity,
                price: item.price.toString(),
                product: {
                    ...item.product,
                    price: item.product.price.toString(),
                },
            })),
        };
    }
    mapOrderStatus(status) {
        const normalized = status.toUpperCase();
        if (normalized in client_1.OrderStatus)
            return normalized;
        return client_1.OrderStatus.UNPAID;
    }
    isPrizeOrder(order) {
        return (order.remark ?? '').startsWith('研学奖品发放：');
    }
};
exports.OrdersService = OrdersService;
exports.OrdersService = OrdersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], OrdersService);
//# sourceMappingURL=orders.service.js.map