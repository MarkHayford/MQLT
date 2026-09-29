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
exports.AddressesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let AddressesService = class AddressesService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    list(userId) {
        return this.prisma.address.findMany({
            where: { userId },
            orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
        });
    }
    async create(userId, body) {
        return this.prisma.$transaction(async (tx) => {
            const shouldDefault = Boolean(body.isDefault ?? false) || (await tx.address.count({ where: { userId } })) === 0;
            if (shouldDefault) {
                await tx.address.updateMany({ where: { userId }, data: { isDefault: false } });
            }
            return tx.address.create({
                data: { ...this.mapAddressCreate(userId, body), isDefault: shouldDefault },
            });
        });
    }
    async update(userId, id, body) {
        return this.prisma.$transaction(async (tx) => {
            if (Boolean(body.isDefault ?? false)) {
                await tx.address.updateMany({ where: { userId, id: { not: id } }, data: { isDefault: false } });
            }
            return tx.address.update({
                where: { id_userId: { id, userId } },
                data: this.mapAddressUpdate(body),
            });
        });
    }
    async remove(userId, id) {
        await this.prisma.address.delete({ where: { id_userId: { id, userId } } });
        return { id, deleted: true };
    }
    mapAddressCreate(userId, body) {
        return {
            userId,
            receiver: (body.receiver ?? body.name ?? ''),
            phone: (body.phone ?? ''),
            province: (body.province ?? ''),
            city: (body.city ?? ''),
            district: (body.district ?? ''),
            detail: (body.detail ?? body.address ?? ''),
            isDefault: Boolean(body.isDefault ?? false),
        };
    }
    mapAddressUpdate(body) {
        return {
            receiver: (body.receiver ?? body.name),
            phone: body.phone,
            province: body.province,
            city: body.city,
            district: body.district,
            detail: (body.detail ?? body.address),
            isDefault: body.isDefault != null ? Boolean(body.isDefault) : undefined,
        };
    }
};
exports.AddressesService = AddressesService;
exports.AddressesService = AddressesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AddressesService);
//# sourceMappingURL=addresses.service.js.map