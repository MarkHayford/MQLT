import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';
import { PrismaService } from '../prisma/prisma.service';
export declare class UsersService {
    private readonly prisma;
    private readonly config;
    private readonly mockSmsCode;
    constructor(prisma: PrismaService, config: ConfigService);
    getProfile(userId: string): Promise<Omit<{
        id: string;
        updatedAt: Date;
        points: number;
        phone: string | null;
        openId: string | null;
        studyNo: string;
        nickname: string;
        avatarUrl: string | null;
        avatarTheme: number;
        gender: string | null;
        region: string | null;
        school: string | null;
        realName: string | null;
        realNameIdCard: string | null;
        realNameVerified: boolean;
        realNameVerifiedAt: Date | null;
    }, "avatarUrl" | "realNameIdCard"> & {
        avatarUrl: string | null;
        realNameIdCardMasked: string;
    }>;
    updateProfile(userId: string, body: Record<string, unknown>): Promise<Omit<{
        id: string;
        updatedAt: Date;
        points: number;
        phone: string | null;
        openId: string | null;
        studyNo: string;
        nickname: string;
        avatarUrl: string | null;
        avatarTheme: number;
        gender: string | null;
        region: string | null;
        school: string | null;
        realName: string | null;
        realNameIdCard: string | null;
        realNameVerified: boolean;
        realNameVerifiedAt: Date | null;
    }, "avatarUrl" | "realNameIdCard"> & {
        avatarUrl: string | null;
        realNameIdCardMasked: string;
    }>;
    saveRealName(userId: string, body: Record<string, unknown>): Promise<Omit<{
        id: string;
        updatedAt: Date;
        points: number;
        phone: string | null;
        openId: string | null;
        studyNo: string;
        nickname: string;
        avatarUrl: string | null;
        avatarTheme: number;
        gender: string | null;
        region: string | null;
        school: string | null;
        realName: string | null;
        realNameIdCard: string | null;
        realNameVerified: boolean;
        realNameVerifiedAt: Date | null;
    }, "avatarUrl" | "realNameIdCard"> & {
        avatarUrl: string | null;
        realNameIdCardMasked: string;
    }>;
    changePassword(userId: string, body: Record<string, unknown>): Promise<{
        success: boolean;
    }>;
    uploadAvatar(userId: string, file?: any): Promise<{
        avatarUrl: string | null;
    }>;
    sendAvatar(filename: string, res: Response): any;
    private normalizePhone;
    private assertMockSmsCode;
    private syncSelfTravelerFromUser;
    private normalizeRealName;
    private normalizeIdCard;
    private avatarDir;
    private avatarPublicPath;
    private cleanupUserAvatarFiles;
    private isUserAvatarFilename;
    private withPublicProfile;
    private withPublicAvatarUrl;
    private maskIdCard;
    private toPublicAvatarUrl;
    private normalizeAvatarPath;
    private publicApiPrefix;
    private internalApiPrefix;
    private avatarExtension;
    private isSupportedAvatarImage;
    private isJpeg;
    private isPng;
    private isWebp;
    private normalizeRegion;
    private normalizeSchool;
    getPoints(userId: string): Promise<{
        balance: number;
        records: {
            id: string;
            title: string;
            createdAt: Date;
            userId: string;
            amount: number;
            sourceType: string | null;
            sourceId: string | null;
        }[];
    }>;
}
