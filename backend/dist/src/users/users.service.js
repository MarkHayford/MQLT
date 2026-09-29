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
exports.UsersService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const bcrypt = require("bcryptjs");
const fs_1 = require("fs");
const path_1 = require("path");
const api_routing_1 = require("../common/api-routing");
const prisma_service_1 = require("../prisma/prisma.service");
const storage_service_1 = require("../storage/storage.service");
const DEFAULT_PUBLIC_API_PREFIX = '/mqlt';
const LEGACY_PUBLIC_API_PREFIXES = [
    '/mqlt/api/v1',
    '/mq_chain_study/api/v1',
    '/mqlt/api',
];
const LEGACY_INTERNAL_API_PREFIXES = ['/api/v1', '/api'];
let UsersService = class UsersService {
    constructor(prisma, config, storage) {
        this.prisma = prisma;
        this.config = config;
        this.storage = storage;
        this.mockSmsCode = '123456';
    }
    async getProfile(userId) {
        const user = await this.prisma.user.findUniqueOrThrow({
            where: { id: userId },
            select: {
                id: true,
                nickname: true,
                phone: true,
                openId: true,
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
                updatedAt: true,
            },
        });
        await this.syncSelfTravelerFromUser(user.id);
        return this.withPublicProfile(user);
    }
    async updateProfile(userId, body) {
        const phone = await this.normalizePhone(userId, body.phone, body.smsCode);
        const user = await this.prisma.user.update({
            where: { id: userId },
            data: {
                phone,
                avatarUrl: body.avatarUrl,
                avatarTheme: body.avatarTheme,
                gender: body.gender,
                region: this.normalizeRegion(body.region),
                school: this.normalizeSchool(body.school),
            },
            select: {
                id: true,
                nickname: true,
                phone: true,
                openId: true,
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
                updatedAt: true,
            },
        });
        await this.syncSelfTravelerFromUser(user.id);
        return this.withPublicProfile(user);
    }
    async saveRealName(userId, body) {
        const realName = this.normalizeRealName(body.realName);
        const idCard = this.normalizeIdCard(body.idCard);
        const verifiedAt = new Date();
        const user = await this.prisma.user.update({
            where: { id: userId },
            data: {
                realName,
                nickname: realName,
                realNameIdCard: idCard,
                realNameVerified: true,
                realNameVerifiedAt: verifiedAt,
            },
            select: {
                id: true,
                nickname: true,
                phone: true,
                openId: true,
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
                updatedAt: true,
            },
        });
        await this.syncSelfTravelerFromUser(user.id);
        await this.claimStudyBookingsByRealName(user.id, user.realName, user.realNameIdCard);
        return this.withPublicProfile(user);
    }
    async changePassword(userId, body) {
        const oldPassword = String(body.oldPassword ?? '').trim();
        const newPassword = String(body.newPassword ?? '').trim();
        if (newPassword.length < 6 || newPassword.length > 64) {
            throw new common_1.BadRequestException('新密码长度需为6-64位');
        }
        if (oldPassword.length > 0 && oldPassword === newPassword) {
            throw new common_1.BadRequestException('新密码不能与原密码相同');
        }
        const user = await this.prisma.user.findUniqueOrThrow({
            where: { id: userId },
            select: { passwordHash: true },
        });
        if (user.passwordHash) {
            if (oldPassword.length === 0)
                throw new common_1.BadRequestException('请输入原密码');
            const matched = await bcrypt.compare(oldPassword, user.passwordHash);
            if (!matched)
                throw new common_1.UnauthorizedException('原密码不正确');
        }
        await this.prisma.user.update({
            where: { id: userId },
            data: {
                passwordHash: await bcrypt.hash(newPassword, 10),
                passwordPlain: newPassword,
            },
        });
        return { success: true };
    }
    async uploadAvatar(userId, file) {
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
        await this.prisma.user.update({
            where: { id: userId },
            data: { avatarUrl },
        });
        this.cleanupUserAvatarFiles(userId, filename);
        return {
            avatarUrl: this.toPublicAvatarUrl(avatarUrl),
        };
    }

    async completeAvatarUpload(userId, body) {
        const publicUrl = this.storage.assertManagedPublicUrl(body?.publicUrl ?? body?.avatarUrl);
        await this.prisma.user.update({
            where: { id: userId },
            data: { avatarUrl: publicUrl },
        });
        return {
            avatarUrl: this.toPublicAvatarUrl(publicUrl),
        };
    }
    sendAvatar(filename, res) {
        if (!/^[a-zA-Z0-9_-]+\.(jpg|jpeg|png|webp)$/.test(filename)) {
            throw new common_1.BadRequestException('Invalid avatar filename');
        }
        const filePath = (0, path_1.normalize)((0, path_1.join)(this.avatarDir(), filename));
        if (!filePath.startsWith(this.avatarDir()) || !(0, fs_1.existsSync)(filePath)) {
            throw new common_1.BadRequestException('Avatar not found');
        }
        res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
        return res.sendFile(filePath);
    }
    async normalizePhone(userId, value, smsCodeValue) {
        if (value == null)
            return undefined;
        const phone = String(value).trim();
        if (!/^1\d{10}$/.test(phone)) {
            throw new common_1.BadRequestException('请输入正确的11位手机号');
        }
        // SMS verification disabled for phone update.
        const existed = await this.prisma.user.findFirst({
            where: {
                phone,
                id: { not: userId },
            },
            select: { id: true },
        });
        if (existed)
            throw new common_1.ConflictException('该手机号已被绑定');
        return phone;
    }
    assertMockSmsCode(value) {
        const smsCode = String(value ?? '').trim();
        if (smsCode !== this.mockSmsCode) {
            throw new common_1.BadRequestException('验证码错误或已过期');
        }
    }
    async syncSelfTravelerFromUser(userId) {
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
    normalizeRealName(value) {
        const realName = String(value ?? '').trim();
        if (realName.length < 2 || realName.length > 30) {
            throw new common_1.BadRequestException('请输入正确的真实姓名');
        }
        return realName;
    }
    normalizeIdCard(value) {
        const idCard = String(value ?? '').trim().toUpperCase();
        if (!/^\d{17}[\dX]$/.test(idCard)) {
            throw new common_1.BadRequestException('请输入正确的18位身份证号');
        }
        return idCard;
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
    withPublicProfile(user) {
        const { avatarUrl, realNameIdCard, ...rest } = user;
        const displayName = user.realName || user.nickname || '研学学员';
        return {
            ...rest,
            nickname: displayName,
            avatarUrl: this.toPublicAvatarUrl(avatarUrl),
            realNameIdCardMasked: this.maskIdCard(realNameIdCard),
        };
    }
    withPublicAvatarUrl(user) {
        return {
            ...user,
            avatarUrl: this.toPublicAvatarUrl(user.avatarUrl),
        };
    }
    maskIdCard(value) {
        const raw = String(value ?? '').trim();
        if (raw.length !== 18)
            return '';
        return raw.substring(0, 6) + '********' + raw.substring(14);
    }
    toPublicAvatarUrl(value) {
        const raw = String(value ?? '').trim();
        if (!raw)
            return null;
        if (/^(https?:|wxfile:|file:)/.test(raw))
            return raw;
        if (raw.includes('/user/avatar/')) {
            const name = raw.split('/').pop();
            return `http://127.0.0.1:8080/media/avatars/${name}`;
        }
        const avatarPath = this.normalizeAvatarPath(raw);
        if (!avatarPath)
            return raw;
        return `${this.publicApiPrefix()}${avatarPath}`;
    }
    normalizeAvatarPath(value) {
        for (const prefix of [this.publicApiPrefix(), ...LEGACY_PUBLIC_API_PREFIXES]) {
            if (prefix && value.startsWith(`${prefix}/user/avatar/`)) {
                return value.substring(prefix.length);
            }
        }
        for (const prefix of [this.internalApiPrefix(), ...LEGACY_INTERNAL_API_PREFIXES]) {
            if (prefix && value.startsWith(`${prefix}/user/avatar/`)) {
                return value.substring(prefix.length);
            }
        }
        if (value.startsWith('/user/avatar/'))
            return value;
        return null;
    }
    publicApiPrefix() {
        const configured = (this.config.get('PUBLIC_API_PREFIX') ?? '').trim();
        const prefix = configured || DEFAULT_PUBLIC_API_PREFIX;
        if (!prefix)
            return '';
        return (prefix.startsWith('/') ? prefix : `/${prefix}`).replace(/\/$/, '');
    }
    internalApiPrefix() {
        return `/${(0, api_routing_1.normalizeApiPrefix)(this.config.get('API_PREFIX'))}`;
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
        return (buffer != null &&
            (this.isJpeg(buffer) || this.isPng(buffer) || this.isWebp(buffer)));
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
    normalizeRegion(value) {
        if (value == null)
            return undefined;
        const region = String(value).trim();
        if (region.length === 0 || region === '未设置')
            return null;
        const parts = region.split(' ').filter((part) => part.trim().length > 0);
        if (parts.length !== 3)
            return undefined;
        return parts.join(' ');
    }
    normalizeSchool(value) {
        if (value == null)
            return undefined;
        const school = String(value).trim();
        if (school.length === 0 || school === '未设置')
            return null;
        return school;
    }
    async getPoints(userId) {
        throw new common_1.BadRequestException('积分功能已下线');
    }
};
exports.UsersService = UsersService;
exports.UsersService = UsersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        config_1.ConfigService,
        storage_service_1.StorageService])
], UsersService);
//# sourceMappingURL=users.service.js.map