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
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const jwt_1 = require("@nestjs/jwt");
const bcrypt = require("bcryptjs");
const admin_permissions_1 = require("../admin/admin-permissions");
const study_no_service_1 = require("../common/study-no.service");
const prisma_service_1 = require("../prisma/prisma.service");
let AuthService = class AuthService {
    constructor(jwtService, config, prisma, studyNo) {
        this.jwtService = jwtService;
        this.config = config;
        this.prisma = prisma;
        this.studyNo = studyNo;
        this.mockSmsCode = '123456';
    }
    async login(dto) {
        const user = await this.prisma.user.findUnique({
            where: { phone: dto.phone },
        });
        if (!user || !user.passwordHash) {
            throw new common_1.UnauthorizedException('账号或密码错误');
        }
        const matched = await bcrypt.compare(dto.password, user.passwordHash);
        if (!matched) {
            throw new common_1.UnauthorizedException('账号或密码错误');
        }
        return this.issueToken(user);
    }
    async loginByCode(dto) {
        this.assertMockSmsCode(dto.smsCode);
        const user = await this.prisma.user.findUnique({
            where: { phone: dto.phone },
        });
        if (!user || !this.isRegisteredUser(user)) {
            throw new common_1.UnauthorizedException('手机号未注册，请使用微信一键登录/注册');
        }
        return this.issueToken(user);
    }
    async resetPassword(dto) {
        this.assertMockSmsCode(dto.smsCode);
        const newPassword = String(dto.newPassword ?? '').trim();
        if (newPassword.length < 6 || newPassword.length > 64) {
            throw new common_1.BadRequestException('新密码长度需为6-64位');
        }
        const user = await this.prisma.user.findUnique({
            where: { phone: dto.phone },
            select: { id: true, passwordHash: true },
        });
        if (!user) {
            throw new common_1.UnauthorizedException('手机号未注册，请使用微信一键登录/注册');
        }
        if (user.passwordHash && (await bcrypt.compare(newPassword, user.passwordHash))) {
            throw new common_1.BadRequestException('新密码不能与原密码相同');
        }
        await this.prisma.user.update({
            where: { id: user.id },
            data: {
                passwordHash: await bcrypt.hash(newPassword, 10),
                passwordPlain: newPassword,
            },
        });
        return { success: true };
    }
    async register(dto) {
        const existed = await this.prisma.user.findUnique({
            where: { phone: dto.phone },
        });
        if (existed) {
            if (existed.passwordHash)
                throw new common_1.ConflictException('手机号已注册');
            const password = String(dto.password ?? '').trim();
            const user = await this.prisma.user.update({
                where: { id: existed.id },
                data: {
                    passwordHash: await bcrypt.hash(password, 10),
                    passwordPlain: password,
                    nickname: dto.nickname ?? existed.nickname ?? '研学学员',
                    studyNo: await this.repairStudyNoIfNeeded(existed.studyNo),
                },
            });
            return this.issueToken(user);
        }
        const password = String(dto.password ?? '').trim();
        const user = await this.prisma.user.create({
            data: {
                phone: dto.phone,
                passwordHash: await bcrypt.hash(password, 10),
                passwordPlain: password,
                nickname: dto.nickname ?? '研学学员',
                studyNo: await this.studyNo.issue(),
            },
        });
        return this.issueToken(user);
    }
    async wechatLogin(dto) {
        const openId = await this.resolveWechatOpenId(dto.code);
        const existed = await this.prisma.user.findUnique({
            where: { openId },
        });
        if (existed && existed.phone) {
            return {
                requiresBinding: false,
                auth: this.issueToken(existed),
            };
        }
        return {
            requiresBinding: true,
            bindToken: this.issueWechatBindToken(openId),
        };
    }
    async wechatBind(dto) {
        const openId = this.verifyWechatBindToken(dto.bindToken);
        const passwordPlain = String(dto.password ?? '').trim();
        const passwordHash = passwordPlain.length >= 6 ? await bcrypt.hash(passwordPlain, 10) : null;
        const passwordData = passwordHash ? { passwordHash, passwordPlain } : {};
        const realNameData = this.normalizeRequiredRealName(dto.realName, dto.idCard);
        const displayName = realNameData.realName;
        const phone = String(dto.phone ?? '').trim();
        if (!/^1\d{10}$/.test(phone)) {
            throw new common_1.BadRequestException('请输入正确的11位手机号');
        }
        const existedByOpenId = await this.prisma.user.findUnique({ where: { openId } });
        let user;
        if (existedByOpenId) {
            if (existedByOpenId.phone && existedByOpenId.phone !== phone) {
                throw new common_1.ConflictException('该微信已绑定其他手机号');
            }
            const phoneOwner = await this.prisma.user.findUnique({ where: { phone } });
            if (phoneOwner && phoneOwner.id !== existedByOpenId.id) {
                throw new common_1.ConflictException('手机号已绑定其他微信，请使用原微信账号登录');
            }
            user = await this.prisma.user.update({
                where: { id: existedByOpenId.id },
                data: Object.assign({
                    phone,
                    nickname: displayName,
                    realName: realNameData.realName,
                    realNameIdCard: realNameData.idCard,
                    realNameVerified: true,
                    realNameVerifiedAt: new Date(),
                    studyNo: await this.repairStudyNoIfNeeded(existedByOpenId.studyNo),
                }, passwordData),
            });
        }
        else {
            const existedByPhone = await this.prisma.user.findUnique({ where: { phone } });
            if (existedByPhone) {
                if (existedByPhone.openId && existedByPhone.openId !== openId) {
                    throw new common_1.ConflictException('手机号已绑定其他微信，请使用原微信账号登录');
                }
                user = await this.prisma.user.update({
                    where: { id: existedByPhone.id },
                    data: Object.assign({
                        openId,
                        nickname: displayName,
                        realName: realNameData.realName,
                        realNameIdCard: realNameData.idCard,
                        realNameVerified: true,
                        realNameVerifiedAt: new Date(),
                        studyNo: await this.repairStudyNoIfNeeded(existedByPhone.studyNo),
                    }, passwordData),
                });
            }
            else {
                user = await this.prisma.user.create({
                    data: Object.assign({
                        phone,
                        openId,
                        nickname: displayName,
                        realName: realNameData.realName,
                        realNameIdCard: realNameData.idCard,
                        realNameVerified: true,
                        realNameVerifiedAt: new Date(),
                        studyNo: await this.studyNo.issue(),
                    }, passwordData),
                });
            }
        }
        await this.claimStudyBookingsByRealName(user.id, user.realName, user.realNameIdCard);
        return this.issueToken(user);
    }
    normalizeRequiredRealName(realNameValue, idCardValue) {
        const realName = String(realNameValue ?? '').trim();
        const idCard = String(idCardValue ?? '').trim().toUpperCase();
        if (realName.length < 2 || realName.length > 30) {
            throw new common_1.BadRequestException('请输入正确的真实姓名');
        }
        if (!/^\d{17}[\dX]$/.test(idCard)) {
            throw new common_1.BadRequestException('请输入正确的18位身份证号');
        }
        return { verified: true, realName, idCard };
    }
    async claimStudyBookingsByRealName(userId, realName, realNameIdCard) {
        const name = String(realName ?? '').trim();
        const idCard = String(realNameIdCard ?? '').trim().toUpperCase();
        if (name.length < 2 || idCard.length !== 18)
            return 0;
        const candidates = await this.prisma.studyBooking.findMany({
            where: {
                participantName: name,
                participantIdCard: idCard,
                status: { not: 'CANCELLED' },
                userDeletedAt: null,
            },
            include: { user: true },
        });
        let claimed = 0;
        for (let i = 0; i < candidates.length; i++) {
            const row = candidates[i];
            if (row.userId === userId)
                continue;
            const holder = row.user;
            const holderRegistered = holder != null && String(holder.openId ?? '').trim().length > 0;
            if (holderRegistered && holder.id !== userId)
                continue;
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
    assertMockSmsCode(value) {
        const smsCode = String(value ?? '').trim();
        if (smsCode !== this.mockSmsCode) {
            throw new common_1.BadRequestException('验证码错误或已过期');
        }
    }
    issueToken(user) {
        const adminPhones = String(this.config.get('ADMIN_PHONES', ''))
            .split(',')
            .map((item) => item.trim())
            .filter(Boolean);
        const access = (0, admin_permissions_1.buildAdminAccess)(user, adminPhones);
        const accessToken = this.jwtService.sign({
            sub: user.id,
            phone: user.phone,
            openId: user.openId,
            isAdmin: access.isAdmin,
            adminRole: access.adminRole,
            adminPermissions: access.adminPermissions,
        });
        return {
            accessToken,
            user: {
                id: user.id,
                phone: user.phone ?? '',
                openId: user.openId ?? '',
                nickname: user.nickname,
                studyNo: user.studyNo,
                ...access,
            },
        };
    }
    issueWechatBindToken(openId) {
        return this.jwtService.sign({
            purpose: 'wechat-bind',
            openId,
        }, {
            expiresIn: '10m',
        });
    }
    verifyWechatBindToken(bindToken) {
        try {
            const payload = this.jwtService.verify(bindToken);
            if (payload.purpose !== 'wechat-bind' || !payload.openId) {
                throw new common_1.UnauthorizedException('微信绑定凭证无效');
            }
            return payload.openId;
        }
        catch {
            throw new common_1.UnauthorizedException('微信绑定凭证已失效，请重新授权');
        }
    }
    repairStudyNoIfNeeded(studyNo) {
        if (this.studyNo.isValid(studyNo))
            return Promise.resolve(undefined);
        return this.studyNo.issue();
    }
    isRegisteredUser(user) {
        return String(user.openId ?? '').trim().length > 0 || String(user.passwordHash ?? '').trim().length > 0;
    }
    async resolveWechatOpenId(code) {
        const appId = this.config.get('WECHAT_APP_ID', '');
        const appSecret = this.config.get('WECHAT_APP_SECRET', '');
        if (!appId || !appSecret) {
            const nodeEnv = this.config.get('NODE_ENV', process.env.NODE_ENV ?? '');
            if (nodeEnv !== 'production')
                return `mock_openid_${code.slice(0, 8)}`;
            throw new common_1.UnauthorizedException('微信登录未配置');
        }
        const params = new URLSearchParams({
            appid: appId,
            secret: appSecret,
            js_code: code,
            grant_type: 'authorization_code',
        });
        const response = await fetch(`https://api.weixin.qq.com/sns/jscode2session?${params.toString()}`);
        const data = (await response.json());
        if (!response.ok || !data.openid) {
            throw new common_1.UnauthorizedException(data.errmsg ?? '微信登录失败');
        }
        return data.openid;
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [jwt_1.JwtService,
        config_1.ConfigService,
        prisma_service_1.PrismaService,
        study_no_service_1.StudyNoService])
], AuthService);
//# sourceMappingURL=auth.service.js.map