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
exports.TravelersService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let TravelersService = class TravelersService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async list(userId) {
        await this.syncSelfTraveler(userId);
        return this.prisma.traveler.findMany({
            where: { userId },
            orderBy: [{ isSelf: 'desc' }, { createdAt: 'desc' }],
        });
    }
    async create(userId, body) {
        return this.prisma.traveler.create({
            data: {
                userId,
                name: (body.name ?? ''),
                phone: (body.phone ?? ''),
                idCard: (body.idCard ?? body.idNo ?? ''),
                isSelf: false,
            },
        });
    }
    async update(userId, id, body) {
        return this.prisma.$transaction(async (tx) => {
            const existing = await tx.traveler.findUnique({
                where: { id_userId: { id, userId } },
                select: { isSelf: true },
            });
            if (existing?.isSelf) {
                throw new common_1.BadRequestException('本人游客信息由实名认证自动同步，不可手动修改');
            }
            return tx.traveler.update({
                where: { id_userId: { id, userId } },
                data: this.mapTravelerUpdate(body),
            });
        });
    }
    async remove(userId, id) {
        const existing = await this.prisma.traveler.findUnique({
            where: { id_userId: { id, userId } },
            select: { isSelf: true },
        });
        if (existing?.isSelf) {
            throw new common_1.BadRequestException('本人游客信息由实名认证自动同步，不可删除');
        }
        await this.prisma.traveler.deleteMany({ where: { id, userId } });
        return { id, deleted: true };
    }
    async syncSelfTraveler(userId) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: {
                phone: true,
                realName: true,
                realNameIdCard: true,
                realNameVerified: true,
            },
        });
        if (!user || user.realNameVerified !== true || !user.realName || !user.realNameIdCard || !user.phone)
            return;
        const selfName = user.realName;
        const selfPhone = user.phone;
        const selfIdCard = user.realNameIdCard;
        const self = await this.prisma.traveler.findFirst({
            where: { userId, isSelf: true },
            orderBy: { createdAt: 'asc' },
        });
        if (self) {
            await this.prisma.$transaction([
                this.prisma.traveler.update({
                    where: { id_userId: { id: self.id, userId } },
                    data: {
                        name: selfName,
                        phone: selfPhone,
                        idCard: selfIdCard,
                        isSelf: true,
                    },
                }),
                this.prisma.traveler.updateMany({
                    where: { userId, isSelf: true, id: { not: self.id } },
                    data: { isSelf: false },
                }),
            ]);
            return;
        }
        await this.prisma.traveler.create({
            data: {
                userId,
                name: selfName,
                phone: selfPhone,
                idCard: selfIdCard,
                isSelf: true,
            },
        });
    }
    mapTravelerUpdate(body) {
        return {
            name: body.name,
            phone: body.phone,
            idCard: (body.idCard ?? body.idNo),
            isSelf: undefined,
        };
    }
};
exports.TravelersService = TravelersService;
exports.TravelersService = TravelersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], TravelersService);
//# sourceMappingURL=travelers.service.js.map